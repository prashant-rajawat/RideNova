import { query, isDatabaseConfigured } from '../db/index.ts';
import { Driver, Vehicle, DriverStatus, VehicleType, KycStatus, DriverPayout } from '../types/index.ts';
import { logger } from '../utils/logger.ts';

// In-memory fallback stores
const memoryDrivers = new Map<string, Driver>();
const memoryVehicles = new Map<string, Vehicle>();
const memoryPayouts = new Map<string, DriverPayout[]>();

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
  async findOrCreate(userId: string, defaultLicense?: string, initialStatus: DriverStatus = 'approved'): Promise<DriverWithVehicle> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      return existing;
    }

    const license = defaultLicense || `DL-${userId.slice(-8).toUpperCase()}`;

    if (isDatabaseConfigured()) {
      try {
        const insertRes = await query<Driver>(
          `INSERT INTO drivers (user_id, license_number, status, kyc_status, is_online, rating, total_rides)
           VALUES ($1, $2, $3, $4, FALSE, 5.00, 0)
           RETURNING *`,
          [userId, license, initialStatus, initialStatus === 'approved' ? 'approved' : 'draft']
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
      status: initialStatus,
      kyc_status: initialStatus === 'approved' ? 'approved' : 'draft',
      is_online: false,
      current_latitude: 28.6139,
      current_longitude: 77.2090,
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
   * Update driver status (e.g. approved, pending, suspended)
   */
  async updateStatus(
    driverId: string,
    status: DriverStatus
  ): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        await query(
          `UPDATE drivers
           SET status = $1,
               kyc_status = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [status, status === 'approved' ? 'approved' : 'draft', driverId]
        );
        return this.findById(driverId);
      } catch (error) {
        logger.error('Error updating driver status', {
          error: (error as Error).message,
          driverId,
          status,
        });
        throw error;
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;
    driver.status = status;
    driver.kyc_status = status === 'approved' ? 'approved' : 'draft';
    driver.updated_at = new Date().toISOString();
    memoryDrivers.set(driverId, driver);
    return this.findById(driverId);
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
   * Update Driver KYC details across steps 1-5
   */
  async updateKyc(
    driverId: string,
    data: {
      dob?: string;
      address?: string;
      licenseNumber?: string;
      licenseState?: string;
      licenseExpiry?: string;
      licenseFrontUrl?: string;
      licenseBackUrl?: string;
      idType?: string;
      idNumberMasked?: string;
      idDocumentUrl?: string;
      bankAccountName?: string;
      bankAccountNumberMasked?: string;
      bankIfsc?: string;
      bankStatus?: string;
      kycStatus?: KycStatus;
      kycSubmittedAt?: string;
    }
  ): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        const setClauses: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [];
        let idx = 1;

        if (data.dob !== undefined) {
          setClauses.push(`dob = $${idx++}`);
          values.push(data.dob);
        }
        if (data.address !== undefined) {
          setClauses.push(`address = $${idx++}`);
          values.push(data.address);
        }
        if (data.licenseNumber !== undefined) {
          setClauses.push(`license_number = $${idx++}`);
          values.push(data.licenseNumber);
        }
        if (data.licenseState !== undefined) {
          setClauses.push(`license_state = $${idx++}`);
          values.push(data.licenseState);
        }
        if (data.licenseExpiry !== undefined) {
          setClauses.push(`license_expiry = $${idx++}`);
          values.push(data.licenseExpiry);
        }
        if (data.licenseFrontUrl !== undefined) {
          setClauses.push(`license_front_url = $${idx++}`);
          values.push(data.licenseFrontUrl);
        }
        if (data.licenseBackUrl !== undefined) {
          setClauses.push(`license_back_url = $${idx++}`);
          values.push(data.licenseBackUrl);
        }
        if (data.idType !== undefined) {
          setClauses.push(`id_type = $${idx++}`);
          values.push(data.idType);
        }
        if (data.idNumberMasked !== undefined) {
          setClauses.push(`id_number_masked = $${idx++}`);
          values.push(data.idNumberMasked);
        }
        if (data.idDocumentUrl !== undefined) {
          setClauses.push(`id_document_url = $${idx++}`);
          values.push(data.idDocumentUrl);
        }
        if (data.bankAccountName !== undefined) {
          setClauses.push(`bank_account_name = $${idx++}`);
          values.push(data.bankAccountName);
        }
        if (data.bankAccountNumberMasked !== undefined) {
          setClauses.push(`bank_account_number_masked = $${idx++}`);
          values.push(data.bankAccountNumberMasked);
        }
        if (data.bankIfsc !== undefined) {
          setClauses.push(`bank_ifsc = $${idx++}`);
          values.push(data.bankIfsc);
        }
        if (data.bankStatus !== undefined) {
          setClauses.push(`bank_status = $${idx++}`);
          values.push(data.bankStatus);
        }
        if (data.kycStatus !== undefined) {
          setClauses.push(`kyc_status = $${idx++}`);
          values.push(data.kycStatus);
        }
        if (data.kycSubmittedAt !== undefined) {
          setClauses.push(`kyc_submitted_at = $${idx++}`);
          values.push(data.kycSubmittedAt);
        }

        values.push(driverId);
        await query(
          `UPDATE drivers SET ${setClauses.join(', ')} WHERE id = $${idx}`,
          values
        );
        return this.findById(driverId);
      } catch (error) {
        logger.error('Error updating driver KYC in DB', { error: (error as Error).message, driverId });
        throw error;
      }
    }

    // Memory fallback
    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;

    if (data.dob !== undefined) driver.dob = data.dob;
    if (data.address !== undefined) driver.address = data.address;
    if (data.licenseNumber !== undefined) driver.license_number = data.licenseNumber;
    if (data.licenseState !== undefined) driver.license_state = data.licenseState;
    if (data.licenseExpiry !== undefined) driver.license_expiry = data.licenseExpiry;
    if (data.licenseFrontUrl !== undefined) driver.license_front_url = data.licenseFrontUrl;
    if (data.licenseBackUrl !== undefined) driver.license_back_url = data.licenseBackUrl;
    if (data.idType !== undefined) driver.id_type = data.idType;
    if (data.idNumberMasked !== undefined) driver.id_number_masked = data.idNumberMasked;
    if (data.idDocumentUrl !== undefined) driver.id_document_url = data.idDocumentUrl;
    if (data.bankAccountName !== undefined) driver.bank_account_name = data.bankAccountName;
    if (data.bankAccountNumberMasked !== undefined) driver.bank_account_number_masked = data.bankAccountNumberMasked;
    if (data.bankIfsc !== undefined) driver.bank_ifsc = data.bankIfsc;
    if (data.bankStatus !== undefined) driver.bank_status = data.bankStatus;
    if (data.kycStatus !== undefined) driver.kyc_status = data.kycStatus;
    if (data.kycSubmittedAt !== undefined) driver.kyc_submitted_at = data.kycSubmittedAt;
    driver.updated_at = new Date().toISOString();

    memoryDrivers.set(driverId, driver);
    return this.findById(driverId);
  },

  /**
   * Admin Approval / Rejection / Suspension
   */
  async updateApprovalStatus(
    driverId: string,
    status: DriverStatus,
    kycStatus: KycStatus,
    rejectionReason?: string
  ): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      try {
        await query(
          `UPDATE drivers
           SET status = $1, kyc_status = $2, rejection_reason = $3, updated_at = NOW()
           WHERE id = $4`,
          [status, kycStatus, rejectionReason || null, driverId]
        );
        return this.findById(driverId);
      } catch (error) {
        logger.error('Error updating driver approval in DB', { error: (error as Error).message, driverId });
        throw error;
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (!driver) return null;

    driver.status = status;
    driver.kyc_status = kycStatus;
    driver.rejection_reason = rejectionReason || null;
    driver.updated_at = new Date().toISOString();
    memoryDrivers.set(driverId, driver);
    return this.findById(driverId);
  },

  /**
   * Get driver payouts list
   */
  async getPayouts(driverId: string): Promise<DriverPayout[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<DriverPayout>(
          `SELECT * FROM driver_payouts WHERE driver_id = $1 ORDER BY created_at DESC`,
          [driverId]
        );
        return res.rows;
      } catch (error) {
        logger.error('Error fetching driver payouts from DB', { error: (error as Error).message, driverId });
      }
    }

    return memoryPayouts.get(driverId) || [];
  },

  /**
   * Create driver payout request
   */
  async createPayout(
    driverId: string,
    amount: number,
    bankAccountMasked?: string
  ): Promise<DriverPayout> {
    const referenceId = `PO-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (isDatabaseConfigured()) {
      try {
        const res = await query<DriverPayout>(
          `INSERT INTO driver_payouts (driver_id, amount, currency, status, bank_account_masked, reference_id)
           VALUES ($1, $2, 'INR', 'completed', $3, $4)
           RETURNING *`,
          [driverId, amount, bankAccountMasked || 'XXXX-XXXX', referenceId]
        );
        return res.rows[0];
      } catch (error) {
        logger.error('Error creating driver payout in DB', { error: (error as Error).message, driverId });
      }
    }

    const payout: DriverPayout = {
      id: `payout_${Date.now()}`,
      driver_id: driverId,
      amount,
      currency: 'INR',
      status: 'completed',
      bank_account_masked: bankAccountMasked || 'XXXX-XXXX',
      reference_id: referenceId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const list = memoryPayouts.get(driverId) || [];
    list.unshift(payout);
    memoryPayouts.set(driverId, list);
    return payout;
  },

  async updateExtendedProfile(
    driverId: string,
    updates: {
      profile_photo_url?: string | null;
      upi_id?: string | null;
      operating_city?: string | null;
      preferred_language?: string | null;
      dob?: string | null;
      address?: string | null;
      auto_accept_rides?: boolean;
      working_hours_preference?: string | null;
      quiet_ride_preference?: boolean;
    }
  ): Promise<DriverWithVehicle | null> {
    if (isDatabaseConfigured()) {
      const setClauses: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (updates.profile_photo_url !== undefined) {
        setClauses.push(`profile_photo_url = $${idx++}`);
        values.push(updates.profile_photo_url);
      }
      if (updates.upi_id !== undefined) {
        setClauses.push(`upi_id = $${idx++}`);
        values.push(updates.upi_id);
      }
      if (updates.operating_city !== undefined) {
        setClauses.push(`operating_city = $${idx++}`);
        values.push(updates.operating_city);
      }
      if (updates.preferred_language !== undefined) {
        setClauses.push(`preferred_language = $${idx++}`);
        values.push(updates.preferred_language);
      }
      if (updates.dob !== undefined) {
        setClauses.push(`dob = $${idx++}`);
        values.push(updates.dob);
      }
      if (updates.address !== undefined) {
        setClauses.push(`address = $${idx++}`);
        values.push(updates.address);
      }
      if (updates.auto_accept_rides !== undefined) {
        setClauses.push(`auto_accept_rides = $${idx++}`);
        values.push(updates.auto_accept_rides);
      }
      if (updates.working_hours_preference !== undefined) {
        setClauses.push(`working_hours_preference = $${idx++}`);
        values.push(updates.working_hours_preference);
      }
      if (updates.quiet_ride_preference !== undefined) {
        setClauses.push(`quiet_ride_preference = $${idx++}`);
        values.push(updates.quiet_ride_preference);
      }

      if (setClauses.length > 0) {
        values.push(driverId);
        await query(
          `UPDATE drivers SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
          values
        );
        return this.findById(driverId);
      }
    }

    const driver = memoryDrivers.get(driverId);
    if (driver) {
      if (updates.profile_photo_url !== undefined) driver.profile_photo_url = updates.profile_photo_url;
      if (updates.upi_id !== undefined) driver.upi_id = updates.upi_id;
      if (updates.operating_city !== undefined) driver.operating_city = updates.operating_city;
      if (updates.preferred_language !== undefined) driver.preferred_language = updates.preferred_language;
      if (updates.dob !== undefined) driver.dob = updates.dob;
      if (updates.address !== undefined) driver.address = updates.address;
      if (updates.auto_accept_rides !== undefined) driver.auto_accept_rides = updates.auto_accept_rides;
      if (updates.working_hours_preference !== undefined) driver.working_hours_preference = updates.working_hours_preference;
      if (updates.quiet_ride_preference !== undefined) driver.quiet_ride_preference = updates.quiet_ride_preference;
      driver.updated_at = new Date().toISOString();
      memoryDrivers.set(driverId, driver);
      return this.findById(driverId);
    }
    return null;
  },

  /**
   * Reset driver memory stores
   */
  clearMemoryStore(): void {
    memoryDrivers.clear();
    memoryVehicles.clear();
    memoryPayouts.clear();
  },

  getAllMemoryDrivers(): Driver[] {
    return Array.from(memoryDrivers.values());
  },

  getAllMemoryVehicles(): Map<string, Vehicle> {
    return memoryVehicles;
  },
};
