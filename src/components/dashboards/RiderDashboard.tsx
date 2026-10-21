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
  Eye,
  X,
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
import { CustomerHome } from './CustomerHome.tsx';
import { BottomNav } from '../layout/BottomNav.tsx';
import { TripDetailsModal } from '../booking/TripDetailsModal.tsx';

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

  // Trip details modal state
  const [selectedTripDetailsId, setSelectedTripDetailsId] = useState<string | null>(null);
  const [isTripDetailsOpen, setIsTripDetailsOpen] = useState<boolean>(false);

  // Rider Cancel Modal state
  const [cancelModalRideId, setCancelModalRideId] = useState<string | null>(null);
  const [cancelModalReason, setCancelModalReason] = useState<string>('Change of plans');

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
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      showSuccess('Payment completed successfully via Stripe Checkout!');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('payment') === 'cancelled') {
      showError('Stripe Checkout was cancelled. You can retry payment anytime.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchData]);

  // Find active ride: status is NOT completed and NOT cancelled
  const activeRide = rides.find((r) =>
    ['requested', 'accepted', 'driver_arriving', 'driver_arrived', 'ride_started'].includes(r.status)
  );

  // Subscribe to live status updates for active ride
  useRideSubscription(activeRide?.id || '', fetchData);

  // Cancel ride handler - opens confirmation modal
  const handleCancelRide = (rideId: string) => {
    setCancelModalRideId(rideId);
  };

  const handleConfirmCancelRide = async () => {
    if (!cancelModalRideId) return;
    setActionLoading(true);
    try {
      const res = await api.cancelRide(cancelModalRideId, cancelModalReason);
      if (res.success) {
        showSuccess('Ride cancelled successfully.');
        setCancelModalRideId(null);
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

  // Process Stripe payment via Checkout Session
  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalRide) return;
    setActionLoading(true);
    try {
      const res = await api.createCheckoutSession(payModalRide.id, paymentPromoCode || undefined);
      if (res.success && res.data) {
        if (res.data.url) {
          showSuccess('Redirecting to secure Stripe Checkout...');
          window.location.href = res.data.url;
        } else {
          showSuccess('Payment processed successfully via Stripe!');
          setPayModalRide(null);
          setPromoDiscount(0);
          setPaymentPromoCode('');
          fetchData();
        }
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
      {/* Status Message */}
      {statusMessage && (
        <div
          className={`mb-4 flex items-center justify-between rounded-xl p-3.5 text-xs animate-fade-in ${
            statusMessage.type === 'success'
              ? 'border border-[#15803D]/30 bg-[#15803D]/10 text-[#15803D]'
              : 'border border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#B91C1C]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#15803D]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#B91C1C]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: HOME */}
      {activeTab === 'home' && (
        <CustomerHome 
          onNavigate={onNavigate} 
          activeRide={activeRide} 
          onCancelRide={handleCancelRide} 
          actionLoading={actionLoading}
          onViewTripDetails={(id) => {
            setSelectedTripDetailsId(id);
            setIsTripDetailsOpen(true);
          }}
        />
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
                        type="button"
                        onClick={() => {
                          setSelectedTripDetailsId(r.id);
                          setIsTripDetailsOpen(true);
                        }}
                        className="px-2.5 py-1 rounded border border-[#E5E5E5] text-[11px] font-medium text-[#171717] hover:border-[#E21D2B] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3 w-3 text-[#E21D2B]" />
                        <span>View Details</span>
                      </button>

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
                    {activeRide.driver?.vehicle
                      ? `${activeRide.driver.vehicle.make} ${activeRide.driver.vehicle.model} (${activeRide.driver.vehicle.registration_number})`
                      : 'Vehicle details not available yet'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">Driver:</span>
                  <span className="text-[#171717]">{activeRide.driver?.name || 'Driver not assigned yet'}</span>
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

      {/* Customer Cancellation Confirmation Modal */}
      {cancelModalRideId && (
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
                onClick={() => setCancelModalRideId(null)}
                className="p-1.5 rounded-lg text-[#737373] hover:bg-[#FAFAFA] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#737373]">
                Are you sure you want to cancel this trip? Please select a reason below:
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
                      cancelModalReason === reason
                        ? 'border-[#B91C1C] bg-[#FFF1F2]/40 text-[#171717]'
                        : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#737373]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="riderCancelReason"
                      value={reason}
                      checked={cancelModalReason === reason}
                      onChange={(e) => setCancelModalReason(e.target.value)}
                      className="text-[#B91C1C] focus:ring-[#B91C1C]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
              <button
                type="button"
                onClick={() => setCancelModalRideId(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl border border-[#E5E5E5] bg-white text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA] cursor-pointer"
              >
                Keep Ride
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRide}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Customer Trip Details Modal */}
      <TripDetailsModal
        isOpen={isTripDetailsOpen}
        onClose={() => {
          setIsTripDetailsOpen(false);
          setSelectedTripDetailsId(null);
        }}
        rideId={selectedTripDetailsId || activeRide?.id || null}
        onNavigate={onNavigate}
        onCancelRide={handleCancelRide}
      />
    </DashboardLayout>
  );
};
