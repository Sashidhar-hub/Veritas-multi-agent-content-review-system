import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: 'indigo' | 'teal' | 'warning' | 'navy' | 'error';
  trend?: string;
}

const ACCENT_MAP = {
  indigo: 'bg-[#635BFF]/10 text-[#635BFF]',
  teal: 'bg-[#18BFA0]/10 text-[#18BFA0]',
  warning: 'bg-[#F59E0B]/10 text-[#D97706]',
  navy: 'bg-[#10182B]/8 text-[#10182B]',
  error: 'bg-[#EF4444]/10 text-[#EF4444]',
};

export function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  accentColor = 'indigo',
  trend,
}: SummaryCardProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] hover:shadow-[0_4px_12px_rgba(16,24,43,0.06)] transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-2xl font-semibold tracking-tight text-[#182238]">
              {value}
            </span>
            {trend && (
              <span className="text-xs font-medium text-[#18BFA0]">{trend}</span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-[#64748B]">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${ACCENT_MAP[accentColor]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
