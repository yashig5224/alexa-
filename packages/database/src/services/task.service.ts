import { TaskModel } from '../models/index.js';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
} from '@trackmate/shared';
export function toTask(doc: any): Task {
  const json = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: json.id || json._id,
    title: json.title,
    description: json.description ?? null,
    status: json.status,
    priority: json.priority,
    projectId: json.projectId,
    assigneeId: json.assigneeId ?? null,
    dueDate: json.dueDate ?? null,
    tags: Array.isArray(json.tags) ? json.tags : [],
    githubIssueUrl: json.githubIssueUrl ?? null,
    createdAt: (json.createdAt ? new Date(json.createdAt) : new Date()).toISOString(),
    updatedAt: (json.updatedAt ? new Date(json.updatedAt) : new Date()).toISOString(),
  };
}

export class TaskService {
  /**
   * List tasks with multi-field filtering
   */
  static async getTasks(filters?: TaskFilters): Promise<Task[]> {
    const query: Record<string, any> = {};

    if (filters?.projectId)  query['projectId'] = filters.projectId;
    if (filters?.status)     query['status'] = filters.status;
    if (filters?.priority)   query['priority'] = filters.priority;
    if (filters?.assigneeId) query['assigneeId'] = filters.assigneeId;

    if (filters?.dueBefore) {
      query['dueDate'] = { ...(query['dueDate'] as object || {}), $lte: filters.dueBefore };
    }
    if (filters?.dueAfter) {
      query['dueDate'] = { ...(query['dueDate'] as object || {}), $gte: filters.dueAfter };
    }
    if (filters?.overdue) {
      const today = new Date().toISOString().split('T')[0]!;
      query['dueDate'] = { $lt: today };
      query['status'] = { $ne: 'done' };
    }

    const docs = await TaskModel.find(query)
      .sort({ priority: -1, dueDate: 1, createdAt: -1 })
      .skip(filters?.offset ?? 0)
      .limit(filters?.limit ?? 50);

    return docs.map(toTask);
  }

  /**
   * Retrieve a task by ID
   */
  static async getTaskById(id: string): Promise<Task | null> {
    const doc = await TaskModel.findById(id);
    return doc ? toTask(doc) : null;
  }

  /**
   * Create a new task
   */
  static async createTask(data: CreateTaskInput): Promise<Task> {
    const doc = await TaskModel.create({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'medium',
      projectId: data.projectId,
      assigneeId: data.assigneeId ?? null,
      dueDate: data.dueDate ?? null,
      tags: data.tags ?? [],
      githubIssueUrl: data.githubIssueUrl ?? null,
    });

    return toTask(doc);
  }

  /**
   * Update an existing task
   */
  static async updateTask(id: string, data: UpdateTaskInput): Promise<Task | null> {
    const doc = await TaskModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
    return doc ? toTask(doc) : null;
  }

  /**
   * Delete a task by ID
   */
  static async deleteTask(id: string): Promise<boolean> {
    const res = await TaskModel.findByIdAndDelete(id);
    return !!res;
  }
}
