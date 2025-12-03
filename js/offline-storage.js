// ========================================
// SHUTTLE PLUS - Offline Storage (IndexedDB)
// ========================================

(function() {
    'use strict';

    const DB_NAME = 'ShuttlePlusDB';
    const DB_VERSION = 1;

    // Store names
    const STORES = {
        BOOKINGS: 'bookings',
        USER: 'user',
        PENDING_SYNC: 'pendingSync'
    };

    let db = null;

    // ========================================
    // Database Initialization
    // ========================================
    function openDatabase() {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[Storage] Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('[Storage] Database opened successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                console.log('[Storage] Database upgrade needed');

                // Bookings store
                if (!database.objectStoreNames.contains(STORES.BOOKINGS)) {
                    const bookingsStore = database.createObjectStore(STORES.BOOKINGS, {
                        keyPath: 'bookingReference'
                    });
                    bookingsStore.createIndex('status', 'status', { unique: false });
                    bookingsStore.createIndex('userId', 'userId', { unique: false });
                    bookingsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('[Storage] Bookings store created');
                }

                // User store
                if (!database.objectStoreNames.contains(STORES.USER)) {
                    database.createObjectStore(STORES.USER, {
                        keyPath: 'id'
                    });
                    console.log('[Storage] User store created');
                }

                // Pending sync store (for offline actions)
                if (!database.objectStoreNames.contains(STORES.PENDING_SYNC)) {
                    const syncStore = database.createObjectStore(STORES.PENDING_SYNC, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('[Storage] Pending sync store created');
                }
            };
        });
    }

    // ========================================
    // Generic CRUD Operations
    // ========================================
    async function getStore(storeName, mode = 'readonly') {
        const database = await openDatabase();
        const transaction = database.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    async function add(storeName, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await getStore(storeName, 'readwrite');
                const request = store.add(data);

                request.onsuccess = () => {
                    console.log(`[Storage] Added to ${storeName}:`, request.result);
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error(`[Storage] Error adding to ${storeName}:`, request.error);
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async function put(storeName, data) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await getStore(storeName, 'readwrite');
                const request = store.put(data);

                request.onsuccess = () => {
                    console.log(`[Storage] Updated in ${storeName}:`, request.result);
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error(`[Storage] Error updating ${storeName}:`, request.error);
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async function get(storeName, key) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await getStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    console.error(`[Storage] Error getting from ${storeName}:`, request.error);
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async function getAll(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await getStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result || []);
                };

                request.onerror = () => {
                    console.error(`[Storage] Error getting all from ${storeName}:`, request.error);
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async function remove(storeName, key) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await getStore(storeName, 'readwrite');
                const request = store.delete(key);

                request.onsuccess = () => {
                    console.log(`[Storage] Deleted from ${storeName}:`, key);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error(`[Storage] Error deleting from ${storeName}:`, request.error);
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    async function clear(storeName) {
        return new Promise(async (resolve, reject) => {
            try {
                const store = await getStore(storeName, 'readwrite');
                const request = store.clear();

                request.onsuccess = () => {
                    console.log(`[Storage] Cleared ${storeName}`);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error(`[Storage] Error clearing ${storeName}:`, request.error);
                    reject(request.error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // ========================================
    // Booking-Specific Operations
    // ========================================
    const BookingStorage = {
        async save(booking) {
            // Ensure required fields
            if (!booking.bookingReference) {
                throw new Error('Booking reference is required');
            }
            booking.savedAt = new Date().toISOString();
            return put(STORES.BOOKINGS, booking);
        },

        async get(bookingReference) {
            return get(STORES.BOOKINGS, bookingReference);
        },

        async getAll() {
            const bookings = await getAll(STORES.BOOKINGS);
            // Sort by date, newest first
            return bookings.sort((a, b) =>
                new Date(b.createdAt || b.savedAt) - new Date(a.createdAt || a.savedAt)
            );
        },

        async getUpcoming() {
            const bookings = await this.getAll();
            const now = new Date();
            return bookings.filter(booking => {
                const pickupTime = new Date(booking.pickup?.scheduledTime);
                return pickupTime > now && booking.status !== 'completed' && booking.status !== 'cancelled';
            });
        },

        async getPast() {
            const bookings = await this.getAll();
            const now = new Date();
            return bookings.filter(booking => {
                const pickupTime = new Date(booking.pickup?.scheduledTime);
                return pickupTime <= now || booking.status === 'completed' || booking.status === 'cancelled';
            });
        },

        async remove(bookingReference) {
            return remove(STORES.BOOKINGS, bookingReference);
        },

        async clear() {
            return clear(STORES.BOOKINGS);
        },

        async updateStatus(bookingReference, status) {
            const booking = await this.get(bookingReference);
            if (booking) {
                booking.status = status;
                booking.statusHistory = booking.statusHistory || [];
                booking.statusHistory.push({
                    status,
                    timestamp: new Date().toISOString()
                });
                return this.save(booking);
            }
            return null;
        }
    };

    // ========================================
    // User Storage Operations
    // ========================================
    const UserStorage = {
        async save(user) {
            user.id = 'current'; // Single user
            return put(STORES.USER, user);
        },

        async get() {
            return get(STORES.USER, 'current');
        },

        async clear() {
            return remove(STORES.USER, 'current');
        },

        async updateNotificationPrefs(prefs) {
            const user = await this.get() || { id: 'current' };
            user.notificationPreferences = { ...user.notificationPreferences, ...prefs };
            return this.save(user);
        }
    };

    // ========================================
    // Pending Sync Operations (for offline actions)
    // ========================================
    const SyncStorage = {
        async addPending(action) {
            return add(STORES.PENDING_SYNC, {
                ...action,
                createdAt: new Date().toISOString()
            });
        },

        async getAll() {
            return getAll(STORES.PENDING_SYNC);
        },

        async remove(id) {
            return remove(STORES.PENDING_SYNC, id);
        },

        async clear() {
            return clear(STORES.PENDING_SYNC);
        },

        async processPending(processor) {
            const pending = await this.getAll();
            const results = [];

            for (const item of pending) {
                try {
                    await processor(item);
                    await this.remove(item.id);
                    results.push({ id: item.id, success: true });
                } catch (error) {
                    results.push({ id: item.id, success: false, error });
                }
            }

            return results;
        }
    };

    // ========================================
    // Utility Functions
    // ========================================
    async function getDatabaseSize() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return null;
        }
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage,
            quota: estimate.quota,
            usagePercent: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
    }

    async function exportData() {
        const bookings = await BookingStorage.getAll();
        const user = await UserStorage.get();
        return {
            bookings,
            user,
            exportedAt: new Date().toISOString()
        };
    }

    async function importData(data) {
        if (data.bookings) {
            for (const booking of data.bookings) {
                await BookingStorage.save(booking);
            }
        }
        if (data.user) {
            await UserStorage.save(data.user);
        }
        return true;
    }

    // ========================================
    // Expose Public API
    // ========================================
    window.OfflineStorage = {
        // Initialize database
        init: openDatabase,

        // Booking operations
        bookings: BookingStorage,

        // User operations
        user: UserStorage,

        // Sync operations
        sync: SyncStorage,

        // Utilities
        getDatabaseSize,
        exportData,
        importData,

        // Store names for advanced usage
        STORES
    };

    // Auto-initialize
    openDatabase().catch(console.error);

})();
