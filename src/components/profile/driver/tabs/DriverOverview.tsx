import React from 'react';
import { 
  UserCheck, 
  MapPin, 
  ShieldCheck, 
  Car, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Phone, 
  ShieldAlert, 
  HeartPulse, 
  Sliders, 
  Clock,
  Sparkles
} from 'lucide-react';
import { DriverProfile, UserProfileExtension, EmergencyContact, SafetyPreferences } from '../../../../types/index.ts';

interface DriverOverviewProps {
  driver: DriverProfile | null;
  extension: UserProfileExtension | null;
  contacts: EmergencyContact[];
  safety: SafetyPreferences | null;
  onNavigateTab: (tabId: string) => void;
}

export const DriverOverview: React.FC<DriverOverviewProps> = ({
  driver,
  extension,
  contacts,
  safety,
  onNavigateTab,
}) => {
  // Compute real profile completion percentage based on stored database fields
  let completion = 0;
  if (driver?.name || extension?.legal_name) completion += 10;
  if (driver?.dob || extension?.date_of_birth) completion += 10;
  if (driver?.address || extension?.address_line1) completion += 10;
  if (driver?.phone) completion += 10;
  if (contacts && contacts.length > 0) completion += 15;
  if (driver?.vehicle && driver.vehicle.registration_number) completion += 15;
  if (driver?.licenseNumber && driver.licenseNumber !== 'Unverified') completion += 15;
  if (driver?.bankAccountNumberMasked || driver?.bankAccountName) completion += 15;

  const isApproved = driver?.status === 'approved' || driver?.status === 'active';
  const kycStatus = driver?.kycStatus || (isApproved ? 'approved' : 'draft');
  const hasVehicle = Boolean(driver?.vehicle && driver.vehicle.registration_number);
  const hasEmergency = contacts && contacts.length > 0;
  const hasBank = Boolean(driver?.bankAccountNumberMasked);

  // Missing requirements list for the driver
  const missingItems: { label: string; tab: string }[] = [];
  if (!driver?.dob && !extension?.date_of_birth) {
    missingItems.push({ label: 'Add Date of Birth for identity verification', tab: 'personal' });
  }
  if (!hasEmergency) {
    missingItems.push({ label: 'Register at least one Emergency Contact for SOS coverage', tab: 'emergency' });
  }
  if (!hasVehicle) {
    missingItems.push({ label: 'Register your vehicle details and registration number', tab: 'vehicle' });
  }
  if (!hasBank) {
    missingItems.push({ label: 'Configure Bank Account or UPI for daily payouts', tab: 'bank' });
  }
  if (!safety?.consent_given && !safety?.blood_group) {
    missingItems.push({ label: 'Provide optional emergency medical notes for first responders', tab: 'safety' });
  }

  const sections = [
    {
      id: 'personal',
      title: 'Personal Information',
      desc: extension?.legal_name || driver?.name
        ? `${extension?.legal_name || driver?.name} · ${extension?.city || driver?.operatingCity || 'City not set'}`
        : 'Legal name, DOB, residential address',
      status: (extension?.legal_name || driver?.name) && (driver?.dob || extension?.date_of_birth) ? 'Complete' : 'Needs Review',
      isComplete: Boolean((extension?.legal_name || driver?.name) && (driver?.dob || extension?.date_of_birth)),
      icon: UserCheck,
    },
    {
      id: 'contact',
      title: 'Contact Numbers',
      desc: driver?.phone ? `${driver.phone} (Primary Verified)` : 'Configure verified mobile & dispatch numbers',
      status: driver?.phone ? 'Verified' : 'Missing',
      isComplete: Boolean(driver?.phone),
      icon: Phone,
    },
    {
      id: 'emergency',
      title: 'Emergency Contacts',
      desc: hasEmergency ? `${contacts.length} Contact${contacts.length > 1 ? 's' : ''} configured for SOS dispatch` : 'No emergency contacts added yet',
      status: hasEmergency ? 'Active' : 'Missing',
      isComplete: hasEmergency,
      icon: ShieldAlert,
    },
    {
      id: 'vehicle',
      title: 'Vehicle Information',
      desc: hasVehicle 
        ? `${driver?.vehicle?.make} ${driver?.vehicle?.model} (${driver?.vehicle?.registration_number})`
        : 'Register car/cab make, model & registration',
      status: hasVehicle ? 'Assigned' : 'Action Required',
      isComplete: hasVehicle,
      icon: Car,
    },
    {
      id: 'documents',
      title: 'Driver Documents & KYC',
      desc: `License: ${driver?.licenseNumber || 'Pending'} · KYC: ${kycStatus.replace('_', ' ').toUpperCase()}`,
      status: kycStatus === 'approved' ? 'Verified' : kycStatus === 'under_review' ? 'Under Review' : 'Pending',
      isComplete: kycStatus === 'approved',
      icon: FileText,
    },
    {
      id: 'safety',
      title: 'Safety & Assistance',
      desc: safety?.blood_group ? `Blood Group: ${safety.blood_group} · First responder notes stored` : 'Emergency medical & special assistance notes',
      status: safety?.blood_group || safety?.consent_given ? 'Configured' : 'Optional',
      isComplete: Boolean(safety?.blood_group || safety?.consent_given),
      icon: HeartPulse,
    },
    {
      id: 'bank',
      title: 'Bank & Payout Settings',
      desc: hasBank ? `Account: ${driver?.bankAccountNumberMasked} · IFSC: ${driver?.bankIfsc || 'Configured'}` : 'Add bank account or UPI ID for direct deposits',
      status: hasBank ? 'Active' : 'Setup Required',
      isComplete: hasBank,
      icon: CreditCard,
    },
    {
      id: 'preferences',
      title: 'Ride Preferences',
      desc: `City: ${driver?.operatingCity || extension?.city || 'Default'} · Working hours: ${driver?.workingHoursPreference || 'Flexible'}`,
      status: 'Active',
      isComplete: true,
      icon: Sliders,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Driver Summary Profile Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#171717] via-[#262626] to-[#171717] text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {driver?.profilePhotoUrl ? (
                <img
                  src={driver.profilePhotoUrl}
                  alt={driver.name}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-[#E21D2B] shadow-inner"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-[#E21D2B] flex items-center justify-center text-2xl font-black text-white shadow-inner">
                  {(driver?.name || 'D').charAt(0).toUpperCase()}
                </div>
              )}
              <span className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#171717] ${
                isApproved ? 'bg-[#15803D]' : 'bg-[#F59E0B]'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">{driver?.name || 'Driver Partner'}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isApproved ? 'bg-[#15803D]/20 text-[#4ADE80] border border-[#15803D]/40' : 'bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40'
                }`}>
                  {isApproved ? 'Verified Partner' : 'Verification Pending'}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                Driver ID: <span className="font-mono text-white font-semibold">DRV-{(driver?.id || '89412').slice(0, 6).toUpperCase()}</span>
                {' · '}
                <span>★ {Number(driver?.rating || 5.0).toFixed(1)} ({driver?.totalRides || 0} trips)</span>
              </p>
              <div className="flex items-center gap-3 text-[11px] text-white/60 mt-1.5 font-medium flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#E21D2B]" />
                  {driver?.operatingCity || extension?.city || 'Delhi NCR'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Car className="h-3 w-3 text-[#E21D2B]" />
                  {hasVehicle ? `${driver?.vehicle?.make} ${driver?.vehicle?.model}` : 'Vehicle pending'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#15803D]" />
                  KYC: {kycStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigateTab('personal')}
              className="px-4 py-2 rounded-xl bg-white text-[#171717] text-xs font-bold hover:bg-[#FAFAFA] transition-colors shadow-xs"
            >
              Edit Profile
            </button>
            <button
              onClick={() => onNavigateTab('vehicle')}
              className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors border border-white/20"
            >
              Manage Vehicle
            </button>
          </div>
        </div>
      </div>

      {/* Profile Completion Standing */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#E21D2B]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Driver Profile & Safety Strength</h4>
            </div>
            <p className="text-[11px] text-[#737373] mt-0.5">
              A 100% completed profile unlocks priority trip dispatch, premium incentives, and rapid verification approval.
            </p>
          </div>
          <span className="text-base font-black text-[#E21D2B]">{completion}%</span>
        </div>

        <div className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-[#E21D2B] to-[#F43F5E] h-2 rounded-full transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Missing Information Reminders Banner */}
      {missingItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#E21D2B]/20 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#E21D2B] shrink-0" />
            <h4 className="text-xs font-bold text-[#E21D2B] uppercase tracking-wider">Required Information Reminders</h4>
          </div>
          <div className="space-y-1.5 pt-1">
            {missingItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs text-[#171717] bg-white p-2.5 rounded-xl border border-[#E5E5E5]">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E21D2B]" />
                  <span>{item.label}</span>
                </div>
                <button
                  onClick={() => onNavigateTab(item.tab)}
                  className="text-xs font-bold text-[#E21D2B] hover:underline shrink-0 ml-2"
                >
                  Complete →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Categories Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373] px-1">Settings & Verification Sections</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                onClick={() => onNavigateTab(sec.id)}
                className="group flex items-center justify-between p-4 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] hover:border-[#E21D2B]/50 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    sec.isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FAFAFA] text-[#737373] group-hover:bg-[#FFF1F2] group-hover:text-[#E21D2B]'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-[#171717] truncate">{sec.title}</h5>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                        sec.isComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {sec.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#737373] truncate mt-0.5">{sec.desc}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#737373] group-hover:text-[#E21D2B] group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
