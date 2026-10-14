import React, { useState, useEffect } from 'react';
import {
  Car,
  Home,
  MapPin,
  History,
  CreditCard,
  Bell,
  HelpCircle,
  User,
  LogOut,
  Clock,
  Shield,
  ArrowRight,
  Plus,
  Loader2,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { RideWithStops } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';

interface RiderDashboardProps {
  onNavigate: (route: string) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'payments' | 'notifications' | 'support'>('home');
  const [rides, setRides] = useState<RideWithStops[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [ridesError, setRidesError] = useState<string | null>(null);

  const fetchRides = async () => {
    setLoadingRides(true);
    setRidesError(null);
    try {
      const res = await api.getRides();
      if (res.success && res.data) {
        setRides(res.data);
      }
    } catch (err: any) {
      setRidesError(err.message || 'Failed to fetch ride history');
    } finally {
      setLoadingRides(false);
    }
  };

  const activeRide = rides.find((r) => r.status === 'requested');

  useRideSubscription(activeRide?.id || '', fetchRides);

  const completedOrPastRides = rides.filter((r) => r.id !== activeRide?.id);


  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'book', label: 'Book Ride', icon: MapPin, action: () => onNavigate('book-ride') },
    { id: 'history', label: 'Ride History', icon: History, count: rides.length },
    { id: 'payments', label: 'Payments', icon: CreditCard, future: 'Step 5' },
    { id: 'notifications', label: 'Notifications', icon: Bell, future: 'Step 6' },
    { id: 'support', label: 'Support', icon: HelpCircle, future: 'Step 6' },
    { id: 'profile', label: 'Profile', icon: User, action: () => onNavigate('profile') },
  ];

  return (
    <div className="min-h-[85vh] flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-4 flex flex-col justify-between shadow-sm">
        <div className="space-y-6">
          {/* Logo & Role Lock */}
          <div className="pb-4 border-b border-[#1E334D]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00C2FF] to-[#0EA5E9] text-[#07111F] font-black text-sm">
                RN
              </div>
              <span className="text-lg font-extrabold text-[#E5F2FF]">RideNova</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[#8FA6BF]">Access Tier</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#00C2FF]/15 text-[#00C2FF] border border-[#00C2FF]/30 tracking-wider">
                RIDER
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      setActiveTab(item.id as typeof activeTab);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/30'
                      : 'text-[#8FA6BF] hover:bg-[#1E334D]/40 hover:text-[#E5F2FF]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] bg-[#1E334D] text-[#00C2FF] px-2 py-0.5 rounded-full font-mono">
                      {item.count}
                    </span>
                  )}
                  {item.future && (
                    <span className="text-[10px] text-[#8FA6BF]/80 font-mono">
                      {item.future}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="pt-4 border-t border-[#1E334D] space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="h-8 w-8 rounded-full bg-[#1E334D] flex items-center justify-center text-xs font-bold text-[#00C2FF]">
              {user?.name?.charAt(0) || 'R'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#E5F2FF] truncate">{user?.name}</p>
              <p className="text-[11px] text-[#8FA6BF] truncate">{user?.email}</p>
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
      <main className="flex-1 rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-6 shadow-sm">
        {/* Welcome Header */}
        <div className="pb-6 border-b border-[#1E334D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#00C2FF]">
                Rider Dashboard
              </span>
              <span className="text-xs text-[#8FA6BF]">·</span>
              <span className="text-xs text-[#22C55E] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
                Authenticated
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-[#E5F2FF]">
              Welcome, {user?.name || 'Rider'}
            </h1>
            <p className="mt-1 text-xs text-[#8FA6BF]">
              Manage your ride requests, travel routes, and account settings.
            </p>
          </div>

          <button
            onClick={() => onNavigate('book-ride')}
            className="flex items-center gap-2 rounded-lg bg-[#00C2FF] px-4 py-2.5 text-xs font-bold text-[#07111F] shadow-md shadow-[#00C2FF]/20 hover:bg-[#00C2FF]/90 transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Book a Ride</span>
          </button>
        </div>

        {/* Quick Actions Row */}
        <div className="my-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('book-ride')}
            className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4 text-left hover:border-[#00C2FF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#E5F2FF] group-hover:text-[#00C2FF]">
              <span>Book Ride</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-[11px] text-[#8FA6BF]">
              Plan route with multi-stops & view fare estimates.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4 text-left hover:border-[#00C2FF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#E5F2FF] group-hover:text-[#00C2FF]">
              <span>Ride History</span>
              <History className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-[11px] text-[#8FA6BF]">
              View all previously requested rides ({rides.length}).
            </p>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4 text-left hover:border-[#00C2FF] transition-all group"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#E5F2FF] group-hover:text-[#00C2FF]">
              <span>My Profile</span>
              <User className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-[11px] text-[#8FA6BF]">
              Manage contact information & role status.
            </p>
          </button>
        </div>

        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Active Ride Section */}
            {activeRide ? (
              <div className="rounded-xl border border-[#00C2FF]/40 bg-[#07111F] p-5 shadow-lg shadow-[#00C2FF]/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E334D]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
                    <span className="text-xs font-bold text-[#E5F2FF]">CURRENT ACTIVE RIDE</span>
                    <span className="font-mono text-xs text-[#00C2FF]">
                      ({activeRide.reference_id || activeRide.id.slice(0, 8)})
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 self-start sm:self-auto">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching for a driver...
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#22C55E] mt-1 shrink-0" />
                    <div>
                      <span className="text-[#8FA6BF] block text-[11px]">Pickup</span>
                      <span className="text-[#E5F2FF] font-medium">{activeRide.pickup_address}</span>
                    </div>
                  </div>

                  {activeRide.stops?.map((s) => (
                    <div key={s.id} className="flex items-start gap-2 pl-2">
                      <span className="h-2 w-2 rounded-full bg-[#F59E0B] mt-1 shrink-0" />
                      <div>
                        <span className="text-[#8FA6BF] block text-[11px]">Stop {s.stop_order}</span>
                        <span className="text-[#E5F2FF]">{s.address}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-start gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00C2FF] mt-1 shrink-0" />
                    <div>
                      <span className="text-[#8FA6BF] block text-[11px]">Destination</span>
                      <span className="text-[#E5F2FF] font-medium">{activeRide.destination_address}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E334D] flex flex-wrap items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-[#8FA6BF]">
                    <span>Category: <strong className="text-[#E5F2FF] uppercase">{activeRide.ride_type}</strong></span>
                    <span>·</span>
                    <span>Distance: <strong>{activeRide.distance_km} km</strong></span>
                  </div>
                  <div className="text-[#00C2FF] font-bold text-sm">
                    Estimated Fare: ₹{activeRide.estimated_fare}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Recent Rides Section */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
                <h3 className="text-sm font-bold text-[#E5F2FF]">Recent Rides</h3>
                <span className="text-xs text-[#8FA6BF]">PostgreSQL Records</span>
              </div>

              {loadingRides ? (
                <div className="py-8 text-center text-xs text-[#8FA6BF] flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#00C2FF]" />
                  <span>Loading rides...</span>
                </div>
              ) : rides.length === 0 ? (
                <div className="my-6 rounded-lg border border-dashed border-[#1E334D] p-8 text-center bg-[#07111F]/50">
                  <Car className="mx-auto h-8 w-8 text-[#8FA6BF] mb-2" />
                  <h4 className="text-sm font-semibold text-[#E5F2FF]">No rides yet</h4>
                  <p className="mt-1 text-xs text-[#8FA6BF] max-w-xs mx-auto">
                    You haven't requested any rides yet. Plan your route and book your first ride.
                  </p>
                  <button
                    onClick={() => onNavigate('book-ride')}
                    className="mt-4 rounded-lg bg-[#00C2FF] px-4 py-2 text-xs font-bold text-[#07111F] hover:bg-[#00C2FF]/90 transition-all shadow-md shadow-[#00C2FF]/20"
                  >
                    Book your first ride
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {rides.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#1E334D]/80"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-[#00C2FF]">
                            {r.reference_id || r.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] text-[#8FA6BF]">
                            {new Date(r.created_at).toLocaleDateString()}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[#E5F2FF] font-medium truncate">
                          {r.pickup_address} → {r.destination_address}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-[#00C2FF] block">
                          ₹{r.estimated_fare}
                        </span>
                        <span className="text-[11px] text-[#8FA6BF]">
                          {r.distance_km} km · {r.ride_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
              <h3 className="text-sm font-bold text-[#E5F2FF]">All Requested Rides ({rides.length})</h3>
              <button
                onClick={fetchRides}
                className="text-xs text-[#00C2FF] hover:underline"
              >
                Refresh List
              </button>
            </div>

            {rides.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8FA6BF]">
                No rides recorded in database yet.
              </div>
            ) : (
              <div className="space-y-3">
                {rides.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-[#1E334D] bg-[#07111F] p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#1E334D]/60">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#00C2FF]">
                          {r.reference_id || r.id}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                          {r.status}
                        </span>
                      </div>
                      <span className="font-bold text-[#00C2FF] text-sm">₹{r.estimated_fare}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
                        <span className="text-[#8FA6BF]">From:</span>
                        <span className="text-[#E5F2FF] font-medium">{r.pickup_address}</span>
                      </div>
                      {r.stops?.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 pl-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                          <span className="text-[#8FA6BF]">Stop {s.stop_order}:</span>
                          <span className="text-[#E5F2FF]">{s.address}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00C2FF]" />
                        <span className="text-[#8FA6BF]">To:</span>
                        <span className="text-[#E5F2FF] font-medium">{r.destination_address}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#1E334D]/40 flex items-center justify-between text-[11px] text-[#8FA6BF]">
                      <span>Vehicle: <strong className="text-[#E5F2FF] uppercase">{r.ride_type}</strong></span>
                      <span>Distance: {r.distance_km} km</span>
                      <span>Duration: {r.estimated_duration_minutes} min</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Future Tabs */}
        {activeTab !== 'home' && activeTab !== 'history' && (
          <div className="py-12 text-center border border-dashed border-[#1E334D] rounded-xl bg-[#07111F]/50">
            <Clock className="mx-auto h-8 w-8 text-[#00C2FF] mb-3" />
            <h3 className="text-base font-bold text-[#E5F2FF]">
              {navItems.find((n) => n.id === activeTab)?.label} — Coming Soon
            </h3>
            <p className="mt-1 text-xs text-[#8FA6BF] max-w-sm mx-auto">
              This feature will be unlocked in{' '}
              <span className="text-[#00C2FF] font-semibold">
                {navItems.find((n) => n.id === activeTab)?.future}
              </span>.
            </p>
            <button
              onClick={() => setActiveTab('home')}
              className="mt-5 text-xs text-[#00C2FF] hover:underline"
            >
              Return to Overview
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
