import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  
  // Database
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
  };
  
  // Redis
  redis: {
    url: string;
    password?: string;
  };
  
  // Security
  jwt: {
    secret: string;
    expiresIn: string;
  };
  encryption: {
    key: string;
  };
  
  // External services
  searxng: {
    endpoint: string;
    secret?: string;
  };
  litellm: {
    apiKey?: string;
    defaultModel: string;
  };
  
  // Application settings
  app: {
    maxSourcesPerResearch: number;
    defaultReportLength: 'short' | 'medium' | 'long' | 'comprehensive';
    sessionTimeout: number;
  };
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:9000',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/research_suite',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'development-key-32-characters-long!!',
  },
  
  searxng: {
    endpoint: process.env.SEARX_ENDPOINT || 'http://localhost:8888',
    secret: process.env.SEARXNG_SECRET,
  },
  
  litellm: {
    apiKey: process.env.LITELLM_API_KEY,
    defaultModel: process.env.LITELLM_DEFAULT_MODEL || 'gpt-3.5-turbo',
  },
  
  app: {
    maxSourcesPerResearch: parseInt(process.env.MAX_SOURCES_PER_RESEARCH || '50', 10),
    defaultReportLength: (process.env.DEFAULT_REPORT_LENGTH as any) || 'medium',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10), // 24 hours
  },
};

// Validate required configuration
if (config.nodeEnv === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DATABASE_URL',
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}