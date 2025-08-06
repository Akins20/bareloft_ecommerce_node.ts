"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAddressRoutes = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/auth/authenticate");
const validateRequest_1 = require("../../middleware/validation/validateRequest");
const rateLimiter_1 = __importDefault(require("../../middleware/security/rateLimiter"));
const userSchemas_1 = require("../../utils/validation/schemas/userSchemas");
const router = (0, express_1.Router)();
// Initialize controller with fallback
let addressController = null;
const initializeAddressRoutes = (controller) => {
    addressController = controller;
    return router;
};
exports.initializeAddressRoutes = initializeAddressRoutes;
// Create fallback controller if not initialized
const getController = () => {
    if (!addressController) {
        // Create a mock controller for now
        return {
            getUserAddresses: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            getDefaultAddresses: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            createAddress: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            getAddressById: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            updateAddress: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            deleteAddress: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            setDefaultAddress: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            calculateShippingCost: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            validateAddress: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            },
            getLocations: async (req, res) => {
                res.status(501).json({ success: false, message: "Address controller not initialized" });
            }
        };
    }
    return addressController;
};
// Rate limiting for address operations
const addressActionLimit = typeof rateLimiter_1.default === 'function' ? (0, rateLimiter_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 address operations per 15 minutes
    message: "Too many address operations. Please try again later.",
}) : rateLimiter_1.default;
// ==================== USER ADDRESS ENDPOINTS ====================
/**
 * @route   GET /api/v1/addresses
 * @desc    Get all addresses for authenticated user
 * @access  Private (Customer)
 * @query   {
 *   type?: 'shipping' | 'billing' | 'all',
 *   includeDefault?: boolean
 * }
 */
