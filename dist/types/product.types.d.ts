import { BaseEntity, PaginationParams, SearchParams } from "./common.types";
import { PublicUser } from "./user.types";
export interface Product extends BaseEntity {
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    sku: string;
    price: number;
    comparePrice?: number;
    costPrice?: number;
    categoryId: string;
    brand?: string;
    weight?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
    isActive: boolean;
    isFeatured: boolean;
    seoTitle?: string;
    seoDescription?: string;
    category: Category;
    images: ProductImage[];
    reviews: ProductReview[];
    averageRating?: number;
    totalReviews?: number;
    isInStock?: boolean;
    discountPercentage?: number;
}
export interface Category extends BaseEntity {
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
    isActive: boolean;
    sortOrder: number;
    imageUrl?: string;
    parent?: Category;
    children: Category[];
    products: Product[];
    productCount?: number;
    hasChildren?: boolean;
}
export interface ProductImage extends BaseEntity {
    productId: string;
    imageUrl: string;
    altText?: string;
    sortOrder: number;
    isPrimary: boolean;
    format?: string;
    size?: number;
    width?: number;
    height?: number;
}
export interface ProductReview extends BaseEntity {
    productId: string;
    userId: string;
    orderId?: string;
    rating: number;
    title?: string;
    comment?: string;
    isVerified: boolean;
    isApproved: boolean;
    helpfulVotes: number;
    product: Product;
    user: PublicUser;
    order?: any;
}
export interface CreateProductRequest {
    name: string;
    description: string;
    shortDescription?: string;
    sku: string;
    price: number;
    comparePrice?: number;
    categoryId: string;
    brand?: string;
    weight?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
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
}
export interface UpdateProductRequest extends Partial<CreateProductRequest> {
    id: string;
}
export interface ProductQueryParams extends PaginationParams, SearchParams {
    categoryId?: string;
    categorySlug?: string;
    brand?: string;
    priceMin?: number;
    priceMax?: number;
    isActive?: boolean;
    isFeatured?: boolean;
    inStock?: boolean;
    hasDiscount?: boolean;
    rating?: number;
    sortBy?: "name" | "price" | "rating" | "created" | "popularity" | "discount";
    availability?: "all" | "in_stock" | "out_of_stock" | "low_stock";
}
export interface ProductListResponse {
    products: Product[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    filters: {
        categories: {
            id: string;
            name: string;
            slug: string;
            count: number;
        }[];
        brands: {
            name: string;
            count: number;
        }[];
        priceRange: {
            min: number;
            max: number;
        };
        avgRating: number;
    };
    facets?: {
        totalProducts: number;
        inStock: number;
        outOfStock: number;
        onSale: number;
        featured: number;
    };
}
export interface CreateCategoryRequest {
    name: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
    sortOrder?: number;
    imageUrl?: string;
    seoTitle?: string;
    seoDescription?: string;
}
export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
    id: string;
}
export interface CategoryQueryParams extends PaginationParams {
    parentId?: string;
    isActive?: boolean;
    hasProducts?: boolean;
    sortBy?: "name" | "sortOrder" | "productCount" | "created";
}
export interface CategoryListQuery extends PaginationParams {
    parentId?: string;
    isActive?: boolean;
    hasProducts?: boolean;
    sortBy?: "name" | "sortOrder" | "productCount" | "created";
    includeProductCount?: boolean;
}
export interface CategoryWithProductCount extends Category {
    productCount: number;
}
export interface CreateReviewRequest {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    comment?: string;
}
export interface UpdateReviewRequest extends Partial<CreateReviewRequest> {
    id: string;
}
export interface ReviewQueryParams extends PaginationParams {
    productId?: string;
    userId?: string;
    rating?: number;
    isVerified?: boolean;
    isApproved?: boolean;
    sortBy?: "rating" | "helpful" | "created";
}
export interface ProductSearchRequest extends PaginationParams {
    query?: string;
    categoryId?: string;
    filters?: {
        brand?: string[];
        priceRange?: {
            min: number;
            max: number;
        };
        rating?: number;
        availability?: "all" | "in_stock" | "out_of_stock";
        hasDiscount?: boolean;
        isFeatured?: boolean;
    };
    sortBy?: "relevance" | "price_asc" | "price_desc" | "rating" | "newest" | "popularity";
}
export interface ProductSearchResponse extends ProductListResponse {
    searchMeta: {
        query: string;
        totalResults: number;
        searchTime: number;
        suggestions?: string[];
        didYouMean?: string;
    };
}
export interface SearchAnalytics {
    totalSearches: number;
    uniqueSearches: number;
    avgSearchTime: number;
    topQueries: PopularSearch[];
    noResultsQueries: {
        query: string;
        count: number;
    }[];
    searchIntent: {
        product: number;
        category: number;
        brand: number;
        price: number;
    };
    conversionRate: number;
    avgResultsPerSearch: number;
    mobileSearchPercentage: number;
    peakSearchHours: {
        hour: number;
        searches: number;
    }[];
}
export interface ProductAnalytics {
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    inStockProducts: number;
    outOfStockProducts: number;
    lowStockProducts: number;
    featuredProducts: number;
    totalValue: number;
    averagePrice: number;
    topCategories: {
        category: Category;
        productCount: number;
        totalValue: number;
    }[];
    topBrands: {
        brand: string;
        productCount: number;
        totalValue: number;
    }[];
    priceDistribution: {
        range: string;
        count: number;
    }[];
    recentlyAdded: Product[];
    mostViewed: Product[];
    bestRated: Product[];
}
export interface ProductComparison {
    products: Product[];
    features: {
        name: string;
        values: (string | number | boolean)[];
    }[];
    recommendations: {
        bestValue: Product;
        mostPopular: Product;
        highestRated: Product;
    };
}
export interface NigerianProductCategories {
    "african-wear": "African Wear";
    "shoes-bags": "Shoes & Bags";
    "jewelry-accessories": "Jewelry & Accessories";
    "phones-tablets": "Phones & Tablets";
    computers: "Computers";
    electronics: "Electronics";
    "home-kitchen": "Home & Kitchen";
    furniture: "Furniture";
    "garden-outdoor": "Garden & Outdoor";
    "beauty-personal-care": "Beauty & Personal Care";
    "health-wellness": "Health & Wellness";
    "sports-fitness": "Sports & Fitness";
    "outdoor-recreation": "Outdoor & Recreation";
    books: "Books";
    "movies-music": "Movies & Music";
    "baby-kids": "Baby & Kids";
    "toys-games": "Toys & Games";
}
export type ProductStatus = "active" | "inactive" | "out_of_stock" | "discontinued" | "pending_review" | "draft";
export interface ProductShipping {
    weight: number;
    dimensions: {
        length: number;
        width: number;
        height: number;
    };
    shippingClass: "standard" | "heavy" | "fragile" | "express";
    freeShippingEligible: boolean;
    estimatedDelivery: {
        lagos: number;
        abuja: number;
        nationwide: number;
    };
}
export interface ProductVariant extends BaseEntity {
    productId: string;
    name: string;
    value: string;
    price?: number;
    sku: string;
    inventory: {
        quantity: number;
        reserved: number;
    };
    product: Product;
}
export interface VariantOption {
    name: string;
    values: string[];
    required: boolean;
}
export interface ProductSEO {
    title?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    ogImage?: string;
    structuredData?: Record<string, any>;
}
export interface ProductBundle extends BaseEntity {
    name: string;
    description: string;
    products: {
        productId: string;
        quantity: number;
        product: Product;
    }[];
    bundlePrice: number;
    savings: number;
    isActive: boolean;
}
export interface RelatedProduct {
    productId: string;
    relatedProductId: string;
    type: "cross_sell" | "up_sell" | "alternative" | "accessory";
    sortOrder: number;
}
export interface ProductImportRow {
    name: string;
    description: string;
    sku: string;
    price: number;
    category: string;
    brand?: string;
    quantity: number;
    imageUrls?: string;
}
export interface ProductExportOptions {
    includeInventory: boolean;
    includeImages: boolean;
    includeReviews: boolean;
    categoryIds?: string[];
    dateRange?: {
        from: Date;
        to: Date;
    };
}
export interface ProductListQuery extends PaginationParams {
    categoryId?: string;
    categorySlug?: string;
    brand?: string;
    priceMin?: number;
    priceMax?: number;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    inStock?: boolean;
    hasDiscount?: boolean;
    rating?: number;
    sortBy?: "name" | "price" | "rating" | "created" | "popularity" | "discount";
    availability?: "all" | "in_stock" | "out_of_stock" | "low_stock";
}
export interface SearchQuery {
    query: string;
    categoryId?: string | undefined;
    brand?: string | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    inStock?: boolean | undefined;
    rating?: number | undefined;
    sortBy?: "relevance" | "price" | "name" | "rating" | "created" | "popularity" | "discount" | string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    filters?: SearchFilters | undefined;
}
export interface SearchResult {
    products: Product[];
    categories: Category[];
    totalResults: number;
    searchTime: number;
    suggestions: SearchSuggestion[];
    filters: SearchFilters;
    facets: {
        brands: {
            name: string;
            count: number;
        }[];
        categories: {
            id: string;
            name: string;
            count: number;
        }[];
        priceRanges: {
            min: number;
            max: number;
            count: number;
        }[];
    };
}
export interface SearchSuggestion {
    text: string;
    type: "product" | "category" | "brand" | "query" | "suggestion";
    relevance?: number;
    count?: number;
    category?: string;
    highlight?: string;
}
export interface SearchFilters {
    categoryId?: string | undefined;
    categoryIds?: string[] | undefined;
    brand?: string | undefined;
    brands?: string[] | undefined;
    minPrice?: number | undefined;
    maxPrice?: number | undefined;
    priceRange?: {
        min: number;
        max: number;
    } | undefined;
    rating?: number | undefined;
    inStock?: boolean | undefined;
    availability?: "all" | "in_stock" | "out_of_stock" | undefined;
    hasDiscount?: boolean | undefined;
    onSale?: boolean | undefined;
    discountPercentage?: number | undefined;
    isFeatured?: boolean | undefined;
    features?: string[] | undefined;
    colors?: string[] | undefined;
    sizes?: string[] | undefined;
    location?: string | undefined;
    urgency?: "low" | "medium" | "high" | undefined;
    qualityFocus?: boolean | undefined;
    preferredLocation?: string | undefined;
}
export interface PopularSearch {
    query: string;
    count: number;
    category?: string;
    trend: "rising" | "stable" | "falling" | "up" | "down";
    lastSearched?: Date;
}
export interface SearchAnalytics {
    topQueries: PopularSearch[];
    noResultQueries: string[];
    searchVolume: {
        total: number;
        unique: number;
        period: string;
    };
    conversionRate: number;
    averageResultsPerQuery: number;
    popularFilters: {
        filter: string;
        usage: number;
    }[];
}
export interface ProductDetailResponse {
    product: Product;
    relatedProducts?: Product[];
    additionalReviews?: ProductReview[];
    variants?: ProductVariant[];
    similarProducts?: Product[];
}
export interface SearchResponse {
    products: Product[];
    pagination: {
        currentPage: number;
        totalPages: number;
        total: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    };
    suggestions?: SearchSuggestion[];
    facets?: {
        brands: {
            name: string;
            count: number;
        }[];
        categories: {
            id: string;
            name: string;
            count: number;
        }[];
        priceRanges: {
            min: number;
            max: number;
            count: number;
        }[];
    };
    appliedFilters?: SearchFilters;
    searchTime?: number;
}
export interface AutocompleteResponse {
    suggestions: SearchSuggestion[];
}
export interface SearchHistoryItem {
    query: string;
    filters?: SearchFilters;
    resultCount: number;
    timestamp: Date;
}
export interface SearchHistoryResponse {
    searches: SearchHistoryItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    };
}
export interface ClearHistoryResult {
    clearedCount: number;
}
export interface TrendingSearch {
    query: string;
    count: number;
    trend: "rising" | "stable" | "falling";
    category?: string;
}
export interface ReviewListQuery extends PaginationParams {
    productId?: string;
    userId?: string;
    rating?: number;
    isVerified?: boolean;
    isApproved?: boolean;
    sortBy?: "rating" | "helpful" | "created";
}
export interface ReviewResponse extends ProductReview {
}
export interface ReviewListResponse {
    reviews: ReviewResponse[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
    summary: ReviewSummary;
}
export interface ReviewSummary {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
        rating: number;
        count: number;
        percentage: number;
    }[];
    verifiedReviews: number;
    mostHelpfulReview?: ProductReview;
}
export interface ProductFilters {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    inStock?: boolean;
    featured?: boolean;
    sortBy?: string;
    sortOrder?: string;
}
export interface ProductCreateInput {
    name: string;
    description: string;
    shortDescription?: string;
    sku: string;
    price: number;
    comparePrice?: number;
    categoryId: string;
    brand?: string;
    weight?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
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
}
export interface ProductUpdateInput extends Partial<ProductCreateInput> {
    id: string;
}
//# sourceMappingURL=product.types.d.ts.map