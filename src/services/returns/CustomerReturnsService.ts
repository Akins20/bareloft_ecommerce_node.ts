/**
 * Customer Returns Service
 * Handles customer-facing return request operations
 * Nigerian e-commerce platform optimized
 */

import { BaseService } from '../BaseService';
import { ReturnRepository } from '../../repositories/ReturnRepository';
import { OrderRepository } from '../../repositories/OrderRepository';
import { ProductRepository } from '../../repositories/ProductRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { CloudStorageService } from '../upload/CloudStorageService';
import { NotificationService } from '../notifications/NotificationService';
// Local type definitions since imported types conflict with database models
type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'INSPECTED' | 'PROCESSED' | 'COMPLETED' | 'CANCELLED';
type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'DAMAGED' | 'SIZE_ISSUE' | 'QUALITY_ISSUE' | 'CHANGE_OF_MIND' | 'OTHER';
type ReturnShippingMethod = 'PICKUP_SERVICE' | 'DROP_OFF' | 'COURIER' | 'CUSTOMER_DELIVERY';

interface CreateReturnRequest {
  orderId: string;
  reason: ReturnReason;
  description?: string;
  items: Array<{
    orderItemId: string;
    quantityToReturn: number;
  }>;
  customerNotes?: string;
  returnShippingMethod?: ReturnShippingMethod;
  pickupAddress?: {
    phoneNumber?: string;
    address?: string;
  };
}

interface ReturnRequest {
  id: string;
  returnNumber: string;
  orderId: string;
  customerId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  description?: string;
  totalAmount: number;
  currency: string;
  isEligible: boolean;
  eligibilityReason?: string;
  returnShippingMethod?: string;
  returnTrackingNumber?: string;
  estimatedPickupDate?: Date;
  actualPickupDate?: Date;
  estimatedReturnDate?: Date;
  actualReturnDate?: Date;
  qualityCheckNotes?: string;
  inspectionPhotos?: string[];
  adminNotes?: string;
  customerNotes?: string;
  processedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  order?: any;
  customer?: any;
  items?: any[];
  refunds?: any[];
  timeline?: ReturnTimelineEvent[];
}

interface ReturnListQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ReturnStatus[];
  reason?: ReturnReason[];
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  state?: string;
}

interface ReturnEligibilityCheck {
  orderId: string;
  items?: Array<{
    orderItemId: string;
    quantityToReturn: number;
  }>;
}

interface ReturnEligibilityResponse {
  isEligible: boolean;
  reason?: string;
  eligibleItems: Array<{
    orderItemId: string;
    productId: string;
    productName: string;
    maxQuantityReturnable: number;
    isEligible: boolean;
    reason?: string;
    returnWindow?: {
      expiresAt: Date;
      daysRemaining: number;
    };
  }>;
  returnPolicySummary: {
    returnWindowDays: number;
    acceptsReturns: boolean;
    requiresOriginalPackaging: boolean;
    returnShippingCost: string;
  };
}

interface ReturnTimelineEvent {
  id: string;
  returnRequestId: string;
  type: string;
  title: string;
  description: string;
  data?: any;
  createdBy?: string;
  createdByName?: string;
  isVisible: boolean;
  createdAt: Date;
}
// Mock logger since winston import has issues
const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  error: (message: string, data?: any) => console.error(message, data),
  warn: (message: string, data?: any) => console.warn(message, data)
};

