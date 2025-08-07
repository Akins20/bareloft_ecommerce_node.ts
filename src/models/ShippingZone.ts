// src/models/ShippingZone.ts
import { PrismaClient } from '@prisma/client';
import { db } from '../database/connection';

const prisma = db as PrismaClient;

/**
 * ShippingZone Model - Handles Nigerian shipping zones
 * Optimized for Nigerian states and delivery zones
 */
export class ShippingZoneModel {
  static async create(data: any) {
    return await prisma.shippingZone.create({
      data,
    });
  }

  static async findUnique(params: any) {
    return await prisma.shippingZone.findUnique(params);
  }

  static async findFirst(params: any) {
    return await prisma.shippingZone.findFirst(params);
  }

  static async findMany(params?: any) {
    return await prisma.shippingZone.findMany(params || {});
  }

  static async update(params: any) {
    return await prisma.shippingZone.update(params);
  }

  static async delete(params: any) {
    return await prisma.shippingZone.delete(params);
  }

  static async count(params?: any) {
    return await prisma.shippingZone.count(params || {});
  }

  // Find zone by Nigerian state
  static async findByState(state: string) {
    return await prisma.shippingZone.findFirst({
      where: {
        isActive: true,
        states: {
          has: state
        }
      },
      include: {
        shippingRates: {
          where: {
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
            carrier: true
          }
        }
      }
    });
  }

  // Find zones covering specific states
  static async findZonesForStates(states: string[]) {
    return await prisma.shippingZone.findMany({
      where: {
        isActive: true,
        states: {
          hasSome: states
        }
      },
      include: {
        shippingRates: {
          where: {
            isActive: true,
            carrier: {
              status: 'ACTIVE'
            }
          },
          include: {
            carrier: true
          }
        }
      }
    });
  }
}

export { ShippingZoneModel as ShippingZone };