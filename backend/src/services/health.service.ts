import { healthRepository, DbHealthResult } from '../repositories/health.repository.ts';
import { ApiHealthResponse, DbHealthResponse } from '../types/index.ts';
import { config } from '../config/index.ts';

const startTime = Date.now();

export const healthService = {
  getApiHealth(): ApiHealthResponse {
    return {
      success: true,
      message: 'RideNova API is running',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      environment: config.NODE_ENV,
      version: '1.0.0',
    };
  },

  async getDbHealth(): Promise<DbHealthResponse> {
    const dbResult: DbHealthResult = await healthRepository.checkDatabase();

    return {
      success: dbResult.connected,
      message: dbResult.message,
      connected: dbResult.connected,
      databaseConfigured: dbResult.configured,
      timestamp: new Date().toISOString(),
      details: {
        latencyMs: dbResult.latencyMs,
        tableCount: dbResult.tableCount,
        verifiedTables: dbResult.verifiedTables,
      },
    };
  },
};
