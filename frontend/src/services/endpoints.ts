// Typed API helpers — mirrors the backend REST contracts
import api from './api';

/* ── Types ─────────────────────────────────────────────────── */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  githubIssueUrl?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  ownerId: string;
  githubRepo?: string | null;
  color?: string;
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
  blockers: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: string;
  user: User;
  joinedAt: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  body: string | null;
}

export interface PriorityItem {
  task: Task;
  score: number;
  reasons: string[];
}

export interface DailyPrioritiesResponse {
  date: string;
  topPriorities: PriorityItem[];
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallMetadata[];
}

export interface ToolCallMetadata {
  name: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface AIChatResponse {
  reply: string;
  toolCalls?: ToolCallMetadata[];
}

/* ── Project endpoints ─────────────────────────────────────── */

export const projectsApi = {
  list: (params?: { status?: ProjectStatus; limit?: number; offset?: number }) =>
    api.get<{ projects: Project[]; total?: number }>('/projects', { params }).then((r) => r.data.projects),
  get: (id: string) =>
    api.get<{ project: Project }>(`/projects/${id}`).then((r) => r.data.project),
  getStatus: (id: string) =>
    api.get<ProjectProgress>(`/projects/${id}/status`).then((r) => r.data),
  create: (data: Partial<Project>) =>
    api.post<{ project: Project }>('/projects', data).then((r) => r.data.project),
  update: (id: string, data: Partial<Project>) =>
    api.patch<{ project: Project }>(`/projects/${id}`, data).then((r) => r.data.project),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getTasks: (id: string) =>
    api.get<{ tasks: Task[] }>(`/projects/${id}/tasks`).then((r) => r.data.tasks),
  getMembers: (id: string) =>
    api.get<{ members: ProjectMember[] }>(`/projects/${id}/members`).then((r) => r.data.members),
  addMember: (id: string, data: { userId: string; role?: string }) =>
    api.post<{ member: ProjectMember }>(`/projects/${id}/members`, data).then((r) => r.data.member),
  getGithubIssues: (id: string) =>
    api.get<{ issues: GitHubIssue[]; repository: string; total: number; source?: string }>(`/projects/${id}/github-issues`).then((r) => r.data),
  convertIssue: (id: string, data: { title: string; description?: string; issueNumber?: number; issueUrl?: string; priority?: string }) =>
    api.post<{ task: Task }>(`/projects/${id}/convert-issue`, data).then((r) => r.data.task),
  summarize: (id: string) =>
    api.post<{ summary: string }>(`/projects/${id}/summarize`).then((r) => r.data.summary),
};

/* ── Task endpoints ────────────────────────────────────────── */

export const tasksApi = {
  list: (params?: { projectId?: string; status?: TaskStatus; priority?: Priority; overdue?: boolean }) =>
    api.get<{ tasks: Task[] }>('/tasks', { params }).then((r) => r.data.tasks),
  get: (id: string) =>
    api.get<{ task: Task }>(`/tasks/${id}`).then((r) => r.data.task),
  getOverdue: (params?: { projectId?: string }) =>
    api.get<{ tasks: Task[] }>('/tasks/overdue', { params }).then((r) => r.data.tasks),
  create: (data: Partial<Task>) =>
    api.post<{ task: Task }>('/tasks', data).then((r) => r.data.task),
  update: (id: string, data: Partial<Task>) =>
    api.patch<{ task: Task }>(`/tasks/${id}`, data).then((r) => r.data.task),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

/* ── Deadlines & Priorities endpoints ──────────────────────── */

export const deadlinesApi = {
  list: (params?: { projectId?: string; withinDays?: number; includeOverdue?: boolean }) =>
    api.get<{ deadlines: Task[]; total: number }>('/deadlines', { params }).then((r) => r.data.deadlines),
  overdue: (params?: { projectId?: string }) =>
    api.get<{ overdueTasks: Task[]; total: number }>('/deadlines/overdue', { params }).then((r) => r.data.overdueTasks),
};

export const prioritiesApi = {
  getToday: (params?: { projectId?: string; limit?: number }) =>
    api.get<DailyPrioritiesResponse>('/priorities/today', { params }).then((r) => r.data),
};

/* ── User endpoints ────────────────────────────────────────── */

export const usersApi = {
  list: () =>
    api.get<{ users: User[] }>('/users').then((r) => r.data.users),
  get: (id: string) =>
    api.get<{ user: User }>(`/users/${id}`).then((r) => r.data.user),
};

/* ── AI chat endpoint ──────────────────────────────────────── */

export const aiApi = {
  chat: (messages: ChatMessage[]) =>
    api.post<AIChatResponse>('/ai/chat', { messages }).then((r) => r.data),
};

/* ── GitHub integration endpoints ──────────────────────────── */

export interface GitHubConnectionStatus {
  connected: boolean;
  configuredRepo: string;
  hasToken: boolean;
  source: 'live' | 'mock' | 'disconnected';
  rateLimitRemaining?: number;
  message: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  assignees: string[];
  labels: string[];
  headBranch?: string;
  baseBranch?: string;
}

export interface GitHubStaleIssue {
  issue: GitHubIssue;
  daysInactive: number;
  lastUpdated: string;
  isPotentialBlocker: boolean;
  blockerReason?: string;
}

export interface GitHubBlocker {
  issueNumber: number;
  title: string;
  url: string;
  reason: string;
  labels: string[];
  daysInactive: number;
}

export interface GitHubActivitySummary {
  repository: string;
  openIssuesCount: number;
  openPullRequestsCount: number;
  staleIssuesCount: number;
  potentialBlockersCount: number;
  recentIssues: GitHubIssue[];
  recentPullRequests: GitHubPullRequest[];
  potentialBlockers: GitHubBlocker[];
  lastChecked: string;
  source: 'github_api' | 'mock_data';
}

export const githubApi = {
  getStatus: () =>
    api.get<GitHubConnectionStatus>('/github/status').then((r) => r.data),
  getIssues: (params?: { projectId?: string; state?: string; limit?: number }) =>
    api.get<{ repository: string; state: string; issues: GitHubIssue[]; total: number; source: string }>('/github/issues', { params }).then((r) => r.data),
  getPullRequests: (params?: { projectId?: string; state?: string; limit?: number }) =>
    api.get<{ repository: string; state: string; pullRequests: GitHubPullRequest[]; total: number; source: string }>('/github/pull-requests', { params }).then((r) => r.data),
  getStaleIssues: (params?: { projectId?: string; daysInactive?: number }) =>
    api.get<{ repository: string; thresholdDays: number; staleIssues: GitHubStaleIssue[]; total: number; source: string }>('/github/stale-issues', { params }).then((r) => r.data),
  getActivitySummary: (params?: { projectId?: string }) =>
    api.get<GitHubActivitySummary>('/github/activity-summary', { params }).then((r) => r.data),
};
