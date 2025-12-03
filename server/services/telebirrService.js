// ========================================
// Telebirr Payment Service
// ========================================
// Integration with Ethio Telecom's Telebirr H5 Pay API
// Documentation: https://developer.ethiotelecom.et/docs/Telebirr
//
// Setup Instructions:
// 1. Register as merchant at https://telebirr.et/merchant
// 2. Get approved for H5 Pay integration
// 3. Receive: App ID, App Key, Short Code, Public Key
// 4. Add credentials to .env file
// ========================================

const crypto = require('crypto');
const axios = require('axios');

class TelebirrService {
    constructor() {
        this.appId = process.env.TELEBIRR_APP_ID;
        this.appKey = process.env.TELEBIRR_APP_KEY;
        this.shortCode = process.env.TELEBIRR_SHORT_CODE;
        this.publicKey = process.env.TELEBIRR_PUBLIC_KEY;
        this.apiUrl = process.env.TELEBIRR_API_URL || 'https://api.ethiotelecom.et/v1';

        // Callback URLs (update for your production domain)
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        this.notifyUrl = `${this.baseUrl}/api/payments/telebirr/callback`;
        this.returnUrl = `${this.baseUrl}/pages/payment-result.html`;
    }

    /**
     * Check if Telebirr is properly configured
     */
    isConfigured() {
        return !!(this.appId && this.appKey && this.shortCode && this.publicKey);
    }

    /**
     * Generate unique transaction reference
     */
    generateOutTradeNo() {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex');
        return `SP${timestamp}${random}`.toUpperCase();
    }

    /**
     * Generate nonce string for request signing
     */
    generateNonce(length = 32) {
        return crypto.randomBytes(length).toString('hex').substring(0, length);
    }

    /**
     * Get current timestamp in required format
     */
    getTimestamp() {
        return new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    }

