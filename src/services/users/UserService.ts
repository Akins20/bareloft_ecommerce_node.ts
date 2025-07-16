import { BaseService } from "../BaseService";
import { UserRepository } from "@/repositories/UserRepository";
import {
  User,
  UpdateUserProfileRequest,
  AppError,
  HTTP_STATUS,
  ERROR_CODES,
} from "@/types";

export class UserService extends BaseService {
  private userRepository: UserRepository;

  constructor() {
    super();
    this.userRepository = new UserRepository();
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(userId);
    } catch (error) {
      this.handleError("Error getting user by ID", error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateUserProfileRequest): Promise<User> {
    try {
      return await this.userRepository.updateProfile(userId, data);
    } catch (error) {
      this.handleError("Error updating user profile", error);
      throw error;
    }
  }

  /**
   * Get user profile with statistics
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new AppError(
          "User not found",
          HTTP_STATUS.NOT_FOUND,
          ERROR_CODES.RESOURCE_NOT_FOUND
        );
      }

      return {
        ...user,
        // Add additional profile information
        profileComplete: this.calculateProfileCompleteness(user),
      };
    } catch (error) {
      this.handleError("Error getting user profile", error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    try {
      await this.userRepository.suspendUser(userId, "Account deactivated by user");
    } catch (error) {
      this.handleError("Error deactivating account", error);
      throw error;
    }
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(user: User): number {
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
  private handleError(message: string, error: any): void {
    console.error(message, error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}