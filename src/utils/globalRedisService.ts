/**
 * Global Redis Service Singleton
 * 
 * Provides a single initialized instance of RedisService across the application
 * to prevent multiple Redis connection issues.
 * 
 * Author: Bareloft Development Team
 */

import { RedisService } from '../services/cache/RedisService';
import { logger } from './logger/winston';

class GlobalRedisService {
  private static instance: RedisService | null = null;
  private static isInitialized = false;

  /**
   * Get the global RedisService instance
   */
  static async getInstance(): Promise<RedisService> {
    if (!GlobalRedisService.instance) {
      GlobalRedisService.instance = new RedisService();
      
      // Initialize if not already done
      if (!GlobalRedisService.isInitialized) {
        await GlobalRedisService.instance.connect();
        GlobalRedisService.isInitialized = true;
        logger.info('✅ Global RedisService initialized successfully');
      }
    }
    
    return GlobalRedisService.instance;
  }

  /**
   * Get the Redis instance synchronously (for cases where we know it's initialized)
   */
  static getInstanceSync(): RedisService | null {
    return GlobalRedisService.instance;
  }

  /**
   * Check if RedisService is initialized
   */
  static isReady(): boolean {
    return GlobalRedisService.isInitialized && GlobalRedisService.instance !== null;
  }

  /**
   * Reset the instance (mainly for testing)
   */
  static reset(): void {
    if (GlobalRedisService.instance) {
      GlobalRedisService.instance.disconnect();
    }
    GlobalRedisService.instance = null;
    GlobalRedisService.isInitialized = false;
  }
}

export { GlobalRedisService };