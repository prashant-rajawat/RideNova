import { testConnection, query, isDatabaseConfigured } from '../db/index.ts';
import { logger } from '../utils/logger.ts';

export interface DbHealthResult {
  connected: boolean;
  configured: boolean;
  message: string;
  latencyMs?: number;
  tableCount?: number;
  verifiedTables?: string[];
}

export const healthRepository = {
  async checkDatabase(): Promise<DbHealthResult> {
    if (!isDatabaseConfigured()) {
      return {
        connected: false,
        configured: false,
        message: 'DATABASE_URL is not set in environment.',
      };
    }

    const test = await testConnection();
    if (!test.connected) {
      return {
        connected: false,
        configured: true,
        message: test.message,
      };
    }

    try {
      // Check existing RideNova tables in PostgreSQL schema safely
      const expectedTables = [
        'users',
        'drivers',
        'vehicles',
        'rides',
        'ride_stops',
        'payments',
        'driver_earnings',
        'reviews',
        'promo_codes',
        'notifications',
        'support_tickets',
      ];

      const res = await query<{ table_name: string }>(
        `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = ANY($1)
        ORDER BY table_name;
        `,
        [expectedTables]
      );

      const verifiedTables = res.rows.map((r) => r.table_name);

      return {
        connected: true,
        configured: true,
        message: 'Database connection verified and active.',
        latencyMs: test.latencyMs,
        tableCount: verifiedTables.length,
        verifiedTables,
      };
    } catch (error) {
      const err = error as Error;
      logger.warn('Error querying tables in database health check', { errorMessage: err.message });
      return {
        connected: true,
        configured: true,
        message: `Database connected, but table query encountered: ${err.message}`,
        latencyMs: test.latencyMs,
      };
    }
  },
};
