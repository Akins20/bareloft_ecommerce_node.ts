import { PaginationMeta } from "../../types/common.types";
/**
 * Data transformation utilities for converting between formats
 */
export declare class DataTransformers {
    /**
     * Transform database user to public user (remove sensitive fields)
     */
    static transformUserToPublic(user: any): any;
    /**
     * Transform product for API response
     */
    static transformProduct(product: any): any;
    /**
     * Transform order for API response
     */
    static transformOrder(order: any): any;
    /**
     * Transform cart for API response
     */
    static transformCart(cart: any): any;
    /**
     * Transform inventory for API response
     */
    static transformInventory(inventory: any): any;
    /**
     * Transform address for API response
     */
    static transformAddress(address: any): any;
    /**
     * Transform payment transaction for API response
     */
    static transformPaymentTransaction(transaction: any): any;
    /**
     * Transform notification for API response
     */
    static transformNotification(notification: any): any;
    /**
     * Transform database results to paginated response
     */
    static transformToPaginatedResponse<T>(items: T[], totalItems: number, currentPage: number, itemsPerPage: number, transformer?: (item: T) => any): {
        items: any[];
        pagination: PaginationMeta;
    };
    /**
     * Transform search results
     */
    static transformSearchResults(results: any, query: string, searchTime: number): any;
    private static normalizePhoneNumber;
    private static generateInitials;
    private static calculateDiscountPercentage;
    private static formatCurrency;
    private static getStockStatus;
    private static transformProductImage;
    private static generateProductBreadcrumbs;
    private static canOrderBeCancelled;
    private static transformOrderItem;
    private static transformCartItem;
    private static generateOrderTimeline;
    private static calculateStockPercentage;
    private static formatFullAddress;
    private static formatPhoneNumber;
    private static generateAddressDisplayName;
    private static getPaymentMethodDisplay;
    private static getNotificationIcon;
    private static formatDate;
    private static formatRelativeTime;
    private static highlightSearchTerms;
    private static generateSearchSuggestions;
    private static generateDidYouMean;
    private static calculateSimilarity;
    private static levenshteinDistance;
}
export default DataTransformers;
//# sourceMappingURL=transformers.d.ts.map