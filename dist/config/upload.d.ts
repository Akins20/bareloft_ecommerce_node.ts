export declare const uploadConfig: {
    readonly cloudinary: {
        readonly cloudName: string;
        readonly apiKey: string;
        readonly apiSecret: string;
        readonly secure: true;
        readonly folders: {
            readonly products: "bareloft/products";
            readonly users: "bareloft/users";
            readonly categories: "bareloft/categories";
            readonly temp: "bareloft/temp";
        };
    };
    readonly limits: {
        readonly fileSize: number;
        readonly files: 10;
        readonly fieldSize: number;
        readonly fields: 20;
    };
    readonly allowedMimes: {
        readonly images: readonly ["image/jpeg", "image/png", "image/webp", "image/gif"];
        readonly documents: readonly ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    };
    readonly imageProcessing: {
        readonly quality: 80;
        readonly formats: readonly ["jpg", "png", "webp"];
        readonly thumbnailSizes: {
            readonly small: {
                readonly width: 150;
                readonly height: 150;
            };
            readonly medium: {
                readonly width: 300;
                readonly height: 300;
            };
            readonly large: {
                readonly width: 600;
                readonly height: 600;
            };
            readonly xlarge: {
                readonly width: 1200;
                readonly height: 1200;
            };
        };
    };
    readonly security: {
        readonly scanUploads: boolean;
        readonly quarantineSuspicious: true;
        readonly allowedExtensions: readonly [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx"];
        readonly blockedExtensions: readonly [".exe", ".bat", ".sh", ".php", ".js", ".html"];
    };
};
//# sourceMappingURL=upload.d.ts.map