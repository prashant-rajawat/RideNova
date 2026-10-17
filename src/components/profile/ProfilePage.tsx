import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, ArrowLeft, Check, AlertCircle, Save, Car, CreditCard } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { DriverProfile } from '../../types/index.ts';
import { toCanonicalRole, toDisplayRole } from '../../lib/roles.ts';

interface ProfilePageProps {
  onNavigate: (route: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, updateProfile } = useAuthSession();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'driver') {
      api.getDriverProfile().then((res) => {
        if (res.success && res.data) {
          setDriverProfile(res.data);
          setLicenseNumber(res.data.licenseNumber || '');
        }
      }).catch((err) => {
        console.error('Failed to load driver profile info:', err);
      });
    }
  }, [user?.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });

      if (user?.role === 'driver' && licenseNumber.trim()) {
        await api.updateDriverProfile({
          licenseNumber: licenseNumber.trim(),
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getDashboardRoute = () => {
    if (user?.role === 'driver') return 'driver';
    if (user?.role === 'admin') return 'admin';
    return 'rider';
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={() => onNavigate(getDashboardRoute())}
        className="inline-flex items-center gap-2 text-xs font-medium text-[#737373] hover:text-[#171717] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to {toDisplayRole(user?.role)} Dashboard</span>
      </button>

      <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 sm:p-8 shadow-sm">
        <div className="pb-6 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#E5E5E5] border-2 border-[#E21D2B] flex items-center justify-center text-xl font-bold text-[#E21D2B] shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#171717]">{user?.name}</h1>
              <p className="text-xs text-[#737373]">{user?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-[#E21D2B]/10 text-[#E21D2B] border border-[#E21D2B]/30">
                  {toCanonicalRole(user?.role)}
                </span>
                <span className="text-[11px] text-[#737373]">Database Verified</span>
              </div>
            </div>
          </div>
        </div>

        {success && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#15803D]/30 bg-[#15803D]/10 p-3 text-xs text-[#15803D]">
            <Check className="h-4 w-4 shrink-0" />
            <span>Profile information updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#E21D2B]" />
              Full Name (Safe Field)
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#737373]" />
              Email Address (Clerk Verified - Read Only)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF]/50 px-3.5 py-2.5 text-xs text-[#737373] cursor-not-allowed font-mono"
            />
            <p className="mt-1 text-[11px] text-[#737373]">
              Email is managed by Clerk Authentication for security.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-[#E21D2B]" />
              Phone Number (Safe Field)
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/50 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {user?.role === 'driver' && (
            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[#E21D2B]" />
                Driver License Number
              </label>
              <input
                type="text"
                placeholder="GJ-06-2022-987654"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] uppercase font-mono focus:border-[#E21D2B] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#737373]" />
              Application Role (Protected - Server Side Only)
            </label>
            <div className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-[#FFFFFF]/50 px-3.5 py-2.5 text-xs">
              <span className="font-mono font-bold text-[#E21D2B] uppercase">
                {user?.role}
              </span>
              <span className="text-[11px] text-[#737373]">
                Cannot be altered by frontend requests
              </span>
            </div>
          </div>

          {user?.role === 'driver' && driverProfile?.vehicle && (
            <div className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#737373] flex items-center gap-1.5">
                  <Car className="h-4 w-4 text-[#E21D2B]" />
                  <span>Assigned Vehicle:</span>
                </span>
                <span className="font-semibold text-[#171717]">
                  {driverProfile.vehicle.make} {driverProfile.vehicle.model} ({driverProfile.vehicle.registration_number})
                </span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5E5E5] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate(getDashboardRoute())}
              className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#737373] hover:text-[#171717]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#E21D2B] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#E21D2B]/90 transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
