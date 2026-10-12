import { z } from 'zod';
import { ProjectService } from '@trackmate/database';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const SummarizeSchema = z.object({
  projectId: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool: summarize_project
// ─────────────────────────────────────────────────────────────────────────────

export async function summarize_project(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = SummarizeSchema.safeParse(args);
  if (!parsed.success) {
    return { content: [{ type: 'text', text: `Error: ${parsed.error.message}` }], isError: true };
  }

  try {
    const summary = await ProjectService.summarizeProject(parsed.data.projectId);
    return { content: [{ type: 'text', text: summary }] };
  } catch (err: any) {
    return { content: [{ type: 'text', text: `Error: ${err.message ?? 'Failed to summarize project'}` }], isError: true };
  }
}

export const summarize_project_definition: McpToolDefinition = {
  name: 'summarize_project',
  description: 'Generate a human-readable summary of project status including progress, blockers, and overdue tasks.',
  inputSchema: {
    type: 'object',
    required: ['projectId'],
    properties: {
      projectId: { type: 'string', description: 'Project ID to summarize' },
    },
  },
};
