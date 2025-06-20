import { Router } from "express";
import multer from "multer";
import { UploadController } from "../../controllers/upload/UploadController";
import { authenticate } from "../../middleware/auth/authenticate";
import { authorize } from "../../middleware/auth/authorize";
import { rateLimiter } from "../../middleware/security/rateLimiter";

const router = Router();

// Initialize controller
let uploadController: UploadController;

export const initializeUploadRoutes = (controller: UploadController) => {
  uploadController = controller;
  return router;
};

// Configure Multer for file uploads
const storage = multer.memoryStorage();

// General file upload configuration
const uploadConfig = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10, // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
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

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },
});

// Image-only upload configuration
const imageUploadConfig = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
    }
  },
});

// Avatar upload configuration
const avatarUploadConfig = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for avatars
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only JPEG, PNG, and WebP images are allowed for avatars"),
        false
      );
    }
  },
});

// Rate limiting for upload operations
const uploadRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // 20 uploads per 15 minutes
  message: "Too many upload attempts. Please try again later.",
});

const avatarUploadLimit = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // 5 avatar uploads per hour
  message: "Too many avatar upload attempts. Please try again later.",
});

// ==================== GENERAL FILE UPLOAD ENDPOINTS ====================

/**
 * @route   POST /api/v1/upload/single
 * @desc    Upload single file
 * @access  Private (Authenticated users)
 * @body    FormData {
 *   file: File (required),
 *   folder?: string,
 *   metadata?: string (JSON stringified object)
 * }
 */
