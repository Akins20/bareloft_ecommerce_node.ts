import { BaseRepository } from './BaseRepository';
import { PrismaClient } from '@prisma/client';
import { 
  Refund,
  RefundListQuery,
  RefundStatus,
  RefundMethod,
} from '../types/return.types';
import {
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
  PaginationMeta 
} from '../types';

interface CreateRefundData {
  refundNumber: string;
  returnRequestId?: string;
  orderId: string;
  transactionId?: string;
  customerId: string;
  refundMethod: RefundMethod;
  amount: number;
  reason: string;
  description?: string;
  bankAccountDetails?: any;
  processedBy?: string;
  adminNotes?: string;
  metadata?: Record<string, any>;
}

interface UpdateRefundData {
  status?: RefundStatus;
  providerRefundId?: string;
  providerReference?: string;
  processedAt?: Date;
  completedAt?: Date;
  failureReason?: string;
  adminNotes?: string;
  metadata?: Record<string, any>;
}

export class RefundRepository extends BaseRepository<Refund, CreateRefundData, UpdateRefundData> {
  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), 'refund');
  }

  /**
   * Create a new refund
   */
  async createRefund(data: {
    refundNumber: string;
    returnRequestId?: string;
    orderId: string;
    transactionId?: string;
    customerId: string;
    refundMethod: RefundMethod;
    amount: number;
    reason: string;
    description?: string;
    bankAccountDetails?: any;
    adminNotes?: string;
    customerNotes?: string;
    processedBy?: string;
    metadata?: any;
  }): Promise<Refund> {
    try {
      const refund = await this.prisma.refund.create({
        data: {
          refundNumber: data.refundNumber,
          returnRequestId: data.returnRequestId,
          orderId: data.orderId,
          transactionId: data.transactionId,
          customerId: data.customerId,
          status: 'PENDING' as any,
          refundMethod: data.refundMethod as any,
          amount: data.amount,
          currency: 'NGN',
          reason: data.reason,
          description: data.description,
          bankAccountDetails: data.bankAccountDetails,
          adminNotes: data.adminNotes,
          customerNotes: data.customerNotes,
          processedBy: data.processedBy,
          metadata: data.metadata,
        },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
      });

      return this.transformRefund(refund);
    } catch (error) {
      this.handleError('Error creating refund', error);
      throw error;
    }
  }

  /**
   * Find refund by ID
   */
  async findById(id: string): Promise<Refund | null> {
    try {
      const refund = await this.prisma.refund.findUnique({
        where: { id },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
      });

      return refund ? this.transformRefund(refund) : null;
    } catch (error) {
      this.handleError('Error finding refund', error);
      throw error;
    }
  }

  /**
   * Find refund by refund number
   */
  async findByRefundNumber(refundNumber: string): Promise<Refund | null> {
    try {
      const refund = await this.prisma.refund.findUnique({
        where: { refundNumber },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
      });

      return refund ? this.transformRefund(refund) : null;
    } catch (error) {
      this.handleError('Error finding refund by number', error);
      throw error;
    }
  }

  /**
   * Update refund status and processing details
   */
  async updateRefund(
    id: string,
    updates: {
      status?: RefundStatus;
      providerRefundId?: string;
      providerReference?: string;
      processedAt?: Date;
      completedAt?: Date;
      failureReason?: string;
      adminNotes?: string;
      approvedBy?: string;
    }
  ): Promise<Refund> {
    try {
      const refund = await this.prisma.refund.update({
        where: { id },
        data: {
          ...updates,
          status: updates.status as any,
          updatedAt: new Date(),
        },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
      });

      return this.transformRefund(refund);
    } catch (error) {
      this.handleError('Error updating refund', error);
      throw error;
    }
  }

  /**
   * Find refunds for a return request
   */
  async findByReturnRequestId(returnRequestId: string): Promise<Refund[]> {
    try {
      const refunds = await this.prisma.refund.findMany({
        where: { returnRequestId },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return refunds.map(this.transformRefund);
    } catch (error) {
      this.handleError('Error finding refunds by return request', error);
      throw error;
    }
  }

  /**
   * Find refunds for an order
   */
  async findByOrderId(orderId: string): Promise<Refund[]> {
    try {
      const refunds = await this.prisma.refund.findMany({
        where: { orderId },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return refunds.map(this.transformRefund);
    } catch (error) {
      this.handleError('Error finding refunds by order', error);
      throw error;
    }
  }

  /**
   * Get refunds with filtering and pagination
   */
  async findManyWithFilters(
    filters: {
      status?: RefundStatus[];
      refundMethod?: RefundMethod[];
      customerId?: string;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      minAmount?: number;
      maxAmount?: number;
    },
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{
    data: Refund[];
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

      if (filters.refundMethod && filters.refundMethod.length > 0) {
        where.refundMethod = { in: filters.refundMethod };
      }

      if (filters.customerId) {
        where.customerId = filters.customerId;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = filters.startDate;
        if (filters.endDate) where.createdAt.lte = filters.endDate;
      }

      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount * 100; // Convert to kobo
        if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount * 100; // Convert to kobo
      }

      if (filters.search) {
        where.OR = [
          { refundNumber: { contains: filters.search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: filters.search, mode: 'insensitive' } } },
          { returnRequest: { returnNumber: { contains: filters.search, mode: 'insensitive' } } },
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

      // Count total records
      const total = await this.prisma.refund.count({ where });

      // Get paginated results
      const refunds = await this.prisma.refund.findMany({
        where,
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);
      const pagination: PaginationMeta = {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      return {
        data: refunds.map(this.transformRefund),
        pagination,
      };
    } catch (error) {
      this.handleError('Error finding refunds', error);
      throw error;
    }
  }

  /**
   * Get refunds pending processing
   */
  async findPendingRefunds(limit?: number): Promise<Refund[]> {
    try {
      const refunds = await this.prisma.refund.findMany({
        where: {
          status: { in: ['PENDING', 'APPROVED'] },
        },
        include: {
          returnRequest: {
            select: {
              id: true,
              returnNumber: true,
              status: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
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
          transaction: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gateway: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      return refunds.map(this.transformRefund);
    } catch (error) {
      this.handleError('Error finding pending refunds', error);
      throw error;
    }
  }

  /**
   * Get refund analytics
   */
  async getRefundAnalytics(
    filters: {
      startDate?: Date;
      endDate?: Date;
      customerId?: string;
    }
  ): Promise<{
    totalRefunds: number;
    totalRefundAmount: number;
    refundsByStatus: Array<{ status: string; count: number; totalAmount: number }>;
    refundsByMethod: Array<{ method: string; count: number; totalAmount: number }>;
    averageRefundAmount: number;
    averageProcessingTime: number;
    successRate: number;
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

      // Get all refunds
      const refunds = await this.prisma.refund.findMany({ where });

      const totalRefunds = refunds.length;
      const totalRefundAmount = refunds.reduce(
        (sum, refund) => sum + Number(refund.amount),
        0
      );

      // Refunds by status
      const statusCounts = refunds.reduce((acc, refund) => {
        if (!acc[refund.status]) {
          acc[refund.status] = { count: 0, totalAmount: 0 };
        }
        acc[refund.status].count += 1;
        acc[refund.status].totalAmount += Number(refund.amount);
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>);

      const refundsByStatus = Object.entries(statusCounts).map(([status, data]) => ({
        status,
        count: data.count,
        totalAmount: data.totalAmount / 100, // Convert from kobo to naira
      }));

      // Refunds by method
      const methodCounts = refunds.reduce((acc, refund) => {
        if (!acc[refund.refundMethod]) {
          acc[refund.refundMethod] = { count: 0, totalAmount: 0 };
        }
        acc[refund.refundMethod].count += 1;
        acc[refund.refundMethod].totalAmount += Number(refund.amount);
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number }>);

      const refundsByMethod = Object.entries(methodCounts).map(([method, data]) => ({
        method,
        count: data.count,
        totalAmount: data.totalAmount / 100, // Convert from kobo to naira
      }));

      const averageRefundAmount = totalRefunds > 0 ? totalRefundAmount / totalRefunds / 100 : 0;

      // Calculate average processing time for completed refunds
      const completedRefunds = refunds.filter(
        (r) => r.status === 'COMPLETED' && r.processedAt && r.completedAt
      );
      const averageProcessingTime = completedRefunds.length > 0
        ? completedRefunds.reduce((sum, refund) => {
            const processingTime = refund.completedAt && refund.processedAt
              ? (new Date(refund.completedAt).getTime() - new Date(refund.processedAt).getTime()) / (1000 * 60 * 60 * 24)
              : 0;
            return sum + processingTime;
          }, 0) / completedRefunds.length
        : 0;

      // Success rate (completed / total)
      const successfulRefunds = refunds.filter((r) => r.status === 'COMPLETED').length;
      const successRate = totalRefunds > 0 ? (successfulRefunds / totalRefunds) * 100 : 0;

      return {
        totalRefunds,
        totalRefundAmount: totalRefundAmount / 100, // Convert from kobo to naira
        refundsByStatus,
        refundsByMethod,
        averageRefundAmount,
        averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
      };
    } catch (error) {
      this.handleError('Error getting refund analytics', error);
      throw error;
    }
  }

  /**
   * Get total refunded amount for an order
   */
  async getTotalRefundedForOrder(orderId: string): Promise<number> {
    try {
      const refunds = await this.prisma.refund.findMany({
        where: {
          orderId,
          status: 'COMPLETED',
        },
        select: {
          amount: true,
        },
      });

      return refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    } catch (error) {
      this.handleError('Error getting total refunded for order', error);
      throw error;
    }
  }

  // Private transformation method

  private transformRefund(data: any): Refund {
    return {
      id: data.id,
      refundNumber: data.refundNumber,
      returnRequestId: data.returnRequestId,
      orderId: data.orderId,
      transactionId: data.transactionId,
      customerId: data.customerId,
      status: data.status,
      refundMethod: data.refundMethod,
      amount: Number(data.amount),
      currency: data.currency,
      reason: data.reason,
      description: data.description,
      bankAccountDetails: data.bankAccountDetails,
      providerRefundId: data.providerRefundId,
      providerReference: data.providerReference,
      processedAt: data.processedAt,
      completedAt: data.completedAt,
      failureReason: data.failureReason,
      adminNotes: data.adminNotes,
      customerNotes: data.customerNotes,
      processedBy: data.processedBy,
      approvedBy: data.approvedBy,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      returnRequest: data.returnRequest,
      order: data.order,
      customer: data.customer,
      transaction: data.transaction,
    } as Refund;
  }
}