/**
 * 🔒 Advanced Security Enhancement Middleware
 * Comprehensive security hardening for Nigerian e-commerce platform
 * 
 * Features:
 * - API Key Authentication for admin endpoints
 * - Enhanced input validation and sanitization
 * - SQL Injection prevention
 * - NoSQL Injection prevention
 * - Request size limits
 * - Suspicious activity detection
 * - Security headers enforcement
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../../utils/logger/winston";
import { config } from "../../config/environment";
import { HTTP_STATUS, ERROR_CODES, createErrorResponse } from "../../types";

// Extend Request interface for security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        riskLevel: 'low' | 'medium' | 'high';
        suspiciousActivity: string[];
        sanitized: boolean;
        apiKeyAuth: boolean;
      };
    }
  }
}

/**
 * API Key Authentication for Admin Endpoints
 * Provides additional security layer beyond JWT for sensitive admin operations
 */
export const apiKeyAuthentication = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const expectedApiKey = config.security?.adminApiKey || process.env.ADMIN_API_KEY;

    if (!expectedApiKey) {
      logger.error('Admin API key not configured');
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse('Server configuration error', ERROR_CODES.INTERNAL_ERROR)
      );
    }

    if (!apiKey) {
      logger.warn('Missing API key for admin endpoint', {
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse('API key required for admin operations', ERROR_CODES.INVALID_CREDENTIALS)
      );
    }

    // Secure comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedApiKey, 'utf8');
    const providedBuffer = Buffer.from(apiKey, 'utf8');

    if (expectedBuffer.length !== providedBuffer.length || 
        !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
      
      logger.warn('Invalid API key attempt', {
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        providedKeyLength: apiKey.length
      });

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(
        createErrorResponse('Invalid API key', ERROR_CODES.INVALID_CREDENTIALS)
      );
    }

    // Mark request as API key authenticated
    req.securityContext = req.securityContext || { 
      riskLevel: 'low', 
      suspiciousActivity: [],
      sanitized: false,
      apiKeyAuth: false
    };
    req.securityContext.apiKeyAuth = true;

    logger.info('API key authentication successful', {
      path: req.path,
      ip: req.ip,
      userId: req.user?.id
    });

    next();
  } catch (error) {
    logger.error('API key authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      ip: req.ip
    });

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createErrorResponse('Authentication error', ERROR_CODES.INTERNAL_ERROR)
    );
  }
};

/**
 * SQL Injection Prevention
 * Detects and blocks potential SQL injection attempts
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sqlPatterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /union(\s+select)/i,
      /\bselect\b.*\bfrom\b/i,
      /\bdrop\b.*\btable\b/i,
      /\binsert\b.*\binto\b/i,
      /\bdelete\b.*\bfrom\b/i,
      /\bupdate\b.*\bset\b/i,
      /\bexec\b\s*\(/i,
      /\bexecute\b\s*\(/i,
    ];

    const checkForSQLInjection = (obj: any, path: string = ''): string[] => {
      const violations: string[] = [];

      if (typeof obj === 'string') {
        for (const pattern of sqlPatterns) {
          if (pattern.test(obj)) {
            violations.push(`SQL injection pattern detected at ${path}: ${pattern.toString()}`);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          violations.push(...checkForSQLInjection(item, `${path}[${index}]`));
        });
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          violations.push(...checkForSQLInjection(value, path ? `${path}.${key}` : key));
        });
      }

      return violations;
    };

    const violations: string[] = [];

    // Check request body
    if (req.body) {
      violations.push(...checkForSQLInjection(req.body, 'body'));
    }

    // Check query parameters
    if (req.query) {
      violations.push(...checkForSQLInjection(req.query, 'query'));
    }

    // Check URL parameters
    if (req.params) {
      violations.push(...checkForSQLInjection(req.params, 'params'));
    }

    if (violations.length > 0) {
      logger.error('SQL injection attempt detected', {
        violations,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Invalid input detected', ERROR_CODES.VALIDATION_ERROR)
      );
    }

    next();
  } catch (error) {
    logger.error('SQL injection protection error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path
    });
    next(); // Continue on error to avoid blocking legitimate requests
  }
};

/**
 * NoSQL Injection Prevention
 * Protects against MongoDB/NoSQL injection attacks
 */
