import helmet from "helmet";
import { environment } from "../../config/environment";

export const helmetConfig = helmet({
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
        ...(environment.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
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
        ...(environment.NODE_ENV === "development" ? ["ws:", "wss:"] : []),
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
