import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ExtractedPaperQuestion {
  id: string;
  question: string;
  draftExplanation: string;
  selected: boolean;
}

/**
 * Parses numbered questions (e.g. "1.", "Q1.", "Q.1", "Question 1:")
 * and optional "Answer:" / "Explanation:" blocks from question paper text.
 */
export function parseQuestionPaperText(rawText: string): ExtractedPaperQuestion[] {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // Split on lines starting with Q1., Q.1, Q1:, Question 1:, 1., 1), (1)
  const blocks = normalized
    .split(
      /\n(?=(?:Q(?:uestion)?\.?\s*\d+[\.\:\)]?|\(\d+\)|\d+[\.\)])\s+)/i
    )
    .map((b) => b.trim())
    .filter(Boolean);

  const items: ExtractedPaperQuestion[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const cleaned = block
      .replace(/^(?:Q(?:uestion)?\.?\s*\d+[\.\:\)]?|\(\d+\)|\d+[\.\)])\s+/i, '')
      .trim();
    if (cleaned.length < 8) continue;

    // Skip obvious header/title lines like "Final Exam - Biology 101" if there's no question mark and it's the very first block
    if (i === 0 && blocks.length > 1 && !cleaned.includes('?') && cleaned.length < 80) {
      continue;
    }

    const ansMatch = cleaned.match(
      /\n\s*(?:Ans(?:wer)?|Explanation|Solution|Draft)\s*[:\-]\s*([\s\S]+)$/i
    );
    let question = cleaned;
    let draftExplanation = '';

    if (ansMatch && ansMatch.index !== undefined) {
      question = cleaned.slice(0, ansMatch.index).trim();
      draftExplanation = ansMatch[1].trim();
    } else {
      const lines = cleaned
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 1) {
        const qLineIdx = lines.findIndex((l) => l.includes('?'));
        if (qLineIdx !== -1 && qLineIdx < lines.length - 1) {
          question = lines.slice(0, qLineIdx + 1).join(' ');
          draftExplanation = lines.slice(qLineIdx + 1).join(' ');
        } else {
          question = lines[0];
          draftExplanation = lines.slice(1).join(' ');
        }
      }
    }

    items.push({
      id: `qp-${Date.now()}-${i + 1}`,
      question,
      draftExplanation,
      selected: true,
    });
  }

  return items;
}

/**
 * Extracts text from compressed or uncompressed PDFs using pdfjs-dist,
 * preserving line breaks by tracking text item Y-coordinates.
 */
export async function extractTextFromPdfBuffer(buffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    let currentLine = '';
    let lastY: number | null = null;
    const lines: string[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform: number[]; hasEOL?: boolean };
      const y = textItem.transform?.[5] ?? null;

      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine && !currentLine.endsWith(' ') && !textItem.str.startsWith(' ') ? ' ' : '') + textItem.str;
      }

      if (textItem.hasEOL) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
        lastY = null;
      } else {
        lastY = y;
      }
    }

    if (currentLine.trim()) lines.push(currentLine.trim());
    pageTexts.push(lines.join('\n'));
  }

  return pageTexts.join('\n\n').trim();
}
