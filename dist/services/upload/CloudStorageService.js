"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudStorageService = void 0;
const BaseService_1 = require("../BaseService");
const types_1 = require("../../types");
const config_1 = require("../../config");
const cloudinary_1 = require("cloudinary");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
class CloudStorageService extends BaseService_1.BaseService {
    provider;
    constructor() {
        super();
        this.initializeProvider();
    }
    /**
     * Initialize storage provider based on configuration
     */
    initializeProvider() {
        switch (config_1.uploadConfig.provider) {
            case "cloudinary":
                this.provider = new CloudinaryProvider();
                break;
            case "aws-s3":
                this.provider = new S3Provider();
                break;
            case "local":
                this.provider = new LocalStorageProvider();
                break;
            default:
                this.provider = new CloudinaryProvider(); // Default
        }
    }
    /**
     * Upload buffer to cloud storage
     */
    async uploadBuffer(buffer, path, mimetype) {
        try {
            return await this.provider.uploadBuffer(buffer, path, mimetype);
        }
        catch (error) {
            this.handleError("Error uploading to cloud storage", error);
            throw error;
        }
    }
    /**
     * Delete file from cloud storage
     */
    async deleteFile(publicId) {
        try {
            return await this.provider.deleteFile(publicId);
        }
        catch (error) {
            this.handleError("Error deleting file from cloud storage", error);
            return false;
        }
    }
    /**
     * Get file information
     */
    async getFileInfo(publicId) {
        try {
            return await this.provider.getFileInfo(publicId);
        }
        catch (error) {
            this.handleError("Error getting file info", error);
            return null;
        }
    }
    /**
     * Get signed URL for secure access
     */
    async getSignedUrl(publicId, expiresIn = 3600) {
        try {
            return await this.provider.getSignedUrl(publicId, expiresIn);
        }
        catch (error) {
            this.handleError("Error generating signed URL", error);
            throw error;
        }
    }
    /**
     * Generate optimized URLs for different image sizes
     */
    generateImageUrl(publicId, transformations) {
        if (this.provider.name === "cloudinary") {
            return this.provider.generateTransformedUrl(publicId, transformations);
        }
        // For other providers, return the base URL
        return `${config_1.uploadConfig.baseUrl}/${publicId}`;
    }
}
exports.CloudStorageService = CloudStorageService;
/**
 * Cloudinary Storage Provider
 */
