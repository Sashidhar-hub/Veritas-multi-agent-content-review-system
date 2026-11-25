import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  ArrowLeft,
  UserCheck,
  Loader2,
  Columns2,
} from 'lucide-react';
import { AcademicReview } from '../types/veritas';
import { veritasApi } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceCard } from '../components/EvidenceCard';

function highlightText(
  text: string,
  highlights: Array<{ original: string; corrected: string }>
) {
  if (!highlights.length) return <span>{text}</span>;

  let parts: Array<{ text: string; highlighted: boolean }> = [{ text, highlighted: false }];

  for (const h of highlights) {
    if (!h.corrected) continue;
    const nextParts: Array<{ text: string; highlighted: boolean }> = [];
    for (const part of parts) {
      if (part.highlighted) {
        nextParts.push(part);
        continue;
      }
      const idx = part.text.indexOf(h.corrected);
      if (idx === -1) {
        nextParts.push(part);
      } else {
        if (idx > 0) {
          nextParts.push({ text: part.text.slice(0, idx), highlighted: false });
        }
        nextParts.push({
          text: part.text.slice(idx, idx + h.corrected.length),
          highlighted: true,
        });
        if (idx + h.corrected.length < part.text.length) {
          nextParts.push({
            text: part.text.slice(idx + h.corrected.length),
            highlighted: false,
          });
        }
      }
    }
    parts = nextParts;
  }

  return (
    <>
      {parts.map((p, i) =>
        p.highlighted ? (
          <mark
            key={i}
            className="bg-[#18BFA0]/18 text-[#0E8A73] px-1 py-0.5 rounded font-medium"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

export function ReviewResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<AcademicReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    veritasApi
      .getReview(id)
      .then((data) => {
        setReview(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load review results.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#64748B] gap-2.5">
        <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
        <span className="text-sm font-medium">Loading verification results...</span>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="bg-white border border-[#EF4444]/30 rounded-[12px] p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-[#EF4444]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Results Unavailable</p>
            <p className="text-xs text-[#64748B]">{error || 'Review not found.'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/history')}
          className="px-3.5 py-2 rounded-[10px] bg-[#10182B] text-white text-xs font-medium"
        >
          Back to History
        </button>
      </div>
    );
  }

  const results = review.results;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#182238]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-[8px] bg-[#10182B] text-white">
              {review.id}
            </span>
            <span className="text-xs text-[#64748B]">
              {review.subject} • {review.level} • v{review.version}
            </span>
            <StatusBadge status={review.status} />
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#182238]">
            Academic Review Results
          </h1>
          <p className="text-sm text-[#64748B]">{review.question}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/reviews/${review.id}/workflow`)}
            className="px-3.5 py-2 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#182238]"
          >
            View Workflow
          </button>
          {review.status === 'Awaiting Approval' && (
            <button
              type="button"
              onClick={() => navigate(`/reviewer?reviewId=${review.id}`)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-xs font-medium"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Review & Approve
            </button>
          )}
        </div>
      </div>

      {!results ? (
        <div className="bg-white border border-slate-200 rounded-[12px] p-8 text-center">
          <p className="text-sm font-medium text-[#182238]">
            Verification results are not generated yet.
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Current status: {review.status}. Open the workflow page to monitor agent execution.
          </p>
        </div>
      ) : (
        <>
          {/* A. REVIEW SUMMARY */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-[12px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Total Claims
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#182238]">
                {results.summary.totalClaims}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-[12px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0E8A73] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Supported
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#0E8A73]">
                {results.summary.supportedClaims}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-[12px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#DC2626] flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Contradicted
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#DC2626]">
                {results.summary.contradictedClaims}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-[12px] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B45309] flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Insufficient
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#B45309]">
                {results.summary.insufficientEvidenceClaims}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-[12px] p-4 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#635BFF] flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" /> Missing Concepts
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-[#635BFF]">
                {results.summary.detectedMissingConcepts}
              </p>
            </div>
          </section>

          {/* B & E. SIDE-BY-SIDE ORIGINAL AND CORRECTED COMPARISON */}
          <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Columns2 className="w-4 h-4 text-[#635BFF]" />
              <h2 className="text-sm font-semibold text-[#182238]">
                Side-by-Side Comparison: Original vs. Corrected Explanation
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* B. Student Answers */}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Student Answers (Submitted)
                  </span>
                  <span className="text-[11px] text-[#64748B]">By {review.authorName}</span>
                </div>
                <p className="text-sm text-[#182238] leading-relaxed bg-[#F4F6FB] border border-slate-200/70 rounded-[10px] p-4">
                  {review.draftExplanation.trim() || (
                    <span className="text-[#64748B] italic">
                      No student answer was submitted.
                    </span>
                  )}
                </p>
              </div>

              {/* E. Corrected Explanation */}
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#0E8A73]">
                    Corrected Explanation (AI-Verified)
                  </span>
                  <span className="text-[11px] text-[#0E8A73] font-medium">
                    Changed statements highlighted
                  </span>
                </div>
                <p className="text-sm text-[#182238] leading-relaxed bg-[#18BFA0]/[0.04] border border-[#18BFA0]/25 rounded-[10px] p-4">
                  {results.correctedExplanation.trim() ? (
                    highlightText(results.correctedExplanation, results.highlightedChanges)
                  ) : (
                    <span className="text-[#64748B] italic">
                      No corrected answer generated because no student answer was submitted for verification.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* C. CLAIM-LEVEL VERIFICATION */}
          <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-[#182238]">
                Claim-Level Verification
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Each atomic claim extracted from the student answer compared against retrieved academic evidence
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {results.claims.length === 0 ? (
                <p className="p-5 text-xs text-[#64748B]">
                  No claims to verify — submit a student answer to run claim-level verification.
                </p>
              ) : (
                results.claims.map((claim, idx) => (
                <div key={claim.id} className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-semibold text-[#64748B]">
                        CLAIM #{idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-[#182238]">
                        “{claim.claimText}”
                      </p>
                    </div>
                    <StatusBadge status={claim.status} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F4F6FB] rounded-[10px] p-3">
                      <p className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px] mb-1">
                        Verification Explanation
                      </p>
                      <p className="text-[#182238] leading-relaxed">{claim.explanation}</p>
                    </div>
                    <div className="bg-[#F4F6FB] rounded-[10px] p-3">
                      <p className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px] mb-1">
                        Supporting Evidence & Citation
                      </p>
                      <p className="text-[#182238] leading-relaxed">{claim.supportingEvidence}</p>
                      <p className="mt-1.5 font-medium text-[#635BFF]">{claim.citation}</p>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </section>

          {/* D. DETECTED ERRORS */}
          <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
            <h2 className="text-sm font-semibold text-[#182238]">Detected Errors & Gaps</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[10px] border border-[#EF4444]/20 bg-[#EF4444]/[0.03] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#DC2626] mb-2">
                  Incorrect Scientific Facts ({results.detectedErrors.incorrectFacts.length})
                </h3>
                {results.detectedErrors.incorrectFacts.length === 0 ? (
                  <p className="text-xs text-[#64748B]">None detected.</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#182238]">
                    {results.detectedErrors.incorrectFacts.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-[10px] border border-[#F59E0B]/25 bg-[#F59E0B]/[0.04] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B45309] mb-2">
                  Unsupported Statements ({results.detectedErrors.unsupportedStatements.length})
                </h3>
                {results.detectedErrors.unsupportedStatements.length === 0 ? (
                  <p className="text-xs text-[#64748B]">None detected.</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#182238]">
                    {results.detectedErrors.unsupportedStatements.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-[10px] border border-[#635BFF]/20 bg-[#635BFF]/[0.03] p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#4B44D6] mb-2">
                  Missing Concepts ({results.detectedErrors.missingConcepts.length})
                </h3>
                {results.detectedErrors.missingConcepts.length === 0 ? (
                  <p className="text-xs text-[#64748B]">None detected.</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#182238]">
                    {results.detectedErrors.missingConcepts.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-[10px] border border-slate-200 bg-[#F4F6FB]/70 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Grammar & Clarity Issues ({results.detectedErrors.grammarAndClarity.length})
                </h3>
                {results.detectedErrors.grammarAndClarity.length === 0 ? (
                  <p className="text-xs text-[#64748B]">None detected.</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1.5 text-xs text-[#182238]">
                    {results.detectedErrors.grammarAndClarity.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* F. CORRECTION NOTES */}
          <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-[#182238]">Correction Notes</h2>
            </div>
            {results.correctionNotes.length === 0 ? (
              <p className="p-5 text-xs text-[#64748B]">
                No statement-level corrections were required.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-[#F4F6FB]/70 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="py-3 px-4">Original Statement</th>
                      <th className="py-3 px-4">Identified Issue</th>
                      <th className="py-3 px-4">Corrected Statement</th>
                      <th className="py-3 px-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {results.correctionNotes.map((note) => (
                      <tr key={note.id} className="align-top">
                        <td className="py-3.5 px-4 text-[#DC2626] bg-[#EF4444]/[0.02] max-w-xs">
                          {note.originalStatement}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#182238]">
                          {note.identifiedIssue}
                        </td>
                        <td className="py-3.5 px-4 text-[#0E8A73] bg-[#18BFA0]/[0.02] max-w-xs">
                          {note.correctedStatement}
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B] max-w-xs">
                          {note.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* G. SUPPORTING REFERENCES */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[#182238]">
              Supporting References ({results.supportingReferences.length})
            </h2>
            {results.supportingReferences.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-[12px] p-5 text-xs text-[#64748B]">
                No external supporting references attached.
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.supportingReferences.map((ref) => (
                  <EvidenceCard key={ref.id} reference={ref} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
