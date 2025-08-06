import { PrismaClient } from "@prisma/client";

// Repository imports
import { UserRepository } from "../repositories/UserRepository";
import { OTPRepository } from "../repositories/OTPRepository";
import { SessionRepository } from "../repositories/SessionRepository";

// Service imports
import { AuthService } from "../services/auth/AuthService";
import { OTPService } from "../services/auth/OTPService";
import { SessionService } from "../services/auth/SessionService";
import { JWTService } from "../services/auth/JWTService";
import { SMSService } from "../services/auth/SMSService";

/**
 * Service Container for Dependency Injection
 * Provides centralized service instantiation with proper dependencies
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private prisma: PrismaClient;
  private services: Map<string, any> = new Map();

  private constructor() {
    this.prisma = new PrismaClient();
    this.initializeServices();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  private initializeServices(): void {
    // Initialize repositories
    const userRepository = new UserRepository(this.prisma);
    const otpRepository = new OTPRepository(this.prisma);
    const sessionRepository = new SessionRepository(this.prisma);

    // Initialize base services
    const jwtService = new JWTService();
    const smsService = new SMSService();
    
    // Initialize OTP service with dependencies
    const otpService = new OTPService(
      otpRepository,
      smsService
    );

    // Initialize session service
    const sessionService = new SessionService(
      sessionRepository,
      jwtService
    );

    // Initialize auth service with all dependencies
    const authService = new AuthService(
      userRepository,
      otpRepository,
      sessionRepository,
      jwtService,
      otpService,
      smsService
    );

    // Store services in container
    this.services.set('userRepository', userRepository);
    this.services.set('otpRepository', otpRepository);
    this.services.set('sessionRepository', sessionRepository);
    this.services.set('jwtService', jwtService);
    this.services.set('smsService', smsService);
    this.services.set('otpService', otpService);
    this.services.set('sessionService', sessionService);
    this.services.set('authService', authService);
  }

  public getService<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  public async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log("✅ Service container initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize service container:", error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log("✅ Service container cleaned up successfully");
    } catch (error) {
      console.error("❌ Failed to cleanup service container:", error);
      throw error;
    }
  }
}

// Export singleton instance getter
export const getServiceContainer = () => ServiceContainer.getInstance();