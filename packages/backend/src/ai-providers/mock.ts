import type {
  AIProvider,
  AIResponse,
  ToolUseRequest,
  ToolExecutionResult,
} from './interface.js';
import type { McpToolDefinition } from '@trackmate/shared';
import { ProjectService, TaskService } from '@trackmate/database';

// ─────────────────────────────────────────────────────────────────────────────
// Mock AI Provider — for local development and offline hackathon evaluation
// Deterministically handles natural-language intent detection and synthesizes
// conversational responses from real MCP tool outputs without making paid AWS calls.
// ─────────────────────────────────────────────────────────────────────────────

export class MockProvider implements AIProvider {
  readonly name = 'Mock AI Provider (Local)';

  async chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse> {
    const lastMessage = params.messages[params.messages.length - 1]?.content ?? '';
    const lower = lastMessage.toLowerCase();

    // 1. Detect if a tool call is required based on user intent
    const toolIntent = await this.detectIntent(lower, lastMessage);

    if (toolIntent) {
      return {
        text: null,
        toolUseRequests: [
          {
            id: `mock-tool-${Date.now()}`,
            name: toolIntent.tool,
            input: toolIntent.args,
          },
        ],
        stopReason: 'tool_use',
      };
    }

    // 2. Direct conversational answer when no tool is needed
    return {
      text: `Hello! I'm TrackMate AI, your agentic project management assistant. You can ask me questions or command actions such as:\n` +
        `• "What should I work on today?"\n` +
        `• "Show my overdue tasks."\n` +
        `• "What is blocking TrackMate AI?"\n` +
        `• "Create a task to finish the API tomorrow."\n` +
        `• "Move the authentication task to in progress."\n` +
        `• "Summarize my project."`,
      toolUseRequests: [],
      stopReason: 'end_turn',
    };
  }

