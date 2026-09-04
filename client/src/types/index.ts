export interface User {
  id: string;
  username: string;
  name: string;
  role: 'participant' | 'admin';
  isDisqualified?: boolean;
  disqualificationReason?: string;
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
  r1Time: number;
  r2Time: number;
  r3Time: number;
  totalTimeSeconds: number;
  tieBreakRankOffset: number;
  lastStatus: string;
}
