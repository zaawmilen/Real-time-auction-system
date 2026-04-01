import { Router } from 'express';
import {
  register, registerValidation,
  login, loginValidation,
  refresh, logout, getMe
} from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

export default router;
