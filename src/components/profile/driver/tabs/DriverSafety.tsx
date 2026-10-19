import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Lock,
  FileHeart
} from 'lucide-react';
import { SafetyPreferences } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverSafetyProps {
  safety: SafetyPreferences | null;
  onUpdate: () => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'];

export const DriverSafety: React.FC<DriverSafetyProps> = ({ safety, onUpdate }) => {
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [accessibility, setAccessibility] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (safety) {
      setBloodGroup(safety.blood_group || '');
      setAllergies(safety.allergies || '');
      setConditions(safety.medical_conditions || '');
      setAccessibility(safety.special_assistance_notes || '');
      setEmergencyNotes(safety.emergency_medical_notes || '');
      setConsentGiven(Boolean(safety.consent_given));
    }
  }, [safety]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    setSaving(true);
    try {
      const payload = {
        blood_group: bloodGroup || null,
        allergies: allergies.trim() || null,
        medical_conditions: conditions.trim() || null,
        special_assistance_notes: accessibility.trim() || null,
        emergency_medical_notes: emergencyNotes.trim() || null,
        consent_given: consentGiven,
      };

      const res = await api.updateSafetyPreferences(payload);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to save safety and medical preferences.');
      }
    } catch (err: any) {
      console.error('Failed to update safety preferences', err);
      setErrorMessage(err.message || 'Error updating safety preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (safety) {
      setBloodGroup(safety.blood_group || '');
      setAllergies(safety.allergies || '');
      setConditions(safety.medical_conditions || '');
      setAccessibility(safety.special_assistance_notes || '');
      setEmergencyNotes(safety.emergency_medical_notes || '');
      setConsentGiven(Boolean(safety.consent_given));
    }
    setErrorMessage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Safety and first responder medical notes updated successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Privacy Notice Card */}
      <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[#E21D2B]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">First Responder Medical Privacy Protocol</h4>
        </div>
        <p className="text-[11px] text-[#737373] leading-relaxed">
          Information provided in this section is completely optional and strictly confidential. It is never visible to passengers or other drivers. It is stored in an encrypted vault and decrypted exclusively for dispatch to verified emergency paramedics and hospital trauma teams if you trigger the RideNova Emergency SOS Beacon.
        </p>
      </div>

      {/* Medical Notes Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
          <FileHeart className="h-4 w-4 text-[#E21D2B]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Emergency Medical Credentials</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Blood Group */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Blood Group <span className="text-[#737373] text-[10px] font-normal">(Optional)</span>
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              <option value="">Select Blood Group</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <p className="text-[10px] text-[#737373] mt-1">Enables emergency blood transfusion preparedness.</p>
          </div>

          {/* Known Allergies */}
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Known Drug / Medical Allergies
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa drugs, None"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
            <p className="text-[10px] text-[#737373] mt-1">Prevents administration of contra-indicated emergency medication.</p>
          </div>

          {/* Chronic Medical Conditions */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Relevant Medical Conditions
            </label>
            <input
              type="text"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma, Pacemaker"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Accessibility Requirements */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Accessibility or Physical Assistance Needs
            </label>
            <input
              type="text"
              value={accessibility}
              onChange={(e) => setAccessibility(e.target.value)}
              placeholder="e.g. Hearing aid user, mobility support assistance"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          {/* Emergency Notes for First Responders */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#171717] mb-1">
              Emergency Instructions for First Responders
            </label>
            <textarea
              rows={3}
              value={emergencyNotes}
              onChange={(e) => setEmergencyNotes(e.target.value)}
              placeholder="e.g. Regular medication stored in glove compartment; primary hospital: Max Healthcare Saket."
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] flex items-start gap-2.5">
          <input
            type="checkbox"
            id="driver-safety-consent"
            checked={consentGiven}
            onChange={(e) => setConsentGiven(e.target.checked)}
            className="mt-0.5 rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
          />
          <label htmlFor="driver-safety-consent" className="text-xs text-[#171717] cursor-pointer">
            <span className="font-bold">I authorize emergency medical transmission:</span>{' '}
            I consent to RideNova transmitting the above medical information to verified ambulance paramedics and police authorities strictly upon active emergency beacon initiation.
          </label>
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
          <span>{saving ? 'Saving...' : 'Save Safety Preferences'}</span>
        </button>
      </div>
    </form>
  );
};