// Mock helper functions
const generateReturnNumber = async (): Promise<string> => {
  return `RET-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

const calculateReturnEligibility = async (order: any, orderItem: any, options: any) => {
  const daysSinceOrder = Math.floor((new Date().getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const isWithinWindow = daysSinceOrder <= 14; // 14-day return window
  const maxQuantityReturnable = options.quantityRequested <= orderItem.quantity ? options.quantityRequested : orderItem.quantity;
  
  return {
    isEligible: isWithinWindow,
    reason: isWithinWindow ? undefined : 'Return window expired',
    maxQuantityReturnable,
    returnWindow: {
      expiresAt: new Date(order.createdAt.getTime() + (14 * 24 * 60 * 60 * 1000)),
      daysRemaining: Math.max(0, 14 - daysSinceOrder)
    }
  };
};

const validateNigerianPhoneNumber = (phoneNumber: string): boolean => {
  // Basic Nigerian phone number validation
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const patterns = [
    /^\+234[0-9]{10}$/, // +234XXXXXXXXXX
    /^234[0-9]{10}$/, // 234XXXXXXXXXX
    /^0[0-9]{10}$/, // 0XXXXXXXXXX
  ];
  return patterns.some(pattern => pattern.test(cleanNumber));
};

interface CustomerReturnDashboard {
  summary: {
    totalReturns: number;
    pendingReturns: number;
    completedReturns: number;
    totalRefundAmount: number;
    averageProcessingTime: number;
  };
  recentReturns: ReturnRequest[];
  quickActions: {
    eligibleOrdersCount: number;
    pendingRefundsCount: number;
    awaitingPickupCount: number;
  };
  returnsByStatus: {
    status: ReturnStatus;
    count: number;
    percentage: number;
  }[];
  returnsByReason: {
    reason: ReturnReason;
    count: number;
    percentage: number;
  }[];
}

interface CustomerReturnAnalytics {
  returnRate: number;
  totalReturnValue: number;
  averageReturnValue: number;
  returnsByMonth: {
    month: string;
    count: number;
    value: number;
  }[];
  topReturnReasons: {
    reason: ReturnReason;
    count: number;
    percentage: number;
  }[];
  returnSuccessRate: number;
  averageProcessingTime: number;
  recommendations: string[];
}

interface ProcessingEstimates {
  standard: {
    pickupTime: string;
    processingTime: string;
    refundTime: string;
  };
  express: {
    available: boolean;
    pickupTime?: string;
    processingTime?: string;
    refundTime?: string;
    additionalCost?: number;
  };
  currentVolume: 'low' | 'medium' | 'high';
  estimatedDelays: string[];
}

interface SeasonalReturnInfo {
  currentSeason: 'regular' | 'holiday' | 'peak_sale';
  expectedProcessingTime: string;
  volumeImpact: string;
  specialNotices: string[];
  festivalSchedule?: {
    name: string;
    dates: string;
    impact: string;
  }[];
}

export class CustomerReturnsService extends BaseService {
  private returnRequestRepository: ReturnRepository;
  private orderRepository: OrderRepository;
  private productRepository: ProductRepository;
  private userRepository: UserRepository;
  private fileStorageService: CloudStorageService;

  constructor() {
    super();
    this.returnRequestRepository = new ReturnRepository();
    this.orderRepository = new OrderRepository();
    this.productRepository = new ProductRepository();
    this.userRepository = new UserRepository();
    this.fileStorageService = new CloudStorageService();
  }

  // ==================== RETURN REQUEST MANAGEMENT ====================

  /**
   * Create new return request
   */
  async createReturnRequest(
    requestData: CreateReturnRequest,
    customerId: string
  ): Promise<ReturnRequest> {
    try {
      // Validate order ownership
      const order = await this.orderRepository.findById(requestData.orderId);
      if (!order || order.customerId !== customerId) {
        throw new Error('Order not found or access denied');
      }

      // Validate phone number if provided
      if (requestData.pickupAddress?.phoneNumber) {
        if (!validateNigerianPhoneNumber(requestData.pickupAddress.phoneNumber)) {
          throw new Error('Invalid Nigerian phone number format');
        }
      }

      // Generate unique return number
      const returnNumber = await generateReturnNumber();

      // Calculate total return amount
      let totalAmount = 0;
      const returnItems = [];

      for (const item of requestData.items) {
        const orderItem = order.items.find(oi => oi.id === item.orderItemId);
        if (!orderItem) {
          throw new Error(`Order item ${item.orderItemId} not found`);
        }

        if (item.quantityToReturn > orderItem.quantity) {
          throw new Error(`Cannot return ${item.quantityToReturn} items, only ${orderItem.quantity} were ordered`);
        }

        const itemTotal = (orderItem.price * item.quantityToReturn);
        totalAmount += itemTotal;

        returnItems.push({
          orderItemId: item.orderItemId,
          productId: orderItem.productId,
          productName: orderItem.productName,
          productSku: orderItem.productSku,
          quantityReturned: item.quantityToReturn,
          unitPrice: orderItem.price,
          totalPrice: itemTotal,
          restockable: true, // Default to true, will be updated during inspection
        });
      }

      // Create return request
      const returnRequestData = {
        returnNumber,
        orderId: requestData.orderId,
        customerId,
        status: 'PENDING' as ReturnStatus,
        reason: requestData.reason,
        description: requestData.description,
        requestedItems: returnItems,
        totalAmount,
        currency: 'NGN',
        isEligible: true,
        returnShippingMethod: requestData.returnShippingMethod || 'PICKUP_SERVICE',
        customerNotes: requestData.customerNotes,
        pickupAddress: requestData.pickupAddress,
      };

      const returnRequest = await this.returnRequestRepository.createReturnRequest(returnRequestData);

      // Add return items
      await this.returnRequestRepository.addReturnItems(returnRequest.id, returnItems);

      // Create timeline event
      await this.createTimelineEvent(returnRequest.id, {
        type: 'return_created',
        title: 'Return Request Submitted',
        description: `Return request created for ${returnItems.length} item(s)`,
        data: { itemCount: returnItems.length, reason: requestData.reason },
        isVisible: true
      });

      logger.info('Return request created successfully', {
        returnRequestId: returnRequest.id,
        returnNumber,
        customerId,
        orderId: requestData.orderId,
        totalAmount
      });

      return returnRequest;

    } catch (error) {
      logger.error('Error creating return request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
        orderId: requestData.orderId
      });
      throw error;
    }
  }

  /**
   * Check return eligibility for order
   */
  async checkReturnEligibility(
    eligibilityCheck: ReturnEligibilityCheck,
    customerId: string
  ): Promise<ReturnEligibilityResponse> {
    try {
      // Get order with items
      const order = await this.orderRepository.findByIdWithDetails(eligibilityCheck.orderId);
      if (!order || order.customerId !== customerId) {
        return {
          isEligible: false,
          reason: 'Order not found or access denied',
          eligibleItems: [],
          returnPolicySummary: {
            returnWindowDays: 14,
            acceptsReturns: false,
            requiresOriginalPackaging: true,
            returnShippingCost: 'Customer pays'
          }
        };
      }

      // Calculate eligibility for each item
      const eligibleItems = [];
      let overallEligible = true;
      let overallReason = '';

      for (const orderItem of order.items) {
        const requestedItem = eligibilityCheck.items?.find(
          item => item.orderItemId === orderItem.id
        );
        const quantityToReturn = requestedItem?.quantityToReturn || orderItem.quantity;

        const eligibility = await calculateReturnEligibility(order, orderItem, {
          quantityRequested: quantityToReturn,
          currentDate: new Date()
        });

        eligibleItems.push({
          orderItemId: orderItem.id,
          productId: orderItem.productId,
          productName: orderItem.productName,
          maxQuantityReturnable: eligibility.maxQuantityReturnable,
          isEligible: eligibility.isEligible,
          reason: eligibility.reason,
          returnWindow: eligibility.returnWindow ? {
            expiresAt: eligibility.returnWindow.expiresAt,
            daysRemaining: eligibility.returnWindow.daysRemaining
          } : undefined
        });

        if (!eligibility.isEligible) {
          overallEligible = false;
          if (!overallReason) {
            overallReason = eligibility.reason || 'Some items are not eligible for return';
          }
        }
      }

      return {
        isEligible: overallEligible,
        reason: overallReason || undefined,
        eligibleItems,
        returnPolicySummary: {
          returnWindowDays: 14,
          acceptsReturns: true,
          requiresOriginalPackaging: true,
          returnShippingCost: 'Customer pays for return shipping'
        }
      };

    } catch (error) {
      logger.error('Error checking return eligibility', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
        orderId: eligibilityCheck.orderId
      });
      throw error;
    }
  }

  /**
   * Get customer's return requests with pagination and filtering
   */
  async getCustomerReturns(
    customerId: string,
    query: ReturnListQuery
  ): Promise<{
    returns: ReturnRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: {
      totalReturns: number;
      pendingReturns: number;
      completedReturns: number;
      totalReturnValue: number;
    };
  }> {
    try {
      // Add customer filter to query
      const customerQuery = { ...query, customerId };

      const result = await this.returnRequestRepository.findMany(customerQuery, {
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder
      });

      // Calculate summary statistics
      const allCustomerReturnsResult = await this.returnRequestRepository.findMany(
        { customerId }, 
        { page: 1, limit: 1000 } // Get all for summary
      );
      const allCustomerReturns = allCustomerReturnsResult.data;
      const summary = {
        totalReturns: allCustomerReturns.length,
        pendingReturns: allCustomerReturns.filter(r => 
          ['PENDING', 'APPROVED', 'IN_TRANSIT'].includes(r.status as string)
        ).length,
        completedReturns: allCustomerReturns.filter(r => r.status === 'COMPLETED').length,
        totalReturnValue: allCustomerReturns.reduce((sum, r) => sum + r.totalAmount, 0)
      };

      return {
        returns: result.data,
        pagination: result.pagination,
        summary
      };

    } catch (error) {
      logger.error('Error retrieving customer returns', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId,
        query
      });
      throw error;
    }
  }

  /**
   * Get return details by ID (customer access only)
   */
  async getReturnDetails(returnId: string, customerId: string): Promise<ReturnRequest | null> {
    try {
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return null;
      }

      return returnRequest;

    } catch (error) {
      logger.error('Error retrieving return details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Cancel return request (customer)
   */
  async cancelReturnRequest(
    returnId: string,
    customerId: string,
    reason?: string
  ): Promise<{ success: boolean; message?: string; returnRequest?: ReturnRequest }> {
    try {
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return { success: false, message: 'Return request not found or access denied' };
      }

      if (returnRequest.status !== 'PENDING') {
        return { 
          success: false, 
          message: 'Only pending return requests can be cancelled' 
        };
      }

      // Update status to cancelled
      const updatedReturn = await this.returnRequestRepository.updateStatus(returnId, 'CANCELLED' as any, {
        adminNotes: reason ? `Customer cancellation reason: ${reason}` : 'Cancelled by customer'
      });

      // Create timeline event
      await this.createTimelineEvent(returnId, {
        type: 'return_cancelled',
        title: 'Return Request Cancelled',
        description: reason ? `Customer cancelled: ${reason}` : 'Return request cancelled by customer',
        data: { cancelledBy: 'customer', reason },
        isVisible: true
      });

      return { success: true, returnRequest: updatedReturn };

    } catch (error) {
      logger.error('Error cancelling return request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Upload return photos
   */
  async uploadReturnPhotos(
    returnId: string,
    customerId: string,
    files: Express.Multer.File[],
    description?: string
  ): Promise<{ success: boolean; message?: string; returnRequest?: ReturnRequest; uploadedPhotos?: string[] }> {
    try {
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return { success: false, message: 'Return request not found or access denied' };
      }

      if (!['PENDING', 'APPROVED'].includes(returnRequest.status as string)) {
        return { 
          success: false, 
          message: 'Photos can only be uploaded for pending or approved returns' 
        };
      }

      // Upload files to storage
      const uploadedPhotos: string[] = [];
      for (const file of files) {
        const photoUrl = await this.fileStorageService.uploadFile(file, `returns/${returnId}`);
        uploadedPhotos.push(photoUrl);
      }

      // Update return request with photo URLs
      const existingPhotos = returnRequest.inspectionPhotos || [];
      const updatedReturn = await this.returnRequestRepository.updateStatus(returnId, returnRequest.status, {
        // Add photos to admin notes since there's no direct photo field update method
        adminNotes: `${returnRequest.adminNotes || ''}\nPhotos uploaded: ${uploadedPhotos.join(', ')}`
      });

      // Create timeline event
      await this.createTimelineEvent(returnId, {
        type: 'photos_uploaded',
        title: 'Return Photos Uploaded',
        description: `Customer uploaded ${uploadedPhotos.length} photo(s)${description ? `: ${description}` : ''}`,
        data: { photoCount: uploadedPhotos.length, description },
        isVisible: true
      });

      return { success: true, returnRequest: updatedReturn, uploadedPhotos };

    } catch (error) {
      logger.error('Error uploading return photos', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  // ==================== DASHBOARD & ANALYTICS ====================

  /**
   * Get customer return dashboard
   */
  async getCustomerReturnDashboard(
    customerId: string,
    periodDays: number = 90
  ): Promise<CustomerReturnDashboard> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      const allReturnsResult = await this.returnRequestRepository.findMany(
        { customerId }, 
        { page: 1, limit: 1000 }
      );
      const allReturns = allReturnsResult.data;
      const periodReturns = allReturns.filter(r => r.createdAt >= cutoffDate);

      // Calculate summary
      const summary = {
        totalReturns: allReturns.length,
        pendingReturns: allReturns.filter(r => 
          ['PENDING', 'APPROVED', 'IN_TRANSIT'].includes(r.status as string)
        ).length,
        completedReturns: allReturns.filter(r => r.status === 'COMPLETED').length,
        totalRefundAmount: allReturns.filter(r => r.status === 'COMPLETED')
          .reduce((sum, r) => sum + r.totalAmount, 0),
        averageProcessingTime: this.calculateAverageProcessingTime(
          allReturns.filter(r => r.status === 'COMPLETED')
        )
      };

      // Get recent returns
      const recentReturns = allReturns
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      // Calculate quick actions
      const quickActions = {
        eligibleOrdersCount: await this.getEligibleOrdersCount(customerId),
        pendingRefundsCount: allReturns.filter(r => 
          r.status === 'COMPLETED' && !r.refunds?.some(rf => rf.status === 'COMPLETED')
        ).length,
        awaitingPickupCount: allReturns.filter(r => 
          r.status === 'APPROVED' && !r.actualPickupDate
        ).length
      };

      // Returns by status
      const statusCounts = this.groupByStatus(allReturns);
      const returnsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status: status as ReturnStatus,
        count,
        percentage: (count / allReturns.length) * 100
      }));

      // Returns by reason
      const reasonCounts = this.groupByReason(allReturns);
      const returnsByReason = Object.entries(reasonCounts).map(([reason, count]) => ({
        reason: reason as ReturnReason,
        count,
        percentage: (count / allReturns.length) * 100
      }));

      return {
        summary,
        recentReturns,
        quickActions,
        returnsByStatus,
        returnsByReason
      };

    } catch (error) {
      logger.error('Error retrieving customer return dashboard', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId
      });
      throw error;
    }
  }

  /**
   * Get return timeline
   */
  async getReturnTimeline(returnId: string, customerId: string): Promise<ReturnTimelineEvent[] | null> {
    try {
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return null;
      }

      // Get return request with timeline
      const returnWithTimeline = await this.returnRequestRepository.findById(returnId);
      return returnWithTimeline?.timeline?.filter(event => event.isVisible) || [];

    } catch (error) {
      logger.error('Error retrieving return timeline', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Get refund estimate
   */
  async getRefundEstimate(returnId: string, customerId: string): Promise<any | null> {
    try {
      const returnRequest = await this.returnRequestRepository.findById(returnId);
      
      if (!returnRequest || returnRequest.customerId !== customerId) {
        return null;
      }

      const refundAmount = returnRequest.totalAmount;
      const processingFee = 0; // No processing fee for Nigerian market
      const estimatedRefund = refundAmount - processingFee;

      const estimate = {
        returnId: returnRequest.id,
        originalAmount: refundAmount,
        processingFee,
        estimatedRefund,
        currency: 'NGN',
        refundMethods: [
          {
            method: 'ORIGINAL_PAYMENT',
            available: true,
            estimatedTime: '5-7 business days',
            description: 'Refund to original payment method'
          },
          {
            method: 'BANK_TRANSFER',
            available: true,
            estimatedTime: '1-3 business days',
            description: 'Direct bank transfer to Nigerian account'
          },
          {
            method: 'WALLET_CREDIT',
            available: true,
            estimatedTime: 'Instant',
            description: 'Add to your Bareloft wallet'
          },
          {
            method: 'STORE_CREDIT',
            available: true,
            estimatedTime: 'Instant',
            description: 'Store credit for future purchases',
            bonus: refundAmount * 0.05 // 5% bonus for store credit
          }
        ],
        estimatedCompletionDate: this.calculateEstimatedCompletionDate(returnRequest.status),
        notes: [
          'Refund amount may vary based on item condition after inspection',
          'Original shipping charges are non-refundable',
          'Return shipping costs may be deducted if applicable'
        ]
      };

      return estimate;

    } catch (error) {
      logger.error('Error retrieving refund estimate', {
        error: error instanceof Error ? error.message : 'Unknown error',
        returnId,
        customerId
      });
      throw error;
    }
  }

  /**
   * Get customer return analytics
   */
  async getCustomerReturnAnalytics(
    customerId: string,
    periodDays: number = 365
  ): Promise<CustomerReturnAnalytics> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodDays);

      const returnsResult = await this.returnRequestRepository.findMany(
        { customerId }, 
        { page: 1, limit: 1000 }
      );
      const returns = returnsResult.data;
      
      // For now, we'll use a simplified approach for orders
      const orders: any[] = []; // This would need to be implemented in OrderRepository
      
      const periodReturns = returns.filter(r => r.createdAt >= cutoffDate);
      const periodOrders = orders.filter(o => o.createdAt >= cutoffDate);

      const analytics: CustomerReturnAnalytics = {
        returnRate: periodOrders.length > 0 ? (periodReturns.length / periodOrders.length) * 100 : 0,
        totalReturnValue: periodReturns.reduce((sum, r) => sum + r.totalAmount, 0),
        averageReturnValue: periodReturns.length > 0 ? 
          periodReturns.reduce((sum, r) => sum + r.totalAmount, 0) / periodReturns.length : 0,
        returnsByMonth: this.calculateReturnsByMonth(periodReturns),
        topReturnReasons: this.calculateTopReturnReasons(periodReturns),
        returnSuccessRate: this.calculateReturnSuccessRate(returns),
        averageProcessingTime: this.calculateAverageProcessingTime(
          returns.filter(r => r.status === 'COMPLETED')
        ),
        recommendations: this.generateReturnRecommendations(returns, orders)
      };

      return analytics;

    } catch (error) {
      logger.error('Error retrieving customer return analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        customerId
      });
      throw error;
    }
  }

  /**
   * Get processing time estimates
   */
  async getProcessingEstimates(filters: {
    state?: string;
    returnMethod?: string;
  }): Promise<ProcessingEstimates> {
    try {
      // In a real implementation, this would calculate based on historical data
      // For now, returning Nigerian market-optimized estimates
      
      const isLagosOrAbuja = filters.state === 'Lagos' || filters.state === 'FCT';
      const isPickupService = filters.returnMethod === 'PICKUP_SERVICE';

      return {
        standard: {
          pickupTime: isPickupService ? (isLagosOrAbuja ? '1-2 business days' : '2-3 business days') : 'N/A',
          processingTime: '3-5 business days',
          refundTime: '5-7 business days'
        },
        express: {
          available: isLagosOrAbuja,
          pickupTime: isLagosOrAbuja ? 'Same day' : undefined,
          processingTime: isLagosOrAbuja ? '1-2 business days' : undefined,
          refundTime: isLagosOrAbuja ? '2-3 business days' : undefined,
          additionalCost: isLagosOrAbuja ? 2000 : undefined // ₦2,000 express fee
        },
        currentVolume: 'medium', // This would be calculated based on current pending returns
        estimatedDelays: []
      };

    } catch (error) {
      logger.error('Error retrieving processing estimates', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filters
      });
      throw error;
    }
  }

  /**
   * Get seasonal return information
   */
  async getSeasonalReturnInfo(): Promise<SeasonalReturnInfo> {
    try {
      const now = new Date();
      const month = now.getMonth();
      
      // Determine season based on Nigerian shopping patterns
      let currentSeason: 'regular' | 'holiday' | 'peak_sale';
      let expectedProcessingTime: string;
      let volumeImpact: string;
      let specialNotices: string[];

      if (month === 11 || month === 0) { // December or January
        currentSeason = 'holiday';
        expectedProcessingTime = '5-7 business days (holiday season)';
        volumeImpact = 'High volume expected due to holiday returns';
        specialNotices = [
          'Extended return window for holiday purchases',
          'Pickup services may be limited during public holidays',
          'Bank transfers may take longer during holiday periods'
        ];
      } else if (month >= 5 && month <= 7) { // June-August (back to school season)
        currentSeason = 'peak_sale';
        expectedProcessingTime = '4-6 business days';
        volumeImpact = 'Increased volume during back-to-school season';
        specialNotices = [
          'Higher return volume expected for school items',
          'Consider store credit for faster refunds'
        ];
      } else {
        currentSeason = 'regular';
        expectedProcessingTime = '3-5 business days';
        volumeImpact = 'Normal processing times expected';
        specialNotices = [];
      }

      return {
        currentSeason,
        expectedProcessingTime,
        volumeImpact,
        specialNotices,
        festivalSchedule: this.getNigerianFestivalSchedule(now.getFullYear())
      };

    } catch (error) {
      logger.error('Error retrieving seasonal return info', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private async createTimelineEvent(
    returnRequestId: string,
    eventData: Omit<ReturnTimelineEvent, 'id' | 'returnRequestId' | 'createdAt'>
  ): Promise<void> {
    await this.returnRequestRepository.addTimelineEvent(returnRequestId, {
      ...eventData
    });
  }

  private async getEligibleOrdersCount(customerId: string): Promise<number> {
    // This would check for orders that are eligible for returns
    // For now, returning a placeholder
    return 0;
  }

  private groupByStatus(returns: ReturnRequest[]): Record<string, number> {
    return returns.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByReason(returns: ReturnRequest[]): Record<string, number> {
    return returns.reduce((acc, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageProcessingTime(completedReturns: ReturnRequest[]): number {
    if (completedReturns.length === 0) return 0;

    const totalDays = completedReturns.reduce((sum, r) => {
      const daysDiff = Math.ceil(
        (r.updatedAt.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return sum + daysDiff;
    }, 0);

    return Math.round(totalDays / completedReturns.length);
  }

  private calculateReturnsByMonth(returns: ReturnRequest[]): {
    month: string;
    count: number;
    value: number;
  }[] {
    const monthlyData: Record<string, { count: number; value: number }> = {};

    returns.forEach(r => {
      const monthKey = r.createdAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, value: 0 };
      }
      monthlyData[monthKey].count++;
      monthlyData[monthKey].value += r.totalAmount;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateTopReturnReasons(returns: ReturnRequest[]): {
    reason: ReturnReason;
    count: number;
    percentage: number;
  }[] {
    const reasonCounts = this.groupByReason(returns);
    const total = returns.length;

    return Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason: reason as ReturnReason,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateReturnSuccessRate(returns: ReturnRequest[]): number {
    if (returns.length === 0) return 0;
    const completedReturns = returns.filter(r => r.status === 'COMPLETED').length;
    return (completedReturns / returns.length) * 100;
  }

  private generateReturnRecommendations(
    returns: ReturnRequest[],
    orders: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze patterns and provide recommendations
    const returnRate = orders.length > 0 ? (returns.length / orders.length) * 100 : 0;

    if (returnRate > 20) {
      recommendations.push('Consider reading product descriptions more carefully before purchasing');
    }

    if (returnRate > 30) {
      recommendations.push('Try using size guides and customer reviews to make better choices');
    }

    const sizeReturns = returns.filter(r => r.reason === 'SIZE_ISSUE');
    if (sizeReturns.length > returns.length * 0.4) {
      recommendations.push('Consider using our size guide or contacting customer service for sizing help');
    }

    if (recommendations.length === 0) {
      recommendations.push('You have a good return pattern. Keep up the thoughtful purchasing!');
    }

    return recommendations;
  }

  private calculateEstimatedCompletionDate(status: ReturnStatus): Date {
    const now = new Date();
    const daysToAdd = this.getEstimatedDaysForStatus(status);
    const completionDate = new Date(now);
    completionDate.setDate(completionDate.getDate() + daysToAdd);
    return completionDate;
  }

  private getEstimatedDaysForStatus(status: ReturnStatus): number {
    switch (status) {
      case 'PENDING':
        return 7;
      case 'APPROVED':
        return 5;
      case 'IN_TRANSIT':
        return 3;
      case 'RECEIVED':
        return 2;
      case 'INSPECTED':
        return 1;
      default:
        return 0;
    }
  }

  private getNigerianFestivalSchedule(year: number): {
    name: string;
    dates: string;
    impact: string;
  }[] {
    return [
      {
        name: 'Eid al-Fitr',
        dates: 'May (dates vary)',
        impact: 'Pickup services suspended for 2 days'
      },
      {
        name: 'Independence Day',
        dates: 'October 1',
        impact: 'No pickup services on public holiday'
      },
      {
        name: 'Christmas',
        dates: 'December 25',
        impact: 'Extended processing times'
      },
      {
        name: 'New Year',
        dates: 'January 1',
        impact: 'Limited services for first week'
      }
    ];
  }
}