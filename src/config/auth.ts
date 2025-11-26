export const authConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secure-jwt-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    issuer: "bareloft-api",
    audience: "bareloft-users",
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || "12"),
  },
  otp: {
    expiresInMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES || "10"),
    length: 6,
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "3"),
    resendCooldownMinutes: 2,
    alphabetic: false, // numeric only for Nigerian users
  },
  session: {
    secret: process.env.SESSION_SECRET || "your-session-secret",
    expiresMs: parseInt(process.env.SESSION_EXPIRES_MS || "86400000"), // 24 hours
    cookieName: "bareloft_session",
    secure: true, // Always true for cross-domain (HTTPS required)
    httpOnly: true,
    sameSite: "none" as const, // Allow cross-origin requests (frontend on different domain)
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
  },
  // Nigerian phone number validation
  phoneValidation: {
    countryCode: "+234",
    lengthAfterCountryCode: 10,
    validPrefixes: ["70", "80", "81", "90", "91", "70", "71"], // Major Nigerian networks
    regex: /^(\+234|234|0)[789][01][0-9]{8}$/,
  },
} as const;