class CloudinaryProvider {
    name = "cloudinary";
    constructor() {
        cloudinary_1.v2.config({
            cloud_name: config_1.uploadConfig.cloudinary.cloudName,
            api_key: config_1.uploadConfig.cloudinary.apiKey,
            api_secret: config_1.uploadConfig.cloudinary.apiSecret,
        });
    }
    async uploadBuffer(buffer, path, mimetype) {
        try {
            return new Promise((resolve, reject) => {
                cloudinary_1.v2.uploader
                    .upload_stream({
                    resource_type: "auto",
                    public_id: path,
                    folder: this.extractFolder(path),
                    use_filename: true,
                    unique_filename: false,
                    overwrite: true,
                    quality: "auto:good",
                    fetch_format: "auto",
                }, (error, result) => {
                    if (error || !result) {
                        reject(new types_1.AppError("Cloudinary upload failed", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR));
                        return;
                    }
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        format: result.format,
                        size: result.bytes,
                        width: result.width,
                        height: result.height,
                    });
                })
                    .end(buffer);
            });
        }
        catch (error) {
            throw new types_1.AppError("Failed to upload to Cloudinary", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
    }
    async deleteFile(publicId) {
        try {
            const result = await cloudinary_1.v2.uploader.destroy(publicId);
            return result.result === "ok";
        }
        catch (error) {
            return false;
        }
    }
    async getFileInfo(publicId) {
        try {
            const result = await cloudinary_1.v2.api.resource(publicId);
            return {
                url: result.secure_url,
                size: result.bytes,
                format: result.format,
                width: result.width,
                height: result.height,
                createdAt: new Date(result.created_at),
            };
        }
        catch (error) {
            return null;
        }
    }
    async getSignedUrl(publicId, expiresIn = 3600) {
        try {
            const timestamp = Math.round(Date.now() / 1000) + expiresIn;
            return cloudinary_1.v2.utils.private_download_url(publicId, "auto", {
                expires_at: timestamp,
            });
        }
        catch (error) {
            throw new types_1.AppError("Failed to generate signed URL", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
    }
    generateTransformedUrl(publicId, transformations) {
        const transforms = [];
        if (transformations?.width || transformations?.height) {
            const crop = transformations.crop || "fill";
            const w = transformations.width ? `w_${transformations.width}` : "";
            const h = transformations.height ? `h_${transformations.height}` : "";
            transforms.push(`c_${crop}`, w, h);
        }
        if (transformations?.quality) {
            transforms.push(`q_${transformations.quality}`);
        }
        if (transformations?.format) {
            transforms.push(`f_${transformations.format}`);
        }
        const transformString = transforms.filter(Boolean).join(",");
        if (transformString) {
            return cloudinary_1.v2.url(publicId, { transformation: transformString });
        }
        return cloudinary_1.v2.url(publicId);
    }
    extractFolder(path) {
        const parts = path.split("/");
        parts.pop(); // Remove filename
        return parts.join("/") || "uploads";
    }
}
/**
 * AWS S3 Storage Provider
 */
class S3Provider {
    name = "aws-s3";
    s3;
    bucket;
    constructor() {
        aws_sdk_1.default.config.update({
            accessKeyId: config_1.uploadConfig.aws.accessKeyId,
            secretAccessKey: config_1.uploadConfig.aws.secretAccessKey,
            region: config_1.uploadConfig.aws.region,
        });
        this.s3 = new aws_sdk_1.default.S3();
        this.bucket = config_1.uploadConfig.aws.bucket;
    }
    async uploadBuffer(buffer, path, mimetype) {
        try {
            const key = path.startsWith("/") ? path.slice(1) : path;
            const params = {
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: mimetype,
                ACL: "public-read",
                CacheControl: "max-age=31536000", // 1 year
            };
            const result = await this.s3.upload(params).promise();
            return {
                url: result.Location,
                publicId: key,
                format: this.extractFormat(mimetype),
                size: buffer.length,
            };
        }
        catch (error) {
            throw new types_1.AppError("Failed to upload to S3", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
    }
    async deleteFile(publicId) {
        try {
            await this.s3
                .deleteObject({
                Bucket: this.bucket,
                Key: publicId,
            })
                .promise();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getFileInfo(publicId) {
        try {
            const result = await this.s3
                .headObject({
                Bucket: this.bucket,
                Key: publicId,
            })
                .promise();
            return {
                url: `https://${this.bucket}.s3.amazonaws.com/${publicId}`,
                size: result.ContentLength || 0,
                format: this.extractFormat(result.ContentType || ""),
                createdAt: result.LastModified || new Date(),
            };
        }
        catch (error) {
            return null;
        }
    }
    async getSignedUrl(publicId, expiresIn = 3600) {
        try {
            return this.s3.getSignedUrl("getObject", {
                Bucket: this.bucket,
                Key: publicId,
                Expires: expiresIn,
            });
        }
        catch (error) {
            throw new types_1.AppError("Failed to generate signed URL", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        }
    }
    extractFormat(mimetype) {
        return mimetype.split("/")[1] || "unknown";
    }
}
/**
 * Local Storage Provider (for development)
 */
class LocalStorageProvider {
    name = "local";
    basePath;
    constructor() {
        this.basePath = config_1.uploadConfig.local.basePath || "./uploads";
        this.ensureDirectoryExists(this.basePath);
    }
    async uploadBuffer(buffer, path, mimetype) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
            const pathModule = await Promise.resolve().then(() => __importStar(require("path")));
            const fullPath = pathModule.join(this.basePath, path);
            const directory = pathModule.dirname(fullPath);
            // Ensure directory exists
            await this.ensureDirectoryExists(directory);
            // Write file
            await fs.writeFile(fullPath, buffer);
            const url = `${config_1.uploadConfig.baseUrl}/${path}`;
            return {
                url,
                publicId: path,
                format: this.extractFormat(mimetype),
                size: buffer.length,
            };
        }
        catch (error) {
            throw new types_1.AppError("Failed to save file locally", types_1.HTTP_STATUS.INTERNAL_SERVER_ERROR, types_1.ERROR_CODES.INTERNAL_ERROR);
        }
    }
    async deleteFile(publicId) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
            const pathModule = await Promise.resolve().then(() => __importStar(require("path")));
            const fullPath = pathModule.join(this.basePath, publicId);
            await fs.unlink(fullPath);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getFileInfo(publicId) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
            const pathModule = await Promise.resolve().then(() => __importStar(require("path")));
            const fullPath = pathModule.join(this.basePath, publicId);
            const stats = await fs.stat(fullPath);
            return {
                url: `${config_1.uploadConfig.baseUrl}/${publicId}`,
                size: stats.size,
                format: this.extractFormatFromPath(publicId),
                createdAt: stats.birthtime,
            };
        }
        catch (error) {
            return null;
        }
    }
    async getSignedUrl(publicId, expiresIn = 3600) {
        // Local storage doesn't need signed URLs
        return `${config_1.uploadConfig.baseUrl}/${publicId}`;
    }
    async ensureDirectoryExists(directory) {
        try {
            const fs = await Promise.resolve().then(() => __importStar(require("fs/promises")));
            await fs.mkdir(directory, { recursive: true });
        }
        catch (error) {
            // Directory might already exist
        }
    }
    extractFormat(mimetype) {
        return mimetype.split("/")[1] || "unknown";
    }
    extractFormatFromPath(path) {
        const pathModule = require("path");
        return pathModule.extname(path).slice(1) || "unknown";
    }
}
//# sourceMappingURL=CloudStorageService.js.map