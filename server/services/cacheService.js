// ========================================
// Cache Service
// ========================================
// Unified caching service supporting Redis and in-memory fallback
// ========================================

const NodeCache = require('node-cache');

// Try to load Redis
let Redis;
let redisClient = null;

try {
    Redis = require('ioredis');
} catch (e) {
    console.log('[Cache] ioredis not installed, using in-memory cache');
}

class CacheService {
    constructor() {
        this.useRedis = false;
        this.memoryCache = new NodeCache({
            stdTTL: 300, // 5 minutes default
            checkperiod: 60,
            useClones: true
        });

        this.initialized = false;
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
    }

    /**
     * Initialize cache connection
     */
    async init() {
        if (this.initialized) return;

        const redisUrl = process.env.REDIS_URL;

        if (redisUrl && Redis) {
            try {
                redisClient = new Redis(redisUrl, {
                    maxRetriesPerRequest: 3,
                    retryDelayOnFailover: 100,
                    enableReadyCheck: true,
                    connectTimeout: 5000
                });

                await new Promise((resolve, reject) => {
                    redisClient.on('ready', () => {
                        console.log('[Cache] Redis connected successfully');
                        this.useRedis = true;
                        resolve();
                    });

                    redisClient.on('error', (err) => {
                        console.error('[Cache] Redis error:', err.message);
                        reject(err);
                    });

                    setTimeout(() => reject(new Error('Connection timeout')), 5000);
                });

            } catch (error) {
                console.log('[Cache] Redis connection failed, using in-memory cache');
                this.useRedis = false;
            }
        } else {
            console.log('[Cache] Using in-memory cache (NodeCache)');
        }

        this.initialized = true;
    }

    /**
     * Get value from cache
     */
    async get(key) {
        try {
            let value;

            if (this.useRedis && redisClient) {
                value = await redisClient.get(key);
                if (value) {
                    value = JSON.parse(value);
                }
            } else {
                value = this.memoryCache.get(key);
            }

            if (value !== undefined && value !== null) {
                this.stats.hits++;
                return value;
            }

            this.stats.misses++;
            return null;

        } catch (error) {
            console.error('[Cache] Get error:', error.message);
            this.stats.misses++;
            return null;
        }
    }

    /**
     * Set value in cache
     */
    async set(key, value, ttlSeconds = 300) {
        try {
            if (this.useRedis && redisClient) {
                await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            } else {
                this.memoryCache.set(key, value, ttlSeconds);
            }

            this.stats.sets++;
            return true;

        } catch (error) {
            console.error('[Cache] Set error:', error.message);
            return false;
        }
    }

    /**
     * Delete key from cache
     */
    async del(key) {
        try {
            if (this.useRedis && redisClient) {
                await redisClient.del(key);
            } else {
                this.memoryCache.del(key);
            }

            this.stats.deletes++;
            return true;

        } catch (error) {
            console.error('[Cache] Delete error:', error.message);
            return false;
        }
    }

    /**
     * Delete multiple keys by pattern
     */
    async delPattern(pattern) {
        try {
            if (this.useRedis && redisClient) {
                const keys = await redisClient.keys(pattern);
                if (keys.length > 0) {
                    await redisClient.del(...keys);
                }
                return keys.length;
            } else {
                const allKeys = this.memoryCache.keys();
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                const matchingKeys = allKeys.filter(k => regex.test(k));
                matchingKeys.forEach(k => this.memoryCache.del(k));
                return matchingKeys.length;
            }

        } catch (error) {
            console.error('[Cache] Delete pattern error:', error.message);
            return 0;
        }
    }

