import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { ProductService } from "../../services/products/ProductService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class ProductController extends BaseController {
    private productService;
    constructor(productService: ProductService);
    /**
     * Get all products with filtering, search, and pagination
     * GET /api/v1/products
     */
    getProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Get product by ID with full details
     * GET /api/v1/products/:id
     */
    getProductById: (req: Request, res: Response) => Promise<void>;
    /**
     * Get product by slug (SEO-friendly URL)
     * GET /api/v1/products/slug/:slug
     */
    getProductBySlug: (req: Request, res: Response) => Promise<void>;
    /**
     * Get featured products
     * GET /api/v1/products/featured
     */
    getFeaturedProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Get products by category
     * GET /api/v1/products/category/:categoryId
     */
    getProductsByCategory: (req: Request, res: Response) => Promise<void>;
    /**
     * Get related products based on category and price range
     * GET /api/v1/products/:id/related
     */
    getRelatedProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Search products with advanced filtering
     * GET /api/v1/products/search
     */
    searchProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Get product stock availability
     * GET /api/v1/products/:id/stock
     */
    getProductStock: (req: Request, res: Response) => Promise<void>;
    /**
     * Check multiple products stock availability (for cart validation)
     * POST /api/v1/products/check-stock
     */
    checkMultipleStock: (req: Request, res: Response) => Promise<void>;
    /**
     * Get product reviews summary
     * GET /api/v1/products/:id/reviews/summary
     */
    getProductReviewsSummary: (req: Request, res: Response) => Promise<void>;
    /**
     * Get product price history (for price tracking)
     * GET /api/v1/products/:id/price-history
     */
    getProductPriceHistory: (req: Request, res: Response) => Promise<void>;
    /**
     * Get products with low stock (admin endpoint)
     * GET /api/v1/products/low-stock
     */
    getLowStockProducts: (req: Request, res: Response) => Promise<void>;
    /**
     * Get product analytics (admin endpoint)
     * GET /api/v1/products/:id/analytics
     */
    getProductAnalytics: (req: Request, res: Response) => Promise<void>;
    /**
     * Create new product (admin endpoint)
     * POST /api/v1/products
     */
    createProduct: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Update product (admin endpoint)
     * PUT /api/v1/products/:id
     */
    updateProduct: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Delete product (admin endpoint)
     * DELETE /api/v1/products/:id
     */
    deleteProduct: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate product data before creation/update
     */
    private validateProductData;
}
//# sourceMappingURL=ProductController.d.ts.map