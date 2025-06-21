import { PaginationMeta } from "../../types/common.types";

/**
 * Data transformation utilities for converting between formats
 */
export class DataTransformers {
  /**
   * Transform database user to public user (remove sensitive fields)
   */
  static transformUserToPublic(user: any): any {
    if (!user) return null;

    const {
      password,
      refreshToken,
      resetPasswordToken,
      resetPasswordExpires,
      ...publicUser
    } = user;

    return {
      ...publicUser,
      // Ensure phone number is properly formatted
      phoneNumber: this.normalizePhoneNumber(user.phoneNumber),
      // Add computed fields
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      initials: this.generateInitials(user.firstName, user.lastName),
    };
  }

  /**
   * Transform product for API response
   */
  static transformProduct(product: any): any {
    if (!product) return null;

    return {
      ...product,
      // Calculate discount percentage
      discountPercentage: this.calculateDiscountPercentage(
        product.price,
        product.comparePrice
      ),
      // Format prices
      formattedPrice: this.formatCurrency(product.price),
      formattedComparePrice: product.comparePrice
        ? this.formatCurrency(product.comparePrice)
        : null,
      // Add stock status
      stockStatus: this.getStockStatus(
        product.inventory?.quantity || 0,
        product.inventory?.lowStockThreshold || 10
      ),
      // Transform images
      images:
        product.images?.map((img: any) => this.transformProductImage(img)) ||
        [],
      // Add SEO fields
      seoUrl: `/products/${product.slug}`,
      breadcrumbs: this.generateProductBreadcrumbs(product.category),
    };
  }

  /**
   * Transform order for API response
   */
  static transformOrder(order: any): any {
    if (!order) return null;

    return {
      ...order,
      // Format amounts
      formattedSubtotal: this.formatCurrency(order.subtotal),
      formattedTaxAmount: this.formatCurrency(order.taxAmount),
      formattedShippingAmount: this.formatCurrency(order.shippingAmount),
      formattedDiscountAmount: this.formatCurrency(order.discountAmount),
      formattedTotalAmount: this.formatCurrency(order.totalAmount),
      // Add status indicators
      canBeCancelled: this.canOrderBeCancelled(order.status, order.createdAt),
      isDelivered: order.status === "delivered",
      isPaid: order.paymentStatus === "paid",
      // Transform items
      items:
        order.items?.map((item: any) => this.transformOrderItem(item)) || [],
      // Add timeline
      statusTimeline: this.generateOrderTimeline(order),
      // Estimated delivery
      estimatedDeliveryFormatted: order.estimatedDelivery
        ? this.formatDate(order.estimatedDelivery)
        : null,
    };
  }

