import mongoose, { Document, Schema } from 'mongoose';

export interface ICleanupLock extends Document {
  lockKey: string;
  holderId: string;
  acquiredAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CleanupLockSchema = new Schema<ICleanupLock>(
  {
    lockKey: { type: String, required: true, unique: true, index: true },
    holderId: { type: String, required: true },
    acquiredAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export const CleanupLock = mongoose.model<ICleanupLock>('CleanupLock', CleanupLockSchema);
