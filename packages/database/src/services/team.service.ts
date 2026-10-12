import { UserModel, ProjectMemberModel } from '../models/index.js';
import type { User, ProjectMember, UserRole } from '@trackmate/shared';

export function toUser(doc: any): User {
  const json = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: json.id || json._id,
    name: json.name,
    email: json.email,
    avatarUrl: json.avatarUrl ?? null,
    role: json.role,
    createdAt: (json.createdAt ? new Date(json.createdAt) : new Date()).toISOString(),
    updatedAt: (json.updatedAt ? new Date(json.updatedAt) : new Date()).toISOString(),
  };
}

export class TeamService {
  /**
   * Get all registered users/members
   */
  static async getUsers(): Promise<User[]> {
    const docs = await UserModel.find().sort({ name: 1 });
    return docs.map(toUser);
  }

  /**
   * Get single user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    return doc ? toUser(doc) : null;
  }

  /**
   * Get members assigned to a project
   */
  static async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const memberDocs = await ProjectMemberModel.find({ projectId });
    const userIds = memberDocs.map((m) => m.userId);
    const userDocs = await UserModel.find({ _id: { $in: userIds } });

    const userMap = new Map(userDocs.map((u) => [u._id, toUser(u)]));

    const result: ProjectMember[] = [];
    for (const m of memberDocs) {
      const u = userMap.get(m.userId);
      if (u) {
        result.push({
          userId: m.userId,
          projectId: m.projectId,
          role: m.role as UserRole,
          user: u,
          joinedAt: (m.joinedAt ?? new Date()).toISOString(),
        });
      }
    }
    return result;
  }

  /**
   * Add a member to a project
   */
  static async addMember(projectId: string, userId: string, role: string = 'member'): Promise<ProjectMember> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error(`User "${userId}" not found`);
    }

    const doc = await ProjectMemberModel.findOneAndUpdate(
      { projectId, userId },
      { $set: { role, joinedAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );

    return {
      userId,
      projectId,
      role: (doc?.role as UserRole) ?? (role as UserRole),
      user,
      joinedAt: (doc?.joinedAt ?? new Date()).toISOString(),
    };
  }
}
