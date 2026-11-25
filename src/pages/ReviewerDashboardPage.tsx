import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  Loader2,
  Lock,
} from 'lucide-react';
import { AcademicReview } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceCard } from '../components/EvidenceCard';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function ReviewerDashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, addToast } = useApp();

  const [pendingReviews, setPendingReviews] = useState<AcademicReview[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('reviewId')
  );
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [dialogMode, setDialogMode] = useState<
    'approve' | 'reject' | 'changes' | null
  >(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const all = await veritasApi.listReviews();
      const queue = all.filter((r) => r.status === 'Awaiting Approval');
      setPendingReviews(queue);
      if (queue.length > 0) {
        const paramId = searchParams.get('reviewId');
        const exists = queue.some((q) => q.id === paramId);
        setSelectedId(exists ? paramId : queue[0].id);
      } else {
        setSelectedId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const selected = pendingReviews.find((r) => r.id === selectedId) || null;

  const handleDecision = async (inputValue?: string) => {
    if (!selected || !dialogMode) return;
    setActionLoading(true);
    try {
      if (dialogMode === 'approve') {
        await veritasApi.approveReview(selected.id, inputValue);
        addToast({
          type: 'success',
          title: `Approved & Published (${selected.id})`,
          description: `Recorded approval by ${user.name} for v${selected.version}.`,
        });
      } else if (dialogMode === 'reject') {
        await veritasApi.rejectReview(selected.id, inputValue || 'Rejected by reviewer.');
        addToast({
          type: 'error',
          title: `Submission Rejected (${selected.id})`,
          description: 'Publication is blocked for this submission.',
        });
      } else if (dialogMode === 'changes') {
        await veritasApi.requestChanges(selected.id, inputValue || 'Changes requested.');
        addToast({
          type: 'warning',
          title: `Changes Requested (${selected.id})`,
          description: 'Returned to workflow for correction rerun.',
        });
      }
      setDialogMode(null);
      await loadQueue();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unable to record decision.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Mandatory Human Approval Notice */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Academic Reviewer Workspace
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Inspect AI-verified explanations, evidence citations, and issue final publication decisions.
          </p>
        </div>

        <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-[10px] bg-[#10182B] text-white text-xs font-medium shrink-0">
          <Lock className="w-4 h-4 text-[#18BFA0]" />
          <span>Publication is impossible without mandatory human approval</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-[#64748B] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
          <span className="text-sm">Loading reviewer approval queue...</span>
        </div>
      ) : pendingReviews.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-[12px] p-12 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-[#18BFA0] mx-auto" />
          <h2 className="text-base font-semibold text-[#182238]">
            Approval Queue Empty
          </h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            All completed multi-agent reviews have been adjudicated. Published items are available in the Academic Library.
          </p>
          <button
            type="button"
            onClick={() => navigate('/published')}
            className="mt-2 px-4 py-2 rounded-[10px] bg-[#635BFF] text-white text-xs font-medium"
          >
            View Published Content
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Queue List */}
          <div className="lg:col-span-4 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B] px-1">
              Pending Approvals ({pendingReviews.length})
            </p>
            {pendingReviews.map((item) => {
              const active = item.id === selected?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left p-4 rounded-[12px] border transition-all ${
                    active
                      ? 'bg-white border-[#635BFF] ring-2 ring-[#635BFF]/15 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-semibold text-[#10182B]">
                      {item.id}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-sm font-medium text-[#182238] line-clamp-2">
                    {item.question}
                  </p>
                  <p className="mt-2 text-xs text-[#64748B]">
                    {item.subject} • {item.authorName}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Detailed Review Panel */}
          {selected && (
            <div className="lg:col-span-8 space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <span className="font-mono font-semibold text-[#10182B]">
                        {selected.id}
                      </span>
                      <span>• Version v{selected.version}</span>
                      <span>• {selected.subject} ({selected.level})</span>
                    </div>
                    <h2 className="mt-1.5 text-lg font-semibold text-[#182238]">
                      {selected.question}
                    </h2>
                    <p className="mt-1 text-xs text-[#64748B]">
                      Author: {selected.authorName} ({selected.authorEmail}) • Submitted{' '}
                      {new Date(selected.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Verification Summary */}
                {selected.results && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-[10px] bg-[#F4F6FB] p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#64748B]">
                        Total Claims
                      </p>
                      <p className="text-lg font-semibold text-[#182238]">
                        {selected.results.summary.totalClaims}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-[#18BFA0]/10 p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#0E8A73]">
                        Supported
                      </p>
                      <p className="text-lg font-semibold text-[#0E8A73]">
                        {selected.results.summary.supportedClaims}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-[#EF4444]/10 p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#DC2626]">
                        Contradicted
                      </p>
                      <p className="text-lg font-semibold text-[#DC2626]">
                        {selected.results.summary.contradictedClaims}
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-[#F59E0B]/10 p-3">
                      <p className="text-[10px] font-semibold uppercase text-[#B45309]">
                        Missing Concepts
                      </p>
                      <p className="text-lg font-semibold text-[#B45309]">
                        {selected.results.summary.detectedMissingConcepts}
                      </p>
                    </div>
                  </div>
                )}

                {/* Original vs AI-Corrected */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Original Explanation
                    </p>
                    <p className="text-xs text-[#182238] leading-relaxed bg-[#F4F6FB] border border-slate-200/70 rounded-[10px] p-3.5">
                      {selected.draftExplanation}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0E8A73]">
                      AI-Corrected Explanation
                    </p>
                    <p className="text-xs text-[#182238] leading-relaxed bg-[#18BFA0]/[0.05] border border-[#18BFA0]/25 rounded-[10px] p-3.5">
                      {selected.results?.correctedExplanation || selected.draftExplanation}
                    </p>
                  </div>
                </div>

                {/* Correction Notes */}
                {selected.results && selected.results.correctionNotes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Correction Notes ({selected.results.correctionNotes.length})
                    </p>
                    <div className="border border-slate-200 rounded-[10px] overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F4F6FB] border-b border-slate-200 text-[#64748B]">
                            <th className="py-2 px-3">Identified Issue</th>
                            <th className="py-2 px-3">Corrected Statement</th>
                            <th className="py-2 px-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selected.results.correctionNotes.map((n) => (
                            <tr key={n.id}>
                              <td className="py-2.5 px-3 font-medium text-[#182238]">
                                {n.identifiedIssue}
                              </td>
                              <td className="py-2.5 px-3 text-[#0E8A73]">
                                {n.correctedStatement}
                              </td>
                              <td className="py-2.5 px-3 text-[#64748B]">{n.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Evidence & Citations */}
                {selected.results && selected.results.supportingReferences.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Evidence & Citations
                    </p>
                    <div className="space-y-2">
                      {selected.results.supportingReferences.map((ref) => (
                        <EvidenceCard key={ref.id} reference={ref} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Restrained Action Bar */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/reviews/${selected.id}/results`)}
                    className="text-xs font-medium text-[#635BFF] hover:underline"
                  >
                    Open Full Verification Report →
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setDialogMode('reject')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#EF4444]/30 text-[#DC2626] hover:bg-[#EF4444]/10 text-xs font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialogMode('changes')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#F59E0B]/40 text-[#B45309] hover:bg-[#F59E0B]/10 text-xs font-medium transition-colors"
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialogMode('approve')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#18BFA0] hover:bg-[#14A68B] text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={dialogMode === 'approve'}
        title="Approve Academic Explanation"
        description={`You are approving ${selected?.id} (v${selected?.version}) as ${user.name}. This records your reviewer identity and approval timestamp and publishes the verified explanation to the Academic Library.`}
        confirmLabel="Confirm Approval"
        confirmVariant="teal"
        inputLabel="Optional Approval Note"
        inputPlaceholder="Add an optional verification note..."
        loading={actionLoading}
        onConfirm={handleDecision}
        onCancel={() => setDialogMode(null)}
      />

      <ConfirmDialog
        open={dialogMode === 'reject'}
        title="Reject Submission"
        description={`Rejecting ${selected?.id} will permanently block publication. Please provide a clear academic reason for the rejection.`}
        confirmLabel="Confirm Rejection"
        confirmVariant="danger"
        requireInput
        inputLabel="Rejection Reason"
        inputPlaceholder="Explain why this submission is rejected..."
        loading={actionLoading}
        onConfirm={handleDecision}
        onCancel={() => setDialogMode(null)}
      />

      <ConfirmDialog
        open={dialogMode === 'changes'}
        title="Request Changes"
        description={`Your comments will be attached to ${selected?.id} and displayed on the workflow page so the Correction agent can be rerun to generate a new version requiring approval.`}
        confirmLabel="Send Back for Changes"
        confirmVariant="warning"
        requireInput
        inputLabel="Reviewer Comments"
        inputPlaceholder="Specify required scientific corrections or missing concepts..."
        loading={actionLoading}
        onConfirm={handleDecision}
        onCancel={() => setDialogMode(null)}
      />
    </div>
  );
}
