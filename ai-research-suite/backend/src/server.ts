import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { setupRoutes } from './routes';
import { setupWebSockets } from './utils/websocket';
import { initializeDatabase } from './utils/database';
import { initializeQueues } from './utils/queues';

class APIServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.frontendUrl,
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSockets();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.frontendUrl,
      credentials: true
    }));
    
    // Compression
    this.app.use(compression());
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    setupRoutes(this.app);
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
    
    // Error handling middleware
    this.app.use(errorHandler);
  }

  private setupWebSockets(): void {
    setupWebSockets(this.io);
  }

  public async start(): Promise<void> {
    try {
      // Initialize database
      await initializeDatabase();
      logger.info('Database initialized');
      
      // Initialize queues
      await initializeQueues();
      logger.info('Queues initialized');
      
      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Server running on port ${this.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new APIServer();
server.start().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});