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
     * Get user profile with statistics
     */
    getUserProfile(userId: string): Promise<any>;
    /**
     * Deactivate user account
     */
    deactivateAccount(userId: string): Promise<void>;
    /**
     * Calculate profile completeness percentage
     */
    private calculateProfileCompleteness;
    /**
     * Handle service errors
     */
    private handleError;
}
//# sourceMappingURL=UserService.d.ts.map