import { ProjectModel, TaskModel, ProjectMemberModel } from '../models/index.js';
import type {
  Project,
  ProjectProgress,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStatus,
} from '@trackmate/shared';
function toProject(doc: any): Project {
  const json = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: json.id || json._id,
    name: json.name,
    description: json.description ?? null,
    status: json.status,
    ownerId: json.ownerId,
    githubRepo: json.githubRepo ?? null,
    color: json.color,
    createdAt: (json.createdAt ? new Date(json.createdAt) : new Date()).toISOString(),
    updatedAt: (json.updatedAt ? new Date(json.updatedAt) : new Date()).toISOString(),
  };
}

export class ProjectService {
  /**
   * List projects with optional status filter and pagination
   */
  static async getProjects(filter?: {
    status?: ProjectStatus | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<Project[]> {
    const query: Record<string, any> = {};
    if (filter?.status) {
      query['status'] = filter.status;
    }

    const docs = await ProjectModel.find(query)
      .sort({ createdAt: -1 })
      .skip(filter?.offset ?? 0)
      .limit(filter?.limit ?? 50);

    return docs.map(toProject);
  }

  /**
   * Retrieve a single project by ID
   */
  static async getProjectById(id: string): Promise<Project | null> {
    const doc = await ProjectModel.findById(id);
    return doc ? toProject(doc) : null;
  }

  /**
   * Create a new project
   */
  static async createProject(data: CreateProjectInput, ownerId: string = 'demo-user'): Promise<Project> {
    const doc = await ProjectModel.create({
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'active',
      ownerId,
      githubRepo: data.githubRepo ?? null,
      color: data.color ?? '#6366f1',
    });

    return toProject(doc);
  }

  /**
   * Update an existing project
   */
  static async updateProject(id: string, data: UpdateProjectInput): Promise<Project | null> {
    const doc = await ProjectModel.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    );
    return doc ? toProject(doc) : null;
  }

  /**
   * Delete a project and cascade delete its tasks and member records
   */
  static async deleteProject(id: string): Promise<boolean> {
    const res = await ProjectModel.findByIdAndDelete(id);
    if (!res) return false;

    // Cascade delete tasks and membership
    await TaskModel.deleteMany({ projectId: id });
    await ProjectMemberModel.deleteMany({ projectId: id });
    return true;
  }

  /**
   * Calculate project progress metrics and list active blockers
   */
  static async getProjectStatus(projectId: string): Promise<ProjectProgress | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;

    const allTasks = await TaskModel.find({ projectId });
    const today = new Date().toISOString().split('T')[0]!;

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === 'done').length;
    const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress').length;
    const blockedTasksDocs = allTasks.filter((t) => t.status === 'blocked');
    const overdueTasks = allTasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'done').length;

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const blockers = blockedTasksDocs.map((t) => t.title);

    return {
      project,
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks: blockedTasksDocs.length,
      overdueTasks,
      completionPercentage,
      blockers,
    };
  }

  /**
   * Synthesize natural language summary of project state
   */
  static async summarizeProject(projectId: string): Promise<string> {
    const progress = await this.getProjectStatus(projectId);
    if (!progress) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const { project, totalTasks, completedTasks, inProgressTasks, blockedTasks, overdueTasks, completionPercentage, blockers } = progress;

    const lines: string[] = [
      `### Project Summary: ${project.name}`,
      `**Status**: ${project.status.toUpperCase()} | **Completion**: ${completionPercentage}% (${completedTasks}/${totalTasks} tasks completed)`,
      '',
      `• **In Progress**: ${inProgressTasks} task(s)`,
      `• **Blocked**: ${blockedTasks} task(s)`,
      `• **Overdue**: ${overdueTasks} task(s)`,
    ];

    if (blockers.length > 0) {
      lines.push('', '⚠️ **Active Blockers Requiring Immediate Attention:**');
      blockers.forEach((b) => lines.push(`  - ${b}`));
    } else {
      lines.push('', '✅ **No active blockers reported.**');
    }

    if (project.githubRepo) {
      lines.push('', `Linked GitHub Repository: \`${project.githubRepo}\``);
    }

    return lines.join('\n');
  }
}
