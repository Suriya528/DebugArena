import mongoose, { Document, Schema } from 'mongoose';

export interface IImportAudit extends Document {
  importId: string;
  eventId?: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  adminUsername: string;
  filename: string;
  format: 'csv' | 'xlsx' | 'json';
  type: 'questions' | 'participants';
  totalCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  status: 'completed' | 'failed' | 'partial';
  errorSummary: string[];
  sourceFileDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ImportAuditSchema = new Schema<IImportAudit>(
  {
    importId: { type: String, required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    adminUsername: { type: String, required: true },
    filename: { type: String, required: true },
    format: { type: String, enum: ['csv', 'xlsx', 'json'], required: true },
    type: { type: String, enum: ['questions', 'participants'], default: 'questions' },
    totalCount: { type: Number, default: 0 },
    validCount: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'failed', 'partial'], default: 'completed' },
    errorSummary: [{ type: String }],
    sourceFileDeleted: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const ImportAudit = mongoose.model<IImportAudit>('ImportAudit', ImportAuditSchema);
