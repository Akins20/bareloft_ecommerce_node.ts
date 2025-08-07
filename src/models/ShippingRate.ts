// src/models/ShippingRate.ts
import { PrismaClient } from '@prisma/client';
import { db } from '../database/connection';

const prisma = db as PrismaClient;

/**
 * ShippingRate Model - Handles shipping rate calculations
 * Optimized for Nigerian zones and carriers including Jumia Logistics
 */
export class ShippingRateModel {
  static async create(data: any) {
    return await prisma.shippingRate.create({
      data,
    });
  }

  static async findUnique(params: any) {
    return await prisma.shippingRate.findUnique(params);
  }

  static async findFirst(params: any) {
    return await prisma.shippingRate.findFirst(params);
  }

  static async findMany(params?: any) {
    return await prisma.shippingRate.findMany(params || {});
  }

  static async update(params: any) {
    return await prisma.shippingRate.update(params);
  }

  static async delete(params: any) {
    return await prisma.shippingRate.delete(params);
  }

  static async count(params?: any) {
    return await prisma.shippingRate.count(params || {});
  }

  // Find rates for specific carrier and zone
  static async findRatesForCarrierAndZone(carrierId: string, zoneId: string) {
    return await prisma.shippingRate.findMany({
      where: {
        carrierId,
        zoneId,
        isActive: true,
        AND: [
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gt: new Date() } }
            ]
          },
          {
            effectiveFrom: { lte: new Date() }
          }
        ]
      },
      include: {
        carrier: true,
        zone: true,
      },
      orderBy: [
        { serviceType: 'asc' },
        { minWeight: 'asc' }
      ]
    });
  }

  // Find best rate for package specifications
  static async findBestRate(
    state: string,
    weight: number,
    serviceType?: string,
    carrierId?: string
  ) {
    const whereClause: any = {
      isActive: true,
      minWeight: { lte: weight },
      maxWeight: { gte: weight },
      zone: {
        isActive: true,
        states: {
          has: state
        }
      },
      AND: [
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gt: new Date() } }
          ]
        },
        {
          effectiveFrom: { lte: new Date() }
        }
      ]
    };

    if (serviceType) {
      whereClause.serviceType = serviceType;
    }

    if (carrierId) {
      whereClause.carrierId = carrierId;
    }

    return await prisma.shippingRate.findMany({
      where: whereClause,
      include: {
        carrier: true,
        zone: true,
      },
      orderBy: [
        { baseRate: 'asc' },
        { carrier: { isDefault: 'desc' } }
      ]
    });
  }
}

export { ShippingRateModel as ShippingRate };