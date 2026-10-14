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
  Sparkles,
  Phone,
  Power,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { api, ApiError } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';
import {
  DriverProfile,
  Vehicle,
  AvailableRideSummary,
  RideWithStops,
  RideStatus,
  VehicleType,
} from '../../types/index.ts';
import { GoogleMapWrapper } from '../maps/GoogleMapWrapper.tsx';

interface DriverDashboardProps {
  onNavigate: (route: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'requests' | 'active' | 'history' | 'vehicle' | 'profile'
  >('dashboard');

  // Driver profile & vehicle state
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Available requests state
  const [requests, setRequests] = useState<AvailableRideSummary[]>([]);
  const [declinedIds, setDeclinedIds] = useState<string[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);

  // Active ride state
  const [activeRide, setActiveRide] = useState<RideWithStops | null>(null);
  const [isLoadingActiveRide, setIsLoadingActiveRide] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // History state
  const [historyRides, setHistoryRides] = useState<RideWithStops[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Vehicle form state
  const [vehicleForm, setVehicleForm] = useState<{
    vehicleType: VehicleType;
    make: string;
    model: string;
    color: string;
    registrationNumber: string;
    year: number;
  }>({
    vehicleType: 'comfort',
    make: '',
    model: '',
    color: '',
    registrationNumber: '',
    year: new Date().getFullYear(),
  });
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehicleMessage, setVehicleMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Driver profile edit form state
  const [driverLicenseForm, setDriverLicenseForm] = useState('');
  const [driverPhoneForm, setDriverPhoneForm] = useState('');
  const [isSavingDriverProfile, setIsSavingDriverProfile] = useState(false);

  // 1. Fetch Driver Profile & Active Ride
  const loadDriverData = useCallback(async () => {
    try {
      setIsLoadingProfile(true);
      const res = await api.getDriverProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setDriverLicenseForm(res.data.licenseNumber || '');
        setDriverPhoneForm(res.data.phone || '');
        if (res.data.vehicle) {
          setVehicleForm({
            vehicleType: res.data.vehicle.vehicle_type,
            make: res.data.vehicle.make,
            model: res.data.vehicle.model,
            color: res.data.vehicle.color,
            registrationNumber: res.data.vehicle.registration_number,
            year: res.data.vehicle.year,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load driver profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const loadActiveRide = useCallback(async () => {
    try {
      setIsLoadingActiveRide(true);
      const res = await api.getDriverActiveRide();
      if (res.success) {
        setActiveRide(res.data);
      }
    } catch (err) {
      console.error('Failed to load active ride:', err);
    } finally {
      setIsLoadingActiveRide(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setIsLoadingRequests(true);
      const res = await api.getDriverRequests(declinedIds);
      if (res.success && res.data) {
        setRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to load available requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [declinedIds]);

  const loadHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const res = await api.getDriverHistory();
      if (res.success && res.data) {
        setHistoryRides(res.data);
      }
    } catch (err) {
      console.error('Failed to load driver history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadDriverData();
    loadActiveRide();
  }, [loadDriverData, loadActiveRide]);

  useRideSubscription(activeRide?.id || '', loadActiveRide);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    } else if (activeTab === 'active') {
      loadActiveRide();
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadRequests, loadActiveRide, loadHistory]);

  // Periodic polling for requests if driver is online
  useEffect(() => {
    if (profile?.isOnline && activeTab === 'requests') {
      const interval = setInterval(() => {
        loadRequests();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [profile?.isOnline, activeTab, loadRequests]);

  // Periodic location updates if driver is online
  useEffect(() => {
    if (!profile?.isOnline) return;

    const interval = setInterval(async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              await api.updateDriverLocation(
                position.coords.latitude,
                position.coords.longitude
              );
            } catch (err) {
              console.error('Failed to update location:', err);
            }
          },
          (err) => console.error('Failed to get location:', err)
        );
      }
    }, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [profile?.isOnline]);

  // Handle Online/Offline Toggle
  const handleToggleOnline = async () => {
    if (!profile) return;
    const targetState = !profile.isOnline;
    setIsTogglingOnline(true);
    setProfileMessage(null);

    try {
      const res = await api.setDriverAvailability({
        isOnline: targetState,
      });

      if (res.success) {
        setProfile((prev) => (prev ? { ...prev, isOnline: targetState } : null));
        setProfileMessage({
          type: 'success',
          text: targetState
            ? 'You are now online! Incoming ride requests will appear in your queue.'
            : 'You are now offline. Dispatch has been paused.',
        });
        if (targetState) {
          loadRequests();
        }
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setProfileMessage({
        type: 'error',
        text: apiErr.message || 'Unable to update availability status',
      });
      // If error mentions vehicle, suggest going to vehicle tab
      if (apiErr.message?.toLowerCase().includes('vehicle')) {
        setTimeout(() => {
          setActiveTab('vehicle');
        }, 1500);
      }
    } finally {
      setIsTogglingOnline(false);
    }
  };

  // Handle Accepting Ride
  const handleAcceptRide = async (rideId: string) => {
    setAcceptingRideId(rideId);
    setProfileMessage(null);

    try {
      const res = await api.acceptRide(rideId);
      if (res.success && res.data) {
        setActiveRide(res.data);
        setProfileMessage({
          type: 'success',
          text: 'Ride accepted! Navigating to your active ride assignment.',
        });
        // Switch to Active Ride tab
        setActiveTab('active');
        // Refresh requests
        loadRequests();
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409) {
        setProfileMessage({
          type: 'error',
          text:
            apiErr.message ||
            'This ride has already been accepted by another driver! Refreshing list...',
        });
      } else {
        setProfileMessage({
          type: 'error',
          text: apiErr.message || 'Failed to accept ride request',
        });
      }
      loadRequests();
    } finally {
      setAcceptingRideId(null);
    }
  };

  // Handle Declining Ride (Local exclusion - does not cancel rider's request)
  const handleDeclineRide = (rideId: string) => {
    setDeclinedIds((prev) => [...prev, rideId]);
    setRequests((prev) => prev.filter((r) => r.id !== rideId));
  };

  // Handle Ride Lifecycle Status Updates
  const handleUpdateRideStatus = async (newStatus: RideStatus) => {
    if (!activeRide) return;
    setIsUpdatingStatus(true);
    setProfileMessage(null);

    try {
      const res = await api.updateRideStatus(activeRide.id, newStatus);
      if (res.success && res.data) {
        if (newStatus === 'ride_completed' || newStatus === 'cancelled') {
          setActiveRide(null);
          setProfileMessage({
            type: 'success',
            text:
              newStatus === 'ride_completed'
                ? 'Trip completed successfully! Payment calculated & recorded.'
                : 'Trip was cancelled.',
          });
          loadDriverData();
          loadHistory();
        } else {
          setActiveRide(res.data);
        }
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setProfileMessage({
        type: 'error',
        text: apiErr.message || 'Failed to update ride status',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Saving Vehicle
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingVehicle(true);
    setVehicleMessage(null);

    try {
      const res = await api.updateDriverVehicle(vehicleForm);
      if (res.success && res.data) {
        setVehicleMessage({
          type: 'success',
          text: 'Vehicle details successfully saved and registered to your driver profile!',
        });
        loadDriverData();
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setVehicleMessage({
        type: 'error',
        text: apiErr.message || 'Failed to save vehicle details',
      });
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // Handle Saving Driver Profile Info
  const handleSaveDriverProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDriverProfile(true);
    setProfileMessage(null);

    try {
      const res = await api.updateDriverProfile({
        phone: driverPhoneForm.trim() || undefined,
        licenseNumber: driverLicenseForm.trim() || undefined,
      });
      if (res.success) {
        setProfile(res.data);
        setProfileMessage({
          type: 'success',
          text: 'Driver profile updated successfully.',
        });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      setProfileMessage({
        type: 'error',
        text: apiErr.message || 'Failed to update driver profile',
      });
    } finally {
      setIsSavingDriverProfile(false);
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
    { id: 'history', label: 'Ride History', icon: History },
    { id: 'vehicle', label: 'Vehicle Fleet', icon: Settings },
    { id: 'profile', label: 'Driver Profile', icon: User },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          <div className="pb-4 border-b border-[#1E334D]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00C2FF] to-[#0EA5E9] text-[#07111F] font-black text-sm">
                RN
              </div>
              <span className="text-lg font-extrabold text-[#E5F2FF]">RideNova</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#8FA6BF]">Fleet Status</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wider ${
                  profile?.isOnline
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                    : 'bg-[#8FA6BF]/15 text-[#8FA6BF] border border-[#8FA6BF]/30'
                }`}
              >
                {profile?.isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0EA5E9]/15 text-[#00C2FF] border border-[#00C2FF]/30 font-semibold'
                      : 'text-[#8FA6BF] hover:bg-[#1E334D]/40 hover:text-[#E5F2FF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="rounded-full bg-[#00C2FF] px-1.5 py-0.2 text-[10px] font-bold text-[#07111F]">
                      {item.badge}
                    </span>
                  )}
                  {item.highlight && (
                    <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[#1E334D] space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-[#1E334D] border border-[#00C2FF]/30 flex items-center justify-center text-xs font-bold text-[#00C2FF]">
              {user?.name?.charAt(0) || 'D'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#E5F2FF] truncate">{user?.name}</p>
              <p className="text-[11px] text-[#8FA6BF] truncate">{profile?.licenseNumber || 'Driver Partner'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#1E334D] bg-[#07111F] py-2 text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-6 shadow-sm flex flex-col">
        {/* Global Alert Notification */}
        {profileMessage && (
          <div
            className={`mb-5 flex items-center justify-between rounded-lg p-3 text-xs border ${
              profileMessage.type === 'success'
                ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
            }`}
          >
            <div className="flex items-center gap-2">
              {profileMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{profileMessage.text}</span>
            </div>
            <button
              onClick={() => setProfileMessage(null)}
              className="text-xs underline ml-2 opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header & Availability Switch */}
        <div className="pb-6 border-b border-[#1E334D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#00C2FF]">
                Step 4 · Fleet Dispatch Engine
              </span>
              <span className="text-xs text-[#8FA6BF]">·</span>
              <span className="text-xs text-[#22C55E] flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
                Driver Role Verified
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-[#E5F2FF]">
              Welcome back, {user?.name || 'Driver Partner'}
            </h1>
            <p className="mt-1 text-xs text-[#8FA6BF]">
              Manage ride assignments, toggle fleet availability, and update vehicle records.
            </p>
          </div>

          {/* Quick Online/Offline Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleOnline}
              disabled={isTogglingOnline || isLoadingProfile}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                profile?.isOnline
                  ? 'bg-[#22C55E] text-[#07111F] hover:bg-[#22C55E]/90 shadow-md shadow-[#22C55E]/20'
                  : 'bg-[#1E334D] text-[#E5F2FF] hover:bg-[#1E334D]/80 border border-[#8FA6BF]/30'
              } disabled:opacity-50`}
            >
              <Power className={`h-4 w-4 ${isTogglingOnline ? 'animate-spin' : ''}`} />
              <span>{profile?.isOnline ? 'Go Offline' : 'Go Online'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && (
          <div className="mt-6 space-y-6">
            {/* Active Ride Banner if present */}
            {activeRide && (
              <div className="rounded-xl border border-[#00C2FF]/40 bg-gradient-to-r from-[#00C2FF]/10 via-[#0F1C2E] to-[#07111F] p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#00C2FF]/20 text-[#00C2FF] border border-[#00C2FF]/30">
                        ACTIVE RIDE IN PROGRESS
                      </span>
                      <span className="text-xs font-mono text-[#8FA6BF]">
                        {activeRide.reference_id || activeRide.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#E5F2FF]">
                      {activeRide.pickup_address} → {activeRide.destination_address}
                    </p>
                    <p className="text-xs text-[#8FA6BF] mt-0.5">
                      Status:{' '}
                      <strong className="text-[#00C2FF] uppercase">{activeRide.status}</strong> · Fare:{' '}
                      <strong className="text-[#22C55E]">₹{activeRide.estimated_fare}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('active')}
                    className="self-start sm:self-auto flex items-center gap-2 rounded-lg bg-[#00C2FF] px-4 py-2 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all shadow"
                  >
                    <span>Manage Trip</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">Availability</span>
                <p className="mt-1 text-lg font-bold text-[#E5F2FF]">
                  {profile?.isOnline ? (
                    <span className="text-[#22C55E] flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse"></span>
                      Online
                    </span>
                  ) : (
                    <span className="text-[#8FA6BF]">Offline</span>
                  )}
                </p>
                <span className="mt-2 text-[11px] text-[#8FA6BF] block">
                  {profile?.isOnline ? 'Ready for dispatches' : 'Paused in queue'}
                </span>
              </div>

              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">Registered Fleet Vehicle</span>
                <p className="mt-1 text-sm font-bold text-[#0EA5E9] truncate">
                  {profile?.vehicle
                    ? `${profile.vehicle.make} ${profile.vehicle.model}`
                    : 'Not Configured'}
                </p>
                <span className="mt-2 text-[11px] text-[#8FA6BF] block font-mono">
                  {profile?.vehicle
                    ? `${profile.vehicle.vehicle_type.toUpperCase()} · ${profile.vehicle.registration_number}`
                    : 'Click vehicle tab to setup'}
                </span>
              </div>

              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">Driver Rating</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                  <p className="text-lg font-bold text-[#E5F2FF]">
                    {profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'}
                  </p>
                </div>
                <span className="mt-2 text-[11px] text-[#8FA6BF] block">Top Partner Standing</span>
              </div>

              <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4">
                <span className="text-xs text-[#8FA6BF]">Total Completed Rides</span>
                <p className="mt-1 text-lg font-bold text-[#E5F2FF]">
                  {profile?.totalRides ?? 0}
                </p>
                <span className="mt-2 text-[11px] text-[#22C55E] block font-mono">
                  Database Verified
                </span>
              </div>
            </div>

            {/* Quick Actions & Requests Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-[#1E334D] bg-[#07111F] p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
                  <h3 className="text-sm font-bold text-[#E5F2FF] flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-[#00C2FF]" />
                    <span>Incoming Ride Requests</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className="text-xs text-[#00C2FF] hover:underline flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="mt-4">
                  {profile?.isOnline ? (
                    requests.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-[#8FA6BF]">
                          <span>{requests.length} rides currently awaiting driver</span>
                          <span className="text-[#22C55E]">Live Queue</span>
                        </div>
                        {requests.slice(0, 2).map((req) => (
                          <div
                            key={req.id}
                            className="rounded-lg border border-[#1E334D] bg-[#0F1C2E] p-3 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#E5F2FF] truncate max-w-[180px]">
                                {req.pickupAddress}
                              </span>
                              <span className="font-bold text-[#22C55E]">
                                ₹{req.estimatedDriverEarnings} (Est.)
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8FA6BF] mt-1 truncate">
                              To: {req.destinationAddress}
                            </p>
                            <div className="mt-2.5 flex justify-end gap-2">
                              <button
                                onClick={() => handleAcceptRide(req.id)}
                                disabled={Boolean(acceptingRideId)}
                                className="px-3 py-1 rounded bg-[#00C2FF] text-[#07111F] font-bold text-[11px] hover:bg-[#00C2FF]/90"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-[#8FA6BF]">
                        <p>No new ride requests right now.</p>
                        <p className="mt-1 text-[11px]">Rider bookings appear here in real-time.</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 text-xs text-[#8FA6BF]">
                      <Power className="mx-auto h-6 w-6 text-[#8FA6BF] mb-2" />
                      <p>You are currently offline.</p>
                      <button
                        onClick={handleToggleOnline}
                        className="mt-3 text-xs text-[#00C2FF] hover:underline"
                      >
                        Switch Online to view incoming requests
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#1E334D] bg-[#07111F] p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
                  <h3 className="text-sm font-bold text-[#E5F2FF] flex items-center gap-2">
                    <Car className="h-4 w-4 text-[#0EA5E9]" />
                    <span>Fleet Vehicle Status</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('vehicle')}
                    className="text-xs text-[#0EA5E9] hover:underline"
                  >
                    Edit Vehicle
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-xs">
                  {profile?.vehicle ? (
                    <>
                      <div className="flex justify-between py-1.5 border-b border-[#1E334D]/60">
                        <span className="text-[#8FA6BF]">Model</span>
                        <span className="font-semibold text-[#E5F2FF]">
                          {profile.vehicle.make} {profile.vehicle.model} ({profile.vehicle.year})
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1E334D]/60">
                        <span className="text-[#8FA6BF]">Category</span>
                        <span className="font-semibold uppercase text-[#0EA5E9]">
                          {profile.vehicle.vehicle_type}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-[#1E334D]/60">
                        <span className="text-[#8FA6BF]">Registration No.</span>
                        <span className="font-mono font-semibold text-[#E5F2FF]">
                          {profile.vehicle.registration_number}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-[#8FA6BF]">Color</span>
                        <span className="font-semibold text-[#E5F2FF]">{profile.vehicle.color}</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-[#8FA6BF]">No vehicle configured yet.</p>
                      <button
                        onClick={() => setActiveTab('vehicle')}
                        className="mt-3 rounded-lg bg-[#00C2FF] px-4 py-2 text-xs font-bold text-[#07111F]"
                      >
                        Register Vehicle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AVAILABLE RIDE REQUESTS */}
        {activeTab === 'requests' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#E5F2FF]">Available Ride Requests</h2>
                <p className="text-xs text-[#8FA6BF]">
                  Rider bookings waiting for driver assignment. Review route details before accepting.
                </p>
              </div>
              <button
                onClick={loadRequests}
                disabled={isLoadingRequests}
                className="flex items-center gap-1.5 rounded-lg border border-[#1E334D] bg-[#07111F] px-3 py-1.5 text-xs text-[#8FA6BF] hover:text-[#E5F2FF] transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRequests ? 'animate-spin' : ''}`} />
                <span>Refresh Requests</span>
              </button>
            </div>

            {!profile?.isOnline ? (
              <div className="text-center py-16 border border-dashed border-[#1E334D] rounded-xl bg-[#07111F]/50">
                <Power className="mx-auto h-8 w-8 text-[#8FA6BF] mb-3" />
                <h3 className="text-base font-bold text-[#E5F2FF]">You are Currently Offline</h3>
                <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
                  To view live rider bookings and receive nearby trip requests, toggle your driver status to online.
                </p>
                <button
                  onClick={handleToggleOnline}
                  className="mt-5 rounded-lg bg-[#22C55E] px-4 py-2.5 text-xs font-bold text-[#07111F] hover:bg-[#22C55E]/90"
                >
                  Go Online Now
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#1E334D] rounded-xl bg-[#07111F]/50">
                <Navigation className="mx-auto h-8 w-8 text-[#00C2FF] mb-3 opacity-60" />
                <h3 className="text-base font-bold text-[#E5F2FF]">No Ride Requests Waiting</h3>
                <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
                  When riders create booking requests matching your fleet tier, they will instantly appear here.
                </p>
                <button
                  onClick={loadRequests}
                  className="mt-4 text-xs text-[#00C2FF] hover:underline"
                >
                  Check again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#1E334D] bg-[#07111F] p-5 shadow-sm hover:border-[#00C2FF]/40 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E334D] gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-[#00C2FF]/15 text-[#00C2FF] border border-[#00C2FF]/30">
                          {req.rideType}
                        </span>
                        <span className="text-xs font-mono text-[#8FA6BF]">
                          {req.referenceId || req.id.slice(0, 8)}
                        </span>
                        {req.stops.length > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                            {req.stops.length} STOPS
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-[#8FA6BF]">Estimated Earnings</span>
                        <p className="text-base font-extrabold text-[#22C55E]">
                          ₹{req.estimatedDriverEarnings}{' '}
                          <span className="text-xs font-normal text-[#8FA6BF]">
                            (Total Fare: ₹{req.estimatedFare})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="py-4 space-y-3">
                      {/* Pickup */}
                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          P
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-[#8FA6BF]">
                            Pickup Location
                          </span>
                          <p className="text-xs font-medium text-[#E5F2FF]">{req.pickupAddress}</p>
                        </div>
                      </div>

                      {/* Stops */}
                      {req.stops.map((stop) => (
                        <div key={stop.stopOrder} className="flex items-start gap-3 pl-1">
                          <div className="h-4 w-4 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">
                            S{stop.stopOrder}
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold uppercase text-[#F59E0B]">
                              Intermediate Stop {stop.stopOrder}
                            </span>
                            <p className="text-xs text-[#E5F2FF]">{stop.address}</p>
                          </div>
                        </div>
                      ))}

                      {/* Destination */}
                      <div className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          D
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-[#8FA6BF]">
                            Destination
                          </span>
                          <p className="text-xs font-medium text-[#E5F2FF]">{req.destinationAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1E334D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs text-[#8FA6BF]">
                        <span>Distance: <strong className="text-[#E5F2FF]">{req.distanceKm} km</strong></span>
                        <span>Duration: <strong className="text-[#E5F2FF]">{req.estimatedDurationMinutes} mins</strong></span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleDeclineRide(req.id)}
                          className="px-3.5 py-2 rounded-lg border border-[#1E334D] text-xs font-semibold text-[#8FA6BF] hover:text-[#EF4444] hover:border-[#EF4444]/40 transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAcceptRide(req.id)}
                          disabled={acceptingRideId === req.id}
                          className="flex items-center gap-2 rounded-lg bg-[#00C2FF] px-5 py-2 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all disabled:opacity-50 shadow-md shadow-[#00C2FF]/20"
                        >
                          {acceptingRideId === req.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Assigning...</span>
                            </>
                          ) : (
                            <span>Accept Ride</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE RIDE IN PROGRESS */}
        {activeTab === 'active' && (
          <div className="mt-6 space-y-6">
            {!activeRide ? (
              <div className="text-center py-16 border border-dashed border-[#1E334D] rounded-xl bg-[#07111F]/50">
                <Car className="mx-auto h-8 w-8 text-[#8FA6BF] mb-3" />
                <h3 className="text-base font-bold text-[#E5F2FF]">No Active Ride in Progress</h3>
                <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
                  When you accept a ride request from the queue, live navigation and passenger status controls will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('requests')}
                  className="mt-5 rounded-lg bg-[#00C2FF] px-4 py-2.5 text-xs font-bold text-[#07111F]"
                >
                  Browse Available Requests
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Status Progression Bar */}
                <div className="rounded-xl border border-[#1E334D] bg-[#07111F] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E334D]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#00C2FF]">
                          {activeRide.reference_id || activeRide.id}
                        </span>
                        <span className="text-xs text-[#8FA6BF]">·</span>
                        <span className="text-xs font-bold uppercase text-[#22C55E]">
                          Status: {activeRide.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-[#E5F2FF]">
                        Trip In Progress
                      </h2>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-[#8FA6BF]">Trip Fare</span>
                      <p className="text-xl font-black text-[#22C55E]">
                        ₹{activeRide.estimated_fare}
                      </p>
                    </div>
                  </div>

                  {/* Lifecycle Controls */}
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-[#8FA6BF]">
                      {activeRide.status === 'accepted' && (
                        <span>Next step: Drive to passenger pickup location</span>
                      )}
                      {activeRide.status === 'driver_arriving' && (
                        <span>Next step: Notify passenger upon arrival</span>
                      )}
                      {activeRide.status === 'driver_arrived' && (
                        <span>Next step: Board passenger and begin trip</span>
                      )}
                      {activeRide.status === 'ride_started' && (
                        <span>Next step: Drive to destination & complete trip</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      {activeRide.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateRideStatus('driver_arriving')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-[#00C2FF] px-4 py-2 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90"
                        >
                          Mark Arriving at Pickup
                        </button>
                      )}

                      {activeRide.status === 'driver_arriving' && (
                        <button
                          onClick={() => handleUpdateRideStatus('driver_arrived')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-[#00C2FF] px-4 py-2 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90"
                        >
                          Mark Arrived at Pickup
                        </button>
                      )}

                      {activeRide.status === 'driver_arrived' && (
                        <button
                          onClick={() => handleUpdateRideStatus('ride_started')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-[#22C55E] px-4 py-2 text-xs font-bold text-[#07111F] hover:bg-[#22C55E]/90"
                        >
                          Start Trip
                        </button>
                      )}

                      {activeRide.status === 'ride_started' && (
                        <button
                          onClick={() => handleUpdateRideStatus('ride_completed')}
                          disabled={isUpdatingStatus}
                          className="rounded-lg bg-[#22C55E] px-4 py-2 text-xs font-bold text-[#07111F] hover:bg-[#22C55E]/90 shadow-md shadow-[#22C55E]/20"
                        >
                          Complete Trip
                        </button>
                      )}

                      <button
                        onClick={() => handleUpdateRideStatus('cancelled')}
                        disabled={isUpdatingStatus}
                        className="rounded-lg border border-[#EF4444]/40 px-3 py-2 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10"
                      >
                        Cancel Ride
                      </button>
                    </div>
                  </div>
                </div>

                {/* Map Route Viewer for Active Ride */}
                <div className="rounded-xl border border-[#1E334D] overflow-hidden bg-[#07111F]">
                  <div className="p-3 border-b border-[#1E334D] bg-[#0F1C2E] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#E5F2FF]">Live Route Navigation</span>
                    <span className="text-[#8FA6BF]">
                      {activeRide.distance_km} km · {activeRide.estimated_duration_minutes} mins
                    </span>
                  </div>
                  <div className="h-[380px] w-full">
                    <GoogleMapWrapper
                      pickup={{
                        address: activeRide.pickup_address,
                        latitude: activeRide.pickup_latitude,
                        longitude: activeRide.pickup_longitude,
                      }}
                      destination={{
                        address: activeRide.destination_address,
                        latitude: activeRide.destination_latitude,
                        longitude: activeRide.destination_longitude,
                      }}
                      stops={(activeRide.stops || []).map((s) => ({
                        address: s.address,
                        latitude: s.latitude,
                        longitude: s.longitude,
                        stopOrder: s.stop_order,
                      }))}
                      distanceKm={Number(activeRide.distance_km)}
                      durationMinutes={Number(activeRide.estimated_duration_minutes)}
                      isRealRoute={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VEHICLE FLEET MANAGEMENT */}
        {activeTab === 'vehicle' && (
          <div className="mt-6 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-[#E5F2FF]">Fleet Vehicle Registration</h2>
              <p className="text-xs text-[#8FA6BF]">
                A verified vehicle is required to switch online and accept passenger bookings.
              </p>
            </div>

            {vehicleMessage && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  vehicleMessage.type === 'success'
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]'
                    : 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]'
                }`}
              >
                {vehicleMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="space-y-4">
              {/* Category Selection Cards */}
              <div>
                <label className="block text-xs font-medium text-[#8FA6BF] mb-2">
                  Vehicle Category Tier
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['economy', 'comfort', 'premium'] as VehicleType[]).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setVehicleForm((prev) => ({ ...prev, vehicleType: type }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        vehicleForm.vehicleType === type
                          ? 'border-[#00C2FF] bg-[#00C2FF]/10 text-[#E5F2FF]'
                          : 'border-[#1E334D] bg-[#07111F] text-[#8FA6BF] hover:border-[#8FA6BF]/40'
                      }`}
                    >
                      <span className="font-bold uppercase text-xs block text-[#00C2FF]">
                        {type}
                      </span>
                      <span className="text-[10px] text-[#8FA6BF]">
                        {type === 'economy' && 'Standard Hatchback / Compact'}
                        {type === 'comfort' && 'Spacious Sedan / Compact SUV'}
                        {type === 'premium' && 'Luxury Executive / Full SUV'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                    Vehicle Make
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hyundai, Toyota"
                    value={vehicleForm.make}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                    className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] focus:border-[#00C2FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Creta, Innova, Dzire"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] focus:border-[#00C2FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#8FA6BF] mb-1">Color</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. White, Silver, Black"
                    value={vehicleForm.color}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                    className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] focus:border-[#00C2FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="GJ-01-AB-1234"
                    value={vehicleForm.registrationNumber}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] uppercase font-mono focus:border-[#00C2FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                    Year (1990 - 2050)
                  </label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={2050}
                    value={vehicleForm.year}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, year: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] focus:border-[#00C2FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E334D] flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingVehicle}
                  className="rounded-lg bg-[#00C2FF] px-5 py-2.5 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all disabled:opacity-50"
                >
                  {isSavingVehicle ? 'Saving Vehicle...' : 'Save Fleet Vehicle'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: RIDE HISTORY */}
        {activeTab === 'history' && (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#E5F2FF]">Completed Trips History</h2>
                <p className="text-xs text-[#8FA6BF]">
                  All completed and processed trips linked to your driver partner account.
                </p>
              </div>
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="flex items-center gap-1.5 rounded-lg border border-[#1E334D] bg-[#07111F] px-3 py-1.5 text-xs text-[#8FA6BF] hover:text-[#E5F2FF]"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {historyRides.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#1E334D] rounded-xl bg-[#07111F]/50">
                <History className="mx-auto h-8 w-8 text-[#8FA6BF] mb-3" />
                <h3 className="text-base font-bold text-[#E5F2FF]">No Rides Completed Yet</h3>
                <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
                  When you accept and finish rides, your trip earnings and historical records will be listed here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="rounded-xl border border-[#1E334D] bg-[#07111F] p-4 text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E334D]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#00C2FF]">
                          {ride.reference_id || ride.id.slice(0, 8)}
                        </span>
                        <span className="text-[#8FA6BF]">·</span>
                        <span
                          className={`uppercase font-bold text-[10px] px-2 py-0.5 rounded ${
                            ride.status === 'ride_completed'
                              ? 'bg-[#22C55E]/15 text-[#22C55E]'
                              : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}
                        >
                          {ride.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="font-bold text-[#22C55E]">₹{ride.estimated_fare}</span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <p className="text-[#E5F2FF]">
                        <strong>From:</strong> {ride.pickup_address}
                      </p>
                      <p className="text-[#E5F2FF]">
                        <strong>To:</strong> {ride.destination_address}
                      </p>
                      <p className="text-[#8FA6BF] text-[11px]">
                        Distance: {ride.distance_km} km · Duration: {ride.estimated_duration_minutes} mins
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DRIVER PROFILE */}
        {activeTab === 'profile' && (
          <div className="mt-6 space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-[#E5F2FF]">Driver Partner Profile</h2>
              <p className="text-xs text-[#8FA6BF]">
                Manage contact info and driver license verification records.
              </p>
            </div>

            <form onSubmit={handleSaveDriverProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#8FA6BF] mb-1">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="w-full rounded-lg border border-[#1E334D] bg-[#07111F]/50 px-3.5 py-2.5 text-xs text-[#8FA6BF] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                  Email (Clerk Auth Verified)
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-lg border border-[#1E334D] bg-[#07111F]/50 px-3.5 py-2.5 text-xs text-[#8FA6BF] cursor-not-allowed font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={driverPhoneForm}
                  onChange={(e) => setDriverPhoneForm(e.target.value)}
                  className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] focus:border-[#00C2FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
                  Driving License Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="GJ-06-2022-987654"
                  value={driverLicenseForm}
                  onChange={(e) => setDriverLicenseForm(e.target.value)}
                  className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] uppercase font-mono focus:border-[#00C2FF] focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#1E334D] flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingDriverProfile}
                  className="rounded-lg bg-[#00C2FF] px-5 py-2.5 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all disabled:opacity-50"
                >
                  {isSavingDriverProfile ? 'Updating Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
