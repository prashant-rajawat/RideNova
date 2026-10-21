import {
  ApiHealthResponse,
  DbHealthResponse,
  AuthMeResponse,
  AuthRoleResponse,
  AuthUser,
  CreateRidePayload,
  RideApiResponse,
  RidesListApiResponse,
  RideWithStops,
  DriverProfile,
  Vehicle,
  AvailableRideSummary,
  RideStatus,
  Payment,
  Review,
  PromoCode,
  Notification,
  SupportTicket,
  AdminOverviewData,
  AdminDriver,
  ReceiptData,
  DriverKycPayload,
  DriverPayout,
  DriverEarningsSummary,
} from '../types/index.ts';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';

let currentAuthToken: string | null = null;

export class ApiError extends Error {
  public code?: string;

  constructor(
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';

    if (details && typeof details === 'object' && 'error' in details) {
      const errObj = (details as { error: { code?: string; message?: string } }).error;
      if (errObj && typeof errObj === 'object' && errObj.code) {
        this.code = errObj.code;
      }
    }
  }
}

export function setAuthToken(token: string | null): void {
  currentAuthToken = token;
}

export function getAuthToken(): string | null {
  return currentAuthToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Attach Bearer token if present
  if (currentAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      let errorDetails: unknown = undefined;

      if (isJson) {
        try {
          const body = await response.json();
          if (body?.error?.message) {
            errorMessage = body.error.message;
          } else if (body?.message) {
            errorMessage = body.message;
          }
          errorDetails = body;
        } catch {
          // ignore json parse error
        }
      }

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) {
      throw error;
    }
    const err = error as Error;
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out after 10 seconds', 408);
    }
    throw new ApiError(err.message || 'Network request failed', 0);
  }
}

