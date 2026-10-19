import React, { useState, useEffect } from 'react';
import { Phone, Mail, CheckCircle2, AlertCircle, Save, ShieldCheck } from 'lucide-react';
import { UserProfileExtension } from '../../../types/index.ts';
import { api } from '../../../lib/api.ts';
import { useAuthSession } from '../../../context/AuthContext.tsx';

interface ContactProps {
  profile: UserProfileExtension | null;
  onUpdate: () => void;
}

export const ContactForm: React.FC<ContactProps> = ({ profile, onUpdate }) => {
  const { user } = useAuthSession();

  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    setPhone(user?.phone || '');
    setEmail(user?.email || '');
    setAlternatePhone(profile?.alternate_phone || '');
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setErrorMessage(null);
    setSaveSuccess(false);

    // Validate phone if entered
    if (phone && !/^[+0-9\s-]{8,20}$/.test(phone.trim())) {
      setPhoneError('Please enter a valid primary mobile number.');
      return;
    }
    if (alternatePhone && !/^[+0-9\s-]{8,20}$/.test(alternatePhone.trim())) {
      setPhoneError('Please enter a valid alternate phone number.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateProfileExtension({
        phone: phone.trim() || null,
        alternate_phone: alternatePhone.trim() || null,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to update contact numbers.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating contact information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Contact information updated successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <Phone className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Communication & Phone Numbers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email Address (Registered, clerk managed) */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Registered Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                disabled
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#737373] bg-[#FAFAFA] cursor-not-allowed"
              />
              <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            </div>
            <p className="text-[10px] text-[#737373] mt-1">Managed via your single sign-on authentication provider.</p>
          </div>

          {/* Primary Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Primary Mobile Number <span className="text-[#E21D2B]">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="text-[10px] text-[#737373] mt-1">Used for driver phone calls, ride OTP verification, and dispatch SMS.</p>
          </div>

          {/* Alternate Mobile Number */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Alternate Contact Number <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              placeholder="e.g. +91 91234 56789"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="text-[10px] text-[#737373] mt-1">Backup number in case your primary phone is out of network coverage or battery dies.</p>
          </div>
        </div>

        {phoneError && (
          <p className="text-[11px] text-red-600 font-medium">{phoneError}</p>
        )}
      </div>

      <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#C01522] transition-colors shadow-xs disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Contact Details'}</span>
        </button>
      </div>
    </form>
  );
};
