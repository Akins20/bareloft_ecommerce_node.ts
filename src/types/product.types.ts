import {
  BaseEntity,
  PaginationParams,
  SearchParams,
  Currency,
} from "./common.types";
import { PublicUser } from "./user.types";

// Product interface
export interface Product extends BaseEntity {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  price: number; // in Naira
  comparePrice?: number; // original price for discounts
  costPrice?: number; // internal cost (admin only)
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

  // Inventory fields
  stock?: number;
  lowStockThreshold?: number;
  trackQuantity?: boolean;
  isDigital?: boolean;
  requiresShipping?: boolean;
  barcode?: string;

  // Relationships
  category: Category;
  images: ProductImage[];
  reviews: ProductReview[];

  // Computed fields
  averageRating?: number;
  totalReviews?: number;
  isInStock?: boolean;
  discountPercentage?: number;
}

// Category interface
export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  imageUrl?: string;

  // Relationships
  parent?: Category;
  children: Category[];
  products: Product[];

  // Computed fields
  productCount?: number;
  hasChildren?: boolean;
}

// Product image interface
export interface ProductImage extends BaseEntity {
  productId: string;
  imageUrl: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;

  // Image metadata
  format?: string;
  size?: number;
  width?: number;
  height?: number;
}

// Product review interface
export interface ProductReview extends BaseEntity {
  productId: string;
  userId: string;
  orderId?: string; // Verified purchase
  rating: number; // 1-5 stars
  title?: string;
  comment?: string;
  isVerified: boolean; // Verified purchase
  isApproved: boolean;
  helpfulVotes: number;

  // Relationships
  product: Product;
  user: PublicUser;
  order?: any; // Optional order relationship
}

// Note: Inventory types moved to inventory.types.ts to avoid duplication

// Product creation/update requests
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

  // Inventory data
  inventory: {
    quantity: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
  };

  // Images
  images?: {
    imageUrl: string;
    altText?: string;
    isPrimary?: boolean;
  }[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

// Product query parameters
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
  rating?: number; // Minimum rating
  sortBy?: "name" | "price" | "rating" | "created" | "popularity" | "discount";
  availability?: "all" | "in_stock" | "out_of_stock" | "low_stock";
}

// Product list response
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
    categories: { id: string; name: string; slug: string; count: number }[];
    brands: { name: string; count: number }[];
    priceRange: { min: number; max: number };
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

// Category requests
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

// Product review requests
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

// Inventory management requests
// Note: Inventory request types moved to inventory.types.ts

// Product search and filtering
export interface ProductSearchRequest extends PaginationParams {
  query?: string;
  categoryId?: string;
  filters?: {
    brand?: string[];
    priceRange?: { min: number; max: number };
    rating?: number;
    availability?: "all" | "in_stock" | "out_of_stock";
    hasDiscount?: boolean;
    isFeatured?: boolean;
  };
  sortBy?:
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "rating"
    | "newest"
    | "popularity";
}

export interface ProductSearchResponse extends ProductListResponse {
  searchMeta: {
    query: string;
    totalResults: number;
    searchTime: number; // in milliseconds
    suggestions?: string[];
    didYouMean?: string;
  };
}

// Search analytics and reporting
export interface SearchAnalytics {
  totalSearches: number;
  uniqueSearches: number;
  avgSearchTime: number; // milliseconds
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
  conversionRate: number; // percentage of searches that led to purchases
  avgResultsPerSearch: number;
  mobileSearchPercentage: number; // High mobile usage in Nigeria
  peakSearchHours: {
    hour: number;
    searches: number;
  }[];
}

// Product analytics and reporting
export interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  featuredProducts: number;
  totalValue: number; // Total inventory value
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

// Note: Wishlist types have been moved to user.types.ts to avoid circular dependencies

// Product comparison
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

// Nigerian specific product types
export interface NigerianProductCategories {
  // Fashion
  "african-wear": "African Wear";
  "shoes-bags": "Shoes & Bags";
  "jewelry-accessories": "Jewelry & Accessories";

  // Electronics
  "phones-tablets": "Phones & Tablets";
  computers: "Computers";
  electronics: "Electronics";

  // Home & Garden
  "home-kitchen": "Home & Kitchen";
  furniture: "Furniture";
  "garden-outdoor": "Garden & Outdoor";

  // Beauty & Health
  "beauty-personal-care": "Beauty & Personal Care";
  "health-wellness": "Health & Wellness";

  // Sports & Fitness
  "sports-fitness": "Sports & Fitness";
  "outdoor-recreation": "Outdoor & Recreation";

  // Books & Media
  books: "Books";
  "movies-music": "Movies & Music";

  // Baby & Kids
  "baby-kids": "Baby & Kids";
  "toys-games": "Toys & Games";
}

// Product status for Nigerian market
export type ProductStatus =
  | "active" // Available for purchase
  | "inactive" // Hidden from customers
  | "out_of_stock" // Temporarily unavailable
  | "discontinued" // No longer available
  | "pending_review" // Awaiting admin approval
  | "draft"; // Work in progress

// Nigerian shipping and logistics
export interface ProductShipping {
  weight: number; // in kg
  dimensions: {
    length: number; // in cm
    width: number; // in cm
    height: number; // in cm
  };
  shippingClass: "standard" | "heavy" | "fragile" | "express";
  freeShippingEligible: boolean;
  estimatedDelivery: {
    lagos: number; // days
    abuja: number;
    nationwide: number;
  };
}

// Product variants (for future implementation)
export interface ProductVariant extends BaseEntity {
  productId: string;
  name: string; // e.g., "Size", "Color"
  value: string; // e.g., "Large", "Red"
  price?: number; // Price difference from base product
  sku: string;
  inventory: {
    quantity: number;
    reserved: number;
  };

  // Relationships
  product: Product;
}

export interface VariantOption {
  name: string; // e.g., "Size"
  values: string[]; // e.g., ["Small", "Medium", "Large"]
  required: boolean;
}

// SEO and marketing
export interface ProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  structuredData?: Record<string, any>;
}

// Product bundles and related products
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

// Product import/export for bulk operations
export interface ProductImportRow {
  name: string;
  description: string;
  sku: string;
  price: number;
  category: string;
  brand?: string;
  quantity: number;
  imageUrls?: string; // Comma-separated URLs
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

// Additional types for SearchService and ProductController
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
    brands: { name: string; count: number }[];
    categories: { id: string; name: string; count: number }[];
    priceRanges: { min: number; max: number; count: number }[];
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
  priceRange?: { min: number; max: number } | undefined;
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

// Product detail response type
export interface ProductDetailResponse {
  product: Product;
  relatedProducts?: Product[];
  additionalReviews?: ProductReview[];
  variants?: ProductVariant[];
  similarProducts?: Product[];
}

// Search response types
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
    brands: { name: string; count: number }[];
    categories: { id: string; name: string; count: number }[];
    priceRanges: { min: number; max: number; count: number }[];
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

// Additional missing types for ReviewController
export interface ReviewListQuery extends PaginationParams {
  productId?: string;
  userId?: string;
  rating?: number;
  isVerified?: boolean;
  isApproved?: boolean;
  sortBy?: "rating" | "helpful" | "created";
}

export interface ReviewResponse extends ProductReview {
  // Additional response fields if needed
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

// Product filters interface for ProductService
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

// Additional missing types
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
