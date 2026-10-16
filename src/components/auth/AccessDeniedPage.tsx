import React from 'react';
import { ShieldAlert, ArrowRight, Home } from 'lucide-react';
import { useAuthSession } from '../../context/AuthContext.tsx';

interface AccessDeniedPageProps {
  attemptedRole: string;
  onNavigate: (route: string) => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ attemptedRole, onNavigate }) => {
  const { user } = useAuthSession();

  const getAuthorizedRoute = () => {
    if (!user) return 'sign-in';
    if (user.role === 'driver') return 'driver';
    if (user.role === 'admin') return 'admin';
    return 'rider';
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#B91C1C]/30 bg-[#FFFFFF] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B91C1C]/10 text-[#B91C1C]">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#171717]">
          403 — Access Denied
        </h1>

        <p className="mt-2 text-xs text-[#737373] leading-relaxed">
          You attempted to access the <span className="font-mono text-[#B91C1C] uppercase font-semibold">{attemptedRole}</span> area.
          Your authenticated role is <span className="font-mono text-[#E21D2B] uppercase font-semibold">{user?.role || 'unauthenticated'}</span>.
        </p>

        <div className="mt-5 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] p-3 text-xs text-[#737373]">
          Backend security rules strictly enforce role isolation. Roles cannot be changed from the browser.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-[#E5E5E5] bg-[#FFFFFF] px-4 py-2.5 text-xs font-semibold text-[#737373] hover:text-[#171717]"
          >
            <Home className="h-4 w-4" />
            <span>RideNova Home</span>
          </button>

          <button
            onClick={() => onNavigate(getAuthorizedRoute())}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[#E21D2B] px-4 py-2.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#E21D2B]/90 transition-colors shadow-md shadow-[#E21D2B]/20"
          >
            <span>Go to My Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
