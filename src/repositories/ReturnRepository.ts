import { BaseRepository } from './BaseRepository';
import { PrismaClient } from '@prisma/client';
import { AppError, HTTP_STATUS, ERROR_CODES, PaginationMeta } from '../types';

// Return-related type definitions
type ReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'INSPECTED' | 'PROCESSED' | 'COMPLETED' | 'CANCELLED';
type ReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'DAMAGED' | 'SIZE_ISSUE' | 'QUALITY_ISSUE' | 'CHANGE_OF_MIND' | 'OTHER';
type ReturnCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'UNUSABLE';

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
  items?: ReturnItem[];
  refunds?: any[];
  timeline?: ReturnTimelineEvent[];
}

interface ReturnItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string;
  quantityReturned: number;
  unitPrice: number;
  totalPrice: number;
  condition?: ReturnCondition;
  conditionNotes?: string;
  inspectionPhotos?: string[];
  restockable: boolean;
  restockLocation?: string;
  createdAt: Date;
  updatedAt: Date;
  returnRequest?: ReturnRequest;
  orderItem?: any;
  product?: any;
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

interface ReturnListQuery {
  status?: ReturnStatus[];
  reason?: ReturnReason[];
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  state?: string;
}

export class ReturnRepository extends BaseRepository<ReturnRequest, any, any> {
  protected db: PrismaClient;

  constructor(prisma?: PrismaClient) {
    super(prisma);
    this.db = this.prisma;
  }

  // Handle errors with proper logging
  protected handleError(message: string, error: any): void {
    console.error(`${message}:`, error);
  }

  // Create pagination helper
  protected createPagination(page: number, limit: number, total: number): PaginationMeta {
    return {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1
    };
  }

  /**
   * Create a new return request
   */
  async createReturnRequest(data: {
    returnNumber: string;
    orderId: string;
    customerId: string;
    reason: ReturnReason;
    description?: string;
    totalAmount: number;
    isEligible: boolean;
    eligibilityReason?: string;
    returnShippingMethod?: string;
    customerNotes?: string;
  }): Promise<ReturnRequest> {
    try {
      const returnRequest = await this.db.returnRequest.create({
        data: {
          returnNumber: data.returnNumber,
          orderId: data.orderId,
          customerId: data.customerId,
          reason: data.reason as any,
          description: data.description,
          totalAmount: data.totalAmount,
          currency: 'NGN',
          isEligible: data.isEligible,
          eligibilityReason: data.eligibilityReason,
          returnShippingMethod: data.returnShippingMethod as any,
          customerNotes: data.customerNotes,
          status: 'PENDING' as any,
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: true,
        },
      });

      return this.transformReturnRequest(returnRequest);
    } catch (error) {
      this.handleError('Error creating return request', error);
      throw error;
    }
  }

  /**
   * Add items to a return request
   */
  async addReturnItems(returnRequestId: string, items: {
    orderItemId: string;
    productId: string;
    productName: string;
    productSku?: string;
    productImage?: string;
    quantityReturned: number;
    unitPrice: number;
    totalPrice: number;
  }[]): Promise<ReturnItem[]> {
    try {
      const returnItems = await Promise.all(
        items.map(async (item) => {
          return await this.db.returnItem.create({
            data: {
              returnRequestId,
              orderItemId: item.orderItemId,
              productId: item.productId,
              productName: item.productName,
              productSku: item.productSku,
              productImage: item.productImage,
              quantityReturned: item.quantityReturned,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              restockable: false, // Will be updated during inspection
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  images: {
                    select: { url: true },
                    take: 1,
                  },
                },
              },
              orderItem: {
                select: {
                  id: true,
                  quantity: true,
                  price: true,
                  total: true,
                },
              },
            },
          });
        })
      );

