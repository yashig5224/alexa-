import type { AIProvider, AIResponse } from './interface.js';
import type { McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Mock AI Provider — for local development without AWS credentials
// Intelligently selects tools based on keywords in the user message
// ─────────────────────────────────────────────────────────────────────────────

export class MockProvider implements AIProvider {
  async chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse> {
    const lastMessage = params.messages[params.messages.length - 1]?.content ?? '';
    const lower = lastMessage.toLowerCase();

    // Intent detection — maps phrases to tool calls
    const intent = this.detectIntent(lower);

    if (intent) {
      return {
        text: null,
        toolUseRequests: [{ name: intent.tool, id: `mock-${Date.now()}`, input: intent.args }],
        stopReason: 'tool_use',
      };
    }

    // Fallback: generic response
    return {
      text: `I'm running in offline mock mode. I can help you with tasks, projects, deadlines, and priorities. Try asking: "What should I work on today?" or "Show my overdue tasks."`,
      toolUseRequests: [],
      stopReason: 'end_turn',
    };
  }

  private detectIntent(msg: string): { tool: string; args: Record<string, unknown> } | null {
    if (msg.includes('today') || msg.includes('work on') || msg.includes('priorit')) {
      return { tool: 'get_daily_priorities', args: { limit: 5 } };
    }
    if (msg.includes('overdue') || msg.includes('late') || msg.includes('missed')) {
      return { tool: 'get_overdue_tasks', args: {} };
    }
    if (msg.includes('deadline') || msg.includes('due soon') || msg.includes('upcoming')) {
      return { tool: 'get_deadlines', args: { withinDays: 7 } };
    }
    if (msg.includes('project') && (msg.includes('status') || msg.includes('progress') || msg.includes('blocking') || msg.includes('blocker'))) {
      return { tool: 'get_projects', args: {} };
    }
    if (msg.includes('summarize') || msg.includes('summary') || msg.includes('overview')) {
      return { tool: 'get_projects', args: {} };
    }
    if (msg.includes('create') && msg.includes('task')) {
      const titleMatch = msg.match(/(?:called|named|titled)\s+"?([^"]+)"?/i);
      const title = titleMatch?.[1] ?? 'New Task';
      const priority = msg.includes('high') ? 'high'
        : msg.includes('critical') ? 'critical'
        : msg.includes('low') ? 'low' : 'medium';
      return { tool: 'get_projects', args: {} }; // will get project list first
    }
    if (msg.includes('github') || msg.includes('issue')) {
      return { tool: 'get_github_issues', args: { state: 'open' } };
    }
    if (msg.includes('task') || msg.includes('show') || msg.includes('list')) {
      return { tool: 'get_tasks', args: { limit: 10 } };
    }
    return null;
  }
}
