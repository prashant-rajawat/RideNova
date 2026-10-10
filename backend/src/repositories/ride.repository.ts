import { query, isDatabaseConfigured } from '../db/index.ts';
import { Ride, RideStop, VehicleType, RideStatus } from '../types/index.ts';
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
}

export interface CreateStopDbInput {
  stop_order: number;
  address: string;
  latitude: number;
  longitude: number;
}

export interface RideWithStops extends Ride {
  stops: RideStop[];
  reference_id?: string;
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

        const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;

        return {
          ...ride,
          stops: stopsRes.rows,
          reference_id: shortRef,
        };
      } catch (error) {
        logger.error('Error finding ride by ID', { error: (error as Error).message, rideId });
        throw error;
      }
    }

    const ride = memoryRides.get(rideId);
    if (!ride) return null;

    const stops = memoryRideStops.get(rideId) || [];
    const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(-6).toUpperCase()}`;

    return {
      ...ride,
      stops,
      reference_id: shortRef,
    };
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
          const shortRef = `RN-${new Date(ride.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${ride.id.slice(0, 6).toUpperCase()}`;
          results.push({
            ...ride,
            stops: stopsRes.rows,
            reference_id: shortRef,
          });
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
};
