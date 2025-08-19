import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HTTP_STATUS, ERROR_CODES, createErrorResponse } from '../../types';

/**
 * Express Validator Middleware
 * Simple middleware for handling express-validator validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log('❌ [VALIDATION] Request validation failed:', errors.array());
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      createErrorResponse(
        'Validation failed',
        ERROR_CODES.VALIDATION_ERROR,
        errors.array().map(err => err.msg).join(', ')
      )
    );
    return;
  }
  
  console.log('✅ [VALIDATION] Request validation passed');
  next();
};