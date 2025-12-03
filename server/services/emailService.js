// ========================================
// Email Service
// ========================================
// Handles sending transactional emails using SendGrid or SMTP
// Uses HTML templates from /emails/ directory
// ========================================

const fs = require('fs').promises;
const path = require('path');

// SendGrid setup (conditional)
let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Nodemailer as fallback (for SMTP)
let nodemailer = null;
let transporter = null;
if (process.env.SMTP_HOST) {
    nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

class EmailService {
    constructor() {
        this.fromEmail = process.env.EMAIL_FROM || 'bookings@shuttleplus.et';
        this.fromName = process.env.EMAIL_FROM_NAME || 'Shuttle Plus';
        this.templatesPath = path.join(__dirname, '../../emails');
    }

    /**
     * Check if email service is configured
     */
    isConfigured() {
        return !!(sgMail || transporter);
    }

    /**
     * Load and process email template
     * @param {string} templateName - Name of template file (without .html)
     * @param {Object} variables - Variables to replace in template
     */
    async loadTemplate(templateName, variables = {}) {
        try {
            const templatePath = path.join(this.templatesPath, `${templateName}.html`);
            let html = await fs.readFile(templatePath, 'utf8');

            // Replace all template variables {{variable_name}}
            for (const [key, value] of Object.entries(variables)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                html = html.replace(regex, value || '');
            }

            return html;
        } catch (error) {
            console.error(`Failed to load email template ${templateName}:`, error.message);
            throw new Error(`Email template '${templateName}' not found`);
        }
    }

    /**
     * Send email via SendGrid or SMTP
     */
    async sendEmail(options) {
        const { to, subject, html, text, templateName, variables } = options;

        // Load template if specified
        let htmlContent = html;
        if (templateName) {
            htmlContent = await this.loadTemplate(templateName, variables);
        }

        // Development mode - just log
        if (!this.isConfigured()) {
            console.log('========================================');
            console.log('[Email Service] Development Mode');
            console.log(`To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Template: ${templateName || 'custom'}`);
            console.log('========================================');
            return { success: true, mode: 'development' };
        }

        try {
            if (sgMail) {
                // Use SendGrid
                await sgMail.send({
                    to,
                    from: {
                        email: this.fromEmail,
                        name: this.fromName
                    },
                    subject,
                    html: htmlContent,
                    text: text || this.htmlToText(htmlContent)
                });
            } else if (transporter) {
                // Use SMTP/Nodemailer
                await transporter.sendMail({
                    from: `"${this.fromName}" <${this.fromEmail}>`,
                    to,
                    subject,
                    html: htmlContent,
                    text: text || this.htmlToText(htmlContent)
                });
            }

            console.log(`[Email] Sent to ${to}: ${subject}`);
            return { success: true };

        } catch (error) {
            console.error('[Email] Send failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Convert HTML to plain text (simple version)
     */
    htmlToText(html) {
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
    }

    /**
     * Format date for Ethiopian timezone
     */
    formatDate(date, format = 'full') {
        const d = new Date(date);
        const options = {
            timeZone: 'Africa/Addis_Ababa'
        };

        if (format === 'full') {
            return d.toLocaleDateString('en-GB', {
                ...options,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (format === 'short') {
            return d.toLocaleDateString('en-GB', {
                ...options,
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else if (format === 'time') {
            return d.toLocaleTimeString('en-GB', {
                ...options,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Calculate time until pickup
     */
    getTimeUntilPickup(pickupDate) {
        const now = new Date();
        const pickup = new Date(pickupDate);
        const diffMs = pickup - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 24) {
            const days = Math.floor(diffHours / 24);
            return `${days} day${days > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `${diffHours}h ${diffMins}m`;
        } else {
            return `${diffMins} minutes`;
        }
    }

    /**
     * Get initials from name
     */
    getInitials(name) {
        if (!name) return '??';
        return name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    // ========================================
    // Email Templates
    // ========================================

    /**
     * Send booking confirmation email
     */
    async sendBookingConfirmation(booking) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';
        const pickupDate = new Date(booking.pickup.scheduledTime);

        const variables = {
            customer_name: booking.contact.name,
            booking_reference: booking.bookingReference,
            trip_date: this.formatDate(pickupDate, 'full'),
            trip_time: this.formatDate(pickupDate, 'time'),
            pickup_location: booking.pickup.location,
            dropoff_location: booking.dropoff.location,
            vehicle_type: booking.vehicleType || 'Sedan',
            passengers: booking.passengers?.toString() || '1',
            luggage: booking.luggage?.toString() || '1',
            total_usd: booking.pricing?.totalUSD?.toFixed(2) || '0.00',
            total_etb: booking.pricing?.totalETB?.toFixed(2) || '0.00',
            payment_status: booking.payment?.status === 'paid' ? 'Paid' : 'Pending',
            view_booking_url: `${baseUrl}/pages/tickets.html?id=${booking.bookingReference}`,
            cancel_booking_url: `${baseUrl}/pages/cancel.html?id=${booking.bookingReference}`,
            contact_url: `${baseUrl}/pages/contact.html`
        };

        // Add flight info if available
        if (booking.flightNumber) {
            variables.flight_number = booking.flightNumber;
            variables.airline = booking.airline || '';
        }

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Booking Confirmed - ${booking.bookingReference} | Shuttle Plus`,
            templateName: 'booking-confirmation',
            variables
        });
    }

    /**
     * Send driver assigned notification
     */
    async sendDriverAssigned(booking) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';
        const pickupDate = new Date(booking.pickup.scheduledTime);

        const variables = {
            customer_name: booking.contact.name,
            driver_name: booking.driver?.name || 'Your Driver',
            driver_initials: this.getInitials(booking.driver?.name),
            driver_rating: booking.driver?.rating?.toFixed(1) || '4.9',
            driver_trips: booking.driver?.completedTrips?.toString() || '500',
            driver_languages: booking.driver?.languages?.join(', ') || 'Amharic, English',
            driver_phone: booking.driver?.phone || '+251911234567',
            driver_whatsapp: (booking.driver?.phone || '+251911234567').replace(/[^0-9]/g, ''),
            vehicle_model: booking.driver?.vehicleModel || 'Toyota Camry',
            vehicle_color: booking.driver?.vehicleColor || 'White',
            vehicle_plate: booking.driver?.vehiclePlate || '3-AA-12345',
            trip_date: this.formatDate(pickupDate, 'short'),
            trip_time: this.formatDate(pickupDate, 'time'),
            pickup_location: booking.pickup.location,
            dropoff_location: booking.dropoff.location,
            meeting_instructions: booking.pickup.meetingInstructions ||
                'Your driver will meet you at the arrivals area, holding a sign with your name.',
            tracking_url: `${baseUrl}/pages/tracking.html?id=${booking.bookingReference}`
        };

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Driver Assigned - ${booking.driver?.name || 'Your Driver'} | Shuttle Plus`,
            templateName: 'driver-assigned',
            variables
        });
    }

    /**
     * Send trip reminder email
     */
    async sendTripReminder(booking) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';
        const pickupDate = new Date(booking.pickup.scheduledTime);
        const timeUntil = this.getTimeUntilPickup(pickupDate);

        // Calculate countdown values
        const diffMs = pickupDate - new Date();
        const countdownHours = Math.floor(diffMs / (1000 * 60 * 60));
        const countdownMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const variables = {
            customer_name: booking.contact.name,
            time_until_pickup: timeUntil,
            countdown_hours: countdownHours.toString(),
            countdown_minutes: countdownMinutes.toString(),
            trip_date: this.formatDate(pickupDate, 'full'),
            trip_time: this.formatDate(pickupDate, 'time'),
            pickup_location: booking.pickup.location,
            dropoff_location: booking.dropoff.location,
            driver_name: booking.driver?.name || 'Your Driver',
            driver_initials: this.getInitials(booking.driver?.name),
            driver_phone: booking.driver?.phone || '+251911234567',
            vehicle_model: booking.driver?.vehicleModel || 'Toyota Camry',
            vehicle_color: booking.driver?.vehicleColor || 'White',
            vehicle_plate: booking.driver?.vehiclePlate || '3-AA-12345',
            view_booking_url: `${baseUrl}/pages/tickets.html?id=${booking.bookingReference}`,
            tracking_url: `${baseUrl}/pages/tracking.html?id=${booking.bookingReference}`,
            modify_booking_url: `${baseUrl}/pages/modify.html?id=${booking.bookingReference}`,
            unsubscribe_url: `${baseUrl}/unsubscribe?email=${encodeURIComponent(booking.contact.email)}`
        };

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Trip Reminder - ${timeUntil} until pickup | Shuttle Plus`,
            templateName: 'trip-reminder',
            variables
        });
    }

    /**
     * Send payment confirmation email
     */
    async sendPaymentConfirmation(booking, payment) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';

        const variables = {
            customer_name: booking.contact.name,
            booking_reference: booking.bookingReference,
            amount_paid: payment.amount?.toFixed(2) || booking.pricing?.totalUSD?.toFixed(2),
            currency: payment.currency || 'USD',
            payment_method: this.formatPaymentMethod(payment.method),
            transaction_id: payment.transactionId || 'N/A',
            payment_date: this.formatDate(new Date(), 'full'),
            receipt_url: `${baseUrl}/api/receipts/${booking.bookingReference}`,
            view_booking_url: `${baseUrl}/pages/tickets.html?id=${booking.bookingReference}`
        };

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Payment Confirmed - ${booking.bookingReference} | Shuttle Plus`,
            templateName: 'payment-confirmation',
            variables
        });
    }

    /**
     * Send cancellation confirmation email
     */
    async sendCancellationConfirmation(booking, refundAmount = null) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';

        const variables = {
            customer_name: booking.contact.name,
            booking_reference: booking.bookingReference,
            cancellation_date: this.formatDate(new Date(), 'full'),
            original_pickup_date: this.formatDate(booking.pickup.scheduledTime, 'full'),
            pickup_location: booking.pickup.location,
            dropoff_location: booking.dropoff.location,
            refund_amount: refundAmount ? refundAmount.toFixed(2) : 'N/A',
            refund_status: refundAmount ? 'Processing (3-5 business days)' : 'No refund applicable',
            new_booking_url: `${baseUrl}/pages/book.html`,
            contact_url: `${baseUrl}/pages/contact.html`
        };

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Booking Cancelled - ${booking.bookingReference} | Shuttle Plus`,
            templateName: 'cancellation-confirmation',
            variables
        });
    }

    /**
     * Send trip completed / feedback request email
     */
    async sendTripCompletedEmail(booking) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';

        const variables = {
            customer_name: booking.contact.name,
            booking_reference: booking.bookingReference,
            driver_name: booking.driver?.name || 'Your Driver',
            driver_initials: this.getInitials(booking.driver?.name),
            trip_date: this.formatDate(booking.pickup.scheduledTime, 'short'),
            pickup_location: booking.pickup.location,
            dropoff_location: booking.dropoff.location,
            total_paid: booking.pricing?.totalUSD?.toFixed(2) || '0.00',
            feedback_url: `${baseUrl}/pages/feedback.html?id=${booking.bookingReference}`,
            book_again_url: `${baseUrl}/pages/book.html`
        };

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Trip Complete - How was your ride? | Shuttle Plus`,
            templateName: 'trip-completed',
            variables
        });
    }

    /**
     * Send flight delay notification email
     */
    async sendFlightDelayEmail(booking, newArrivalTime) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';
        const originalTime = new Date(booking.pickup.scheduledTime);
        const newTime = new Date(newArrivalTime);

        const variables = {
            customer_name: booking.contact.name,
            booking_reference: booking.bookingReference,
            flight_number: booking.flightNumber || 'N/A',
            original_arrival: this.formatDate(originalTime, 'time'),
            new_arrival: this.formatDate(newTime, 'time'),
            original_pickup: this.formatDate(originalTime, 'time'),
            new_pickup: this.formatDate(newTime, 'time'),
            delay_duration: this.calculateDelayDuration(originalTime, newTime),
            driver_name: booking.driver?.name || 'Your Driver',
            tracking_url: `${baseUrl}/pages/tracking.html?id=${booking.bookingReference}`,
            contact_url: `${baseUrl}/pages/contact.html`
        };

        return this.sendEmail({
            to: booking.contact.email,
            subject: `Flight Delay Detected - Pickup Time Updated | Shuttle Plus`,
            templateName: 'flight-delay',
            variables
        });
    }

    /**
     * Send welcome email for new user registration
     */
    async sendWelcomeEmail(user) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';

        const variables = {
            customer_name: user.firstName || user.name || 'Valued Customer',
            email: user.email,
            book_now_url: `${baseUrl}/pages/book.html`,
            about_url: `${baseUrl}/pages/about.html`,
            support_email: 'support@shuttleplus.et',
            support_phone: '+251 91 234 5678'
        };

        return this.sendEmail({
            to: user.email,
            subject: 'Welcome to Shuttle Plus - Your Airport Transfer Partner',
            templateName: 'welcome',
            variables
        });
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(user, resetToken) {
        const baseUrl = process.env.BASE_URL || 'https://shuttleplus.et';

        const variables = {
            customer_name: user.firstName || user.name || 'Valued Customer',
            reset_url: `${baseUrl}/pages/reset-password.html?token=${resetToken}`,
            expiry_time: '1 hour',
            support_email: 'support@shuttleplus.et'
        };

        return this.sendEmail({
            to: user.email,
            subject: 'Reset Your Password | Shuttle Plus',
            templateName: 'password-reset',
            variables
        });
    }

    // ========================================
    // Helper Methods
    // ========================================

    formatPaymentMethod(method) {
        const methods = {
            'stripe': 'Credit/Debit Card',
            'telebirr': 'Telebirr',
            'cash': 'Cash',
            'bank_transfer': 'Bank Transfer'
        };
        return methods[method] || method || 'Unknown';
    }

    calculateDelayDuration(original, newTime) {
        const diffMs = new Date(newTime) - new Date(original);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes > 0 ? `and ${minutes} minutes` : ''}`;
        }
        return `${minutes} minutes`;
    }
}

// Export singleton instance
module.exports = new EmailService();
