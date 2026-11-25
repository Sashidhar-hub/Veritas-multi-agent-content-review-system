import { useEffect, useState, useRef, FormEvent } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  Globe,
  ExternalLink,
  Loader2,
  ArrowRight,
  Search,
  AlertCircle,
} from 'lucide-react';
import { KnowledgeDocument, TavilySource } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';

const DOC_TYPES: KnowledgeDocument['fileType'][] = [
  'Textbook',
  'Research Paper',
  'Reference PDF',
  'Lecture Notes',
];

export function KnowledgeSourcesPage() {
  const { user, globalSearch, addToast } = useApp();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [tavilySources, setTavilySources] = useState<TavilySource[]>([]);
  const [selectedType, setSelectedType] =
    useState<KnowledgeDocument['fileType']>('Research Paper');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [tavilyStatus, setTavilyStatus] = useState<{
    ok: boolean;
    tavilyConfigured: boolean;
  }>({ ok: false, tavilyConfigured: false });
  const [tavilyQuery, setTavilyQuery] = useState('');
  const [tavilySearching, setTavilySearching] = useState(false);
  const [tavilyError, setTavilyError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [docs, tav, status] = await Promise.all([
        veritasApi.listDocuments(),
        veritasApi.listTavilySources(),
        veritasApi.getTavilyStatus(),
      ]);
      setDocuments(docs);
      setTavilySources(tav);
      setTavilyStatus(status);
    } finally {
      setLoading(false);
    }
  };

  const handleTavilySearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!tavilyQuery.trim()) return;
    setTavilySearching(true);
    setTavilyError(null);
    try {
      const results = await veritasApi.searchTavily(tavilyQuery.trim());
      setTavilySources((prev) => [...results, ...prev]);
      addToast({
        type: 'success',
        title: 'Tavily Search Complete',
        description: `Retrieved ${results.length} scholarly web source(s).`,
      });
      setTavilyQuery('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tavily search failed.';
      setTavilyError(msg);
      addToast({
        type: 'error',
        title: 'Tavily Search Failed',
        description: msg,
      });
    } finally {
      setTavilySearching(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const created = await veritasApi.uploadDocument(file, selectedType);
        setDocuments((prev) => [created, ...prev]);
      }
      addToast({
        type: 'success',
        title: 'Document Indexed',
        description: 'Reference PDF is ready for RAG Retrieval.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Upload failed',
        description: 'Could not upload reference document.',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRemove = async (doc: KnowledgeDocument) => {
    if (user.role !== 'Reviewer' && doc.uploadedBy !== user.name) {
      addToast({
        type: 'warning',
        title: 'Permission required',
        description: 'Only authorized reviewers or the uploader can remove documents.',
      });
      return;
    }
    await veritasApi.removeDocument(doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    addToast({
      type: 'info',
      title: 'Document Removed',
      description: `${doc.filename} removed from Knowledge Base.`,
    });
  };

  const filteredDocs = documents.filter((d) => {
    if (!globalSearch.trim()) return true;
    const q = globalSearch.toLowerCase();
    return (
      d.filename.toLowerCase().includes(q) ||
      d.fileType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Knowledge Base
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Manage academic PDFs indexed for RAG Retrieval and inspect supplementary Tavily web sources.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#64748B] bg-white border border-slate-200 rounded-[10px] px-3 py-2">
          <span className="font-medium text-[#182238]">Pipeline:</span>
          <span>Uploaded</span>
          <ArrowRight className="w-3 h-3" />
          <span>Text Extracted</span>
          <ArrowRight className="w-3 h-3" />
          <span>Indexed</span>
          <ArrowRight className="w-3 h-3" />
          <span className="font-semibold text-[#0E8A73]">Ready</span>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#182238]">
              Upload Academic Reference Documents
            </h2>
            <p className="text-xs text-[#64748B]">
              Textbooks, research papers, reference PDFs, and lecture notes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-[#64748B]">Document Type:</label>
            <select
              value={selectedType}
              onChange={(e) =>
                setSelectedType(e.target.value as KnowledgeDocument['fileType'])
              }
              className="rounded-[9px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-slate-200 hover:border-[#635BFF]/60 rounded-[12px] p-6 text-center bg-[#F4F6FB]/50 transition-colors"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <UploadCloud className="w-7 h-7 text-[#635BFF] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#182238]">
            {uploading ? 'Uploading and indexing...' : 'Click to upload PDFs to Knowledge Base'}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">
            Automatically extracted, chunked, and indexed for Agent 2 (RAG Retrieval)
          </p>
        </div>
      </div>

      {/* Document Table */}
      <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#182238]">
            Indexed Academic Documents ({filteredDocs.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-[#64748B] gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#635BFF]" />
            <span className="text-sm">Loading documents...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#64748B]">
            No documents in the Knowledge Base.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-[#F4F6FB]/70 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">File Type</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4">Processing Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#635BFF] shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-[#182238]">
                            {doc.filename}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            Uploaded by {doc.uploadedBy}
                            {doc.pageCount ? ` • ${doc.pageCount} pages` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {doc.fileType}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#64748B] whitespace-nowrap">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(doc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* External Tavily Search Sources */}
      <section className="bg-white border border-slate-200/80 rounded-[12px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#18BFA0]" />
            <div>
              <h2 className="text-sm font-semibold text-[#182238]">
                External Tavily Search Sources
              </h2>
              <p className="text-xs text-[#64748B]">
                Supplementary scholarly web passages retrieved by Agent 2 or manual search
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                tavilyStatus.ok && tavilyStatus.tavilyConfigured
                  ? 'bg-[#18BFA0]/10 text-[#0E8A73] border-[#18BFA0]/25'
                  : tavilyStatus.ok
                  ? 'bg-[#F59E0B]/10 text-[#B45309] border-[#F59E0B]/30'
                  : 'bg-slate-100 text-[#64748B] border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  tavilyStatus.ok && tavilyStatus.tavilyConfigured
                    ? 'bg-[#18BFA0]'
                    : tavilyStatus.ok
                    ? 'bg-[#F59E0B]'
                    : 'bg-slate-400'
                }`}
              />
              {tavilyStatus.ok && tavilyStatus.tavilyConfigured
                ? 'Tavily API Connected'
                : tavilyStatus.ok
                ? 'TAVILY_API_KEY Missing'
                : 'Backend Proxy Offline'}
            </span>
            <span className="text-xs font-medium text-[#64748B]">
              {tavilySources.length} Sources
            </span>
          </div>
        </div>

        {/* Live Tavily Search Form */}
        <div className="p-4 border-b border-slate-100 bg-[#F4F6FB]/50 space-y-2.5">
          <form onSubmit={handleTavilySearch} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tavilyQuery}
                onChange={(e) => setTavilyQuery(e.target.value)}
                placeholder="Query Tavily academic web search (e.g., CRISPR Cas9 PAM specificity)..."
                className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-slate-200 bg-white text-sm text-[#182238] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
              />
            </div>
            <button
              type="submit"
              disabled={tavilySearching || !tavilyQuery.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-xs font-medium transition-colors disabled:opacity-60 shrink-0"
            >
              {tavilySearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Search Tavily
                </>
              )}
            </button>
          </form>
          {tavilyError && (
            <p className="text-xs text-[#EF4444] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {tavilyError}
            </p>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {tavilySources.map((src) => (
            <div
              key={src.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#18BFA0]/10 text-[#0E8A73]">
                    {src.trustTier}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">{src.domain}</span>
                  <span className="text-[11px] text-[#64748B]">
                    • Used in {src.usedInReviewId}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#182238]">{src.title}</p>
                <p className="text-xs text-[#64748B] line-clamp-2">{src.snippet}</p>
              </div>
              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-200 hover:border-[#635BFF] hover:text-[#635BFF] text-xs font-medium text-[#182238] shrink-0"
              >
                Visit <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
