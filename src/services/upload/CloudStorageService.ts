import { BaseService } from "../BaseService";
import { UploadedFile, AppError, HTTP_STATUS, ERROR_CODES } from "../../types";
import { uploadConfig } from "../../config";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import AWS from "aws-sdk";

export interface StorageProvider {
  name: string;
  uploadBuffer(
    buffer: Buffer,
    path: string,
    mimetype: string
  ): Promise<UploadedFile>;
  deleteFile(publicId: string): Promise<boolean>;
  getFileInfo(publicId: string): Promise<any>;
  getSignedUrl(publicId: string, expiresIn?: number): Promise<string>;
}

export class CloudStorageService extends BaseService {
  private provider: StorageProvider;

  constructor() {
    super();
    this.initializeProvider();
  }

  /**
   * Initialize storage provider based on configuration
   */
  private initializeProvider(): void {
    switch (uploadConfig.provider) {
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
  async uploadBuffer(
    buffer: Buffer,
    path: string,
    mimetype: string
  ): Promise<UploadedFile> {
    try {
      return await this.provider.uploadBuffer(buffer, path, mimetype);
    } catch (error) {
      this.handleError("Error uploading to cloud storage", error);
      throw error;
    }
  }

  /**
   * Delete file from cloud storage
   */
  async deleteFile(publicId: string): Promise<boolean> {
    try {
      return await this.provider.deleteFile(publicId);
    } catch (error) {
      this.handleError("Error deleting file from cloud storage", error);
      return false;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(publicId: string): Promise<{
    url: string;
    size: number;
    format: string;
    width?: number;
    height?: number;
    createdAt: Date;
  } | null> {
    try {
      return await this.provider.getFileInfo(publicId);
    } catch (error) {
      this.handleError("Error getting file info", error);
      return null;
    }
  }

  /**
   * Get signed URL for secure access
   */
  async getSignedUrl(
    publicId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      return await this.provider.getSignedUrl(publicId, expiresIn);
    } catch (error) {
      this.handleError("Error generating signed URL", error);
      throw error;
    }
  }

  /**
   * Generate optimized URLs for different image sizes
   */
  generateImageUrl(
    publicId: string,
    transformations?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      crop?: string;
    }
  ): string {
    if (this.provider.name === "cloudinary") {
      return (this.provider as CloudinaryProvider).generateTransformedUrl(
        publicId,
        transformations
      );
    }

    // For other providers, return the base URL
    return `${uploadConfig.baseUrl}/${publicId}`;
  }
}

/**
 * Cloudinary Storage Provider
 */
class CloudinaryProvider implements StorageProvider {
  name = "cloudinary";

  constructor() {
    cloudinary.config({
      cloud_name: uploadConfig.cloudinary.cloudName,
      api_key: uploadConfig.cloudinary.apiKey,
      api_secret: uploadConfig.cloudinary.apiSecret,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    path: string,
    mimetype: string
  ): Promise<UploadedFile> {
    try {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
              public_id: path,
              folder: this.extractFolder(path),
              use_filename: true,
              unique_filename: false,
              overwrite: true,
              quality: "auto:good",
              fetch_format: "auto",
            },
            (error, result: UploadApiResponse | undefined) => {
              if (error || !result) {
                reject(
                  new AppError(
                    "Cloudinary upload failed",
                    HTTP_STATUS.INTERNAL_SERVER_ERROR,
                    ERROR_CODES.EXTERNAL_SERVICE_ERROR
                  )
                );
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
            }
          )
          .end(buffer);
      });
    } catch (error) {
      throw new AppError(
        "Failed to upload to Cloudinary",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error) {
      return false;
    }
  }

  async getFileInfo(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId);
      return {
        url: result.secure_url,
        size: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
        createdAt: new Date(result.created_at),
      };
    } catch (error) {
      return null;
    }
  }

