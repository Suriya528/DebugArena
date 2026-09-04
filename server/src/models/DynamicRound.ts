import mongoose, { Document, Schema } from 'mongoose';

export interface IDynamicRound extends Document {
  eventId: mongoose.Types.ObjectId;
  roundNumber: number;
  title: string;
  description: string;
  type: 'mcq' | 'debugging' | 'coding' | 'sql' | 'aptitude' | 'custom';
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passingMarks: number;
  negativeMarkValue: number;
  advancementQuota: number; // e.g. 15 for Round 1, 10 for Round 2; 0 means manual/unrestricted
  advancementRule: 'top_n' | 'min_score' | 'manual';
  minPassingScore: number;
  tieResolutionStrategy: 'expand' | 'strict' | 'manual';
  status: 'pending' | 'active' | 'locked' | 'completed';
  startedAt: Date | null;
  endedAt: Date | null;
  isFrozen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DynamicRoundSchema = new Schema<IDynamicRound>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    roundNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['mcq', 'debugging', 'coding', 'sql', 'aptitude', 'custom'],
      required: true,
      default: 'debugging'
    },
    durationMinutes: { type: Number, required: true, default: 30 },
    questionCount: { type: Number, default: 5 },
    totalMarks: { type: Number, default: 50 },
    passingMarks: { type: Number, default: 0 },
    negativeMarkValue: { type: Number, default: 0 },
    advancementQuota: { type: Number, default: 0 },
    advancementRule: {
      type: String,
      enum: ['top_n', 'min_score', 'manual'],
      default: 'top_n'
    },
    minPassingScore: { type: Number, default: 0 },
    tieResolutionStrategy: {
      type: String,
      enum: ['expand', 'strict', 'manual'],
      default: 'expand'
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'locked', 'completed'],
      default: 'pending'
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    isFrozen: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound unique index: Round numbers are unique per event
DynamicRoundSchema.index({ eventId: 1, roundNumber: 1 }, { unique: true });

export const DynamicRound = mongoose.model<IDynamicRound>('DynamicRound', DynamicRoundSchema);
