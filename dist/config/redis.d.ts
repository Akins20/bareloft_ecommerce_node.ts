import Redis from "ioredis";
export declare const redis: Redis;
export declare class RedisConnection {
    private static instance;
    private client;
    private isConnected;
    private constructor();
    static getInstance(): RedisConnection;
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getClient(): Redis;
    healthCheck(): Promise<boolean>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<boolean>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    increment(key: string, value?: number): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<boolean>;
    flush(): Promise<boolean>;
    setSession(sessionId: string, sessionData: any, ttlSeconds: number): Promise<boolean>;
    getSession<T>(sessionId: string): Promise<T | null>;
    deleteSession(sessionId: string): Promise<boolean>;
    checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
    }>;
}
export declare const redisClient: RedisConnection;
//# sourceMappingURL=redis.d.ts.map