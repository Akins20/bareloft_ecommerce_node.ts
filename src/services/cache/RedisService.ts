import { BaseService } from "../BaseService";
import * as Redis from "ioredis";
// import { redisConfig } from "../../config";

export class RedisService extends BaseService {
  private client: Redis.Redis;
  private isConnected: boolean = false;

  constructor() {
    super();
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    try {
      this.client = new Redis.Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DATABASE || '0'),
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectionName: "bareloft-api",
        family: 4, // IPv4
      });

      // Connection event handlers
      this.client.on("connect", () => {
        console.log("Redis connected successfully");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        console.log("Redis ready for operations");
      });

      this.client.on("error", (error) => {
        console.error("Redis connection error:", error);
        this.isConnected = false;
      });

      this.client.on("close", () => {
        console.log("Redis connection closed");
        this.isConnected = false;
      });

      this.client.on("reconnecting", () => {
        console.log("Redis reconnecting...");
      });
    } catch (error) {
      this.handleError("Error initializing Redis", error);
      throw error;
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      this.handleError("Error connecting to Redis", error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
      }
    } catch (error) {
      this.handleError("Error disconnecting from Redis", error);
    }
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.client.status === "ready";
  }

  /**
   * Ping Redis to test connection
   */
  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      this.handleError("Error pinging Redis", error);
      throw error;
    }
  }

  // Basic Redis operations

  /**
   * Set a key-value pair
   */
  async set(key: string, value: string): Promise<string> {
    try {
      return await this.client.set(key, value);
    } catch (error) {
      this.handleError("Error setting Redis key", error);
      throw error;
    }
  }

  /**
   * Set a key-value pair with expiration
   */
  async setex(key: string, seconds: number, value: string): Promise<string> {
    try {
      return await this.client.setex(key, seconds, value);
    } catch (error) {
      this.handleError("Error setting Redis key with expiration", error);
      throw error;
    }
  }

  /**
   * Set a JSON object with expiration
   */
  async setexJSON<T>(key: string, seconds: number, value: T): Promise<string> {
    try {
      return await this.client.setex(key, seconds, JSON.stringify(value));
    } catch (error) {
      this.handleError("Error setting Redis JSON key with expiration", error);
      throw error;
    }
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.handleError("Error getting Redis key", error);
      return null;
    }
  }

  /**
   * Get a parsed JSON value by key
   */
  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.handleError("Error getting and parsing Redis JSON key", error);
      return null;
    }
  }

  /**
   * Delete one or more keys
   */
  async del(...keys: string[]): Promise<number> {
    try {
      return await this.client.del(...keys);
    } catch (error) {
      this.handleError("Error deleting Redis keys", error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      this.handleError("Error checking Redis key existence", error);
      return 0;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      this.handleError("Error setting Redis key expiration", error);
      return 0;
    }
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.handleError("Error getting Redis key TTL", error);
      return -1;
    }
  }

  /**
   * Increment a key
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.handleError("Error incrementing Redis key", error);
      return 0;
    }
  }

  /**
   * Increment a key by amount
   */
  async incrby(key: string, increment: number): Promise<number> {
    try {
      return await this.client.incrby(key, increment);
    } catch (error) {
      this.handleError("Error incrementing Redis key by amount", error);
      return 0;
    }
  }

  /**
   * Decrement a key
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      this.handleError("Error decrementing Redis key", error);
      return 0;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget(...keys: string[]): Promise<Array<string | null>> {
    try {
      return await this.client.mget(...keys);
    } catch (error) {
      this.handleError("Error getting multiple Redis keys", error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValues: Record<string, string>): Promise<string> {
    try {
      const args: string[] = [];
      Object.entries(keyValues).forEach(([key, value]) => {
        args.push(key, value);
      });
      return await this.client.mset(...args);
    } catch (error) {
      this.handleError("Error setting multiple Redis keys", error);
      throw error;
    }
  }

  /**
   * Find keys matching a pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.handleError("Error finding Redis keys by pattern", error);
      return [];
    }
  }

  /**
   * Flush all keys in current database
   */
  async flushdb(): Promise<string> {
    try {
      return await this.client.flushdb();
    } catch (error) {
      this.handleError("Error flushing Redis database", error);
      throw error;
    }
  }

  /**
   * Get database size (number of keys)
   */
  async dbsize(): Promise<number> {
    try {
      return await this.client.dbsize();
    } catch (error) {
      this.handleError("Error getting Redis database size", error);
      return 0;
    }
  }

  /**
   * Get Redis server info
   */
  async info(section?: string): Promise<string> {
    try {
      return await this.client.info(section);
    } catch (error) {
      this.handleError("Error getting Redis info", error);
      return "";
    }
  }

  // Hash operations

  /**
   * Set field in hash
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hset(key, field, value);
    } catch (error) {
      this.handleError("Error setting Redis hash field", error);
      return 0;
    }
  }

  /**
   * Get field from hash
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      this.handleError("Error getting Redis hash field", error);
      return null;
    }
  }

  /**
   * Get all fields and values from hash
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      this.handleError("Error getting all Redis hash fields", error);
      return {};
    }
  }

  /**
   * Delete field from hash
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      this.handleError("Error deleting Redis hash fields", error);
      return 0;
    }
  }

  // List operations

  /**
   * Push element to left of list
   */
  async lpush(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.client.lpush(key, ...elements);
    } catch (error) {
      this.handleError("Error pushing to Redis list", error);
      return 0;
    }
  }

  /**
   * Push element to right of list
   */
  async rpush(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.client.rpush(key, ...elements);
    } catch (error) {
      this.handleError("Error pushing to Redis list", error);
      return 0;
    }
  }

  /**
   * Pop element from left of list
   */
  async lpop(key: string): Promise<string | null> {
    try {
      return await this.client.lpop(key);
    } catch (error) {
      this.handleError("Error popping from Redis list", error);
      return null;
    }
  }

  /**
   * Pop element from right of list
   */
  async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rpop(key);
    } catch (error) {
      this.handleError("Error popping from Redis list", error);
      return null;
    }
  }

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      this.handleError("Error getting Redis list length", error);
      return 0;
    }
  }

  /**
   * Get range of elements from list
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      this.handleError("Error getting Redis list range", error);
      return [];
    }
  }

  // Set operations

  /**
   * Add member to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      this.handleError("Error adding to Redis set", error);
      return 0;
    }
  }

  /**
   * Get all members of set
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      this.handleError("Error getting Redis set members", error);
      return [];
    }
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string): Promise<number> {
    try {
      return await this.client.sismember(key, member);
    } catch (error) {
      this.handleError("Error checking Redis set membership", error);
      return 0;
    }
  }

  /**
   * Remove member from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      this.handleError("Error removing from Redis set", error);
      return 0;
    }
  }

  // Pipeline operations for batch processing

  /**
   * Create a pipeline for batch operations
   */
  pipeline(): any {
    return this.client.pipeline();
  }

  // Pub/Sub operations

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    try {
      return await this.client.publish(channel, message);
    } catch (error) {
      this.handleError("Error publishing to Redis channel", error);
      return 0;
    }
  }

  /**
   * Subscribe to channels
   */
  async subscribe(...channels: string[]): Promise<void> {
    try {
      await this.client.subscribe(...channels);
    } catch (error) {
      this.handleError("Error subscribing to Redis channels", error);
    }
  }

  /**
   * Unsubscribe from channels
   */
  async unsubscribe(...channels: string[]): Promise<void> {
    try {
      await this.client.unsubscribe(...channels);
    } catch (error) {
      this.handleError("Error unsubscribing from Redis channels", error);
    }
  }

  // Health check methods

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    latency: number;
    memoryUsage: string;
    connectedClients: number;
  }> {
    try {
      const start = Date.now();
      await this.ping();
      const latency = Date.now() - start;

      const info = await this.info("memory");
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : "Unknown";

      const clientInfo = await this.info("clients");
      const clientMatch = clientInfo.match(/connected_clients:(\d+)/);
      const connectedClients = clientMatch ? parseInt(clientMatch[1]) : 0;

      return {
        status: "healthy",
        latency,
        memoryUsage,
        connectedClients,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: -1,
        memoryUsage: "Unknown",
        connectedClients: 0,
      };
    }
  }
}
