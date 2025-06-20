export const emailConfig = {
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY!,
    fromEmail: process.env.FROM_EMAIL || "noreply@bareloft.com",
    fromName: process.env.FROM_NAME || "Bareloft",
    replyTo: process.env.REPLY_TO_EMAIL || "support@bareloft.com",
    templateIds: {
      welcome: process.env.SENDGRID_WELCOME_TEMPLATE || "d-welcome123",
      orderConfirmation:
        process.env.SENDGRID_ORDER_CONFIRMATION || "d-order123",
      orderShipped: process.env.SENDGRID_ORDER_SHIPPED || "d-shipped123",
      orderDelivered: process.env.SENDGRID_ORDER_DELIVERED || "d-delivered123",
      passwordReset: process.env.SENDGRID_PASSWORD_RESET || "d-reset123",
      lowStock: process.env.SENDGRID_LOW_STOCK || "d-lowstock123",
      newsletter: process.env.SENDGRID_NEWSLETTER || "d-newsletter123",
    },
  },
  defaultSettings: {
    trackOpens: true,
    trackClicks: true,
    enableSandbox: process.env.NODE_ENV !== "production",
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 1000, // For bulk emails
    unsubscribeGroup: parseInt(process.env.SENDGRID_UNSUBSCRIBE_GROUP || "0"),
  },
  templates: {
    baseUrl: process.env.FRONTEND_URL || "https://bareloft.com",
    logoUrl:
      "https://res.cloudinary.com/bareloft/image/upload/v1/bareloft/logo.png",
    supportEmail: "support@bareloft.com",
    supportPhone: "+234-800-BARELOFT",
    socialLinks: {
      facebook: "https://facebook.com/bareloft",
      instagram: "https://instagram.com/bareloft",
      twitter: "https://twitter.com/bareloft",
    },
  },
} as const;