    /**
     * Get or set (cache-aside pattern)
     */
    async getOrSet(key, fetchFn, ttlSeconds = 300) {
        let value = await this.get(key);

        if (value !== null) {
            return value;
        }

        value = await fetchFn();

        if (value !== undefined && value !== null) {
            await this.set(key, value, ttlSeconds);
        }

        return value;
    }

    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            if (this.useRedis && redisClient) {
                return await redisClient.exists(key) === 1;
            }
            return this.memoryCache.has(key);

        } catch (error) {
            return false;
        }
    }

    /**
     * Get remaining TTL for a key
     */
    async ttl(key) {
        try {
            if (this.useRedis && redisClient) {
                return await redisClient.ttl(key);
            }
            return this.memoryCache.getTtl(key);

        } catch (error) {
            return -1;
        }
    }

    /**
     * Flush all cache
     */
    async flush() {
        try {
            if (this.useRedis && redisClient) {
                await redisClient.flushdb();
            } else {
                this.memoryCache.flushAll();
            }
            return true;

        } catch (error) {
            console.error('[Cache] Flush error:', error.message);
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            backend: this.useRedis ? 'redis' : 'memory',
            memoryKeys: this.memoryCache.keys().length
        };
    }

    /**
     * Close connection
     */
    async close() {
        if (redisClient) {
            await redisClient.quit();
        }
    }

    // ========================================
    // Specialized Cache Methods
    // ========================================

    /**
     * Cache flight data
     */
    async cacheFlightData(flightNumber, data) {
        const key = `flight:${flightNumber.toUpperCase()}`;
        return this.set(key, data, 300); // 5 minutes
    }

    async getFlightData(flightNumber) {
        const key = `flight:${flightNumber.toUpperCase()}`;
        return this.get(key);
    }

    /**
     * Cache pricing data
     */
    async cachePricing(zone, vehicleClass, data) {
        const key = `pricing:${zone}:${vehicleClass}`;
        return this.set(key, data, 3600); // 1 hour
    }

    async getPricing(zone, vehicleClass) {
        const key = `pricing:${zone}:${vehicleClass}`;
        return this.get(key);
    }

    /**
     * Cache user session
     */
    async cacheUserSession(userId, sessionData) {
        const key = `session:${userId}`;
        return this.set(key, sessionData, 86400); // 24 hours
    }

    async getUserSession(userId) {
        const key = `session:${userId}`;
        return this.get(key);
    }

    async invalidateUserSession(userId) {
        const key = `session:${userId}`;
        return this.del(key);
    }

    /**
     * Cache booking data
     */
    async cacheBooking(reference, data) {
        const key = `booking:${reference}`;
        return this.set(key, data, 1800); // 30 minutes
    }

    async getBooking(reference) {
        const key = `booking:${reference}`;
        return this.get(key);
    }

    async invalidateBooking(reference) {
        const key = `booking:${reference}`;
        return this.del(key);
    }

    /**
     * Cache driver location
     */
    async cacheDriverLocation(driverId, location) {
        const key = `driver:location:${driverId}`;
        return this.set(key, location, 30); // 30 seconds
    }

    async getDriverLocation(driverId) {
        const key = `driver:location:${driverId}`;
        return this.get(key);
    }

    /**
     * Rate limiting helper
     */
    async checkRateLimit(identifier, limit, windowSeconds) {
        const key = `ratelimit:${identifier}`;

        try {
            if (this.useRedis && redisClient) {
                const current = await redisClient.incr(key);
                if (current === 1) {
                    await redisClient.expire(key, windowSeconds);
                }
                return {
                    allowed: current <= limit,
                    current,
                    limit,
                    remaining: Math.max(0, limit - current)
                };
            } else {
                let current = this.memoryCache.get(key) || 0;
                current++;
                this.memoryCache.set(key, current, windowSeconds);
                return {
                    allowed: current <= limit,
                    current,
                    limit,
                    remaining: Math.max(0, limit - current)
                };
            }

        } catch (error) {
            return { allowed: true, current: 0, limit, remaining: limit };
        }
    }

    /**
     * Distributed lock (Redis only)
     */
    async acquireLock(lockName, ttlSeconds = 30) {
        const key = `lock:${lockName}`;

        if (this.useRedis && redisClient) {
            const result = await redisClient.set(key, Date.now(), 'EX', ttlSeconds, 'NX');
            return result === 'OK';
        }

        // Memory fallback
        if (this.memoryCache.has(key)) {
            return false;
        }
        this.memoryCache.set(key, Date.now(), ttlSeconds);
        return true;
    }

    async releaseLock(lockName) {
        const key = `lock:${lockName}`;
        return this.del(key);
    }
}

// Singleton instance
const cacheService = new CacheService();

// Auto-initialize
cacheService.init().catch(console.error);

module.exports = cacheService;
