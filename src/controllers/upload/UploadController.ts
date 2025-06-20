import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { FileUploadService } from "../../services/upload/FileUploadService";
import { ImageProcessingService } from "../../services/upload/ImageProcessingService";
import { ApiResponse } from "../../types/api.types";
import { AuthenticatedRequest } from "../../types/auth.types";
import multer from "multer";
import path from "path";

export class UploadController extends BaseController {
  private fileUploadService: FileUploadService;
  private imageProcessingService: ImageProcessingService;

  constructor(
    fileUploadService: FileUploadService,
    imageProcessingService: ImageProcessingService
  ) {
    super();
    this.fileUploadService = fileUploadService;
    this.imageProcessingService = imageProcessingService;
  }

  /**
   * Upload single file
   * POST /api/v1/upload/single
   */
  public uploadSingle = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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
        this.sendError(res, validation.error, 400, "INVALID_FILE");
        return;
      }

      const uploadResult = await this.fileUploadService.uploadSingle(req.file, {
        userId,
        folder: req.body.folder || "general",
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      });

      this.logAction("FILE_UPLOADED", userId, "FILE", uploadResult.id, {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        folder: req.body.folder || "general",
      });

      this.sendSuccess(res, uploadResult, "File uploaded successfully", 201);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Upload multiple files
   * POST /api/v1/upload/multiple
   */
  public uploadMultiple = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        this.sendError(res, "No files uploaded", 400, "NO_FILES");
        return;
      }

      // Validate all files
      const validationErrors: string[] = [];
      files.forEach((file, index) => {
        const validation = this.validateFile(file);
        if (!validation.isValid) {
          validationErrors.push(`File ${index + 1}: ${validation.error}`);
        }
      });

      if (validationErrors.length > 0) {
        this.sendError(
          res,
          "File validation failed",
          400,
          "INVALID_FILES",
          validationErrors
        );
        return;
      }

      const uploadResults = await this.fileUploadService.uploadMultiple(files, {
        userId,
        folder: req.body.folder || "general",
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      });

      this.logAction("MULTIPLE_FILES_UPLOADED", userId, "FILES", undefined, {
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        folder: req.body.folder || "general",
      });

      this.sendSuccess(
        res,
        {
          files: uploadResults,
          count: uploadResults.length,
        },
        `${uploadResults.length} file(s) uploaded successfully`,
        201
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Upload product images
   * POST /api/v1/upload/product-images
   */
  public uploadProductImages = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      if (!userId || !this.hasRole(req, "admin")) {
        this.sendError(res, "Admin access required", 403, "FORBIDDEN");
        return;
      }

      const files = req.files as Express.Multer.File[];
      const { productId } = req.body;

      if (!files || files.length === 0) {
        this.sendError(res, "No images uploaded", 400, "NO_FILES");
        return;
      }

      if (!productId) {
        this.sendError(
          res,
          "Product ID is required",
          400,
          "MISSING_PRODUCT_ID"
        );
        return;
      }

      // Validate image files
      const validationErrors: string[] = [];
      files.forEach((file, index) => {
        const validation = this.validateImageFile(file);
        if (!validation.isValid) {
          validationErrors.push(`Image ${index + 1}: ${validation.error}`);
        }
      });

      if (validationErrors.length > 0) {
        this.sendError(
          res,
          "Image validation failed",
          400,
          "INVALID_IMAGES",
          validationErrors
        );
        return;
      }

      const processedImages =
        await this.imageProcessingService.processProductImages(files, {
          productId,
          userId,
          generateThumbnails: true,
          optimizeForWeb: true,
        });

      this.logAction("PRODUCT_IMAGES_UPLOADED", userId, "PRODUCT", productId, {
        imageCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
      });

      this.sendSuccess(
        res,
        {
          images: processedImages,
          count: processedImages.length,
          productId,
        },
        `${processedImages.length} product image(s) uploaded successfully`,
        201
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Upload user avatar
   * POST /api/v1/upload/avatar
   */
  public uploadAvatar = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
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
        this.sendError(res, validation.error, 400, "INVALID_AVATAR");
        return;
      }

      const processedAvatar = await this.imageProcessingService.processAvatar(
        req.file,
        {
          userId,
          sizes: [150, 75, 50], // Different sizes for various uses
          format: "webp", // Modern format for better compression
          quality: 85,
        }
      );

      this.logAction("AVATAR_UPLOADED", userId, "USER", userId, {
        originalSize: req.file.size,
        processedSizes: processedAvatar.sizes.length,
      });

      this.sendSuccess(res, processedAvatar, "Avatar uploaded successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get file by ID
   * GET /api/v1/upload/file/:fileId
   */
  public getFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileId } = req.params;
      const { size, format } = req.query;

      if (!fileId) {
        this.sendError(res, "File ID is required", 400, "MISSING_FILE_ID");
        return;
      }

      const file = await this.fileUploadService.getFile(fileId, {
        size: size as string,
        format: format as string,
      });

      if (!file) {
        this.sendError(res, "File not found", 404, "FILE_NOT_FOUND");
        return;
      }

      // Set appropriate headers
      res.setHeader("Content-Type", file.mimetype);
      res.setHeader("Content-Length", file.size);
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year cache
      res.setHeader("ETag", file.etag);

      // Check if client already has the file cached
      if (req.headers["if-none-match"] === file.etag) {
        res.status(304).end();
        return;
      }

      res.send(file.data);
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Delete file
   * DELETE /api/v1/upload/file/:fileId
   */
  public deleteFile = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);
      const { fileId } = req.params;

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const result = await this.fileUploadService.deleteFile(fileId, userId);

      if (!result.success) {
        this.sendError(res, result.message, 404, "FILE_DELETE_FAILED");
        return;
      }

      this.logAction("FILE_DELETED", userId, "FILE", fileId);

      this.sendSuccess(res, null, "File deleted successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get user's uploaded files
   * GET /api/v1/upload/user-files
   */
  public getUserFiles = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const { page, limit } = this.parsePaginationParams(req.query);
      const folder = req.query.folder as string;
      const fileType = req.query.type as string;

      const result = await this.fileUploadService.getUserFiles(userId, {
        page,
        limit,
        folder,
        fileType,
      });

      this.sendPaginatedResponse(
        res,
        result.files,
        result.pagination,
        "User files retrieved successfully"
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Get upload statistics
   * GET /api/v1/upload/stats
   */
  public getUploadStats = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const userId = this.getUserId(req);

      if (!userId) {
        this.sendError(res, "Authentication required", 401, "UNAUTHORIZED");
        return;
      }

      const stats = await this.fileUploadService.getUserUploadStats(userId);

      this.sendSuccess(res, stats, "Upload statistics retrieved successfully");
    } catch (error) {
      this.handleError(error, req, res);
    }
  };

  /**
   * Validate general file upload
   */
  private validateFile(file: Express.Multer.File): {
    isValid: boolean;
    error?: string;
  } {
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
  private validateImageFile(file: Express.Multer.File): {
    isValid: boolean;
    error?: string;
  } {
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
  private validateAvatarFile(file: Express.Multer.File): {
    isValid: boolean;
    error?: string;
  } {
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
