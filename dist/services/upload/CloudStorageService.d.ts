import { BaseService } from "../BaseService";
import { UploadedFile } from "../../types";
export interface StorageProvider {
    name: string;
    uploadBuffer(buffer: Buffer, path: string, mimetype: string): Promise<UploadedFile>;
    deleteFile(publicId: string): Promise<boolean>;
    getFileInfo(publicId: string): Promise<any>;
    getSignedUrl(publicId: string, expiresIn?: number): Promise<string>;
}
export declare class CloudStorageService extends BaseService {
    private provider;
    constructor();
    /**
     * Initialize storage provider based on configuration
     */
    private initializeProvider;
    /**
     * Upload buffer to cloud storage
     */
    uploadBuffer(buffer: Buffer, path: string, mimetype: string): Promise<UploadedFile>;
    /**
     * Delete file from cloud storage
     */
    deleteFile(publicId: string): Promise<boolean>;
    /**
     * Get file information
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
     * Get signed URL for secure access
     */
    getSignedUrl(publicId: string, expiresIn?: number): Promise<string>;
    /**
     * Generate optimized URLs for different image sizes
     */
    generateImageUrl(publicId: string, transformations?: {
        width?: number;
        height?: number;
        quality?: number;
        format?: string;
        crop?: string;
    }): string;
}
//# sourceMappingURL=CloudStorageService.d.ts.map