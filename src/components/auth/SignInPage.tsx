import React, { useState } from 'react';
import { LogIn, Shield, ArrowRight, CheckCircle2, AlertCircle, Sparkles, Key } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';
import { UserRole } from '../../types/index.ts';

interface SignInPageProps {
  onNavigate: (route: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onNavigate }) => {
  const { loginWithToken, devSimulateLogin, isClerkConfigured, clerkPublishableKey } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);
    try {
      // In dev/demo environment without live Clerk keys:
      await devSimulateLogin('rider', email.split('@')[0], email);
      onNavigate('rider');
    } catch (err) {
      setError((err as Error).message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    try {
      await devSimulateLogin(role);
      onNavigate(role);
    } catch (err) {
      setError((err as Error).message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#E21D2B] to-[#E21D2B] text-[#FFFFFF] font-black text-xl shadow-md">
            RN
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#171717]">
            Sign in to RideNova
          </h1>
          <p className="mt-1.5 text-xs text-[#737373]">
            Your ride. Your route. Your time.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Clerk configuration status notice */}
        <div className="mt-5 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#737373] flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-[#E21D2B]" />
              Clerk Auth Status
            </span>
            <span className={`font-medium ${isClerkConfigured ? 'text-[#15803D]' : 'text-[#B45309]'}`}>
              {isClerkConfigured ? 'Live Clerk SDK Active' : 'Dev Simulation Mode'}
            </span>
          </div>
          {!isClerkConfigured && (
            <p className="mt-1 text-[11px] text-[#737373] leading-normal">
              To connect live Clerk, set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>.env</code>. Full session sync & role guards are operational in both modes.
            </p>
          )}
        </div>

        {/* Social Authentication Placeholders */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('rider')}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] py-2.5 px-4 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] hover:text-[#E21D2B] transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E5E5E5]" />
          <span className="text-[11px] text-[#737373] uppercase tracking-wider">or sign in with email</span>
          <div className="h-px flex-1 bg-[#E5E5E5]" />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#737373] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rider@example.com"
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#737373]">
                Password
              </label>
              <span className="text-[11px] text-[#E21D2B] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E21D2B] py-2.5 px-4 text-xs font-semibold text-[#FFFFFF] shadow-md shadow-[#E21D2B]/20 hover:bg-[#E21D2B]/90 transition-all disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Testing Profiles (Step 2 Testing Requirement) */}
        <div className="mt-6 pt-5 border-t border-[#E5E5E5]">
          <span className="block text-[11px] font-semibold text-[#737373] uppercase tracking-wider mb-2.5">
            Step 2 Test Authenticated Sessions:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('rider')}
              className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-2 text-center text-[11px] font-medium text-[#171717] hover:border-[#E21D2B] hover:text-[#E21D2B]"
            >
              <span className="block font-bold">Rider</span>
              <span className="text-[10px] text-[#737373]">Default</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('driver')}
              className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-2 text-center text-[11px] font-medium text-[#171717] hover:border-[#E21D2B] hover:text-[#E21D2B]"
            >
              <span className="block font-bold">Driver</span>
              <span className="text-[10px] text-[#737373]">Promoted</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-2 text-center text-[11px] font-medium text-[#171717] hover:border-[#15803D] hover:text-[#15803D]"
            >
              <span className="block font-bold">Admin</span>
              <span className="text-[10px] text-[#737373]">Staff</span>
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-[#737373]">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('sign-up')}
            className="font-semibold text-[#E21D2B] hover:underline"
          >
            Sign up for RideNova
          </button>
        </div>
      </div>
    </div>
  );
};
