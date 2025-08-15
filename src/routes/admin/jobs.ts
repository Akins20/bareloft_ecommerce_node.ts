/**
 * Job Management Admin Routes
 * 
 * Admin endpoints for monitoring and managing background jobs
 * 
 * Features:
 * - Queue statistics and monitoring
 * - Job creation and management
 * - Queue control (pause/resume)
 * - Job history and logs
 * 
 * Author: Bareloft Development Team
 */

import { Router } from 'express';
import { JobService } from '../../services/jobs';
import { JobType, JobPriority } from '../../types/job.types';
import { logger } from '../../utils/logger/winston';
import { authenticate } from '../../middleware/auth/authenticate';
import { authorize } from '../../middleware/auth/authorize';
// UserRole enum import - need to import from a location that exports it as a value
// For now, let's use string literals directly
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '../../types';

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize(['ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/admin/jobs/stats
 * Get comprehensive job queue statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const jobService = new JobService();
    await jobService.initialize();

    const stats = await jobService.getQueueStats();
    const healthCheck = await jobService.healthCheck();

    res.json(createSuccessResponse({
      queueStats: stats,
      health: healthCheck,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    logger.error('Failed to get job stats', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to get job statistics', 'JOB_STATS_ERROR')
    );
  }
});

/**
 * GET /api/admin/jobs/queues
 * Get detailed information about all queues
 */
router.get('/queues', async (req, res) => {
  try {
    const jobService = new JobService();
    await jobService.initialize();

    const stats = await jobService.getQueueStats();
    const serviceStats = jobService.getStats();

    res.json(createSuccessResponse({
      queues: stats.map(stat => ({
        name: stat.name,
        waiting: stat.waiting,
        active: stat.active,
        completed: stat.completed,
        failed: stat.failed,
        delayed: stat.delayed,
        paused: stat.paused,
        totalProcessed: stat.totalProcessed,
        processingRate: `${stat.processingRate.toFixed(1)}/min`,
        avgProcessingTime: `${stat.avgProcessingTime.toFixed(0)}ms`,
        health: stat.paused ? 'paused' : (stat.active > 100 ? 'overloaded' : 'healthy')
      })),
      summary: {
        totalQueues: stats.length,
        totalWaiting: stats.reduce((sum, s) => sum + s.waiting, 0),
        totalActive: stats.reduce((sum, s) => sum + s.active, 0),
        totalCompleted: stats.reduce((sum, s) => sum + s.completed, 0),
        totalFailed: stats.reduce((sum, s) => sum + s.failed, 0),
        overallHealth: stats.every(s => !s.paused && s.active < 100) ? 'healthy' : 'needs_attention'
      },
      supportedJobTypes: serviceStats.supportedJobTypes,
      processors: serviceStats.processors
    }));

  } catch (error) {
    logger.error('Failed to get queue information', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to get queue information', 'QUEUE_INFO_ERROR')
    );
  }
});

/**
 * POST /api/admin/jobs/queues/:queueName/pause
 * Pause a specific queue
 */
router.post('/queues/:queueName/pause', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    if (!Object.values(JobType).includes(queueName as JobType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Invalid queue name', 'INVALID_QUEUE')
      );
    }

    const jobService = new JobService();
    await jobService.initialize();

    await jobService.pauseQueue(queueName as JobType);

    logger.info(`Queue ${queueName} paused by admin`, {
      adminId: req.user?.id,
      queueName
    });

    res.json(createSuccessResponse({
      message: `Queue ${queueName} paused successfully`,
      queueName,
      action: 'paused'
    }));

  } catch (error) {
    logger.error(`Failed to pause queue ${req.params.queueName}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id,
      queueName: req.params.queueName
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to pause queue', 'QUEUE_PAUSE_ERROR')
    );
  }
});

/**
 * POST /api/admin/jobs/queues/:queueName/resume
 * Resume a paused queue
 */
router.post('/queues/:queueName/resume', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    if (!Object.values(JobType).includes(queueName as JobType)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Invalid queue name', 'INVALID_QUEUE')
      );
    }

    const jobService = new JobService();
    await jobService.initialize();

    await jobService.resumeQueue(queueName as JobType);

    logger.info(`Queue ${queueName} resumed by admin`, {
      adminId: req.user?.id,
      queueName
    });

    res.json(createSuccessResponse({
      message: `Queue ${queueName} resumed successfully`,
      queueName,
      action: 'resumed'
    }));

  } catch (error) {
    logger.error(`Failed to resume queue ${req.params.queueName}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id,
      queueName: req.params.queueName
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to resume queue', 'QUEUE_RESUME_ERROR')
    );
  }
});

/**
 * POST /api/admin/jobs/queues/clean
 * Clean completed and failed jobs from all queues
 */
