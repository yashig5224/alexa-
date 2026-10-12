import mongoose, { Schema, type Model } from 'mongoose';
import { randomUUID } from 'crypto';

export interface IMember {
  _id: string;
  projectId: string;
  userId: string;
  role: string;
  joinedAt?: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    _id: { type: String, default: () => randomUUID() },
    projectId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, default: 'member' },
    joinedAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: false,
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

MemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const ProjectMemberModel: Model<IMember> =
  (mongoose.models['ProjectMember'] as Model<IMember>) || mongoose.model<IMember>('ProjectMember', MemberSchema);
