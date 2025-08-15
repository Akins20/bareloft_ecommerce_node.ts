import { PrismaClient } from "@prisma/client";

// Repository imports
import { UserRepository } from "../repositories/UserRepository";
import { OTPRepository } from "../repositories/OTPRepository";
import { SessionRepository } from "../repositories/SessionRepository";
import { ProductRepository } from "../repositories/ProductRepository";
import { CategoryRepository } from "../repositories/CategoryRepository";
import { CartRepository } from "../repositories/CartRepository";
import { OrderRepository } from "../repositories/OrderRepository";
import { AddressRepository } from "../repositories/AddressRepository";
import { ReviewRepository } from "../repositories/ReviewRepository";
import { InventoryRepository } from "../repositories/InventoryRepository";

// Service imports
import { AuthService } from "../services/auth/AuthService";
import { OTPService } from "../services/auth/OTPService";
import { SessionService } from "../services/auth/SessionService";
import { JWTService } from "../services/auth/JWTService";
import { SMSService } from "../services/auth/SMSService";
import { ProductService } from "../services/products/ProductService";
import { CategoryService } from "../services/products/CategoryService";
import { CartService } from "../services/cart/CartService";
import { OrderService } from "../services/orders/OrderService";
import { UserService } from "../services/users/UserService";
import { AddressService } from "../services/users/AddressService";
import { ReviewService } from "../services/products/ReviewService";
import { WishlistService } from "../services/users/WishlistService";
import { SearchService } from "../services/products/SearchService";
import { NotificationService } from "../services/notifications/NotificationService";
import { PaymentService } from "../services/payments/PaymentService";
import { PaystackService } from "../services/payments/PaystackService";

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
    const productRepository = new ProductRepository(this.prisma);
    const categoryRepository = new CategoryRepository(this.prisma);
    const cartRepository = new CartRepository(this.prisma);
    const orderRepository = new OrderRepository(this.prisma);
    const addressRepository = new AddressRepository(this.prisma);
    const reviewRepository = new ReviewRepository(this.prisma);
    const inventoryRepository = new InventoryRepository(this.prisma);

    // Initialize base services
    const jwtService = new JWTService();
    const smsService = new SMSService();
    
    // Initialize OTP service (no constructor dependencies)
    const otpService = new OTPService();

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

    // Initialize product services with proper repositories
    const productService = new ProductService(productRepository, categoryRepository, inventoryRepository);
    const categoryService = new CategoryService(categoryRepository);
    const searchService = new SearchService(productRepository, categoryRepository);
    const reviewService = {} as any; // TODO: Fix dependencies - needs UserRepository, ProductRepository, OrderRepository, CacheService, NotificationService

    // Initialize cart service with proper dependencies
    const cartService = new CartService(cartRepository, productRepository);

    // Initialize order service with proper dependencies
    const notificationService = new NotificationService();
    const orderService = new OrderService(orderRepository, userRepository, cartService, undefined, notificationService, productRepository);

    // Initialize user services
    const userService = new UserService();
    const addressService = new AddressService(addressRepository);
    const wishlistService = new WishlistService();

    // Initialize payment services
    const paystackService = new PaystackService();
    const paymentService = new PaymentService(paystackService, undefined, orderService);

    // Store repositories in container
    this.services.set('userRepository', userRepository);
    this.services.set('otpRepository', otpRepository);
    this.services.set('sessionRepository', sessionRepository);
    this.services.set('productRepository', productRepository);
    this.services.set('categoryRepository', categoryRepository);
    this.services.set('cartRepository', cartRepository);
    this.services.set('orderRepository', orderRepository);
    this.services.set('addressRepository', addressRepository);
    this.services.set('reviewRepository', reviewRepository);
    this.services.set('inventoryRepository', inventoryRepository);

    // Store base services in container
    this.services.set('jwtService', jwtService);
    this.services.set('smsService', smsService);
    this.services.set('otpService', otpService);
    this.services.set('sessionService', sessionService);
    this.services.set('authService', authService);

    // Store business services in container
    this.services.set('productService', productService);
    this.services.set('categoryService', categoryService);
    this.services.set('searchService', searchService);
    this.services.set('reviewService', reviewService);
    this.services.set('cartService', cartService);
    this.services.set('orderService', orderService);
    this.services.set('userService', userService);
    this.services.set('addressService', addressService);
    this.services.set('wishlistService', wishlistService);
    this.services.set('paymentService', paymentService);
    this.services.set('paystackService', paystackService);
  }

  public getService<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found in container`);
    }
    return service as T;
  }

  // Getter methods for specific services
  public getSearchService(): SearchService {
    return this.getService<SearchService>('searchService');
  }

  public getOrderService(): OrderService {
    return this.getService<OrderService>('orderService');
  }

  public getPaymentService(): PaymentService {
    return this.getService<PaymentService>('paymentService');
  }

  public getPaystackService(): PaystackService {
    return this.getService<PaystackService>('paystackService');
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