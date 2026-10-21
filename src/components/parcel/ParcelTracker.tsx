import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Eye,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { api } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';

interface ParcelTrackerProps {
  parcel: any;
  onNavigate: (route: string) => void;
  onReset: () => void;
  onParcelUpdated: (updated: any) => void;
}

export const ParcelTracker: React.FC<ParcelTrackerProps> = ({
  parcel,
  onNavigate,
  onReset,
  onParcelUpdated,
}) => {
  const [currentParcel, setCurrentParcel] = useState(parcel);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');

  // Refresh parcel status from server
  const fetchParcelStatus = useCallback(async () => {
    if (!currentParcel?.id) return;
    try {
      const res = await api.getParcel(currentParcel.id);
      if (res.success && res.data) {
        setCurrentParcel(res.data);
        onParcelUpdated(res.data);
      }
    } catch {
      // ignore
    }
  }, [currentParcel?.id, onParcelUpdated]);

  // Subscribe / poll live updates
  useEffect(() => {
    const interval = setInterval(fetchParcelStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchParcelStatus]);

  const handleCancelParcel = async () => {
    setLoadingAction(true);
    setErrorMessage(null);
    try {
      const res = await api.cancelParcel(currentParcel.id, cancelReason);
      if (res.success && res.data) {
        setCurrentParcel(res.data);
        onParcelUpdated(res.data);
        setSuccessMessage('Parcel delivery cancelled successfully.');
        setShowCancelModal(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel parcel delivery.');
    } finally {
      setLoadingAction(false);
    }
  };

  const isSearching = currentParcel.status === 'requested';
  const isAccepted = currentParcel.status === 'accepted';
  const isPickedUp = currentParcel.status === 'picked_up' || currentParcel.status === 'in_transit';
  const isDelivered = currentParcel.status === 'delivered';
  const isCancelled = currentParcel.status === 'cancelled';

  return (
    <div className="min-h-[85vh] max-w-3xl mx-auto px-4 py-8 animate-fade-in space-y-6">
      {/* Top Status Banner */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E21D2B]/10 text-[#E21D2B] border border-[#E21D2B]/30">
                {currentParcel.reference_id}
              </span>
              <span className="text-xs text-[#737373]">·</span>
              <span className="text-xs font-semibold uppercase text-[#737373]">{currentParcel.parcel_category}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#171717]">
              {isSearching && 'Searching for Nearby Courier Partner...'}
              {isAccepted && 'Courier Assigned & Heading to Pickup'}
              {isPickedUp && 'Parcel Picked Up & In Transit'}
              {isDelivered && 'Parcel Delivered Successfully! 🎉'}
              {isCancelled && 'Parcel Delivery Cancelled'}
            </h1>
          </div>
          <button
            onClick={fetchParcelStatus}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Status</span>
          </button>
        </div>

        {/* Success / Error Messages */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-[#15803D]/10 border border-[#15803D]/30 text-xs text-[#15803D] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#E21D2B]/30 text-xs text-[#E21D2B] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* OTP Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pickup OTP */}
          <div className={`p-4 rounded-xl border ${currentParcel.pickup_otp_verified ? 'bg-[#15803D]/5 border-[#15803D]/30' : 'bg-[#FFF1F2] border-[#E21D2B]/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#737373]">Pickup Handover OTP</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${currentParcel.pickup_otp_verified ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#E21D2B]/10 text-[#E21D2B]'}`}>
                {currentParcel.pickup_otp_verified ? 'Verified & Collected' : 'Pending Handover'}
              </span>
            </div>
            <p className="font-mono text-2xl font-black text-[#171717] mt-2 tracking-widest">
              {currentParcel.pickup_otp || '----'}
            </p>
            <p className="text-[11px] text-[#737373] mt-1">Provide this code to the courier when they collect the package.</p>
          </div>

          {/* Delivery OTP */}
          <div className={`p-4 rounded-xl border ${currentParcel.delivery_otp_verified ? 'bg-[#15803D]/5 border-[#15803D]/30' : 'bg-[#FAFAFA] border-[#E5E5E5]'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#737373]">Recipient Delivery PIN</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${currentParcel.delivery_otp_verified ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#737373]/10 text-[#737373]'}`}>
                {currentParcel.delivery_otp_verified ? 'Delivered' : 'Secured'}
              </span>
            </div>
            <p className="font-mono text-2xl font-black text-[#171717] mt-2 tracking-widest">
              {currentParcel.delivery_otp || '----'}
            </p>
            <p className="text-[11px] text-[#737373] mt-1">Share this PIN with recipient so they can receive the package.</p>
          </div>
        </div>

        {/* Assigned Driver Details if available */}
        {currentParcel.driver && (
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#E21D2B]/10 text-[#E21D2B] font-extrabold flex items-center justify-center">
                {currentParcel.driver.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-[#171717]">{currentParcel.driver.name}</p>
                <p className="text-[11px] text-[#737373]">Assigned Courier Partner · ★ {currentParcel.driver.rating || 4.9}</p>
              </div>
            </div>
            <a
              href={`tel:${currentParcel.driver.phone || '+919876543210'}`}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-xs font-bold text-[#171717] hover:border-[#E21D2B] flex items-center gap-1.5"
            >
              <Phone className="h-3.5 w-3.5 text-[#E21D2B]" />
              <span>Call Courier</span>
            </a>
          </div>
        )}

        {/* Route Addresses */}
        <div className="space-y-2 bg-white p-4 rounded-xl border border-[#E5E5E5]">
          <div className="flex items-start gap-2.5 text-xs">
            <MapPin className="h-4 w-4 text-[#15803D] mt-0.5 shrink-0" />
            <div>
              <span className="text-[#737373] font-semibold">Pickup:</span>
              <p className="text-[#171717] font-medium">{currentParcel.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 text-xs">
            <Navigation className="h-4 w-4 text-[#E21D2B] mt-0.5 shrink-0" />
            <div>
              <span className="text-[#737373] font-semibold">Destination:</span>
              <p className="text-[#171717] font-bold">{currentParcel.delivery_address}</p>
              <p className="text-[11px] text-[#737373] mt-0.5">Recipient: {currentParcel.recipient_name} ({currentParcel.recipient_phone})</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          {isSearching && (
            <button
              type="button"
              disabled={loadingAction}
              onClick={() => setShowCancelModal(true)}
              className="px-5 py-2.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer"
            >
              Cancel Request
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => onNavigate('rider')}
              className="px-5 py-2.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors cursor-pointer"
            >
              Return to Dashboard
            </button>
            <button
              type="button"
              onClick={onReset}
              className="px-5 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:border-[#E21D2B] cursor-pointer"
            >
              Send Another Parcel
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5E5] relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-bold text-[#171717]">Cancel Parcel Delivery</h3>
              <button onClick={() => setShowCancelModal(false)} className="p-1 rounded text-[#737373]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-[#737373]">Please select a reason for cancellation:</p>
            <div className="space-y-2">
              {['Change of plans', 'Wrong address entered', 'Found alternative delivery', 'Other'].map((reason) => (
                <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E5E5] text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="parcelCancelReason"
                    value={reason}
                    checked={cancelReason === reason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="text-[#B91C1C]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-xl border border-[#E5E5E5] text-xs font-semibold"
              >
                Keep Delivery
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleCancelParcel}
                className="px-5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] flex items-center gap-1"
              >
                {loadingAction && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
