// ========================================
// SHUTTLE PLUS - API Client
// ========================================

(function() {
    'use strict';

    // API Configuration
    const API_CONFIG = {
        baseUrl: '/api', // Will be updated for production
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000
    };

    // Auth token storage
    let authToken = localStorage.getItem('auth_token');

    // ========================================
    // HTTP Client
    // ========================================
    async function request(endpoint, options = {}) {
        const url = `${API_CONFIG.baseUrl}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        if (authToken) {
            defaultHeaders['Authorization'] = `Bearer ${authToken}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
        config.signal = controller.signal;

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Handle response
            const data = await parseResponse(response);

            if (!response.ok) {
                throw new ApiError(data.message || 'Request failed', response.status, data);
            }

            return data;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }

            if (error instanceof ApiError) {
                throw error;
            }

            // Network error - queue for offline sync if applicable
            if (!navigator.onLine) {
                throw new ApiError('No internet connection', 0);
            }

            throw new ApiError(error.message || 'Network error', 0);
        }
    }

    async function parseResponse(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        return { message: await response.text() };
    }

    // Custom API Error class
    class ApiError extends Error {
        constructor(message, status, data = null) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.data = data;
        }
    }

    // ========================================
    // HTTP Methods
    // ========================================
    const http = {
        get: (endpoint, options = {}) =>
            request(endpoint, { ...options, method: 'GET' }),

        post: (endpoint, data, options = {}) =>
            request(endpoint, {
                ...options,
                method: 'POST',
                body: JSON.stringify(data)
            }),

        put: (endpoint, data, options = {}) =>
            request(endpoint, {
                ...options,
                method: 'PUT',
                body: JSON.stringify(data)
            }),

        patch: (endpoint, data, options = {}) =>
            request(endpoint, {
                ...options,
                method: 'PATCH',
                body: JSON.stringify(data)
            }),

        delete: (endpoint, options = {}) =>
            request(endpoint, { ...options, method: 'DELETE' })
    };

    // ========================================
    // Auth API
    // ========================================
    const AuthAPI = {
        async register(phone, name) {
            const response = await http.post('/auth/register', { phone, name });
            return response;
        },

        async verifyOTP(phone, otp) {
            const response = await http.post('/auth/verify-otp', { phone, otp });
            if (response.token) {
                setAuthToken(response.token);
            }
            return response;
        },

        async login(phone) {
            const response = await http.post('/auth/login', { phone });
            return response;
        },

        async logout() {
            clearAuthToken();
            return { success: true };
        },

        async getProfile() {
            return http.get('/users/me');
        },

        async updateProfile(data) {
            return http.put('/users/me', data);
        },

        async updateNotificationPrefs(prefs) {
            return http.put('/users/me/notifications', prefs);
        }
    };

    // ========================================
    // Bookings API
    // ========================================
    const BookingsAPI = {
        async create(bookingData) {
            const response = await http.post('/bookings', bookingData);

            // Save to offline storage
            if (window.OfflineStorage) {
                await window.OfflineStorage.bookings.save(response);
            }

            return response;
        },

        async getAll() {
            try {
                const response = await http.get('/bookings');

                // Update offline storage
                if (window.OfflineStorage && response.bookings) {
                    for (const booking of response.bookings) {
                        await window.OfflineStorage.bookings.save(booking);
                    }
                }

                return response;
            } catch (error) {
                // Fallback to offline storage
                if (!navigator.onLine && window.OfflineStorage) {
                    const bookings = await window.OfflineStorage.bookings.getAll();
                    return { bookings, offline: true };
                }
                throw error;
            }
        },

        async getById(bookingId) {
            try {
                const response = await http.get(`/bookings/${bookingId}`);

                // Update offline storage
                if (window.OfflineStorage) {
                    await window.OfflineStorage.bookings.save(response);
                }

                return response;
            } catch (error) {
                // Fallback to offline storage
                if (!navigator.onLine && window.OfflineStorage) {
                    const booking = await window.OfflineStorage.bookings.get(bookingId);
                    if (booking) {
                        return { ...booking, offline: true };
                    }
                }
                throw error;
            }
        },

        async update(bookingId, data) {
            return http.put(`/bookings/${bookingId}`, data);
        },

        async cancel(bookingId, reason) {
            return http.delete(`/bookings/${bookingId}`, {
                body: JSON.stringify({ reason })
            });
        },

        async getTracking(bookingId) {
            return http.get(`/bookings/${bookingId}/tracking`);
        },

        async rate(bookingId, rating, review) {
            return http.post(`/bookings/${bookingId}/rate`, { rating, review });
        }
    };

    // ========================================
    // Flights API
    // ========================================
    const FlightsAPI = {
        async lookup(flightNumber) {
            return http.get(`/flights/${encodeURIComponent(flightNumber)}`);
        },

        async getStatus(flightNumber) {
            return http.get(`/flights/${encodeURIComponent(flightNumber)}/status`);
        }
    };

    // ========================================
    // Pricing API
    // ========================================
    const PricingAPI = {
        async calculate(data) {
            return http.post('/pricing/calculate', data);
        },

        async getZones() {
            return http.get('/pricing/zones');
        },

        async getVehicleClasses() {
            return http.get('/pricing/vehicles');
        }
    };

    // ========================================
    // Payments API
    // ========================================
    const PaymentsAPI = {
        // Stripe
        async createStripeIntent(bookingId, amount, currency = 'USD') {
            return http.post('/payments/stripe/create-intent', {
                bookingId,
                amount,
                currency
            });
        },

        async confirmStripePayment(paymentIntentId) {
            return http.post('/payments/stripe/confirm', {
                paymentIntentId
            });
        },

        // Telebirr
        async initiateTelebirr(bookingId, amount) {
            return http.post('/payments/telebirr/initiate', {
                bookingId,
                amount,
                currency: 'ETB'
            });
        },

        async checkTelebirrStatus(transactionId) {
            return http.get(`/payments/telebirr/status/${transactionId}`);
        },

        // General
        async getPaymentStatus(bookingId) {
            return http.get(`/payments/${bookingId}`);
        }
    };

    // ========================================
    // Notifications API
    // ========================================
    const NotificationsAPI = {
        async subscribe(subscription) {
            return http.post('/notifications/subscribe', subscription);
        },

        async unsubscribe() {
            return http.delete('/notifications/subscribe');
        },

        async sendTest() {
            return http.post('/notifications/test');
        }
    };

    // ========================================
    // Helper Functions
    // ========================================
    function setAuthToken(token) {
        authToken = token;
        localStorage.setItem('auth_token', token);
    }

    function clearAuthToken() {
        authToken = null;
        localStorage.removeItem('auth_token');
    }

    function isAuthenticated() {
        return !!authToken;
    }

    function setBaseUrl(url) {
        API_CONFIG.baseUrl = url;
    }

    // ========================================
    // Offline Queue
    // ========================================
    async function queueOfflineAction(action) {
        if (window.OfflineStorage) {
            await window.OfflineStorage.sync.addPending(action);
            console.log('[API] Action queued for offline sync:', action.type);
        }
    }

    async function processOfflineQueue() {
        if (!window.OfflineStorage || !navigator.onLine) return;

        const results = await window.OfflineStorage.sync.processPending(async (item) => {
            switch (item.type) {
                case 'CREATE_BOOKING':
                    await BookingsAPI.create(item.data);
                    break;
                case 'UPDATE_BOOKING':
                    await BookingsAPI.update(item.bookingId, item.data);
                    break;
                case 'CANCEL_BOOKING':
                    await BookingsAPI.cancel(item.bookingId, item.reason);
                    break;
                default:
                    console.warn('[API] Unknown offline action:', item.type);
            }
        });

        console.log('[API] Offline queue processed:', results);
        return results;
    }

    // Process queue when back online
    window.addEventListener('online', () => {
        setTimeout(processOfflineQueue, 2000);
    });

    // ========================================
    // Expose Public API
    // ========================================
    window.ShuttlePlusAPI = {
        // HTTP client
        http,

        // API modules
        auth: AuthAPI,
        bookings: BookingsAPI,
        flights: FlightsAPI,
        pricing: PricingAPI,
        payments: PaymentsAPI,
        notifications: NotificationsAPI,

        // Helpers
        setAuthToken,
        clearAuthToken,
        isAuthenticated,
        setBaseUrl,

        // Offline
        queueOfflineAction,
        processOfflineQueue,

        // Error class
        ApiError
    };

})();
