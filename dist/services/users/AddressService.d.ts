import { BaseService } from "../BaseService";
import { Address } from "../../types/common.types";
import { CreateAddressRequest, UpdateAddressRequest } from "../../types/user.types";
export declare class AddressService extends BaseService {
    private addressRepository;
    constructor();
    /**
     * Get user addresses
     */
    getUserAddresses(userId: string): Promise<Address[]>;
    /**
     * Get address by ID
     */
    getAddressById(addressId: string, userId: string): Promise<Address | null>;
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
    deleteAddress(addressId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Set default address
     */
    setDefaultAddress(addressId: string, userId: string, type?: 'SHIPPING' | 'BILLING'): Promise<Address>;
    /**
     * Get default addresses
     */
    getDefaultAddresses(userId: string): Promise<{
        shipping?: Address;
        billing?: Address;
    }>;
    /**
     * Validate Nigerian address
     */
    validateAddress(addressData: any): Promise<{
        isValid: boolean;
        errors: string[];
        suggestions?: any;
    }>;
    /**
     * Get Nigerian locations (states and cities)
     */
    getNigerianLocations(state?: string): Promise<any>;
    /**
     * Calculate shipping cost to address
     */
    calculateShippingCost(addressId: string, userId: string, options: {
        items?: any[];
        weight?: number;
    }): Promise<any>;
    /**
     * Handle service errors
     */
    protected handleError(message: string, error: any): never;
}
//# sourceMappingURL=AddressService.d.ts.map