  /**
   * Follow-up turn: Synthesizes a natural-language response from the MCP tool output.
   */
  async chatWithToolResult(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
    toolUseRequests: ToolUseRequest[];
    toolResults: ToolExecutionResult[];
  }): Promise<AIResponse> {
    const lastUserMessage = params.messages[params.messages.length - 1]?.content ?? '';
    const firstResult = params.toolResults[0];

    if (!firstResult) {
      return {
        text: "I processed your request, but received no tool output.",
        toolUseRequests: [],
        stopReason: 'end_turn',
      };
    }

    const naturalText = this.synthesizeNaturalResponse(
      firstResult.name,
      firstResult.output,
      lastUserMessage
    );

    return {
      text: naturalText,
      toolUseRequests: [],
      stopReason: 'end_turn',
    };
  }

  private async detectIntent(
    msgLower: string,
    rawMsg: string
  ): Promise<{ tool: string; args: Record<string, unknown> } | null> {
    const projects = await ProjectService.getProjects().catch(() => []);
    const defaultProject = projects[0];
    const targetProject =
      projects.find((p) => msgLower.includes(p.name.toLowerCase())) ?? defaultProject;

    // A. "What should I work on today?" / priorities
    if (
      msgLower.includes('work on today') ||
      msgLower.includes('what should i work on') ||
      msgLower.includes('daily priorities') ||
      msgLower.includes('today\'s priorities') ||
      msgLower.includes('my priorities')
    ) {
      const explicitlyMentioned = projects.find((p) => msgLower.includes(p.name.toLowerCase()));
      return {
        tool: 'get_daily_priorities',
        args: { limit: 5, ...(explicitlyMentioned ? { projectId: explicitlyMentioned.id } : {}) },
      };
    }

    // B. "Show my overdue tasks." / overdue
    if (
      msgLower.includes('overdue') ||
      msgLower.includes('late task') ||
      msgLower.includes('missed deadline')
    ) {
      const explicitlyMentioned = projects.find((p) => msgLower.includes(p.name.toLowerCase()));
      return {
        tool: 'get_overdue_tasks',
        args: explicitlyMentioned ? { projectId: explicitlyMentioned.id } : {},
      };
    }

    // C. "What is blocking Project X?" / blockers
    if (
      msgLower.includes('blocking') ||
      msgLower.includes('blocker') ||
      msgLower.includes('what is blocking') ||
      msgLower.includes('what\'s blocking')
    ) {
      if (targetProject) {
        return {
          tool: 'get_project_status',
          args: { projectId: targetProject.id },
        };
      }
      return { tool: 'get_projects', args: {} };
    }

    // D. "Create a task to finish the API tomorrow." / create task
    if (
      (msgLower.includes('create') || msgLower.includes('add') || msgLower.includes('new')) &&
      msgLower.includes('task')
    ) {
      // Extract title
      const titleMatch =
        rawMsg.match(/(?:called|named|titled)\s+["']?([^"'\n.]+)["']?/i) ??
        rawMsg.match(/task\s+(?:to\s+)?([^"'\n.]+?)(?:\s+due|\s+with|\s+tomorrow|\.|$)/i);
      const rawTitle = titleMatch?.[1]?.trim() ?? 'Finish the API';
      const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

      // Due date extraction
      const d = new Date();
      if (msgLower.includes('tomorrow')) {
        d.setDate(d.getDate() + 1);
      } else if (msgLower.includes('today')) {
        // today
      } else {
        d.setDate(d.getDate() + 2);
      }
      const dueDate = d.toISOString().split('T')[0]!;

      const priority = msgLower.includes('critical')
        ? 'critical'
        : msgLower.includes('high')
        ? 'high'
        : msgLower.includes('low')
        ? 'low'
        : 'medium';

      return {
        tool: 'create_task',
        args: {
          title,
          priority,
          projectId: targetProject?.id ?? '864ec0af-0f3e-440d-9722-e0081ec77c35',
          dueDate,
          tags: ['ai-agent'],
        },
      };
    }

    // E. "Move the authentication task to in progress." / update task
    if (
      msgLower.includes('move') ||
      msgLower.includes('update') ||
      msgLower.includes('set') ||
      msgLower.includes('mark')
    ) {
      const allTasks = await TaskService.getTasks().catch(() => []);
      const matchedTask = allTasks.find(
        (t) =>
          msgLower.includes(t.title.toLowerCase()) ||
          (msgLower.includes('authentication') && t.title.toLowerCase().includes('authentication'))
      ) ?? allTasks[0];

      if (matchedTask) {
        let newStatus: string = 'in_progress';
        if (msgLower.includes('done') || msgLower.includes('complete')) newStatus = 'done';
        if (msgLower.includes('in progress')) newStatus = 'in_progress';
        if (msgLower.includes('blocked')) newStatus = 'blocked';
        if (msgLower.includes('todo')) newStatus = 'todo';

        return {
          tool: 'update_task',
          args: {
            id: matchedTask.id,
            status: newStatus,
          },
        };
      }
    }

    // F. "Summarize my project."
    if (msgLower.includes('summarize') || msgLower.includes('summary')) {
      if (targetProject) {
        return {
          tool: 'summarize_project',
          args: { projectId: targetProject.id },
        };
      }
      return { tool: 'get_projects', args: {} };
    }

    // G. Deadlines
    if (msgLower.includes('deadline') || msgLower.includes('due soon')) {
      return {
        tool: 'get_deadlines',
        args: { withinDays: 14 },
      };
    }

    return null;
  }

  private synthesizeNaturalResponse(toolName: string, output: string, userPrompt: string): string {
    let parsed: any;
    try {
      parsed = JSON.parse(output);
    } catch {
      // Output is plain text (e.g. summarize_project or formatted message)
      return output;
    }

    switch (toolName) {
      case 'get_daily_priorities': {
        const top = parsed.topPriorities ?? [];
        if (top.length === 0) {
          return `Here are your priorities for today: You currently have no pending tasks. Great job staying on top of your work!`;
        }
        const lines = [
          `Here are your top priorities for today based on urgency and deadlines:`,
          '',
        ];
        top.forEach((item: any, i: number) => {
          const t = item.task;
          lines.push(
            `${i + 1}. **${t.title}** (${t.priority.toUpperCase()}) — ${
              t.dueDate ? `Due ${t.dueDate}` : 'No deadline'
            }`
          );
          if (item.reasons?.length > 0) {
            lines.push(`   *Why:* ${item.reasons.join(', ')}`);
          }
        });
        return lines.join('\n');
      }

      case 'get_overdue_tasks': {
        const tasks = parsed.overdueTasks ?? [];
        if (tasks.length === 0) {
          return `🎉 Great news! You have no overdue tasks right now.`;
        }
        const lines = [
          `⚠️ You have **${tasks.length} overdue task(s)** requiring your immediate attention:`,
          '',
        ];
        tasks.forEach((t: any, i: number) => {
          lines.push(
            `${i + 1}. **${t.title}** (Was due: **${t.dueDate}**, ${t.daysOverdue} days late) — Priority: ${t.priority}`
          );
        });
        return lines.join('\n');
      }

      case 'get_project_status': {
        const p = parsed.project;
        const blockers = parsed.blockers ?? [];
        const lines = [
          `Here is the latest progress for **${p?.name ?? 'your project'}**:`,
          `• Completion: **${parsed.completionPercentage}%** (${parsed.completedTasks}/${parsed.totalTasks} tasks done)`,
          `• In Progress: ${parsed.inProgressTasks} | Blocked: ${parsed.blockedTasks} | Overdue: ${parsed.overdueTasks}`,
          '',
        ];
        if (blockers.length > 0) {
          lines.push(`🚨 **Active Blockers:**`);
          blockers.forEach((b: string) => lines.push(`  - ${b}`));
        } else {
          lines.push(`✅ **No blockers currently reported.**`);
        }
        return lines.join('\n');
      }

      case 'create_task': {
        return `✅ I've created the task for you!\n${output}`;
      }

      case 'update_task': {
        return `✅ Task updated successfully!\n${output}`;
      }

      case 'get_deadlines': {
        const deadlines = parsed.deadlines ?? [];
        if (deadlines.length === 0) {
          return `You have no deadlines approaching within the specified window.`;
        }
        const lines = [`📅 **Upcoming Deadlines:**`, ''];
        deadlines.forEach((t: any, i: number) => {
          lines.push(`${i + 1}. **${t.title}** — Due: **${t.dueDate}** (${t.priority.toUpperCase()})`);
        });
        return lines.join('\n');
      }

      default:
        return typeof output === 'string' ? output : JSON.stringify(parsed, null, 2);
    }
  }
}