router.post(
  "/single",
  authenticate,
  uploadRateLimit,
  uploadConfig.single("file"),
  async (req, res, next) => {
    try {
      await uploadController.uploadSingle(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/multiple
 * @desc    Upload multiple files
 * @access  Private (Authenticated users)
 * @body    FormData {
 *   files: File[] (required, max 10),
 *   folder?: string,
 *   metadata?: string (JSON stringified object)
 * }
 */
router.post(
  "/multiple",
  authenticate,
  uploadRateLimit,
  uploadConfig.array("files", 10),
  async (req, res, next) => {
    try {
      await uploadController.uploadMultiple(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SPECIALIZED UPLOAD ENDPOINTS ====================

/**
 * @route   POST /api/v1/upload/avatar
 * @desc    Upload user avatar
 * @access  Private (Authenticated users)
 * @body    FormData {
 *   file: File (required, max 2MB, image only)
 * }
 */
router.post(
  "/avatar",
  authenticate,
  avatarUploadLimit,
  avatarUploadConfig.single("file"),
  async (req, res, next) => {
    try {
      await uploadController.uploadAvatar(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/product-images
 * @desc    Upload product images (Admin only)
 * @access  Private (Admin)
 * @body    FormData {
 *   files: File[] (required, max 10 images),
 *   productId: string (required)
 * }
 */
router.post(
  "/product-images",
  authenticate,
  authorize(["admin", "super_admin"]),
  uploadRateLimit,
  imageUploadConfig.array("files", 10),
  async (req, res, next) => {
    try {
      await uploadController.uploadProductImages(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/category-image
 * @desc    Upload category image (Admin only)
 * @access  Private (Admin)
 * @body    FormData {
 *   file: File (required, image only),
 *   categoryId: string (required)
 * }
 */
router.post(
  "/category-image",
  authenticate,
  authorize(["admin", "super_admin"]),
  uploadRateLimit,
  imageUploadConfig.single("file"),
  async (req, res, next) => {
    try {
      // This would be handled by a category-specific upload method
      res.status(501).json({
        success: false,
        message: "Category image upload not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/brand-logo
 * @desc    Upload brand logo (Admin only)
 * @access  Private (Admin)
 * @body    FormData {
 *   file: File (required, image only),
 *   brandId: string (required)
 * }
 */
router.post(
  "/brand-logo",
  authenticate,
  authorize(["admin", "super_admin"]),
  uploadRateLimit,
  imageUploadConfig.single("file"),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Brand logo upload not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/bulk-products
 * @desc    Upload bulk product data via CSV/Excel (Admin only)
 * @access  Private (Admin)
 * @body    FormData {
 *   file: File (required, CSV/Excel)
 * }
 */
router.post(
  "/bulk-products",
  authenticate,
  authorize(["admin", "super_admin"]),
  rateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 bulk uploads per hour
    message: "Too many bulk upload attempts. Please try again later.",
  }),
  uploadConfig.single("file"),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Bulk product upload not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== FILE RETRIEVAL ENDPOINTS ====================

/**
 * @route   GET /api/v1/upload/file/:fileId
 * @desc    Get file by ID with optional transformations
 * @access  Public
 * @param   fileId - File ID
 * @query   {
 *   size?: string ('thumbnail' | 'small' | 'medium' | 'large'),
 *   format?: string ('webp' | 'jpeg' | 'png'),
 *   quality?: number (1-100)
 * }
 */
router.get("/file/:fileId", async (req, res, next) => {
  try {
    await uploadController.getFile(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/upload/user-files
 * @desc    Get authenticated user's uploaded files
 * @access  Private (Authenticated users)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   folder?: string,
 *   type?: string ('image' | 'document' | 'all')
 * }
 */
router.get("/user-files", authenticate, async (req, res, next) => {
  try {
    await uploadController.getUserFiles(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/upload/stats
 * @desc    Get user's upload statistics
 * @access  Private (Authenticated users)
 */
router.get("/stats", authenticate, async (req, res, next) => {
  try {
    await uploadController.getUploadStats(req, res);
  } catch (error) {
    next(error);
  }
});

// ==================== FILE MANAGEMENT ENDPOINTS ====================

/**
 * @route   DELETE /api/v1/upload/file/:fileId
 * @desc    Delete uploaded file
 * @access  Private (File owner or Admin)
 * @param   fileId - File ID
 */
router.delete("/file/:fileId", authenticate, async (req, res, next) => {
  try {
    await uploadController.deleteFile(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/upload/bulk-delete
 * @desc    Delete multiple files in bulk
 * @access  Private (File owner or Admin)
 * @body    { fileIds: string[] }
 */
router.delete("/bulk-delete", authenticate, async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Bulk file deletion not yet implemented",
    });
  } catch (error) {
    next(error);
  }
});

// ==================== IMAGE TRANSFORMATION ENDPOINTS ====================

/**
 * @route   POST /api/v1/upload/transform/:fileId
 * @desc    Transform/resize existing image
 * @access  Private (File owner or Admin)
 * @param   fileId - Image file ID
 * @body    {
 *   width?: number,
 *   height?: number,
 *   quality?: number,
 *   format?: 'webp' | 'jpeg' | 'png',
 *   crop?: boolean
 * }
 */
router.post(
  "/transform/:fileId",
  authenticate,
  uploadRateLimit,
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Image transformation not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/v1/upload/optimize/:fileId
 * @desc    Optimize image for web (compression, format conversion)
 * @access  Private (File owner or Admin)
 * @param   fileId - Image file ID
 * @body    {
 *   quality?: number,
 *   format?: 'webp' | 'jpeg',
 *   progressive?: boolean
 * }
 */
router.post(
  "/optimize/:fileId",
  authenticate,
  uploadRateLimit,
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Image optimization not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== ADMIN FILE MANAGEMENT ====================

/**
 * @route   GET /api/v1/upload/admin/files
 * @desc    Get all files with admin filtering (Admin only)
 * @access  Private (Admin)
 * @query   {
 *   page?: number,
 *   limit?: number,
 *   userId?: string,
 *   type?: string,
 *   folder?: string,
 *   startDate?: string,
 *   endDate?: string
 * }
 */
router.get(
  "/admin/files",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Admin file management not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/v1/upload/admin/stats
 * @desc    Get upload statistics for admin dashboard
 * @access  Private (Admin)
 * @query   { days?: number }
 */
router.get(
  "/admin/stats",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "Admin upload statistics not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/v1/upload/admin/cleanup
 * @desc    Cleanup orphaned/unused files (Admin only)
 * @access  Private (Admin)
 * @body    {
 *   olderThanDays?: number,
 *   dryRun?: boolean
 * }
 */
router.delete(
  "/admin/cleanup",
  authenticate,
  authorize(["admin", "super_admin"]),
  async (req, res, next) => {
    try {
      res.status(501).json({
        success: false,
        message: "File cleanup not yet implemented",
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== UPLOAD VALIDATION ENDPOINTS ====================

/**
 * @route   POST /api/v1/upload/validate
 * @desc    Validate file before upload (check size, type, etc.)
 * @access  Private (Authenticated users)
 * @body    {
 *   fileName: string,
 *   fileSize: number,
 *   mimeType: string,
 *   folder?: string
 * }
 */
router.post("/validate", authenticate, async (req, res, next) => {
  try {
    const { fileName, fileSize, mimeType, folder } = req.body;

    // Basic validation logic
    const maxSize = folder === "avatars" ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    const allowedTypes =
      folder === "avatars"
        ? ["image/jpeg", "image/png", "image/webp"]
        : [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ];

    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    if (fileSize > maxSize) {
      validation.valid = false;
      validation.errors.push(
        `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
      );
    }

    if (!allowedTypes.includes(mimeType)) {
      validation.valid = false;
      validation.errors.push("File type not allowed");
    }

    if (fileName.length > 255) {
      validation.valid = false;
      validation.errors.push("File name too long");
    }

    res.json({
      success: true,
      message: "File validation completed",
      data: validation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/upload/limits
 * @desc    Get upload limits and allowed file types
 * @access  Public
 */
router.get("/limits", async (req, res, next) => {
  try {
    const limits = {
      general: {
        maxFileSize: "10MB",
        maxFiles: 10,
        allowedTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "application/pdf",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      },
      images: {
        maxFileSize: "5MB",
        maxFiles: 10,
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      avatars: {
        maxFileSize: "2MB",
        maxFiles: 1,
        allowedTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      documents: {
        maxFileSize: "10MB",
        maxFiles: 5,
        allowedTypes: [
          "application/pdf",
          "text/plain",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      },
    };

    res.json({
      success: true,
      message: "Upload limits retrieved successfully",
      data: limits,
    });
  } catch (error) {
    next(error);
  }
});

// Error handling for multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    let message = "File upload error";

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        message = "File size too large";
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = "Unexpected file field";
        break;
      default:
        message = error.message;
    }

    return res.status(400).json({
      success: false,
      message,
      error: {
        code: error.code,
        field: error.field,
      },
    });
  }

  next(error);
});

export default router;
