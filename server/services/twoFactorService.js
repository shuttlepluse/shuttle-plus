// ========================================
// Two-Factor Authentication Service
// ========================================

const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TwoFactorService {
    constructor() {
        this.appName = 'Shuttle Plus';
        this.otpLength = 6;
        this.otpWindow = 2; // Accept codes from 1 time step before/after
        this.smsOtpExpiry = 10 * 60 * 1000; // 10 minutes
    }

    // ========================================
    // TOTP (Time-based One-Time Password)
    // ========================================

    /**
     * Generate a new TOTP secret for user
     */
    generateTOTPSecret(user) {
        const secret = speakeasy.generateSecret({
            name: `${this.appName}:${user.email}`,
            issuer: this.appName,
            length: 32
        });

        return {
            secret: secret.base32,
            otpAuthUrl: secret.otpauth_url,
            backupCodes: this.generateBackupCodes()
        };
    }

    /**
     * Generate QR code for TOTP setup
     */
    async generateQRCode(otpAuthUrl) {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
                errorCorrectionLevel: 'M',
                width: 256,
                margin: 2
            });
            return qrCodeDataUrl;
        } catch (error) {
            console.error('[2FA] QR generation failed:', error);
            throw error;
        }
    }

    /**
     * Verify TOTP token
     */
    verifyTOTP(token, secret) {
        try {
            const verified = speakeasy.totp.verify({
                secret,
                encoding: 'base32',
                token,
                window: this.otpWindow
            });
            return verified;
        } catch (error) {
            console.error('[2FA] TOTP verification failed:', error);
            return false;
        }
    }

    /**
     * Generate current TOTP (for testing)
     */
    generateCurrentTOTP(secret) {
        return speakeasy.totp({
            secret,
            encoding: 'base32'
        });
    }

    // ========================================
    // SMS OTP
    // ========================================

    /**
     * Generate SMS OTP
     */
    generateSMSOTP() {
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + this.smsOtpExpiry);

        return {
            otp,
            expiresAt,
            hashedOtp: this.hashOTP(otp)
        };
    }

    /**
     * Hash OTP for storage
     */
    hashOTP(otp) {
        return crypto.createHash('sha256').update(otp).digest('hex');
    }

    /**
     * Verify SMS OTP
     */
    verifySMSOTP(inputOtp, hashedOtp, expiresAt) {
        // Check expiry
        if (new Date() > new Date(expiresAt)) {
            return { valid: false, reason: 'expired' };
        }

        // Verify hash
        const inputHash = this.hashOTP(inputOtp);
        if (inputHash !== hashedOtp) {
            return { valid: false, reason: 'invalid' };
        }

        return { valid: true };
    }

    // ========================================
    // Backup Codes
    // ========================================

    /**
     * Generate backup codes
     */
    generateBackupCodes(count = 10) {
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push({
                code: `${code.slice(0, 4)}-${code.slice(4)}`,
                hashedCode: this.hashOTP(code),
                used: false
            });
        }
        return codes;
    }

    /**
     * Verify backup code
     */
    verifyBackupCode(inputCode, backupCodes) {
        const normalizedInput = inputCode.replace(/-/g, '').toUpperCase();
        const hashedInput = this.hashOTP(normalizedInput);

        const codeIndex = backupCodes.findIndex(
            bc => bc.hashedCode === hashedInput && !bc.used
        );

        if (codeIndex === -1) {
            return { valid: false, index: -1 };
        }

        return { valid: true, index: codeIndex };
    }

    // ========================================
    // Email OTP
    // ========================================

    /**
     * Generate email verification code
     */
    generateEmailOTP() {
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        return {
            otp,
            expiresAt,
            hashedOtp: this.hashOTP(otp)
        };
    }

    // ========================================
    // User 2FA Management
    // ========================================

    /**
     * Enable 2FA for user
     */
    async enable2FA(user, method = 'totp') {
        if (method === 'totp') {
            const { secret, otpAuthUrl, backupCodes } = this.generateTOTPSecret(user);
            const qrCode = await this.generateQRCode(otpAuthUrl);

            return {
                method: 'totp',
                secret,
                qrCode,
                backupCodes: backupCodes.map(bc => bc.code),
                setupData: {
                    secret, // Store encrypted in DB
                    backupCodes // Store hashed in DB
                }
            };
        }

        if (method === 'sms') {
            // SMS 2FA doesn't need initial setup beyond phone verification
            return {
                method: 'sms',
                message: 'SMS 2FA will send codes to your registered phone number'
            };
        }

        throw new Error(`Unsupported 2FA method: ${method}`);
    }

    /**
     * Verify 2FA during login
     */
    async verify2FA(user, token, method = null) {
        const twoFA = user.twoFactorAuth;

        if (!twoFA?.enabled) {
            return { success: true, reason: '2FA not enabled' };
        }

        const activeMethod = method || twoFA.method;

        switch (activeMethod) {
            case 'totp':
                const totpValid = this.verifyTOTP(token, twoFA.secret);
                return {
                    success: totpValid,
                    reason: totpValid ? 'Valid TOTP' : 'Invalid TOTP'
                };

            case 'sms':
                const smsResult = this.verifySMSOTP(
                    token,
                    twoFA.smsOtp?.hashedOtp,
                    twoFA.smsOtp?.expiresAt
                );
                return {
                    success: smsResult.valid,
                    reason: smsResult.reason || 'Valid SMS OTP'
                };

            case 'backup':
                const backupResult = this.verifyBackupCode(token, twoFA.backupCodes);
                if (backupResult.valid) {
                    // Mark code as used (caller should save user)
                    twoFA.backupCodes[backupResult.index].used = true;
                }
                return {
                    success: backupResult.valid,
                    reason: backupResult.valid ? 'Valid backup code' : 'Invalid backup code',
                    codeIndex: backupResult.index
                };

            default:
                return { success: false, reason: 'Unknown 2FA method' };
        }
    }

    /**
     * Generate 2FA challenge (for SMS)
     */
    async generate2FAChallenge(user, notificationService) {
        if (!user.twoFactorAuth?.enabled) {
            return { required: false };
        }

        if (user.twoFactorAuth.method === 'sms' && user.phone) {
            const { otp, expiresAt, hashedOtp } = this.generateSMSOTP();

            // Store OTP data on user (caller should save)
            user.twoFactorAuth.smsOtp = {
                hashedOtp,
                expiresAt,
                attempts: 0
            };

            // Send SMS if notification service provided
            if (notificationService) {
                const smsTemplates = notificationService.smsTemplates;
                const message = smsTemplates.getOTPVerification(otp, 10, 'en');
                await notificationService.sendSMS(user.phone, message);
            }

            return {
                required: true,
                method: 'sms',
                expiresAt,
                message: 'Verification code sent to your phone'
            };
        }

        if (user.twoFactorAuth.method === 'totp') {
            return {
                required: true,
                method: 'totp',
                message: 'Enter the code from your authenticator app'
            };
        }

        return { required: false };
    }

    /**
     * Get remaining backup codes count
     */
    getRemainingBackupCodes(backupCodes) {
        if (!backupCodes) return 0;
        return backupCodes.filter(bc => !bc.used).length;
    }

    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes() {
        return this.generateBackupCodes();
    }

    // ========================================
    // Session/Device Trust
    // ========================================

    /**
     * Generate device trust token
     */
    generateDeviceTrustToken() {
        return {
            token: crypto.randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        };
    }

    /**
     * Verify device trust token
     */
    verifyDeviceTrust(inputToken, trustedDevices) {
        if (!trustedDevices || !Array.isArray(trustedDevices)) {
            return false;
        }

        const device = trustedDevices.find(
            d => d.token === inputToken && new Date(d.expiresAt) > new Date()
        );

        return !!device;
    }
}

// Fallback if speakeasy not installed
if (!speakeasy) {
    console.warn('[2FA] speakeasy not installed. TOTP features will be limited.');
}

module.exports = new TwoFactorService();
