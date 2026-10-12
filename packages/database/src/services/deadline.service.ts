import { TaskModel } from '../models/index.js';
import type { Task } from '@trackmate/shared';
import { toTask } from './task.service.js';

export class DeadlineService {
  /**
   * Get tasks due within a specified number of days
   */
  static async getDeadlines(options?: {
    projectId?: string | undefined;
    withinDays?: number | undefined;
    includeOverdue?: boolean | undefined;
  }): Promise<Task[]> {
    const withinDays = options?.withinDays ?? 14;
    const includeOverdue = options?.includeOverdue ?? true;

    const d = new Date();
    d.setDate(d.getDate() + withinDays);
    const cutoffDate = d.toISOString().split('T')[0]!;
    const today = new Date().toISOString().split('T')[0]!;

    const query: Record<string, any> = {
      dueDate: { $ne: null, $lte: cutoffDate },
      status: { $ne: 'done' },
    };

    if (!includeOverdue) {
      query['dueDate'] = { ...(query['dueDate'] as object), $gte: today };
    }

    if (options?.projectId) {
      query['projectId'] = options.projectId;
    }

    const docs = await TaskModel.find(query).sort({ dueDate: 1, priority: -1 });
    return docs.map(toTask);
  }

  /**
   * Get all tasks that are currently overdue and not completed
   */
  static async getOverdueTasks(options?: { projectId?: string | undefined }): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0]!;
    const query: Record<string, any> = {
      dueDate: { $ne: null, $lt: today },
      status: { $ne: 'done' },
    };

    if (options?.projectId) {
      query['projectId'] = options.projectId;
    }

    const docs = await TaskModel.find(query).sort({ dueDate: 1, priority: -1 });
    return docs.map(toTask);
  }
}
