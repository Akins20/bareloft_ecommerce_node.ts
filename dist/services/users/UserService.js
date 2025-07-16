"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const BaseService_1 = require("../BaseService");
const UserRepository_1 = require("@/repositories/UserRepository");
const types_1 = require("@/types");
class UserService extends BaseService_1.BaseService {
    userRepository;
    constructor() {
        super();
        this.userRepository = new UserRepository_1.UserRepository();
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        try {
            return await this.userRepository.findById(userId);
        }
        catch (error) {
            this.handleError("Error getting user by ID", error);
            throw error;
        }
    }
    /**
     * Update user profile
     */
    async updateProfile(userId, data) {
        try {
            return await this.userRepository.updateProfile(userId, data);
        }
        catch (error) {
            this.handleError("Error updating user profile", error);
            throw error;
        }
    }
    /**
     * Get user profile with statistics
     */
    async getUserProfile(userId) {
        try {
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new types_1.AppError("User not found", types_1.HTTP_STATUS.NOT_FOUND, types_1.ERROR_CODES.RESOURCE_NOT_FOUND);
            }
            return {
                ...user,
                // Add additional profile information
                profileComplete: this.calculateProfileCompleteness(user),
            };
        }
        catch (error) {
            this.handleError("Error getting user profile", error);
            throw error;
        }
    }
    /**
     * Deactivate user account
     */
    async deactivateAccount(userId) {
        try {
            await this.userRepository.suspendUser(userId, "Account deactivated by user");
        }
        catch (error) {
            this.handleError("Error deactivating account", error);
            throw error;
        }
    }
    /**
     * Calculate profile completeness percentage
     */
    calculateProfileCompleteness(user) {
        const fields = [
            user.firstName,
            user.lastName,
            user.email,
            user.phoneNumber,
        ];
        const completedFields = fields.filter(field => field && field.trim() !== '').length;
        return Math.round((completedFields / fields.length) * 100);
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
exports.UserService = UserService;
//# sourceMappingURL=UserService.js.map