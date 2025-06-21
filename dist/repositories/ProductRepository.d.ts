import { PrismaClient } from "@prisma/client";
import { BaseRepository } from "./BaseRepository";
import { Product, ProductQueryParams, ProductListResponse, ProductAnalytics, PaginationParams } from "../types";
export interface CreateProductData {
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    sku: string;
    price: number;
    comparePrice?: number;
    costPrice?: number;
    categoryId: string;
    brand?: string;
    weight?: number;
    dimensions?: any;
    isActive?: boolean;
    isFeatured?: boolean;
    seoTitle?: string;
    seoDescription?: string;
}
export interface UpdateProductData {
    name?: string;
    slug?: string;
    description?: string;
    shortDescription?: string;
    sku?: string;
    price?: number;
    comparePrice?: number;
    costPrice?: number;
    categoryId?: string;
    brand?: string;
    weight?: number;
    dimensions?: any;
    isActive?: boolean;
    isFeatured?: boolean;
    seoTitle?: string;
    seoDescription?: string;
}
export declare class ProductRepository extends BaseRepository<Product, CreateProductData, UpdateProductData> {
    constructor(prisma: PrismaClient);
    /**
     * Find product by slug
     */
    findBySlug(slug: string): Promise<Product | null>;
    /**
     * Find product by SKU
     */
    findBySKU(sku: string): Promise<Product | null>;
    /**
     * Create product with validation
     */
    createProduct(productData: CreateProductData): Promise<Product>;
    /**
     * Update product with validation
     */
    updateProduct(productId: string, productData: UpdateProductData): Promise<Product>;
    /**
     * Find products with advanced filtering
     */
    findProductsWithFilters(queryParams: ProductQueryParams): Promise<ProductListResponse>;
    /**
     * Search products
     */
    searchProducts(searchTerm: string, filters?: {
        categoryId?: string;
        priceMin?: number;
        priceMax?: number;
        brand?: string;
        inStock?: boolean;
    }, pagination?: PaginationParams): Promise<{
        data: Product[];
        pagination: any;
        searchMeta: any;
    }>;
    /**
     * Get featured products
     */
    getFeaturedProducts(limit?: number): Promise<Product[]>;
    /**
     * Get products by category
     */
    getProductsByCategory(categoryId: string, pagination?: PaginationParams): Promise<{
        data: Product[];
        pagination: any;
    }>;
    /**
     * Get related products
     */
    getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;
    /**
     * Get best selling products
     */
    getBestSellingProducts(limit?: number, categoryId?: string): Promise<Array<Product & {
        salesCount: number;
    }>>;
    /**
     * Get products with low stock
     */
    getLowStockProducts(limit?: number): Promise<Array<Product & {
        currentStock: number;
        threshold: number;
    }>>;
    /**
     * Get out of stock products
     */
    getOutOfStockProducts(limit?: number): Promise<Product[]>;
    /**
     * Get product analytics
     */
    getProductAnalytics(): Promise<ProductAnalytics>;
    /**
     * Bulk update product status
     */
    bulkUpdateStatus(productIds: string[], isActive: boolean): Promise<{
        count: number;
    }>;
    /**
     * Bulk update product category
     */
    bulkUpdateCategory(productIds: string[], categoryId: string): Promise<{
        count: number;
    }>;
    private getFilterOptions;
    private getProductFacets;
    private transformProductForList;
    private getCategoryAnalytics;
    private getBrandAnalytics;
    private getPriceAnalytics;
}
//# sourceMappingURL=ProductRepository.d.ts.map