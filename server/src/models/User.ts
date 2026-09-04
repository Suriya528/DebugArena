import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  name: string;
  passwordHash: string;
  role: 'participant' | 'admin';
  isDisqualified: boolean;
  disqualificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['participant', 'admin'], default: 'participant' },
    isDisqualified: { type: Boolean, default: false },
    disqualificationReason: { type: String }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
