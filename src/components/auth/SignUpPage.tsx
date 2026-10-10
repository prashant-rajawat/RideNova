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
      <div className="w-full max-w-md rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-8 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00C2FF] to-[#0EA5E9] text-[#07111F] font-black text-xl shadow-md">
            RN
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#E5F2FF]">
            Create your RideNova account
          </h1>
          <p className="mt-1.5 text-xs text-[#8FA6BF]">
            Your ride. Your route. Your time.
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 text-xs text-[#EF4444]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Security Notice */}
        <div className="mt-5 rounded-lg border border-[#1E334D] bg-[#07111F] p-3 text-xs">
          <div className="flex items-center gap-2 text-[#00C2FF] font-semibold">
            <Shield className="h-4 w-4" />
            <span>Role Assignment Security</span>
          </div>
          <p className="mt-1 text-[11px] text-[#8FA6BF] leading-relaxed">
            All newly registered accounts are automatically provisioned with the safe default role: <strong className="text-[#E5F2FF]">Rider</strong>. Driver onboarding occurs through verified verification workflows.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] placeholder-[#8FA6BF]/60 focus:border-[#00C2FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] placeholder-[#8FA6BF]/60 focus:border-[#00C2FF] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8FA6BF] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-[#1E334D] bg-[#07111F] px-3.5 py-2.5 text-xs text-[#E5F2FF] placeholder-[#8FA6BF]/60 focus:border-[#00C2FF] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#00C2FF] py-2.5 px-4 text-xs font-semibold text-[#07111F] shadow-md shadow-[#00C2FF]/20 hover:bg-[#00C2FF]/90 transition-all disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            <span>{loading ? 'Creating Account...' : 'Sign Up as Rider'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#8FA6BF]">
          Already have an account?{' '}
          <button
            onClick={() => onNavigate('sign-in')}
            className="font-semibold text-[#00C2FF] hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
