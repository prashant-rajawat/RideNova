import React, { useState, useEffect } from 'react';
import { User, MapPin, Calendar, Globe, AlertCircle, CheckCircle2, Save, RotateCcw } from 'lucide-react';
import { UserProfileExtension } from '../../../types/index.ts';
import { api } from '../../../lib/api.ts';
import { useAuthSession } from '../../../context/AuthContext.tsx';

interface PersonalProps {
  profile: UserProfileExtension | null;
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

export const PersonalForm: React.FC<PersonalProps> = ({ profile, onUpdate }) => {
  const { user } = useAuthSession();

  // Form states
  const [legalName, setLegalName] = useState('');
  const [displayName, setDisplayName] = useState('');
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

  // UI feedback states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate from existing profile or user on mount / profile change
  useEffect(() => {
    setLegalName(profile?.legal_name || user?.name || '');
    setDisplayName(profile?.display_name || '');
    setDateOfBirth(profile?.date_of_birth ? profile.date_of_birth.substring(0, 10) : '');
    setGender(profile?.gender || '');
    setPreferredLanguage(profile?.preferred_language || 'English');
    setCity(profile?.city || '');
    setState(profile?.state || '');
    setCountry(profile?.country || 'India');
    setPostalCode(profile?.postal_code || '');
    setAddressLine1(profile?.address_line1 || '');
    setAddressLine2(profile?.address_line2 || '');
    setLandmark(profile?.landmark || '');
    setErrors({});
  }, [profile, user]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!legalName.trim()) {
      newErrors.legalName = 'Full Legal Name is required.';
    } else if (legalName.trim().length < 2) {
      newErrors.legalName = 'Full Legal Name must be at least 2 characters.';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required.';
    }

    // Country-specific Postal Code validation
    if (postalCode.trim()) {
      if (country === 'India') {
        const pinRegex = /^[1-9][0-9]{5}$/;
        if (!pinRegex.test(postalCode.trim())) {
          newErrors.postalCode = 'Please enter a valid 6-digit Indian PIN code (e.g. 380001).';
        }
      } else if (country === 'United States') {
        const zipRegex = /^\d{5}(-\d{4})?$/;
        if (!zipRegex.test(postalCode.trim())) {
          newErrors.postalCode = 'Please enter a valid US ZIP code (e.g. 90210).';
        }
      }
    }

    // Date of birth validation (must not be in future, and at least 13 years old)
    if (dateOfBirth) {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      if (dobDate > today) {
        newErrors.dateOfBirth = 'Date of birth cannot be in the future.';
      } else {
        const age = today.getFullYear() - dobDate.getFullYear();
        if (age < 13) {
          newErrors.dateOfBirth = 'Customer must be at least 13 years old to hold an account.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<UserProfileExtension> = {
        legal_name: legalName.trim(),
        display_name: displayName.trim() || null,
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

      const res = await api.updateProfileExtension(payload);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to save personal information. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to update personal profile', err);
      setErrorMessage(err.message || 'An error occurred while saving your details.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLegalName(profile?.legal_name || user?.name || '');
    setDisplayName(profile?.display_name || '');
    setDateOfBirth(profile?.date_of_birth ? profile.date_of_birth.substring(0, 10) : '');
    setGender(profile?.gender || '');
    setPreferredLanguage(profile?.preferred_language || 'English');
    setCity(profile?.city || '');
    setState(profile?.state || '');
    setCountry(profile?.country || 'India');
    setPostalCode(profile?.postal_code || '');
    setAddressLine1(profile?.address_line1 || '');
    setAddressLine2(profile?.address_line2 || '');
    setLandmark(profile?.landmark || '');
    setErrors({});
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Personal information and address updated successfully!</span>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Section 1: Identity & Personal Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <User className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Identity & Personal Details</h3>
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
              placeholder="e.g. Rahul Sharma"
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] transition-colors focus:outline-none ${
                errors.legalName ? 'border-red-500 focus:border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.legalName ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.legalName}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Official name as shown on government ID.</p>
            )}
          </div>

          {/* Preferred Display Name */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Preferred Display Name <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Rahul"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="text-[10px] text-[#737373] mt-1">Friendly nickname seen by drivers during rides.</p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Date of Birth <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
                }}
                className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                  errors.dateOfBirth ? 'border-red-500 focus:border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
                }`}
              />
            </div>
            {errors.dateOfBirth ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.dateOfBirth}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Used for birthday discounts and age verification.</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Gender <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
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
            <p className="text-[10px] text-[#737373] mt-1">Kept confidential; helps enhance safety features.</p>
          </div>

          {/* Preferred Language */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Preferred Language <span className="text-[#E21D2B]">*</span>
            </label>
            <div className="relative">
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
            </div>
            <p className="text-[10px] text-[#737373] mt-1">Driver communication and receipts will use this language when available.</p>
          </div>
        </div>
      </div>

      {/* Section 2: Residential Address & Location */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <MapPin className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Residential Address & Location</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* City */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              City <span className="text-[#E21D2B]">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (errors.city) setErrors({ ...errors, city: '' });
              }}
              placeholder="e.g. Mumbai, Ahmedabad, Bengaluru"
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.city ? 'border-red-500 focus:border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.city ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.city}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Primary operational city for ride fares and regional offers.</p>
            )}
          </div>

          {/* State / Province */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              State / Province <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. Maharashtra, Gujarat, Karnataka"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Country <span className="text-[#E21D2B]">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                if (errors.postalCode) setErrors({ ...errors, postalCode: '' });
              }}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Postal Code / PIN */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              PIN / Postal Code <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value);
                if (errors.postalCode) setErrors({ ...errors, postalCode: '' });
              }}
              placeholder={country === 'India' ? '6-digit PIN (e.g. 400001)' : 'Postal code'}
              className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.postalCode ? 'border-red-500 focus:border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.postalCode ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.postalCode}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Used for accurate pickup defaults and taxation receipts.</p>
            )}
          </div>

          {/* Address Line 1 */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Residential Address Line 1 <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Flat / House No., Apartment or Society Name"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Address Line 2 <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Street, Sector or Area"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Landmark <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Near Metro Station, Opp. City Mall"
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
          className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#C01522] transition-colors shadow-xs disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving Changes...' : 'Save Personal Information'}</span>
        </button>
      </div>
    </form>
  );
};
