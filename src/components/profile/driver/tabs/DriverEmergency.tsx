import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  PhoneCall, 
  Star, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Phone
} from 'lucide-react';
import { EmergencyContact } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverEmergencyProps {
  contacts: EmergencyContact[];
  onUpdate: () => void;
}

const RELATIONSHIPS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Child',
  'Relative',
  'Friend',
  'Fleet Manager',
  'Other',
];

export const DriverEmergency: React.FC<DriverEmergencyProps> = ({ contacts, onUpdate }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(contacts.length === 0);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Contact name is required.';
    if (!phone.trim()) {
      errors.phone = 'Mobile phone number is required.';
    } else {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone.length < 10) {
        errors.phone = 'Enter a valid 10-digit mobile number.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setSaving(true);
    try {
      const res = await api.addEmergencyContact({
        name: name.trim(),
        relationship,
        phone: phone.trim(),
        is_primary: isPrimary || contacts.length === 0,
      });

      if (res.success) {
        setSuccessMessage('Emergency contact registered successfully.');
        setName('');
        setPhone('');
        setIsAdding(false);
        setTimeout(() => setSuccessMessage(null), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to add contact. Please verify details.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving emergency contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    setDeletingId(contactId);
    setErrorMessage(null);
    try {
      const res = await api.deleteEmergencyContact(contactId);
      if (res.success) {
        setSuccessMessage('Emergency contact removed.');
        setTimeout(() => setSuccessMessage(null), 3000);
        setConfirmDeleteId(null);
        onUpdate();
      } else {
        setErrorMessage('Could not remove contact.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deleting contact.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Header Banner */}
      <div className="p-4 rounded-xl bg-[#FFF1F2] border border-[#E21D2B]/20 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#E21D2B] shrink-0" />
          <h4 className="font-bold text-[#E21D2B] uppercase tracking-wider">RideNova Driver SOS Alert Protocol</h4>
        </div>
        <p className="text-[#171717] leading-relaxed">
          In the event of an SOS beacon trigger, accident, or security incident, our central 24/7 security dispatch automatically notifies your primary emergency contact with live vehicle telemetry and police coordination status.
        </p>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Contact List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
            Configured Emergency Contacts ({contacts.length})
          </h3>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Contact</span>
            </button>
          )}
        </div>

        {contacts.length === 0 && !isAdding ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] space-y-3">
            <div className="h-12 w-12 rounded-full bg-[#FFF1F2] text-[#E21D2B] flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#171717]">No Emergency Contacts Configured</p>
              <p className="text-[11px] text-[#737373] mt-1 max-w-sm mx-auto">
                Add trusted family members or fleet manager who should be contacted in case of medical emergencies or safety incidents.
              </p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Emergency Contact</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-4 rounded-xl border transition-all ${
                  contact.is_primary
                    ? 'border-[#E21D2B]/40 bg-[#FFF1F2]/30 shadow-xs'
                    : 'border-[#E5E5E5] bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                      contact.is_primary ? 'bg-[#E21D2B] text-white' : 'bg-[#FAFAFA] text-[#737373] border border-[#E5E5E5]'
                    }`}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#171717]">{contact.name}</span>
                        {contact.is_primary && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E21D2B] text-white uppercase">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#737373]">{contact.relationship}</p>
                    </div>
                  </div>

                  {confirmDeleteId === contact.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                        className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === contact.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded border border-[#E5E5E5] text-[10px] font-medium text-[#737373] hover:bg-[#FAFAFA]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(contact.id)}
                      className="p-1.5 rounded-lg text-[#737373] hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-[#E5E5E5] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#171717]">
                    <Phone className="h-3.5 w-3.5 text-[#737373]" />
                    <span>{contact.phone_number || contact.phone}</span>
                  </div>
                  <a
                    href={`tel:${contact.phone_number || contact.phone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FAFAFA] border border-[#E5E5E5] text-[11px] font-bold text-[#171717] hover:bg-[#E5E5E5]/50 transition-colors"
                  >
                    <PhoneCall className="h-3 w-3 text-[#15803D]" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Contact Modal / Form */}
      {isAdding && (
        <form onSubmit={handleAddContact} className="p-4 rounded-xl border border-[#E21D2B]/40 bg-[#FFF1F2]/20 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
            <h4 className="text-xs font-bold text-[#171717] uppercase tracking-wider">Add New Emergency Contact</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#737373] hover:text-[#171717]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Full Name <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="e.g. Sunita Sharma"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
              {formErrors.name && <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">Relationship</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              >
                {RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Mobile Number <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                }}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
              {formErrors.phone && <p className="text-[11px] text-red-600 mt-1">{formErrors.phone}</p>}
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#171717]">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-[#E5E5E5] text-[#E21D2B] focus:ring-[#E21D2B]"
                />
                <span>Set as Primary SOS Emergency Contact</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#737373] hover:bg-[#FAFAFA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{saving ? 'Registering...' : 'Save Emergency Contact'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
