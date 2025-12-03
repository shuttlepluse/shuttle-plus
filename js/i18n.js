// ========================================
// Internationalization (i18n) System
// ========================================
// Supports English and Amharic for Shuttle Plus
// ========================================

const i18n = {
    // Current language
    currentLanguage: 'en',

    // Supported languages
    supportedLanguages: {
        en: { name: 'English', nativeName: 'English', dir: 'ltr' },
        am: { name: 'Amharic', nativeName: 'አማርኛ', dir: 'ltr' }
    },

    // Translation strings
    translations: {
        // ========================================
        // Common / Global
        // ========================================
        en: {
            // Navigation
            nav_home: 'Home',
            nav_booking: 'Book Transfer',
            nav_tickets: 'My Tickets',
            nav_tracking: 'Track',
            nav_about: 'About',
            nav_contact: 'Contact',
            nav_blog: 'Blog',
            nav_login: 'Login',
            nav_logout: 'Logout',
            nav_profile: 'Profile',

            // Common buttons
            btn_book_now: 'Book Now',
            btn_get_quote: 'Get Quote',
            btn_submit: 'Submit',
            btn_cancel: 'Cancel',
            btn_confirm: 'Confirm',
            btn_continue: 'Continue',
            btn_back: 'Back',
            btn_close: 'Close',
            btn_save: 'Save',
            btn_edit: 'Edit',
            btn_delete: 'Delete',
            btn_download: 'Download',
            btn_share: 'Share',
            btn_pay_now: 'Pay Now',
            btn_track_driver: 'Track Driver',
            btn_view_ticket: 'View Ticket',
            btn_contact_driver: 'Contact Driver',
            btn_try_again: 'Try Again',

            // Form labels
            label_name: 'Full Name',
            label_email: 'Email Address',
            label_phone: 'Phone Number',
            label_pickup: 'Pickup Location',
            label_dropoff: 'Drop-off Location',
            label_date: 'Date',
            label_time: 'Time',
            label_passengers: 'Passengers',
            label_luggage: 'Luggage',
            label_flight_number: 'Flight Number',
            label_special_requests: 'Special Requests',
            label_vehicle_type: 'Vehicle Type',
            label_payment_method: 'Payment Method',

            // Placeholders
            placeholder_name: 'Enter your full name',
            placeholder_email: 'your@email.com',
            placeholder_phone: '+251 9XX XXX XXXX',
            placeholder_pickup: 'Select pickup location',
            placeholder_dropoff: 'Select drop-off location',
            placeholder_flight: 'e.g., ET302',
            placeholder_requests: 'Any special requirements?',

            // Validation messages
            validation_required: 'This field is required',
            validation_email: 'Please enter a valid email address',
            validation_phone: 'Please enter a valid phone number',
            validation_min_passengers: 'At least 1 passenger required',
            validation_future_date: 'Please select a future date',

            // Booking types
            booking_arrival: 'Airport Pickup',
            booking_departure: 'Airport Drop-off',
            booking_type_arrival: 'Arrival',
            booking_type_departure: 'Departure',

            // Vehicle types
            vehicle_standard: 'Standard',
            vehicle_executive: 'Executive',
            vehicle_suv: 'SUV',
            vehicle_luxury: 'Luxury',
            vehicle_standard_desc: 'Comfortable sedan for up to 3 passengers',
            vehicle_executive_desc: 'Premium sedan with extra legroom',
            vehicle_suv_desc: 'Spacious SUV for families and groups',
            vehicle_luxury_desc: 'Top-tier luxury experience',

            // Payment methods
            payment_stripe: 'Credit/Debit Card',
            payment_telebirr: 'Telebirr',
            payment_cash: 'Cash',
            payment_corporate: 'Corporate Account',

            // Booking status
            status_pending: 'Pending',
            status_confirmed: 'Confirmed',
            status_driver_assigned: 'Driver Assigned',
            status_driver_enroute: 'Driver En Route',
            status_driver_arrived: 'Driver Arrived',
            status_in_progress: 'In Progress',
            status_completed: 'Completed',
            status_cancelled: 'Cancelled',

            // Flight status
            flight_scheduled: 'Scheduled',
            flight_delayed: 'Delayed',
            flight_landed: 'Landed',
            flight_departed: 'Departed',
            flight_cancelled: 'Cancelled',

            // Home page
            hero_title: 'Premium Airport Transfers',
            hero_subtitle: 'Your journey starts the moment you land',
            hero_cta: 'Book Your Transfer',

            feature_flight_tracking: 'Real-Time Flight Tracking',
            feature_flight_tracking_desc: 'We monitor your flight and adjust pickup times automatically',
            feature_professional_drivers: 'Professional Drivers',
            feature_professional_drivers_desc: 'Vetted, experienced drivers with local knowledge',
            feature_fixed_pricing: 'Fixed Pricing',
            feature_fixed_pricing_desc: 'No hidden fees or surge pricing, ever',
            feature_24_7: '24/7 Support',
            feature_24_7_desc: 'Round the clock assistance whenever you need it',

            // Booking page
            booking_title: 'Book Your Transfer',
            booking_step_1: 'Trip Details',
            booking_step_2: 'Vehicle & Options',
            booking_step_3: 'Contact Info',
            booking_step_4: 'Payment',
            booking_summary: 'Booking Summary',
            booking_base_fare: 'Base Fare',
            booking_child_seat: 'Child Seat',
            booking_late_night: 'Late Night Surcharge',
            booking_total: 'Total',
            booking_reference: 'Booking Reference',

            // Tickets page
            tickets_title: 'My Tickets',
            tickets_upcoming: 'Upcoming',
            tickets_past: 'Past',
            tickets_no_bookings: 'No bookings found',
            tickets_lookup: 'Lookup Booking',
            tickets_lookup_placeholder: 'Enter booking reference',

            // Tracking page
            tracking_title: 'Track Your Driver',
            tracking_eta: 'Estimated Arrival',
            tracking_driver: 'Your Driver',
            tracking_vehicle: 'Vehicle',
            tracking_plate: 'License Plate',
            tracking_contact: 'Contact Driver',
            tracking_live: 'Live Tracking',

            // About page
            about_title: 'About Shuttle Plus',
            about_mission: 'Our Mission',
            about_story: 'Our Story',
            about_team: 'Our Team',
            about_values: 'Our Values',

            // Contact page
            contact_title: 'Contact Us',
            contact_phone: 'Phone',
            contact_email: 'Email',
            contact_address: 'Address',
            contact_hours: 'Business Hours',
            contact_form_title: 'Send us a message',
            contact_form_success: 'Message sent successfully!',

            // Footer
            footer_about: 'Ethiopia\'s premier airport transfer service',
            footer_quick_links: 'Quick Links',
            footer_contact: 'Contact Us',
            footer_follow: 'Follow Us',
            footer_copyright: '© 2024 Shuttle Plus. All rights reserved.',
            footer_terms: 'Terms of Service',
            footer_privacy: 'Privacy Policy',

            // Messages
            msg_loading: 'Loading...',
            msg_error: 'Something went wrong',
            msg_success: 'Success!',
            msg_booking_confirmed: 'Your booking has been confirmed!',
            msg_payment_processing: 'Processing payment...',
            msg_payment_success: 'Payment successful!',
            msg_payment_failed: 'Payment failed. Please try again.',
            msg_offline: 'You are currently offline',
            msg_online: 'You are back online',

            // Time/Date
            today: 'Today',
            tomorrow: 'Tomorrow',
            minutes: 'minutes',
            hours: 'hours',
            days: 'days',

            // Currency
            currency_usd: 'USD',
            currency_etb: 'ETB',
            currency_symbol_usd: '$',
            currency_symbol_etb: 'Br'
        },

        // ========================================
        // Amharic Translations
        // ========================================
        am: {
            // Navigation
            nav_home: 'መነሻ',
            nav_booking: 'ቦታ ይያዙ',
            nav_tickets: 'ትኬቶቼ',
            nav_tracking: 'ይከታተሉ',
            nav_about: 'ስለ እኛ',
            nav_contact: 'አግኙን',
            nav_blog: 'ብሎግ',
            nav_login: 'ይግቡ',
            nav_logout: 'ይውጡ',
            nav_profile: 'መገለጫ',

            // Common buttons
            btn_book_now: 'አሁን ይያዙ',
            btn_get_quote: 'ዋጋ ይጠይቁ',
            btn_submit: 'ያስገቡ',
            btn_cancel: 'ይሰርዙ',
            btn_confirm: 'ያረጋግጡ',
            btn_continue: 'ይቀጥሉ',
            btn_back: 'ተመለስ',
            btn_close: 'ዝጋ',
            btn_save: 'ያስቀምጡ',
            btn_edit: 'ያስተካክሉ',
            btn_delete: 'ይሰርዙ',
            btn_download: 'አውርድ',
            btn_share: 'አጋራ',
            btn_pay_now: 'አሁን ይክፈሉ',
            btn_track_driver: 'ሹፌሩን ይከታተሉ',
            btn_view_ticket: 'ትኬት ይመልከቱ',
            btn_contact_driver: 'ሹፌሩን ያግኙ',
            btn_try_again: 'እንደገና ይሞክሩ',

            // Form labels
            label_name: 'ሙሉ ስም',
            label_email: 'ኢሜይል አድራሻ',
            label_phone: 'ስልክ ቁጥር',
            label_pickup: 'መነሻ ቦታ',
            label_dropoff: 'መድረሻ ቦታ',
            label_date: 'ቀን',
            label_time: 'ሰዓት',
            label_passengers: 'ተሳፋሪዎች',
            label_luggage: 'ሻንጣዎች',
            label_flight_number: 'የበረራ ቁጥር',
            label_special_requests: 'ልዩ ጥያቄዎች',
            label_vehicle_type: 'የመኪና አይነት',
            label_payment_method: 'የክፍያ ዘዴ',

            // Placeholders
            placeholder_name: 'ሙሉ ስምዎን ያስገቡ',
            placeholder_email: 'your@email.com',
            placeholder_phone: '+251 9XX XXX XXXX',
            placeholder_pickup: 'መነሻ ቦታ ይምረጡ',
            placeholder_dropoff: 'መድረሻ ቦታ ይምረጡ',
            placeholder_flight: 'ምሳሌ: ET302',
            placeholder_requests: 'ልዩ መስፈርቶች ካሉ?',

            // Validation messages
            validation_required: 'ይህ መረጃ ያስፈልጋል',
            validation_email: 'እባክዎ ትክክለኛ ኢሜይል ያስገቡ',
            validation_phone: 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ',
            validation_min_passengers: 'ቢያንስ 1 ተሳፋሪ ያስፈልጋል',
            validation_future_date: 'እባክዎ የወደፊት ቀን ይምረጡ',

            // Booking types
            booking_arrival: 'ከአየር ማረፊያ ይውሰዱኝ',
            booking_departure: 'ወደ አየር ማረፊያ ይውሰዱኝ',
            booking_type_arrival: 'መምጣት',
            booking_type_departure: 'መውጣት',

            // Vehicle types
            vehicle_standard: 'መደበኛ',
            vehicle_executive: 'ኤግዘክዩቲቭ',
            vehicle_suv: 'SUV',
            vehicle_luxury: 'ልዩ',
            vehicle_standard_desc: 'እስከ 3 ተሳፋሪዎች ምቹ ሴዳን',
            vehicle_executive_desc: 'ተጨማሪ ቦታ ያለው ፕሪሚየም ሴዳን',
            vehicle_suv_desc: 'ለቤተሰቦች ሰፊ SUV',
            vehicle_luxury_desc: 'ከፍተኛ ደረጃ ልምድ',

            // Payment methods
            payment_stripe: 'ክሬዲት/ዴቢት ካርድ',
            payment_telebirr: 'ቴሌ ብር',
            payment_cash: 'በጥሬ ገንዘብ',
            payment_corporate: 'የኩባንያ ሂሳብ',

            // Booking status
            status_pending: 'በመጠባበቅ ላይ',
            status_confirmed: 'ተረጋግጧል',
            status_driver_assigned: 'ሹፌር ተመድቧል',
            status_driver_enroute: 'ሹፌር መንገድ ላይ',
            status_driver_arrived: 'ሹፌር ደርሷል',
            status_in_progress: 'በሂደት ላይ',
            status_completed: 'ተጠናቋል',
            status_cancelled: 'ተሰርዟል',

            // Flight status
            flight_scheduled: 'የታቀደ',
            flight_delayed: 'ዘግይቷል',
            flight_landed: 'አርፏል',
            flight_departed: 'ወጥቷል',
            flight_cancelled: 'ተሰርዟል',

            // Home page
            hero_title: 'ፕሪሚየም የአየር ማረፊያ ማጓጓዣ',
            hero_subtitle: 'ጉዞዎ ሲያርፉ ይጀምራል',
            hero_cta: 'ቦታ ይያዙ',

            feature_flight_tracking: 'በቀጥታ የበረራ ክትትል',
            feature_flight_tracking_desc: 'በረራዎን እንከታተላለን፣ ሰዓት በራስ-ሰር ይስተካከላል',
            feature_professional_drivers: 'ፕሮፌሽናል ሹፌሮች',
            feature_professional_drivers_desc: 'የተመረጡ፣ ልምድ ያላቸው ሹፌሮች',
            feature_fixed_pricing: 'ቋሚ ዋጋ',
            feature_fixed_pricing_desc: 'ድብቅ ክፍያ የለም፣ ምንጊዜም',
            feature_24_7: '24/7 ድጋፍ',
            feature_24_7_desc: 'በማንኛውም ጊዜ እርዳታ',

            // Booking page
            booking_title: 'ቦታ ይያዙ',
            booking_step_1: 'የጉዞ ዝርዝር',
            booking_step_2: 'መኪና እና አማራጮች',
            booking_step_3: 'የአግኝ መረጃ',
            booking_step_4: 'ክፍያ',
            booking_summary: 'የቦታ ማስያዝ ማጠቃለያ',
            booking_base_fare: 'መሰረታዊ ዋጋ',
            booking_child_seat: 'የልጅ ወንበር',
            booking_late_night: 'የለሊት ተጨማሪ',
            booking_total: 'ድምር',
            booking_reference: 'የማጣቀሻ ቁጥር',

            // Tickets page
            tickets_title: 'ትኬቶቼ',
            tickets_upcoming: 'መጪ',
            tickets_past: 'ያለፉ',
            tickets_no_bookings: 'ምንም ቦታ ማስያዝ አልተገኘም',
            tickets_lookup: 'ቦታ ማስያዝ ፈልግ',
            tickets_lookup_placeholder: 'የማጣቀሻ ቁጥር ያስገቡ',

            // Tracking page
            tracking_title: 'ሹፌርዎን ይከታተሉ',
            tracking_eta: 'የሚደርስበት ግምት',
            tracking_driver: 'ሹፌርዎ',
            tracking_vehicle: 'መኪና',
            tracking_plate: 'ሰሌዳ',
            tracking_contact: 'ሹፌሩን ያግኙ',
            tracking_live: 'በቀጥታ ክትትል',

            // About page
            about_title: 'ስለ ሸትል ፕላስ',
            about_mission: 'ተልዕኮአችን',
            about_story: 'ታሪካችን',
            about_team: 'ቡድናችን',
            about_values: 'እሴቶቻችን',

            // Contact page
            contact_title: 'አግኙን',
            contact_phone: 'ስልክ',
            contact_email: 'ኢሜይል',
            contact_address: 'አድራሻ',
            contact_hours: 'የስራ ሰዓት',
            contact_form_title: 'መልዕክት ይላኩልን',
            contact_form_success: 'መልዕክት በተሳካ ሁኔታ ተልኳል!',

            // Footer
            footer_about: 'የኢትዮጵያ ቀዳሚ የአየር ማረፊያ ማጓጓዣ አገልግሎት',
            footer_quick_links: 'ፈጣን ማገናኛዎች',
            footer_contact: 'አግኙን',
            footer_follow: 'ይከተሉን',
            footer_copyright: '© 2024 ሸትል ፕላስ። መብቱ በህግ የተጠበቀ ነው።',
            footer_terms: 'የአገልግሎት ውል',
            footer_privacy: 'የግላዊነት ፖሊሲ',

            // Messages
            msg_loading: 'በመጫን ላይ...',
            msg_error: 'ችግር ተፈጥሯል',
            msg_success: 'ተሳክቷል!',
            msg_booking_confirmed: 'ቦታ ማስያዝዎ ተረጋግጧል!',
            msg_payment_processing: 'ክፍያ በሂደት ላይ...',
            msg_payment_success: 'ክፍያ ተሳክቷል!',
            msg_payment_failed: 'ክፍያ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
            msg_offline: 'በአሁኑ ጊዜ ከመስመር ውጪ ነዎት',
            msg_online: 'ወደ መስመር ተመልሰዋል',

            // Time/Date
            today: 'ዛሬ',
            tomorrow: 'ነገ',
            minutes: 'ደቂቃዎች',
            hours: 'ሰዓታት',
            days: 'ቀናት',

            // Currency
            currency_usd: 'ዶላር',
            currency_etb: 'ብር',
            currency_symbol_usd: '$',
            currency_symbol_etb: 'ብር'
        }
    },

    /**
     * Initialize i18n system
     */
    init() {
        // Get saved language or detect from browser
        const savedLang = localStorage.getItem('shuttle_language');
        const browserLang = navigator.language?.substring(0, 2);

        if (savedLang && this.supportedLanguages[savedLang]) {
            this.currentLanguage = savedLang;
        } else if (browserLang && this.supportedLanguages[browserLang]) {
            this.currentLanguage = browserLang;
        }

        // Apply translations
        this.applyTranslations();

        // Set up language switcher
        this.setupLanguageSwitcher();

        console.log(`[i18n] Initialized with language: ${this.currentLanguage}`);
    },

    /**
     * Get translation for key
     * @param {string} key - Translation key
     * @param {object} params - Parameters for interpolation
     * @returns {string} Translated string
     */
    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage]?.[key]
            || this.translations.en[key]
            || key;

        // Simple parameter interpolation
        if (Object.keys(params).length > 0) {
            return translation.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }

        return translation;
    },

    /**
     * Set current language
     * @param {string} lang - Language code
     */
    setLanguage(lang) {
        if (!this.supportedLanguages[lang]) {
            console.warn(`[i18n] Unsupported language: ${lang}`);
            return;
        }

        this.currentLanguage = lang;
        localStorage.setItem('shuttle_language', lang);

        // Update document direction (if needed for RTL languages)
        document.documentElement.dir = this.supportedLanguages[lang].dir;
        document.documentElement.lang = lang;

        // Apply translations
        this.applyTranslations();

        // Update language switcher UI
        this.updateLanguageSwitcher();

        // Emit custom event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));

        console.log(`[i18n] Language changed to: ${lang}`);
    },

    /**
     * Apply translations to DOM elements with data-i18n attribute
     */
    applyTranslations() {
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Translate titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.title = this.t(key);
        });

        // Translate aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            el.setAttribute('aria-label', this.t(key));
        });
    },

    /**
     * Set up language switcher UI
     */
    setupLanguageSwitcher() {
        // Handle select dropdown
        const switcher = document.getElementById('language-switcher');
        if (switcher) {
            switcher.innerHTML = '';

            Object.entries(this.supportedLanguages).forEach(([code, lang]) => {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = lang.nativeName;
                option.selected = code === this.currentLanguage;
                switcher.appendChild(option);
            });

            switcher.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
        }

        // Handle button toggles
        document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
            const lang = btn.getAttribute('data-lang-toggle');
            btn.classList.toggle('active', lang === this.currentLanguage);

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.setLanguage(lang);
            });
        });
    },

    /**
     * Update language switcher UI after language change
     */
    updateLanguageSwitcher() {
        const switcher = document.getElementById('language-switcher');
        if (switcher) {
            switcher.value = this.currentLanguage;
        }

        // Update all language toggle buttons
        document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
            const lang = btn.getAttribute('data-lang-toggle');
            btn.classList.toggle('active', lang === this.currentLanguage);
        });
    },

    /**
     * Format number according to locale
     * @param {number} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
        return new Intl.NumberFormat(this.currentLanguage === 'am' ? 'am-ET' : 'en-US').format(num);
    },

    /**
     * Format currency according to locale
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code (USD, ETB)
     * @returns {string} Formatted currency
     */
    formatCurrency(amount, currency = 'USD') {
        if (this.currentLanguage === 'am' || currency === 'ETB') {
            return `${this.formatNumber(amount)} ${this.t('currency_symbol_etb')}`;
        }
        return `$${this.formatNumber(amount)}`;
    },

    /**
     * Format date according to locale
     * @param {Date|string} date - Date to format
     * @param {object} options - Intl.DateTimeFormat options
     * @returns {string} Formatted date
     */
    formatDate(date, options = {}) {
        const d = new Date(date);
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        };

        const locale = this.currentLanguage === 'am' ? 'am-ET' : 'en-GB';
        return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
    },

    /**
     * Format time according to locale
     * @param {Date|string} date - Date/time to format
     * @returns {string} Formatted time
     */
    formatTime(date) {
        const d = new Date(date);
        const locale = this.currentLanguage === 'am' ? 'am-ET' : 'en-GB';
        return new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Africa/Addis_Ababa'
        }).format(d);
    },

    /**
     * Get current language code
     * @returns {string} Current language code
     */
    getLanguage() {
        return this.currentLanguage;
    },

    /**
     * Check if current language is RTL
     * @returns {boolean}
     */
    isRTL() {
        return this.supportedLanguages[this.currentLanguage]?.dir === 'rtl';
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
}
