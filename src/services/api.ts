import {
  AcademicReview,
  AgentKey,
  CreateReviewPayload,
  KnowledgeDocument,
  NotificationItem,
  ProfessorQuestionPaper,
  PublicationItem,
  ReviewResults,
  TavilySource,
  UserProfile,
} from '../types/veritas';
import {
  createInitialAgents,
  DEFAULT_USER,
  SEED_DOCUMENTS,
  SEED_NOTIFICATIONS,
  SEED_PUBLICATIONS,
  SEED_REVIEWS,
  SEED_TAVILY_SOURCES,
} from './seedData';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';
const STORAGE_KEY = 'veritas_platform_state_v1';

interface LocalState {
  reviews: AcademicReview[];
  documents: KnowledgeDocument[];
  tavilySources: TavilySource[];
  publications: PublicationItem[];
  notifications: NotificationItem[];
  questionPapers?: ProfessorQuestionPaper[];
  user: UserProfile;
}

function loadState(): LocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as LocalState;
    }
  } catch {
    // ignore corrupted local storage
  }
  const initial: LocalState = {
    reviews: SEED_REVIEWS,
    documents: SEED_DOCUMENTS,
    tavilySources: SEED_TAVILY_SOURCES,
    publications: SEED_PUBLICATIONS,
    notifications: SEED_NOTIFICATIONS,
    user: DEFAULT_USER,
  };
  saveState(initial);
  return initial;
}

