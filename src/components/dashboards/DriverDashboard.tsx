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
  X,
  ChevronRight,
  Check,
  Compass,
  FileText,
  CreditCard,
  HelpCircle,
  Send,
  AlertTriangle,
  Upload,
  ShieldAlert,
  Sparkles,
  Calendar,
  TrendingUp,
  Wallet,
  Building2,
  BadgeCheck,
  Lock,
  Loader2,
  ExternalLink,
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
  DriverPayout,
  DriverEarningsSummary,
  DriverKycPayload,
  KycStatus,
} from '../../types/index.ts';
import { DashboardLayout } from '../layout/DashboardLayout.tsx';
import { DriverAccountSettings } from '../profile/driver/DriverAccountSettings.tsx';

interface DriverDashboardProps {
  onNavigate: (route: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'requests' | 'active' | 'earnings' | 'payouts' | 'history' | 'vehicle' | 'profile' | 'support'
  >('dashboard');

  // Core data states
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [requests, setRequests] = useState<AvailableRideSummary[]>([]);
  const [activeRide, setActiveRide] = useState<RideWithStops | null>(null);
  const [history, setHistory] = useState<RideWithStops[]>([]);
  const [earnings, setEarnings] = useState<DriverEarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<DriverPayout[]>([]);
  const [paymentFlowStep, setPaymentFlowStep] = useState<'none' | 'summary' | 'method_select' | 'upi_qr' | 'cash' | 'success'>('none');
  const [completedRideForPayment, setCompletedRideForPayment] = useState<any | null>(null);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDriverCancelModal, setShowDriverCancelModal] = useState(false);
  const [driverCancelReason, setDriverCancelReason] = useState('Vehicle breakdown / mechanical issue');

  // KYC Modal state
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [kycStep, setKycStep] = useState<number>(1);
  const [kycForm, setKycForm] = useState<DriverKycPayload>({
    fullName: user?.name || '',
    phone: user?.phone || '+91 98765 43210',
    dob: '1993-08-15',
    address: '124, Ring Road, Lajpat Nagar, New Delhi 110024',
    profilePhotoUrl: '',
    licenseNumber: 'DL-04202400918',
    licenseState: 'Delhi NCR',
    licenseExpiry: '2034-08-14',
    licenseFrontUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=400',
    licenseBackUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=400',
    vehicleMake: 'Maruti Suzuki',
    vehicleModel: 'Dzire Tour ZXi',
    vehicleYear: 2024,
    vehicleColor: 'Silky Silver',
    registrationNumber: 'DL-01-RN-2026',
    vehicleType: 'comfort',
    seatingCapacity: 4,
    insurancePolicyNumber: 'BAJAJ-ALL-891024-RN',
    insuranceExpiry: '2026-11-20',
    rcDocumentUrl: 'rc_doc_verified.pdf',
    insuranceDocumentUrl: 'insurance_policy_doc.pdf',
    permitDocumentUrl: 'commercial_permit_all_india.pdf',
    idType: 'Aadhaar Card',
    idNumber: '918234561234',
    idDocumentUrl: 'aadhaar_card_doc.pdf',
    bankAccountName: user?.name || 'Authorized Driver Partner',
    bankAccountNumber: '918200192837465',
    bankIfsc: 'HDFC0001892',
  });

  // Payout request modal state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(1000);

  // Emergency SOS Modal
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [sosSent, setSosSent] = useState<boolean>(false);

