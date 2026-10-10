import pg from 'pg';
import { config } from '../config/index.ts';
import { logger } from '../utils/logger.ts';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(config.DATABASE_URL && config.DATABASE_URL.length > 5);
}

export function getDatabasePool(): pg.Pool | null {
  if (!isDatabaseConfigured()) {
    return null;
  }

  if (!pool) {
    try {
      pool = new Pool({
        connectionString: config.DATABASE_URL,
        ssl:
          config.NODE_ENV === 'production' || config.DATABASE_URL?.includes('supabase.co')
            ? { rejectUnauthorized: false }
            : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      pool.on('error', (err) => {
        logger.error('Unexpected idle client error in PostgreSQL pool', {
          errorMessage: err.message,
        });
      });

      logger.info('PostgreSQL connection pool initialized');
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to initialize PostgreSQL pool', {
        errorMessage: err.message,
      });
      pool = null;
    }
  }

  return pool;
}

/**
 * Execute parameterized query safely
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const currentPool = getDatabasePool();
  if (!currentPool) {
    throw new Error('Database is not configured. Please supply DATABASE_URL.');
  }

  const start = Date.now();
  try {
    const res = await currentPool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed database query', { duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const err = error as Error;
    logger.error('Database query error', { errorMessage: err.message });
    throw error;
  }
}

/**
 * Safely test the database connection without exposing secrets
 */
export async function testConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  message: string;
  latencyMs?: number;
}> {
  if (!isDatabaseConfigured()) {
    return {
      connected: false,
      configured: false,
      message: 'DATABASE_URL is not configured. Provide Supabase connection string to connect.',
    };
  }

  const poolInstance = getDatabasePool();
  if (!poolInstance) {
    return {
      connected: false,
      configured: true,
      message: 'Failed to initialize database pool with current configuration.',
    };
  }

  const start = Date.now();
  try {
    const client = await poolInstance.connect();
    try {
      await client.query('SELECT 1 AS ping');
      const latencyMs = Date.now() - start;
      return {
        connected: true,
        configured: true,
        message: 'Successfully connected to Supabase PostgreSQL database.',
        latencyMs,
      };
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    return {
      connected: false,
      configured: true,
      message: `Database connection test failed: ${err.message}`,
    };
  }
}