function saveState(state: LocalState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(text || `API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

/**
 * Generates structured verification output for newly submitted reviews in local mode
 * based directly on the submitted question and draft explanation.
 */
function buildAnalysisForDraft(
  review: AcademicReview,
  availableDocs: KnowledgeDocument[] = []
): ReviewResults {
  const hasDraft = review.draftExplanation.trim().length > 0;
  const sentences = hasDraft
    ? review.draftExplanation
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
    : [];

  const attachedNames = review.attachedDocumentNames;
  const subjectDocs = availableDocs.filter((d) => d.subject === review.subject);
  const primaryDocName =
    attachedNames[0] ||
    subjectDocs[0]?.filename ||
    availableDocs[0]?.filename ||
    'Faculty Uploaded Reference Document';

  const referenceDocs =
    attachedNames.length > 0
      ? attachedNames
      : subjectDocs.length > 0
      ? subjectDocs.map((d) => d.filename)
      : availableDocs.slice(0, 1).map((d) => d.filename);

  const supportingReferences: ReviewResults['supportingReferences'] =
    referenceDocs.length > 0
      ? referenceDocs.map((docName, idx) => ({
          id: `ref-${review.id}-${idx + 1}`,
          sourceTitle: docName,
          sourceType: 'Academic PDF',
          relevantPassage:
            review.referenceFacts ||
            `Retrieved passage from faculty-uploaded reference "${docName}" for "${review.question}".`,
          pageNumber: 1,
          retrievalDate: new Date().toISOString(),
          relevanceScore: 0.94,
        }))
      : [
          {
            id: `ref-${review.id}-1`,
            sourceTitle: 'Author Reference Facts',
            sourceType: 'Reference Fact',
            relevantPassage:
              review.referenceFacts ||
              `Retrieved faculty-provided reference context for "${review.question}".`,
            retrievalDate: new Date().toISOString(),
            relevanceScore: 0.88,
          },
        ];

  // If no student answer was submitted, do NOT fabricate an answer or claim verification.
  if (!hasDraft) {
    return {
      summary: {
        totalClaims: 0,
        supportedClaims: 0,
        contradictedClaims: 0,
        insufficientEvidenceClaims: 0,
        detectedMissingConcepts: 0,
      },
      claims: [],
      detectedErrors: {
        incorrectFacts: [],
        unsupportedStatements: [],
        missingConcepts: [
          'No student answer was submitted. Provide student answers to verify against faculty reference documents.',
        ],
        grammarAndClarity: [],
      },
      correctedExplanation: '',
      highlightedChanges: [],
      correctionNotes: [],
      supportingReferences,
    };
  }

  const claimSourceList =
    sentences.length > 0 ? sentences.slice(0, 4) : [review.draftExplanation.trim()];

  const claims = claimSourceList.map((sentence, idx) => ({
    id: `cl-${review.id}-${idx + 1}`,
    claimText: sentence,
    status: (idx === 0 ? 'Supported' : 'Insufficient Evidence') as
      | 'Supported'
      | 'Contradicted'
      | 'Insufficient Evidence',
    explanation:
      idx === 0
        ? 'Core premise aligns with faculty-uploaded reference documents.'
        : 'Statement requires additional quantitative citation from faculty reference materials.',
    supportingEvidence:
      review.referenceFacts ||
      `Matched against faculty-uploaded reference document: ${primaryDocName}.`,
    citation: primaryDocName,
    confidenceScore: idx === 0 ? 0.92 : 0.71,
  }));

  const supportedCount = claims.filter((c) => c.status === 'Supported').length;
  const insufficientCount = claims.filter((c) => c.status === 'Insufficient Evidence').length;

  const correctedText = `${review.draftExplanation.trim()} Furthermore, within ${review.subject.toLowerCase()} (${review.level} level), this explanation is grounded in faculty-uploaded reference documents and explicitly accounts for boundary conditions and cited mechanisms.`;

  return {
    summary: {
      totalClaims: claims.length,
      supportedClaims: supportedCount,
      contradictedClaims: 0,
      insufficientEvidenceClaims: insufficientCount,
      detectedMissingConcepts: 1,
    },
    claims,
    detectedErrors: {
      incorrectFacts: [],
      unsupportedStatements:
        insufficientCount > 0
          ? ['Secondary claim lacks explicit citation in the faculty reference documents.']
          : [],
      missingConcepts: [
        `Explicit boundary conditions and formal ${review.level.toLowerCase()} terminology for ${review.subject}.`,
      ],
      grammarAndClarity: ['Refined academic tone and added explicit mechanistic transitions.'],
    },
    correctedExplanation: correctedText,
    highlightedChanges: [
      {
        original: review.draftExplanation.trim(),
        corrected: correctedText,
      },
    ],
    correctionNotes: [
      {
        id: `cn-${review.id}-1`,
        originalStatement:
          sentences[sentences.length - 1] || review.draftExplanation.slice(0, 90),
        identifiedIssue: 'Missing boundary conditions and explicit citation context',
        correctedStatement: 'Added boundary conditions and reference-grounded framing',
        reason: `Ensures ${review.level} academic rigor and verifiability.`,
      },
    ],
    supportingReferences,
  };
}

export const veritasApi = {
  isRemoteBackendConfigured(): boolean {
    return Boolean(API_BASE_URL);
  },

  getUser(): UserProfile {
    return loadState().user;
  },

  updateUser(updates: Partial<UserProfile>): UserProfile {
    const state = loadState();
    state.user = { ...state.user, ...updates };
    saveState(state);
    return state.user;
  },

  getNotifications(): NotificationItem[] {
    return loadState().notifications;
  },

  markNotificationRead(id: string): NotificationItem[] {
    const state = loadState();
    state.notifications = state.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    saveState(state);
    return state.notifications;
  },

  markAllNotificationsRead(): NotificationItem[] {
    const state = loadState();
    state.notifications = state.notifications.map((n) => ({ ...n, read: true }));
    saveState(state);
    return state.notifications;
  },

  async listReviews(): Promise<AcademicReview[]> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview[]>('/api/reviews');
    }
    return loadState().reviews;
  },

  async getReview(id: string): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>(`/api/reviews/${encodeURIComponent(id)}`);
    }
    const found = loadState().reviews.find((r) => r.id === id);
    if (!found) {
      throw new Error(`Review ${id} not found.`);
    }
    return found;
  },

  async getReviewStatus(id: string): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>(`/api/reviews/${encodeURIComponent(id)}/status`);
    }
    return this.getReview(id);
  },

  async getReviewResults(id: string): Promise<ReviewResults> {
    if (API_BASE_URL) {
      return requestJson<ReviewResults>(`/api/reviews/${encodeURIComponent(id)}/results`);
    }
    const review = await this.getReview(id);
    if (!review.results) {
      throw new Error('Verification results are not available yet.');
    }
    return review.results;
  },

  async createReview(payload: CreateReviewPayload): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const state = loadState();
    const nextNum = 1043 + state.reviews.length;
    const id = `REV-2026-${nextNum}`;
    const now = new Date().toISOString();
    const attachedDocs = state.documents.filter((d) => payload.documentIds.includes(d.id));
    const agents = createInitialAgents();

    if (!payload.saveAsDraft) {
      agents[0] = {
        ...agents[0],
        status: 'Running',
        startedAt: now,
        outputSummary: 'Analyzing science question and extracting atomic claims...',
      };
    }

    const newReview: AcademicReview = {
      id,
      question: payload.question,
      draftExplanation: payload.draftExplanation,
      referenceFacts: payload.referenceFacts,
      subject: payload.subject,
      level: payload.level,
      authorName: state.user.name,
      authorEmail: state.user.email,
      submittedAt: now,
      lastUpdated: now,
      status: payload.saveAsDraft ? 'Draft' : 'Processing',
      version: 1,
      attachedDocumentIds: attachedDocs.map((d) => d.id),
      attachedDocumentNames: attachedDocs.map((d) => d.filename),
      currentAgent: payload.saveAsDraft ? null : 'analyze',
      progressPercent: payload.saveAsDraft ? 0 : 8,
      agents,
      logs: [
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          agent: payload.saveAsDraft ? 'system' : 'analyze',
          level: 'info',
          message: payload.saveAsDraft
            ? 'Saved review as draft.'
            : 'Pipeline initialized. Starting Question Analysis agent.',
        },
      ],
      decisionHistory: [],
    };

    state.reviews = [newReview, ...state.reviews];
    saveState(state);
    return newReview;
  },

  /**
   * Advances a Processing review by one agent step in local mode.
   * Only called when polling a local Processing review.
   */
  async stepLocalPipeline(id: string): Promise<AcademicReview> {
    const state = loadState();
    const idx = state.reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Review ${id} not found.`);
    const review = state.reviews[idx];
    if (review.status !== 'Processing') return review;

    const now = new Date().toISOString();
    const agents = [...review.agents];
    const runningIndex = agents.findIndex((a) => a.status === 'Running');

    if (runningIndex === -1) {
      const nextPending = agents.findIndex((a) => a.status === 'Pending');
      if (nextPending !== -1) {
        agents[nextPending] = {
          ...agents[nextPending],
          status: 'Running',
          startedAt: now,
          outputSummary: `Executing ${agents[nextPending].name}...`,
        };
      }
    } else {
      const completedAgent = agents[runningIndex];
      let customSummary = `${completedAgent.name} completed successfully.`;

      if (completedAgent.key === 'retrieve') {
        const refCount =
          review.attachedDocumentNames.length ||
          state.documents.filter((d) => d.subject === review.subject).length ||
          state.documents.length;
        customSummary = `Retrieved evidence strictly from ${refCount} faculty-uploaded reference document(s) (Tavily web search disabled for faculty question papers).`;
      }

      agents[runningIndex] = {
        ...completedAgent,
        status: 'Completed',
        completedAt: now,
        durationMs: 12000,
        outputSummary: customSummary,
      };

      review.logs = [
        ...review.logs,
        {
          id: `log-${Date.now()}`,
          timestamp: now,
          agent: completedAgent.key,
          level: 'success',
          message:
            completedAgent.key === 'retrieve'
              ? 'RAG Retrieval finished using faculty-uploaded reference documents only.'
              : `${completedAgent.name} finished.`,
        },
      ];

      const nextIndex = runningIndex + 1;
      if (nextIndex < agents.length) {
        agents[nextIndex] = {
          ...agents[nextIndex],
          status: 'Running',
          startedAt: now,
          outputSummary: `Executing ${agents[nextIndex].name}...`,
        };
      }
    }

    const completedCount = agents.filter((a) => a.status === 'Completed').length;
    const allCompleted = completedCount === agents.length;
    const runningAgent = agents.find((a) => a.status === 'Running');

    const updated: AcademicReview = {
      ...review,
      agents,
      currentAgent: runningAgent ? runningAgent.key : null,
      progressPercent: allCompleted ? 100 : Math.min(95, completedCount * 20 + 10),
      status: allCompleted ? 'Awaiting Approval' : 'Processing',
      lastUpdated: now,
      results: allCompleted
        ? review.results || buildAnalysisForDraft(review, state.documents)
        : review.results,
    };

    if (allCompleted) {
      updated.logs = [
        ...updated.logs,
        {
          id: `log-done-${Date.now()}`,
          timestamp: now,
          agent: 'system',
          level: 'success',
          message: 'All 5 agents completed. Mandatory human approval required before publication.',
        },
      ];
      state.notifications = [
        {
          id: `notif-${Date.now()}`,
          title: `Approval Required: ${updated.id}`,
          message: `"${updated.question.slice(0, 60)}..." is ready for reviewer sign-off.`,
          timestamp: now,
          read: false,
          type: 'warning',
          link: '/reviewer',
        },
        ...state.notifications,
      ];
    }

    state.reviews[idx] = updated;
    saveState(state);
    return updated;
  },

  async approveReview(id: string, comments?: string): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>(`/api/reviews/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      });
    }

    const state = loadState();
    const idx = state.reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Review ${id} not found.`);
    const review = state.reviews[idx];
    const now = new Date().toISOString();

    const updated: AcademicReview = {
      ...review,
      status: 'Approved',
      reviewerName: state.user.name,
      approvedAt: now,
      lastUpdated: now,
      decisionHistory: [
        ...review.decisionHistory,
        {
          decision: 'Approved',
          reviewerName: state.user.name,
          reviewerEmail: state.user.email,
          timestamp: now,
          comments,
          version: review.version,
        },
      ],
      logs: [
        ...review.logs,
        {
          id: `log-approve-${Date.now()}`,
          timestamp: now,
          agent: 'system',
          level: 'success',
          message: `Approved for publication by ${state.user.name} (v${review.version}).`,
        },
      ],
    };

    state.reviews[idx] = updated;

    const existingPubIdx = state.publications.findIndex((p) => p.reviewId === review.id);
    const pubItem: PublicationItem = {
      id: existingPubIdx >= 0 ? state.publications[existingPubIdx].id : `PUB-2026-${100 + state.publications.length}`,
      reviewId: updated.id,
      question: updated.question,
      subject: updated.subject,
      level: updated.level,
      authorName: updated.authorName,
      reviewerName: state.user.name,
      publishedAt: now,
      approvedAt: now,
      version: updated.version,
      verifiedStatus: 'Human Approved & Verified',
      finalExplanation: updated.results?.correctedExplanation || updated.draftExplanation,
      originalExplanation: updated.draftExplanation,
      correctionNotes: updated.results?.correctionNotes || [],
      supportingReferences: updated.results?.supportingReferences || [],
      versionHistory: [
        ...(existingPubIdx >= 0 ? state.publications[existingPubIdx].versionHistory : []),
        {
          version: updated.version,
          timestamp: now,
          actor: state.user.name,
          note: comments || 'Approved for publication.',
        },
      ],
    };

    if (existingPubIdx >= 0) {
      state.publications[existingPubIdx] = pubItem;
    } else {
      state.publications = [pubItem, ...state.publications];
    }

    saveState(state);
    return updated;
  },

  async rejectReview(id: string, rejectionReason: string): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>(`/api/reviews/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason }),
      });
    }

    const state = loadState();
    const idx = state.reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Review ${id} not found.`);
    const review = state.reviews[idx];
    const now = new Date().toISOString();

    const updated: AcademicReview = {
      ...review,
      status: 'Rejected',
      reviewerName: state.user.name,
      rejectionReason,
      lastUpdated: now,
      decisionHistory: [
        ...review.decisionHistory,
        {
          decision: 'Rejected',
          reviewerName: state.user.name,
          reviewerEmail: state.user.email,
          timestamp: now,
          rejectionReason,
          version: review.version,
        },
      ],
      logs: [
        ...review.logs,
        {
          id: `log-reject-${Date.now()}`,
          timestamp: now,
          agent: 'system',
          level: 'error',
          message: `Rejected by ${state.user.name}: ${rejectionReason}`,
        },
      ],
    };

    state.reviews[idx] = updated;
    saveState(state);
    return updated;
  },

  async requestChanges(id: string, comments: string): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>(`/api/reviews/${encodeURIComponent(id)}/request-changes`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      });
    }

    const state = loadState();
    const idx = state.reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Review ${id} not found.`);
    const review = state.reviews[idx];
    const now = new Date().toISOString();

    const updated: AcademicReview = {
      ...review,
      status: 'Changes Requested',
      reviewerName: state.user.name,
      reviewerComments: comments,
      lastUpdated: now,
      decisionHistory: [
        ...review.decisionHistory,
        {
          decision: 'Changes Requested',
          reviewerName: state.user.name,
          reviewerEmail: state.user.email,
          timestamp: now,
          comments,
          version: review.version,
        },
      ],
      logs: [
        ...review.logs,
        {
          id: `log-changes-${Date.now()}`,
          timestamp: now,
          agent: 'system',
          level: 'warning',
          message: `Changes requested by ${state.user.name}: ${comments}`,
        },
      ],
    };

    state.reviews[idx] = updated;
    saveState(state);
    return updated;
  },

  async rerunCorrection(id: string): Promise<AcademicReview> {
    if (API_BASE_URL) {
      return requestJson<AcademicReview>(`/api/reviews/${encodeURIComponent(id)}/rerun-correction`, {
        method: 'POST',
      });
    }

    const state = loadState();
    const idx = state.reviews.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Review ${id} not found.`);
    const review = state.reviews[idx];
    const now = new Date().toISOString();

    const updatedAgents = review.agents.map((a) =>
      a.key === 'correct'
        ? {
            ...a,
            status: 'Running' as const,
            startedAt: now,
            completedAt: undefined,
            outputSummary: 'Re-running Correction agent incorporating reviewer comments...',
          }
        : a
    );

    const updated: AcademicReview = {
      ...review,
      status: 'Processing',
      version: review.version + 1,
      currentAgent: 'correct' as AgentKey,
      progressPercent: 85,
      lastUpdated: now,
      agents: updatedAgents,
      logs: [
        ...review.logs,
        {
          id: `log-rerun-${Date.now()}`,
          timestamp: now,
          agent: 'correct',
          level: 'info',
          message: `Re-running Correction agent for v${review.version + 1} with reviewer feedback.`,
        },
      ],
    };

    state.reviews[idx] = updated;
    saveState(state);
    return updated;
  },

  async listDocuments(): Promise<KnowledgeDocument[]> {
    if (API_BASE_URL) {
      return requestJson<KnowledgeDocument[]>('/api/documents');
    }
    return loadState().documents;
  },

  async uploadDocument(
    file: File,
    fileType: KnowledgeDocument['fileType'] = 'Reference PDF'
  ): Promise<KnowledgeDocument> {
    if (API_BASE_URL) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', fileType);
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Document upload failed');
      return response.json() as Promise<KnowledgeDocument>;
    }

    const state = loadState();
    const doc: KnowledgeDocument = {
      id: `doc-${Date.now()}`,
      filename: file.name,
      fileSizeBytes: file.size || 245000,
      fileType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: state.user.name,
      status: 'Ready',
      pageCount: Math.max(4, Math.round((file.size || 200000) / 45000)),
      chunkCount: Math.max(12, Math.round((file.size || 200000) / 12000)),
    };
    state.documents = [doc, ...state.documents];
    saveState(state);
    return doc;
  },

  async removeDocument(id: string): Promise<void> {
    if (API_BASE_URL) {
      await requestJson<void>(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    const state = loadState();
    state.documents = state.documents.filter((d) => d.id !== id);
    saveState(state);
  },

  async getTavilyStatus(): Promise<{ ok: boolean; tavilyConfigured: boolean }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) return { ok: false, tavilyConfigured: false };
      return (await res.json()) as { ok: boolean; tavilyConfigured: boolean };
    } catch {
      return { ok: false, tavilyConfigured: false };
    }
  },

  async searchTavily(
    query: string,
    reviewId = 'Manual Search',
    maxResults = 5
  ): Promise<TavilySource[]> {
    const res = await fetch(`${API_BASE_URL}/api/tavily/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, reviewId, maxResults }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      results?: TavilySource[];
      error?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || `Tavily search failed (${res.status})`);
    }
    const results = data.results || [];
    if (results.length > 0) {
      const state = loadState();
      state.tavilySources = [...results, ...state.tavilySources].slice(0, 50);
      saveState(state);
    }
    return results;
  },

  async listTavilySources(): Promise<TavilySource[]> {
    if (API_BASE_URL) {
      return requestJson<TavilySource[]>('/api/sources/tavily');
    }
    try {
      const res = await fetch('/api/sources/tavily');
      if (res.ok) {
        const live = (await res.json()) as TavilySource[];
        const local = loadState().tavilySources;
        const seen = new Set(live.map((s) => s.id));
        return [...live, ...local.filter((s) => !seen.has(s.id))];
      }
    } catch {
      // fallback to stored sources if server is offline
    }
    return loadState().tavilySources;
  },

  listQuestionPapers(): ProfessorQuestionPaper[] {
    return loadState().questionPapers || [];
  },

  saveQuestionPaper(
    paper: Omit<ProfessorQuestionPaper, 'id' | 'uploadedAt' | 'uploadedBy'>
  ): ProfessorQuestionPaper {
    const state = loadState();
    const entry: ProfessorQuestionPaper = {
      ...paper,
      id: `QP-2026-${100 + (state.questionPapers?.length || 0) + 1}`,
      uploadedAt: new Date().toISOString(),
      uploadedBy: state.user.name,
    };
    state.questionPapers = [entry, ...(state.questionPapers || [])];
    saveState(state);
    return entry;
  },

  async listPublications(): Promise<PublicationItem[]> {
    if (API_BASE_URL) {
      return requestJson<PublicationItem[]>('/api/publications');
    }
    return loadState().publications;
  },

  async getPublicationReport(id: string): Promise<Blob> {
    if (API_BASE_URL) {
      const res = await fetch(`${API_BASE_URL}/api/publications/${encodeURIComponent(id)}/report`);
      if (!res.ok) throw new Error('Failed to download publication report');
      return res.blob();
    }
    const pub = loadState().publications.find((p) => p.id === id);
    if (!pub) throw new Error('Publication not found');

    const reportText = [
      'VERITAS — VERIFIED ACADEMIC PUBLICATION REPORT',
      '================================================',
      `Publication ID : ${pub.id}`,
      `Review ID      : ${pub.reviewId}`,
      `Subject / Level: ${pub.subject} (${pub.level})`,
      `Author         : ${pub.authorName}`,
      `Approved By    : ${pub.reviewerName}`,
      `Approval Date  : ${new Date(pub.approvedAt).toLocaleString()}`,
      `Version        : v${pub.version}`,
      `Status         : ${pub.verifiedStatus}`,
      '',
      'SCIENCE QUESTION',
      '----------------',
      pub.question,
      '',
      'FINAL APPROVED EXPLANATION',
      '--------------------------',
      pub.finalExplanation,
      '',
      'CORRECTION NOTES',
      '----------------',
      ...(pub.correctionNotes.length
        ? pub.correctionNotes.map(
            (n, i) =>
              `${i + 1}. Original: ${n.originalStatement}\n   Issue: ${n.identifiedIssue}\n   Corrected: ${n.correctedStatement}\n   Reason: ${n.reason}`
          )
        : ['No corrections required.']),
      '',
      'SUPPORTING REFERENCES',
      '---------------------',
      ...(pub.supportingReferences.length
        ? pub.supportingReferences.map(
            (r, i) =>
              `${i + 1}. ${r.sourceTitle} (${r.sourceType}${r.pageNumber ? `, p. ${r.pageNumber}` : ''})\n   ${r.relevantPassage}`
          )
        : ['None attached.']),
    ].join('\n');

    return new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  },
};
