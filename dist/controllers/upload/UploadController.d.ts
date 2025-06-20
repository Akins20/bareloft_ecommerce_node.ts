import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { FileUploadService } from "../../services/upload/FileUploadService";
import { ImageProcessingService } from "../../services/upload/ImageProcessingService";
import { AuthenticatedRequest } from "../../types/auth.types";
export declare class UploadController extends BaseController {
    private fileUploadService;
    private imageProcessingService;
    constructor(fileUploadService: FileUploadService, imageProcessingService: ImageProcessingService);
    /**
     * Upload single file
     * POST /api/v1/upload/single
     */
    uploadSingle: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Upload multiple files
     * POST /api/v1/upload/multiple
     */
    uploadMultiple: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Upload product images
     * POST /api/v1/upload/product-images
     */
    uploadProductImages: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Upload user avatar
     * POST /api/v1/upload/avatar
     */
    uploadAvatar: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get file by ID
     * GET /api/v1/upload/file/:fileId
     */
    getFile: (req: Request, res: Response) => Promise<void>;
    /**
     * Delete file
     * DELETE /api/v1/upload/file/:fileId
     */
    deleteFile: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get user's uploaded files
     * GET /api/v1/upload/user-files
     */
    getUserFiles: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Get upload statistics
     * GET /api/v1/upload/stats
     */
    getUploadStats: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * Validate general file upload
     */
    private validateFile;
    /**
     * Validate image file for products
     */
    private validateImageFile;
    /**
     * Validate avatar file
     */
    private validateAvatarFile;
}
//# sourceMappingURL=UploadController.d.ts.map