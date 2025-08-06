import { BaseService } from "../BaseService";
import { User, UpdateUserProfileRequest } from "@/types";
export declare class UserService extends BaseService {
    private userRepository;
    constructor();
    /**
     * Get user by ID
     */
    getUserById(userId: string): Promise<User | null>;
    /**
     * Update user profile
     */
    updateProfile(userId: string, data: UpdateUserProfileRequest): Promise<User>;
    /**
     * Update user profile (alias method for controller compatibility)
     */
    updateUserProfile(userId: string, data: UpdateUserProfileRequest): Promise<any>;
    /**
     * Get user profile with statistics
     */
    getUserProfile(userId: string): Promise<any>;
    /**
     * Deactivate user account
     */
    deactivateAccount(userId: string, password: string, reason?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Upload user avatar
     */
    uploadAvatar(userId: string, file: Express.Multer.File): Promise<string>;
    /**
     * Delete user avatar
     */
    deleteAvatar(userId: string): Promise<void>;
    /**
     * Change user password
     */
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get account summary
     */
    getAccountSummary(userId: string): Promise<any>;
    /**
     * Request data export (GDPR compliance)
     */
    requestDataExport(userId: string): Promise<any>;
    /**
     * Get user preferences
     */
    getUserPreferences(userId: string): Promise<any>;
    /**
     * Update user preferences
     */
    updateUserPreferences(userId: string, preferences: any): Promise<any>;
    /**
     * Initiate phone number verification
     */
    initiatePhoneVerification(userId: string, phoneNumber: string): Promise<any>;
    /**
     * Confirm phone number verification
     */
    confirmPhoneVerification(userId: string, phoneNumber: string, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Get user activity log
     */
    getUserActivityLog(userId: string, options: {
        page: number;
        limit: number;
    }): Promise<any>;
    /**
     * Update email preferences
     */
    updateEmailPreferences(userId: string, preferences: any): Promise<any>;
    /**
     * Calculate profile completeness percentage
     */
    private calculateProfileCompleteness;
    /**
     * Handle service errors
     */
    protected handleError(message: string, error: any): never;
}
//# sourceMappingURL=UserService.d.ts.map