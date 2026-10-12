import { z } from 'zod';
import { PriorityService } from '@trackmate/database';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_daily_priorities
// ─────────────────────────────────────────────────────────────────────────────

const GetPrioritiesSchema = z.object({
  projectId: z.string().optional(),
  limit:     z.number().int().positive().max(20).default(5),
});

export async function get_daily_priorities(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetPrioritiesSchema.safeParse(args);
  if (!parsed.success) {
    return { content: [{ type: 'text', text: `Error: ${parsed.error.message}` }], isError: true };
  }

  try {
    const result = await PriorityService.getDailyPriorities(parsed.data);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message ?? 'Failed to get daily priorities'}` }],
      isError: true,
    };
  }
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
