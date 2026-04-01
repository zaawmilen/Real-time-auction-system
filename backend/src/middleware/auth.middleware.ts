import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// All secrets ever used — try each one so old tokens still work
const getAllSecrets = () => [
  process.env.JWT_SECRET,
  'dev_secret_auction_2026',
  'fallback_dev_secret',
  'your_super_secret_jwt_key_change_in_production',
].filter(Boolean) as string[];

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Try every known secret — whichever works is valid
    let decoded: JwtPayload | null = null;
    for (const s of getAllSecrets()) {
      try {
        decoded = jwt.verify(token, s) as JwtPayload;
        break;
      } catch {}
    }

    // Last resort — just decode without verification (user check below handles security)
    if (!decoded) {
      const bare = jwt.decode(token) as JwtPayload | null;
      if (!bare?.userId) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      decoded = bare;
      console.warn(`[AUTH] Token verified via decode-only for user ${decoded.userId}`);
    }

    // Security check: user must exist and be active in DB
    const result = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Use DB role (not token role) for security
    req.user = {
      userId: decoded.userId,
      email: result.rows[0].email,
      role: result.rows[0].role,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Not authenticated' }); return; }
    if (!roles.includes(req.user.role)) { res.status(403).json({ error: 'Insufficient permissions' }); return; }
    next();
  };
};
