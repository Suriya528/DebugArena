import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAttemptTestCaseResult {
  passed: boolean;
  runtimeMs: number;
  stdout?: string;
  stderr?: string;
  compileError?: string;
  runtimeError?: string;
  timeout?: boolean;
  status: 'passed' | 'failed' | 'compile_error' | 'runtime_error' | 'timeout';
  isHidden: boolean;
  input?: string;
  expected?: string;
  actual?: string;
}

export interface IAttempt extends Document {
  userId: Types.ObjectId;
  roundNumber: number;
  questionId: Types.ObjectId;
  // MCQ
  selectedOption: number | null;
  // Coding
  code: string;
  language: string;
  score: number;
  maxPossibleScore: number;
  testCaseResults: IAttemptTestCaseResult[];
  status: 'unattempted' | 'saved' | 'submitted';
  submissionCount: number;
  lastSavedAt: Date;
  lastSubmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttemptTestCaseResultSchema = new Schema<IAttemptTestCaseResult>(
  {
    passed: { type: Boolean, required: true },
    runtimeMs: { type: Number, default: 0 },
    stdout: { type: String },
    stderr: { type: String },
    compileError: { type: String },
    runtimeError: { type: String },
    timeout: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['passed', 'failed', 'compile_error', 'runtime_error', 'timeout'],
      required: true
    },
    isHidden: { type: Boolean, default: false },
    input: { type: String },
    expected: { type: String },
    actual: { type: String }
  },
  { _id: false }
);

const AttemptSchema = new Schema<IAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundNumber: { type: Number, required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    selectedOption: { type: Number, default: null },
    code: { type: String, default: '' },
    language: { type: String, default: 'python' },
    score: { type: Number, default: 0 },
    maxPossibleScore: { type: Number, default: 0 },
    testCaseResults: [AttemptTestCaseResultSchema],
    status: {
      type: String,
      enum: ['unattempted', 'saved', 'submitted'],
      default: 'unattempted'
    },
    submissionCount: { type: Number, default: 0 },
    lastSavedAt: { type: Date, default: Date.now },
    lastSubmittedAt: { type: Date }
  },
  { timestamps: true }
);

AttemptSchema.index({ userId: 1, roundNumber: 1, questionId: 1 }, { unique: true });

export const Attempt = mongoose.model<IAttempt>('Attempt', AttemptSchema);
