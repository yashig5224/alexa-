// ─────────────────────────────────────────────────────────────────────────────
// User Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: UserRole;
  user: User;
  joinedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  avatarUrl?: string;
  role?: UserRole;
}
