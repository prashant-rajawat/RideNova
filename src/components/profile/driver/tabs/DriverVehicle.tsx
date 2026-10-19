import React, { useState, useEffect } from 'react';
import { 
  Car, 
  ShieldCheck, 
  Calendar, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Edit3,
  Users
} from 'lucide-react';
import { DriverProfile, Vehicle, VehicleType } from '../../../../types/index.ts';
import { api } from '../../../../lib/api.ts';

interface DriverVehicleProps {
  driver: DriverProfile | null;
  onUpdate: () => void;
}

const VEHICLE_TYPES: { id: VehicleType; label: string; desc: string }[] = [
  { id: 'economy', label: 'RideNova Go (Economy)', desc: 'Hatchbacks & Compact Sedans (WagonR, Swift, Tiago)' },
  { id: 'comfort', label: 'RideNova Comfort', desc: 'Spacious Sedans & Compact SUVs (Dzire, Aura, Tigor, Nexon)' },
  { id: 'premium', label: 'RideNova Premier / XL', desc: 'Luxury Sedans & 6-7 Seater SUVs (Innova, Ertiga, Ciaz)' },
];

export const DriverVehicle: React.FC<DriverVehicleProps> = ({ driver, onUpdate }) => {
  const currentVehicle = driver?.vehicle;

  const [isEditing, setIsEditing] = useState(!currentVehicle);
  const [vehicleType, setVehicleType] = useState<VehicleType>('comfort');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('White');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [seatingCapacity, setSeatingCapacity] = useState<number>(4);
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [pucExpiry, setPucExpiry] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentVehicle) {
      setVehicleType(currentVehicle.vehicle_type || 'comfort');
      setMake(currentVehicle.make || '');
      setModel(currentVehicle.model || '');
      setColor(currentVehicle.color || 'White');
      setRegistrationNumber(currentVehicle.registration_number || '');
      setYear(currentVehicle.year || new Date().getFullYear());
      setSeatingCapacity(currentVehicle.seating_capacity || 4);
      setInsuranceNumber(currentVehicle.insurance_policy_number || '');
      setInsuranceExpiry(currentVehicle.insurance_expiry || '');
      setPucExpiry(currentVehicle.puc_expiry || '');
    }
  }, [currentVehicle]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!make.trim()) newErrors.make = 'Vehicle manufacturer make is required.';
    if (!model.trim()) newErrors.model = 'Vehicle model is required.';
    if (!registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required.';
    } else if (registrationNumber.trim().length < 4) {
      newErrors.registrationNumber = 'Enter a valid registration number.';
    }
    if (!color.trim()) newErrors.color = 'Vehicle color is required.';
    if (year < 1990 || year > 2050) newErrors.year = 'Enter a valid year of manufacture.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        vehicleType,
        make: make.trim(),
        model: model.trim(),
        color: color.trim(),
        registrationNumber: registrationNumber.trim().toUpperCase(),
        year: Number(year),
      };

      const res = await api.updateDriverVehicle(payload);
      if (res.success) {
        // Also save extended insurance & KYC vehicle progress if provided
        await api.submitDriverKyc({
          vehicleMake: make.trim(),
          vehicleModel: model.trim(),
          vehicleYear: Number(year),
          vehicleColor: color.trim(),
          registrationNumber: registrationNumber.trim().toUpperCase(),
          vehicleType,
          seatingCapacity: Number(seatingCapacity),
          insurancePolicyNumber: insuranceNumber.trim() || undefined,
          insuranceExpiry: insuranceExpiry || undefined,
          pucExpiry: pucExpiry || undefined,
        });

        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 4000);
        onUpdate();
      } else {
        setErrorMessage('Failed to update vehicle record.');
      }
    } catch (err: any) {
      console.error('Failed to update vehicle', err);
      setErrorMessage(err.message || 'Error updating vehicle information.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {saveSuccess && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Vehicle information registered and saved successfully!</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Vehicle Registered Card */}
      {currentVehicle && !isEditing ? (
        <div className="p-5 rounded-2xl border border-[#E5E5E5] bg-[#FFFFFF] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#FFF1F2] text-[#E21D2B] flex items-center justify-center font-bold">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#171717]">
                    {currentVehicle.make} {currentVehicle.model}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/20 uppercase">
                    Active Fleet
                  </span>
                </div>
                <p className="font-mono text-xs text-[#E21D2B] font-bold mt-0.5 uppercase tracking-wider">
                  {currentVehicle.registration_number}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-semibold text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Update Details</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">Category</span>
              <span className="font-bold text-[#171717] capitalize">{currentVehicle.vehicle_type}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">Exterior Color</span>
              <span className="font-bold text-[#171717]">{currentVehicle.color}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">Mfg. Year</span>
              <span className="font-bold text-[#171717]">{currentVehicle.year}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5]">
              <span className="text-[#737373] block text-[10px] uppercase font-bold">Seating</span>
              <span className="font-bold text-[#171717]">{currentVehicle.seating_capacity || 4} Passenger Capacity</span>
            </div>
          </div>

          {/* Compliance & Verification Status */}
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#E5E5E5] space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717]">Compliance & Certification Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#15803D]" />
                <div>
                  <p className="font-semibold text-[#171717]">Registration Certificate (RC)</p>
                  <p className="text-[10px] text-[#15803D] font-bold">Verified & Linked</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-[#15803D]" />
                <div>
                  <p className="font-semibold text-[#171717]">Commercial Insurance</p>
                  <p className="text-[10px] text-[#737373]">
                    {currentVehicle.insurance_expiry ? `Expires ${currentVehicle.insurance_expiry}` : 'Active on Record'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#15803D]" />
                <div>
                  <p className="font-semibold text-[#171717]">PUC Certificate</p>
                  <p className="text-[10px] text-[#737373]">
                    {currentVehicle.puc_expiry ? `Valid until ${currentVehicle.puc_expiry}` : 'Verified'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit or Add Vehicle Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E5E5]">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-[#E21D2B]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                {currentVehicle ? 'Edit Registered Vehicle Information' : 'Register Vehicle for Fleet Dispatch'}
              </h3>
            </div>
            {currentVehicle && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-[#737373] hover:text-[#171717]"
              >
                Cancel Editing
              </button>
            )}
          </div>

          {/* Vehicle Category Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#171717]">
              Service Ride Category <span className="text-[#E21D2B]">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VEHICLE_TYPES.map((type) => {
                const selected = vehicleType === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setVehicleType(type.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selected
                        ? 'border-[#E21D2B] bg-[#FFF1F2] shadow-xs'
                        : 'border-[#E5E5E5] bg-white hover:border-[#737373]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${selected ? 'text-[#E21D2B]' : 'text-[#171717]'}`}>
                        {type.label}
                      </span>
                      <input
                        type="radio"
                        checked={selected}
                        onChange={() => setVehicleType(type.id)}
                        className="text-[#E21D2B] focus:ring-[#E21D2B]"
                      />
                    </div>
                    <p className="text-[10px] text-[#737373] leading-snug">{type.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Make */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Manufacturer Make <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={make}
                onChange={(e) => {
                  setMake(e.target.value);
                  if (errors.make) setErrors({ ...errors, make: '' });
                }}
                placeholder="e.g. Maruti Suzuki, Hyundai, Toyota"
                className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                  errors.make ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
                }`}
              />
              {errors.make && <p className="text-[11px] text-red-600 mt-1">{errors.make}</p>}
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Model Name <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  if (errors.model) setErrors({ ...errors, model: '' });
                }}
                placeholder="e.g. Dzire, Aura, Innova Crysta"
                className={`w-full rounded-lg border px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                  errors.model ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
                }`}
              />
              {errors.model && <p className="text-[11px] text-red-600 mt-1">{errors.model}</p>}
            </div>

            {/* Registration Number */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Registration Number (Plate) <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => {
                  setRegistrationNumber(e.target.value.toUpperCase());
                  if (errors.registrationNumber) setErrors({ ...errors, registrationNumber: '' });
                }}
                placeholder="e.g. DL 01 AB 1234"
                className={`w-full rounded-lg border px-3 py-2 text-xs font-mono font-bold uppercase text-[#171717] bg-[#FFFFFF] focus:outline-none ${
                  errors.registrationNumber ? 'border-red-500 bg-red-50/20' : 'border-[#E5E5E5] focus:border-[#E21D2B]'
                }`}
              />
              {errors.registrationNumber && (
                <p className="text-[11px] text-red-600 mt-1">{errors.registrationNumber}</p>
              )}
            </div>

            {/* Color */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">
                Vehicle Color <span className="text-[#E21D2B]">*</span>
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. White, Silver, Black, Grey"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">Year of Manufacture</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                min={2005}
                max={2026}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>

            {/* Seating */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">Passenger Seating Capacity</label>
              <select
                value={seatingCapacity}
                onChange={(e) => setSeatingCapacity(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
              >
                <option value={4}>4 Passengers (Standard Sedan/Hatchback)</option>
                <option value={6}>6 Passengers (Ertiga / Carens)</option>
                <option value={7}>7 Passengers (Innova Crysta XL)</option>
              </select>
            </div>

            {/* Insurance Policy */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">Commercial Insurance Policy No.</label>
              <input
                type="text"
                value={insuranceNumber}
                onChange={(e) => setInsuranceNumber(e.target.value)}
                placeholder="e.g. POL-984128912"
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs font-mono text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>

            {/* Insurance Expiry */}
            <div>
              <label className="block text-xs font-semibold text-[#171717] mb-1">Insurance Expiry Date</label>
              <input
                type="date"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                className="w-full rounded-lg border border-[#E5E5E5] px-3 py-2 text-xs text-[#171717] bg-[#FFFFFF] focus:border-[#E21D2B] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
            {currentVehicle ? (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#737373] hover:bg-[#FAFAFA]"
              >
                Cancel
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#E21D2B] text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#BE1622] transition-colors shadow-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Vehicle Information'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
