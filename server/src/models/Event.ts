import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  collegeId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description: string;
  bannerUrl?: string;
  status: 'draft' | 'registration' | 'ready' | 'live' | 'frozen' | 'completed' | 'finalizing' | 'finalized' | 'cleaned';
  rules: string[];
  scoringConfig: {
    negativeMarking: boolean;
    tieBreakerPriority: ('codingScore' | 'debuggingScore' | 'totalTime' | 'earliestSubmit')[];
    autoSubmitOnTimeUp: boolean;
    violationLimit: number;
    autoSubmitOnViolation: boolean;
  };
  branding: {
    customTitle?: string;
    certificateTitle?: string;
    signatoryName?: string;
    signatoryTitle?: string;
  };
  certificateConfig: {
    enabled: boolean;
    useDefaultTemplate: boolean;
    customTemplateUrl?: string;
    textColorMode?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    issuerName?: string;
    issuerTitle?: string;
    includeQrVerification?: boolean;
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
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    bannerUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'registration', 'ready', 'live', 'frozen', 'completed', 'finalizing', 'finalized', 'cleaned'],
      default: 'draft'
    },
    rules: { type: [String], default: [] },
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
      certificateTitle: { type: String, default: 'Certificate of Excellence' },
      signatoryName: { type: String, default: 'Head of Department' },
      signatoryTitle: { type: String, default: 'Coordinator, DebugArena' }
    },
    certificateConfig: {
      enabled: { type: Boolean, default: false },
      useDefaultTemplate: { type: Boolean, default: true },
      customTemplateUrl: { type: String, default: '' },
      textColorMode: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
      primaryColor: { type: String, default: '#f59e0b' },
      issuerName: { type: String, default: 'Head of Department' },
      issuerTitle: { type: String, default: 'DebugArena Organizing Committee' },
      includeQrVerification: { type: Boolean, default: true }
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
EventSchema.index({ status: 1, cleanupStatus: 1, retentionExpiresAt: 1, retentionHold: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
