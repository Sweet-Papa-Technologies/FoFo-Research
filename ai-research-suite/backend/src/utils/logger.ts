import winston from 'winston';
import path from 'path';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length) {
      try {
        metaString = ` ${JSON.stringify(meta, (key, value) => {
          // Handle circular references
          if (value instanceof Error) {
            return {
              message: value.message,
              stack: value.stack,
              name: value.name
            };
          }
          // Avoid circular references in objects
          if (typeof value === 'object' && value !== null) {
            if (key === 'config' || key === 'request' || key === 'response') {
              return '[Circular Reference Omitted]';
            }
          }
          return value;
        })}`;
      } catch (err) {
        metaString = ` [Error serializing metadata: ${err instanceof Error ? err.message : 'Unknown error'}]`;
      }
    }
    return `${timestamp} [${level}]: ${message}${metaString}`;
  })
);

export const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: {
    service: 'ai-research-suite',
    environment: config.nodeEnv
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'production' ? logFormat : consoleFormat
    }),
    
    // File transports for production
    ...(config.nodeEnv === 'production' ? [
      new winston.transports.File({
        filename: path.join(__dirname, '../../../logs/error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: path.join(__dirname, '../../../logs/combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ] : [])
  ]
});

// Create a stream object with a 'write' function for Morgan
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  }
};