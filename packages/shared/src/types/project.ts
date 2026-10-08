// ─────────────────────────────────────────────────────────────────────────────
// Project Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: string;
  githubRepo: string | null;  // e.g. "owner/repo"
  color: string;              // hex color for UI
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProgress {
  project: Project;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  blockers: string[];         // titles of blocked tasks
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  githubRepo?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  githubRepo?: string;
  color?: string;
}
