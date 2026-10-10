import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#1E334D] bg-[#07111F] py-12 text-[#8FA6BF]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#1E334D]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#E5F2FF]">RideNova</span>
              <span className="text-xs text-[#8FA6BF]">·</span>
              <span className="text-xs text-[#00C2FF] font-medium">Architecture Phase 1</span>
            </div>
            <p className="mt-1 text-sm text-[#8FA6BF]">
              Your ride. Your route. Your time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#8FA6BF]">
            <span>Next.js & Vite</span>
            <span>·</span>
            <span>Express REST API</span>
            <span>·</span>
            <span>Supabase PostgreSQL</span>
            <span>·</span>
            <span>Clerk Auth Spec</span>
            <span>·</span>
            <span>Stripe Payments Spec</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8FA6BF]">
          <p>© {new Date().getFullYear()} RideNova Platform. Core architectural foundation.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#8FA6BF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]"></span>
              Zero-Trust API Isolation
            </span>
            <span>·</span>
            <span>No Frontend Direct DB Access</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
