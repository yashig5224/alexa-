import { z } from 'zod';
import { db, tasks, projects } from '@trackmate/database';
import { eq, and, lt, gte, isNull, or, desc, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Input schemas (Zod)
// ─────────────────────────────────────────────────────────────────────────────

const GetTasksSchema = z.object({
  projectId:  z.string().optional(),
  status:     z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional(),
  priority:   z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().optional(),
  limit:      z.number().int().positive().max(100).default(50),
  offset:     z.number().int().nonnegative().default(0),
});

const GetTaskSchema = z.object({
  id: z.string().min(1),
});

const CreateTaskSchema = z.object({
  title:          z.string().min(1).max(200),
  description:    z.string().optional(),
  status:         z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).default('todo'),
  priority:       z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  projectId:      z.string().min(1),
  assigneeId:     z.string().optional(),
  dueDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  tags:           z.array(z.string()).default([]),
  githubIssueUrl: z.string().url().optional(),
});

const UpdateTaskSchema = z.object({
  id:             z.string().min(1),
  title:          z.string().min(1).max(200).optional(),
  description:    z.string().optional(),
  status:         z.enum(['todo', 'in_progress', 'in_review', 'done', 'blocked']).optional(),
  priority:       z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId:     z.string().optional(),
  dueDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tags:           z.array(z.string()).optional(),
  githubIssueUrl: z.string().url().optional(),
});

const DeleteTaskSchema = z.object({
  id: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function textResult(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

function jsonResult(data: unknown): McpToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string): McpToolResult {
  return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

function deserializeTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_tasks
// ─────────────────────────────────────────────────────────────────────────────

export async function get_tasks(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetTasksSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const { projectId, status, priority, assigneeId, limit, offset } = parsed.data;

  const conditions = [];
  if (projectId)  conditions.push(eq(tasks.projectId, projectId));
  if (status)     conditions.push(eq(tasks.status, status));
  if (priority)   conditions.push(eq(tasks.priority, priority));
  if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));

  const rows = await db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(tasks.priority), asc(tasks.dueDate))
    .limit(limit)
    .offset(offset);

  const result = rows.map(r => ({ ...r, tags: deserializeTags(r.tags) }));
  return jsonResult({ tasks: result, total: result.length });
}

export const get_tasks_definition: McpToolDefinition = {
  name: 'get_tasks',
  description: 'List tasks with optional filters by project, status, priority, or assignee.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId:  { type: 'string', description: 'Filter by project ID' },
      status:     { type: 'string', enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'] },
      priority:   { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      assigneeId: { type: 'string', description: 'Filter by assignee user ID' },
      limit:      { type: 'number', default: 50, description: 'Max results (1-100)' },
      offset:     { type: 'number', default: 0, description: 'Pagination offset' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_task
// ─────────────────────────────────────────────────────────────────────────────

export async function get_task(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetTaskSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const [task] = await db.select().from(tasks).where(eq(tasks.id, parsed.data.id)).limit(1);
  if (!task) return errorResult(`Task with id "${parsed.data.id}" not found`);

  return jsonResult({ ...task, tags: deserializeTags(task.tags) });
}

export const get_task_definition: McpToolDefinition = {
  name: 'get_task',
  description: 'Get a single task by its ID.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Task ID' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool: create_task
// ─────────────────────────────────────────────────────────────────────────────

export async function create_task(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = CreateTaskSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  // Verify project exists
  const [project] = await db.select().from(projects).where(eq(projects.id, parsed.data.projectId)).limit(1);
  if (!project) return errorResult(`Project "${parsed.data.projectId}" not found`);

  const id = randomUUID();
  const nowStr = new Date().toISOString();

  await db.insert(tasks).values({
    id,
    title:          parsed.data.title,
    description:    parsed.data.description ?? null,
    status:         parsed.data.status,
    priority:       parsed.data.priority,
    projectId:      parsed.data.projectId,
    assigneeId:     parsed.data.assigneeId ?? null,
    dueDate:        parsed.data.dueDate ?? null,
    tags:           JSON.stringify(parsed.data.tags),
    githubIssueUrl: parsed.data.githubIssueUrl ?? null,
    createdAt:      nowStr,
    updatedAt:      nowStr,
  });

  return textResult(`✅ Task created successfully!\nID: ${id}\nTitle: ${parsed.data.title}\nPriority: ${parsed.data.priority}\nDue: ${parsed.data.dueDate ?? 'No deadline'}`);
}

export const create_task_definition: McpToolDefinition = {
  name: 'create_task',
  description: 'Create a new task in a project.',
  inputSchema: {
    type: 'object',
    required: ['title', 'projectId'],
    properties: {
      title:          { type: 'string', description: 'Task title' },
      description:    { type: 'string', description: 'Optional detailed description' },
      status:         { type: 'string', enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'], default: 'todo' },
      priority:       { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
      projectId:      { type: 'string', description: 'Project ID to add task to' },
      assigneeId:     { type: 'string', description: 'User ID to assign task to' },
      dueDate:        { type: 'string', description: 'Due date in YYYY-MM-DD format' },
      tags:           { type: 'array', items: { type: 'string' }, description: 'Optional tags' },
      githubIssueUrl: { type: 'string', description: 'Linked GitHub issue URL' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool: update_task
// ─────────────────────────────────────────────────────────────────────────────

export async function update_task(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = UpdateTaskSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const { id, tags, ...updates } = parsed.data;

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!existing) return errorResult(`Task "${id}" not found`);

  const updateData: Record<string, unknown> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (tags !== undefined) updateData['tags'] = JSON.stringify(tags);

  await db.update(tasks).set(updateData).where(eq(tasks.id, id));

  return textResult(`✅ Task "${existing.title}" updated successfully.`);
}

export const update_task_definition: McpToolDefinition = {
  name: 'update_task',
  description: 'Update fields on an existing task (status, priority, deadline, etc.).',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id:             { type: 'string', description: 'Task ID to update' },
      title:          { type: 'string' },
      description:    { type: 'string' },
      status:         { type: 'string', enum: ['todo', 'in_progress', 'in_review', 'done', 'blocked'] },
      priority:       { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      assigneeId:     { type: 'string' },
      dueDate:        { type: 'string', description: 'YYYY-MM-DD' },
      tags:           { type: 'array', items: { type: 'string' } },
      githubIssueUrl: { type: 'string' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool: delete_task
// ─────────────────────────────────────────────────────────────────────────────

export async function delete_task(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = DeleteTaskSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const [existing] = await db.select().from(tasks).where(eq(tasks.id, parsed.data.id)).limit(1);
  if (!existing) return errorResult(`Task "${parsed.data.id}" not found`);

  await db.delete(tasks).where(eq(tasks.id, parsed.data.id));
  return textResult(`🗑️ Task "${existing.title}" deleted.`);
}

export const delete_task_definition: McpToolDefinition = {
  name: 'delete_task',
  description: 'Permanently delete a task by its ID.',
  inputSchema: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', description: 'Task ID to delete' },
    },
  },
};
