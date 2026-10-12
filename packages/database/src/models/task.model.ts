import mongoose, { Schema, type Model } from 'mongoose';
import { randomUUID } from 'crypto';
import type { TaskStatus, TaskPriority } from '@trackmate/shared';

export interface ITask {
  _id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags: string[];
  githubIssueUrl?: string | null;
  githubIssueNumber?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    _id: { type: String, default: () => randomUUID() },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    projectId: { type: String, required: true, index: true },
    assigneeId: { type: String, default: null, index: true },
    dueDate: { type: String, default: null, index: true },
    tags: { type: [String], default: [] },
    githubIssueUrl: { type: String, default: null },
    githubIssueNumber: { type: Number, default: null },
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

TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ dueDate: 1, status: 1 });

export const TaskModel: Model<ITask> =
  (mongoose.models['Task'] as Model<ITask>) || mongoose.model<ITask>('Task', TaskSchema);
