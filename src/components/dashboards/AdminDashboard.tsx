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

interface AdminDashboardProps {
  onNavigate: (route: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'drivers' | 'rides' | 'payments' | 'support' | 'promos' | 'riders'
  >('overview');

  // Admin dataset states
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [rides, setRides] = useState<RideWithStops[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [riders, setRiders] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter states
  const [rideStatusFilter, setRideStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [overviewRes, driversRes, ridesRes, paymentsRes, ticketsRes, promosRes, ridersRes] =
        await Promise.all([
          api.getAdminOverview().catch(() => null),
          api.getAdminDrivers().catch(() => ({ data: [] })),
          api.getAdminRides().catch(() => ({ data: [] })),
          api.getAdminPayments().catch(() => ({ data: [] })),
          api.getSupportTickets().catch(() => ({ data: [] })),
          api.getPromos().catch(() => ({ data: [] })),
          api.getAdminRiders().catch(() => ({ data: [] })),
        ]);

      if (overviewRes?.data) setOverview(overviewRes.data);
      if (driversRes?.data) setDrivers(driversRes.data);
      if (ridesRes?.data) setRides(ridesRes.data);
      if (paymentsRes?.data) setPayments(paymentsRes.data);
      if (ticketsRes?.data) setTickets(ticketsRes.data);
      if (promosRes?.data) setPromos(promosRes.data);
      if (ridersRes?.data) setRiders(ridersRes.data);
    } catch (err: any) {
      showError(err.message || 'Failed to sync admin management records');
    } finally {
      setLoading(false);
    }
  }, []);

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
    { id: 'drivers', label: 'Drivers Fleet', icon: Car, badge: drivers.length },
    { id: 'rides', label: 'All Rides', icon: Navigation, badge: rides.length },
    { id: 'payments', label: 'Payments Ledger', icon: CreditCard },
    {
      id: 'support',
      label: 'Support Tickets',
      icon: HelpCircle,
      badge: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length || undefined,
    },
    { id: 'promos', label: 'Promo Codes', icon: Ticket, badge: promos.length },
    { id: 'riders', label: 'Riders Registry', icon: Users, badge: riders.length },
  ];

  const filteredRides = rides.filter((r) => {
    if (rideStatusFilter !== 'all' && r.status !== rideStatusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.pickup_address.toLowerCase().includes(q) ||
        r.destination_address.toLowerCase().includes(q)
      );
    }
    return true;
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
      <div className="pb-6 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#15803D]">
              Administrative Console
            </span>
            <span className="text-xs text-[#737373]">·</span>
            <span className="text-xs text-[#15803D] font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Full Server Authorization
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-[#171717]">RideNova Operations Center</h1>
          <p className="mt-1 text-xs text-[#737373]">
            Manage driver approvals, supervise live bookings, audit Stripe transactions, and resolve support tickets.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] hover:bg-[#FAFAFA] text-xs font-semibold text-[#171717] transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#E21D2B] ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Database</span>
        </button>
      </div>

      {/* Alerts */}
      {statusMessage && (
        <div
          className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-[#15803D]/10 border border-[#15803D]/30 text-[#15803D]'
              : 'bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-[#B91C1C]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="hover:opacity-75 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="mt-6 space-y-6">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Total Platform Users</span>
              <p className="mt-1 text-2xl font-black text-[#171717]">{overview?.totalUsers ?? (riders.length + drivers.length)}</p>
              <span className="text-[10px] text-[#737373] mt-0.5 block">{overview?.totalRiders || riders.length} riders · {overview?.totalDrivers || drivers.length} drivers</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Active Drivers</span>
              <p className="mt-1 text-2xl font-black text-[#15803D]">{overview?.activeDrivers ?? drivers.filter(d => d.is_online).length}</p>
              <span className="text-[10px] text-[#15803D] mt-0.5 block">Online now</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Total Rides</span>
              <p className="mt-1 text-2xl font-black text-[#171717]">{overview?.totalRides ?? rides.length}</p>
              <span className="text-[10px] text-[#737373] mt-0.5 block">{overview?.completedRides ?? rides.filter(r => r.status === 'ride_completed').length} completed</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Gross Volume</span>
              <p className="mt-1 text-2xl font-black text-[#171717]">₹{Number(overview?.totalRevenue || 0).toFixed(0)}</p>
              <span className="text-[10px] text-[#737373] mt-0.5 block">Total ride fares</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Platform Fees (15%)</span>
              <p className="mt-1 text-2xl font-black text-[#E21D2B]">₹{Number(overview?.platformFeeTotal || 0).toFixed(0)}</p>
              <span className="text-[10px] text-[#E21D2B] mt-0.5 block">Net revenue</span>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-[#737373]">Support Tickets</span>
              <p className="mt-1 text-2xl font-black text-[#B45309]">
                {tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').length}
              </p>
              <span className="text-[10px] text-[#B45309] mt-0.5 block">Open or in-progress</span>
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
              <h2 className="text-base font-bold text-[#171717]">Registered Driver Fleet ({drivers.length})</h2>
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

                        <td className="p-3.5 text-right space-x-1">
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

      {/* TAB 3: ALL RIDES */}
      {activeTab === 'rides' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Platform Trips Monitor ({rides.length})</h2>
              <p className="text-xs text-[#737373]">Live view of requested, active, and completed journeys.</p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={rideStatusFilter}
                onChange={(e) => setRideStatusFilter(e.target.value)}
                className="rounded-lg border border-[#E5E5E5] px-2.5 py-1.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="requested">Requested</option>
                <option value="accepted">Accepted</option>
                <option value="driver_arriving">Driver Arriving</option>
                <option value="ride_started">Ride Started</option>
                <option value="ride_completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredRides.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#737373]">No rides match the current filter.</div>
            ) : (
              filteredRides.map((r) => (
                <div key={r.id} className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#E21D2B]">
                        {r.reference_id || r.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          r.status === 'ride_completed'
                            ? 'bg-[#15803D]/10 text-[#15803D]'
                            : r.status === 'cancelled'
                            ? 'bg-[#B91C1C]/10 text-[#B91C1C]'
                            : 'bg-[#B45309]/10 text-[#B45309]'
                        }`}
                      >
                        {r.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-[#171717]">₹{r.final_fare || r.estimated_fare}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#737373] block uppercase font-bold">Pickup</span>
                      <p className="truncate text-[#171717] font-medium">{r.pickup_address}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#737373] block uppercase font-bold">Destination</span>
                      <p className="truncate text-[#171717] font-medium">{r.destination_address}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] text-[#737373]">
                    <span>Category: <strong className="uppercase">{r.ride_type}</strong> · Distance: {r.distance_km} km</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
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

      {/* TAB 5: SUPPORT TICKETS */}
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
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Promotional Discounts & Vouchers</h2>
              <p className="text-xs text-[#737373]">Manage marketing promo codes usable by riders during checkout.</p>
            </div>
            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Promo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {promos.map((p) => (
              <div key={p.id} className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                  <span className="font-mono text-base font-black text-[#E21D2B]">{p.code}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#15803D]/10 text-[#15803D]">
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-[#171717]">
                    Discount:{' '}
                    {p.discount_type === 'percentage'
                      ? `${p.discount_value}% off (Cap: ₹${p.maximum_discount || 'None'})`
                      : `Flat ₹${p.discount_value} off`}
                  </p>
                  <p className="text-[#737373]">Min. Ride Fare: ₹{p.minimum_fare}</p>
                  <p className="text-[#737373]">
                    Redemptions: {p.used_count} / {p.usage_limit || 'Unlimited'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: RIDERS REGISTRY */}
      {activeTab === 'riders' && (
        <div className="mt-6 space-y-4">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Registered Rider Accounts ({riders.length})</h2>
            <p className="text-xs text-[#737373]">Clerk mapped rider accounts stored in PostgreSQL.</p>
          </div>

          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Total Rides Booked</th>
                  <th className="p-3.5">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {riders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-[#737373]">
                      No riders recorded in database.
                    </td>
                  </tr>
                ) : (
                  riders.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAFAFA]/70">
                      <td className="p-3.5 font-bold text-[#171717]">{r.name}</td>
                      <td className="p-3.5 text-[#737373]">{r.email}</td>
                      <td className="p-3.5 font-mono text-[#737373]">{r.phone || '—'}</td>
                      <td className="p-3.5 font-black text-[#E21D2B]">{r.total_rides || 0}</td>
                      <td className="p-3.5 text-[#737373] text-[11px]">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE PROMO MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h3 className="text-base font-bold text-[#171717]">Create Promo Voucher</h3>
              <button onClick={() => setIsPromoModalOpen(false)} className="text-[#737373] hover:text-[#171717]">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-[#171717] block mb-1">Promo Code (e.g. FLASH50)</label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="CODE"
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 font-mono uppercase focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Discount Type</label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_type: e.target.value as any })}
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#E21D2B] focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm({ ...promoForm, discount_value: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Min Ride Fare (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.minimum_fare}
                    onChange={(e) => setPromoForm({ ...promoForm, minimum_fare: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.maximum_discount}
                    onChange={(e) => setPromoForm({ ...promoForm, maximum_discount: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all mt-2"
              >
                Publish Promo Code
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
