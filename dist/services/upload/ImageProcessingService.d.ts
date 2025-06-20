import { BaseService } from "../BaseService";
export interface ProcessImageOptions {
    resize?: {
        width?: number;
        height?: number;
        fit?: "cover" | "contain" | "fill" | "inside" | "outside";
    };
    format?: "jpeg" | "png" | "webp" | "avif";
    quality?: number;
    blur?: number;
    sharpen?: boolean;
    grayscale?: boolean;
    removeBackground?: boolean;
    watermark?: {
        text?: string;
        image?: Buffer;
        position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
        opacity?: number;
    };
}
export interface ProcessedImage {
    buffer: Buffer;
    width: number;
    height: number;
    format: string;
    size: number;
}
export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
    channels: number;
    density?: number;
    isAnimated?: boolean;
}
export declare class ImageProcessingService extends BaseService {
    constructor();
    /**
     * Process image with various options
     */
    processImage(imageBuffer: Buffer, options?: ProcessImageOptions): Promise<ProcessedImage>;
    /**
     * Generate thumbnail
     */
    generateThumbnail(imageBuffer: Buffer, options?: {
        width: number;
        height: number;
        quality?: number;
    }): Promise<Buffer>;
    /**
     * Create multiple image variants (for responsive images)
     */
    createImageVariants(imageBuffer: Buffer, variants: Array<{
        name: string;
        width: number;
        height?: number;
        quality?: number;
    }>): Promise<Record<string, ProcessedImage>>;
    /**
     * Optimize image for web (auto-format selection)
     */
    optimizeForWeb(imageBuffer: Buffer, targetSize?: number): Promise<ProcessedImage>;
    /**
     * Get image metadata
     */
    getImageMetadata(imageBuffer: Buffer): Promise<ImageMetadata>;
    /**
     * Validate image file
     */
    validateImage(imageBuffer: Buffer): Promise<{
        isValid: boolean;
        error?: string;
        metadata?: ImageMetadata;
    }>;
    /**
     * Create product image set (multiple sizes for e-commerce)
     */
    createProductImageSet(imageBuffer: Buffer): Promise<{
        original: ProcessedImage;
        large: ProcessedImage;
        medium: ProcessedImage;
        small: ProcessedImage;
        thumbnail: ProcessedImage;
    }>;
    /**
     * Convert image to different formats
     */
    convertFormat(imageBuffer: Buffer, targetFormat: "jpeg" | "png" | "webp" | "avif", quality?: number): Promise<ProcessedImage>;
    /**
     * Crop image to specific dimensions
     */
    cropImage(imageBuffer: Buffer, cropOptions: {
        left: number;
        top: number;
        width: number;
        height: number;
    }): Promise<ProcessedImage>;
    /**
     * Auto-enhance image (brightness, contrast, saturation)
     */
    autoEnhance(imageBuffer: Buffer): Promise<ProcessedImage>;
    /**
     * Add watermark to image pipeline
     */
    private addWatermark;
    /**
     * Get watermark position coordinates
     */
    private getWatermarkPosition;
    /**
     * Find optimal quality for target file size
     */
    private findOptimalQuality;
    /**
     * Calculate image compression ratio
     */
    calculateCompressionRatio(originalBuffer: Buffer, compressedBuffer: Buffer): Promise<number>;
    /**
     * Get processing statistics
     */
    getProcessingStats(): Promise<{
        totalProcessed: number;
        averageProcessingTime: number;
        averageCompressionRatio: number;
        formatDistribution: Record<string, number>;
    }>;
}
//# sourceMappingURL=ImageProcessingService.d.ts.map