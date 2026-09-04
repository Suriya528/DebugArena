import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  collegeId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description: string;
  bannerUrl?: string;
  status: 'draft' | 'registration' | 'ready' | 'live' | 'frozen' | 'completed';
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
    useDefaultTemplate: boolean;
    customTemplateUrl?: string;
    textColorMode?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    issuerName?: string;
    issuerTitle?: string;
    includeQrVerification?: boolean;
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
      enum: ['draft', 'registration', 'ready', 'live', 'frozen', 'completed'],
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
      useDefaultTemplate: { type: Boolean, default: true },
      customTemplateUrl: { type: String, default: '' },
      textColorMode: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
      primaryColor: { type: String, default: '#f59e0b' },
      issuerName: { type: String, default: 'Head of Department' },
      issuerTitle: { type: String, default: 'DebugArena Organizing Committee' },
      includeQrVerification: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

// Compound unique index: Event codes are unique per college
EventSchema.index({ collegeId: 1, code: 1 }, { unique: true });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
