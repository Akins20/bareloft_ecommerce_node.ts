export const smsConfig = {
  provider: {
    name: process.env.SMS_PROVIDER || "termii", // Popular Nigerian SMS provider
    apiKey: process.env.SMS_API_KEY!,
    baseUrl: process.env.SMS_BASE_URL || "https://api.ng.termii.com/api",
    senderId: process.env.SMS_SENDER_ID || "Bareloft",
    channel: process.env.SMS_CHANNEL || "generic",
    type: process.env.SMS_TYPE || "plain",
  },
  settings: {
    retryAttempts: 3,
    retryDelay: 2000, // 2 seconds
    timeout: 30000, // 30 seconds
    enableDeliveryReports: true,
    maxLength: 160, // Standard SMS length
    encoding: "utf-8",
  },
  templates: {
    otp: {
      login:
        "Your Bareloft login code is: {code}. Valid for {minutes} minutes.",
      signup:
        "Welcome to Bareloft! Your verification code is: {code}. Valid for {minutes} minutes.",
      passwordReset:
        "Your Bareloft password reset code is: {code}. Valid for {minutes} minutes.",
      phoneVerification:
        "Verify your phone with code: {code}. Valid for {minutes} minutes.",
    },
    notifications: {
      orderConfirmed:
        "Order #{orderNumber} confirmed! Total: ₦{amount}. Track: {trackingUrl}",
      orderShipped:
        "Order #{orderNumber} shipped via {carrier}. Track: {trackingNumber}",
      orderDelivered:
        "Order #{orderNumber} delivered! Rate your experience: {ratingUrl}",
      paymentReceived:
        "Payment of ₦{amount} received for order #{orderNumber}. Thank you!",
      lowStock: "Alert: {productName} is low in stock ({quantity} remaining).",
    },
  },
  // Nigerian mobile network detection
  networkPrefixes: {
    MTN: ["0803", "0806", "0703", "0903", "0905", "0704"],
    GLO: ["0805", "0807", "0811", "0905", "0915"],
    AIRTEL: ["0802", "0808", "0812", "0902", "0904", "0901"],
    "9MOBILE": ["0809", "0817", "0818", "0908", "0909"],
  },
} as const;
