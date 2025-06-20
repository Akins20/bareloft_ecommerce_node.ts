import { BaseRepository } from "./BaseRepository";
import { Product, ProductQueryParams, ProductAnalytics } from "@/types";
import { PrismaClient } from "@prisma/client";
export declare class ProductRepository extends BaseRepository<Product> {
    protected modelName: string;
    constructor(database?: PrismaClient);
    /**
     * Find product by slug
     */
    findBySlug(slug: string): Promise<Product | null>;
    /**
     * Find product by SKU
     */
    findBySku(sku: string): Promise<Product | null>;
    /**
     * Create product with relationships
     */
    createProduct(productData: {
        name: string;
        slug: string;
        description: string;
        shortDescription?: string;
        sku: string;
        price: number;
        comparePrice?: number;
        categoryId: string;
        brand?: string;
        weight?: number;
        dimensions?: object;
        isActive?: boolean;
        isFeatured?: boolean;
        seoTitle?: string;
        seoDescription?: string;
        inventory: {
            quantity: number;
            lowStockThreshold?: number;
            trackInventory?: boolean;
        };
        images?: {
            imageUrl: string;
            altText?: string;
            isPrimary?: boolean;
        }[];
    }): Promise<Product>;
    /**
     * Find products with advanced filtering
     */
    findWithFilters(params: ProductQueryParams): Promise<{
        products: Product[];
        total: number;
        facets: {
            totalProducts: number;
            inStock: number;
            outOfStock: number;
            onSale: number;
            featured: number;
        };
    }>;
    /**
     * Get featured products
     */
    getFeaturedProducts(limit?: number): Promise<Product[]>;
    /**
     * Get products by category
     */
    getByCategory(categoryId: string, limit?: number): Promise<Product[]>;
    /**
     * Get related products
     */
    getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;
    /**
     * Search products with full-text search
     */
    searchProducts(query: string, params: ProductQueryParams): Promise<{
        products: Product[];
        total: number;
        searchTime: number;
    }>;
    /**
     * Get product analytics
     */
    getProductAnalytics(): Promise<ProductAnalytics>;
    /**
     * Update product with inventory
     */
    updateProductWithInventory(productId: string, productData: Partial<Product>, inventoryData?: {
        quantity?: number;
        lowStockThreshold?: number;
        trackInventory?: boolean;
        reason?: string;
    }): Promise<Product>;
    /**
     * Check if SKU exists
     */
    skuExists(sku: string, excludeProductId?: string): Promise<boolean>;
    /**
     * Check if slug exists
     */
    slugExists(slug: string, excludeProductId?: string): Promise<boolean>;
    /**
     * Get low stock products
     */
    getLowStockProducts(limit?: number): Promise<Product[]>;
    /**
     * Get products by brand
     */
    getByBrand(brand: string, limit?: number): Promise<Product[]>;
    /**
     * Bulk update products
     */
    bulkUpdate(updates: {
        id: string;
        data: Partial<Product>;
    }[]): Promise<number>;
    private getFacets;
    private getTopCategories;
    private getTopBrands;
    private getTotalInventoryValue;
    private getAveragePrice;
    private getPriceDistribution;
}
//# sourceMappingURL=ProductRepository.d.ts.map