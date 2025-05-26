import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();
const authController = new AuthController();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
});

router.post(
  '/register',
  rateLimiter('auth'),
  validateRequest(registerSchema),
  authController.register.bind(authController)
);

router.post(
  '/login',
  rateLimiter('auth'),
  validateRequest(loginSchema),
  authController.login.bind(authController)
);

router.post(
  '/refresh',
  validateRequest(refreshSchema),
  authController.refresh.bind(authController)
);

router.post(
  '/logout',
  authMiddleware,
  authController.logout.bind(authController)
);

router.get(
  '/me',
  authMiddleware,
  authController.getCurrentUser.bind(authController)
);

router.post(
  '/change-password',
  authMiddleware,
  validateRequest(changePasswordSchema),
  authController.changePassword.bind(authController)
);

export default router;