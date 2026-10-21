import { query, isDatabaseConfigured } from '../db/index.ts';
import { Parcel, CreateParcelInput, ParcelStatus } from '../types/parcel.ts';
import { logger } from '../utils/logger.ts';

const memoryParcels = new Map<string, Parcel>();

export const parcelRepository = {
  clearMemoryStore() {
    memoryParcels.clear();
  },

  async create(senderId: string, input: CreateParcelInput, estimatedFare: number, distanceKm: number, durationMinutes: number): Promise<Parcel> {
    const id = `parcel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const shortRef = `RN-PCL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(-6).toUpperCase()}`;
    const now = new Date().toISOString();
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const parcel: Parcel = {
      id,
      reference_id: shortRef,
      sender_id: senderId,
      driver_id: null,
      pickup_address: input.pickupAddress,
      pickup_latitude: input.pickupLatitude,
      pickup_longitude: input.pickupLongitude,
      sender_name: input.senderName || null,
      sender_phone: input.senderPhone || null,
      delivery_address: input.deliveryAddress,
      delivery_latitude: input.deliveryLatitude,
      delivery_longitude: input.deliveryLongitude,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      parcel_category: input.parcelCategory || 'document',
      package_size: input.packageSize || 'small',
      weight_kg: input.weightKg || 1.0,
      is_fragile: input.isFragile || false,
      handling_instructions: input.handlingInstructions || null,
      sender_description: input.senderDescription || null,
      photo_urls: input.photoUrls || [],
      status: 'requested',
      estimated_fare: estimatedFare,
      final_fare: null,
      distance_km: distanceKm,
      estimated_duration_minutes: durationMinutes,
      payment_method: input.paymentMethod || 'online_prepaid',
      payment_status: input.paymentMethod === 'online_prepaid' ? 'paid' : 'unpaid',
      pickup_otp: pickupOtp,
      pickup_otp_verified: false,
      pickup_evidence_url: null,
      delivery_otp: deliveryOtp,
      delivery_otp_verified: false,
      delivery_evidence_url: null,
      cancellation_reason: null,
      requested_at: now,
      accepted_at: null,
      picked_up_at: null,
      delivered_at: null,
      cancelled_at: null,
      created_at: now,
      updated_at: now,
    };

    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(
          `INSERT INTO parcels (
            id, reference_id, sender_id, pickup_address, pickup_latitude, pickup_longitude,
            sender_name, sender_phone, delivery_address, delivery_latitude, delivery_longitude,
            recipient_name, recipient_phone, parcel_category, package_size, weight_kg, is_fragile,
            handling_instructions, sender_description, photo_urls, status, estimated_fare,
            distance_km, estimated_duration_minutes, payment_method, payment_status,
            pickup_otp, delivery_otp
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
          RETURNING *`,
          [
            parcel.id, parcel.reference_id, parcel.sender_id, parcel.pickup_address, parcel.pickup_latitude, parcel.pickup_longitude,
            parcel.sender_name, parcel.sender_phone, parcel.delivery_address, parcel.delivery_latitude, parcel.delivery_longitude,
            parcel.recipient_name, parcel.recipient_phone, parcel.parcel_category, parcel.package_size, parcel.weight_kg, parcel.is_fragile,
            parcel.handling_instructions, parcel.sender_description, parcel.photo_urls, parcel.status, parcel.estimated_fare,
            parcel.distance_km, parcel.estimated_duration_minutes, parcel.payment_method, parcel.payment_status,
            parcel.pickup_otp, parcel.delivery_otp
          ]
        );
        return res.rows[0];
      } catch (err) {
        logger.error('Error inserting parcel in database, using memory fallback', { error: (err as Error).message });
      }
    }

    memoryParcels.set(id, parcel);
    return parcel;
  },

  async findById(parcelId: string): Promise<Parcel | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(`SELECT * FROM parcels WHERE id = $1 LIMIT 1`, [parcelId]);
        if (res.rows.length > 0) return res.rows[0];
      } catch {
        // ignore
      }
    }
    return memoryParcels.get(parcelId) || null;
  },

  async findBySenderId(senderId: string): Promise<Parcel[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(`SELECT * FROM parcels WHERE sender_id = $1 ORDER BY created_at DESC`, [senderId]);
        return res.rows;
      } catch {
        // ignore
      }
    }
    return Array.from(memoryParcels.values()).filter(p => p.sender_id === senderId);
  },

  async findAvailableRequests(excludeDriverId?: string): Promise<Parcel[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(`SELECT * FROM parcels WHERE status = 'requested' AND driver_id IS NULL ORDER BY created_at DESC`);
        return res.rows;
      } catch {
        // ignore
      }
    }
    return Array.from(memoryParcels.values()).filter(p => p.status === 'requested' && !p.driver_id);
  },

  async findActiveForDriver(driverId: string): Promise<Parcel | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(
          `SELECT * FROM parcels WHERE driver_id = $1 AND status IN ('accepted', 'picked_up', 'in_transit') ORDER BY updated_at DESC LIMIT 1`,
          [driverId]
        );
        if (res.rows.length > 0) return res.rows[0];
      } catch {
        // ignore
      }
    }
    for (const p of memoryParcels.values()) {
      if (p.driver_id === driverId && ['accepted', 'picked_up', 'in_transit'].includes(p.status)) {
        return p;
      }
    }
    return null;
  },

  async acceptParcel(parcelId: string, driverId: string): Promise<Parcel | null> {
    const now = new Date().toISOString();
    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(
          `UPDATE parcels SET status = 'accepted', driver_id = $1, accepted_at = $2, updated_at = $2 WHERE id = $3 AND status = 'requested' AND driver_id IS NULL RETURNING *`,
          [driverId, now, parcelId]
        );
        if (res.rows.length > 0) return res.rows[0];
        return null;
      } catch {
        // ignore
      }
    }
    const p = memoryParcels.get(parcelId);
    if (!p || p.status !== 'requested' || p.driver_id) return null;
    p.status = 'accepted';
    p.driver_id = driverId;
    p.accepted_at = now;
    p.updated_at = now;
    memoryParcels.set(parcelId, p);
    return p;
  },

  async updateStatus(parcelId: string, status: ParcelStatus, extra: { pickupOtpVerified?: boolean; pickupEvidenceUrl?: string; deliveryOtpVerified?: boolean; deliveryEvidenceUrl?: string; cancellationReason?: string; paymentStatus?: string } = {}): Promise<Parcel | null> {
    const now = new Date().toISOString();
    let pickedUpAtClause = '';
    let deliveredAtClause = '';
    let cancelledAtClause = '';
    if (status === 'picked_up') pickedUpAtClause = `, picked_up_at = '${now}'`;
    if (status === 'delivered') deliveredAtClause = `, delivered_at = '${now}'`;
    if (status === 'cancelled') cancelledAtClause = `, cancelled_at = '${now}'`;

    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(
          `UPDATE parcels SET 
            status = $1,
            pickup_otp_verified = COALESCE($2, pickup_otp_verified),
            pickup_evidence_url = COALESCE($3, pickup_evidence_url),
            delivery_otp_verified = COALESCE($4, delivery_otp_verified),
            delivery_evidence_url = COALESCE($5, delivery_evidence_url),
            cancellation_reason = COALESCE($6, cancellation_reason),
            payment_status = COALESCE($7, payment_status),
            updated_at = $8
            ${pickedUpAtClause} ${deliveredAtClause} ${cancelledAtClause}
           WHERE id = $9 RETURNING *`,
          [
            status,
            extra.pickupOtpVerified ?? null,
            extra.pickupEvidenceUrl ?? null,
            extra.deliveryOtpVerified ?? null,
            extra.deliveryEvidenceUrl ?? null,
            extra.cancellationReason ?? null,
            extra.paymentStatus ?? null,
            now,
            parcelId
          ]
        );
        if (res.rows.length > 0) return res.rows[0];
      } catch {
        // ignore
      }
    }

    const p = memoryParcels.get(parcelId);
    if (!p) return null;
    p.status = status;
    if (extra.pickupOtpVerified !== undefined) p.pickup_otp_verified = extra.pickupOtpVerified;
    if (extra.pickupEvidenceUrl !== undefined) p.pickup_evidence_url = extra.pickupEvidenceUrl;
    if (extra.deliveryOtpVerified !== undefined) p.delivery_otp_verified = extra.deliveryOtpVerified;
    if (extra.deliveryEvidenceUrl !== undefined) p.delivery_evidence_url = extra.deliveryEvidenceUrl;
    if (extra.cancellationReason !== undefined) p.cancellation_reason = extra.cancellationReason;
    if (extra.paymentStatus !== undefined) p.payment_status = extra.paymentStatus as any;
    p.updated_at = now;
    if (status === 'picked_up') p.picked_up_at = now;
    if (status === 'delivered') p.delivered_at = now;
    if (status === 'cancelled') p.cancelled_at = now;
    memoryParcels.set(parcelId, p);
    return p;
  },

  async findAllAdmin(): Promise<Parcel[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<any>(`SELECT * FROM parcels ORDER BY created_at DESC`);
        return res.rows;
      } catch {
        // ignore
      }
    }
    return Array.from(memoryParcels.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};
