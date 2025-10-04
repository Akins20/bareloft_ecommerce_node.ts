/**
 * Payment Reconciliation Scheduler
 * 
 * Automatically schedules payment reconciliation jobs at regular intervals.
 * Ensures data consistency between database and Paystack by comparing payment statuses.
 * 
 * Schedule:
 * - Every 15 minutes: Check last 4 hours for unconfirmed orders
 * - Every 6 hours: Check last 24 hours for all orders 
 * - Daily at 2 AM: Check last 7 days for comprehensive reconciliation
 * 
 * Features:
 * - Multiple reconciliation frequencies for different scenarios
 * - Configurable batch sizes and time ranges
 * - Prevents duplicate jobs from running simultaneously
 * - Comprehensive logging for monitoring
 * 
 * Author: Bareloft Development Team
 */

import * as cron from 'node-cron';
import { JobService } from '../jobs/JobService';
import { JobPriority } from '../../types/job.types';
import { logger } from '../../utils/logger/winston';

export class PaymentReconciliationScheduler {
  private jobService: JobService;
  private scheduledJobs: cron.ScheduledTask[] = [];
  private isRunning = false;

  constructor(jobService: JobService) {
    this.jobService = jobService;
  }

  /**
   * Start all scheduled reconciliation jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('⚠️ PaymentReconciliationScheduler already running');
      return;
    }

    try {
      // Schedule frequent reconciliation for unconfirmed orders (every 15 minutes)
      const frequentReconciliation = cron.schedule('*/15 * * * *', async () => {
        await this.scheduleFrequentReconciliation();
      });

      // Schedule regular reconciliation for all recent orders (every 6 hours)
      const regularReconciliation = cron.schedule('0 */6 * * *', async () => {
        await this.scheduleRegularReconciliation();
      });

      // Schedule comprehensive reconciliation (daily at 2 AM)
      const comprehensiveReconciliation = cron.schedule('0 2 * * *', async () => {
        await this.scheduleComprehensiveReconciliation();
      }, {
        timezone: 'Africa/Lagos' // Nigerian timezone
      });

      // Start all scheduled jobs
      frequentReconciliation.start();
      regularReconciliation.start();
      comprehensiveReconciliation.start();

      this.scheduledJobs = [
        frequentReconciliation,
        regularReconciliation,
        comprehensiveReconciliation
      ];

      this.isRunning = true;

      logger.info('✅ PaymentReconciliationScheduler started successfully', {
        scheduledJobs: [
          { name: 'frequent-payment-reconciliation', schedule: '*/15 * * * *', description: 'Every 15 minutes - unconfirmed orders' },
          { name: 'regular-payment-reconciliation', schedule: '0 */6 * * *', description: 'Every 6 hours - all recent orders' },
          { name: 'comprehensive-payment-reconciliation', schedule: '0 2 * * *', description: 'Daily 2 AM - comprehensive check' }
        ]
      });

      // REMOVED: Initial reconciliation on startup to reduce server load
      // The scheduled jobs will handle reconciliation at proper intervals
      // If urgent reconciliation needed, use manual trigger endpoint

    } catch (error) {
      logger.error('❌ Failed to start PaymentReconciliationScheduler', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stop all scheduled reconciliation jobs
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('⚠️ PaymentReconciliationScheduler not running');
      return;
    }

    try {
      // Destroy all scheduled jobs
      this.scheduledJobs.forEach(job => {
        if (job) {
          job.destroy();
        }
      });

      this.scheduledJobs = [];
      this.isRunning = false;

      logger.info('✅ PaymentReconciliationScheduler stopped successfully');

    } catch (error) {
      logger.error('❌ Failed to stop PaymentReconciliationScheduler', {
        error: error.message
      });
    }
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      totalJobs: this.scheduledJobs.length,
      jobs: this.scheduledJobs.map((job, index) => ({
        index,
        running: job.getStatus() === 'scheduled'
      }))
    };
  }

  /**
   * Schedule initial reconciliation on system startup
   */
  private async scheduleInitialReconciliation(): Promise<void> {
    try {
      logger.info('🚀 [RECONCILIATION SCHEDULER] Running initial payment reconciliation on startup');

      await this.jobService.addPaymentReconciliationJob({
        reconciliationType: 'manual',
        timeRangeHours: 4, // Check last 4 hours
        batchSize: 50,
        onlyUnconfirmed: true,
        priority: JobPriority.HIGH
      }, {
        delay: 0 // Run immediately
      });

      logger.info('✅ [RECONCILIATION SCHEDULER] Initial reconciliation scheduled');

    } catch (error) {
      logger.error('❌ [RECONCILIATION SCHEDULER] Failed to schedule initial reconciliation', {
        error: error.message
      });
    }
  }

  /**
   * Schedule frequent reconciliation for unconfirmed orders
   */
  private async scheduleFrequentReconciliation(): Promise<void> {
    try {
      logger.info('🔄 [RECONCILIATION SCHEDULER] Starting frequent reconciliation (unconfirmed orders)');

      await this.jobService.addPaymentReconciliationJob({
        reconciliationType: 'scheduled',
        timeRangeHours: 4, // Check last 4 hours
        batchSize: 30, // Smaller batches for frequent runs
        onlyUnconfirmed: true, // Only check pending/processing orders
        priority: JobPriority.MEDIUM
      }, {
        delay: this.getRandomDelay(1, 5) // Random 1-5 minute delay to avoid exact timing
      });

      logger.info('✅ [RECONCILIATION SCHEDULER] Frequent reconciliation scheduled');

    } catch (error) {
      logger.error('❌ [RECONCILIATION SCHEDULER] Failed to schedule frequent reconciliation', {
        error: error.message
      });
    }
  }

  /**
   * Schedule regular reconciliation for all recent orders
   */
  private async scheduleRegularReconciliation(): Promise<void> {
    try {
      logger.info('🔄 [RECONCILIATION SCHEDULER] Starting regular reconciliation (all recent orders)');

      await this.jobService.addPaymentReconciliationJob({
        reconciliationType: 'scheduled',
        timeRangeHours: 24, // Check last 24 hours
        batchSize: 100, // Larger batches for less frequent runs
        onlyUnconfirmed: false, // Check all orders
        priority: JobPriority.MEDIUM
      }, {
        delay: this.getRandomDelay(5, 15) // Random 5-15 minute delay
      });

      logger.info('✅ [RECONCILIATION SCHEDULER] Regular reconciliation scheduled');

    } catch (error) {
      logger.error('❌ [RECONCILIATION SCHEDULER] Failed to schedule regular reconciliation', {
        error: error.message
      });
    }
  }

  /**
   * Schedule comprehensive reconciliation for extended period
   */
  private async scheduleComprehensiveReconciliation(): Promise<void> {
    try {
      logger.info('🔄 [RECONCILIATION SCHEDULER] Starting comprehensive reconciliation (7-day check)');

      await this.jobService.addPaymentReconciliationJob({
        reconciliationType: 'scheduled',
        timeRangeHours: 168, // Check last 7 days (7 * 24 hours)
        batchSize: 200, // Large batches for comprehensive check
        onlyUnconfirmed: false, // Check all orders
        priority: JobPriority.LOW // Lower priority for large operations
      }, {
        delay: this.getRandomDelay(10, 30) // Random 10-30 minute delay
      });

      logger.info('✅ [RECONCILIATION SCHEDULER] Comprehensive reconciliation scheduled');

    } catch (error) {
      logger.error('❌ [RECONCILIATION SCHEDULER] Failed to schedule comprehensive reconciliation', {
        error: error.message
      });
    }
  }

  /**
   * Manually trigger reconciliation (useful for admin operations)
   */
  async triggerManualReconciliation(timeRangeHours: number = 24, onlyUnconfirmed: boolean = false): Promise<void> {
    try {
      logger.info('🔧 [RECONCILIATION SCHEDULER] Manual reconciliation triggered', {
        timeRangeHours,
        onlyUnconfirmed
      });

      await this.jobService.addPaymentReconciliationJob({
        reconciliationType: 'manual',
        timeRangeHours,
        batchSize: 50,
        onlyUnconfirmed,
        priority: JobPriority.HIGH
      }, {
        delay: 0 // Run immediately for manual triggers
      });

      logger.info('✅ [RECONCILIATION SCHEDULER] Manual reconciliation scheduled');

    } catch (error) {
      logger.error('❌ [RECONCILIATION SCHEDULER] Failed to schedule manual reconciliation', {
        error: error.message,
        timeRangeHours,
        onlyUnconfirmed
      });
      throw error;
    }
  }

  /**
   * Trigger emergency reconciliation (for critical payment issues)
   */
  async triggerEmergencyReconciliation(): Promise<void> {
    try {
      logger.warn('🚨 [RECONCILIATION SCHEDULER] Emergency reconciliation triggered');

      await this.jobService.addPaymentReconciliationJob({
        reconciliationType: 'emergency',
        timeRangeHours: 72, // Check last 3 days
        batchSize: 20, // Small batches for careful processing
        onlyUnconfirmed: true,
        priority: JobPriority.CRITICAL
      }, {
        delay: 0 // Run immediately for emergencies
      });

      logger.warn('🚨 [RECONCILIATION SCHEDULER] Emergency reconciliation scheduled');

    } catch (error) {
      logger.error('❌ [RECONCILIATION SCHEDULER] Failed to schedule emergency reconciliation', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate random delay in milliseconds to avoid exact timing
   */
  private getRandomDelay(minMinutes: number, maxMinutes: number): number {
    const min = minMinutes * 60 * 1000;
    const max = maxMinutes * 60 * 1000;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}