import { query, isDatabaseConfigured } from '../db/index.ts';
import { Ride, RideStop, VehicleType, RideStatus, RouteSource } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

// In-memory fallback stores
const memoryRides = new Map<string, Ride>();
const memoryRideStops = new Map<string, RideStop[]>();

export interface CreateRideDbInput {
  rider_id: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  distance_km: number;
  estimated_duration_minutes: number;
  estimated_fare: number;
  ride_type: VehicleType;
  status?: RideStatus;
  route_source?: RouteSource | null;
  priority_level?: string;
  incentive_amount?: number;
  expires_at?: string;
  scheduled_at?: string | null;
  booking_mode?: 'on-demand' | 'scheduled';
  payment_status?: 'pending' | 'paid' | 'refunded';
  admin_review_status?: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string | null;
}

export interface CreateStopDbInput {
  stop_order: number;
  address: string;
  latitude: number;
  longitude: number;
}

export interface DriverDisplayInfo {
  id: string;
  name: string;
  phone: string | null;
  rating: number;
  total_rides: number;
  profile_image_url?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  vehicle: {
    make: string;
    model: string;
    color: string;
    registration_number: string;
    year: number;
    vehicle_type: VehicleType;
  } | null;
}

export interface RiderDisplayInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile_image_url?: string | null;
}

export interface PaymentDisplayInfo {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  stripe_payment_intent_id?: string | null;
  paid_at?: string | null;
}

export interface RideWithStops extends Ride {
  stops: RideStop[];
  reference_id?: string;
  driver?: DriverDisplayInfo | null;
  rider?: RiderDisplayInfo | null;
  payment?: PaymentDisplayInfo | null;
  scheduled_at?: string | null;
}

