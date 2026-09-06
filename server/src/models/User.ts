import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
  | 'participant'
  | 'admin'
  | 'super_admin'
  | 'college_admin'
  | 'event_coordinator'
  | 'question_manager'
  | 'result_reviewer';

export interface IUser extends Document {
  username: string;
  name: string;
  email?: string;
  passwordHash?: string;
  authProvider: 'local' | 'google';
  googleId?: string;
  role: UserRole;
  collegeId?: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  department?: string;
  year?: string;
  regNo?: string;
  section?: string;
  isDisqualified: boolean;
  disqualificationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: function(this: any) { return this.authProvider !== 'google'; } },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String },
    role: {
      type: String,
      enum: [
        'participant',
        'admin',
        'super_admin',
        'college_admin',
        'event_coordinator',
        'question_manager',
        'result_reviewer'
      ],
      default: 'participant'
    },
    collegeId: { type: Schema.Types.ObjectId, ref: 'College', index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    department: { type: String, default: '' },
    year: { type: String, default: '' },
    regNo: { type: String, default: '' },
    section: { type: String, default: '' },
    isDisqualified: { type: Boolean, default: false },
    disqualificationReason: { type: String }
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<IUser>('User', UserSchema);
