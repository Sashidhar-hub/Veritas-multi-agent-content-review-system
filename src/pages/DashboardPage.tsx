import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileCheck2,
  Clock,
  BookOpenCheck,
  Layers,
  ArrowRight,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AcademicReview, KnowledgeDocument, PublicationItem } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { SummaryCard } from '../components/SummaryCard';
import { StatusBadge } from '../components/StatusBadge';
import { CompactAgentIndicators } from '../components/WorkflowTimeline';

export function DashboardPage() {
  const navigate = useNavigate();
  const { globalSearch } = useApp();

  const [reviews, setReviews] = useState<AcademicReview[]>([]);
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [revData, pubData, docData] = await Promise.all([
        veritasApi.listReviews(),
        veritasApi.listPublications(),
        veritasApi.listDocuments(),
      ]);
      setReviews(revData);
      setPublications(pubData);
      setDocuments(docData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredReviews = reviews.filter((r) => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase();
    return (
      r.id.toLowerCase().includes(q) ||
      r.question.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.authorName.toLowerCase().includes(q)
    );
  });

  const activePipeline = filteredReviews.filter((r) => r.status === 'Processing');
  const reviewerQueue = filteredReviews.filter((r) => r.status === 'Awaiting Approval');
  const completedCount = reviews.filter(
    (r) =>
      r.status === 'Completed' ||
      r.status === 'Awaiting Approval' ||
      r.status === 'Approved'
  ).length;

  const statusDistribution = [
    {
      label: 'Approved',
      count: reviews.filter((r) => r.status === 'Approved').length,
      color: '#18BFA0',
    },
    {
      label: 'Awaiting Approval',
      count: reviews.filter((r) => r.status === 'Awaiting Approval').length,
      color: '#F59E0B',
    },
    {
      label: 'Processing',
      count: reviews.filter((r) => r.status === 'Processing').length,
      color: '#635BFF',
    },
    {
      label: 'Changes Requested',
      count: reviews.filter((r) => r.status === 'Changes Requested').length,
      color: '#F97316',
    },
    {
      label: 'Rejected / Failed',
      count: reviews.filter((r) => r.status === 'Rejected' || r.status === 'Failed').length,
      color: '#EF4444',
    },
  ];

  const activityBars = [
    { day: 'Mon', count: 3 },
    { day: 'Tue', count: 5 },
    { day: 'Wed', count: 4 },
    { day: 'Thu', count: 7 },
    { day: 'Fri', count: 6 },
    { day: 'Sat', count: 2 },
    { day: 'Sun', count: reviews.length },
  ];
  const maxBar = Math.max(...activityBars.map((b) => b.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#64748B] gap-2.5">
        <Loader2 className="w-5 h-5 animate-spin text-[#635BFF]" />
        <span className="text-sm font-medium">Loading Veritas workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#EF4444]/30 rounded-[12px] p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-[#EF4444]">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Unable to load dashboard</p>
            <p className="text-xs text-[#64748B]">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="px-3.5 py-2 rounded-[10px] bg-[#635BFF] text-white text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Good morning, welcome to Veritas
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Monitor your academic content reviews and verification workflow.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/new-review')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-sm font-medium shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Professor Overview
        </button>
      </div>

      {/* Four Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Reviews"
          value={reviews.length}
          subtitle="All submitted academic reviews"
          icon={<Layers className="w-5 h-5" />}
          accentColor="navy"
        />
        <SummaryCard
          title="Completed Reviews"
          value={completedCount}
          subtitle="Finished 5-agent verification"
          icon={<FileCheck2 className="w-5 h-5" />}
          accentColor="indigo"
        />
        <SummaryCard
          title="Pending Approvals"
          value={reviewerQueue.length}
          subtitle="Mandatory human sign-off required"
          icon={<Clock className="w-5 h-5" />}
          accentColor="warning"
        />
        <SummaryCard
          title="Published Content"
          value={publications.length}
          subtitle="Verified & approved library items"
          icon={<BookOpenCheck className="w-5 h-5" />}
          accentColor="teal"
        />
      </div>

      {/* A. ACTIVE REVIEW PIPELINE */}
      <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#182238]">
              Active Review Pipeline
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Live multi-agent execution across Analyze → Retrieve → Verify → Review → Correct
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#635BFF]/10 text-[#635BFF]">
            {activePipeline.length} Running
          </span>
        </div>

        {activePipeline.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-[#182238]">
              No active reviews currently processing
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Submit a new science question and draft explanation to launch the 5-agent pipeline.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F4F6FB]/60 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Review ID</th>
                  <th className="py-3 px-4">Science Question</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Current Agent</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Agent Stages</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activePipeline.map((rev) => {
                  const currentStage = rev.agents.find((a) => a.key === rev.currentAgent);
                  return (
                    <tr key={rev.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#10182B] whitespace-nowrap">
                        {rev.id}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-sm font-medium text-[#182238] line-clamp-1">
                          {rev.question}
                        </p>
                        <p className="text-xs text-[#64748B]">{rev.subject}</p>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                        {new Date(rev.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-[#635BFF] whitespace-nowrap">
                        {currentStage ? currentStage.name : 'Queued'}
                      </td>
                      <td className="py-3.5 px-4 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#635BFF] rounded-full transition-all duration-300"
                              style={{ width: `${rev.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-[#64748B]">
                            {rev.progressPercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <CompactAgentIndicators agents={rev.agents} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={rev.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/reviews/${rev.id}/workflow`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-200 bg-white hover:border-[#635BFF] hover:text-[#635BFF] text-xs font-medium text-[#182238] transition-colors"
                        >
                          View Workflow
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* B. REVIEWER QUEUE & D. ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reviewer Queue */}
        <section className="lg:col-span-2 bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#182238]">
                Reviewer Queue
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Submissions awaiting mandatory human approval before publication
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/reviewer')}
              className="text-xs font-medium text-[#635BFF] hover:underline"
            >
              Open Workspace →
            </button>
          </div>

          {reviewerQueue.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              All verified reviews have been processed. No pending approvals.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {reviewerQueue.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-medium text-[#64748B]">
                        {item.id}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-sm font-medium text-[#182238] line-clamp-1">
                      {item.question}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Author: {item.authorName} • Submitted{' '}
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/reviewer?reviewId=${item.id}`)}
                    className="px-3.5 py-2 rounded-[9px] bg-[#10182B] hover:bg-[#1E293B] text-white text-xs font-medium shrink-0 transition-colors"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Analytics Column */}
        <section className="space-y-4">
          {/* Review Activity Chart */}
          <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)]">
            <h3 className="text-sm font-semibold text-[#182238]">Review Activity</h3>
            <p className="text-xs text-[#64748B] mt-0.5">Submissions over last 7 days</p>
            <div className="mt-4 flex items-end justify-between gap-2 h-28 pt-2">
              {activityBars.map((bar) => (
                <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full bg-slate-100 rounded-t-[6px] h-20 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-[#635BFF] rounded-t-[6px] transition-all"
                      style={{ height: `${Math.round((bar.count / maxBar) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-[#64748B]">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)]">
            <h3 className="text-sm font-semibold text-[#182238]">Status Distribution</h3>
            <div className="mt-3 space-y-2.5">
              {statusDistribution.map((s) => {
                const pct = reviews.length ? Math.round((s.count / reviews.length) * 100) : 0;
                return (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#64748B]">{s.label}</span>
                      <span className="font-medium text-[#182238]">
                        {s.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* C. RECENT REVIEWS & Recently Uploaded Docs */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#182238]">Recent Reviews</h2>
            <button
              type="button"
              onClick={() => navigate('/history')}
              className="text-xs font-medium text-[#635BFF] hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F4F6FB]/60 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Review ID</th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredReviews.slice(0, 5).map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-[#10182B] whitespace-nowrap">
                      {rev.id}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-sm text-[#182238] line-clamp-1">{rev.question}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {rev.subject}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {new Date(rev.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={rev.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {rev.reviewerName || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            rev.status === 'Processing'
                              ? `/reviews/${rev.id}/workflow`
                              : `/reviews/${rev.id}/results`
                          )
                        }
                        className="text-xs font-medium text-[#635BFF] hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recently Uploaded Reference Documents */}
        <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#182238]">
              Recent Reference Documents
            </h2>
            <button
              type="button"
              onClick={() => navigate('/knowledge')}
              className="text-xs font-medium text-[#635BFF] hover:underline"
            >
              Manage →
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {documents.slice(0, 4).map((doc) => (
              <div key={doc.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-[8px] bg-[#10182B]/5 text-[#10182B] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#182238] truncate">
                      {doc.filename}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {doc.fileType} • {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
