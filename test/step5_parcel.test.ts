/**
  * RideNova — Step 5 Door-to-Door Parcel Delivery Automated Test Suite
  */

import http from 'http';
import { app } from '../backend/src/app.ts';
import { parcelRepository } from '../backend/src/repositories/parcel.repository.ts';
import { driverRepository } from '../backend/src/repositories/driver.repository.ts';
import { userRepository } from '../backend/src/repositories/user.repository.ts';

async function runStep5Tests() {
  console.log('====================================================');
  console.log(' RideNova — Step 5 Parcel Delivery & Courier Tests');
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

  parcelRepository.clearMemoryStore();
  driverRepository.clearMemoryStore();
  userRepository.clearMemoryStore();

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
      // ignore
    }
    return { status: res.status, body: json };
  }

  try {
    const ts = Date.now();
    const senderToken = `dev_test_token_sender_${ts}:rider:sender_${ts}@test.com:Test%20Sender`;
    const driverToken = `dev_test_token_driver_${ts}:driver:driver_${ts}@test.com:Test%20Courier`;

    // Initialize users
    const meSender = await requestApi('/api/auth/me', { token: senderToken });
    const senderUserId = meSender.body?.data?.id;

    const meDriver = await requestApi('/api/auth/me', { token: driverToken });
    await requestApi('/api/auth/dev-promote', {
      method: 'POST',
      token: driverToken,
      body: { targetRole: 'driver' },
    });
    const driverUserId = meDriver.body?.data?.id;

    // Approve driver and assign vehicle
    const driverEntity = await driverRepository.findOrCreate(driverUserId);
    await driverRepository.updateStatus(driverEntity.id, 'approved');
    await driverRepository.upsertVehicle(driverEntity.id, {
      vehicle_type: 'economy',
      make: 'Hero',
      model: 'Splendor',
      color: 'Black',
      registration_number: 'DL-01-PCL-2026',
      year: 2025,
    });
    await driverRepository.updateAvailability(driverEntity.id, true, 28.6315, 77.2167);

    // Test 1: Sender creates a parcel delivery
    const createParcelRes = await requestApi('/api/parcels', {
      method: 'POST',
      token: senderToken,
      body: {
        pickupAddress: 'Connaught Place, New Delhi',
        pickupLatitude: 28.6315,
        pickupLongitude: 77.2167,
        deliveryAddress: 'Cyber City, Gurugram',
        deliveryLatitude: 28.4950,
        deliveryLongitude: 77.0895,
        recipientName: 'Priya Sharma',
        recipientPhone: '+91 99887 66554',
        parcelCategory: 'document',
        packageSize: 'small',
        weightKg: 0.5,
        isFragile: true,
        paymentMethod: 'online_prepaid',
      },
    });

    const parcelId = createParcelRes.body?.data?.id;
    const pickupOtp = createParcelRes.body?.data?.pickup_otp;
    const deliveryOtp = createParcelRes.body?.data?.delivery_otp;

    assert(
      createParcelRes.status === 201 && parcelId && createParcelRes.body?.data?.status === 'requested',
      'TEST 1: Sender successfully creates a parcel delivery with status=requested'
    );

    // Test 2: Driver sees parcel request in available feed
    const requestsRes = await requestApi('/api/parcels/driver/requests', { token: driverToken });
    const foundRequest = requestsRes.body?.data?.some((p: any) => p.id === parcelId);
    assert(
      requestsRes.status === 200 && foundRequest === true,
      'TEST 2: Online courier driver sees the newly created parcel request in available feed'
    );

    // Test 3: Driver accepts parcel request
    const acceptRes = await requestApi(`/api/parcels/driver/${parcelId}/accept`, {
      method: 'POST',
      token: driverToken,
    });
    assert(
      acceptRes.status === 200 && acceptRes.body?.data?.status === 'accepted',
      'TEST 3: Courier driver atomically accepts parcel delivery -> status becomes accepted'
    );

    // Test 4: Driver verifies pickup OTP with evidence
    const verifyPickupRes = await requestApi(`/api/parcels/driver/${parcelId}/verify-pickup`, {
      method: 'POST',
      token: driverToken,
      body: { otp: pickupOtp, evidenceUrl: 'https://i.ibb.co/3yBbRHHw/pickup-evidence.png' },
    });
    assert(
      verifyPickupRes.status === 200 && verifyPickupRes.body?.data?.status === 'picked_up',
      'TEST 4: Driver correctly verifying pickup OTP transitions parcel to "picked_up"'
    );

    // Test 5: Driver updates status to in_transit
    const transitRes = await requestApi(`/api/parcels/driver/${parcelId}/status`, {
      method: 'PATCH',
      token: driverToken,
      body: { status: 'in_transit' },
    });
    assert(
      transitRes.status === 200 && transitRes.body?.data?.status === 'in_transit',
      'TEST 5: Parcel transitions to "in_transit"'
    );

    // Test 6: Driver verifies delivery OTP with completion evidence
    const verifyDeliveryRes = await requestApi(`/api/parcels/driver/${parcelId}/verify-delivery`, {
      method: 'POST',
      token: driverToken,
      body: { otp: deliveryOtp, evidenceUrl: 'https://i.ibb.co/3yBbRHHw/delivery-evidence.png' },
    });
    assert(
      verifyDeliveryRes.status === 200 && verifyDeliveryRes.body?.data?.status === 'delivered',
      'TEST 6: Driver verifying destination delivery OTP transitions parcel to "delivered"'
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

runStep5Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
