import mongoose, { Schema, Document } from 'mongoose';

export interface IProcessedOperation extends Document {
  operationId: string;
  userId: mongoose.Types.ObjectId;
  roundNumber?: number;
  questionId?: mongoose.Types.ObjectId;
  actionType: string; // 'save_answer' | 'submit_code' | 'submit_round' | 'sync_batch'
  seqId?: number;
  clientTimestamp?: number;
  resultPayload?: any;
  createdAt: Date;
}

const ProcessedOperationSchema = new Schema<IProcessedOperation>(
  {
    operationId: {
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
    roundNumber: {
      type: Number
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question'
    },
    actionType: {
      type: String,
      required: true
    },
    seqId: {
      type: Number
    },
    clientTimestamp: {
      type: Number
    },
    resultPayload: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// TTL index to automatically prune operations older than 48 hours
ProcessedOperationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

export const ProcessedOperation = mongoose.model<IProcessedOperation>(
  'ProcessedOperation',
  ProcessedOperationSchema
);
