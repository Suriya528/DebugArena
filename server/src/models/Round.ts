import mongoose, { Document, Schema } from 'mongoose';

export interface IRound extends Document {
  roundNumber: number;
  title: string;
  description: string;
  type: 'mcq' | 'coding';
  durationMinutes: number;
  status: 'pending' | 'active' | 'locked' | 'completed';
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RoundSchema = new Schema<IRound>(
  {
    roundNumber: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['mcq', 'coding'], required: true },
    durationMinutes: { type: Number, required: true, default: 30 },
    status: {
      type: String,
      enum: ['pending', 'active', 'locked', 'completed'],
      default: 'pending'
    },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Round = mongoose.model<IRound>('Round', RoundSchema);
