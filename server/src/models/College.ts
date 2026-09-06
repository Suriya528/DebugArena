import mongoose, { Document, Schema } from 'mongoose';

export interface ICollege extends Document {
  name: string;
  code: string;
  university?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  contactEmail?: string;
  website?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollegeSchema = new Schema<ICollege>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    university: { type: String, trim: true, default: '' },
    logoUrl: { type: String, default: '' },
    primaryColor: { type: String, default: '#6366f1' }, // Indigo default
    secondaryColor: { type: String, default: '#06b6d4' }, // Cyan default
    contactEmail: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  { timestamps: true }
);

export const College = mongoose.model<ICollege>('College', CollegeSchema);
