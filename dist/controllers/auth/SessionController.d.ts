import { Request, Response } from "express";
import { BaseController } from "../BaseController";
import { SessionService } from "../../services/auth/SessionService";
import { AuthenticatedRequest } from "../../types";
export declare class SessionController extends BaseController {
    private sessionService;
    constructor(sessionService?: SessionService);
    /**
     * @route POST /api/v1/auth/refresh
     * @desc Refresh access token using refresh token
     * @access Public
     */
    refreshToken: (req: Request, res: Response) => Promise<void>;
    /**
     * @route POST /api/v1/auth/logout
     * @desc Logout from current session
     * @access Private
     */
    logout: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route POST /api/v1/auth/logout-all
     * @desc Logout from all sessions (all devices)
     * @access Private
     */
    logoutAllSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route GET /api/v1/auth/sessions
     * @desc Get user's active sessions
     * @access Private
     */
    getActiveSessions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route GET /api/v1/auth/session-analytics
     * @desc Get user's session analytics and security info
     * @access Private
     */
    getUserSessionAnalytics: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route POST /api/v1/auth/extend-session
     * @desc Extend current session expiry
     * @access Private
     */
    extendSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route GET /api/v1/auth/session-status
     * @desc Get current session status and info
     * @access Private
     */
    getSessionStatus: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route DELETE /api/v1/auth/sessions/:sessionId
     * @desc Logout from specific session
     * @access Private
     */
    logoutSpecificSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route POST /api/v1/auth/validate-session
     * @desc Validate current session (health check)
     * @access Private
     */
    validateSession: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    /**
     * @route GET /api/admin/sessions/analytics
     * @desc Get session analytics for admin dashboard
     * @access Admin
     */
    getAdminSessionAnalytics: (req: Request, res: Response) => Promise<void>;
    /**
     * @route POST /api/admin/sessions/cleanup
     * @desc Clean up expired sessions (maintenance)
     * @access Admin
     */
    cleanupExpiredSessions: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=SessionController.d.ts.map