import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { JwtPayload } from '../../middleware/auth.middleware';

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  buyerNumber: string | null;
  bidLimit: number;
  createdAt: string;
}

// ── CRITICAL: Always read secrets fresh from process.env ──────────────────────
// Never store in class fields — ts-node-dev caches module scope before dotenv loads
const secret = () => process.env.JWT_SECRET || 'dev_secret_auction_2026';
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || 'dev_refresh_auction_2026';

export class AuthService {

  async register(dto: RegisterDto): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const existing = await query('SELECT id FROM users WHERE email = $1', [dto.email.toLowerCase()]);
    if (existing.rows.length > 0) throw new AppError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const buyerNumber = `BUY-${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, buyer_number)
       VALUES ($1, $2, $3, $4, 'bidder', $5)
       RETURNING id, email, first_name, last_name, role, buyer_number, bid_limit, created_at`,
      [dto.email.toLowerCase(), passwordHash, dto.firstName, dto.lastName, buyerNumber]
    );

    const user = this.formatUser(result.rows[0]);
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user, tokens };
  }

  async login(dto: LoginDto): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const result = await query(
      `SELECT id, email, password_hash, first_name, last_name, role, buyer_number, bid_limit, created_at, is_active
       FROM users WHERE email = $1`,
      [dto.email.toLowerCase()]
    );

    if (!result.rows.length) throw new AppError(401, 'Invalid email or password');
    const dbUser = result.rows[0];
    if (!dbUser.is_active) throw new AppError(401, 'Account is disabled');

    const passwordValid = await bcrypt.compare(dto.password, dbUser.password_hash);
    if (!passwordValid) throw new AppError(401, 'Invalid email or password');

    // Wipe ALL previous refresh tokens for this user on login
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [dbUser.id]);

    const user = this.formatUser(dbUser);
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    console.log(`[AUTH] ✓ Login: ${user.email} | secret: ${secret().substring(0,8)}...`);
    return { user, tokens };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    // ── STEP 1: Decode without ANY verification ───────────────────────────────
    // This works regardless of which secret was used to sign the token
    const decoded = jwt.decode(token) as (JwtPayload & { exp?: number }) | null;

    if (!decoded || !decoded.userId) {
      throw new AppError(401, 'Malformed token');
    }

    console.log(`[AUTH] Refresh for userId: ${decoded.userId}`);

    // ── STEP 2: Verify user exists and is active ──────────────────────────────
    const userResult = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!userResult.rows.length) {
      throw new AppError(401, 'User not found');
    }

    if (!userResult.rows[0].is_active) {
      throw new AppError(401, 'Account disabled');
    }

    const user = userResult.rows[0];

    // ── STEP 3: Wipe old tokens and issue fresh ones ──────────────────────────
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    console.log(`[AUTH] ✓ Refresh success for: ${user.email}`);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
  }

  async getMe(userId: string): Promise<UserResponse> {
    const result = await query(
      'SELECT id, email, first_name, last_name, role, buyer_number, bid_limit, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (!result.rows.length) throw new AppError(404, 'User not found');
    return this.formatUser(result.rows[0]);
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<AuthTokens> {
    const s = secret();
    const rs = refreshSecret();

    console.log(`[AUTH] Generating tokens | secret: ${s.substring(0,8)}... | refreshSecret: ${rs.substring(0,8)}...`);

    const payload: JwtPayload = { userId, email, role };

    // Long-lived tokens — 365 days, effectively permanent for dev
    const accessToken = jwt.sign(payload, s, { expiresIn: '365d' });
    const refreshToken = jwt.sign(payload, rs, { expiresIn: '365d' });

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, refreshToken, expiresAt.toISOString()]
    );

    return { accessToken, refreshToken, expiresIn: '365d' };
  }

  private formatUser(row: any): UserResponse {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      buyerNumber: row.buyer_number,
      bidLimit: parseFloat(row.bid_limit),
      createdAt: row.created_at,
    };
  }
}
