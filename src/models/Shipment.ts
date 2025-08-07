// src/models/Shipment.ts
import { PrismaClient } from '@prisma/client';
import { db } from '../database/connection';

const prisma = db as PrismaClient;

/**
 * Shipment Model - Handles shipment operations and tracking
 * Optimized for Nigerian shipping and delivery tracking
 */
export class ShipmentModel {
  static async create(data: any) {
    return await prisma.shipment.create({
      data,
    });
  }

  static async findUnique(params: any) {
    return await prisma.shipment.findUnique(params);
  }

  static async findFirst(params: any) {
    return await prisma.shipment.findFirst(params);
  }

  static async findMany(params?: any) {
    return await prisma.shipment.findMany(params || {});
  }

  static async update(params: any) {
    return await prisma.shipment.update(params);
  }

  static async delete(params: any) {
    return await prisma.shipment.delete(params);
  }

  static async count(params?: any) {
    return await prisma.shipment.count(params || {});
  }

  // Custom method for finding shipments by tracking number
  static async findByTrackingNumber(trackingNumber: string, includeTracking = false) {
    return await prisma.shipment.findUnique({
      where: { trackingNumber },
      include: includeTracking ? {
        trackingEvents: {
          orderBy: { createdAt: 'desc' }
        },
        deliveryAttempts: {
          orderBy: { createdAt: 'desc' }
        },
        carrier: true,
        order: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              }
            },
            shippingAddress: true
          }
        }
      } : undefined
    });
  }

  // Custom method for finding pending shipments
  static async findPendingShipments() {
    return await prisma.shipment.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        carrier: true,
        order: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Custom method for finding delayed shipments
  static async findDelayedShipments(daysThreshold = 7) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return await prisma.shipment.findMany({
      where: {
        status: {
          in: ['PICKED_UP', 'IN_TRANSIT']
        },
        estimatedDelivery: {
          lt: new Date()
        },
        createdAt: {
          lt: thresholdDate
        }
      },
      include: {
        carrier: true,
        order: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              }
            }
          }
        }
      }
    });
  }
}

export { ShipmentModel as Shipment };