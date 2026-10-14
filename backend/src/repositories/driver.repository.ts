import { query, isDatabaseConfigured } from '../db/index.ts';
import { Driver, Vehicle, DriverStatus, VehicleType } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

// In-memory fallback stores
const memoryDrivers = new Map<string, Driver>();
const memoryVehicles = new Map<string, Vehicle>();

export interface DriverWithVehicle extends Driver {
  vehicle?: Vehicle | null;
}

export const driverRepository = {
  /**
   * Find driver by application user ID
   */
  async findByUserId(userId: string): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Driver>(
          `SELECT * FROM drivers WHERE user_id = $1 LIMIT 1`,
          [userId]
        );
        if (res.rows.length === 0) return null;

        const driver = res.rows[0];
        let vehicle: Vehicle | null = null;

        const vRes = await query<Vehicle>(
          `SELECT * FROM vehicles WHERE driver_id = $1 LIMIT 1`,
          [driver.id]
        );
        if (vRes.rows.length > 0) {
          vehicle = vRes.rows[0];
        }

        return {
          ...driver,
          vehicle,
        };
      } catch (error) {
        logger.error('Error finding driver by user ID', {
          error: (error as Error).message,
          userId,
        });
        throw error;
      }
    }

    // Memory fallback
    for (const d of memoryDrivers.values()) {
      if (d.user_id === userId) {
        const vehicle = memoryVehicles.get(d.id) || null;
        return {
          ...d,
          vehicle,
        };
      }
    }
    return null;
  },

  /**
   * Find driver by driver ID
   */
  async findById(driverId: string): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Driver>(
          `SELECT * FROM drivers WHERE id = $1 LIMIT 1`,
          [driverId]
        );
        if (res.rows.length === 0) return null;

        const driver = res.rows[0];
        let vehicle: Vehicle | null = null;

        const vRes = await query<Vehicle>(
          `SELECT * FROM vehicles WHERE driver_id = $1 LIMIT 1`,
          [driver.id]
        );
        if (vRes.rows.length > 0) {
          vehicle = vRes.rows[0];
        }

        return {
          ...driver,
          vehicle,
        };
      } catch (error) {
        logger.error('Error finding driver by ID', {
          error: (error as Error).message,
          driverId,
        });
        throw error;
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;

    const vehicle = memoryVehicles.get(driverId) || null;
    return {
      ...driver,
      vehicle,
    };
  },

  /**
   * Find or create driver profile for a verified driver user
   */
  async findOrCreate(userId: string, defaultLicense?: string): Promise<DriverWithVehicle> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const license = defaultLicense || `DL-${userId.slice(-8).toUpperCase()}`;

    if (isDatabaseConfigured()) {
      try {
        const insertRes = await query<Driver>(
          `INSERT INTO drivers (user_id, license_number, status, is_online, rating, total_rides)
           VALUES ($1, $2, 'approved', FALSE, 5.00, 0)
           RETURNING *`,
          [userId, license]
        );
        const newDriver = insertRes.rows[0];
        return {
          ...newDriver,
          vehicle: null,
        };
      } catch (error) {
        logger.error('Error inserting driver profile', {
          error: (error as Error).message,
          userId,
        });
        throw error;
      }
    }

    // Memory fallback
    const driverId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newDriver: Driver = {
      id: driverId,
      user_id: userId,
      license_number: license,
      vehicle_id: null,
      status: 'approved',
      is_online: false,
      current_latitude: 23.2156,
      current_longitude: 72.6369,
      rating: 5.0,
      total_rides: 0,
      created_at: now,
      updated_at: now,
    };

    memoryDrivers.set(driverId, newDriver);
    return {
      ...newDriver,
      vehicle: null,
    };
  },

  /**
   * Update online/offline availability and optional GPS coordinates
   */
  async updateAvailability(
    driverId: string,
    isOnline: boolean,
    latitude?: number | null,
    longitude?: number | null
  ): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Driver>(
          `UPDATE drivers
           SET is_online = $1,
               current_latitude = COALESCE($2, current_latitude),
               current_longitude = COALESCE($3, current_longitude),
               updated_at = NOW()
           WHERE id = $4
           RETURNING *`,
          [isOnline, latitude ?? null, longitude ?? null, driverId]
        );
        if (res.rows.length === 0) return null;
        return this.findById(driverId);
      } catch (error) {
        logger.error('Error updating driver availability', {
          error: (error as Error).message,
          driverId,
          isOnline,
        });
        throw error;
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;

    driver.is_online = isOnline;
    if (latitude !== undefined && latitude !== null) driver.current_latitude = latitude;
    if (longitude !== undefined && longitude !== null) driver.current_longitude = longitude;
    driver.updated_at = new Date().toISOString();
    memoryDrivers.set(driverId, driver);

    return this.findById(driverId);
  },

  /**
   * Update driver live GPS location
   */
  async updateLocation(
    driverId: string,
    latitude: number,
    longitude: number
  ): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Driver>(
          `UPDATE drivers
           SET current_latitude = $1,
               current_longitude = $2,
               updated_at = NOW()
           WHERE id = $3
           RETURNING *`,
          [latitude, longitude, driverId]
        );
        if (res.rows.length === 0) return null;
        return this.findById(driverId);
      } catch (error) {
        logger.error('Error updating driver location', {
          error: (error as Error).message,
          driverId,
        });
        throw error;
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;

    driver.current_latitude = latitude;
    driver.current_longitude = longitude;
    driver.updated_at = new Date().toISOString();
    memoryDrivers.set(driverId, driver);

    return this.findById(driverId);
  },

  /**
   * Update driver license number
   */
  async updateLicense(driverId: string, licenseNumber: string): Promise<Driver | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Driver>(
          `UPDATE drivers SET license_number = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [licenseNumber.trim(), driverId]
        );
        return res.rows[0] || null;
      } catch (error) {
        logger.error('Error updating license', { error: (error as Error).message, driverId });
        throw error;
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;
    driver.license_number = licenseNumber.trim();
    driver.updated_at = new Date().toISOString();
    memoryDrivers.set(driverId, driver);
    return { ...driver };
  },

  /**
   * Upsert vehicle details for driver
   */
  async upsertVehicle(
    driverId: string,
    vehicleData: {
      vehicle_type: VehicleType;
      make: string;
      model: string;
      color: string;
      registration_number: string;
      year: number;
    }
  ): Promise<Vehicle> {
    const reg = vehicleData.registration_number.trim().toUpperCase();

    if (isDatabaseConfigured()) {
      try {
        // Check if driver already has a vehicle
        const existingRes = await query<Vehicle>(
          `SELECT id FROM vehicles WHERE driver_id = $1 LIMIT 1`,
          [driverId]
        );

        let vehicle: Vehicle;
        if (existingRes.rows.length > 0) {
          const updateRes = await query<Vehicle>(
            `UPDATE vehicles
             SET vehicle_type = $1, make = $2, model = $3, color = $4, registration_number = $5, year = $6, updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
              vehicleData.vehicle_type,
              vehicleData.make.trim(),
              vehicleData.model.trim(),
              vehicleData.color.trim(),
              reg,
              vehicleData.year,
              existingRes.rows[0].id,
            ]
          );
          vehicle = updateRes.rows[0];
        } else {
          const insertRes = await query<Vehicle>(
            `INSERT INTO vehicles (driver_id, vehicle_type, make, model, color, registration_number, year)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
              driverId,
              vehicleData.vehicle_type,
              vehicleData.make.trim(),
              vehicleData.model.trim(),
              vehicleData.color.trim(),
              reg,
              vehicleData.year,
            ]
          );
          vehicle = insertRes.rows[0];
        }

        // Link driver.vehicle_id
        await query(
          `UPDATE drivers SET vehicle_id = $1, updated_at = NOW() WHERE id = $2`,
          [vehicle.id, driverId]
        );

        return vehicle;
      } catch (error) {
        logger.error('Error upserting vehicle in database', {
          error: (error as Error).message,
          driverId,
        });
        throw error;
      }
    }

    // Memory fallback
    const now = new Date().toISOString();
    let vehicle = memoryVehicles.get(driverId);

    if (vehicle) {
      vehicle.vehicle_type = vehicleData.vehicle_type;
      vehicle.make = vehicleData.make.trim();
      vehicle.model = vehicleData.model.trim();
      vehicle.color = vehicleData.color.trim();
      vehicle.registration_number = reg;
      vehicle.year = vehicleData.year;
      vehicle.updated_at = now;
    } else {
      const vId = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      vehicle = {
        id: vId,
        driver_id: driverId,
        vehicle_type: vehicleData.vehicle_type,
        make: vehicleData.make.trim(),
        model: vehicleData.model.trim(),
        color: vehicleData.color.trim(),
        registration_number: reg,
        year: vehicleData.year,
        created_at: now,
        updated_at: now,
      };
    }

    memoryVehicles.set(driverId, vehicle);

    const driver = memoryDrivers.get(driverId);
    if (driver) {
      driver.vehicle_id = vehicle.id;
      driver.updated_at = now;
      memoryDrivers.set(driverId, driver);
    }

    return { ...vehicle };
  },

  /**
   * Reset driver memory stores
   */
  clearMemoryStore(): void {
    memoryDrivers.clear();
    memoryVehicles.clear();
  },
};
