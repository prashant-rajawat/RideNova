import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tag,
  Calendar,
  Ticket,
  Check,
  X,
} from 'lucide-react';
import { GoogleMapWrapper, LocationPoint, StopPoint } from '../maps/GoogleMapWrapper.tsx';
import { ServiceAreaAlert } from './ServiceAreaAlert.tsx';
import { calculateDistanceKm, estimateDurationMinutes, calculateFare, FARE_CONFIG } from '../../lib/fare.ts';
import { VehicleType, RideWithStops, RouteSource, PromoCode } from '../../types/index.ts';
import { isWithinServiceArea } from '../../utils/serviceArea.ts';
import { api, ApiError } from '../../lib/api.ts';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { LiveRideTracker } from './LiveRideTracker.tsx';

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

  // Booking Form State initialized with default route: Pickup -> Stop 1 -> Stop 2 -> Destination
  const [pickup, setPickup] = useState<LocationPoint | null>(() => SUGGESTED_PLACES[0]);
  const [pickupInput, setPickupInput] = useState(() => SUGGESTED_PLACES[0].address);

  const [destination, setDestination] = useState<LocationPoint | null>(() => SUGGESTED_PLACES[2]);
  const [destInput, setDestInput] = useState(() => SUGGESTED_PLACES[2].address);

  const [stops, setStops] = useState<StopPoint[]>([
    { ...SUGGESTED_PLACES[4], stopOrder: 1 },
    { ...SUGGESTED_PLACES[5], stopOrder: 2 },
  ]);

  // Selection & Route States
  const [selectedRideType, setSelectedRideType] = useState<VehicleType>('economy');
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [isRealRoute, setIsRealRoute] = useState<boolean>(false);
  const [routeSource, setRouteSource] = useState<RouteSource>('fallback_estimate');
  const [isRouteLoading, setIsRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Status & Confirmation States
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedRide, setConfirmedRide] = useState<RideWithStops | null>(null);

  // Scheduling Option
  const [isScheduled, setIsScheduled] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('booking_mode') === 'scheduled';
    } catch {
      return false;
    }
  });
  const [scheduledDate, setScheduledDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState<string>('09:30');

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState<boolean>(false);
  const [availablePromos, setAvailablePromos] = useState<PromoCode[]>([]);

  // Check if rider already has an active ride (restore on refresh or navigation)
  useEffect(() => {
    api.getRides().then((res) => {
      if (res.data && res.data.length > 0) {
        const active = res.data.find((r) =>
          ['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(r.status)
        );
        if (active) {
          setConfirmedRide(active);
        }
      }
    }).catch(() => {});
  }, []);

  // Suggestions Dropdowns & Predictions
  const [activeSuggestionField, setActiveSuggestionField] = useState<'pickup' | 'dest' | number | null>(null);
  const [googlePredictions, setGooglePredictions] = useState<any[]>([]);

  // Ref to track debounce timer for autocomplete predictions
  const autocompleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Query live Google Places Autocomplete (New) using AutocompleteSuggestion API with 250ms debounce and stale response protection
  useEffect(() => {
    if (autocompleteTimerRef.current) {
      clearTimeout(autocompleteTimerRef.current);
    }

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

    const fieldAtRequest = activeSuggestionField;
    const inputAtRequest = currentInput.trim();

    autocompleteTimerRef.current = setTimeout(async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).google?.maps?.importLibrary) {
          const placesLib = await (window as any).google.maps.importLibrary("places");
          if (placesLib?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
            const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: inputAtRequest,
            });
            // Stale response protection: verify active field and input haven't changed
            const activeNow =
              fieldAtRequest === 'pickup'
                ? pickupInput
                : fieldAtRequest === 'dest'
                ? destInput
                : typeof fieldAtRequest === 'number'
                ? stops.find((s) => s.stopOrder === fieldAtRequest)?.address || ''
                : '';

            if (activeSuggestionField === fieldAtRequest && activeNow.trim() === inputAtRequest && Array.isArray(suggestions)) {
              setGooglePredictions(suggestions.slice(0, 5));
              setRouteError(null);
              return;
            }
          }
        }
        setGooglePredictions([]);
      } catch (err: any) {
        console.warn('Places API (New) Autocomplete error:', err);
        setRouteError('Places Autocomplete failed. Using suggested locations or manual address.');
        setGooglePredictions([]);
      }
    }, 250);

    return () => {
      if (autocompleteTimerRef.current) {
        clearTimeout(autocompleteTimerRef.current);
      }
    };
  }, [pickupInput, destInput, stops, activeSuggestionField]);

  // Stable callbacks for GoogleMapWrapper to prevent re-render loops
  const handleRouteStartCalculating = useCallback(() => {
    setIsRouteLoading(true);
    setRouteError(null);
  }, []);

  const handleRealRouteCalculated = useCallback(
    (realKm: number, realDur: number, isReal?: boolean, routeSrc?: RouteSource) => {
      if (isReal && realKm > 0) {
        setDistanceKm(realKm);
        setDurationMinutes(realDur);
        setIsRealRoute(true);
        setRouteSource(routeSrc || 'google_routes_api');
        setRouteError(null);
      } else {
        setIsRealRoute(false);
        setRouteSource('fallback_estimate');
      }
      setIsRouteLoading(false);
    },
    []
  );

  const handleRouteCalculationError = useCallback((err: string) => {
    setIsRouteLoading(false);
    setRouteError(err);
    setIsRealRoute(false);
    setRouteSource('fallback_estimate');
  }, []);

  // Compute baseline straight-line fallback distance only when pickup or destination coordinates change
  const routeCoordsKey = `${pickup?.latitude},${pickup?.longitude}|${destination?.latitude},${destination?.longitude}|${stops
    .map((s) => `${s.stopOrder}:${s.latitude},${s.longitude}`)
    .join(';')}`;

  useEffect(() => {
    if (!pickup || !destination) {
      setDistanceKm(null);
      setDurationMinutes(null);
      setIsRealRoute(false);
      setIsRouteLoading(false);
      setRouteError(null);
      return;
    }

    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
    const waypoints = [
      { lat: pickup.latitude, lng: pickup.longitude },
      ...sortedStops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
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

    const fallbackDist = Math.max(0.5, Number(totalDist.toFixed(1)));
    const fallbackDur = estimateDurationMinutes(fallbackDist);

    // Set baseline initial estimation if we don't already have a valid real route
    setDistanceKm((prev) => (prev !== null && isRealRoute ? prev : fallbackDist));
    setDurationMinutes((prev) => (prev !== null && isRealRoute ? prev : fallbackDur));
    setIsRouteLoading(true);
  }, [routeCoordsKey]);

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
          latitude: Number(latitude.toFixed(4)),
          longitude: Number(longitude.toFixed(4)),
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
    const defaultSuggestion = SUGGESTED_PLACES[(newOrder + 2) % SUGGESTED_PLACES.length];
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

  // Remove stop and re-index stopOrder sequentially
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

  // Select location from suggestion or coordinate resolution
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

  // Select place from modern Places API (New) AutocompleteSuggestion prediction
  const handleSelectGooglePrediction = async (
    field: 'pickup' | 'dest' | number,
    sug: any
  ) => {
    try {
      const placePrediction = sug.placePrediction;
      if (placePrediction && typeof placePrediction.toPlace === 'function') {
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] });
        if (place.location) {
          const lat = Number(place.location.lat().toFixed(4));
          const lng = Number(place.location.lng().toFixed(4));
          
          if (!isWithinServiceArea(lat, lng)) {
            setBookingError('Sorry, this location is outside our current service area (Vadodara 50km radius).');
            setGooglePredictions([]);
            return;
          }
          
          const addr = place.formattedAddress || place.displayName || placePrediction.text?.text || 'Selected Place';
          handleSelectSuggestion(field, {
            address: addr,
            latitude: lat,
            longitude: lng,
          });
          setActiveSuggestionField(null);
          return;
        }
      }
    } catch (err) {
      console.warn('Places API (New) fetchFields error:', err);
    }
    // Fallback
    const desc = sug.placePrediction?.text?.text || sug.description || 'Selected Place';
    const coords = getDeterministicCoordinate(desc);
    handleSelectSuggestion(field, {
      address: desc,
      latitude: coords.lat,
      longitude: coords.lng,
    });
    setActiveSuggestionField(null);
  };

  // Safely resolve manual typed text to a valid coordinate point
  const handleResolveManualAddress = (
    field: 'pickup' | 'dest' | number,
    text: string
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 1. Check if it matches any suggested place
    const matched = SUGGESTED_PLACES.find(
      (p) => p.address.toLowerCase() === trimmed.toLowerCase() || p.address.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (matched) {
      handleSelectSuggestion(field, matched);
      return;
    }

    // 2. Fallback to deterministic coordinates
    const coords = getDeterministicCoordinate(trimmed);
    handleSelectSuggestion(field, {
      address: trimmed,
      latitude: coords.lat,
      longitude: coords.lng,
    });
  };

  // Load available promo codes on mount
  useEffect(() => {
    api
      .getPromos()
      .then((res) => {
        if (res?.data) {
          setAvailablePromos(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Promo Code Validation Handler
  const handleApplyPromo = async (codeToApply?: string) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setPromoMessage({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }
    const baselineFare = activeFare?.estimatedFare || 100;
    setIsValidatingPromo(true);
    setPromoMessage(null);
    try {
      const res = await api.validatePromo(code, baselineFare);
      if (res.data?.valid) {
        setAppliedPromo(code);
        setPromoDiscount(res.data.discount);
        setPromoMessage({
          type: 'success',
          text: res.data.message || `Code ${code} applied! Saved ₹${res.data.discount}`,
        });
      } else {
        setPromoMessage({
          type: 'error',
          text: res.data?.message || 'Invalid or expired coupon code.',
        });
      }
    } catch (err: any) {
      setPromoMessage({
        type: 'error',
        text: err.message || 'Failed to validate promo code.',
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCodeInput('');
    setPromoMessage(null);
  };


  // Confirm and create ride request
  const handleConfirmRide = async () => {
    if (!pickup || !destination || isSubmitting) return;

    // Validate Service Area
    const locations = [
      { lat: pickup.latitude, lng: pickup.longitude, label: 'pickup location' },
      { lat: destination.latitude, lng: destination.longitude, label: 'destination' },
      ...stops.map((s) => ({ lat: s.latitude, lng: s.longitude, label: `stop ${s.stopOrder}` })),
    ];
    for (const loc of locations) {
      if (!isWithinServiceArea(loc.lat, loc.lng)) {
        setBookingError(`Sorry, the ${loc.label} is outside our current service area (Vadodara 50km radius).`);
        return;
      }
    }

    setIsSubmitting(true);
    setBookingError(null);

    const scheduledTimestamp =
      isScheduled && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : undefined;

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
        scheduledAt: scheduledTimestamp,
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
    setPickup(SUGGESTED_PLACES[0]);
    setPickupInput(SUGGESTED_PLACES[0].address);
    setDestination(SUGGESTED_PLACES[2]);
    setDestInput(SUGGESTED_PLACES[2].address);
    setStops([
      { ...SUGGESTED_PLACES[4], stopOrder: 1 },
      { ...SUGGESTED_PLACES[5], stopOrder: 2 },
    ]);
    setConfirmedRide(null);
    setBookingError(null);
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoMessage(null);
    setIsScheduled(false);
    sessionStorage.removeItem('booking_mode');
  };

  // Calculated fare details
  const activeFare =
    distanceKm && durationMinutes
      ? calculateFare(selectedRideType, distanceKm, durationMinutes)
      : null;

  // Confirmation Screen / Live Ride Tracking View
  if (confirmedRide) {
    return (
      <LiveRideTracker
        ride={confirmedRide}
        onNavigate={onNavigate}
        onReset={handleReset}
        onRideUpdated={(updated) => setConfirmedRide(updated)}
      />
    );
  }

  return (
    <div className="min-h-[85vh] max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
        <div>
          <span className="text-xs font-semibold text-[#E21D2B] uppercase tracking-wider">
            Step 3 Ride Booking Engine
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#171717]">
            Plan Your Route & Book a Ride
          </h1>
        </div>

        <button
          onClick={() => onNavigate('rider')}
          className="self-start sm:self-auto rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#171717]"
        >
          Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Route Configuration Panel */}
        <div className="w-full lg:col-span-5 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#171717]">
              1. Route & Stops
            </span>
            <span className="text-[11px] text-[#737373]">
              {stops.length} stop{stops.length === 1 ? '' : 's'} added
            </span>
          </div>

          {/* Location Error Notice */}
          {locationError && (
            <div className="rounded-lg border border-[#B45309]/30 bg-[#B45309]/10 p-2.5 text-xs text-[#B45309] flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Booking Error Notice */}
          {bookingError && (
            bookingError.includes('outside our current service area') ? (
              <ServiceAreaAlert message={bookingError} />
            ) : (
              <div className="rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C] flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{bookingError}</span>
              </div>
            )
          )}

          {/* Waypoints Input Sequence */}
          <div className="space-y-4">
            {/* Pickup Location */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#15803D] text-[10px] font-bold text-[#FFFFFF]">
                    P
                  </span>
                  Pickup Location
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1 text-[11px] text-[#E21D2B] hover:underline disabled:opacity-50"
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleResolveManualAddress('pickup', pickupInput);
                      setActiveSuggestionField(null);
                    }
                  }}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/50 focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              {/* Suggestions Dropdown */}
              {activeSuggestionField === 'pickup' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-2 shadow-2xl max-h-52 overflow-y-auto">
                  {googlePredictions.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-[#E5E5E5]">
                      <span className="block px-2 py-1 text-[10px] font-semibold text-[#E21D2B] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live Places Autocomplete
                      </span>
                      {googlePredictions.map((pred, pIdx) => {
                        const sugText = pred.placePrediction?.text?.text || pred.description || 'Location';
                        return (
                          <button
                            key={`pred-${pIdx}`}
                            type="button"
                            onClick={() => handleSelectGooglePrediction('pickup', pred)}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                          >
                            <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                            <span className="truncate">{sugText}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <span className="block px-2 py-1 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                    Recommended Locations
                  </span>
                  {SUGGESTED_PLACES.filter(
                    (p) => !pickupInput.trim() || p.address.toLowerCase().includes(pickupInput.toLowerCase().trim())
                  ).map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion('pickup', place)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#15803D] shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </button>
                  ))}
                  {pickupInput.trim().length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleResolveManualAddress('pickup', pickupInput)}
                      className="w-full text-left px-2.5 py-1.5 mt-1 border-t border-[#E5E5E5]/80 text-xs text-[#E21D2B] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                      <span className="truncate">Use &ldquo;{pickupInput.trim()}&rdquo;</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Intermediate Stops (Max 3) */}
            {stops.map((stop) => (
              <div key={stop.stopOrder} className="relative pl-3 border-l-2 border-[#E5E5E5] ml-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#B45309] text-[10px] font-bold text-[#FFFFFF]">
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
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#E5E5E5] text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move stop up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStop(stop.stopOrder, 'down')}
                          disabled={stop.stopOrder === stops.length}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-[#E5E5E5] text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5]/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Move stop down"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.stopOrder)}
                      className="flex items-center gap-1 text-[11px] text-[#B91C1C] hover:underline"
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
                        stops.map((s) => (s.stopOrder === stop.stopOrder ? { ...s, address: val } : s))
                      );
                      setActiveSuggestionField(stop.stopOrder);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleResolveManualAddress(stop.stopOrder, stop.address);
                        setActiveSuggestionField(null);
                      }
                    }}
                    className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] focus:border-[#B45309] focus:outline-none"
                  />
                </div>

                {activeSuggestionField === stop.stopOrder && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-2 shadow-2xl max-h-52 overflow-y-auto">
                    {googlePredictions.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-[#E5E5E5]">
                        <span className="block px-2 py-1 text-[10px] font-semibold text-[#E21D2B] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Live Places Autocomplete
                        </span>
                        {googlePredictions.map((pred, pIdx) => {
                          const sugText = pred.placePrediction?.text?.text || pred.description || 'Location';
                          return (
                            <button
                              key={`pred-${pIdx}`}
                              type="button"
                              onClick={() => handleSelectGooglePrediction(stop.stopOrder, pred)}
                              className="w-full text-left px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                            >
                              <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                              <span className="truncate">{sugText}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <span className="block px-2 py-1 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                      Recommended Locations
                    </span>
                    {SUGGESTED_PLACES.filter(
                      (p) => !stop.address.trim() || p.address.toLowerCase().includes(stop.address.toLowerCase().trim())
                    ).map((place, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(stop.stopOrder, place)}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#B45309] shrink-0" />
                        <span className="truncate">{place.address}</span>
                      </button>
                    ))}
                    {stop.address.trim().length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleResolveManualAddress(stop.stopOrder, stop.address)}
                        className="w-full text-left px-2.5 py-1.5 mt-1 border-t border-[#E5E5E5]/80 text-xs text-[#E21D2B] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                        <span className="truncate">Use &ldquo;{stop.address.trim()}&rdquo;</span>
                      </button>
                    )}
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
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#E21D2B] hover:text-[#E21D2B]/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Stop (Max 3)</span>
                </button>
              </div>
            )}

            {/* Destination Location */}
            <div className="relative">
              <label className="block text-xs font-semibold text-[#171717] mb-1 flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E21D2B] text-[10px] font-bold text-[#FFFFFF]">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleResolveManualAddress('dest', destInput);
                      setActiveSuggestionField(null);
                    }
                  }}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/50 focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              {activeSuggestionField === 'dest' && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-2 shadow-2xl max-h-52 overflow-y-auto">
                  {googlePredictions.length > 0 && (
                    <div className="mb-2 pb-2 border-b border-[#E5E5E5]">
                      <span className="block px-2 py-1 text-[10px] font-semibold text-[#E21D2B] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Live Places Autocomplete
                      </span>
                      {googlePredictions.map((pred, pIdx) => {
                        const sugText = pred.placePrediction?.text?.text || pred.description || 'Location';
                        return (
                          <button
                            key={`dest-pred-${pIdx}`}
                            type="button"
                            onClick={() => handleSelectGooglePrediction('dest', pred)}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                          >
                            <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                            <span className="truncate">{sugText}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <span className="block px-2 py-1 text-[10px] font-semibold text-[#737373] uppercase tracking-wider">
                    Recommended Destinations
                  </span>
                  {SUGGESTED_PLACES.filter(
                    (p) => !destInput.trim() || p.address.toLowerCase().includes(destInput.toLowerCase().trim())
                  ).map((place, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSuggestion('dest', place)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </button>
                  ))}
                  {destInput.trim().length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleResolveManualAddress('dest', destInput)}
                      className="w-full text-left px-2.5 py-1.5 mt-1 border-t border-[#E5E5E5]/80 text-xs text-[#E21D2B] hover:bg-[#E5E5E5] rounded-md transition-colors flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                      <span className="truncate">Use &ldquo;{destInput.trim()}&rdquo;</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Route Metrics Status Pill */}
          {(distanceKm !== null && durationMinutes !== null) || isRouteLoading ? (
            <div className="pt-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] text-xs">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-[#E21D2B]" />
                  {distanceKm !== null && durationMinutes !== null ? (
                    <span className="text-[#171717] font-semibold">
                      {distanceKm} km · {durationMinutes} min
                    </span>
                  ) : (
                    <span className="text-[#737373]">Calculating distance...</span>
                  )}
                </div>

                {isRouteLoading ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#E21D2B] font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Calculating...
                  </span>
                ) : isRealRoute ? (
                  <span className="flex items-center gap-1 text-[11px] text-[#15803D] font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Real Google Route
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#B45309] font-medium">
                    <Info className="h-3.5 w-3.5" />
                    Coordinate Estimate
                  </span>
                )}
              </div>

              {routeError && !isRouteLoading && (
                <div className="mt-1.5 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-2 text-[11px] text-[#FCA5A5] flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#B91C1C]" />
                  <span>{routeError}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Duplicate Consecutive Waypoint Warning Check */}
          {(() => {
            const allWaypointsForCheck = [
              { label: 'Pickup', address: pickup?.address },
              ...stops.map((s) => ({ label: `Stop ${s.stopOrder}`, address: s.address })),
              { label: 'Destination', address: destination?.address },
            ];
            const duplicateWarnings: string[] = [];
            for (let i = 0; i < allWaypointsForCheck.length - 1; i++) {
              const curr = allWaypointsForCheck[i];
              const next = allWaypointsForCheck[i + 1];
              if (curr.address && next.address && curr.address.trim().toLowerCase() === next.address.trim().toLowerCase()) {
                duplicateWarnings.push(`Warning: ${curr.label} and ${next.label} have identical addresses ("${curr.address}").`);
              }
            }
            if (duplicateWarnings.length === 0) return null;
            return (
              <div className="rounded-lg border border-[#B45309]/40 bg-[#B45309]/10 p-2.5 text-xs text-[#B45309] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Duplicate Consecutive Waypoint Warning</span>
                </div>
                {duplicateWarnings.map((w, idx) => (
                  <p key={idx} className="pl-5">{w}</p>
                ))}
              </div>
            );
          })()}

          {/* Ride Type Selection (Economy, Comfort, Premium) */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-3">
            <span className="text-xs font-bold text-[#171717] block">
              2. Select Vehicle Category
            </span>

            <div className="grid grid-cols-1 gap-2.5">
              {(['economy', 'comfort', 'premium'] as VehicleType[]).map((type) => {
                const config = FARE_CONFIG[type];
                const isSelected = selectedRideType === type;
                const calculatedEstimate =
                  distanceKm && durationMinutes
                    ? calculateFare(type, distanceKm, durationMinutes).estimatedFare
                    : null;

                return (
                  <div
                    key={type}
                    onClick={() => setSelectedRideType(type)}
                    className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-[#E21D2B] bg-[#E21D2B]/10 shadow-sm'
                        : 'border-[#E5E5E5] bg-[#FFFFFF] hover:border-[#E5E5E5]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-[#E21D2B] text-[#FFFFFF]' : 'bg-[#E5E5E5] text-[#171717]'
                        }`}
                      >
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#171717]">{config.name}</span>
                          <span className="text-[10px] text-[#737373]">Base ₹{config.baseFare}</span>
                        </div>
                        <span className="text-[11px] text-[#737373] block">{config.description}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {calculatedEstimate !== null ? (
                        <span className="text-sm font-bold text-[#E21D2B]">
                          ₹{calculatedEstimate}
                        </span>
                      ) : (
                        <span className="text-xs text-[#737373]">Select route</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ride Timing / Scheduling Option */}
          <div className="pt-3 border-t border-[#E5E5E5] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#E21D2B]" />
                Ride Timing
              </span>
              <div className="inline-flex rounded-lg border border-[#E5E5E5] p-0.5 bg-[#FAFAFA]">
                <button
                  type="button"
                  onClick={() => setIsScheduled(false)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    !isScheduled
                      ? 'bg-[#E21D2B] text-white shadow-xs'
                      : 'text-[#737373] hover:text-[#171717]'
                  }`}
                >
                  Ride Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsScheduled(true)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    isScheduled
                      ? 'bg-[#E21D2B] text-white shadow-xs'
                      : 'text-[#737373] hover:text-[#171717]'
                  }`}
                >
                  Schedule Ride
                </button>
              </div>
            </div>

            {isScheduled && (
              <div className="rounded-lg border border-[#E5E5E5] bg-[#FFF1F2]/60 p-3 space-y-2 text-xs">
                <span className="font-semibold text-[#171717] block flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#E21D2B]" />
                  Select Pick-up Date & Time
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#737373] block mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#737373] block mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full rounded-md border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#737373]">
                  Your cab will be dispatched in advance for pick-up on {scheduledDate} at {scheduledTime}.
                </p>
              </div>
            )}
          </div>

          {/* Promo Code & Discounts */}
          <div className="pt-3 border-t border-[#E5E5E5] space-y-2 text-xs">
            <span className="text-xs font-bold text-[#171717] flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[#E21D2B]" />
              Promo Code / Offers
            </span>

            {appliedPromo ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#15803D]/10 border border-[#15803D]/30 text-xs">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#15803D]" />
                  <div>
                    <span className="font-bold text-[#15803D] uppercase">{appliedPromo} Applied</span>
                    <span className="text-[11px] text-[#15803D] block">You saved ₹{promoDiscount}!</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="p-1 rounded hover:bg-black/5 text-[#737373] hover:text-[#B91C1C]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon (e.g. WELCOME50)"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs uppercase placeholder:normal-case font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    disabled={isValidatingPromo || !promoCodeInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-bold transition-all disabled:opacity-40"
                  >
                    {isValidatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                  </button>
                </div>

                {/* Quick available codes */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[#737373]">Try:</span>
                  {availablePromos.length > 0 ? (
                    availablePromos.slice(0, 3).map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => {
                          setPromoCodeInput(p.code);
                          handleApplyPromo(p.code);
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFF1F2] text-[#E21D2B] border border-[#E21D2B]/30 hover:bg-[#E21D2B] hover:text-white transition-all"
                      >
                        {p.code} ({p.discount_type === 'percentage' ? `${p.discount_value}%` : `₹${p.discount_value}`} OFF)
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoCodeInput('WELCOME50');
                          handleApplyPromo('WELCOME50');
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFF1F2] text-[#E21D2B] border border-[#E21D2B]/30 hover:bg-[#E21D2B] hover:text-white transition-all"
                      >
                        WELCOME50 (₹50 OFF)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPromoCodeInput('RIDE20');
                          handleApplyPromo('RIDE20');
                        }}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFF1F2] text-[#E21D2B] border border-[#E21D2B]/30 hover:bg-[#E21D2B] hover:text-white transition-all"
                      >
                        RIDE20 (20% OFF)
                      </button>
                    </>
                  )}
                </div>

                {promoMessage && (
                  <p
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      promoMessage.type === 'success' ? 'text-[#15803D]' : 'text-[#B91C1C]'
                    }`}
                  >
                    {promoMessage.type === 'success' ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    <span>{promoMessage.text}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fare Breakdown Details */}
          {activeFare && (
            <div className="pt-3 border-t border-[#E5E5E5] space-y-2 text-xs">
              <span className="text-xs font-bold text-[#171717] block mb-1">
                3. Estimated Fare Breakdown
              </span>

              <div className="flex justify-between text-[#737373]">
                <span>Base Fare:</span>
                <span className="font-mono text-[#171717]">₹{activeFare.baseFare}</span>
              </div>
              <div className="flex justify-between text-[#737373]">
                <span>Distance Charge ({activeFare.distanceKm} km):</span>
                <span className="font-mono text-[#171717]">₹{activeFare.distanceCharge}</span>
              </div>
              <div className="flex justify-between text-[#737373]">
                <span>Time Charge ({activeFare.durationMinutes} min):</span>
                <span className="font-mono text-[#171717]">₹{activeFare.timeCharge}</span>
              </div>
              {appliedPromo && promoDiscount > 0 && (
                <div className="flex justify-between text-[#15803D] font-semibold">
                  <span>Promo Discount ({appliedPromo}):</span>
                  <span className="font-mono">-₹{promoDiscount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#E21D2B] pt-2 border-t border-[#E5E5E5]">
                <span>Total Estimated Fare:</span>
                <span>₹{Math.max(30, activeFare.estimatedFare - promoDiscount)}</span>
              </div>

              <p className="text-[11px] text-[#737373] pt-1 leading-normal italic">
                * Estimated fare. Final fare calculated authoritatively by backend using verified route metrics.
              </p>
            </div>
          )}

          {/* Confirm Ride Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirmRide}
              disabled={!pickup || !destination || isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E21D2B] py-3 px-4 text-xs font-bold text-[#FFFFFF] shadow-lg shadow-[#E21D2B]/20 hover:bg-[#E21D2B]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isScheduled ? 'Scheduling your ride...' : 'Booking your ride...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {isScheduled ? 'Schedule Ride' : 'Confirm Ride'} —{' '}
                    {activeFare ? `₹${Math.max(30, activeFare.estimatedFare - promoDiscount)}` : 'Select Route'}
                  </span>
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
            onRouteStartCalculating={handleRouteStartCalculating}
            onRealRouteCalculated={handleRealRouteCalculated}
            onRouteCalculationError={handleRouteCalculationError}
          />
        </div>
      </div>
    </div>
  );
};
