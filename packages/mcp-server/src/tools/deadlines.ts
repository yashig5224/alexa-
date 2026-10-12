import { z } from 'zod';
import { DeadlineService } from '@trackmate/database';
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

  try {
    const todayStr = today();
    const rows = await DeadlineService.getDeadlines(parsed.data);

    const enriched = rows.map((t) => ({
      ...t,
      isOverdue: t.dueDate ? t.dueDate < todayStr : false,
      daysUntilDue: t.dueDate
        ? Math.ceil((new Date(t.dueDate).getTime() - Date.now()) / 86_400_000)
        : null,
    }));

    return jsonResult({ deadlines: enriched, total: enriched.length, asOf: todayStr });
  } catch (err: any) {
    return errorResult(err.message ?? 'Failed to get deadlines');
  }
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

  try {
    const rows = await DeadlineService.getOverdueTasks(parsed.data);

    const enriched = rows.map((t) => ({
      ...t,
      daysOverdue: t.dueDate
        ? Math.ceil((Date.now() - new Date(t.dueDate).getTime()) / 86_400_000)
        : 0,
    }));

    const summary = enriched.length === 0
      ? '✅ No overdue tasks!'
      : `⚠️ ${enriched.length} overdue task(s) found.`;

    return jsonResult({ summary, overdueTasks: enriched, total: enriched.length });
  } catch (err: any) {
    return errorResult(err.message ?? 'Failed to get overdue tasks');
  }
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
