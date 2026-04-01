import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const authService = new AuthService();

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name required'),
  body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name required'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password, firstName, lastName } = req.body;
    const result = await authService.register({ email, password, firstName, lastName });

    res.status(201).json({
      message: 'Registration successful',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    res.json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
