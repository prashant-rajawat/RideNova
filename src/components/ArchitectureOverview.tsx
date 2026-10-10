import React from 'react';
import { Layers, ShieldCheck, Database, Smartphone, Globe, Lock, Cpu } from 'lucide-react';

export const ArchitectureOverview: React.FC = () => {
  return (
    <div className="rounded-xl border border-[#1E334D] bg-[#0F1C2E] p-6 shadow-sm">
      <div className="pb-6 border-b border-[#1E334D]">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#00C2FF]" />
          <h2 className="text-xl font-bold tracking-tight text-[#E5F2FF]">
            Architecture & Separation of Concerns
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#8FA6BF]">
          Multi-tier architecture enforcing zero client-side database credentials and clean layer boundaries.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier 1: Frontend Client */}
        <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
              <span className="text-xs font-bold text-[#00C2FF] uppercase tracking-wider">Tier 1: Client</span>
              <Smartphone className="h-4 w-4 text-[#8FA6BF]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#E5F2FF]">Presentation Layer</h3>
            <p className="mt-1.5 text-xs text-[#8FA6BF] leading-relaxed">
              Responsive Next.js / Vite SPA with Tailwind CSS. Communicates strictly via parameterized REST API calls.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Framework:</span>
                <span className="text-[#E5F2FF] font-medium">React 19 / TypeScript</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Styling:</span>
                <span className="text-[#E5F2FF] font-medium">Tailwind CSS (Theme tokens)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Auth Client:</span>
                <span className="text-[#E5F2FF] font-medium">Clerk SDK (Step 2)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#8FA6BF]">Direct DB Access:</span>
                <span className="text-[#EF4444] font-semibold">Strictly Prohibited</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#1E334D] text-[11px] text-[#8FA6BF]">
            All user sessions and tokens forwarded via Authorization headers.
          </div>
        </div>

        {/* Tier 2: Backend REST Engine */}
        <div className="rounded-lg border border-[#00C2FF]/30 bg-[#07111F] p-5 flex flex-col justify-between ring-1 ring-[#00C2FF]/10">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
              <span className="text-xs font-bold text-[#00C2FF] uppercase tracking-wider">Tier 2: Backend</span>
              <Cpu className="h-4 w-4 text-[#00C2FF]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#E5F2FF]">REST API & Domain Logic</h3>
            <p className="mt-1.5 text-xs text-[#8FA6BF] leading-relaxed">
              Express.js backend with strict TypeScript, rate limiting, request logging, and centralized error handling.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Runtime:</span>
                <span className="text-[#E5F2FF] font-medium">Node.js / Express</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Architecture:</span>
                <span className="text-[#E5F2FF] font-medium">Controller → Service → Repo</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Security:</span>
                <span className="text-[#22C55E] font-medium">Helmet + CORS + Sanitization</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#8FA6BF]">Rate Limiting:</span>
                <span className="text-[#E5F2FF] font-medium">120 req/min per IP</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#1E334D] text-[11px] text-[#00C2FF]">
            Parameterized SQL queries only. Zero string concatenation.
          </div>
        </div>

        {/* Tier 3: Persistence Layer */}
        <div className="rounded-lg border border-[#1E334D] bg-[#07111F] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E334D]">
              <span className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wider">Tier 3: Database</span>
              <Database className="h-4 w-4 text-[#8FA6BF]" />
            </div>
            <h3 className="mt-3 text-base font-bold text-[#E5F2FF]">Supabase PostgreSQL</h3>
            <p className="mt-1.5 text-xs text-[#8FA6BF] leading-relaxed">
              Relational PostgreSQL instance with UUID primary keys, foreign keys, lifecycle constraints, and indexes.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Core Tables:</span>
                <span className="text-[#E5F2FF] font-medium">11 tables in 001_initial</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Primary Keys:</span>
                <span className="text-[#E5F2FF] font-medium">UUID (gen_random_uuid)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1E334D]/50">
                <span className="text-[#8FA6BF]">Indexes Enforced:</span>
                <span className="text-[#22C55E] font-medium">13+ targeted B-tree indexes</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#8FA6BF]">Migration Strategy:</span>
                <span className="text-[#E5F2FF] font-medium">Versioned & Non-destructive</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#1E334D] text-[11px] text-[#8FA6BF]">
            Connection pool with SSL enabled for Supabase endpoints.
          </div>
        </div>
      </div>

      {/* Security Banner */}
      <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-[#1E334D] bg-[#07111F] p-4 text-xs text-[#8FA6BF]">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[#22C55E] shrink-0" />
          <span>
            <strong className="text-[#E5F2FF]">Security Rule Enforced:</strong> Database connection strings, Supabase service keys, Stripe secrets, and Clerk secret keys remain exclusively on the Node.js backend.
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#00C2FF] shrink-0">
          <Lock className="h-3 w-3" />
          Backend Proxy Architecture
        </div>
      </div>
    </div>
  );
};
