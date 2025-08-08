/**
 * Swagger/OpenAPI Configuration
 * Generates API documentation for the Bareloft E-commerce Platform
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Bareloft E-commerce API',
    version: '1.0.0',
    description: 'Nigerian E-commerce Platform Backend API - Comprehensive documentation for all endpoints',
    contact: {
      name: 'Bareloft Development Team',
      email: 'dev@bareloft.com',
      url: 'https://bareloft.com'
    },
    license: {
      name: 'Proprietary',
      url: 'https://bareloft.com/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.bareloft.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from login/authentication endpoints'
      },
      SessionAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Session-ID',
        description: 'Session ID for guest cart operations'
      }
    },
    schemas: {
      // Authentication
      LoginRequest: {
        type: 'object',
        required: ['phoneNumber', 'otp'],
        properties: {
          phoneNumber: { type: 'string', example: '+2348012345678' },
          otp: { type: 'string', example: '123456' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  expiresIn: { type: 'number', example: 3600 }
                }
              }
            }
          }
        }
      },
      
      // User
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'user_123' },
          phoneNumber: { type: 'string', example: '+2348012345678' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          email: { type: 'string', example: 'john.doe@example.com' },
          isVerified: { type: 'boolean', example: true },
          role: { type: 'string', enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },

      // Product
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'prod_123' },
          name: { type: 'string', example: 'Nigerian Ankara Dress' },
          description: { type: 'string', example: 'Beautiful traditional Nigerian dress' },
          price: { type: 'number', example: 25000 },
          comparePrice: { type: 'number', example: 30000 },
          currency: { type: 'string', example: 'NGN' },
          sku: { type: 'string', example: 'ANK-001' },
          stock: { type: 'number', example: 50 },
          isActive: { type: 'boolean', example: true },
          category: { $ref: '#/components/schemas/Category' },
          images: {
            type: 'array',
            items: { type: 'string', example: 'https://cdn.bareloft.com/products/ankara-dress-1.jpg' }
          },
          primaryImage: { type: 'string', example: 'https://cdn.bareloft.com/products/ankara-dress-1.jpg' },
          rating: { type: 'number', example: 4.5 },
          reviewCount: { type: 'number', example: 23 }
        }
      },

      // Category
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cat_123' },
          name: { type: 'string', example: 'Fashion & Style' },
          slug: { type: 'string', example: 'fashion-style' },
          description: { type: 'string', example: 'Latest fashion trends and styles' },
          parentId: { type: 'string', nullable: true },
          isActive: { type: 'boolean', example: true },
          sortOrder: { type: 'number', example: 1 }
        }
      },

      // Cart
      CartItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cart_item_123' },
          productId: { type: 'string', example: 'prod_123' },
          quantity: { type: 'number', example: 2 },
          unitPrice: { type: 'number', example: 25000 },
          totalPrice: { type: 'number', example: 50000 },
          product: { $ref: '#/components/schemas/Product' },
          isAvailable: { type: 'boolean', example: true },
          hasStockIssue: { type: 'boolean', example: false }
        }
      },
      Cart: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'cart_user_123' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CartItem' }
          },
          itemCount: { type: 'number', example: 3 },
          subtotal: { type: 'number', example: 75000 },
          estimatedTax: { type: 'number', example: 5625 },
          estimatedShipping: { type: 'number', example: 2000 },
          estimatedTotal: { type: 'number', example: 82625 },
          currency: { type: 'string', example: 'NGN' }
        }
      },

      // Order
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'order_123' },
          orderNumber: { type: 'string', example: 'BLF-2024-001' },
          status: { 
            type: 'string', 
            enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
            example: 'CONFIRMED'
          },
          total: { type: 'number', example: 82625 },
          currency: { type: 'string', example: 'NGN' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/OrderItem' }
          },
          shippingAddress: { $ref: '#/components/schemas/Address' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'order_item_123' },
          productId: { type: 'string', example: 'prod_123' },
          quantity: { type: 'number', example: 2 },
          unitPrice: { type: 'number', example: 25000 },
          totalPrice: { type: 'number', example: 50000 },
          product: { $ref: '#/components/schemas/Product' }
        }
      },

      // Address
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'addr_123' },
          firstName: { type: 'string', example: 'John' },
          lastName: { type: 'string', example: 'Doe' },
          phone: { type: 'string', example: '+2348012345678' },
          address: { type: 'string', example: '123 Victoria Island' },
          city: { type: 'string', example: 'Lagos' },
          state: { type: 'string', example: 'Lagos' },
          postalCode: { type: 'string', example: '100001' },
          country: { type: 'string', example: 'Nigeria' },
          isDefault: { type: 'boolean', example: true }
        }
      },

      // Payment
      PaymentTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'txn_123' },
          reference: { type: 'string', example: 'paystack_123456' },
          amount: { type: 'number', example: 82625 },
          currency: { type: 'string', example: 'NGN' },
          status: {
            type: 'string',
            enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
            example: 'SUCCESS'
          },
          channel: { type: 'string', example: 'card' },
          orderId: { type: 'string', example: 'order_123' }
        }
      },

      // Standard API Response
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              details: { type: 'string', example: 'Invalid request data' }
            }
          }
        }
      },

      // Pagination
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 20 },
          total: { type: 'number', example: 150 },
          totalPages: { type: 'number', example: 8 },
          hasNext: { type: 'boolean', example: true },
          hasPrev: { type: 'boolean', example: false }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Products',
      description: 'Product catalog and management'
    },
    {
      name: 'Categories',
      description: 'Product categories and organization'
    },
    {
      name: 'Cart',
      description: 'Shopping cart operations (guest and authenticated)'
    },
    {
      name: 'Orders',
      description: 'Order management and tracking'
    },
    {
      name: 'Payments',
      description: 'Payment processing and transactions'
    },
    {
      name: 'Users',
      description: 'User profile and account management'
    },
    {
      name: 'Addresses',
      description: 'Nigerian address management'
    },
    {
      name: 'Reviews',
      description: 'Product reviews and ratings'
    },
    {
      name: 'Search',
      description: 'Product search and filtering'
    }
  ]
};

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/types/**/*.ts'
  ]
};

export default swaggerDefinition;