"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
const BaseController_1 = require("../BaseController");
class UploadController extends BaseController_1.BaseController {
    fileUploadService;
    imageProcessingService;
    constructor(fileUploadService, imageProcessingService) {
        super();
        this.fileUploadService = fileUploadService;
        this.imageProcessingService = imageProcessingService;
    }
    /**
     * Upload single file
     * POST /api/v1/upload/single
     */
    uploadSingle = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!req.file) {
                this.sendError(res, "No file uploaded", 400, "NO_FILE");
                return;
            }
            // Validate file
            const validation = this.validateFile(req.file);
            if (!validation.isValid) {
                this.sendError(res, validation.error || "Invalid file", 400, "INVALID_FILE");
                return;
            }
            const uploadResult = await this.fileUploadService.uploadFile(req.file, {
                folder: req.body.folder || "general",
            });
            this.logAction("FILE_UPLOADED", userId, "FILE", uploadResult.original.publicId, {
                filename: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                folder: req.body.folder || "general",
            });
            this.sendSuccess(res, uploadResult, "File uploaded successfully", 201);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Upload multiple files
     * POST /api/v1/upload/multiple
     */
    uploadMultiple = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const files = req.files;
            if (!files || files.length === 0) {
                this.sendError(res, "No files uploaded", 400, "NO_FILES");
                return;
            }
            // Validate all files
            const validationErrors = [];
            files.forEach((file, index) => {
                const validation = this.validateFile(file);
                if (!validation.isValid) {
                    validationErrors.push(`File ${index + 1}: ${validation.error}`);
                }
            });
            if (validationErrors.length > 0) {
                this.sendError(res, "File validation failed", 400, "INVALID_FILES", validationErrors);
                return;
            }
            const uploadResults = await this.fileUploadService.uploadMultipleFiles(files, {
                folder: req.body.folder || "general",
            });
            this.logAction("MULTIPLE_FILES_UPLOADED", userId, "FILES", undefined, {
                fileCount: files.length,
                totalSize: files.reduce((sum, file) => sum + file.size, 0),
                folder: req.body.folder || "general",
            });
            this.sendSuccess(res, {
                files: uploadResults,
                count: uploadResults.length,
            }, `${uploadResults.length} file(s) uploaded successfully`, 201);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Upload product images
     * POST /api/v1/upload/product-images
     */
    uploadProductImages = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId || !this.hasRole(req, "admin")) {
                this.sendError(res, "Admin access required", 403, "FORBIDDEN");
                return;
            }
            const files = req.files;
            const { productId } = req.body;
            if (!files || files.length === 0) {
                this.sendError(res, "No images uploaded", 400, "NO_FILES");
                return;
            }
            if (!productId) {
                this.sendError(res, "Product ID is required", 400, "MISSING_PRODUCT_ID");
                return;
            }
            // Validate image files
            const validationErrors = [];
            files.forEach((file, index) => {
                const validation = this.validateImageFile(file);
                if (!validation.isValid) {
                    validationErrors.push(`Image ${index + 1}: ${validation.error}`);
                }
            });
            if (validationErrors.length > 0) {
                this.sendError(res, "Image validation failed", 400, "INVALID_IMAGES", validationErrors);
                return;
            }
            const processedImages = await Promise.all(files.map(async (file) => {
                const imageSet = await this.imageProcessingService.createProductImageSet(file.buffer);
                return {
                    original: imageSet.original,
                    thumbnail: imageSet.thumbnail,
                    variants: [imageSet.large, imageSet.medium, imageSet.small],
                };
            }));
            this.logAction("PRODUCT_IMAGES_UPLOADED", userId, "PRODUCT", productId, {
                imageCount: files.length,
                totalSize: files.reduce((sum, file) => sum + file.size, 0),
            });
            this.sendSuccess(res, {
                images: processedImages,
                count: processedImages.length,
                productId,
            }, `${processedImages.length} product image(s) uploaded successfully`, 201);
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Upload user avatar
     * POST /api/v1/upload/avatar
     */
    uploadAvatar = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!req.file) {
                this.sendError(res, "No avatar image uploaded", 400, "NO_FILE");
                return;
            }
            // Validate avatar image
            const validation = this.validateAvatarFile(req.file);
            if (!validation.isValid) {
                this.sendError(res, validation.error || "Invalid avatar", 400, "INVALID_AVATAR");
                return;
            }
            const processedAvatar = await this.imageProcessingService.processImage(req.file.buffer, {
                resize: { width: 400, height: 400 },
                format: "webp",
                quality: 85,
            });
            this.logAction("AVATAR_UPLOADED", userId, "USER", userId, {
                originalSize: req.file.size,
                processedSize: processedAvatar.size,
            });
            this.sendSuccess(res, {
                url: "", // This would come from cloud storage
                width: processedAvatar.width,
                height: processedAvatar.height,
                size: processedAvatar.size,
                format: processedAvatar.format
            }, "Avatar uploaded successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get file by ID
     * GET /api/v1/upload/file/:fileId
     */
    getFile = async (req, res) => {
        try {
            const { fileId } = req.params;
            const { size, format } = req.query;
            if (!fileId) {
                this.sendError(res, "File ID is required", 400, "MISSING_FILE_ID");
                return;
            }
            const file = await this.fileUploadService.getFileInfo(fileId);
            if (!file) {
                this.sendError(res, "File not found", 404, "FILE_NOT_FOUND");
                return;
            }
            this.sendSuccess(res, file, "File retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Delete file
     * DELETE /api/v1/upload/file/:fileId
     */
    deleteFile = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            const { fileId } = req.params;
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            if (!fileId) {
                this.sendError(res, "File ID is required", 400, "MISSING_FILE_ID");
                return;
            }
            const result = await this.fileUploadService.deleteFile(fileId);
            if (!result) {
                this.sendError(res, "Failed to delete file", 404, "FILE_DELETE_FAILED");
                return;
            }
            this.logAction("FILE_DELETED", userId, "FILE", fileId);
            this.sendSuccess(res, null, "File deleted successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get user's uploaded files
     * GET /api/v1/upload/user-files
     */
    getUserFiles = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const { page, limit } = this.parsePaginationParams(req.query);
            const folder = req.query.folder;
            const fileType = req.query.type;
            // For now, return empty results as the method doesn't exist in FileUploadService
            // This would need to be implemented in the service layer
            const result = {
                files: [],
                pagination: {
                    page: page,
                    limit: limit,
                    total: 0,
                    totalPages: 0,
                    hasNext: false,
                    hasPrev: false,
                },
            };
            this.sendPaginatedResponse(res, result.files, result.pagination, "User files retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Get upload statistics
     * GET /api/v1/upload/stats
     */
    getUploadStats = async (req, res) => {
        try {
            const userId = this.getUserId(req);
            if (!userId) {
                this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
                return;
            }
            const stats = await this.fileUploadService.getUploadStats();
            this.sendSuccess(res, stats, "Upload statistics retrieved successfully");
        }
        catch (error) {
            this.handleError(error, req, res);
        }
    };
    /**
     * Validate general file upload
     */
    validateFile(file) {
        // Check file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            return { isValid: false, error: "File size cannot exceed 10MB" };
        }
        // Check file type
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return { isValid: false, error: "Unsupported file type" };
        }
        return { isValid: true };
    }
    /**
     * Validate image file for products
     */
    validateImageFile(file) {
        // Check file size (5MB limit for images)
        if (file.size > 5 * 1024 * 1024) {
            return { isValid: false, error: "Image size cannot exceed 5MB" };
        }
        // Check image type
        const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedImageTypes.includes(file.mimetype)) {
            return {
                isValid: false,
                error: "Only JPEG, PNG, and WebP images are allowed",
            };
        }
        return { isValid: true };
    }
    /**
     * Validate avatar file
     */
    validateAvatarFile(file) {
        // Check file size (2MB limit for avatars)
        if (file.size > 2 * 1024 * 1024) {
            return { isValid: false, error: "Avatar image size cannot exceed 2MB" };
        }
        // Check image type
        const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedImageTypes.includes(file.mimetype)) {
            return {
                isValid: false,
                error: "Only JPEG, PNG, and WebP images are allowed for avatars",
            };
        }
        return { isValid: true };
    }
}
exports.UploadController = UploadController;
//# sourceMappingURL=UploadController.js.map