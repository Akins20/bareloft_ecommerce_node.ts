import { Request, Response } from "express";
import { BaseAdminController } from "../BaseAdminController";
import { getServiceContainer } from "../../config/serviceContainer";
import { ProductRepository } from "../../repositories/ProductRepository";
import { CategoryRepository } from "../../repositories/CategoryRepository";
import { NigerianUtils } from "../../utils/helpers/nigerian";

/**
 * Admin Product Management Controller with Nigerian E-commerce Features
 * 
 * Provides comprehensive product management for Nigerian e-commerce:
 * - Multi-currency support (Naira/Kobo)
 * - Nigerian business hours integration
 * - Bulk operations for efficiency
 * - Product category management
 * - Admin activity logging
 * - Nigerian compliance features
 */
export class AdminProductController extends BaseAdminController {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    super();
    const serviceContainer = getServiceContainer();
    this.productRepository = serviceContainer.getService<ProductRepository>('productRepository');
    this.categoryRepository = serviceContainer.getService<CategoryRepository>('categoryRepository');
  }

  /**
   * Get paginated products list with filtering and sorting
   * GET /api/admin/products
   */
  public getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const {
        page = 1,
        limit = 20,
        search,
        categoryId,
        isActive,
        isFeatured,
        minPrice,
        maxPrice,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filters
      const filters: any = {};
      
      if (search) {
        filters.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (categoryId) {
        filters.categoryId = categoryId as string;
      }

      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      if (isFeatured !== undefined) {
        filters.isFeatured = isFeatured === 'true';
      }

      if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice) filters.price.gte = parseFloat(minPrice as string);
        if (maxPrice) filters.price.lte = parseFloat(maxPrice as string);
      }

      // Get products with pagination
      const options = {
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        }
      };

      const result = await this.productRepository.findMany(filters, options);

      // Format products with Nigerian context
      const formattedProducts = result.data.map(product => ({
        ...product,
        // Format currency fields to Naira
        price: this.formatAdminCurrency(product.price, {
          format: 'display',
          showKobo: false
        }),
        costPrice: product.costPrice ? this.formatAdminCurrency(product.costPrice, {
          format: 'display', 
          showKobo: false
        }) : null,
        // Add Nigerian business context
        createdAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(product.createdAt), 'long'
        ),
        updatedAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(product.updatedAt), 'long'
        ),
        businessHoursCreated: NigerianUtils.Business.isBusinessHours(),
        localTimeZone: 'Africa/Lagos'
      }));

      const response = {
        products: formattedProducts,
        pagination: result.pagination,
        summary: {
          totalProducts: result.pagination?.totalItems || 0,
          activeProducts: formattedProducts.filter(p => p.isActive).length,
          featuredProducts: formattedProducts.filter(p => p.isFeatured).length,
          averagePrice: formattedProducts.length > 0 
            ? formattedProducts.reduce((sum, p) => sum + parseFloat(p.price.toString()), 0) / formattedProducts.length
            : 0
        },
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          timezone: 'Africa/Lagos',
          lastUpdated: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
        }
      };

      this.sendAdminSuccess(res, response, 'Products retrieved successfully', 200, {
        activity: 'content_management',
        includeCurrencyInfo: true
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get single product details
   * GET /api/admin/products/:id
   */
  public getProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { id } = req.params;

      if (!this.isValidUUID(id)) {
        this.sendError(res, "Invalid product ID format", 400, "INVALID_ID");
        return;
      }

      const product = await this.productRepository.findById(id, {
        category: true,
        images: true
      });

      if (!product) {
        this.sendError(res, "Product not found", 404, "PRODUCT_NOT_FOUND");
        return;
      }

      // Format product with comprehensive details
      const formattedProduct = {
        ...product,
        // Format currency fields
        price: this.formatAdminCurrency(product.price, {
          format: 'display',
          showKobo: true
        }),
        costPrice: product.costPrice ? this.formatAdminCurrency(product.costPrice, {
          format: 'display',
          showKobo: true  
        }) : null,
        // Add analytics
        analytics: {
          totalReviews: product.reviews?.length || 0,
          averageRating: product.reviews?.length > 0
            ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
            : 0
        },
        // Nigerian business context
        createdAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(product.createdAt), 'long'
        ),
        updatedAtNigerianTime: NigerianUtils.Business.formatNigerianDate(
          new Date(product.updatedAt), 'long'
        )
      };

      this.sendAdminSuccess(res, formattedProduct, 'Product details retrieved successfully', 200, {
        activity: 'content_management',
        includeCurrencyInfo: true
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Create new product
   * POST /api/admin/products
   */
  public createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const adminId = this.getUserId(req);

      // Log admin activity
      this.logAdminActivity(req, 'content_management', 'create_product', {
        description: 'Created new product',
        severity: 'medium',
        resourceType: 'product',
        metadata: { productData: req.body, adminId }
      });

      // Generate slug from product name if not provided
      const slug = req.body.slug || this.generateSlug(req.body.name);
      
      const productData = {
        ...req.body,
        slug,
        // Ensure proper price handling (convert to Naira if needed)
        price: typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price,
        costPrice: req.body.costPrice ? (typeof req.body.costPrice === 'string' ? parseFloat(req.body.costPrice) : req.body.costPrice) : null
      };

      const product = await this.productRepository.create(productData);

      const formattedProduct = {
        ...product,
        price: this.formatAdminCurrency(product.price, { format: 'display', showKobo: false }),
        costPrice: product.costPrice ? this.formatAdminCurrency(product.costPrice, { format: 'display', showKobo: false }) : null,
        createdAtNigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(product.createdAt), 'long')
      };

      this.sendAdminSuccess(res, formattedProduct, 'Product created successfully', 201, {
        activity: 'content_management',
        includeCurrencyInfo: true
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Update existing product
   * PUT /api/admin/products/:id
   */
  public updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { id } = req.params;
      const adminId = this.getUserId(req);

      if (!this.isValidUUID(id)) {
        this.sendError(res, "Invalid product ID format", 400, "INVALID_ID");
        return;
      }

      // Log admin activity
      this.logAdminActivity(req, 'content_management', 'update_product', {
        description: 'Updated product',
        severity: 'medium',
        resourceType: 'product',
        resourceId: id,
        metadata: { updateData: req.body, adminId }
      });

      const updateData = {
        ...req.body,
        // Ensure proper price handling
        price: req.body.price ? (typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price) : undefined,
        costPrice: req.body.costPrice ? (typeof req.body.costPrice === 'string' ? parseFloat(req.body.costPrice) : req.body.costPrice) : undefined
      };

      const product = await this.productRepository.update(id, updateData);

      const formattedProduct = {
        ...product,
        price: this.formatAdminCurrency(product.price, { format: 'display', showKobo: false }),
        costPrice: product.costPrice ? this.formatAdminCurrency(product.costPrice, { format: 'display', showKobo: false }) : null,
        updatedAtNigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(product.updatedAt), 'long')
      };

      this.sendAdminSuccess(res, formattedProduct, 'Product updated successfully', 200, {
        activity: 'content_management',
        includeCurrencyInfo: true
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete product (soft delete - set isActive to false)
   * DELETE /api/admin/products/:id
   */
  public deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { id } = req.params;
      const adminId = this.getUserId(req);

      if (!this.isValidUUID(id)) {
        this.sendError(res, "Invalid product ID format", 400, "INVALID_ID");
        return;
      }

      // Log admin activity with high severity for deletions
      this.logAdminActivity(req, 'content_management', 'delete_product', {
        description: 'Soft deleted product (deactivated)',
        severity: 'high',
        resourceType: 'product',
        resourceId: id,
        metadata: { adminId }
      });

      // Soft delete by setting isActive to false
      const product = await this.productRepository.update(id, { 
        isActive: false
      });

      this.sendAdminSuccess(res, {
        productId: id,
        deactivatedAtNigerianTime: NigerianUtils.Business.formatNigerianDate(new Date(), 'long'),
        status: 'deactivated'
      }, 'Product deactivated successfully', 200, {
        activity: 'content_management'
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Bulk product operations
   * POST /api/admin/products/bulk
   */
  public bulkProductActions = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const { action, productIds, data } = req.body;
      const adminId = this.getUserId(req);

      if (!action || !productIds || !Array.isArray(productIds)) {
        this.sendError(res, "Invalid bulk action request", 400, "INVALID_REQUEST");
        return;
      }

      // Log admin activity
      this.logAdminActivity(req, 'content_management', 'bulk_product_action', {
        description: `Performed bulk ${action} on ${productIds.length} products`,
        severity: 'high',
        resourceType: 'product',
        metadata: { action, productIds, data, adminId }
      });

      const results = {
        processed: 0,
        errors: [] as Array<{ productId: string; error: string }>
      };

      for (const productId of productIds) {
        try {
          if (!this.isValidUUID(productId)) {
            results.errors.push({ productId, error: 'Invalid product ID format' });
            continue;
          }

          switch (action) {
            case 'activate':
              await this.productRepository.update(productId, { isActive: true });
              break;
            case 'deactivate':
              await this.productRepository.update(productId, { isActive: false });
              break;
            case 'feature':
              await this.productRepository.update(productId, { isFeatured: true });
              break;
            case 'unfeature':
              await this.productRepository.update(productId, { isFeatured: false });
              break;
            case 'update':
              if (data) {
                await this.productRepository.update(productId, data);
              }
              break;
            default:
              results.errors.push({ productId, error: 'Unknown action' });
              continue;
          }
          results.processed++;
        } catch (error) {
          results.errors.push({ 
            productId, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.sendAdminSuccess(res, results, `Bulk ${action} completed`, 200, {
        activity: 'content_management'
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get product statistics
   * GET /api/admin/products/statistics
   */
  public getProductStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const [
        totalProducts,
        activeProducts,
        featuredProducts,
        lowStockProducts,
        outOfStockProducts
      ] = await Promise.all([
        this.productRepository.count({}),
        this.productRepository.count({ isActive: true }),
        this.productRepository.count({ isFeatured: true }),
        this.productRepository.count({ 
          stock: { lte: 10 },
          trackQuantity: true,
          isActive: true
        }),
        this.productRepository.count({ 
          stock: { lte: 0 },
          trackQuantity: true,
          isActive: true
        })
      ]);

      const statistics = {
        overview: {
          totalProducts,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          featuredProducts,
          lowStockProducts,
          outOfStockProducts
        },
        percentages: {
          activePercentage: totalProducts > 0 ? (activeProducts / totalProducts) * 100 : 0,
          featuredPercentage: totalProducts > 0 ? (featuredProducts / totalProducts) * 100 : 0,
          lowStockPercentage: activeProducts > 0 ? (lowStockProducts / activeProducts) * 100 : 0
        },
        nigerianContext: {
          businessHours: NigerianUtils.Business.isBusinessHours(),
          timezone: 'Africa/Lagos',
          generatedAt: NigerianUtils.Business.formatNigerianDate(new Date(), 'long')
        }
      };

      this.sendAdminSuccess(res, statistics, 'Product statistics retrieved successfully', 200, {
        activity: 'content_management'
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Generate URL-friendly slug from product name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * TEMPORARY: Fix inflated currency values in existing products
   * POST /api/admin/products/fix-prices
   */
  public fixInflatedPrices = async (req: Request, res: Response): Promise<void> => {
    try {
      // Admin authentication check
      if (!this.requireAdminAuth(req, res)) return;

      const adminId = this.getUserId(req);

      // Log admin activity
      this.logAdminActivity(req, 'content_management', 'fix_inflated_prices', {
        description: 'Fixed inflated currency values in existing products',
        severity: 'high',
        resourceType: 'product',
        metadata: { adminId }
      });

      // Get all products
      const allProducts = await this.productRepository.findMany({});

      let fixedCount = 0;
      const errors: string[] = [];

      for (const product of allProducts.data) {
        try {
          // Check if prices are inflated (over 100,000 Naira is suspicious for most products)
          const needsPriceFix = product.price > 100000;
          const needsCostPriceFix = product.costPrice && product.costPrice > 50000;

          if (needsPriceFix || needsCostPriceFix) {
            const updateData: any = {};
            
            if (needsPriceFix) {
              updateData.price = Math.round(product.price / 100); // Divide by 100
            }
            
            if (needsCostPriceFix) {
              updateData.costPrice = Math.round(product.costPrice / 100); // Divide by 100
            }

            await this.productRepository.update(product.id, updateData);
            fixedCount++;
          }
        } catch (error) {
          errors.push(`Failed to fix product ${product.id}: ${error.message}`);
        }
      }

      this.sendAdminSuccess(res, {
        fixedCount,
        totalProducts: allProducts.data.length,
        errors
      }, `Fixed ${fixedCount} products with inflated prices`, 200, {
        activity: 'content_management'
      });

    } catch (error) {
      this.handleError(error, req, res);
    }
  };
}