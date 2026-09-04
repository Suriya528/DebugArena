import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetition extends Document {
  title: string;
  status: 'not_started' | 'active' | 'paused' | 'ended';
  currentRoundNumber: number;
  violationLimit: number;
  autoSubmitOnViolation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitionSchema = new Schema<ICompetition>(
  {
    title: { type: String, required: true, default: 'DebugArena Live Championship' },
    status: {
      type: String,
      enum: ['not_started', 'active', 'paused', 'ended'],
      default: 'not_started'
    },
    currentRoundNumber: { type: Number, default: 1 },
    violationLimit: { type: Number, default: 3 },
    autoSubmitOnViolation: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Competition = mongoose.model<ICompetition>('Competition', CompetitionSchema);
