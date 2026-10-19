import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  MapPin, 
  Clock, 
  Zap, 
  VolumeX, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RotateCcw,
  Languages
} from 'lucide-react';
import { DriverProfile, UserProfileExtension } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverPreferencesProps {
  driver: DriverProfile | null;
  extension: UserProfileExtension | null;
  onUpdate: () => void;
}

const SHIFT_OPTIONS = [
  { id: 'flexible', label: 'Full Day Flexible (Anytime Availability)', desc: 'Maximizes ride matching 24/7 whenever you toggle online' },
  { id: 'morning_peak', label: 'Morning Peak Commute (6:00 AM – 11:30 AM)', desc: 'Prioritizes airport drops, metro feeder trips & office commutes' },
  { id: 'evening_peak', label: 'Evening Peak Commute (5:00 PM – 10:30 PM)', desc: 'High-density commercial hubs and surge multiplier routes' },
  { id: 'night_shift', label: 'Late Night Shift (10:00 PM – 6:00 AM)', desc: 'Night fare premiums and interstate station connections' },
];

export const DriverPreferences: React.FC<DriverPreferencesProps> = ({ driver, extension, onUpdate }) => {
  const [preferredLanguage, setPreferredLanguage] = useState(driver?.preferredLanguage || 'English');
  const [operatingCity, setOperatingCity] = useState(driver?.operatingCity || extension?.city || 'Delhi NCR');
  const [autoAccept, setAutoAccept] = useState(Boolean(driver?.autoAcceptRides));
  const [workingHours, setWorkingHours] = useState(driver?.workingHoursPreference || 'flexible');
  const [quietRide, setQuietRide] = useState(Boolean(driver?.quietRidePreference));

  // Eligible categories
  const [acceptEconomy, setAcceptEconomy] = useState(true);
  const [acceptComfort, setAcceptComfort] = useState(true);
  const [acceptPremium, setAcceptPremium] = useState(driver?.vehicle?.vehicle_type === 'premium');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      setPreferredLanguage(driver.preferredLanguage || 'English');
      setOperatingCity(driver.operatingCity || extension?.city || 'Delhi NCR');
      setAutoAccept(Boolean(driver.autoAcceptRides));
      setWorkingHours(driver.workingHoursPreference || 'flexible');
      setQuietRide(Boolean(driver.quietRidePreference));
    }
  }, [driver, extension]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    setSaving(true);
    try {
      const payload = {
        preferredLanguage,
        operatingCity: operatingCity.trim(),
        autoAcceptRides: autoAccept,
        workingHoursPreference: workingHours,
        quietRidePreference: quietRide,
      };

      await api.submitDriverKyc(payload);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      onUpdate();
    } catch (err: any) {
      console.error('Failed to update driver preferences', err);
      setErrorMessage(err.message || 'Error updating dispatch preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (driver) {
      setPreferredLanguage(driver.preferredLanguage || 'English');
      setOperatingCity(driver.operatingCity || extension?.city || 'Delhi NCR');
      setAutoAccept(Boolean(driver.autoAcceptRides));
      setWorkingHours(driver.workingHoursPreference || 'flexible');
      setQuietRide(Boolean(driver.quietRidePreference));
    }
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Ride matching preferences saved and synced with dispatch engine!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Auto-Accept Rides Toggle Card */}
      <div className="p-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#FFF1F2] text-[#E21D2B] flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#171717] block">Auto-Accept Incoming Requests</span>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Automatically accepts closest matched rides without manual interaction when driving.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoAccept}
            onChange={(e) => setAutoAccept(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E21D2B]" />
        </label>
      </div>

      {/* Dispatch Region & Language */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <MapPin className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Operating Region & Spoken Languages</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#171717] mb-1">
              Primary Dispatch City
            </label>
            <input
              type="text"
              value={operatingCity}
              onChange={(e) => setOperatingCity(e.target.value)}
              placeholder="e.g. Delhi NCR, Mumbai, Bengaluru"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="text-[10px] text-[#737373] mt-1">Defines your home hub for return trip matching.</p>
          </div>

          <div>
            <label className="block font-semibold text-[#171717] mb-1">
              Preferred Passenger Interaction Language
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Gujarati">Gujarati (ગુજરાતી)</option>
              <option value="Marathi">Marathi (मराठी)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
              <option value="Bengali">Bengali (বাংলা)</option>
              <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferred Working Hours / Shift Schedule */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <Clock className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Preferred Shift Schedule</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SHIFT_OPTIONS.map((shift) => {
            const isSelected = workingHours === shift.id;
            return (
              <div
                key={shift.id}
                onClick={() => setWorkingHours(shift.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#E21D2B] bg-[#FFF1F2] shadow-xs'
                    : 'border-[#E5E5E5] bg-white hover:border-[#737373]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#E21D2B]' : 'text-[#171717]'}`}>
                    {shift.label}
                  </span>
                  <input
                    type="radio"
                    checked={isSelected}
                    onChange={() => setWorkingHours(shift.id)}
                    className="text-[#E21D2B] focus:ring-[#E21D2B]"
                  />
                </div>
                <p className="text-[11px] text-[#737373] leading-snug">{shift.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* In-Cabin Atmosphere */}
      <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white space-y-3">
        <div className="flex items-center gap-2">
          <VolumeX className="h-4 w-4 text-[#E21D2B]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">In-Cabin Comfort Defaults</h4>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-xs font-bold text-[#171717] block">Quiet Trip Preference by Default</span>
            <p className="text-[11px] text-[#737373] mt-0.5">
              Keeps in-car audio minimized unless the passenger requests FM radio or Bluetooth pairing.
            </p>
          </div>
          <input
            type="checkbox"
            checked={quietRide}
            onChange={(e) => setQuietRide(e.target.checked)}
            className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
          />
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
          <span>{saving ? 'Saving...' : 'Save Ride Preferences'}</span>
        </button>
      </div>
    </form>
  );
};