export const api = {
  /**
   * Check backend application health: GET /api/health
   */
  async getApiHealth(): Promise<ApiHealthResponse> {
    return request<ApiHealthResponse>('/health');
  },

  /**
   * Check database connection health: GET /api/health/db
   */
  async getDbHealth(): Promise<DbHealthResponse> {
    return request<DbHealthResponse>('/health/db');
  },

  /**
   * Get current authenticated application user: GET /api/auth/me
   */
  async getMe(): Promise<AuthMeResponse> {
    return request<AuthMeResponse>('/auth/me');
  },

  /**
   * Get current authenticated user's role: GET /api/auth/role
   */
  async getRole(): Promise<AuthRoleResponse> {
    return request<AuthRoleResponse>('/auth/role');
  },

  /**
   * Update profile (safe fields: name, phone): PATCH /api/auth/profile
   */
  async updateProfile(data: { name?: string; phone?: string }): Promise<AuthMeResponse> {
    return request<AuthMeResponse>('/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Controlled dev promotion endpoint: POST /api/auth/dev-promote
   */
  async devPromote(targetRole: 'rider' | 'driver' | 'admin'): Promise<{ success: boolean; data: AuthUser }> {
    return request<{ success: boolean; data: AuthUser }>('/auth/dev-promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole }),
    });
  },

  /**
   * Test role-protected endpoints
   */
  async testRiderRoute(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/auth/rider-test');
  },

  async testDriverRoute(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/auth/driver-test');
  },

  async testAdminRoute(): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>('/auth/admin-test');
  },

  /**
   * Authoritative route preview and fare calculation: POST /api/rides/route
   */
  async previewRoute(payload: {
    pickup: { latitude: number; longitude: number; address?: string };
    destination: { latitude: number; longitude: number; address?: string };
    stops?: Array<{ latitude: number; longitude: number; stopOrder: number; address?: string }>;
  }): Promise<{
    success: boolean;
    data: {
      distanceKm: number;
      durationMinutes: number;
      routeSource: 'google_routes_api' | 'fallback_estimate';
      isGoogleRoute: boolean;
      encodedPolyline?: string | null;
      fares: Record<string, any>;
    };
  }> {
    return request('/rides/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Create a new ride request: POST /api/rides
   */
  async createRide(payload: CreateRidePayload): Promise<RideApiResponse> {
    return request<RideApiResponse>('/rides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get specific ride by ID: GET /api/rides/:id
   */
  async getRide(id: string): Promise<RideApiResponse> {
    return request<RideApiResponse>(`/rides/${id}`);
  },

  /**
   * Get ride history for authenticated rider: GET /api/rides
   */
  async getRides(): Promise<RidesListApiResponse> {
    return request<RidesListApiResponse>('/rides');
  },

  /**
   * Driver: Get complete driver profile & vehicle: GET /api/driver/me
   */
  async getDriverProfile(): Promise<{ success: boolean; data: DriverProfile }> {
    return request<{ success: boolean; data: DriverProfile }>('/driver/me');
  },

  /**
   * Driver: Update profile details: PATCH /api/driver/profile
   */
  async updateDriverProfile(data: {
    name?: string;
    phone?: string;
    licenseNumber?: string;
  }): Promise<{ success: boolean; data: DriverProfile }> {
    return request<{ success: boolean; data: DriverProfile }>('/driver/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Driver: Get vehicle details: GET /api/driver/vehicle
   */
  async getDriverVehicle(): Promise<{ success: boolean; data: Vehicle | null }> {
    return request<{ success: boolean; data: Vehicle | null }>('/driver/vehicle');
  },

  /**
   * Driver: Register/update vehicle: POST /api/driver/vehicle
   */
  async updateDriverVehicle(data: {
    vehicleType: 'economy' | 'comfort' | 'premium';
    make: string;
    model: string;
    color: string;
    registrationNumber: string;
    year: number;
  }): Promise<{ success: boolean; message: string; data: Vehicle }> {
    return request<{ success: boolean; message: string; data: Vehicle }>('/driver/vehicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Driver: Toggle online/offline availability: PATCH /api/driver/availability
   */
  async setDriverAvailability(data: {
    isOnline: boolean;
    latitude?: number;
    longitude?: number;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      isOnline: boolean;
      status: string;
      currentLatitude: number | null;
      currentLongitude: number | null;
    };
  }> {
    return request<{
      success: boolean;
      message: string;
      data: {
        isOnline: boolean;
        status: string;
        currentLatitude: number | null;
        currentLongitude: number | null;
      };
    }>('/driver/availability', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Driver: Update live GPS location: PATCH /api/driver/location
   */
  async updateDriverLocation(latitude: number, longitude: number): Promise<{ success: boolean; data: any }> {
    return request('/driver/location', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  /**
   * Driver: Get available ride requests: GET /api/driver/requests
   */
  async getDriverRequests(excludeIds: string[] = []): Promise<{
    success: boolean;
    data: AvailableRideSummary[];
    count: number;
  }> {
    const queryStr = excludeIds.length > 0 ? `?exclude=${encodeURIComponent(excludeIds.join(','))}` : '';
    return request<{
      success: boolean;
      data: AvailableRideSummary[];
      count: number;
    }>(`/driver/requests${queryStr}`);
  },

  /**
   * Driver: Secure atomic ride acceptance: POST /api/rides/:id/accept
   */
  async acceptRide(rideId: string): Promise<{
    success: boolean;
    message: string;
    data: RideWithStops;
  }> {
    return request<{
      success: boolean;
      message: string;
      data: RideWithStops;
    }>(`/rides/${rideId}/accept`, {
      method: 'POST',
    });
  },

  /**
   * Driver: Get active ride: GET /api/driver/active-ride
   */
  async getDriverActiveRide(): Promise<{
    success: boolean;
    data: RideWithStops | null;
  }> {
    return request<{
      success: boolean;
      data: RideWithStops | null;
    }>('/driver/active-ride');
  },

  /**
   * Driver: Update ride status: PATCH /api/driver/rides/:id/status
   */
  async updateRideStatus(
    rideId: string,
    status: RideStatus,
    cancellationReason?: string
  ): Promise<{
    success: boolean;
    message: string;
    data: RideWithStops;
  }> {
    return request<{
      success: boolean;
      message: string;
      data: RideWithStops;
    }>(`/driver/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, cancellationReason }),
    });
  },

  /**
   * Driver: Get driver ride history: GET /api/driver/history
   */
  async getDriverHistory(): Promise<{
    success: boolean;
    data: RideWithStops[];
    count: number;
  }> {
    return request<{
      success: boolean;
      data: RideWithStops[];
      count: number;
    }>('/driver/history');
  },

  /**
   * Driver: Submit or save KYC onboarding wizard progress: POST /api/driver/kyc
   */
  async submitDriverKyc(payload: DriverKycPayload): Promise<{
    success: boolean;
    message: string;
    data: DriverProfile;
  }> {
    return request<{
      success: boolean;
      message: string;
      data: DriverProfile;
    }>('/driver/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  /**
   * Driver: Get comprehensive earnings metrics: GET /api/driver/earnings
   */
  async getDriverEarnings(): Promise<{
    success: boolean;
    data: DriverEarningsSummary;
  }> {
    return request<{
      success: boolean;
      data: DriverEarningsSummary;
    }>('/driver/earnings');
  },

  /**
   * Driver: Get payout records: GET /api/driver/payouts
   */
  async getDriverPayouts(): Promise<{
    success: boolean;
    data: DriverPayout[];
  }> {
    return request<{
      success: boolean;
      data: DriverPayout[];
    }>('/driver/payouts');
  },

  /**
   * Driver: Request earnings payout: POST /api/driver/payouts
   */
  async requestDriverPayout(amount: number): Promise<{
    success: boolean;
    message: string;
    data: DriverPayout;
  }> {
    return request<{
      success: boolean;
      message: string;
      data: DriverPayout;
    }>('/driver/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
  },

  /**
   * Cancel an active ride: POST /api/rides/:id/cancel
   */
  async cancelRide(rideId: string, reason?: string): Promise<{ success: boolean; message: string; data: RideWithStops }> {
    return request<{ success: boolean; message: string; data: RideWithStops }>(`/rides/${rideId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Urgency booster: update driver incentive for requested ride: POST /api/rides/:id/incentive
   */
  async boostRideIncentive(
    rideId: string,
    incentiveAmount: number,
    priorityLevel?: string
  ): Promise<{ success: boolean; message: string; data: RideWithStops }> {
    return request<{ success: boolean; message: string; data: RideWithStops }>(`/rides/${rideId}/incentive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incentiveAmount, priorityLevel }),
    });
  },

  /**
   * Verify passenger trip-start OTP (Driver action): POST /api/driver/rides/:id/verify-otp
   */
  async verifyTripOtp(
    rideId: string,
    otp: string
  ): Promise<{ success: boolean; message: string; data: RideWithStops }> {
    return request<{ success: boolean; message: string; data: RideWithStops }>(`/driver/rides/${rideId}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }),
    });
  },

  /**
   * Process payment for a ride (Stripe test mode / Card): POST /api/rides/:id/pay
   */
  async payRide(
    rideId: string,
    payload: { paymentMethod?: string; stripeToken?: string; promoCode?: string } = {}
  ): Promise<{ success: boolean; message: string; data: { payment: Payment; receipt: ReceiptData } }> {
    return request<{ success: boolean; message: string; data: { payment: Payment; receipt: ReceiptData } }>(
      `/rides/${rideId}/pay`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Submit post-ride driver rating and review: POST /api/rides/:id/review
   */
  async submitReview(
    rideId: string,
    rating: number,
    comment?: string
  ): Promise<{ success: boolean; message: string; data: Review }> {
    return request<{ success: boolean; message: string; data: Review }>(`/rides/${rideId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
  },

  /**
   * Get ride receipt: GET /api/rides/:id/receipt
   */
  async getReceipt(rideId: string): Promise<{ success: boolean; data: ReceiptData }> {
    return request<{ success: boolean; data: ReceiptData }>(`/rides/${rideId}/receipt`);
  },

  /**
   * Support Tickets: GET /api/support/tickets
   */
  async getSupportTickets(): Promise<{ success: boolean; data: SupportTicket[]; count: number }> {
    return request<{ success: boolean; data: SupportTicket[]; count: number }>('/support/tickets');
  },

  /**
   * Create Support Ticket: POST /api/support/tickets
   */
  async createSupportTicket(data: {
    category: string;
    subject: string;
    description: string;
    priority?: string;
  }): Promise<{ success: boolean; message: string; data: SupportTicket }> {
    return request<{ success: boolean; message: string; data: SupportTicket }>('/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Update Support Ticket Status: PATCH /api/support/tickets/:id
   */
  async updateSupportTicketStatus(
    id: string,
    status: string
  ): Promise<{ success: boolean; message: string; data: SupportTicket }> {
    return request<{ success: boolean; message: string; data: SupportTicket }>(`/support/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Promo Codes: GET /api/promos
   */
  async getPromos(): Promise<{ success: boolean; data: PromoCode[] }> {
    return request<{ success: boolean; data: PromoCode[] }>('/promos');
  },

  /**
   * Validate Promo: POST /api/promos/validate
   */
  async validatePromo(
    code: string,
    fare: number
  ): Promise<{
    success: boolean;
    data: { valid: boolean; discount: number; finalFare: number; message: string; promo?: PromoCode };
  }> {
    return request('/promos/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, fare }),
    });
  },

  /**
   * Admin: Create Promo: POST /api/promos
   */
  async createPromo(data: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    minimum_fare?: number;
    maximum_discount?: number;
    usage_limit?: number;
    starts_at?: string;
    expires_at?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; message: string; data: PromoCode }> {
    return request('/promos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin: Update Promo: PUT /api/promos/:id
   */
  async updatePromo(
    id: string,
    data: Partial<PromoCode>
  ): Promise<{ success: boolean; message: string; data?: PromoCode }> {
    return request(`/promos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin: Delete Promo: DELETE /api/promos/:id
   */
  async deletePromo(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/promos/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Notifications: GET /api/notifications
   */
  async getNotifications(): Promise<{ success: boolean; data: Notification[]; count: number }> {
    return request<{ success: boolean; data: Notification[]; count: number }>('/notifications');
  },

  /**
   * Mark Notification Read: PATCH /api/notifications/:id/read
   */
  async markNotificationRead(id: string): Promise<{ success: boolean; message: string }> {
    return request<{ success: boolean; message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  /**
   * Admin: Overview: GET /api/admin/overview
   */
  async getAdminOverview(): Promise<{ success: boolean; data: AdminOverviewData }> {
    return request<{ success: boolean; data: AdminOverviewData }>('/admin/overview');
  },

  /**
   * Admin: Drivers: GET /api/admin/drivers
   */
  async getAdminDrivers(): Promise<{ success: boolean; data: AdminDriver[]; count: number }> {
    return request<{ success: boolean; data: AdminDriver[]; count: number }>('/admin/drivers');
  },

  /**
   * Admin: Update Driver Status: PATCH /api/admin/drivers/:id/status
   */
  async updateAdminDriverStatus(
    id: string,
    status: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/admin/drivers/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason }),
    });
  },

  /**
   * Admin: All Rides: GET /api/admin/rides
   */
  async getAdminRides(status?: string): Promise<{ success: boolean; data: RideWithStops[]; count: number }> {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<{ success: boolean; data: RideWithStops[]; count: number }>(`/admin/rides${q}`);
  },

  /**
   * Admin: Diagnostics & Database Connection Verification: GET /api/admin/diagnostics
   */
  async getAdminDiagnostics(): Promise<{
    success: boolean;
    data: {
      databaseConfigured: boolean;
      databaseConnected: boolean;
      dbMessage: string;
      latencyMs: number;
      ridesCount: number;
      driversCount: number;
      usersCount: number;
      paymentsCount: number;
      serverTime: string;
    };
  }> {
    return request('/admin/diagnostics');
  },

  /**
   * Admin: Get specific ride audit details: GET /api/admin/rides/:id
   */
  async getAdminRide(rideId: string): Promise<{ success: boolean; data: RideWithStops }> {
    return request<{ success: boolean; data: RideWithStops }>(`/admin/rides/${rideId}`);
  },

  /**
   * Admin: Assign or reassign driver to ride: POST /api/admin/rides/:id/assign-driver
   */
  async adminAssignDriver(
    rideId: string,
    driverId: string
  ): Promise<{ success: boolean; message: string; data: RideWithStops }> {
    return request<{ success: boolean; message: string; data: RideWithStops }>(
      `/admin/rides/${rideId}/assign-driver`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      }
    );
  },

  /**
   * Admin: Update ride status / cancellation: PATCH /api/admin/rides/:id/status
   */
  async adminUpdateRideStatus(
    rideId: string,
    status: string,
    reason?: string
  ): Promise<{ success: boolean; message: string; data: RideWithStops }> {
    return request<{ success: boolean; message: string; data: RideWithStops }>(`/admin/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
  },

  /**
   * Admin: All Payments: GET /api/admin/payments
   */
  async getAdminPayments(): Promise<{ success: boolean; data: Payment[]; count: number }> {
    return request<{ success: boolean; data: Payment[]; count: number }>('/admin/payments');
  },

  /**
   * Admin: All Riders: GET /api/admin/riders
   */
  async getAdminRiders(): Promise<{ success: boolean; data: any[]; count: number }> {
    return request<{ success: boolean; data: any[]; count: number }>('/admin/riders');
  },

  /**
   * Create Stripe Checkout session: POST /api/payments/checkout-session
   */
  async createCheckoutSession(
    rideId: string,
    promoCode?: string
  ): Promise<{ success: boolean; message: string; data: { sessionId: string; url: string; simulated?: boolean } }> {
    return request('/payments/checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rideId, promoCode }),
    });
  },

  /**
   * Get payment status for a ride: GET /api/payments/ride/:rideId
   */
  async getPaymentStatus(rideId: string): Promise<{ success: boolean; data: Payment | null }> {
    return request(`/payments/ride/${rideId}`);
  },

  /**
   * Get payment settings: GET /api/payments/settings
   */
  async getPaymentSettings(): Promise<{ success: boolean; data: any }> {
    return request('/payments/settings');
  },

  /**
   * Update payment settings: PUT /api/admin/payments/settings
   */
  async updatePaymentSettings(data: any): Promise<{ success: boolean; message: string; data: any }> {
    return request('/payments/admin/payments/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get commission settings: GET /api/admin/commission-settings
   */
  async getCommissionSettings(): Promise<{ success: boolean; data: any }> {
    return request('/payments/admin/commission-settings');
  },

  /**
   * Update commission settings: PUT /api/admin/commission-settings
   */
  async updateCommissionSettings(data: any): Promise<{ success: boolean; message: string; data: any }> {
    return request('/payments/admin/commission-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get payment methods: GET /api/payments/methods
   */
  async getPaymentMethods(): Promise<{ success: boolean; data: any[] }> {
    return request('/payments/methods');
  },

  /**
   * Get all payment methods (Admin): GET /api/admin/payment-methods
   */
  async getAdminPaymentMethods(): Promise<{ success: boolean; data: any[] }> {
    return request('/payments/admin/payment-methods');
  },

  /**
   * Create payment method (Admin): POST /api/admin/payment-methods
   */
  async createPaymentMethod(data: any): Promise<{ success: boolean; message: string; data: any }> {
    return request('/payments/admin/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Update payment method (Admin): PUT /api/admin/payment-methods/:id
   */
  async updatePaymentMethod(id: string, data: any): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/payments/admin/payment-methods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete payment method (Admin): DELETE /api/admin/payment-methods/:id
   */
  async deletePaymentMethod(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/payments/admin/payment-methods/${id}`, {
      method: 'DELETE',
    });
  },
  /**
   * Get customer profile: GET /api/profile
   */
  async getProfile(): Promise<{ success: boolean; data: any }> {
    return request('/profile');
  },

  /**
   * Update profile extension: PATCH /api/profile/extension
   */
  async updateProfileExtension(data: any): Promise<{ success: boolean; data: any }> {
    return request('/profile/extension', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Add emergency contact: POST /api/profile/emergency-contacts
   */
  async addEmergencyContact(data: any): Promise<{ success: boolean; data: any }> {
    return request('/profile/emergency-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete emergency contact: DELETE /api/profile/emergency-contacts/:contactId
   */
  async deleteEmergencyContact(contactId: string): Promise<{ success: boolean; message: string }> {
    return request(`/profile/emergency-contacts/${contactId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update safety preferences: PATCH /api/profile/safety-preferences
   */
  async updateSafetyPreferences(data: any): Promise<{ success: boolean; data: any }> {
    return request('/profile/safety-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get emergency contacts: GET /api/profile/emergency-contacts
   */
  async getEmergencyContacts(): Promise<{ success: boolean; data: any[] }> {
    return request('/profile/emergency-contacts');
  },

  /**
   * Get safety preferences: GET /api/profile/safety-preferences
   */
  async getSafetyPreferences(): Promise<{ success: boolean; data: any }> {
    return request('/profile/safety-preferences');
  },

  /**
   * Get admin full rider profile: GET /api/admin/riders/:id/profile
   */
  async getAdminRiderProfile(id: string): Promise<{ success: boolean; data: any }> {
    return request(`/admin/riders/${id}/profile`);
  },

  /**
   * Get admin full driver profile: GET /api/admin/drivers/:id/profile
   */
  async getAdminDriverProfile(id: string): Promise<{ success: boolean; data: any }> {
    return request(`/admin/drivers/${id}/profile`);
  },

  // --- Parcel Delivery API ---
  async createParcel(data: any): Promise<{ success: boolean; message: string; data: any }> {
    return request('/parcels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async getParcels(): Promise<{ success: boolean; data: any[]; count: number }> {
    return request('/parcels');
  },

  async getParcel(id: string): Promise<{ success: boolean; data: any }> {
    return request(`/parcels/${id}`);
  },

  async cancelParcel(id: string, reason?: string): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/parcels/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
  },

  async getDriverParcelRequests(): Promise<{ success: boolean; data: any[]; count: number }> {
    return request('/parcels/driver/requests');
  },

  async acceptParcel(id: string): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/parcels/driver/${id}/accept`, {
      method: 'POST',
    });
  },

  async getActiveParcel(): Promise<{ success: boolean; data: any }> {
    return request('/parcels/driver/active');
  },

  async verifyPickupOtp(id: string, otp: string, evidenceUrl?: string): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/parcels/driver/${id}/verify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, evidenceUrl }),
    });
  },

  async updateParcelStatus(id: string, status: string, cancellationReason?: string): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/parcels/driver/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, cancellationReason }),
    });
  },

  async verifyDeliveryOtp(id: string, otp: string, evidenceUrl?: string): Promise<{ success: boolean; message: string; data: any }> {
    return request(`/parcels/driver/${id}/verify-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, evidenceUrl }),
    });
  },

  async getAdminParcels(): Promise<{ success: boolean; data: any[]; count: number }> {
    return request('/parcels/admin/all');
  },
};