router.get("/", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await getController().getUserAddresses(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/addresses/default
 * @desc    Get user's default addresses (shipping & billing)
 * @access  Private (Customer)
 */
router.get("/default", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await getController().getDefaultAddresses(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/addresses
 * @desc    Create new address for user
 * @access  Private (Customer)
 * @body    CreateAddressRequest {
 *   type: 'shipping' | 'billing',
 *   firstName: string,
 *   lastName: string,
 *   company?: string,
 *   addressLine1: string,
 *   addressLine2?: string,
 *   city: string,
 *   state: NigerianState,
 *   postalCode?: string,
 *   phoneNumber: NigerianPhoneNumber,
 *   isDefault?: boolean
 * }
 */
router.post("/", authenticate_1.authenticate, addressActionLimit, (0, validateRequest_1.validateRequest)(userSchemas_1.createAddressSchema), async (req, res, next) => {
    try {
        await getController().createAddress(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/addresses/:id
 * @desc    Get specific address by ID
 * @access  Private (Customer - own addresses only)
 * @param   id - Address ID
 */
router.get("/:id", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await getController().getAddressById(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/addresses/:id
 * @desc    Update existing address
 * @access  Private (Customer - own addresses only)
 * @param   id - Address ID
 * @body    UpdateAddressRequest (partial CreateAddressRequest)
 */
router.put("/:id", authenticate_1.authenticate, addressActionLimit, (0, validateRequest_1.validateRequest)(userSchemas_1.updateAddressSchema), async (req, res, next) => {
    try {
        await getController().updateAddress(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   DELETE /api/v1/addresses/:id
 * @desc    Delete address
 * @access  Private (Customer - own addresses only)
 * @param   id - Address ID
 */
router.delete("/:id", authenticate_1.authenticate, addressActionLimit, async (req, res, next) => {
    try {
        await getController().deleteAddress(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   PUT /api/v1/addresses/:id/default
 * @desc    Set address as default for shipping or billing
 * @access  Private (Customer)
 * @param   id - Address ID
 * @body    { type: 'shipping' | 'billing' }
 */
router.put("/:id/default", authenticate_1.authenticate, addressActionLimit, async (req, res, next) => {
    try {
        await getController().setDefaultAddress(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/addresses/:id/shipping-cost
 * @desc    Calculate shipping cost to this address
 * @access  Private (Customer)
 * @param   id - Address ID
 * @body    {
 *   items?: { productId: string, quantity: number, weight?: number }[],
 *   weight?: number,
 *   value?: number
 * }
 */
router.post("/:id/shipping-cost", authenticate_1.authenticate, async (req, res, next) => {
    try {
        await getController().calculateShippingCost(req, res);
    }
    catch (error) {
        next(error);
    }
});
// ==================== ADDRESS VALIDATION ENDPOINTS ====================
/**
 * @route   POST /api/v1/addresses/validate
 * @desc    Validate Nigerian address format and postal codes
 * @access  Public
 * @body    {
 *   addressLine1: string,
 *   addressLine2?: string,
 *   city: string,
 *   state: string,
 *   postalCode?: string,
 *   country?: string
 * }
 */
router.post("/validate", (0, validateRequest_1.validateRequest)(userSchemas_1.validateAddressSchema), async (req, res, next) => {
    try {
        await getController().validateAddress(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/addresses/locations
 * @desc    Get Nigerian states and cities data
 * @access  Public
 * @query   { state?: string }
 */
router.get("/locations", async (req, res, next) => {
    try {
        await getController().getLocations(req, res);
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/addresses/locations/states
 * @desc    Get all Nigerian states
 * @access  Public
 */
router.get("/locations/states", async (req, res, next) => {
    try {
        const nigerianStates = [
            { code: "AB", name: "Abia", zone: "South East" },
            { code: "AD", name: "Adamawa", zone: "North East" },
            { code: "AK", name: "Akwa Ibom", zone: "South South" },
            { code: "AN", name: "Anambra", zone: "South East" },
            { code: "BA", name: "Bauchi", zone: "North East" },
            { code: "BY", name: "Bayelsa", zone: "South South" },
            { code: "BE", name: "Benue", zone: "North Central" },
            { code: "BO", name: "Borno", zone: "North East" },
            { code: "CR", name: "Cross River", zone: "South South" },
            { code: "DE", name: "Delta", zone: "South South" },
            { code: "EB", name: "Ebonyi", zone: "South East" },
            { code: "ED", name: "Edo", zone: "South South" },
            { code: "EK", name: "Ekiti", zone: "South West" },
            { code: "EN", name: "Enugu", zone: "South East" },
            { code: "FC", name: "FCT", zone: "North Central" },
            { code: "GO", name: "Gombe", zone: "North East" },
            { code: "IM", name: "Imo", zone: "South East" },
            { code: "JI", name: "Jigawa", zone: "North West" },
            { code: "KD", name: "Kaduna", zone: "North West" },
            { code: "KN", name: "Kano", zone: "North West" },
            { code: "KT", name: "Katsina", zone: "North West" },
            { code: "KE", name: "Kebbi", zone: "North West" },
            { code: "KO", name: "Kogi", zone: "North Central" },
            { code: "KW", name: "Kwara", zone: "North Central" },
            { code: "LA", name: "Lagos", zone: "South West" },
            { code: "NA", name: "Nasarawa", zone: "North Central" },
            { code: "NI", name: "Niger", zone: "North Central" },
            { code: "OG", name: "Ogun", zone: "South West" },
            { code: "ON", name: "Ondo", zone: "South West" },
            { code: "OS", name: "Osun", zone: "South West" },
            { code: "OY", name: "Oyo", zone: "South West" },
            { code: "PL", name: "Plateau", zone: "North Central" },
            { code: "RI", name: "Rivers", zone: "South South" },
            { code: "SO", name: "Sokoto", zone: "North West" },
            { code: "TA", name: "Taraba", zone: "North East" },
            { code: "YO", name: "Yobe", zone: "North East" },
            { code: "ZA", name: "Zamfara", zone: "North West" },
        ];
        res.json({
            success: true,
            message: "Nigerian states retrieved successfully",
            data: {
                states: nigerianStates,
                zones: [
                    "North Central",
                    "North East",
                    "North West",
                    "South East",
                    "South South",
                    "South West",
                ],
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   GET /api/v1/addresses/locations/cities/:state
 * @desc    Get cities for a specific Nigerian state
 * @access  Public
 * @param   state - State name or code
 */
router.get("/locations/cities/:state", async (req, res, next) => {
    try {
        const { state } = req.params;
        // This would typically come from a database or service
        // For now, providing sample data for major states
        const cityData = {
            Lagos: [
                "Agege",
                "Ajeromi-Ifelodun",
                "Alimosho",
                "Amuwo-Odofin",
                "Apapa",
                "Badagry",
                "Epe",
                "Eti-Osa",
                "Ibeju-Lekki",
                "Ifako-Ijaiye",
                "Ikeja",
                "Ikorodu",
                "Kosofe",
                "Lagos Island",
                "Lagos Mainland",
                "Mushin",
                "Ojo",
                "Oshodi-Isolo",
                "Shomolu",
                "Surulere",
            ],
            Abuja: [
                "Abaji",
                "Abuja Municipal",
                "Bwari",
                "Gwagwalada",
                "Kuje",
                "Kwali",
            ],
            FCT: ["Abaji", "Abuja Municipal", "Bwari", "Gwagwalada", "Kuje", "Kwali"],
            Kano: [
                "Kano Municipal",
                "Fagge",
                "Dala",
                "Gwale",
                "Tarauni",
                "Nassarawa",
                "Ungogo",
                "Kumbotso",
                "Warawa",
                "Dawakin Tofa",
            ],
            Rivers: [
                "Port Harcourt",
                "Obio-Akpor",
                "Okrika",
                "Ogu–Bolo",
                "Eleme",
                "Tai",
                "Gokana",
                "Khana",
                "Oyigbo",
                "Opobo–Nkoro",
            ],
        };
        const cities = cityData[state] || [];
        res.json({
            success: true,
            message: cities.length > 0
                ? `Cities for ${state} retrieved successfully`
                : `No cities found for ${state}`,
            data: {
                state,
                cities,
                count: cities.length,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
// ==================== SHIPPING ZONES ENDPOINTS ====================
/**
 * @route   GET /api/v1/addresses/shipping-zones
 * @desc    Get shipping zones and rates for Nigeria
 * @access  Public
 */
router.get("/shipping-zones", async (req, res, next) => {
    try {
        const shippingZones = [
            {
                id: "zone-1",
                name: "Lagos Metro",
                states: ["Lagos"],
                baseRate: 1500,
                currency: "NGN",
                estimatedDays: "1-2 business days",
                freeShippingThreshold: 25000,
            },
            {
                id: "zone-2",
                name: "Abuja/FCT",
                states: ["FCT"],
                baseRate: 2000,
                currency: "NGN",
                estimatedDays: "2-3 business days",
                freeShippingThreshold: 35000,
            },
            {
                id: "zone-3",
                name: "Major Cities",
                states: ["Kano", "Rivers", "Oyo", "Kaduna", "Ogun"],
                baseRate: 2500,
                currency: "NGN",
                estimatedDays: "3-5 business days",
                freeShippingThreshold: 50000,
            },
            {
                id: "zone-4",
                name: "Other States",
                states: [
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
                    "Katsina",
                    "Kebbi",
                    "Kogi",
                    "Kwara",
                    "Nasarawa",
                    "Niger",
                    "Ondo",
                    "Osun",
                    "Plateau",
                    "Sokoto",
                    "Taraba",
                    "Yobe",
                    "Zamfara",
                ],
                baseRate: 3500,
                currency: "NGN",
                estimatedDays: "5-7 business days",
                freeShippingThreshold: 75000,
            },
        ];
        res.json({
            success: true,
            message: "Shipping zones retrieved successfully",
            data: {
                zones: shippingZones,
                globalFreeShippingThreshold: 50000,
                currency: "NGN",
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * @route   POST /api/v1/addresses/shipping-quote
 * @desc    Get shipping quote for specific address and items
 * @access  Public
 * @body    {
 *   address: { state: string, city: string },
 *   items: { weight: number, value: number, quantity: number }[],
 *   total?: number
 * }
 */
router.post("/shipping-quote", async (req, res, next) => {
    try {
        const { address, items, total } = req.body;
        if (!address?.state) {
            return res.status(400).json({
                success: false,
                message: "Address state is required for shipping quote",
            });
        }
        // Simplified shipping calculation
        let baseRate = 3500; // Default rate
        let estimatedDays = "5-7 business days";
        let freeShippingThreshold = 75000;
        // Determine shipping zone based on state
        if (address.state === "Lagos") {
            baseRate = 1500;
            estimatedDays = "1-2 business days";
            freeShippingThreshold = 25000;
        }
        else if (address.state === "FCT") {
            baseRate = 2000;
            estimatedDays = "2-3 business days";
            freeShippingThreshold = 35000;
        }
        else if (["Kano", "Rivers", "Oyo", "Kaduna", "Ogun"].includes(address.state)) {
            baseRate = 2500;
            estimatedDays = "3-5 business days";
            freeShippingThreshold = 50000;
        }
        // Calculate total weight and value
        const totalWeight = items?.reduce((sum, item) => sum + (item.weight || 0), 0) ||
            0;
        const totalValue = total ||
            items?.reduce((sum, item) => sum + (item.value || 0), 0) ||
            0;
        // Weight-based pricing (additional ₦200 per kg above 2kg)
        let weightSurcharge = 0;
        if (totalWeight > 2) {
            weightSurcharge = Math.ceil(totalWeight - 2) * 200;
        }
        const shippingCost = baseRate + weightSurcharge;
        const isFreeShipping = totalValue >= freeShippingThreshold;
        const finalShippingCost = isFreeShipping ? 0 : shippingCost;
        res.json({
            success: true,
            message: "Shipping quote calculated successfully",
            data: {
                baseRate,
                weightSurcharge,
                totalShippingCost: shippingCost,
                finalShippingCost,
                isFreeShipping,
                freeShippingThreshold,
                remainingForFreeShipping: Math.max(0, freeShippingThreshold - totalValue),
                estimatedDelivery: estimatedDays,
                currency: "NGN",
                breakdown: {
                    totalWeight,
                    totalValue,
                    baseShippingRate: baseRate,
                    weightSurcharge,
                    discount: isFreeShipping ? shippingCost : 0,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=addresses.js.map