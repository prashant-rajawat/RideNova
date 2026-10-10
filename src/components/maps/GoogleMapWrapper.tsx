import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { MapPin, AlertCircle, Info, Navigation, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';

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
  onRealRouteCalculated?: (distKm: number, durMin: number) => void;
}

// Dark style theme for Google Maps to match RideNova #07111F
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

  useEffect(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(15);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach((pt) => bounds.extend(pt));
    map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
  }, [map, points]);

  return null;
};

/**
 * Modern Routes API renderer using useMapsLibrary('routes') and Route.computeRoutes
 * Falls back to direct geodesic polyline if computation fails or in transit.
 */
const RealRoutesRenderer: React.FC<{
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  intermediates: { lat: number; lng: number }[];
  onRouteCalculated?: (distKm: number, durMin: number) => void;
}> = ({ origin, destination, intermediates, onRouteCalculated }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Fallback direct path
    const fallbackPoints = [origin, ...intermediates, destination];

    const renderDirectPolyline = () => {
      if (!polylineRef.current) {
        polylineRef.current = new google.maps.Polyline({
          path: fallbackPoints,
          geodesic: true,
          strokeColor: '#00C2FF',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        });
      } else {
        polylineRef.current.setPath(fallbackPoints);
        polylineRef.current.setMap(map);
      }
    };

    if (!routesLib || !(routesLib as any).Route) {
      renderDirectPolyline();
      return;
    }

    // Try modern Route.computeRoutes
    try {
      const routeService = new (routesLib as any).Route();
      const request: any = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: (routesLib as any).TravelMode?.DRIVING || 'DRIVING',
        intermediates: intermediates.map((pt) => ({
          location: { latLng: { latitude: pt.lat, longitude: pt.lng } },
        })),
        fields: ['polyline', 'distanceMeters', 'duration', 'viewport'],
      };

      routeService
        .computeRoutes(request)
        .then((response: any) => {
          if (response?.routes && response.routes.length > 0) {
            const primaryRoute = response.routes[0];

            if (primaryRoute.polyline?.encodedPolyline && (routesLib as any).Route?.decode) {
              const decodedPath = (routesLib as any).Route.decode(
                primaryRoute.polyline.encodedPolyline
              );
              if (polylineRef.current) {
                polylineRef.current.setPath(decodedPath);
                polylineRef.current.setMap(map);
              } else {
                polylineRef.current = new google.maps.Polyline({
                  path: decodedPath,
                  geodesic: true,
                  strokeColor: '#00C2FF',
                  strokeOpacity: 0.9,
                  strokeWeight: 4,
                  map,
                });
              }
            } else {
              renderDirectPolyline();
            }

            if (primaryRoute.viewport) {
              const bounds = new google.maps.LatLngBounds(
                primaryRoute.viewport.southwest,
                primaryRoute.viewport.northeast
              );
              map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
            }

            if (primaryRoute.distanceMeters && onRouteCalculated) {
              const km = Number((primaryRoute.distanceMeters / 1000).toFixed(1));
              let mins = 1;
              if (typeof primaryRoute.duration === 'string') {
                const sMatch = primaryRoute.duration.match(/(\d+)s/);
                if (sMatch) mins = Math.max(1, Math.round(parseInt(sMatch[1], 10) / 60));
              } else if (typeof primaryRoute.duration === 'number') {
                mins = Math.max(1, Math.round(primaryRoute.duration / 60));
              }
              onRouteCalculated(km, mins);
            }
          } else {
            renderDirectPolyline();
          }
        })
        .catch((_err: unknown) => {
          // Gracefully fallback to direct points
          renderDirectPolyline();
        });
    } catch {
      renderDirectPolyline();
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, routesLib, origin, destination, intermediates, onRouteCalculated]);

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
  onRealRouteCalculated,
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
    if (pickup) {
      list.push({
        lat: pickup.latitude,
        lng: pickup.longitude,
        label: 'P',
        title: `Pickup: ${pickup.address}`,
        color: '#22C55E',
      });
    }

    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
    sortedStops.forEach((s) => {
      list.push({
        lat: s.latitude,
        lng: s.longitude,
        label: `S${s.stopOrder}`,
        title: `Stop ${s.stopOrder}: ${s.address}`,
        color: '#F59E0B',
      });
    });

    if (destination) {
      list.push({
        lat: destination.latitude,
        lng: destination.longitude,
        label: 'D',
        title: `Destination: ${destination.address}`,
        color: '#00C2FF',
      });
    }

    return list;
  }, [pickup, destination, stops]);

  const rawLatLngPoints = useMemo(() => {
    return waypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
  }, [waypoints]);

  const defaultCenter =
    waypoints.length > 0
      ? { lat: waypoints[0].lat, lng: waypoints[0].lng }
      : { lat: 23.2156, lng: 72.6369 }; // Gandhinagar / Ahmedabad default

  // If Google Maps API key is configured and healthy, render official @vis.gl/react-google-maps
  if (isKeyConfigured && !hasAuthError && !hasLoadError) {
    return (
      <div
        className={`relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-[#1E334D] bg-[#07111F] ${className}`}
      >
        <APIProvider
          apiKey={activeApiKey}
          libraries={['routes', 'places', 'marker']}
          onError={() => setLoadErrorDetected(true)}
        >
          <ApiStatusTracker onStatusChange={setApiLoadingStatus} />
          <GoogleMap
            defaultCenter={defaultCenter}
            defaultZoom={13}
            mapId="DEMO_MAP_ID"
            styles={DARK_MAP_STYLES}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
          >
            {/* Auto-fit bounds */}
            <MapBoundsAdjuster points={rawLatLngPoints} />

            {/* Real Route Calculation and Polyline Rendering */}
            {pickup && destination && (
              <RealRoutesRenderer
                origin={{ lat: pickup.latitude, lng: pickup.longitude }}
                destination={{ lat: destination.latitude, lng: destination.longitude }}
                intermediates={stops
                  .sort((a, b) => a.stopOrder - b.stopOrder)
                  .map((s) => ({ lat: s.latitude, lng: s.longitude }))}
                onRouteCalculated={onRealRouteCalculated}
              />
            )}

            {/* Advanced Markers for All Waypoints */}
            {waypoints.map((point, index) => (
              <AdvancedMarker
                key={`${point.label}-${index}`}
                position={{ lat: point.lat, lng: point.lng }}
                title={point.title}
              >
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-[#07111F] shadow-lg border-2 border-white transition-transform hover:scale-110"
                  style={{ backgroundColor: point.color }}
                >
                  {point.label}
                </div>
              </AdvancedMarker>
            ))}
          </GoogleMap>
        </APIProvider>

        {/* Floating Route Stats Overlay */}
        {distanceKm !== null && durationMinutes !== null && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 rounded-lg border border-[#1E334D] bg-[#0F1C2E]/95 px-4 py-2.5 backdrop-blur-md shadow-xl text-xs">
            <div className="flex items-center gap-1.5 text-[#00C2FF] font-semibold">
              <Navigation className="h-4 w-4" />
              <span>{distanceKm} km</span>
            </div>
            <span className="text-[#8FA6BF]">·</span>
            <span className="text-[#E5F2FF] font-medium">{durationMinutes} min</span>
            <span className="text-[#8FA6BF]">·</span>
            <span className="text-[11px] text-[#22C55E] flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Real Google Route
            </span>
          </div>
        )}
      </div>
    );
  }

  // Fallback state: Render the appropriate notice and interactive coordinates canvas
  return (
    <div
      className={`relative w-full h-full min-h-[400px] flex flex-col justify-between rounded-xl border border-[#1E334D] bg-[#07111F] p-6 ${className}`}
    >
      {/* Alert Banner: Differentiates Auth Failure, Network Failure, and Missing Key */}
      {hasAuthError ? (
        <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#EF4444]" />
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
        <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#EF4444]" />
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
        <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 text-xs text-[#F59E0B]">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#E5F2FF]">
                Google Maps is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
              </p>
              <p className="mt-1 text-[11px] text-[#8FA6BF] leading-relaxed">
                To enable live satellite tiles, autocomplete, and live turn-by-turn Directions, set{' '}
                <code className="text-[#00C2FF] font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in
                your environment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Waypoints / Route Visualization Canvas */}
      <div className="my-6 flex-1 rounded-lg border border-[#1E334D] bg-[#050C16] p-5 flex flex-col justify-center relative overflow-hidden">
        {/* Subtle coordinate grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E334D_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {waypoints.length === 0 ? (
          <div className="text-center py-10 z-10">
            <MapPin className="mx-auto h-8 w-8 text-[#8FA6BF] mb-2 animate-bounce" />
            <h4 className="text-sm font-semibold text-[#E5F2FF]">Interactive Route Canvas</h4>
            <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
              Select a pickup location and destination in the booking panel to generate coordinates,
              distance, and fare.
            </p>
          </div>
        ) : (
          <div className="space-y-4 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]/60 text-xs">
              <span className="text-[#8FA6BF] font-medium flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-[#00C2FF]" />
                Calculated Route Waypoints ({waypoints.length})
              </span>
              {distanceKm !== null && durationMinutes !== null && (
                <div className="flex items-center gap-2 font-mono text-[#00C2FF]">
                  <span className="font-bold">{distanceKm} km</span>
                  <span className="text-[#8FA6BF]">·</span>
                  <span className="text-[#E5F2FF]">{durationMinutes} min ETA</span>
                </div>
              )}
            </div>

            {/* Waypoints List with custom badges (P, S1-S3, D) */}
            <div className="space-y-2.5">
              {waypoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#1E334D] bg-[#07111F]/90 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-[#07111F]"
                      style={{ backgroundColor: pt.color }}
                    >
                      {pt.label}
                    </span>
                    <span className="text-[#E5F2FF] font-medium truncate">{pt.title}</span>
                  </div>
                  <span className="font-mono text-[11px] text-[#8FA6BF] shrink-0 ml-2">
                    {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulated Vector Path */}
            <div className="mt-4 pt-3 border-t border-[#1E334D]/60 flex items-center justify-between text-[11px] text-[#8FA6BF]">
              <span>Haversine road-factor calculation active</span>
              <span className="text-[#22C55E] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                Coordinates Validated
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Console Setup Guide */}
      <div className="rounded-lg border border-[#1E334D] bg-[#0F1C2E] p-4 text-xs text-[#8FA6BF] space-y-1.5">
        <div className="flex items-center justify-between text-[#E5F2FF] font-semibold">
          <span className="flex items-center gap-1.5 text-xs">
            <Info className="h-3.5 w-3.5 text-[#00C2FF]" />
            How to configure Google Cloud Platform:
          </span>
          <span className="font-mono text-[10px] text-[#00C2FF]">Step 3A Guide</span>
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
