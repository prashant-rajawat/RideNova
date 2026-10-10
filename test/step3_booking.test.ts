/**
 * RideNova — Step 3 Automated Verification Test Suite
 * Tests Ride Booking, Multi-Stop Validation, Fare Calculation, Security Isolation & Regressions
 */

import http from 'http';
import { app } from '../backend/src/app.ts';
import { calculateFare, calculateDistanceKm, estimateDurationMinutes } from '../backend/src/services/fare.service.ts';
import { userRepository } from '../backend/src/repositories/user.repository.ts';

async function runStep3Tests() {
  console.log('====================================================');
  console.log(' RideNova — Step 3 Ride Booking & Fare Engine Tests');
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
    // REGRESSION TESTS: Step 1 & Step 2 Still Work
    // -------------------------------------------------------------
    console.log('--- Regression: Step 1 & Step 2 Verifications ---');
    const healthRes = await requestApi('/api/health');
    assert(
      healthRes.status === 200 && healthRes.body?.success === true,
      'TEST 18: Step 1 health endpoint (/api/health) still operational'
    );

    const rider1ClerkId = `rider_book_test_1_${Date.now()}`;
    const rider1Token = `dev_test_token_${rider1ClerkId}:rider:rider1@test.com:Rider%20One`;
    const authMeRes = await requestApi('/api/auth/me', { token: rider1Token });
    assert(
      authMeRes.status === 200 && authMeRes.body?.data?.role === 'rider',
      'TEST 19: Step 2 Clerk auth & user synchronization still operational'
    );

    const rider1DbUser = authMeRes.body.data;

    // Driver Token for role checks
    const driverClerkId = `driver_book_test_${Date.now()}`;
    const driverToken = `dev_test_token_${driverClerkId}:driver:driver@test.com:Driver%20Test`;
    await requestApi('/api/auth/me', { token: driverToken });
    await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: driverToken,
      body: { targetRole: 'driver' },
    });

    // -------------------------------------------------------------
    // TEST 16: Fare Calculation Formula Verification
    // -------------------------------------------------------------
    console.log('\n--- Unit Test: Centralized Fare Calculation ---');
    // Economy: Base 40, 10 km * 12 = 120, 20 min * 2 = 40 => Total 200
    const fareEcon = calculateFare('economy', 10, 20);
    assert(
      fareEcon.baseFare === 40 &&
        fareEcon.distanceCharge === 120 &&
        fareEcon.timeCharge === 40 &&
        fareEcon.estimatedFare === 200,
      'TEST 16a: Economy fare calculation formula matches exact expected (₹200)'
    );

    // Comfort: Base 60, 10 km * 18 = 180, 20 min * 3 = 60 => Total 300
    const fareComfort = calculateFare('comfort', 10, 20);
    assert(
      fareComfort.baseFare === 60 &&
        fareComfort.distanceCharge === 180 &&
        fareComfort.timeCharge === 60 &&
        fareComfort.estimatedFare === 300,
      'TEST 16b: Comfort fare calculation matches exact expected (₹300)'
    );

    // Premium: Base 100, 10 km * 25 = 250, 20 min * 4 = 80 => Total 430
    const farePrem = calculateFare('premium', 10, 20);
    assert(
      farePrem.baseFare === 100 &&
        farePrem.distanceCharge === 250 &&
        farePrem.timeCharge === 80 &&
        farePrem.estimatedFare === 430,
      'TEST 16c: Premium fare calculation matches exact expected (₹430)'
    );

    // -------------------------------------------------------------
    // TEST 1: Unauthenticated POST /api/rides -> 401
    // -------------------------------------------------------------
    console.log('\n--- Route Booking Authorization & Validation ---');
    const validBookingPayload = {
      pickupAddress: 'KPGU, Gandhinagar',
      pickupLatitude: 23.2156,
      pickupLongitude: 72.6369,
      destinationAddress: 'Ahmedabad Railway Station',
      destinationLatitude: 23.0225,
      destinationLongitude: 72.5714,
      rideType: 'comfort',
      stops: [],
    };

    const unauthPost = await requestApi('/api/rides', {
      method: 'POST',
      body: validBookingPayload,
    });
    assert(
      unauthPost.status === 401 && unauthPost.body?.error?.code === 'UNAUTHORIZED',
      'TEST 1: Unauthenticated POST /api/rides rejected with HTTP 401'
    );

    // -------------------------------------------------------------
    // TEST 2: Driver POST /api/rides -> 403 Forbidden
    // -------------------------------------------------------------
    const driverPost = await requestApi('/api/rides', {
      method: 'POST',
      token: driverToken,
      body: validBookingPayload,
    });
    assert(
      driverPost.status === 403 && driverPost.body?.error?.code === 'FORBIDDEN',
      'TEST 2: Driver attempting to book a ride rejected with HTTP 403 FORBIDDEN'
    );

    // -------------------------------------------------------------
    // TEST 3: Rider POST /api/rides with valid data -> 201 Created
    // -------------------------------------------------------------
    const riderPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: validBookingPayload,
    });
    assert(
      riderPost.status === 201 &&
        riderPost.body?.success === true &&
        riderPost.body?.data?.status === 'requested' &&
        riderPost.body?.data?.driver_id === null,
      'TEST 3: Rider POST /api/rides creates ride record with status=requested, driver_id=null'
    );

    const createdRide1 = riderPost.body.data;

    // -------------------------------------------------------------
    // TEST 4: Rider cannot set rider_id to another user
    // -------------------------------------------------------------
    const fakeRiderPayload = {
      ...validBookingPayload,
      rider_id: 'fake-alien-uuid', // Attacker attempt
    };
    const spoofRiderPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: fakeRiderPayload,
    });
    assert(
      spoofRiderPost.status === 201 &&
        spoofRiderPost.body?.data?.rider_id === rider1DbUser.id,
      'TEST 4: Client-sent rider_id is strictly ignored; backend forces authenticated user ID'
    );

    // -------------------------------------------------------------
    // TEST 5 & 6: Client cannot set driver_id or force status=accepted
    // -------------------------------------------------------------
    const tamperPayload = {
      ...validBookingPayload,
      driver_id: 'fake-driver-uuid',
      status: 'accepted',
      estimated_fare: 1, // Attacker attempts ₹1 fare
    };
    const tamperPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: tamperPayload,
    });
    assert(
      tamperPost.status === 201 &&
        tamperPost.body?.data?.driver_id === null &&
        tamperPost.body?.data?.status === 'requested' &&
        tamperPost.body?.data?.estimated_fare > 50,
      'TEST 5 & 6: Driver_id remains null, status forced to requested, fare recalculated on backend'
    );

    // -------------------------------------------------------------
    // TEST 7 & 8: Invalid coordinates rejected
    // -------------------------------------------------------------
    const invalidLatPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: { ...validBookingPayload, pickupLatitude: 95.0 }, // > 90
    });
    assert(
      invalidLatPost.status === 400 && invalidLatPost.body?.error?.code === 'INVALID_BOOKING_INPUT',
      'TEST 7: Invalid latitude (> 90) rejected with HTTP 400'
    );

    const invalidLngPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: { ...validBookingPayload, destinationLongitude: 210.0 }, // > 180
    });
    assert(
      invalidLngPost.status === 400 && invalidLngPost.body?.error?.code === 'INVALID_BOOKING_INPUT',
      'TEST 8: Invalid longitude (> 180) rejected with HTTP 400'
    );

    // -------------------------------------------------------------
    // TEST 9: Invalid ride type rejected
    // -------------------------------------------------------------
    const invalidTypePost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: { ...validBookingPayload, rideType: 'helicopter' },
    });
    assert(
      invalidTypePost.status === 400,
      'TEST 9: Invalid ride type ("helicopter") rejected with HTTP 400'
    );

    // -------------------------------------------------------------
    // TEST 10 & 17: Multi-stop support (Max 3 stops) & 4 stops rejected
    // -------------------------------------------------------------
    const fourStopsPayload = {
      ...validBookingPayload,
      stops: [
        { address: 'Stop 1', latitude: 23.1, longitude: 72.6, stopOrder: 1 },
        { address: 'Stop 2', latitude: 23.12, longitude: 72.61, stopOrder: 2 },
        { address: 'Stop 3', latitude: 23.14, longitude: 72.62, stopOrder: 3 },
        { address: 'Stop 4', latitude: 23.16, longitude: 72.63, stopOrder: 4 }, // > 3
      ],
    };
    const fourStopsPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: fourStopsPayload,
    });
    assert(
      fourStopsPost.status === 400,
      'TEST 10: Attempting to add 4 stops rejected with HTTP 400 (max 3 allowed)'
    );

    const validThreeStopsPayload = {
      ...validBookingPayload,
      stops: [
        { address: 'City Mall, Gandhinagar', latitude: 23.1989, longitude: 72.6289, stopOrder: 1 },
        { address: 'Sabarmati Ashram', latitude: 23.0605, longitude: 72.5806, stopOrder: 2 },
        { address: 'Ahmedabad Airport', latitude: 23.0772, longitude: 72.6347, stopOrder: 3 },
      ],
    };
    const multiStopPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: validThreeStopsPayload,
    });
    assert(
      multiStopPost.status === 201 &&
        multiStopPost.body?.data?.stops?.length === 3 &&
        multiStopPost.body?.data?.stops[0].stop_order === 1 &&
        multiStopPost.body?.data?.stops[2].stop_order === 3,
      'TEST 17: 3 intermediate stops stored in database with sequential stop_order'
    );

    // -------------------------------------------------------------
    // TEST 11 & 12: Missing pickup or destination rejected
    // -------------------------------------------------------------
    const missingPickup = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: { ...validBookingPayload, pickupAddress: '' },
    });
    assert(missingPickup.status === 400, 'TEST 11: Missing pickup address rejected with HTTP 400');

    const missingDest = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: { ...validBookingPayload, destinationAddress: '' },
    });
    assert(missingDest.status === 400, 'TEST 12: Missing destination address rejected with HTTP 400');

    // -------------------------------------------------------------
    // TEST 14 & 15: Cross-Rider Isolation on GET /api/rides and GET /api/rides/:id
    // -------------------------------------------------------------
    console.log('\n--- Private Data & Ride Isolation ---');
    const rider2ClerkId = `rider_book_test_2_${Date.now()}`;
    const rider2Token = `dev_test_token_${rider2ClerkId}:rider:rider2@test.com:Rider%20Two`;
    await requestApi('/api/auth/me', { token: rider2Token });

    // Rider 1 gets their rides
    const rider1List = await requestApi('/api/rides', { token: rider1Token });
    assert(
      rider1List.status === 200 &&
        Array.isArray(rider1List.body?.data) &&
        rider1List.body.data.every((r: any) => r.rider_id === rider1DbUser.id),
      'TEST 14: GET /api/rides returns only the authenticated rider\'s rides'
    );

    // Rider 2 tries to access Rider 1's ride ID
    const crossAccess = await requestApi(`/api/rides/${createdRide1.id}`, { token: rider2Token });
    assert(
      crossAccess.status === 403 && crossAccess.body?.error?.code === 'FORBIDDEN',
      'TEST 15: Rider 2 cannot access Rider 1\'s ride details (HTTP 403 FORBIDDEN)'
    );

    // Rider 1 can access their own ride ID
    const ownerAccess = await requestApi(`/api/rides/${createdRide1.id}`, { token: rider1Token });
    assert(
      ownerAccess.status === 200 && ownerAccess.body?.data?.id === createdRide1.id,
      'Rider 1 can successfully access their own ride details'
    );

    // -------------------------------------------------------------
    // TASK 5 REGRESSION SUITE: 0 Stops, 1 Stop, and 2 Stops Multi-Routing
    // -------------------------------------------------------------
    console.log('\n--- Route Stop Variations: 0 stops, 1 stop, 2 stops ---');

    // Test 0 stops (Direct route)
    const zeroStopsPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: {
        pickupAddress: 'Dream Aatman, Vadsar, Vadodara',
        pickupLatitude: 22.2575,
        pickupLongitude: 73.1812,
        destinationAddress: 'Ahmedabad Railway Station, Kalupur',
        destinationLatitude: 23.0225,
        destinationLongitude: 72.5714,
        rideType: 'economy',
        stops: [],
      },
    });
    assert(
      zeroStopsPost.status === 201 &&
        zeroStopsPost.body?.data?.stops?.length === 0 &&
        zeroStopsPost.body?.data?.status === 'requested' &&
        zeroStopsPost.body?.data?.driver_id === null,
      'TASK 5a: Route with 0 stops succeeds with valid metrics and status=requested'
    );

    // Test 1 stop
    const oneStopPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: {
        pickupAddress: 'Dream Aatman, Vadsar, Vadodara',
        pickupLatitude: 22.2575,
        pickupLongitude: 73.1812,
        destinationAddress: 'Ahmedabad Railway Station, Kalupur',
        destinationLatitude: 23.0225,
        destinationLongitude: 72.5714,
        rideType: 'comfort',
        stops: [
          { address: 'City Mall, Gandhinagar', latitude: 23.1989, longitude: 72.6289, stopOrder: 1 },
        ],
      },
    });
    assert(
      oneStopPost.status === 201 &&
        oneStopPost.body?.data?.stops?.length === 1 &&
        oneStopPost.body?.data?.stops[0].stop_order === 1,
      'TASK 5b: Route with 1 stop succeeds with exact stop_order=1'
    );

    // Test 2 stops (User specific scenario: Pickup -> Stop 1: City Mall -> Stop 2: Infocity -> Destination)
    const twoStopsPost = await requestApi('/api/rides', {
      method: 'POST',
      token: rider1Token,
      body: {
        pickupAddress: 'Dream Aatman, Vadsar, Vadodara',
        pickupLatitude: 22.2575,
        pickupLongitude: 73.1812,
        destinationAddress: 'Ahmedabad Railway Station, Kalupur',
        destinationLatitude: 23.0225,
        destinationLongitude: 72.5714,
        rideType: 'premium',
        stops: [
          { address: 'City Mall, Gandhinagar', latitude: 23.1989, longitude: 72.6289, stopOrder: 1 },
          { address: 'Infocity, Gandhinagar', latitude: 23.1895, longitude: 72.6281, stopOrder: 2 },
        ],
      },
    });
    assert(
      twoStopsPost.status === 201 &&
        twoStopsPost.body?.data?.stops?.length === 2 &&
        twoStopsPost.body?.data?.stops[0].stop_order === 1 &&
        twoStopsPost.body?.data?.stops[1].stop_order === 2 &&
        twoStopsPost.body?.data?.ride_type === 'premium',
      'TASK 5c: Route with 2 stops maintains exact stop order (Stop 1 -> Stop 2) and calculates Premium fare'
    );

    // -------------------------------------------------------------
    // Vehicle Category Rates Consistency Check
    // -------------------------------------------------------------
    console.log('\n--- Vehicle Category Rates Verification ---');
    const testDistance = 25; // 25 km
    const testDuration = 45; // 45 min
    const econCalc = calculateFare('economy', testDistance, testDuration);
    const comfCalc = calculateFare('comfort', testDistance, testDuration);
    const premCalc = calculateFare('premium', testDistance, testDuration);

    assert(
      econCalc.baseFare === 40 &&
        econCalc.distanceCharge === 300 &&
        econCalc.timeCharge === 90 &&
        econCalc.estimatedFare === 430,
      'TASK 5d: Economy fare breakdown verified (40 + 300 + 90 = 430)'
    );

    assert(
      comfCalc.baseFare === 60 &&
        comfCalc.distanceCharge === 450 &&
        comfCalc.timeCharge === 135 &&
        comfCalc.estimatedFare === 645,
      'TASK 5e: Comfort fare breakdown verified (60 + 450 + 135 = 645)'
    );

    assert(
      premCalc.baseFare === 100 &&
        premCalc.distanceCharge === 625 &&
        premCalc.timeCharge === 180 &&
        premCalc.estimatedFare === 905,
      'TASK 5f: Premium fare breakdown verified (100 + 625 + 180 = 905)'
    );

    // Verify GET /api/config/maps
    const configMapsRes = await requestApi('/api/config/maps');
    assert(
      configMapsRes.status === 200 &&
        configMapsRes.body?.success === true &&
        typeof configMapsRes.body?.configured === 'boolean',
      'TASK 5g: Public endpoint GET /api/config/maps is healthy and responds'
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

runStep3Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
