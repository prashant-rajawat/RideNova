import React from 'react';

export const SplashScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#FFFFFF]">
    <div className="h-12 w-12 rounded-xl bg-[#E21D2B] text-white font-black text-2xl flex items-center justify-center shadow-lg">RN</div>
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E21D2B] border-t-transparent" />
    <p className="text-xs font-semibold text-[#737373]">Loading RideNova...</p>
  </div>
);
