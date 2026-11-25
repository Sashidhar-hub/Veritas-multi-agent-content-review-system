import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AlertCircle,
  MessageSquareWarning,
  RefreshCw,
  Terminal,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { AcademicReview } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import { WorkflowTimeline } from '../components/WorkflowTimeline';
import { EvidenceCard } from '../components/EvidenceCard';

export function WorkflowPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [review, setReview] = useState<AcademicReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rerunning, setRerunning] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!id) return;
    try {
      const data = await veritasApi.getReviewStatus(id);
      setReview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch workflow status.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll backend (or advance local pipeline state) while Processing
  useEffect(() => {
    if (!id || !review || review.status !== 'Processing') return;
    const timer = setInterval(async () => {
      try {
        if (veritasApi.isRemoteBackendConfigured()) {
          const updated = await veritasApi.getReviewStatus(id);
          setReview(updated);
        } else {
          const updated = await veritasApi.stepLocalPipeline(id);
          setReview(updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Status polling error');
      }
    }, 2200);

    return () => clearInterval(timer);
  }, [id, review?.status]);

  const handleRerunCorrection = async () => {
    if (!review) return;
    setRerunning(true);
    try {
      const updated = await veritasApi.rerunCorrection(review.id);
      setReview(updated);
      addToast({
        type: 'info',
        title: `Correction Agent Restarted (v${updated.version})`,
        description: 'A new version will be generated for mandatory reviewer approval.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Rerun failed',
        description: err instanceof Error ? err.message : 'Could not restart correction.',
      });
    } finally {
      setRerunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#64748B] gap-2.5">
        <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
        <span className="text-sm font-medium">Loading workflow state...</span>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="bg-white border border-[#EF4444]/30 rounded-[12px] p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-[#EF4444]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Workflow Unavailable</p>
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

  const runningAgent = review.agents.find((a) => a.status === 'Running');
  const evidence = review.results?.supportingReferences || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-[8px] bg-[#10182B] text-white">
                {review.id}
              </span>
              <span className="text-xs font-medium text-[#64748B]">
                Version v{review.version} • {review.subject} ({review.level})
              </span>
              <StatusBadge status={review.status} />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#182238]">
              Academic Review in Progress
            </h1>
            <p className="text-sm text-[#64748B]">{review.question}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {review.status !== 'Processing' && review.status !== 'Draft' && (
              <button
                type="button"
                onClick={() => navigate(`/reviews/${review.id}/results`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-sm font-medium transition-colors"
              >
                View Verification Results
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {review.status === 'Awaiting Approval' && (
              <button
                type="button"
                onClick={() => navigate(`/reviewer?reviewId=${review.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#18BFA0] hover:bg-[#14A68B] text-white text-sm font-medium transition-colors"
              >
                Open Reviewer Approval
              </button>
            )}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-[#182238]">
              {runningAgent
                ? `Current Running Agent: ${runningAgent.name}`
                : review.status === 'Processing'
                ? 'Initializing agent pipeline...'
                : `Pipeline Status: ${review.status}`}
            </span>
            <span className="font-mono font-semibold text-[#635BFF]">
              {review.progressPercent}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                review.status === 'Failed'
                  ? 'bg-[#EF4444]'
                  : review.progressPercent === 100
                  ? 'bg-[#18BFA0]'
                  : 'bg-[#635BFF]'
              }`}
              style={{ width: `${review.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reviewer Comments Banner (when Changes Requested) */}
      {review.reviewerComments && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <MessageSquareWarning className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#182238]">
                Reviewer Requested Changes ({review.reviewerName})
              </p>
              <p className="text-sm text-[#182238]/90 mt-1">{review.reviewerComments}</p>
            </div>
          </div>
          {review.status === 'Changes Requested' && (
            <button
              type="button"
              disabled={rerunning}
              onClick={handleRerunCorrection}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#10182B] hover:bg-[#1E293B] text-white text-xs font-medium shrink-0 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rerunning ? 'animate-spin' : ''}`} />
              Rerun Correction Agent
            </button>
          )}
        </div>
      )}

      {/* Error Message Banner if Failed */}
      {review.errorMessage && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-[12px] p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#DC2626]">Pipeline Execution Error</p>
            <p className="text-xs text-[#182238] mt-1">{review.errorMessage}</p>
          </div>
        </div>
      )}

      {/* Horizontal 5-Agent Workflow Timeline */}
      <WorkflowTimeline agents={review.agents} />

      {/* Bottom Panels: Retrieved Evidence & Execution Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retrieved Evidence Panel */}
        <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#182238]">
              Retrieved Evidence
            </h3>
            <span className="text-xs text-[#64748B]">
              {review.attachedDocumentNames.length} PDF(s) attached
            </span>
          </div>

          {evidence.length > 0 ? (
            <div className="space-y-2.5">
              {evidence.map((ref) => (
                <EvidenceCard key={ref.id} reference={ref} />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] bg-[#F4F6FB] p-4 text-xs text-[#64748B]">
              {review.status === 'Processing'
                ? 'Evidence passages will appear here once RAG Retrieval and Fact Verification complete.'
                : 'No external evidence passages recorded for this review.'}
            </div>
          )}
        </section>

        {/* Recent Execution Logs */}
        <section className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#635BFF]" />
            <h3 className="text-sm font-semibold text-[#182238]">
              Recent Execution Logs
            </h3>
          </div>
          <div className="bg-[#10182B] rounded-[10px] p-4 max-h-72 overflow-y-auto space-y-2 font-mono text-xs">
            {review.logs.length === 0 ? (
              <p className="text-slate-400">No execution logs recorded yet.</p>
            ) : (
              review.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <span className="text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`uppercase text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                      log.level === 'success'
                        ? 'bg-[#18BFA0]/20 text-[#18BFA0]'
                        : log.level === 'warning'
                        ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                        : log.level === 'error'
                        ? 'bg-[#EF4444]/20 text-[#EF4444]'
                        : 'bg-[#635BFF]/20 text-[#A5B4FC]'
                    }`}
                  >
                    {log.agent}
                  </span>
                  <span className="text-slate-200 leading-relaxed">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
