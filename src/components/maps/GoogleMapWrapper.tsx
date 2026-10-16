import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { MapPin, AlertCircle, Info, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';
import { RouteSource } from '../../types/index.ts';
import { api } from '../../lib/api.ts';

export interface LocationPoint {
  address: string;
  latitude: number;
  longitude: number;
}

export interface StopPoint extends LocationPoint {
  stopOrder: number;
}

interface GoogleMapWrapperProps {
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  stops: StopPoint[];
  distanceKm: number | null;
  durationMinutes: number | null;
  className?: string;
  isRealRoute?: boolean;
  routeSource?: RouteSource | null;
  isRouteLoading?: boolean;
  routeError?: string | null;
  onRouteStartCalculating?: () => void;
  onRealRouteCalculated?: (distKm: number, durMin: number, isRealRoute?: boolean, routeSource?: RouteSource) => void;
  onRouteCalculationError?: (error: string) => void;
}

// Stable static references required by @vis.gl/react-google-maps to prevent re-mount loops
const GOOGLE_MAPS_LIBRARIES: ('routes' | 'places' | 'marker')[] = ['routes', 'places', 'marker'];
const INTERNAL_ATTRIBUTION_IDS: string[] = ['gmp_mcp_codeassist_v1_aistudio'];

// Dark style theme for Google Maps to match RideNova #FFFFFF
const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#07111f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#07111f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8fa6bf' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e5f2ff' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8fa6bf' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0f1c2e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#14243b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e334d' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8fa6bf' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#0ea5e9' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#00c2ff' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#0f1c2e' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#050c16' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#0ea5e9' }],
  },
];

export const MAPS_API_KEY =
  (typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      import.meta.env?.VITE_GOOGLE_MAPS_API_KEY)) ||
  '';

/**
 * Helper component that auto-centers and fits bounds around waypoints
 */
const MapBoundsAdjuster: React.FC<{
  points: { lat: number; lng: number }[];
}> = ({ points }) => {
  const map = useMap();
  const pointsKey = useMemo(
    () => points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(';'),
    [points]
  );

  useEffect(() => {
    if (!map || points.length === 0 || typeof window === 'undefined' || !(window as any).google?.maps?.LatLngBounds) {
      return;
    }

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(14);
      return;
    }

    const bounds = new (window as any).google.maps.LatLngBounds();
    points.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, pointsKey]);

  return null;
};

/**
 * Decodes Google encoded polyline string into array of {lat, lng} coordinates
 */
