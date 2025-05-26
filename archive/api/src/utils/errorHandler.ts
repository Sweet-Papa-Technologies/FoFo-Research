import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const handleError = (err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.error(`[${err.statusCode}] ${err.message}`);
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  logger.error(`[500] ${err.message}`);
  return res.status(500).json({
    status: 'error',
    message: 'Internal Server Error'
  });
};

export { AppError, handleError };