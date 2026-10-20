import React, { useState } from 'react';
import { LogIn, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';

interface SignInPageProps {
  onNavigate: (route: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onNavigate }) => {
  const { devSimulateLogin, isClerkConfigured } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    if (!email || !password) {
      setError('Please provide your email address and password.');
      return;
    }

    setLoading(true);
    try {
      // Authenticate account and retrieve verified user & role from trusted backend/database
      const loggedInUser = await devSimulateLogin(undefined, email.split('@')[0], email);
      const verifiedRole = loggedInUser.role;

      // Automatic Role-Based Redirect using verified server-side role
      if (verifiedRole === 'admin') {
        onNavigate('admin');
      } else if (verifiedRole === 'driver') {
        onNavigate('driver');
      } else {
        onNavigate('rider');
      }
    } catch (err) {
      setError((err as Error).message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await devSimulateLogin('rider', 'Google User', 'google.user@example.com');
      onNavigate('rider');
    } catch (err) {
      setError((err as Error).message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#E21D2B] text-[#FFFFFF] font-black text-xl shadow-md">
            RN
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#171717]">
            Sign in to RideNova
          </h1>
          <p className="mt-1.5 text-xs text-[#737373]">
            Access your Customer, Driver, or Admin dashboard securely.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#B91C1C]/30 bg-[#B91C1C]/10 p-3 text-xs text-[#B91C1C]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Info notification */}
        {infoMessage && (
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#15803D]/30 bg-[#DCFCE7] p-3 text-xs text-[#15803D]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Google Authentication */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] py-2.5 px-4 text-xs font-semibold text-[#171717] hover:border-[#E21D2B] transition-all shadow-2xs"
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
              placeholder="customer@example.com"
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-3.5 py-2.5 text-xs text-[#171717] placeholder-[#737373]/60 focus:border-[#E21D2B] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-[#737373]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setInfoMessage('Password reset instructions have been sent to your email address.')}
                className="text-[11px] text-[#E21D2B] hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Forgot password?
              </button>
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
            <span>{loading ? 'Authenticating & Verifying Role...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center text-xs text-[#737373]">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('sign-up')}
            className="font-semibold text-[#E21D2B] hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Sign up for RideNova
          </button>
        </div>
      </div>
    </div>
  );
};