    /**
     * Sign data using RSA with public key (for Telebirr API)
     * Telebirr uses RSA encryption for secure payload transmission
     */
    encryptWithPublicKey(data) {
        try {
            // Format the public key if not already in PEM format
            let formattedKey = this.publicKey;
            if (!formattedKey.includes('-----BEGIN')) {
                formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`;
            }

            const buffer = Buffer.from(JSON.stringify(data), 'utf8');
            const encrypted = crypto.publicEncrypt(
                {
                    key: formattedKey,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                buffer
            );
            return encrypted.toString('base64');
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt payment data');
        }
    }

    /**
     * Create signature for request validation
     */
    createSignature(params) {
        // Sort parameters alphabetically
        const sortedKeys = Object.keys(params).sort();
        const signString = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

        // Create SHA256 hash
        return crypto
            .createHash('sha256')
            .update(signString + this.appKey)
            .digest('hex')
            .toUpperCase();
    }

    /**
     * Verify callback signature from Telebirr
     */
    verifySignature(data, signature) {
        const calculatedSig = this.createSignature(data);
        return calculatedSig === signature;
    }

    /**
     * Decrypt callback data from Telebirr
     */
    decryptCallbackData(encryptedData) {
        try {
            // Telebirr sends base64 encoded data
            const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }

    /**
     * Initiate H5 Pay payment request
     * @param {Object} options - Payment options
     * @param {string} options.bookingReference - Unique booking reference
     * @param {number} options.amount - Amount in ETB
     * @param {string} options.subject - Payment subject/description
     * @param {string} options.customerPhone - Customer phone number (optional)
     */
    async initiatePayment(options) {
        if (!this.isConfigured()) {
            throw new Error('Telebirr is not configured. Please add credentials to .env');
        }

        const { bookingReference, amount, subject, customerPhone } = options;
        const outTradeNo = this.generateOutTradeNo();
        const timestamp = this.getTimestamp();
        const nonce = this.generateNonce();

        // Build the payment request payload
        const ussdPayload = {
            appId: this.appId,
            notifyUrl: this.notifyUrl,
            outTradeNo: outTradeNo,
            receiveName: 'Shuttle Plus',
            returnUrl: `${this.returnUrl}?ref=${bookingReference}`,
            shortCode: this.shortCode,
            subject: subject || `Airport Transfer - ${bookingReference}`,
            timeoutExpress: '30', // 30 minutes timeout
            timestamp: timestamp,
            totalAmount: amount.toFixed(2),
            nonce: nonce
        };

        // Add customer phone if provided (for USSD push)
        if (customerPhone) {
            ussdPayload.msisdn = this.formatPhoneNumber(customerPhone);
        }

        try {
            // Encrypt the payload
            const encryptedPayload = this.encryptWithPublicKey(ussdPayload);

            // Create the request signature
            const signParams = {
                appId: this.appId,
                timestamp: timestamp,
                nonce: nonce,
                ussd: encryptedPayload
            };
            const sign = this.createSignature(signParams);

            // Make API request to Telebirr
            const response = await axios.post(
                `${this.apiUrl}/payment/h5pay`,
                {
                    appId: this.appId,
                    sign: sign,
                    timestamp: timestamp,
                    nonce: nonce,
                    ussd: encryptedPayload
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            if (response.data && response.data.code === '0') {
                // Success - return payment URL
                return {
                    success: true,
                    outTradeNo: outTradeNo,
                    paymentUrl: response.data.data.toPayUrl,
                    prepayId: response.data.data.prepayId,
                    message: 'Payment initiated successfully'
                };
            } else {
                // API returned an error
                console.error('Telebirr API error:', response.data);
                return {
                    success: false,
                    outTradeNo: outTradeNo,
                    error: response.data?.msg || 'Payment initiation failed',
                    code: response.data?.code
                };
            }
        } catch (error) {
            console.error('Telebirr request error:', error.message);

            // In development/test mode, return a mock response
            if (process.env.NODE_ENV === 'development' || !this.publicKey) {
                console.log('Returning mock Telebirr response for development');
                return {
                    success: true,
                    outTradeNo: outTradeNo,
                    paymentUrl: `https://h5pay.telebirr.com/payment?outTradeNo=${outTradeNo}&amount=${amount}`,
                    prepayId: `mock_prepay_${outTradeNo}`,
                    message: 'Mock payment initiated (development mode)',
                    isMock: true
                };
            }

            throw new Error(`Telebirr API error: ${error.message}`);
        }
    }

    /**
     * Query payment status
     * @param {string} outTradeNo - The transaction reference
     */
    async queryPaymentStatus(outTradeNo) {
        if (!this.isConfigured()) {
            throw new Error('Telebirr is not configured');
        }

        const timestamp = this.getTimestamp();
        const nonce = this.generateNonce();

        const queryPayload = {
            appId: this.appId,
            outTradeNo: outTradeNo,
            timestamp: timestamp,
            nonce: nonce
        };

        try {
            const encryptedPayload = this.encryptWithPublicKey(queryPayload);
            const sign = this.createSignature({
                appId: this.appId,
                timestamp: timestamp,
                nonce: nonce,
                ussd: encryptedPayload
            });

            const response = await axios.post(
                `${this.apiUrl}/payment/query`,
                {
                    appId: this.appId,
                    sign: sign,
                    timestamp: timestamp,
                    nonce: nonce,
                    ussd: encryptedPayload
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            if (response.data && response.data.code === '0') {
                const data = response.data.data;
                return {
                    success: true,
                    status: this.mapPaymentStatus(data.tradeStatus),
                    tradeNo: data.tradeNo, // Telebirr's transaction ID
                    outTradeNo: data.outTradeNo,
                    amount: parseFloat(data.totalAmount),
                    paidAt: data.payDate ? new Date(data.payDate) : null
                };
            } else {
                return {
                    success: false,
                    status: 'unknown',
                    error: response.data?.msg || 'Query failed'
                };
            }
        } catch (error) {
            console.error('Query payment error:', error.message);
            throw new Error(`Failed to query payment: ${error.message}`);
        }
    }

    /**
     * Process callback notification from Telebirr
     * @param {Object} callbackData - Raw callback data
     */
    async processCallback(callbackData) {
        try {
            // Verify signature if provided
            if (callbackData.sign) {
                const dataToVerify = { ...callbackData };
                delete dataToVerify.sign;

                if (!this.verifySignature(dataToVerify, callbackData.sign)) {
                    console.error('Invalid callback signature');
                    return {
                        success: false,
                        error: 'Invalid signature'
                    };
                }
            }

            // Decrypt the notification data if encrypted
            let notificationData = callbackData;
            if (callbackData.encryptedData) {
                notificationData = this.decryptCallbackData(callbackData.encryptedData);
                if (!notificationData) {
                    return {
                        success: false,
                        error: 'Failed to decrypt callback data'
                    };
                }
            }

            // Extract payment information
            return {
                success: true,
                outTradeNo: notificationData.outTradeNo,
                tradeNo: notificationData.tradeNo,
                status: this.mapPaymentStatus(notificationData.tradeStatus),
                amount: parseFloat(notificationData.totalAmount || notificationData.amount),
                paidAt: notificationData.payDate ? new Date(notificationData.payDate) : new Date(),
                msisdn: notificationData.msisdn // Customer phone
            };
        } catch (error) {
            console.error('Process callback error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Map Telebirr status codes to our status strings
     */
    mapPaymentStatus(telebirrStatus) {
        const statusMap = {
            'SUCCESS': 'paid',
            'TRADE_SUCCESS': 'paid',
            'TRADE_FINISHED': 'paid',
            'TRADE_CLOSED': 'cancelled',
            'WAIT_BUYER_PAY': 'pending',
            'TRADE_PENDING': 'pending',
            'TRADE_FAILED': 'failed',
            'FAILED': 'failed'
        };
        return statusMap[telebirrStatus] || 'unknown';
    }

    /**
     * Format Ethiopian phone number
     */
    formatPhoneNumber(phone) {
        // Remove all non-digits
        let cleaned = phone.replace(/\D/g, '');

        // Handle different formats
        if (cleaned.startsWith('251')) {
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            return '251' + cleaned.substring(1);
        } else if (cleaned.length === 9) {
            return '251' + cleaned;
        }

        return cleaned;
    }

    /**
     * Request refund for a payment
     * @param {Object} options - Refund options
     */
    async requestRefund(options) {
        const { outTradeNo, tradeNo, amount, reason } = options;

        if (!this.isConfigured()) {
            throw new Error('Telebirr is not configured');
        }

        const timestamp = this.getTimestamp();
        const nonce = this.generateNonce();
        const outRefundNo = `RF${this.generateOutTradeNo()}`;

        const refundPayload = {
            appId: this.appId,
            outTradeNo: outTradeNo,
            tradeNo: tradeNo,
            outRefundNo: outRefundNo,
            refundAmount: amount.toFixed(2),
            refundReason: reason || 'Customer requested refund',
            timestamp: timestamp,
            nonce: nonce
        };

        try {
            const encryptedPayload = this.encryptWithPublicKey(refundPayload);
            const sign = this.createSignature({
                appId: this.appId,
                timestamp: timestamp,
                nonce: nonce,
                ussd: encryptedPayload
            });

            const response = await axios.post(
                `${this.apiUrl}/payment/refund`,
                {
                    appId: this.appId,
                    sign: sign,
                    timestamp: timestamp,
                    nonce: nonce,
                    ussd: encryptedPayload
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data && response.data.code === '0') {
                return {
                    success: true,
                    outRefundNo: outRefundNo,
                    refundNo: response.data.data?.refundNo,
                    status: 'processing',
                    message: 'Refund request submitted'
                };
            } else {
                return {
                    success: false,
                    error: response.data?.msg || 'Refund request failed',
                    code: response.data?.code
                };
            }
        } catch (error) {
            console.error('Refund request error:', error.message);
            throw new Error(`Refund failed: ${error.message}`);
        }
    }
}

// Export singleton instance
module.exports = new TelebirrService();
