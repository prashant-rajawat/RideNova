import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabasePool, isDatabaseConfigured } from './index.ts';
import { logger } from '../utils/logger.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<{ success: boolean; message: string; applied?: string[] }> {
  if (!isDatabaseConfigured()) {
    return {
      success: false,
      message: 'Cannot run migrations: DATABASE_URL is not configured.',
    };
  }

  const pool = getDatabasePool();
  if (!pool) {
    return {
      success: false,
      message: 'Cannot connect to database pool.',
    };
  }

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return {
      success: false,
      message: `Migrations directory not found at: ${migrationsDir}`,
    };
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    return {
      success: true,
      message: 'No SQL migration files found.',
      applied: [],
    };
  }

  const client = await pool.connect();
  const applied: string[] = [];

  try {
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of migrationFiles) {
      const checkRes = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
      if (checkRes.rowCount && checkRes.rowCount > 0) {
        logger.info(`Migration already applied: ${file}`);
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
        logger.info(`Successfully applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    return {
      success: true,
      message: applied.length > 0 ? `Applied ${applied.length} migrations.` : 'All migrations are up-to-date.',
      applied,
    };
  } catch (error) {
    const err = error as Error;
    logger.error('Migration failed', { errorMessage: err.message });
    return {
      success: false,
      message: `Migration failed: ${err.message}`,
    };
  } finally {
    client.release();
  }
}

// Allow CLI execution: tsx backend/src/db/migrate.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then((result) => {
      logger.info('Migration run finished', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      logger.error('Fatal migration error', { err: err.message });
      process.exit(1);
    });
}
