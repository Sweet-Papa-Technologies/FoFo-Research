import { Application } from 'express';
import researchRoutes from './research.routes';
import searchRoutes from './search.routes';
import reportRoutes from './report.routes';
import authRoutes from './auth.routes';
import settingsRoutes from './settings.routes';

export function setupRoutes(app: Application): void {
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/research', researchRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/settings', settingsRoutes);
}