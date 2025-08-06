"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressRepository = void 0;
const client_1 = require("@prisma/client");
const BaseRepository_1 = require("./BaseRepository");
const api_types_1 = require("../types/api.types");
class AddressRepository extends BaseRepository_1.BaseRepository {
    constructor(prisma) {
        super(prisma || new client_1.PrismaClient(), "address");
    }
    /**
     * Get all addresses for a user
     */
    async findByUserId(userId) {
        try {
            const result = await this.findMany({ userId }, {
                orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
            });
            return result.data;
        }
        catch (error) {
            throw new api_types_1.AppError("Error fetching user addresses", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get user's default address by type
     */
    async findDefaultAddress(userId, type) {
        try {
            const where = {
                userId,
                isDefault: true,
            };
            if (type) {
                where.type = type;
            }
            return await this.findFirst(where);
        }
        catch (error) {
            throw new api_types_1.AppError("Error fetching default address", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Create new address
     */
    async createAddress(userId, data) {
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
                const addressData = {
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
                state: result.state,
                ...(result.postalCode && { postalCode: result.postalCode }),
                country: result.country,
                phoneNumber: result.phoneNumber,
                isDefault: result.isDefault,
                type: result.type,
            };
        }
        catch (error) {
            throw new api_types_1.AppError("Error creating address", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Update address
     */
    async updateAddress(addressId, userId, data) {
        try {
            const result = await this.transaction(async (prisma) => {
                // Verify address belongs to user
                const existingAddress = await prisma.address.findFirst({
                    where: { id: addressId, userId },
                });
                if (!existingAddress) {
                    throw new api_types_1.AppError("Address not found", api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
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
                const updateData = {};
                if (data.type !== undefined)
                    updateData.type = data.type;
                if (data.firstName !== undefined)
                    updateData.firstName = data.firstName;
                if (data.lastName !== undefined)
                    updateData.lastName = data.lastName;
                if (data.company !== undefined)
                    updateData.company = data.company;
                if (data.addressLine1 !== undefined)
                    updateData.addressLine1 = data.addressLine1;
                if (data.addressLine2 !== undefined)
                    updateData.addressLine2 = data.addressLine2;
                if (data.city !== undefined)
                    updateData.city = data.city;
                if (data.state !== undefined)
                    updateData.state = data.state;
                if (data.postalCode !== undefined)
                    updateData.postalCode = data.postalCode;
                if (data.phoneNumber !== undefined)
                    updateData.phoneNumber = data.phoneNumber;
                if (data.isDefault !== undefined)
                    updateData.isDefault = data.isDefault;
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
                state: result.state,
                ...(result.postalCode && { postalCode: result.postalCode }),
                country: result.country,
                phoneNumber: result.phoneNumber,
                isDefault: result.isDefault,
                type: result.type,
            };
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError("Error updating address", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Delete address
     */
    async deleteAddress(addressId, userId) {
        try {
            return await this.transaction(async (prisma) => {
                // Verify address belongs to user
                const existingAddress = await prisma.address.findFirst({
                    where: { id: addressId, userId },
                });
                if (!existingAddress) {
                    throw new api_types_1.AppError("Address not found", api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
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
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError("Error deleting address", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Set address as default
     */
    async setAsDefault(addressId, userId) {
        try {
            const result = await this.transaction(async (prisma) => {
                // Get the address to be set as default
                const address = await prisma.address.findFirst({
                    where: { id: addressId, userId },
                });
                if (!address) {
                    throw new api_types_1.AppError("Address not found", api_types_1.HTTP_STATUS.NOT_FOUND, api_types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
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
                state: result.state,
                ...(result.postalCode && { postalCode: result.postalCode }),
                country: result.country,
                phoneNumber: result.phoneNumber,
                isDefault: result.isDefault,
                type: result.type,
            };
        }
        catch (error) {
            if (error instanceof api_types_1.AppError) {
                throw error;
            }
            throw new api_types_1.AppError("Error setting default address", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Get addresses by Nigerian state
     */
    async findByState(state) {
        try {
            const result = await this.findMany({ state }, {
                orderBy: { createdAt: "desc" },
            });
            return result.data;
        }
        catch (error) {
            throw new api_types_1.AppError("Error fetching addresses by state", api_types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, api_types_1.ERROR_CODES.DATABASE_ERROR);
        }
    }
    /**
     * Validate Nigerian address
     */
    validateNigerianAddress(data) {
        const errors = [];
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
    isValidNigerianPhone(phone) {
        const nigerianPhoneRegex = /^(\+234)[789][01][0-9]{8}$/;
        return nigerianPhoneRegex.test(phone);
    }
    /**
     * Alias for setAsDefault (for backward compatibility)
     */
    async setDefaultAddress(addressId, userId) {
        return this.setAsDefault(addressId, userId);
    }
}
exports.AddressRepository = AddressRepository;
//# sourceMappingURL=AddressRepository.js.map