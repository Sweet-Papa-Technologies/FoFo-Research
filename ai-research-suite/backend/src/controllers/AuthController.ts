import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { getDb } from '../utils/database';
import { AppError, ConflictError, UnauthorizedError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  private get db() {
    return getDb();
  }
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const existingUser = await this.db('users')
        .where('email', email)
        .first();
      
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const userId = uuidv4();
      const newUser = {
        id: userId,
        email,
        password_hash: passwordHash,
        name: name || null,
        role: 'user',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await this.db('users').insert(newUser);
      
      // Generate token
      const token = this.generateToken(userId, email, 'user');
      
      logger.info(`New user registered: ${email}`);
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: userId,
            email,
            name: name || null,
            role: 'user'
          },
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Find user
      const user = await this.db('users')
        .where('email', email)
        .first();
      
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid email or password');
      }
      
      // Generate tokens
      const accessToken = this.generateToken(user.id, user.email, user.role);
      const refreshToken = this.generateRefreshToken(user.id);
      
      // Store refresh token (in production, store this in a separate table)
      // For now, we'll just return it
      
      logger.info(`User logged in: ${email}`);
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          token: accessToken,
          refreshToken,
          expiresIn: this.getExpiresInSeconds()
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token required');
      }
      
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;
      
      if (!decoded.sub || !decoded.refresh) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      
      // Get user
      const user = await this.db('users')
        .where('id', decoded.sub)
        .first();
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      
      // Generate new access token
      const accessToken = this.generateToken(user.id, user.email, user.role);
      
      res.json({
        success: true,
        data: {
          token: accessToken,
          expiresIn: this.getExpiresInSeconds()
        }
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        next(new UnauthorizedError('Invalid refresh token'));
      } else {
        next(error);
      }
    }
  }
  
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      // In production, invalidate refresh token in database
      // For now, just log the action
      
      logger.info(`User ${userId} logged out`);
      
      res.json({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }
      
      // Fetch full user details
      const user = await this.db('users')
        .where('id', userId)
        .select('id', 'email', 'name', 'role', 'created_at')
        .first();
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      
      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }
      
      // Get user
      const user = await this.db('users')
        .where('id', userId)
        .first();
      
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isValidPassword) {
        throw new AppError(400, 'Current password is incorrect');
      }
      
      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await this.db('users')
        .where('id', userId)
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date()
        });
      
      logger.info(`Password changed for user ${userId}`);
      
      res.json({
        success: true,
        data: {
          message: 'Password changed successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { 
        sub: userId,
        email,
        role
      },
      config.jwt.secret,
      { 
        expiresIn: config.jwt.expiresIn,
        issuer: 'ai-research-suite',
        audience: 'ai-research-suite-api'
      } as jwt.SignOptions
    );
  }
  
  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      { 
        sub: userId,
        refresh: true
      },
      config.jwt.secret,
      { 
        expiresIn: '30d',
        issuer: 'ai-research-suite',
        audience: 'ai-research-suite-api'
      } as jwt.SignOptions
    );
  }
  
  private getExpiresInSeconds(): number {
    const expiresIn = config.jwt.expiresIn;
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      return 86400; // Default to 24 hours
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 86400;
    }
  }
}