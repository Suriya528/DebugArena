import mongoose, { Document, Schema, Types } from 'mongoose';

export type SelectionStatus = 'NOT_PUBLISHED' | 'SELECTED' | 'NOT_SELECTED';

export interface IParticipantRoundResult extends Document {
  participantId: Types.ObjectId;
  eventId?: Types.ObjectId;
  roundNumber: number;
  selectionStatus: SelectionStatus;
  draftSelection?: 'SELECTED' | 'NOT_SELECTED' | null;
  isPublished: boolean;
  publishedAt: Date | null;
  publishedBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ParticipantRoundResultSchema = new Schema<IParticipantRoundResult>(
  {
    participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', index: true },
    roundNumber: { type: Number, required: true, index: true },
    selectionStatus: {
      type: String,
      enum: ['NOT_PUBLISHED', 'SELECTED', 'NOT_SELECTED'],
      default: 'NOT_PUBLISHED'
    },
    draftSelection: {
      type: String,
      enum: ['SELECTED', 'NOT_SELECTED', null],
      default: null
    },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

// Compound indexes: One authoritative result per participant per round
ParticipantRoundResultSchema.index(
  { eventId: 1, participantId: 1, roundNumber: 1 },
  { unique: true, sparse: true, partialFilterExpression: { eventId: { $exists: true } } }
);

ParticipantRoundResultSchema.index(
  { participantId: 1, roundNumber: 1 },
  { unique: true, sparse: true, partialFilterExpression: { eventId: { $exists: false } } }
);

export const ParticipantRoundResult = mongoose.model<IParticipantRoundResult>(
  'ParticipantRoundResult',
  ParticipantRoundResultSchema
);
