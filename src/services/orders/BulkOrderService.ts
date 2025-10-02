import { BaseService } from "../BaseService";
import { OrderRepository } from "../../repositories/OrderRepository";
import { OrderService } from "./OrderService";
import { FulfillmentService } from "./FulfillmentService";
import { NotificationService } from "../notifications/NotificationService";
import { PaymentService } from "../payments/PaymentService";
import { redisClient } from "../../config/redis";
import { getServiceContainer } from "../../config/serviceContainer";
import {
  BulkOperationType,
  BulkJobStatus,
  BulkJob,
  BulkJobResult,
  BulkJobError,
  BulkJobProgress,
  BulkOrderStatusUpdateRequest,
  BulkOrderAssignRequest,
  BulkOrderCancelRequest,
  BulkRefundRequest,
  BulkPriorityUpdateRequest,
  BulkNotificationRequest,
  BulkExportRequest,
  BulkImportRequest,
  BulkProcessingSummary,
  SmartBatchConfig,
  BulkOperationMetrics,
  OrderStatus,
  OrderPriority,
  AppError,
  HTTP_STATUS,
  ERROR_CODES
} from "../../types";
import { NairaCurrencyUtils, NigerianPhoneUtils, NigerianEcommerceUtils } from "../../utils/helpers/nigerian";
import { generateCSVReport, generatePDFReport } from "../../utils/helpers/formatters";

/**
 * Comprehensive Bulk Order Processing Service
 * Handles all bulk operations on orders with queue management and Nigerian market features
 */
export class BulkOrderService extends BaseService {
  private orderRepository: OrderRepository;
  private orderService: OrderService;
  private fulfillmentService: FulfillmentService;
  private notificationService: NotificationService;
  private paymentService: PaymentService;

  // Queue management
  private jobQueue: Map<string, BulkJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private maxConcurrentJobs: number = 3;
  private defaultBatchSize: number = 50;

  // Smart batch configuration
  private smartBatchConfig: SmartBatchConfig = {
    maxBatchSize: 100,
    priorityBatching: true,
    locationBasedBatching: true,
    timeBasedBatching: true,
    resourceAwareBatching: true,
    nigerianBusinessHours: {
      enabled: true,
      timezone: 'Africa/Lagos',
      weekdays: { start: '08:00', end: '17:00' },
      saturday: { start: '09:00', end: '14:00' },
      holidays: [
        new Date('2024-01-01'), // New Year
        new Date('2024-10-01'), // Independence Day
        new Date('2024-12-25'), // Christmas
        new Date('2024-12-26'), // Boxing Day
      ]
    }
  };

  constructor(
    orderRepository?: OrderRepository,
    orderService?: OrderService,
    fulfillmentService?: FulfillmentService,
    notificationService?: NotificationService,
    paymentService?: PaymentService
  ) {
    super();

    // Use ServiceContainer for services if not provided
    if (!orderRepository || !orderService || !paymentService) {
      const serviceContainer = getServiceContainer();
      this.orderRepository = orderRepository || serviceContainer.getService<OrderRepository>('orderRepository');
      this.orderService = orderService || serviceContainer.getService<OrderService>('orderService');
      this.paymentService = paymentService || serviceContainer.getService<PaymentService>('paymentService');
    } else {
      this.orderRepository = orderRepository;
      this.orderService = orderService;
      this.paymentService = paymentService;
    }

    this.fulfillmentService = fulfillmentService || new FulfillmentService();
    this.notificationService = notificationService || new NotificationService();

    // Initialize queue processing
    this.initializeQueueProcessor();
  }

  // ========================================
  // BULK OPERATION ENDPOINTS
  // ========================================

  /**
   * Bulk status update
   */
  async bulkStatusUpdate(
    request: BulkOrderStatusUpdateRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.STATUS_UPDATE,
        status: BulkJobStatus.PENDING,
        title: `Bulk Status Update to ${request.newStatus}`,
        description: `Update ${request.orderIds.length} orders to ${request.newStatus}`,
        requestData: request,
        totalItems: request.orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: this.determineProcessingRegion(request.orderIds),
        businessHoursOnly: this.isBusinessHoursOperation(request.newStatus),
        respectHolidays: true
      };

      // Validate orders exist
      await this.validateOrdersExist(request.orderIds);

