"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageProcessingService = void 0;
const BaseService_1 = require("../BaseService");
const types_1 = require("../../types");
const sharp_1 = __importDefault(require("sharp"));
class ImageProcessingService extends BaseService_1.BaseService {
    constructor() {
        super();
    }
    /**
     * Process image with various options
     */
    async processImage(imageBuffer, options = {}) {
        try {
            let pipeline = (0, sharp_1.default)(imageBuffer);
            // Resize if specified
            if (options.resize) {
                pipeline = pipeline.resize({
                    width: options.resize.width,
                    height: options.resize.height,
                    fit: options.resize.fit || "cover",
                    withoutEnlargement: true,
                });
            }
            // Apply filters
            if (options.blur) {
                pipeline = pipeline.blur(options.blur);
            }
            if (options.sharpen) {
                pipeline = pipeline.sharpen();
            }
            if (options.grayscale) {
                pipeline = pipeline.grayscale();
            }
            // Remove background (experimental)
            if (options.removeBackground) {
                pipeline = pipeline.removeAlpha();
            }
            // Add watermark
            if (options.watermark) {
                pipeline = await this.addWatermark(pipeline, options.watermark);
            }
            // Set format and quality
            const format = options.format || "webp";
            const quality = options.quality || 80;
            switch (format) {
                case "jpeg":
                    pipeline = pipeline.jpeg({ quality, progressive: true });
                    break;
                case "png":
                    pipeline = pipeline.png({
                        quality,
                        compressionLevel: 9,
                        adaptiveFiltering: true,
                    });
                    break;
                case "webp":
                    pipeline = pipeline.webp({
                        quality,
                        effort: 6,
                        smartSubsample: true,
                    });
                    break;
                case "avif":
                    pipeline = pipeline.avif({ quality, effort: 9 });
                    break;
                default:
                    pipeline = pipeline.webp({ quality });
            }
            // Execute processing
            const processedBuffer = await pipeline.toBuffer();
            const metadata = await (0, sharp_1.default)(processedBuffer).metadata();
            return {
                buffer: processedBuffer,
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format || format,
                size: processedBuffer.length,
            };
        }
        catch (error) {
            this.handleError("Error processing image", error);
            throw new types_1.AppError("Failed to process image", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    /**
     * Generate thumbnail
     */
    async generateThumbnail(imageBuffer, options = {
        width: 300,
        height: 300,
    }) {
        try {
            return await (0, sharp_1.default)(imageBuffer)
                .resize(options.width, options.height, {
                fit: "cover",
                position: "center",
            })
                .webp({ quality: options.quality || 75 })
                .toBuffer();
        }
        catch (error) {
            this.handleError("Error generating thumbnail", error);
            throw error;
        }
    }
    /**
     * Create multiple image variants (for responsive images)
     */
    async createImageVariants(imageBuffer, variants) {
        try {
            const results = {};
            for (const variant of variants) {
                const processed = await this.processImage(imageBuffer, {
                    resize: {
                        width: variant.width,
                        height: variant.height ?? variant.width,
                        fit: "cover",
                    },
                    format: "webp",
                    quality: variant.quality || 80,
                });
                results[variant.name] = processed;
            }
            return results;
        }
        catch (error) {
            this.handleError("Error creating image variants", error);
            throw error;
        }
    }
    /**
     * Optimize image for web (auto-format selection)
     */
    async optimizeForWeb(imageBuffer, targetSize // Target file size in bytes
    ) {
        try {
            const metadata = await this.getImageMetadata(imageBuffer);
            let quality = 85;
            let format = "webp";
            // Choose format based on image characteristics
            if (metadata.hasAlpha) {
                format = "webp"; // WebP handles transparency better
            }
            else if (metadata.format === "jpeg") {
                format = "webp"; // WebP is usually smaller than JPEG
            }
            // If target size is specified, adjust quality
            if (targetSize) {
                quality = await this.findOptimalQuality(imageBuffer, format, targetSize);
            }
            return await this.processImage(imageBuffer, {
                format,
                quality,
                sharpen: true,
            });
        }
        catch (error) {
            this.handleError("Error optimizing image for web", error);
            throw error;
        }
    }
    /**
     * Get image metadata
     */
    async getImageMetadata(imageBuffer) {
        try {
            const metadata = await (0, sharp_1.default)(imageBuffer).metadata();
            return {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format || "unknown",
                size: imageBuffer.length,
                hasAlpha: metadata.hasAlpha || false,
                channels: metadata.channels || 3,
                density: metadata.density ?? 72,
                isAnimated: metadata.pages ? metadata.pages > 1 : false,
            };
        }
        catch (error) {
            this.handleError("Error getting image metadata", error);
            throw error;
        }
    }
    /**
     * Validate image file
     */
    async validateImage(imageBuffer) {
        try {
            const metadata = await this.getImageMetadata(imageBuffer);
            // Check minimum dimensions
            if (metadata.width < 50 || metadata.height < 50) {
                return {
                    isValid: false,
                    error: "Image dimensions too small (minimum 50x50)",
                };
            }
            // Check maximum dimensions
            if (metadata.width > 5000 || metadata.height > 5000) {
                return {
                    isValid: false,
                    error: "Image dimensions too large (maximum 5000x5000)",
                };
            }
            // Check file size (50MB max)
            if (metadata.size > 50 * 1024 * 1024) {
                return {
                    isValid: false,
                    error: "Image file size too large (maximum 50MB)",
                };
            }
            return {
                isValid: true,
                metadata,
            };
        }
        catch (error) {
            return {
                isValid: false,
                error: "Invalid image file or unsupported format",
            };
        }
    }
    /**
     * Create product image set (multiple sizes for e-commerce)
     */
    async createProductImageSet(imageBuffer) {
        try {
            const variants = await this.createImageVariants(imageBuffer, [
                { name: "original", width: 1200, height: 1200, quality: 90 },
                { name: "large", width: 800, height: 800, quality: 85 },
                { name: "medium", width: 500, height: 500, quality: 80 },
                { name: "small", width: 300, height: 300, quality: 75 },
                { name: "thumbnail", width: 150, height: 150, quality: 70 },
            ]);
            return {
                original: variants.original || variants.large,
                large: variants.large,
                medium: variants.medium,
                small: variants.small,
                thumbnail: variants.thumbnail,
            };
        }
        catch (error) {
            this.handleError("Error creating product image set", error);
            throw error;
        }
    }
    /**
     * Convert image to different formats
     */
    async convertFormat(imageBuffer, targetFormat, quality = 80) {
        try {
            return await this.processImage(imageBuffer, {
                format: targetFormat,
                quality,
            });
        }
        catch (error) {
            this.handleError("Error converting image format", error);
            throw error;
        }
    }
    /**
     * Crop image to specific dimensions
     */
    async cropImage(imageBuffer, cropOptions) {
        try {
            const processedBuffer = await (0, sharp_1.default)(imageBuffer)
                .extract(cropOptions)
                .webp({ quality: 85 })
                .toBuffer();
            const metadata = await (0, sharp_1.default)(processedBuffer).metadata();
            return {
                buffer: processedBuffer,
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format || "webp",
                size: processedBuffer.length,
            };
        }
        catch (error) {
            this.handleError("Error cropping image", error);
            throw error;
        }
    }
    /**
     * Auto-enhance image (brightness, contrast, saturation)
     */
    async autoEnhance(imageBuffer) {
        try {
            return await this.processImage(imageBuffer, {
                sharpen: true,
                format: "webp",
                quality: 85,
            });
        }
        catch (error) {
            this.handleError("Error auto-enhancing image", error);
            throw error;
        }
    }
    // Private helper methods
    /**
     * Add watermark to image pipeline
     */
    async addWatermark(pipeline, watermark) {
        try {
            if (watermark.text) {
                // Text watermark
                const textSvg = `
          <svg width="200" height="50">
            <text x="10" y="30" font-family="Arial" font-size="20" fill="white" opacity="${watermark.opacity || 0.5}">
              ${watermark.text}
            </text>
          </svg>
        `;
                const textBuffer = Buffer.from(textSvg);
                const position = this.getWatermarkPosition(watermark.position || "bottom-right");
                return pipeline.composite([
                    {
                        input: textBuffer,
                        ...position,
                    },
                ]);
            }
            else if (watermark.image) {
                // Image watermark
                const position = this.getWatermarkPosition(watermark.position || "bottom-right");
                return pipeline.composite([
                    {
                        input: watermark.image,
                        ...position,
                    },
                ]);
            }
            return pipeline;
        }
        catch (error) {
            this.handleError("Error adding watermark", error);
            return pipeline;
        }
    }
    /**
     * Get watermark position coordinates
     */
    getWatermarkPosition(position) {
        const positions = {
            "top-left": "northwest",
            "top-right": "northeast",
            "bottom-left": "southwest",
            "bottom-right": "southeast",
            center: "center",
        };
        return { gravity: positions[position] || "southeast" };
    }
    /**
     * Find optimal quality for target file size
     */
    async findOptimalQuality(imageBuffer, format, targetSize) {
        try {
            let quality = 85;
            let attempt = 0;
            const maxAttempts = 5;
            while (attempt < maxAttempts) {
                const testBuffer = await this.processImage(imageBuffer, {
                    format,
                    quality,
                });
                if (testBuffer.size <= targetSize || quality <= 20) {
                    break;
                }
                // Reduce quality for next attempt
                quality = Math.max(20, quality - 15);
                attempt++;
            }
            return quality;
        }
        catch (error) {
            this.handleError("Error finding optimal quality", error);
            return 60; // Fallback quality
        }
    }
    /**
     * Calculate image compression ratio
     */
    async calculateCompressionRatio(originalBuffer, compressedBuffer) {
        const originalSize = originalBuffer.length;
        const compressedSize = compressedBuffer.length;
        const ratio = (1 - compressedSize / originalSize) * 100;
        return Math.round(ratio * 100) / 100;
    }
    /**
     * Get processing statistics
     */
    async getProcessingStats() {
        try {
            // This would typically come from your analytics/logging system
            return {
                totalProcessed: 0,
                averageProcessingTime: 0,
                averageCompressionRatio: 0,
                formatDistribution: {},
            };
        }
        catch (error) {
            this.handleError("Error getting processing statistics", error);
            return {
                totalProcessed: 0,
                averageProcessingTime: 0,
                averageCompressionRatio: 0,
                formatDistribution: {},
            };
        }
    }
}
exports.ImageProcessingService = ImageProcessingService;
//# sourceMappingURL=ImageProcessingService.js.map