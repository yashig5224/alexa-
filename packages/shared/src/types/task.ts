// ─────────────────────────────────────────────────────────────────────────────
// Task Types
// ─────────────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId: string | null;
  dueDate: string | null; // ISO 8601 date string
  tags: string[];
  githubIssueUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
  githubIssueUrl?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
  githubIssueUrl?: string;
}

export interface TaskFilters {
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  overdue?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  limit?: number;
  offset?: number;
}
