import mongoose, { Schema, type Model } from 'mongoose';
import { randomUUID } from 'crypto';
import type { UserRole } from '@trackmate/shared';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: ['owner', 'member', 'viewer'], default: 'member' },
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

export const UserModel: Model<IUser> =
  (mongoose.models['User'] as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);