export const noSqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkForNoSQLInjection = (obj: any, path: string = ''): string[] => {
      const violations: string[] = [];

      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            violations.push(...checkForNoSQLInjection(item, `${path}[${index}]`));
          });
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            // Check for MongoDB operators
            if (key.startsWith('$')) {
              violations.push(`NoSQL injection operator detected at ${path}.${key}`);
            }
            
            // Check for dangerous patterns in keys
            if (/^\$/.test(key) || key.includes('.') || key.includes('\0')) {
              violations.push(`Dangerous key pattern detected at ${path}.${key}`);
            }

            violations.push(...checkForNoSQLInjection(value, path ? `${path}.${key}` : key));
          });
        }
      }

      return violations;
    };

    const violations: string[] = [];

    // Check request body
    if (req.body) {
      violations.push(...checkForNoSQLInjection(req.body, 'body'));
    }

    // Check query parameters
    if (req.query) {
      violations.push(...checkForNoSQLInjection(req.query, 'query'));
    }

    if (violations.length > 0) {
      logger.error('NoSQL injection attempt detected', {
        violations,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Invalid input format detected', ERROR_CODES.VALIDATION_ERROR)
      );
    }

    next();
  } catch (error) {
    logger.error('NoSQL injection protection error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path
    });
    next(); // Continue on error
  }
};

/**
 * Request Size Limit Protection
 * Prevents DoS attacks through oversized requests
 */
export const requestSizeLimit = (maxSizeMB: number = 10) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const maxBytes = maxSizeMB * 1024 * 1024;

    // Check Content-Length header
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxBytes) {
      logger.warn('Request size limit exceeded', {
        contentLength,
        maxBytes,
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent')
      });

      return res.status(413).json(
        createErrorResponse(
          `Request too large. Maximum size is ${maxSizeMB}MB`,
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    }

    next();
  };
};

/**
 * Suspicious Activity Detection
 * Analyzes request patterns for potential threats
 */
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.securityContext = req.securityContext || {
      riskLevel: 'low',
      suspiciousActivity: [],
      sanitized: false,
      apiKeyAuth: false
    };

    const suspiciousPatterns: Array<{ pattern: RegExp; description: string; severity: 'low' | 'medium' | 'high' }> = [
      { pattern: /\.\.\/|\.\.\\/, description: 'Directory traversal attempt', severity: 'high' },
      { pattern: /<script|javascript:|vbscript:|on\w+=/i, description: 'XSS attempt', severity: 'high' },
      { pattern: /\bphp:/i, description: 'PHP wrapper attempt', severity: 'high' },
      { pattern: /\bfile:/i, description: 'File protocol attempt', severity: 'medium' },
      { pattern: /\b(cmd|powershell|bash|sh)\b/i, description: 'Command injection pattern', severity: 'high' },
      { pattern: /\b(eval|exec|system|shell_exec)\s*\(/i, description: 'Code execution pattern', severity: 'high' },
      { pattern: /\b(information_schema|pg_|mysql\.)/i, description: 'Database enumeration', severity: 'medium' },
    ];

    const checkString = (str: string): void => {
      for (const { pattern, description, severity } of suspiciousPatterns) {
        if (pattern.test(str)) {
          req.securityContext!.suspiciousActivity.push(description);
          
          if (severity === 'high' || (severity === 'medium' && req.securityContext!.riskLevel === 'low')) {
            req.securityContext!.riskLevel = severity === 'high' ? 'high' : 'medium';
          }
        }
      }
    };

    // Check all string inputs
    const checkObject = (obj: any): void => {
      if (typeof obj === 'string') {
        checkString(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(checkObject);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(checkObject);
      }
    };

    // Analyze request data
    if (req.body) checkObject(req.body);
    if (req.query) checkObject(req.query);
    if (req.params) checkObject(req.params);

    // Check User-Agent for suspicious patterns
    const userAgent = req.get('User-Agent') || '';
    if (userAgent) {
      checkString(userAgent);
    }

    // Log high-risk activities
    if (req.securityContext.riskLevel === 'high') {
      logger.error('High-risk security threat detected', {
        riskLevel: req.securityContext.riskLevel,
        suspiciousActivity: req.securityContext.suspiciousActivity,
        ip: req.ip,
        userAgent,
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });

      // Consider blocking high-risk requests
      if (process.env.NODE_ENV === 'production') {
        return res.status(HTTP_STATUS.FORBIDDEN).json(
          createErrorResponse('Request blocked for security reasons', ERROR_CODES.FORBIDDEN)
        );
      }
    } else if (req.securityContext.suspiciousActivity.length > 0) {
      logger.warn('Suspicious activity detected', {
        riskLevel: req.securityContext.riskLevel,
        suspiciousActivity: req.securityContext.suspiciousActivity,
        ip: req.ip,
        path: req.path,
        userId: req.user?.id
      });
    }

    next();
  } catch (error) {
    logger.error('Suspicious activity detection error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path
    });
    next();
  }
};

