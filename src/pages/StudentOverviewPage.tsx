import { useEffect, useRef, useState, ClipboardEvent, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  FileText,
  Lock,
  Send,
  Loader2,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { ProfessorQuestionPaper } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function ReadOnlyPdfCanvasViewer({ pdfDataUrl }: { pdfDataUrl?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rendering, setRendering] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    setPageCount(0);
    setError(null);

    if (!pdfDataUrl) return;

    let cancelled = false;
    setRendering(true);

    (async () => {
      try {
        const base64 = pdfDataUrl.split(',')[1] || '';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPageCount(pdf.numPages);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.3 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className =
            'w-full h-auto rounded-[8px] border border-slate-200 bg-white shadow-sm mb-4';
          canvas.oncontextmenu = (e) => e.preventDefault();

          container.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        }
      } catch {
        if (!cancelled) {
          setError('Unable to render this PDF preview.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDataUrl]);

  if (!pdfDataUrl) {
    return (
      <div className="p-8 text-center rounded-[10px] bg-[#F4F6FB] border border-slate-200 text-xs text-[#64748B]">
        PDF binary preview is unavailable for this item (exceeded browser storage limit or non-PDF file). Refer to the extracted questions on the right.
      </div>
    );
  }

  return (
    <div
      className="space-y-2 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between text-xs text-[#64748B]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#182238]">
          <Lock className="w-3.5 h-3.5 text-[#18BFA0]" />
          Read-Only Question Paper (Download & Editing Disabled)
        </span>
        {pageCount > 0 && <span>{pageCount} page(s)</span>}
      </div>

      {rendering && (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin text-[#635BFF]" />
          Rendering read-only question paper...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[8px] bg-[#EF4444]/10 text-xs text-[#DC2626]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="max-h-[680px] overflow-y-auto pr-1 rounded-[10px] bg-[#F4F6FB] p-3 border border-slate-200"
      />
    </div>
  );
}

export function StudentOverviewPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [papers, setPapers] = useState<ProfessorQuestionPaper[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generalAnswer, setGeneralAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const list = veritasApi.listQuestionPapers();
    setPapers(list);
    if (list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, []);

  const selectedPaper = papers.find((p) => p.id === selectedId) || null;

  const handleSubmitAnswers = async () => {
    if (!selectedPaper) return;

    if (!generalAnswer.trim()) {
      addToast({
        type: 'warning',
        title: 'Answer Required',
        description: 'Please write your answers before submitting.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const rev = await veritasApi.createReview({
        question: `Question Paper: ${selectedPaper.filename}`,
        draftExplanation: generalAnswer.trim(),
        subject: selectedPaper.subject,
        level: selectedPaper.level,
        documentIds: [],
        saveAsDraft: false,
      });
      addToast({
        type: 'success',
        title: `Submitted Answer (${rev.id})`,
        description: 'Your answer is now being verified against faculty reference documents.',
      });
      navigate(`/reviews/${rev.id}/workflow`);
    } finally {
      setSubmitting(false);
    }
  };

  const blockClipboard = (e: ClipboardEvent) => {
    e.preventDefault();
    addToast({
      type: 'warning',
      title: 'Copy & Paste Disabled',
      description: 'Copy, cut, and paste are disabled in Student Overview.',
    });
  };

  const blockClipboardShortcut = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      addToast({
        type: 'warning',
        title: 'Copy & Paste Disabled',
        description: 'Copy, cut, and paste shortcuts are disabled in Student Overview.',
      });
    }
  };

  return (
    <div
      className="space-y-6 select-none"
      onCopy={blockClipboard}
      onCut={blockClipboard}
      onPaste={blockClipboard}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Student Overview
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Open the professor-uploaded question paper PDF (read-only) and write your answers below.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[#10182B] text-white text-xs font-medium shrink-0">
          <Lock className="w-3.5 h-3.5 text-[#18BFA0]" />
          View Only • Copy/Paste Disabled
        </span>
      </div>

      {papers.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-[12px] p-12 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-[#64748B] mx-auto opacity-60" />
          <h2 className="text-base font-semibold text-[#182238]">
            No Question Papers Published Yet
          </h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            A professor must upload a Question Paper PDF in Professor Overview before students can open it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Paper Selector + Read-Only PDF Viewer */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200/80 rounded-[12px] p-4 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Available Question Papers ({papers.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {papers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-[9px] border text-xs font-medium transition-colors ${
                      selectedPaper?.id === p.id
                        ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#4B44D6]'
                        : 'border-slate-200 bg-white text-[#182238] hover:border-slate-300'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[220px]">{p.filename}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedPaper && (
              <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#182238]">
                      {selectedPaper.filename}
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      {selectedPaper.subject} • {selectedPaper.level} • Uploaded by{' '}
                      {selectedPaper.uploadedBy}
                    </p>
                  </div>
                </div>
                <ReadOnlyPdfCanvasViewer pdfDataUrl={selectedPaper.pdfDataUrl} />
              </div>
            )}
          </div>

          {/* Right: Student Answer Sheet */}
          {selectedPaper && (
            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200/80 rounded-[12px] p-5 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4 sticky top-20">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-sm font-semibold text-[#182238]">
                    Write Your Answers
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Read the question paper on the left and enter your answers below.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#182238] mb-1.5">
                    Your Answers
                  </label>
                  <textarea
                    rows={14}
                    value={generalAnswer}
                    onChange={(e) => setGeneralAnswer(e.target.value)}
                    onCopy={blockClipboard}
                    onCut={blockClipboard}
                    onPaste={blockClipboard}
                    onDrop={(e) => e.preventDefault()}
                    onKeyDown={blockClipboardShortcut}
                    placeholder="Write your answers to the question paper here (copy/paste disabled)..."
                    className="w-full rounded-[10px] border border-slate-200 px-3 py-2 text-sm text-[#182238] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitAnswers}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting Answers...' : 'Submit Answers for Verification'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
