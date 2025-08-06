import { PrismaClient, AddressType } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Address, NigerianPhoneNumber, NigerianState } from "../types/common.types";
import { CreateAddressRequest, UpdateAddressRequest } from "../types/user.types";
import { AppError, HTTP_STATUS, ERROR_CODES } from "../types/api.types";

interface CreateAddressData {
  userId: string;
  type: AddressType;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: NigerianState;
  postalCode?: string;
  country: string;
  phoneNumber: NigerianPhoneNumber;
  isDefault: boolean;
}

interface UpdateAddressData {
  type?: AddressType;
  firstName?: string;
  lastName?: string;
  company?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: NigerianState;
  postalCode?: string;
  phoneNumber?: NigerianPhoneNumber;
  isDefault?: boolean;
}

export class AddressRepository extends BaseRepository<
  Address,
  CreateAddressData,
  UpdateAddressData
> {
  constructor(prisma?: PrismaClient) {
    super(prisma || new PrismaClient(), "Address");
  }

  /**
   * Get all addresses for a user
   */
  async findByUserId(userId: string): Promise<Address[]> {
    try {
      const result = await this.findMany(
        { userId },
        {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        }
      );
      return result.data;
    } catch (error) {
      throw new AppError(
        "Error fetching user addresses",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get user's default address by type
   */
  async findDefaultAddress(
    userId: string,
    type?: AddressType
  ): Promise<Address | null> {
    try {
      const where: any = {
        userId,
        isDefault: true,
      };

      if (type) {
        where.type = type;
      }

      return await this.findFirst(where);
    } catch (error) {
      throw new AppError(
        "Error fetching default address",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Create new address
   */
  async createAddress(
    userId: string,
    data: CreateAddressRequest
  ): Promise<Address> {
    try {
      const result = await this.transaction(async (prisma) => {
        // If setting as default, unset other default addresses of same type
        if (data.isDefault) {
          await prisma.address.updateMany({
            where: {
              userId,
              type: data.type,
              isDefault: true,
            },
            data: {
              isDefault: false,
            },
          });
        }

        // If this is the user's first address, make it default
        const existingAddresses = await prisma.address.count({
          where: { userId, type: data.type },
        });

        const addressData: CreateAddressData = {
          userId,
          type: data.type,
          firstName: data.firstName,
          lastName: data.lastName,
          ...(data.company !== undefined && { company: data.company }),
          addressLine1: data.addressLine1,
          ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
          city: data.city,
          state: data.state,
          ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
          country: "NG", // Always Nigeria
          phoneNumber: data.phoneNumber,
          isDefault: data.isDefault ?? existingAddresses === 0,
        };

        return await prisma.address.create({
          data: addressData,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      });

      // Transform the result to match our Address interface
      return {
        id: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        ...(result.company && { company: result.company }),
        addressLine1: result.addressLine1,
        ...(result.addressLine2 && { addressLine2: result.addressLine2 }),
        city: result.city,
        state: result.state as NigerianState,
        ...(result.postalCode && { postalCode: result.postalCode }),
        country: result.country as 'NG',
        phoneNumber: result.phoneNumber,
        isDefault: result.isDefault,
        type: result.type as 'SHIPPING' | 'BILLING',
      };
    } catch (error) {
      throw new AppError(
        "Error creating address",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Update address
   */
  async updateAddress(
    addressId: string,
    userId: string,
    data: UpdateAddressRequest
  ): Promise<Address> {
    try {
      const result = await this.transaction(async (prisma) => {
        // Verify address belongs to user
        const existingAddress = await prisma.address.findFirst({
          where: { id: addressId, userId },
        });

        if (!existingAddress) {
          throw new AppError(
            "Address not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // If setting as default, unset other default addresses of same type
        if (data.isDefault) {
          await prisma.address.updateMany({
            where: {
              userId,
              type: existingAddress.type,
              isDefault: true,
              id: { not: addressId },
            },
            data: {
              isDefault: false,
            },
          });
        }

        const updateData: any = {};
        if (data.type !== undefined) updateData.type = data.type;
        if (data.firstName !== undefined) updateData.firstName = data.firstName;
        if (data.lastName !== undefined) updateData.lastName = data.lastName;
        if (data.company !== undefined) updateData.company = data.company;
        if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
        if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.state !== undefined) updateData.state = data.state;
        if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
        if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

        return await prisma.address.update({
          where: { id: addressId },
          data: updateData,
        });
      });

      // Transform the result to match our Address interface
      return {
        id: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        ...(result.company && { company: result.company }),
        addressLine1: result.addressLine1,
        ...(result.addressLine2 && { addressLine2: result.addressLine2 }),
        city: result.city,
        state: result.state as NigerianState,
        ...(result.postalCode && { postalCode: result.postalCode }),
        country: result.country as 'NG',
        phoneNumber: result.phoneNumber,
        isDefault: result.isDefault,
        type: result.type as 'SHIPPING' | 'BILLING',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error updating address",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Delete address
   */
  async deleteAddress(addressId: string, userId: string): Promise<boolean> {
    try {
      return await this.transaction(async (prisma) => {
        // Verify address belongs to user
        const existingAddress = await prisma.address.findFirst({
          where: { id: addressId, userId },
        });

        if (!existingAddress) {
          throw new AppError(
            "Address not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Delete the address
        await prisma.address.delete({
          where: { id: addressId },
        });

        // If deleted address was default, set another address as default
        if (existingAddress.isDefault) {
          const nextAddress = await prisma.address.findFirst({
            where: {
              userId,
              type: existingAddress.type,
            },
            orderBy: { createdAt: "desc" },
          });

          if (nextAddress) {
            await prisma.address.update({
              where: { id: nextAddress.id },
              data: { isDefault: true },
            });
          }
        }

        return true;
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error deleting address",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Set address as default
   */
  async setAsDefault(addressId: string, userId: string): Promise<Address> {
    try {
      const result = await this.transaction(async (prisma) => {
        // Get the address to be set as default
        const address = await prisma.address.findFirst({
          where: { id: addressId, userId },
        });

        if (!address) {
          throw new AppError(
            "Address not found",
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.RESOURCE_NOT_FOUND
          );
        }

        // Unset other default addresses of same type
        await prisma.address.updateMany({
          where: {
            userId,
            type: address.type,
            isDefault: true,
            id: { not: addressId },
          },
          data: {
            isDefault: false,
          },
        });

        // Set this address as default
        return await prisma.address.update({
          where: { id: addressId },
          data: { isDefault: true },
        });
      });

      // Transform the result to match our Address interface
      return {
        id: result.id,
        firstName: result.firstName,
        lastName: result.lastName,
        ...(result.company && { company: result.company }),
        addressLine1: result.addressLine1,
        ...(result.addressLine2 && { addressLine2: result.addressLine2 }),
        city: result.city,
        state: result.state as NigerianState,
        ...(result.postalCode && { postalCode: result.postalCode }),
        country: result.country as 'NG',
        phoneNumber: result.phoneNumber,
        isDefault: result.isDefault,
        type: result.type as 'SHIPPING' | 'BILLING',
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Error setting default address",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Get addresses by Nigerian state
   */
  async findByState(state: NigerianState): Promise<Address[]> {
    try {
      const result = await this.findMany(
        { state },
        {
          orderBy: { createdAt: "desc" },
        }
      );
      return result.data;
    } catch (error) {
      throw new AppError(
        "Error fetching addresses by state",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.DATABASE_ERROR
      );
    }
  }

  /**
   * Validate Nigerian address
   */
  validateNigerianAddress(data: CreateAddressRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields validation
    if (!data.firstName?.trim()) {
      errors.push("First name is required");
    }

    if (!data.lastName?.trim()) {
      errors.push("Last name is required");
    }

    if (!data.addressLine1?.trim()) {
      errors.push("Address line 1 is required");
    }

    if (!data.city?.trim()) {
      errors.push("City is required");
    }

    if (!data.state?.trim()) {
      errors.push("State is required");
    }

    if (!data.phoneNumber?.trim()) {
      errors.push("Phone number is required");
    }

    // Nigerian phone number validation
    if (data.phoneNumber && !this.isValidNigerianPhone(data.phoneNumber)) {
      errors.push("Invalid Nigerian phone number format");
    }

    // Nigerian states validation
    const validStates = [
      "Abia",
      "Adamawa",
      "Akwa Ibom",
      "Anambra",
      "Bauchi",
      "Bayelsa",
      "Benue",
      "Borno",
      "Cross River",
      "Delta",
      "Ebonyi",
      "Edo",
      "Ekiti",
      "Enugu",
      "Gombe",
      "Imo",
      "Jigawa",
      "Kaduna",
      "Kano",
      "Katsina",
      "Kebbi",
      "Kogi",
      "Kwara",
      "Lagos",
      "Nasarawa",
      "Niger",
      "Ogun",
      "Ondo",
      "Osun",
      "Oyo",
      "Plateau",
      "Rivers",
      "Sokoto",
      "Taraba",
      "Yobe",
      "Zamfara",
      "FCT",
    ];

    if (data.state && !validStates.includes(data.state)) {
      errors.push("Invalid Nigerian state");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Helper: Validate Nigerian phone number
   */
  private isValidNigerianPhone(phone: string): boolean {
    const nigerianPhoneRegex = /^(\+234)[789][01][0-9]{8}$/;
    return nigerianPhoneRegex.test(phone);
  }

  /**
   * Alias for setAsDefault (for backward compatibility)
   */
  async setDefaultAddress(addressId: string, userId: string): Promise<Address> {
    return this.setAsDefault(addressId, userId);
  }
}
