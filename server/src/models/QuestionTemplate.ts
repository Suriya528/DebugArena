import mongoose, { Document, Schema } from 'mongoose';

export type QuestionType = 'mcq' | 'debugging' | 'coding' | 'sql' | 'aptitude' | 'custom';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type BugCategory =
  | 'off_by_one'
  | 'null_pointer'
  | 'wrong_condition'
  | 'incorrect_loop'
  | 'wrong_operator'
  | 'type_conversion'
  | 'recursion'
  | 'memory_issue'
  | 'concurrency'
  | 'exception_handling';

export interface ITestCase {
  input: string;
  output: string;
  isHidden: boolean;
  weight: number;
}

export interface IQuestionTemplate extends Document {
  collegeId?: mongoose.Types.ObjectId; // null = global library
  eventId?: mongoose.Types.ObjectId;
  roundNumber?: number;
  title: string;
  topic: string;
  language?: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  expectedSolveTimeMinutes: number;
  marks: number;
  skillTags: string[];
  prompt: string;
  explanation?: string;

  // MCQ
  options?: { text: string; isCorrect: boolean }[];

  // Code / Debugging
  allowedLanguages: string[];
  starterCode?: Record<string, string>;
  testCases: ITestCase[];

  // Question DNA & Bug DNA (The Core USP)
  hasDnaMutation: boolean;
  dnaConfig?: {
    bugCategory: BugCategory;
    codeTemplate: string;
    mutationParams: {
      varNames?: string[][]; // [["arr", "nums", "items"], ["target", "key", "val"]]
      numericRanges?: { param: string; min: number; max: number; step: number }[];
      boundaryOps?: string[]; // ["<=", "<"]
    };
    testCaseTemplates?: { inputTemplate: string; expectedFormula?: string }[];
  };

  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema<ITestCase>(
  {
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
    weight: { type: Number, default: 10 }
  },
  { _id: false }
);

const QuestionTemplateSchema = new Schema<IQuestionTemplate>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    roundNumber: { type: Number, index: true },
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true, index: true }, // e.g. "Arrays", "Binary Search", "SQL"
    language: { type: String, default: 'java' },
    type: {
      type: String,
      enum: ['mcq', 'debugging', 'coding', 'sql', 'aptitude', 'custom'],
      required: true,
      default: 'debugging'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    expectedSolveTimeMinutes: { type: Number, default: 15 },
    marks: { type: Number, default: 20 },
    skillTags: { type: [String], default: [] },
    prompt: { type: String, required: true },
    explanation: { type: String, default: '' },

    // MCQ
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, default: false }
      }
    ],

    // Coding / Debugging
    allowedLanguages: { type: [String], default: ['java', 'python', 'cpp', 'javascript'] },
    starterCode: { type: Map, of: String, default: {} },
    testCases: { type: [TestCaseSchema], default: [] },

    // Question DNA & Bug DNA
    hasDnaMutation: { type: Boolean, default: false },
    dnaConfig: {
      bugCategory: {
        type: String,
        enum: [
          'off_by_one',
          'null_pointer',
          'wrong_condition',
          'incorrect_loop',
          'wrong_operator',
          'type_conversion',
          'recursion',
          'memory_issue',
          'concurrency',
          'exception_handling'
        ]
      },
      codeTemplate: { type: String },
      mutationParams: {
        varNames: { type: [[String]], default: [] },
        numericRanges: [
          {
            param: { type: String },
            min: { type: Number },
            max: { type: Number },
            step: { type: Number }
          }
        ],
        boundaryOps: { type: [String], default: [] }
      },
      testCaseTemplates: [
        {
          inputTemplate: { type: String },
          expectedFormula: { type: String }
        }
      ]
    }
  },
  { timestamps: true }
);

export const QuestionTemplate = mongoose.model<IQuestionTemplate>('QuestionTemplate', QuestionTemplateSchema);
