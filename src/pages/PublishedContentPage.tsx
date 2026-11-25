import { useEffect, useState } from 'react';
import {
  Search,
  Download,
  Eye,
  BookOpenCheck,
  X,
  CheckCircle2,
  Loader2,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { AcademicSubject, PublicationItem } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceCard } from '../components/EvidenceCard';

const SUBJECTS: Array<'All' | AcademicSubject> = [
  'All',
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'Environmental Science',
  'Other',
];

export function PublishedContentPage() {
  const { globalSearch, addToast } = useApp();

  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState<'All' | AcademicSubject>('All');
  const [localSearch, setLocalSearch] = useState('');
  const [selected, setSelected] = useState<PublicationItem | null>(null);

  useEffect(() => {
    veritasApi
      .listPublications()
      .then(setPublications)
      .finally(() => setLoading(false));
  }, []);

  const query = (localSearch || globalSearch).trim().toLowerCase();

  const filtered = publications.filter((p) => {
    const matchesSubject = subjectFilter === 'All' || p.subject === subjectFilter;
    const matchesQuery =
      !query ||
      p.question.toLowerCase().includes(query) ||
      p.subject.toLowerCase().includes(query) ||
      p.reviewerName.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query);
    return matchesSubject && matchesQuery;
  });

  const handleDownload = async (pub: PublicationItem) => {
    try {
      const blob = await veritasApi.getPublicationReport(pub.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pub.id}_Veritas_Verified_Report.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast({
        type: 'success',
        title: 'Report Downloaded',
        description: `Downloaded verified report for ${pub.id}.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Download failed',
        description: 'Could not generate publication report.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Published Academic Library
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Verified academic explanations that have passed multi-agent review and mandatory human approval.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search verified library..."
            className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-slate-200 bg-white text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
          />
        </div>
      </div>

      {/* Subject Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {SUBJECTS.map((subj) => (
          <button
            key={subj}
            type="button"
            onClick={() => setSubjectFilter(subj)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              subjectFilter === subj
                ? 'bg-[#10182B] text-white'
                : 'bg-white border border-slate-200 text-[#64748B] hover:text-[#182238]'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#64748B] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
          <span className="text-sm">Loading published library...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[12px] p-12 text-center space-y-2">
          <BookOpenCheck className="w-9 h-9 text-[#64748B] mx-auto opacity-60" />
          <p className="text-sm font-medium text-[#182238]">
            No published explanations match your filters
          </p>
          <p className="text-xs text-[#64748B]">
            Only human-approved submissions appear in the Published Academic Library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pub) => (
            <div
              key={pub.id}
              className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] hover:shadow-[0_6px_16px_rgba(16,24,43,0.06)] transition-shadow flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#635BFF]/10 text-[#635BFF]">
                    {pub.subject}
                  </span>
                  <StatusBadge status={pub.verifiedStatus} />
                </div>

                <h3 className="text-base font-semibold text-[#182238] leading-snug line-clamp-2">
                  {pub.question}
                </h3>

                <p className="text-xs text-[#64748B] line-clamp-3 leading-relaxed">
                  {pub.finalExplanation}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#18BFA0]" />
                    {pub.reviewerName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(pub.publishedAt).toLocaleDateString()} • v{pub.version}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(pub)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] bg-[#10182B] hover:bg-[#1E293B] text-white text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(pub)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[9px] border border-slate-200 hover:border-[#635BFF] hover:text-[#635BFF] text-xs font-medium text-[#182238] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publication Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10182B]/50 backdrop-blur-[2px] p-4">
          <div className="bg-white border border-slate-200 rounded-[14px] shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#10182B] text-white">
                  {selected.id}
                </span>
                <StatusBadge status={selected.verifiedStatus} />
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 text-slate-400 hover:text-[#182238] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <p className="text-xs font-medium text-[#635BFF]">
                  {selected.subject} • {selected.level} • Version v{selected.version}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[#182238]">
                  {selected.question}
                </h2>
              </div>

              <div className="bg-[#18BFA0]/[0.05] border border-[#18BFA0]/25 rounded-[10px] p-4 space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0E8A73] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Final Approved Explanation
                </p>
                <p className="text-sm text-[#182238] leading-relaxed">
                  {selected.finalExplanation}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F4F6FB] rounded-[10px] p-4">
                <div>
                  <span className="text-[#64748B]">Approved By:</span>{' '}
                  <span className="font-semibold text-[#182238]">
                    {selected.reviewerName}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Approval Timestamp:</span>{' '}
                  <span className="font-semibold text-[#182238]">
                    {new Date(selected.approvedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Author:</span>{' '}
                  <span className="font-medium text-[#182238]">{selected.authorName}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">Source Review ID:</span>{' '}
                  <span className="font-mono text-[#182238]">{selected.reviewId}</span>
                </div>
              </div>

              {selected.correctionNotes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Correction Notes
                  </h4>
                  <div className="space-y-2">
                    {selected.correctionNotes.map((n) => (
                      <div
                        key={n.id}
                        className="border border-slate-200 rounded-[10px] p-3 text-xs space-y-1"
                      >
                        <p className="font-semibold text-[#182238]">{n.identifiedIssue}</p>
                        <p className="text-[#64748B]">{n.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.supportingReferences.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Supporting References
                  </h4>
                  <div className="space-y-2">
                    {selected.supportingReferences.map((r) => (
                      <EvidenceCard key={r.id} reference={r} />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Version History
                </h4>
                <div className="space-y-1.5">
                  {selected.versionHistory.map((vh) => (
                    <div
                      key={vh.version}
                      className="flex items-center justify-between text-xs bg-[#F4F6FB] rounded-[8px] px-3 py-2"
                    >
                      <span>
                        <strong className="font-mono">v{vh.version}</strong> — {vh.note} ({vh.actor})
                      </span>
                      <span className="text-[#64748B]">
                        {new Date(vh.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleDownload(selected)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
