import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Phone, 
  ShieldAlert, 
  HeartPulse, 
  Sliders, 
  LayoutDashboard, 
  ArrowLeft, 
  Loader2 
} from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { UserProfileExtension, EmergencyContact, SafetyPreferences as SafetyPrefsType } from '../../types/index.ts';
import { toDisplayRole } from '../../lib/roles.ts';
import { Overview } from './tabs/Overview.tsx';
import { PersonalForm } from './tabs/PersonalForm.tsx';
import { ContactForm } from './tabs/ContactForm.tsx';
import { EmergencyContacts } from './tabs/EmergencyContacts.tsx';
import { SafetyPreferences } from './tabs/SafetyPreferences.tsx';
import { PreferencesForm } from './tabs/PreferencesForm.tsx';

import { DriverAccountSettings } from './driver/DriverAccountSettings.tsx';

interface ProfilePageProps {
  onNavigate: (route: string) => void;
}

type TabType = 'overview' | 'personal' | 'contact' | 'emergency' | 'safety' | 'preferences';

const TABS: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'contact', label: 'Contact Numbers', icon: Phone },
  { id: 'emergency', label: 'Emergency Contacts', icon: ShieldAlert },
  { id: 'safety', label: 'Safety & Assistance', icon: HeartPulse },
  { id: 'preferences', label: 'Ride Preferences', icon: Sliders },
];

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user } = useAuthSession();

  // If authenticated user is a Driver Partner, render the dedicated Driver Account Settings suite
  if (user?.role === 'driver') {
    return <DriverAccountSettings onNavigate={onNavigate} />;
  }

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // State for all sections
  const [profile, setProfile] = useState<UserProfileExtension | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [safety, setSafety] = useState<SafetyPrefsType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getProfile();
      if (res.success && res.data) {
        setProfile(res.data.extension);
        setContacts(res.data.emergencyContacts || []);
        setSafety(res.data.safetyPrefs);
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDashboardRoute = () => {
    if (user?.role === 'driver') return 'driver';
    if (user?.role === 'admin') return 'admin';
    return 'rider';
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Account Overview';
      case 'personal':
        return 'Personal Information';
      case 'contact':
        return 'Contact Information';
      case 'emergency':
        return 'Emergency Contacts';
      case 'safety':
        return 'Safety & Health Preferences';
      case 'preferences':
        return 'Ride Comfort Preferences';
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'overview':
        return 'Review your account strength, personal overview, and security standing.';
      case 'personal':
        return 'Manage your legal identity, date of birth, preferred language, and residential address.';
      case 'contact':
        return 'Maintain verified phone numbers and communication options.';
      case 'emergency':
        return 'Configure trusted family or friends to receive automatic SOS alerts.';
      case 'safety':
        return 'Provide special assistance needs and emergency medical details for first responders.';
      case 'preferences':
        return 'Customize your in-cabin atmosphere, AC temperature, and conversational preference.';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <button
        onClick={() => onNavigate(getDashboardRoute())}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#737373] hover:text-[#171717] mb-6 transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to {toDisplayRole(user?.role)} Dashboard</span>
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 space-y-1 shrink-0">
          <div className="px-3 pb-2">
            <h1 className="text-sm font-bold text-[#171717]">Account Settings</h1>
            <p className="text-[11px] text-[#737373] mt-0.5">Manage your profile & safety</p>
          </div>

          <div className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-[#FFF1F2] text-[#E21D2B] shadow-xs'
                      : 'text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#E21D2B]' : 'text-[#737373]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-sm min-h-[460px]">
          <div className="pb-4 mb-6 border-b border-[#E5E5E5]">
            <h2 className="text-base font-bold text-[#171717]">{getTabTitle()}</h2>
            <p className="text-xs text-[#737373] mt-0.5">{getTabDescription()}</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-7 w-7 text-[#E21D2B] animate-spin mb-3" />
              <p className="text-xs font-semibold text-[#171717]">Loading your profile settings...</p>
              <p className="text-[11px] text-[#737373] mt-1">Retrieving verified records from database.</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <Overview
                  profile={profile}
                  contacts={contacts}
                  safety={safety}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}
              {activeTab === 'personal' && (
                <PersonalForm profile={profile} onUpdate={loadData} />
              )}
              {activeTab === 'contact' && (
                <ContactForm profile={profile} onUpdate={loadData} />
              )}
              {activeTab === 'emergency' && (
                <EmergencyContacts contacts={contacts} onUpdate={loadData} />
              )}
              {activeTab === 'safety' && (
                <SafetyPreferences safety={safety} onUpdate={loadData} />
              )}
              {activeTab === 'preferences' && (
                <PreferencesForm profile={profile} onUpdate={loadData} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
