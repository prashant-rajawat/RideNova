import React, { useState, useEffect } from 'react';
import { User, MapPin, Calendar, Globe, AlertCircle, CheckCircle2, Save, RotateCcw, Camera } from 'lucide-react';
import { DriverProfile, UserProfileExtension } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverPersonalProps {
  driver: DriverProfile | null;
  extension: UserProfileExtension | null;
  onUpdate: () => void;
}

const SUPPORTED_LANGUAGES = [
  'English',
  'Hindi',
  'Gujarati',
  'Marathi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Bengali',
  'Punjabi',
  'Malayalam',
  'Odia',
  'Other',
];

const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Non-binary',
  'Prefer not to say',
  'Other',
];

const COUNTRY_OPTIONS = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Other',
];

export const DriverPersonal: React.FC<DriverPersonalProps> = ({ driver, extension, onUpdate }) => {
  // Form states
  const [legalName, setLegalName] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [landmark, setLandmark] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLegalName(extension?.legal_name || driver?.name || '');
    setProfilePhotoUrl(driver?.profilePhotoUrl || '');
    setDateOfBirth(extension?.date_of_birth?.substring(0, 10) || driver?.dob || '');
    setGender(extension?.gender || '');
    setPreferredLanguage(extension?.preferred_language || driver?.preferredLanguage || 'English');
    setCity(extension?.city || driver?.operatingCity || '');
    setState(extension?.state || '');
    setCountry(extension?.country || 'India');
    setPostalCode(extension?.postal_code || '');
    setAddressLine1(extension?.address_line1 || driver?.address || '');
    setAddressLine2(extension?.address_line2 || '');
    setLandmark(extension?.landmark || '');
    setErrors({});
  }, [driver, extension]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!legalName.trim()) {
      newErrors.legalName = 'Full Legal Name is required.';
    } else if (legalName.trim().length < 2) {
      newErrors.legalName = 'Legal Name must be at least 2 characters.';
    }

    if (!city.trim()) {
      newErrors.city = 'Operating City is required.';
    }

    // Driver must be at least 18 years old to drive commercially
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      if (dobDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future.';
      } else {
        const age = today.getFullYear() - dobDate.getFullYear();
        if (age < 18) {
          newErrors.dateOfBirth = 'Driver partners must be at least 18 years old.';
        }
      }
    }

    if (postalCode.trim()) {
      if (country === 'India') {
        const pinRegex = /^[1-9][0-9]{5}$/;
        if (!pinRegex.test(postalCode.trim())) {
          newErrors.postalCode = 'Please enter a valid 6-digit Indian PIN code (e.g. 110001).';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfilePhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!validate()) return;

    setSaving(true);
    try {
      // 1. Update User Profile Extension (personal & address fields)
      const extPayload = {
        legal_name: legalName.trim(),
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        preferred_language: preferredLanguage,
        city: city.trim(),
        state: state.trim() || null,
        country: country.trim() || 'India',
        postal_code: postalCode.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        landmark: landmark.trim() || null,
      };

      // 2. Update Driver record (name, dob, address, photo, operating city)
      const kycPayload = {
        fullName: legalName.trim(),
        dob: dateOfBirth || undefined,
        address: [addressLine1, addressLine2, landmark, city, state, postalCode].filter(Boolean).join(', '),
        profilePhotoUrl: profilePhotoUrl || undefined,
        operatingCity: city.trim(),
        preferredLanguage,
      };

      await Promise.all([
        api.updateProfileExtension(extPayload),
        api.submitDriverKyc(kycPayload),
        api.updateDriverProfile({ name: legalName.trim() }),
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      onUpdate();
    } catch (err: any) {
      console.error('Failed to update driver personal details', err);
      setErrorMessage(err.message || 'Failed to save personal information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLegalName(extension?.legal_name || driver?.name || '');
    setProfilePhotoUrl(driver?.profilePhotoUrl || '');
    setDateOfBirth(extension?.date_of_birth?.substring(0, 10) || driver?.dob || '');
    setGender(extension?.gender || '');
    setPreferredLanguage(extension?.preferred_language || driver?.preferredLanguage || 'English');
    setCity(extension?.city || driver?.operatingCity || '');
    setState(extension?.state || '');
    setCountry(extension?.country || 'India');
    setPostalCode(extension?.postal_code || '');
    setAddressLine1(extension?.address_line1 || driver?.address || '');
    setAddressLine2(extension?.address_line2 || '');
    setLandmark(extension?.landmark || '');
    setErrors({});
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Driver personal information updated and saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Driver Photo & Identification */}
      <div className="p-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA]/50 space-y-3">
        <label className="block text-xs font-bold text-[#171717]">Driver Profile Photo</label>
        <div className="flex items-center gap-4">
          <div className="relative">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Driver profile"
                className="h-20 w-20 rounded-2xl object-cover border-2 border-[#E21D2B] shadow-sm"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-[#E21D2B] text-white flex items-center justify-center text-3xl font-black shadow-inner">
                {(legalName || 'D').charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#171717] text-white hover:bg-[#E21D2B] transition-colors cursor-pointer shadow-md">
              <Camera className="h-3.5 w-3.5" />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <p className="text-xs font-bold text-[#171717]">Upload Official Partner Photo</p>
            <p className="text-[11px] text-[#737373] mt-0.5 leading-relaxed">
              Clear front-facing portrait without sunglasses or caps. Shown to passengers upon ride dispatch.
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Legal Identity */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <User className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Legal Identity & Demographics</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Legal Name */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Full Legal Name <span className="text-[#E21D2B]">*</span>
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => {
                setLegalName(e.target.value);
                if (errors.legalName) setErrors({ ...errors, legalName: '' });
              }}
              placeholder="e.g. Ramesh Chandra Verma"
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.legalName ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.legalName ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.legalName}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Must strictly match your driving license and Aadhaar/PAN record.</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Date of Birth <span className="text-[#737373] text-[10px] font-normal">(Min. 18 years)</span>
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
              }}
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.dateOfBirth ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.dateOfBirth ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.dateOfBirth}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Required for commercial driving permit compliance.</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              <option value="">Select Gender</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Language */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Preferred Language</label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#737373] mt-1">Primary language for dispatch announcements and voice prompts.</p>
          </div>
        </div>
      </div>

      {/* Section 2: Residential Address & Operating City */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <MapPin className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Residential Address & Fleet Region</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Operating City */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Primary Operating City <span className="text-[#E21D2B]">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (errors.city) setErrors({ ...errors, city: '' });
              }}
              placeholder="e.g. Delhi NCR, Mumbai, Bengaluru"
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.city ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.city ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Designated city zone for fare incentives and radar dispatch.</p>
            )}
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">State / Union Territory</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Delhi, Maharashtra, Karnataka"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Postal Code */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">PIN / Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                if (errors.postalCode) setErrors({ ...errors, postalCode: '' });
              }}
              placeholder="e.g. 110001"
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.postalCode ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.postalCode && <p className="text-[11px] text-red-600 mt-1">{errors.postalCode}</p>}
          </div>

          {/* Address Line 1 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">Residential Address Line 1</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="House/Flat No., Building or Society Name"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Address Line 2 (Optional)</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Street, Sector or Locality"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Landmark (Optional)</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Metro Station"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Changes</span>
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-xs disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Personal Details'}</span>
        </button>
      </div>
    </form>
  );
};
