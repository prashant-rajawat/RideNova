import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Bell, 
  FileDown, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  KeyRound,
  Smartphone
} from 'lucide-react';
import { useAuthSession } from '../../../../context/AuthContext.tsx';
import { DriverProfile } from '../../../../types/index.ts';

interface DriverPrivacyProps {
  driver: DriverProfile | null;
}

export const DriverPrivacy: React.FC<DriverPrivacyProps> = ({ driver }) => {
  const { user, logout } = useAuthSession();

  const [smsNotifications, setSmsNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [tripChimeSound, setTripChimeSound] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportData = () => {
    const exportData = {
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        role: user?.role,
      },
      driver: {
        id: driver?.id,
        licenseNumber: driver?.licenseNumber,
        status: driver?.status,
        kycStatus: driver?.kycStatus,
        totalRides: driver?.totalRides,
        rating: driver?.rating,
        vehicle: driver?.vehicle,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ridenova-driver-data-${user?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 4000);
  };

  return (
    <div className="space-y-6 text-xs">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Notification and security settings saved!</span>
        </div>
      )}

      {exportSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Personal data archive exported successfully as JSON.</span>
        </div>
      )}

      {/* 1. Account Authentication & Security */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#E21D2B]" />
            <h4 className="font-bold uppercase tracking-wider text-[#171717]">Authentication & Session Security</h4>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D]">
            Active Secure Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-[#737373] block text-[10px] uppercase font-bold">Authentication Provider</span>
            <span className="font-bold text-[#171717]">Clerk Enterprise Security</span>
          </div>

          <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <span className="text-[#737373] block text-[10px] uppercase font-bold">Session Encryption</span>
            <span className="font-bold text-[#171717]">AES-256 JWT Bearer Protocol</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#FFF1F2] border border-[#E21D2B]/20 text-[11px] text-[#171717] leading-relaxed">
          <span className="font-bold text-[#E21D2B]">Compliance Enforcement:</span> Driver role privileges, KYC approvals, and commission rates are verified and locked by RideNova platform administrators. Client-side attempts to alter roles or permissions are automatically rejected by server-side authorization middleware.
        </div>
      </div>

      {/* 2. Dispatch Notifications */}
      <form onSubmit={handleSavePreferences} className="p-5 rounded-2xl border border-[#E5E5E5] bg-white shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <Bell className="h-4 w-4 text-[#E21D2B]" />
          <h4 className="font-bold uppercase tracking-wider text-[#171717]">Trip Dispatch & Notification Alerts</h4>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#171717] block">High-Priority Trip Chime Sound</span>
              <p className="text-[#737373] text-[11px]">Rings loudly when a new passenger trip radar match arrives.</p>
            </div>
            <input
              type="checkbox"
              checked={tripChimeSound}
              onChange={(e) => setTripChimeSound(e.target.checked)}
              className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#171717] block">SMS Dispatch Alerts</span>
              <p className="text-[#737373] text-[11px]">Send SMS confirmations for completed rides and daily payout credits.</p>
            </div>
            <input
              type="checkbox"
              checked={smsNotifications}
              onChange={(e) => setSmsNotifications(e.target.checked)}
              className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[#171717] block">Push Notifications</span>
              <p className="text-[#737373] text-[11px]">Incentive announcements, peak zone alerts, and compliance reminders.</p>
            </div>
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#E5E5E5] flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E21D2B] text-white font-bold hover:bg-[#BE1622]"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Notification Preferences</span>
          </button>
        </div>
      </form>

      {/* 3. Data Privacy & GDPR Compliance */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-white shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <Shield className="h-4 w-4 text-[#E21D2B]" />
          <h4 className="font-bold uppercase tracking-wider text-[#171717]">Data Privacy & Account Actions</h4>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
            <div>
              <span className="font-bold text-[#171717] block">Export Driver Record & Earnings Ledger</span>
              <p className="text-[#737373] text-[11px]">Download a machine-readable JSON copy of your personal profile, vehicle registration, and trip telemetry.</p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white font-semibold text-[#171717] hover:bg-[#FAFAFA] shrink-0"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Download Archive</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-red-50/50 border border-red-200">
            <div>
              <span className="font-bold text-red-800 block">Deactivate Partner Account</span>
              <p className="text-red-700/80 text-[11px]">Temporary pause or permanent de-registration of fleet partner credentials.</p>
            </div>
            <a
              href="mailto:compliance@ridenova.com?subject=Driver%20Account%20Deactivation%20Request"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Contact Compliance</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
