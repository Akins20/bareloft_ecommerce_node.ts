import { BaseService } from "../BaseService";
import { Address } from "@/types";
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
export declare class AddressService extends BaseService {
    private addressRepository;
    constructor();
    /**
     * Get user addresses
     */
    getUserAddresses(userId: string): Promise<Address[]>;
    /**
     * Create new address
     */
    createAddress(userId: string, data: CreateAddressRequest): Promise<Address>;
    /**
     * Update address
     */
    updateAddress(userId: string, addressId: string, data: UpdateAddressRequest): Promise<Address>;
    /**
     * Delete address
     */
    deleteAddress(userId: string, addressId: string): Promise<void>;
    /**
     * Set default address
     */
    setDefaultAddress(userId: string, addressId: string): Promise<Address>;
    /**
     * Handle service errors
     */
    private handleError;
}
//# sourceMappingURL=AddressService.d.ts.map