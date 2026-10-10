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
      <div className="w-full max-w-md rounded-xl border border-[#EF4444]/30 bg-[#0F1C2E] p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EF4444]/10 text-[#EF4444]">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#E5F2FF]">
          403 — Access Denied
        </h1>

        <p className="mt-2 text-xs text-[#8FA6BF] leading-relaxed">
          You attempted to access the <span className="font-mono text-[#EF4444] uppercase font-semibold">{attemptedRole}</span> area.
          Your authenticated role is <span className="font-mono text-[#00C2FF] uppercase font-semibold">{user?.role || 'unauthenticated'}</span>.
        </p>

        <div className="mt-5 rounded-lg border border-[#1E334D] bg-[#07111F] p-3 text-xs text-[#8FA6BF]">
          Backend security rules strictly enforce role isolation. Roles cannot be changed from the browser.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-[#1E334D] bg-[#07111F] px-4 py-2.5 text-xs font-semibold text-[#8FA6BF] hover:text-[#E5F2FF]"
          >
            <Home className="h-4 w-4" />
            <span>RideNova Home</span>
          </button>

          <button
            onClick={() => onNavigate(getAuthorizedRoute())}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-[#00C2FF] px-4 py-2.5 text-xs font-semibold text-[#07111F] hover:bg-[#00C2FF]/90 transition-colors shadow-md shadow-[#00C2FF]/20"
          >
            <span>Go to My Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
