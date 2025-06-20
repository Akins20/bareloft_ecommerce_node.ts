import { BaseService } from "../BaseService";
import { CloudStorageService } from "./CloudStorageService";
import { ImageProcessingService } from "./ImageProcessingService";
import { FileUpload, UploadedFile } from "../../types";
export interface UploadOptions {
    folder?: string;
    resize?: {
        width?: number;
        height?: number;
        quality?: number;
    };
    generateThumbnail?: boolean;
    allowedTypes?: string[];
    maxSize?: number;
}
export interface UploadResult {
    original: UploadedFile;
    thumbnail?: UploadedFile;
    variants?: UploadedFile[];
}
export declare class FileUploadService extends BaseService {
    private cloudStorage;
    private imageProcessor;
    constructor(cloudStorage: CloudStorageService, imageProcessor: ImageProcessingService);
    /**
     * Upload single file
     */
    uploadFile(file: FileUpload, options?: UploadOptions): Promise<UploadResult>;
    /**
     * Upload multiple files
     */
    uploadMultipleFiles(files: FileUpload[], options?: UploadOptions): Promise<UploadResult[]>;
    /**
     * Upload product images with variants
     */
    uploadProductImages(files: FileUpload[]): Promise<{
        images: UploadResult[];
        primaryImage?: UploadResult;
    }>;
    /**
     * Upload user avatar
     */
    uploadUserAvatar(file: FileUpload): Promise<UploadedFile>;
    /**
     * Upload category image
     */
    uploadCategoryImage(file: FileUpload): Promise<UploadedFile>;
    /**
     * Delete uploaded file
     */
    deleteFile(publicId: string): Promise<boolean>;
    /**
     * Delete multiple files
     */
    deleteMultipleFiles(publicIds: string[]): Promise<{
        deleted: number;
        failed: number;
    }>;
    /**
     * Get file info
     */
    getFileInfo(publicId: string): Promise<{
        url: string;
        size: number;
        format: string;
        width?: number;
        height?: number;
        createdAt: Date;
    } | null>;
    /**
     * Validate uploaded file
     */
    private validateFile;
    /**
     * Generate unique filename
     */
    private generateUniqueFilename;
    /**
     * Add suffix to filename
     */
    private addSuffixToFilename;
    /**
     * Check if file is an image
     */
    private isImageFile;
    /**
     * Check for potentially malicious files
     */
    private isPotentiallyMalicious;
    /**
     * Generate product image variants
     */
    private generateProductImageVariants;
    /**
     * Get upload statistics
     */
    getUploadStats(): Promise<{
        totalFiles: number;
        totalSize: number;
        filesByType: Record<string, number>;
        storageUsed: string;
    }>;
    /**
     * Clean up orphaned files (files not referenced in database)
     */
    cleanupOrphanedFiles(): Promise<{
        scanned: number;
        deleted: number;
        errors: number;
    }>;
}
//# sourceMappingURL=FileUploadService.d.ts.map