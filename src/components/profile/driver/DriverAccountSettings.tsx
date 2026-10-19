import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Phone, 
  ShieldAlert, 
  Car, 
  FileText, 
  HeartPulse, 
  CreditCard, 
  Sliders, 
  Lock, 
  LayoutDashboard, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  MapPin, 
  ChevronRight,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { useAuthSession } from '../../../context/AuthContext.tsx';
import { api } from '../../../lib/api.ts';
import { 
  DriverProfile, 
  UserProfileExtension, 
  EmergencyContact, 
  SafetyPreferences as SafetyPrefsType 
} from '../../../types/index.ts';

// Tabs
import { DriverOverview } from './tabs/DriverOverview.tsx';
import { DriverPersonal } from './tabs/DriverPersonal.tsx';
import { DriverContact } from './tabs/DriverContact.tsx';
import { DriverEmergency } from './tabs/DriverEmergency.tsx';
import { DriverVehicle } from './tabs/DriverVehicle.tsx';
import { DriverDocuments } from './tabs/DriverDocuments.tsx';
import { DriverSafety } from './tabs/DriverSafety.tsx';
import { DriverBankPayout } from './tabs/DriverBankPayout.tsx';
import { DriverPreferences } from './tabs/DriverPreferences.tsx';
import { DriverPrivacy } from './tabs/DriverPrivacy.tsx';

interface DriverAccountSettingsProps {
  onNavigate?: (route: string) => void;
  initialTab?: DriverTabType;
}

export type DriverTabType = 
  | 'overview' 
  | 'personal' 
  | 'contact' 
  | 'emergency' 
  | 'vehicle' 
  | 'documents' 
  | 'safety' 
  | 'bank' 
  | 'preferences' 
  | 'privacy';

interface TabItem {
  id: DriverTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Profile standing, completion score, and quick safety access.' },
  { id: 'personal', label: 'Personal Information', icon: User, description: 'Legal identity, official portrait, DOB, and residential address.' },
  { id: 'contact', label: 'Contact Information', icon: Phone, description: 'Verified phone numbers, masked dispatch channels, and email.' },
  { id: 'emergency', label: 'Emergency Contacts', icon: ShieldAlert, description: 'Automated 24/7 SOS alert recipients and family emergency contacts.' },
  { id: 'vehicle', label: 'Vehicle Information', icon: Car, description: 'Fleet assignment, plate number, insurance, and PUC certification.' },
  { id: 'documents', label: 'Driver Documents', icon: FileText, description: 'Commercial driving licence, national ID, and vehicle registration upload.' },
  { id: 'safety', label: 'Safety & Assistance', icon: HeartPulse, description: 'Confidential blood group and first responder medical notes.' },
  { id: 'bank', label: 'Bank & Payout Settings', icon: CreditCard, description: 'Direct bank accounts, UPI VPA, and automatic earnings payout ledger.' },
  { id: 'preferences', label: 'Ride Preferences', icon: Sliders, description: 'Operating dispatch region, language, and auto-accept options.' },
  { id: 'privacy', label: 'Account & Privacy', icon: Lock, description: 'Authentication security, notification alerts, and data export.' },
];

