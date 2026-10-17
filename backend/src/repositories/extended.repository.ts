import { query, isDatabaseConfigured } from '../db/index.ts';
import { driverRepository } from './driver.repository.ts';
import {
  Payment,
  DriverEarnings,
  Review,
  PromoCode,
  Notification,
  SupportTicket,
  SupportCategory,
  SupportStatus,
  SupportPriority,
  PaymentStatus,
} from '../types/index.ts';
import { logger } from '../utils/logger.ts';

// In-memory fallback stores
const memoryPayments = new Map<string, Payment>();
const memoryEarnings = new Map<string, DriverEarnings>();
const memoryReviews = new Map<string, Review>();
const memoryPromos = new Map<string, PromoCode>();
const memoryNotifications = new Map<string, Notification[]>();
const memoryTickets = new Map<string, SupportTicket>();

// Pre-seed some default promo codes for testing
const defaultPromos: PromoCode[] = [
  {
    id: 'promo_welcome50',
    code: 'WELCOME50',
    discount_type: 'percentage',
    discount_value: 50,
    minimum_fare: 100,
    maximum_discount: 150,
    usage_limit: 100,
    used_count: 8,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'promo_ridenova20',
    code: 'RIDENOVA20',
    discount_type: 'fixed',
    discount_value: 50,
    minimum_fare: 150,
    maximum_discount: 50,
    usage_limit: 500,
    used_count: 24,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
defaultPromos.forEach((p) => memoryPromos.set(p.code.toUpperCase(), p));

export const extendedRepository = {
  // ==================== PAYMENTS ====================
  async recordPayment(data: {
    ride_id: string;
    rider_id: string;
    amount: number;
    currency?: string;
    payment_method: string;
    stripe_payment_intent_id?: string | null;
    status?: PaymentStatus;
  }): Promise<Payment> {
    const status = data.status || 'succeeded';
    const currency = data.currency || 'INR';

    if (isDatabaseConfigured()) {
      try {
        const res = await query<Payment>(
          `INSERT INTO payments (
            ride_id, rider_id, amount, currency, payment_method, stripe_payment_intent_id, status, paid_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING *`,
          [
            data.ride_id,
            data.rider_id,
            data.amount,
            currency,
            data.payment_method,
            data.stripe_payment_intent_id || `pi_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            status,
          ]
        );

        // Update ride final_fare
        await query(`UPDATE rides SET final_fare = $1 WHERE id = $2`, [data.amount, data.ride_id]);

        return res.rows[0];
      } catch (err) {
        logger.error('Error inserting payment in PostgreSQL', { error: (err as Error).message });
      }
    }

    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPayment: Payment = {
      id,
      ride_id: data.ride_id,
      rider_id: data.rider_id,
      amount: data.amount,
      currency,
      payment_method: data.payment_method,
      stripe_payment_intent_id: data.stripe_payment_intent_id || `pi_test_${Date.now()}`,
      status,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryPayments.set(id, newPayment);
    return newPayment;
  },

  async recordDriverEarnings(data: {
    driver_id: string;
    ride_id: string;
    gross_amount: number;
    platform_fee_percentage?: number;
  }): Promise<DriverEarnings> {
    const feePct = data.platform_fee_percentage ?? 0.15; // 15% platform commission
    const platform_fee = Number((data.gross_amount * feePct).toFixed(2));
    const driver_amount = Number((data.gross_amount - platform_fee).toFixed(2));

    if (isDatabaseConfigured()) {
      try {
        const res = await query<DriverEarnings>(
          `INSERT INTO driver_earnings (
            driver_id, ride_id, gross_amount, platform_fee, driver_amount, currency, status
          ) VALUES ($1, $2, $3, $4, $5, 'INR', 'processed')
          RETURNING *`,
          [data.driver_id, data.ride_id, data.gross_amount, platform_fee, driver_amount]
        );
        return res.rows[0];
      } catch (err) {
        logger.error('Error recording driver earnings in PostgreSQL', { error: (err as Error).message });
      }
    }

    const id = `earn_${Date.now()}`;
    const earning: DriverEarnings = {
      id,
      driver_id: data.driver_id,
      ride_id: data.ride_id,
      gross_amount: data.gross_amount,
      platform_fee,
      driver_amount,
      currency: 'INR',
      status: 'processed',
      created_at: new Date().toISOString(),
    };
    memoryEarnings.set(id, earning);
    return earning;
  },

  async getPaymentsByRider(riderId: string): Promise<Payment[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Payment>(
          `SELECT * FROM payments WHERE rider_id = $1 ORDER BY created_at DESC`,
          [riderId]
        );
        return res.rows;
      } catch (err) {
        logger.error('Error fetching payments', { error: (err as Error).message });
      }
    }
    return Array.from(memoryPayments.values())
      .filter((p) => p.rider_id === riderId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getAllPayments(): Promise<Payment[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Payment>(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 100`);
        return res.rows;
      } catch (err) {
        logger.error('Error fetching all payments', { error: (err as Error).message });
      }
    }
    return Array.from(memoryPayments.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getDriverEarningsSummary(driverId: string): Promise<{ totalEarnings: number; totalGross: number; rideCount: number }> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<{ total_earnings: string; total_gross: string; ride_count: string }>(
          `SELECT COALESCE(SUM(driver_amount), 0) as total_earnings,
                  COALESCE(SUM(gross_amount), 0) as total_gross,
                  COUNT(*) as ride_count
           FROM driver_earnings WHERE driver_id = $1`,
          [driverId]
        );
        const row = res.rows[0];
        return {
          totalEarnings: parseFloat(row.total_earnings || '0'),
          totalGross: parseFloat(row.total_gross || '0'),
          rideCount: parseInt(row.ride_count || '0', 10),
        };
      } catch (err) {
        logger.error('Error calculating driver earnings', { error: (err as Error).message });
      }
    }
    const earnings = Array.from(memoryEarnings.values()).filter((e) => e.driver_id === driverId);
    const totalEarnings = earnings.reduce((sum, e) => sum + e.driver_amount, 0);
    const totalGross = earnings.reduce((sum, e) => sum + e.gross_amount, 0);
    return { totalEarnings, totalGross, rideCount: earnings.length };
  },

  // ==================== REVIEWS ====================
  async createReview(data: {
    ride_id: string;
    rider_id: string;
    driver_id: string;
    rating: number;
    comment?: string;
  }): Promise<Review> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Review>(
          `INSERT INTO reviews (ride_id, rider_id, driver_id, rating, comment)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (ride_id, rider_id) DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
           RETURNING *`,
          [data.ride_id, data.rider_id, data.driver_id, data.rating, data.comment || null]
        );

        // Update driver average rating
        await query(
          `UPDATE drivers
           SET rating = (SELECT ROUND(AVG(rating), 2) FROM reviews WHERE driver_id = $1)
           WHERE id = $1`,
          [data.driver_id]
        );

        return res.rows[0];
      } catch (err) {
        logger.error('Error inserting review', { error: (err as Error).message });
      }
    }

    const id = `rev_${Date.now()}`;
    const newRev: Review = {
      id,
      ride_id: data.ride_id,
      rider_id: data.rider_id,
      driver_id: data.driver_id,
      rating: data.rating,
      comment: data.comment || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryReviews.set(id, newRev);
    return newRev;
  },

  async getReviewsForDriver(driverId: string): Promise<Review[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Review>(
          `SELECT * FROM reviews WHERE driver_id = $1 ORDER BY created_at DESC`,
          [driverId]
        );
        return res.rows;
      } catch (err) {
        logger.error('Error fetching driver reviews', { error: (err as Error).message });
      }
    }
    return Array.from(memoryReviews.values()).filter((r) => r.driver_id === driverId);
  },

  // ==================== SUPPORT TICKETS ====================
  async createSupportTicket(data: {
    user_id: string;
    category: SupportCategory;
    subject: string;
    description: string;
    priority?: SupportPriority;
  }): Promise<SupportTicket> {
    const priority = data.priority || 'medium';

    if (isDatabaseConfigured()) {
      try {
        const res = await query<SupportTicket>(
          `INSERT INTO support_tickets (user_id, category, subject, description, priority, status)
           VALUES ($1, $2, $3, $4, $5, 'open')
           RETURNING *`,
          [data.user_id, data.category, data.subject, data.description, priority]
        );
        return res.rows[0];
      } catch (err) {
        logger.error('Error creating support ticket', { error: (err as Error).message });
      }
    }

    const id = `tick_${Date.now()}`;
    const newTicket: SupportTicket = {
      id,
      user_id: data.user_id,
      category: data.category,
      subject: data.subject,
      description: data.description,
      priority,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryTickets.set(id, newTicket);
    return newTicket;
  },

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<SupportTicket>(
          `SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        return res.rows;
      } catch (err) {
        logger.error('Error fetching user tickets', { error: (err as Error).message });
      }
    }
    return Array.from(memoryTickets.values())
      .filter((t) => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<SupportTicket>(
          `SELECT st.*, u.name as user_name, u.email as user_email 
           FROM support_tickets st
           LEFT JOIN users u ON u.id = st.user_id
           ORDER BY st.created_at DESC`
        );
        return res.rows;
      } catch (err) {
        logger.error('Error fetching all tickets', { error: (err as Error).message });
      }
    }
    return Array.from(memoryTickets.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async updateTicketStatus(id: string, status: SupportStatus): Promise<SupportTicket | null> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<SupportTicket>(
          `UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [status, id]
        );
        return res.rows[0] || null;
      } catch (err) {
        logger.error('Error updating ticket status', { error: (err as Error).message });
      }
    }
    const t = memoryTickets.get(id);
    if (!t) return null;
    t.status = status;
    t.updated_at = new Date().toISOString();
    return t;
  },

  // ==================== PROMO CODES ====================
  async validatePromoCode(code: string, fare: number): Promise<{ valid: boolean; discount: number; finalFare: number; message: string; promo?: PromoCode }> {
    const cleanCode = code.toUpperCase().trim();
    let promo: PromoCode | undefined;

    if (isDatabaseConfigured()) {
      try {
        const res = await query<PromoCode>(
          `SELECT * FROM promo_codes WHERE UPPER(code) = $1 AND is_active = TRUE LIMIT 1`,
          [cleanCode]
        );
        if (res.rows.length > 0) {
          promo = res.rows[0];
        }
      } catch (err) {
        logger.error('Error validating promo code in db', { error: (err as Error).message });
      }
    }

    if (!promo) {
      promo = memoryPromos.get(cleanCode);
    }

    if (!promo || !promo.is_active) {
      return { valid: false, discount: 0, finalFare: fare, message: 'Invalid or expired promotional code.' };
    }

    if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
      return { valid: false, discount: 0, finalFare: fare, message: 'This promo code usage limit has been reached.' };
    }

    if (fare < Number(promo.minimum_fare)) {
      return {
        valid: false,
        discount: 0,
        finalFare: fare,
        message: `Ride fare must be at least ₹${promo.minimum_fare} to apply code ${promo.code}.`,
      };
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = (fare * Number(promo.discount_value)) / 100;
      if (promo.maximum_discount && discount > Number(promo.maximum_discount)) {
        discount = Number(promo.maximum_discount);
      }
    } else {
      discount = Number(promo.discount_value);
    }

    discount = Math.min(discount, fare);
    const finalFare = Math.max(0, fare - discount);

    return {
      valid: true,
      discount: Number(discount.toFixed(2)),
      finalFare: Number(finalFare.toFixed(2)),
      message: `Promo code ${promo.code} applied successfully! You saved ₹${discount.toFixed(2)}.`,
      promo,
    };
  },

  async getAllPromos(): Promise<PromoCode[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<PromoCode>(`SELECT * FROM promo_codes ORDER BY created_at DESC`);
        return res.rows;
      } catch (err) {
        logger.error('Error fetching promos', { error: (err as Error).message });
      }
    }
    return Array.from(memoryPromos.values());
  },

  async createPromo(data: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    minimum_fare?: number;
    maximum_discount?: number;
    usage_limit?: number;
  }): Promise<PromoCode> {
    const cleanCode = data.code.toUpperCase().trim();
    if (isDatabaseConfigured()) {
      try {
        const res = await query<PromoCode>(
          `INSERT INTO promo_codes (code, discount_type, discount_value, minimum_fare, maximum_discount, usage_limit, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           RETURNING *`,
          [
            cleanCode,
            data.discount_type,
            data.discount_value,
            data.minimum_fare || 0,
            data.maximum_discount || null,
            data.usage_limit || null,
          ]
        );
        return res.rows[0];
      } catch (err) {
        logger.error('Error creating promo in PostgreSQL', { error: (err as Error).message });
      }
    }

    const newPromo: PromoCode = {
      id: `promo_${Date.now()}`,
      code: cleanCode,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      minimum_fare: data.minimum_fare || 0,
      maximum_discount: data.maximum_discount || null,
      usage_limit: data.usage_limit || null,
      used_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryPromos.set(cleanCode, newPromo);
    return newPromo;
  },

  // ==================== NOTIFICATIONS ====================
  async getUserNotifications(userId: string): Promise<Notification[]> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Notification>(
          `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
          [userId]
        );
        return res.rows;
      } catch (err) {
        logger.error('Error fetching notifications', { error: (err as Error).message });
      }
    }
    let list = memoryNotifications.get(userId);
    if (!list) {
      list = [
        {
          id: 'notif_welcome_' + userId,
          user_id: userId,
          type: 'SYSTEM',
          title: 'Welcome to RideNova!',
          message: 'Your account is fully verified. Book a ride anytime with verified drivers.',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ];
      memoryNotifications.set(userId, list);
    }
    return list;
  },

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    if (isDatabaseConfigured()) {
      try {
        await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`, [id, userId]);
        return true;
      } catch (err) {
        logger.error('Error updating notification', { error: (err as Error).message });
      }
    }
    const userNotifs = memoryNotifications.get(userId) || [];
    const target = userNotifs.find((n) => n.id === id);
    if (target) target.is_read = true;
    return true;
  },

  async createNotification(userId: string, type: string, title: string, message: string): Promise<Notification> {
    if (isDatabaseConfigured()) {
      try {
        const res = await query<Notification>(
          `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, $2, $3, $4) RETURNING *`,
          [userId, type, title, message]
        );
        return res.rows[0];
      } catch (err) {
        logger.error('Error creating notification', { error: (err as Error).message });
      }
    }

    const notif: Notification = {
      id: `notif_${Date.now()}`,
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const list = memoryNotifications.get(userId) || [];
    list.unshift(notif);
    memoryNotifications.set(userId, list);
    return notif;
  },

  // ==================== ADMIN AGGREGATIONS ====================
  async getAdminOverview(): Promise<{
    totalUsers: number;
    totalRiders: number;
    totalDrivers: number;
    activeDrivers: number;
    totalRides: number;
    completedRides: number;
    activeRides: number;
    totalRevenue: number;
    platformFeeTotal: number;
    openTickets: number;
    recentRides: any[];
  }> {
    if (isDatabaseConfigured()) {
      try {
        const userStats = await query<{ role: string; count: string }>(
          `SELECT role, COUNT(*) as count FROM users GROUP BY role`
        );
        const driverStats = await query<{ is_online: boolean; count: string }>(
          `SELECT is_online, COUNT(*) as count FROM drivers GROUP BY is_online`
        );
        const rideStats = await query<{ status: string; count: string; total_fare: string }>(
          `SELECT status, COUNT(*) as count, COALESCE(SUM(estimated_fare), 0) as total_fare FROM rides GROUP BY status`
        );
        const ticketStats = await query<{ count: string }>(
          `SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'in_progress')`
        );
        const recentRides = await query(
          `SELECT r.*, u.name as rider_name, u.email as rider_email
           FROM rides r
           LEFT JOIN users u ON u.id = r.rider_id
           ORDER BY r.created_at DESC LIMIT 8`
        );

        let totalRiders = 0;
        let totalDrivers = 0;
        let totalUsers = 0;
        for (const row of userStats.rows) {
          const c = parseInt(row.count, 10);
          totalUsers += c;
          if (row.role === 'rider') totalRiders += c;
          if (row.role === 'driver') totalDrivers += c;
        }

        let activeDrivers = 0;
        for (const row of driverStats.rows) {
          if (row.is_online) activeDrivers += parseInt(row.count, 10);
        }

        let totalRides = 0;
        let completedRides = 0;
        let activeRides = 0;
        let totalRevenue = 0;

        for (const row of rideStats.rows) {
          const c = parseInt(row.count, 10);
          totalRides += c;
          if (row.status === 'ride_completed') {
            completedRides += c;
            totalRevenue += parseFloat(row.total_fare || '0');
          } else if (['accepted', 'driver_arriving', 'driver_arrived', 'ride_started', 'requested'].includes(row.status)) {
            activeRides += c;
          }
        }

        const platformFeeTotal = Number((totalRevenue * 0.15).toFixed(2));
        const openTickets = parseInt(ticketStats.rows[0]?.count || '0', 10);

        return {
          totalUsers,
          totalRiders,
          totalDrivers,
          activeDrivers,
          totalRides,
          completedRides,
          activeRides,
          totalRevenue,
          platformFeeTotal,
          openTickets,
          recentRides: recentRides.rows,
        };
      } catch (err) {
        logger.error('Error fetching admin overview in db', { error: (err as Error).message });
      }
    }

    return {
      totalUsers: 0,
      totalRiders: 0,
      totalDrivers: 0,
      activeDrivers: 0,
      totalRides: 0,
      completedRides: 0,
      activeRides: 0,
      totalRevenue: 0,
      platformFeeTotal: 0,
      openTickets: 0,
      recentRides: [],
    };
  },

  async getAllDriversForAdmin(): Promise<any[]> {
    let dbDrivers: any[] = [];
    if (isDatabaseConfigured()) {
      try {
        const res = await query(
          `SELECT d.*, u.name, u.email, u.phone,
                  v.make, v.model, v.color, v.registration_number, v.vehicle_type
           FROM drivers d
           JOIN users u ON u.id = d.user_id
           LEFT JOIN vehicles v ON v.driver_id = d.id
           ORDER BY d.created_at DESC`
        );
        dbDrivers = res.rows;
      } catch (err) {
        logger.error('Error fetching admin drivers', { error: (err as Error).message });
      }
    }

    const { userRepository } = await import('./user.repository.ts');
    const { driverRepository } = await import('./driver.repository.ts');
    const memoryDrivers = driverRepository.getAllMemoryDrivers ? driverRepository.getAllMemoryDrivers() : [];
    const memoryUsers = userRepository.getAllMemoryUsers ? userRepository.getAllMemoryUsers() : [];
    const memoryVehicles = driverRepository.getAllMemoryVehicles ? driverRepository.getAllMemoryVehicles() : new Map();

    const memMapped = memoryDrivers.map((d) => {
      const u = memoryUsers.find((user) => user.id === d.user_id) || { name: 'Driver Partner', email: 'driver@ridenova.com', phone: null };
      const v = memoryVehicles.get(d.id) || null;
      return {
        ...d,
        name: u.name,
        email: u.email,
        phone: u.phone,
        make: v?.make || null,
        model: v?.model || null,
        color: v?.color || null,
        registration_number: v?.registration_number || null,
        vehicle_type: v?.vehicle_type || null,
      };
    });

    const map = new Map();
    for (const d of [...dbDrivers, ...memMapped]) {
      if (d && d.id) {
        map.set(d.id, d);
      }
    }
    return Array.from(map.values());
  },

  async updateDriverStatusByAdmin(
    driverId: string,
    status: string,
    rejectionReason?: string
  ): Promise<any> {
    const kycStatus = status === 'approved' ? 'approved' : status === 'suspended' ? 'suspended' : 'rejected';
    const updated = await driverRepository.updateApprovalStatus(
      driverId,
      status as any,
      kycStatus as any,
      rejectionReason
    );
    return updated;
  },

  async getAllRidersForAdmin(): Promise<any[]> {
    let dbRiders: any[] = [];
    if (isDatabaseConfigured()) {
      try {
        const res = await query(
          `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
                  COUNT(r.id) as total_rides
           FROM users u
           LEFT JOIN rides r ON r.rider_id = u.id
           WHERE u.role = 'rider'
           GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at
           ORDER BY u.created_at DESC`
        );
        dbRiders = res.rows;
      } catch (err) {
        logger.error('Error fetching riders for admin', { error: (err as Error).message });
      }
    }

    const { userRepository } = await import('./user.repository.ts');
    const memoryUsers = userRepository.getAllMemoryUsers ? userRepository.getAllMemoryUsers() : [];
    const memRiders = memoryUsers.filter((u) => u.role === 'rider').map((u) => ({
      ...u,
      total_rides: 0,
    }));

    const map = new Map();
    for (const r of [...dbRiders, ...memRiders]) {
      if (r && r.id) {
        map.set(r.id, r);
      }
    }
    return Array.from(map.values());
  },
};
