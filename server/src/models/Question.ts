import mongoose, { Document, Schema } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
}

export interface IQuestion extends Document {
  templateId?: mongoose.Types.ObjectId;
  collegeId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  roundNumber: number;
  type: 'mcq' | 'coding' | 'sql' | 'debugging' | 'aptitude' | 'custom';
  codingMode?: 'standard' | 'debug';
  orderIndex: number;
  title: string;
  prompt: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  marks: number;
  // MCQ specific
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  // Coding specific
  allowedLanguages?: string[];
  starterCode?: Record<string, string>;
  solutionCode?: Record<string, string>;
  testCases?: ITestCase[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  tags?: string[];
  topic?: string;
  fingerprint?: string;
  status: 'draft' | 'validated' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, default: '' },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: false },
    weight: { type: Number, required: true, default: 10 }
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    templateId: { type: Schema.Types.ObjectId, ref: 'QuestionTemplate', index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    roundNumber: { type: Number, required: true, index: true },
    type: {
      type: String,
      enum: ['mcq', 'coding', 'sql', 'debugging', 'aptitude', 'custom'],
      required: true
    },
    codingMode: {
      type: String,
      enum: ['standard', 'debug'],
      default: 'standard',
      index: true
    },
    orderIndex: { type: Number, required: true, default: 0 },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    inputFormat: { type: String, default: '' },
    outputFormat: { type: String, default: '' },
    constraints: { type: String, default: '' },
    marks: { type: Number, required: true, default: 10 },
    // MCQ
    options: [{ type: String }],
    correctOptionIndex: { type: Number },
    explanation: { type: String },
    // Coding
    allowedLanguages: [{ type: String }],
    starterCode: { type: Map, of: String, default: {} },
    solutionCode: { type: Map, of: String, default: {} },
    testCases: [TestCaseSchema],
    timeLimitMs: { type: Number, default: 3000 },
    memoryLimitMb: { type: Number, default: 256 },
    tags: [{ type: String }],
    topic: { type: String, default: 'Algorithms' },
    fingerprint: { type: String, index: true },
    status: {
      type: String,
      enum: ['draft', 'validated', 'published', 'archived'],
      default: 'published',
      index: true
    }
  },
  {
    timestamps: true,
    toObject: { flattenMaps: true },
    toJSON: { flattenMaps: true }
  }
);

// Participant question retrieval is always scoped to an event/round and
// ordered by this stable display sequence. `_id` is included as a deterministic
// tie-breaker for older records that happened to share an orderIndex.
QuestionSchema.index({ eventId: 1, roundNumber: 1, orderIndex: 1, _id: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
