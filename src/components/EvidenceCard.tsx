import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  BookOpen,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import { SupportingReference } from '../types/veritas';

export function EvidenceCard({ reference }: { reference: SupportingReference }) {
  const [expanded, setExpanded] = useState(false);

  const Icon =
    reference.sourceType === 'Academic PDF'
      ? FileText
      : reference.sourceType === 'Tavily Web Search'
      ? Globe
      : BookOpen;

  return (
    <div className="bg-white border border-slate-200/80 rounded-[12px] overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-[8px] bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#182238] truncate">
              {reference.sourceTitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-[#64748B]">
              <span className="font-medium text-[#10182B]">{reference.sourceType}</span>
              {reference.pageNumber !== undefined && (
                <span>• Page {reference.pageNumber}</span>
              )}
              <span className="inline-flex items-center gap-1">
                • <Calendar className="w-3 h-3" />
                {new Date(reference.retrievalDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {reference.relevanceScore !== undefined && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#18BFA0]/10 text-[#0E8A73]">
              {Math.round(reference.relevanceScore * 100)}% match
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[#64748B]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#64748B]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-[#F4F6FB]/50 space-y-2.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] mb-1">
              Relevant Passage
            </p>
            <blockquote className="text-sm text-[#182238] bg-white border border-slate-200/80 rounded-[8px] p-3 leading-relaxed">
              “{reference.relevantPassage}”
            </blockquote>
          </div>
          {reference.sourceUrl && (
            <a
              href={reference.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#635BFF] hover:underline"
            >
              Open Source URL <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
