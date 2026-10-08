import { z } from 'zod';
import { db, tasks } from '@trackmate/database';
import { eq, and, ne, or, isNull, lte, isNotNull } from 'drizzle-orm';
import type { McpToolResult, McpToolDefinition, PriorityItem } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Priority scoring algorithm
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 40,
  high:     30,
  medium:   20,
  low:      10,
};

const STATUS_WEIGHT: Record<string, number> = {
  blocked:     15, // blocked needs attention
  in_progress: 10, // already started, keep momentum
  in_review:    5,
  todo:         3,
  done:         0,
};

function computeScore(task: {
  priority: string;
  status: string;
  dueDate: string | null;
}): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Priority score
  const pScore = PRIORITY_WEIGHT[task.priority] ?? 0;
  score += pScore;
  reasons.push(`Priority: ${task.priority} (+${pScore})`);

  // Status score
  const sScore = STATUS_WEIGHT[task.status] ?? 0;
  score += sScore;
  if (task.status === 'blocked') reasons.push('Blocked — needs unblocking (+15)');
  if (task.status === 'in_progress') reasons.push('In progress — maintain momentum (+10)');

  // Due date score
  if (task.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);

    if (daysUntilDue < 0) {
      score += 50;
      reasons.push(`Overdue by ${Math.abs(daysUntilDue)} day(s) (+50)`);
    } else if (daysUntilDue === 0) {
      score += 45;
      reasons.push('Due today (+45)');
    } else if (daysUntilDue === 1) {
      score += 35;
      reasons.push('Due tomorrow (+35)');
    } else if (daysUntilDue <= 3) {
      score += 25;
      reasons.push(`Due in ${daysUntilDue} days (+25)`);
    } else if (daysUntilDue <= 7) {
      score += 10;
      reasons.push(`Due this week (+10)`);
    }
  }

  return { score, reasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_daily_priorities
// ─────────────────────────────────────────────────────────────────────────────

const GetPrioritiesSchema = z.object({
  projectId: z.string().optional(),
  limit:     z.number().int().positive().max(20).default(5),
});

function deserializeTags(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export async function get_daily_priorities(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetPrioritiesSchema.safeParse(args);
  if (!parsed.success) {
    return { content: [{ type: 'text', text: `Error: ${parsed.error.message}` }], isError: true };
  }

  const { projectId, limit } = parsed.data;

  // Fetch all non-done tasks
  const conditions = [ne(tasks.status, 'done')];
  if (projectId) conditions.push(eq(tasks.projectId, projectId));

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conditions));

  // Score and sort
  const scored = rows
    .map(t => {
      const { score, reasons } = computeScore(t);
      const item: PriorityItem = {
        task: { ...t, tags: deserializeTags(t.tags), description: t.description ?? null, assigneeId: t.assigneeId ?? null, dueDate: t.dueDate ?? null, githubIssueUrl: t.githubIssueUrl ?? null },
        score,
        reasons,
      };
      return item;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        date: today,
        topPriorities: scored,
        message: `Here are your top ${scored.length} priorities for today.`,
      }, null, 2),
    }],
  };
}

export const get_daily_priorities_definition: McpToolDefinition = {
  name: 'get_daily_priorities',
  description: 'Compute and return today\'s top task priorities, ranked by urgency and importance.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Limit to a specific project' },
      limit:     { type: 'number', default: 5, description: 'Number of top priorities to return (1-20)' },
    },
  },
};
