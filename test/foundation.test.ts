/**
 * RideNova - Foundation Verification Test Suite (Step 1)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { healthService } from '../backend/src/services/health.service.ts';
import { isDatabaseConfigured, testConnection } from '../backend/src/db/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('====================================================');
  console.log(' RideNova — Foundation Verification Suite (Step 1)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
      failed++;
    }
  }

  // 1. Verify API Health Service
  try {
    const health = healthService.getApiHealth();
    assert(health.success === true, 'Health service returns success');
    assert(health.message === 'RideNova API is running', 'Health service returns proper message');
    assert(typeof health.uptimeSeconds === 'number', 'Health service returns uptime');
    assert(typeof health.timestamp === 'string', 'Health service returns ISO timestamp');
  } catch (err) {
    assert(false, 'Health service execution', (err as Error).message);
  }

  // 2. Verify Database connection handling (safe fallback when unconfigured)
  try {
    const isConfigured = isDatabaseConfigured();
    const dbHealth = await testConnection();
    assert(typeof dbHealth.configured === 'boolean', 'Database configuration status detected safely');
    assert(!dbHealth.configured || typeof dbHealth.connected === 'boolean', 'Database test produces valid connection status');
    console.log(`         DB Status: configured=${isConfigured}, connected=${dbHealth.connected}, message="${dbHealth.message}"`);
  } catch (err) {
    assert(false, 'Database health check execution', (err as Error).message);
  }

  // 3. Verify Migration SQL file existence and completeness
  const migrationPath = path.resolve(__dirname, '../backend/src/db/migrations/001_initial_schema.sql');
  assert(fs.existsSync(migrationPath), 'Migration file 001_initial_schema.sql exists');

  if (fs.existsSync(migrationPath)) {
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

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

    for (const table of expectedTables) {
      const hasTable = sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`);
      assert(hasTable, `Table definition present: ${table}`);
    }

    const expectedIndexes = [
      'idx_users_clerk_user_id',
      'idx_users_role',
      'idx_drivers_user_id',
      'idx_drivers_is_online',
      'idx_drivers_location',
      'idx_rides_rider_id',
      'idx_rides_driver_id',
      'idx_rides_status',
      'idx_rides_created_at',
      'idx_payments_ride_id',
      'idx_reviews_driver_id',
      'idx_notifications_user_id',
      'idx_support_tickets_user_id',
    ];

    for (const idx of expectedIndexes) {
      const hasIndex = sqlContent.includes(idx);
      assert(hasIndex, `Index definition present: ${idx}`);
    }

    // Check UUID & constraints
    assert(sqlContent.includes('gen_random_uuid()'), 'UUID primary keys configured with gen_random_uuid()');
    assert(sqlContent.includes("CHECK (role IN ('rider', 'driver', 'admin'))"), 'User roles constraint verified');
    assert(sqlContent.includes("CHECK (status IN ('pending', 'approved', 'suspended', 'active'))"), 'Driver status constraint verified');
    assert(sqlContent.includes('CHECK (rating >= 1 AND rating <= 5)'), 'Review rating (1-5) constraint verified');
  }

  // 4. Verify Environment Variable Examples
  const rootEnvEx = path.resolve(__dirname, '../.env.example');
  const backendEnvEx = path.resolve(__dirname, '../backend/.env.example');
  const frontendEnvEx = path.resolve(__dirname, '../frontend/.env.example');

  assert(fs.existsSync(rootEnvEx), 'Root .env.example exists');
  assert(fs.existsSync(backendEnvEx), 'Backend .env.example exists');
  assert(fs.existsSync(frontendEnvEx), 'Frontend .env.example exists');

  console.log('\n====================================================');
  console.log(` Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
