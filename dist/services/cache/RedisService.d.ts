import { BaseService } from "../BaseService";
export declare class RedisService extends BaseService {
    private client;
    private isConnected;
    constructor();
    /**
     * Initialize Redis connection
     */
    private initializeRedis;
    /**
     * Connect to Redis
     */
    connect(): Promise<void>;
    /**
     * Disconnect from Redis
     */
    disconnect(): Promise<void>;
    /**
     * Check if Redis is connected
     */
    isRedisConnected(): boolean;
    /**
     * Ping Redis to test connection
     */
    ping(): Promise<string>;
    /**
     * Set a key-value pair
     */
    set(key: string, value: string): Promise<string>;
    /**
     * Set a key-value pair with expiration
     */
    setex(key: string, seconds: number, value: string): Promise<string>;
    /**
     * Set a JSON object with expiration
     */
    setexJSON<T>(key: string, seconds: number, value: T): Promise<string>;
    /**
     * Get a value by key
     */
    get(key: string): Promise<string | null>;
    /**
     * Get a parsed JSON value by key
     */
    getJSON<T>(key: string): Promise<T | null>;
    /**
     * Delete one or more keys
     */
    del(...keys: string[]): Promise<number>;
    /**
     * Check if key exists
     */
    exists(key: string): Promise<number>;
    /**
     * Set expiration for a key
     */
    expire(key: string, seconds: number): Promise<number>;
    /**
     * Get time to live for a key
     */
    ttl(key: string): Promise<number>;
    /**
     * Increment a key
     */
    incr(key: string): Promise<number>;
    /**
     * Increment a key by amount
     */
    incrby(key: string, increment: number): Promise<number>;
    /**
     * Decrement a key
     */
    decr(key: string): Promise<number>;
    /**
     * Get multiple keys at once
     */
    mget(...keys: string[]): Promise<Array<string | null>>;
    /**
     * Set multiple key-value pairs
     */
    mset(keyValues: Record<string, string>): Promise<string>;
    /**
     * Find keys matching a pattern
     */
    keys(pattern: string): Promise<string[]>;
    /**
     * Flush all keys in current database
     */
    flushdb(): Promise<string>;
    /**
     * Get database size (number of keys)
     */
    dbsize(): Promise<number>;
    /**
     * Get Redis server info
     */
    info(section?: string): Promise<string>;
    /**
     * Set field in hash
     */
    hset(key: string, field: string, value: string): Promise<number>;
    /**
     * Get field from hash
     */
    hget(key: string, field: string): Promise<string | null>;
    /**
     * Get all fields and values from hash
     */
    hgetall(key: string): Promise<Record<string, string>>;
    /**
     * Delete field from hash
     */
    hdel(key: string, ...fields: string[]): Promise<number>;
    /**
     * Push element to left of list
     */
    lpush(key: string, ...elements: string[]): Promise<number>;
    /**
     * Push element to right of list
     */
    rpush(key: string, ...elements: string[]): Promise<number>;
    /**
     * Pop element from left of list
     */
    lpop(key: string): Promise<string | null>;
    /**
     * Pop element from right of list
     */
    rpop(key: string): Promise<string | null>;
    /**
     * Get list length
     */
    llen(key: string): Promise<number>;
    /**
     * Get range of elements from list
     */
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    /**
     * Add member to set
     */
    sadd(key: string, ...members: string[]): Promise<number>;
    /**
     * Get all members of set
     */
    smembers(key: string): Promise<string[]>;
    /**
     * Check if member exists in set
     */
    sismember(key: string, member: string): Promise<number>;
    /**
     * Remove member from set
     */
    srem(key: string, ...members: string[]): Promise<number>;
    /**
     * Create a pipeline for batch operations
     */
    pipeline(): any;
    /**
     * Publish message to channel
     */
    publish(channel: string, message: string): Promise<number>;
    /**
     * Subscribe to channels
     */
    subscribe(...channels: string[]): Promise<void>;
    /**
     * Unsubscribe from channels
     */
    unsubscribe(...channels: string[]): Promise<void>;
    /**
     * Health check for Redis connection
     */
    healthCheck(): Promise<{
        status: "healthy" | "unhealthy";
        latency: number;
        memoryUsage: string;
        connectedClients: number;
    }>;
}
//# sourceMappingURL=RedisService.d.ts.map