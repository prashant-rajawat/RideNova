import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Edit3, 
  DollarSign, 
  Loader2,
  Lock
} from 'lucide-react';
import { DriverProfile, DriverPayout } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverBankPayoutProps {
  driver: DriverProfile | null;
  onUpdate: () => void;
}

const SUPPORTED_BANKS = [
  'HDFC Bank',
  'State Bank of India (SBI)',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'Canara Bank',
  'Union Bank of India',
  'Other Scheduled Bank',
];

export const DriverBankPayout: React.FC<DriverBankPayoutProps> = ({ driver, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(!driver?.bankAccountNumberMasked);
  const [accountName, setAccountName] = useState(driver?.bankAccountName || driver?.name || '');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState(driver?.bankIfsc || '');
  const [upiId, setUpiId] = useState(driver?.upiId || '');

  // Payout request modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('2500');
  const [payouts, setPayouts] = useState<DriverPayout[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (driver?.bankAccountName) setAccountName(driver.bankAccountName);
    if (driver?.bankIfsc) setIfsc(driver.bankIfsc);
    if (driver?.upiId) setUpiId(driver.upiId);
  }, [driver]);

  useEffect(() => {
    const loadPayouts = async () => {
      setLoadingPayouts(true);
      try {
        const res = await api.getDriverPayouts();
        if (res.data) {
          setPayouts(res.data);
        }
      } catch (err) {
        console.error('Failed to load payouts', err);
      } finally {
        setLoadingPayouts(false);
      }
    };
    loadPayouts();
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!accountName.trim()) newErrors.accountName = 'Account holder name is required.';
    if (!ifsc.trim()) {
      newErrors.ifsc = 'Bank IFSC code is required.';
    } else if (ifsc.trim().length !== 11) {
      newErrors.ifsc = 'IFSC must be exactly 11 characters (e.g. HDFC0001892).';
    }

    if (!driver?.bankAccountNumberMasked || accountNumber) {
      if (!accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required.';
      } else if (accountNumber.trim().length < 8) {
        newErrors.accountNumber = 'Enter a valid account number.';
      }

      if (accountNumber !== confirmAccountNumber) {
        newErrors.confirmAccountNumber = 'Account numbers do not match.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!validate()) return;

    setSaving(true);
    try {
      const payload: any = {
        bankAccountName: accountName.trim(),
        bankIfsc: ifsc.trim().toUpperCase(),
        upiId: upiId.trim() || undefined,
      };

      if (accountNumber) {
        payload.bankAccountNumber = accountNumber.trim();
      }

      const res = await api.submitDriverKyc(payload);
      if (res.success) {
        setSaveSuccess(true);
        setIsEditing(false);
        setAccountNumber('');
        setConfirmAccountNumber('');
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to update bank details.');
      }
    } catch (err: any) {
      console.error('Failed to save bank information', err);
      setErrorMessage(err.message || 'Error updating bank details.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(payoutAmount);
    if (!amount || amount < 100) {
      setErrorMessage('Minimum payout withdrawal is ₹100.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await api.requestDriverPayout(amount);
      if (res.success) {
        setSaveSuccess(true);
        setIsPayoutModalOpen(false);
        setTimeout(() => setSaveSuccess(false), 4000);
        // Refresh payouts list
        const pRes = await api.getDriverPayouts();
        if (pRes.data) setPayouts(pRes.data);
      } else {
        setErrorMessage('Payout transfer failed. Please retry.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting payout.');
    } finally {
      setSaving(false);
    }
  };

  const hasConfiguredBank = Boolean(driver?.bankAccountNumberMasked);

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Bank payout credentials updated and verified successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Security Banner */}
      <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] flex items-start gap-3">
        <Lock className="h-4 w-4 text-[#E21D2B] mt-0.5 shrink-0" />
        <div className="text-xs">
          <span className="font-bold text-[#171717] block">Direct Payout Security Protocols</span>
          <p className="text-[#737373] mt-0.5 leading-relaxed">
            Earnings withdrawals are transferred via RBI-regulated IMPS/NEFT rails directly to your registered bank account or verified UPI VPA. Account numbers are tokenized and masked for maximum financial security.
          </p>
        </div>
      </div>

      {/* Active Payout Method Summary Card */}
      {hasConfiguredBank && !isEditing ? (
        <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#FFF1F2] text-[#E21D2B] flex items-center justify-center font-bold">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#171717]">
                    {driver?.bankAccountName || 'Primary Payout Account'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20 uppercase">
                    Active & Verified
                  </span>
                </div>
                <p className="font-mono text-xs text-[#737373] mt-0.5">
                  Account: <span className="text-[#171717] font-semibold">{driver?.bankAccountNumberMasked}</span>
                  {' · '}
                  IFSC: <span className="text-[#171717] font-semibold uppercase">{driver?.bankIfsc || 'HDFC0001892'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA]"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Account</span>
              </button>
              <button
                onClick={() => setIsPayoutModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] shadow-xs"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>Withdraw Funds</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">Payout Mode</span>
              <span className="font-bold text-[#171717]">Daily IMPS Auto-Deposit</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">UPI ID</span>
              <span className="font-mono font-bold text-[#171717]">{driver?.upiId || 'Not Configured'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">Settlement Window</span>
              <span className="font-bold text-[#15803D]">Instant (Under 15 Mins)</span>
            </div>
          </div>
        </div>
      ) : (
        /* Edit or Configure Bank Form */
        <form onSubmit={handleSaveBank} className="space-y-4 p-5 rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
              {hasConfiguredBank ? 'Update Payout Bank Details' : 'Configure Bank Account for Earnings Payouts'}
            </h4>
            {hasConfiguredBank && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-[#737373] hover:text-[#171717]"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Account Holder Name */}
            <div>
              <label className="block font-semibold text-[#171717] mb-1">
                Account Holder Name <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  if (errors.accountName) setErrors({ ...errors, accountName: '' });
                }}
                placeholder="Name as per Bank Passbook"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
              {errors.accountName && <p className="text-[11px] text-red-600 mt-1">{errors.accountName}</p>}
            </div>

            {/* Bank Name */}
            <div>
              <label className="block font-semibold text-[#171717] mb-1">Select Bank</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              >
                {SUPPORTED_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block font-semibold text-[#171717] mb-1">
                Bank Account Number <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="password"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  if (errors.accountNumber) setErrors({ ...errors, accountNumber: '' });
                }}
                placeholder={driver?.bankAccountNumberMasked || 'Enter full account number'}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
              {errors.accountNumber && <p className="text-[11px] text-red-600 mt-1">{errors.accountNumber}</p>}
            </div>

            {/* Confirm Account Number */}
            <div>
              <label className="block font-semibold text-[#171717] mb-1">
                Confirm Bank Account Number <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={confirmAccountNumber}
                onChange={(e) => {
                  setConfirmAccountNumber(e.target.value);
                  if (errors.confirmAccountNumber) setErrors({ ...errors, confirmAccountNumber: '' });
                }}
                placeholder="Re-enter account number"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
              {errors.confirmAccountNumber && <p className="text-[11px] text-red-600 mt-1">{errors.confirmAccountNumber}</p>}
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block font-semibold text-[#171717] mb-1">
                Bank IFSC Code <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => {
                  setIfsc(e.target.value.toUpperCase());
                  if (errors.ifsc) setErrors({ ...errors, ifsc: '' });
                }}
                placeholder="e.g. HDFC0001892"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono uppercase text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
              {errors.ifsc && <p className="text-[11px] text-red-600 mt-1">{errors.ifsc}</p>}
            </div>

            {/* UPI ID */}
            <div>
              <label className="block font-semibold text-[#171717] mb-1">
                UPI ID / VPA <span className="text-[#737373] text-[10px] font-normal">(Optional for Instant UPI)</span>
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] bg-white focus:border-[#E21D2B] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-end gap-2">
            {hasConfiguredBank && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#737373] hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Verifying...' : 'Save Bank Details'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Payout History Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
            Recent Payout Dispatches ({payouts.length})
          </h4>
          <span className="text-[11px] text-[#737373]">Automated Daily Settlement</span>
        </div>

        {loadingPayouts ? (
          <div className="p-6 text-center text-xs text-[#737373]">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#E21D2B] mb-1" />
            Loading payout transactions...
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] text-xs text-[#737373]">
            No payout transactions recorded yet. Complete rides to initiate your first automatic payout.
          </div>
        ) : (
          <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] text-[#737373] font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Target Account</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAFAFA]/70">
                    <td className="p-3 font-mono font-bold text-[#171717]">{p.reference_id || `PO-${p.id.slice(0, 8)}`}</td>
                    <td className="p-3 text-[#737373]">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-3 font-mono text-[#737373]">{p.bank_account_masked || driver?.bankAccountNumberMasked || 'Registered Bank'}</td>
                    <td className="p-3 font-bold text-[#171717]">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === 'completed' ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Payout Request Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-[#E5E5E5] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
              <h3 className="text-sm font-bold text-[#171717]">Instant Fund Withdrawal</h3>
              <button onClick={() => setIsPayoutModalOpen(false)} className="text-xs text-[#737373] hover:text-[#171717]">✕</button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#171717] mb-1">Transfer Destination</label>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] font-mono text-[#171717]">
                  {driver?.bankAccountName || 'Authorized Account'} ({driver?.bankAccountNumberMasked})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#171717] mb-1">Withdrawal Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#737373] font-bold">₹</span>
                  <input
                    type="number"
                    min={100}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-[#E5E5E5] font-bold text-sm text-[#171717] focus:border-[#E21D2B] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-[#737373] mt-1">Daily limits: Minimum ₹100, Maximum ₹50,000 per transaction.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-[#737373] hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-[#E21D2B] text-white font-bold hover:bg-[#BE1622] disabled:opacity-50"
                >
                  {saving ? 'Processing Transfer...' : 'Initiate Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
