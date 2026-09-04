import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ITieBreakResult {
  userId: Types.ObjectId;
  score: number;
  timeTakenSeconds: number;
  resolvedRank: number;
  submittedAt?: Date;
}

export interface ITieBreak extends Document {
  tiedUserIds: Types.ObjectId[];
  questionId: Types.ObjectId;
  status: 'pending' | 'active' | 'completed';
  durationMinutes: number;
  startedAt: Date | null;
  endedAt: Date | null;
  results: ITieBreakResult[];
  createdAt: Date;
  updatedAt: Date;
}

const TieBreakResultSchema = new Schema<ITieBreakResult>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    resolvedRank: { type: Number, default: 0 },
    submittedAt: { type: Date }
  },
  { _id: false }
);

const TieBreakSchema = new Schema<ITieBreak>(
  {
    tiedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'completed'],
      default: 'pending'
    },
    durationMinutes: { type: Number, default: 15 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    results: [TieBreakResultSchema]
  },
  { timestamps: true }
);

export const TieBreak = mongoose.model<ITieBreak>('TieBreak', TieBreakSchema);
