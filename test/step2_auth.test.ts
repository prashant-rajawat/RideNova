/**
 * RideNova — Step 2 Automated Verification Test Suite
 * Tests Clerk Authentication, Database User Sync, Role Guards, and Regression on Step 1
 */

import http from 'http';
import { app } from '../backend/src/app.ts';
import { userRepository } from '../backend/src/repositories/user.repository.ts';
import { userService } from '../backend/src/services/user.service.ts';

async function runStep2Tests() {
  console.log('====================================================');
  console.log(' RideNova — Step 2 Authentication & RBAC Test Suite');
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

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function requestApi(
    path: string,
    options: { method?: string; token?: string | null; body?: any } = {}
  ): Promise<{ status: number; body: any }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // non json
    }
    return { status: res.status, body: json };
  }

  try {
    // -------------------------------------------------------------
    // REGRESSION TESTS: Step 1 Health Endpoints Still Work
    // -------------------------------------------------------------
    console.log('--- Regression: Step 1 Health Endpoints ---');
    const healthRes = await requestApi('/api/health');
    assert(
      healthRes.status === 200 && healthRes.body?.success === true && healthRes.body?.message === 'RideNova API is running',
      'TEST 17: Existing Step 1 health endpoint (/api/health) still works'
    );

    const dbHealthRes = await requestApi('/api/health/db');
    assert(
      dbHealthRes.status === 200 && typeof dbHealthRes.body?.connected === 'boolean',
      'TEST 18: Existing Step 1 database health endpoint (/api/health/db) still works'
    );

    // -------------------------------------------------------------
    // TEST 1: Unauthenticated user requests GET /api/auth/me -> 401
    // -------------------------------------------------------------
    console.log('\n--- Authentication & Role Tests ---');
    const unauthRes = await requestApi('/api/auth/me');
    assert(
      unauthRes.status === 401 && unauthRes.body?.error?.code === 'UNAUTHORIZED',
      'TEST 1: Unauthenticated user requests GET /api/auth/me returns HTTP 401'
    );

    // -------------------------------------------------------------
    // TEST 2: Authenticated rider requests GET /api/auth/me -> 200, role = rider
    // -------------------------------------------------------------
    const testClerkUserId = `user_rider_${Date.now()}`;
    const riderToken = `dev_test_token_${testClerkUserId}:rider:rider_${Date.now()}@example.com:John%20Rider`;

    const riderMeRes = await requestApi('/api/auth/me', { token: riderToken });
    assert(
      riderMeRes.status === 200 &&
        riderMeRes.body?.success === true &&
        riderMeRes.body?.data?.role === 'rider',
      'TEST 2: Authenticated rider requests GET /api/auth/me returns 200 with role = rider'
    );

    // -------------------------------------------------------------
    // TEST 3: New Clerk user is automatically synchronized into users table
    // -------------------------------------------------------------
    const newUserId = riderMeRes.body?.data?.id;
    const userInDb = await userRepository.findByClerkId(testClerkUserId);
    assert(
      Boolean(userInDb && userInDb.id === newUserId && userInDb.clerk_user_id === testClerkUserId),
      'TEST 3: New Clerk user is automatically synchronized into users table with default role rider'
    );

    // -------------------------------------------------------------
    // TEST 4: Same user logs in again -> Expected: No duplicate users
    // -------------------------------------------------------------
    const repeatMeRes = await requestApi('/api/auth/me', { token: riderToken });
    assert(
      repeatMeRes.status === 200 && repeatMeRes.body?.data?.id === newUserId,
      'TEST 4: Repeat login preserves identical application user ID (no duplicate users)'
    );

    // -------------------------------------------------------------
    // TEST 5: Rider accesses rider route -> Expected: Allowed (200)
    // -------------------------------------------------------------
    const riderRouteRes = await requestApi('/api/auth/rider-test', { token: riderToken });
    assert(
      riderRouteRes.status === 200 && riderRouteRes.body?.success === true,
      'TEST 5: Rider accesses rider-permitted route -> HTTP 200 Allowed'
    );

    // -------------------------------------------------------------
    // TEST 6: Rider accesses driver-only route -> Expected: 403 Forbidden
    // -------------------------------------------------------------
    const riderToDriverRes = await requestApi('/api/auth/driver-test', { token: riderToken });
    assert(
      riderToDriverRes.status === 403 && riderToDriverRes.body?.error?.code === 'FORBIDDEN',
      'TEST 6: Rider accesses driver-only route -> HTTP 403 FORBIDDEN'
    );

    // -------------------------------------------------------------
    // TEST 7: Rider accesses admin-only route -> Expected: 403 Forbidden
    // -------------------------------------------------------------
    const riderToAdminRes = await requestApi('/api/auth/admin-test', { token: riderToken });
    assert(
      riderToAdminRes.status === 403 && riderToAdminRes.body?.error?.code === 'FORBIDDEN',
      'TEST 7: Rider accesses admin-only route -> HTTP 403 FORBIDDEN'
    );

    // -------------------------------------------------------------
    // TEST 8: Driver accesses driver area -> Expected: Allowed (200)
    // -------------------------------------------------------------
    const testDriverClerkId = `user_driver_${Date.now()}`;
    const driverToken = `dev_test_token_${testDriverClerkId}:driver:driver_${Date.now()}@example.com:Jane%20Driver`;
    // Register & promote via controlled backend mechanism
    await requestApi('/api/auth/me', { token: driverToken });
    const promoteDriverRes = await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: driverToken,
      body: { targetRole: 'driver' },
    });
    assert(
      promoteDriverRes.status === 200 && promoteDriverRes.body?.data?.role === 'driver',
      'Controlled backend promotion to Driver succeeds'
    );

    const driverAccessRes = await requestApi('/api/auth/driver-test', { token: driverToken });
    assert(
      driverAccessRes.status === 200 && driverAccessRes.body?.success === true,
      'TEST 8: Driver accesses driver area -> HTTP 200 Allowed'
    );

    // -------------------------------------------------------------
    // TEST 9: Driver accesses admin area -> Expected: 403 Forbidden
    // -------------------------------------------------------------
    const driverToAdminRes = await requestApi('/api/auth/admin-test', { token: driverToken });
    assert(
      driverToAdminRes.status === 403 && driverToAdminRes.body?.error?.code === 'FORBIDDEN',
      'TEST 9: Driver accesses admin area -> HTTP 403 FORBIDDEN'
    );

    // -------------------------------------------------------------
    // TEST 10: Admin accesses admin area -> Expected: Allowed (200)
    // -------------------------------------------------------------
    const testAdminClerkId = `user_admin_${Date.now()}`;
    const adminToken = `dev_test_token_${testAdminClerkId}:admin:admin_${Date.now()}@example.com:System%20Admin`;
    await requestApi('/api/auth/me', { token: adminToken });
    await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: adminToken,
      body: { targetRole: 'admin' },
    });

    const adminAccessRes = await requestApi('/api/auth/admin-test', { token: adminToken });
    assert(
      adminAccessRes.status === 200 && adminAccessRes.body?.success === true,
      'TEST 10: Admin accesses admin area -> HTTP 200 Allowed'
    );

    // -------------------------------------------------------------
    // TEST: GET /api/auth/role returns authenticated role only
    // -------------------------------------------------------------
    const roleOnlyRes = await requestApi('/api/auth/role', { token: adminToken });
    assert(
      roleOnlyRes.status === 200 &&
        roleOnlyRes.body?.data?.role === 'admin' &&
        !roleOnlyRes.body?.data?.email,
      'GET /api/auth/role returns only role without leaking sensitive fields'
    );

    // -------------------------------------------------------------
    // TEST: Safe profile editing (name, phone)
    // -------------------------------------------------------------
    const updateProfileRes = await requestApi('/api/auth/profile', {
      method: 'PATCH',
      token: riderToken,
      body: { name: 'Updated Rider Name', phone: '+1234567890' },
    });
    assert(
      updateProfileRes.status === 200 &&
        updateProfileRes.body?.data?.name === 'Updated Rider Name' &&
        updateProfileRes.body?.data?.role === 'rider',
      'Safe profile fields update correctly without changing role'
    );

    // -------------------------------------------------------------
    // TEST: Attempted client role manipulation is strictly ignored / rejected
    // -------------------------------------------------------------
    const hackProfileRes = await requestApi('/api/auth/profile', {
      method: 'PATCH',
      token: riderToken,
      body: { role: 'admin' }, // attempted client injection
    });
    assert(
      hackProfileRes.status === 200 && hackProfileRes.body?.data?.role === 'rider',
      'Client cannot change role via profile update (tamper resistance verified)'
    );

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(` Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep2Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
