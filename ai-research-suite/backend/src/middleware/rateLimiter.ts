import rateLimit from 'express-rate-limit';
import { RateLimitError } from './errorHandler';
import { config } from '../config';

interface RateLimitOptions {
  max?: number;
  windowMs?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export function rateLimiter(type: string, options: RateLimitOptions = {}) {
  const defaults = {
    research: {
      max: 10,
      windowMs: 60 * 60 * 1000,
      message: 'Too many research requests. Please try again later.'
    },
    search: {
      max: 100,
      windowMs: 15 * 60 * 1000,
      message: 'Too many search requests. Please try again later.'
    },
    auth: {
      max: 5,
      windowMs: 15 * 60 * 1000,
      message: 'Too many authentication attempts. Please try again later.'
    },
    general: {
      max: 100,
      windowMs: 15 * 60 * 1000,
      message: 'Too many requests. Please try again later.'
    }
  };
  
  const typeDefaults = defaults[type] || defaults.general;
  
  return rateLimit({
    max: options.max || typeDefaults.max,
    windowMs: options.windowMs || typeDefaults.windowMs,
    message: options.message || typeDefaults.message,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    
    handler: (req, res, next) => {
      next(new RateLimitError(options.message || typeDefaults.message));
    },
    
    keyGenerator: (req) => {
      if (req.user?.id) {
        return `${type}:user:${req.user.id}`;
      }
      return `${type}:ip:${req.ip}`;
    },
    
    skip: (req) => {
      if (config.nodeEnv === 'development') {
        return true;
      }
      
      if (req.user?.role === 'admin') {
        return true;
      }
      
      return false;
    }
  });
}

export const generalRateLimiter = rateLimiter('general');