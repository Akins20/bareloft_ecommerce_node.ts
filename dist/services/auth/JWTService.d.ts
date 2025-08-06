import { JWTPayload } from "../../types";
export declare class JWTService {
    private accessTokenSecret;
    private refreshTokenSecret;
    private accessTokenExpiresIn;
    private refreshTokenExpiresIn;
    constructor();
    /**
     * Generate access token
     */
    generateAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string>;
    /**
     * Generate refresh token
     */
    generateRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string>;
    /**
     * Verify access token
     */
    verifyAccessToken(token: string): Promise<JWTPayload>;
    /**
     * Verify refresh token
     */
    verifyRefreshToken(token: string): Promise<JWTPayload>;
    /**
     * Decode token without verification (for extracting payload)
     */
    decodeToken(token: string): JWTPayload;
    /**
     * Check if token is expired
     */
    isTokenExpired(token: string): boolean;
    /**
     * Get token expiration time
     */
    getTokenExpiration(token: string): Date;
    /**
     * Get access token expires in seconds
     */
    getAccessTokenExpiresIn(): number;
    /**
     * Get refresh token expires in seconds
     */
    getRefreshTokenExpiresIn(): number;
    /**
     * Generate token pair (access + refresh)
     */
    generateTokenPair(payload: Omit<JWTPayload, "iat" | "exp">): Promise<{
        accessToken: string;
        refreshToken: string;
        accessTokenExpiresIn: number;
        refreshTokenExpiresIn: number;
    }>;
    /**
     * Extract user ID from token
     */
    extractUserId(token: string): string;
    /**
     * Extract session ID from token
     */
    extractSessionId(token: string): string;
    /**
     * Validate token format without verification
     */
    isValidTokenFormat(token: string): boolean;
    /**
     * Get token type from header
     */
    getTokenType(token: string): "access" | "refresh" | "unknown";
}
//# sourceMappingURL=JWTService.d.ts.map