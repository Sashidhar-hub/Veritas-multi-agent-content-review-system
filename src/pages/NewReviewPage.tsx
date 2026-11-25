import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  FileUp,
  Trash2,
  CheckCircle2,
  Play,
  Save,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { AcademicLevel, AcademicSubject } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/StatusBadge';
import {
  ExtractedPaperQuestion,
  extractTextFromPdfBuffer,
  parseQuestionPaperText,
} from '../utils/questionPaperParser';

const SUBJECTS: AcademicSubject[] = [
  'Physics',
  'Chemistry',
  'Biology',
  'Mathematics',
  'Computer Science',
  'Environmental Science',
  'Other',
];

const LEVELS: AcademicLevel[] = [
  'School',
  'Undergraduate',
  'Postgraduate',
  'Research',
];

interface UploadedPdfItem {
  localId: string;
  file: File;
  filename: string;
  sizeBytes: number;
  progress: number;
  status: 'Uploaded' | 'Text Extracted' | 'Indexed' | 'Ready';
  documentId?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function NewReviewPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paperInputRef = useRef<HTMLInputElement | null>(null);

  const [question, setQuestion] = useState('');
  const [referenceFacts, setReferenceFacts] = useState('');
  const [subject, setSubject] = useState<AcademicSubject>('Biology');
  const [level, setLevel] = useState<AcademicLevel>('Undergraduate');
  const [uploads, setUploads] = useState<UploadedPdfItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [paperFileName, setPaperFileName] = useState<string | null>(null);
  const [paperParsing, setPaperParsing] = useState(false);
  const [paperQuestions, setPaperQuestions] = useState<ExtractedPaperQuestion[]>([]);
  const [paperError, setPaperError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ paper?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (files.length === 0) {
      addToast({
        type: 'warning',
        title: 'PDF files only',
        description: 'Please upload valid PDF reference documents.',
      });
      return;
    }

    for (const file of files) {
      const localId = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [
        ...prev,
        {
          localId,
          file,
          filename: file.name,
          sizeBytes: file.size,
          progress: 35,
          status: 'Uploaded',
        },
      ]);

      try {
        const doc = await veritasApi.uploadDocument(file, 'Reference PDF');
        setUploads((prev) =>
          prev.map((u) =>
            u.localId === localId
              ? { ...u, progress: 100, status: doc.status, documentId: doc.id }
              : u
          )
        );
      } catch {
        addToast({
          type: 'error',
          title: 'Upload failed',
          description: `Could not process ${file.name}.`,
        });
      }
    }
  };

  const removeUpload = (localId: string) => {
    setUploads((prev) => prev.filter((u) => u.localId !== localId));
  };

  const readFileAsDataUrl = (file: File): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (file.size > 3.5 * 1024 * 1024) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === 'string' ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });

  const handleQuestionPaper = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    setPaperFileName(file.name);
    setPaperParsing(true);
    setPaperError(null);
    try {
      const pdfDataUrl = isPdf ? await readFileAsDataUrl(file) : undefined;
      const text = isPdf
        ? await extractTextFromPdfBuffer(await file.arrayBuffer())
        : await file.text();

      const parsed = text.trim() ? parseQuestionPaperText(text) : [];

      // Publish read-only Question Paper PDF to Student Overview
      veritasApi.saveQuestionPaper({
        filename: file.name,
        subject,
        level,
        pdfDataUrl,
        questions: parsed.map((p) => ({ id: p.id, question: p.question })),
      });

      if (!text.trim()) {
        setPaperError('No selectable text found in this PDF, but the PDF is saved for Student Overview.');
        setPaperQuestions([]);
        return;
      }

      if (parsed.length === 0) {
        setPaperError('No numbered questions detected (e.g. "Q1." or "1."), but the PDF is saved for Student Overview.');
        setPaperQuestions([]);
        return;
      }

      setPaperQuestions(parsed);
      setQuestion(parsed[0].question);
      setErrors({});
      addToast({
        type: 'success',
        title: `Extracted ${parsed.length} Question(s)`,
        description: 'Question paper published to Student Overview (read-only).',
      });
    } catch {
      setPaperError('Failed to extract questions from the uploaded question paper.');
    } finally {
      setPaperParsing(false);
    }
  };

  const handleBatchSubmitPaper = async () => {
    if (paperQuestions.length === 0) return;
    setSubmitting(true);
    try {
      let firstId = '';
      for (const item of paperQuestions) {
        const rev = await veritasApi.createReview({
          question: item.question.trim(),
          draftExplanation: item.draftExplanation.trim(),
          referenceFacts: referenceFacts.trim() || undefined,
          subject,
          level,
          documentIds: uploads.map((u) => u.documentId).filter(Boolean) as string[],
          saveAsDraft: false,
        });
        if (!firstId) firstId = rev.id;
      }
      addToast({
        type: 'success',
        title: `Started ${paperQuestions.length} Academic Review(s)`,
        description: 'All extracted questions have been queued.',
      });
      navigate(`/reviews/${firstId}/workflow`);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Batch submission failed',
        description: err instanceof Error ? err.message : 'Unable to submit questions.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const validate = (): boolean => {
    const nextErrors: { paper?: string } = {};
    if (!paperFileName && paperQuestions.length === 0 && question.trim().length < 10) {
      nextErrors.paper =
        'Please upload a Question Paper (PDF, TXT, or MD) to proceed.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const targetQuestion =
        question.trim() ||
        paperQuestions[0]?.question.trim() ||
        `Question Paper: ${paperFileName}`;
      const targetDraft = paperQuestions[0]?.draftExplanation.trim() || '';

      const review = await veritasApi.createReview({
        question: targetQuestion,
        draftExplanation: targetDraft,
        referenceFacts: referenceFacts.trim() || undefined,
        subject,
        level,
        documentIds: uploads.map((u) => u.documentId).filter(Boolean) as string[],
        saveAsDraft,
      });

      addToast({
        type: 'success',
        title: saveAsDraft
          ? `Draft Saved (${review.id})`
          : `Review Started (${review.id})`,
        description: saveAsDraft
          ? 'Your draft has been saved to Review History.'
          : 'Multi-agent verification pipeline is now running.',
      });

      if (saveAsDraft) {
        navigate('/history');
      } else {
        navigate(`/reviews/${review.id}/workflow`);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Unable to submit review.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
          Professor Overview
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Upload a question paper and optional student answers for AI-powered verification.
        </p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-[14px] shadow-[0_1px_2px_rgba(16,24,43,0.04)] p-6 space-y-6">
        {/* 1. Question Paper (Main Required Document) */}
        <div
          className={`rounded-[12px] border p-4 space-y-3 ${
            errors.paper
              ? 'border-[#EF4444] bg-[#EF4444]/[0.03]'
              : 'border-slate-200 bg-[#F4F6FB]/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center shrink-0">
                {paperParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileUp className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#182238]">
                  Question Paper <span className="text-[#EF4444]">*</span>
                </p>
                <p className="text-xs text-[#64748B]">
                  Upload your PDF, TXT, or Markdown question paper as the primary review document.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={paperInputRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => handleQuestionPaper(e.target.files)}
              />
              <button
                type="button"
                onClick={() => paperInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-xs font-medium transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" />
                {paperFileName ? 'Replace Paper' : 'Upload Question Paper'}
              </button>
            </div>
          </div>

          {errors.paper && (
            <p className="text-xs text-[#EF4444] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.paper}
            </p>
          )}

          {paperFileName && (
            <p className="text-xs text-[#64748B]">
              Uploaded: <strong className="text-[#182238]">{paperFileName}</strong>
              {paperQuestions.length > 0 && (
                <span className="text-[#0E8A73] font-medium">
                  {' '}
                  • {paperQuestions.length} question(s) extracted
                </span>
              )}
            </p>
          )}

          {paperError && (
            <p className="text-xs text-[#B45309] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {paperError}
            </p>
          )}

          {paperQuestions.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap gap-2">
                {paperQuestions.map((pq, idx) => (
                  <button
                    key={pq.id}
                    type="button"
                    onClick={() => {
                      setQuestion(pq.question);
                      setErrors({});
                    }}
                    className={`text-left px-3 py-1.5 rounded-[8px] border text-xs transition-colors max-w-xs truncate ${
                      question === pq.question
                        ? 'border-[#635BFF] bg-[#635BFF]/10 text-[#4B44D6] font-medium'
                        : 'border-slate-200 bg-white text-[#182238] hover:border-[#635BFF]/50'
                    }`}
                  >
                    Q{idx + 1}. {pq.question}
                  </button>
                ))}
              </div>
              {paperQuestions.length > 1 && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleBatchSubmitPaper}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#10182B] hover:bg-[#1E293B] text-white text-xs font-medium disabled:opacity-60"
                >
                  <Play className="w-3 h-3" />
                  Start Verification for All {paperQuestions.length} Extracted Questions
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Question (Optional) */}
        <div>
          <label className="block text-sm font-medium text-[#182238] mb-1.5">
            Question <span className="text-xs font-normal text-[#64748B]">(Optional)</span>
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question here (or select an extracted question above)."
            className="w-full rounded-[10px] border border-slate-200 px-3.5 py-2.5 text-sm text-[#182238] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
          />
        </div>

        {/* 3. Reference Facts */}
        <div>
          <label className="block text-sm font-medium text-[#182238] mb-1.5">
            Reference Facts <span className="text-xs font-normal text-[#64748B]">(Optional)</span>
          </label>
          <textarea
            rows={3}
            value={referenceFacts}
            onChange={(e) => setReferenceFacts(e.target.value)}
            placeholder="Provide additional trusted reference facts if available."
            className="w-full rounded-[10px] border border-slate-200 px-3.5 py-2.5 text-sm text-[#182238] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
          />
        </div>

        {/* 4 & 5. Subject & Level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#182238] mb-1.5">
              Academic Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as AcademicSubject)}
              className="w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#182238] mb-1.5">
              Academic Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicLevel)}
              className="w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20 focus:border-[#635BFF]"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Reference Documents Drag-and-Drop */}
        <div>
          <label className="block text-sm font-medium text-[#182238] mb-1.5">
            Reference Documents <span className="text-xs font-normal text-[#64748B]">(Multiple PDFs supported)</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-[12px] p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#635BFF] bg-[#635BFF]/5'
                : 'border-slate-200 hover:border-[#635BFF]/60 bg-[#F4F6FB]/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="w-11 h-11 rounded-[10px] bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-[#182238]">
              Drag and drop academic PDFs here, or click to browse
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Textbooks, peer-reviewed papers, or lecture notes used by RAG Retrieval
            </p>
          </div>

          {uploads.length > 0 && (
            <div className="mt-3 space-y-2">
              {uploads.map((item) => (
                <div
                  key={item.localId}
                  className="flex items-center justify-between gap-3 p-3 rounded-[10px] border border-slate-200 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="w-4 h-4 text-[#635BFF] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-[#182238] truncate">
                          {item.filename}
                        </p>
                        <span className="text-[11px] text-[#64748B] shrink-0">
                          {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#18BFA0] rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-[#64748B]">
                          {item.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={item.status} />
                    <button
                      type="button"
                      onClick={() => removeUpload(item.localId)}
                      className="p-1.5 text-slate-400 hover:text-[#EF4444] rounded-lg transition-colors"
                      aria-label={`Remove ${item.filename}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#64748B] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#18BFA0]" />
            Mandatory human reviewer approval is enforced before publication.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-[#182238] transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4 text-[#64748B]" />
              Save as Draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-60"
            >
              <Play className="w-4 h-4" />
              {submitting ? 'Submitting...' : 'Start Academic Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
