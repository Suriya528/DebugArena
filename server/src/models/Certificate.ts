import mongoose, { Document, Schema, Types } from 'mongoose';
import crypto from 'crypto';

export interface ICertificate extends Document {
  certificateId: string;
  userId: Types.ObjectId;
  participantName: string;
  username: string;
  eventId?: Types.ObjectId;
  eventTitle: string;
  collegeName: string;
  rank: number;
  totalScore: number;
  issueDate: Date;
  verificationHash: string;
  qrCodeUrl?: string;
  templateUrl?: string;
  useCustomTemplate?: boolean;
  textColorMode?: 'light' | 'dark' | 'auto';
  createdAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    participantName: { type: String, required: true },
    username: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
    eventTitle: { type: String, default: 'DebugArena National Hackathon 2026' },
    collegeName: { type: String, default: 'Global Institute of Technology' },
    rank: { type: Number, required: true },
    totalScore: { type: Number, required: true },
    issueDate: { type: Date, default: Date.now },
    verificationHash: { type: String, required: true },
    templateUrl: { type: String, default: '' },
    useCustomTemplate: { type: Boolean, default: false },
    textColorMode: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export function generateCertificateHash(certId: string, username: string, rank: number, score: number): string {
  const secret = 'debugarena_verifiable_cert_salt_2026';
  return crypto
    .createHmac('sha256', secret)
    .update(`${certId}:${username}:${rank}:${score}`)
    .digest('hex');
}

export const Certificate = mongoose.model<ICertificate>('Certificate', CertificateSchema);
