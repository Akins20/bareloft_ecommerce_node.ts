import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { AddressService } from "../../services/users/AddressService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class AddressController extends BaseController {
    private addressService;
    constructor(addressService: AddressService);
    /**
     * Get all user addresses
     * GET /api/v1/addresses
     */
    getUserAddresses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get address by ID
     * GET /api/v1/addresses/:id
     */
    getAddressById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Create new address
     * POST /api/v1/addresses
     */
    createAddress: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update existing address
     * PUT /api/v1/addresses/:id
     */
    updateAddress: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Delete address
     * DELETE /api/v1/addresses/:id
     */
    deleteAddress: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Set default address
     * PUT /api/v1/addresses/:id/default
     */
    setDefaultAddress: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get default addresses
     * GET /api/v1/addresses/default
     */
    getDefaultAddresses: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate address against Nigerian postal service
     * POST /api/v1/addresses/validate
     */
    validateAddress: (req: Request, res: Response) => Promise<void>;
    /**
     * Get Nigerian states and cities
     * GET /api/v1/addresses/locations
     */
    getLocations: (req: Request, res: Response) => Promise<void>;
    /**
     * Calculate shipping cost to address
     * POST /api/v1/addresses/:id/shipping-cost
     */
    calculateShippingCost: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate address request data
     */
    private validateAddressRequest;
    /**
     * Validate Nigerian phone number format
     */
    private isValidNigerianPhoneNumber;
}
//# sourceMappingURL=AddressController.d.ts.map