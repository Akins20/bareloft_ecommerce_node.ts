// src/models/TrackingEvent.ts
import { PrismaClient } from '@prisma/client';
import db from '../database/connection';

const prisma = db as PrismaClient;

/**
 * TrackingEvent Model - Handles shipment tracking events
 * Optimized for Nigerian shipping and real-time tracking updates
 */
export class TrackingEventModel {
  static async create(data: any) {
    return await prisma.trackingEvent.create({
      data,
    });
  }

  static async findUnique(params: any) {
    return await prisma.trackingEvent.findUnique(params);
  }

  static async findFirst(params: any) {
    return await prisma.trackingEvent.findFirst(params);
  }

  static async findMany(params?: any) {
    return await prisma.trackingEvent.findMany(params || {});
  }

  static async update(params: any) {
    return await prisma.trackingEvent.update(params);
  }

  static async delete(params: any) {
    return await prisma.trackingEvent.delete(params);
  }

  static async count(params?: any) {
    return await prisma.trackingEvent.count(params || {});
  }

  // Custom method for creating tracking event with shipment update
  static async createWithShipmentUpdate(shipmentId: string, eventData: any) {
    return await prisma.$transaction(async (tx) => {
      // Create tracking event
      const trackingEvent = await tx.trackingEvent.create({
        data: {
          shipmentId,
          ...eventData,
        },
      });

      // Update shipment status and location
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: eventData.status,
          lastLocationUpdate: {
            location: eventData.location || '',
            timestamp: new Date(),
            latitude: eventData.latitude,
            longitude: eventData.longitude,
          },
          ...(eventData.estimatedDelivery && {
            estimatedDelivery: eventData.estimatedDelivery
          })
        },
      });

      return trackingEvent;
    });
  }

  // Get tracking timeline for a shipment
  static async getShipmentTimeline(shipmentId: string, includePrivate = false) {
    return await prisma.trackingEvent.findMany({
      where: {
        shipmentId,
        ...(includePrivate ? {} : { isPublic: true })
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export { TrackingEventModel as TrackingEvent };