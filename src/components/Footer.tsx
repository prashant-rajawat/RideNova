import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#E5E5E5] bg-[#FFFFFF] py-12 text-[#737373]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-[#E5E5E5]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#171717]">RideNova</span>
              <span className="text-xs text-[#737373]">·</span>
              <span className="text-xs text-[#E21D2B] font-medium">Architecture Phase 1</span>
            </div>
            <p className="mt-1 text-sm text-[#737373]">
              Your ride. Your route. Your time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#737373]">
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

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#737373]">
          <p>© {new Date().getFullYear()} RideNova Platform. Core architectural foundation.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#737373]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]"></span>
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
