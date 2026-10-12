import mongoose, { Schema, type Model } from 'mongoose';
import { randomUUID } from 'crypto';
import type { ProjectStatus } from '@trackmate/shared';

export interface IProject {
  _id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  ownerId: string;
  githubRepo?: string | null;
  color: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['active', 'on_hold', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    ownerId: { type: String, required: true, index: true },
    githubRepo: { type: String, default: null, trim: true },
    color: { type: String, default: '#6366f1' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id?.toString() ?? ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ProjectModel: Model<IProject> =
  (mongoose.models['Project'] as Model<IProject>) || mongoose.model<IProject>('Project', ProjectSchema);
