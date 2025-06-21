import Redis from "ioredis";
import { config } from "./environment";

// Parse Redis URL
const redisUrl = new URL(config.redis.url);

// Redis client configuration - conditionally build object
const redisConfig = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port) || 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Only include password if it exists
  ...(redisUrl.password && { password: redisUrl.password }),
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Redis connection management
export class RedisConnection {
  private static instance: RedisConnection;
  private client: Redis;
  private isConnected = false;

  private constructor() {
    this.client = redis;
    this.setupEventHandlers();
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  private setupEventHandlers(): void {
    this.client.on("connect", () => {
      console.log("✅ Redis connected successfully");
      this.isConnected = true;
    });

    this.client.on("error", (error) => {
      console.error("❌ Redis connection error:", error);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      console.log("🔄 Redis connection closed");
      this.isConnected = false;
    });

    this.client.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
    });
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
    } catch (error) {
      console.error("❌ Redis connection failed:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.client.disconnect();
      console.log("✅ Redis disconnected successfully");
    } catch (error) {
      console.error("❌ Redis disconnection failed:", error);
      throw error;
    }
  }

  public getClient(): Redis {
    return this.client;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("❌ Redis health check failed:", error);
      return false;
    }
  }

  // Cache operations
  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  public async set(
    key: string,
    value: any,
    ttlSeconds?: number
  ): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      console.error(`❌ Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`❌ Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  public async increment(key: string, value: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, value);
    } catch (error) {
      console.error(`❌ Redis INCREMENT error for key ${key}:`, error);
      return 0;
    }
  }

  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`❌ Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error("❌ Redis FLUSH error:", error);
      return false;
    }
  }

  // Session management
  public async setSession(
    sessionId: string,
    sessionData: any,
    ttlSeconds: number
  ): Promise<boolean> {
    return await this.set(`session:${sessionId}`, sessionData, ttlSeconds);
  }

  public async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.get<T>(`session:${sessionId}`);
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    return await this.delete(`session:${sessionId}`);
  }

  // Rate limiting
  public async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    try {
      const current = await this.increment(`ratelimit:${key}`);

      if (current === 1) {
        await this.expire(`ratelimit:${key}`, windowSeconds);
      }

      const ttl = await this.client.ttl(`ratelimit:${key}`);
      const resetTime = Date.now() + ttl * 1000;

      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      console.error(`❌ Redis rate limit error for key ${key}:`, error);
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + windowSeconds * 1000,
      };
    }
  }
}

// Export Redis instance
export const redisClient = RedisConnection.getInstance();

// Graceful shutdown handler
process.on("SIGINT", async () => {
  await redisClient.disconnect();
});

process.on("SIGTERM", async () => {
  await redisClient.disconnect();
});
