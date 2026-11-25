import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileUp,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Play,
  Save,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { AcademicLevel, AcademicSubject, AcademicReview } from '../types/veritas';
import { veritasApi } from '../services/api';
import { useApp } from '../context/AppContext';
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

const SAMPLE_PAPER = `Q1. Why does ice float on liquid water?
Answer: Ice floats because water expands when it freezes due to hydrogen bonding forming an open hexagonal crystal lattice, making solid ice less dense than liquid water.

Q2. What is the role of the mitochondrial inner membrane in ATP synthesis?
Answer: The inner mitochondrial membrane houses the electron transport chain and ATP synthase, maintaining the proton gradient required for chemiosmotic oxidative phosphorylation.

Q3. State the Second Law of Thermodynamics in terms of entropy.
Answer: In any spontaneous natural process in an isolated system, total entropy increases or remains constant for an ideal reversible process.`;

export function UploadQuestionPaperPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [subject, setSubject] = useState<AcademicSubject>('Biology');
  const [level, setLevel] = useState<AcademicLevel>('Undergraduate');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [dragActive, setDragActive] = useState(false);

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [rawPaperText, setRawPaperText] = useState('');
  const [questions, setQuestions] = useState<ExtractedPaperQuestion[]>([]);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [createdReviews, setCreatedReviews] = useState<AcademicReview[]>([]);

  const handlePaperFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setExtractError(null);
    setParsing(true);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);

    try {
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        text = await extractTextFromPdfBuffer(buffer);
      } else {
        text = await file.text();
      }

      if (!text.trim()) {
        setExtractError(
          'No selectable text was found in this file (it may be a scanned or compressed PDF). Please switch to "Paste Question Paper Text" or add questions manually below.'
        );
        setQuestions([]);
        return;
      }

      setRawPaperText(text);
      const parsed = parseQuestionPaperText(text);
      if (parsed.length === 0) {
        setExtractError(
          'Could not detect numbered questions (e.g., "1.", "Q1."). You can edit the text in Paste mode or add questions manually.'
        );
      }
      setQuestions(parsed);
    } catch {
      setExtractError('Failed to read the uploaded question paper file.');
    } finally {
      setParsing(false);
    }
  };

  const handleParseText = () => {
    setExtractError(null);
    const parsed = parseQuestionPaperText(rawPaperText);
    if (parsed.length === 0) {
      setExtractError(
        'No numbered questions detected. Prefix each question with "1.", "Q1.", or "Question 1:".'
      );
      return;
    }
    setQuestions(parsed);
    addToast({
      type: 'success',
      title: `Extracted ${parsed.length} Question(s)`,
      description: 'Review and edit the extracted questions before submitting.',
    });
  };

  const handleLoadSample = () => {
    setInputMode('paste');
    setRawPaperText(SAMPLE_PAPER);
    setExtractError(null);
    const parsed = parseQuestionPaperText(SAMPLE_PAPER);
    setQuestions(parsed);
    addToast({
      type: 'info',
      title: 'Sample Question Paper Loaded',
      description: `Parsed ${parsed.length} sample questions with draft explanations.`,
    });
  };

  const addBlankQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `qp-${Date.now()}`,
        question: '',
        draftExplanation: '',
        selected: true,
      },
    ]);
  };

  const updateQuestion = (
    id: string,
    patch: Partial<ExtractedPaperQuestion>
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const selectedQuestions = questions.filter((q) => q.selected);

  const handleBatchSubmit = async (saveAsDraft: boolean) => {
    if (selectedQuestions.length === 0) {
      addToast({
        type: 'warning',
        title: 'No questions selected',
        description: 'Select at least one extracted question to submit.',
      });
      return;
    }

    const invalid = selectedQuestions.find(
      (q) => q.question.trim().length < 10
    );
    if (invalid) {
      addToast({
        type: 'error',
        title: 'Incomplete Question',
        description:
          'Each selected item needs a science question (at least 10 characters). Draft explanation is optional.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const created: AcademicReview[] = [];
      for (const item of selectedQuestions) {
        const rev = await veritasApi.createReview({
          question: item.question.trim(),
          draftExplanation: item.draftExplanation.trim(),
          subject,
          level,
          documentIds: [],
          saveAsDraft,
        });
        created.push(rev);
      }

      setCreatedReviews(created);
      addToast({
        type: 'success',
        title: saveAsDraft
          ? `Saved ${created.length} Draft(s)`
          : `Started ${created.length} Academic Review(s)`,
        description: 'All selected question paper items have been queued.',
      });
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#182238]">
            Upload Question Paper
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Upload an exam or assignment paper to extract multiple science questions and batch-submit them for multi-agent verification.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-slate-200 bg-white hover:border-[#635BFF] hover:text-[#635BFF] text-xs font-medium text-[#182238] transition-colors shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#635BFF]" />
          Load Sample Paper
        </button>
      </div>

      {/* Submission Confirmation Banner */}
      {createdReviews.length > 0 && (
        <div className="bg-[#18BFA0]/10 border border-[#18BFA0]/30 rounded-[12px] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[#0E8A73]">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-sm font-semibold">
              {createdReviews.length} Review(s) Created from Question Paper
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {createdReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white border border-slate-200 rounded-[10px] p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-mono text-xs font-semibold text-[#10182B]">
                    {rev.id}
                  </span>
                  <p className="text-xs text-[#64748B] truncate">{rev.question}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      rev.status === 'Draft'
                        ? '/history'
                        : `/reviews/${rev.id}/workflow`
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#635BFF] hover:underline shrink-0"
                >
                  {rev.status === 'Draft' ? 'History' : 'Workflow'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Paper Upload & Metadata */}
      <section className="bg-white border border-slate-200/80 rounded-[14px] p-6 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1.5">
              Academic Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as AcademicSubject)}
              className="w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#182238] mb-1.5">
              Academic Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as AcademicLevel)}
              className="w-full rounded-[10px] border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Switch */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
              inputMode === 'file'
                ? 'bg-[#10182B] text-white'
                : 'text-[#64748B] hover:bg-slate-100'
            }`}
          >
            <FileUp className="w-3.5 h-3.5" />
            Upload File (PDF / TXT)
          </button>
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
              inputMode === 'paste'
                ? 'bg-[#10182B] text-white'
                : 'text-[#64748B] hover:bg-slate-100'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Paste Question Paper Text
          </button>
        </div>

        {inputMode === 'file' ? (
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handlePaperFile(e.dataTransfer.files);
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
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="hidden"
                onChange={(e) => handlePaperFile(e.target.files)}
              />
              <div className="w-11 h-11 rounded-[10px] bg-[#635BFF]/10 text-[#635BFF] flex items-center justify-center mx-auto mb-3">
                {parsing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileUp className="w-5 h-5" />
                )}
              </div>
              <p className="text-sm font-medium text-[#182238]">
                {parsing
                  ? 'Extracting questions from paper...'
                  : 'Drag and drop your Question Paper (PDF, TXT, or Markdown)'}
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                Format questions as "Q1.", "1.", or "Question 1:" with optional "Answer:" blocks
              </p>
            </div>

            {uploadedFileName && (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border border-slate-200 bg-[#F4F6FB]/60 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#635BFF]" />
                  <span className="font-medium text-[#182238]">{uploadedFileName}</span>
                  <span className="text-[#64748B]">
                    ({(uploadedFileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <span className="text-[#0E8A73] font-medium">
                  {questions.length} question(s) extracted
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={7}
              value={rawPaperText}
              onChange={(e) => setRawPaperText(e.target.value)}
              placeholder={`Paste question paper text here, e.g.:\nQ1. How does quantum tunneling work?\nAnswer: ...\n\nQ2. Explain Le Chatelier's principle.\nAnswer: ...`}
              className="w-full rounded-[10px] border border-slate-200 px-3.5 py-2.5 text-sm text-[#182238] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParseText}
                className="px-4 py-2 rounded-[10px] bg-[#10182B] hover:bg-[#1E293B] text-white text-xs font-medium"
              >
                Extract Questions
              </button>
            </div>
          </div>
        )}

        {extractError && (
          <div className="flex items-start gap-2 rounded-[10px] bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 text-xs text-[#B45309]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{extractError}</span>
          </div>
        )}
      </section>

      {/* Step 2: Extracted Questions Editor */}
      <section className="bg-white border border-slate-200/80 rounded-[14px] p-6 shadow-[0_1px_2px_rgba(16,24,43,0.04)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#182238]">
              Extracted Questions ({questions.length})
            </h2>
            <p className="text-xs text-[#64748B]">
              Select questions and verify their draft explanations before launching the Veritas pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={addBlankQuestion}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-slate-200 hover:border-[#635BFF] text-xs font-medium text-[#182238]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="p-8 text-center rounded-[10px] bg-[#F4F6FB] text-xs text-[#64748B]">
            No questions extracted yet. Upload a question paper, paste text, or click "Load Sample Paper".
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((item, idx) => (
              <div
                key={item.id}
                className={`rounded-[12px] border p-4 space-y-3 transition-colors ${
                  item.selected
                    ? 'border-[#635BFF]/40 bg-white'
                    : 'border-slate-200 bg-slate-50/70 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#10182B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) =>
                        updateQuestion(item.id, { selected: e.target.checked })
                      }
                      className="rounded accent-[#635BFF]"
                    />
                    Question #{idx + 1}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeQuestion(item.id)}
                    className="p-1 text-slate-400 hover:text-[#EF4444]"
                    aria-label="Remove question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Science Question
                  </label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) =>
                      updateQuestion(item.id, { question: e.target.value })
                    }
                    placeholder="Enter extracted science question..."
                    className="w-full rounded-[9px] border border-slate-200 px-3 py-2 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#64748B] mb-1">
                    Student Answers (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={item.draftExplanation}
                    onChange={(e) =>
                      updateQuestion(item.id, { draftExplanation: e.target.value })
                    }
                    placeholder="Enter or edit student answers to verify (optional)..."
                    className="w-full rounded-[9px] border border-slate-200 px-3 py-2 text-sm text-[#182238] focus:outline-none focus:ring-2 focus:ring-[#635BFF]/20"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Batch Submit Footer */}
        {questions.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[#64748B]">
              {selectedQuestions.length} of {questions.length} question(s) selected for review
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={submitting || selectedQuestions.length === 0}
                onClick={() => handleBatchSubmit(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-[#182238] disabled:opacity-60"
              >
                <Save className="w-4 h-4 text-[#64748B]" />
                Save Selected as Drafts
              </button>
              <button
                type="button"
                disabled={submitting || selectedQuestions.length === 0}
                onClick={() => handleBatchSubmit(false)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] bg-[#635BFF] hover:bg-[#5249F0] text-white text-xs font-medium shadow-sm disabled:opacity-60"
              >
                <Play className="w-4 h-4" />
                {submitting
                  ? 'Submitting...'
                  : `Start Verification (${selectedQuestions.length})`}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