      return returnItems.map((item) => this.transformReturnItem(item));
    } catch (error) {
      this.handleError('Error adding return items', error);
      throw error;
    }
  }

  /**
   * Find return request by ID
   */
  async findById(id: string): Promise<ReturnRequest | null> {
    try {
      const returnRequest = await this.db.returnRequest.findUnique({
        where: { id },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  images: {
                    select: { url: true },
                    take: 1,
                  },
                },
              },
              orderItem: {
                select: {
                  id: true,
                  quantity: true,
                  price: true,
                  total: true,
                },
              },
            },
          },
          refunds: true,
          timeline: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return returnRequest ? this.transformReturnRequest(returnRequest) : null;
    } catch (error) {
      this.handleError('Error finding return request', error);
      throw error;
    }
  }

  /**
   * Find return request by return number
   */
  async findByReturnNumber(returnNumber: string): Promise<ReturnRequest | null> {
    try {
      const returnRequest = await this.db.returnRequest.findUnique({
        where: { returnNumber },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  images: {
                    select: { url: true },
                    take: 1,
                  },
                },
              },
            },
          },
          refunds: true,
          timeline: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return returnRequest ? this.transformReturnRequest(returnRequest) : null;
    } catch (error) {
      this.handleError('Error finding return request by number', error);
      throw error;
    }
  }

  /**
   * Update return request status
   */
  async updateStatus(
    id: string,
    status: ReturnStatus,
    updates?: {
      processedBy?: string;
      approvedBy?: string;
      rejectedBy?: string;
      rejectionReason?: string;
      adminNotes?: string;
      estimatedPickupDate?: Date;
      actualPickupDate?: Date;
      returnTrackingNumber?: string;
    }
  ): Promise<ReturnRequest> {
    try {
      const returnRequest = await this.db.returnRequest.update({
        where: { id },
        data: {
          status: status as any,
          processedBy: updates?.processedBy,
          approvedBy: updates?.approvedBy,
          rejectedBy: updates?.rejectedBy,
          rejectionReason: updates?.rejectionReason,
          adminNotes: updates?.adminNotes,
          estimatedPickupDate: updates?.estimatedPickupDate,
          actualPickupDate: updates?.actualPickupDate,
          returnTrackingNumber: updates?.returnTrackingNumber,
          updatedAt: new Date(),
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: true,
        },
      });

      return this.transformReturnRequest(returnRequest);
    } catch (error) {
      this.handleError('Error updating return status', error);
      throw error;
    }
  }

  /**
   * Update return item inspection details
   */
  async updateItemInspection(
    returnItemId: string,
    inspection: {
      condition: ReturnCondition;
      conditionNotes?: string;
      inspectionPhotos?: string[];
      restockable: boolean;
      restockLocation?: string;
    }
  ): Promise<ReturnItem> {
    try {
      const returnItem = await this.db.returnItem.update({
        where: { id: returnItemId },
        data: {
          condition: inspection.condition as any,
          conditionNotes: inspection.conditionNotes,
          inspectionPhotos: inspection.inspectionPhotos,
          restockable: inspection.restockable,
          restockLocation: inspection.restockLocation,
          updatedAt: new Date(),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
            },
          },
          orderItem: {
            select: {
              id: true,
              quantity: true,
              price: true,
              total: true,
            },
          },
        },
      });

      return this.transformReturnItem(returnItem);
    } catch (error) {
      this.handleError('Error updating return item inspection', error);
      throw error;
    }
  }

  /**
   * Get return requests with filtering and pagination
   */
  async findMany(
    filters: {
      status?: ReturnStatus[];
      reason?: ReturnReason[];
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      state?: string;
    },
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    data: ReturnRequest[];
    pagination: PaginationMeta;
  }> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = options;
      const offset = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (filters.status && filters.status.length > 0) {
        where.status = { in: filters.status };
      }

      if (filters.reason && filters.reason.length > 0) {
        where.reason = { in: filters.reason };
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      if (filters.search) {
        where.OR = [
          { returnNumber: { contains: filters.search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: filters.search, mode: 'insensitive' } } },
          { customer: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          }},
        ];
      }

      if (filters.state) {
        where.customer = {
          ...where.customer,
          addresses: {
            some: {
              state: { equals: filters.state, mode: 'insensitive' },
              isDefault: true,
            },
          },
        };
      }

      // Count total records
      const total = await this.db.returnRequest.count({ where });

      // Get paginated results
      const returnRequests = await this.db.returnRequest.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              total: true,
              createdAt: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            select: {
              id: true,
              productName: true,
              quantityReturned: true,
              totalPrice: true,
            },
          },
          _count: {
            select: {
              items: true,
              refunds: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      });

      const pagination = this.createPagination(page, limit, total);

      return {
        data: returnRequests.map((request) => this.transformReturnRequest(request)),
        pagination,
      };
    } catch (error) {
      this.handleError('Error finding return requests', error);
      throw error;
    }
  }

  /**
   * Get return analytics
   */
  async getReturnAnalytics(
    filters: {
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
      state?: string;
    }
  ): Promise<{
    totalReturns: number;
    totalReturnValue: number;
    returnsByStatus: Array<{ status: string; count: number; percentage: number }>;
    returnsByReason: Array<{ reason: string; count: number; totalValue: number }>;
    averageProcessingTime: number;
    restockableRate: number;
  }> {
    try {
      const where: any = {};

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.state) {
        where.customer = {
          addresses: {
            some: {
              state: { equals: filters.state, mode: 'insensitive' },
              isDefault: true,
            },
          },
        };
      }

      // Get all return requests
      const returnRequests = await this.db.returnRequest.findMany({
        where,
        include: {
          items: true,
        },
      });

      const totalReturns = returnRequests.length;
      const totalReturnValue = returnRequests.reduce(
        (sum, request) => sum + Number(request.totalAmount),
        0
      );

      // Returns by status
      const statusCounts = returnRequests.reduce((acc, request) => {
        acc[request.status] = (acc[request.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const returnsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count: count as number,
        percentage: totalReturns > 0 ? ((count as number) / totalReturns) * 100 : 0,
      }));

      // Returns by reason
      const reasonCounts = returnRequests.reduce((acc, request) => {
        if (!acc[request.reason]) {
          acc[request.reason] = { count: 0, totalValue: 0 };
        }
        acc[request.reason].count += 1;
        acc[request.reason].totalValue += Number(request.totalAmount);
        return acc;
      }, {} as Record<string, { count: number; totalValue: number }>);

      const returnsByReason = Object.entries(reasonCounts).map(([reason, data]) => ({
        reason,
        count: data.count,
        totalValue: data.totalValue,
      }));

      // Calculate average processing time (for completed returns)
      const completedReturns = returnRequests.filter(
        (r) => r.status === 'COMPLETED' && r.actualReturnDate
      );
      const averageProcessingTime = completedReturns.length > 0
        ? completedReturns.reduce((sum, request) => {
            const processingTime = request.actualReturnDate
              ? (new Date(request.actualReturnDate).getTime() - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              : 0;
            return sum + processingTime;
          }, 0) / completedReturns.length
        : 0;

      // Calculate restockable rate
      const allItems = returnRequests.flatMap((r) => r.items);
      const restockableItems = allItems.filter((item) => item.restockable);
      const restockableRate = allItems.length > 0 ? (restockableItems.length / allItems.length) * 100 : 0;

      return {
        totalReturns,
        totalReturnValue: totalReturnValue / 100, // Convert from kobo to naira
        returnsByStatus,
        returnsByReason: returnsByReason.map((r) => ({
          ...r,
          totalValue: r.totalValue / 100, // Convert from kobo to naira
        })),
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        restockableRate: Math.round(restockableRate * 100) / 100,
      };
    } catch (error) {
      this.handleError('Error getting return analytics', error);
      throw error;
    }
  }

  /**
   * Add timeline event to return request
   */
  async addTimelineEvent(
    returnRequestId: string,
    event: {
      type: string;
      title: string;
      description: string;
      data?: any;
      createdBy?: string;
      createdByName?: string;
      isVisible?: boolean;
    }
  ): Promise<ReturnTimelineEvent> {
    try {
      const timelineEvent = await this.db.returnTimelineEvent.create({
        data: {
          returnRequestId,
          type: event.type,
          title: event.title,
          description: event.description,
          data: event.data,
          createdBy: event.createdBy,
          createdByName: event.createdByName,
          isVisible: event.isVisible ?? true,
        },
      });

      return this.transformTimelineEvent(timelineEvent);
    } catch (error) {
      this.handleError('Error adding timeline event', error);
      throw error;
    }
  }

  // Private transformation methods

  private transformReturnRequest(data: any): ReturnRequest {
    return {
      id: data.id,
      returnNumber: data.returnNumber,
      orderId: data.orderId,
      customerId: data.customerId,
      status: data.status,
      reason: data.reason,
      description: data.description,
      totalAmount: Number(data.totalAmount),
      currency: data.currency,
      isEligible: data.isEligible,
      eligibilityReason: data.eligibilityReason,
      returnShippingMethod: data.returnShippingMethod,
      returnTrackingNumber: data.returnTrackingNumber,
      estimatedPickupDate: data.estimatedPickupDate,
      actualPickupDate: data.actualPickupDate,
      estimatedReturnDate: data.estimatedReturnDate,
      actualReturnDate: data.actualReturnDate,
      qualityCheckNotes: data.qualityCheckNotes,
      inspectionPhotos: data.inspectionPhotos,
      adminNotes: data.adminNotes,
      customerNotes: data.customerNotes,
      processedBy: data.processedBy,
      approvedBy: data.approvedBy,
      rejectedBy: data.rejectedBy,
      rejectionReason: data.rejectionReason,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      order: data.order,
      customer: data.customer,
      items: data.items?.map((item: any) => this.transformReturnItem(item)),
      refunds: data.refunds,
      timeline: data.timeline?.map((event: any) => this.transformTimelineEvent(event)),
    } as ReturnRequest;
  }

  private transformReturnItem(data: any): ReturnItem {
    return {
      id: data.id,
      returnRequestId: data.returnRequestId,
      orderItemId: data.orderItemId,
      productId: data.productId,
      productName: data.productName,
      productSku: data.productSku,
      productImage: data.productImage,
      quantityReturned: data.quantityReturned,
      unitPrice: Number(data.unitPrice),
      totalPrice: Number(data.totalPrice),
      condition: data.condition,
      conditionNotes: data.conditionNotes,
      inspectionPhotos: data.inspectionPhotos,
      restockable: data.restockable,
      restockLocation: data.restockLocation,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      returnRequest: data.returnRequest,
      orderItem: data.orderItem,
      product: data.product,
    } as ReturnItem;
  }

  private transformTimelineEvent(data: any): ReturnTimelineEvent {
    return {
      id: data.id,
      returnRequestId: data.returnRequestId,
      type: data.type,
      title: data.title,
      description: data.description,
      data: data.data,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      isVisible: data.isVisible,
      createdAt: data.createdAt,
    } as ReturnTimelineEvent;
  }
}