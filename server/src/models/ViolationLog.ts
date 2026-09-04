import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IViolationLog extends Document {
  userId: Types.ObjectId;
  roundNumber: number;
  type: 'fullscreen_exit' | 'tab_switch' | 'devtools_opened' | 'window_blur' | 'large_paste' | 'rapid_solve_anomaly';
  details?: string;
  suspicionPoints: number;
  timestamp: Date;
}

const ViolationLogSchema = new Schema<IViolationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roundNumber: { type: Number, required: true },
    type: {
      type: String,
      enum: ['fullscreen_exit', 'tab_switch', 'devtools_opened', 'window_blur', 'large_paste', 'rapid_solve_anomaly'],
      required: true
    },
    details: { type: String, default: '' },
    suspicionPoints: { type: Number, default: 15 },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const ViolationLog = mongoose.model<IViolationLog>('ViolationLog', ViolationLogSchema);
