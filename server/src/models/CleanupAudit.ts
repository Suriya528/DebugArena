import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICleanupAudit extends Document {
  jobId: string;
  collegeId?: Types.ObjectId;
  eventId?: Types.ObjectId;
  executedBy: string;
  isDryRun: boolean;
  policyVersion: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failed' | 'partial' | 'integrity_alert';
  recordsScanned: {
    milestones: number;
    violations: number;
    attempts: number;
  };
  recordsPruned: {
    milestones: number;
    violations: number;
    attempts: number;
  };
  bytesReclaimedEstimated: number;
  leaderboardHashBefore?: string;
  leaderboardHashAfter?: string;
  error?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const CleanupAuditSchema = new Schema<ICleanupAudit>(
  {
    jobId: { type: String, required: true, index: true },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    executedBy: { type: String, required: true, default: 'SYSTEM_SCHEDULER' },
    isDryRun: { type: Boolean, default: false },
    policyVersion: { type: Number, default: 1 },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['running', 'success', 'failed', 'partial', 'integrity_alert'],
      default: 'running',
      index: true
    },
    recordsScanned: {
      milestones: { type: Number, default: 0 },
      violations: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 }
    },
    recordsPruned: {
      milestones: { type: Number, default: 0 },
      violations: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 }
    },
    bytesReclaimedEstimated: { type: Number, default: 0 },
    leaderboardHashBefore: { type: String },
    leaderboardHashAfter: { type: String },
    error: { type: String },
    details: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CleanupAuditSchema.index({ eventId: 1, createdAt: -1 });
CleanupAuditSchema.index({ collegeId: 1, createdAt: -1 });

export const CleanupAudit = mongoose.model<ICleanupAudit>('CleanupAudit', CleanupAuditSchema);