router.post('/queues/clean', async (req, res) => {
  try {
    const jobService = new JobService();
    await jobService.initialize();

    await jobService.cleanQueues();

    logger.info('Queues cleaned by admin', {
      adminId: req.user?.id
    });

    res.json(createSuccessResponse({
      message: 'All queues cleaned successfully',
      action: 'cleaned',
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    logger.error('Failed to clean queues', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to clean queues', 'QUEUE_CLEAN_ERROR')
    );
  }
});

/**
 * GET /api/admin/jobs/:jobId
 * Get detailed information about a specific job
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const jobService = new JobService();
    await jobService.initialize();

    const job = await jobService.getJob(jobId);

    if (!job) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        createErrorResponse('Job not found', 'JOB_NOT_FOUND')
      );
    }

    res.json(createSuccessResponse({
      job: {
        id: job.id,
        name: job.name,
        data: job.data,
        options: job.opts,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        timestamp: new Date(job.timestamp),
        processedOn: job.processedOn ? new Date(job.processedOn) : null,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue
      }
    }));

  } catch (error) {
    logger.error(`Failed to get job ${req.params.jobId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id,
      jobId: req.params.jobId
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to get job information', 'JOB_INFO_ERROR')
    );
  }
});

/**
 * POST /api/admin/jobs/email/test
 * Create a test email job for monitoring
 */
router.post('/email/test', async (req, res) => {
  try {
    const { email = req.user?.email, type = 'welcome' } = req.body;

    if (!email) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Email address required', 'EMAIL_REQUIRED')
      );
    }

    const jobService = new JobService();
    await jobService.initialize();

    const job = await jobService.addEmailJob({
      emailType: type,
      recipients: [email],
      subject: 'Test Email from Bareloft Admin',
      template: 'test',
      templateData: {
        firstName: 'Admin User',
        email: email,
        testMessage: 'This is a test email sent from the admin panel.'
      },
      priority: JobPriority.HIGH
    });

    logger.info('Test email job created by admin', {
      adminId: req.user?.id,
      jobId: job.id,
      email: email
    });

    res.json(createSuccessResponse({
      message: 'Test email job created successfully',
      jobId: job.id,
      email: email,
      type: type
    }));

  } catch (error) {
    logger.error('Failed to create test email job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to create test email job', 'TEST_EMAIL_ERROR')
    );
  }
});

/**
 * POST /api/admin/jobs/notification/test
 * Create a test notification job for monitoring
 */
router.post('/notification/test', async (req, res) => {
  try {
    const { userId = req.user?.id, channels = ['in_app'] } = req.body;

    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('User ID required', 'USER_ID_REQUIRED')
      );
    }

    const jobService = new JobService();
    await jobService.initialize();

    const job = await jobService.addNotificationJob({
      notificationType: 'in_app' as any,
      recipients: [userId],
      title: 'Test Notification',
      message: 'This is a test notification sent from the admin panel.',
      channels: channels,
      priority: JobPriority.HIGH
    });

    logger.info('Test notification job created by admin', {
      adminId: req.user?.id,
      jobId: job.id,
      userId: userId,
      channels: channels
    });

    res.json(createSuccessResponse({
      message: 'Test notification job created successfully',
      jobId: job.id,
      userId: userId,
      channels: channels
    }));

  } catch (error) {
    logger.error('Failed to create test notification job', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to create test notification job', 'TEST_NOTIFICATION_ERROR')
    );
  }
});

/**
 * POST /api/admin/jobs/reconciliation/trigger
 * Manually trigger payment reconciliation
 */
router.post('/reconciliation/trigger', async (req, res) => {
  try {
    const { 
      timeRangeHours = 24, 
      onlyUnconfirmed = false, 
      emergency = false 
    } = req.body;

    // Validate time range
    if (timeRangeHours < 1 || timeRangeHours > 168) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Time range must be between 1 and 168 hours', 'INVALID_TIME_RANGE')
      );
    }

    const jobService = new JobService();
    await jobService.initialize();

    const job = await jobService.addPaymentReconciliationJob({
      reconciliationType: emergency ? 'emergency' : 'manual',
      timeRangeHours,
      batchSize: emergency ? 20 : 50,
      onlyUnconfirmed,
      priority: emergency ? JobPriority.CRITICAL : JobPriority.HIGH
    }, {
      delay: 0 // Run immediately
    });

    logger.info('Payment reconciliation triggered by admin', {
      adminId: req.user?.id,
      jobId: job.id,
      timeRangeHours,
      onlyUnconfirmed,
      emergency
    });

    res.json(createSuccessResponse({
      message: `Payment reconciliation ${emergency ? 'emergency' : 'manual'} job created successfully`,
      jobId: job.id,
      reconciliationType: emergency ? 'emergency' : 'manual',
      timeRangeHours,
      onlyUnconfirmed
    }));

  } catch (error) {
    logger.error('Failed to trigger payment reconciliation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Failed to trigger payment reconciliation', 'RECONCILIATION_TRIGGER_ERROR')
    );
  }
});

/**
 * GET /api/admin/jobs/health
 * Get health status of job system
 */
router.get('/health', async (req, res) => {
  try {
    const jobService = new JobService();
    await jobService.initialize();

    const health = await jobService.healthCheck();
    const serviceStats = jobService.getStats();

    res.json(createSuccessResponse({
      overall: health.healthy ? 'healthy' : 'unhealthy',
      queues: health.queues,
      service: {
        initialized: serviceStats.initialized,
        supportedJobTypes: serviceStats.supportedJobTypes.length,
        processors: serviceStats.processors.length
      },
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    logger.error('Failed to get job system health', {
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: req.user?.id
    });

    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(
      createErrorResponse('Job system health check failed', 'HEALTH_CHECK_ERROR')
    );
  }
});

export default router;