import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, ArrowUpRight } from 'lucide-react';
import { AcademicReview, ReviewOverallStatus } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';

const FILTERS: Array<'All' | ReviewOverallStatus> = [
  'All',
  'Processing',
  'Completed',
  'Awaiting Approval',
  'Approved',
  'Rejected',
  'Changes Requested',
];

export function ReviewHistoryPage() {
  const navigate = useNavigate();
  const { globalSearch } = useApp();

  const [reviews, setReviews] = useState<AcademicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | ReviewOverallStatus>('All');
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    veritasApi
      .listReviews()
      .then(setReviews)
      .finally(() => setLoading(false));
  }, []);

  const query = (localSearch || globalSearch).trim().toLowerCase();

  const filtered = reviews.filter((r) => {
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesQuery =
      !query ||
      r.id.toLowerCase().includes(query) ||
      r.question.toLowerCase().includes(query) ||
      r.subject.toLowerCase().includes(query) ||
      r.authorName.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Review History
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Search and inspect all submitted academic reviews and verification outcomes.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Filter by ID, question, subject..."
            className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-slate-200 bg-white text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f
                ? 'bg-[#10182B] text-white'
                : 'bg-white border border-slate-200 text-[#64748B] hover:text-[#182238]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#64748B] gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#635BFF]" />
            <span className="text-sm">Loading review history...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#182238]">No matching reviews found</p>
            <p className="text-xs text-[#64748B] mt-1">
              Try adjusting your status filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F4F6FB]/70 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Review ID</th>
                  <th className="py-3 px-4">Science Question</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#10182B] whitespace-nowrap">
                      {rev.id}
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-sm font-medium text-[#182238] line-clamp-1">
                        {rev.question}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {rev.authorName} • v{rev.version}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {rev.subject}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {new Date(rev.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={rev.status} />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {new Date(rev.lastUpdated).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            rev.status === 'Processing' || rev.status === 'Changes Requested'
                              ? `/reviews/${rev.id}/workflow`
                              : `/reviews/${rev.id}/results`
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-slate-200 hover:border-[#635BFF] hover:text-[#635BFF] text-xs font-medium text-[#182238] transition-colors"
                      >
                        Open
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