/**
 * Enhanced Security Headers
 * Adds additional security headers beyond Helmet
 */
export const enhancedSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Nigerian market-specific security headers
    res.setHeader('X-Country-Context', 'NG');
    res.setHeader('X-Security-Policy', 'strict');
    
    // Additional security headers
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
    
    // Nigerian compliance headers
    res.setHeader('X-Data-Protection-Compliance', 'NDPR'); // Nigerian Data Protection Regulation
    res.setHeader('X-Currency-Context', 'NGN');
    
    // Rate limiting information
    res.setHeader('X-Rate-Limit-Policy', 'strict');
    
    // Security contact
    res.setHeader('Security-Contact', 'security@bareloft.com');

    next();
  } catch (error) {
    logger.error('Enhanced security headers error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path
    });
    next();
  }
};

/**
 * Content Type Validation
 * Ensures request content types match expectations
 */
export const contentTypeValidation = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip validation for GET requests and OPTIONS
    if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
      return next();
    }

    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      logger.warn('Missing content-type header', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('Content-Type header required', ERROR_CODES.VALIDATION_ERROR)
      );
    }

    // Check if content type is allowed (check base type, ignore charset)
    const baseContentType = contentType.split(';')[0].trim().toLowerCase();
    const isAllowed = allowedTypes.some(allowedType => 
      baseContentType === allowedType.toLowerCase()
    );

    if (!isAllowed) {
      logger.warn('Invalid content-type', {
        contentType: baseContentType,
        allowedTypes,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      return res.status(415).json(
        createErrorResponse(
          `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`,
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    }

    next();
  };
};

/**
 * Security Audit Logging
 * Comprehensive logging for security events
 */
export const securityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const securityContext = req.securityContext;

    // Log security-relevant requests
    if (securityContext || req.path.includes('admin') || req.path.includes('auth')) {
      logger.info('Security audit log', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        securityContext,
        country: 'NG', // Nigerian market context
        headers: {
          'content-type': req.headers['content-type'],
          'authorization': req.headers.authorization ? '[REDACTED]' : undefined,
          'x-api-key': req.headers['x-api-key'] ? '[REDACTED]' : undefined,
        }
      });
    }
  });

  next();
};

// Export all security enhancements
export const securityEnhancements = {
  apiKeyAuthentication,
  sqlInjectionProtection,
  noSqlInjectionProtection,
  requestSizeLimit,
  suspiciousActivityDetection,
  enhancedSecurityHeaders,
  contentTypeValidation,
  securityAuditLogger,
};