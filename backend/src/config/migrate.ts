import fs from 'fs';
import path from 'path';
import { pool } from './database';
import { logger } from '../utils/logger';

async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  const client = await pool.connect();
  try {
    logger.info('Running database migrations...');
    await client.query(sql);
    logger.info('✅ Migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed', { error });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