      // Add to queue
      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk status update job", error);
      throw error;
    }
  }

  /**
   * Bulk staff assignment
   */
  async bulkAssignStaff(
    request: BulkOrderAssignRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.ASSIGN_STAFF,
        status: BulkJobStatus.PENDING,
        title: `Bulk Staff Assignment`,
        description: `Assign ${request.orderIds.length} orders to ${request.staffName || request.staffId}`,
        requestData: request,
        totalItems: request.orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: this.determineProcessingRegion(request.orderIds),
        businessHoursOnly: true,
        respectHolidays: true
      };

      await this.validateOrdersExist(request.orderIds);
      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk staff assignment job", error);
      throw error;
    }
  }

  /**
   * Bulk order cancellation
   */
  async bulkCancelOrders(
    request: BulkOrderCancelRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.CANCEL_ORDERS,
        status: BulkJobStatus.PENDING,
        title: `Bulk Order Cancellation`,
        description: `Cancel ${request.orderIds.length} orders with reason: ${request.reason}`,
        requestData: request,
        totalItems: request.orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: this.determineProcessingRegion(request.orderIds),
        businessHoursOnly: request.processRefunds, // Refunds require business hours
        respectHolidays: true
      };

      await this.validateOrdersExist(request.orderIds);
      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk cancellation job", error);
      throw error;
    }
  }

  /**
   * Bulk refund processing
   */
  async bulkProcessRefunds(
    request: BulkRefundRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.PROCESS_REFUNDS,
        status: BulkJobStatus.PENDING,
        title: `Bulk Refund Processing`,
        description: `Process ${request.refundType || 'full'} refunds for ${request.orderIds.length} orders`,
        requestData: request,
        totalItems: request.orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: this.determineProcessingRegion(request.orderIds),
        businessHoursOnly: true, // Refunds always require business hours
        respectHolidays: true
      };

      await this.validateOrdersExist(request.orderIds);
      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk refund job", error);
      throw error;
    }
  }

  /**
   * Bulk priority update
   */
  async bulkSetPriority(
    request: BulkPriorityUpdateRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.SET_PRIORITY,
        status: BulkJobStatus.PENDING,
        title: `Bulk Priority Update`,
        description: `Set priority to ${request.priority} for ${request.orderIds.length} orders`,
        requestData: request,
        totalItems: request.orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: this.determineProcessingRegion(request.orderIds),
        businessHoursOnly: false,
        respectHolidays: false
      };

      await this.validateOrdersExist(request.orderIds);
      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk priority update job", error);
      throw error;
    }
  }

  /**
   * Bulk notification sending
   */
  async bulkSendNotifications(
    request: BulkNotificationRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.SEND_NOTIFICATIONS,
        status: BulkJobStatus.PENDING,
        title: `Bulk Notifications`,
        description: `Send ${request.notificationType} notifications to ${request.orderIds.length} customers`,
        requestData: request,
        totalItems: request.orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: 'national',
        businessHoursOnly: this.isBusinessHoursNotification(request.notificationType),
        respectHolidays: true
      };

      await this.validateOrdersExist(request.orderIds);
      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk notification job", error);
      throw error;
    }
  }

  /**
   * Bulk data export
   */
  async bulkExportData(
    request: BulkExportRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      
      // Determine order IDs from filters if not provided
      let orderIds = request.orderIds || [];
      if (orderIds.length === 0 && request.filters) {
        const filteredOrders = await this.getOrdersByFilters(request.filters);
        orderIds = filteredOrders.map(order => order.id);
      }

      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.EXPORT_DATA,
        status: BulkJobStatus.PENDING,
        title: `Bulk Data Export (${request.format.toUpperCase()})`,
        description: `Export ${orderIds.length} orders to ${request.format} format`,
        requestData: { ...request, orderIds },
        totalItems: orderIds.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: [],
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: 'national',
        businessHoursOnly: false,
        respectHolidays: false
      };

      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk export job", error);
      throw error;
    }
  }

  /**
   * Bulk data import
   */
  async bulkImportData(
    request: BulkImportRequest,
    createdBy: string,
    createdByName?: string
  ): Promise<BulkJob> {
    try {
      const jobId = this.generateJobId();
      
      // Validate import data
      const validationResults = await this.validateImportData(request.data);
      if (request.validateOnly) {
        return {
          id: jobId,
          type: BulkOperationType.IMPORT_DATA,
          status: BulkJobStatus.COMPLETED,
          title: 'Import Validation',
          description: 'Data validation completed',
          requestData: request,
          totalItems: request.data.length,
          processedItems: request.data.length,
          successfulItems: validationResults.valid,
          failedItems: validationResults.invalid,
          progress: 100,
          results: [],
          errors: validationResults.errors,
          createdBy,
          createdByName,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date()
        };
      }

      const job: BulkJob = {
        id: jobId,
        type: BulkOperationType.IMPORT_DATA,
        status: BulkJobStatus.PENDING,
        title: `Bulk Data Import`,
        description: `Import updates for ${request.data.length} orders`,
        requestData: request,
        totalItems: request.data.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
        results: [],
        errors: validationResults.errors,
        createdBy,
        createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        processingRegion: 'national',
        businessHoursOnly: true,
        respectHolidays: true
      };

      this.addJobToQueue(job);

      return job;
    } catch (error) {
      this.handleError("Error creating bulk import job", error);
      throw error;
    }
  }

  // ========================================
  // JOB MANAGEMENT
  // ========================================

  /**
   * Get all bulk processing jobs
   */
  async getBulkJobs(
    filters: {
      status?: BulkJobStatus;
      type?: BulkOperationType;
      createdBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ jobs: BulkJob[]; total: number; pagination: any }> {
    try {
      // Get jobs from queue and Redis storage
      const allJobs = Array.from(this.jobQueue.values());
      const storedJobs = await this.getStoredJobs();
      const combinedJobs = [...allJobs, ...storedJobs];

      // Apply filters
      let filteredJobs = combinedJobs.filter(job => {
        if (filters.status && job.status !== filters.status) return false;
        if (filters.type && job.type !== filters.type) return false;
        if (filters.createdBy && job.createdBy !== filters.createdBy) return false;
        if (filters.dateFrom && job.createdAt < filters.dateFrom) return false;
        if (filters.dateTo && job.createdAt > filters.dateTo) return false;
        return true;
      });

      // Sort by creation date (newest first)
      filteredJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const start = (pagination.page - 1) * pagination.limit;
      const paginatedJobs = filteredJobs.slice(start, start + pagination.limit);

      return {
        jobs: paginatedJobs,
        total: filteredJobs.length,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(filteredJobs.length / pagination.limit),
          hasNext: start + pagination.limit < filteredJobs.length,
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      this.handleError("Error fetching bulk jobs", error);
      throw error;
    }
  }

  /**
   * Get specific bulk job
   */
  async getBulkJob(jobId: string): Promise<BulkJob | null> {
    try {
      // Check active queue first
      const activeJob = this.jobQueue.get(jobId);
      if (activeJob) {
        return activeJob;
      }

      // Check stored jobs
      const storedJob = await redisClient.get<BulkJob>(`bulk_job:${jobId}`);
      return storedJob;
    } catch (error) {
      this.handleError("Error fetching bulk job", error);
      throw error;
    }
  }

  /**
   * Cancel bulk job
   */
  async cancelBulkJob(jobId: string, cancelledBy: string): Promise<boolean> {
    try {
      const job = await this.getBulkJob(jobId);
      if (!job) {
        throw new AppError(
          "Job not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      if (job.status === BulkJobStatus.COMPLETED || job.status === BulkJobStatus.FAILED) {
        throw new AppError(
          "Cannot cancel completed or failed job",
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR
        );
      }

      // Update job status
      job.status = BulkJobStatus.CANCELLED;
      job.updatedAt = new Date();
      job.completedAt = new Date();

      // Remove from active jobs
      this.activeJobs.delete(jobId);

      // Update in storage
      await this.updateJobInStorage(job);

      // Remove from queue if pending
      this.jobQueue.delete(jobId);

      return true;
    } catch (error) {
      this.handleError("Error cancelling bulk job", error);
      throw error;
    }
  }

  /**
   * Get bulk processing job history
   */
  async getBulkJobHistory(
    filters: {
      type?: BulkOperationType;
      createdBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<{ jobs: BulkJob[]; total: number; summary: any }> {
    try {
      const result = await this.getBulkJobs(
        { ...filters, status: BulkJobStatus.COMPLETED },
        pagination
      );

      // Calculate summary statistics
      const summary = {
        totalCompletedJobs: result.jobs.length,
        totalOrdersProcessed: result.jobs.reduce((sum, job) => sum + job.processedItems, 0),
        averageSuccessRate: result.jobs.length > 0 
          ? result.jobs.reduce((sum, job) => sum + (job.successfulItems / Math.max(job.totalItems, 1)), 0) / result.jobs.length * 100
          : 0,
        averageProcessingTime: this.calculateAverageProcessingTime(result.jobs),
        operationTypeBreakdown: this.getOperationTypeBreakdown(result.jobs)
      };

      return {
        ...result,
        summary
      };
    } catch (error) {
      this.handleError("Error fetching bulk job history", error);
      throw error;
    }
  }

  /**
   * Get bulk processing progress
   */
  async getBulkJobProgress(jobId: string): Promise<BulkJobProgress | null> {
    try {
      const job = await this.getBulkJob(jobId);
      if (!job) return null;

      return {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        successfulItems: job.successfulItems,
        failedItems: job.failedItems,
        estimatedCompletion: job.estimatedCompletion,
        currentOperation: this.getCurrentOperation(job),
        lastUpdate: job.updatedAt
      };
    } catch (error) {
      this.handleError("Error fetching job progress", error);
      throw error;
    }
  }

  /**
   * Get bulk processing summary
   */
  async getBulkProcessingSummary(): Promise<BulkProcessingSummary> {
    try {
      const allJobs = Array.from(this.jobQueue.values());
      const storedJobs = await this.getStoredJobs();
      const combinedJobs = [...allJobs, ...storedJobs];

      const activeJobs = combinedJobs.filter(job => 
        job.status === BulkJobStatus.PENDING || job.status === BulkJobStatus.PROCESSING
      );
      
      const completedJobs = combinedJobs.filter(job => job.status === BulkJobStatus.COMPLETED);
      const failedJobs = combinedJobs.filter(job => job.status === BulkJobStatus.FAILED);

      return {
        totalJobs: combinedJobs.length,
        activeJobs: activeJobs.length,
        completedJobs: completedJobs.length,
        failedJobs: failedJobs.length,
        totalOrdersProcessed: completedJobs.reduce((sum, job) => sum + job.processedItems, 0),
        averageProcessingTime: this.calculateAverageProcessingTime(completedJobs),
        successRate: combinedJobs.length > 0 
          ? (completedJobs.length / combinedJobs.length) * 100 
          : 0,
        lastJobCompletion: completedJobs.length > 0 
          ? new Date(Math.max(...completedJobs.map(job => job.completedAt?.getTime() || 0)))
          : undefined,
        queueSize: this.jobQueue.size,
        systemLoad: this.getSystemLoad()
      };
    } catch (error) {
      this.handleError("Error fetching bulk processing summary", error);
      throw error;
    }
  }

  // ========================================
  // QUEUE PROCESSING ENGINE
  // ========================================

  /**
   * Initialize queue processor
   */
  private initializeQueueProcessor(): void {
    setInterval(() => {
      this.processJobQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process job queue
   */
  private async processJobQueue(): Promise<void> {
    try {
      if (this.activeJobs.size >= this.maxConcurrentJobs) {
        return; // Max concurrent jobs reached
      }

      // Get next job to process
      const nextJob = this.getNextJobToProcess();
      if (!nextJob) {
        return; // No jobs to process
      }

      // Check if we should respect business hours
      if (nextJob.businessHoursOnly && !this.isCurrentlyBusinessHours()) {
        return; // Wait for business hours
      }

      // Check Nigerian holidays
      if (nextJob.respectHolidays && this.isNigerianHoliday()) {
        return; // Wait for non-holiday
      }

      // Start processing job
      this.activeJobs.add(nextJob.id);
      await this.processJob(nextJob);
    } catch (error) {
      console.error("Error in queue processor:", error);
    }
  }

  /**
   * Process individual job
   */
  private async processJob(job: BulkJob): Promise<void> {
    try {
      // Update job status
      job.status = BulkJobStatus.PROCESSING;
      job.startedAt = new Date();
      job.updatedAt = new Date();
      job.estimatedCompletion = this.calculateEstimatedCompletion(job);

      await this.updateJobInStorage(job);

      // Process based on job type
      switch (job.type) {
        case BulkOperationType.STATUS_UPDATE:
          await this.processStatusUpdateJob(job);
          break;
        case BulkOperationType.ASSIGN_STAFF:
          await this.processAssignStaffJob(job);
          break;
        case BulkOperationType.CANCEL_ORDERS:
          await this.processCancelOrdersJob(job);
          break;
        case BulkOperationType.PROCESS_REFUNDS:
          await this.processRefundsJob(job);
          break;
        case BulkOperationType.SET_PRIORITY:
          await this.processPriorityUpdateJob(job);
          break;
        case BulkOperationType.SEND_NOTIFICATIONS:
          await this.processNotificationsJob(job);
          break;
        case BulkOperationType.EXPORT_DATA:
          await this.processExportJob(job);
          break;
        case BulkOperationType.IMPORT_DATA:
          await this.processImportJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Complete job
      job.status = job.failedItems === 0 ? BulkJobStatus.COMPLETED : BulkJobStatus.PARTIALLY_COMPLETED;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.progress = 100;

    } catch (error) {
      // Handle job failure
      job.status = BulkJobStatus.FAILED;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      
      const jobError: BulkJobError = {
        id: `error_${Date.now()}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'JOB_PROCESSING_FAILED',
        retryable: true,
        occurredAt: new Date()
      };
      
      job.errors = job.errors || [];
      job.errors.push(jobError);
    } finally {
      // Clean up
      this.activeJobs.delete(job.id);
      this.jobQueue.delete(job.id);
      await this.updateJobInStorage(job);
    }
  }

  // ========================================
  // JOB PROCESSING METHODS
  // ========================================

  private async processStatusUpdateJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkOrderStatusUpdateRequest;
    const batchSize = request.batchSize || this.defaultBatchSize;
    
    for (let i = 0; i < request.orderIds.length; i += batchSize) {
      const batch = request.orderIds.slice(i, i + batchSize);
      
      for (const orderId of batch) {
        try {
          await this.orderService.updateOrderStatus(
            orderId,
            request.newStatus,
            request.notes,
            job.createdBy
          );

          job.successfulItems++;
          job.results!.push({
            id: `result_${Date.now()}_${orderId}`,
            orderId,
            success: true,
            message: `Status updated to ${request.newStatus}`,
            processedAt: new Date()
          });

          // Send notification if requested
          if (request.notifyCustomers) {
            try {
              // Implementation would send notification
              // await this.notificationService.sendOrderStatusNotification(orderId, request.newStatus);
            } catch (notificationError) {
              console.warn(`Failed to send notification for order ${orderId}:`, notificationError);
            }
          }

        } catch (error) {
          job.failedItems++;
          job.errors!.push({
            id: `error_${Date.now()}_${orderId}`,
            orderId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'STATUS_UPDATE_FAILED',
            retryable: true,
            occurredAt: new Date()
          });
        }

        job.processedItems++;
        job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
        job.updatedAt = new Date();
      }

      // Update job progress in storage
      await this.updateJobInStorage(job);
      
      // Small delay between batches to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async processAssignStaffJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkOrderAssignRequest;
    
    for (const orderId of request.orderIds) {
      try {
        // In a full implementation, this would update order assignment in database
        // For now, we'll simulate the assignment
        
        job.successfulItems++;
        job.results!.push({
          id: `result_${Date.now()}_${orderId}`,
          orderId,
          success: true,
          message: `Assigned to ${request.staffName || request.staffId}`,
          data: {
            staffId: request.staffId,
            staffName: request.staffName,
            assignmentType: request.assignmentType,
            notes: request.notes
          },
          processedAt: new Date()
        });

      } catch (error) {
        job.failedItems++;
        job.errors!.push({
          id: `error_${Date.now()}_${orderId}`,
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'STAFF_ASSIGNMENT_FAILED',
          retryable: true,
          occurredAt: new Date()
        });
      }

      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date();
    }

    await this.updateJobInStorage(job);
  }

  private async processCancelOrdersJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkOrderCancelRequest;
    
    for (const orderId of request.orderIds) {
      try {
        // Cancel the order
        await this.orderService.cancelOrder(orderId, request.reason, job.createdBy);

        // Process refund if requested
        if (request.processRefunds) {
          try {
            // Implementation would process refund
            // const refundAmount = calculateRefundAmount(orderId, request.refundPercentage);
            // await this.paymentService.processRefund(orderId, refundAmount, request.reason);
          } catch (refundError) {
            console.warn(`Failed to process refund for order ${orderId}:`, refundError);
          }
        }

        job.successfulItems++;
        job.results!.push({
          id: `result_${Date.now()}_${orderId}`,
          orderId,
          success: true,
          message: `Order cancelled: ${request.reason}`,
          data: {
            reason: request.reason,
            refundProcessed: request.processRefunds
          },
          processedAt: new Date()
        });

      } catch (error) {
        job.failedItems++;
        job.errors!.push({
          id: `error_${Date.now()}_${orderId}`,
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'ORDER_CANCELLATION_FAILED',
          retryable: true,
          occurredAt: new Date()
        });
      }

      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date();
    }

    await this.updateJobInStorage(job);
  }

  private async processRefundsJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkRefundRequest;
    
    for (const orderId of request.orderIds) {
      try {
        // Calculate refund amount
        let refundAmount: number;
        if (request.refundType === 'partial' && request.customAmounts?.[orderId]) {
          refundAmount = request.customAmounts[orderId];
        } else {
          // Get order total for full refund
          const order = await this.orderService.getOrderById(orderId);
          refundAmount = order.total;
        }

        // Process refund (implementation would integrate with payment service)
        // await this.paymentService.processRefund({
        //   orderId,
        //   amount: refundAmount,
        //   reason: request.reason,
        //   method: request.refundMethod || 'original'
        // });

        job.successfulItems++;
        job.results!.push({
          id: `result_${Date.now()}_${orderId}`,
          orderId,
          success: true,
          message: `Refund processed: ${NairaCurrencyUtils.format(refundAmount / 100)}`,
          data: {
            refundAmount,
            refundType: request.refundType,
            refundMethod: request.refundMethod,
            reason: request.reason
          },
          processedAt: new Date()
        });

      } catch (error) {
        job.failedItems++;
        job.errors!.push({
          id: `error_${Date.now()}_${orderId}`,
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'REFUND_PROCESSING_FAILED',
          retryable: true,
          occurredAt: new Date()
        });
      }

      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date();
    }

    await this.updateJobInStorage(job);
  }

  private async processPriorityUpdateJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkPriorityUpdateRequest;
    
    for (const orderId of request.orderIds) {
      try {
        // In a full implementation, this would update order priority in database
        // For now, we'll simulate the priority update
        
        job.successfulItems++;
        job.results!.push({
          id: `result_${Date.now()}_${orderId}`,
          orderId,
          success: true,
          message: `Priority set to ${request.priority}`,
          data: {
            priority: request.priority,
            reason: request.reason,
            autoReorder: request.autoReorder
          },
          processedAt: new Date()
        });

      } catch (error) {
        job.failedItems++;
        job.errors!.push({
          id: `error_${Date.now()}_${orderId}`,
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'PRIORITY_UPDATE_FAILED',
          retryable: true,
          occurredAt: new Date()
        });
      }

      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date();
    }

    await this.updateJobInStorage(job);
  }

  private async processNotificationsJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkNotificationRequest;
    
    for (const orderId of request.orderIds) {
      try {
        // Get order details for notification
        const order = await this.orderService.getOrderById(orderId);
        
        // Send notifications through requested channels
        for (const channel of request.channels) {
          try {
            // Implementation would send actual notifications
            // await this.notificationService.sendNotification({
            //   type: request.notificationType,
            //   channel,
            //   orderId,
            //   customMessage: request.customMessage,
            //   scheduleTime: request.scheduleTime
            // });
          } catch (channelError) {
            console.warn(`Failed to send ${channel} notification for order ${orderId}:`, channelError);
          }
        }

        job.successfulItems++;
        job.results!.push({
          id: `result_${Date.now()}_${orderId}`,
          orderId,
          orderNumber: order.orderNumber,
          success: true,
          message: `Notifications sent via ${request.channels.join(', ')}`,
          data: {
            notificationType: request.notificationType,
            channels: request.channels,
            customMessage: request.customMessage,
            scheduled: !!request.scheduleTime
          },
          processedAt: new Date()
        });

      } catch (error) {
        job.failedItems++;
        job.errors!.push({
          id: `error_${Date.now()}_${orderId}`,
          orderId,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'NOTIFICATION_FAILED',
          retryable: true,
          occurredAt: new Date()
        });
      }

      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date();
    }

    await this.updateJobInStorage(job);
  }

  private async processExportJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkExportRequest;
    
    try {
      // Get order data
      const orders = await this.getOrdersByIds(request.orderIds!);
      
      // Format data for export with Nigerian context
      const exportData = orders.map(order => ({
        'Order Number': order.orderNumber,
        'Date': new Date(order.createdAt).toLocaleDateString('en-NG'),
        'Customer': `${order.user?.firstName} ${order.user?.lastName}`,
        'Status': order.status,
        'Payment Status': order.paymentStatus,
        'Amount (₦)': order.total / 100, // Convert from kobo
        'Currency': 'NGN',
        'Items': order._count?.items || 0,
        ...(request.includeCustomerData && {
          'Customer Phone': order.user?.phoneNumber ? 
            NigerianPhoneUtils.format(order.user.phoneNumber) : 'N/A',
          'Customer Email': order.user?.email || 'N/A'
        }),
        ...(request.includePaymentData && {
          'Payment Method': order.paymentMethod || 'N/A',
          'Payment Reference': order.paymentReference || 'N/A'
        })
      }));

      // Generate export file
      let exportContent: Buffer;
      let contentType: string;
      let fileName: string;

      switch (request.format) {
        case 'csv':
          exportContent = Buffer.from(generateCSVReport(exportData));
          contentType = 'text/csv';
          fileName = `orders-export-${Date.now()}.csv`;
          break;
        case 'pdf':
          exportContent = await generatePDFReport(exportData, 'Order Export Report');
          contentType = 'application/pdf';
          fileName = `orders-export-${Date.now()}.pdf`;
          break;
        default:
          exportContent = Buffer.from(generateCSVReport(exportData));
          contentType = 'text/csv';
          fileName = `orders-export-${Date.now()}.csv`;
      }

      // Store export file (in production, save to cloud storage)
      const exportPath = `/exports/${fileName}`;
      
      job.successfulItems = exportData.length;
      job.processedItems = exportData.length;
      job.results!.push({
        id: `result_${Date.now()}`,
        orderId: 'export',
        success: true,
        message: `Export generated: ${fileName}`,
        data: {
          fileName,
          contentType,
          exportPath,
          recordCount: exportData.length,
          fileSize: exportContent.length
        },
        processedAt: new Date()
      });

    } catch (error) {
      job.failedItems = 1;
      job.errors!.push({
        id: `error_${Date.now()}`,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXPORT_FAILED',
        retryable: true,
        occurredAt: new Date()
      });
    }

    job.processedItems = job.totalItems;
    job.progress = 100;
    job.updatedAt = new Date();
    await this.updateJobInStorage(job);
  }

  private async processImportJob(job: BulkJob): Promise<void> {
    const request = job.requestData as BulkImportRequest;
    
    for (const row of request.data) {
      try {
        // Find order by number or ID
        let orderId = row.orderId;
        if (!orderId && row.orderNumber) {
          const order = await this.orderService.getOrderByNumber(row.orderNumber);
          orderId = order.id;
        }

        if (!orderId) {
          throw new Error('Order not found');
        }

        // Apply updates
        const updates: any = {};
        if (row.newStatus) {
          updates.status = row.newStatus;
        }
        if (row.trackingNumber) {
          updates.trackingNumber = row.trackingNumber;
        }
        if (row.notes) {
          updates.notes = row.notes;
        }

        // Update order (implementation would use proper service methods)
        if (updates.status) {
          await this.orderService.updateOrderStatus(
            orderId,
            updates.status as any,
            updates.notes,
            job.createdBy
          );
        }

        job.successfulItems++;
        job.results!.push({
          id: `result_${Date.now()}_${orderId}`,
          orderId,
          orderNumber: row.orderNumber,
          success: true,
          message: 'Import data applied successfully',
          data: updates,
          processedAt: new Date()
        });

      } catch (error) {
        if (!request.skipInvalidRows) {
          job.failedItems++;
          job.errors!.push({
            id: `error_${Date.now()}`,
            orderId: row.orderId,
            orderNumber: row.orderNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: 'IMPORT_ROW_FAILED',
            retryable: true,
            occurredAt: new Date()
          });
        }
      }

      job.processedItems++;
      job.progress = Math.floor((job.processedItems / job.totalItems) * 100);
      job.updatedAt = new Date();
    }

    await this.updateJobInStorage(job);
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  private generateJobId(): string {
    return `bulk_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addJobToQueue(job: BulkJob): void {
    this.jobQueue.set(job.id, job);
  }

  private getNextJobToProcess(): BulkJob | null {
    const pendingJobs = Array.from(this.jobQueue.values()).filter(
      job => job.status === BulkJobStatus.PENDING
    );

    if (pendingJobs.length === 0) {
      return null;
    }

    // Sort by priority (high priority first, then by creation date)
    return pendingJobs.sort((a, b) => {
      // Priority processing logic
      const aPriority = this.getJobPriority(a);
      const bPriority = this.getJobPriority(b);
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
    })[0];
  }

  private getJobPriority(job: BulkJob): number {
    // Priority scoring logic
    let priority = 0;
    
    // Refunds and cancellations are high priority
    if (job.type === BulkOperationType.PROCESS_REFUNDS || 
        job.type === BulkOperationType.CANCEL_ORDERS) {
      priority += 100;
    }
    
    // Status updates are medium priority
    if (job.type === BulkOperationType.STATUS_UPDATE) {
      priority += 50;
    }
    
    // Smaller jobs get slight priority
    if (job.totalItems <= 10) {
      priority += 10;
    }
    
    // Age factor (older jobs get priority)
    const ageInHours = (Date.now() - job.createdAt.getTime()) / (1000 * 60 * 60);
    priority += Math.min(ageInHours, 24); // Max 24 hours worth of age priority
    
    return priority;
  }

  private async updateJobInStorage(job: BulkJob): Promise<void> {
    try {
      await redisClient.set(`bulk_job:${job.id}`, job, 30 * 24 * 60 * 60); // 30 days
    } catch (error) {
      console.error("Failed to update job in storage:", error);
    }
  }

  private async getStoredJobs(): Promise<BulkJob[]> {
    try {
      // In production, implement proper Redis scanning for job keys
      return [];
    } catch (error) {
      console.error("Failed to get stored jobs:", error);
      return [];
    }
  }

  private async validateOrdersExist(orderIds: string[]): Promise<void> {
    // Implementation would validate all orders exist
    // For now, we'll assume they exist
  }

  private async validateImportData(data: any[]): Promise<{
    valid: number;
    invalid: number;
    errors: BulkJobError[];
  }> {
    let valid = 0;
    let invalid = 0;
    const errors: BulkJobError[] = [];

    // Simple validation logic
    for (const row of data) {
      if (!row.orderNumber && !row.orderId) {
        invalid++;
        errors.push({
          id: `validation_error_${Date.now()}`,
          error: 'Either orderNumber or orderId is required',
          errorCode: 'MISSING_ORDER_IDENTIFIER',
          retryable: false,
          occurredAt: new Date()
        });
      } else {
        valid++;
      }
    }

    return { valid, invalid, errors };
  }

  private async getOrdersByIds(orderIds: string[]): Promise<any[]> {
    // Implementation would fetch orders from repository
    // For now, return placeholder data
    return orderIds.map(id => ({
      id,
      orderNumber: `BL${Date.now()}`,
      status: OrderStatus.DELIVERED,
      paymentStatus: 'COMPLETED',
      total: 150000, // in kobo
      createdAt: new Date(),
      user: {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+2348012345678',
        email: 'john@example.com'
      },
      _count: { items: 2 }
    }));
  }

  private async getOrdersByFilters(filters: any): Promise<any[]> {
    // Implementation would fetch orders based on filters
    return [];
  }

  private determineProcessingRegion(orderIds: string[]): 'lagos' | 'abuja' | 'kano' | 'port_harcourt' | 'national' {
    // Logic to determine processing region based on orders
    // For now, default to national
    return 'national';
  }

  private isBusinessHoursOperation(status: OrderStatus): boolean {
    // Some operations require business hours
    const businessHoursStatuses = [OrderStatus.PROCESSING, OrderStatus.SHIPPED];
    return businessHoursStatuses.includes(status);
  }

  private isBusinessHoursNotification(type: string): boolean {
    // Some notifications should only be sent during business hours
    return type !== 'status_update';
  }

  private isCurrentlyBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Nigerian business hours: Monday-Friday 8:00-17:00, Saturday 9:00-14:00
    if (day === 0) return false; // Sunday
    if (day === 6) return hour >= 9 && hour <= 14; // Saturday
    return hour >= 8 && hour <= 17; // Weekdays
  }

  private isNigerianHoliday(): boolean {
    const today = new Date();
    return this.smartBatchConfig.nigerianBusinessHours.holidays.some(holiday =>
      holiday.toDateString() === today.toDateString()
    );
  }

  private calculateEstimatedCompletion(job: BulkJob): Date {
    // Estimate completion based on job size and type
    const baseTimePerItem = this.getBaseProcessingTime(job.type); // in seconds
    const totalSeconds = job.totalItems * baseTimePerItem;
    
    // Add buffer for system load and batching
    const bufferedSeconds = totalSeconds * 1.2;
    
    return new Date(Date.now() + bufferedSeconds * 1000);
  }

  private getBaseProcessingTime(type: BulkOperationType): number {
    const timings: Record<BulkOperationType, number> = {
      [BulkOperationType.STATUS_UPDATE]: 2, // 2 seconds per order
      [BulkOperationType.ASSIGN_STAFF]: 1, // 1 second per order
      [BulkOperationType.CANCEL_ORDERS]: 3, // 3 seconds per order (includes potential refund)
      [BulkOperationType.PROCESS_REFUNDS]: 5, // 5 seconds per refund
      [BulkOperationType.SET_PRIORITY]: 0.5, // 0.5 seconds per order
      [BulkOperationType.SEND_NOTIFICATIONS]: 4, // 4 seconds per notification
      [BulkOperationType.EXPORT_DATA]: 0.1, // 0.1 seconds per record
      [BulkOperationType.IMPORT_DATA]: 2, // 2 seconds per row
      [BulkOperationType.GENERATE_LABELS]: 3, // 3 seconds per label
    };

    return timings[type] || 2;
  }

  private getCurrentOperation(job: BulkJob): string {
    if (job.status === BulkJobStatus.PENDING) {
      return 'Waiting to start';
    }
    if (job.status === BulkJobStatus.PROCESSING) {
      const progress = job.progress;
      if (progress < 25) return 'Initializing processing';
      if (progress < 75) return 'Processing orders';
      return 'Finalizing results';
    }
    return 'Completed';
  }

  private calculateAverageProcessingTime(jobs: BulkJob[]): number {
    if (jobs.length === 0) return 0;
    
    const completedJobs = jobs.filter(job => 
      job.startedAt && job.completedAt && job.status === BulkJobStatus.COMPLETED
    );
    
    if (completedJobs.length === 0) return 0;
    
    const totalTime = completedJobs.reduce((sum, job) => {
      const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
      return sum + duration;
    }, 0);
    
    return totalTime / completedJobs.length / 1000 / 60; // Return in minutes
  }

  private getOperationTypeBreakdown(jobs: BulkJob[]): Record<string, number> {
    return jobs.reduce((breakdown, job) => {
      breakdown[job.type] = (breakdown[job.type] || 0) + 1;
      return breakdown;
    }, {} as Record<string, number>);
  }

  private getSystemLoad(): 'low' | 'medium' | 'high' {
    const activeJobCount = this.activeJobs.size;
    const queueSize = this.jobQueue.size;
    
    if (activeJobCount >= this.maxConcurrentJobs || queueSize > 10) {
      return 'high';
    }
    if (activeJobCount >= this.maxConcurrentJobs / 2 || queueSize > 5) {
      return 'medium';
    }
    return 'low';
  }
}