import mongoose, { Document, Schema } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
}

export interface IQuestion extends Document {
  roundNumber: number;
  type: 'mcq' | 'coding';
  orderIndex: number;
  title: string;
  prompt: string;
  marks: number;
  // MCQ specific
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  // Coding specific
  allowedLanguages?: string[];
  starterCode?: Record<string, string>;
  testCases?: ITestCase[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  tags?: string[];
  topic?: string;
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
    roundNumber: { type: Number, required: true, index: true },
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    orderIndex: { type: Number, required: true, default: 0 },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    marks: { type: Number, required: true, default: 10 },
    // MCQ
    options: [{ type: String }],
    correctOptionIndex: { type: Number },
    explanation: { type: String },
    // Coding
    allowedLanguages: [{ type: String }],
    starterCode: { type: Map, of: String, default: {} },
    testCases: [TestCaseSchema],
    timeLimitMs: { type: Number, default: 3000 },
    memoryLimitMb: { type: Number, default: 256 },
    tags: [{ type: String }],
    topic: { type: String, default: 'Algorithms' }
  },
  { timestamps: true }
);

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
