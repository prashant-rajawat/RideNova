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

export interface RideWithStops extends Ride {
  stops: RideStop[];
  reference_id?: string;
  driver?: DriverDisplayInfo | null;
  scheduled_at?: string | null;
}

async function enrichRideWithDriver(ride: Ride, stops: RideStop[]): Promise<RideWithStops> {
  const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
  let driverInfo: DriverDisplayInfo | null = null;

  if (ride.driver_id && isDatabaseConfigured()) {
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

  return {
    ...ride,
    stops,
    reference_id: shortRef,
    driver: driverInfo,
  };
}

export const rideRepository = {
  /**
   * Create a new ride record and associated stops in database
   */
  async create(rideInput: CreateRideDbInput, stops: CreateStopDbInput[] = []): Promise<RideWithStops> {
    const status: RideStatus = rideInput.status || 'requested';

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
            status
          ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        let sql = `SELECT * FROM rides WHERE status = 'requested' AND driver_id IS NULL`;
        const params: unknown[] = [];

        if (vehicleType) {
          params.push(vehicleType);
          sql += ` AND ride_type = $${params.length}`;
        }

        sql += ` ORDER BY created_at DESC LIMIT 50`;

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
    for (const ride of memoryRides.values()) {
      if (ride.status === 'requested' && !ride.driver_id && !excludeSet.has(ride.id)) {
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

    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Atomically assign a driver to a requested ride.
   * Returns null if ride was already taken, cancelled, or not in 'requested' status.
   */
  async acceptRide(rideId: string, driverId: string): Promise<RideWithStops | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Ride>(
          `UPDATE rides 
           SET status = 'accepted', driver_id = $1, accepted_at = NOW(), updated_at = NOW()
           WHERE id = $2 AND status = 'requested' AND driver_id IS NULL
           RETURNING *`,
          [driverId, rideId]
        );

        if (res.rows.length === 0) {
          return null; // Atomic conflict: ride already taken or status no longer requested
        }

        const acceptedRide = res.rows[0];
        const stopsRes = await query<RideStop>(
          `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
          [acceptedRide.id]
        );

        return enrichRideWithDriver(acceptedRide, stopsRes.rows);
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
    ride.updated_at = now;
    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Find current active ride for a driver
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

        const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
        return {
          ...ride,
          stops: stopsRes.rows,
          reference_id: shortRef,
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
        const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(-6).toUpperCase()}`;
        return {
          ...ride,
          stops,
          reference_id: shortRef,
        };
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
           WHERE id = $2 AND status IN ('requested', 'accepted', 'driver_arriving')
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
    if (!ride || !['requested', 'accepted', 'driver_arriving'].includes(ride.status)) return null;

    ride.status = 'cancelled';
    ride.cancelled_at = new Date().toISOString();
    ride.cancellation_reason = cancellationReason;
    ride.updated_at = new Date().toISOString();
    memoryRides.set(rideId, ride);

    const stops = memoryRideStops.get(rideId) || [];
    return enrichRideWithDriver(ride, stops);
  },

  /**
   * Retrieve all rides for Admin console
   */
  async getAllRides(status?: string): Promise<RideWithStops[]> {
    if (isDatabaseConfigured()) {
      try {
        let sql = `SELECT * FROM rides`;
        const params: unknown[] = [];
        if (status) {
          params.push(status);
          sql += ` WHERE status = $1`;
        }
        sql += ` ORDER BY created_at DESC LIMIT 100`;

        const res = await query<Ride>(sql, params);
        const results: RideWithStops[] = [];
        for (const ride of res.rows) {
          const stopsRes = await query<RideStop>(
            `SELECT * FROM ride_stops WHERE ride_id = $1 ORDER BY stop_order ASC`,
            [ride.id]
          );
          results.push(await enrichRideWithDriver(ride, stopsRes.rows));
        }
        return results;
      } catch (error) {
        logger.error('Error getting all rides for admin', {
          error: (error as Error).message,
        });
        throw error;
      }
    }

    const results: RideWithStops[] = [];
    for (const ride of memoryRides.values()) {
      if (!status || ride.status === status) {
        const stops = memoryRideStops.get(ride.id) || [];
        results.push(await enrichRideWithDriver(ride, stops));
      }
    }
    return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Reset in-memory ride store (used in tests)
   */
  clearMemoryStore(): void {
    memoryRides.clear();
    memoryRideStops.clear();
  },
};
