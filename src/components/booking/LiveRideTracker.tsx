import React, { useState, useEffect } from 'react';
import {
  Car,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Phone,
  X,
  Sparkles,
} from 'lucide-react';
import { RideWithStops } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';

interface LiveRideTrackerProps {
  ride: RideWithStops;
  onNavigate: (route: string) => void;
  onReset: () => void;
  onRideUpdated: (ride: RideWithStops) => void;
}

export const LiveRideTracker: React.FC<LiveRideTrackerProps> = ({
  ride,
  onNavigate,
  onReset,
  onRideUpdated,
}) => {
  const [currentRide, setCurrentRide] = useState<RideWithStops>(ride);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDriverPopup, setShowDriverPopup] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes in seconds

  // Fetch latest authoritative ride state
  const refreshRide = async () => {
    try {
      const res = await api.getRide(currentRide.id);
      if (res.success && res.data) {
        const prevStatus = currentRide.status;
        setCurrentRide(res.data);
        onRideUpdated(res.data);

        // If newly accepted, trigger popup
        if (prevStatus === 'requested' && res.data.status === 'accepted') {
          setShowDriverPopup(true);
        }
      }
    } catch {
      // ignore network blips during polling
    }
  };

  // Real-time subscription
  useRideSubscription(currentRide.id, refreshRide);

  // Poll fallback every 4 seconds if searching or active
  useEffect(() => {
    if (['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(currentRide.status)) {
      const timer = setInterval(refreshRide, 4000);
      return () => clearInterval(timer);
    }
  }, [currentRide.id, currentRide.status]);

  // 5-minute countdown calculation based on server expires_at or requested_at
  useEffect(() => {
    if (currentRide.status !== 'requested') return;

    const deadline = currentRide.expires_at
      ? new Date(currentRide.expires_at).getTime()
      : new Date(currentRide.requested_at).getTime() + 5 * 60000;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && currentRide.status === 'requested') {
        setCurrentRide((prev) => ({ ...prev, status: 'cancelled' }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentRide.expires_at, currentRide.requested_at, currentRide.status]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle Fare Incentive Boost (+100, +500, +1000)
  const handleBoostIncentive = async (amount: number) => {
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await api.boostRideIncentive(currentRide.id, amount);
      if (res.success && res.data) {
        setCurrentRide(res.data);
        onRideUpdated(res.data);
        setSuccessMessage(`Driver incentive increased by +₹${amount}! Drivers notified.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update incentive.');
    } finally {
      setLoadingAction(false);
    }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');

  // Handle Ride Cancellation
  const handleCancel = async () => {
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await api.cancelRide(currentRide.id, cancelReason);
      if (res.success && res.data) {
        setCurrentRide(res.data);
        onRideUpdated(res.data);
        setSuccessMessage('Ride cancelled successfully.');
        setShowCancelModal(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel ride.');
    } finally {
      setLoadingAction(false);
    }
  };

  const isSearching = currentRide.status === 'requested' && timeLeft > 0;
  const isExpired = currentRide.status === 'requested' && timeLeft === 0;
  const isAccepted = ['accepted', 'driver_arriving', 'driver_arrived'].includes(currentRide.status);
  const isInProgress = currentRide.status === 'ride_started';
  const isCompleted = currentRide.status === 'ride_completed';
  const isCancelled = currentRide.status === 'cancelled';

  return (
    <div className="min-h-[85vh] max-w-3xl mx-auto px-4 py-6 animate-fade-in space-y-6">
      {/* Driver Accepted Pop-up Modal */}
      {showDriverPopup && currentRide.driver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-[#E21D2B] relative space-y-4">
            <button
              onClick={() => setShowDriverPopup(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#FFF1F2] text-[#E21D2B] flex items-center justify-center hover:bg-[#E21D2B] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center space-y-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#FFF1F2] text-[#E21D2B] border border-[#E21D2B]/30">
                🎉 Driver Confirmed!
              </span>
              <h2 className="text-xl font-extrabold text-[#171717]">Your Driver Is On The Way</h2>
              <p className="text-xs text-[#737373]">Your assigned driver has accepted your trip request.</p>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <div className="h-14 w-14 rounded-full bg-[#E21D2B]/10 border border-[#E21D2B]/30 flex items-center justify-center text-[#E21D2B] text-lg font-black shrink-0">
                {currentRide.driver.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#171717]">{currentRide.driver.name}</h3>
                <div className="flex items-center gap-2 text-xs text-[#737373] mt-0.5">
                  <span className="text-amber-600 font-bold">★ {currentRide.driver.rating || 4.9}</span>
                  <span>·</span>
                  <span>{currentRide.driver.total_rides || 142} trips</span>
                </div>
              </div>
            </div>

            {currentRide.driver.vehicle && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-3 rounded-lg bg-[#FFF1F2]/50 border border-[#E21D2B]/20">
                  <span className="text-[#737373]">Vehicle:</span>
                  <span className="font-bold text-[#171717]">
                    {currentRide.driver.vehicle.color} {currentRide.driver.vehicle.make} {currentRide.driver.vehicle.model} ({currentRide.driver.vehicle.year})
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[#737373]">Registration No:</span>
                  <span className="font-mono font-bold text-[#171717]">{currentRide.driver.vehicle.registration_number}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDriverPopup(false)}
              className="w-full py-3 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-md"
            >
              Got It, View Trip Details
            </button>
          </div>
        </div>
      )}

      {/* Top Status Banner */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E21D2B]/10 text-[#E21D2B] border border-[#E21D2B]/30">
                {currentRide.reference_id || `RN-${currentRide.id.slice(0, 8).toUpperCase()}`}
              </span>
              <span className="text-xs text-[#737373]">·</span>
              <span className="text-xs font-semibold uppercase text-[#737373]">{currentRide.ride_type}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#171717]">
              {isSearching && 'Finding Your Nearest Driver'}
              {isAccepted && 'Driver Assigned & En Route'}
              {isInProgress && 'Trip In Progress'}
              {isCompleted && 'Trip Completed Successfully'}
              {isExpired && 'Request Expired'}
              {isCancelled && 'Ride Cancelled'}
            </h1>
          </div>

          {/* 5-minute Countdown Badge during searching */}
          {isSearching && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFF1F2] border border-[#E21D2B]/30 text-[#E21D2B]">
              <Clock className="h-4 w-4 animate-pulse" />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider">Expires In</span>
                <span className="font-mono text-base font-extrabold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15803D]/10 border border-[#15803D]/30 text-[#15803D]">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-bold">Driver Confirmed</span>
            </div>
          )}
        </div>

        {/* Success or Error feedback banners */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-[#15803D]/10 border border-[#15803D]/30 text-[#15803D] text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-[#B91C1C] text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* OTP Box for Rider when accepted */}
        {isAccepted && currentRide.otp_code && (
          <div className="p-4 rounded-xl bg-[#FFF1F2] border-2 border-dashed border-[#E21D2B] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E21D2B]">Trip Verification Code (OTP)</span>
              <p className="text-xs text-[#737373]">Share this 4-digit code with your driver when they arrive to start your trip.</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white border border-[#E21D2B]/30 shadow-xs font-mono text-2xl font-black text-[#E21D2B] tracking-widest">
              {currentRide.otp_code}
            </div>
          </div>
        )}

        {/* Assigned Driver Details Card */}
        {currentRide.driver && (
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#737373]">Assigned Driver Partner</span>
              <span className="text-xs font-bold text-[#15803D]">Verified & Approved</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#E21D2B]/10 text-[#E21D2B] font-bold text-base flex items-center justify-center">
                  {currentRide.driver.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#171717]">{currentRide.driver.name}</h4>
                  <p className="text-xs text-[#737373]">
                    {currentRide.driver.vehicle
                      ? `${currentRide.driver.vehicle.color} ${currentRide.driver.vehicle.make} ${currentRide.driver.vehicle.model} · ${currentRide.driver.vehicle.registration_number}`
                      : 'Commercial Vehicle Partner'}
                  </p>
                </div>
              </div>
              {currentRide.driver.phone && (
                <a
                  href={`tel:${currentRide.driver.phone}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E5E5E5] text-xs font-bold text-[#171717] hover:border-[#E21D2B] transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-[#E21D2B]" />
                  <span>Call Driver</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Urgency Fare Boosters (+100, +500, +1000) when searching */}
        {isSearching && (
          <div className="p-4 rounded-xl border border-[#E21D2B]/30 bg-[#FFF1F2]/60 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#E21D2B]" />
              <div>
                <h3 className="text-xs font-bold text-[#171717]">Boost Your Ride Urgency</h3>
                <p className="text-[11px] text-[#737373]">Offer drivers an extra incentive to accept your request faster.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => handleBoostIncentive(100)}
                className="py-2.5 px-2 rounded-xl bg-white border border-[#E21D2B]/30 hover:bg-[#E21D2B] hover:text-white text-xs font-bold text-[#171717] transition-all shadow-xs flex flex-col items-center justify-center"
              >
                <span>+ ₹100</span>
                <span className="text-[9px] font-normal opacity-80">Standard Boost</span>
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => handleBoostIncentive(500)}
                className="py-2.5 px-2 rounded-xl bg-white border border-[#E21D2B]/30 hover:bg-[#E21D2B] hover:text-white text-xs font-bold text-[#171717] transition-all shadow-xs flex flex-col items-center justify-center"
              >
                <span>+ ₹500</span>
                <span className="text-[9px] font-normal opacity-80">Priority Boost</span>
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => handleBoostIncentive(1000)}
                className="py-2.5 px-2 rounded-xl bg-white border border-[#E21D2B]/30 hover:bg-[#E21D2B] hover:text-white text-xs font-bold text-[#171717] transition-all shadow-xs flex flex-col items-center justify-center"
              >
                <span>+ ₹1,000</span>
                <span className="text-[9px] font-normal opacity-80">High-Priority</span>
              </button>
            </div>
          </div>
        )}

        {/* Route Details Card */}
        <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-xs space-y-3">
          <div className="flex items-start justify-between pb-3 border-b border-[#E5E5E5]">
            <div>
              <span className="text-[#737373] block text-[11px]">Database Record UUID</span>
              <span className="font-mono text-[#171717] break-all">{currentRide.id}</span>
            </div>
            <div className="text-right">
              <span className="text-[#737373] block text-[11px]">Total Estimated Fare</span>
              <span className="font-extrabold text-[#E21D2B] text-base">₹{currentRide.estimated_fare}</span>
              {currentRide.incentive_amount ? (
                <span className="block text-[10px] text-[#15803D] font-bold">Includes +₹{currentRide.incentive_amount} driver boost</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#15803D]" />
              <span className="text-[#737373]">Pickup:</span>
              <span className="text-[#171717] font-medium">{currentRide.pickup_address}</span>
            </div>

            {currentRide.stops?.map((s) => (
              <div key={s.id} className="flex items-center gap-2 pl-2">
                <span className="h-2 w-2 rounded-full bg-[#B45309]" />
                <span className="text-[#737373]">Stop {s.stop_order}:</span>
                <span className="text-[#171717]">{s.address}</span>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E21D2B]" />
              <span className="text-[#737373]">Destination:</span>
              <span className="text-[#171717] font-medium">{currentRide.destination_address}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {isSearching && (
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => setShowCancelModal(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Cancel Ride Request</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => onNavigate('rider')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={onReset}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:border-[#E21D2B] cursor-pointer"
            >
              Book Another Ride
            </button>
          </div>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5E5] relative space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#B91C1C]/10 flex items-center justify-center text-[#B91C1C]">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#171717]">Cancel Ride Request</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="p-1.5 rounded-lg text-[#737373] hover:bg-[#FAFAFA] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[#737373]">
                  Please select a reason for cancelling this trip request:
                </p>
                <div className="space-y-2">
                  {[
                    'Change of plans',
                    'Driver taking too long / ETA too far',
                    'Booked by mistake',
                    'Wrong pickup location',
                    'Other reason',
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        cancelReason === reason
                          ? 'border-[#B91C1C] bg-[#FFF1F2]/40 text-[#171717]'
                          : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#737373]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        value={reason}
                        checked={cancelReason === reason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="text-[#B91C1C] focus:ring-[#B91C1C]"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={loadingAction}
                  className="px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] cursor-pointer"
                >
                  Keep Ride
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loadingAction}
                  className="px-5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loadingAction && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirm Cancellation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
