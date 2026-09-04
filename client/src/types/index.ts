export type UserRole =
  | 'participant'
  | 'admin'
  | 'super_admin'
  | 'college_admin'
  | 'event_coordinator'
  | 'question_manager'
  | 'result_reviewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  collegeId?: string;
  eventId?: string;
  department?: string;
  year?: string;
  regNo?: string;
  isDisqualified?: boolean;
  disqualificationReason?: string;
}

export interface College {
  _id: string;
  name: string;
  code: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  contactEmail?: string;
  website?: string;
  createdAt: string;
}

export interface Event {
  _id: string;
  collegeId: string | College;
  name: string;
  code: string;
  description: string;
  bannerUrl?: string;
  status: 'draft' | 'registration' | 'ready' | 'live' | 'frozen' | 'completed';
  rules: string[];
  scoringConfig: {
    negativeMarking: boolean;
    tieBreakerPriority: ('codingScore' | 'debuggingScore' | 'totalTime' | 'earliestSubmit')[];
    autoSubmitOnTimeUp: boolean;
    violationLimit: number;
    autoSubmitOnViolation: boolean;
  };
  branding: {
    customTitle?: string;
    certificateTitle?: string;
    signatoryName?: string;
    signatoryTitle?: string;
  };
  createdAt: string;
}

export interface DynamicRound {
  _id: string;
  eventId: string;
  roundNumber: number;
  title: string;
  description: string;
  type: 'mcq' | 'debugging' | 'coding' | 'sql' | 'aptitude' | 'custom';
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarkValue: number;
  status: 'pending' | 'active' | 'locked' | 'completed';
  startedAt: string | null;
  endedAt?: string | null;
  isFrozen?: boolean;
}

export interface AuditLog {
  _id: string;
  adminId: string;
  adminUsername: string;
  collegeId?: string;
  eventId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface Competition {
  title: string;
  status: 'not_started' | 'active' | 'paused' | 'ended';
  currentRoundNumber: number;
  violationLimit: number;
  autoSubmitOnViolation: boolean;
}

export interface Round {
  roundNumber: number;
  title: string;
  description: string;
  type: 'mcq' | 'coding';
  durationMinutes: number;
  status: 'pending' | 'active' | 'locked' | 'completed';
  startedAt: string | null;
  remainingSeconds: number;
}

export interface TestCase {
  input?: string;
  expectedOutput?: string;
  isHidden: boolean;
  weight: number;
}

export interface Question {
  _id: string;
  roundNumber: number;
  type: 'mcq' | 'coding';
  orderIndex: number;
  title: string;
  prompt: string;
  marks: number;
  // MCQ
  options?: string[];
  // Coding
  allowedLanguages?: string[];
  starterCode?: Record<string, string>;
  testCases?: TestCase[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
}

export interface TestCaseResult {
  testNumber: number;
  passed: boolean;
  status: 'passed' | 'failed' | 'compile_error' | 'runtime_error' | 'timeout';
  runtimeMs: number;
  isHidden: boolean;
  input?: string;
  expected?: string;
  actual?: string;
  compileError?: string;
  runtimeError?: string;
}

export interface Attempt {
  questionId: string;
  selectedOption?: number | null;
  code?: string;
  language?: string;
  score?: number;
  status?: 'unattempted' | 'saved' | 'submitted';
  lastSavedAt?: string;
  testCaseResults?: TestCaseResult[];
}

export interface RoundProgress {
  status: 'not_started' | 'in_progress' | 'submitted' | 'advanced' | 'eliminated';
  totalScore: number;
  markedForReview: string[];
  violationCount: number;
  timeTakenSeconds: number;
}

export interface RoundResultRow {
  rank: number;
  userId: {
    _id: string;
    username: string;
    name: string;
    isDisqualified?: boolean;
    disqualificationReason?: string;
  };
  totalScore: number;
  timeTakenSeconds: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'advanced' | 'eliminated';
  submittedAt?: string;
  violationCount: number;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  name: string;
  isDisqualified: boolean;
  r1Score: number;
  r2Score: number;
  r3Score: number;
  totalScore: number;
  totalTimeTaken: number;
  totalTimeSeconds: number;
  lastStatus: string;
  tieBreakRank?: number;
}
