/**
 * 🛍️ Product Service
 * Business logic for product management in Nigerian e-commerce context
 */
import { BaseService } from "../BaseService";
import { Product, ProductCreateInput, ProductUpdateInput, ProductFilters, ProductListResponse } from "../../types/product.types";
export declare class ProductService extends BaseService {
    private productRepo;
    private categoryRepo;
    private inventoryRepo;
    constructor();
    /**
     * 📋 Get products with filtering, search, and pagination
     * Nigerian market optimized with local categories and pricing
     */
    getProducts(filters: ProductFilters): Promise<ProductListResponse>;
    /**
     * 🔍 Get single product by ID or slug
     */
    getProduct(identifier: string): Promise<Product>;
    /**
     * ➕ Create new product
     */
    createProduct(productData: ProductCreateInput, adminId: string): Promise<Product>;
    /**
     * ✏️ Update existing product
     */
    updateProduct(productId: string, productData: ProductUpdateInput, adminId: string): Promise<Product>;
    /**
     * 🗑️ Delete product (soft delete)
     */
    deleteProduct(productId: string, adminId: string): Promise<void>;
    /**
     * 🔍 Search products with advanced filters
     */
    searchProducts(query: string, filters?: Partial<ProductFilters>): Promise<ProductListResponse>;
    /**
     * 🏷️ Get products by category
     */
    getProductsByCategory(categoryId: string, filters?: Partial<ProductFilters>): Promise<ProductListResponse>;
    /**
     * ⭐ Get featured products
     */
    getFeaturedProducts(limit?: number): Promise<Product[]>;
    /**
     * 🔗 Get related products
     */
    private getRelatedProducts;
    /**
     * 🎯 Format product for API response
     */
    private formatProductForResponse;
    /**
     * 📊 Calculate market insights for Nigerian context
     */
    private calculateMarketInsights;
    /**
     * 📈 Calculate product-specific market insights
     */
    private calculateProductMarketInsights;
    /**
     * 🎯 Generate market recommendations
     */
    private generateMarketRecommendations;
    /**
     * 💰 Categorize price for Nigerian market
     */
    private categorizePriceForNigerianMarket;
    /**
     * 📊 Determine market position
     */
    private determineMarketPosition;
    /**
     * ⭐ Calculate average rating
     */
    private calculateAverageRating;
    /**
     * 🔗 Generate SEO-friendly slug
     */
    private generateSlug;
    /**
     * 📂 Get available categories for filters
     */
    private getAvailableCategories;
    /**
     * 💰 Get price range for filters
     */
    private getPriceRange;
}
//# sourceMappingURL=ProductService.d.ts.map