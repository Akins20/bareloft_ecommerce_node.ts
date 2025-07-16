import { BaseService } from "../BaseService";
import { AddressRepository } from "@/repositories/AddressRepository";
import {
  Address,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "@/types";

export interface CreateAddressRequest {
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
  type: 'shipping' | 'billing';
}

export interface UpdateAddressRequest {
  firstName?: string;
  lastName?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phoneNumber?: string;
  isDefault?: boolean;
  type?: 'shipping' | 'billing';
}

export class AddressService extends BaseService {
  private addressRepository: AddressRepository;

  constructor() {
    super();
    this.addressRepository = new AddressRepository();
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      return await this.addressRepository.findByUserId(userId);
    } catch (error) {
      this.handleError("Error getting user addresses", error);
      throw error;
    }
  }

  /**
   * Create new address
   */
  async createAddress(userId: string, data: CreateAddressRequest): Promise<Address> {
    try {
      return await this.addressRepository.createAddress(userId, data);
    } catch (error) {
      this.handleError("Error creating address", error);
      throw error;
    }
  }

  /**
   * Update address
   */
  async updateAddress(userId: string, addressId: string, data: UpdateAddressRequest): Promise<Address> {
    try {
      return await this.addressRepository.updateAddress(userId, addressId, data);
    } catch (error) {
      this.handleError("Error updating address", error);
      throw error;
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      await this.addressRepository.deleteAddress(userId, addressId);
    } catch (error) {
      this.handleError("Error deleting address", error);
      throw error;
    }
  }

  /**
   * Set default address
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
    try {
      return await this.addressRepository.setDefaultAddress(userId, addressId);
    } catch (error) {
      this.handleError("Error setting default address", error);
      throw error;
    }
  }

  /**
   * Handle service errors
   */
  private handleError(message: string, error: any): void {
    console.error(message, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}