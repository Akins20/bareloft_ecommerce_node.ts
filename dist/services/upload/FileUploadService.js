"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadService = void 0;
const BaseService_1 = require("../BaseService");
const types_1 = require("../../types");
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
class FileUploadService extends BaseService_1.BaseService {
    cloudStorage;
    imageProcessor;
    constructor(cloudStorage, imageProcessor) {
        super();
        this.cloudStorage = cloudStorage;
        this.imageProcessor = imageProcessor;
    }
    /**
     * Upload single file
     */
    async uploadFile(file, options = {}) {
        try {
            // Validate file
            this.validateFile(file, options);
            // Generate unique filename
            const filename = this.generateUniqueFilename(file.originalname);
            const folder = options.folder || "uploads";
            let result = {
                original: {
                    url: "",
                    publicId: "",
                    format: "",
                    size: file.size,
                },
            };
            // Check if it's an image
            const isImage = this.isImageFile(file.mimetype);
            if (isImage && (options.resize || options.generateThumbnail)) {
                // Process image
                const processedImage = await this.imageProcessor.processImage(file.buffer, {
                    resize: options.resize,
                    format: "webp",
                    quality: options.resize?.quality || 80,
                });
                // Upload processed image
                result.original = await this.cloudStorage.uploadBuffer(processedImage.buffer, `${folder}/${filename}`, "image/webp");
                // Generate thumbnail if requested
                if (options.generateThumbnail) {
                    const thumbnail = await this.imageProcessor.generateThumbnail(file.buffer, { width: 300, height: 300 });
                    const thumbnailFilename = this.addSuffixToFilename(filename, "_thumb");
                    result.thumbnail = await this.cloudStorage.uploadBuffer(thumbnail, `${folder}/thumbnails/${thumbnailFilename}`, "image/webp");
                }
                // Generate additional variants for product images
                if (folder === "products") {
                    result.variants = await this.generateProductImageVariants(file.buffer, filename, folder);
                }
            }
            else {
                // Upload file as-is
                result.original = await this.cloudStorage.uploadBuffer(file.buffer, `${folder}/${filename}`, file.mimetype);
            }
            return result;
        }
        catch (error) {
            this.handleError("Error uploading file", error);
            throw error;
        }
    }
    /**
     * Upload multiple files
     */
    async uploadMultipleFiles(files, options = {}) {
        try {
            const uploadPromises = files.map((file) => this.uploadFile(file, options));
            return await Promise.all(uploadPromises);
        }
        catch (error) {
            this.handleError("Error uploading multiple files", error);
            throw error;
        }
    }
    /**
     * Upload product images with variants
     */
    async uploadProductImages(files) {
        try {
            const uploadOptions = {
                folder: "products",
                resize: { width: 1200, height: 1200, quality: 85 },
                generateThumbnail: true,
                allowedTypes: types_1.CONSTANTS.ALLOWED_IMAGE_FORMATS,
                maxSize: types_1.CONSTANTS.MAX_FILE_SIZE,
            };
            const images = await this.uploadMultipleFiles(files, uploadOptions);
            return {
                images,
                primaryImage: images[0], // First image is primary
            };
        }
        catch (error) {
            this.handleError("Error uploading product images", error);
            throw error;
        }
    }
    /**
     * Upload user avatar
     */
    async uploadUserAvatar(file) {
        try {
            const options = {
                folder: "avatars",
                resize: { width: 400, height: 400, quality: 80 },
                allowedTypes: ["jpg", "jpeg", "png"],
                maxSize: 2 * 1024 * 1024, // 2MB
            };
            const result = await this.uploadFile(file, options);
            return result.original;
        }
        catch (error) {
            this.handleError("Error uploading user avatar", error);
            throw error;
        }
    }
    /**
     * Upload category image
     */
    async uploadCategoryImage(file) {
        try {
            const options = {
                folder: "categories",
                resize: { width: 800, height: 600, quality: 80 },
                generateThumbnail: true,
                allowedTypes: types_1.CONSTANTS.ALLOWED_IMAGE_FORMATS,
            };
            const result = await this.uploadFile(file, options);
            return result.original;
        }
        catch (error) {
            this.handleError("Error uploading category image", error);
            throw error;
        }
    }
    /**
     * Delete uploaded file
     */
    async deleteFile(publicId) {
        try {
            return await this.cloudStorage.deleteFile(publicId);
        }
        catch (error) {
            this.handleError("Error deleting file", error);
            return false;
        }
    }
    /**
     * Delete multiple files
     */
    async deleteMultipleFiles(publicIds) {
        try {
            const results = await Promise.allSettled(publicIds.map((id) => this.cloudStorage.deleteFile(id)));
            const deleted = results.filter((r) => r.status === "fulfilled" && r.value).length;
            const failed = results.length - deleted;
            return { deleted, failed };
        }
        catch (error) {
            this.handleError("Error deleting multiple files", error);
            return { deleted: 0, failed: publicIds.length };
        }
    }
    /**
     * Get file info
     */
    async getFileInfo(publicId) {
        try {
            return await this.cloudStorage.getFileInfo(publicId);
        }
        catch (error) {
            this.handleError("Error getting file info", error);
            return null;
        }
    }
    // Private helper methods
    /**
     * Validate uploaded file
     */
    validateFile(file, options) {
        // Check file size
        const maxSize = options.maxSize || types_1.CONSTANTS.MAX_FILE_SIZE;
        if (file.size > maxSize) {
            throw new types_1.AppError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`, types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
        }
        // Check file type
        if (options.allowedTypes) {
            const fileExt = path_1.default.extname(file.originalname).toLowerCase().slice(1);
            if (!options.allowedTypes.includes(fileExt)) {
                throw new types_1.AppError(`File type .${fileExt} is not allowed`, types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
            }
        }
        // Check for malicious files
        if (this.isPotentiallyMalicious(file)) {
            throw new types_1.AppError("File appears to be malicious", types_1.HTTP_STATUS.BAD_REQUEST, types_1.ERROR_CODES.VALIDATION_ERROR);
        }
    }
    /**
     * Generate unique filename
     */
    generateUniqueFilename(originalname) {
        const ext = path_1.default.extname(originalname);
        const name = path_1.default.basename(originalname, ext);
        const timestamp = Date.now();
        const random = crypto_1.default.randomBytes(8).toString("hex");
        // Sanitize filename
        const sanitizedName = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 50);
        return `${sanitizedName}-${timestamp}-${random}${ext}`;
    }
    /**
     * Add suffix to filename
     */
    addSuffixToFilename(filename, suffix) {
        const ext = path_1.default.extname(filename);
        const name = path_1.default.basename(filename, ext);
        return `${name}${suffix}${ext}`;
    }
    /**
     * Check if file is an image
     */
    isImageFile(mimetype) {
        return mimetype.startsWith("image/");
    }
    /**
     * Check for potentially malicious files
     */
    isPotentiallyMalicious(file) {
        const dangerousExtensions = [
            ".exe",
            ".bat",
            ".cmd",
            ".com",
            ".pif",
            ".scr",
            ".vbs",
            ".js",
            ".jar",
            ".php",
            ".asp",
            ".aspx",
            ".jsp",
            ".sh",
            ".ps1",
        ];
        const filename = file.originalname.toLowerCase();
        // Check for dangerous extensions
        if (dangerousExtensions.some((ext) => filename.endsWith(ext))) {
            return true;
        }
        // Check for double extensions (file.jpg.exe)
        const parts = filename.split(".");
        if (parts.length > 2) {
            const penultimateExt = `.${parts[parts.length - 2]}`;
            if (dangerousExtensions.includes(penultimateExt)) {
                return true;
            }
        }
        // Check file header for common malicious patterns
        const header = file.buffer.slice(0, 10).toString("hex");
        const maliciousHeaders = [
            "4d5a", // PE executable
            "504b0304", // ZIP (could contain malicious files)
        ];
        if (maliciousHeaders.some((pattern) => header.startsWith(pattern))) {
            return true;
        }
        return false;
    }
    /**
     * Generate product image variants
     */
    async generateProductImageVariants(buffer, filename, folder) {
        try {
            const variants = [];
            // Large variant (800x800)
            const large = await this.imageProcessor.processImage(buffer, {
                resize: { width: 800, height: 800 },
                format: "webp",
                quality: 85,
            });
            const largeFilename = this.addSuffixToFilename(filename, "_large");
            const largeUploaded = await this.cloudStorage.uploadBuffer(large.buffer, `${folder}/variants/${largeFilename}`, "image/webp");
            variants.push(largeUploaded);
            // Medium variant (500x500)
            const medium = await this.imageProcessor.processImage(buffer, {
                resize: { width: 500, height: 500 },
                format: "webp",
                quality: 80,
            });
            const mediumFilename = this.addSuffixToFilename(filename, "_medium");
            const mediumUploaded = await this.cloudStorage.uploadBuffer(medium.buffer, `${folder}/variants/${mediumFilename}`, "image/webp");
            variants.push(mediumUploaded);
            // Small variant (300x300)
            const small = await this.imageProcessor.processImage(buffer, {
                resize: { width: 300, height: 300 },
                format: "webp",
                quality: 75,
            });
            const smallFilename = this.addSuffixToFilename(filename, "_small");
            const smallUploaded = await this.cloudStorage.uploadBuffer(small.buffer, `${folder}/variants/${smallFilename}`, "image/webp");
            variants.push(smallUploaded);
            return variants;
        }
        catch (error) {
            this.handleError("Error generating product image variants", error);
            return [];
        }
    }
    /**
     * Get upload statistics
     */
    async getUploadStats() {
        try {
            // This would typically query your database for upload statistics
            // For now, return placeholder data
            return {
                totalFiles: 0,
                totalSize: 0,
                filesByType: {},
                storageUsed: "0MB",
            };
        }
        catch (error) {
            this.handleError("Error getting upload statistics", error);
            return {
                totalFiles: 0,
                totalSize: 0,
                filesByType: {},
                storageUsed: "0MB",
            };
        }
    }
    /**
     * Clean up orphaned files (files not referenced in database)
     */
    async cleanupOrphanedFiles() {
        try {
            // This would scan cloud storage and compare with database references
            // Implementation depends on your specific setup
            return {
                scanned: 0,
                deleted: 0,
                errors: 0,
            };
        }
        catch (error) {
            this.handleError("Error cleaning up orphaned files", error);
            return {
                scanned: 0,
                deleted: 0,
                errors: 0,
            };
        }
    }
}
exports.FileUploadService = FileUploadService;
//# sourceMappingURL=FileUploadService.js.map