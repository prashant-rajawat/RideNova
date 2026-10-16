import React, { useState } from 'react';
import { UserPlus, Shield, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';

interface SignUpPageProps {
  onNavigate: (route: string) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigate }) => {
  const { devSimulateLogin } = useAuthSession();
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

    setLoading(true);
    try {
      // Create user: backend enforces DEFAULT ROLE = rider
      await devSimulateLogin('rider', name, email);
      onNavigate('rider');
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#E21D2B] to-[#E21D2B] text-[#FFFFFF] font-black text-xl shadow-md">
            RN
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#171717]">
            Create your RideNova account
          </h1>
          <p className="mt-1.5 text-xs text-[#737373]">
            Your ride. Your route. Your time.
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Security Notice */}
        <div className="mt-5 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-3 text-xs">
          <div className="flex items-center gap-2 text-[#E21D2B] font-semibold">
            <Shield className="h-4 w-4" />
            <span>Role Assignment Security</span>
          </div>
          <p className="mt-1 text-[11px] text-[#737373] leading-relaxed">
            All newly registered accounts are automatically provisioned with the safe default role: <strong className="text-[#171717]">Rider</strong>. Driver onboarding occurs through verified verification workflows.
          </p>
        </div>

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
            <span>{loading ? 'Creating Account...' : 'Sign Up as Rider'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#737373]">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('sign-in')}
            className="font-semibold text-[#E21D2B] hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