  async getSignedUrl(
    publicId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const timestamp = Math.round(Date.now() / 1000) + expiresIn;
      return cloudinary.utils.private_download_url(publicId, "auto", {
        expires_at: timestamp,
      });
    } catch (error) {
      throw new AppError(
        "Failed to generate signed URL",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  generateTransformedUrl(
    publicId: string,
    transformations?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
      crop?: string;
    }
  ): string {
    const transforms: string[] = [];

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
      return cloudinary.url(publicId, { transformation: transformString });
    }

    return cloudinary.url(publicId);
  }

  private extractFolder(path: string): string {
    const parts = path.split("/");
    parts.pop(); // Remove filename
    return parts.join("/") || "uploads";
  }
}

/**
 * AWS S3 Storage Provider
 */
class S3Provider implements StorageProvider {
  name = "aws-s3";
  private s3: AWS.S3;
  private bucket: string;

  constructor() {
    AWS.config.update({
      accessKeyId: uploadConfig.aws.accessKeyId,
      secretAccessKey: uploadConfig.aws.secretAccessKey,
      region: uploadConfig.aws.region,
    });

    this.s3 = new AWS.S3();
    this.bucket = uploadConfig.aws.bucket;
  }

  async uploadBuffer(
    buffer: Buffer,
    path: string,
    mimetype: string
  ): Promise<UploadedFile> {
    try {
      const key = path.startsWith("/") ? path.slice(1) : path;

      const params: AWS.S3.PutObjectRequest = {
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
    } catch (error) {
      throw new AppError(
        "Failed to upload to S3",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  async deleteFile(publicId: string): Promise<boolean> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.bucket,
          Key: publicId,
        })
        .promise();

      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileInfo(publicId: string): Promise<any> {
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
    } catch (error) {
      return null;
    }
  }

  async getSignedUrl(
    publicId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      return this.s3.getSignedUrl("getObject", {
        Bucket: this.bucket,
        Key: publicId,
        Expires: expiresIn,
      });
    } catch (error) {
      throw new AppError(
        "Failed to generate signed URL",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR
      );
    }
  }

  private extractFormat(mimetype: string): string {
    return mimetype.split("/")[1] || "unknown";
  }
}

/**
 * Local Storage Provider (for development)
 */
class LocalStorageProvider implements StorageProvider {
  name = "local";
  private basePath: string;

  constructor() {
    this.basePath = uploadConfig.local.basePath || "./uploads";
    this.ensureDirectoryExists(this.basePath);
  }

  async uploadBuffer(
    buffer: Buffer,
    path: string,
    mimetype: string
  ): Promise<UploadedFile> {
    try {
      const fs = await import("fs/promises");
      const pathModule = await import("path");

      const fullPath = pathModule.join(this.basePath, path);
      const directory = pathModule.dirname(fullPath);

      // Ensure directory exists
      await this.ensureDirectoryExists(directory);

      // Write file
      await fs.writeFile(fullPath, buffer);

      const url = `${uploadConfig.baseUrl}/${path}`;

      return {
        url,
        publicId: path,
        format: this.extractFormat(mimetype),
        size: buffer.length,
      };
    } catch (error) {
      throw new AppError(
        "Failed to save file locally",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }
  }

  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const fs = await import("fs/promises");
      const pathModule = await import("path");

      const fullPath = pathModule.join(this.basePath, publicId);
      await fs.unlink(fullPath);

      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileInfo(publicId: string): Promise<any> {
    try {
      const fs = await import("fs/promises");
      const pathModule = await import("path");

      const fullPath = pathModule.join(this.basePath, publicId);
      const stats = await fs.stat(fullPath);

      return {
        url: `${uploadConfig.baseUrl}/${publicId}`,
        size: stats.size,
        format: this.extractFormatFromPath(publicId),
        createdAt: stats.birthtime,
      };
    } catch (error) {
      return null;
    }
  }

  async getSignedUrl(
    publicId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // Local storage doesn't need signed URLs
    return `${uploadConfig.baseUrl}/${publicId}`;
  }

  private async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      const fs = await import("fs/promises");
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private extractFormat(mimetype: string): string {
    return mimetype.split("/")[1] || "unknown";
  }

  private extractFormatFromPath(path: string): string {
    const pathModule = require("path");
    return pathModule.extname(path).slice(1) || "unknown";
  }
}
