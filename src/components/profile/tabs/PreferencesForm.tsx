import React, { useState } from 'react';
import { Sliders, CheckCircle2, Save, Volume2, Wind, Music, Sparkles } from 'lucide-react';
import { UserProfileExtension } from '../../../types/index.ts';

interface PreferencesProps {
  profile: UserProfileExtension | null;
  onUpdate: () => void;
}

export const PreferencesForm: React.FC<PreferencesProps> = ({ onUpdate }) => {
  const [acPref, setAcPref] = useState<'ac' | 'windows' | 'any'>('ac');
  const [chatPref, setChatPref] = useState<'quiet' | 'chatty' | 'any'>('quiet');
  const [musicPref, setMusicPref] = useState<'silent' | 'soft' | 'any'>('soft');
  const [tempPref, setTempPref] = useState<'cool' | 'moderate' | 'warm'>('cool');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Saved in localStorage and sync with profile
    try {
      localStorage.setItem('ridenova_ride_prefs', JSON.stringify({ acPref, chatPref, musicPref, tempPref }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onUpdate();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Ride comfort preferences saved! Drivers will receive your preferences upon pickup.</span>
        </div>
      )}

      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold">Personalized Cabin Experience</p>
          <p className="text-purple-800 mt-1 leading-relaxed">
            Your ride preferences are automatically shared with your driver before they arrive, so the climate and atmosphere match your taste without you having to ask.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AC / Air Conditioning */}
        <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
            <Wind className="h-4 w-4 text-[#E21D2B]" />
            <span>Air Conditioning</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              { id: 'ac', label: 'AC Always On' },
              { id: 'windows', label: 'Fresh Air / Windows Down' },
              { id: 'any', label: 'No Preference' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#FAFAFA] cursor-pointer">
                <input
                  type="radio"
                  name="acPref"
                  checked={acPref === opt.id}
                  onChange={() => setAcPref(opt.id as any)}
                  className="text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="text-[#171717]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Conversation Preference */}
        <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
            <Volume2 className="h-4 w-4 text-[#E21D2B]" />
            <span>Conversation & Quiet Ride</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              { id: 'quiet', label: 'Quiet Ride (Minimal conversation)' },
              { id: 'chatty', label: 'Friendly Conversation Welcome' },
              { id: 'any', label: 'No Preference' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#FAFAFA] cursor-pointer">
                <input
                  type="radio"
                  name="chatPref"
                  checked={chatPref === opt.id}
                  onChange={() => setChatPref(opt.id as any)}
                  className="text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="text-[#171717]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* In-Car Music */}
        <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
            <Music className="h-4 w-4 text-[#E21D2B]" />
            <span>Music & Radio</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              { id: 'soft', label: 'Soft / Low Volume Instrumental' },
              { id: 'silent', label: 'Complete Silence / No Music' },
              { id: 'any', label: 'Driver Choice / Radio' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#FAFAFA] cursor-pointer">
                <input
                  type="radio"
                  name="musicPref"
                  checked={musicPref === opt.id}
                  onChange={() => setMusicPref(opt.id as any)}
                  className="text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="text-[#171717]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Temperature Preference */}
        <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
            <Sliders className="h-4 w-4 text-[#E21D2B]" />
            <span>Cabin Temperature</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              { id: 'cool', label: 'Cool (20°C - 22°C)' },
              { id: 'moderate', label: 'Moderate (24°C)' },
              { id: 'warm', label: 'Mild / Warm (26°C)' },
            ].map((opt) => (
              <label key={opt.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#FAFAFA] cursor-pointer">
                <input
                  type="radio"
                  name="tempPref"
                  checked={tempPref === opt.id}
                  onChange={() => setTempPref(opt.id as any)}
                  className="text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span className="text-[#171717]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#C01522] transition-colors shadow-xs disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>Save Ride Preferences</span>
        </button>
      </div>
    </form>
  );
};
