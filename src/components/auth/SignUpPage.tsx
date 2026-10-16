import React, { useState } from 'react';
import { UserPlus, Shield, AlertCircle, Car, User } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

interface SignUpPageProps {
  onNavigate: (route: string) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const { devSimulateLogin } = useAuthSession();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'driver'>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const backendRole: UserRole = selectedRole === 'driver' ? 'driver' : 'rider';
      await devSimulateLogin(backendRole, name, email);

      if (backendRole === 'driver') {
        onNavigate('driver');
      } else {
        onNavigate('rider');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E21D2B] text-[#FFFFFF] font-black text-xl shadow-md">
            RN
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#171717]">
            Create your RideNova account
          </h1>
          <p className="mt-1.5 text-xs text-[#737373]">
            Choose your account type to get started.
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Account Type Selector Options */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedRole('customer')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-xs font-semibold ${
              selectedRole === 'customer'
                ? 'border-[#E21D2B] bg-[#FFF1F2] text-[#E21D2B] shadow-2xs'
                : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#171717]'
            }`}
          >
            <User className="h-5 w-5 mb-1.5" />
            <span>Customer</span>
            <span className="text-[10px] font-normal text-[#737373]">Book rides & track trips</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('driver')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-xs font-semibold ${
              selectedRole === 'driver'
                ? 'border-[#E21D2B] bg-[#FFF1F2] text-[#E21D2B] shadow-2xs'
                : 'border-[#E5E5E5] bg-white text-[#737373] hover:border-[#171717]'
            }`}
          >
            <Car className="h-5 w-5 mb-1.5" />
            <span>Driver</span>
            <span className="text-[10px] font-normal text-[#737373]">Accept rides & earn</span>
          </button>
        </div>

        {selectedRole === 'driver' && (
          <div className="mt-4 rounded-lg border border-[#B45309]/30 bg-[#FFFBEB] p-3 text-xs text-[#B45309]">
            <span className="font-semibold block mb-0.5">Driver Onboarding Notice</span>
            New driver accounts require vehicle verification and approval before receiving live ride requests.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E21D2B] py-2.5 px-4 text-xs font-semibold text-[#FFFFFF] shadow-md shadow-[#E21D2B]/20 hover:bg-[#E21D2B]/90 transition-all disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            <span>
              {loading
                ? 'Creating Account...'
                : selectedRole === 'driver'
                ? 'Sign Up as Driver'
                : 'Sign Up as Customer'}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#737373]">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('sign-in')}
            className="font-semibold text-[#E21D2B] hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
