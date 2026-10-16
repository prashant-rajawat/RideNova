import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Home,
  Navigation,
  DollarSign,
  History,
  Star,
  Settings,
  User,
  LogOut,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  MapPin,
  ArrowRight,
  Phone,
  Power,
  XCircle,
  ChevronRight,
  Check,
  Compass,
} from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';
import {
  DriverProfile,
  Vehicle,
  AvailableRideSummary,
  RideWithStops,
  RideStatus,
  VehicleType,
} from '../../types/index.ts';
import { DashboardLayout } from '../layout/DashboardLayout.tsx';

interface DriverDashboardProps {
  onNavigate: (route: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'active' | 'history' | 'vehicle' | 'profile'>('dashboard');

  // Driver data states
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [requests, setRequests] = useState<AvailableRideSummary[]>([]);
  const [activeRide, setActiveRide] = useState<RideWithStops | null>(null);
  const [history, setHistory] = useState<RideWithStops[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Vehicle form
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: 'comfort' as VehicleType,
    make: 'Toyota',
    model: 'Camry Hybrid',
    color: 'Pearl White',
    registrationNumber: 'DL-01-RN-2026',
    year: 2024,
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '+91 98765 43210',
    licenseNumber: 'DL-98202400918',
  });

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  // Fetch driver profile & active ride
  const loadDriverData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, activeRes, historyRes] = await Promise.all([
        api.getDriverProfile().catch(() => null),
        api.getDriverActiveRide().catch(() => null),
        api.getDriverHistory().catch(() => null),
      ]);

      if (profileRes?.data) {
        setProfile(profileRes.data);
        if (profileRes.data.vehicle) {
          setVehicle(profileRes.data.vehicle);
          setVehicleForm({
            vehicleType: profileRes.data.vehicle.vehicle_type,
            make: profileRes.data.vehicle.make,
            model: profileRes.data.vehicle.model,
            color: profileRes.data.vehicle.color,
            registrationNumber: profileRes.data.vehicle.registration_number,
            year: profileRes.data.vehicle.year,
          });
        }
        setProfileForm({
          name: profileRes.data.name || user?.name || '',
          phone: profileRes.data.phone || '',
          licenseNumber: profileRes.data.licenseNumber || '',
        });
      }

      if (activeRes?.data) {
        setActiveRide(activeRes.data);
      } else {
        setActiveRide(null);
      }

      if (historyRes?.data) {
        setHistory(historyRes.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load driver profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load available requests when online
  const loadRequests = useCallback(async () => {
    try {
      const res = await api.getDriverRequests();
      if (res.success && res.data) {
        setRequests(res.data);
      }
    } catch {
      // ignore transient polling errors
    }
  }, []);

  useEffect(() => {
    loadDriverData();
  }, [loadDriverData]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 6000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  // Real-time subscription to active ride
  useRideSubscription(activeRide?.id || '', () => {
    api.getDriverActiveRide().then((res) => {
      if (res.data) setActiveRide(res.data);
      else setActiveRide(null);
    });
  });

  // Toggle online/offline status
  const handleToggleOnline = async () => {
    if (!profile) return;
    setActionLoading(true);
    clearMessages();
    try {
      const nextOnline = !profile.isOnline;
      const res = await api.setDriverAvailability({
        isOnline: nextOnline,
        latitude: profile.currentLatitude || 28.6139,
        longitude: profile.currentLongitude || 77.209,
      });
      if (res.success) {
        setProfile({ ...profile, isOnline: nextOnline });
        showSuccess(nextOnline ? 'You are now ONLINE. Ready for ride requests!' : 'You are now OFFLINE.');
        if (nextOnline) loadRequests();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update availability status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Simulate GPS location ping
  const handleUpdateLocation = async () => {
    setActionLoading(true);
    clearMessages();
    try {
      // Simulate small jitter or movement around current spot
      const currentLat = profile?.currentLatitude || 28.6139;
      const currentLng = profile?.currentLongitude || 77.209;
      const jitterLat = Number((currentLat + (Math.random() - 0.5) * 0.005).toFixed(6));
      const jitterLng = Number((currentLng + (Math.random() - 0.5) * 0.005).toFixed(6));

      await api.updateDriverLocation(jitterLat, jitterLng);
      if (profile) {
        setProfile({ ...profile, currentLatitude: jitterLat, currentLongitude: jitterLng });
      }
      showSuccess(`GPS Location synced: ${jitterLat}, ${jitterLng}`);
    } catch (err: any) {
      showError(err.message || 'Failed to sync GPS location.');
    } finally {
      setActionLoading(false);
    }
  };

  // Accept a ride request
  const handleAcceptRide = async (rideId: string) => {
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.acceptRide(rideId);
      if (res.success && res.data) {
        setActiveRide(res.data);
        setActiveTab('active');
        showSuccess('Ride accepted! Proceed to pickup location.');
        loadRequests();
      }
    } catch (err: any) {
      showError(err.message || 'Ride already accepted by another driver or cancelled.');
      loadRequests();
    } finally {
      setActionLoading(false);
    }
  };

  // Advance ride status
  const handleUpdateRideStatus = async (status: RideStatus, reason?: string) => {
    if (!activeRide) return;
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.updateRideStatus(activeRide.id, status, reason);
      if (res.success && res.data) {
        if (status === 'ride_completed' || status === 'cancelled') {
          setActiveRide(null);
          showSuccess(status === 'ride_completed' ? 'Trip completed successfully! Fare recorded.' : 'Trip cancelled.');
          loadDriverData();
          setActiveTab('dashboard');
        } else {
          setActiveRide(res.data);
          showSuccess(`Trip status updated to: ${status.replace('_', ' ').toUpperCase()}`);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update trip status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.updateDriverVehicle(vehicleForm);
      if (res.success && res.data) {
        setVehicle(res.data);
        showSuccess('Vehicle fleet information saved successfully!');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save vehicle details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.updateDriverProfile(profileForm);
      if (res.success && res.data) {
        setProfile(res.data);
        showSuccess('Driver profile updated successfully!');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update driver profile.');
    } finally {
      setActionLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    {
      id: 'requests',
      label: 'Ride Requests',
      icon: Navigation,
      badge: requests.length > 0 ? requests.length : undefined,
    },
    {
      id: 'active',
      label: 'Active Ride',
      icon: Car,
      highlight: Boolean(activeRide),
    },
    { id: 'history', label: 'Ride History', icon: History, badge: history.length },
    { id: 'vehicle', label: 'Vehicle Fleet', icon: Settings },
    { id: 'profile', label: 'Driver Profile', icon: User },
  ];

  const totalEarnings = history
    .filter((r) => r.status === 'ride_completed')
    .reduce((acc, r) => acc + (r.final_fare ? Number(r.final_fare) : Number(r.estimated_fare)) * 0.85, 0);

  return (
    <DashboardLayout
      role="DRIVER"
      navItems={navItems}
      activeTab={activeTab}
      setActiveTab={(tab) => setActiveTab(tab as typeof activeTab)}
      user={user}
      logout={logout}
    >
      {/* Top Banner: Status & Quick Controls */}
      <div className="pb-6 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E21D2B]">Driver Portal</span>
            <span className="text-xs text-[#737373]">·</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                profile?.isOnline
                  ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30'
                  : 'bg-[#737373]/10 text-[#737373] border border-[#737373]/30'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${profile?.isOnline ? 'bg-[#15803D] animate-pulse' : 'bg-[#737373]'}`} />
              {profile?.isOnline ? 'ONLINE & ACCEPTING' : 'OFFLINE'}
            </span>
            <span className="text-xs text-[#737373]">·</span>
            <span className="text-xs text-[#15803D] font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Driver
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-[#171717]">
            {profile?.name || user?.name || 'Driver Console'}
          </h1>
          <p className="mt-1 text-xs text-[#737373]">
            Accept incoming ride requests, track live trip progress, and monitor earnings.
          </p>
        </div>

        {/* Online / Offline Switch & Location Ping Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleUpdateLocation}
            disabled={actionLoading}
            title="Send live GPS coordinates ping"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#FAFAFA] text-xs font-medium text-[#171717] transition-all"
          >
            <Compass className="h-3.5 w-3.5 text-[#E21D2B]" />
            <span className="hidden md:inline">Sync GPS</span>
          </button>

          <button
            onClick={handleToggleOnline}
            disabled={actionLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
              profile?.isOnline
                ? 'bg-[#15803D] hover:bg-[#15803D]/90 text-[#FFFFFF]'
                : 'bg-[#E21D2B] hover:bg-[#E21D2B]/90 text-[#FFFFFF]'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{profile?.isOnline ? 'Go Offline' : 'Go Online Now'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-xs text-[#B91C1C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={clearMessages} className="text-[#B91C1C] hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mt-4 p-3 rounded-lg bg-[#15803D]/10 border border-[#15803D]/30 text-xs text-[#15803D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={clearMessages} className="text-[#15803D] hover:opacity-75">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="mt-6 space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[11px] font-semibold uppercase text-[#737373]">Net Earnings (85%)</span>
              <p className="mt-1 text-2xl font-black text-[#15803D]">₹{totalEarnings.toFixed(2)}</p>
              <span className="text-[10px] text-[#737373] mt-1 block">Platform fee: 15%</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[11px] font-semibold uppercase text-[#737373]">Completed Rides</span>
              <p className="mt-1 text-2xl font-black text-[#171717]">{profile?.totalRides || history.length}</p>
              <span className="text-[10px] text-[#737373] mt-1 block">Verified database count</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[11px] font-semibold uppercase text-[#737373]">Driver Rating</span>
              <div className="mt-1 flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-[#B45309] text-[#B45309]" />
                <span className="text-2xl font-black text-[#171717]">{profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'}</span>
              </div>
              <span className="text-[10px] text-[#737373] mt-1 block">From passenger ratings</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[11px] font-semibold uppercase text-[#737373]">Fleet Status</span>
              <p className="mt-1 text-sm font-bold text-[#171717] truncate">
                {vehicle ? `${vehicle.make} ${vehicle.model}` : 'No Vehicle Registered'}
              </p>
              <span className="text-[10px] text-[#E21D2B] mt-1 block font-mono">
                {vehicle?.registration_number || 'Tap Vehicle tab to add'}
              </span>
            </div>
          </div>

          {/* Active Ride Banner if present */}
          {activeRide && (
            <div className="rounded-xl border-2 border-[#E21D2B] bg-[#FFF1F2] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E21D2B]/20">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E21D2B] animate-ping" />
                  <span className="text-xs font-black uppercase text-[#E21D2B]">Active Trip In Progress</span>
                  <span className="text-xs font-mono font-bold text-[#171717]">
                    {activeRide.reference_id || activeRide.id.slice(0, 8)}
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('active')}
                  className="px-3 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors self-start sm:self-auto flex items-center gap-1.5"
                >
                  <span>Open Active Ride Console</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#737373] text-[11px] block">Pickup</span>
                  <span className="font-semibold text-[#171717]">{activeRide.pickup_address}</span>
                </div>
                <div>
                  <span className="text-[#737373] text-[11px] block">Destination</span>
                  <span className="font-semibold text-[#171717]">{activeRide.destination_address}</span>
                </div>
              </div>
            </div>
          )}

          {/* Incoming Requests Feed Preview */}
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-[#E21D2B]" />
                <h3 className="text-sm font-bold text-[#171717]">Live Ride Requests</h3>
                <span className="rounded-full bg-[#E21D2B] text-white px-2 py-0.5 text-[10px] font-bold">
                  {requests.length} Available
                </span>
              </div>
              <button
                onClick={loadRequests}
                className="text-xs text-[#E21D2B] hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="py-10 text-center">
                <Car className="mx-auto h-8 w-8 text-[#737373] mb-2 opacity-50" />
                <p className="text-xs font-semibold text-[#171717]">No open ride requests right now</p>
                <p className="text-[11px] text-[#737373] mt-1 max-w-sm mx-auto">
                  {profile?.isOnline
                    ? 'Stay online. As soon as a rider books a trip in your vehicle tier, it will pop up here instantly.'
                    : 'Turn your status ONLINE above to begin receiving passenger requests in real-time.'}
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {requests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-[#E5E5E5] p-3.5 hover:border-[#E21D2B] transition-all bg-[#FFFFFF]"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                      <span className="text-[10px] font-mono font-bold text-[#E21D2B]">
                        {req.referenceId || req.id.slice(0, 8)}
                      </span>
                      <span className="text-xs font-extrabold text-[#15803D]">
                        ₹{req.estimatedDriverEarnings || (req.estimatedFare * 0.85).toFixed(0)} payout
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-start gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#15803D] mt-1.5 shrink-0" />
                        <span className="truncate text-[#171717]">{req.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E21D2B] mt-1.5 shrink-0" />
                        <span className="truncate text-[#171717]">{req.destinationAddress}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
                      <span className="text-[10px] text-[#737373]">
                        {req.distanceKm} km · {req.rideType.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleAcceptRide(req.id)}
                        disabled={actionLoading}
                        className="px-3 py-1 rounded bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Check className="h-3 w-3" />
                        <span>Accept Ride</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RIDE REQUESTS */}
      {activeTab === 'requests' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Available Passenger Requests</h2>
              <p className="text-xs text-[#737373]">Live pool of unassigned rides waiting for driver pickup.</p>
            </div>
            <button
              onClick={loadRequests}
              className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#E21D2B]" />
              <span>Refresh Pool</span>
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-[#E5E5E5] rounded-xl bg-[#FAFAFA]">
              <Car className="mx-auto h-10 w-10 text-[#737373] mb-2 opacity-40" />
              <h3 className="text-sm font-bold text-[#171717]">No open requests found</h3>
              <p className="mt-1 text-xs text-[#737373] max-w-sm mx-auto">
                All requests in your area have been assigned or passengers are currently planning routes. Keep this screen open; new trips will appear automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm hover:border-[#E21D2B] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#E21D2B]">
                        {req.referenceId || req.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E21D2B]/10 text-[#E21D2B]">
                        {req.rideType}
                      </span>
                      <span className="text-[10px] text-[#737373]">
                        Requested {new Date(req.requestedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#15803D] mt-1 shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#737373] block">Pickup Location</span>
                          <span className="font-medium text-[#171717]">{req.pickupAddress}</span>
                        </div>
                      </div>

                      {req.stops?.map((s) => (
                        <div key={s.stopOrder} className="flex items-start gap-2 pl-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#B45309] mt-1 shrink-0" />
                          <div>
                            <span className="text-[10px] text-[#737373] block">Stop #{s.stopOrder}</span>
                            <span className="text-[#171717]">{s.address}</span>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-start gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#E21D2B] mt-1 shrink-0" />
                        <div>
                          <span className="text-[10px] text-[#737373] block">Destination</span>
                          <span className="font-medium text-[#171717]">{req.destinationAddress}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-row md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-[#E5E5E5]">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-[#737373] block">Your Net Earnings (85%)</span>
                      <span className="text-xl font-black text-[#15803D]">
                        ₹{req.estimatedDriverEarnings || (req.estimatedFare * 0.85).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-[#737373] block">Total fare: ₹{req.estimatedFare}</span>
                    </div>

                    <button
                      onClick={() => handleAcceptRide(req.id)}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Accept Ride</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACTIVE RIDE LIFECYCLE CONSOLE */}
      {activeTab === 'active' && (
        <div className="mt-6 space-y-6">
          {!activeRide ? (
            <div className="py-16 text-center border border-dashed border-[#E5E5E5] rounded-xl bg-[#FAFAFA]">
              <Car className="mx-auto h-12 w-12 text-[#737373] mb-3 opacity-30" />
              <h3 className="text-base font-bold text-[#171717]">No Active Ride In Progress</h3>
              <p className="mt-1 text-xs text-[#737373] max-w-sm mx-auto">
                You are currently free. Go to the "Ride Requests" tab to accept an incoming passenger trip.
              </p>
              <button
                onClick={() => setActiveTab('requests')}
                className="mt-4 px-4 py-2 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors"
              >
                Browse Ride Requests ({requests.length})
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-md space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E5E5E5] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#15803D] animate-ping" />
                    <span className="text-xs font-black uppercase text-[#E21D2B]">ACTIVE RIDE DISPATCH</span>
                    <span className="font-mono text-xs font-bold text-[#171717]">
                      {activeRide.reference_id || activeRide.id}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-black text-[#171717]">
                    Current Status:{' '}
                    <span className="text-[#E21D2B] uppercase">
                      {activeRide.status.replace('_', ' ')}
                    </span>
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-[#737373] block">Trip Fare</span>
                  <span className="text-2xl font-black text-[#15803D]">₹{activeRide.estimated_fare}</span>
                </div>
              </div>

              {/* Lifecycle Progress Bar */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div
                  className={`p-2.5 rounded-lg border font-bold ${
                    ['accepted', 'driver_arriving', 'driver_arrived', 'ride_started', 'ride_completed'].includes(
                      activeRide.status
                    )
                      ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D]'
                      : 'border-[#E5E5E5] text-[#737373]'
                  }`}
                >
                  1. Accepted
                </div>
                <div
                  className={`p-2.5 rounded-lg border font-bold ${
                    ['driver_arriving', 'driver_arrived', 'ride_started', 'ride_completed'].includes(activeRide.status)
                      ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D]'
                      : 'border-[#E5E5E5] text-[#737373]'
                  }`}
                >
                  2. Arriving
                </div>
                <div
                  className={`p-2.5 rounded-lg border font-bold ${
                    ['driver_arrived', 'ride_started', 'ride_completed'].includes(activeRide.status)
                      ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D]'
                      : 'border-[#E5E5E5] text-[#737373]'
                  }`}
                >
                  3. At Pickup
                </div>
                <div
                  className={`p-2.5 rounded-lg border font-bold ${
                    ['ride_started', 'ride_completed'].includes(activeRide.status)
                      ? 'border-[#15803D] bg-[#15803D]/10 text-[#15803D]'
                      : 'border-[#E5E5E5] text-[#737373]'
                  }`}
                >
                  4. On Route
                </div>
              </div>

              {/* Waypoints & Routing details */}
              <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#15803D] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#737373] uppercase font-bold block">Pickup Address</span>
                    <span className="font-semibold text-[#171717] text-sm">{activeRide.pickup_address}</span>
                  </div>
                </div>

                {activeRide.stops?.map((stop) => (
                  <div key={stop.id} className="flex items-start gap-2.5 pl-3 border-l-2 border-[#B45309]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#B45309] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#737373] uppercase font-bold block">
                        Stop #{stop.stop_order}
                      </span>
                      <span className="font-medium text-[#171717]">{stop.address}</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-start gap-2.5">
                  <span className="h-3 w-3 rounded-full bg-[#E21D2B] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#737373] uppercase font-bold block">Destination Address</span>
                    <span className="font-semibold text-[#171717] text-sm">{activeRide.destination_address}</span>
                  </div>
                </div>
              </div>

              {/* Driver Action Lifecycle Buttons */}
              <div className="pt-4 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {activeRide.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateRideStatus('driver_arriving')}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>Start Driving to Pickup</span>
                    </button>
                  )}

                  {activeRide.status === 'driver_arriving' && (
                    <button
                      onClick={() => handleUpdateRideStatus('driver_arrived')}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-lg bg-[#B45309] hover:bg-[#B45309]/90 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      <span>I Have Arrived at Pickup</span>
                    </button>
                  )}

                  {activeRide.status === 'driver_arrived' && (
                    <button
                      onClick={() => handleUpdateRideStatus('ride_started')}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#15803D]/90 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <Car className="h-4 w-4" />
                      <span>Passenger Boarded · Start Trip</span>
                    </button>
                  )}

                  {activeRide.status === 'ride_started' && (
                    <button
                      onClick={() => handleUpdateRideStatus('ride_completed')}
                      disabled={actionLoading}
                      className="px-6 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#15803D]/90 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Destination Reached · Complete Ride</span>
                    </button>
                  )}
                </div>

                {/* Cancel Ride with reason */}
                <button
                  onClick={() => {
                    const reason = window.prompt('Please provide a cancellation reason:') || 'Driver operational conflict';
                    handleUpdateRideStatus('cancelled', reason);
                  }}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-lg border border-[#B91C1C]/40 text-[#B91C1C] hover:bg-[#B91C1C]/10 text-xs font-semibold transition-colors"
                >
                  Cancel Ride
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RIDE HISTORY & EARNINGS */}
      {activeTab === 'history' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Trip & Payout History</h2>
              <p className="text-xs text-[#737373]">Records of completed and handled customer rides.</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#737373]">Total Earned: </span>
              <strong className="text-sm font-black text-[#15803D]">₹{totalEarnings.toFixed(2)}</strong>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#737373]">No past trips found.</div>
          ) : (
            <div className="space-y-3">
              {history.map((ride) => (
                <div key={ride.id} className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#E21D2B]">{ride.reference_id || ride.id.slice(0, 8)}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          ride.status === 'ride_completed'
                            ? 'bg-[#15803D]/10 text-[#15803D]'
                            : 'bg-[#737373]/10 text-[#737373]'
                        }`}
                      >
                        {ride.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#15803D]">
                        +₹{((ride.final_fare ? Number(ride.final_fare) : Number(ride.estimated_fare)) * 0.85).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-[#737373] block">
                        Gross ₹{ride.final_fare || ride.estimated_fare}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="truncate text-[#171717]">
                      <strong>Pickup:</strong> {ride.pickup_address}
                    </p>
                    <p className="truncate text-[#171717]">
                      <strong>Destination:</strong> {ride.destination_address}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] text-[#737373]">
                    <span>Category: {ride.ride_type.toUpperCase()}</span>
                    <span>Distance: {ride.distance_km} km</span>
                    <span>{new Date(ride.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: VEHICLE FLEET */}
      {activeTab === 'vehicle' && (
        <div className="mt-6 max-w-2xl space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Assigned Fleet Vehicle</h2>
            <p className="text-xs text-[#737373]">
              Update the car you are using for RideNova trips. This details is shown to riders when they book.
            </p>
          </div>

          <form onSubmit={handleSaveVehicle} className="space-y-4 bg-[#FFFFFF] rounded-xl border border-[#E5E5E5] p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#171717] block mb-1">Vehicle Category</label>
                <select
                  value={vehicleForm.vehicleType}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value as VehicleType })}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                >
                  <option value="economy">Economy (Hatchback / Compact)</option>
                  <option value="comfort">Comfort (Sedan / Premium Hatch)</option>
                  <option value="premium">Premium (Luxury Sedan / SUV)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171717] block mb-1">Registration / Number Plate</label>
                <input
                  type="text"
                  value={vehicleForm.registrationNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                  placeholder="e.g. DL-01-RN-2026"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none uppercase font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171717] block mb-1">Make / Brand</label>
                <input
                  type="text"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                  placeholder="e.g. Toyota"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171717] block mb-1">Model Name</label>
                <input
                  type="text"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                  placeholder="e.g. Camry Hybrid"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171717] block mb-1">Exterior Color</label>
                <input
                  type="text"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                  placeholder="e.g. Pearl White"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#171717] block mb-1">Manufacturing Year</label>
                <input
                  type="number"
                  min="2010"
                  max="2026"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: parseInt(e.target.value, 10) || 2024 })}
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E5E5] flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all"
              >
                Save Vehicle Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: DRIVER PROFILE */}
      {activeTab === 'profile' && (
        <div className="mt-6 max-w-2xl space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Driver Verification Profile</h2>
            <p className="text-xs text-[#737373]">
              Your official credentials on the RideNova network.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 bg-[#FFFFFF] rounded-xl border border-[#E5E5E5] p-5">
            <div>
              <label className="text-xs font-semibold text-[#171717] block mb-1">Full Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#171717] block mb-1">Phone Number</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#171717] block mb-1">Driver License Number</label>
              <input
                type="text"
                value={profileForm.licenseNumber}
                onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })}
                required
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none font-mono uppercase"
              />
            </div>

            <div className="pt-3 border-t border-[#E5E5E5] flex justify-end">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};
