"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.RedisConnection = exports.redis = void 0;
// src/config/redis.ts
const ioredis_1 = __importDefault(require("ioredis"));
const environment_1 = require("./environment");
// Redis client configuration
const redisConfig = {
    host: new URL(environment_1.config.redis.url).hostname,
    port: parseInt(new URL(environment_1.config.redis.url).port) || 6379,
    password: new URL(environment_1.config.redis.url).password || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000,
};
// Create Redis client
exports.redis = new ioredis_1.default(redisConfig);
// Redis connection management
class RedisConnection {
    static instance;
    client;
    isConnected = false;
    constructor() {
        this.client = exports.redis;
        this.setupEventHandlers();
    }
    static getInstance() {
        if (!RedisConnection.instance) {
            RedisConnection.instance = new RedisConnection();
        }
        return RedisConnection.instance;
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('✅ Redis connected successfully');
            this.isConnected = true;
        });
        this.client.on('error', (error) => {
            console.error('❌ Redis connection error:', error);
            this.isConnected = false;
        });
        this.client.on('close', () => {
            console.log('🔄 Redis connection closed');
            this.isConnected = false;
        });
        this.client.on('reconnecting', () => {
            console.log('🔄 Redis reconnecting...');
        });
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            await this.client.connect();
        }
        catch (error) {
            console.error('❌ Redis connection failed:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await this.client.disconnect();
            console.log('✅ Redis disconnected successfully');
        }
        catch (error) {
            console.error('❌ Redis disconnection failed:', error);
            throw error;
        }
    }
    getClient() {
        return this.client;
    }
    async healthCheck() {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('❌ Redis health check failed:', error);
            return false;
        }
    }
    // Cache operations
    async get(key) {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error(`❌ Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const serializedValue = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, serializedValue);
            }
            else {
                await this.client.set(key, serializedValue);
            }
            return true;
        }
        catch (error) {
            console.error(`❌ Redis SET error for key ${key}:`, error);
            return false;
        }
    }
    async delete(key) {
        try {
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            console.error(`❌ Redis DELETE error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error(`❌ Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    async increment(key, value = 1) {
        try {
            return await this.client.incrby(key, value);
        }
        catch (error) {
            console.error(`❌ Redis INCREMENT error for key ${key}:`, error);
            return 0;
        }
    }
    async expire(key, ttlSeconds) {
        try {
            const result = await this.client.expire(key, ttlSeconds);
            return result === 1;
        }
        catch (error) {
            console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
            return false;
        }
    }
    async flush() {
        try {
            await this.client.flushdb();
            return true;
        }
        catch (error) {
            console.error('❌ Redis FLUSH error:', error);
            return false;
        }
    }
    // Session management
    async setSession(sessionId, sessionData, ttlSeconds) {
        return await this.set(`session:${sessionId}`, sessionData, ttlSeconds);
    }
    async getSession(sessionId) {
        return await this.get(`session:${sessionId}`);
    }
    async deleteSession(sessionId) {
        return await this.delete(`session:${sessionId}`);
    }
    // Rate limiting
    async checkRateLimit(key, limit, windowSeconds) {
        try {
            const current = await this.increment(`ratelimit:${key}`);
            if (current === 1) {
                await this.expire(`ratelimit:${key}`, windowSeconds);
            }
            const ttl = await this.client.ttl(`ratelimit:${key}`);
            const resetTime = Date.now() + (ttl * 1000);
            return {
                allowed: current <= limit,
                remaining: Math.max(0, limit - current),
                resetTime
            };
        }
        catch (error) {
            console.error(`❌ Redis rate limit error for key ${key}:`, error);
            return {
                allowed: true,
                remaining: limit,
                resetTime: Date.now() + (windowSeconds * 1000)
            };
        }
    }
}
exports.RedisConnection = RedisConnection;
// Export Redis instance
exports.redisClient = RedisConnection.getInstance();
// Graceful shutdown handler
process.on('SIGINT', async () => {
    await exports.redisClient.disconnect();
});
process.on('SIGTERM', async () => {
    await exports.redisClient.disconnect();
});
//# sourceMappingURL=redis.js.map