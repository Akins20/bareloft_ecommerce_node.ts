"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadConfig = void 0;
exports.uploadConfig = {
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
        folders: {
            products: "bareloft/products",
            users: "bareloft/users",
            categories: "bareloft/categories",
            temp: "bareloft/temp",
        },
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10, // Maximum files per upload
        fieldSize: 1024 * 1024, // 1MB for text fields
        fields: 20, // Maximum number of fields
    },
    allowedMimes: {
        images: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        documents: [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
    },
    imageProcessing: {
        quality: 80,
        formats: ["jpg", "png", "webp"],
        thumbnailSizes: {
            small: { width: 150, height: 150 },
            medium: { width: 300, height: 300 },
            large: { width: 600, height: 600 },
            xlarge: { width: 1200, height: 1200 },
        },
    },
    security: {
        scanUploads: process.env.NODE_ENV === "production",
        quarantineSuspicious: true,
        allowedExtensions: [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".pdf",
            ".doc",
            ".docx",
        ],
        blockedExtensions: [".exe", ".bat", ".sh", ".php", ".js", ".html"],
    },
};
//# sourceMappingURL=upload.js.map