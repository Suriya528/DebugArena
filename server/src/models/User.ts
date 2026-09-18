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
  usernameNormalized?: string;
  name: string;
  email?: string;
  passwordHash?: string;
  authProvider: 'local' | 'google' | 'passkey';
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
  passkeyHash?: string;
  passkeyLookupHash?: string;
  hasPasskey?: boolean;
  passkeyCreatedAt?: Date;
  passkeyUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, trim: true, lowercase: true },
    usernameNormalized: { type: String, trim: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: function(this: any) { return this.authProvider === 'local'; } },
    authProvider: { type: String, enum: ['local', 'google', 'passkey'], default: 'local' },
    googleId: { type: String },
    passkeyHash: { type: String },
    passkeyLookupHash: { type: String, index: true, sparse: true },
    hasPasskey: { type: Boolean, default: false },
    passkeyCreatedAt: { type: Date },
    passkeyUpdatedAt: { type: Date },
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

UserSchema.pre('save', function (next) {
  if (this.username) {
    this.username = this.username.trim().toLowerCase();
    this.usernameNormalized = this.username;
  }
  next();
});

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
// Event-scoped uniqueness for participants (both username and usernameNormalized)
UserSchema.index(
  { eventId: 1, username: 1 },
  { unique: true, sparse: true, partialFilterExpression: { role: 'participant', eventId: { $exists: true } } }
);
UserSchema.index(
  { eventId: 1, usernameNormalized: 1 },
  { unique: true, sparse: true, partialFilterExpression: { role: 'participant', eventId: { $exists: true } } }
);
// Global uniqueness for administrators/coordinators
UserSchema.index(
  { username: 1 },
  { unique: true, sparse: true, partialFilterExpression: { role: { $ne: 'participant' } } }
);

export const User = mongoose.model<IUser>('User', UserSchema);
