import React, { useState, useEffect } from 'react';
import { Phone, Mail, ShieldCheck, CheckCircle2, AlertCircle, Save, RotateCcw, MessageSquare } from 'lucide-react';
import { DriverProfile, UserProfileExtension } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';
import { useAuthSession } from '../../../../context/AuthContext.tsx';

interface DriverContactProps {
  driver: DriverProfile | null;
  extension: UserProfileExtension | null;
  onUpdate: () => void;
}

export const DriverContact: React.FC<DriverContactProps> = ({ driver, extension, onUpdate }) => {
  const { user } = useAuthSession();

  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [contactMethod, setContactMethod] = useState('phone');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPhone(driver?.phone || user?.phone || '');
    setAlternatePhone(extension?.alternate_phone || '');
  }, [driver, user, extension]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!phone.trim()) {
      newErrors.phone = 'Primary mobile number is required.';
    } else {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone.length < 10) {
        newErrors.phone = 'Enter a valid 10-digit mobile number.';
      }
    }

    if (alternatePhone.trim()) {
      const cleanAlt = alternatePhone.replace(/[\s\-\(\)]/g, '');
      if (cleanAlt.length < 10) {
        newErrors.alternatePhone = 'Enter a valid 10-digit alternate mobile number.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!validate()) return;

    setSaving(true);
    try {
      await Promise.all([
        api.updateDriverProfile({ phone: phone.trim() }),
        api.updateProfileExtension({ alternate_phone: alternatePhone.trim() || null }),
      ]);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      onUpdate();
    } catch (err: any) {
      console.error('Failed to update driver contact numbers', err);
      setErrorMessage(err.message || 'Failed to update contact credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPhone(driver?.phone || user?.phone || '');
    setAlternatePhone(extension?.alternate_phone || '');
    setErrors({});
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Contact credentials updated successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Email Address Section */}
      <div className="p-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA]/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#737373]" />
            <span className="text-xs font-bold text-[#171717]">Registered Email Address</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20">
            <ShieldCheck className="h-3 w-3" />
            Verified via Clerk
          </span>
        </div>
        <p className="font-mono text-xs text-[#171717]">{user?.email || driver?.email || 'driver@ridenova.com'}</p>
        <p className="text-[10px] text-[#737373]">
          Official receipts, weekly earnings statements, and tax invoices are sent to this address. Email updates must be initiated via Account Security.
        </p>
      </div>

      {/* Phone Numbers Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <Phone className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Operational Phone Numbers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Phone */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#171717]">
                Primary Mobile Number <span className="text-[#E21D2B]">*</span>
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#15803D]">
                <ShieldCheck className="h-3 w-3" />
                Dispatch Ready
              </span>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              placeholder="+91 98765 43210"
              className={`w-full rounded-lg border px-3 py-2 text-xs font-mono text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.phone ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.phone ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.phone}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Direct call channel masked through RideNova secure proxy.</p>
            )}
          </div>

          {/* Alternate Contact */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Alternate Contact Number <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              value={alternatePhone}
              onChange={(e) => {
                setAlternatePhone(e.target.value);
                if (errors.alternatePhone) setErrors({ ...errors, alternatePhone: '' });
              }}
              placeholder="+91 98765 11223"
              className={`w-full rounded-lg border px-3 py-2 text-xs font-mono text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                errors.alternatePhone ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
              }`}
            />
            {errors.alternatePhone ? (
              <p className="text-[11px] text-red-600 mt-1">{errors.alternatePhone}</p>
            ) : (
              <p className="text-[10px] text-[#737373] mt-1">Secondary phone for dispatch center when primary is unreachable.</p>
            )}
          </div>

          {/* Preferred Contact Method */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Preferred Passenger Communication Method
            </label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              <option value="phone">In-App Voice Call (Number Masked) · Recommended</option>
              <option value="sms">SMS & In-App Chat</option>
              <option value="whatsapp">WhatsApp Dispatch Updates</option>
            </select>
            <p className="text-[10px] text-[#737373] mt-1">
              RideNova hides your personal phone number using two-way number masking during active trips.
            </p>
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
          <span>{saving ? 'Saving...' : 'Save Contact Information'}</span>
        </button>
      </div>
    </form>
  );
};