async function enrichRideWithDriver(ride: Ride, stops: RideStop[]): Promise<RideWithStops> {
  const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
  let driverInfo: DriverDisplayInfo | null = null;
  let riderInfo: RiderDisplayInfo | null = null;
  let paymentInfo: PaymentDisplayInfo | null = null;

  if (isDatabaseConfigured()) {
    // 1. Enrich Driver
    if (ride.driver_id) {
      try {
        const res = await query<any>(
          `SELECT d.id, u.name, u.phone, u.profile_image_url, d.rating, d.total_rides,
                  d.current_latitude, d.current_longitude,
                  v.make, v.model, v.color, v.registration_number, v.year, v.vehicle_type
           FROM drivers d
           JOIN users u ON u.id = d.user_id
           LEFT JOIN vehicles v ON v.driver_id = d.id
           WHERE d.id = $1 LIMIT 1`,
          [ride.driver_id]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          driverInfo = {
            id: row.id,
            name: row.name,
            phone: row.phone,
            rating: parseFloat(row.rating || '5.0'),
            total_rides: parseInt(row.total_rides || '0', 10),
            profile_image_url: row.profile_image_url,
            current_latitude: row.current_latitude,
            current_longitude: row.current_longitude,
            vehicle: row.make
              ? {
                  make: row.make,
                  model: row.model,
                  color: row.color,
                  registration_number: row.registration_number,
                  year: row.year,
                  vehicle_type: row.vehicle_type,
                }
              : null,
          };
        }
      } catch {
        // ignore
      }
    }

    // 2. Enrich Rider
    if (ride.rider_id) {
      try {
        const uRes = await query<any>(
          `SELECT id, name, email, phone, profile_image_url FROM users WHERE id = $1 LIMIT 1`,
          [ride.rider_id]
        );
        if (uRes.rows.length > 0) {
          const u = uRes.rows[0];
          riderInfo = {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || null,
            profile_image_url: u.profile_image_url || null,
          };
        }
      } catch {
        // ignore
      }
    }

    // 3. Enrich Payment
    try {
      const pRes = await query<any>(
        `SELECT id, amount, payment_method, status, stripe_payment_intent_id, paid_at FROM payments WHERE ride_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [ride.id]
      );
      if (pRes.rows.length > 0) {
        const p = pRes.rows[0];
        paymentInfo = {
          id: p.id,
          amount: parseFloat(p.amount || '0'),
          payment_method: p.payment_method,
          status: p.status,
          stripe_payment_intent_id: p.stripe_payment_intent_id || null,
          paid_at: p.paid_at || null,
        };
      }
    } catch {
      // ignore
    }
  } else {
    // Memory Fallback enrichment
    try {
      const { userRepository } = await import('./user.repository.ts');
      const { driverRepository } = await import('./driver.repository.ts');

      // Rider in memory
      if (ride.rider_id) {
        const u = await userRepository.findById(ride.rider_id);
        if (u) {
          riderInfo = {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone || null,
            profile_image_url: u.profile_image_url || null,
          };
        }
      }

      // Driver in memory
      if (ride.driver_id) {
        const d = await driverRepository.findById(ride.driver_id);
        if (d) {
          const u = await userRepository.findById(d.user_id);
          driverInfo = {
            id: d.id,
            name: u?.name || 'Driver Partner',
            phone: u?.phone || null,
            rating: Number(d.rating || 5.0),
            total_rides: d.total_rides || 0,
            profile_image_url: u?.profile_image_url || null,
            current_latitude: d.current_latitude ?? null,
            current_longitude: d.current_longitude ?? null,
            vehicle: d.vehicle
              ? {
                  make: d.vehicle.make,
                  model: d.vehicle.model,
                  color: d.vehicle.color,
                  registration_number: d.vehicle.registration_number,
                  year: d.vehicle.year,
                  vehicle_type: d.vehicle.vehicle_type,
                }
              : null,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    ...ride,
    distance_km: ride.distance_km != null ? Number(ride.distance_km) : 0,
    estimated_duration_minutes: Number(ride.estimated_duration_minutes) || 0,
    estimated_fare: Number(ride.estimated_fare) || 0,
    final_fare: ride.final_fare != null ? Number(ride.final_fare) : null,
    stops,
    reference_id: shortRef,
    driver: driverInfo,
    rider: riderInfo,
    payment: paymentInfo,
  };
}

export const rideRepository = {
  /**
   * Create a new ride record and associated stops in database
   */
  async create(rideInput: CreateRideDbInput, stops: CreateStopDbInput[] = []): Promise<RideWithStops> {
    const status: RideStatus = rideInput.status || 'requested';

    const priorityLevel = rideInput.priority_level || 'normal';
    const incentiveAmount = rideInput.incentive_amount || 0;
    const expiresAt = rideInput.expires_at || new Date(Date.now() + 5 * 60000).toISOString();

    if (isDatabaseConfigured()) {
      try {
        const rideRes = await query<Ride>(
          `INSERT INTO rides (
            rider_id,
            driver_id,
            pickup_address,
            pickup_latitude,
            pickup_longitude,
            destination_address,
            destination_latitude,
            destination_longitude,
            distance_km,
            estimated_duration_minutes,
            estimated_fare,
            ride_type,
            status,
            priority_level,
            incentive_amount,
            expires_at,
            scheduled_at,
            booking_mode,
            payment_status,
            admin_review_status
          ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING *`,
          [
            rideInput.rider_id,
            rideInput.pickup_address,
            rideInput.pickup_latitude,
            rideInput.pickup_longitude,
            rideInput.destination_address,
            rideInput.destination_latitude,
            rideInput.destination_longitude,
            rideInput.distance_km,
            rideInput.estimated_duration_minutes,
            rideInput.estimated_fare,
            rideInput.ride_type,
            status,
            priorityLevel,
            incentiveAmount,
            expiresAt,
            rideInput.scheduled_at || null,
            rideInput.booking_mode || 'on-demand',
            rideInput.payment_status || 'pending',
            rideInput.admin_review_status || 'pending',
          ]
        );

        const createdRide = rideRes.rows[0];
        const createdStops: RideStop[] = [];

        // Insert stops if provided
        for (const stop of stops) {
          const stopRes = await query<RideStop>(
            `INSERT INTO ride_stops (
              ride_id,
              stop_order,
              address,
              latitude,
              longitude
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *`,
            [createdRide.id, stop.stop_order, stop.address, stop.latitude, stop.longitude]
          );
          createdStops.push(stopRes.rows[0]);
        }

        logger.info('Created new ride in PostgreSQL', {
          rideId: createdRide.id,
          riderId: createdRide.rider_id,
          stopsCount: createdStops.length,
          status,
        });

        const shortRef = `RN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${createdRide.id.slice(0, 6).toUpperCase()}`;

        return {
          ...createdRide,
          stops: createdStops,
          reference_id: shortRef,
        };
      } catch (error) {
        logger.error('Error inserting ride into PostgreSQL', {
          error: (error as Error).message,
        });
        throw error;
      }
    }

    // Memory fallback
    const rideId = `ride_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const newRide: Ride = {
      id: rideId,
      rider_id: rideInput.rider_id,
      driver_id: null,
      pickup_address: rideInput.pickup_address,
      pickup_latitude: rideInput.pickup_latitude,
      pickup_longitude: rideInput.pickup_longitude,
      destination_address: rideInput.destination_address,
      destination_latitude: rideInput.destination_latitude,
      destination_longitude: rideInput.destination_longitude,
      distance_km: rideInput.distance_km,
      estimated_duration_minutes: rideInput.estimated_duration_minutes,
      estimated_fare: rideInput.estimated_fare,
      final_fare: null,
      ride_type: rideInput.ride_type,
      status,
      route_source: rideInput.route_source || 'fallback_estimate',
      priority_level: rideInput.priority_level || 'normal',
      incentive_amount: rideInput.incentive_amount || 0,
      expires_at: rideInput.expires_at || new Date(Date.now() + 5 * 60000).toISOString(),
      scheduled_at: rideInput.scheduled_at || null,
      requested_at: now,
      accepted_at: null,
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: now,
      updated_at: now,
    };

    const newStops: RideStop[] = stops.map((s, idx) => ({
      id: `stop_${Date.now()}_${idx}`,
      ride_id: rideId,
      stop_order: s.stop_order,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      created_at: now,
    }));

    memoryRides.set(rideId, newRide);
    memoryRideStops.set(rideId, newStops);

    const shortRef = `RN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${rideId.slice(-6).toUpperCase()}`;

    return {
      ...newRide,
      stops: newStops,
      reference_id: shortRef,
    };
  },

  /**
   * Find ride by ID including stops
   */
  async findById(rideId: string): Promise<RideWithStops | null> {
    if (isDatabaseConfigured()) {
      try {
        const rideRes = await query<Ride>(`SELECT * FROM rides WHERE id = $1 LIMIT 1`, [rideId]);
        if (rideRes.rows.length === 0) return null;

        const ride = rideRes.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [rideId]
        );

        return enrichRideWithDriver(ride, stopsRes.rows);
      } catch (error) {
        logger.error('Error finding ride by ID', { error: (error as Error).message, rideId });
        throw error;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride) return null;

    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Find all rides for a specific rider
   */
  async findByRiderId(riderId: string): Promise<RideWithStops[]> {
    if (isDatabaseConfigured()) {
      try {
        const ridesRes = await query<Ride>(
          `SELECT * FROM rides WHERE rider_id = $1 ORDER BY created_at DESC`,
          [riderId]
        );

        const results: RideWithStops[] = [];
        for (const ride of ridesRes.rows) {
          const stopsRes = await query<RideStop>(
            `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
            [ride.id]
          );
          results.push(await enrichRideWithDriver(ride, stopsRes.rows));
        }
        return results;
      } catch (error) {
        logger.error('Error finding rides by rider ID', { error: (error as Error).message, riderId });
        throw error;
      }
    }

    const results: RideWithStops[] = [];
    for (const ride of memoryRides.values()) {
      if (ride.rider_id === riderId) {
        const stops = memoryRideStops.get(ride.id) || [];
        results.push(await enrichRideWithDriver(ride, stops));
      }
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Find available ride requests for online drivers (status = 'requested', driver_id = null)
   */
  async findAvailableRequests(
    vehicleType?: VehicleType,
    excludeRideIds: string[] = []
  ): Promise<RideWithStops[]> {
    const excludeSet = new Set(excludeRideIds);

    if (isDatabaseConfigured()) {
      try {
        let sql = `SELECT * FROM rides WHERE status = 'requested' AND driver_id IS NULL AND (expires_at IS NULL OR expires_at > NOW())`;
        const params: unknown[] = [];

        if (vehicleType) {
          params.push(vehicleType);
          sql += ` AND ride_type = $${params.length}`;
        }

        sql += ` ORDER BY CASE priority_level WHEN 'maximum_priority' THEN 1 WHEN 'high_priority' THEN 2 WHEN 'priority' THEN 3 ELSE 4 END ASC, created_at DESC LIMIT 50`;

        const ridesRes = await query<Ride>(sql, params);
        const results: RideWithStops[] = [];

        for (const ride of ridesRes.rows) {
          if (excludeSet.has(ride.id)) continue;

          const stopsRes = await query<RideStop>(
            `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
            [ride.id]
          );

          const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
          results.push({
            ...ride,
            stops: stopsRes.rows,
            reference_id: shortRef,
          });
        }

        return results;
      } catch (error) {
        logger.error('Error finding available requests', {
          error: (error as Error).message,
        });
        throw error;
      }
    }

    // Memory fallback
    const results: RideWithStops[] = [];
    const now = Date.now();
    for (const ride of memoryRides.values()) {
      if (ride.status === 'requested' && !ride.driver_id && !excludeSet.has(ride.id)) {
        if (ride.expires_at && new Date(ride.expires_at).getTime() <= now) {
          continue; // expired
        }
        if (!vehicleType || ride.ride_type === vehicleType) {
          const stops = memoryRideStops.get(ride.id) || [];
          const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(-6).toUpperCase()}`;
          results.push({
            ...ride,
            stops,
            reference_id: shortRef,
          });
        }
      }
    }

    results.sort((a, b) => {
      const pOrder: Record<string, number> = { maximum_priority: 1, high_priority: 2, priority: 3, normal: 4 };
      const pA = pOrder[a.priority_level || 'normal'] || 4;
      const pB = pOrder[b.priority_level || 'normal'] || 4;
      if (pA !== pB) return pA - pB;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return results;
  },

  /**
   * Atomically assign a driver to a requested ride and generate a secure 4-digit trip verification OTP.
   * Returns null if ride was already taken, cancelled, or not in 'requested' status.
   */
  async acceptRide(rideId: string, driverId: string): Promise<RideWithStops | null> {
    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `UPDATE rides 
           SET status = 'accepted', driver_id = $1, accepted_at = NOW(), otp_code = $3, otp_verified = FALSE, updated_at = NOW()
           WHERE id = $2 AND status = 'requested' AND driver_id IS NULL
           RETURNING *`,
          [driverId, rideId, otpCode]
        );

        if (res.rows.length === 0) {
          return null; // Atomic conflict: ride already taken or status no longer requested
        }

        const acceptedRide = res.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [acceptedRide.id]
        );

        const enriched = await enrichRideWithDriver(acceptedRide, stopsRes.rows);
        return enriched;
      } catch (error) {
        logger.error('Error during atomic ride assignment in PostgreSQL', {
          error: (error as Error).message,
          rideId,
          driverId,
        });
        throw error;
      }
    }

    // Memory fallback atomic check
    const ride = memoryRides.get(rideId);
    if (!ride || ride.status !== 'requested' || ride.driver_id !== null) {
      return null;
    }

    const now = new Date().toISOString();
    ride.status = 'accepted';
    ride.driver_id = driverId;
    ride.accepted_at = now;
    ride.otp_code = otpCode;
    ride.otp_verified = false;
    ride.updated_at = now;
    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    const enriched = await enrichRideWithDriver(ride, stops);
    return enriched;
  },

  /**
   * Find current active ride for a driver (hiding passenger OTP from driver)
   */
  async findActiveRideForDriver(driverId: string): Promise<RideWithStops | null> {
    const activeStatuses: RideStatus[] = ['accepted', 'driver_arriving', 'driver_arrived', 'ride_started'];

    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `SELECT * FROM rides 
           WHERE driver_id = $1 AND status IN ('accepted', 'driver_arriving', 'driver_arrived', 'ride_started')
           ORDER BY updated_at DESC LIMIT 1`,
          [driverId]
        );

        if (res.rows.length === 0) return null;

        const ride = res.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [ride.id]
        );

        const enriched = await enrichRideWithDriver(ride, stopsRes.rows);
        return {
          ...enriched,
          otp_code: undefined, // Hide passenger OTP from driver
        };
      } catch (error) {
        logger.error('Error finding active ride for driver', {
          error: (error as Error).message,
          driverId,
        });
        throw error;
      }
    }

    for (const ride of memoryRides.values()) {
      if (ride.driver_id === driverId && activeStatuses.includes(ride.status)) {
        const stops = memoryRideStops.get(ride.id) || [];
        const enriched = await enrichRideWithDriver(ride, stops);
        return {
          ...enriched,
          otp_code: undefined, // Hide passenger OTP from driver
        };
      }
    }

    return null;
  },

  /**
   * Find active on-demand ride for a driver (excluding future scheduled rides)
   */
  async findActiveOnDemandRideForDriver(driverId: string): Promise<RideWithStops | null> {
    const immediateStatuses: RideStatus[] = ['driver_arriving', 'driver_arrived', 'ride_started'];

    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `SELECT * FROM rides 
           WHERE driver_id = $1 
             AND (
               status IN ('driver_arriving', 'driver_arrived', 'ride_started')
               OR (status = 'accepted' AND (scheduled_at IS NULL OR scheduled_at <= NOW()))
             )
           ORDER BY updated_at DESC LIMIT 1`,
          [driverId]
        );

        if (res.rows.length === 0) return null;

        const ride = res.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [ride.id]
        );

        const enriched = await enrichRideWithDriver(ride, stopsRes.rows);
        return {
          ...enriched,
          otp_code: undefined,
        };
      } catch (error) {
        logger.error('Error finding active on-demand ride for driver', {
          error: (error as Error).message,
          driverId,
        });
        throw error;
      }
    }

    const now = Date.now();
    for (const ride of memoryRides.values()) {
      if (ride.driver_id === driverId) {
        if (immediateStatuses.includes(ride.status)) {
          const stops = memoryRideStops.get(ride.id) || [];
          const enriched = await enrichRideWithDriver(ride, stops);
          return { ...enriched, otp_code: undefined };
        }
        if (ride.status === 'accepted') {
          const isFuture = Boolean(ride.scheduled_at && new Date(ride.scheduled_at).getTime() > now);
          if (!isFuture) {
            const stops = memoryRideStops.get(ride.id) || [];
            const enriched = await enrichRideWithDriver(ride, stops);
            return { ...enriched, otp_code: undefined };
          }
        }
      }
    }

    return null;
  },

  /**
   * Update ride status by assigned driver
   */
  async updateRideStatus(
    rideId: string,
    driverId: string,
    newStatus: RideStatus,
    cancellationReason?: string
  ): Promise<RideWithStops | null> {
    const now = new Date().toISOString();

    if (isDatabaseConfigured()) {
      try {
        let setQuery = `status = $1, updated_at = NOW()`;
        const params: unknown[] = [newStatus, rideId, driverId];

        if (newStatus === 'ride_started') {
          const checkRes = await query<Ride>(
            `SELECT otp_verified FROM rides WHERE id = $1 AND driver_id = $2`,
            [rideId, driverId]
          );
          if (checkRes.rows.length === 0 || !checkRes.rows[0].otp_verified) {
            throw new Error(
              'Starting a trip requires mandatory passenger OTP verification. Please verify the 4-digit code provided by the passenger via the verify-otp endpoint.'
            );
          }
          setQuery += `, started_at = NOW()`;
        } else if (newStatus === 'ride_completed') {
          setQuery += `, completed_at = NOW()`;
        } else if (newStatus === 'cancelled') {
          params.push(cancellationReason || 'Cancelled by driver');
          setQuery += `, cancelled_at = NOW(), cancellation_reason = $4`;
        }

        const res = await query<Ride>(
          `UPDATE rides SET ${setQuery} WHERE id = $2 AND driver_id = $3 RETURNING *`,
          params
        );

        if (res.rows.length === 0) return null;

        const ride = res.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [ride.id]
        );

        const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
        return enrichRideWithDriver(ride, stopsRes.rows);
      } catch (error) {
        logger.error('Error updating ride status in PostgreSQL', {
          error: (error as Error).message,
          rideId,
          newStatus,
        });
        throw error;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride || ride.driver_id !== driverId) return null;

    if (newStatus === 'ride_started' && !ride.otp_verified) {
      throw new Error(
        'Starting a trip requires mandatory passenger OTP verification. Please verify the 4-digit code provided by the passenger via the verify-otp endpoint.'
      );
    }

    ride.status = newStatus;
    ride.updated_at = now;
    if (newStatus === 'ride_started') ride.started_at = now;
    if (newStatus === 'ride_completed') ride.completed_at = now;
    if (newStatus === 'cancelled') {
      ride.cancelled_at = now;
      ride.cancellation_reason = cancellationReason || 'Cancelled by driver';
    }

    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Find all rides completed or handled by this driver
   */
  async findByDriverId(driverId: string): Promise<RideWithStops[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `SELECT * FROM rides WHERE driver_id = $1 ORDER BY created_at DESC`,
          [driverId]
        );

        const results: RideWithStops[] = [];
        for (const ride of res.rows) {
          const stopsRes = await query<RideStop>(
            `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
            [ride.id]
          );
          const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
          results.push({
            ...ride,
            stops: stopsRes.rows,
            reference_id: shortRef,
          });
        }
        return results;
      } catch (error) {
        logger.error('Error finding rides by driver ID', {
          error: (error as Error).message,
          driverId,
        });
        throw error;
      }
    }

    const results: RideWithStops[] = [];
    for (const ride of memoryRides.values()) {
      if (ride.driver_id === driverId) {
        const stops = memoryRideStops.get(ride.id) || [];
        const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(-6).toUpperCase()}`;
        results.push({
          ...ride,
          stops,
          reference_id: shortRef,
        });
      }
    }

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Cancel ride by rider or driver
   */
  async cancelRide(rideId: string, _cancelledByUserId: string, reason?: string): Promise<RideWithStops | null> {
    const cancellationReason = reason || 'Ride cancelled by user';

    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `UPDATE rides 
           SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1, updated_at = NOW()
           WHERE id = $2 AND status IN ('requested', 'accepted', 'driver_arriving', 'driver_arrived')
           RETURNING *`,
          [cancellationReason, rideId]
        );

        if (res.rows.length === 0) return null;

        const ride = res.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [ride.id]
        );
        return enrichRideWithDriver(ride, stopsRes.rows);
      } catch (error) {
        logger.error('Error cancelling ride in database', {
          error: (error as Error).message,
          rideId,
        });
        throw error;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride || !['requested', 'accepted', 'driver_arriving', 'driver_arrived'].includes(ride.status)) return null;

    ride.status = 'cancelled';
    ride.cancelled_at = new Date().toISOString();
    ride.cancellation_reason = cancellationReason;
    ride.updated_at = new Date().toISOString();
    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Update urgency driver incentive for a requested ride (replacement semantics)
   */
  async updateIncentive(
    rideId: string,
    incentiveAmount: number,
    priorityLevel?: string
  ): Promise<RideWithStops | null> {
    const level = priorityLevel || (incentiveAmount >= 1000 ? 'maximum_priority' : incentiveAmount >= 500 ? 'high_priority' : incentiveAmount > 0 ? 'priority' : 'normal');

    if (isDatabaseConfigured()) {
      try {
        const currentRes = await query<Ride>(`SELECT * FROM rides WHERE id = $1 AND status = 'requested'`, [rideId]);
        if (currentRes.rows.length === 0) return null;
        const current = currentRes.rows[0];
        const prevIncentive = parseFloat((current.incentive_amount as any) || '0');
        const baseFare = parseFloat((current.estimated_fare as any) || '0') - prevIncentive;
        const newEstimatedFare = Math.max(0, baseFare + incentiveAmount);

        const res = await query<Ride>(
          `UPDATE rides 
           SET incentive_amount = $1, priority_level = $2, estimated_fare = $3, updated_at = NOW()
           WHERE id = $4 AND status = 'requested'
           RETURNING *`,
          [incentiveAmount, level, newEstimatedFare, rideId]
        );

        if (res.rows.length === 0) return null;

        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [rideId]
        );
        return enrichRideWithDriver(res.rows[0], stopsRes.rows);
      } catch (error) {
        logger.error('Error updating ride incentive in PostgreSQL', { error: (error as Error).message, rideId });
        throw error;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride || ride.status !== 'requested') return null;

    const prevIncentive = ride.incentive_amount || 0;
    const baseFare = ride.estimated_fare - prevIncentive;
    ride.incentive_amount = incentiveAmount;
    ride.priority_level = level;
    ride.estimated_fare = Math.max(0, baseFare + incentiveAmount);
    ride.updated_at = new Date().toISOString();
    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Verify trip-start OTP and transition ride to ride_started
   */
  async verifyTripOtp(
    rideId: string,
    driverId: string,
    otp: string
  ): Promise<{ success: boolean; ride?: RideWithStops; message?: string }> {
    const cleanOtp = otp.trim();

    if (isDatabaseConfigured()) {
      try {
        const currentRes = await query<Ride>(`SELECT * FROM rides WHERE id = $1`, [rideId]);
        if (currentRes.rows.length === 0) {
          return { success: false, message: 'Ride record not found.' };
        }
        const ride = currentRes.rows[0];
        if (ride.driver_id !== driverId) {
          return { success: false, message: 'You are not the assigned driver for this trip.' };
        }
        if (!['accepted', 'driver_arriving', 'driver_arrived'].includes(ride.status)) {
          return { success: false, message: `Cannot verify OTP for trip with status '${ride.status}'.` };
        }
        if (ride.otp_code && ride.otp_code !== cleanOtp) {
          return {
            success: false,
            message: 'Invalid 4-digit verification code. Please confirm the code shown on the passenger\'s screen.',
          };
        }

        const res = await query<Ride>(
          `UPDATE rides 
           SET otp_verified = TRUE, status = 'ride_started', started_at = NOW(), updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [rideId]
        );

        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [rideId]
        );
        const enriched = await enrichRideWithDriver(res.rows[0], stopsRes.rows);
        return {
          success: true,
          ride: enriched,
          message: 'OTP verified successfully! Trip has started.',
        };
      } catch (error) {
        logger.error('Error verifying trip OTP in PostgreSQL', { error: (error as Error).message, rideId });
        throw error;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride) {
      return { success: false, message: 'Ride record not found.' };
    }
    if (ride.driver_id !== driverId) {
      return { success: false, message: 'You are not the assigned driver for this trip.' };
    }
    if (!['accepted', 'driver_arriving', 'driver_arrived'].includes(ride.status)) {
      return { success: false, message: `Cannot verify OTP for trip with status '${ride.status}'.` };
    }
    if (ride.otp_code && ride.otp_code !== cleanOtp) {
      return {
        success: false,
        message: 'Invalid 4-digit verification code. Please confirm the code shown on the passenger\'s screen.',
      };
    }

    const now = new Date().toISOString();
    ride.otp_verified = true;
    ride.status = 'ride_started';
    ride.started_at = now;
    ride.updated_at = now;
    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    const enriched = await enrichRideWithDriver(ride, stops);
    return {
      success: true,
      ride: enriched,
      message: 'OTP verified successfully! Trip has started.',
    };
  },

  /**
   * Retrieve all rides for Admin console with diagnostic logging & enriched details
   */
  async getAllRides(status?: string): Promise<RideWithStops[]> {
    let dbRides: RideWithStops[] = [];
    if (isDatabaseConfigured()) {
      try {
        let sql = `SELECT * FROM rides`;
        const params: unknown[] = [];
        if (status && status !== 'all') {
          params.push(status);
          sql += ` WHERE status = $1`;
        }
        sql += ` ORDER BY created_at DESC LIMIT 200`;

        const res = await query<Ride>(sql, params);
        if (res.rows.length > 0) {
          const rideIds = res.rows.map((r) => r.id);
          const riderIds = Array.from(new Set(res.rows.map((r) => r.rider_id).filter(Boolean)));
          const driverIds = Array.from(new Set(res.rows.map((r) => r.driver_id).filter(Boolean)));

          // 1. Batch fetch stops
          const stopsMap = new Map<string, RideStop[]>();
          try {
            const stopsRes = await query<RideStop>(
              `SELECT * FROM ride_stops WHERE ride_id = ANY($1::uuid[]) ORDER BY stop_order ASC`,
              [rideIds]
            );
            for (const stop of stopsRes.rows) {
              const list = stopsMap.get(stop.ride_id) || [];
              list.push(stop);
              stopsMap.set(stop.ride_id, list);
            }
          } catch (stopErr) {
            logger.warn('Failed batch stops query in getAllRides', { error: (stopErr as Error).message });
          }

          // 2. Batch fetch riders
          const ridersMap = new Map<string, RiderDisplayInfo>();
          if (riderIds.length > 0) {
            try {
              const ridersRes = await query<any>(
                `SELECT id, name, email, phone, profile_image_url FROM users WHERE id = ANY($1::uuid[])`,
                [riderIds]
              );
              for (const u of ridersRes.rows) {
                ridersMap.set(u.id, {
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  phone: u.phone || null,
                  profile_image_url: u.profile_image_url || null,
                });
              }
            } catch (rErr) {
              logger.warn('Failed batch riders query in getAllRides', { error: (rErr as Error).message });
            }
          }

          // 3. Batch fetch drivers
          const driversMap = new Map<string, DriverDisplayInfo>();
          if (driverIds.length > 0) {
            try {
              const driversRes = await query<any>(
                `SELECT d.id, u.name, u.phone, u.profile_image_url, d.rating, d.total_rides,
                        d.current_latitude, d.current_longitude,
                        v.make, v.model, v.color, v.registration_number, v.year, v.vehicle_type
                 FROM drivers d
                 JOIN users u ON u.id = d.user_id
                 LEFT JOIN vehicles v ON v.driver_id = d.id
                 WHERE d.id = ANY($1::uuid[])`,
                [driverIds]
              );
              for (const row of driversRes.rows) {
                driversMap.set(row.id, {
                  id: row.id,
                  name: row.name,
                  phone: row.phone,
                  rating: parseFloat(row.rating || '5.0'),
                  total_rides: parseInt(row.total_rides || '0', 10),
                  profile_image_url: row.profile_image_url,
                  current_latitude: row.current_latitude,
                  current_longitude: row.current_longitude,
                  vehicle: row.make
                    ? {
                        make: row.make,
                        model: row.model,
                        color: row.color,
                        registration_number: row.registration_number,
                        year: row.year,
                        vehicle_type: row.vehicle_type,
                      }
                    : null,
                });
              }
            } catch (dErr) {
              logger.warn('Failed batch drivers query in getAllRides', { error: (dErr as Error).message });
            }
          }

          // 4. Batch fetch payments
          const paymentsMap = new Map<string, PaymentDisplayInfo>();
          try {
            const paymentsRes = await query<any>(
              `SELECT id, ride_id, amount, payment_method, status, stripe_payment_intent_id, updated_at
               FROM payments
               WHERE ride_id = ANY($1::uuid[])
               ORDER BY created_at DESC`,
              [rideIds]
            );
            for (const p of paymentsRes.rows) {
              if (!paymentsMap.has(p.ride_id)) {
                paymentsMap.set(p.ride_id, {
                  id: p.id,
                  amount: parseFloat(p.amount || '0'),
                  payment_method: p.payment_method,
                  status: p.status,
                  stripe_payment_intent_id: p.stripe_payment_intent_id || null,
                  paid_at: p.updated_at || null,
                });
              }
            }
          } catch (pErr) {
            logger.warn('Failed batch payments query in getAllRides', { error: (pErr as Error).message });
          }

          // Assemble
          for (const ride of res.rows) {
            const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
            const stops = stopsMap.get(ride.id) || [];
            const rider = ride.rider_id ? ridersMap.get(ride.rider_id) || null : null;
            const driver = ride.driver_id ? driversMap.get(ride.driver_id) || null : null;
            const payment = paymentsMap.get(ride.id) || null;

            dbRides.push({
              ...ride,
              distance_km: ride.distance_km != null ? Number(ride.distance_km) : 0,
              estimated_duration_minutes: Number(ride.estimated_duration_minutes) || 0,
              estimated_fare: Number(ride.estimated_fare) || 0,
              final_fare: ride.final_fare != null ? Number(ride.final_fare) : null,
              stops,
              reference_id: shortRef,
              driver,
              rider,
              payment,
            });
          }
        }
      } catch (error) {
        logger.error('Error getting all rides from PostgreSQL for admin', {
          error: (error as Error).message,
        });
      }
    }

    const memoryList: RideWithStops[] = [];
    for (const ride of memoryRides.values()) {
      if (!status || status === 'all' || ride.status === status) {
        const stops = memoryRideStops.get(ride.id) || [];
        memoryList.push(await enrichRideWithDriver(ride, stops));
      }
    }

    const map = new Map<string, RideWithStops>();
    for (const r of [...dbRides, ...memoryList]) {
      if (r && r.id) {
        map.set(r.id, r);
      }
    }
    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    logger.info('Admin retrieved all rides record set', {
      dbConfigured: isDatabaseConfigured(),
      dbCount: dbRides.length,
      memoryCount: memoryList.length,
      totalCount: combined.length,
      statusFilter: status || 'all',
    });

    return combined;
  },

  /**
   * Admin: Assign / Reassign Driver to a ride
   */
  async adminAssignDriver(rideId: string, driverId: string): Promise<RideWithStops | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `UPDATE rides
           SET driver_id = $1, status = CASE WHEN status = 'requested' THEN 'accepted' ELSE status END,
               accepted_at = COALESCE(accepted_at, NOW()), updated_at = NOW()
           WHERE id = $2 RETURNING *`,
          [driverId, rideId]
        );
        if (res.rows.length === 0) return null;
        const ride = res.rows[0];
        const stopsRes = await query<RideStop>(`SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`, [ride.id]);
        return enrichRideWithDriver(ride, stopsRes.rows);
      } catch (err) {
        logger.error('Error in adminAssignDriver in database', { error: (err as Error).message, rideId, driverId });
        throw err;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride) return null;
    ride.driver_id = driverId;
    if (ride.status === 'requested') {
      ride.status = 'accepted';
      ride.accepted_at = new Date().toISOString();
    }
    ride.updated_at = new Date().toISOString();
    memoryRides.set(rideId, ride);
    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Admin: Override / Update Ride Status
   */
  async adminUpdateRideStatus(rideId: string, newStatus: RideStatus, reason?: string): Promise<RideWithStops | null> {
    const now = new Date().toISOString();
    if (isDatabaseConfigured()) {
      try {
        let setClause = `status = $1, updated_at = NOW()`;
        const params: unknown[] = [newStatus, rideId];
        if (newStatus === 'cancelled') {
          setClause += `, cancelled_at = NOW(), cancellation_reason = $3`;
          params.push(reason || 'Cancelled by platform administrator');
        } else if (newStatus === 'ride_completed') {
          setClause += `, completed_at = NOW()`;
        } else if (newStatus === 'ride_started') {
          setClause += `, started_at = NOW()`;
        }
        const res = await query<Ride>(`UPDATE rides SET ${setClause} WHERE id = $2 RETURNING *`, params);
        if (res.rows.length === 0) return null;
        const ride = res.rows[0];
        const stopsRes = await query<RideStop>(`SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`, [ride.id]);
        return enrichRideWithDriver(ride, stopsRes.rows);
      } catch (err) {
        logger.error('Error in adminUpdateRideStatus in database', { error: (err as Error).message, rideId, newStatus });
        throw err;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride) return null;
    ride.status = newStatus;
    ride.updated_at = now;
    if (newStatus === 'cancelled') {
      ride.cancelled_at = now;
      ride.cancellation_reason = reason || 'Cancelled by platform administrator';
    } else if (newStatus === 'ride_completed') {
      ride.completed_at = now;
    } else if (newStatus === 'ride_started') {
      ride.started_at = now;
    }
    memoryRides.set(rideId, ride);
    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Reset in-memory ride store (used in tests)
   */
  clearMemoryStore(): void {
    memoryRides.clear();
    memoryRideStops.clear();
  },
};
