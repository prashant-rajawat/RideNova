import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Car,
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  Calendar,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { RideWithStops, RideStatus } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';

interface TripDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string | null;
  onNavigate?: (route: string) => void;
  onCancelRide?: (rideId: string) => void;
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  isOpen,
  onClose,
  rideId,
  onNavigate,
  onCancelRide,
}) => {
  const [ride, setRide] = useState<RideWithStops | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Change of plans');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelMessage, setCancelMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch the latest authoritative trip details from backend
  const fetchTripDetails = useCallback(async () => {
    if (!rideId) return;
    try {
      const res = await api.getRide(rideId);
      if (res.success && res.data) {
        setRide(res.data);
        setError(null);
      } else {
        setError('Unable to load trip record.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch ride details from server.');
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  // Sync on modal open or ride ID change
  useEffect(() => {
    if (isOpen && rideId) {
      setLoading(true);
      setError(null);
      setCancelMessage(null);
      setShowCancelConfirm(false);
      fetchTripDetails();
    }
  }, [isOpen, rideId, fetchTripDetails]);

  // Subscribe to real-time status updates for this ride
  useRideSubscription(rideId || '', fetchTripDetails);

  if (!isOpen) return null;

  // Lifecycle steps in order
  const lifecycleSteps: { key: string; label: string; description: string }[] = [
    { key: 'requested', label: 'Requested', description: 'Matching with nearby drivers' },
    { key: 'accepted', label: 'Accepted', description: 'Driver confirmed & dispatched' },
    { key: 'driver_arriving', label: 'En Route', description: 'Driver heading to pickup location' },
    { key: 'driver_arrived', label: 'At Pickup', description: 'Driver arrived at pickup point' },
    { key: 'otp_verified', label: 'OTP Verified', description: 'Passenger code verified by driver' },
    { key: 'ride_started', label: 'Trip Started', description: 'Journey in progress to destination' },
    { key: 'ride_completed', label: 'Completed', description: 'Trip finished successfully' },
  ];

  // Map backend status to active step index
  const getStepIndex = (status: RideStatus, otpVerified?: boolean): number => {
    if (status === 'requested') return 0;
    if (status === 'accepted') return 1;
    if (status === 'driver_arriving') return 2;
    if (status === 'driver_arrived') return otpVerified ? 4 : 3;
    if (status === 'ride_started') return 5;
    if (status === 'ride_completed') return 6;
    if (status === 'cancelled') return -1;
    return 0;
  };

  const currentStepIdx = ride ? getStepIndex(ride.status, ride.otp_verified) : 0;
  const isCancellable =
    ride && ['requested', 'accepted', 'driver_arriving', 'driver_arrived'].includes(ride.status);

  // Handle cancellation within modal
  const handleConfirmCancel = async () => {
    if (!ride) return;
    setIsCancelling(true);
    setCancelMessage(null);
    try {
      const res = await api.cancelRide(ride.id, cancelReason);
      if (res.success && res.data) {
        setRide(res.data);
        setCancelMessage({ type: 'success', text: 'Ride request cancelled successfully.' });
        setShowCancelConfirm(false);
        if (onCancelRide) onCancelRide(ride.id);
      }
    } catch (err: any) {
      setCancelMessage({ type: 'error', text: err.message || 'Failed to cancel ride.' });
    } finally {
      setIsCancelling(false);
    }
  };

  // Driver ETA display
  const getDriverEtaText = (): string => {
    if (!ride?.driver) return 'Not available yet';
    if (ride.status === 'driver_arrived') return 'Driver is at your pickup location now';
    if (ride.status === 'driver_arriving') return 'Driver en route · ETA ~3-7 mins';
    if (ride.status === 'accepted') return 'Driver assigned · En route shortly';
    if (ride.status === 'ride_started') return 'Trip in progress';
    if (ride.status === 'ride_completed') return 'Trip completed';
    return 'Not available yet';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E5E5E5] overflow-hidden my-auto animate-scale-in">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#737373]">
                RideNova Telemetry
              </span>
              <span className="h-1 w-1 rounded-full bg-[#737373]" />
              <span className="font-mono text-xs font-bold text-[#E21D2B]">
                {ride?.reference_id || (ride?.id ? `RN-${ride.id.slice(0, 8).toUpperCase()}` : '...')}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#171717]">
              Complete Active Trip Details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-[#E5E5E5] bg-white text-[#737373] hover:text-[#171717] hover:border-[#171717] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {cancelMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b ${
              cancelMessage.type === 'success'
                ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/20'
                : 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/20'
            }`}
          >
            {cancelMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{cancelMessage.text}</span>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 text-[#E21D2B] animate-spin mx-auto" />
              <p className="text-xs font-bold text-[#171717]">Loading live trip telemetry...</p>
              <p className="text-[11px] text-[#737373]">Connecting to PostgreSQL datastore</p>
            </div>
          ) : error || !ride ? (
            <div className="py-12 text-center space-y-3 p-4 rounded-xl bg-[#B91C1C]/5 border border-[#B91C1C]/20">
              <AlertCircle className="h-8 w-8 text-[#B91C1C] mx-auto" />
              <h3 className="text-sm font-bold text-[#171717]">Unable to Load Trip Record</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">{error || 'Trip record not found.'}</p>
              <button
                type="button"
                onClick={fetchTripDetails}
                className="px-4 py-2 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622]"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* 1. STATUS BADGE & TIMELINE */}
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#737373] block">Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
                        ride.status === 'ride_completed'
                          ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30'
                          : ride.status === 'cancelled'
                          ? 'bg-[#B91C1C]/10 text-[#B91C1C] border border-[#B91C1C]/30'
                          : ride.status === 'ride_started'
                          ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30 animate-pulse'
                          : 'bg-[#E21D2B]/10 text-[#E21D2B] border border-[#E21D2B]/30'
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      <span>{ride.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#737373] block">Ride Tier</span>
                    <span className="text-xs font-bold text-[#171717] uppercase">{ride.ride_type} Fleet</span>
                  </div>
                </div>

                {/* Vertical / Responsive Status Timeline */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#737373] block">
                    Trip Progress Lifecycle
                  </span>
                  <div className="space-y-2.5">
                    {lifecycleSteps.map((step, idx) => {
                      const isDone = currentStepIdx > idx;
                      const isCurrent = currentStepIdx === idx && ride.status !== 'cancelled';
                      const isCancelled = ride.status === 'cancelled';

                      return (
                        <div key={step.key} className="flex items-start gap-3 text-xs">
                          <div className="relative flex flex-col items-center">
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] transition-colors shrink-0 ${
                                isDone
                                  ? 'bg-[#15803D] text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-[#E21D2B] text-white ring-4 ring-[#E21D2B]/20 animate-pulse'
                                  : 'bg-[#E5E5E5] text-[#737373]'
                              }`}
                            >
                              {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : idx + 1}
                            </div>
                            {idx < lifecycleSteps.length - 1 && (
                              <div
                                className={`w-0.5 h-4 mt-0.5 ${
                                  isDone ? 'bg-[#15803D]' : 'bg-[#E5E5E5]'
                                }`}
                              />
                            )}
                          </div>
                          <div className="pt-0.5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <p
                                className={`font-bold ${
                                  isCurrent
                                    ? 'text-[#E21D2B]'
                                    : isDone
                                    ? 'text-[#171717]'
                                    : 'text-[#A3A3A3]'
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="text-[11px] text-[#737373]">{step.description}</p>
                            </div>
                            {isCurrent && !isCancelled && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#E21D2B]/10 text-[#E21D2B] self-start sm:self-auto">
                                Active State
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. PASSENGER VERIFICATION OTP CARD */}
              {['accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(ride.status) && (
                <div
                  className={`p-4 rounded-2xl border-2 transition-all space-y-2.5 ${
                    ride.otp_verified
                      ? 'border-[#15803D]/40 bg-[#15803D]/5'
                      : 'border-[#E21D2B] bg-[#FFF1F2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className={`h-5 w-5 ${ride.otp_verified ? 'text-[#15803D]' : 'text-[#E21D2B]'}`}
                      />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                        Trip Verification Code (OTP)
                      </h4>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        ride.otp_verified
                          ? 'bg-[#15803D] text-white'
                          : 'bg-[#E21D2B] text-white animate-pulse'
                      }`}
                    >
                      {ride.otp_verified ? 'Verified & Onboard' : 'Awaiting Driver Verification'}
                    </span>
                  </div>

                  {!ride.otp_verified && ride.otp_code ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-[#E21D2B]/30">
                      <div>
                        <span className="text-[11px] text-[#737373] block">
                          Provide this secret code to your assigned driver upon boarding:
                        </span>
                        <p className="text-[11px] font-medium text-[#171717]">
                          The driver must verify this code to securely start your trip.
                        </p>
                      </div>
                      <div className="px-5 py-2.5 rounded-xl bg-[#FFF1F2] border-2 border-[#E21D2B] text-center font-mono text-3xl font-black text-[#E21D2B] tracking-[0.25em] shadow-xs shrink-0">
                        {ride.otp_code}
                      </div>
                    </div>
                  ) : ride.otp_verified ? (
                    <div className="p-3 bg-white rounded-xl border border-[#15803D]/30 flex items-center gap-2 text-xs font-semibold text-[#15803D]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>OTP successfully verified! Driver and passenger are safely onboard.</span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#737373]">OTP will be generated once driver confirms assignment.</p>
                  )}
                </div>
              )}

              {/* 3. ASSIGNED DRIVER & VEHICLE DETAILS */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E5E5] space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                    Assigned Driver & Vehicle
                  </span>
                  <span className="text-xs text-[#737373]">{getDriverEtaText()}</span>
                </div>

                {ride.driver ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {ride.driver.profile_image_url ? (
                          <img
                            src={ride.driver.profile_image_url}
                            alt={ride.driver.name}
                            className="h-12 w-12 rounded-full object-cover border border-[#E5E5E5]"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-[#E21D2B]/10 text-[#E21D2B] font-bold text-base flex items-center justify-center shrink-0">
                            {ride.driver.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#171717]">{ride.driver.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                              Verified Chauffeur
                            </span>
                          </div>
                          <p className="text-xs text-[#737373]">
                            ★ {ride.driver.rating ? Number(ride.driver.rating).toFixed(1) : '5.0'} ·{' '}
                            {ride.driver.total_rides || 0} rides completed
                          </p>
                        </div>
                      </div>

                      {ride.driver.phone && (
                        <a
                          href={`tel:${ride.driver.phone}`}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-xs font-bold text-[#171717] hover:border-[#E21D2B] hover:text-[#E21D2B] transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>Call Driver ({ride.driver.phone})</span>
                        </a>
                      )}
                    </div>

                    {/* Vehicle details */}
                    <div className="p-3 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#737373]">Vehicle Make & Model:</span>
                        <span className="font-bold text-[#171717]">
                          {ride.driver.vehicle
                            ? `${ride.driver.vehicle.color} ${ride.driver.vehicle.make} ${ride.driver.vehicle.model}`
                            : 'Vehicle details not available yet'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#737373]">Vehicle Fleet Class:</span>
                        <span className="font-bold uppercase text-[#171717]">
                          {ride.driver.vehicle?.vehicle_type || ride.ride_type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#737373]">Registration License Number:</span>
                        <span className="font-mono font-black text-xs px-2.5 py-1 bg-white border border-[#171717] rounded text-[#171717] shadow-2xs">
                          {ride.driver.vehicle?.registration_number || 'Not available yet'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-center space-y-1.5">
                    <Car className="h-6 w-6 text-[#737373] mx-auto animate-pulse" />
                    <p className="text-xs font-bold text-[#171717]">Driver not assigned yet</p>
                    <p className="text-[11px] text-[#737373]">
                      Our automated dispatch engine is finding the closest verified driver in your pickup zone.
                    </p>
                  </div>
                )}
              </div>

              {/* 4. ROUTE, WAYPOINTS & DISTANCE */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E5E5] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                    Route & Waypoints
                  </span>
                  <div className="flex items-center gap-2 text-xs text-[#737373]">
                    <span>{ride.distance_km ? `${ride.distance_km} km` : '4.8 km'}</span>
                    <span>·</span>
                    <span>~{ride.estimated_duration_minutes || 15} mins</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#15803D] mt-1 shrink-0 ring-2 ring-[#15803D]/20" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737373] block">Pickup Spot</span>
                      <p className="font-semibold text-[#171717]">{ride.pickup_address}</p>
                    </div>
                  </div>

                  {ride.stops &&
                    ride.stops.map((stop) => (
                      <div key={stop.id} className="flex items-start gap-2.5 pl-0.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#B45309] mt-1 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#737373] block">
                            Stop {stop.stop_order}
                          </span>
                          <p className="text-[#171717]">{stop.address}</p>
                        </div>
                      </div>
                    ))}

                  <div className="flex items-start gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#E21D2B] mt-1 shrink-0 ring-2 ring-[#E21D2B]/20" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#737373] block">Destination</span>
                      <p className="font-semibold text-[#171717]">{ride.destination_address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. FARE SPECIFICATION & BREAKDOWN */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E5E5] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                    Fare & Billing Breakdown
                  </span>
                  <div className="text-right">
                    <span className="text-[10px] text-[#737373] uppercase font-bold block">Total Fare</span>
                    <span className="text-base font-extrabold text-[#E21D2B]">
                      ₹{ride.final_fare || ride.estimated_fare}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#737373]">
                    <span>Base Tier Estimate:</span>
                    <span className="font-semibold text-[#171717]">
                      ₹{Math.max(0, Number(ride.estimated_fare) - (Number(ride.incentive_amount) || 0))}
                    </span>
                  </div>

                  {ride.incentive_amount && Number(ride.incentive_amount) > 0 ? (
                    <div className="flex justify-between text-[#15803D]">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Driver Urgency Incentive Boost:</span>
                      </span>
                      <span className="font-bold">+₹{ride.incentive_amount}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between text-[#737373] pt-1 border-t border-[#E5E5E5]">
                    <span>Platform Commission & GST:</span>
                    <span className="text-[#171717]">Included (18% GST)</span>
                  </div>
                </div>
              </div>

              {/* CANCELLATION DIALOG OVERLAY */}
              {showCancelConfirm && (
                <div className="p-4 rounded-2xl border-2 border-[#B91C1C] bg-[#FFF1F2]/60 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-[#B91C1C]" />
                    <h4 className="text-xs font-bold text-[#171717]">Confirm Ride Cancellation</h4>
                  </div>
                  <p className="text-xs text-[#737373]">
                    Are you sure you want to cancel this trip? Please select a cancellation reason:
                  </p>

                  <div className="space-y-1.5">
                    {[
                      'Change of plans',
                      'Driver taking too long / ETA too far',
                      'Booked by mistake',
                      'Wrong pickup location',
                      'Other reason',
                    ].map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          cancelReason === reason
                            ? 'border-[#B91C1C] bg-white font-bold text-[#171717]'
                            : 'border-[#E5E5E5] bg-white text-[#737373]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modalCancelReason"
                          value={reason}
                          checked={cancelReason === reason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="text-[#B91C1C] focus:ring-[#B91C1C]"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA]"
                    >
                      Keep Ride
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleConfirmCancel}
                      className="px-4 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] shadow-sm flex items-center gap-1.5"
                    >
                      {isCancelling && <Loader2 className="h-3 w-3 animate-spin" />}
                      <span>Confirm Cancellation</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODAL ACTIONS FOOTER */}
        <div className="p-4 border-t border-[#E5E5E5] bg-[#FAFAFA] flex flex-col sm:flex-row items-center justify-between gap-3">
          {ride && isCancellable && !showCancelConfirm ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#FFF1F2] text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel Ride Request
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onNavigate && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate('book-ride');
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:border-[#E21D2B] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#E21D2B]" />
                <span>Live Map View</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