export const DriverAccountSettings: React.FC<DriverAccountSettingsProps> = ({ 
  onNavigate,
  initialTab = 'overview'
}) => {
  const { user } = useAuthSession();
  const [activeTab, setActiveTab] = useState<DriverTabType>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loaded Profile States
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [extension, setExtension] = useState<UserProfileExtension | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [safety, setSafety] = useState<SafetyPrefsType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [driverRes, profileRes] = await Promise.all([
        api.getDriverProfile().catch(() => null),
        api.getProfile().catch(() => null),
      ]);

      if (driverRes?.data) {
        setDriver(driverRes.data);
      }
      if (profileRes?.data) {
        setExtension(profileRes.data.extension);
        setContacts(profileRes.data.emergencyContacts || []);
        setSafety(profileRes.data.safetyPrefs);
      }
    } catch (err) {
      console.error('Failed to load driver account settings data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentTabItem = TABS.find((t) => t.id === activeTab) || TABS[0];

  // Calculate real profile completion percentage from actual stored fields
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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as DriverTabType);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 animate-fade-in text-[#171717]">
      {/* Top Breadcrumb & Back to Console */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => onNavigate ? onNavigate('driver') : window.history.back()}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#737373] hover:text-[#171717] transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform text-[#E21D2B]" />
          <span>Back to Driver Console</span>
        </button>

        {/* Mobile menu toggle button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-bold text-[#171717] hover:bg-[#FAFAFA]"
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          <span>{currentTabItem.label}</span>
        </button>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Navigation Panel (Sticky on Desktop) */}
        <aside className={`w-full md:w-72 shrink-0 space-y-4 ${
          mobileMenuOpen ? 'block' : 'hidden md:block'
        }`}>
          {/* Driver mini card in sidebar */}
          <div className="p-4 rounded-2xl border border-[#E5E5E5] bg-white shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {driver?.profilePhotoUrl ? (
                  <img
                    src={driver.profilePhotoUrl}
                    alt={driver.name}
                    className="h-12 w-12 rounded-xl object-cover border border-[#E21D2B]"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-[#E21D2B] text-white flex items-center justify-center text-lg font-black shadow-inner">
                    {(driver?.name || user?.name || 'D').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${
                  isApproved ? 'bg-[#15803D]' : 'bg-[#F59E0B]'
                }`} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-[#171717] truncate">{driver?.name || user?.name || 'Driver Partner'}</h2>
                <p className="font-mono text-[10px] text-[#737373]">DRV-{(driver?.id || '89412').slice(0, 6).toUpperCase()}</p>
                <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                  isApproved ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                }`}>
                  {isApproved ? 'Active Partner' : 'KYC Pending'}
                </span>
              </div>
            </div>

            {/* Micro completion bar */}
            <div className="pt-2 border-t border-[#E5E5E5] space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-[#737373]">Profile Strength</span>
                <span className="font-bold text-[#E21D2B]">{completion}%</span>
              </div>
              <div className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#E21D2B] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-2 rounded-2xl border border-[#E5E5E5] bg-white shadow-xs space-y-1">
            <div className="px-3 py-2 border-b border-[#E5E5E5]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Account Settings</h3>
              <p className="text-[10px] text-[#737373] mt-0.5">Manage your profile and safety</p>
            </div>

            <nav className="space-y-0.5 pt-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? 'bg-[#FFF1F2] text-[#E21D2B] shadow-xs'
                        : 'text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#E21D2B]' : 'text-[#737373]'}`} />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#E21D2B] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content Panel */}
        <main className="flex-1 w-full min-w-0 rounded-2xl border border-[#E5E5E5] bg-white p-4 sm:p-6 shadow-sm min-h-[520px]">
          {/* Header of Active Section */}
          <div className="pb-4 mb-6 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <currentTabItem.icon className="h-5 w-5 text-[#E21D2B]" />
                <h1 className="text-base sm:text-lg font-bold text-[#171717]">{currentTabItem.label}</h1>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">{currentTabItem.description}</p>
            </div>

            {/* Mobile Switch Tab Indicator */}
            {activeTab !== 'overview' && (
              <button
                onClick={() => handleTabChange('overview')}
                className="self-start sm:self-center text-xs font-semibold text-[#737373] hover:text-[#E21D2B] flex items-center gap-1"
              >
                <span>All Sections</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-8 w-8 text-[#E21D2B] animate-spin mb-3" />
              <p className="text-xs font-bold text-[#171717]">Loading driver account settings...</p>
              <p className="text-[11px] text-[#737373] mt-1">Fetching verified credentials from database.</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {activeTab === 'overview' && (
                <DriverOverview
                  driver={driver}
                  extension={extension}
                  contacts={contacts}
                  safety={safety}
                  onNavigateTab={handleTabChange}
                />
              )}
              {activeTab === 'personal' && (
                <DriverPersonal
                  driver={driver}
                  extension={extension}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'contact' && (
                <DriverContact
                  driver={driver}
                  extension={extension}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'emergency' && (
                <DriverEmergency
                  contacts={contacts}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'vehicle' && (
                <DriverVehicle
                  driver={driver}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'documents' && (
                <DriverDocuments
                  driver={driver}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'safety' && (
                <DriverSafety
                  safety={safety}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'bank' && (
                <DriverBankPayout
                  driver={driver}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'preferences' && (
                <DriverPreferences
                  driver={driver}
                  extension={extension}
                  onUpdate={loadData}
                />
              )}
              {activeTab === 'privacy' && (
                <DriverPrivacy
                  driver={driver}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