  /**
   * Transform cart for API response
   */
  static transformCart(cart: any): any {
    if (!cart) return null;

    return {
      ...cart,
      // Format amounts
      formattedSubtotal: this.formatCurrency(cart.subtotal),
      formattedEstimatedTax: this.formatCurrency(cart.estimatedTax),
      formattedEstimatedShipping: this.formatCurrency(cart.estimatedShipping),
      formattedEstimatedTotal: this.formatCurrency(cart.estimatedTotal),
      // Transform items
      items: cart.items?.map((item: any) => this.transformCartItem(item)) || [],
      // Add computed fields
      itemCount:
        cart.items?.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        ) || 0,
      uniqueItemCount: cart.items?.length || 0,
      // Add validation flags
      hasOutOfStockItems:
        cart.items?.some((item: any) => !item.product?.inStock) || false,
      hasPriceChanges:
        cart.items?.some((item: any) => item.priceChanged) || false,
      // Free shipping info
      freeShippingEligible: cart.subtotal >= 50000, // ₦50,000 threshold
      freeShippingRemaining: Math.max(0, 50000 - cart.subtotal),
    };
  }

  /**
   * Transform inventory for API response
   */
  static transformInventory(inventory: any): any {
    if (!inventory) return null;

    const availableQuantity =
      inventory.quantity - (inventory.reservedQuantity || 0);

    return {
      ...inventory,
      availableQuantity,
      stockStatus: this.getStockStatus(
        availableQuantity,
        inventory.lowStockThreshold
      ),
      isLowStock: availableQuantity <= inventory.lowStockThreshold,
      isOutOfStock: availableQuantity <= 0,
      stockPercentage: this.calculateStockPercentage(
        availableQuantity,
        inventory.lowStockThreshold * 3 // Assume full stock is 3x threshold
      ),
      lastMovementFormatted: inventory.lastMovementAt
        ? this.formatRelativeTime(inventory.lastMovementAt)
        : "Never",
    };
  }

  /**
   * Transform address for API response
   */
  static transformAddress(address: any): any {
    if (!address) return null;

    return {
      ...address,
      fullName: `${address.firstName} ${address.lastName}`.trim(),
      formattedAddress: this.formatFullAddress(address),
      formattedPhoneNumber: this.formatPhoneNumber(address.phoneNumber),
      displayName: this.generateAddressDisplayName(address),
    };
  }

  /**
   * Transform payment transaction for API response
   */
  static transformPaymentTransaction(transaction: any): any {
    if (!transaction) return null;

    return {
      ...transaction,
      // Format amounts (convert from kobo to naira)
      formattedAmount: this.formatCurrency(transaction.amount / 100),
      formattedAmountPaid: this.formatCurrency(transaction.amountPaid / 100),
      formattedFees: this.formatCurrency(transaction.fees / 100),
      // Add status indicators
      isSuccessful: transaction.status === "success",
      isPending: transaction.status === "pending",
      isFailed: transaction.status === "failed",
      // Format dates
      paidAtFormatted: transaction.paidAt
        ? this.formatDate(transaction.paidAt, { includeTime: true })
        : null,
      // Add payment method info
      paymentMethodDisplay: this.getPaymentMethodDisplay(
        transaction.channel,
        transaction.authorization
      ),
    };
  }

  /**
   * Transform notification for API response
   */
  static transformNotification(notification: any): any {
    if (!notification) return null;

    return {
      ...notification,
      isRead: Boolean(notification.readAt),
      isDelivered: Boolean(notification.deliveredAt),
      timeAgo: this.formatRelativeTime(notification.createdAt),
      formattedCreatedAt: this.formatDate(notification.createdAt, {
        includeTime: true,
      }),
      icon: this.getNotificationIcon(notification.type),
      priority: notification.priority || "normal",
    };
  }

  /**
   * Transform database results to paginated response
   */
  static transformToPaginatedResponse<T>(
    items: T[],
    totalItems: number,
    currentPage: number,
    itemsPerPage: number,
    transformer?: (item: T) => any
  ): {
    items: any[];
    pagination: PaginationMeta;
  } {
    const transformedItems = transformer ? items.map(transformer) : items;

    const pagination: PaginationMeta = {
      currentPage,
      totalPages: Math.ceil(totalItems / itemsPerPage),
      totalItems,
      itemsPerPage,
      hasNextPage: currentPage < Math.ceil(totalItems / itemsPerPage),
      hasPreviousPage: currentPage > 1,
    };

    return {
      items: transformedItems,
      pagination,
    };
  }

  /**
   * Transform search results
   */
  static transformSearchResults(
    results: any,
    query: string,
    searchTime: number
  ): any {
    return {
      query,
      results:
        results.items?.map((item: any) => {
          // Highlight search terms in title and description
          return {
            ...item,
            highlightedTitle: this.highlightSearchTerms(
              item.name || item.title,
              query
            ),
            highlightedDescription: this.highlightSearchTerms(
              item.shortDescription || item.description,
              query
            ),
          };
        }) || [],
      pagination: results.pagination,
      searchMeta: {
        query,
        totalResults: results.pagination?.totalItems || 0,
        searchTime,
        suggestions: this.generateSearchSuggestions(query, results.items),
        didYouMean: this.generateDidYouMean(query),
      },
    };
  }

  // Helper methods
  private static normalizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return "";

    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("234") && cleaned.length === 13) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith("0") && cleaned.length === 11) {
      return `+234${cleaned.substring(1)}`;
    }

    return phoneNumber;
  }

  private static generateInitials(firstName: string, lastName: string): string {
    const first = firstName?.charAt(0)?.toUpperCase() || "";
    const last = lastName?.charAt(0)?.toUpperCase() || "";
    return `${first}${last}`;
  }

  private static calculateDiscountPercentage(
    price: number,
    comparePrice?: number
  ): number {
    if (!comparePrice || comparePrice <= price) return 0;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  }

  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  private static getStockStatus(
    quantity: number,
    threshold: number
  ): {
    status: string;
    label: string;
    color: string;
  } {
    if (quantity <= 0) {
      return { status: "out_of_stock", label: "Out of Stock", color: "red" };
    } else if (quantity <= threshold) {
      return { status: "low_stock", label: "Low Stock", color: "yellow" };
    } else {
      return { status: "in_stock", label: "In Stock", color: "green" };
    }
  }

  private static transformProductImage(image: any): any {
    return {
      ...image,
      thumbnailUrl: image.imageUrl, // In production, generate thumbnail URLs
      fullUrl: image.imageUrl,
      isValid: Boolean(image.imageUrl),
    };
  }

  private static generateProductBreadcrumbs(category: any): any[] {
    const breadcrumbs = [];
    let current = category;

    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug,
        url: `/categories/${current.slug}`,
      });
      current = current.parent;
    }

    return [{ name: "Home", url: "/" }, ...breadcrumbs];
  }

  private static canOrderBeCancelled(status: string, createdAt: Date): boolean {
    const hoursSinceCreation =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return ["pending", "confirmed"].includes(status) && hoursSinceCreation < 24;
  }

  private static transformOrderItem(item: any): any {
    return {
      ...item,
      formattedUnitPrice: this.formatCurrency(item.unitPrice),
      formattedTotalPrice: this.formatCurrency(item.totalPrice),
      productUrl: `/products/${item.product?.slug}`,
      canReview: true, // Logic for review eligibility
    };
  }

  private static transformCartItem(item: any): any {
    return {
      ...item,
      formattedUnitPrice: this.formatCurrency(item.unitPrice),
      formattedTotalPrice: this.formatCurrency(item.totalPrice),
      isAvailable:
        item.product?.inStock && item.quantity <= item.product?.stockQuantity,
      maxQuantity: Math.min(99, item.product?.stockQuantity || 0),
      productUrl: `/products/${item.product?.slug}`,
    };
  }

  private static generateOrderTimeline(order: any): any[] {
    const timeline = [
      {
        status: "pending",
        label: "Order Placed",
        date: order.createdAt,
        completed: true,
      },
    ];

    if (order.paidAt) {
      timeline.push({
        status: "paid",
        label: "Payment Confirmed",
        date: order.paidAt,
        completed: true,
      });
    }

    if (order.shippedAt) {
      timeline.push({
        status: "shipped",
        label: "Order Shipped",
        date: order.shippedAt,
        completed: true,
      });
    }

    if (order.deliveredAt) {
      timeline.push({
        status: "delivered",
        label: "Order Delivered",
        date: order.deliveredAt,
        completed: true,
      });
    }

    return timeline;
  }

  private static calculateStockPercentage(
    current: number,
    max: number
  ): number {
    if (max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  }

  private static formatFullAddress(address: any): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.postalCode,
    ].filter(Boolean);

    return parts.join(", ");
  }

  private static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, "");

    if (cleaned.startsWith("234") && cleaned.length === 13) {
      return `+234 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
    }

    return phoneNumber;
  }

  private static generateAddressDisplayName(address: any): string {
    return `${address.type} - ${address.city}, ${address.state}`;
  }

  private static getPaymentMethodDisplay(
    channel: string,
    authorization: any
  ): string {
    switch (channel) {
      case "card":
        return `**** **** **** ${authorization?.last4 || "****"}`;
      case "bank":
        return `Bank Transfer - ${authorization?.bank || "Bank"}`;
      case "ussd":
        return "USSD Payment";
      default:
        return channel.toUpperCase();
    }
  }

  private static getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      order_confirmation: "📦",
      order_shipped: "🚚",
      order_delivered: "✅",
      payment_successful: "💳",
      low_stock_alert: "⚠️",
      welcome_series: "👋",
      promotional: "🎉",
    };

    return iconMap[type] || "📢";
  }

  private static formatDate(
    date: Date | string,
    options: { includeTime?: boolean } = {}
  ): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: "Africa/Lagos",
      dateStyle: "medium",
    };

    if (options.includeTime) {
      formatOptions.timeStyle = "short";
    }

    return new Intl.DateTimeFormat("en-NG", formatOptions).format(dateObj);
  }

  private static formatRelativeTime(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - dateObj.getTime()) / 1000
    );

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;

    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  }

  private static highlightSearchTerms(text: string, query: string): string {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
  }

  private static generateSearchSuggestions(
    query: string,
    results: any[]
  ): string[] {
    // Simple implementation - in production, use more sophisticated algorithms
    const suggestions = results
      .slice(0, 5)
      .map((item) => item.name || item.title)
      .filter((name) => name && name.toLowerCase() !== query.toLowerCase());

    return [...new Set(suggestions)];
  }

  private static generateDidYouMean(query: string): string | null {
    // Simple implementation - in production, use Levenshtein distance or similar
    const commonTerms = ["phone", "laptop", "shirt", "shoes", "bag"];
    const lowerQuery = query.toLowerCase();

    for (const term of commonTerms) {
      if (this.calculateSimilarity(lowerQuery, term) > 0.6) {
        return term;
      }
    }

    return null;
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export default DataTransformers;
