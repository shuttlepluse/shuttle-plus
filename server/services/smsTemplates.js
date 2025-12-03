// ========================================
// SMS Templates Service
// ========================================
// Professional SMS templates for all notification types
// Supports English and Amharic (ready for i18n)
// SMS character limits: 160 chars for standard, 70 for Unicode
// ========================================

const templates = {
    // ========================================
    // Booking Lifecycle Templates
    // ========================================

    booking_confirmation: {
        en: (data) => {
            const { reference, pickupTime, destination, total, currency } = data;
            return `Shuttle Plus: Booking ${reference} confirmed! Pickup: ${pickupTime}. To: ${truncate(destination, 25)}. Total: ${currency}${total}. View: shuttleplus.et/t/${reference}`;
        },
        am: (data) => {
            const { reference, pickupTime, destination, total } = data;
            return `ሸትል ፕላስ: ቦታ ማስያዝ ${reference} ተረጋግጧል! ሰዓት: ${pickupTime}. ወደ: ${truncate(destination, 20)}. ድምር: ${total} ብር`;
        }
    },

    booking_pending_payment: {
        en: (data) => {
            const { reference, total, currency, expiresIn } = data;
            return `Shuttle Plus: Booking ${reference} awaiting payment. Amount: ${currency}${total}. Complete within ${expiresIn}min to secure your ride. Pay: shuttleplus.et/pay/${reference}`;
        },
        am: (data) => {
            const { reference, total, expiresIn } = data;
            return `ሸትል ፕላስ: ቦታ ማስያዝ ${reference} ክፍያ እየጠበቀ ነው። ድምር: ${total} ብር። በ${expiresIn} ደቂቃ ውስጥ ይክፈሉ`;
        }
    },

    payment_received: {
        en: (data) => {
            const { reference, amount, currency, method } = data;
            return `Shuttle Plus: Payment of ${currency}${amount} received for booking ${reference} via ${method}. Thank you! Receipt: shuttleplus.et/r/${reference}`;
        },
        am: (data) => {
            const { reference, amount, method } = data;
            return `ሸትል ፕላስ: ለቦታ ማስያዝ ${reference} ${amount} ብር ተቀብለናል በ${method}። እናመሰግናለን!`;
        }
    },

    booking_cancelled: {
        en: (data) => {
            const { reference, refundAmount, currency } = data;
            const refundMsg = refundAmount ? ` Refund of ${currency}${refundAmount} processing.` : '';
            return `Shuttle Plus: Booking ${reference} cancelled.${refundMsg} Questions? Call +251-911-123456`;
        },
        am: (data) => {
            const { reference, refundAmount } = data;
            const refundMsg = refundAmount ? ` ${refundAmount} ብር ተመላሽ ይደረጋል።` : '';
            return `ሸትል ፕላስ: ቦታ ማስያዝ ${reference} ተሰርዟል።${refundMsg} ጥያቄ? ይደውሉ +251-911-123456`;
        }
    },

    // ========================================
    // Driver Assignment Templates
    // ========================================

    driver_assigned: {
        en: (data) => {
            const { driverName, vehicleModel, plateNumber, driverPhone } = data;
            return `Shuttle Plus: ${driverName} assigned! Vehicle: ${vehicleModel} (${plateNumber}). Driver: ${driverPhone}. Track: shuttleplus.et/track`;
        },
        am: (data) => {
            const { driverName, vehicleModel, plateNumber, driverPhone } = data;
            return `ሸትል ፕላስ: ሹፌር ${driverName} ተመድቧል! መኪና: ${vehicleModel} (${plateNumber}). ስልክ: ${driverPhone}`;
        }
    },

    driver_enroute: {
        en: (data) => {
            const { driverName, eta, reference } = data;
            return `Shuttle Plus: ${driverName} is on the way! ETA: ${eta} min. Track live: shuttleplus.et/track/${reference}`;
        },
        am: (data) => {
            const { driverName, eta } = data;
            return `ሸትል ፕላስ: ${driverName} መንገድ ላይ ነው! በ${eta} ደቂቃ ይደርሳል`;
        }
    },

    driver_arrived: {
        en: (data) => {
            const { driverName, location, plateNumber } = data;
            return `Shuttle Plus: ${driverName} has arrived at ${truncate(location, 30)}! Look for plate: ${plateNumber}. Please proceed to your vehicle.`;
        },
        am: (data) => {
            const { driverName, plateNumber } = data;
            return `ሸትል ፕላስ: ${driverName} ደርሷል! ሰሌዳ: ${plateNumber}። እባክዎ ወደ መኪናው ይምጡ`;
        }
    },

    driver_waiting: {
        en: (data) => {
            const { driverName, waitingTime } = data;
            return `Shuttle Plus: ${driverName} has been waiting for ${waitingTime} min. Please proceed to pickup point or call your driver.`;
        },
        am: (data) => {
            const { driverName, waitingTime } = data;
            return `ሸትል ፕላስ: ${driverName} ለ${waitingTime} ደቂቃ እየጠበቀ ነው። እባክዎ ይምጡ ወይም ይደውሉ`;
        }
    },

    // ========================================
    // Flight Tracking Templates
    // ========================================

    flight_delay: {
        en: (data) => {
            const { flightNumber, originalTime, newTime, reference } = data;
            return `Shuttle Plus: Flight ${flightNumber} delayed from ${originalTime} to ${newTime}. Your pickup adjusted automatically. Ref: ${reference}`;
        },
        am: (data) => {
            const { flightNumber, newTime } = data;
            return `ሸትል ፕላስ: በረራ ${flightNumber} ዘግይቷል። አዲስ ሰዓት: ${newTime}። ቀጠሮዎ በራስ-ሰር ተስተካክሏል`;
        }
    },

    flight_landed: {
        en: (data) => {
            const { flightNumber, terminal, gate, driverName } = data;
            const driverInfo = driverName ? ` ${driverName} is waiting.` : '';
            return `Shuttle Plus: Flight ${flightNumber} landed! Terminal ${terminal}${gate ? `, Gate ${gate}` : ''}.${driverInfo} Welcome to Addis!`;
        },
        am: (data) => {
            const { flightNumber, terminal } = data;
            return `ሸትል ፕላስ: በረራ ${flightNumber} አርፏል! ተርሚናል ${terminal}። እንኳን ወደ አዲስ አበባ በደህና መጡ!`;
        }
    },

    flight_cancelled: {
        en: (data) => {
            const { flightNumber, reference } = data;
            return `Shuttle Plus: Flight ${flightNumber} cancelled. Your booking ${reference} will be automatically adjusted. We'll contact you with options.`;
        },
        am: (data) => {
            const { flightNumber, reference } = data;
            return `ሸትል ፕላስ: በረራ ${flightNumber} ተሰርዟል። ቦታ ማስያዝ ${reference} ይስተካከላል። አማራጮችን እናሳውቅዎታለን`;
        }
    },

    // ========================================
    // Trip Progress Templates
    // ========================================

    trip_started: {
        en: (data) => {
            const { destination, eta } = data;
            return `Shuttle Plus: Your trip has started! Destination: ${truncate(destination, 30)}. ETA: ${eta}. Enjoy your ride!`;
        },
        am: (data) => {
            const { destination, eta } = data;
            return `ሸትል ፕላስ: ጉዞዎ ተጀምሯል! መዳረሻ: ${truncate(destination, 25)}። ግምት: ${eta}`;
        }
    },

    trip_completed: {
        en: (data) => {
            const { reference, total, currency } = data;
            return `Shuttle Plus: Trip complete! Total: ${currency}${total}. Rate your ride: shuttleplus.et/rate/${reference}. Thank you!`;
        },
        am: (data) => {
            const { reference, total } = data;
            return `ሸትል ፕላስ: ጉዞ ተጠናቋል! ድምር: ${total} ብር። ደረጃ ይስጡ: shuttleplus.et/rate/${reference}`;
        }
    },

    // ========================================
    // Reminder Templates
    // ========================================

    reminder_24h: {
        en: (data) => {
            const { pickupTime, pickupLocation, reference } = data;
            return `Shuttle Plus: Reminder - pickup tomorrow at ${pickupTime} from ${truncate(pickupLocation, 25)}. Ref: ${reference}. Questions? Reply to this SMS.`;
        },
        am: (data) => {
            const { pickupTime, pickupLocation } = data;
            return `ሸትል ፕላስ: ማስታወሻ - ነገ ${pickupTime} ከ${truncate(pickupLocation, 20)}። ጥያቄ? ይደውሉ`;
        }
    },

    reminder_2h: {
        en: (data) => {
            const { pickupTime, driverName, plateNumber } = data;
            const driverInfo = driverName ? ` Driver: ${driverName} (${plateNumber})` : '';
            return `Shuttle Plus: Your pickup is in 2 hours at ${pickupTime}.${driverInfo} Be ready!`;
        },
        am: (data) => {
            const { pickupTime, driverName } = data;
            const driverInfo = driverName ? ` ሹፌር: ${driverName}` : '';
            return `ሸትል ፕላስ: ከ2 ሰዓት በኋላ ${pickupTime} ይጠበቃሉ።${driverInfo}`;
        }
    },

    reminder_30m: {
        en: (data) => {
            const { driverName, plateNumber, location } = data;
            return `Shuttle Plus: ${driverName} arriving in ~30min! Vehicle: ${plateNumber}. Be ready at ${truncate(location, 25)}.`;
        },
        am: (data) => {
            const { driverName, plateNumber } = data;
            return `ሸትል ፕላስ: ${driverName} በ30 ደቂቃ ውስጥ ይደርሳል! መኪና: ${plateNumber}። ዝግጁ ይሁኑ`;
        }
    },

    // ========================================
    // Account & Security Templates
    // ========================================

    otp_verification: {
        en: (data) => {
            const { otp, expiresIn } = data;
            return `Shuttle Plus: Your verification code is ${otp}. Valid for ${expiresIn} minutes. Never share this code with anyone.`;
        },
        am: (data) => {
            const { otp, expiresIn } = data;
            return `ሸትል ፕላስ: የማረጋገጫ ኮድዎ ${otp} ነው። ለ${expiresIn} ደቂቃ ብቻ ይሰራል። ለማንም አያጋሩ`;
        }
    },

    password_reset: {
        en: (data) => {
            const { otp, expiresIn } = data;
            return `Shuttle Plus: Password reset code: ${otp}. Valid for ${expiresIn} min. If you didn't request this, ignore this message.`;
        },
        am: (data) => {
            const { otp, expiresIn } = data;
            return `ሸትል ፕላስ: የይለፍ ቃል ዳግም ማዋቀር ኮድ: ${otp}። ለ${expiresIn} ደቂቃ ይሰራል`;
        }
    },

    account_locked: {
        en: (data) => {
            const { reason } = data;
            return `Shuttle Plus: Your account has been temporarily locked${reason ? `: ${reason}` : ''}. Contact support: +251-911-123456`;
        },
        am: (data) => {
            return `ሸትል ፕላስ: መለያዎ ለጊዜው ተቆልፏል። ድጋፍ: +251-911-123456`;
        }
    },

    // ========================================
    // Promotional Templates
    // ========================================

    welcome: {
        en: (data) => {
            const { name, promoCode } = data;
            const promo = promoCode ? ` Use code ${promoCode} for 10% off!` : '';
            return `Welcome to Shuttle Plus, ${name}! Ethiopia's premier airport transfer service.${promo} Book: shuttleplus.et`;
        },
        am: (data) => {
            const { name, promoCode } = data;
            const promo = promoCode ? ` ኮድ ${promoCode} ተጠቀሙ - 10% ቅናሽ!` : '';
            return `ወደ ሸትል ፕላስ እንኳን ደህና መጡ ${name}!${promo}`;
        }
    },

    promo_offer: {
        en: (data) => {
            const { discount, code, validUntil } = data;
            return `Shuttle Plus: ${discount}% OFF your next ride! Use code: ${code}. Valid until ${validUntil}. Book: shuttleplus.et`;
        },
        am: (data) => {
            const { discount, code, validUntil } = data;
            return `ሸትል ፕላስ: ${discount}% ቅናሽ! ኮድ: ${code}። እስከ ${validUntil}`;
        }
    },

    referral_success: {
        en: (data) => {
            const { friendName, credit, currency } = data;
            return `Shuttle Plus: ${friendName} used your referral! ${currency}${credit} credit added to your account. Keep sharing!`;
        },
        am: (data) => {
            const { friendName, credit } = data;
            return `ሸትል ፕላስ: ${friendName} ሪፈራልዎን ተጠቅሟል! ${credit} ብር ተጨምሯል`;
        }
    },

    // ========================================
    // Driver-Specific Templates
    // ========================================

    driver_new_trip: {
        en: (data) => {
            const { pickupTime, pickup, dropoff, fare, currency } = data;
            return `NEW TRIP! Pickup: ${pickupTime} at ${truncate(pickup, 20)}. To: ${truncate(dropoff, 20)}. Fare: ${currency}${fare}. Accept in app.`;
        },
        am: (data) => {
            const { pickupTime, pickup, fare } = data;
            return `አዲስ ጉዞ! ሰዓት: ${pickupTime} ከ${truncate(pickup, 20)}። ክፍያ: ${fare} ብር። በአፕ ያረጋግጡ`;
        }
    },

    driver_trip_cancelled: {
        en: (data) => {
            const { reference, reason } = data;
            return `Shuttle Plus Driver: Trip ${reference} cancelled${reason ? `: ${reason}` : ''}. You're available for new trips.`;
        },
        am: (data) => {
            const { reference } = data;
            return `ሸትል ፕላስ ሹፌር: ጉዞ ${reference} ተሰርዟል። ለአዲስ ጉዞ ዝግጁ ነዎት`;
        }
    },

    driver_payout: {
        en: (data) => {
            const { amount, currency, period } = data;
            return `Shuttle Plus: Your ${period} payout of ${currency}${amount} has been processed. Check your bank account.`;
        },
        am: (data) => {
            const { amount, period } = data;
            return `ሸትል ፕላስ: ${period} ክፍያዎ ${amount} ብር ተልኳል። የባንክ ሂሳብዎን ይመልከቱ`;
        }
    },

    // ========================================
    // Support Templates
    // ========================================

    support_ticket_created: {
        en: (data) => {
            const { ticketId } = data;
            return `Shuttle Plus: Support ticket #${ticketId} created. We'll respond within 24 hours. For urgent matters: +251-911-123456`;
        },
        am: (data) => {
            const { ticketId } = data;
            return `ሸትል ፕላስ: የድጋፍ ቲኬት #${ticketId} ተፈጥሯል። በ24 ሰዓት ውስጥ እንመልሳለን`;
        }
    },

    support_response: {
        en: (data) => {
            const { ticketId } = data;
            return `Shuttle Plus: We've responded to your support ticket #${ticketId}. View: shuttleplus.et/support/${ticketId}`;
        },
        am: (data) => {
            const { ticketId } = data;
            return `ሸትል ፕላስ: ለቲኬት #${ticketId} ምላሽ ሰጥተናል። ይመልከቱ: shuttleplus.et/support/${ticketId}`;
        }
    }
};

