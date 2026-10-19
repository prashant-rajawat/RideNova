import React, { useState, useEffect } from 'react';
import { ShieldCheck, HeartPulse, CheckCircle2, AlertCircle, Save, Info } from 'lucide-react';
import { SafetyPreferences as SafetyPrefsType } from '../../../types/index.ts';
import { api } from '../../../lib/api.ts';

interface SafetyProps {
  safety: SafetyPrefsType | null;
  onUpdate: () => void;
}

export const SafetyPreferences: React.FC<SafetyProps> = ({ safety, onUpdate }) => {
  const [accessibilityNotes, setAccessibilityNotes] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (safety) {
      setAccessibilityNotes(safety.accessibility_notes || '');
      setEmergencyNotes(safety.emergency_notes || '');
      setConsentGiven(Boolean(safety.consent_given));
    }
  }, [safety]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if ((accessibilityNotes.trim() || emergencyNotes.trim()) && !consentGiven) {
      setErrorMessage('Please check the consent authorization box to store sensitive safety and medical notes.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateSafetyPreferences({
        accessibility_notes: accessibilityNotes.trim() || null,
        emergency_notes: emergencyNotes.trim() || null,
        consent_given: consentGiven,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to save safety settings.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating safety preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Safety and assistance preferences saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Notice Card */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold">Confidential Health & Boarding Information</p>
          <p className="text-blue-800 mt-1 leading-relaxed">
            Information provided here is encrypted and only shared with emergency personnel (in case of an SOS event) or shown as high-level boarding guidance to assigned drivers.
          </p>
        </div>
      </div>

      {/* Accessibility Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <ShieldCheck className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Special Assistance & Accessibility</h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Boarding Assistance Notes <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={accessibilityNotes}
            onChange={(e) => setAccessibilityNotes(e.target.value)}
            placeholder="e.g. Folding wheelchair in boot required, passenger is visually impaired and appreciates verbal guidance upon arrival, extra time needed to enter vehicle."
            className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
          />
          <p className="text-[10px] text-[#737373] mt-1">
            Notified to the driver upon ride confirmation so they can position the vehicle appropriately.
          </p>
        </div>
      </div>

      {/* Emergency Medical Notes */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <HeartPulse className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Emergency Medical Notes</h3>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#171717] mb-1">
            Critical Medical & Allergy Info <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            placeholder="e.g. Blood Group O+, Severe Penicillin allergy, Diabetic. Carry insulin kit."
            className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
          />
          <p className="text-[10px] text-[#737373] mt-1">
            Only transmitted to first responders and emergency paramedics in the event of an SOS crash or medical dispatch.
          </p>
        </div>
      </div>

      {/* Consent Checkbox */}
      <div className="p-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="safetyConsentCheckbox"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="h-4 w-4 rounded text-[#E21D2B] focus:ring-[#E21D2B] border-gray-300 mt-0.5"
          />
          <label htmlFor="safetyConsentCheckbox" className="text-xs text-[#171717] font-medium leading-relaxed cursor-pointer">
            I consent to RideNova securely storing this assistance and health information to provide customized ride support and dispatch first responder medical aid when necessary.
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E5E5E5] flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#C01522] transition-colors shadow-xs disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Safety Information'}</span>
        </button>
      </div>
    </form>
  );
};