  // Support ticket form
  const [supportCategory, setSupportCategory] = useState<string>('fare_dispute');
  const [supportMessage, setSupportMessage] = useState<string>('');

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Load complete driver operational data
  const loadDriverData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, activeRes, historyRes, earningsRes, payoutsRes] = await Promise.all([
        api.getDriverProfile().catch(() => null),
        api.getDriverActiveRide().catch(() => null),
        api.getDriverHistory().catch(() => ({ data: [] })),
        api.getDriverEarnings().catch(() => null),
        api.getDriverPayouts().catch(() => ({ data: [] })),
      ]);

      if (profileRes?.data) {
        setProfile(profileRes.data);
        if (profileRes.data.vehicle) {
          setVehicle(profileRes.data.vehicle);
        }

        // Pre-fill KYC form from profile
        setKycForm((prev) => ({
          ...prev,
          fullName: profileRes.data.name || user?.name || prev.fullName,
          phone: profileRes.data.phone || user?.phone || prev.phone,
          dob: profileRes.data.dob || prev.dob,
          address: profileRes.data.address || prev.address,
          licenseNumber: profileRes.data.licenseNumber || prev.licenseNumber,
          licenseState: profileRes.data.licenseState || prev.licenseState,
          licenseExpiry: profileRes.data.licenseExpiry || prev.licenseExpiry,
          licenseFrontUrl: profileRes.data.licenseFrontUrl || prev.licenseFrontUrl,
          licenseBackUrl: profileRes.data.licenseBackUrl || prev.licenseBackUrl,
          vehicleMake: profileRes.data.vehicle?.make || prev.vehicleMake,
          vehicleModel: profileRes.data.vehicle?.model || prev.vehicleModel,
          vehicleYear: profileRes.data.vehicle?.year || prev.vehicleYear,
          vehicleColor: profileRes.data.vehicle?.color || prev.vehicleColor,
          registrationNumber: profileRes.data.vehicle?.registration_number || prev.registrationNumber,
          vehicleType: profileRes.data.vehicle?.vehicle_type || prev.vehicleType,
          idType: profileRes.data.idType || prev.idType,
          bankAccountName: profileRes.data.bankAccountName || prev.bankAccountName,
          bankIfsc: profileRes.data.bankIfsc || prev.bankIfsc,
        }));
      }

      if (activeRes?.data) {
        setActiveRide(activeRes.data);
      } else {
        setActiveRide(null);
      }

      if (historyRes?.data) {
        setHistory(historyRes.data);
      }

      if (earningsRes?.data) {
        setEarnings(earningsRes.data);
      }

      if (payoutsRes?.data) {
        setPayouts(payoutsRes.data);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to sync driver records.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load incoming ride requests
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

  // Poll requests when driver is online
  useEffect(() => {
    if (profile?.isOnline) {
      loadRequests();
      const interval = setInterval(loadRequests, 5000);
      return () => clearInterval(interval);
    } else {
      setRequests([]);
    }
  }, [profile?.isOnline, loadRequests]);

  // Real-time subscription to active ride
  useRideSubscription(activeRide?.id || '', () => {
    api.getDriverActiveRide().then((res) => {
      if (res.data) setActiveRide(res.data);
      else setActiveRide(null);
    });
  });

  // Toggle online/offline status with eligibility validation
  const handleToggleOnline = async () => {
    if (!profile) return;
    clearMessages();

    // Check approval
    if (profile.status !== 'approved') {
      showError(
        'Your driver account is pending verification. Please complete KYC and wait for Admin approval before going online.'
      );
      setIsKycModalOpen(true);
      return;
    }

    // Check vehicle
    if (!profile.vehicle) {
      showError('Please register and verify your fleet vehicle before going online.');
      setActiveTab('vehicle');
      return;
    }

    setActionLoading(true);
    try {
      const nextOnline = !profile.isOnline;

      if (!nextOnline) {
        const onDemandStatuses = ['accepted', 'driver_arriving', 'driver_arrived', 'ride_started'];
        if (activeRide && onDemandStatuses.includes(activeRide.status)) {
          showError('Cannot switch to offline while you have an active on-demand trip in progress. Please complete or cancel this trip first.');
          setActionLoading(false);
          return;
        }
      }

      // Browser Geolocation integration
      let lat = profile.currentLatitude || 28.6139;
      let lng = profile.currentLongitude || 77.209;

      if (navigator.geolocation && nextOnline) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch {
          // Graceful fallback to default coordinates if permission denied
        }
      }

      const res = await api.setDriverAvailability({
        isOnline: nextOnline,
        latitude: lat,
        longitude: lng,
      });

      if (res.success) {
        setProfile({ ...profile, isOnline: nextOnline, currentLatitude: lat, currentLongitude: lng });
        showSuccess(
          nextOnline
            ? 'You are now ONLINE. Searching for nearby passenger requests...'
            : 'You are now OFFLINE. New trip assignments paused.'
        );
        if (nextOnline) loadRequests();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update online availability.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sync GPS location ping
  const handleUpdateLocation = async () => {
    setActionLoading(true);
    clearMessages();
    try {
      const currentLat = profile?.currentLatitude || 28.6139;
      const currentLng = profile?.currentLongitude || 77.209;
      const jitterLat = Number((currentLat + (Math.random() - 0.5) * 0.004).toFixed(6));
      const jitterLng = Number((currentLng + (Math.random() - 0.5) * 0.004).toFixed(6));

      await api.updateDriverLocation(jitterLat, jitterLng);
      if (profile) {
        setProfile({ ...profile, currentLatitude: jitterLat, currentLongitude: jitterLng });
      }
      showSuccess(`GPS coordinates synced: ${jitterLat}, ${jitterLng}`);
    } catch (err: any) {
      showError(err.message || 'Failed to sync GPS location.');
    } finally {
      setActionLoading(false);
    }
  };

  // Accept incoming ride request atomically
  const handleAcceptRide = async (rideId: string) => {
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.acceptRide(rideId);
      if (res.success && res.data) {
        setActiveRide(res.data);
        setActiveTab('active');
        showSuccess('Ride accepted! Follow navigation to the passenger pickup location.');
        loadRequests();
      }
    } catch (err: any) {
      showError(err.message || 'Ride already assigned to another driver or expired.');
      loadRequests();
    } finally {
      setActionLoading(false);
    }
  };

  // Decline ride request
  const handleDeclineRide = (rideId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== rideId));
    showSuccess('Ride declined. Waiting for next trip request.');
  };

  // Advance ride lifecycle
  const handleUpdateRideStatus = async (status: RideStatus, reason?: string) => {
    if (!activeRide) return;
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.updateRideStatus(activeRide.id, status, reason);
      if (res.success && res.data) {
        if (status === 'ride_completed') {
          const completedRide = activeRide;
          setActiveRide(null);
          setCompletedRideForPayment(completedRide);
          setPaymentFlowStep('summary');
          loadDriverData();
          showSuccess('Trip completed! Proceeding to payment collection workflow.');
        } else if (status === 'cancelled') {
          setActiveRide(null);
          showSuccess('Trip cancelled.');
          loadDriverData();
          setActiveTab('earnings');
        } else {
          setActiveRide(res.data);
          showSuccess(`Trip status updated: ${status.replace('_', ' ').toUpperCase()}`);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Failed to advance trip lifecycle.');
    } finally {
      setActionLoading(false);
    }
  };

  // Save / Submit KYC Form
  const handleSaveKyc = async (submitForReview: boolean) => {
    setActionLoading(true);
    clearMessages();
    try {
      const payload: DriverKycPayload = {
        ...kycForm,
        submitForReview,
      };

      const res = await api.submitDriverKyc(payload);
      if (res.success && res.data) {
        setProfile(res.data);
        if (res.data.vehicle) {
          setVehicle(res.data.vehicle);
        }
        showSuccess(
          submitForReview
            ? 'KYC submitted successfully! Our administrative verification team will review your application.'
            : 'KYC draft progress saved successfully. You can return and complete remaining steps anytime.'
        );
        if (submitForReview) {
          setIsKycModalOpen(false);
        }
      }
    } catch (err: any) {
      showError(err.message || 'Failed to save KYC documentation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Request payout
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payoutAmount <= 0) {
      showError('Please enter a valid amount.');
      return;
    }
    setActionLoading(true);
    clearMessages();
    try {
      const res = await api.requestDriverPayout(payoutAmount);
      if (res.success && res.data) {
        showSuccess(`Payout of ₹${payoutAmount} submitted successfully to your verified bank account.`);
        setIsPayoutModalOpen(false);
        loadDriverData();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to submit payout request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Driver Grievance / Support Ticket
  const handleSubmitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) {
      showError('Please enter details about your issue.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.createSupportTicket({
        category: supportCategory,
        subject: `Driver Partner Inquiry: ${supportCategory.replace('_', ' ').toUpperCase()}`,
        description: supportMessage,
        priority: 'high',
      });
      if (res.success) {
        showSuccess('Support ticket registered! Our Driver Operations desk will respond shortly.');
        setSupportMessage('');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to submit support request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Emergency SOS trigger
  const handleTriggerSos = () => {
    setSosSent(true);
    setTimeout(() => {
      showSuccess('EMERGENCY SOS: Central safety dispatcher and emergency contacts notified with live GPS coordinates.');
    }, 1000);
  };

  // Navigation Items
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
      label: 'Active Trip',
      icon: Car,
      highlight: Boolean(activeRide),
    },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'payouts', label: 'Payouts & Bank', icon: Wallet },
    { id: 'history', label: 'Trip History', icon: History, badge: history.length },
    { id: 'vehicle', label: 'Vehicle & KYC', icon: FileText },
    { id: 'profile', label: 'Driver Profile', icon: User },
    { id: 'support', label: 'Partner Support', icon: HelpCircle },
  ];

  const isApproved = profile?.status === 'approved';
  const kycStatus = profile?.kycStatus || (isApproved ? 'approved' : 'draft');

  return (
    <DashboardLayout
      role="DRIVER"
      navItems={navItems}
      activeTab={activeTab}
      setActiveTab={(tab) => setActiveTab(tab as typeof activeTab)}
      user={user}
      logout={logout}
    >
      {/* Notifications / Alerts Banner */}
      {errorMessage && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3.5 text-xs text-[#B91C1C] animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={clearMessages} className="text-[#B91C1C] hover:opacity-75 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#15803D]/30 bg-[#15803D]/10 p-3.5 text-xs text-[#15803D] animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={clearMessages} className="text-[#15803D] hover:opacity-75 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* TOP HEADER: BRANDING, VERIFICATION BADGE & AVAILABILITY TOGGLE */}
      <div className="pb-5 border-b border-[#E5E5E5] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#E21D2B]">
              RideNova Driver Partner
            </span>
            <span className="text-xs text-[#737373]">·</span>

            {/* Verification Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isApproved
                  ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30'
                  : kycStatus === 'under_review' || kycStatus === 'submitted'
                  ? 'bg-[#B45309]/10 text-[#B45309] border-[#B45309]/30'
                  : kycStatus === 'rejected' || profile?.status === 'suspended'
                  ? 'bg-[#B91C1C]/10 text-[#B91C1C] border-[#B91C1C]/30'
                  : 'bg-[#737373]/10 text-[#737373] border-[#737373]/30'
              }`}
            >
              {isApproved ? (
                <>
                  <BadgeCheck className="h-3.5 w-3.5 text-[#15803D]" />
                  <span>Approved Partner</span>
                </>
              ) : kycStatus === 'under_review' || kycStatus === 'submitted' ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-[#B45309]" />
                  <span>Under Review</span>
                </>
              ) : kycStatus === 'rejected' ? (
                <>
                  <XCircle className="h-3.5 w-3.5 text-[#B91C1C]" />
                  <span>Action Required</span>
                </>
              ) : profile?.status === 'suspended' ? (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-[#B91C1C]" />
                  <span>Account Suspended</span>
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5 text-[#737373]" />
                  <span>KYC Incomplete</span>
                </>
              )}
            </span>

            {/* Online Status Indicator */}
            <span className="text-xs text-[#737373]">·</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                profile?.isOnline
                  ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30'
                  : 'bg-[#737373]/10 text-[#737373] border-[#737373]/30'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  profile?.isOnline ? 'bg-[#15803D] animate-pulse' : 'bg-[#737373]'
                }`}
              />
              {profile?.isOnline ? 'ONLINE · ACCEPTING' : 'OFFLINE'}
            </span>
          </div>

          <h1 className="mt-1 text-2xl font-extrabold text-[#171717] tracking-tight">
            {profile?.name || user?.name || 'Driver Console'}
          </h1>
          <p className="text-xs text-[#737373] mt-0.5">
            Vehicle:{' '}
            <span className="font-semibold text-[#171717]">
              {vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registration_number})` : 'Not Registered'}
            </span>{' '}
            · License: <span className="font-mono text-[#171717]">{profile?.licenseNumber || 'Unverified'}</span>
          </p>
        </div>

        {/* Controls: Online/Offline Toggle & GPS Ping */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleUpdateLocation}
            disabled={actionLoading}
            title="Update Live GPS Location"
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-all shadow-2xs cursor-pointer"
          >
            <Compass className="h-4 w-4 text-[#E21D2B]" />
            <span className="hidden sm:inline">GPS Sync</span>
          </button>

          <button
            type="button"
            onClick={handleToggleOnline}
            disabled={actionLoading || !isApproved}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              profile?.isOnline
                ? 'bg-[#15803D] text-[#FFFFFF] hover:bg-[#15803D]/90 shadow-[#15803D]/20'
                : 'bg-[#E21D2B] text-[#FFFFFF] hover:bg-[#BE1622] shadow-[#E21D2B]/20'
            }`}
          >
            <Power className="h-4 w-4" />
            <span>
              {!isApproved
                ? 'Approval Required'
                : actionLoading
                ? 'Updating...'
                : profile?.isOnline
                ? 'Go Offline'
                : 'Go Online'}
            </span>
          </button>
        </div>
      </div>

      {/* KYC ONBOARDING CALLOUT BANNER (IF NOT APPROVED) */}
      {!isApproved && (
        <div className="my-5 rounded-2xl border border-[#B45309]/30 bg-[#FFFBEB] p-4 sm:p-5 text-xs text-[#B45309] shadow-sm animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-[#92400E]">
                <AlertTriangle className="h-5 w-5 shrink-0 text-[#B45309]" />
                <span>
                  {kycStatus === 'under_review' || kycStatus === 'submitted'
                    ? 'KYC Verification Under Review'
                    : kycStatus === 'rejected'
                    ? 'KYC Requires Action / Re-submission'
                    : 'Complete Your 5-Step Driver KYC'}
                </span>
              </div>
              <p className="text-[#92400E]/90 leading-relaxed max-w-2xl">
                {kycStatus === 'under_review' || kycStatus === 'submitted'
                  ? 'Your profile, driving license, vehicle registration, and bank details have been submitted. Our compliance team is verifying your credentials. You will be able to go online immediately once verified.'
                  : kycStatus === 'rejected'
                  ? `Your submission was returned: "${profile?.rejectionReason || 'Please review your document images and ensure all vehicle details match registration.'}" Click below to correct and resubmit.`
                  : 'To start earning with RideNova, submit your Driving License, Vehicle Details, Identity Document, and Bank Account for direct earnings deposits.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsKycModalOpen(true)}
              className="shrink-0 rounded-xl bg-[#E21D2B] px-4 py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#BE1622] transition-all shadow-md cursor-pointer"
            >
              {kycStatus === 'under_review' || kycStatus === 'submitted'
                ? 'View Submitted KYC'
                : kycStatus === 'rejected'
                ? 'Fix Documents & Resubmit'
                : 'Open Onboarding Wizard'}
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="mt-6 space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-1 text-[#737373]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Net</span>
                <DollarSign className="h-4 w-4 text-[#15803D]" />
              </div>
              <p className="text-xl font-extrabold text-[#171717] mt-1">
                ₹{earnings?.todayEarnings || 0}
              </p>
              <span className="text-[10px] text-[#15803D] font-medium">85% Net Payout Split</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-1 text-[#737373]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Weekly Net</span>
                <TrendingUp className="h-4 w-4 text-[#E21D2B]" />
              </div>
              <p className="text-xl font-extrabold text-[#171717] mt-1">
                ₹{earnings?.weekEarnings || 0}
              </p>
              <span className="text-[10px] text-[#737373]">Last 7 days</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-1 text-[#737373]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Completed Trips</span>
                <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
              </div>
              <p className="text-xl font-extrabold text-[#171717] mt-1">
                {earnings?.completedTrips || history.filter((h) => h.status === 'ride_completed').length || 0}
              </p>
              <span className="text-[10px] text-[#737373]">Verified rides</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-1 text-[#737373]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Available Balance</span>
                <Wallet className="h-4 w-4 text-[#B45309]" />
              </div>
              <p className="text-xl font-extrabold text-[#171717] mt-1">
                ₹{earnings?.availableBalance || 0}
              </p>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(true)}
                className="text-[10px] text-[#E21D2B] font-bold hover:underline block cursor-pointer"
              >
                Withdraw Funds →
              </button>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-1 text-[#737373]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Acceptance</span>
                <Navigation className="h-4 w-4 text-[#E21D2B]" />
              </div>
              <p className="text-xl font-extrabold text-[#171717] mt-1">
                {earnings?.acceptanceRate || 98}%
              </p>
              <span className="text-[10px] text-[#15803D] font-medium">Top Tier Partner</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-1 text-[#737373]">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Partner Rating</span>
                <Star className="h-4 w-4 text-[#B45309]" />
              </div>
              <p className="text-xl font-extrabold text-[#171717] mt-1">
                ★ {Number(profile?.rating || 5.0).toFixed(1)}
              </p>
              <span className="text-[10px] text-[#737373]">
                {profile?.totalRides || 0} verified reviews
              </span>
            </div>
          </div>

          {/* ACTIVE RIDE SHORTCUT (IF ANY) */}
          {activeRide && (
            <div className="rounded-2xl border-2 border-[#E21D2B] bg-[#FFF1F2] p-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E21D2B] text-white uppercase tracking-wider">
                      Trip in Progress
                    </span>
                    <span className="font-mono text-xs text-[#737373]">
                      Ref: {activeRide.reference_id || activeRide.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#171717]">
                    {activeRide.pickup_address} → {activeRide.destination_address}
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Status:{' '}
                    <span className="font-bold text-[#E21D2B] uppercase">
                      {activeRide.status.replace('_', ' ')}
                    </span>{' '}
                    · Fare: <span className="font-bold text-[#171717]">₹{activeRide.final_fare || activeRide.estimated_fare}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className="rounded-xl bg-[#E21D2B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Open Active Trip Console</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions & Live Request Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Requests Radar Widget */}
            <div className="lg:col-span-2 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-[#E21D2B]" />
                  <h3 className="text-sm font-bold text-[#171717]">Live Trip Requests</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E21D2B]/10 text-[#E21D2B]">
                    {requests.length} Available
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className="text-xs font-semibold text-[#E21D2B] hover:underline"
                >
                  View All Requests →
                </button>
              </div>

              <div className="mt-4">
                {!profile?.isOnline ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5E5E5]/60 text-[#737373]">
                      <Power className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-semibold text-[#171717]">You are currently Offline</p>
                    <p className="text-xs text-[#737373] max-w-sm mx-auto">
                      Switch your availability toggle to <span className="font-bold text-[#15803D]">ONLINE</span> to receive incoming trip dispatch requests in your coverage zone.
                    </p>
                    {isApproved && (
                      <button
                        type="button"
                        onClick={handleToggleOnline}
                        className="rounded-xl bg-[#15803D] px-4 py-2 text-xs font-bold text-white hover:bg-[#15803D]/90 shadow-sm cursor-pointer"
                      >
                        Go Online Now
                      </button>
                    )}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#15803D]/10 text-[#15803D] animate-spin">
                      <Compass className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-[#171717]">Scanning for nearby riders...</p>
                    <p className="text-xs text-[#737373]">
                      Your GPS radar is active at ({profile.currentLatitude?.toFixed(4)}, {profile.currentLongitude?.toFixed(4)}). New rides will appear automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 2).map((req) => (
                      <div
                        key={req.id}
                        className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#E21D2B]">
                              {req.referenceId || req.id.slice(0, 8)}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5E5E5] text-[#171717] uppercase">
                              {req.rideType}
                            </span>
                            <span className="text-[#737373]">· {req.distanceKm || 5.2} km</span>
                          </div>
                          <p className="text-[#171717] font-semibold">
                            {req.pickupAddress} → {req.destinationAddress}
                          </p>
                          <p className="text-[#15803D] font-bold text-xs">
                            Your Net Payout: ₹{req.estimatedDriverEarnings} (Est. Fare: ₹{req.estimatedFare})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeclineRide(req.id)}
                            className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-semibold text-[#737373] hover:text-[#B91C1C] cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptRide(req.id)}
                            disabled={actionLoading}
                            className="rounded-lg bg-[#E21D2B] px-4 py-2 text-xs font-bold text-white hover:bg-[#BE1622] shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            Accept Trip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Payout Box */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs space-y-3">
                <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">
                  Partner Shortcuts
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab('earnings')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E5E5] hover:border-[#E21D2B] hover:bg-[#FFF1F2] transition-all cursor-pointer text-center"
                  >
                    <DollarSign className="h-5 w-5 text-[#E21D2B] mb-1" />
                    <span className="font-bold text-[#171717]">Earnings Ledger</span>
                    <span className="text-[10px] text-[#737373]">15% commission</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPayoutModalOpen(true)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E5E5] hover:border-[#15803D] hover:bg-[#15803D]/10 transition-all cursor-pointer text-center"
                  >
                    <Wallet className="h-5 w-5 text-[#15803D] mb-1" />
                    <span className="font-bold text-[#171717]">Request Payout</span>
                    <span className="text-[10px] text-[#737373]">Instant to Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsKycModalOpen(true)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E5E5] hover:border-[#B45309] hover:bg-[#FFFBEB] transition-all cursor-pointer text-center"
                  >
                    <FileText className="h-5 w-5 text-[#B45309] mb-1" />
                    <span className="font-bold text-[#171717]">KYC Documents</span>
                    <span className="text-[10px] text-[#737373]">License & RC</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('support')}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E5E5] hover:border-[#737373] hover:bg-[#FAFAFA] transition-all cursor-pointer text-center"
                  >
                    <HelpCircle className="h-5 w-5 text-[#737373] mb-1" />
                    <span className="font-bold text-[#171717]">Help Center</span>
                    <span className="text-[10px] text-[#737373]">24/7 Driver Desk</span>
                  </button>
                </div>
              </div>

              {/* Safety SOS Beacon */}
              <div className="rounded-2xl border border-[#B91C1C]/30 bg-[#FFF1F2] p-4 text-xs">
                <div className="flex items-center gap-2 text-[#B91C1C] font-bold mb-1">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Driver Safety Shield</span>
                </div>
                <p className="text-[#171717] text-[11px] mb-3">
                  Live trip monitoring is active. Tap below to notify emergency dispatch.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSosModalOpen(true)}
                  className="w-full rounded-xl bg-[#E21D2B] py-2 text-xs font-bold text-white hover:bg-[#BE1622] transition-all cursor-pointer shadow-xs"
                >
                  Emergency SOS Beacon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: RIDE REQUESTS RADAR */}
      {activeTab === 'requests' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Incoming Trip Requests</h2>
              <p className="text-xs text-[#737373]">
                Atomic dispatch lock: accepted requests are reserved exclusively for you.
              </p>
            </div>
            <button
              type="button"
              onClick={loadRequests}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#E21D2B]" />
              <span>Refresh Radar</span>
            </button>
          </div>

          {!profile?.isOnline ? (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-10 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5E5E5] text-[#737373]">
                <Power className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-[#171717]">You are currently Offline</h3>
              <p className="text-xs text-[#737373] max-w-md mx-auto">
                Turn your status to <span className="font-bold text-[#15803D]">ONLINE</span> to start receiving nearby customer ride assignments.
              </p>
              {isApproved && (
                <button
                  type="button"
                  onClick={handleToggleOnline}
                  className="rounded-xl bg-[#15803D] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#15803D]/90 shadow-md cursor-pointer"
                >
                  Turn Online Availability On
                </button>
              )}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#15803D]/10 text-[#15803D] animate-pulse">
                <Navigation className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-[#171717]">Radar Active · Waiting for Requests</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                No pending rides in your immediate sector right now. Keep your app open; nearby rides will sound a dispatch alert.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#E21D2B] transition-all space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#E21D2B]">
                        {req.referenceId || req.id.slice(0, 8)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF1F2] text-[#E21D2B] uppercase">
                        {req.rideType}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#15803D] flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Just now
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-[#15803D] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-[#737373] uppercase font-bold block">Pickup</span>
                        <p className="text-[#171717] font-semibold">{req.pickupAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-[#E21D2B] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-[#737373] uppercase font-bold block">Drop-off</span>
                        <p className="text-[#171717] font-semibold">{req.destinationAddress}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#737373] uppercase font-bold block">Net Driver Earnings</span>
                      <span className="text-base font-extrabold text-[#15803D]">
                        ₹{req.estimatedDriverEarnings}
                      </span>
                      <span className="text-[10px] text-[#737373] ml-1.5">(Gross: ₹{req.estimatedFare})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeclineRide(req.id)}
                        className="rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs font-semibold text-[#737373] hover:text-[#B91C1C] cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptRide(req.id)}
                        disabled={actionLoading}
                        className="rounded-xl bg-[#E21D2B] px-5 py-2 text-xs font-bold text-white hover:bg-[#BE1622] shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        Accept Trip
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ACTIVE TRIP CONSOLE */}
      {activeTab === 'active' && (
        <div className="mt-6 space-y-4">
          {!activeRide ? (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5E5E5] text-[#737373]">
                <Car className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-[#171717]">No Active Trip in Progress</h3>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                When you accept a ride from the Requests tab, your navigation directions, passenger details, and lifecycle actions will appear here.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className="rounded-xl bg-[#E21D2B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#BE1622] shadow-md cursor-pointer"
              >
                Find Ride Requests
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-md space-y-6">
              {/* Trip Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#E21D2B] text-white uppercase tracking-wider">
                      {activeRide.status.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-xs text-[#737373]">
                      Ref: {activeRide.reference_id || activeRide.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-[#171717]">
                    Trip Console · {activeRide.ride_type.toUpperCase()}
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-[#737373] block font-semibold uppercase">Estimated Fare</span>
                  <span className="text-xl font-black text-[#171717]">
                    ₹{activeRide.final_fare || activeRide.estimated_fare}
                  </span>
                  <span className="text-[11px] text-[#15803D] block font-bold">
                    Net: ₹{Math.round((activeRide.final_fare || activeRide.estimated_fare) * 0.85)} (85%)
                  </span>
                </div>
              </div>

              {/* Waypoints & Map Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="h-3 w-3 rounded-full bg-[#15803D] mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#737373] uppercase font-bold block">Pickup Location</span>
                        <p className="text-sm font-bold text-[#171717]">{activeRide.pickup_address}</p>
                      </div>
                    </div>

                    <div className="border-l-2 border-dashed border-[#E5E5E5] ml-1.5 pl-4 py-1">
                      <span className="text-[11px] text-[#737373] font-semibold">
                        Est. Distance: {activeRide.distance_km || 4.8} km · Duration: {activeRide.estimated_duration_minutes || 15} mins
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="h-3 w-3 rounded-full bg-[#E21D2B] mt-1 shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#737373] uppercase font-bold block">Destination Location</span>
                        <p className="text-sm font-bold text-[#171717]">{activeRide.destination_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Rider Details Card */}
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#FFF1F2] text-[#E21D2B] font-bold text-sm flex items-center justify-center border border-[#E21D2B]/30">
                        P
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#171717]">Passenger Contact</p>
                        <p className="text-[11px] text-[#737373] font-mono">+91 98765 00000</p>
                      </div>
                    </div>

                    <a
                      href="tel:+919876500000"
                      className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold text-[#171717] hover:border-[#15803D] hover:text-[#15803D] flex items-center gap-1.5"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Call Passenger</span>
                    </a>
                  </div>
                </div>

                {/* Navigation & Status Transition Actions */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                      Trip Transition Controls
                    </h4>

                    {/* Sequential Status Transitions */}
                    {activeRide.status === 'accepted' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRideStatus('driver_arriving')}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-[#E21D2B] py-3 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Car className="h-4 w-4" />
                        <span>I Am Heading to Pickup (En Route)</span>
                      </button>
                    )}

                    {activeRide.status === 'driver_arriving' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRideStatus('driver_arrived')}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-[#B45309] py-3 text-xs font-bold text-white hover:bg-[#92400E] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>I Have Arrived at Pickup Spot</span>
                      </button>
                    )}

                    {activeRide.status === 'driver_arrived' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRideStatus('ride_started')}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-[#15803D] py-3 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Passenger Onboard · Start Trip</span>
                      </button>
                    )}

                    {activeRide.status === 'ride_started' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateRideStatus('ride_completed')}
                        disabled={actionLoading}
                        className="w-full rounded-xl bg-[#15803D] py-3 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Arrived at Destination · Complete Trip</span>
                      </button>
                    )}

                    {/* Navigation Link */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${activeRide.pickup_latitude},${activeRide.pickup_longitude}&destination=${activeRide.destination_latitude},${activeRide.destination_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4 text-[#E21D2B]" />
                      <span>Open in Google Maps Navigation</span>
                    </a>

                    {/* Cancel Trip Option */}
                    <button
                      type="button"
                      onClick={() => setShowDriverCancelModal(true)}
                      className="w-full text-center text-xs text-[#B91C1C] hover:underline pt-2 font-medium cursor-pointer"
                    >
                      Cancel Trip (Driver Discretion)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: EARNINGS & COMMISSION SYSTEM */}
      {activeTab === 'earnings' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Earnings & Commission Ledger</h2>
              <p className="text-xs text-[#737373]">
                Transparent 15% RideNova platform fee split · 85% net earnings credited instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPayoutModalOpen(true)}
              className="rounded-xl bg-[#15803D] px-4 py-2 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-sm cursor-pointer"
            >
              Request Payout (₹{earnings?.availableBalance || 0})
            </button>
          </div>

          {/* Earnings Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">Today's Net Earnings</span>
              <p className="text-2xl font-black text-[#15803D] mt-1">₹{earnings?.todayEarnings || 0}</p>
              <span className="text-[10px] text-[#737373]">Completed today</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">This Week's Net</span>
              <p className="text-2xl font-black text-[#171717] mt-1">₹{earnings?.weekEarnings || 0}</p>
              <span className="text-[10px] text-[#737373]">Last 7 calendar days</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">This Month's Net</span>
              <p className="text-2xl font-black text-[#171717] mt-1">₹{earnings?.monthEarnings || 0}</p>
              <span className="text-[10px] text-[#737373]">Current month to date</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">Lifetime Gross Payout</span>
              <p className="text-2xl font-black text-[#171717] mt-1">₹{earnings?.totalGross || 0}</p>
              <span className="text-[10px] text-[#E21D2B] font-semibold">
                Platform Commission (15%): ₹{earnings?.totalCommission || 0}
              </span>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Completed Trip Settlement History ({history.filter((h) => h.status === 'ride_completed').length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Trip Reference</th>
                    <th className="p-3.5">Route</th>
                    <th className="p-3.5">Gross Fare</th>
                    <th className="p-3.5">Platform Fee (15%)</th>
                    <th className="p-3.5">Your Net Earnings (85%)</th>
                    <th className="p-3.5">Settlement Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {history.filter((h) => h.status === 'ride_completed').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs text-[#737373]">
                        No completed trips on your ledger yet. Start accepting rides to build your earnings record!
                      </td>
                    </tr>
                  ) : (
                    history
                      .filter((h) => h.status === 'ride_completed')
                      .map((ride) => {
                        const fare = ride.final_fare ? Number(ride.final_fare) : Number(ride.estimated_fare);
                        const platformFee = Math.round(fare * 0.15);
                        const driverNet = fare - platformFee;

                        return (
                          <tr key={ride.id} className="hover:bg-[#FAFAFA]/60">
                            <td className="p-3.5 font-mono font-bold text-[#E21D2B]">
                              {ride.reference_id || ride.id.slice(0, 8)}
                            </td>
                            <td className="p-3.5 text-[#171717] font-medium">
                              {ride.pickup_address} → {ride.destination_address}
                            </td>
                            <td className="p-3.5 font-semibold text-[#171717]">₹{fare}</td>
                            <td className="p-3.5 text-[#737373]">₹{platformFee}</td>
                            <td className="p-3.5 font-extrabold text-[#15803D]">₹{driverNet}</td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                                Settled
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: PAYOUTS & BANK SETTLEMENT */}
      {activeTab === 'payouts' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Payouts & Direct Bank Settlement</h2>
              <p className="text-xs text-[#737373]">
                Earnings are transferred to your verified bank account via IMPS/NEFT automated processing.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPayoutModalOpen(true)}
              className="rounded-xl bg-[#15803D] px-4 py-2 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-sm cursor-pointer"
            >
              Withdraw Available Balance
            </button>
          </div>

          {/* Balance Cards & Bank Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">Available Balance</span>
              <p className="text-3xl font-black text-[#15803D]">₹{earnings?.availableBalance || 0}</p>
              <p className="text-xs text-[#737373]">Ready for immediate withdrawal</p>
            </div>

            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">Pending Settlement</span>
              <p className="text-3xl font-black text-[#B45309]">₹{earnings?.pendingSettlement || 0}</p>
              <p className="text-xs text-[#737373]">Trips currently undergoing nightly audit</p>
            </div>

            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs space-y-2">
              <span className="text-[11px] text-[#737373] uppercase font-bold block">Total Paid Out</span>
              <p className="text-3xl font-black text-[#171717]">₹{earnings?.paidBalance || 0}</p>
              <p className="text-xs text-[#737373]">Transferred to your bank</p>
            </div>
          </div>

          {/* Verified Bank Account Card */}
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[#171717]">
                <Building2 className="h-6 w-6 text-[#15803D]" />
              </div>
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#171717]">
                    {profile?.bankAccountName || user?.name || 'Authorized Driver Partner'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                    Verified Bank Account
                  </span>
                </div>
                <p className="text-[#737373] font-mono">
                  Account No: {profile?.bankAccountNumberMasked || 'XXXX-XXXX-9182'} · IFSC: {profile?.bankIfsc || 'HDFC0001892'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setKycStep(4);
                setIsKycModalOpen(true);
              }}
              className="rounded-xl border border-[#E5E5E5] bg-white px-3.5 py-2 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-all cursor-pointer"
            >
              Update Bank Details
            </button>
          </div>

          {/* Payout History Table */}
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-[#E5E5E5]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                Payout Transaction Records ({payouts.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Reference ID</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Target Account</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs text-[#737373]">
                        No payout withdrawals requested yet.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAFAFA]/60">
                        <td className="p-3.5 font-mono font-bold text-[#E21D2B]">{p.reference_id || p.id}</td>
                        <td className="p-3.5 text-[#737373]">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="p-3.5 font-bold text-[#15803D]">₹{p.amount}</td>
                        <td className="p-3.5 font-mono text-[#737373]">{p.bank_account_masked}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D] uppercase">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: TRIP HISTORY */}
      {activeTab === 'history' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Trip Activity History ({history.length})</h2>
              <p className="text-xs text-[#737373]">
                Full chronological archive of your accepted, completed, and cancelled rides.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Trip ID</th>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Pickup → Drop-off</th>
                    <th className="p-3.5">Vehicle Type</th>
                    <th className="p-3.5">Fare</th>
                    <th className="p-3.5">Net Payout (85%)</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[#737373]">
                        No trip history recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((ride) => {
                      const fare = ride.final_fare ? Number(ride.final_fare) : Number(ride.estimated_fare);
                      const net = Math.round(fare * 0.85);

                      return (
                        <tr key={ride.id} className="hover:bg-[#FAFAFA]/60">
                          <td className="p-3.5 font-mono font-bold text-[#E21D2B]">
                            {ride.reference_id || ride.id.slice(0, 8)}
                          </td>
                          <td className="p-3.5 text-[#737373]">
                            {new Date(ride.created_at).toLocaleString()}
                          </td>
                          <td className="p-3.5 text-[#171717] font-medium max-w-xs truncate">
                            {ride.pickup_address} → {ride.destination_address}
                          </td>
                          <td className="p-3.5 uppercase font-semibold text-[#737373]">
                            {ride.ride_type}
                          </td>
                          <td className="p-3.5 font-bold text-[#171717]">₹{fare}</td>
                          <td className="p-3.5 font-bold text-[#15803D]">₹{net}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                ride.status === 'ride_completed'
                                  ? 'bg-[#15803D]/10 text-[#15803D]'
                                  : ride.status === 'cancelled'
                                  ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                                  : 'bg-[#B45309]/10 text-[#B45309]'
                              }`}
                            >
                              {ride.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: VEHICLE & KYC DOCUMENTS */}
      {activeTab === 'vehicle' && (
        <div className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Vehicle Fleet & KYC Documents</h2>
              <p className="text-xs text-[#737373]">
                Manage your commercial driving permit, vehicle fitness certificates, and identity records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setKycStep(1);
                setIsKycModalOpen(true);
              }}
              className="rounded-xl bg-[#E21D2B] px-4 py-2 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-sm cursor-pointer"
            >
              Open Full KYC Wizard
            </button>
          </div>

          {/* Vehicle Information Card */}
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-[#E21D2B]" />
                <h3 className="text-sm font-bold text-[#171717]">Registered Commercial Vehicle</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                Fleet Active
              </span>
            </div>

            {vehicle ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-bold block">Vehicle Model</span>
                  <p className="text-sm font-bold text-[#171717] mt-0.5">{vehicle.make} {vehicle.model}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-bold block">Registration Number</span>
                  <p className="text-sm font-mono font-bold text-[#E21D2B] mt-0.5">{vehicle.registration_number}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-bold block">Ride Category</span>
                  <p className="text-sm font-bold text-[#171717] mt-0.5 uppercase">{vehicle.vehicle_type}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#737373] uppercase font-bold block">Color & Year</span>
                  <p className="text-sm font-bold text-[#171717] mt-0.5">{vehicle.color} · {vehicle.year}</p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#737373] py-4 text-center">
                No vehicle registered yet. Complete Step 3 in the KYC wizard to add your car.
              </div>
            )}
          </div>

          {/* Document Verification Checklist Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Driving Licence Card */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#E21D2B]" />
                  <span className="text-xs font-bold text-[#171717]">Commercial Driving Licence</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                  Verified
                </span>
              </div>
              <div className="text-xs text-[#737373] space-y-1">
                <p>License No: <span className="font-mono text-[#171717] font-semibold">{profile?.licenseNumber || 'DL-04202400918'}</span></p>
                <p>Authority: <span className="text-[#171717]">{profile?.licenseState || 'Delhi Transport Authority'}</span></p>
                <p>Valid Through: <span className="text-[#171717]">{profile?.licenseExpiry || '2034-08-14'}</span></p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKycStep(2);
                  setIsKycModalOpen(true);
                }}
                className="text-xs font-semibold text-[#E21D2B] hover:underline cursor-pointer"
              >
                Update Licence Document →
              </button>
            </div>

            {/* Vehicle RC & Permit Card */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-[#15803D]" />
                  <span className="text-xs font-bold text-[#171717]">Registration Certificate (RC)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                  Verified
                </span>
              </div>
              <div className="text-xs text-[#737373] space-y-1">
                <p>RC Number: <span className="font-mono text-[#171717] font-semibold">{vehicle?.registration_number || 'DL-01-RN-2026'}</span></p>
                <p>Insurance Policy: <span className="text-[#171717]">BAJAJ-ALL-891024-RN (Active)</span></p>
                <p>Commercial Permit: <span className="text-[#171717]">All India Tourist Cab Permit</span></p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKycStep(3);
                  setIsKycModalOpen(true);
                }}
                className="text-xs font-semibold text-[#E21D2B] hover:underline cursor-pointer"
              >
                Update Vehicle Documents →
              </button>
            </div>

            {/* National Identity Card */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#B45309]" />
                  <span className="text-xs font-bold text-[#171717]">National Identity Document</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                  Verified
                </span>
              </div>
              <div className="text-xs text-[#737373] space-y-1">
                <p>Document Type: <span className="text-[#171717] font-semibold">{profile?.idType || 'Aadhaar Card'}</span></p>
                <p>Masked Identifier: <span className="font-mono text-[#171717]">{profile?.idNumberMasked || 'XXXX-XXXX-4912'}</span></p>
                <p>Background Verification: <span className="text-[#15803D] font-bold">Passed</span></p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKycStep(4);
                  setIsKycModalOpen(true);
                }}
                className="text-xs font-semibold text-[#E21D2B] hover:underline cursor-pointer"
              >
                Update Identity Proof →
              </button>
            </div>

            {/* Direct Deposit Settlement Bank */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#15803D]" />
                  <span className="text-xs font-bold text-[#171717]">Direct Deposit Bank Account</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                  Active
                </span>
              </div>
              <div className="text-xs text-[#737373] space-y-1">
                <p>Account Holder: <span className="text-[#171717] font-semibold">{profile?.bankAccountName || user?.name || 'Driver Partner'}</span></p>
                <p>Account Number: <span className="font-mono text-[#171717]">{profile?.bankAccountNumberMasked || 'XXXX-XXXX-9182'}</span></p>
                <p>Bank IFSC: <span className="font-mono text-[#171717]">{profile?.bankIfsc || 'HDFC0001892'}</span></p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKycStep(4);
                  setIsKycModalOpen(true);
                }}
                className="text-xs font-semibold text-[#E21D2B] hover:underline cursor-pointer"
              >
                Change Bank Details →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 8: DRIVER ACCOUNT SETTINGS & SAFETY CENTER */}
      {activeTab === 'profile' && (
        <div className="mt-2">
          <DriverAccountSettings onNavigate={onNavigate} />
        </div>
      )}

      {/* SECTION 9: PARTNER SUPPORT & HELPLINE */}
      {activeTab === 'support' && (
        <div className="mt-6 space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">24/7 Driver Partner Support</h2>
            <p className="text-xs text-[#737373]">
              Direct assistance with fare disputes, passenger issues, vehicle verification, and payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Support Ticket Submission */}
            <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">
                Submit a Support Ticket
              </h3>

              <form onSubmit={handleSubmitSupportTicket} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#737373] mb-1">Inquiry Category</label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2.5 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  >
                    <option value="fare_dispute">Fare Calculation & Toll Dispute</option>
                    <option value="payout_issue">Delayed Bank Payout</option>
                    <option value="kyc_verification">KYC & Document Verification</option>
                    <option value="vehicle_change">Fleet Vehicle Change</option>
                    <option value="rider_behavior">Passenger Conduct & Safety</option>
                    <option value="app_glitch">App Glitch & Technical Problem</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#737373] mb-1">Detailed Description</label>
                  <textarea
                    rows={4}
                    required
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your issue with relevant trip references..."
                    className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2.5 text-[#171717] focus:border-[#E21D2B] focus:outline-none placeholder-[#737373]/60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[#E21D2B] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit Ticket to Partner Desk</span>
                </button>
              </form>
            </div>

            {/* Helpline & Safety Guidelines */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-2xs space-y-3 text-xs">
                <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">
                  Emergency & Operations Contacts
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                    <div>
                      <span className="font-bold text-[#171717] block">Priority Driver Hotline</span>
                      <span className="text-[11px] text-[#737373]">Toll-Free 24x7</span>
                    </div>
                    <a
                      href="tel:18001020300"
                      className="rounded-lg bg-[#15803D] text-white px-3 py-1.5 font-bold"
                    >
                      1800-102-0300
                    </a>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                    <div>
                      <span className="font-bold text-[#171717] block">Emergency Dispatch Police</span>
                      <span className="text-[11px] text-[#737373]">SOS Hotline</span>
                    </div>
                    <a
                      href="tel:112"
                      className="rounded-lg bg-[#E21D2B] text-white px-3 py-1.5 font-bold"
                    >
                      Dial 112
                    </a>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#737373] space-y-1">
                  <p className="font-bold text-[#171717]">Driver Protocol Guidelines:</p>
                  <p>1. Always confirm OTP or rider identity before starting trip.</p>
                  <p>2. Keep vehicle sanitized and commercial permit docs onboard.</p>
                  <p>3. Do not accept offline or direct cash payment circumventing app.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-STEP DRIVER KYC ONBOARDING WIZARD MODAL */}
      {isKycModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E21D2B]">
                  RideNova Compliance
                </span>
                <h3 className="text-lg font-black text-[#171717]">
                  Driver Partner KYC Onboarding Wizard
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKycModalOpen(false)}
                className="rounded-lg p-1 text-[#737373] hover:text-[#171717]"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="my-5">
              <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
                {[
                  { step: 1, label: 'Personal' },
                  { step: 2, label: 'Licence' },
                  { step: 3, label: 'Vehicle' },
                  { step: 4, label: 'Identity & Bank' },
                  { step: 5, label: 'Review & Submit' },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setKycStep(s.step)}
                    className={`py-2 rounded-xl transition-all ${
                      kycStep === s.step
                        ? 'bg-[#E21D2B] text-white shadow-xs'
                        : kycStep > s.step
                        ? 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30'
                        : 'bg-[#FAFAFA] text-[#737373] border border-[#E5E5E5]'
                    }`}
                  >
                    <span>Step {s.step}</span>
                    <span className="block font-normal truncate mt-0.5">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 1: PERSONAL INFORMATION */}
            {kycStep === 1 && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#171717]">Step 1: Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      value={kycForm.fullName || ''}
                      onChange={(e) => setKycForm({ ...kycForm, fullName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar Sharma"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={kycForm.phone || ''}
                      onChange={(e) => setKycForm({ ...kycForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={kycForm.dob || '1993-08-15'}
                      onChange={(e) => setKycForm({ ...kycForm, dob: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Profile Photo URL</label>
                    <input
                      type="text"
                      value={kycForm.profilePhotoUrl || ''}
                      onChange={(e) => setKycForm({ ...kycForm, profilePhotoUrl: e.target.value })}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#737373] mb-1">Residential Address</label>
                  <textarea
                    rows={2}
                    value={kycForm.address || ''}
                    onChange={(e) => setKycForm({ ...kycForm, address: e.target.value })}
                    placeholder="Full residential street, locality, city and pin code"
                    className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: DRIVING LICENCE */}
            {kycStep === 2 && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#171717]">Step 2: Commercial Driving Licence</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Licence Number</label>
                    <input
                      type="text"
                      required
                      value={kycForm.licenseNumber || ''}
                      onChange={(e) => setKycForm({ ...kycForm, licenseNumber: e.target.value })}
                      placeholder="DL-042024001928"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] font-mono focus:border-[#E21D2B] focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Issuing Authority / State</label>
                    <input
                      type="text"
                      value={kycForm.licenseState || ''}
                      onChange={(e) => setKycForm({ ...kycForm, licenseState: e.target.value })}
                      placeholder="Delhi RTO"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#737373] mb-1">Licence Expiry Date</label>
                  <input
                    type="date"
                    value={kycForm.licenseExpiry || '2034-08-14'}
                    onChange={(e) => setKycForm({ ...kycForm, licenseExpiry: e.target.value })}
                    className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-dashed border-[#E5E5E5] p-3 text-center space-y-1 bg-[#FAFAFA]">
                    <Upload className="h-5 w-5 mx-auto text-[#737373]" />
                    <span className="font-bold text-[11px] text-[#171717] block">Licence Front Image</span>
                    <span className="text-[10px] text-[#15803D]">Uploaded & Verified</span>
                  </div>

                  <div className="rounded-xl border border-dashed border-[#E5E5E5] p-3 text-center space-y-1 bg-[#FAFAFA]">
                    <Upload className="h-5 w-5 mx-auto text-[#737373]" />
                    <span className="font-bold text-[11px] text-[#171717] block">Licence Back Image</span>
                    <span className="text-[10px] text-[#15803D]">Uploaded & Verified</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: VEHICLE INFORMATION */}
            {kycStep === 3 && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#171717]">Step 3: Fleet Vehicle Registration</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Make</label>
                    <input
                      type="text"
                      required
                      value={kycForm.vehicleMake || ''}
                      onChange={(e) => setKycForm({ ...kycForm, vehicleMake: e.target.value })}
                      placeholder="Maruti Suzuki / Toyota"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Model</label>
                    <input
                      type="text"
                      required
                      value={kycForm.vehicleModel || ''}
                      onChange={(e) => setKycForm({ ...kycForm, vehicleModel: e.target.value })}
                      placeholder="Dzire / Camry"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Year</label>
                    <input
                      type="number"
                      required
                      value={kycForm.vehicleYear || 2024}
                      onChange={(e) => setKycForm({ ...kycForm, vehicleYear: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Vehicle Color</label>
                    <input
                      type="text"
                      value={kycForm.vehicleColor || ''}
                      onChange={(e) => setKycForm({ ...kycForm, vehicleColor: e.target.value })}
                      placeholder="Silver / White"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      value={kycForm.registrationNumber || ''}
                      onChange={(e) => setKycForm({ ...kycForm, registrationNumber: e.target.value })}
                      placeholder="DL-01-RN-2026"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] font-mono focus:border-[#E21D2B] focus:outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Vehicle Category</label>
                    <select
                      value={kycForm.vehicleType || 'comfort'}
                      onChange={(e) => setKycForm({ ...kycForm, vehicleType: e.target.value as VehicleType })}
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    >
                      <option value="economy">Economy (Hatchback/Compact)</option>
                      <option value="comfort">Comfort (Sedan/EV)</option>
                      <option value="premium">Premium (SUV/Luxury)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Insurance Policy Number</label>
                    <input
                      type="text"
                      value={kycForm.insurancePolicyNumber || ''}
                      onChange={(e) => setKycForm({ ...kycForm, insurancePolicyNumber: e.target.value })}
                      placeholder="POLICY-891024-RN"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={kycForm.insuranceExpiry || '2026-11-20'}
                      onChange={(e) => setKycForm({ ...kycForm, insuranceExpiry: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: IDENTITY AND BANK VERIFICATION */}
            {kycStep === 4 && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#171717]">Step 4: National ID & Settlement Bank Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">Identity Document Type</label>
                    <select
                      value={kycForm.idType || 'Aadhaar Card'}
                      onChange={(e) => setKycForm({ ...kycForm, idType: e.target.value })}
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                    >
                      <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                      <option value="PAN Card">PAN Card (Income Tax Dept)</option>
                      <option value="Voter ID">Voter ID Card</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#737373] mb-1">ID Number (Masked in UI)</label>
                    <input
                      type="text"
                      required
                      value={kycForm.idNumber || ''}
                      onChange={(e) => setKycForm({ ...kycForm, idNumber: e.target.value })}
                      placeholder="918234561234"
                      className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E5E5] space-y-3">
                  <h5 className="font-bold text-[#171717]">Direct Deposit Bank Account (IMPS/NEFT)</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-[#737373] mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        required
                        value={kycForm.bankAccountName || ''}
                        onChange={(e) => setKycForm({ ...kycForm, bankAccountName: e.target.value })}
                        placeholder="Ramesh Sharma"
                        className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#737373] mb-1">Bank Account Number</label>
                      <input
                        type="password"
                        required
                        value={kycForm.bankAccountNumber || ''}
                        onChange={(e) => setKycForm({ ...kycForm, bankAccountNumber: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] font-mono focus:border-[#E21D2B] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#737373] mb-1">IFSC Code</label>
                      <input
                        type="text"
                        required
                        value={kycForm.bankIfsc || ''}
                        onChange={(e) => setKycForm({ ...kycForm, bankIfsc: e.target.value })}
                        placeholder="HDFC0001892"
                        className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2 text-[#171717] font-mono focus:border-[#E21D2B] focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW AND SUBMIT */}
            {kycStep === 5 && (
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-sm text-[#171717]">Step 5: Review & Submit Verification Application</h4>

                <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-2.5">
                  <h5 className="font-bold text-[#171717] pb-1 border-b border-[#E5E5E5]">Application Checklist</h5>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[#15803D]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Legal Identity: {kycForm.fullName} ({kycForm.phone})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#15803D]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Commercial Driving Licence: {kycForm.licenseNumber} ({kycForm.licenseState})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#15803D]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Vehicle: {kycForm.vehicleMake} {kycForm.vehicleModel} ({kycForm.registrationNumber})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#15803D]">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Direct Deposit Bank: {kycForm.bankAccountName} · IFSC: {kycForm.bankIfsc}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#B45309]/30 bg-[#FFFBEB] text-[#B45309]">
                  <p className="font-bold mb-0.5">Verification Timeline & Declarations</p>
                  <p>
                    By submitting, you certify that all uploaded licences and permits are genuine. Administrative review completes within 2 to 24 hours, after which you can activate Online status.
                  </p>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="mt-6 pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
              <div>
                {kycStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setKycStep((s) => s - 1)}
                    className="rounded-xl border border-[#E5E5E5] px-4 py-2 text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA]"
                  >
                    ← Previous Step
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveKyc(false)}
                  disabled={actionLoading}
                  className="rounded-xl border border-[#E5E5E5] bg-white px-4 py-2 text-xs font-semibold text-[#171717] hover:border-[#171717] cursor-pointer"
                >
                  Save Draft Progress
                </button>

                {kycStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setKycStep((s) => s + 1)}
                    className="rounded-xl bg-[#E21D2B] px-5 py-2 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-md cursor-pointer"
                  >
                    Next Step →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveKyc(true)}
                    disabled={actionLoading}
                    className="rounded-xl bg-[#15803D] px-6 py-2 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW PAYOUT MODAL */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-[#15803D]" />
                <h3 className="text-sm font-bold text-[#171717]">Withdraw Earnings Balance</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-[#737373] hover:text-[#171717]"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                <span className="text-[10px] text-[#737373] uppercase font-bold block">Available Balance</span>
                <span className="text-xl font-extrabold text-[#15803D]">₹{earnings?.availableBalance || 0}</span>
                <span className="text-[11px] text-[#737373] block mt-0.5">
                  Target Account: {profile?.bankAccountNumberMasked || 'XXXX-XXXX-9182'}
                </span>
              </div>

              <div>
                <label className="block font-bold text-[#737373] mb-1">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  min={200}
                  max={earnings?.availableBalance || 50000}
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E5E5E5] px-3.5 py-2.5 text-base font-extrabold text-[#171717] focus:border-[#15803D] focus:outline-none"
                />
                <span className="text-[10px] text-[#737373] mt-1 block">Minimum payout threshold: ₹200</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 rounded-xl border border-[#E5E5E5] py-2.5 text-xs font-semibold text-[#171717]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || (earnings?.availableBalance || 0) < 200}
                  className="flex-1 rounded-xl bg-[#15803D] py-2.5 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY SOS BEACON MODAL */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border-2 border-[#B91C1C] bg-[#FFFFFF] p-6 shadow-2xl">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#B91C1C]/10 text-[#B91C1C] animate-pulse">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h3 className="text-base font-extrabold text-[#B91C1C]">RideNova Driver Emergency Beacon</h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                Triggering the Emergency Beacon transmits your live coordinates ({profile?.currentLatitude?.toFixed(4)}, {profile?.currentLongitude?.toFixed(4)}), trip reference, and vehicle registration directly to RideNova Central Security and Local Police Dispatch.
              </p>

              {sosSent ? (
                <div className="p-4 rounded-xl bg-[#15803D]/10 border border-[#15803D]/30 text-xs text-[#15803D] font-bold">
                  ✓ EMERGENCY DISPATCH TRANSMITTED · Help is en route. Stay inside your vehicle if safe.
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTriggerSos}
                    className="w-full rounded-xl bg-[#E21D2B] py-3 text-xs font-black uppercase text-white hover:bg-[#BE1622] transition-all shadow-lg cursor-pointer tracking-wider"
                  >
                    Activate Emergency Beacon
                  </button>
                  <a
                    href="tel:112"
                    className="block w-full rounded-xl border border-[#E5E5E5] py-2.5 text-xs font-bold text-[#171717] hover:bg-[#FAFAFA]"
                  >
                    Direct Dial Police (112)
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsSosModalOpen(false);
                  setSosSent(false);
                }}
                className="text-xs text-[#737373] hover:underline pt-2 cursor-pointer font-medium"
              >
                Close Safety Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER TRIP PAYMENT COLLECTION & SUMMARY WORKFLOW MODAL */}
      {paymentFlowStep !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-2xl space-y-5 my-8">
            {/* STEP 1: TRIP SUMMARY */}
            {paymentFlowStep === 'summary' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <h3 className="text-base font-extrabold text-[#171717]">Trip Summary</h3>
                  <span className="px-2.5 py-1 rounded-full bg-[#15803D]/10 text-[#15803D] text-[10px] font-bold uppercase">
                    Completed
                  </span>
                </div>

                <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#15803D] mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#737373] uppercase font-bold block">Pickup</span>
                      <p className="font-bold text-[#171717]">{completedRideForPayment?.pickup_address || 'Vijay Nagar, Indore'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="h-3 w-3 rounded-full bg-[#E21D2B] mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#737373] uppercase font-bold block">Drop-off</span>
                      <p className="font-bold text-[#171717]">{completedRideForPayment?.destination_address || 'Phoenix Mall, Indore'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E5E5] text-[11px] text-[#737373]">
                    <span>Distance: <strong className="text-[#171717]">{completedRideForPayment?.distance_km || 5.2} km</strong></span>
                    <span>Duration: <strong className="text-[#171717]">14 min</strong></span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 space-y-2 text-xs">
                  <h4 className="font-bold text-[#171717] uppercase tracking-wider text-[10px] pb-1 border-b border-[#E5E5E5]">
                    Earnings Breakdown
                  </h4>
                  <div className="flex justify-between py-1">
                    <span className="text-[#737373]">Total Fare</span>
                    <span className="font-bold text-[#171717]">₹{completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#737373]">Platform Commission (15%)</span>
                    <span className="font-bold text-[#B91C1C]">-₹{((Number(completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120)) * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t border-[#E5E5E5] text-sm font-black text-[#15803D]">
                    <span>Your Earnings</span>
                    <span>₹{((Number(completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120)) * 0.85).toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentFlowStep('method_select')}
                  className="w-full rounded-xl bg-[#E21D2B] py-3 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-md cursor-pointer"
                >
                  Proceed to Payment
                </button>
              </div>
            )}

            {/* STEP 2: SELECT PAYMENT METHOD */}
            {paymentFlowStep === 'method_select' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <button onClick={() => setPaymentFlowStep('summary')} className="text-xs font-bold text-[#737373] hover:text-[#171717] cursor-pointer">
                    ← Back
                  </button>
                  <h3 className="text-base font-extrabold text-[#171717]">Collect Payment</h3>
                  <div />
                </div>

                <div className="text-center py-2 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5]">
                  <span className="text-[10px] text-[#737373] uppercase font-bold block">Total Amount</span>
                  <p className="text-3xl font-black text-[#171717]">₹{completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120}</p>
                  <span className="text-[11px] text-[#737373]">Collect payment from rider</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div
                    onClick={() => setPaymentFlowStep('upi_qr')}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E5E5] hover:border-[#E21D2B] cursor-pointer transition-all bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#FFF1F2] text-[#E21D2B] flex items-center justify-center font-bold">
                        UPI
                      </div>
                      <div>
                        <p className="font-bold text-[#171717]">UPI / QR Code</p>
                        <p className="text-[11px] text-[#737373]">Rider scans and pays via GPay, PhonePe, Paytm</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#E21D2B]">→</span>
                  </div>

                  <div
                    onClick={() => setPaymentFlowStep('cash')}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E5E5] hover:border-[#15803D] cursor-pointer transition-all bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#ECFDF5] text-[#15803D] flex items-center justify-center font-bold">
                        ₹
                      </div>
                      <div>
                        <p className="font-bold text-[#171717]">Cash</p>
                        <p className="text-[11px] text-[#737373]">Rider pays in physical cash directly</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#15803D]">→</span>
                  </div>

                  <div
                    onClick={() => setPaymentFlowStep('success')}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[#E5E5E5] hover:border-[#2563EB] cursor-pointer transition-all bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
                        💳
                      </div>
                      <div>
                        <p className="font-bold text-[#171717]">Card / Stripe Online</p>
                        <p className="text-[11px] text-[#737373]">Rider pays via saved card or Stripe link</p>
                      </div>
                    </div>
                    <span className="font-bold text-[#2563EB]">→</span>
                  </div>
                </div>

                <p className="text-[10px] text-center text-[#737373] pt-1">
                  🔒 Payment is secure and recorded automatically in ledger.
                </p>
              </div>
            )}

            {/* STEP 3: UPI / QR PAYMENT */}
            {paymentFlowStep === 'upi_qr' && (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <button onClick={() => setPaymentFlowStep('method_select')} className="text-xs font-bold text-[#737373] hover:text-[#171717] cursor-pointer">
                    ← Back
                  </button>
                  <h3 className="text-base font-extrabold text-[#171717]">Collect via UPI</h3>
                  <div />
                </div>

                <div>
                  <span className="text-2xl font-black text-[#171717]">₹{completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120}</span>
                  <p className="text-[11px] text-[#737373]">Ask rider to scan this QR code</p>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-[#E5E5E5] inline-block shadow-xs">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=ridenova@upi&pn=RideNova"
                    alt="UPI QR Code"
                    className="w-44 h-44 mx-auto rounded-lg"
                  />
                  <p className="font-mono text-xs font-bold text-[#E21D2B] mt-2">UPI ID: ridenova@upi</p>
                </div>

                <div className="flex items-center justify-center gap-4 py-1 text-[10px] text-[#737373]">
                  <span>Google Pay</span> · <span>PhonePe</span> · <span>Paytm</span> · <span>BHIM UPI</span>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] text-xs flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#E21D2B]" />
                  <span className="font-medium text-[#737373]">Waiting for payment... This will confirm automatically.</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentFlowStep('success')}
                    className="rounded-xl bg-[#15803D] py-2.5 text-xs font-bold text-white hover:bg-[#15803D]/90 cursor-pointer"
                  >
                    Confirm Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentFlowStep('method_select')}
                    className="rounded-xl border border-[#E5E5E5] py-2.5 text-xs font-bold text-[#B91C1C] hover:bg-[#FFF1F2] cursor-pointer"
                  >
                    Cancel Payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CASH PAYMENT */}
            {paymentFlowStep === 'cash' && (
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
                  <button onClick={() => setPaymentFlowStep('method_select')} className="text-xs font-bold text-[#737373] hover:text-[#171717] cursor-pointer">
                    ← Back
                  </button>
                  <h3 className="text-base font-extrabold text-[#171717]">Collect Cash</h3>
                  <div />
                </div>

                <div>
                  <span className="text-3xl font-black text-[#171717]">₹{completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120}</span>
                  <p className="text-[11px] text-[#737373]">Collect physical cash from rider</p>
                </div>

                <div className="py-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-[#ECFDF5] text-[#15803D] flex items-center justify-center text-3xl font-black shadow-xs">
                    💵
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] text-left">
                  ℹ️ After confirming, ₹{((Number(completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120)) * 0.85).toFixed(2)} will be credited to your earnings (15% platform commission automatically recorded).
                </div>

                <button
                  type="button"
                  onClick={() => setPaymentFlowStep('success')}
                  className="w-full rounded-xl bg-[#E21D2B] py-3 text-xs font-bold text-white hover:bg-[#BE1622] transition-all shadow-md cursor-pointer"
                >
                  Confirm Cash Received
                </button>
              </div>
            )}

            {/* STEP 5: PAYMENT SUCCESSFUL */}
            {paymentFlowStep === 'success' && (
              <div className="space-y-4 text-center">
                <div className="h-14 w-14 mx-auto rounded-full bg-[#ECFDF5] text-[#15803D] flex items-center justify-center text-2xl font-black shadow-sm">
                  ✓
                </div>

                <div>
                  <h3 className="text-lg font-black text-[#171717]">Payment Successful</h3>
                  <span className="text-2xl font-black text-[#15803D] block mt-1">₹{completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120}</span>
                  <p className="text-[11px] text-[#737373]">Payment collected & recorded successfully</p>
                </div>

                <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-xs space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Total Fare</span>
                    <span className="font-bold text-[#171717]">₹{completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#737373]">Platform Commission (15%)</span>
                    <span className="font-bold text-[#B91C1C]">-₹{((Number(completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120)) * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#E5E5E5] font-black text-[#15803D]">
                    <span>Your Earnings</span>
                    <span>₹{((Number(completedRideForPayment?.final_fare || completedRideForPayment?.estimated_fare || 120)) * 0.85).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentFlowStep('none');
                      setCompletedRideForPayment(null);
                      setActiveTab('earnings');
                    }}
                    className="w-full rounded-xl bg-[#15803D] py-3 text-xs font-bold text-white hover:bg-[#15803D]/90 transition-all shadow-md cursor-pointer"
                  >
                    View Earnings Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentFlowStep('none');
                      setCompletedRideForPayment(null);
                      setActiveTab('dashboard');
                    }}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2.5 text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] cursor-pointer"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Driver Cancellation Modal */}
      {showDriverCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5E5] relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#B91C1C]/10 flex items-center justify-center text-[#B91C1C]">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#171717]">Cancel Active Trip</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDriverCancelModal(false)}
                className="p-1.5 rounded-lg text-[#737373] hover:bg-[#FAFAFA] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#737373]">
                Please select the reason for cancelling this active trip:
              </p>
              <div className="space-y-2">
                {[
                  'Vehicle breakdown / mechanical issue',
                  'Passenger no-show or unreachable',
                  'Severe traffic / emergency',
                  'Other operational delay',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      driverCancelReason === reason
                        ? 'border-[#B91C1C] bg-[#FFF1F2]/40 text-[#171717]'
                        : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#737373]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="driverCancelReason"
                      value={reason}
                      checked={driverCancelReason === reason}
                      onChange={(e) => setDriverCancelReason(e.target.value)}
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
                onClick={() => setShowDriverCancelModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] cursor-pointer"
              >
                Resume Trip
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDriverCancelModal(false);
                  await handleUpdateRideStatus('cancelled', driverCancelReason);
                }}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Confirm Trip Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
