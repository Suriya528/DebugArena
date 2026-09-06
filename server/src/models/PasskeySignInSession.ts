import mongoose, { Document, Schema } from 'mongoose';

export interface IPasskeySignInSession extends Document {
  sessionId: string;
  token: string;
  userId: mongoose.Types.ObjectId;
  email: string;
  username: string;
  name: string;
  status: 'pending' | 'verified' | 'expired';
  authToken?: string;
  needsOnboarding?: boolean;
  userSnapshot?: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PasskeySignInSessionSchema = new Schema<IPasskeySignInSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    username: { type: String, required: true, trim: true },
    name: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'verified', 'expired'], default: 'pending', index: true },
    authToken: { type: String },
    needsOnboarding: { type: Boolean, default: false },
    userSnapshot: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // MongoDB TTL index auto-deletes expired sessions
  },
  { timestamps: true }
);

export const PasskeySignInSession = mongoose.model<IPasskeySignInSession>(
  'PasskeySignInSession',
  PasskeySignInSessionSchema
);
