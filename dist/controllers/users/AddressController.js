"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressController = void 0;
const BaseController_1 = require("../BaseController");
class AddressController extends BaseController_1.BaseController {
    addressService;
    constructor(addressService) {
        super();
        this.addressService = addressService;
    }
    /**
     * Get all user addresses
     * GET /api/v1/addresses
     */
    getUserAddresses = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const addresses = await this.addressService.getUserAddresses(userId);
            const response = {
                success: true,
                message: "Addresses retrieved successfully",
                data: addresses,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get address by ID
     * GET /api/v1/addresses/:id
     */
    getAddressById = async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const address = await this.addressService.getAddressById(id, userId);
            if (!address) {
                res.status(404).json({
                    success: false,
                    message: "Address not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "Address retrieved successfully",
                data: address,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Create new address
     * POST /api/v1/addresses
     */
    createAddress = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const addressData = req.body;
            // Validate address data
            const validationErrors = this.validateAddressRequest(addressData);
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const address = await this.addressService.createAddress(userId, addressData);
            const response = {
                success: true,
                message: "Address created successfully",
                data: address,
            };
            res.status(201).json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Update existing address
     * PUT /api/v1/addresses/:id
     */
    updateAddress = async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const updateData = req.body;
            // Validate update data
            const validationErrors = this.validateAddressRequest(updateData, true);
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const address = await this.addressService.updateAddress(id, userId, updateData);
            if (!address) {
                res.status(404).json({
                    success: false,
                    message: "Address not found",
                });
                return;
            }
            const response = {
                success: true,
                message: "Address updated successfully",
                data: address,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Delete address
     * DELETE /api/v1/addresses/:id
     */
    deleteAddress = async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const result = await this.addressService.deleteAddress(id, userId);
            if (!result.success) {
                res.status(400).json({
                    success: false,
                    message: result.message,
                });
                return;
            }
            const response = {
                success: true,
                message: "Address deleted successfully",
                data: null,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Set default address
     * PUT /api/v1/addresses/:id/default
     */
    setDefaultAddress = async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { type } = req.body; // 'shipping' or 'billing'
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            if (!type || !["shipping", "billing"].includes(type)) {
                res.status(400).json({
                    success: false,
                    message: "Valid address type (shipping or billing) is required",
                });
                return;
            }
            const address = await this.addressService.setDefaultAddress(id, userId, type);
            if (!address) {
                res.status(404).json({
                    success: false,
                    message: "Address not found",
                });
                return;
            }
            const response = {
                success: true,
                message: `Default ${type} address updated successfully`,
                data: address,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get default addresses
     * GET /api/v1/addresses/default
     */
    getDefaultAddresses = async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const defaultAddresses = await this.addressService.getDefaultAddresses(userId);
            const response = {
                success: true,
                message: "Default addresses retrieved successfully",
                data: defaultAddresses,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate address against Nigerian postal service
     * POST /api/v1/addresses/validate
     */
    validateAddress = async (req, res) => {
        try {
            const addressData = req.body;
            // Basic validation first
            const validationErrors = this.validateAddressRequest(addressData);
            if (validationErrors.length > 0) {
                res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
                return;
            }
            const validation = await this.addressService.validateAddress(addressData);
            const response = {
                success: true,
                message: "Address validation completed",
                data: validation,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get Nigerian states and cities
     * GET /api/v1/addresses/locations
     */
    getLocations = async (req, res) => {
        try {
            const { state } = req.query;
            const locations = await this.addressService.getNigerianLocations(state);
            const response = {
                success: true,
                message: "Location data retrieved successfully",
                data: locations,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Calculate shipping cost to address
     * POST /api/v1/addresses/:id/shipping-cost
     */
    calculateShippingCost = async (req, res) => {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { items, weight } = req.body;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: "User authentication required",
                });
                return;
            }
            const shippingCost = await this.addressService.calculateShippingCost(id, userId, { items, weight });
            if (!shippingCost) {
                res.status(404).json({
                    success: false,
                    message: "Address not found or shipping calculation failed",
                });
                return;
            }
            const response = {
                success: true,
                message: "Shipping cost calculated successfully",
                data: shippingCost,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate address request data
     */
    validateAddressRequest(data, isUpdate = false) {
        const errors = [];
        // Required fields for creation
        if (!isUpdate || data.firstName !== undefined) {
            if (!data.firstName || data.firstName.trim().length < 2) {
                errors.push("First name must be at least 2 characters long");
            }
        }
        if (!isUpdate || data.lastName !== undefined) {
            if (!data.lastName || data.lastName.trim().length < 2) {
                errors.push("Last name must be at least 2 characters long");
            }
        }
        if (!isUpdate || data.addressLine1 !== undefined) {
            if (!data.addressLine1 || data.addressLine1.trim().length < 5) {
                errors.push("Address line 1 must be at least 5 characters long");
            }
        }
        if (!isUpdate || data.city !== undefined) {
            if (!data.city || data.city.trim().length < 2) {
                errors.push("City is required");
            }
        }
        if (!isUpdate || data.state !== undefined) {
            if (!data.state || data.state.trim().length === 0) {
                errors.push("State is required");
            }
            else {
                // Validate Nigerian states
                const nigerianStates = [
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
                    "FCT",
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
                ];
                if (!nigerianStates.includes(data.state)) {
                    errors.push("Invalid Nigerian state");
                }
            }
        }
        if (!isUpdate || data.phoneNumber !== undefined) {
            if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
                errors.push("Phone number is required");
            }
            else if (!this.isValidNigerianPhoneNumber(data.phoneNumber)) {
                errors.push("Invalid Nigerian phone number format");
            }
        }
        // Optional fields validation
        if (data.postalCode && !/^\d{6}$/.test(data.postalCode)) {
            errors.push("Nigerian postal code must be 6 digits");
        }
        if (data.type && !["shipping", "billing"].includes(data.type)) {
            errors.push("Address type must be either shipping or billing");
        }
        return errors;
    }
    /**
     * Validate Nigerian phone number format
     */
    isValidNigerianPhoneNumber(phoneNumber) {
        // Nigerian phone number patterns
        const patterns = [
            /^(\+234|234|0)(70|71|80|81|90|91|70|71)\d{8}$/, // Mobile numbers
            /^(\+234|234|0)(1)\d{8}$/, // Lagos landline
        ];
        return patterns.some((pattern) => pattern.test(phoneNumber.replace(/\s+/g, "")));
    }
}
exports.AddressController = AddressController;
//# sourceMappingURL=AddressController.js.map