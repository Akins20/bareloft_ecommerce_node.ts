/**
 * Authentication Routes
 *
 * Handles all user authentication endpoints including:
 * - User signup and login with OTP verification
 * - Token management (access/refresh)
 * - Phone number validation
 * - Session management
 *
 * All routes are prefixed with /api/v1/auth
 *
 * Security Features:
 * - OTP-based authentication (Nigerian phone numbers)
 * - JWT token management with refresh tokens
 * - Rate limiting for sensitive endpoints
 * - Input validation and sanitization
 *
 * Author: Bareloft Development Team
 */
declare const router: import("express-serve-static-core").Router;
export default router;
/**
 * Authentication Flow Documentation
 *
 * ## User Registration Flow:
 * 1. POST /request-otp (purpose: 'signup')
 * 2. User receives SMS with 6-digit code
 * 3. POST /signup with user details + OTP code
 * 4. User receives access & refresh tokens
 *
 * ## User Login Flow:
 * 1. POST /request-otp (purpose: 'login')
 * 2. User receives SMS with 6-digit code
 * 3. POST /login with phone + OTP code
 * 4. User receives access & refresh tokens
 *
 * ## Token Management:
 * - Access tokens expire in 15 minutes
 * - Refresh tokens expire in 7 days
 * - Use POST /refresh to get new access token
 * - Include "Authorization: Bearer <token>" in requests
 *
 * ## Security Features:
 * - Nigerian phone number validation (+234 format)
 * - OTP codes expire in 10 minutes
 * - Maximum 3 OTP verification attempts
 * - Rate limiting on all authentication endpoints
 * - Session management with device tracking
 *
 * ## Error Codes:
 * - PHONE_EXISTS: Phone number already registered
 * - PHONE_NOT_FOUND: Phone number not registered
 * - INVALID_OTP: OTP code is invalid or expired
 * - RATE_LIMIT_EXCEEDED: Too many requests
 * - UNAUTHORIZED: Invalid or expired token
 * - VALIDATION_ERROR: Request validation failed
 */
//# sourceMappingURL=auth.d.ts.map