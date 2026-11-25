export type UserRole = 'Author' | 'Reviewer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
  department: string;
  avatarUrl?: string;
  initials: string;
}

export type AcademicSubject =
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Mathematics'
  | 'Computer Science'
  | 'Environmental Science'
  | 'Other';

export type AcademicLevel =
  | 'School'
  | 'Undergraduate'
  | 'Postgraduate'
  | 'Research';

export type AgentKey = 'analyze' | 'retrieve' | 'verify' | 'review' | 'correct';

export type AgentStatus = 'Pending' | 'Running' | 'Completed' | 'Failed';

export type ReviewOverallStatus =
  | 'Draft'
  | 'Processing'
  | 'Completed'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Rejected'
  | 'Changes Requested'
  | 'Failed';

export type ClaimVerificationStatus =
  | 'Supported'
  | 'Contradicted'
  | 'Insufficient Evidence';

export type DocumentProcessingStatus =
  | 'Uploaded'
  | 'Text Extracted'
  | 'Indexed'
  | 'Ready';

export interface AgentStageState {
  key: AgentKey;
  order: number;
  name: string;
  shortLabel: string;
  description: string;
  status: AgentStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  outputSummary?: string;
  outputDetails?: Record<string, unknown>;
  errorMessage?: string;
}

export interface ClaimVerification {
  id: string;
  claimText: string;
  status: ClaimVerificationStatus;
  explanation: string;
  supportingEvidence: string;
  citation: string;
  confidenceScore?: number;
}

export interface DetectedErrors {
  incorrectFacts: string[];
  unsupportedStatements: string[];
  missingConcepts: string[];
  grammarAndClarity: string[];
}

export interface CorrectionNote {
  id: string;
  originalStatement: string;
  identifiedIssue: string;
  correctedStatement: string;
  reason: string;
}

export interface SupportingReference {
  id: string;
  sourceTitle: string;
  sourceType: 'Academic PDF' | 'Tavily Web Search' | 'Reference Fact';
  relevantPassage: string;
  pageNumber?: number;
  sourceUrl?: string;
  retrievalDate: string;
  relevanceScore?: number;
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  agent: AgentKey | 'system';
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface ReviewResults {
  summary: {
    totalClaims: number;
    supportedClaims: number;
    contradictedClaims: number;
    insufficientEvidenceClaims: number;
    detectedMissingConcepts: number;
  };
  claims: ClaimVerification[];
  detectedErrors: DetectedErrors;
  correctedExplanation: string;
  highlightedChanges: Array<{
    original: string;
    corrected: string;
  }>;
  correctionNotes: CorrectionNote[];
  supportingReferences: SupportingReference[];
}

export interface ReviewerDecision {
  decision: 'Approved' | 'Rejected' | 'Changes Requested';
  reviewerName: string;
  reviewerEmail: string;
  timestamp: string;
  comments?: string;
  rejectionReason?: string;
  version: number;
}

export interface AcademicReview {
  id: string;
  question: string;
  draftExplanation: string;
  referenceFacts?: string;
  subject: AcademicSubject;
  level: AcademicLevel;
  authorName: string;
  authorEmail: string;
  submittedAt: string;
  lastUpdated: string;
  status: ReviewOverallStatus;
  version: number;
  attachedDocumentIds: string[];
  attachedDocumentNames: string[];
  currentAgent: AgentKey | null;
  progressPercent: number;
  agents: AgentStageState[];
  logs: ExecutionLogEntry[];
  results?: ReviewResults;
  reviewerName?: string;
  reviewerComments?: string;
  rejectionReason?: string;
  approvedAt?: string;
  decisionHistory: ReviewerDecision[];
  errorMessage?: string;
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  fileSizeBytes: number;
  fileType: 'Textbook' | 'Research Paper' | 'Reference PDF' | 'Lecture Notes';
  uploadedAt: string;
  uploadedBy: string;
  status: DocumentProcessingStatus;
  pageCount?: number;
  chunkCount?: number;
  subject?: AcademicSubject;
}

export interface TavilySource {
  id: string;
  domain: string;
  title: string;
  url: string;
  snippet: string;
  retrievedAt: string;
  usedInReviewId: string;
  trustTier: 'Peer-Reviewed' | 'Academic Institution' | 'Preprint' | 'Reference';
}

export interface PublicationItem {
  id: string;
  reviewId: string;
  question: string;
  subject: AcademicSubject;
  level: AcademicLevel;
  authorName: string;
  reviewerName: string;
  publishedAt: string;
  approvedAt: string;
  version: number;
  verifiedStatus: 'Human Approved & Verified';
  finalExplanation: string;
  originalExplanation: string;
  correctionNotes: CorrectionNote[];
  supportingReferences: SupportingReference[];
  versionHistory: Array<{
    version: number;
    timestamp: string;
    actor: string;
    note: string;
  }>;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export interface CreateReviewPayload {
  question: string;
  draftExplanation: string;
  referenceFacts?: string;
  subject: AcademicSubject;
  level: AcademicLevel;
  documentIds: string[];
  saveAsDraft?: boolean;
}

export interface ProfessorQuestionPaper {
  id: string;
  filename: string;
  subject: AcademicSubject;
  level: AcademicLevel;
  uploadedBy: string;
  uploadedAt: string;
  pdfDataUrl?: string;
  questions: Array<{ id: string; question: string }>;
}
