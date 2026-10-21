/**
 * RideNova — Step 4 Driver Dashboard & Secure Assignment Automated Test Suite
 * Tests Driver Profile, Vehicle Management, Availability, Request Feed,
 * Atomic Ride Assignment, Race Condition Conflict (409), Lifecycle Transitions & Regressions
 */

import http from 'http';
import { app } from '../backend/src/app.ts';
import { driverRepository } from '../backend/src/repositories/driver.repository.ts';
import { rideRepository } from '../backend/src/repositories/ride.repository.ts';
import { userRepository } from '../backend/src/repositories/user.repository.ts';

async function runStep4Tests() {
  console.log('====================================================');
  console.log(' RideNova — Step 4 Driver Assignment & Fleet Tests');
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

  // Clear memory stores before run
  driverRepository.clearMemoryStore();
  rideRepository.clearMemoryStore();
  userRepository.clearMemoryStore();

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
      // non-json response
    }
    return { status: res.status, body: json };
  }

  try {
    // -------------------------------------------------------------
    // REGRESSION TESTS: Steps 1, 2, 3 Still Function Perfectly
    // -------------------------------------------------------------
    console.log('--- Regression: Steps 1, 2, and 3 Core Functionality ---');
    const healthRes = await requestApi('/api/health');
    assert(
      healthRes.status === 200 && healthRes.body?.success === true,
      'REGRESSION: Step 1 health endpoint (/api/health) responds 200'
    );

    const mapsRes = await requestApi('/api/config/maps');
    assert(
      mapsRes.status === 200 && mapsRes.body?.success === true,
      'REGRESSION: Public Google Maps config endpoint responds 200'
    );

    // Create Rider 1 and promote to rider
    const ts = Date.now();
    const riderToken = `dev_test_token_rider_${ts}:rider:rider_${ts}@test.com:Aarav%20Sharma`;
    await requestApi('/api/auth/me', { token: riderToken });

    // Create Driver 1 and promote to driver
    const driver1Token = `dev_test_token_driver1_${ts}:driver:driver1_${ts}@test.com:Vikram%20Patel`;
    await requestApi('/api/auth/me', { token: driver1Token });
    const promoteD1 = await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: driver1Token,
      body: { targetRole: 'driver' },
    });
    assert(
      promoteD1.status === 200 && promoteD1.body?.data?.role === 'driver',
      'REGRESSION: Successfully verified driver 1 backend promotion'
    );

    // Create Driver 2 and promote to driver
    const driver2Token = `dev_test_token_driver2_${ts}:driver:driver2_${ts}@test.com:Rajesh%20Mehta`;
    await requestApi('/api/auth/me', { token: driver2Token });
    await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: driver2Token,
      body: { targetRole: 'driver' },
    });

    // -------------------------------------------------------------
    // PHASE 2: DRIVER PROFILE & VEHICLE MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- Phase 2: Driver Profile & Vehicle Management ---');

    // Test 1: Rider cannot access driver endpoints
    const riderBlockedRes = await requestApi('/api/driver/me', { token: riderToken });
    assert(
      riderBlockedRes.status === 403,
      'TEST 1: Rider accessing GET /api/driver/me is rejected with HTTP 403 FORBIDDEN'
    );

    // Test 2: Unauthenticated request rejected
    const unauthRes = await requestApi('/api/driver/me');
    assert(
      unauthRes.status === 401,
      'TEST 2: Unauthenticated GET /api/driver/me rejected with HTTP 401'
    );

    // Test 3: Driver gets their own profile
    const d1ProfileRes = await requestApi('/api/driver/me', { token: driver1Token });
    assert(
      d1ProfileRes.status === 200 &&
        d1ProfileRes.body?.data?.name === 'Vikram Patel' &&
        d1ProfileRes.body?.data?.isOnline === false &&
        d1ProfileRes.body?.data?.status === 'approved',
      'TEST 3: Driver retrieves their own profile with status=approved and isOnline=false'
    );

    // Test 4: Driver updates profile fields (phone, license)
    const updateProfileRes = await requestApi('/api/driver/profile', {
      method: 'PATCH',
      token: driver1Token,
      body: {
        phone: '+91 98765 43210',
        licenseNumber: 'GJ-06-2022-987654',
      },
    });
    assert(
      updateProfileRes.status === 200 &&
        updateProfileRes.body?.data?.phone === '+91 98765 43210' &&
        updateProfileRes.body?.data?.licenseNumber === 'GJ-06-2022-987654',
      'TEST 4: Driver updates phone and license number successfully'
    );

    // Test 5: Vehicle validation - Invalid year rejected
    const invalidYearRes = await requestApi('/api/driver/vehicle', {
      method: 'POST',
      token: driver1Token,
      body: {
        vehicleType: 'comfort',
        make: 'Hyundai',
        model: 'Creta',
        color: 'White',
        registrationNumber: 'GJ-01-AB-1234',
        year: 1985, // Invalid: < 1990
      },
    });
    assert(
      invalidYearRes.status === 400,
      'TEST 5: Vehicle year < 1990 rejected with HTTP 400 Bad Request'
    );

    // Test 6: Vehicle validation - Invalid vehicle type rejected
    const invalidTypeRes = await requestApi('/api/driver/vehicle', {
      method: 'POST',
      token: driver1Token,
      body: {
        vehicleType: 'airplane',
        make: 'Boeing',
        model: '737',
        color: 'White',
        registrationNumber: 'VT-AIR-01',
        year: 2021,
      },
    });
    assert(
      invalidTypeRes.status === 400,
      'TEST 6: Invalid vehicleType ("airplane") rejected with HTTP 400'
    );

    // Test 7: Valid vehicle registration for Driver 1
    const validVehicleD1 = await requestApi('/api/driver/vehicle', {
      method: 'POST',
      token: driver1Token,
      body: {
        vehicleType: 'comfort',
        make: 'Hyundai',
        model: 'Creta',
        color: 'Polar White',
        registrationNumber: 'GJ-01-AB-1234',
        year: 2022,
      },
    });
    assert(
      validVehicleD1.status === 200 &&
        validVehicleD1.body?.data?.vehicle_type === 'comfort' &&
        validVehicleD1.body?.data?.registration_number === 'GJ-01-AB-1234',
      'TEST 7: Driver 1 successfully registers valid Comfort vehicle'
    );

    // Also register vehicle for Driver 2
    const validVehicleD2 = await requestApi('/api/driver/vehicle', {
      method: 'POST',
      token: driver2Token,
      body: {
        vehicleType: 'economy',
        make: 'Maruti Suzuki',
        model: 'Dzire',
        color: 'Silver',
        registrationNumber: 'GJ-06-CD-5678',
        year: 2023,
      },
    });
    assert(
      validVehicleD2.status === 200,
      'TEST 7b: Driver 2 successfully registers valid Economy vehicle'
    );

    // -------------------------------------------------------------
    // PHASE 3: ONLINE AND OFFLINE AVAILABILITY
    // -------------------------------------------------------------
    console.log('\n--- Phase 3: Online and Offline Availability ---');

    // Test 8: Driver without vehicle cannot go online
    const driverWithoutVehicleToken = `dev_test_token_driver3_${ts}:driver:driver3_${ts}@test.com:New%20Driver`;
    await requestApi('/api/auth/me', { token: driverWithoutVehicleToken });
    await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: driverWithoutVehicleToken,
      body: { targetRole: 'driver' },
    });
    const goOnlineNoVehicle = await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driverWithoutVehicleToken,
      body: { isOnline: true },
    });
    assert(
      goOnlineNoVehicle.status === 400 &&
        goOnlineNoVehicle.body?.error?.message?.includes('vehicle'),
      'TEST 8: Driver without vehicle attempting to go online is rejected with HTTP 400'
    );

    // Test 9: Driver 1 toggles online
    const d1OnlineRes = await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driver1Token,
      body: { isOnline: true, latitude: 23.2156, longitude: 72.6369 },
    });
    assert(
      d1OnlineRes.status === 200 && d1OnlineRes.body?.data?.isOnline === true,
      'TEST 9: Driver 1 with registered vehicle successfully goes online'
    );

    // Test 10: Offline driver gets 0 requests
    // Driver 2 is currently offline
    const d2OfflineRequests = await requestApi('/api/driver/requests', { token: driver2Token });
    assert(
      d2OfflineRequests.status === 200 && d2OfflineRequests.body?.data?.length === 0,
      'TEST 10: Offline driver (Driver 2) receives 0 ride requests'
    );

    // Put Driver 2 online as well for subsequent tests
    await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driver2Token,
      body: { isOnline: true },
    });

    // -------------------------------------------------------------
    // PHASE 4: AVAILABLE RIDE REQUESTS
    // -------------------------------------------------------------
    console.log('\n--- Phase 4: Available Ride Requests ---');

    // Test 11: Rider creates a new multi-stop ride request
    const bookRideRes = await requestApi('/api/rides', {
      method: 'POST',
      token: riderToken,
      body: {
        pickupAddress: 'Dream Aatman, Vadsar, Vadodara',
        pickupLatitude: 22.2575,
        pickupLongitude: 73.1812,
        destinationAddress: 'Ahmedabad Railway Station, Kalupur',
        destinationLatitude: 23.0268,
        destinationLongitude: 72.6006,
        rideType: 'comfort',
        stops: [
          {
            address: 'City Mall, Gandhinagar',
            latitude: 23.2156,
            longitude: 72.6369,
            stopOrder: 1,
          },
        ],
      },
    });
    assert(
      bookRideRes.status === 201 &&
        bookRideRes.body?.data?.status === 'requested' &&
        bookRideRes.body?.data?.driver_id === null,
      'TEST 11: Rider creates ride with status=requested, driver_id=null'
    );
    const createdRideId = bookRideRes.body?.data?.id;

    // Test 12: Online driver views the request
    const d1Requests = await requestApi('/api/driver/requests', { token: driver1Token });
    const targetRequest = d1Requests.body?.data?.find((r: any) => r.id === createdRideId);
    assert(
      d1Requests.status === 200 && Boolean(targetRequest),
      'TEST 12: Online Driver 1 sees the newly created ride in available requests feed'
    );

    // Test 13: Request details contain waypoints, fare, distance, and driver earnings estimate
    assert(
      targetRequest?.stops?.length === 1 &&
        targetRequest?.stops[0]?.address === 'City Mall, Gandhinagar' &&
        targetRequest?.pickupAddress === 'Dream Aatman, Vadsar, Vadodara' &&
        targetRequest?.destinationAddress === 'Ahmedabad Railway Station, Kalupur' &&
        typeof targetRequest?.estimatedDriverEarnings === 'number' &&
        targetRequest?.estimatedDriverEarnings > 0,
      'TEST 13: Request includes waypoints, pickup, destination, fare, and driver earnings estimate'
    );

    // Test 14: Sensitive rider details are not leaked to unassigned drivers
    assert(
      targetRequest?.rider_phone === undefined &&
        targetRequest?.rider_email === undefined &&
        targetRequest?.riderPhone === undefined,
      'TEST 14: Unassigned ride request does not expose private rider phone or email'
    );

    // -------------------------------------------------------------
    // PHASE 5: SECURE DRIVER ASSIGNMENT & CONFLICT RESOLUTION
    // -------------------------------------------------------------
    console.log('\n--- Phase 5: Secure Atomic Assignment & Conflict Resolution ---');

    // Test 15: Driver 1 accepts the ride
    const acceptRes1 = await requestApi(`/api/rides/${createdRideId}/accept`, {
      method: 'POST',
      token: driver1Token,
    });
    assert(
      acceptRes1.status === 200 &&
        acceptRes1.body?.data?.status === 'accepted' &&
        acceptRes1.body?.data?.driver_id !== null,
      'TEST 15: Driver 1 atomically accepts ride -> status becomes accepted, driver_id assigned'
    );

    // Test 16: Driver 2 attempts to accept the SAME ride (Race condition simulation)
    const acceptRes2 = await requestApi(`/api/rides/${createdRideId}/accept`, {
      method: 'POST',
      token: driver2Token,
    });
    assert(
      acceptRes2.status === 409 &&
        acceptRes2.body?.error?.code === 'CONFLICT',
      'TEST 16: Driver 2 attempting to accept the already-taken ride returns HTTP 409 CONFLICT'
    );

    // Test 17: Request is no longer in available list
    const d2UpdatedRequests = await requestApi('/api/driver/requests', { token: driver2Token });
    const isStillPresent = d2UpdatedRequests.body?.data?.some((r: any) => r.id === createdRideId);
    assert(
      isStillPresent === false,
      'TEST 17: Accepted ride is immediately removed from available requests feed for other drivers'
    );

    // Test 18: Client cannot fake driver_id or bypass server authorization
    const fakeAcceptRes = await requestApi(`/api/rides/${createdRideId}/accept`, {
      method: 'POST',
      token: riderToken, // Rider role attempting to accept
    });
    assert(
      fakeAcceptRes.status === 403,
      'TEST 18: Rider attempting to call driver accept endpoint is rejected with HTTP 403 FORBIDDEN'
    );

    // -------------------------------------------------------------
    // PHASE 6: DRIVER ACTIVE RIDE & LIFECYCLE PROGRESSION
    // -------------------------------------------------------------
    console.log('\n--- Phase 6: Active Ride & Lifecycle Transitions ---');

    // Test 19: Driver 1 retrieves their active ride
    const activeRideRes = await requestApi('/api/driver/active-ride', { token: driver1Token });
    assert(
      activeRideRes.status === 200 &&
        activeRideRes.body?.data?.id === createdRideId &&
        activeRideRes.body?.data?.status === 'accepted',
      'TEST 19: GET /api/driver/active-ride returns the accepted ride for Driver 1'
    );

    // Test 20: Driver 1 cannot accept another ride while one is in progress
    const secondRideRes = await requestApi('/api/rides', {
      method: 'POST',
      token: riderToken,
      body: {
        pickupAddress: 'KPGU, Gandhinagar',
        pickupLatitude: 23.2156,
        pickupLongitude: 72.6369,
        destinationAddress: 'Ahmedabad Railway Station',
        destinationLatitude: 23.0268,
        destinationLongitude: 72.6006,
        rideType: 'comfort',
      },
    });
    const secondRideId = secondRideRes.body?.data?.id;

    const acceptWhileBusyRes = await requestApi(`/api/rides/${secondRideId}/accept`, {
      method: 'POST',
      token: driver1Token,
    });
    assert(
      acceptWhileBusyRes.status === 409 &&
        acceptWhileBusyRes.body?.error?.message?.includes('active ride in progress'),
      'TEST 20: Driver with active ride cannot accept a second ride simultaneously (HTTP 409)'
    );

    // Test 21: Status lifecycle: driver_arriving -> driver_arrived -> ride_started -> ride_completed
    const statusArriving = await requestApi(`/api/driver/rides/${createdRideId}/status`, {
      method: 'PATCH',
      token: driver1Token,
      body: { status: 'driver_arriving' },
    });
    assert(
      statusArriving.status === 200 && statusArriving.body?.data?.status === 'driver_arriving',
      'TEST 21a: Ride transitions to "driver_arriving"'
    );

    const statusArrived = await requestApi(`/api/driver/rides/${createdRideId}/status`, {
      method: 'PATCH',
      token: driver1Token,
      body: { status: 'driver_arrived' },
    });
    assert(
      statusArrived.status === 200 && statusArrived.body?.data?.status === 'driver_arrived',
      'TEST 21b: Ride transitions to "driver_arrived"'
    );

    // Attempt to start trip without OTP verification -> rejected with HTTP 400
    const startWithoutOtp = await requestApi(`/api/driver/rides/${createdRideId}/status`, {
      method: 'PATCH',
      token: driver1Token,
      body: { status: 'ride_started' },
    });
    assert(
      startWithoutOtp.status === 400 &&
        startWithoutOtp.body?.error?.message?.includes('mandatory passenger OTP verification'),
      'TEST 21c: Attempting to start trip without OTP verification is strictly rejected'
    );

    // Retrieve passenger OTP from rider endpoint and verify
    const riderRideData = await requestApi(`/api/rides/${createdRideId}`, { token: riderToken });
    const riderOtp = riderRideData.body?.data?.otp_code;
    const verifyOtpRes = await requestApi(`/api/driver/rides/${createdRideId}/verify-otp`, {
      method: 'POST',
      token: driver1Token,
      body: { otp: riderOtp },
    });
    assert(
      verifyOtpRes.status === 200 &&
        verifyOtpRes.body?.data?.status === 'ride_started' &&
        verifyOtpRes.body?.data?.started_at !== null,
      'TEST 21c-2: Correct OTP verification transitions ride to "ride_started" with started_at timestamp'
    );

    const statusCompleted = await requestApi(`/api/driver/rides/${createdRideId}/status`, {
      method: 'PATCH',
      token: driver1Token,
      body: { status: 'ride_completed' },
    });
    assert(
      statusCompleted.status === 200 &&
        statusCompleted.body?.data?.status === 'ride_completed' &&
        statusCompleted.body?.data?.completed_at !== null,
      'TEST 21d: Ride transitions to "ride_completed" with completed_at timestamp'
    );

    // Test 22: Completed ride appears in driver's history
    const historyRes = await requestApi('/api/driver/history', { token: driver1Token });
    const inHistory = historyRes.body?.data?.some((r: any) => r.id === createdRideId);
    assert(
      historyRes.status === 200 && inHistory === true,
      'TEST 22: Completed ride appears in driver history (GET /api/driver/history)'
    );

    // Test 23: Driver is now freed to accept the second ride
    const acceptSecondNow = await requestApi(`/api/rides/${secondRideId}/accept`, {
      method: 'POST',
      token: driver1Token,
    });
    assert(
      acceptSecondNow.status === 200 && acceptSecondNow.body?.data?.status === 'accepted',
      'TEST 23: After completion, Driver 1 is free to accept new incoming rides'
    );

    // Test 24: Driver cannot go offline while having an active accepted on-demand trip
    const goOfflineWithActiveTrip = await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driver1Token,
      body: { isOnline: false },
    });
    assert(
      goOfflineWithActiveTrip.status === 400 &&
        goOfflineWithActiveTrip.body?.error?.message?.includes('active on-demand trip'),
      'TEST 24: Driver attempting to switch offline while on accepted ride is rejected with HTTP 400'
    );

    // Test 25: Rider can see OTP, driver active-ride hides OTP
    const riderViewRide = await requestApi(`/api/rides/${secondRideId}`, { token: riderToken });
    const otpCode = riderViewRide.body?.data?.otp_code;
    assert(
      typeof otpCode === 'string' && otpCode.length === 4,
      'TEST 25a: Rider sees 4-digit verification OTP on accepted ride'
    );

    const driverViewRide = await requestApi('/api/driver/active-ride', { token: driver1Token });
    assert(
      driverViewRide.body?.data?.otp_code === undefined,
      'TEST 25b: Driver active-ride response hides plaintext passenger OTP'
    );

    // Test 26: Driver submits wrong OTP -> rejected
    const wrongOtpRes = await requestApi(`/api/driver/rides/${secondRideId}/verify-otp`, {
      method: 'POST',
      token: driver1Token,
      body: { otp: '9999' === otpCode ? '1111' : '9999' },
    });
    assert(
      wrongOtpRes.status === 400 && wrongOtpRes.body?.error?.code === 'INVALID_OTP',
      'TEST 26: Driver entering wrong OTP is rejected with HTTP 400 INVALID_OTP'
    );

    // Test 27: Driver submits correct OTP -> transitions to ride_started
    const correctOtpRes = await requestApi(`/api/driver/rides/${secondRideId}/verify-otp`, {
      method: 'POST',
      token: driver1Token,
      body: { otp: otpCode },
    });
    // Test 28: Complete second ride
    const completeSecond = await requestApi(`/api/driver/rides/${secondRideId}/status`, {
      method: 'PATCH',
      token: driver1Token,
      body: { status: 'ride_completed' },
    });
    assert(
      completeSecond.status === 200 && completeSecond.body?.data?.status === 'ride_completed',
      'TEST 28: Second ride successfully marked ride_completed'
    );

    // -------------------------------------------------------------
    // PHASE 7: CUSTOMER RIDE CANCELLATION & SCHEDULED RIDE OFFLINE ELIGIBILITY
    // -------------------------------------------------------------
    console.log('\n--- Phase 7: Customer Cancellation & Scheduled Ride Offline Rules ---');

    // Test 29: Customer Ride Cancellation Flow
    const cancellableRideRes = await requestApi('/api/rides', {
      method: 'POST',
      token: riderToken,
      body: {
        pickupAddress: 'Connaught Place, New Delhi',
        pickupLatitude: 28.6315,
        pickupLongitude: 77.2167,
        destinationAddress: 'Indira Gandhi International Airport, New Delhi',
        destinationLatitude: 28.5562,
        destinationLongitude: 77.1000,
        rideType: 'comfort',
      },
    });
    const cancellableRideId = cancellableRideRes.body?.data?.id;

    const cancelRes = await requestApi(`/api/rides/${cancellableRideId}/cancel`, {
      method: 'POST',
      token: riderToken,
      body: { reason: 'Change of plans' },
    });
    assert(
      cancelRes.status === 200 &&
        cancelRes.body?.data?.status === 'cancelled' &&
        cancelRes.body?.data?.cancellation_reason === 'Change of plans',
      'TEST 29: Customer ride cancellation successfully updates ride status to "cancelled" with reason'
    );

    // Test 30: Driver CAN go offline when having ONLY future scheduled rides
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const scheduledRideRes = await requestApi('/api/rides', {
      method: 'POST',
      token: riderToken,
      body: {
        pickupAddress: 'Cyber City, Gurugram',
        pickupLatitude: 28.4950,
        pickupLongitude: 77.0895,
        destinationAddress: 'Aerocity, New Delhi',
        destinationLatitude: 28.5492,
        destinationLongitude: 77.1215,
        rideType: 'premium',
        scheduledAt: futureTime,
      },
    });
    const scheduledRideId = scheduledRideRes.body?.data?.id;

    // Driver 1 accepts the future scheduled ride
    const acceptScheduledRes = await requestApi(`/api/rides/${scheduledRideId}/accept`, {
      method: 'POST',
      token: driver1Token,
    });
    assert(
      acceptScheduledRes.status === 200 && acceptScheduledRes.body?.data?.status === 'accepted',
      'TEST 30a: Driver 1 successfully assigned to future scheduled ride'
    );

    // Driver 1 attempts to switch to offline: MUST SUCCEED because they only have future scheduled rides!
    const goOfflineWithScheduledRes = await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driver1Token,
      body: { isOnline: false },
    });
    assert(
      goOfflineWithScheduledRes.status === 200 &&
        goOfflineWithScheduledRes.body?.data?.isOnline === false,
      'TEST 30b: Driver CAN go offline when having ONLY future scheduled rides'
    );

    // Test 31: Driver goes back online and cannot go offline once an active on-demand trip is accepted
    const backOnlineRes = await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driver1Token,
      body: { isOnline: true },
    });
    assert(
      backOnlineRes.status === 200 && backOnlineRes.body?.data?.isOnline === true,
      'TEST 31a: Driver successfully switches back online'
    );

    const onDemandRideRes = await requestApi('/api/rides', {
      method: 'POST',
      token: riderToken,
      body: {
        pickupAddress: 'Sector 29, Gurugram',
        pickupLatitude: 28.4682,
        pickupLongitude: 77.0632,
        destinationAddress: 'Golf Course Road, Gurugram',
        destinationLatitude: 28.4595,
        destinationLongitude: 77.0950,
        rideType: 'comfort',
      },
    });
    const onDemandRideId = onDemandRideRes.body?.data?.id;

    // Driver accepts active on-demand ride
    await requestApi(`/api/rides/${onDemandRideId}/accept`, {
      method: 'POST',
      token: driver1Token,
    });

    // Driver now attempts to go offline: MUST BE REJECTED with HTTP 400
    const offlineWithActiveTripRes = await requestApi('/api/driver/availability', {
      method: 'PATCH',
      token: driver1Token,
      body: { isOnline: false },
    });
    assert(
      offlineWithActiveTripRes.status === 400 &&
        offlineWithActiveTripRes.body?.error?.message?.includes('active on-demand trip'),
      'TEST 31b: Driver CANNOT go offline while having an active on-demand trip in progress'
    );
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(` Summary: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStep4Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
