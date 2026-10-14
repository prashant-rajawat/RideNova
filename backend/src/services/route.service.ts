import { config } from '../config/index.ts';
import { calculateDistanceKm, estimateDurationMinutes } from './fare.service.ts';
import { logger } from '../utils/logger.ts';
import { RouteSource } from '../types/index.ts';

export interface RouteCoordinate {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteStopCoordinate extends RouteCoordinate {
  stopOrder: number;
}

export interface RouteLegInfo {
  startLocation?: { latitude: number; longitude: number };
  endLocation?: { latitude: number; longitude: number };
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  routeSource: RouteSource;
  isGoogleRoute: boolean;
  encodedPolyline?: string | null;
  legs?: RouteLegInfo[];
  errorReason?: string;
}

/**
 * Parses Google duration string (e.g. "12619s" or "300s") to seconds
 */
function parseDurationSeconds(durationStr?: string | number): number {
  if (typeof durationStr === 'number') return durationStr;
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const cleaned = durationStr.trim().replace(/s$/i, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * Helper to fetch with a timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Internal test mock hook
let testMockFn: ((origin: RouteCoordinate, dest: RouteCoordinate, stops: RouteStopCoordinate[]) => Promise<RouteCalculationResult | null>) | null = null;
let googleRoutesForcedDisabled = false;

export const routeService = {
  /**
   * For automated testing: force disable Google Routes API or supply custom mock
   */
  setMockHandler(handler: typeof testMockFn) {
    testMockFn = handler;
  },
  setGoogleRoutesDisabled(disabled: boolean) {
    googleRoutesForcedDisabled = disabled;
  },

  /**
   * Retrieves active Google Maps API key from config or environment
   */
  getGoogleMapsApiKey(): string {
    return (
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
      process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
      config.GOOGLE_MAPS_API_KEY?.trim() ||
      ''
    );
  },

  /**
   * Computes route metrics honestly:
   * 1. Attempts authoritative Google Routes API (computeRoutes) when configured.
   * 2. Preserves strict sequential waypoint ordering: pickup -> stop 1 -> stop 2 -> ... -> destination.
   * 3. Falls back safely and explicitly to mathematical Haversine model if Google is unavailable,
   *    clearly marking the route_source as 'fallback_estimate'.
   */
  async calculateRoute(
    origin: RouteCoordinate,
    destination: RouteCoordinate,
    stops: RouteStopCoordinate[] = []
  ): Promise<RouteCalculationResult> {
    // 0. Check for testing mock
    if (testMockFn) {
      const mocked = await testMockFn(origin, destination, stops);
      if (mocked) return mocked;
    }

    // Sort intermediate stops sequentially by stopOrder ascending
    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);

    const apiKey = this.getGoogleMapsApiKey();
    const canUseGoogle = Boolean(
      apiKey &&
        apiKey.length > 15 &&
        !apiKey.includes('YOUR_') &&
        !apiKey.includes('MY_') &&
        !googleRoutesForcedDisabled
    );

    if (canUseGoogle) {
      try {
        const body: Record<string, unknown> = {
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_UNAWARE',
        };

        if (sortedStops.length > 0) {
          body.intermediates = sortedStops.map((s) => ({
            location: {
              latLng: {
                latitude: s.latitude,
                longitude: s.longitude,
              },
            },
          }));
        }

        const res = await fetchWithTimeout('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs',
          },
          body: JSON.stringify(body),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          if (Array.isArray(data.routes) && data.routes.length > 0) {
            const primary = data.routes[0];
            const distanceMeters = Number(primary.distanceMeters) || 0;
            const durationSeconds = parseDurationSeconds(primary.duration);

            const distanceKm = Number((distanceMeters / 1000).toFixed(2));
            const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

            const legs: RouteLegInfo[] = Array.isArray(primary.legs)
              ? primary.legs.map((leg: any) => ({
                  distanceMeters: Number(leg.distanceMeters) || 0,
                  durationSeconds: parseDurationSeconds(leg.duration),
                  distanceKm: Number(((Number(leg.distanceMeters) || 0) / 1000).toFixed(2)),
                  durationMinutes: Math.max(1, Math.round(parseDurationSeconds(leg.duration) / 60)),
                }))
              : [];

            logger.info('Google Routes API computeRoutes succeeded', {
              distanceKm,
              durationMinutes,
              legsCount: legs.length,
              hasPolyline: Boolean(primary.polyline?.encodedPolyline),
            });

            return {
              distanceKm,
              durationMinutes,
              routeSource: 'google_routes_api',
              isGoogleRoute: true,
              encodedPolyline: primary.polyline?.encodedPolyline || null,
              legs,
            };
          } else {
            logger.warn('Google Routes API returned 0 routes, engaging honest fallback', {
              status: res.status,
            });
          }
        } else {
          const errText = await res.text().catch(() => '');
          logger.warn('Google Routes API request rejected, engaging honest fallback', {
            statusCode: res.status,
            statusText: res.statusText,
            responseSnippet: errText.slice(0, 150),
          });
        }
      } catch (err: any) {
        logger.warn('Google Routes API network error, engaging honest fallback', {
          errorMessage: err.message,
        });
      }
    }

    // Explicit and honest fallback computation:
    // Calculates Haversine with 1.25x road factor across pickup -> stops -> destination
    const waypoints = [
      { lat: origin.latitude, lng: origin.longitude },
      ...sortedStops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
      { lat: destination.latitude, lng: destination.longitude },
    ];

    let totalDist = 0;
    const fallbackLegs: RouteLegInfo[] = [];

    for (let i = 0; i < waypoints.length - 1; i++) {
      const legDist = calculateDistanceKm(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
      totalDist += legDist;
      const legMins = estimateDurationMinutes(legDist);
      fallbackLegs.push({
        distanceMeters: Math.round(legDist * 1000),
        durationSeconds: legMins * 60,
        distanceKm: legDist,
        durationMinutes: legMins,
      });
    }

    const fallbackDistKm = Math.max(0.5, Number(totalDist.toFixed(2)));
    const fallbackDurationMins = estimateDurationMinutes(fallbackDistKm);

    return {
      distanceKm: fallbackDistKm,
      durationMinutes: fallbackDurationMins,
      routeSource: 'fallback_estimate',
      isGoogleRoute: false,
      encodedPolyline: null,
      legs: fallbackLegs,
      errorReason: canUseGoogle
        ? 'Google Routes API request failed; calculated honest fallback estimate.'
        : 'Google Routes API key not configured; calculated honest fallback estimate.',
    };
  },
};
