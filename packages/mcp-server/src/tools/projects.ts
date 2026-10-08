import { z } from 'zod';
import { db, projects, tasks, projectMembers, users } from '@trackmate/database';
import { eq, and, count, sql } from 'drizzle-orm';
import type { McpToolResult, McpToolDefinition, ProjectProgress } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonResult(data: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): McpToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_projects
// ─────────────────────────────────────────────────────────────────────────────

const GetProjectsSchema = z.object({
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
  limit:  z.number().int().positive().max(50).default(20),
});

export async function get_projects(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetProjectsSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const { status, limit } = parsed.data;
  const rows = await db
    .select()
    .from(projects)
    .where(status ? eq(projects.status, status) : undefined)
    .limit(limit);

  return jsonResult({ projects: rows, total: rows.length });
}

export const get_projects_definition: McpToolDefinition = {
  name: 'get_projects',
  description: 'List all projects, optionally filtered by status.',
  inputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['active', 'on_hold', 'completed', 'archived'] },
      limit:  { type: 'number', default: 20 },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_project_status
// ─────────────────────────────────────────────────────────────────────────────

const GetProjectStatusSchema = z.object({
  projectId: z.string().min(1),
});

export async function get_project_status(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetProjectStatusSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, parsed.data.projectId))
    .limit(1);

  if (!project) return errorResult(`Project "${parsed.data.projectId}" not found`);

  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, parsed.data.projectId));

  const today = new Date().toISOString().split('T')[0]!;

  const completedTasks   = allTasks.filter(t => t.status === 'done').length;
  const inProgressTasks  = allTasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks     = allTasks.filter(t => t.status === 'blocked');
  const overdueTasks     = allTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done').length;
  const completionPct    = allTasks.length > 0
    ? Math.round((completedTasks / allTasks.length) * 100)
    : 0;

  const progress: ProjectProgress = {
    project: {
      ...project,
      description: project.description ?? null,
      githubRepo: project.githubRepo ?? null,
    },
    totalTasks:           allTasks.length,
    completedTasks,
    inProgressTasks,
    blockedTasks:         blockedTasks.length,
    overdueTasks,
    completionPercentage: completionPct,
    blockers:             blockedTasks.map(t => t.title),
  };

  return jsonResult(progress);
}

export const get_project_status_definition: McpToolDefinition = {
  name: 'get_project_status',
  description: 'Get detailed progress stats for a project: completion %, task counts, blockers.',
  inputSchema: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string', description: 'Project ID' },
    },
  },
};
