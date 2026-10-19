import React from 'react';
import { User, Phone, ShieldAlert, HeartPulse, Sliders, ChevronRight, CheckCircle2, Clock, MapPin, Globe } from 'lucide-react';
import { UserProfileExtension, EmergencyContact, SafetyPreferences } from '../../../types/index.ts';
import { useAuthSession } from '../../../context/AuthContext.tsx';
import { toDisplayRole } from '../../../lib/roles.ts';

interface OverviewProps {
  profile: UserProfileExtension | null;
  contacts: EmergencyContact[];
  safety: SafetyPreferences | null;
  onNavigateTab: (tab: 'personal' | 'contact' | 'emergency' | 'safety' | 'preferences') => void;
}

export const Overview: React.FC<OverviewProps> = ({ profile, contacts, safety, onNavigateTab }) => {
  const { user } = useAuthSession();

  const completion = profile?.profile_completion_percentage ?? (
    (profile?.city ? 25 : 0) +
    (profile?.legal_name ? 25 : 0) +
    (contacts.length > 0 ? 25 : 0) +
    (safety?.consent_given ? 25 : 0)
  );

  const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];

  const sections = [
    {
      id: 'personal' as const,
      title: 'Personal Information',
      desc: profile?.legal_name
        ? `${profile.legal_name} · ${profile.city || 'No city'}, ${profile.country || 'India'}`
        : 'Name, DOB, gender & residential address',
      isComplete: Boolean(profile?.legal_name && profile?.city),
      icon: User,
    },
    {
      id: 'contact' as const,
      title: 'Contact Numbers',
      desc: user?.phone
        ? `${user.phone}${profile?.alternate_phone ? ` · Alt: ${profile.alternate_phone}` : ''}`
        : 'Add primary & backup contact numbers',
      isComplete: Boolean(user?.phone),
      icon: Phone,
    },
    {
      id: 'emergency' as const,
      title: 'Emergency Contacts',
      desc: contacts.length > 0
        ? `${contacts.length} Contact${contacts.length > 1 ? 's' : ''}${primaryContact ? ` (Primary: ${primaryContact.name})` : ''}`
        : 'Crucial for SOS alerts & ride safety',
      isComplete: contacts.length > 0,
      icon: ShieldAlert,
    },
    {
      id: 'safety' as const,
      title: 'Safety & Assistance',
      desc: safety?.consent_given
        ? 'Boarding assistance & emergency medical notes configured'
        : 'Accessibility & emergency health preferences',
      isComplete: Boolean(safety?.consent_given),
      icon: HeartPulse,
    },
    {
      id: 'preferences' as const,
      title: 'Ride Comfort Preferences',
      desc: 'AC preference, quiet ride, temperature & cabin music',
      isComplete: true,
      icon: Sliders,
    },
  ];

  return (
    <div className="space-y-6">
      {/* User Header Profile Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#171717] to-[#262626] text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-[#E21D2B] flex items-center justify-center text-xl font-black text-white shadow-inner">
            {(profile?.display_name || profile?.legal_name || user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {profile?.display_name ? `${profile.display_name} (${profile.legal_name || user?.name})` : (profile?.legal_name || user?.name || 'Customer')}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white/90 border border-white/20">
                {toDisplayRole(user?.role)}
              </span>
            </div>
            <p className="text-xs text-white/70 mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-3 text-[11px] text-white/60 mt-1.5 font-medium">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-[#E21D2B]" />
                {profile?.city ? `${profile.city}, ${profile.country || 'India'}` : 'City not specified'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3 text-[#E21D2B]" />
                {profile?.preferred_language || 'English'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('personal')}
          className="self-start sm:self-center px-4 py-2 rounded-xl bg-white text-[#171717] text-xs font-bold hover:bg-[#FAFAFA] transition-colors shadow-xs"
        >
          Edit Profile
        </button>
      </div>

      {/* Profile Completion Meter */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Account Profile Strength</h4>
            <p className="text-[11px] text-[#737373] mt-0.5">Complete your profile to unlock priority matching and full emergency SOS coverage.</p>
          </div>
          <span className="text-sm font-black text-[#E21D2B]">{completion}%</span>
        </div>

        <div className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-[#E21D2B] to-[#F43F5E] h-2 rounded-full transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Sections Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373] px-1">Settings Sections</h4>
        <div className="grid grid-cols-1 gap-3">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.id}
                onClick={() => onNavigateTab(sec.id)}
                className="group flex items-center justify-between p-4 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] hover:border-[#E21D2B]/40 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    sec.isComplete ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FFF1F2] text-[#E21D2B]'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-[#171717] group-hover:text-[#E21D2B] transition-colors">
                        {sec.title}
                      </h5>
                      {sec.isComplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="h-2.5 w-2.5" />
                          Incomplete
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#737373] mt-0.5">{sec.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[#737373] group-hover:text-[#E21D2B] transition-colors">
                  <span>Manage</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
