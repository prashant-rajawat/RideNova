import React from 'react';
import { CheckCircle2, Clock, ArrowRight, Lock } from 'lucide-react';

export const RoadmapCard: React.FC = () => {
  const steps = [
    {
      step: 'Step 1',
      title: 'Foundation, Architecture & Database Schema',
      status: 'Completed',
      active: true,
      items: [
        'Full-stack Express + Next.js architecture setup',
        'Supabase PostgreSQL 11-table schema & migration',
        'Centralized error handling, logging & rate limiter',
        'GET /api/health & GET /api/health/db endpoints',
        'Environment variable configuration specifications',
      ],
    },
    {
      step: 'Step 2',
      title: 'Authentication & Profile Management (Clerk)',
      status: 'Planned Next',
      active: false,
      items: [
        'Clerk Auth integration (Rider, Driver, Admin)',
        'User sync webhooks & driver status onboarding',
        'Role-based middleware guards & JWT validation',
      ],
    },
    {
      step: 'Step 3',
      title: 'Maps & Route Engine (Google Maps Platform)',
      status: 'Completed',
      active: false,
      items: [
        'Google Maps Autocomplete, Geocoding & Directions',
        'Multi-stop ride distance & duration calculations',
        'Dynamic fare estimation engine per vehicle tier',
      ],
    },
    {
      step: 'Step 4',
      title: 'Driver Dashboard & Secure Assignment',
      status: 'Completed',
      active: true,
      items: [
        'Online/offline driver availability toggle & vehicle registration',
        'Available ride requests queue with earnings estimates',
        'Atomic race-condition safe driver assignment & lifecycle states',
      ],
    },
    {
      step: 'Step 5',
      title: 'Payments & Driver Payouts (Stripe)',
      status: 'Planned',
      active: false,
      items: [
        'Stripe Payment Intents & webhooks',
        'Driver earnings calculations & platform fee split',
        'Promo code discount validation engine',
      ],
    },
    {
      step: 'Step 6',
      title: 'Realtime, SOS, Reviews & Support Desk',
      status: 'Planned',
      active: false,
      items: [
        'Supabase Realtime driver location broadcasting',
        'In-ride SOS emergency alert workflow',
        '1-5 star driver reviews & support ticket handling',
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-[#FFFFFF] p-6 shadow-sm">
      <div className="pb-6 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#E21D2B]" />
          <h2 className="text-xl font-bold tracking-tight text-[#171717]">
            Step-by-Step Implementation Roadmap
          </h2>
        </div>
        <p className="mt-1 text-xs text-[#737373]">
          Strict phase control in accordance with prompt guidelines. Step 1 locks the foundation before introducing transactional features.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((s, idx) => (
          <div
            key={s.step}
            className={`rounded-lg border p-5 flex flex-col justify-between transition-all ${
              s.active
                ? 'border-[#E21D2B] bg-[#FFFFFF] shadow-sm shadow-[#E21D2B]/10'
                : 'border-[#E5E5E5] bg-[#FFFFFF]/60 opacity-80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]/60">
                <span className={`text-xs font-mono font-bold ${s.active ? 'text-[#E21D2B]' : 'text-[#737373]'}`}>
                  {s.step}
                </span>

                {s.active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#15803D]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#737373]">
                    <Lock className="h-3 w-3" />
                    Locked for Step 1
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-sm font-bold text-[#171717]">{s.title}</h3>

              <ul className="mt-3 space-y-1.5 text-xs text-[#737373]">
                {s.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-1.5">
                    <span className="text-[#E21D2B] font-bold">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E5E5]/60 flex items-center justify-between text-[11px]">
              <span className="text-[#737373]">{idx === 0 ? 'Ready for review' : 'Awaiting confirmation'}</span>
              {s.active && (
                <span className="font-semibold text-[#E21D2B] flex items-center gap-1">
                  Active Baseline <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
