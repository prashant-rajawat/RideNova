import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  Navigation,
  CreditCard,
  Ticket,
  HelpCircle,
  BarChart3,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X,
  PauseCircle,
  PlayCircle,
  Plus,
  Download,
  Filter,
  Calendar,
  MapPin,
  Clock,
  Phone,
  Mail,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  Eye,
  UserPlus,
  Copy,
  ExternalLink,
  FileCheck,
  ShieldAlert,
  HeartPulse,
} from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { DashboardLayout } from '../layout/DashboardLayout.tsx';
import {
  AdminOverviewData,
  AdminDriver,
  RideWithStops,
  Payment,
  SupportTicket,
  PromoCode,
} from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { PromoManagement } from '../admin/PromoManagement.tsx';

interface AdminDashboardProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'drivers'
    | 'rides'
    | 'payments'
    | 'support'
    | 'promos'
    | 'riders'
    | 'payment_settings'
    | 'commission_settings'
  >('overview');

  // Admin dataset states
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [rides, setRides] = useState<RideWithStops[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<any>({
    upi_id: 'ridenova@okhdfcbank',
    upi_qr_url: '',
    commission_type: 'percentage',
    commission_value: 15,
    stripe_enabled: true,
    manual_upi_enabled: true,
  });
  const [commissionSettings, setCommissionSettings] = useState<any>({
    platform_commission_percentage: 15,
    fixed_platform_fee: 0,
    base_fare: 70,
    per_km_charge: 12,
    per_minute_charge: 1.5,
    waiting_charge_per_min: 2,
    cancellation_fee: 50,
    tax_percentage: 5,
  });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [sampleFare, setSampleFare] = useState<number>(500);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Filter states
  const [rideStatusFilter, setRideStatusFilter] = useState<string>('all');
  const [rideCategoryFilter, setRideCategoryFilter] = useState<string>('all');
  const [rideDateFilter, setRideDateFilter] = useState<string>('all');
  const [rideSortBy, setRideSortBy] = useState<'newest' | 'oldest' | 'fare_high' | 'fare_low' | 'distance'>('newest');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRide, setSelectedRide] = useState<RideWithStops | null>(null);
  const [isRideModalOpen, setIsRideModalOpen] = useState(false);

  // Driver Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [rideToAssign, setRideToAssign] = useState<RideWithStops | null>(null);
  const [selectedDriverIdForAssign, setSelectedDriverIdForAssign] = useState<string>('');

  // Rider Profile Modal
  const [selectedRiderDetails, setSelectedRiderDetails] = useState<any | null>(null);
  const [isRiderModalOpen, setIsRiderModalOpen] = useState(false);
  const [loadingRiderProfile, setLoadingRiderProfile] = useState(false);
  const [riderSearchQuery, setRiderSearchQuery] = useState('');

  // Driver Profile Modal
  const [selectedDriverDetails, setSelectedDriverDetails] = useState<any | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [loadingDriverProfile, setLoadingDriverProfile] = useState(false);

  const handleOpenDriverProfile = async (driverId: string) => {
    setIsDriverModalOpen(true);
    setLoadingDriverProfile(true);
    setSelectedDriverDetails(null);
    try {
      const res = await api.getAdminDriverProfile(driverId);
      if (res.success && res.data) {
        setSelectedDriverDetails(res.data);
      } else {
        showError('Could not load driver partner details.');
      }
    } catch (err: any) {
      showError(err.message || 'Error loading driver partner details.');
    } finally {
      setLoadingDriverProfile(false);
    }
  };

  const handleOpenAssignModal = (ride: RideWithStops) => {
    setRideToAssign(ride);
    setSelectedDriverIdForAssign(ride.driver_id || '');
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignDriver = async () => {
    if (!rideToAssign || !selectedDriverIdForAssign) return;
    setActionLoading(true);
    try {
      const res = await api.adminAssignDriver(rideToAssign.id, selectedDriverIdForAssign);
      if (res.success && res.data) {
        showSuccess('Driver partner assigned successfully.');
        setRides((prev) => prev.map((r) => (r.id === rideToAssign.id ? res.data : r)));
        if (selectedRide?.id === rideToAssign.id) {
          setSelectedRide(res.data);
        }
        setIsAssignModalOpen(false);
        setRideToAssign(null);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to assign driver.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCancelRide = async (rideId: string) => {
    const reason = window.prompt('Enter cancellation reason for this ride:');
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await api.cancelRide(rideId, reason);
      if (res.success) {
        showSuccess('Ride cancelled successfully.');
        setRides((prev) =>
          prev.map((r) => (r.id === rideId ? { ...r, status: 'cancelled', cancellation_reason: reason } : r))
        );
        if (selectedRide?.id === rideId) {
          setSelectedRide((prev) => (prev ? { ...prev, status: 'cancelled', cancellation_reason: reason } : null));
        }
      }
    } catch (err: any) {
      showError(err.message || 'Failed to cancel ride.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyRideRef = (ref: string) => {
    try {
      navigator.clipboard?.writeText(ref);
      showSuccess(`Copied "${ref}" to clipboard`);
    } catch {
      // ignore
    }
  };

  const handleExportRidesCsv = () => {
    if (rides.length === 0) {
      showError('No rides records available to export.');
      return;
    }
    const headers = [
      'Ride Reference',
      'Ride ID',
      'Rider Name',
      'Rider Email',
      'Rider Phone',
      'Driver Name',
      'Vehicle Plate',
      'Category',
      'Status',
      'Pickup Address',
      'Destination Address',
      'Distance (km)',
      'Duration (mins)',
      'Estimated Fare (INR)',
      'Final Fare (INR)',
      'Platform Commission (INR)',
      'Driver Net (INR)',
      'Payment Method',
      'Payment Status',
      'Booked Date',
    ];

    const rows = filteredRides.map((r) => {
      const gross = Number(r.final_fare || r.estimated_fare || 0);
      const fee = Number((gross * 0.15).toFixed(2));
      const net = Number((gross * 0.85).toFixed(2));
      return [
        `"${r.reference_id || ''}"`,
        `"${r.id}"`,
        `"${r.rider?.name || 'Customer'}"`,
        `"${r.rider?.email || ''}"`,
        `"${r.rider?.phone || ''}"`,
        `"${r.driver?.name || 'Unassigned'}"`,
        `"${r.driver?.vehicle?.registration_number || ''}"`,
        `"${r.ride_type.toUpperCase()}"`,
        `"${r.status.toUpperCase()}"`,
        `"${(r.pickup_address || '').replace(/"/g, '""')}"`,
        `"${(r.destination_address || '').replace(/"/g, '""')}"`,
        r.distance_km || 0,
        r.estimated_duration_minutes || 0,
        r.estimated_fare || 0,
        r.final_fare || r.estimated_fare || 0,
        fee,
        net,
        `"${r.payment?.payment_method || 'Unpaid'}"`,
        `"${r.payment?.status || (r.status === 'ride_completed' ? 'pending' : 'unpaid')}"`,
        `"${new Date(r.created_at).toISOString()}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ridenova-rides-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess(`Exported ${filteredRides.length} rides report successfully.`);
  };

  // Create promo modal
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 20,
    minimum_fare: 100,
    maximum_discount: 100,
    usage_limit: 100,
  });

  const showSuccess = (text: string) => {
    setStatusMessage({ type: 'success', text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const showError = (text: string) => {
    setStatusMessage({ type: 'error', text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleOpenRiderProfile = async (riderId: string) => {
    setIsRiderModalOpen(true);
    setLoadingRiderProfile(true);
    setSelectedRiderDetails(null);
    try {
      const res = await api.getAdminRiderProfile(riderId);
      if (res.success && res.data) {
        setSelectedRiderDetails(res.data);
      } else {
        showError('Could not load customer details.');
      }
    } catch (err: any) {
      showError(err.message || 'Error loading customer details.');
    } finally {
      setLoadingRiderProfile(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        overviewRes,
        driversRes,
        ridesRes,
        paymentsRes,
        ticketsRes,
        promosRes,
        ridersRes,
        paySettingsRes,
        commSettingsRes,
        payMethodsRes,
        diagnosticsRes,
      ] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getAdminDrivers().catch(() => ({ data: [] })),
        api.getAdminRides().catch(() => ({ data: [] })),
        api.getAdminPayments().catch(() => ({ data: [] })),
        api.getSupportTickets().catch(() => ({ data: [] })),
        api.getPromos().catch(() => ({ data: [] })),
        api.getAdminRiders().catch(() => ({ data: [] })),
        api.getPaymentSettings().catch(() => ({ data: null })),
        api.getCommissionSettings().catch(() => ({ data: null })),
        api.getAdminPaymentMethods().catch(() => ({ data: [] })),
        api.getAdminDiagnostics().catch(() => ({ data: null })),
      ]);

      if (overviewRes?.data) setOverview(overviewRes.data);
      if (driversRes?.data) setDrivers(driversRes.data);
      if (ridesRes?.data) setRides(ridesRes.data);
      if (paymentsRes?.data) setPayments(paymentsRes.data);
      if (ticketsRes?.data) setTickets(ticketsRes.data);
      if (promosRes?.data) setPromos(promosRes.data);
      if (ridersRes?.data) setRiders(ridersRes.data);
      if (paySettingsRes?.data) setPaymentSettings(paySettingsRes.data);
      if (commSettingsRes?.data) setCommissionSettings(commSettingsRes.data);
      if (payMethodsRes?.data) setPaymentMethods(payMethodsRes.data);
      if (diagnosticsRes?.data) setDiagnostics(diagnosticsRes.data);
    } catch (err: any) {
      showError(err.message || 'Failed to sync admin management records');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.updatePaymentSettings(paymentSettings);
      if (res.success) {
        showSuccess('Payment settings updated successfully.');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update payment settings.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCommissionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.updateCommissionSettings(commissionSettings);
      if (res.success) {
        showSuccess('Commission & fare rules updated successfully.');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update commission rules.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment method? Historical transactions will be preserved.')) return;
    setActionLoading(true);
    try {
      await api.deletePaymentMethod(id);
      setPaymentMethods(paymentMethods.filter((m) => m.id !== id));
      showSuccess('Payment method deleted successfully.');
    } catch (err: any) {
      showError(err.message || 'Failed to delete payment method.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Update Driver status (Approve, Suspend, Activate)
  const handleUpdateDriverStatus = async (driverId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await api.updateAdminDriverStatus(driverId, newStatus);
      if (res.success) {
        showSuccess(`Driver status updated to '${newStatus}'.`);
        setDrivers((prev) =>
          prev.map((d) => (d.id === driverId ? { ...d, status: newStatus as any } : d))
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update driver status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Support Ticket status
  const handleUpdateTicketStatus = async (ticketId: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await api.updateSupportTicketStatus(ticketId, status);
      if (res.success) {
        showSuccess(`Support ticket status marked '${status}'.`);
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, status: status as any } : t))
        );
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Promo code
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createPromo(promoForm);
      if (res.success) {
        showSuccess(`Promo code '${promoForm.code}' published successfully!`);
        setIsPromoModalOpen(false);
        setPromoForm({
          code: '',
          discount_type: 'percentage',
          discount_value: 20,
          minimum_fare: 100,
          maximum_discount: 100,
          usage_limit: 100,
        });
        fetchAdminData();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to create promo code.');
    } finally {
      setActionLoading(false);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'drivers', label: 'Driver Partners', icon: Car, badge: drivers.length },
    { id: 'rides', label: 'All Rides', icon: Navigation, badge: rides.length },
    { id: 'payments', label: 'Payments Ledger', icon: CreditCard },
    { id: 'payment_settings', label: 'Payment Settings', icon: CreditCard },
    { id: 'commission_settings', label: 'Commission & Fares', icon: Settings },
    {
      id: 'support',
      label: 'Support Tickets',
      icon: HelpCircle,
      badge: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length || undefined,
    },
    { id: 'promos', label: 'Promo Codes', icon: Ticket, badge: promos.length },
    { id: 'riders', label: 'Customer Management', icon: Users, badge: riders.length },
  ];

  const filteredRides = rides
    .filter((r) => {
      // 1. Status Filter
      if (rideStatusFilter !== 'all' && r.status !== rideStatusFilter) return false;

      // 2. Category Filter
      if (rideCategoryFilter !== 'all' && r.ride_type !== rideCategoryFilter) return false;

      // 3. Date Filter
      if (rideDateFilter !== 'all') {
        const rideDate = new Date(r.created_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (rideDateFilter === 'today' && now - rideDate > oneDay) return false;
        if (rideDateFilter === 'week' && now - rideDate > 7 * oneDay) return false;
        if (rideDateFilter === 'month' && now - rideDate > 30 * oneDay) return false;
      }

      // 4. Comprehensive Search Query
      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const matchId = (r.id || '').toLowerCase().includes(q);
        const matchRef = (r.reference_id || '').toLowerCase().includes(q);
        const matchPickup = (r.pickup_address || '').toLowerCase().includes(q);
        const matchDest = (r.destination_address || '').toLowerCase().includes(q);
        const matchRiderName = (r.rider?.name || '').toLowerCase().includes(q);
        const matchRiderEmail = (r.rider?.email || '').toLowerCase().includes(q);
        const matchRiderPhone = (r.rider?.phone || '').toLowerCase().includes(q);
        const matchDriverName = (r.driver?.name || '').toLowerCase().includes(q);
        const matchVehiclePlate = (r.driver?.vehicle?.registration_number || '').toLowerCase().includes(q);

        return (
          matchId ||
          matchRef ||
          matchPickup ||
          matchDest ||
          matchRiderName ||
          matchRiderEmail ||
          matchRiderPhone ||
          matchDriverName ||
          matchVehiclePlate
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (rideSortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (rideSortBy === 'fare_high') {
        const fareA = Number(a.final_fare || a.estimated_fare || 0);
        const fareB = Number(b.final_fare || b.estimated_fare || 0);
        return fareB - fareA;
      }
      if (rideSortBy === 'fare_low') {
        const fareA = Number(a.final_fare || a.estimated_fare || 0);
        const fareB = Number(b.final_fare || b.estimated_fare || 0);
        return fareA - fareB;
      }
      if (rideSortBy === 'distance') {
        return Number(b.distance_km || 0) - Number(a.distance_km || 0);
      }
      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <DashboardLayout
      role="ADMIN"
      navItems={navItems}
      activeTab={activeTab}
      setActiveTab={(tab) => setActiveTab(tab as typeof activeTab)}
      user={user}
      logout={logout}
    >
      {/* Top Banner */}
      <div className="pb-4 border-b border-brand-border flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-text">Operations Center</h1>
          <p className="text-xs text-brand-muted">RideNova Admin</p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-white hover:bg-brand-card-hover text-xs font-semibold text-brand-text transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-brand-primary ${loading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="mt-4 space-y-4">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-brand-muted">Total Users</span>
              <p className="text-lg font-black text-brand-text">{overview?.totalUsers ?? (riders.length + drivers.length)}</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-brand-muted">Active Drivers</span>
              <p className="text-lg font-black text-brand-success">{overview?.activeDrivers ?? drivers.filter(d => d.is_online).length}</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-brand-muted">Total Rides</span>
              <p className="text-lg font-black text-brand-text">{overview?.totalRides ?? rides.length}</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-brand-muted">Gross Volume</span>
              <p className="text-lg font-black text-brand-text">₹{Number(overview?.totalRevenue || 0).toFixed(0)}</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-brand-muted">Fees (15%)</span>
              <p className="text-lg font-black text-brand-primary">₹{Number(overview?.platformFeeTotal || 0).toFixed(0)}</p>
            </div>

            <div className="rounded-lg border border-brand-border bg-white p-3 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-brand-muted">Tickets</span>
              <p className="text-lg font-black text-brand-warning">
                {tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length}
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('drivers')}
              className="cursor-pointer rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm hover:border-[#E21D2B] transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <h3 className="text-sm font-bold text-[#171717]">Driver Verification</h3>
                <Car className="h-4 w-4 text-[#E21D2B]" />
              </div>
              <p className="mt-2 text-xs text-[#737373]">
                {drivers.filter((d) => d.status === 'pending').length} driver applications awaiting verification and background check.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('support')}
              className="cursor-pointer rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm hover:border-[#E21D2B] transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <h3 className="text-sm font-bold text-[#171717]">Support Queue</h3>
                <HelpCircle className="h-4 w-4 text-[#B45309]" />
              </div>
              <p className="mt-2 text-xs text-[#737373]">
                {tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length} urgent grievance tickets requiring administrative action.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('payments')}
              className="cursor-pointer rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm hover:border-[#E21D2B] transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                <h3 className="text-sm font-bold text-[#171717]">Payment Settlements</h3>
                <CreditCard className="h-4 w-4 text-[#15803D]" />
              </div>
              <p className="mt-2 text-xs text-[#737373]">
                Audit all Stripe test-mode payments and automated driver earnings splits.
              </p>
            </div>
          </div>

          {/* Recent Rides Table */}
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-bold text-[#171717]">Live Ride Activity</h3>
              <button
                onClick={() => setActiveTab('rides')}
                className="text-xs text-[#E21D2B] font-semibold hover:underline"
              >
                Inspect All Rides ({rides.length})
              </button>
            </div>

            <div className="mt-3 divide-y divide-[#E5E5E5]">
              {rides.slice(0, 6).map((ride) => (
                <div key={ride.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#E21D2B]">
                        {ride.reference_id || ride.id.slice(0, 8)}
                      </span>
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
                    </div>
                    <p className="text-[#171717] font-medium">
                      {ride.pickup_address} → {ride.destination_address}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="font-black text-sm text-[#171717]">₹{ride.final_fare || ride.estimated_fare}</span>
                    <span className="text-[10px] text-[#737373] block">{ride.ride_type.toUpperCase()} · {ride.distance_km} km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVERS FLEET */}
      {activeTab === 'drivers' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Driver Partners Registry ({drivers.length})</h2>
              <p className="text-xs text-[#737373]">
                Approve licenses, monitor vehicle assignments, and manage operational status.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3.5">Driver Name</th>
                    <th className="p-3.5">License No.</th>
                    <th className="p-3.5">Vehicle Fleet</th>
                    <th className="p-3.5">Rating</th>
                    <th className="p-3.5">Online</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {drivers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-[#737373]">
                        No drivers registered in database yet.
                      </td>
                    </tr>
                  ) : (
                    drivers.map((d) => (
                      <tr key={d.id} className="hover:bg-[#FAFAFA]/70">
                        <td className="p-3.5">
                          <p className="font-bold text-[#171717]">{d.name}</p>
                          <p className="text-[11px] text-[#737373]">{d.email}</p>
                          {d.phone && <p className="text-[10px] text-[#737373] font-mono">{d.phone}</p>}
                        </td>

                        <td className="p-3.5 font-mono uppercase font-semibold text-[#171717]">
                          {d.license_number}
                        </td>

                        <td className="p-3.5">
                          {d.make ? (
                            <div>
                              <span className="font-semibold text-[#171717]">
                                {d.make} {d.model} ({d.color})
                              </span>
                              <span className="block font-mono text-[10px] text-[#E21D2B] uppercase">
                                {d.registration_number} · {d.vehicle_type}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#737373] italic">No vehicle assigned</span>
                          )}
                        </td>

                        <td className="p-3.5 font-bold text-[#171717]">
                          ★ {Number(d.rating).toFixed(1)} ({d.total_rides} trips)
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.is_online
                                ? 'bg-[#15803D]/10 text-[#15803D]'
                                : 'bg-[#737373]/10 text-[#737373]'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${d.is_online ? 'bg-[#15803D]' : 'bg-[#737373]'}`} />
                            {d.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              d.status === 'active' || d.status === 'approved'
                                ? 'bg-[#15803D]/10 text-[#15803D]'
                                : d.status === 'suspended'
                                ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                                : 'bg-[#B45309]/10 text-[#B45309]'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDriverProfile(d.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E5E5E5] bg-white text-[#171717] hover:bg-[#FAFAFA] hover:border-[#E21D2B] font-bold text-[11px] shadow-xs"
                          >
                            <Eye className="h-3 w-3 text-[#E21D2B]" />
                            <span>Profile</span>
                          </button>
                          {d.status !== 'approved' && d.status !== 'active' && (
                            <button
                              onClick={() => handleUpdateDriverStatus(d.id, 'approved')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded bg-[#15803D] text-white font-bold text-[11px] hover:bg-[#15803D]/90"
                            >
                              Approve
                            </button>
                          )}
                          {d.status !== 'suspended' && (
                            <button
                              onClick={() => handleUpdateDriverStatus(d.id, 'suspended')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10 font-bold text-[11px]"
                            >
                              Suspend
                            </button>
                          )}
                          {d.status === 'suspended' && (
                            <button
                              onClick={() => handleUpdateDriverStatus(d.id, 'active')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded bg-[#15803D] text-white font-bold text-[11px]"
                            >
                              Activate
                            </button>
                          )}
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

      {/* TAB 3: ALL RIDES (COMPLETE RIDE MANAGEMENT) */}
      {activeTab === 'rides' && (
        <div className="mt-6 space-y-6">
          {/* Header & Primary Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#171717]">Platform Trips Monitor</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#E21D2B]/10 text-[#E21D2B] border border-[#E21D2B]/20">
                  {rides.length} {rides.length === 1 ? 'Trip' : 'Trips'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#15803D] animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                Authoritative overview of customer booking requests, active journeys, route waypoints, and driver assignments.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportRidesCsv}
                disabled={rides.length === 0}
                className="px-3 py-1.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Download CSV report of platform rides"
              >
                <Download className="h-3.5 w-3.5 text-[#737373]" />
                Export CSV
              </button>

              <button
                onClick={fetchAdminData}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] transition-all flex items-center gap-1.5 shadow-2xs"
                title="Refresh rides data from server"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#737373] ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => onNavigate('book-ride')}
                className="px-3 py-1.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#E21D2B]/90 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Car className="h-3.5 w-3.5" />
                Book Ride
              </button>
            </div>
          </div>

          {/* Metrics Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#737373] uppercase font-bold block">Total Platform Trips</span>
              <p className="text-lg font-black text-[#171717]">{rides.length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#B45309] uppercase font-bold block">Requested</span>
              <p className="text-lg font-black text-[#B45309]">{rides.filter((r) => r.status === 'requested').length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#2563EB] uppercase font-bold block">Accepted / Assigned</span>
              <p className="text-lg font-black text-[#2563EB]">{rides.filter((r) => r.status === 'accepted').length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#0284C7] uppercase font-bold block">In Transit</span>
              <p className="text-lg font-black text-[#0284C7]">
                {rides.filter((r) => ['driver_arriving', 'driver_arrived', 'ride_started'].includes(r.status)).length}
              </p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#15803D] uppercase font-bold block">Completed</span>
              <p className="text-lg font-black text-[#15803D]">{rides.filter((r) => r.status === 'ride_completed').length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#B91C1C] uppercase font-bold block">Cancelled</span>
              <p className="text-lg font-black text-[#B91C1C]">{rides.filter((r) => r.status === 'cancelled').length}</p>
            </div>
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-3.5 shadow-xs space-y-1">
              <span className="text-[10px] text-[#15803D] uppercase font-bold block">Gross Volume</span>
              <p className="text-lg font-black text-[#15803D]">
                ₹
                {rides
                  .filter((r) => r.status === 'ride_completed')
                  .reduce((acc, r) => acc + Number(r.final_fare || r.estimated_fare || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>

          {/* Filter Pills (Status Bar) */}
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            {[
              { id: 'all', label: 'All Trips', count: rides.length },
              { id: 'requested', label: 'Requested', count: rides.filter((r) => r.status === 'requested').length },
              { id: 'accepted', label: 'Accepted', count: rides.filter((r) => r.status === 'accepted').length },
              {
                id: 'driver_arriving',
                label: 'Arriving',
                count: rides.filter((r) => r.status === 'driver_arriving').length,
              },
              {
                id: 'ride_started',
                label: 'In Progress',
                count: rides.filter((r) => r.status === 'ride_started').length,
              },
              {
                id: 'ride_completed',
                label: 'Completed',
                count: rides.filter((r) => r.status === 'ride_completed').length,
              },
              { id: 'cancelled', label: 'Cancelled', count: rides.filter((r) => r.status === 'cancelled').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRideStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  rideStatusFilter === tab.id
                    ? 'bg-[#171717] text-white shadow-2xs'
                    : 'bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373] hover:text-[#171717] hover:bg-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    rideStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#E5E5E5] text-[#171717]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Secondary Filter Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                placeholder="Search by Reference ID, customer, driver, address, plate..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] bg-white pl-9 pr-8 py-2 text-xs text-[#171717] placeholder:text-[#737373] focus:border-[#E21D2B] focus:outline-none shadow-2xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-[#737373] hover:text-[#171717]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={rideCategoryFilter}
                onChange={(e) => setRideCategoryFilter(e.target.value)}
                className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none shadow-2xs"
              >
                <option value="all">All Vehicle Classes</option>
                <option value="economy">Economy</option>
                <option value="comfort">Comfort</option>
                <option value="premium">Premium</option>
              </select>

              {/* Date Filter */}
              <select
                value={rideDateFilter}
                onChange={(e) => setRideDateFilter(e.target.value)}
                className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none shadow-2xs"
              >
                <option value="all">All Time</option>
                <option value="today">Past 24 Hours</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>

              {/* Sort By */}
              <select
                value={rideSortBy}
                onChange={(e) => setRideSortBy(e.target.value as any)}
                className="rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none shadow-2xs"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="fare_high">Fare: High to Low</option>
                <option value="fare_low">Fare: Low to High</option>
                <option value="distance">Longest Distance</option>
              </select>

              {(searchTerm || rideStatusFilter !== 'all' || rideCategoryFilter !== 'all' || rideDateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setRideStatusFilter('all');
                    setRideCategoryFilter('all');
                    setRideDateFilter('all');
                  }}
                  className="px-2.5 py-2 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-[#E21D2B] hover:bg-[#E21D2B]/5 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Rides Content: True Empty vs Filter Empty vs Data Table */}
          {rides.length === 0 ? (
            /* True Empty State (Database has no records yet) */
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E21D2B]/10 text-[#E21D2B] mb-4">
                <Navigation className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-[#171717]">No Platform Trips in Database Yet</h3>
              <p className="mt-2 text-xs text-[#737373] max-w-md mx-auto leading-relaxed">
                Customer ride requests made through the RideNova booking interface or APIs are tracked here in real-time.
                Once customers initiate booking requests, you will be able to audit waypoints, dispatch drivers, and monitor payments.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => onNavigate('book-ride')}
                  className="px-4 py-2 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#E21D2B]/90 transition-all flex items-center gap-2 shadow-xs"
                >
                  <Car className="h-4 w-4" /> Book a Journey
                </button>
                <button
                  onClick={fetchAdminData}
                  className="px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] transition-all flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4 text-[#737373]" /> Refresh Records
                </button>
              </div>
            </div>
          ) : filteredRides.length === 0 ? (
            /* Filter Empty State (Records exist, but filter criteria produced 0) */
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-12 text-center shadow-xs">
              <Search className="mx-auto h-10 w-10 text-[#737373] mb-3 opacity-60" />
              <h3 className="text-base font-bold text-[#171717]">No Trips Match Your Filter Criteria</h3>
              <p className="mt-1 text-xs text-[#737373] max-w-md mx-auto">
                No rides matched the selected status (<strong className="uppercase">{rideStatusFilter}</strong>),
                category, or search string "{searchTerm}".
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRideStatusFilter('all');
                  setRideCategoryFilter('all');
                  setRideDateFilter('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#E21D2B] hover:bg-[#E21D2B]/5 transition-all"
              >
                Clear All Filters ({rides.length} Total Trips)
              </button>
            </div>
          ) : (
            /* Rides Table (Desktop) & Cards (Mobile) */
            <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-xs">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3.5">Ride Ref</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Assigned Driver</th>
                      <th className="p-3.5">Route & Waypoints</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Fare & Pay</th>
                      <th className="p-3.5">Booked At</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {filteredRides.map((r) => {
                      const displayRef = r.reference_id || `RN-${r.id.slice(0, 8).toUpperCase()}`;
                      const isComplete = r.status === 'ride_completed';
                      const isCancelled = r.status === 'cancelled';
                      const isActive = ['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(
                        r.status
                      );

                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-[#FAFAFA]/70 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedRide(r);
                            setIsRideModalOpen(true);
                          }}
                        >
                          {/* Ref ID */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#E21D2B] text-xs hover:underline">
                                {displayRef}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyRideRef(displayRef);
                                }}
                                className="text-[#737373] hover:text-[#171717]"
                                title="Copy reference"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="text-[10px] text-[#737373] font-mono block">{r.id.slice(0, 8)}...</span>
                          </td>

                          {/* Customer */}
                          <td className="p-3.5">
                            <p className="font-bold text-[#171717]">{r.rider?.name || 'Customer'}</p>
                            <p className="text-[11px] text-[#737373]">{r.rider?.email || 'Registered Rider'}</p>
                            {r.rider?.phone && (
                              <p className="text-[10px] text-[#737373] font-mono flex items-center gap-1 mt-0.5">
                                <Phone className="h-2.5 w-2.5" /> {r.rider.phone}
                              </p>
                            )}
                          </td>

                          {/* Assigned Driver */}
                          <td className="p-3.5">
                            {r.driver ? (
                              <div>
                                <p className="font-bold text-[#171717] flex items-center gap-1">
                                  {r.driver.name}
                                  <span className="text-[10px] text-[#B45309] font-normal">
                                    ★ {Number(r.driver.rating).toFixed(1)}
                                  </span>
                                </p>
                                {r.driver.vehicle ? (
                                  <span className="block text-[10px] text-[#E21D2B] font-mono font-semibold uppercase">
                                    {r.driver.vehicle.make} {r.driver.vehicle.model} · {r.driver.vehicle.registration_number}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#737373]">Vehicle linked</span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#B45309]/10 text-[#B45309]">
                                Unassigned
                              </span>
                            )}
                          </td>

                          {/* Route */}
                          <td className="p-3.5 max-w-xs">
                            <p className="truncate text-[#171717] font-medium" title={r.pickup_address}>
                              <span className="text-[#15803D] font-bold">●</span> {r.pickup_address}
                            </p>
                            <p className="truncate text-[#737373] mt-0.5" title={r.destination_address}>
                              <span className="text-[#E21D2B] font-bold">■</span> {r.destination_address}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-[#737373]">
                              <span>{Number(r.distance_km || 0).toFixed(1)} km</span>
                              <span>·</span>
                              <span>~{r.estimated_duration_minutes || 0} mins</span>
                              {r.stops && r.stops.length > 0 && (
                                <span className="text-[#E21D2B] font-semibold">
                                  · {r.stops.length} {r.stops.length === 1 ? 'Stop' : 'Stops'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                r.ride_type === 'premium'
                                  ? 'bg-[#171717] text-white'
                                  : r.ride_type === 'comfort'
                                  ? 'bg-[#2563EB]/10 text-[#2563EB]'
                                  : 'bg-[#737373]/10 text-[#171717]'
                              }`}
                            >
                              {r.ride_type}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold inline-block ${
                                isComplete
                                  ? 'bg-[#15803D]/10 text-[#15803D]'
                                  : isCancelled
                                  ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                                  : r.status === 'requested'
                                  ? 'bg-[#B45309]/10 text-[#B45309]'
                                  : 'bg-[#2563EB]/10 text-[#2563EB]'
                              }`}
                            >
                              {r.status.replace(/_/g, ' ')}
                            </span>
                          </td>

                          {/* Fare & Pay */}
                          <td className="p-3.5">
                            <p className="font-black text-[#171717] text-sm">₹{r.final_fare || r.estimated_fare}</p>
                            <span
                              className={`text-[10px] font-semibold block ${
                                r.payment?.status === 'succeeded' || isComplete
                                  ? 'text-[#15803D]'
                                  : isCancelled
                                  ? 'text-[#737373]'
                                  : 'text-[#B45309]'
                              }`}
                            >
                              {r.payment?.status === 'succeeded'
                                ? '✓ Paid'
                                : isComplete
                                ? 'Settled'
                                : isCancelled
                                ? 'Void'
                                : 'Pending'}
                            </span>
                          </td>

                          {/* Booked Timestamp */}
                          <td className="p-3.5 text-[#737373] text-[11px] whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                            <span className="block text-[10px] text-[#737373]">
                              {new Date(r.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setSelectedRide(r);
                                setIsRideModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-[#171717] text-white font-bold text-[11px] hover:bg-[#171717]/90 transition-all"
                            >
                              Inspect
                            </button>

                            {['requested', 'accepted'].includes(r.status) && (
                              <button
                                onClick={() => handleOpenAssignModal(r)}
                                className="px-2.5 py-1 rounded border border-[#E5E5E5] text-[#171717] hover:bg-[#FAFAFA] font-bold text-[11px]"
                              >
                                {r.driver_id ? 'Reassign' : 'Assign'}
                              </button>
                            )}

                            {isActive && (
                              <button
                                onClick={() => handleAdminCancelRide(r.id)}
                                className="px-2.5 py-1 rounded border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10 font-bold text-[11px]"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="lg:hidden divide-y divide-[#E5E5E5]">
                {filteredRides.map((r) => {
                  const displayRef = r.reference_id || `RN-${r.id.slice(0, 8).toUpperCase()}`;
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRide(r);
                        setIsRideModalOpen(true);
                      }}
                      className="p-4 space-y-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#E21D2B] text-xs">{displayRef}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            r.status === 'ride_completed'
                              ? 'bg-[#15803D]/10 text-[#15803D]'
                              : r.status === 'cancelled'
                              ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                              : 'bg-[#B45309]/10 text-[#B45309]'
                          }`}
                        >
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-[#171717]">
                          <span className="text-[#15803D]">●</span> {r.pickup_address}
                        </p>
                        <p className="text-[#737373]">
                          <span className="text-[#E21D2B]">■</span> {r.destination_address}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E5E5]">
                        <div>
                          <p className="font-bold text-[#171717]">{r.rider?.name || 'Customer'}</p>
                          <span className="text-[10px] text-[#737373] block">
                            Driver: {r.driver?.name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-sm text-[#171717]">
                            ₹{r.final_fare || r.estimated_fare}
                          </span>
                          <span className="text-[10px] text-[#737373] block uppercase font-semibold">
                            {r.ride_type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedRide(r);
                            setIsRideModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-[#171717] text-white font-bold text-[11px]"
                        >
                          Inspect
                        </button>
                        {['requested', 'accepted'].includes(r.status) && (
                          <button
                            onClick={() => handleOpenAssignModal(r)}
                            className="px-2.5 py-1 rounded border border-[#E5E5E5] text-[#171717] font-bold text-[11px]"
                          >
                            Assign
                          </button>
                        )}
                        {['requested', 'accepted', 'driver_arriving'].includes(r.status) && (
                          <button
                            onClick={() => handleAdminCancelRide(r.id)}
                            className="px-2.5 py-1 rounded border border-[#B91C1C]/30 text-[#B91C1C] font-bold text-[11px]"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPREHENSIVE TRIP INSPECTOR & AUDIT MODAL */}
      {isRideModalOpen && selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-[#E21D2B]">
                  {selectedRide.reference_id || `RN-${selectedRide.id.slice(0, 8).toUpperCase()}`}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    selectedRide.status === 'ride_completed'
                      ? 'bg-[#15803D]/10 text-[#15803D]'
                      : selectedRide.status === 'cancelled'
                      ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                      : 'bg-[#B45309]/10 text-[#B45309]'
                  }`}
                >
                  {selectedRide.status.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={() => setIsRideModalOpen(false)}
                className="h-8 w-8 rounded-full border border-[#E5E5E5] flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA]"
              >
                ✕
              </button>
            </div>

            {/* Journey Audit Progress Timeline */}
            <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
              <span className="text-[10px] text-[#737373] uppercase font-bold block">Journey Audit Progression</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-[#E5E5E5]">
                  <span className="text-[9px] text-[#737373] uppercase block font-semibold">1. Requested</span>
                  <p className="font-bold text-[#171717]">
                    {new Date(selectedRide.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#E5E5E5]">
                  <span className="text-[9px] text-[#737373] uppercase block font-semibold">2. Assigned</span>
                  <p className="font-bold text-[#171717]">
                    {selectedRide.driver ? selectedRide.driver.name.split(' ')[0] : 'Pending'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#E5E5E5]">
                  <span className="text-[9px] text-[#737373] uppercase block font-semibold">3. Started</span>
                  <p className="font-bold text-[#171717]">
                    {selectedRide.started_at
                      ? new Date(selectedRide.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : selectedRide.status === 'ride_completed'
                      ? 'Completed'
                      : 'Not Started'}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#E5E5E5]">
                  <span className="text-[9px] text-[#737373] uppercase block font-semibold">4. Completed / Closed</span>
                  <p className="font-bold text-[#171717]">
                    {selectedRide.completed_at
                      ? new Date(selectedRide.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : selectedRide.cancelled_at
                      ? 'Cancelled'
                      : 'Active'}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer & Driver Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Customer */}
              <div className="rounded-xl border border-[#E5E5E5] p-4 bg-white space-y-2">
                <span className="text-[10px] text-[#737373] uppercase font-bold block flex items-center gap-1">
                  <Users className="h-3 w-3 text-[#E21D2B]" /> Customer Profile
                </span>
                <p className="font-bold text-[#171717] text-sm">{selectedRide.rider?.name || 'Customer'}</p>
                <p className="text-[#737373]">{selectedRide.rider?.email || 'customer@ridenova.com'}</p>
                {selectedRide.rider?.phone && (
                  <p className="text-[#737373] font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {selectedRide.rider.phone}
                  </p>
                )}
                <span className="text-[10px] text-[#737373] font-mono block">Rider ID: {selectedRide.rider_id}</span>
              </div>

              {/* Driver */}
              <div className="rounded-xl border border-[#E5E5E5] p-4 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#737373] uppercase font-bold flex items-center gap-1">
                    <Car className="h-3 w-3 text-[#15803D]" /> Assigned Driver Partner
                  </span>
                  {['requested', 'accepted'].includes(selectedRide.status) && (
                    <button
                      onClick={() => {
                        setIsRideModalOpen(false);
                        handleOpenAssignModal(selectedRide);
                      }}
                      className="text-[10px] font-bold text-[#E21D2B] hover:underline"
                    >
                      Change
                    </button>
                  )}
                </div>
                {selectedRide.driver ? (
                  <div>
                    <p className="font-bold text-[#171717] text-sm">
                      {selectedRide.driver.name} (★ {selectedRide.driver.rating.toFixed(1)})
                    </p>
                    <p className="text-[#737373] font-mono">{selectedRide.driver.phone || 'Phone not registered'}</p>
                    {selectedRide.driver.vehicle && (
                      <p className="font-mono text-[#E21D2B] text-[11px] font-semibold mt-1">
                        {selectedRide.driver.vehicle.make} {selectedRide.driver.vehicle.model} ({selectedRide.driver.vehicle.color}) ·{' '}
                        {selectedRide.driver.vehicle.registration_number}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-2 text-[#737373] italic">
                    <p>No driver assigned yet.</p>
                    <button
                      onClick={() => {
                        setIsRideModalOpen(false);
                        handleOpenAssignModal(selectedRide);
                      }}
                      className="mt-2 px-3 py-1 rounded bg-[#171717] text-white font-bold text-[11px]"
                    >
                      Assign Driver Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Route Waypoints & Coordinates */}
            <div className="rounded-xl border border-[#E5E5E5] p-4 bg-[#FAFAFA] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#737373] uppercase font-bold">Route & Intermediate Waypoints</span>
                <span className="text-[10px] font-mono text-[#737373]">
                  {selectedRide.route_source === 'google_routes_api' ? '⚡ Google Routes API' : 'Direct Geodesic Formula'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#15803D] mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-[#171717]">Pickup Address:</span>
                    <p className="text-[#737373]">{selectedRide.pickup_address}</p>
                  </div>
                </div>

                {selectedRide.stops &&
                  selectedRide.stops.map((stop, i) => (
                    <div key={stop.id || i} className="flex items-start gap-2 pl-2 border-l border-dashed border-[#E5E5E5]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E21D2B] mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-[#171717]">Stop #{stop.stop_order}:</span>
                        <p className="text-[#737373]">{stop.address}</p>
                      </div>
                    </div>
                  ))}

                <div className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#E21D2B] mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-[#171717]">Destination Address:</span>
                    <p className="text-[#737373]">{selectedRide.destination_address}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-[#E5E5E5] text-[11px] font-semibold text-[#171717]">
                <span>Distance: {Number(selectedRide.distance_km || 0).toFixed(1)} km</span>
                <span>Est. Duration: {selectedRide.estimated_duration_minutes || 0} minutes</span>
                <span>Class: <strong className="uppercase">{selectedRide.ride_type}</strong></span>
              </div>
            </div>

            {/* Financial & Settlement Breakdown */}
            <div className="rounded-xl border border-[#E5E5E5] p-4 bg-white space-y-3 text-xs">
              <span className="text-[10px] text-[#737373] uppercase font-bold block">Fare Breakdown & Driver Share</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[10px] text-[#737373] block">Gross Fare</span>
                  <p className="text-base font-black text-[#171717]">
                    ₹{selectedRide.final_fare || selectedRide.estimated_fare}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[10px] text-[#737373] block">Platform Fee (15%)</span>
                  <p className="text-base font-black text-[#E21D2B]">
                    ₹{(Number(selectedRide.final_fare || selectedRide.estimated_fare || 0) * 0.15).toFixed(2)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[10px] text-[#737373] block">Driver Net (85%)</span>
                  <p className="text-base font-black text-[#15803D]">
                    ₹{(Number(selectedRide.final_fare || selectedRide.estimated_fare || 0) * 0.85).toFixed(2)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5]">
                  <span className="text-[10px] text-[#737373] block">Payment Method</span>
                  <p className="font-bold text-[#171717] capitalize">
                    {selectedRide.payment?.payment_method || 'Stripe / Online'}
                  </p>
                  <span className="text-[10px] text-[#15803D] font-semibold block">
                    {selectedRide.payment?.status || (selectedRide.status === 'ride_completed' ? 'Settled' : 'Pending')}
                  </span>
                </div>
              </div>
            </div>

            {selectedRide.cancellation_reason && (
              <div className="rounded-xl border border-[#B91C1C]/30 bg-[#B91C1C]/5 p-4 text-xs space-y-1">
                <span className="text-[10px] text-[#B91C1C] uppercase font-bold block flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Cancellation Reason
                </span>
                <p className="text-[#171717]">{selectedRide.cancellation_reason}</p>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                {['requested', 'accepted', 'driver_arriving'].includes(selectedRide.status) && (
                  <button
                    onClick={() => {
                      handleAdminCancelRide(selectedRide.id);
                      setIsRideModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10 font-bold text-xs"
                  >
                    Cancel This Ride
                  </button>
                )}
                {['requested', 'accepted'].includes(selectedRide.status) && (
                  <button
                    onClick={() => {
                      setIsRideModalOpen(false);
                      handleOpenAssignModal(selectedRide);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#171717] text-white hover:bg-[#171717]/90 font-bold text-xs"
                  >
                    {selectedRide.driver_id ? 'Reassign Driver' : 'Assign Driver'}
                  </button>
                )}
              </div>

              <button
                onClick={() => setIsRideModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#171717] font-bold text-xs hover:bg-[#FAFAFA]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN DRIVER PARTNER MODAL */}
      {isAssignModalOpen && rideToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div>
                <h3 className="text-sm font-bold text-[#171717]">Assign Driver Partner</h3>
                <span className="font-mono text-xs font-bold text-[#E21D2B]">
                  {rideToAssign.reference_id || rideToAssign.id.slice(0, 8)}
                </span>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-[#737373] hover:text-[#171717]">
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1 bg-[#FAFAFA] p-3 rounded-xl border border-[#E5E5E5]">
              <p className="font-bold text-[#171717]">Route: {rideToAssign.pickup_address} → {rideToAssign.destination_address}</p>
              <p className="text-[#737373]">Category: <strong className="uppercase">{rideToAssign.ride_type}</strong> · Fare: ₹{rideToAssign.final_fare || rideToAssign.estimated_fare}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">Select Driver Partner</label>
              {drivers.length === 0 ? (
                <p className="text-xs text-[#737373] italic">No approved driver partners registered in fleet.</p>
              ) : (
                <select
                  value={selectedDriverIdForAssign}
                  onChange={(e) => setSelectedDriverIdForAssign(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E5E5] p-2.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                >
                  <option value="">-- Choose a Driver --</option>
                  {drivers
                    .filter((d) => d.status === 'approved' || d.status === 'active')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.make ? `(${d.make} ${d.model} · ${d.registration_number})` : ''} — ★ {Number(d.rating).toFixed(1)}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-bold text-[#737373] hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignDriver}
                disabled={actionLoading || !selectedDriverIdForAssign}
                className="px-4 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#E21D2B]/90 disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* TAB 4: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="mt-6 space-y-4">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Stripe Payments & Settlements Ledger</h2>
            <p className="text-xs text-[#737373]">Audit real payment intents, statuses, and driver payout shares.</p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5">Payment ID</th>
                  <th className="p-3.5">Stripe Intent ID</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[#737373]">
                      No processed transactions in ledger yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAFAFA]/70">
                      <td className="p-3.5 font-mono text-[11px] font-bold text-[#171717]">{p.id}</td>
                      <td className="p-3.5 font-mono text-[11px] text-[#E21D2B]">
                        {p.stripe_payment_intent_id || 'pi_test_standard'}
                      </td>
                      <td className="p-3.5 font-bold text-[#15803D]">₹{Number(p.amount).toFixed(2)}</td>
                      <td className="p-3.5 uppercase text-[#737373] font-semibold">{p.payment_method}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#15803D]/10 text-[#15803D]">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-[#737373] text-[11px]">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PAYMENT SETTINGS */}
      {activeTab === 'payment_settings' && (
        <div className="mt-6 space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Payment Settings & Method Management</h2>
            <p className="text-xs text-[#737373]">Configure UPI handles, QR codes, Stripe Checkout, and available payment methods.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* UPI / Gateway Configuration Form */}
            <div className="lg:col-span-2 rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">UPI & Manual Verification Setup</h3>
              <form onSubmit={handleSavePaymentSettings} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">UPI ID / VPA Handle</label>
                  <input
                    type="text"
                    value={paymentSettings.upi_id || ''}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, upi_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#171717] block mb-1">UPI QR Code Image URL</label>
                  <input
                    type="url"
                    value={paymentSettings.upi_qr_url || ''}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, upi_qr_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.stripe_enabled ?? true}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, stripe_enabled: e.target.checked })}
                      className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
                    />
                    <span className="font-semibold text-[#171717]">Enable Stripe Checkout</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.manual_upi_enabled ?? true}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, manual_upi_enabled: e.target.checked })}
                      className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
                    />
                    <span className="font-semibold text-[#171717]">Enable Manual UPI & UTR Verification</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold shadow-md transition-all mt-2"
                >
                  Save Payment Configuration
                </button>
              </form>
            </div>

            {/* QR Code Preview Card */}
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4 text-center">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">UPI QR Code Preview</h3>
              <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#E5E5E5] inline-block mx-auto">
                <img
                  src={paymentSettings.upi_qr_url || 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=ridenova@okhdfcbank'}
                  alt="UPI QR"
                  className="h-44 w-44 object-contain mx-auto rounded"
                />
              </div>
              <p className="font-mono text-xs font-bold text-[#E21D2B]">{paymentSettings.upi_id}</p>
              <p className="text-[11px] text-[#737373]">Scannable by GPay, PhonePe, Paytm, and BHIM UPI apps.</p>
            </div>
          </div>

          {/* Payment Methods Table */}
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#171717]">Supported Payment Methods</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Method Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {paymentMethods.map((m) => (
                    <tr key={m.id} className="hover:bg-[#FAFAFA]/70">
                      <td className="p-3 font-bold text-[#171717]">{m.name}</td>
                      <td className="p-3 uppercase font-mono text-[10px] text-[#E21D2B]">{m.type}</td>
                      <td className="p-3 text-[#737373]">{m.description}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.is_active ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#737373]/10 text-[#737373]'}`}>
                          {m.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteMethod(m.id)}
                          className="px-2.5 py-1 rounded border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10 font-bold text-[11px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: COMMISSION & FARES */}
      {activeTab === 'commission_settings' && (
        <div className="mt-6 space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Commission & Fare Calculation Rules</h2>
            <p className="text-xs text-[#737373]">Configure platform take rate, base fares, per-km charges, and simulated sample calculations.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Commission & Fare Form */}
            <div className="lg:col-span-2 rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">Pricing & Commission Parameters</h3>
              <form onSubmit={handleSaveCommissionSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#171717] block mb-1">Platform Commission (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={commissionSettings.platform_commission_percentage}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, platform_commission_percentage: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#171717] block mb-1">Fixed Platform Fee (₹)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={commissionSettings.fixed_platform_fee}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, fixed_platform_fee: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#171717] block mb-1">Base Fare (₹)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={commissionSettings.base_fare}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, base_fare: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#171717] block mb-1">Per-Kilometre Charge (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={commissionSettings.per_km_charge}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, per_km_charge: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-[#171717] block mb-1">Waiting Charge / Min (₹)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={commissionSettings.waiting_charge_per_min}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, waiting_charge_per_min: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-[#171717] block mb-1">Tax Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={commissionSettings.tax_percentage}
                      onChange={(e) => setCommissionSettings({ ...commissionSettings, tax_percentage: parseFloat(e.target.value) || 0 })}
                      required
                      className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold shadow-md transition-all mt-2"
                >
                  Save Commission & Fare Rules
                </button>
              </form>
            </div>

            {/* Live Sample Calculation Preview Card */}
            <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">Live Calculation Preview</h3>
              <div className="space-y-2 text-xs">
                <label className="font-semibold text-[#171717] block">Test Hypothetical Fare (₹)</label>
                <input
                  type="number"
                  value={sampleFare}
                  onChange={(e) => setSampleFare(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              {(() => {
                const commPct = Number(commissionSettings.platform_commission_percentage || 15);
                const fixedFee = Number(commissionSettings.fixed_platform_fee || 0);
                const commission = Number(((sampleFare * commPct) / 100).toFixed(2)) + fixedFee;
                const driverShare = Math.max(0, sampleFare - commission);
                return (
                  <div className="rounded-lg bg-[#FAFAFA] p-4 border border-[#E5E5E5] space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Eligible Ride Fare:</span>
                      <span className="font-bold text-[#171717]">₹{sampleFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#737373]">Platform Commission ({commPct}%):</span>
                      <span className="font-bold text-[#E21D2B]">-₹{commission.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E5E5E5] flex justify-between font-black text-sm">
                      <span className="text-[#171717]">Driver Net Earnings:</span>
                      <span className="text-[#15803D]">₹{driverShare.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-[10px] text-[#737373] italic">Note: Sample calculation preview only. Applied to new rides according to configured effective date.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'support' && (
        <div className="mt-6 space-y-4">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Customer Grievance & Support Management</h2>
            <p className="text-xs text-[#737373]">Review tickets filed by riders and drivers, update statuses to resolved.</p>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#737373]">No tickets in the support queue.</div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 text-xs space-y-3 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E5E5E5] gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#E21D2B] uppercase">
                        [{t.category}]
                      </span>
                      <span className="font-bold text-[#171717] text-sm">{t.subject}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          t.priority === 'urgent'
                            ? 'bg-[#B91C1C] text-white'
                            : t.priority === 'high'
                            ? 'bg-[#B45309] text-white'
                            : 'bg-[#737373]/10 text-[#737373]'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          t.status === 'resolved'
                            ? 'bg-[#15803D]/10 text-[#15803D]'
                            : t.status === 'in_progress'
                            ? 'bg-[#B45309]/10 text-[#B45309]'
                            : 'bg-[#E21D2B]/10 text-[#E21D2B]'
                        }`}
                      >
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <p className="text-[#171717] leading-relaxed">{t.description}</p>

                  <div className="pt-2 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#737373]">
                    <span>Created: {new Date(t.created_at).toLocaleString()}</span>

                    <div className="flex items-center gap-2">
                      {t.status !== 'in_progress' && t.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(t.id, 'in_progress')}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded border border-[#B45309]/30 text-[#B45309] hover:bg-[#B45309]/10 font-bold"
                        >
                          Mark In-Progress
                        </button>
                      )}
                      {t.status !== 'resolved' && (
                        <button
                          onClick={() => handleUpdateTicketStatus(t.id, 'resolved')}
                          disabled={actionLoading}
                          className="px-3 py-1 rounded bg-[#15803D] hover:bg-[#15803D]/90 text-white font-bold"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: PROMO CODES */}
      {activeTab === 'promos' && (
        <PromoManagement promos={promos} onRefresh={fetchAdminData} />
      )}

      {/* TAB 7: RIDERS REGISTRY */}
      {activeTab === 'riders' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Customer Management ({riders.length})</h2>
              <p className="text-xs text-[#737373]">Registered riders with full profile extensions, emergency contacts, and ride histories.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#737373]" />
              <input
                type="text"
                placeholder="Search by name, email, phone, city..."
                value={riderSearchQuery}
                onChange={(e) => setRiderSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] bg-white pl-8 pr-3 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Location & Language</th>
                  <th className="p-3.5">Profile Strength</th>
                  <th className="p-3.5">Total Rides</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {(() => {
                  const filtered = riders.filter((r) => {
                    if (!riderSearchQuery) return true;
                    const q = riderSearchQuery.toLowerCase();
                    return (
                      (r.name && r.name.toLowerCase().includes(q)) ||
                      (r.legal_name && r.legal_name.toLowerCase().includes(q)) ||
                      (r.display_name && r.display_name.toLowerCase().includes(q)) ||
                      (r.email && r.email.toLowerCase().includes(q)) ||
                      (r.phone && r.phone.toLowerCase().includes(q)) ||
                      (r.city && r.city.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-xs text-[#737373]">
                          {riderSearchQuery ? 'No customers matching search query.' : 'No customer records stored in database.'}
                        </td>
                      </tr>
                    );
                  }

                  return filtered.map((r) => {
                    const completion = r.profile_completion_percentage || 0;
                    return (
                      <tr key={r.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center font-bold text-xs text-[#171717] shrink-0">
                              {(r.display_name || r.legal_name || r.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[#171717]">{r.name}</p>
                              {r.display_name && (
                                <p className="text-[10px] text-[#737373]">Display: {r.display_name}</p>
                              )}
                              <p className="text-[10px] text-[#737373]">Joined {new Date(r.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <p className="text-[#171717] font-medium">{r.email}</p>
                          <p className="font-mono text-[11px] text-[#737373] mt-0.5">{r.phone || 'No phone set'}</p>
                        </td>

                        <td className="p-3.5">
                          <p className="text-[#171717] font-medium">{r.city || 'Not specified'}{r.country ? `, ${r.country}` : ''}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]">
                            {r.preferred_language || 'English'}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[#E5E5E5] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#E21D2B] h-1.5 rounded-full"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-[#171717]">{completion}%</span>
                          </div>
                        </td>

                        <td className="p-3.5 font-black text-[#E21D2B]">
                          {r.total_rides || 0}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenRiderProfile(r.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA] hover:border-[#E21D2B] transition-colors shadow-xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#E21D2B]" />
                            <span>View Profile</span>
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* CUSTOMER PROFILE MODAL */}
      {isRiderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-[#E5E5E5] overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#E21D2B] text-white flex items-center justify-center font-bold text-sm shadow-inner">
                  {(selectedRiderDetails?.user?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#171717]">{selectedRiderDetails?.user?.name || 'Customer Account'}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF1F2] border border-[#E21D2B]/20 text-[#E21D2B] uppercase">
                      Rider
                    </span>
                  </div>
                  <p className="text-xs text-[#737373] mt-0.5">{selectedRiderDetails?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRiderModalOpen(false);
                  setSelectedRiderDetails(null);
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5]/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
              {loadingRiderProfile ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 text-[#E21D2B] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-[#171717]">Loading customer details...</p>
                </div>
              ) : selectedRiderDetails ? (
                <>
                  {/* Profile Completion Bar */}
                  <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#171717]">Profile Completion Standing</span>
                      <span className="font-black text-[#E21D2B]">
                        {selectedRiderDetails.extension?.profile_completion_percentage || 0}%
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E5E5] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#E21D2B] h-2 rounded-full"
                        style={{ width: `${selectedRiderDetails.extension?.profile_completion_percentage || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* 1. Identity & Personal Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <UserCheck className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Identity & Personal Information</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5]">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Full Legal Name</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedRiderDetails.extension?.legal_name || selectedRiderDetails.user?.name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Preferred Display Name</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedRiderDetails.extension?.display_name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Date of Birth</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedRiderDetails.extension?.date_of_birth
                            ? new Date(selectedRiderDetails.extension.date_of_birth).toLocaleDateString()
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Gender</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedRiderDetails.extension?.gender || '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#737373] block text-[11px]">Preferred Language</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedRiderDetails.extension?.preferred_language || 'English'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Residential Address */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <MapPin className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Residential Address</h4>
                    </div>
                    <div className="bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5] space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <span className="text-[#737373] block text-[11px]">Address Line 1</span>
                          <span className="font-semibold text-[#171717]">
                            {selectedRiderDetails.extension?.address_line1 || '—'}
                          </span>
                        </div>
                        {selectedRiderDetails.extension?.address_line2 && (
                          <div className="col-span-2">
                            <span className="text-[#737373] block text-[11px]">Address Line 2</span>
                            <span className="font-semibold text-[#171717]">
                              {selectedRiderDetails.extension.address_line2}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-[#737373] block text-[11px]">Landmark</span>
                          <span className="font-semibold text-[#171717]">
                            {selectedRiderDetails.extension?.landmark || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#737373] block text-[11px]">PIN / Postal Code</span>
                          <span className="font-mono font-semibold text-[#171717]">
                            {selectedRiderDetails.extension?.postal_code || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#737373] block text-[11px]">City & State</span>
                          <span className="font-semibold text-[#171717]">
                            {selectedRiderDetails.extension?.city || '—'}
                            {selectedRiderDetails.extension?.state ? `, ${selectedRiderDetails.extension.state}` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#737373] block text-[11px]">Country</span>
                          <span className="font-semibold text-[#171717]">
                            {selectedRiderDetails.extension?.country || 'India'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Contact Numbers */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <Phone className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Contact Numbers</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5]">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Primary Phone</span>
                        <span className="font-mono font-semibold text-[#171717]">
                          {selectedRiderDetails.user?.phone || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Alternate Phone</span>
                        <span className="font-mono font-semibold text-[#171717]">
                          {selectedRiderDetails.extension?.alternate_phone || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Emergency Contacts */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <ShieldCheck className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">
                        Emergency Contacts ({selectedRiderDetails.emergencyContacts?.length || 0})
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {!selectedRiderDetails.emergencyContacts || selectedRiderDetails.emergencyContacts.length === 0 ? (
                        <p className="text-xs text-[#737373] p-3 rounded-lg border border-dashed border-[#E5E5E5] text-center">
                          No emergency contacts registered by customer.
                        </p>
                      ) : (
                        selectedRiderDetails.emergencyContacts.map((contact: any) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] bg-white"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center font-bold text-[10px]">
                                {contact.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[#171717]">{contact.name}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]">
                                    {contact.relationship}
                                  </span>
                                  {contact.is_primary && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF1F2] text-[#E21D2B]">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[11px] text-[#737373] block mt-0.5">
                                  {contact.phone_number}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 5. Safety & Assistance Preferences */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <AlertTriangle className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Safety & Health Guidance</h4>
                    </div>
                    <div className="bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5] space-y-2.5">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Boarding / Accessibility Notes:</span>
                        <p className="text-xs font-medium text-[#171717] mt-0.5">
                          {selectedRiderDetails.safetyPrefs?.accessibility_notes || 'None specified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Emergency Medical Notes (For First Responders):</span>
                        <p className="text-xs font-medium text-[#171717] mt-0.5">
                          {selectedRiderDetails.safetyPrefs?.emergency_notes || 'None specified'}
                        </p>
                      </div>
                      <div className="pt-1 text-[11px] text-[#737373]">
                        Consent authorized: <span className="font-bold text-[#171717]">{selectedRiderDetails.safetyPrefs?.consent_given ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Rides History Preview */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <Clock className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">
                        Rides History ({selectedRiderDetails.totalRides || 0} Total)
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {!selectedRiderDetails.recentRides || selectedRiderDetails.recentRides.length === 0 ? (
                        <p className="text-xs text-[#737373] p-3 rounded-lg border border-dashed border-[#E5E5E5] text-center">
                          No rides recorded for this customer yet.
                        </p>
                      ) : (
                        selectedRiderDetails.recentRides.slice(0, 5).map((ride: any) => (
                          <div
                            key={ride.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] bg-white text-xs"
                          >
                            <div>
                              <p className="font-bold text-[#171717]">
                                {ride.pickup_address || 'Pickup'} → {ride.dropoff_address || 'Dropoff'}
                              </p>
                              <p className="text-[10px] text-[#737373] mt-0.5">
                                {new Date(ride.created_at).toLocaleString()} · ID: {ride.id.substring(0, 8)}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-[#171717] block">₹{ride.fare_amount || 0}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]">
                                {ride.status}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-[#737373]">Customer details could not be loaded.</p>
              )}
            </div>

            <div className="p-4 border-t border-[#E5E5E5] bg-[#FAFAFA] flex justify-end">
              <button
                onClick={() => {
                  setIsRiderModalOpen(false);
                  setSelectedRiderDetails(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#171717] text-white text-xs font-bold hover:bg-[#333333] transition-colors"
              >
                Close Customer Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVER PARTNER PROFILE MODAL */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-[#E5E5E5] overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5] bg-[#FAFAFA]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#E21D2B] text-white flex items-center justify-center font-bold text-sm shadow-inner">
                  {(selectedDriverDetails?.user?.name || selectedDriverDetails?.driver?.name || 'D').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#171717]">
                      {selectedDriverDetails?.user?.name || selectedDriverDetails?.driver?.name || 'Driver Partner'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#15803D]/10 border border-[#15803D]/20 text-[#15803D] uppercase">
                      {selectedDriverDetails?.driver?.status || 'Active'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373] uppercase">
                      KYC: {selectedDriverDetails?.driver?.kyc_status || 'Approved'}
                    </span>
                  </div>
                  <p className="text-xs text-[#737373] mt-0.5">
                    {selectedDriverDetails?.user?.email} · DRV-{(selectedDriverDetails?.driver?.id || '89412').slice(0, 6).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDriverModalOpen(false);
                  setSelectedDriverDetails(null);
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-[#737373] hover:text-[#171717] hover:bg-[#E5E5E5]/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
              {loadingDriverProfile ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 text-[#E21D2B] animate-spin mb-2" />
                  <p className="text-xs font-semibold text-[#171717]">Loading driver partner records...</p>
                </div>
              ) : selectedDriverDetails ? (
                <>
                  {/* Rating & Performance Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                      <span className="text-[#737373] block text-[10px] uppercase font-bold">Partner Rating</span>
                      <span className="font-bold text-sm text-[#171717]">★ {Number(selectedDriverDetails.driver?.rating || 5.0).toFixed(1)}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                      <span className="text-[#737373] block text-[10px] uppercase font-bold">Total Platform Trips</span>
                      <span className="font-bold text-sm text-[#E21D2B]">{selectedDriverDetails.totalRides || 0}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                      <span className="text-[#737373] block text-[10px] uppercase font-bold">Operating Hub</span>
                      <span className="font-bold text-xs text-[#171717] truncate block">{selectedDriverDetails.driver?.operating_city || selectedDriverDetails.extension?.city || 'Delhi NCR'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
                      <span className="text-[#737373] block text-[10px] uppercase font-bold">Payouts Distributed</span>
                      <span className="font-bold text-sm text-[#15803D]">{selectedDriverDetails.payouts?.length || 0} Settlements</span>
                    </div>
                  </div>

                  {/* 1. Identity & Personal Info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <UserCheck className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Personal Credentials & Identity</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5]">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Full Legal Name</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedDriverDetails.extension?.legal_name || selectedDriverDetails.user?.name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Date of Birth</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedDriverDetails.driver?.dob || selectedDriverDetails.extension?.date_of_birth || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Gender</span>
                        <span className="font-semibold text-[#171717]">{selectedDriverDetails.extension?.gender || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Preferred Spoken Language</span>
                        <span className="font-semibold text-[#171717]">{selectedDriverDetails.driver?.preferred_language || selectedDriverDetails.extension?.preferred_language || 'English'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#737373] block text-[11px]">Residential Address</span>
                        <span className="font-semibold text-[#171717]">
                          {selectedDriverDetails.driver?.address || [selectedDriverDetails.extension?.address_line1, selectedDriverDetails.extension?.city, selectedDriverDetails.extension?.state, selectedDriverDetails.extension?.postal_code].filter(Boolean).join(', ') || 'Address not stored'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Contact Numbers */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <Phone className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Contact Channels</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5]">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Primary Mobile (Verified)</span>
                        <span className="font-mono font-semibold text-[#171717]">{selectedDriverDetails.user?.phone || selectedDriverDetails.driver?.phone || 'No phone set'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Alternate Contact</span>
                        <span className="font-mono font-semibold text-[#171717]">{selectedDriverDetails.extension?.alternate_phone || 'None provided'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[#737373] block text-[11px]">Email Account</span>
                        <span className="font-medium text-[#171717]">{selectedDriverDetails.user?.email || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Fleet Vehicle Assignment */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <Car className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Assigned Fleet Vehicle</h4>
                    </div>
                    {selectedDriverDetails.vehicle ? (
                      <div className="bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5] space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <span className="text-[#737373] block text-[11px]">Make & Model</span>
                            <span className="font-bold text-[#171717]">{selectedDriverDetails.vehicle.make} {selectedDriverDetails.vehicle.model}</span>
                          </div>
                          <div>
                            <span className="text-[#737373] block text-[11px]">Plate Registration</span>
                            <span className="font-mono font-bold text-[#E21D2B] uppercase">{selectedDriverDetails.vehicle.registration_number}</span>
                          </div>
                          <div>
                            <span className="text-[#737373] block text-[11px]">Vehicle Category</span>
                            <span className="font-semibold text-[#171717] capitalize">{selectedDriverDetails.vehicle.vehicle_type}</span>
                          </div>
                          <div>
                            <span className="text-[#737373] block text-[11px]">Color & Year</span>
                            <span className="font-medium text-[#171717]">{selectedDriverDetails.vehicle.color} ({selectedDriverDetails.vehicle.year})</span>
                          </div>
                          <div>
                            <span className="text-[#737373] block text-[11px]">Seating Capacity</span>
                            <span className="font-medium text-[#171717]">{selectedDriverDetails.vehicle.seating_capacity || 4} Passengers</span>
                          </div>
                          <div>
                            <span className="text-[#737373] block text-[11px]">Insurance Policy</span>
                            <span className="font-mono text-[#171717]">{selectedDriverDetails.vehicle.insurance_policy_number || 'On File'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="p-3 text-center text-[#737373] border border-dashed rounded-xl">No vehicle currently linked to driver record.</p>
                    )}
                  </div>

                  {/* 4. Documents & Compliance */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <FileCheck className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Licensing & Documents</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5]">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Driving Licence Number</span>
                        <span className="font-mono font-bold text-[#171717] uppercase">{selectedDriverDetails.driver?.license_number || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">DL Expiry Date</span>
                        <span className="font-medium text-[#171717]">{selectedDriverDetails.driver?.license_expiry || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Government ID Type</span>
                        <span className="font-semibold text-[#171717]">{selectedDriverDetails.driver?.id_type || 'Aadhaar Card'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">National ID Identifier</span>
                        <span className="font-mono font-semibold text-[#171717]">{selectedDriverDetails.driver?.id_number_masked || 'XXXX-XXXX-4912'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Emergency Contacts */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <ShieldAlert className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">
                        Emergency Contacts ({selectedDriverDetails.emergencyContacts?.length || 0})
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {!selectedDriverDetails.emergencyContacts || selectedDriverDetails.emergencyContacts.length === 0 ? (
                        <p className="text-[#737373] p-3 text-center border border-dashed rounded-xl">No emergency contacts registered by partner.</p>
                      ) : (
                        selectedDriverDetails.emergencyContacts.map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-[#E5E5E5] bg-white">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#171717]">{c.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]">{c.relationship}</span>
                                {c.is_primary && <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FFF1F2] text-[#E21D2B]">Primary</span>}
                              </div>
                              <span className="font-mono text-[11px] text-[#737373] mt-0.5 block">{c.phone || c.phone_number}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 6. Bank & Payouts */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <CreditCard className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Bank Account & Payout Status</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-[#FAFAFA]/50 p-3.5 rounded-xl border border-[#E5E5E5]">
                      <div>
                        <span className="text-[#737373] block text-[11px]">Account Holder</span>
                        <span className="font-semibold text-[#171717]">{selectedDriverDetails.driver?.bank_account_name || selectedDriverDetails.user?.name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Account Number (Masked)</span>
                        <span className="font-mono font-semibold text-[#171717]">{selectedDriverDetails.driver?.bank_account_number_masked || 'Not Configured'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">Bank IFSC Code</span>
                        <span className="font-mono font-bold uppercase text-[#171717]">{selectedDriverDetails.driver?.bank_ifsc || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#737373] block text-[11px]">UPI VPA</span>
                        <span className="font-mono text-[#171717]">{selectedDriverDetails.driver?.upi_id || 'Not Set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 7. Safety & Medical Guidance */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5E5E5]">
                      <HeartPulse className="h-4 w-4 text-[#E21D2B]" />
                      <h4 className="font-bold uppercase tracking-wider text-[#171717]">Emergency Medical Guidance (Authorized Dispatch Use Only)</h4>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAFAFA]/50 border border-[#E5E5E5] space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[#737373] block text-[11px]">Blood Group</span>
                          <span className="font-bold text-[#E21D2B]">{selectedDriverDetails.safetyPrefs?.blood_group || 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-[#737373] block text-[11px]">Known Allergies</span>
                          <span className="font-medium text-[#171717]">{selectedDriverDetails.safetyPrefs?.allergies || 'None recorded'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#737373] block text-[11px]">Emergency First Responder Notes</span>
                          <p className="text-xs text-[#171717] mt-0.5">{selectedDriverDetails.safetyPrefs?.emergency_medical_notes || 'No special medical guidance recorded.'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center py-8 text-[#737373]">Driver partner details could not be loaded.</p>
              )}
            </div>

            <div className="p-4 border-t border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
              <span className="text-[11px] text-[#737373]">Protected Admin Compliance Console</span>
              <button
                onClick={() => {
                  setIsDriverModalOpen(false);
                  setSelectedDriverDetails(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#171717] text-white text-xs font-bold hover:bg-[#333333] transition-colors"
              >
                Close Driver Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
