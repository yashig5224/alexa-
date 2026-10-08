// Typed API helpers — mirrors the backend REST contracts
import api from './api';

/* ── Types ─────────────────────────────────────────────────── */

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  githubIssueNumber?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId: string;
  githubRepo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'owner' | 'member' | 'viewer';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ── Project endpoints ─────────────────────────────────────── */

export const projectsApi = {
  list: () =>
    api.get<{ projects: Project[] }>('/projects').then((r) => r.data.projects),
  get: (id: string) =>
    api.get<{ project: Project }>(`/projects/${id}`).then((r) => r.data.project),
  create: (data: Partial<Project>) =>
    api.post<{ project: Project }>('/projects', data).then((r) => r.data.project),
  update: (id: string, data: Partial<Project>) =>
    api.patch<{ project: Project }>(`/projects/${id}`, data).then((r) => r.data.project),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

/* ── Task endpoints ────────────────────────────────────────── */

export const tasksApi = {
  list: (params?: { projectId?: string; status?: TaskStatus; priority?: Priority }) =>
    api.get<{ tasks: Task[] }>('/tasks', { params }).then((r) => r.data.tasks),
  get: (id: string) =>
    api.get<{ task: Task }>(`/tasks/${id}`).then((r) => r.data.task),
  create: (data: Partial<Task>) =>
    api.post<{ task: Task }>('/tasks', data).then((r) => r.data.task),
  update: (id: string, data: Partial<Task>) =>
    api.patch<{ task: Task }>(`/tasks/${id}`, data).then((r) => r.data.task),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

/* ── User endpoints ────────────────────────────────────────── */

export const usersApi = {
  list: () =>
    api.get<{ users: User[] }>('/users').then((r) => r.data.users),
};

/* ── AI chat endpoint ──────────────────────────────────────── */

export const aiApi = {
  chat: (messages: ChatMessage[]) =>
    api.post<{ reply: string }>('/ai/chat', { messages }).then((r) => r.data.reply),
};
