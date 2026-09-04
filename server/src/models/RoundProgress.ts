import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRoundProgress extends Document {
  userId: Types.ObjectId;
  roundNumber: number;
  totalScore: number;
  timeTakenSeconds: number;
  status: 'not_started' | 'in_progress' | 'submitted' | 'advanced' | 'eliminated';
  startedAt: Date | null;
  submittedAt: Date | null;
  markedForReview: Types.ObjectId[];
  violationCount: number;
  suspicionScore: number;
  suspicionLevel: 'low' | 'elevated' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

const RoundProgressSchema = new Schema<IRoundProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundNumber: { type: Number, required: true, index: true },
    totalScore: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'submitted', 'advanced', 'eliminated'],
      default: 'not_started'
    },
    startedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    markedForReview: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    violationCount: { type: Number, default: 0 },
    suspicionScore: { type: Number, default: 0, min: 0, max: 100 },
    suspicionLevel: {
      type: String,
      enum: ['low', 'elevated', 'high', 'critical'],
      default: 'low'
    }
  },
  { timestamps: true }
);

RoundProgressSchema.index({ userId: 1, roundNumber: 1 }, { unique: true });

export const RoundProgress = mongoose.model<IRoundProgress>('RoundProgress', RoundProgressSchema);
