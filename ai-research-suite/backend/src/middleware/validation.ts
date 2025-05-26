import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './errorHandler';

export function validateRequest(schema: Joi.Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      const message = `Validation failed: ${details.map(d => d.message).join(', ')}`;
      return next(new ValidationError(message));
    }
    
    req.body = value;
    next();
  };
}

export function validateQuery(schema: Joi.Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      const message = `Query validation failed: ${details.map(d => d.message).join(', ')}`;
      return next(new ValidationError(message));
    }
    
    // Instead of reassigning req.query, merge the validated values
    Object.keys(value).forEach(key => {
      (req.query as any)[key] = value[key];
    });
    next();
  };
}

export function validateParams(schema: Joi.Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      const message = `Parameter validation failed: ${details.map(d => d.message).join(', ')}`;
      return next(new ValidationError(message));
    }
    
    // Instead of reassigning req.params, merge the validated values
    Object.keys(value).forEach(key => {
      (req.params as any)[key] = value[key];
    });
    next();
  };
}