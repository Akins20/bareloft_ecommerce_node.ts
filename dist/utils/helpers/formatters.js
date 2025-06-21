"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFormatters = void 0;
/**
 * Data formatting utilities for consistent API responses
 */
class DataFormatters {
    /**
     * Format currency amounts to Naira
     */
    static formatCurrency(amount, options = {}) {
        const { showSymbol = true, precision = 2, locale = "en-NG" } = options;
        if (isNaN(amount) || amount < 0) {
            return showSymbol ? "₦0.00" : "0.00";
        }
        const formatted = new Intl.NumberFormat(locale, {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
        }).format(amount);
        return showSymbol ? `₦${formatted}` : formatted;
    }
    /**
     * Format price for Paystack (convert to kobo)
     */
    static formatPriceForPaystack(nairaAmount) {
        if (isNaN(nairaAmount) || nairaAmount < 0) {
            return 0;
        }
        // Convert Naira to kobo (multiply by 100)
        return Math.round(nairaAmount * 100);
    }
    /**
     * Format price from Paystack (convert from kobo)
     */
    static formatPriceFromPaystack(koboAmount) {
        if (isNaN(koboAmount) || koboAmount < 0) {
            return 0;
        }
        // Convert kobo to Naira (divide by 100)
        return Math.round((koboAmount / 100) * 100) / 100; // Round to 2 decimal places
    }
    /**
     * Format phone number for display
     */
    static formatPhoneNumber(phoneNumber) {
        if (!phoneNumber)
            return "";
        // Remove all non-numeric characters
        const cleaned = phoneNumber.replace(/\D/g, "");
        // Format based on length
        if (cleaned.startsWith("234") && cleaned.length === 13) {
            // +234 XXX XXX XXXX
            return `+234 ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
        }
        else if (cleaned.startsWith("0") && cleaned.length === 11) {
            // 0XXX XXX XXXX
            return `${cleaned.substring(0, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
        }
        return phoneNumber; // Return original if format not recognized
    }
    /**
     * Format date for Nigerian timezone
     */
    static formatDate(date, options = {}) {
        const { includeTime = false, format = "medium", timezone = "Africa/Lagos", } = options;
        if (!date)
            return "";
        const dateObj = typeof date === "string" ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) {
            return "";
        }
        const formatOptions = {
            timeZone: timezone,
            dateStyle: format,
        };
        if (includeTime) {
            formatOptions.timeStyle = "short";
        }
        return new Intl.DateTimeFormat("en-NG", formatOptions).format(dateObj);
    }
    /**
     * Format relative time (e.g., "2 hours ago")
     */
    static formatRelativeTime(date) {
        if (!date)
            return "";
        const dateObj = typeof date === "string" ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) {
            return "";
        }
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
        // Define time intervals in seconds
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
        };
        // If less than a minute
        if (diffInSeconds < 60) {
            return "Just now";
        }
        // Find the appropriate interval
        for (const [unit, seconds] of Object.entries(intervals)) {
            const interval = Math.floor(diffInSeconds / seconds);
            if (interval >= 1) {
                return `${interval} ${unit}${interval !== 1 ? "s" : ""} ago`;
            }
        }
        return "Just now";
    }
    /**
     * Format file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0)
            return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }
    /**
     * Format pagination metadata
     */
    static formatPaginationMeta(totalItems, currentPage, itemsPerPage) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        return {
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
        };
    }
    /**
     * Format Nigerian address
     */
    static formatAddress(address) {
        const parts = [
            address.addressLine1,
            address.addressLine2,
            address.city,
            address.state,
            address.postalCode,
            address.country || "Nigeria",
        ].filter(Boolean);
        return parts.join(", ");
    }
    /**
     * Format order number
     */
    static formatOrderNumber(orderNumber) {
        if (!orderNumber)
            return "";
        // Ensure it starts with prefix
        if (!orderNumber.startsWith("BL")) {
            return `BL${orderNumber}`;
        }
        return orderNumber.toUpperCase();
    }
    /**
     * Format product SKU
     */
    static formatSKU(sku) {
        if (!sku)
            return "";
        return sku.toUpperCase().replace(/[^A-Z0-9\-_]/g, "");
    }
    /**
     * Format percentage
     */
    static formatPercentage(value, options = {}) {
        const { precision = 1, showSign = false } = options;
        if (isNaN(value))
            return "0%";
        const formatted = value.toFixed(precision);
        const sign = showSign && value > 0 ? "+" : "";
        return `${sign}${formatted}%`;
    }
    /**
     * Format inventory status
     */
    static formatInventoryStatus(quantity, lowStockThreshold = 10) {
        if (quantity <= 0) {
            return {
                status: "out_of_stock",
                label: "Out of Stock",
                color: "red",
            };
        }
        else if (quantity <= lowStockThreshold) {
            return {
                status: "low_stock",
                label: `Low Stock (${quantity} left)`,
                color: "yellow",
            };
        }
        else {
            return {
                status: "in_stock",
                label: `In Stock (${quantity})`,
                color: "green",
            };
        }
    }
    /**
     * Format weight
     */
    static formatWeight(weightInKg) {
        if (isNaN(weightInKg) || weightInKg <= 0) {
            return "0 kg";
        }
        if (weightInKg < 1) {
            return `${Math.round(weightInKg * 1000)}g`;
        }
        return `${weightInKg.toFixed(1)}kg`;
    }
    /**
     * Format dimensions
     */
    static formatDimensions(dimensions) {
        const { length, width, height, unit = "cm" } = dimensions;
        if (!length || !width || !height) {
            return "Not specified";
        }
        return `${length} × ${width} × ${height} ${unit}`;
    }
    /**
     * Format rating
     */
    static formatRating(rating, maxRating = 5) {
        if (isNaN(rating) || rating < 0) {
            return "0.0";
        }
        const clampedRating = Math.min(rating, maxRating);
        return clampedRating.toFixed(1);
    }
    /**
     * Format discount percentage
     */
    static formatDiscountPercentage(originalPrice, salePrice) {
        if (originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
            return "";
        }
        const discount = ((originalPrice - salePrice) / originalPrice) * 100;
        return `${Math.round(discount)}% OFF`;
    }
    /**
     * Truncate text with ellipsis
     */
    static truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength - 3) + "...";
    }
    /**
     * Format API response
     */
    static formatApiResponse(data, message = "Success", meta) {
        return {
            success: true,
            message,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta,
            },
        };
    }
    /**
     * Format error response
     */
    static formatErrorResponse(message, code, details) {
        return {
            success: false,
            message,
            error: {
                code,
                ...(details && { details }),
            },
            meta: {
                timestamp: new Date().toISOString(),
            },
        };
    }
}
exports.DataFormatters = DataFormatters;
exports.default = DataFormatters;
//# sourceMappingURL=formatters.js.map