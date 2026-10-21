import React, { useState } from 'react';
import {
  Car,
  Package,
  Calendar,
  Clock,
  Search,
  MapPin,
  ArrowRight,
  Shield,
  Check,
  X,
  Bell,
  Sparkles,
  Navigation,
  ChevronRight,
  AlertCircle,
  Loader2,
  Tag,
  Eye,
} from 'lucide-react';
import { RideWithStops } from '../../types/index.ts';
import { useAuthSession } from '../../context/AuthContext.tsx';

interface CustomerHomeProps {
  onNavigate: (route: string) => void;
  activeRide?: RideWithStops;
  onCancelRide: (rideId: string) => void;
  actionLoading: boolean;
  onViewTripDetails?: (rideId: string) => void;
}

interface ServiceItem {
  id: 'ride' | 'package' | 'reserve' | 'hourly';
  title: string;
  subtitle: string;
  imageUrl: string;
  fallbackImageUrl: string;
  badge?: string;
  isAvailable: boolean;
  tagline: string;
  description: string;
  features: string[];
}

const SERVICES: ServiceItem[] = [
  {
    id: 'ride',
    title: 'Ride',
    subtitle: 'Anywhere, anytime',
    imageUrl: 'https://i.ibb.co/3yBbRHHw/e86fb767-1649-46c0-9cb2-d8a7b85c12a3.png',
    fallbackImageUrl: '/assets/services/ride.png',
    isAvailable: true,
    tagline: 'Instant On-Demand Rides',
    description: 'Get matched with verified drivers nearby for fast, dependable travel across the city.',
    features: ['Real-time driver tracking', 'Upfront guaranteed pricing', 'Cashless instant payments'],
  },
  {
    id: 'package',
    title: 'Package',
    subtitle: 'Express delivery',
    imageUrl: 'https://i.ibb.co/xt4N99wT/Screenshot-2026-10-20-175337.png',
    fallbackImageUrl: '/assets/services/package.png',
    isAvailable: true,
    tagline: 'Door-to-Door Courier Delivery',
    description: 'Send and receive parcels, care packages, keys, or business documents across town.',
    features: ['Same-day courier dispatch', 'Live package tracking with PIN', 'Photo drop-off confirmation'],
  },
  {
    id: 'reserve',
    title: 'Reserve',
    subtitle: 'Plan ahead',
    imageUrl: 'https://i.ibb.co/bRqCjtqH/image.png',
    fallbackImageUrl: '/assets/services/reserve.png',
    badge: 'Soon',
    isAvailable: false,
    tagline: 'Scheduled Advance Bookings',
    description: 'Schedule your ride up to 90 days in advance with guaranteed driver assignment and extra wait time.',
    features: ['Book up to 90 days early', 'Guaranteed driver arrival', 'Complimentary wait time'],
  },
  {
    id: 'hourly',
    title: 'Hourly',
    subtitle: 'Chauffeur by hour',
    imageUrl: 'https://i.ibb.co/rKmmK5W7/image.png',
    fallbackImageUrl: '/assets/services/hourly.png',
    badge: 'Soon',
    isAvailable: false,
    tagline: 'Dedicated Chauffeur & Vehicle',
    description: 'Rent a dedicated car and professional driver by the hour for multi-stop errands, meetings, or day tours.',
    features: ['Unlimited stops within duration', 'Driver waits between stops', 'Flexible hourly extensions'],
  },
];