function decodePolylinePoints(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/**
 * Modern Google Maps Routes & Directions API renderer.
 * Strictly calculates and visualizes driving routes in exact sequential order:
 * Origin (Pickup) -> Stop 1 -> Stop 2 -> ... -> Destination
 * Prioritizes real Google Routes API and honestly falls back when unavailable.
 */
const RealRoutesRenderer: React.FC<{
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  intermediates: { lat: number; lng: number }[];
  onRouteStartCalculating?: () => void;
  onRouteCalculated?: (distKm: number, durMin: number, isRealRoute?: boolean, routeSource?: RouteSource) => void;
  onRouteError?: (err: string) => void;
}> = ({
  origin,
  destination,
  intermediates,
  onRouteStartCalculating,
  onRouteCalculated,
  onRouteError,
}) => {
  const map = useMap();
  const activeRequestIdRef = useRef(0);
  const realPolylineRef = useRef<google.maps.Polyline | null>(null);
  const fallbackPolylineRef = useRef<google.maps.Polyline | null>(null);

  // Keep latest callback references in refs to decouple from effect dependencies
  const onRouteStartCalculatingRef = useRef(onRouteStartCalculating);
  onRouteStartCalculatingRef.current = onRouteStartCalculating;
  const onRouteCalculatedRef = useRef(onRouteCalculated);
  onRouteCalculatedRef.current = onRouteCalculated;
  const onRouteErrorRef = useRef(onRouteError);
  onRouteErrorRef.current = onRouteError;

  // Compute a serialized route signature based on actual coordinates
  const routeSignature = useMemo(() => {
    if (!origin || !destination) return '';
    const parts = [
      `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`,
      ...intermediates.map((pt) => `${pt.lat.toFixed(5)},${pt.lng.toFixed(5)}`),
      `${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`,
    ];
    return parts.join('|');
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, intermediates]);

  useEffect(() => {
    if (!map || !routeSignature) return;

    // Validate that all coordinates are finite numbers
    if (
      !Number.isFinite(origin.lat) ||
      !Number.isFinite(origin.lng) ||
      !Number.isFinite(destination.lat) ||
      !Number.isFinite(destination.lng) ||
      intermediates.some((pt) => !Number.isFinite(pt.lat) || !Number.isFinite(pt.lng))
    ) {
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    let isCancelled = false;

    const renderDirectFallbackPolyline = () => {
      if (realPolylineRef.current) {
        realPolylineRef.current.setMap(null);
        realPolylineRef.current = null;
      }
      const fallbackPoints = [origin, ...intermediates, destination];
      if (fallbackPolylineRef.current) {
        fallbackPolylineRef.current.setPath(fallbackPoints);
        fallbackPolylineRef.current.setMap(map);
      } else if (typeof window !== 'undefined' && (window as any).google?.maps?.Polyline) {
        fallbackPolylineRef.current = new (window as any).google.maps.Polyline({
          path: fallbackPoints,
          geodesic: true,
          strokeColor: '#E21D2B',
          strokeOpacity: 0.85,
          strokeWeight: 4,
          map,
        });
      }
    };

    // Debounce slightly to batch fast sequential updates and prevent render cascades
    const timer = setTimeout(async () => {
      if (isCancelled) return;

      onRouteStartCalculatingRef.current?.();

      try {
        // 1. Primary: Request authoritative Google Routes API computeRoutes from backend
        const res = await api.previewRoute({
          pickup: { latitude: origin.lat, longitude: origin.lng },
          destination: { latitude: destination.lat, longitude: destination.lng },
          stops: intermediates.map((pt, idx) => ({
            latitude: pt.lat,
            longitude: pt.lng,
            stopOrder: idx + 1,
          })),
        });

        if (isCancelled || requestId !== activeRequestIdRef.current) return;

        if (res.success && res.data) {
          const routeData = res.data;

          if (routeData.isGoogleRoute && routeData.encodedPolyline) {
            // Clean up fallback polyline
            if (fallbackPolylineRef.current) {
              fallbackPolylineRef.current.setMap(null);
              fallbackPolylineRef.current = null;
            }

            const decodedPoints = decodePolylinePoints(routeData.encodedPolyline);

            if (!realPolylineRef.current && typeof window !== 'undefined' && (window as any).google?.maps?.Polyline) {
              realPolylineRef.current = new (window as any).google.maps.Polyline({
                path: decodedPoints,
                geodesic: true,
                strokeColor: '#E21D2B',
                strokeOpacity: 0.95,
                strokeWeight: 5,
                map,
              });
            } else if (realPolylineRef.current) {
              realPolylineRef.current.setPath(decodedPoints);
              realPolylineRef.current.setMap(map);
            }

            // Fit map bounds to encompass the complete route path
            if (decodedPoints.length > 0 && typeof window !== 'undefined' && (window as any).google?.maps?.LatLngBounds) {
              const bounds = new (window as any).google.maps.LatLngBounds();
              for (const pt of decodedPoints) {
                bounds.extend(new (window as any).google.maps.LatLng(pt.lat, pt.lng));
              }
              map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
            }

            onRouteCalculatedRef.current?.(
              routeData.distanceKm,
              routeData.durationMinutes,
              true,
              routeData.routeSource
            );
            return;
          } else {
            // Fallback estimation returned by backend
            renderDirectFallbackPolyline();
            onRouteCalculatedRef.current?.(
              routeData.distanceKm,
              routeData.durationMinutes,
              false,
              'fallback_estimate'
            );
            return;
          }
        }
      } catch (err: any) {
        if (isCancelled || requestId !== activeRequestIdRef.current) return;
        renderDirectFallbackPolyline();
        onRouteErrorRef.current?.(err.message || 'Google routing unavailable. Showing coordinate estimate.');
        onRouteCalculatedRef.current?.(0, 0, false, 'fallback_estimate');
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (realPolylineRef.current) {
        realPolylineRef.current.setMap(null);
        realPolylineRef.current = null;
      }
      if (fallbackPolylineRef.current) {
        fallbackPolylineRef.current.setMap(null);
        fallbackPolylineRef.current = null;
      }
    };
  }, [map, routeSignature]);

  return null;
};

/**
 * Helper component that monitors APIProvider loading status and reports failures
 */
const ApiStatusTracker: React.FC<{
  onStatusChange: (status: string) => void;
}> = ({ onStatusChange }) => {
  const status = useApiLoadingStatus();
  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);
  return null;
};

export const GoogleMapWrapper: React.FC<GoogleMapWrapperProps> = ({
  pickup,
  destination,
  stops,
  distanceKm,
  durationMinutes,
  className = '',
  isRealRoute = false,
  routeSource = null,
  isRouteLoading = false,
  routeError = null,
  onRouteStartCalculating,
  onRealRouteCalculated,
  onRouteCalculationError,
}) => {
  const [activeApiKey, setActiveApiKey] = useState<string>(() => MAPS_API_KEY);
  const [apiLoadingStatus, setApiLoadingStatus] = useState<string>(APILoadingStatus.LOADING);
  const [authErrorDetected, setAuthErrorDetected] = useState<boolean>(false);
  const [loadErrorDetected, setLoadErrorDetected] = useState<boolean>(false);

  // If not bundled in client define, dynamically fetch from backend config
  useEffect(() => {
    if (!activeApiKey) {
      fetch('/api/config/maps')
        .then((res) => res.json())
        .then((data) => {
          if (data?.apiKey && typeof data.apiKey === 'string') {
            setActiveApiKey(data.apiKey);
          }
        })
        .catch(() => {});
    }
  }, [activeApiKey]);

  // Global listener for Google Maps authentication rejection
  useEffect(() => {
    const handleAuthFailure = () => {
      setAuthErrorDetected(true);
    };
    const prevGmAuth = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      handleAuthFailure();
      if (typeof prevGmAuth === 'function') prevGmAuth();
    };
    return () => {
      (window as any).gm_authFailure = prevGmAuth;
    };
  }, []);

  const isKeyConfigured = Boolean(
    activeApiKey &&
      activeApiKey.trim().length > 10 &&
      !activeApiKey.includes('MY_') &&
      !activeApiKey.includes('YOUR_')
  );

  const hasAuthError = authErrorDetected || apiLoadingStatus === APILoadingStatus.AUTH_FAILURE;
  const hasLoadError = loadErrorDetected || apiLoadingStatus === APILoadingStatus.FAILED;

  // Compute all points in sequential order: Pickup -> Stops (by order) -> Destination
  const waypoints = useMemo(() => {
    const list: { lat: number; lng: number; label: string; title: string; color: string }[] = [];
    if (pickup && Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude)) {
      list.push({
        lat: pickup.latitude,
        lng: pickup.longitude,
        label: 'P',
        title: `Pickup: ${pickup.address}`,
        color: '#15803D',
      });
    }

    const sortedStops = [...stops]
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .sort((a, b) => a.stopOrder - b.stopOrder);

    sortedStops.forEach((s) => {
      list.push({
        lat: s.latitude,
        lng: s.longitude,
        label: `S${s.stopOrder}`,
        title: `Stop ${s.stopOrder}: ${s.address}`,
        color: '#B45309',
      });
    });

    if (destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude)) {
      list.push({
        lat: destination.latitude,
        lng: destination.longitude,
        label: 'D',
        title: `Destination: ${destination.address}`,
        color: '#E21D2B',
      });
    }

    return list;
  }, [pickup, destination, stops]);

  const rawLatLngPoints = useMemo(() => {
    return waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
  }, [waypoints]);

  const defaultCenter = useMemo(() => {
    return waypoints.length > 0
      ? { lat: waypoints[0].lat, lng: waypoints[0].lng }
      : { lat: 23.2156, lng: 72.6369 }; // Gandhinagar / Ahmedabad default
  }, [waypoints]);

  // Memoize origin, destination, and intermediate props for RealRoutesRenderer
  const originProp = useMemo(() => {
    return pickup && Number.isFinite(pickup.latitude) && Number.isFinite(pickup.longitude)
      ? { lat: pickup.latitude, lng: pickup.longitude }
      : null;
  }, [pickup?.latitude, pickup?.longitude]);

  const destProp = useMemo(() => {
    return destination && Number.isFinite(destination.latitude) && Number.isFinite(destination.longitude)
      ? { lat: destination.latitude, lng: destination.longitude }
      : null;
  }, [destination?.latitude, destination?.longitude]);

  const intermediatesProp = useMemo(() => {
    return [...stops]
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map((s) => ({ lat: s.latitude, lng: s.longitude }));
  }, [stops]);

  // If Google Maps API key is configured and healthy, render official @vis.gl/react-google-maps
  if (isKeyConfigured && !hasAuthError && !hasLoadError) {
    return (
      <div
        className={`relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-[#E5E5E5] bg-[#FFFFFF] ${className}`}
      >
        <APIProvider
          apiKey={activeApiKey}
          libraries={GOOGLE_MAPS_LIBRARIES}
          onError={() => setLoadErrorDetected(true)}
        >
          <ApiStatusTracker onStatusChange={setApiLoadingStatus} />
          <GoogleMap
            defaultCenter={defaultCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            styles={DARK_MAP_STYLES}
            internalUsageAttributionIds={INTERNAL_ATTRIBUTION_IDS}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
          >
            {/* Auto-fit bounds */}
            <MapBoundsAdjuster points={rawLatLngPoints} />

            {/* Real Route Calculation and Polyline Rendering */}
            {originProp && destProp && (
              <RealRoutesRenderer
                origin={originProp}
                destination={destProp}
                intermediates={intermediatesProp}
                onRouteStartCalculating={onRouteStartCalculating}
                onRouteCalculated={onRealRouteCalculated}
                onRouteError={onRouteCalculationError}
              />
            )}

            {/* Advanced Markers for All Waypoints */}
            {waypoints.map((point, index) => (
              <AdvancedMarker
                key={`${point.label}-${index}`}
                position={{ lat: point.lat, lng: point.lng }}
                title={point.title}
                zIndex={point.label === 'P' ? 100 : point.label === 'D' ? 90 : 50 + index}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-[#FFFFFF] shadow-lg border-2 border-white transition-transform hover:scale-125 cursor-pointer"
                  style={{ backgroundColor: point.color }}
                >
                  {point.label}
                </div>
              </AdvancedMarker>
            ))}
          </GoogleMap>
        </APIProvider>

        {/* Floating Route Stats Overlay */}
        {(distanceKm !== null && durationMinutes !== null) || isRouteLoading ? (
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
            <div className="flex items-center gap-3 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF]/95 px-4 py-2.5 backdrop-blur-md shadow-xl text-xs pointer-events-auto">
              {isRouteLoading ? (
                <div className="flex items-center gap-2 text-[#E21D2B] font-medium">
                  <div className="h-3 w-3 rounded-full border-2 border-[#E21D2B] border-t-transparent animate-spin" />
                  <span>Calculating Google Route...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-[#E21D2B] font-semibold">
                    <Navigation className="h-4 w-4" />
                    <span>{distanceKm} km</span>
                  </div>
                  <span className="text-[#737373]">·</span>
                  <span className="text-[#171717] font-medium">{durationMinutes} min</span>
                  <span className="text-[#737373]">·</span>
                  {isRealRoute ? (
                    <span className="text-[11px] text-[#15803D] flex items-center gap-1 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> Real Google Route
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#B45309] flex items-center gap-1 font-medium">
                      <Info className="h-3.5 w-3.5" /> Fallback Estimate
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Error badge if Google routing reported a problem */}
            {routeError && !isRouteLoading && (
              <div className="flex items-center gap-1.5 rounded-lg border border-[#B91C1C]/40 bg-[#B91C1C]/15 px-3 py-1.5 text-[11px] text-[#FCA5A5] backdrop-blur-md pointer-events-auto">
                <AlertTriangle className="h-3 w-3 shrink-0 text-[#B91C1C]" />
                <span>{routeError}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Fallback state: Render the appropriate notice and interactive coordinates canvas
  return (
    <div
      className={`relative w-full h-full min-h-[400px] flex flex-col justify-between rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 ${className}`}
    >
      {/* Alert Banner: Differentiates Auth Failure, Network Failure, and Missing Key */}
      {hasAuthError ? (
        <div className="rounded-lg border border-[#B91C1C]/40 bg-[#B91C1C]/10 p-4 text-xs text-[#B91C1C]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B91C1C]" />
            <div>
              <p className="font-semibold text-[#FCA5A5]">
                Google Maps API Authentication Failed (AUTH_FAILURE)
              </p>
              <p className="mt-1 text-[11px] text-[#CBD5E1] leading-relaxed">
                The API key was detected, but Google Maps Platform rejected authorization. Please check Google Cloud Console:
              </p>
              <ul className="mt-1.5 list-disc list-inside text-[11px] text-[#94A3B8] space-y-0.5">
                <li>Enable <strong>Maps JavaScript API</strong> and <strong>Routes API</strong> in APIs & Services → Library.</li>
                <li>Verify that HTTP Referrer restrictions in Credentials allow this domain (or set to None during development).</li>
                <li>Ensure an active billing account is linked to your Google Cloud project.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : hasLoadError ? (
        <div className="rounded-lg border border-[#B91C1C]/40 bg-[#B91C1C]/10 p-4 text-xs text-[#B91C1C]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B91C1C]" />
            <div>
              <p className="font-semibold text-[#FCA5A5]">
                Google Maps Script Loading Failed (FAILED)
              </p>
              <p className="mt-1 text-[11px] text-[#CBD5E1] leading-relaxed">
                Unable to load the Google Maps JavaScript API script. Check your internet connection or ad/content blockers.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#B45309]/30 bg-[#B45309]/10 p-4 text-xs text-[#B45309]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#171717]">
                Google Maps is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
              </p>
              <p className="mt-1 text-[11px] text-[#737373] leading-relaxed">
                To enable live satellite tiles, autocomplete, and live turn-by-turn Directions, set{' '}
                <code className="text-[#E21D2B] font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in
                your environment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Waypoints / Route Visualization Canvas */}
      <div className="my-6 flex-1 rounded-lg border border-[#E5E5E5] bg-[#050C16] p-5 flex flex-col justify-center relative overflow-hidden">
        {/* Subtle coordinate grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#E5E5E5_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {waypoints.length === 0 ? (
          <div className="text-center py-10 z-10">
            <MapPin className="mx-auto h-8 w-8 text-[#737373] mb-2 animate-bounce" />
            <h4 className="text-sm font-semibold text-[#171717]">Interactive Route Canvas</h4>
            <p className="mt-1 text-xs text-[#737373] max-w-sm mx-auto">
              Select a pickup location and destination in the booking panel to generate coordinates,
              distance, and fare.
            </p>
          </div>
        ) : (
          <div className="space-y-4 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]/60 text-xs">
              <span className="text-[#737373] font-medium flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-[#E21D2B]" />
                Calculated Route Waypoints ({waypoints.length})
              </span>
              {distanceKm !== null && durationMinutes !== null && (
                <div className="flex items-center gap-2 font-mono text-[#E21D2B]">
                  <span className="font-bold">{distanceKm} km</span>
                  <span className="text-[#737373]">·</span>
                  <span className="text-[#171717]">{durationMinutes} min ETA</span>
                </div>
              )}
            </div>

            {/* Waypoints List with custom badges (P, S1-S3, D) */}
            <div className="space-y-2.5">
              {waypoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF]/90 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-[#FFFFFF]"
                      style={{ backgroundColor: pt.color }}
                    >
                      {pt.label}
                    </span>
                    <span className="text-[#171717] font-medium truncate">{pt.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#737373] shrink-0 ml-2">
                    {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulated Vector Path */}
            <div className="mt-4 pt-3 border-t border-[#E5E5E5]/60 flex items-center justify-between text-[11px] text-[#737373]">
              <span>Haversine road-factor calculation active</span>
              <span className="text-[#15803D] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                Coordinates Validated
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Console Setup Guide */}
      <div className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-xs text-[#737373] space-y-1.5">
        <div className="flex items-center justify-between text-[#171717] font-semibold">
          <span className="flex items-center gap-1.5 text-xs">
            <Info className="h-3.5 w-3.5 text-[#E21D2B]" />
            How to configure Google Cloud Platform:
          </span>
          <span className="font-mono text-[10px] text-[#E21D2B]">Step 3A Guide</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          1. Go to <strong>Google Cloud Console → APIs & Services → Credentials</strong>.<br />
          2. Enable <strong>Maps JavaScript API</strong>, <strong>Places API (New)</strong>, and{' '}
          <strong>Routes API</strong>.<br />
          3. Set the key in <code>.env</code> as <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> or{' '}
          <code>VITE_GOOGLE_MAPS_API_KEY</code>.
        </p>
      </div>
    </div>
  );
};
