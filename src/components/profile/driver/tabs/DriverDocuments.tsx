import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Eye, 
  Save, 
  Send,
  Calendar,
  X
} from 'lucide-react';
import { DriverProfile } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverDocumentsProps {
  driver: DriverProfile | null;
  onUpdate: () => void;
}

export const DriverDocuments: React.FC<DriverDocumentsProps> = ({ driver, onUpdate }) => {
  const isApproved = driver?.status === 'approved';
  const kycStatus = driver?.kycStatus || (isApproved ? 'approved' : 'draft');

  // Form states
  const [licenseNumber, setLicenseNumber] = useState(driver?.licenseNumber || '');
  const [licenseState, setLicenseState] = useState(driver?.licenseState || 'Delhi');
  const [licenseExpiry, setLicenseExpiry] = useState(driver?.licenseExpiry || '2034-08-15');
  const [licenseFrontUrl, setLicenseFrontUrl] = useState(driver?.licenseFrontUrl || '');
  const [licenseBackUrl, setLicenseBackUrl] = useState(driver?.licenseBackUrl || '');

  const [idType, setIdType] = useState(driver?.idType || 'Aadhaar Card');
  const [idNumber, setIdNumber] = useState(driver?.idNumberMasked || '');
  const [idDocumentUrl, setIdDocumentUrl] = useState(driver?.idDocumentUrl || '');

  const [rcDocumentUrl, setRcDocumentUrl] = useState(driver?.vehicle?.rc_document_url || '');
  const [insuranceDocUrl, setInsuranceDocUrl] = useState(driver?.vehicle?.insurance_document_url || '');
  const [pucDocUrl, setPucDocUrl] = useState(driver?.vehicle?.puc_document_url || '');

  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setter(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveDocuments = async (submitForReview: boolean) => {
    setErrorMessage(null);
    setSaveSuccess(false);
    setSaving(true);

    try {
      const payload = {
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseState: licenseState.trim(),
        licenseExpiry,
        licenseFrontUrl,
        licenseBackUrl,
        idType,
        idNumber: idNumber.trim(),
        idDocumentUrl,
        rcDocumentUrl,
        insuranceDocumentUrl: insuranceDocUrl,
        pucDocumentUrl: pucDocUrl,
        submitForReview,
      };

      const res = await api.submitDriverKyc(payload);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to save document records. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to submit documents', err);
      setErrorMessage(err.message || 'Error uploading driver compliance documents.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (hasDoc: boolean, isVerified: boolean) => {
    if (isVerified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20">
          <CheckCircle2 className="h-3 w-3" />
          Verified
        </span>
      );
    }
    if (hasDoc) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
          <Clock className="h-3 w-3" />
          Under Review
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#737373]/10 text-[#737373] border border-[#E5E5E5]">
        Upload Required
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Documents saved and submitted for compliance review!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KYC Standing Banner */}
      <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#E21D2B]" />
            <h4 className="font-bold text-[#171717] uppercase tracking-wider">KYC Compliance Standing</h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isApproved ? 'bg-[#15803D]/10 text-[#15803D]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
            }`}>
              {kycStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <p className="text-[#737373] mt-1">
            Documents are reviewed by the RideNova Compliance Trust & Safety team within 24-48 business hours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveDocuments(false)}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] bg-white text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA] transition-colors shadow-xs disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5 inline mr-1" />
            <span>Save Draft</span>
          </button>
          <button
            type="button"
            onClick={() => handleSaveDocuments(true)}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-[#E21D2B] text-white text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-xs disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5 inline mr-1" />
            <span>Submit for Review</span>
          </button>
        </div>
      </div>

      {/* 1. Commercial Driving Licence */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#E21D2B]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Commercial Driving Licence (DL)</h4>
          </div>
          {getStatusBadge(Boolean(licenseFrontUrl), isApproved)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Licence Number</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
              placeholder="e.g. DL-04202400918"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono uppercase text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Issuing Authority / State</label>
            <input
              type="text"
              value={licenseState}
              onChange={(e) => setLicenseState(e.target.value)}
              placeholder="e.g. Delhi Transport Authority"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Licence Expiry Date</label>
            <input
              type="date"
              value={licenseExpiry}
              onChange={(e) => setLicenseExpiry(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>
        </div>

        {/* Licence Images Upload */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Front Image */}
          <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
            <span className="text-xs font-bold text-[#171717] block">Licence Card Front Side</span>
            {licenseFrontUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-[#E5E5E5] h-32 bg-white flex items-center justify-center">
                <img src={licenseFrontUrl} alt="DL Front" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(licenseFrontUrl)}
                    className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white text-xs font-bold"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <label className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white text-xs font-bold cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setLicenseFrontUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-[#E21D2B] bg-white cursor-pointer transition-colors p-3 text-center">
                <Upload className="h-5 w-5 text-[#737373] mb-1" />
                <span className="text-xs font-bold text-[#171717]">Upload Front Photo</span>
                <span className="text-[10px] text-[#737373] mt-0.5">JPG, PNG or PDF</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setLicenseFrontUrl)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Back Image */}
          <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
            <span className="text-xs font-bold text-[#171717] block">Licence Card Back Side</span>
            {licenseBackUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-[#E5E5E5] h-32 bg-white flex items-center justify-center">
                <img src={licenseBackUrl} alt="DL Back" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(licenseBackUrl)}
                    className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white text-xs font-bold"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <label className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white text-xs font-bold cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setLicenseBackUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-[#E21D2B] bg-white cursor-pointer transition-colors p-3 text-center">
                <Upload className="h-5 w-5 text-[#737373] mb-1" />
                <span className="text-xs font-bold text-[#171717]">Upload Back Photo</span>
                <span className="text-[10px] text-[#737373] mt-0.5">JPG, PNG or PDF</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setLicenseBackUrl)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* 2. Government Identity Verification */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#E21D2B]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Government National Identity</h4>
          </div>
          {getStatusBadge(Boolean(idDocumentUrl), isApproved)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Identity Document Type</label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            >
              <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
              <option value="PAN Card">PAN Card (Income Tax Dept.)</option>
              <option value="Passport">Passport</option>
              <option value="Voter ID">Election Commission Voter ID</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#171717] mb-1">Document Identifier (Masked)</label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="XXXX-XXXX-4912"
              className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
            />
          </div>
        </div>

        {/* ID Document Preview & Upload */}
        <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
          <span className="text-xs font-bold text-[#171717] block">Scan / Photo of {idType}</span>
          {idDocumentUrl ? (
            <div className="relative group rounded-lg overflow-hidden border border-[#E5E5E5] h-32 bg-white flex items-center justify-center">
              <img src={idDocumentUrl} alt="ID Document" className="h-full w-full object-contain" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                <button
                  type="button"
                  onClick={() => setPreviewModalUrl(idDocumentUrl)}
                  className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white text-xs font-bold"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <label className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white text-xs font-bold cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setIdDocumentUrl)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-[#E21D2B] bg-white cursor-pointer transition-colors p-3 text-center">
              <Upload className="h-5 w-5 text-[#737373] mb-1" />
              <span className="text-xs font-bold text-[#171717]">Upload {idType} Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, setIdDocumentUrl)}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* 3. Vehicle Compliance Documents: RC, Insurance, PUC */}
      <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#E21D2B]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Vehicle Registration, Insurance & PUC</h4>
          </div>
          {getStatusBadge(Boolean(rcDocumentUrl), isApproved)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* RC Document */}
          <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
            <span className="text-xs font-bold text-[#171717] block">Registration Certificate (RC)</span>
            {rcDocumentUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-[#E5E5E5] h-28 bg-white flex items-center justify-center">
                <img src={rcDocumentUrl} alt="Vehicle RC" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(rcDocumentUrl)}
                    className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <label className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setRcDocumentUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-[#E21D2B] bg-white cursor-pointer transition-colors p-3 text-center">
                <Upload className="h-4 w-4 text-[#737373] mb-1" />
                <span className="text-xs font-bold text-[#171717]">Upload Vehicle RC</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setRcDocumentUrl)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Insurance Policy */}
          <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
            <span className="text-xs font-bold text-[#171717] block">Insurance Certificate</span>
            {insuranceDocUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-[#E5E5E5] h-28 bg-white flex items-center justify-center">
                <img src={insuranceDocUrl} alt="Insurance" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(insuranceDocUrl)}
                    className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <label className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setInsuranceDocUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-[#E21D2B] bg-white cursor-pointer transition-colors p-3 text-center">
                <Upload className="h-4 w-4 text-[#737373] mb-1" />
                <span className="text-xs font-bold text-[#171717]">Upload Insurance</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setInsuranceDocUrl)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* PUC Certificate */}
          <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] space-y-2">
            <span className="text-xs font-bold text-[#171717] block">PUC Emission Certificate</span>
            {pucDocUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-[#E5E5E5] h-28 bg-white flex items-center justify-center">
                <img src={pucDocUrl} alt="PUC Document" className="h-full w-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(pucDocUrl)}
                    className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <label className="p-1.5 rounded-lg bg-white/90 text-[#171717] hover:bg-white cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setPucDocUrl)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-[#E5E5E5] rounded-xl hover:border-[#E21D2B] bg-white cursor-pointer transition-colors p-3 text-center">
                <Upload className="h-4 w-4 text-[#737373] mb-1" />
                <span className="text-xs font-bold text-[#171717]">Upload PUC Certificate</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, setPucDocUrl)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Document Full View Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
              <span className="text-xs font-bold text-[#171717]">Document Verification Preview</span>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-lg text-[#737373] hover:text-[#171717] hover:bg-[#FAFAFA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img src={previewModalUrl} alt="Preview" className="max-h-[60vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
