import { BaseEntity, NigerianPhoneNumber } from './common.types';
import { PublicUser } from './user.types';
import { DeviceInfo } from './auth.types'; // Import from auth.types to avoid duplication

// Core session interface
export interface Session extends BaseEntity {
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  lastUsedAt: Date;
  // Navigation relation
  user?: PublicUser;
}

// Extended session info with computed fields
export interface SessionInfo extends Session {
  isExpired: boolean;
  timeUntilExpiry: number; // in minutes
  isCurrent?: boolean; // if this is the current user's session
}

// Session creation data
export interface CreateSessionData {
  userId: string;
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
}

// Session update data
export interface UpdateSessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  isActive?: boolean;
  lastUsedAt?: Date;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
}

// Session tokens response
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  sessionId: string;
}

// Session creation options
export interface CreateSessionOptions {
  userId: string;
  deviceInfo?: DeviceInfo;
  ipAddress?: string;
  userAgent?: string;
}

// Session validation result
export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionInfo;
  user?: PublicUser;
  error?: string;
}

// Session analytics interfaces
export interface UserSessionStats {
  totalSessions: number;
  activeSessions: number;
  recentLogins: Date[];
  deviceTypes: { type: string; count: number }[];
  ipAddresses: { ip: string; count: number; lastUsed: Date }[];
}

export interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  averageSessionDuration: number; // in minutes
  sessionsByDevice: { device: string; count: number }[];
  sessionsByDay: { date: string; sessions: number }[];
  topIpAddresses: { ip: string; sessions: number }[];
}

// Security alert types
export type SecurityAlertType = 'multiple_ips' | 'rapid_sessions' | 'multiple_devices' | 'suspicious_location';
export type SecuritySeverity = 'low' | 'medium' | 'high';

export interface SecurityAlert {
  type: SecurityAlertType;
  message: string;
  severity: SecuritySeverity;
  data?: Record<string, any>;
  detectedAt: Date;
}

export interface SuspiciousActivityResult {
  hasAlerts: boolean;
  alerts: SecurityAlert[];
  riskScore: number; // 0-100
  recommendations: string[];
}

// Session limit check result
export interface SessionLimitCheck {
  hasReachedLimit: boolean;
  activeSessionCount: number;
  maxSessions: number;
  oldestSessions?: SessionInfo[];
}

// Session cleanup result
export interface SessionCleanupResult {
  deletedCount: number;
  deletedExpired: number;
  deletedInactive: number;
  processedAt: Date;
}

// Session-specific request/response interfaces (non-auth related)

// Logout request
export interface LogoutRequest {
  sessionId?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    loggedOutAt: Date;
  };
}

// Logout all sessions response
export interface LogoutAllSessionsResponse {
  success: boolean;
  message: string;
  data: {
    deactivatedSessions: number;
    userId: string;
    loggedOutAt: Date;
  };
}

// Active sessions response
export interface ActiveSessionsResponse {
  success: boolean;
  message: string;
  data: {
    sessions: SessionInfo[];
    totalSessions: number;
    currentSessionId: string;
  };
}

// Session analytics response
export interface SessionAnalyticsResponse {
  success: boolean;
  message: string;
  data: UserSessionStats & {
    security: SuspiciousActivityResult;
  };
}

// Extend session request
export interface ExtendSessionRequest {
  sessionId?: string;
  additionalMinutes?: number;
}

export interface ExtendSessionResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    expiresAt: Date;
    extendedBy: number;
    newExpiryMinutes: number;
  };
}

// Session status response
export interface SessionStatusResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    userId: string;
    sessionLimit: SessionLimitCheck;
    currentTime: Date;
    timeUntilExpiry: number;
    isExpired: boolean;
  };
}

// Session validation response
export interface SessionValidationResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    userId: string;
    isExpired: boolean;
    timeUntilExpiry: number;
    lastUsedAt: Date;
    deviceInfo?: DeviceInfo;
  };
}

// Admin session analytics query
export interface SessionAnalyticsQuery {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  deviceType?: string;
  includeInactive?: boolean;
}

// Admin session analytics response
export interface AdminSessionAnalyticsResponse {
  success: boolean;
  message: string;
  data: SessionAnalytics & {
    dateRange: {
      from: Date;
      to: Date;
    };
    filters?: Record<string, any>;
  };
}

// Session cleanup response
export interface SessionCleanupResponse {
  success: boolean;
  message: string;
  data: SessionCleanupResult;
}

// Session events for logging/analytics
export type SessionEventType = 
  | 'session_created'
  | 'session_refreshed'
  | 'session_extended'
  | 'session_expired'
  | 'session_terminated'
  | 'suspicious_activity_detected'
  | 'session_limit_exceeded';

export interface SessionEvent {
  type: SessionEventType;
  sessionId: string;
  userId: string;
  timestamp: Date;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Session configuration
export interface SessionConfig {
  accessTokenExpiry: number; // milliseconds
  refreshTokenExpiry: number; // milliseconds
  maxSessionsPerUser: number;
  cleanupInterval: number; // milliseconds
  suspiciousActivityThresholds: {
    maxIPsPerDay: number;
    maxSessionsPerHour: number;
    maxDeviceTypes: number;
  };
  securitySettings: {
    requireFreshLoginForSensitive: boolean;
    autoExtendOnActivity: boolean;
    logoutOnSuspiciousActivity: boolean;
  };
}

// Session middleware types - use a different name to avoid conflicts
export interface SessionAuthenticatedRequest extends Request {
  user?: {
    id: string;
    sessionId: string;
    phoneNumber: NigerianPhoneNumber;
    role: string;
    [key: string]: any;
  };
  session?: SessionInfo;
}

// Session repository interfaces
export interface SessionRepository {
  create(data: CreateSessionData): Promise<Session>;
  findBySessionId(sessionId: string): Promise<Session | null>;
  findByAccessToken(accessToken: string): Promise<Session | null>;
  findByRefreshToken(refreshToken: string): Promise<Session | null>;
  findActiveSessionsByUserId(userId: string): Promise<Session[]>;
  updateTokens(sessionId: string, accessToken: string, refreshToken: string): Promise<Session>;
  updateLastUsed(sessionId: string): Promise<Session>;
  deactivateSession(sessionId: string): Promise<boolean>;
  deactivateAllUserSessions(userId: string): Promise<number>;
  cleanupExpiredSessions(): Promise<SessionCleanupResult>;
  limitUserSessions(userId: string, maxSessions: number): Promise<number>;
  getUserSessionStats(userId: string): Promise<UserSessionStats>;
  getSessionAnalytics(dateFrom: Date, dateTo: Date): Promise<SessionAnalytics>;
  detectSuspiciousActivity(userId: string): Promise<SuspiciousActivityResult>;
}