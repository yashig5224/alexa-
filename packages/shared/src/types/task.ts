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
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  projectId: string;
  assigneeId?: string | null | undefined;
  dueDate?: string | null | undefined;
  tags?: string[] | undefined;
  githubIssueUrl?: string | null | undefined;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: string | null | undefined;
  dueDate?: string | null | undefined;
  tags?: string[] | undefined;
  githubIssueUrl?: string | null | undefined;
}

export interface TaskFilters {
  projectId?: string | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: string | undefined;
  overdue?: boolean | undefined;
  dueBefore?: string | undefined;
  dueAfter?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}
