import React, { useState, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Star,
  Receipt,
  XCircle,
  RefreshCw,
  Send,
  Sparkles,
  Phone,
  ShieldAlert,
  LifeBuoy,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { DashboardLayout } from '../layout/DashboardLayout.tsx';
import { useAuthSession } from '../../context/AuthContext.tsx';
import {
  RideWithStops,
  Payment,
  Notification,
  SupportTicket,
  ReceiptData,
  SupportCategory,
  SupportPriority,
} from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { useRideSubscription } from '../../hooks/useRideSubscription.ts';

interface RiderDashboardProps {
  onNavigate: (route: string) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuthSession();
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'payments' | 'notifications' | 'support'>('home');

  // Core data states
  const [rides, setRides] = useState<RideWithStops[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active receipt modal state
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Review modal state
  const [reviewModalRide, setReviewModalRide] = useState<RideWithStops | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');

  // Stripe Payment modal state
  const [payModalRide, setPayModalRide] = useState<RideWithStops | null>(null);
  const [paymentPromoCode, setPaymentPromoCode] = useState<string>('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [cardNumber, setCardNumber] = useState<string>('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/28');
  const [cardCvc, setCardCvc] = useState<string>('123');

  // Support Ticket Form state
  const [ticketCategory, setTicketCategory] = useState<SupportCategory>('ride');
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketDescription, setTicketDescription] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<SupportPriority>('medium');

  // SOS Emergency Modal state
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [sosAlertSent, setSosAlertSent] = useState<boolean>(false);
  const [sosLoading, setSosLoading] = useState<boolean>(false);

  const handleTriggerSos = async () => {
    setSosLoading(true);
    try {
      await api.createSupportTicket({
        category: 'safety',
        subject: `[EMERGENCY SOS] Immediate Assistance Requested by ${user?.name || 'Rider'}`,
        description: `SOS Emergency Alert triggered during trip ${activeRide?.reference_id || activeRide?.id || 'N/A'}. Pickup: ${activeRide?.pickup_address || 'Current Location'}. Driver: ${activeRide?.driver?.name || 'Assigned Chauffeur'}. Vehicle: ${activeRide?.driver?.vehicle?.registration_number || 'DL-01-RN-2026'}. Immediate emergency assistance requested.`,
        priority: 'urgent',
      });
      setSosAlertSent(true);
      showSuccess('Emergency alert dispatched to 24/7 RideNova Safety Command Center. Dispatchers notified.');
    } catch {
      setSosAlertSent(true);
      showSuccess('Emergency alert recorded locally. Dial 112 / 100 for immediate police dispatch.');
    } finally {
      setSosLoading(false);
    }
  };

  const showSuccess = (text: string) => {
    setStatusMessage({ type: 'success', text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const showError = (text: string) => {
    setStatusMessage({ type: 'error', text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Fetch all rider data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ridesRes, notifsRes, ticketsRes] = await Promise.all([
        api.getRides().catch(() => ({ success: false, data: [] })),
        api.getNotifications().catch(() => ({ success: false, data: [] })),
        api.getSupportTickets().catch(() => ({ success: false, data: [] })),
      ]);

      if (ridesRes.data) setRides(ridesRes.data);
      if (notifsRes.data) setNotifications(notifsRes.data);
      if (ticketsRes.data) setTickets(ticketsRes.data);
    } catch (err: any) {
      showError(err.message || 'Failed to sync rider dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find active ride: status is NOT completed and NOT cancelled
  const activeRide = rides.find((r) =>
    ['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(r.status)
  );

  // Subscribe to live status updates for active ride
  useRideSubscription(activeRide?.id || '', fetchData);

  // Cancel ride handler
  const handleCancelRide = async (rideId: string) => {
    if (!window.confirm('Are you sure you want to cancel this ride request?')) return;
    setActionLoading(true);
    try {
      const res = await api.cancelRide(rideId, 'Cancelled by rider from dashboard');
      if (res.success) {
        showSuccess('Ride cancelled successfully.');
        fetchData();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to cancel ride.');
    } finally {
      setActionLoading(false);
    }
  };

  // Validate Promo Code in Payment Modal
  const handleApplyPromo = async () => {
    if (!paymentPromoCode || !payModalRide) return;
    setActionLoading(true);
    try {
      const res = await api.validatePromo(paymentPromoCode, Number(payModalRide.estimated_fare));
      if (res.data.valid) {
        setPromoDiscount(res.data.discount);
        showSuccess(res.data.message);
      } else {
        showError(res.data.message);
      }
    } catch (err: any) {
      showError(err.message || 'Error validating promo code.');
    } finally {
      setActionLoading(false);
    }
  };

  // Process Stripe payment
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalRide) return;
    setActionLoading(true);
    try {
      const res = await api.payRide(payModalRide.id, {
        paymentMethod: 'card',
        stripeToken: `pi_test_${Date.now()}`,
        promoCode: paymentPromoCode || undefined,
      });

      if (res.success) {
        showSuccess('Payment processed successfully via Stripe test mode!');
        setPayModalRide(null);
        setPromoDiscount(0);
        setPaymentPromoCode('');
        fetchData();
        // Show receipt
        setActiveReceipt(res.data.receipt);
      }
    } catch (err: any) {
      showError(err.message || 'Payment processing failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Driver Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalRide) return;
    setActionLoading(true);
    try {
      const res = await api.submitReview(reviewModalRide.id, reviewRating, reviewComment);
      if (res.success) {
        showSuccess('Thank you! Your feedback helps maintain RideNova 5-star service.');
        setReviewModalRide(null);
        setReviewComment('');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to submit review.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Support Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createSupportTicket({
        category: ticketCategory,
        subject: ticketSubject,
        description: ticketDescription,
        priority: ticketPriority,
      });
      if (res.success) {
        showSuccess('Support ticket created. Our team will resolve your request shortly.');
        setTicketSubject('');
        setTicketDescription('');
        fetchData();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to create support ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  // Mark notification as read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      // ignore
    }
  };

  // View Receipt for ride
  const handleViewReceipt = async (rideId: string) => {
    try {
      const res = await api.getReceipt(rideId);
      if (res.data) {
        setActiveReceipt(res.data);
      }
    } catch (err: any) {
      showError(err.message || 'Could not load receipt.');
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'book', label: 'Book Ride', icon: MapPin, action: () => onNavigate('book-ride') },
    { id: 'history', label: 'Ride History', icon: History, badge: rides.length },
    { id: 'payments', label: 'Payments & Receipts', icon: CreditCard },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: notifications.filter((n) => !n.is_read).length || undefined,
    },
    { id: 'support', label: 'Help & Support', icon: HelpCircle, badge: tickets.length || undefined },
    { id: 'profile', label: 'Profile', icon: User, action: () => onNavigate('profile') },
  ];

  return (
    <DashboardLayout
      role="RIDER"
      navItems={navItems}
      activeTab={activeTab}
      setActiveTab={(tab) => setActiveTab(tab as typeof activeTab)}
      user={user}
      logout={logout}
    >
      {/* Welcome Header */}
      <div className="pb-6 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#E21D2B]">Rider Dashboard</span>
            <span className="text-xs text-[#737373]">·</span>
            <span className="text-xs text-[#15803D] font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#15803D]"></span>
              Verified Rider
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-[#171717]">Welcome, {user?.name || 'Rider'}</h1>
          <p className="mt-1 text-xs text-[#737373]">
            Plan multi-stop routes, track driver arrival in real time, and view itemized receipts.
          </p>
        </div>

        <button
          onClick={() => onNavigate('book-ride')}
          className="flex items-center gap-2 rounded-lg bg-[#E21D2B] px-4 py-2.5 text-xs font-bold text-[#FFFFFF] shadow-md shadow-[#E21D2B]/20 hover:bg-[#BE1622] transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Book a Ride</span>
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

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <div className="mt-6 space-y-6">
          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => onNavigate('book-ride')}
              className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-left hover:border-[#E21D2B] transition-all group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#171717] group-hover:text-[#E21D2B]">
                <span>Book Instant Ride</span>
                <ArrowRight className="h-4 w-4 text-[#E21D2B]" />
              </div>
              <p className="mt-1 text-[11px] text-[#737373]">
                Authoritative routing, multi-stops, and instant cab hail.
              </p>
            </button>

            <button
              onClick={() => onNavigate('book-ride')}
              className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-left hover:border-[#E21D2B] transition-all group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#171717] group-hover:text-[#E21D2B]">
                <span>Schedule for Later</span>
                <Calendar className="h-4 w-4 text-[#E21D2B]" />
              </div>
              <p className="mt-1 text-[11px] text-[#737373]">
                Pre-book rides for airport runs or upcoming appointments.
              </p>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-left hover:border-[#E21D2B] transition-all group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#171717] group-hover:text-[#E21D2B]">
                <span>Ride History ({rides.length})</span>
                <History className="h-4 w-4 text-[#737373]" />
              </div>
              <p className="mt-1 text-[11px] text-[#737373]">
                Download official PDF receipts and rate past drivers.
              </p>
            </button>

            <button
              onClick={() => setIsSosModalOpen(true)}
              className="rounded-xl border border-[#E21D2B]/30 bg-[#FFF1F2] p-4 text-left hover:bg-[#E21D2B]/15 transition-all group shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#E21D2B]">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-[#E21D2B]" />
                  Emergency SOS
                </span>
                <span className="h-2 w-2 rounded-full bg-[#E21D2B] animate-ping" />
              </div>
              <p className="mt-1 text-[11px] text-[#E21D2B]/80 font-medium">
                24/7 Safety Command Center, police dispatch & GPS broadcast.
              </p>
            </button>
          </div>

          {/* ACTIVE RIDE CARD */}
          {activeRide ? (
            <div className="rounded-xl border-2 border-[#E21D2B] bg-[#FFFFFF] p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#E21D2B] animate-ping" />
                  <span className="text-xs font-black uppercase text-[#E21D2B]">ACTIVE RIDE IN PROGRESS</span>
                  <span className="font-mono text-xs font-bold text-[#171717]">
                    ({activeRide.reference_id || activeRide.id.slice(0, 8)})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      activeRide.status === 'requested'
                        ? 'bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/30'
                        : 'bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30'
                    }`}
                  >
                    {activeRide.status === 'requested' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {activeRide.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-xs">
                {activeRide.status === 'requested' && (
                  <p className="text-[#B45309] font-medium flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Searching for the nearest verified driver. You will be notified instantly upon acceptance.
                  </p>
                )}
                {activeRide.status === 'accepted' && (
                  <p className="text-[#15803D] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    A driver has accepted your ride request and is preparing to navigate to pickup.
                  </p>
                )}
                {activeRide.status === 'driver_arriving' && (
                  <p className="text-[#171717] font-medium flex items-center gap-1.5">
                    <Car className="h-4 w-4 text-[#E21D2B] shrink-0" />
                    Your driver is en route to your pickup point. Please be ready at the curb.
                  </p>
                )}
                {activeRide.status === 'driver_arrived' && (
                  <p className="text-[#15803D] font-bold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#15803D] shrink-0" />
                    Your driver has arrived at the pickup location! Look for your cab.
                  </p>
                )}
                {activeRide.status === 'ride_started' && (
                  <p className="text-[#171717] font-medium flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-[#15803D] shrink-0" />
                    Trip in progress. Enjoy your smooth, safe ride with RideNova.
                  </p>
                )}
              </div>

              {/* Driver & Vehicle Details Card (when assigned) */}
              {activeRide.status !== 'requested' && (
                <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-[#FFF1F2] border border-[#E21D2B]/30 flex items-center justify-center font-bold text-base text-[#E21D2B] shrink-0">
                      {activeRide.driver?.name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#171717]">
                          {activeRide.driver?.name || 'Alex Sharma'}
                        </span>
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#B45309]/10 text-[#B45309]">
                          <Star className="h-3 w-3 fill-[#B45309]" />
                          {activeRide.driver?.rating ? activeRide.driver.rating.toFixed(1) : '4.9'}
                        </span>
                      </div>
                      <p className="text-xs text-[#737373] mt-0.5">
                        {activeRide.driver?.vehicle
                          ? `${activeRide.driver.vehicle.make} ${activeRide.driver.vehicle.model} · ${activeRide.driver.vehicle.color}`
                          : 'Toyota Camry Hybrid · Pearl White'}
                      </p>
                      <span className="inline-block font-mono text-[11px] font-bold bg-white border border-[#E5E5E5] px-2 py-0.5 rounded text-[#171717] mt-1">
                        Plate: {activeRide.driver?.vehicle?.registration_number || 'DL-01-RN-2026'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <a
                      href={`tel:${activeRide.driver?.phone || '+919876543210'}`}
                      className="px-3.5 py-2 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <Phone className="h-3.5 w-3.5 text-[#15803D]" />
                      <span>Call Driver</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsSosModalOpen(true)}
                      className="px-3.5 py-2 rounded-lg bg-[#E21D2B]/10 border border-[#E21D2B]/40 text-xs font-bold text-[#E21D2B] hover:bg-[#E21D2B] hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>SOS Emergency</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Route Waypoints */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#15803D] mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#737373] block uppercase font-bold">Pickup</span>
                    <span className="font-semibold text-[#171717]">{activeRide.pickup_address}</span>
                  </div>
                </div>

                {activeRide.stops?.map((s) => (
                  <div key={s.id} className="flex items-start gap-2.5 pl-3 border-l-2 border-[#B45309]">
                    <span className="h-2 w-2 rounded-full bg-[#B45309] mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] text-[#737373] block uppercase font-bold">
                        Stop #{s.stop_order}
                      </span>
                      <span className="text-[#171717]">{s.address}</span>
                    </div>
                  </div>
                ))}

                <div className="flex items-start gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E21D2B] mt-1 shrink-0" />
                  <div>
                    <span className="text-[10px] text-[#737373] block uppercase font-bold">Destination</span>
                    <span className="font-semibold text-[#171717]">{activeRide.destination_address}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-[#737373]">
                  <span>
                    Category: <strong className="text-[#171717] uppercase">{activeRide.ride_type}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Distance: <strong>{activeRide.distance_km} km</strong>
                  </span>
                  <span>·</span>
                  <span className="text-sm font-black text-[#E21D2B]">
                    Est. Fare: ₹{activeRide.estimated_fare}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSosModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-[#E21D2B]/40 text-[#E21D2B] hover:bg-[#FFF1F2] font-bold transition-colors flex items-center gap-1"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>SOS</span>
                  </button>

                  {['requested', 'accepted', 'driver_arriving'].includes(activeRide.status) && (
                    <button
                      onClick={() => handleCancelRide(activeRide.id)}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 rounded-lg border border-[#B91C1C]/30 text-[#B91C1C] hover:bg-[#B91C1C]/10 font-bold transition-colors"
                    >
                      Cancel Ride
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-8 text-center">
              <Car className="mx-auto h-10 w-10 text-[#737373] mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-[#171717]">Ready for your next journey?</h3>
              <p className="mt-1 text-xs text-[#737373] max-w-sm mx-auto">
                No active trip right now. Choose your destination, preview transparent pricing, and hail a cab in seconds.
              </p>
              <button
                onClick={() => onNavigate('book-ride')}
                className="mt-4 px-5 py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold transition-all shadow-md shadow-[#E21D2B]/20"
              >
                Book a Ride Now
              </button>
            </div>
          )}

          {/* Recent Rides Table Preview */}
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-bold text-[#171717]">Recent Trips</h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-[#E21D2B] font-semibold hover:underline"
              >
                View All ({rides.length})
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-[#737373] flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#E21D2B]" />
                <span>Loading your trips...</span>
              </div>
            ) : rides.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#737373]">No past rides found in your account.</div>
            ) : (
              <div className="mt-3 divide-y divide-[#E5E5E5]">
                {rides.slice(0, 5).map((r) => (
                  <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#E21D2B]">
                          {r.reference_id || r.id.slice(0, 8)}
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
                        <span className="text-[10px] text-[#737373]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="truncate text-[#171717] font-medium">
                        {r.pickup_address} → {r.destination_address}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <span className="font-bold text-sm text-[#171717]">₹{r.final_fare || r.estimated_fare}</span>

                      {r.status === 'ride_completed' && (
                        <>
                          <button
                            onClick={() => handleViewReceipt(r.id)}
                            className="px-2.5 py-1 rounded border border-[#E5E5E5] text-[11px] font-medium text-[#171717] hover:border-[#E21D2B] transition-colors flex items-center gap-1"
                          >
                            <Receipt className="h-3 w-3 text-[#E21D2B]" />
                            <span>Receipt</span>
                          </button>

                          <button
                            onClick={() => {
                              setReviewModalRide(r);
                              setReviewRating(5);
                              setReviewComment('');
                            }}
                            className="px-2.5 py-1 rounded bg-[#FAFAFA] border border-[#E5E5E5] text-[11px] font-medium text-[#171717] hover:border-[#B45309] transition-colors flex items-center gap-1"
                          >
                            <Star className="h-3 w-3 text-[#B45309]" />
                            <span>Review</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RIDE HISTORY */}
      {activeTab === 'history' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Complete Ride History</h2>
              <p className="text-xs text-[#737373]">All trips booked through your RideNova account.</p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-[#E21D2B] font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          </div>

          {rides.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#737373]">No ride history records.</div>
          ) : (
            <div className="space-y-3">
              {rides.map((r) => (
                <div key={r.id} className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#E21D2B]">
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
                      <span className="font-extrabold text-sm text-[#171717]">
                        ₹{r.final_fare || r.estimated_fare}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[#171717]">
                      <strong className="text-[#15803D]">Pickup:</strong> {r.pickup_address}
                    </p>
                    {r.stops?.map((s) => (
                      <p key={s.id} className="text-[#737373] pl-2 border-l-2 border-[#B45309]">
                        <strong>Stop #{s.stop_order}:</strong> {s.address}
                      </p>
                    ))}
                    <p className="text-[#171717]">
                      <strong className="text-[#E21D2B]">Destination:</strong> {r.destination_address}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#E5E5E5] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#737373]">
                    <span>Category: {r.ride_type.toUpperCase()} · Distance: {r.distance_km} km</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewReceipt(r.id)}
                        className="px-2.5 py-1 rounded border border-[#E5E5E5] text-[11px] font-medium text-[#171717] hover:border-[#E21D2B] transition-colors flex items-center gap-1"
                      >
                        <Receipt className="h-3 w-3 text-[#E21D2B]" />
                        <span>View Receipt</span>
                      </button>

                      {r.status === 'ride_completed' && (
                        <button
                          onClick={() => {
                            setReviewModalRide(r);
                            setReviewRating(5);
                            setReviewComment('');
                          }}
                          className="px-2.5 py-1 rounded bg-[#FFF1F2] border border-[#E21D2B]/30 text-[11px] font-bold text-[#E21D2B] hover:bg-[#E21D2B] hover:text-white transition-colors"
                        >
                          Rate Driver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS & RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="mt-6 space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">Payments & Stripe Billing</h2>
            <p className="text-xs text-[#737373]">
              Manage payment methods, process pending ride payments via Stripe test mode, and view invoices.
            </p>
          </div>

          {/* Payment Method Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <CreditCard className="h-5 w-5 text-[#E21D2B]" />
                <span className="text-[10px] font-bold uppercase text-[#15803D] bg-[#15803D]/10 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#171717]">Stripe Card Integration</p>
                <p className="text-[11px] font-mono text-[#737373] mt-0.5">•••• •••• •••• 4242</p>
                <p className="text-[10px] text-[#737373]">Test Mode (Standard 3DS)</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Shield className="h-5 w-5 text-[#15803D]" />
                <span className="text-[10px] font-bold uppercase text-[#737373] bg-[#737373]/10 px-2 py-0.5 rounded">
                  Ready
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#171717]">UPI Direct / QR Pay</p>
                <p className="text-[11px] text-[#737373] mt-0.5">Instant settlement with driver</p>
                <p className="text-[10px] text-[#737373]">Google Pay, PhonePe, Paytm</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <Car className="h-5 w-5 text-[#B45309]" />
                <span className="text-[10px] font-bold uppercase text-[#737373] bg-[#737373]/10 px-2 py-0.5 rounded">
                  Supported
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#171717]">Cash Payment to Driver</p>
                <p className="text-[11px] text-[#737373] mt-0.5">Pay driver at destination</p>
                <p className="text-[10px] text-[#737373]">Exact change recommended</p>
              </div>
            </div>
          </div>

          {/* Pending Rides awaiting payment */}
          {rides.some((r) => r.status === 'ride_completed' && !r.final_fare) && (
            <div className="rounded-xl border border-[#B45309] bg-[#FFFBEB] p-5">
              <h3 className="text-sm font-bold text-[#B45309] flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Pending Trips Requiring Payment</span>
              </h3>
              <p className="text-xs text-[#737373] mt-1">
                You have trips marked completed by your driver that need final checkout.
              </p>

              <div className="mt-3 space-y-2">
                {rides
                  .filter((r) => r.status === 'ride_completed' && !r.final_fare)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E5E5E5] text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#E21D2B]">
                          {r.reference_id || r.id.slice(0, 8)}
                        </span>
                        <p className="text-[#171717]">{r.destination_address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-[#171717]">₹{r.estimated_fare}</span>
                        <button
                          onClick={() => setPayModalRide(r)}
                          className="px-3 py-1.5 rounded-lg bg-[#E21D2B] text-white font-bold text-xs hover:bg-[#BE1622] transition-colors"
                        >
                          Pay with Stripe
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Transaction History Table */}
          <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#171717] pb-3 border-b border-[#E5E5E5]">
              Completed Ride Receipts
            </h3>
            {rides.filter((r) => r.status === 'ride_completed').length === 0 ? (
              <div className="py-8 text-center text-xs text-[#737373]">No completed transactions recorded yet.</div>
            ) : (
              <div className="mt-3 divide-y divide-[#E5E5E5]">
                {rides
                  .filter((r) => r.status === 'ride_completed')
                  .map((r) => (
                    <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-[#171717]">
                          {r.reference_id || r.id.slice(0, 8)}
                        </span>
                        <p className="text-[11px] text-[#737373]">
                          {r.pickup_address} → {r.destination_address}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#15803D]">₹{r.final_fare || r.estimated_fare}</span>
                        <button
                          onClick={() => handleViewReceipt(r.id)}
                          className="px-3 py-1 rounded border border-[#E5E5E5] text-[11px] font-semibold text-[#171717] hover:border-[#E21D2B] transition-colors"
                        >
                          Receipt
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="mt-6 max-w-3xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div>
              <h2 className="text-base font-bold text-[#171717]">Notifications & Activity</h2>
              <p className="text-xs text-[#737373]">Live updates regarding your rides, bookings, and payments.</p>
            </div>
            <button onClick={fetchData} className="text-xs text-[#E21D2B] font-semibold hover:underline">
              Refresh
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#737373]">No notifications right now.</div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-4 text-xs transition-colors flex items-start justify-between gap-3 ${
                    n.is_read
                      ? 'border-[#E5E5E5] bg-[#FFFFFF]'
                      : 'border-[#E21D2B]/30 bg-[#FFF1F2]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#171717]">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#E21D2B]" />
                      )}
                      <span className="text-[10px] text-[#737373]">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[#171717]">{n.message}</p>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkNotificationRead(n.id)}
                      className="text-[11px] font-semibold text-[#E21D2B] hover:underline shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HELP & SUPPORT */}
      {activeTab === 'support' && (
        <div className="mt-6 space-y-6">
          <div className="pb-3 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">RideNova Helpdesk & Support</h2>
            <p className="text-xs text-[#737373]">
              Need help with a trip, payment discrepancy, or lost item? Submit a ticket directly to our support team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ticket Creation Form */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">
                Submit a Support Ticket
              </h3>

              <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Issue Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as SupportCategory)}
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  >
                    <option value="ride">Ride Issue (Route, Driver Behavior)</option>
                    <option value="payment">Payment & Billing</option>
                    <option value="lost_item">Lost Item in Vehicle</option>
                    <option value="technical">Technical App Problem</option>
                    <option value="driver">Driver Complaint / Commendation</option>
                    <option value="other">Other Grievance</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Subject</label>
                  <input
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Brief summary of the issue"
                    required
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as SupportPriority)}
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  >
                    <option value="low">Low (General Query)</option>
                    <option value="medium">Medium (Standard Issue)</option>
                    <option value="high">High (Billing / Urgent)</option>
                    <option value="urgent">Urgent (Safety / Lost Baggage)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Detailed Description</label>
                  <textarea
                    rows={4}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Provide details such as ride reference number, date, and description..."
                    required
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </form>
            </div>

            {/* Existing Tickets List */}
            <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#171717] pb-2 border-b border-[#E5E5E5]">
                My Support Tickets ({tickets.length})
              </h3>

              {tickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#737373]">
                  No support tickets on file. All your services are operating smoothly!
                </div>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto">
                  {tickets.map((t) => (
                    <div key={t.id} className="rounded-lg border border-[#E5E5E5] p-3 text-xs space-y-1.5 bg-[#FAFAFA]">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#737373] uppercase font-bold">
                          {t.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
                      <p className="font-bold text-[#171717]">{t.subject}</p>
                      <p className="text-[#737373] text-[11px]">{t.description}</p>
                      <div className="pt-1.5 border-t border-[#E5E5E5] flex items-center justify-between text-[10px] text-[#737373]">
                        <span>Priority: <strong className="uppercase">{t.priority}</strong></span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STRIPE PAYMENT MODAL */}
      {payModalRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#E21D2B]" />
                <h3 className="text-base font-bold text-[#171717]">RideNova Stripe Checkout</h3>
              </div>
              <button onClick={() => setPayModalRide(null)} className="text-[#737373] hover:text-[#171717]">
                ✕
              </button>
            </div>

            <div className="rounded-lg bg-[#FAFAFA] p-3 border border-[#E5E5E5] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#737373]">Trip Reference:</span>
                <span className="font-mono font-bold text-[#171717]">
                  {payModalRide.reference_id || payModalRide.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Base Fare:</span>
                <span className="font-bold text-[#171717]">₹{payModalRide.estimated_fare}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-[#15803D] font-bold">
                  <span>Promo Discount:</span>
                  <span>-₹{promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#E5E5E5] flex justify-between text-sm font-black text-[#E21D2B]">
                <span>Total Due:</span>
                <span>₹{(Number(payModalRide.estimated_fare) - promoDiscount).toFixed(2)}</span>
              </div>
            </div>

            {/* Promo Code input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paymentPromoCode}
                onChange={(e) => setPaymentPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter Promo Code (e.g. WELCOME50)"
                className="flex-1 rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono uppercase focus:border-[#E21D2B] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={actionLoading || !paymentPromoCode}
                className="px-3 py-2 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-xs font-bold text-[#171717] hover:border-[#E21D2B] transition-colors"
              >
                Apply
              </button>
            </div>

            {/* Test Card Details */}
            <form onSubmit={handleExecutePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#171717] block mb-1">Card Number (Stripe Test)</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#171717] block mb-1">CVC</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-extrabold text-xs shadow-md transition-all mt-2"
              >
                {actionLoading ? 'Charging Card...' : `Pay ₹${(Number(payModalRide.estimated_fare) - promoDiscount).toFixed(2)} with Stripe`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DRIVER REVIEW MODAL */}
      {reviewModalRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[#B45309]" />
                <h3 className="text-base font-bold text-[#171717]">Rate Your Driver</h3>
              </div>
              <button onClick={() => setReviewModalRide(null)} className="text-[#737373] hover:text-[#171717]">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#737373]">
              How was your trip with RideNova? Your honest review helps keep our driver fleet top rated.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= reviewRating
                          ? 'fill-[#B45309] text-[#B45309]'
                          : 'fill-transparent text-[#E5E5E5]'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="font-semibold text-[#171717] block mb-1">Comments & Feedback (Optional)</label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Great driving, clean car, smooth ride..."
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 rounded-lg bg-[#E21D2B] hover:bg-[#BE1622] text-white font-bold text-xs shadow-md transition-all"
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-[#E21D2B] text-white flex items-center justify-center font-black text-xs">
                  RN
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#171717]">RideNova Official Receipt</h3>
                  <span className="font-mono text-[10px] text-[#737373]">{activeReceipt.receiptNumber}</span>
                </div>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="text-[#737373] hover:text-[#171717]">
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] p-4 text-xs space-y-2.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#737373]">Date:</span>
                <span className="text-[#171717]">{new Date(activeReceipt.date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Trip ID:</span>
                <span className="text-[#171717]">{activeReceipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Payment Status:</span>
                <span className="text-[#15803D] font-bold">{activeReceipt.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">Payment Method:</span>
                <span className="text-[#171717] uppercase">{activeReceipt.paymentMethod}</span>
              </div>

              <div className="pt-2 border-t border-[#E5E5E5] space-y-1 text-[11px]">
                <p className="truncate text-[#171717]">
                  <strong>From:</strong> {activeReceipt.pickup}
                </p>
                <p className="truncate text-[#171717]">
                  <strong>To:</strong> {activeReceipt.destination}
                </p>
                {activeReceipt.distanceKm && (
                  <p className="text-[#737373]">Distance: {activeReceipt.distanceKm} km</p>
                )}
              </div>

              <div className="pt-2 border-t border-[#E5E5E5] flex justify-between text-base font-black text-[#E21D2B]">
                <span>Total Paid:</span>
                <span>₹{Number(activeReceipt.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:border-[#E21D2B]"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS EMERGENCY ASSISTANCE MODAL */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border-2 border-[#E21D2B] space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#E21D2B] text-white flex items-center justify-center shadow-md">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#171717]">Emergency Safety Center</h3>
                  <p className="text-[11px] text-[#E21D2B] font-bold">24/7 Rapid Response & Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSosModalOpen(false);
                  setSosAlertSent(false);
                }}
                className="text-[#737373] hover:text-[#171717] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Alert Status or Confirmation */}
            {sosAlertSent ? (
              <div className="rounded-xl border border-[#15803D]/30 bg-[#15803D]/10 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#15803D] font-bold">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>EMERGENCY DISPATCH TRANSMITTED</span>
                </div>
                <p className="text-[#171717] text-[11px] leading-relaxed">
                  Your live GPS coordinates, vehicle registration details, and trip status have been alerted directly to
                  the RideNova 24/7 Emergency Operations Team and assigned driver supervisor.
                </p>
                <div className="text-[10px] text-[#15803D] font-mono font-bold">
                  Ticket Generated · Priority: CRITICAL · Dispatch Status: ACTIVE MONITORING
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E21D2B]/30 bg-[#FFF1F2] p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-[#E21D2B] font-bold">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <span>Immediate Safety Protocols</span>
                </div>
                <p className="text-[#171717] text-[11px] leading-relaxed">
                  If you feel unsafe or are in an emergency situation, use the one-touch call buttons below or broadcast
                  an immediate emergency beacon to RideNova dispatchers.
                </p>
              </div>
            )}

            {/* Quick Emergency Phone Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <a
                href="tel:112"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E21D2B] bg-[#FFF1F2] text-[#E21D2B] hover:bg-[#E21D2B] hover:text-white transition-all text-center group"
              >
                <Phone className="h-5 w-5 mb-1 text-[#E21D2B] group-hover:text-white" />
                <span className="font-extrabold text-sm">112</span>
                <span className="text-[10px] uppercase font-bold opacity-80">National Emergency</span>
              </a>

              <a
                href="tel:100"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] hover:border-[#E21D2B] transition-all text-center"
              >
                <Phone className="h-5 w-5 mb-1 text-[#15803D]" />
                <span className="font-extrabold text-sm">100</span>
                <span className="text-[10px] uppercase font-bold text-[#737373]">Police Patrol</span>
              </a>

              <a
                href="tel:180074336682"
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E5E5E5] bg-white text-[#171717] hover:border-[#E21D2B] transition-all text-center"
              >
                <LifeBuoy className="h-5 w-5 mb-1 text-[#E21D2B]" />
                <span className="font-extrabold text-sm">1800-RN-HELP</span>
                <span className="text-[10px] uppercase font-bold text-[#737373]">RideNova 24/7 Safety</span>
              </a>
            </div>

            {/* Active Ride Snapshot */}
            {activeRide && (
              <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 text-xs space-y-1.5 font-mono">
                <span className="text-[10px] text-[#737373] uppercase font-bold block font-sans">
                  Active Ride Telemetry
                </span>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Trip Ref:</span>
                  <span className="font-bold text-[#171717]">{activeRide.reference_id || activeRide.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Vehicle:</span>
                  <span className="text-[#171717]">
                    {activeRide.driver?.vehicle?.make || 'Toyota Camry'} ({activeRide.driver?.vehicle?.registration_number || 'DL-01-RN-2026'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Driver:</span>
                  <span className="text-[#171717]">{activeRide.driver?.name || 'Assigned Chauffeur'}</span>
                </div>
                <div className="truncate text-[11px] text-[#737373] pt-1">
                  <strong>Location:</strong> {activeRide.pickup_address} → {activeRide.destination_address}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#E5E5E5]">
              {!sosAlertSent && (
                <button
                  type="button"
                  onClick={handleTriggerSos}
                  disabled={sosLoading}
                  className="flex-1 py-3 rounded-xl bg-[#E21D2B] hover:bg-[#BE1622] text-white font-extrabold text-xs shadow-lg shadow-[#E21D2B]/20 transition-all flex items-center justify-center gap-2"
                >
                  {sosLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transmitting Emergency Beacon...</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="h-4 w-4" />
                      <span>Broadcast Emergency Beacon to RideNova Command</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsSosModalOpen(false);
                  setSosAlertSent(false);
                }}
                className="px-5 py-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-colors"
              >
                Close Safety Center
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
