import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ServiceAreaAlert: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="rounded-xl border border-[#E21D2B]/30 bg-[#FFF1F2] p-4 shadow-sm flex items-start gap-3">
      <div className="h-8 w-8 rounded-full bg-[#E21D2B]/10 flex items-center justify-center shrink-0">
        <AlertCircle className="h-5 w-5 text-[#E21D2B]" />
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-black text-[#171717]">Location outside service area</h4>
        <p className="text-xs text-[#737373] leading-relaxed">
          {message}
        </p>
        <p className="text-xs font-semibold text-[#E21D2B]">
          Please choose another location within our service area.
        </p>
      </div>
    </div>
  );
};
