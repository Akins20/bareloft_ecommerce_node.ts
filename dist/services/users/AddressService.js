"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const BaseService_1 = require("../BaseService");
const AddressRepository_1 = require("@/repositories/AddressRepository");
const types_1 = require("@/types");
class AddressService extends BaseService_1.BaseService {
    addressRepository;
    constructor() {
        super();
        this.addressRepository = new AddressRepository_1.AddressRepository();
    }
    /**
     * Get user addresses
     */
    async getUserAddresses(userId) {
        try {
            return await this.addressRepository.findByUserId(userId);
        }
        catch (error) {
            this.handleError("Error getting user addresses", error);
            throw error;
        }
    }
    /**
     * Create new address
     */
    async createAddress(userId, data) {
        try {
            return await this.addressRepository.createAddress(userId, data);
        }
        catch (error) {
            this.handleError("Error creating address", error);
            throw error;
        }
    }
    /**
     * Update address
     */
    async updateAddress(userId, addressId, data) {
        try {
            return await this.addressRepository.updateAddress(userId, addressId, data);
        }
        catch (error) {
            this.handleError("Error updating address", error);
            throw error;
        }
    }
    /**
     * Delete address
     */
    async deleteAddress(userId, addressId) {
        try {
            await this.addressRepository.deleteAddress(userId, addressId);
        }
        catch (error) {
            this.handleError("Error deleting address", error);
            throw error;
        }
    }
    /**
     * Set default address
     */
    async setDefaultAddress(userId, addressId) {
        try {
            return await this.addressRepository.setDefaultAddress(userId, addressId);
        }
        catch (error) {
            this.handleError("Error setting default address", error);
            throw error;
        }
    }
    /**
     * Handle service errors
     */
    handleError(message, error) {
        console.error(message, error);
        if (error instanceof types_1.AppError) {
            throw error;
        }
        throw new types_1.AppError(message, types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.INTERNAL_ERROR);
    }
}
exports.AddressService = AddressService;
//# sourceMappingURL=AddressService.js.map