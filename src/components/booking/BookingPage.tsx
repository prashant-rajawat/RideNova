import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Car,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { GoogleMapWrapper, LocationPoint, StopPoint } from '../maps/GoogleMapWrapper.tsx';
import { calculateDistanceKm, estimateDurationMinutes, calculateFare, FARE_CONFIG } from '../../lib/fare.ts';
import { VehicleType, RideWithStops } from '../../types/index.ts';
import { api, ApiError } from '../../lib/api.ts';
import { useAuthSession } from '../../context/AuthContext.tsx';

interface BookingPageProps {
  onNavigate: (route: string) => void;
  onRideBooked?: (ride: RideWithStops) => void;
}

// Preset popular places for quick testing & instant coordinate resolution
const SUGGESTED_PLACES: LocationPoint[] = [
  {
    address: 'Dream Aatman, Vadsar, Vadodara',
    latitude: 22.2575,
    longitude: 73.1812,
  },
  {
    address: 'KPGU, Gandhinagar',
    latitude: 23.2156,
    longitude: 72.6369,
  },
  {
    address: 'Ahmedabad Railway Station, Kalupur',
    latitude: 23.0225,
    longitude: 72.5714,
  },
  {
    address: 'Sardar Vallabhbhai Patel International Airport (AMD)',
    latitude: 23.0772,
    longitude: 72.6347,
  },
  {
    address: 'City Mall, Gandhinagar',
    latitude: 23.1989,
    longitude: 72.6289,
  },
  {
    address: 'Infocity, Gandhinagar',
    latitude: 23.1895,
    longitude: 72.6281,
  },
  {
    address: 'Sabarmati Ashram, Ahmedabad',
    latitude: 23.0605,
    longitude: 72.5806,
  },
];

function getDeterministicCoordinate(text: string, baseLat = 23.2156, baseLng = 72.6369): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((Math.abs(hash) % 100) - 50) * 0.002;
  const lngOffset = ((Math.abs(hash >> 3) % 100) - 50) * 0.002;
  return {
    lat: Number((baseLat + latOffset).toFixed(4)),
    lng: Number((baseLng + lngOffset).toFixed(4)),
  };
}

