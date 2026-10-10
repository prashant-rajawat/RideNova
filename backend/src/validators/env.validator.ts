import dotenv from 'dotenv';
import { logger } from '../utils/logger.ts';

// Ensure .env is loaded
dotenv.config();

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  FRONTEND_URL: string;
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export function validateEnvironment(): EnvironmentConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const config: EnvironmentConfig = {
    PORT: isNaN(port) ? 3000 : port,
    NODE_ENV: nodeEnv,
    FRONTEND_URL: frontendUrl,
    DATABASE_URL: process.env.DATABASE_URL?.trim() || undefined,
    SUPABASE_URL: process.env.SUPABASE_URL?.trim() || undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY?.trim() || undefined,
    CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY?.trim() || undefined,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY?.trim() || undefined,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined,
  };

  logger.info('Environment variables validated successfully', {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    hasDatabaseUrl: Boolean(config.DATABASE_URL),
    hasClerkKey: Boolean(config.CLERK_SECRET_KEY),
    hasStripeKey: Boolean(config.STRIPE_SECRET_KEY),
  });

  return config;
}
