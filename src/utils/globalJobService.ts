/**
 * Global Job Service Singleton
 * 
 * Provides a single initialized instance of JobService across the application
 * to prevent multiple initialization issues.
 * 
 * Author: Bareloft Development Team
 */

import { JobService } from '../services/jobs/JobService';
import { RedisService } from '../services/cache/RedisService';
import { logger } from './logger/winston';

class GlobalJobService {
  private static instance: JobService | null = null;
  private static redisService: RedisService | null = null;
  private static isInitialized = false;

  /**
   * Get the global JobService instance
   */
  static async getInstance(): Promise<JobService> {
    if (!GlobalJobService.instance) {
      // Create or reuse Redis service instance
      if (!GlobalJobService.redisService) {
        GlobalJobService.redisService = new RedisService();
        await GlobalJobService.redisService.connect();
        logger.info('✅ Global Redis service initialized for JobService');
      }
      
      GlobalJobService.instance = new JobService(GlobalJobService.redisService);
      
      // Initialize if not already done
      if (!GlobalJobService.isInitialized) {
        await GlobalJobService.instance.initialize();
        GlobalJobService.isInitialized = true;
        logger.info('✅ Global JobService initialized successfully');
      }
    }
    
    return GlobalJobService.instance;
  }

  /**
   * Check if JobService is initialized
   */
  static isReady(): boolean {
    return GlobalJobService.isInitialized && GlobalJobService.instance !== null;
  }

  /**
   * Reset the instance (mainly for testing)
   */
  static reset(): void {
    GlobalJobService.instance = null;
    GlobalJobService.isInitialized = false;
  }
}

export { GlobalJobService };