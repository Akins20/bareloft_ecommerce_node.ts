"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const BaseService_1 = require("../BaseService");
const AddressRepository_1 = require("../../repositories/AddressRepository");
const api_types_1 = require("../../types/api.types");
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
     * Get address by ID
     */
    async getAddressById(addressId, userId) {
        try {
            const address = await this.addressRepository.findFirst({
                id: addressId,
                userId: userId
            });
            return address;
        }
        catch (error) {
            this.handleError("Error getting address by ID", error);
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
    async updateAddress(addressId, userId, data) {
        try {
            return await this.addressRepository.updateAddress(addressId, userId, data);
        }
        catch (error) {
            this.handleError("Error updating address", error);
            throw error;
        }
    }
    /**
     * Delete address
     */
    async deleteAddress(addressId, userId) {
        try {
            const result = await this.addressRepository.deleteAddress(addressId, userId);
            return {
                success: result,
                message: result ? "Address deleted successfully" : "Failed to delete address"
            };
        }
        catch (error) {
            if (error instanceof api_types_1.AppError && error.statusCode === api_types_1.HTTP_STATUS.NOT_FOUND) {
                return {
                    success: false,
                    message: "Address not found"
                };
            }
            this.handleError("Error deleting address", error);
            throw error;
        }
    }
    /**
     * Set default address
     */
    async setDefaultAddress(addressId, userId, type) {
        try {
            return await this.addressRepository.setAsDefault(addressId, userId);
        }
        catch (error) {
            this.handleError("Error setting default address", error);
            throw error;
        }
    }
    /**
     * Get default addresses
     */
    async getDefaultAddresses(userId) {
        try {
            const shippingDefault = await this.addressRepository.findDefaultAddress(userId, 'SHIPPING');
            const billingDefault = await this.addressRepository.findDefaultAddress(userId, 'BILLING');
            return {
                ...(shippingDefault && { shipping: shippingDefault }),
                ...(billingDefault && { billing: billingDefault })
            };
        }
        catch (error) {
            this.handleError("Error getting default addresses", error);
            throw error;
        }
    }
    /**
     * Validate Nigerian address
     */
    async validateAddress(addressData) {
        try {
            const validation = this.addressRepository.validateNigerianAddress(addressData);
            // Add any additional API-based validation here if needed
            return {
                isValid: validation.isValid,
                errors: validation.errors,
                suggestions: validation.isValid ? null : {
                    message: "Please correct the errors and try again"
                }
            };
        }
        catch (error) {
            this.handleError("Error validating address", error);
            throw error;
        }
    }
    /**
     * Get Nigerian locations (states and cities)
     */
    async getNigerianLocations(state) {
        try {
            const states = [
                'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi',
                'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
                'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe',
                'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
                'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
                'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
                'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
                'Zamfara', 'FCT'
            ];
            // Simple city data for major Nigerian cities
            const citiesByState = {
                'Lagos': ['Lagos Island', 'Ikeja', 'Surulere', 'Lekki', 'Victoria Island', 'Ikoyi', 'Alaba', 'Agege'],
                'Abuja': ['Central Area', 'Garki', 'Wuse', 'Maitama', 'Asokoro', 'Kubwa', 'Nyanya', 'Karu'],
                'Kano': ['Kano Municipal', 'Fagge', 'Dala', 'Gwale', 'Tarauni', 'Nassarawa', 'Ungogo'],
                'Rivers': ['Port Harcourt', 'Obio-Akpor', 'Okrika', 'Eleme', 'Ikwerre', 'Emohua'],
                'Oyo': ['Ibadan North', 'Ibadan South-West', 'Ibadan North-East', 'Ibadan South-East', 'Ogbomoso North'],
                'Kaduna': ['Kaduna North', 'Kaduna South', 'Chikun', 'Igabi', 'Zaria']
            };
            if (state) {
                return {
                    state,
                    cities: citiesByState[state] || [`${state} Central`, `${state} North`, `${state} South`]
                };
            }
            return {
                states: states.map(s => ({ name: s, code: s.toUpperCase() })),
                majorCities: citiesByState
            };
        }
        catch (error) {
            this.handleError("Error getting Nigerian locations", error);
            throw error;
        }
    }
    /**
     * Calculate shipping cost to address
     */
    async calculateShippingCost(addressId, userId, options) {
        try {
            const address = await this.getAddressById(addressId, userId);
            if (!address) {
                return null;
            }
            // Nigerian shipping zones and rates
            const shippingZones = {
                'Lagos': { baseRate: 1500, perKg: 500, zone: 'Zone A' },
                'Abuja': { baseRate: 2000, perKg: 600, zone: 'Zone B' },
                'FCT': { baseRate: 2000, perKg: 600, zone: 'Zone B' },
                'Kano': { baseRate: 2500, perKg: 700, zone: 'Zone C' },
                'Rivers': { baseRate: 2200, perKg: 650, zone: 'Zone B' },
                'Oyo': { baseRate: 2000, perKg: 600, zone: 'Zone B' },
            };
            const defaultRate = { baseRate: 3000, perKg: 800, zone: 'Zone D' };
            const rateInfo = shippingZones[address.state] || defaultRate;
            const weight = options.weight || 1;
            const itemCount = options.items?.length || 1;
            const baseShipping = rateInfo.baseRate;
            const weightCharge = Math.max(0, (weight - 1)) * rateInfo.perKg;
            const itemCharge = Math.max(0, (itemCount - 1)) * 200; // ₦200 per additional item
            const totalShipping = baseShipping + weightCharge + itemCharge;
            return {
                zone: rateInfo.zone,
                baseRate: baseShipping,
                weightCharge,
                itemCharge,
                totalCost: totalShipping,
                currency: 'NGN',
                estimatedDays: rateInfo.zone === 'Zone A' ? '1-2 days' : rateInfo.zone === 'Zone B' ? '2-3 days' : '3-5 days',
                address: {
                    city: address.city,
                    state: address.state,
                    fullAddress: `${address.addressLine1}, ${address.city}, ${address.state}`
                }
            };
        }
        catch (error) {
            this.handleError("Error calculating shipping cost", error);
            throw error;
        }
    }
    /**
     * Handle service errors
     */
    handleError(message, error) {
        console.error(message, error);
        if (error instanceof api_types_1.AppError) {
            throw error;
        }
        throw new api_types_1.AppError(message, api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.INTERNAL_ERROR);
    }
}
exports.AddressService = AddressService;
//# sourceMappingURL=AddressService.js.map