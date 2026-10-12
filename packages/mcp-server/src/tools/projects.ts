import { z } from 'zod';
import { ProjectService } from '@trackmate/database';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

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

  try {
    const projects = await ProjectService.getProjects(parsed.data);
    return jsonResult({ projects, total: projects.length });
  } catch (err: any) {
    return errorResult(err.message ?? 'Failed to get projects');
  }
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

  try {
    const progress = await ProjectService.getProjectStatus(parsed.data.projectId);
    if (!progress) return errorResult(`Project "${parsed.data.projectId}" not found`);
    return jsonResult(progress);
  } catch (err: any) {
    return errorResult(err.message ?? 'Failed to get project status');
  }
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
