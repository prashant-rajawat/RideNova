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
};