// ========================================
// Helper Functions
// ========================================

function truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 2) + '..';
}

function formatTime(date, timezone = 'Africa/Addis_Ababa') {
    return new Date(date).toLocaleTimeString('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(date, timezone = 'Africa/Addis_Ababa') {
    return new Date(date).toLocaleDateString('en-GB', {
        timeZone: timezone,
        day: 'numeric',
        month: 'short'
    });
}

function formatDateTime(date, timezone = 'Africa/Addis_Ababa') {
    return new Date(date).toLocaleString('en-GB', {
        timeZone: timezone,
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ========================================
// SMS Template Service Class
// ========================================

class SMSTemplateService {
    constructor() {
        this.defaultLanguage = 'en';
        this.supportedLanguages = ['en', 'am'];
    }

    /**
     * Get a formatted SMS message from template
     * @param {string} templateName - Name of the template
     * @param {object} data - Data to interpolate into template
     * @param {string} language - Language code (en, am)
     * @returns {string} Formatted SMS message
     */
    getMessage(templateName, data, language = 'en') {
        const template = templates[templateName];

        if (!template) {
            console.error(`[SMSTemplates] Template not found: ${templateName}`);
            return null;
        }

        // Fall back to default language if requested language not available
        const lang = template[language] ? language : this.defaultLanguage;

        try {
            const message = template[lang](data);

            // Log warning if message exceeds SMS limits
            const charLimit = lang === 'am' ? 70 : 160; // Unicode vs standard
            if (message.length > charLimit) {
                console.warn(`[SMSTemplates] Message exceeds ${charLimit} chars: ${templateName} (${message.length} chars)`);
            }

            return message;
        } catch (error) {
            console.error(`[SMSTemplates] Error generating message: ${templateName}`, error);
            return null;
        }
    }

    /**
     * Get message for booking confirmation
     */
    getBookingConfirmation(booking, language = 'en') {
        return this.getMessage('booking_confirmation', {
            reference: booking.bookingReference,
            pickupTime: formatDateTime(booking.pickup.scheduledTime),
            destination: booking.dropoff.location,
            total: booking.pricing.totalUSD,
            currency: '$'
        }, language);
    }

    /**
     * Get message for driver assignment
     */
    getDriverAssigned(booking, language = 'en') {
        return this.getMessage('driver_assigned', {
            driverName: booking.driver.name,
            vehicleModel: booking.driver.vehicleModel,
            plateNumber: booking.driver.vehiclePlate,
            driverPhone: booking.driver.phone
        }, language);
    }

    /**
     * Get message for driver en route
     */
    getDriverEnroute(booking, eta, language = 'en') {
        return this.getMessage('driver_enroute', {
            driverName: booking.driver.name,
            eta: eta,
            reference: booking.bookingReference
        }, language);
    }

    /**
     * Get message for driver arrival
     */
    getDriverArrived(booking, language = 'en') {
        return this.getMessage('driver_arrived', {
            driverName: booking.driver.name,
            location: booking.pickup.location,
            plateNumber: booking.driver.vehiclePlate
        }, language);
    }

    /**
     * Get message for flight delay
     */
    getFlightDelay(booking, originalTime, newTime, language = 'en') {
        return this.getMessage('flight_delay', {
            flightNumber: booking.flight.number,
            originalTime: formatTime(originalTime),
            newTime: formatTime(newTime),
            reference: booking.bookingReference
        }, language);
    }

    /**
     * Get message for trip completion
     */
    getTripCompleted(booking, language = 'en') {
        return this.getMessage('trip_completed', {
            reference: booking.bookingReference,
            total: booking.pricing.totalUSD,
            currency: '$'
        }, language);
    }

    /**
     * Get reminder message
     */
    getReminder(booking, reminderType = '24h', language = 'en') {
        const templateName = `reminder_${reminderType}`;
        return this.getMessage(templateName, {
            pickupTime: formatTime(booking.pickup.scheduledTime),
            pickupLocation: booking.pickup.location,
            reference: booking.bookingReference,
            driverName: booking.driver?.name,
            plateNumber: booking.driver?.vehiclePlate
        }, language);
    }

    /**
     * Get OTP verification message
     */
    getOTPVerification(otp, expiresInMinutes = 10, language = 'en') {
        return this.getMessage('otp_verification', {
            otp: otp,
            expiresIn: expiresInMinutes
        }, language);
    }

    /**
     * Get cancellation message
     */
    getCancellation(booking, refundAmount = null, language = 'en') {
        return this.getMessage('booking_cancelled', {
            reference: booking.bookingReference,
            refundAmount: refundAmount,
            currency: '$'
        }, language);
    }

    /**
     * Get welcome message for new users
     */
    getWelcome(user, promoCode = null, language = 'en') {
        return this.getMessage('welcome', {
            name: user.name?.split(' ')[0] || 'there',
            promoCode: promoCode
        }, language);
    }

    /**
     * Get driver new trip notification
     */
    getDriverNewTrip(booking, language = 'en') {
        return this.getMessage('driver_new_trip', {
            pickupTime: formatTime(booking.pickup.scheduledTime),
            pickup: booking.pickup.location,
            dropoff: booking.dropoff.location,
            fare: booking.pricing.totalUSD,
            currency: '$'
        }, language);
    }

    /**
     * Get all available template names
     */
    getAvailableTemplates() {
        return Object.keys(templates);
    }

    /**
     * Check if a template supports a language
     */
    supportsLanguage(templateName, language) {
        const template = templates[templateName];
        return template && typeof template[language] === 'function';
    }
}

// Export singleton instance
module.exports = new SMSTemplateService();
module.exports.templates = templates;
module.exports.formatTime = formatTime;
module.exports.formatDate = formatDate;
module.exports.formatDateTime = formatDateTime;
