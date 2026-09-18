import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  collegeId: mongoose.Types.ObjectId;
  ownerId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description: string;
  bannerUrl?: string;
  participantAccessTokenHash?: string;
  adminAccessTokenHash?: string;
  participantTokenCipher?: string;
  adminTokenCipher?: string;
  status: 'draft' | 'ready' | 'live' | 'ended' | 'archived' | 'registration' | 'frozen' | 'completed' | 'finalizing' | 'finalized' | 'cleaned';
  rules: string[];
  startDate?: Date;
  endDate?: Date;
  durationMinutes?: number;
  publishedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  archivedAt?: Date;
  isSetupValid?: boolean;
  validationErrors?: string[];
  scoringConfig: {
    negativeMarking: boolean;
    tieBreakerPriority: ('codingScore' | 'debuggingScore' | 'totalTime' | 'earliestSubmit')[];
    autoSubmitOnTimeUp: boolean;
    violationLimit: number;
    autoSubmitOnViolation: boolean;
  };
  branding: {
    customTitle?: string;
    signatoryName?: string;
    signatoryTitle?: string;
  };
  // Lifecycle & Retention
  finalizedAt?: Date;
  retentionDays?: number;
  retentionExpiresAt?: Date;
  retentionHold?: boolean;
  retentionHoldReason?: string;
  retentionPolicyVersion?: number;
  cleanupStatus?: 'none' | 'eligible' | 'running' | 'completed' | 'hold' | 'failed_verification';
  cleanedAt?: Date;
  cleanupStats?: {
    milestonesDeleted: number;
    violationsDeleted: number;
    attemptsPruned: number;
    reclaimedBytesEstimated: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    participantAccessTokenHash: { type: String, index: true, sparse: true },
    adminAccessTokenHash: { type: String, index: true, sparse: true },
    participantTokenCipher: { type: String },
    adminTokenCipher: { type: String },
    status: {
      type: String,
      enum: ['draft', 'ready', 'live', 'ended', 'archived', 'registration', 'frozen', 'completed', 'finalizing', 'finalized', 'cleaned'],
      default: 'draft'
    },
    rules: { type: [String], default: [] },
    startDate: { type: Date },
    endDate: { type: Date },
    durationMinutes: { type: Number, default: 60 },
    publishedAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    archivedAt: { type: Date },
    isSetupValid: { type: Boolean, default: false },
    validationErrors: { type: [String], default: [] },
    scoringConfig: {
      negativeMarking: { type: Boolean, default: false },
      tieBreakerPriority: {
        type: [String],
        default: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit']
      },
      autoSubmitOnTimeUp: { type: Boolean, default: true },
      violationLimit: { type: Number, default: 3 },
      autoSubmitOnViolation: { type: Boolean, default: true }
    },
    branding: {
      customTitle: { type: String, default: '' },
      signatoryName: { type: String, default: 'Head of Department' },
      signatoryTitle: { type: String, default: 'Coordinator, DebugArena' }
    },
    finalizedAt: { type: Date },
    retentionDays: { type: Number, default: 30 },
    retentionExpiresAt: { type: Date },
    retentionHold: { type: Boolean, default: false },
    retentionHoldReason: { type: String, default: '' },
    retentionPolicyVersion: { type: Number, default: 1 },
    cleanupStatus: {
      type: String,
      enum: ['none', 'eligible', 'running', 'completed', 'hold', 'failed_verification'],
      default: 'none'
    },
    cleanedAt: { type: Date },
    cleanupStats: {
      milestonesDeleted: { type: Number, default: 0 },
      violationsDeleted: { type: Number, default: 0 },
      attemptsPruned: { type: Number, default: 0 },
      reclaimedBytesEstimated: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

// Compound unique index: Event codes are unique per college
EventSchema.index({ collegeId: 1, code: 1 }, { unique: true });
EventSchema.index({ ownerId: 1, createdAt: -1 });
EventSchema.index({ status: 1, cleanupStatus: 1, retentionExpiresAt: 1, retentionHold: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
