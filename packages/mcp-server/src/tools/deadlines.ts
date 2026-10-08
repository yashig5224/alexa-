import { z } from 'zod';
import { db, tasks } from '@trackmate/database';
import { eq, and, lt, lte, gte, ne, isNotNull } from 'drizzle-orm';
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

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

function deserializeTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_deadlines
// ─────────────────────────────────────────────────────────────────────────────

const GetDeadlinesSchema = z.object({
  projectId:   z.string().optional(),
  withinDays:  z.number().int().positive().max(365).default(14),
  includeOverdue: z.boolean().default(true),
});

export async function get_deadlines(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetDeadlinesSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const { projectId, withinDays, includeOverdue } = parsed.data;
  const cutoff = daysFromNow(withinDays);
  const todayStr = today();

  const conditions = [
    isNotNull(tasks.dueDate),
    ne(tasks.status, 'done'),
    lte(tasks.dueDate, cutoff),
  ];

  if (!includeOverdue) conditions.push(gte(tasks.dueDate, todayStr));
  if (projectId) conditions.push(eq(tasks.projectId, projectId));

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(tasks.dueDate);

  const enriched = rows.map(t => ({
    ...t,
    tags: deserializeTags(t.tags),
    isOverdue: t.dueDate ? t.dueDate < todayStr : false,
    daysUntilDue: t.dueDate
      ? Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86_400_000)
      : null,
  }));

  return jsonResult({ deadlines: enriched, total: enriched.length, asOf: todayStr });
}

export const get_deadlines_definition: McpToolDefinition = {
  name: 'get_deadlines',
  description: 'Get upcoming deadlines within a configurable window (default 14 days).',
  inputSchema: {
    type: 'object',
    properties: {
      projectId:      { type: 'string', description: 'Filter by project' },
      withinDays:     { type: 'number', default: 14, description: 'How many days ahead to look' },
      includeOverdue: { type: 'boolean', default: true, description: 'Include already-overdue tasks' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_overdue_tasks
// ─────────────────────────────────────────────────────────────────────────────

const GetOverdueSchema = z.object({
  projectId: z.string().optional(),
});

export async function get_overdue_tasks(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetOverdueSchema.safeParse(args);
  if (!parsed.success) return errorResult(parsed.error.message);

  const todayStr = today();
  const conditions = [
    isNotNull(tasks.dueDate),
    lt(tasks.dueDate, todayStr),
    ne(tasks.status, 'done'),
  ];
  if (parsed.data.projectId) conditions.push(eq(tasks.projectId, parsed.data.projectId));

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(tasks.dueDate);

  const enriched = rows.map(t => ({
    ...t,
    tags: deserializeTags(t.tags),
    daysOverdue: t.dueDate
      ? Math.ceil((Date.now() - new Date(t.dueDate).getTime()) / 86_400_000)
      : 0,
  }));

  const summary = enriched.length === 0
    ? '✅ No overdue tasks!'
    : `⚠️ ${enriched.length} overdue task(s) found.`;

  return jsonResult({ summary, overdueTasks: enriched, total: enriched.length });
}

export const get_overdue_tasks_definition: McpToolDefinition = {
  name: 'get_overdue_tasks',
  description: 'List all tasks that are past their deadline and not yet completed.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Filter to a specific project' },
    },
  },
};
