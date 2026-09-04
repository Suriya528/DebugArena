import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICodeMilestone extends Document {
  userId: Types.ObjectId;
  questionId: Types.ObjectId;
  roundNumber: number;
  code: string;
  language: string;
  timestamp: Date;
  eventType: 'run' | 'submit' | 'autosave' | 'paste';
  passedTestsCount: number;
  totalTestsCount: number;
  charDelta?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const CodeMilestoneSchema = new Schema<ICodeMilestone>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
    roundNumber: { type: Number, required: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    eventType: {
      type: String,
      enum: ['run', 'submit', 'autosave', 'paste'],
      default: 'run'
    },
    passedTestsCount: { type: Number, default: 0 },
    totalTestsCount: { type: Number, default: 0 },
    charDelta: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CodeMilestoneSchema.index({ userId: 1, questionId: 1, timestamp: 1 });

export const CodeMilestone = mongoose.model<ICodeMilestone>('CodeMilestone', CodeMilestoneSchema);
