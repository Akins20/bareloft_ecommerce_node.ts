import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Address, CreateAddressRequest, UpdateAddressRequest, NigerianPhoneNumber, NigerianState } from "../types";
interface CreateAddressData {
    userId: string;
    type: "shipping" | "billing";
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
    type?: "shipping" | "billing";
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
export declare class AddressRepository extends BaseRepository<Address, CreateAddressData, UpdateAddressData> {
    constructor(prisma?: PrismaClient);
    /**
     * Get all addresses for a user
     */
    findByUserId(userId: string): Promise<Address[]>;
    /**
     * Get user's default address by type
     */
    findDefaultAddress(userId: string, type?: "shipping" | "billing"): Promise<Address | null>;
    /**
     * Create new address
     */
    createAddress(userId: string, data: CreateAddressRequest): Promise<Address>;
    /**
     * Update address
     */
    updateAddress(addressId: string, userId: string, data: UpdateAddressRequest): Promise<Address>;
    /**
     * Delete address
     */
    deleteAddress(addressId: string, userId: string): Promise<boolean>;
    /**
     * Set address as default
     */
    setAsDefault(addressId: string, userId: string): Promise<Address>;
    /**
     * Get addresses by Nigerian state
     */
    findByState(state: NigerianState): Promise<Address[]>;
    /**
     * Validate Nigerian address
     */
    validateNigerianAddress(data: CreateAddressRequest): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Helper: Validate Nigerian phone number
     */
    private isValidNigerianPhone;
}
export {};
//# sourceMappingURL=AddressRepository.d.ts.map