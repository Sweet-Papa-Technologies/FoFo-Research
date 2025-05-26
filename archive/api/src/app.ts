import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import researchRoutes from './routes/researchRoutes';
import configRoutes from './routes/configRoutes';
import reportRoutes from './routes/reportRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Express = express();
const port: number = parseInt(process.env.PORT || '3000', 10);

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Define routes
app.use('/api/research', researchRoutes);
app.use('/api/config', configRoutes);
app.use('/api/reports', reportRoutes);

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start the server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

export default app;