import {
  AgentStatus,
  ClaimVerificationStatus,
  DocumentProcessingStatus,
  ReviewOverallStatus,
} from '../types/veritas';

type AnyStatus =
  | ReviewOverallStatus
  | AgentStatus
  | ClaimVerificationStatus
  | DocumentProcessingStatus
  | 'Human Approved & Verified';

const STYLE_MAP: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  // Teal / Success
  Completed: {
    bg: 'bg-[#18BFA0]/10',
    text: 'text-[#0E8A73]',
    dot: 'bg-[#18BFA0]',
    border: 'border-[#18BFA0]/25',
  },
  Approved: {
    bg: 'bg-[#18BFA0]/10',
    text: 'text-[#0E8A73]',
    dot: 'bg-[#18BFA0]',
    border: 'border-[#18BFA0]/25',
  },
  Supported: {
    bg: 'bg-[#18BFA0]/10',
    text: 'text-[#0E8A73]',
    dot: 'bg-[#18BFA0]',
    border: 'border-[#18BFA0]/25',
  },
  Ready: {
    bg: 'bg-[#18BFA0]/10',
    text: 'text-[#0E8A73]',
    dot: 'bg-[#18BFA0]',
    border: 'border-[#18BFA0]/25',
  },
  'Human Approved & Verified': {
    bg: 'bg-[#18BFA0]/10',
    text: 'text-[#0E8A73]',
    dot: 'bg-[#18BFA0]',
    border: 'border-[#18BFA0]/25',
  },

  // Indigo / Running
  Running: {
    bg: 'bg-[#635BFF]/10',
    text: 'text-[#4B44D6]',
    dot: 'bg-[#635BFF] animate-pulse',
    border: 'border-[#635BFF]/25',
  },
  Processing: {
    bg: 'bg-[#635BFF]/10',
    text: 'text-[#4B44D6]',
    dot: 'bg-[#635BFF] animate-pulse',
    border: 'border-[#635BFF]/25',
  },
  Indexed: {
    bg: 'bg-[#635BFF]/10',
    text: 'text-[#4B44D6]',
    dot: 'bg-[#635BFF]',
    border: 'border-[#635BFF]/25',
  },

  // Warning / Pending Approval
  'Awaiting Approval': {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    border: 'border-[#F59E0B]/30',
  },
  'Changes Requested': {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    border: 'border-[#F59E0B]/30',
  },
  'Insufficient Evidence': {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    border: 'border-[#F59E0B]/30',
  },
  'Text Extracted': {
    bg: 'bg-[#F59E0B]/10',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    border: 'border-[#F59E0B]/30',
  },

  // Error / Rejected / Contradicted
  Failed: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    dot: 'bg-[#EF4444]',
    border: 'border-[#EF4444]/25',
  },
  Rejected: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    dot: 'bg-[#EF4444]',
    border: 'border-[#EF4444]/25',
  },
  Contradicted: {
    bg: 'bg-[#EF4444]/10',
    text: 'text-[#DC2626]',
    dot: 'bg-[#EF4444]',
    border: 'border-[#EF4444]/25',
  },

  // Neutral / Pending / Draft
  Pending: {
    bg: 'bg-slate-100',
    text: 'text-[#64748B]',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
  Draft: {
    bg: 'bg-slate-100',
    text: 'text-[#64748B]',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
  Uploaded: {
    bg: 'bg-slate-100',
    text: 'text-[#64748B]',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const style = STYLE_MAP[status] || STYLE_MAP.Pending;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
