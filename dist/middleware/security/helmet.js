"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helmetConfig = void 0;
const helmet_1 = __importDefault(require("helmet"));
const environment_1 = require("../../config/environment");
exports.helmetConfig = (0, helmet_1.default)({
    // Content Security Policy
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Scripts - allow trusted Nigerian payment and analytics services
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Needed for some payment widgets
                "https://js.paystack.co", // Paystack payment
                "https://www.googletagmanager.com", // Google Analytics
                "https://connect.facebook.net", // Facebook Pixel
                ...(environment_1.config.nodeEnv === "development" ? ["'unsafe-eval'"] : []),
            ],
            // Stylesheets
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Allow inline styles for dynamic content
                "https://fonts.googleapis.com",
            ],
            // Images - allow CDN and social media previews
            imgSrc: [
                "'self'",
                "data:",
                "https:", // Allow HTTPS images (product images from CDN)
                "blob:", // Allow blob URLs for dynamic images
            ],
            // Fonts
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            // Connections - API and Nigerian services
            connectSrc: [
                "'self'",
                "https://api.paystack.co", // Paystack API
                "https://standard.paystack.co", // Paystack Standard
                "https://www.google-analytics.com",
                ...(environment_1.config.nodeEnv === "development" ? ["ws:", "wss:"] : []),
            ],
            // Frames - payment widgets
            frameSrc: ["'self'", "https://js.paystack.co"],
            // Objects and embeds
            objectSrc: ["'none'"],
            embedSrc: ["'none'"],
            // Base URI
            baseUri: ["'self'"],
            // Form actions
            formAction: ["'self'"],
        },
    },
    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disabled for payment widgets
    // Cross Origin Opener Policy
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // Cross Origin Resource Policy
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },
    // Frame Options
    frameguard: { action: "deny" },
    // Hide Powered By
    hidePoweredBy: true,
    // HSTS (HTTP Strict Transport Security)
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    // IE No Open
    ieNoOpen: true,
    // No Sniff
    noSniff: true,
    // Origin Agent Cluster
    originAgentCluster: true,
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: false,
    // Referrer Policy
    referrerPolicy: { policy: "no-referrer" },
    // X-XSS-Protection
    xssFilter: true,
});
//# sourceMappingURL=helmet.js.map