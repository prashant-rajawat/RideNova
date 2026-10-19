import React, { useState } from 'react';
import { ShieldAlert, Plus, Trash2, Phone, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EmergencyContact } from '../../../types/index.ts';
import { api } from '../../../lib/api.ts';

interface EmergencyProps {
  contacts: EmergencyContact[];
  onUpdate: () => void;
}

const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Child',
  'Friend',
  'Guardian',
  'Colleague',
  'Other',
];

export const EmergencyContacts: React.FC<EmergencyProps> = ({ contacts, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(contacts.length === 0);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Contact name is required.');
      return;
    }
    if (!phone.trim() || !/^[+0-9\s-]{8,20}$/.test(phone.trim())) {
      setErrorMsg('Please enter a valid phone number with country/area code.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.addEmergencyContact({
        name: name.trim(),
        relationship,
        phone_number: phone.trim(),
        is_primary: isPrimary || contacts.length === 0,
      });

      if (res.success) {
        setName('');
        setPhone('');
        setRelationship('Parent');
        setIsPrimary(false);
        setShowAddForm(false);
        setSuccessMsg('Emergency contact added successfully.');
        setTimeout(() => setSuccessMsg(null), 4000);
        onUpdate();
      } else {
        setErrorMsg('Failed to add contact.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error adding contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, contactName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${contactName} from your emergency contacts?`)) {
      return;
    }

    setDeletingId(id);
    setErrorMsg(null);
    try {
      const res = await api.deleteEmergencyContact(id);
      if (res.success) {
        setSuccessMsg('Emergency contact removed.');
        setTimeout(() => setSuccessMsg(null), 4000);
        onUpdate();
      } else {
        setErrorMsg('Failed to remove contact.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error removing contact.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold">Ride Safety & SOS Notification System</p>
          <p className="text-amber-800 mt-1 leading-relaxed">
            Emergency contacts will receive automated SMS notifications with live GPS tracking links if you trigger the SOS button during a ride, or if an unexpected route deviation or crash is detected.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header with Add Button */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Emergency Contacts ({contacts.length})</h3>
          <p className="text-[11px] text-[#737373] mt-0.5">We recommend adding at least 2 trusted individuals.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#C01522] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </button>
        )}
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="p-4 rounded-xl border border-[#E21D2B]/30 bg-[#FFF1F2]/20 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#171717]">New Emergency Contact</h4>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-xs text-[#737373] hover:text-[#171717]"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAdd} className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#171717] mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 bg-white focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#171717] mb-1">Relationship *</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 bg-white focus:border-[#E21D2B] focus:outline-none"
                >
                  {RELATIONSHIP_OPTIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#171717] mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 12345"
                  required
                  className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 bg-white focus:border-[#E21D2B] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="primaryContactCheckbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 rounded text-[#E21D2B] focus:ring-[#E21D2B] border-gray-300"
                />
                <label htmlFor="primaryContactCheckbox" className="text-xs font-medium text-[#171717] cursor-pointer">
                  Set as Primary Contact (first alerted during SOS)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#737373] hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#E21D2B] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#C01522] disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts List */}
      <div className="space-y-3">
        {contacts.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-[#E5E5E5] rounded-xl text-xs text-[#737373]">
            <p className="font-semibold text-[#171717]">No emergency contacts registered.</p>
            <p className="mt-1">Add trusted family or friends who can be reached if an emergency occurs during your rides.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#C01522]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Contact</span>
            </button>
          </div>
        ) : (
          contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-4 rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] hover:border-[#E21D2B]/30 transition-colors shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-[#737373]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#171717]">{contact.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAFAFA] border border-[#E5E5E5] text-[#737373]">
                      {contact.relationship}
                    </span>
                    {contact.is_primary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF1F2] border border-[#E21D2B]/30 text-[#E21D2B]">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Primary Contact
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-[#737373] mt-1">{contact.phone_number}</p>
                </div>
              </div>

              <button
                onClick={() => handleDelete(contact.id, contact.name)}
                disabled={deletingId === contact.id}
                className="p-2 text-[#737373] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete Contact"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
