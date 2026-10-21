import React, { useState } from 'react';
import {
  Package,
  MapPin,
  Navigation,
  ArrowRight,
  ArrowLeft,
  Check,
  Shield,
  Camera,
  Upload,
  X,
  CreditCard,
  Banknote,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api.ts';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { ParcelTracker } from './ParcelTracker.tsx';
import { isWithinServiceArea } from '../../utils/serviceArea.ts';

interface ParcelBookingPageProps {
  onNavigate: (route: string) => void;
}

const SUGGESTED_PLACES = [
  { name: 'Connaught Place', address: 'Connaught Place, New Delhi, Delhi 110001', lat: 28.6315, lng: 77.2167 },
  { name: 'Cyber City', address: 'DLF Cyber City, Phase 2, Gurugram, Haryana 122002', lat: 28.4950, lng: 77.0895 },
  { name: 'IGI Airport Terminal 3', address: 'IGI Airport, New Delhi, Delhi 110037', lat: 28.5562, lng: 77.1000 },
  { name: 'Sector 29 Market', address: 'Sector 29, Gurugram, Haryana 122001', lat: 28.4682, lng: 77.0632 },
  { name: 'Noida City Centre', address: 'Sector 32, Noida, Uttar Pradesh 201301', lat: 28.5700, lng: 77.3600 },
];

const CATEGORIES = [
  { id: 'document', label: 'Important Document / Legal Papers', icon: '📄' },
  { id: 'clothing', label: 'Clothing, Apparel & Fashion', icon: '👕' },
  { id: 'gift', label: 'Gift Box, Flowers & Celebration', icon: '🎁' },
  { id: 'electronics', label: 'Gadgets & Electronics', icon: '💻' },
  { id: 'other', label: 'General Parcel / Box', icon: '📦' },
];

export const ParcelBookingPage: React.FC<ParcelBookingPageProps> = ({ onNavigate }) => {
  const { user } = useAuthSession();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<string>('document');
  const [packageSize, setPackageSize] = useState<'small' | 'medium' | 'large'>('small');
  const [weightKg, setWeightKg] = useState<number>(1.0);
  const [isFragile, setIsFragile] = useState<boolean>(false);
  const [senderDescription, setSenderDescription] = useState<string>('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([
    'https://i.ibb.co/3yBbRHHw/e86fb767-1649-46c0-9cb2-d8a7b85c12a3.png',
  ]);

  const [pickupAddress, setPickupAddress] = useState<string>(SUGGESTED_PLACES[0].address);
  const [pickupLat, setPickupLat] = useState<number>(SUGGESTED_PLACES[0].lat);
  const [pickupLng, setPickupLng] = useState<number>(SUGGESTED_PLACES[0].lng);
  const [senderName, setSenderName] = useState<string>(user?.name || 'Sender');
  const [senderPhone, setSenderPhone] = useState<string>(user?.phone || '+91 98765 43210');

  const [deliveryAddress, setDeliveryAddress] = useState<string>(SUGGESTED_PLACES[1].address);
  const [deliveryLat, setDeliveryLat] = useState<number>(SUGGESTED_PLACES[1].lat);
  const [deliveryLng, setDeliveryLng] = useState<number>(SUGGESTED_PLACES[1].lng);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientPhone, setRecipientPhone] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'online_prepaid' | 'cash_at_pickup'>('online_prepaid');
  const [createdParcel, setCreatedParcel] = useState<any | null>(null);

  // Simulated photo upload
  const handleSimulatePhotoUpload = () => {
    const mockPhotos = [
      'https://i.ibb.co/xt4N99wT/Screenshot-2026-10-20-175337.png',
      'https://i.ibb.co/bRqCjtqH/image.png',
    ];
    const nextPhoto = mockPhotos[photoUrls.length % mockPhotos.length];
    setPhotoUrls([...photoUrls, nextPhoto]);
  };

  const removePhoto = (idx: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== idx));
  };

  // Estimated fare calculation
  const getEstimatedFare = () => {
    let base = packageSize === 'small' ? 60 : packageSize === 'medium' ? 110 : 190;
    const fragileAdd = isFragile ? 30 : 0;
    return base + fragileAdd + 75; // flat distance estimate fee
  };


  const handleCreateParcel = async () => {
    setLoading(true);
    setErrorMessage(null);

    // Validate Service Area
    if (!isWithinServiceArea(pickupLat, pickupLng)) {
      setErrorMessage('Sorry, the pickup location is outside our current service area.');
      setLoading(false);
      return;
    }
    if (!isWithinServiceArea(deliveryLat, deliveryLng)) {
      setErrorMessage('Sorry, the delivery location is outside our current service area.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        pickupAddress,
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        senderName,
        senderPhone,
        deliveryAddress,
        deliveryLatitude: deliveryLat,
        deliveryLongitude: deliveryLng,
        recipientName,
        recipientPhone,
        parcelCategory: category,
        packageSize,
        weightKg,
        isFragile,
        senderDescription,
        photoUrls,
        paymentMethod,
      };

      const res = await api.createParcel(payload);
      if (res.success && res.data) {
        setCreatedParcel(res.data);
      } else {
        setErrorMessage('Failed to create parcel delivery request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit parcel delivery request.');
    } finally {
      setLoading(false);
    }
  };

  if (createdParcel) {
    return (
      <ParcelTracker
        parcel={createdParcel}
        onNavigate={onNavigate}
        onReset={() => setCreatedParcel(null)}
        onParcelUpdated={(updated) => setCreatedParcel(updated)}
      />
    );
  }

  return (
    <div className="min-h-[85vh] max-w-3xl mx-auto px-4 py-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#E21D2B]">
            RideNova Parcel · Door-to-Door Delivery
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#171717] mt-0.5">
            Send a Package Across Town
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('rider')}
          className="text-xs font-semibold text-[#737373] hover:text-[#171717]"
        >
          Cancel & Exit
        </button>
      </div>

      {/* Progress Bar */}
      <div className="grid grid-cols-5 gap-2">
        {['Parcel', 'Pickup', 'Destination', 'Payment', 'Confirm'].map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = step > stepNum;
          const isCurrent = step === stepNum;
          return (
            <div key={label} className="space-y-1 text-center">
              <div
                className={`h-2 rounded-full transition-colors ${
                  isDone || isCurrent ? 'bg-[#E21D2B]' : 'bg-[#E5E5E5]'
                }`}
              />
              <span className={`text-[10px] font-bold uppercase ${isCurrent ? 'text-[#E21D2B]' : 'text-[#737373]'}`}>
                {stepNum}. {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#E21D2B]/30 text-xs text-[#E21D2B] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: PARCEL DETAILS & PHOTOS */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#171717]">1. Parcel Details & Photographs</h2>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#171717] block">Select Parcel Category</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    category === cat.id
                      ? 'border-[#E21D2B] bg-[#FFF1F2]/50 text-[#171717]'
                      : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#737373]'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">Package Size</label>
              <select
                value={packageSize}
                onChange={(e) => setPackageSize(e.target.value as any)}
                className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
              >
                <option value="small">Small (Documents / Pouch - up to 2kg)</option>
                <option value="medium">Medium (Shoe box / Bag - up to 7kg)</option>
                <option value="large">Large (Box / Carton - up to 15kg)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717] block">Weight (kg)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="20"
                value={weightKg}
                onChange={(e) => setWeightKg(parseFloat(e.target.value) || 1)}
                className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-[#171717]">
                <input
                  type="checkbox"
                  checked={isFragile}
                  onChange={(e) => setIsFragile(e.target.checked)}
                  className="rounded text-[#E21D2B] focus:ring-[#E21D2B] h-4 w-4"
                />
                <span>Fragile Handling Required ⚠️</span>
              </label>
            </div>
          </div>

          {/* Parcel Photo Uploads */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#171717]">Parcel Photographs ({photoUrls.length}/3)</label>
              <button
                type="button"
                onClick={handleSimulatePhotoUpload}
                disabled={photoUrls.length >= 3}
                className="text-xs text-[#E21D2B] font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Capture / Add Photo</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="relative rounded-xl border border-[#E5E5E5] overflow-hidden h-24 bg-[#FAFAFA] flex items-center justify-center">
                  <img src={url} alt={`Parcel ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photoUrls.length < 3 && (
                <button
                  type="button"
                  onClick={handleSimulatePhotoUpload}
                  className="rounded-xl border-2 border-dashed border-[#E5F5E5] hover:border-[#E21D2B] h-24 flex flex-col items-center justify-center text-[#737373] text-[11px] gap-1 cursor-pointer bg-[#FAFAFA]"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Photo</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#171717]">Description / Delivery Instructions</label>
            <textarea
              rows={2}
              value={senderDescription}
              onChange={(e) => setSenderDescription(e.target.value)}
              placeholder="E.g., Contains confidential legal documents. Please ring doorbell."
              className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs bg-white"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Pickup Details</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PICKUP ADDRESS & SENDER */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#171717]">2. Pickup Address & Sender Information</h2>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#171717]">Quick Select Pickup Location</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_PLACES.slice(0, 4).map((place) => (
                <button
                  key={place.name}
                  type="button"
                  onClick={() => {
                    setPickupAddress(place.address);
                    setPickupLat(place.lat);
                    setPickupLng(place.lng);
                  }}
                  className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                    pickupAddress === place.address
                      ? 'border-[#E21D2B] bg-[#FFF1F2]/40 text-[#171717]'
                      : 'border-[#E5E5E5] bg-white text-[#737373]'
                  }`}
                >
                  {place.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#171717]">Pickup Address</label>
            <input
              type="text"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717]">Sender Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717]">Sender Mobile Number</label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Destination</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RECIPIENT & DESTINATION */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#171717]">3. Recipient & Destination Address</h2>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#171717]">Quick Select Destination Location</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_PLACES.slice(1, 5).map((place) => (
                <button
                  key={place.name}
                  type="button"
                  onClick={() => {
                    setDeliveryAddress(place.address);
                    setDeliveryLat(place.lat);
                    setDeliveryLng(place.lng);
                  }}
                  className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                    deliveryAddress === place.address
                      ? 'border-[#E21D2B] bg-[#FFF1F2]/40 text-[#171717]'
                      : 'border-[#E5E5E5] bg-white text-[#737373]'
                  }`}
                >
                  {place.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#171717]">Delivery Address</label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717]">Recipient Name</label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="E.g., Priya Sharma"
                className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#171717]">Recipient Mobile Number</label>
              <input
                type="text"
                required
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="E.g., +91 99887 66554"
                className="w-full p-3 rounded-xl border border-[#E5E5E5] text-xs font-semibold bg-white"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!recipientName || !recipientPhone) {
                  setErrorMessage('Please enter recipient name and phone number.');
                  return;
                }
                setErrorMessage(null);
                setStep(4);
              }}
              className="px-6 py-2.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Payment</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FARE & PAYMENT METHOD */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#171717]">4. Fare Estimate & Payment Method</h2>

          {/* Fare Summary Card */}
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-3">
            <div className="flex justify-between text-xs text-[#737373]">
              <span>Package Category ({category})</span>
              <span className="font-semibold text-[#171717]">{packageSize.toUpperCase()} ({weightKg} kg)</span>
            </div>
            <div className="flex justify-between text-xs text-[#737373]">
              <span>Estimated Distance & Delivery Time</span>
              <span className="font-semibold text-[#171717]">~6.5 km · ~25 mins</span>
            </div>
            {isFragile && (
              <div className="flex justify-between text-xs text-[#737373]">
                <span>Fragile Handling Surcharge</span>
                <span className="font-semibold text-[#171717]">₹30</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#E5E5E5] flex justify-between items-center">
              <span className="text-sm font-bold text-[#171717]">Total Delivery Fare</span>
              <span className="text-xl font-black text-[#171717]">₹{getEstimatedFare()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-[#171717] block">Select Payment Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('online_prepaid')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  paymentMethod === 'online_prepaid'
                    ? 'border-[#E21D2B] bg-[#FFF1F2]/50 text-[#171717]'
                    : 'border-[#E5E5E5] bg-white text-[#737373]'
                }`}
              >
                <CreditCard className="h-5 w-5 text-[#E21D2B] mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#171717]">Online Prepaid</p>
                  <p className="text-[11px] text-[#737373] mt-0.5">Pay securely via UPI, Card, or Stripe</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash_at_pickup')}
                className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  paymentMethod === 'cash_at_pickup'
                    ? 'border-[#E21D2B] bg-[#FFF1F2]/50 text-[#171717]'
                    : 'border-[#E5E5E5] bg-white text-[#737373]'
                }`}
              >
                <Banknote className="h-5 w-5 text-[#15803D] mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-[#171717]">Cash at Pickup</p>
                  <p className="text-[11px] text-[#737373] mt-0.5">Pay driver cash when parcel is collected</p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="px-6 py-2.5 rounded-xl bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Review Booking</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & CONFIRM */}
      {step === 5 && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-sm space-y-6">
          <h2 className="text-base font-extrabold text-[#171717]">5. Review & Confirm Delivery</h2>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
              <span className="font-bold text-[#737373] uppercase tracking-wider text-[10px]">Parcel Summary</span>
              <p className="font-bold text-[#171717] text-sm">{category.toUpperCase()} ({packageSize} size, {weightKg} kg)</p>
              {senderDescription && <p className="text-[#737373]">"{senderDescription}"</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-1">
                <span className="font-bold text-[#15803D] uppercase tracking-wider text-[10px]">Pickup From</span>
                <p className="font-bold text-[#171717]">{senderName} ({senderPhone})</p>
                <p className="text-[#737373]">{pickupAddress}</p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-1">
                <span className="font-bold text-[#E21D2B] uppercase tracking-wider text-[10px]">Deliver To</span>
                <p className="font-bold text-[#171717]">{recipientName} ({recipientPhone})</p>
                <p className="text-[#737373]">{deliveryAddress}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#FFF1F2] border border-[#E21D2B]/30">
              <div>
                <p className="text-xs font-bold text-[#E21D2B]">Payment Method</p>
                <p className="text-xs text-[#171717] font-semibold">
                  {paymentMethod === 'online_prepaid' ? 'Online Prepaid (Confirmed)' : 'Cash at Pickup'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#737373] uppercase font-bold block">Total Fare</span>
                <span className="text-lg font-black text-[#171717]">₹{getEstimatedFare()}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded-xl border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA] flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleCreateParcel}
              className="px-8 py-3 rounded-xl bg-[#E21D2B] text-white text-xs font-extrabold hover:bg-[#BE1622] transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Confirm & Dispatch Courier</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