export const BookingPage: React.FC<BookingPageProps> = ({ onNavigate, onRideBooked }) => {
  const { user } = useAuthSession();

  // Booking Form State
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [destInput, setDestInput] = useState('');
  const [stops, setStops] = useState<StopPoint[]>([]);

  // Selection & Route States
  const [selectedRideType, setSelectedRideType] = useState<VehicleType>('economy');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [isRealRoute, setIsRealRoute] = useState<boolean>(false);
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Status & Confirmation States
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedRide, setConfirmedRide] = useState<RideWithStops | null>(null);

  // Suggestions Dropdowns
  const [activeSuggestionField, setActiveSuggestionField] = useState<'pickup' | 'dest' | number | null>(null);
  const [googlePredictions, setGooglePredictions] = useState<{ description: string; placeId: string }[]>([]);

  // Query live Google Places Autocomplete when API key and Places library are active
  useEffect(() => {
    const currentInput =
      activeSuggestionField === 'pickup'
        ? pickupInput
        : activeSuggestionField === 'dest'
        ? destInput
        : typeof activeSuggestionField === 'number'
        ? stops.find((s) => s.stopOrder === activeSuggestionField)?.address || ''
        : '';

    if (!currentInput || currentInput.trim().length < 2) {
      setGooglePredictions([]);
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.AutocompleteService) {
      try {
        const service = new (window as any).google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: currentInput.trim() },
          (predictions: any, status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
              setGooglePredictions(
                predictions.map((p: any) => ({
                  description: p.description,
                  placeId: p.place_id,
                }))
              );
            } else {
              setGooglePredictions([]);
            }
          }
        );
      } catch {
        setGooglePredictions([]);
      }
    }
  }, [pickupInput, destInput, stops, activeSuggestionField]);

  // Recalculate route whenever pickup, destination, or stops change
  useEffect(() => {
    if (!pickup || !destination) {
      setDistanceKm(null);
      setDurationMinutes(null);
      setIsRealRoute(false);
      setIsRouteLoading(false);
      setRouteError(null);
      return;
    }

    const waypoints = [
      { lat: pickup.latitude, lng: pickup.longitude },
      ...stops.sort((a, b) => a.stopOrder - b.stopOrder).map((s) => ({ lat: s.latitude, lng: s.longitude })),
      { lat: destination.latitude, lng: destination.longitude },
    ];

    let totalDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDist += calculateDistanceKm(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
    }

    const computedDist = Math.max(0.5, Number(totalDist.toFixed(1)));
    const computedDur = estimateDurationMinutes(computedDist);

    // Initial estimation while Google Maps calculates the authoritative route
    setDistanceKm(computedDist);
    setDurationMinutes(computedDur);
    setIsRealRoute(false);
    setIsRouteLoading(true);
    setRouteError(null);
  }, [pickup, destination, stops]);

  // Current Location Handler
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentLoc: LocationPoint = {
          address: 'My Current Location (GPS)',
          latitude,
          longitude,
        };
        setPickup(currentLoc);
        setPickupInput(currentLoc.address);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Please search for your pickup location manually.');
        } else {
          setLocationError('Unable to retrieve your location. Please enter pickup manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Add intermediate stop (max 3)
  const handleAddStop = () => {
    if (stops.length >= 3) return;
    const newOrder = stops.length + 1;
    const defaultSuggestion = SUGGESTED_PLACES[newOrder % SUGGESTED_PLACES.length];
    setStops([
      ...stops,
      {
        stopOrder: newOrder,
        address: defaultSuggestion.address,
        latitude: defaultSuggestion.latitude,
        longitude: defaultSuggestion.longitude,
      },
    ]);
  };

  // Remove stop
  const handleRemoveStop = (order: number) => {
    const updated = stops
      .filter((s) => s.stopOrder !== order)
      .map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
    setStops(updated);
  };

  // Reorder intermediate stop (move up or down)
  const handleMoveStop = (order: number, direction: 'up' | 'down') => {
    const sorted = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
    const index = sorted.findIndex((s) => s.stopOrder === order);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const temp = sorted[index];
    sorted[index] = sorted[targetIndex];
    sorted[targetIndex] = temp;

    const updated = sorted.map((s, idx) => ({ ...s, stopOrder: idx + 1 }));
    setStops(updated);
  };

  // Select location from suggestion
  const handleSelectSuggestion = (
    field: 'pickup' | 'dest' | number,
    point: LocationPoint
  ) => {
    if (field === 'pickup') {
      setPickup(point);
      setPickupInput(point.address);
    } else if (field === 'dest') {
      setDestination(point);
      setDestInput(point.address);
    } else {
      // intermediate stop
      setStops(
        stops.map((s) =>
          s.stopOrder === field
            ? { ...s, address: point.address, latitude: point.latitude, longitude: point.longitude }
            : s
        )
      );
    }
    setActiveSuggestionField(null);
  };

  // Select place from live Google Autocomplete prediction
  const handleSelectGooglePrediction = (
    field: 'pickup' | 'dest' | number,
    pred: { description: string; placeId: string }
  ) => {
    if (typeof window !== 'undefined' && (window as any).google?.maps?.Geocoder) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: pred.placeId }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          handleSelectSuggestion(field, {
            address: pred.description,
            latitude: typeof loc.lat === 'function' ? Number(loc.lat().toFixed(4)) : Number(loc.lat.toFixed(4)),
            longitude: typeof loc.lng === 'function' ? Number(loc.lng().toFixed(4)) : Number(loc.lng.toFixed(4)),
          });
          return;
        }
        // Fallback to deterministic coordinates if geocoding fails
        const coords = getDeterministicCoordinate(pred.description);
        handleSelectSuggestion(field, {
          address: pred.description,
          latitude: coords.lat,
          longitude: coords.lng,
        });
      });
    } else {
      const coords = getDeterministicCoordinate(pred.description);
      handleSelectSuggestion(field, {
        address: pred.description,
        latitude: coords.lat,
        longitude: coords.lng,
      });
    }
  };

  // Confirm and create ride request
  const handleConfirmRide = async () => {
    if (!pickup || !destination || isSubmitting) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const response = await api.createRide({
        pickupAddress: pickup.address,
        pickupLatitude: pickup.latitude,
        pickupLongitude: pickup.longitude,
        destinationAddress: destination.address,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        rideType: selectedRideType,
        stops: stops.map((s) => ({
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          stopOrder: s.stopOrder,
        })),
      });

      if (response.success && response.data) {
        setConfirmedRide(response.data);
        if (onRideBooked) {
          onRideBooked(response.data);
        }
      }
    } catch (err: any) {
      const apiErr = err as ApiError;
      setBookingError(apiErr.message || 'Failed to create ride request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset booking form
  const handleReset = () => {
    setPickup(null);
    setPickupInput('');
    setDestination(null);
    setDestInput('');
    setStops([]);
    setConfirmedRide(null);
    setBookingError(null);
  };

  // Calculated fare details
  const activeFare = distanceKm && durationMinutes
    ? calculateFare(selectedRideType, distanceKm, durationMinutes)
    : null;

  // Confirmation Screen View
  if (confirmedRide) {
    return (
      <div className="min-h-[85vh] max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#0F1C2E] p-6 sm:p-8 shadow-2xl text-center animate-fade-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#22C55E]/10 text-[#22C55E]">
            <CheckCircle className="h-8 w-8" />
          </div>

          <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/30">
            {confirmedRide.reference_id || `RN-${confirmedRide.id.slice(0, 8).toUpperCase()}`}
          </span>

          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#E5F2FF]">
            Ride Requested Successfully
          </h1>

          <p className="mt-2 text-xs text-[#8FA6BF]">
            Your ride request has been saved in the PostgreSQL database with status:
          </p>

          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-xs font-semibold text-[#F59E0B]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Status: Searching for a driver... (requested)</span>
          </div>

          {/* Ride Details Card */}
          <div className="mt-6 rounded-lg border border-[#1E334D] bg-[#07111F] p-5 text-left text-xs space-y-3">
            <div className="flex items-start justify-between pb-3 border-b border-[#1E334D]">
              <div>
                <span className="text-[#8FA6BF] block text-[11px]">Database Record UUID</span>
                <span className="font-mono text-[#E5F2FF] break-all">{confirmedRide.id}</span>
              </div>
              <div className="text-right">
                <span className="text-[#8FA6BF] block text-[11px]">Estimated Fare</span>
                <span className="font-bold text-[#00C2FF] text-sm">₹{confirmedRide.estimated_fare}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                <span className="text-[#8FA6BF]">Pickup:</span>
                <span className="text-[#E5F2FF] font-medium">{confirmedRide.pickup_address}</span>
              </div>

              {confirmedRide.stops?.map((s) => (
                <div key={s.id} className="flex items-center gap-2 pl-2">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#8FA6BF]">Stop {s.stop_order}:</span>
                  <span className="text-[#E5F2FF]">{s.address}</span>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00C2FF]" />
                <span className="text-[#8FA6BF]">Destination:</span>
                <span className="text-[#E5F2FF] font-medium">{confirmedRide.destination_address}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1E334D] flex flex-wrap items-center justify-between text-[11px] text-[#8FA6BF]">
              <span>Ride Type: <strong className="text-[#E5F2FF] uppercase">{confirmedRide.ride_type}</strong></span>
              <span>Distance: <strong>{confirmedRide.distance_km} km</strong></span>
              <span>Estimated Duration: <strong>{confirmedRide.estimated_duration_minutes} min</strong></span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('rider')}
              className="w-full sm:w-auto rounded-lg bg-[#00C2FF] px-6 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all shadow-md shadow-[#00C2FF]/20"
            >
              Return to Rider Dashboard
            </button>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto rounded-lg border border-[#1E334D] bg-[#07111F] px-6 py-2.5 text-xs font-semibold text-[#E5F2FF] hover:border-[#00C2FF]"
            >
              Book Another Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E334D]">
        <div>
          <span className="text-xs font-semibold text-[#00C2FF] uppercase tracking-wider">
            Step 3 Ride Booking Engine
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#E5F2FF]">
            Plan Your Route & Book a Ride
          </h1>
        </div>

        <button
          onClick={() => onNavigate('rider')}
          className="self-start sm:self-auto rounded-lg border border-[#1E334D] bg-[#0F1C2E] px-4 py-2 text-xs font-medium text-[#8FA6BF] hover:text-[#E5F2FF]"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Responsive Layout: Desktop 2-column (Left panel, Right Map) / Mobile Stacked (Top Map, Bottom panel) */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Booking Form Panel */}
        <div className="w-full lg:col-span-5 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-5 sm:p-6 shadow-sm space-y-6">
          {/* Booking Steps Indicator */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1E334D]">
            <span className="text-xs font-bold text-[#E5F2FF]">1. Route Details</span>
            <span className="text-xs text-[#8FA6BF]">Gandhinagar / Ahmedabad</span>
          </div>

          {/* Geolocation Notice / Error */}
          {locationError && (
            <div className="rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-xs text-[#F59E0B] flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#F59E0B]" />
                <span>{locationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLocationError(null)}
                className="text-[11px] underline text-[#F59E0B] hover:text-[#FBBF24] shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {bookingError && (
            <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444] flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Location Inputs */}
          <div className="space-y-4">
            {/* Pickup Location */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#E5F2FF] flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#22C55E] text-[10px] font-bold text-[#07111F]">
                    P
                  </span>
                  Pickup Location
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 text-[11px] text-[#00C2FF] hover:underline disabled:opacity-50"
                >
                  <Crosshair className={`h-3 w-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Locating...' : 'Use Current Location'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search pickup place or address..."
                  value={pickupInput}
                  onFocus={() => setActiveSuggestionField('pickup')}
                  onChange={(e) => {
                    setPickupInput(e.target.value);
                    setActiveSuggestionField('pickup');
                  }}
                  className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] placeholder-[#8FA6BF]/50 focus:border-[#00C2FF] focus:outline-none"
                />
              </div>

              {/* Suggestions Dropdown */}
              {activeSuggestionField === 'pickup' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#1E334D] bg-[#0F1C2E] p-2 shadow-2xl max-h-52 overflow-y-auto">
                  {googlePredictions.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-[#1E334D]">
                      <span className="block px-2 py-1 text-[10px] font-semibold text-[#00C2FF] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live Places Autocomplete
                      </span>
                      {googlePredictions.map((pred, pIdx) => (
                        <button
                          key={`pred-${pIdx}`}
                          type="button"
                          onClick={() => handleSelectGooglePrediction('pickup', pred)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#00C2FF] shrink-0" />
                          <span className="truncate">{pred.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="block px-2 py-1 text-[10px] font-semibold text-[#8FA6BF] uppercase tracking-wider">
                    Recommended Locations
                  </span>
                  {SUGGESTED_PLACES.filter((p) =>
                    !pickupInput.trim() || p.address.toLowerCase().includes(pickupInput.toLowerCase().trim())
                  ).map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion('pickup', place)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#22C55E] shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </button>
                  ))}
                  {pickupInput.trim().length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const coords = getDeterministicCoordinate(pickupInput);
                        handleSelectSuggestion('pickup', {
                          address: pickupInput.trim(),
                          latitude: coords.lat,
                          longitude: coords.lng,
                        });
                      }}
                      className="w-full text-left px-2.5 py-1.5 mt-1 border-t border-[#1E334D]/80 text-xs text-[#00C2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#00C2FF] shrink-0" />
                      <span className="truncate">Use custom: &ldquo;{pickupInput.trim()}&rdquo;</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Intermediate Stops (Max 3) */}
            {stops.map((stop) => (
              <div key={stop.stopOrder} className="relative pl-3 border-l-2 border-[#1E334D] ml-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#E5F2FF] flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F59E0B] text-[10px] font-bold text-[#07111F]">
                      S{stop.stopOrder}
                    </span>
                    Stop {stop.stopOrder}
                  </label>
                  <div className="flex items-center gap-2">
                    {stops.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveStop(stop.stopOrder, 'up')}
                          disabled={stop.stopOrder === 1}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#1E334D] text-[#8FA6BF] hover:text-[#E5F2FF] hover:bg-[#1E334D]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move stop up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStop(stop.stopOrder, 'down')}
                          disabled={stop.stopOrder === stops.length}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#1E334D] text-[#8FA6BF] hover:text-[#E5F2FF] hover:bg-[#1E334D]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move stop down"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.stopOrder)}
                      className="flex items-center gap-1 text-[11px] text-[#EF4444] hover:underline"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={stop.address}
                    onFocus={() => setActiveSuggestionField(stop.stopOrder)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStops(
                        stops.map((s) =>
                          s.stopOrder === stop.stopOrder ? { ...s, address: val } : s
                        )
                      );
                      setActiveSuggestionField(stop.stopOrder);
                    }}
                    className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] focus:border-[#F59E0B] focus:outline-none"
                  />
                </div>

                {activeSuggestionField === stop.stopOrder && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#1E334D] bg-[#0F1C2E] p-2 shadow-2xl max-h-40 overflow-y-auto">
                    {SUGGESTED_PLACES.map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(stop.stopOrder, place)}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
                        <span className="truncate">{place.address}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add Stop Button */}
            {stops.length < 3 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#00C2FF] hover:text-[#00C2FF]/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Stop (Max 3)</span>
                </button>
              </div>
            )}

            {/* Destination Location */}
            <div className="relative">
              <label className="block text-xs font-semibold text-[#E5F2FF] mb-1 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00C2FF] text-[10px] font-bold text-[#07111F]">
                  D
                </span>
                Destination Location
              </label>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search destination place or address..."
                  value={destInput}
                  onFocus={() => setActiveSuggestionField('dest')}
                  onChange={(e) => {
                    setDestInput(e.target.value);
                    setActiveSuggestionField('dest');
                  }}
                  className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] placeholder-[#8FA6BF]/50 focus:border-[#00C2FF] focus:outline-none"
                />
              </div>

              {activeSuggestionField === 'dest' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#1E334D] bg-[#0F1C2E] p-2 shadow-2xl max-h-52 overflow-y-auto">
                  {googlePredictions.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-[#1E334D]">
                      <span className="block px-2 py-1 text-[10px] font-semibold text-[#00C2FF] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live Places Autocomplete
                      </span>
                      {googlePredictions.map((pred, pIdx) => (
                        <button
                          key={`dest-pred-${pIdx}`}
                          type="button"
                          onClick={() => handleSelectGooglePrediction('dest', pred)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                        >
                          <MapPin className="h-3.5 w-3.5 text-[#00C2FF] shrink-0" />
                          <span className="truncate">{pred.description}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <span className="block px-2 py-1 text-[10px] font-semibold text-[#8FA6BF] uppercase tracking-wider">
                    Recommended Destinations
                  </span>
                  {SUGGESTED_PLACES.filter((p) =>
                    !destInput.trim() || p.address.toLowerCase().includes(destInput.toLowerCase().trim())
                  ).map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion('dest', place)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#E5F2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#00C2FF] shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </button>
                  ))}
                  {destInput.trim().length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const coords = getDeterministicCoordinate(destInput, 23.0225, 72.5714);
                        handleSelectSuggestion('dest', {
                          address: destInput.trim(),
                          latitude: coords.lat,
                          longitude: coords.lng,
                        });
                      }}
                      className="w-full text-left px-2.5 py-1.5 mt-1 border-t border-[#1E334D]/80 text-xs text-[#00C2FF] hover:bg-[#1E334D] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#00C2FF] shrink-0" />
                      <span className="truncate">Use custom: &ldquo;{destInput.trim()}&rdquo;</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Route Metrics Status Pill */}
          {(distanceKm !== null && durationMinutes !== null) || isRouteLoading ? (
            <div className="pt-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#1E334D] bg-[#07111F] text-xs">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-[#00C2FF]" />
                  {distanceKm !== null && durationMinutes !== null ? (
                    <span className="text-[#E5F2FF] font-semibold">
                      {distanceKm} km · {durationMinutes} min
                    </span>
                  ) : (
                    <span className="text-[#8FA6BF]">Calculating distance...</span>
                  )}
                </div>

                {isRouteLoading ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#00C2FF] font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculating...
                  </span>
                ) : isRealRoute ? (
                  <span className="flex items-center gap-1 text-[11px] text-[#22C55E] font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Real Google Route
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#F59E0B] font-medium">
                    <Info className="h-3.5 w-3.5" />
                    Coordinate Estimate
                  </span>
                )}
              </div>

              {routeError && !isRouteLoading && (
                <div className="mt-1.5 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-2 text-[11px] text-[#FCA5A5] flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#EF4444]" />
                  <span>{routeError}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Ride Type Selection (Economy, Comfort, Premium) */}
          <div className="pt-4 border-t border-[#1E334D] space-y-3">
            <span className="text-xs font-bold text-[#E5F2FF] block">
              2. Select Vehicle Category
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {(['economy', 'comfort', 'premium'] as VehicleType[]).map((type) => {
                const config = FARE_CONFIG[type];
                const isSelected = selectedRideType === type;
                const calculatedEstimate = distanceKm && durationMinutes
                  ? calculateFare(type, distanceKm, durationMinutes).estimatedFare
                  : null;

                return (
                  <div
                    key={type}
                    onClick={() => setSelectedRideType(type)}
                    className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-[#00C2FF] bg-[#00C2FF]/10 shadow-sm'
                        : 'border-[#1E334D] bg-[#07111F] hover:border-[#1E334D]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#00C2FF] text-[#07111F]' : 'bg-[#1E334D] text-[#E5F2FF]'}`}>
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#E5F2FF]">{config.name}</span>
                          <span className="text-[10px] text-[#8FA6BF]">Base ₹{config.baseFare}</span>
                        </div>
                        <span className="text-[11px] text-[#8FA6BF] block">{config.description}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {calculatedEstimate !== null ? (
                        <span className="text-sm font-bold text-[#00C2FF]">
                          ₹{calculatedEstimate}
                        </span>
                      ) : (
                        <span className="text-xs text-[#8FA6BF]">Select route</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fare Breakdown Details */}
          {activeFare && (
            <div className="pt-3 border-t border-[#1E334D] space-y-2 text-xs">
              <span className="text-xs font-bold text-[#E5F2FF] block mb-1">
                3. Estimated Fare Breakdown
              </span>

              <div className="flex justify-between text-[#8FA6BF]">
                <span>Base Fare:</span>
                <span className="font-mono text-[#E5F2FF]">₹{activeFare.baseFare}</span>
              </div>
              <div className="flex justify-between text-[#8FA6BF]">
                <span>Distance Charge ({activeFare.distanceKm} km):</span>
                <span className="font-mono text-[#E5F2FF]">₹{activeFare.distanceCharge}</span>
              </div>
              <div className="flex justify-between text-[#8FA6BF]">
                <span>Time Charge ({activeFare.durationMinutes} min):</span>
                <span className="font-mono text-[#E5F2FF]">₹{activeFare.timeCharge}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#00C2FF] pt-2 border-t border-[#1E334D]">
                <span>Total Estimated Fare:</span>
                <span>₹{activeFare.estimatedFare}</span>
              </div>

              <p className="text-[11px] text-[#8FA6BF] pt-1 leading-normal italic">
                * Estimated fare. Final fare may vary based on actual trip distance and duration.
              </p>
            </div>
          )}

          {/* Confirm Ride Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirmRide}
              disabled={!pickup || !destination || isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#00C2FF] py-3 px-4 text-xs font-bold text-[#07111F] shadow-lg shadow-[#00C2FF]/20 hover:bg-[#00C2FF]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Booking your ride...</span>
                </>
              ) : (
                <>
                  <span>Confirm Ride — {activeFare ? `₹${activeFare.estimatedFare}` : 'Select Route'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Google Map Canvas */}
        <div className="w-full lg:col-span-7 h-[420px] lg:h-[640px] sticky top-20">
          <GoogleMapWrapper
            pickup={pickup}
            destination={destination}
            stops={stops}
            distanceKm={distanceKm}
            durationMinutes={durationMinutes}
            isRealRoute={isRealRoute}
            isRouteLoading={isRouteLoading}
            routeError={routeError}
            onRouteStartCalculating={() => {
              setIsRouteLoading(true);
              setRouteError(null);
            }}
            onRealRouteCalculated={(realKm, realDur, isReal) => {
              if (isReal && realKm > 0) {
                setDistanceKm(realKm);
                setDurationMinutes(realDur);
                setIsRealRoute(true);
              }
              setIsRouteLoading(false);
              setRouteError(null);
            }}
            onRouteCalculationError={(err) => {
              setIsRouteLoading(false);
              setRouteError(err);
              setIsRealRoute(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};