const ServiceCard: React.FC<{
  item: ServiceItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const [src, setSrc] = useState(item.imageUrl);

  const handleError = () => {
    if (src === item.imageUrl) {
      setSrc(item.fallbackImageUrl);
    } else {
      setImgError(true);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${item.title} service${item.badge ? ` - ${item.badge}` : ''}`}
      className="group relative flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl border border-[#E5E5E5] bg-white hover:border-[#E21D2B]/50 hover:shadow-md active:scale-[0.97] transition-all duration-150 text-center w-full focus:outline-none focus:ring-2 focus:ring-[#E21D2B]/30"
    >
      {/* Subtle Coming Soon Badge */}
      {item.badge && (
        <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-tight bg-[#FFF1F2] text-[#E21D2B] border border-[#E21D2B]/20 shadow-xs">
          {item.badge}
        </span>
      )}

      {/* Visual Image Container with object-contain */}
      <div className="w-full h-14 sm:h-16 md:h-20 flex items-center justify-center p-0.5 overflow-hidden">
        {!imgError ? (
          <img
            src={src}
            alt={item.title}
            onError={handleError}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#FFF1F2] text-[#E21D2B]">
            {item.id === 'ride' && <Car className="h-5 w-5" />}
            {item.id === 'package' && <Package className="h-5 w-5" />}
            {item.id === 'reserve' && <Calendar className="h-5 w-5" />}
            {item.id === 'hourly' && <Clock className="h-5 w-5" />}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="mt-1 sm:mt-1.5 flex flex-col items-center">
        <span className="text-[11px] sm:text-xs font-bold text-[#171717] group-hover:text-[#E21D2B] transition-colors leading-tight">
          {item.title}
        </span>
      </div>
    </button>
  );
};

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  onNavigate,
  activeRide,
  onCancelRide,
  actionLoading,
  onViewTripDetails,
}) => {
  const { user } = useAuthSession();
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [notifiedServices, setNotifiedServices] = useState<Record<string, boolean>>({});

  const handleServiceClick = (item: ServiceItem) => {
    if (item.id === 'package') {
      onNavigate('book-parcel');
    } else if (item.isAvailable) {
      onNavigate('book-ride');
    } else {
      setSelectedService(item);
    }
  };

  const handleToggleNotify = (serviceId: string) => {
    setNotifiedServices((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Top Welcome / Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
        <div>
          <span className="text-xs font-semibold text-[#737373]">Good day,</span>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#171717]">
            {user?.name ? user.name.split(' ')[0] : 'Rider'} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('book-ride')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm"
          >
            <Car className="h-3.5 w-3.5" />
            <span>Book Ride</span>
          </button>
          <div className="h-9 w-9 rounded-full bg-[#FFF1F2] border border-[#E21D2B]/30 flex items-center justify-center text-xs font-extrabold text-[#E21D2B]">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </div>

      {/* Active Trip Banner if user has an ongoing ride */}
      {activeRide && (
        <div className="p-4 rounded-2xl border-2 border-[#E21D2B] bg-[#FFF1F2] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E21D2B] animate-ping" />
              <span className="text-xs font-black uppercase text-[#E21D2B] tracking-wider">
                Active Ride · {activeRide.status.replace('_', ' ')}
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-[#171717]">
              {activeRide.reference_id || activeRide.id.slice(0, 8)}
            </span>
          </div>

          {/* Assigned Driver & OTP Micro-Snapshot */}
          {activeRide.driver && (
            <div className="p-2.5 bg-white rounded-xl border border-[#E21D2B]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-[#E21D2B]/10 text-[#E21D2B] font-bold text-xs flex items-center justify-center shrink-0">
                  {activeRide.driver.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-[#171717] leading-tight">{activeRide.driver.name}</p>
                  <p className="text-[11px] text-[#737373]">
                    {activeRide.driver.vehicle
                      ? `${activeRide.driver.vehicle.make} ${activeRide.driver.vehicle.model} · ${activeRide.driver.vehicle.registration_number}`
                      : 'Verified Driver Partner'}
                  </p>
                </div>
              </div>
              {activeRide.otp_code && !activeRide.otp_verified && (
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-[#737373] block">Passenger OTP</span>
                  <span className="font-mono text-xs font-extrabold text-[#E21D2B] px-1.5 py-0.5 rounded bg-[#FFF1F2] border border-[#E21D2B]/30">
                    {activeRide.otp_code}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-[#E5E5E5]">
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 text-[#15803D] mt-0.5 shrink-0" />
              <p className="text-xs text-[#171717] font-medium truncate">
                <span className="text-[#737373]">Pickup:</span> {activeRide.pickup_address}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Navigation className="h-3.5 w-3.5 text-[#E21D2B] mt-0.5 shrink-0" />
              <p className="text-xs text-[#171717] font-bold truncate">
                <span className="text-[#737373] font-normal">Drop:</span> {activeRide.destination_address}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div>
              <span className="text-[10px] text-[#737373] uppercase font-bold">Fare</span>
              <p className="text-sm font-black text-[#171717]">₹{activeRide.estimated_fare}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onViewTripDetails ? onViewTripDetails(activeRide.id) : onNavigate('book-ride')
                }
                className="px-3.5 py-1.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View Trip Details</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('book-ride')}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA] cursor-pointer"
              >
                View Map
              </button>
              <button
                type="button"
                onClick={() => onCancelRide(activeRide.id)}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Where to? Search Input Action */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onNavigate('book-ride')}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-[#E5E5E5] shadow-xs hover:border-[#E21D2B]/50 hover:shadow-sm active:scale-[0.99] transition-all duration-150 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FFF1F2] flex items-center justify-center text-[#E21D2B] group-hover:scale-110 transition-transform">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <span className="text-sm font-bold text-[#171717] block">Where to?</span>
              <span className="text-xs text-[#737373]">Enter pickup and destination</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F5] text-xs font-semibold text-[#171717]">
            <Clock className="h-3 w-3 text-[#737373]" />
            <span>Now</span>
          </div>
        </button>

        {/* Quick Location Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { label: 'Airport', icon: MapPin },
            { label: 'Railway Station', icon: MapPin },
            { label: 'Work', icon: Navigation },
            { label: 'City Center Mall', icon: MapPin },
          ].map((dest, idx) => {
            const Icon = dest.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigate('book-ride')}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E5E5E5] text-[11px] font-semibold text-[#171717] hover:border-[#E21D2B]/40 hover:bg-[#FFF1F2]/50 active:scale-95 transition-all"
              >
                <Icon className="h-3 w-3 text-[#E21D2B]" />
                <span>{dest.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Section with the 4 Custom Visual Cards */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#171717] tracking-tight">Services</h2>
          <span className="text-[11px] font-medium text-[#737373]">Go anywhere</span>
        </div>

        {/* Responsive 4-Column Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {SERVICES.map((item) => (
            <ServiceCard
              key={item.id}
              item={item}
              onClick={() => handleServiceClick(item)}
            />
          ))}
        </div>
      </div>

      {/* Promotional Campaign Banner */}
      <div className="rounded-2xl border border-[#E5E5E5] bg-gradient-to-r from-[#FFF1F2] via-white to-white p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#E21D2B] text-white">
              Promo
            </span>
            <span className="text-xs font-bold text-[#171717]">Flat 20% Off Your First Ride</span>
          </div>
          <p className="text-[11px] text-[#737373]">
            Use code <span className="font-mono font-bold text-[#E21D2B]">FIRST50</span> at checkout
          </p>
        </div>
        <button
          onClick={() => onNavigate('book-ride')}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-[#171717] hover:bg-[#000000] text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
        >
          <span>Ride Now</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Safety & Trust Highlights */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="p-3 rounded-xl border border-[#E5E5E5] bg-white flex items-center gap-2.5 shadow-xs">
          <div className="h-8 w-8 rounded-lg bg-[#FFF1F2] flex items-center justify-center text-[#E21D2B] shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#171717] leading-tight">Verified Drivers</p>
            <p className="text-[10px] text-[#737373] leading-tight">Background checked</p>
          </div>
        </div>
        <div className="p-3 rounded-xl border border-[#E5E5E5] bg-white flex items-center gap-2.5 shadow-xs">
          <div className="h-8 w-8 rounded-lg bg-[#FFF1F2] flex items-center justify-center text-[#E21D2B] shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#171717] leading-tight">Zero Cancellation Fee</p>
            <p className="text-[10px] text-[#737373] leading-tight">Fair & transparent</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Modal */}
      {selectedService && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl border border-[#E5E5E5] space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFF1F2] text-[#E21D2B] border border-[#E21D2B]/30">
                  Coming Soon
                </span>
                <span className="text-xs text-[#737373]">New Feature</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-full hover:bg-[#F5F5F5] text-[#737373] hover:text-[#171717] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Service Artwork & Title */}
            <div className="text-center space-y-2">
              <div className="h-28 w-full flex items-center justify-center p-2 rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
                <img
                  src={selectedService.imageUrl}
                  alt={selectedService.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <h3 className="text-lg font-black text-[#171717] pt-1">
                {selectedService.tagline}
              </h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                {selectedService.description}
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="bg-[#FFF1F2]/60 rounded-xl p-3 border border-[#E21D2B]/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E21D2B]">
                What to expect:
              </span>
              <ul className="space-y-1.5 text-xs text-[#171717]">
                {selectedService.features.map((feat, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[#E21D2B] shrink-0" />
                    <span className="font-medium">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleToggleNotify(selectedService.id)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  notifiedServices[selectedService.id]
                    ? 'bg-[#15803D] text-white'
                    : 'bg-[#FFF1F2] text-[#E21D2B] hover:bg-[#FFE4E6] border border-[#E21D2B]/30'
                }`}
              >
                {notifiedServices[selectedService.id] ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Notification Saved! We'll alert you at launch</span>
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    <span>Notify Me When Launched</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedService(null);
                  onNavigate('book-ride');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E21D2B] hover:bg-[#BE1622] text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Car className="h-4 w-4" />
                <span>Book a Ride Instead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
