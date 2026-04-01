import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';

// Load .env from backend root — works regardless of where ts-node runs from
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Debug — remove after confirming it works
console.log('[DB] DATABASE_URL loaded:', process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.substring(0, 40) + '...' : 'UNDEFINED');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[DB] FATAL: DATABASE_URL is not set. Check your backend/.env file.');
  process.exit(1);
}

const poolConfig: PoolConfig = {
  connectionString,
  ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000, // 10 seconds — Supabase needs more time
  allowExitOnIdle: false,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

export const connectDB = async (): Promise<void> => {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      logger.info(`Database connected at ${result.rows[0].now}`);
      client.release();
      return;
    } catch (error: any) {
      retries--;
      console.error(`[DB] Connection attempt failed (${3 - retries}/3):`, error.message);
      if (retries === 0) {
        logger.error('Failed to connect to database after 3 attempts', { error });
        throw error;
      }
      // Wait 2 seconds before retry
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export default pool;
