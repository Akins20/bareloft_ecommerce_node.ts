// src/models/ShippingCarrier.ts
import { PrismaClient } from '@prisma/client';
import { db } from '../database/connection';

const prisma = db as PrismaClient;

/**
 * ShippingCarrier Model - Handles shipping carrier operations
 * Optimized for Nigerian logistics providers including Jumia Logistics and local carriers
 */
export class ShippingCarrierModel {
  static async create(data: any) {
    return await prisma.shippingCarrier.create({
      data,
    });
  }

  static async findUnique(params: any) {
    return await prisma.shippingCarrier.findUnique(params);
  }

  static async findFirst(params: any) {
    return await prisma.shippingCarrier.findFirst(params);
  }

  static async findMany(params?: any) {
    return await prisma.shippingCarrier.findMany(params || {});
  }

  static async update(params: any) {
    return await prisma.shippingCarrier.update(params);
  }

  static async delete(params: any) {
    return await prisma.shippingCarrier.delete(params);
  }

  static async count(params?: any) {
    return await prisma.shippingCarrier.count(params || {});
  }
}

export { ShippingCarrierModel as ShippingCarrier };