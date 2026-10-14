import { ProjectService, TaskService } from '@trackmate/database';

// ─────────────────────────────────────────────────────────────────────────────
// Context Retrieval Service
// Fetches relevant workspace data to inject into the AI system prompt.
// Retrieves only what is relevant to the user's message — not the entire DB.
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspaceContext {
  /** ISO timestamp of when context was built */
  retrievedAt: string;
  /** Summary block injected into system prompt */
  summaryBlock: string;
  /** Whether any data was actually found */
  hasData: boolean;
}

/**
 * Classify what kind of context the user message needs.
 * Returns a set of intent signals — intentionally loose, not rigid keyword matching.
 */
function classifyContextNeeds(messages: Array<{ role: string; content: string }>): {
  needsTasks: boolean;
  needsProjects: boolean;
  needsDeadlines: boolean;
  needsOverdue: boolean;
} {
  // Combine last 3 turns for context classification
  const recentText = messages
    .slice(-3)
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();

  return {
    needsTasks:
      recentText.includes('task') ||
      recentText.includes('work') ||
      recentText.includes('priorities') ||
      recentText.includes('today') ||
      recentText.includes('overdue') ||
      recentText.includes('blocking') ||
      recentText.includes('blocker') ||
      recentText.includes('progress') ||
      recentText.includes('done') ||
      recentText.includes('finish') ||
      recentText.includes('complete'),
    needsProjects:
      recentText.includes('project') ||
      recentText.includes('sprint') ||
      recentText.includes('summary') ||
      recentText.includes('summarize') ||
      recentText.includes('team') ||
      recentText.includes('status'),
    needsDeadlines:
      recentText.includes('deadline') ||
      recentText.includes('due') ||
      recentText.includes('upcoming') ||
      recentText.includes('soon') ||
      recentText.includes('schedule'),
    needsOverdue:
      recentText.includes('overdue') ||
      recentText.includes('late') ||
      recentText.includes('missed') ||
      recentText.includes('behind'),
  };
}

/**
 * Retrieve relevant workspace context to inject into the system prompt.
 * Safe to call on every turn — returns quickly if DB is unavailable.
 */
export async function retrieveWorkspaceContext(
  messages: Array<{ role: string; content: string }>
): Promise<WorkspaceContext> {
  const now = new Date().toISOString();
  const needs = classifyContextNeeds(messages);

  const sections: string[] = [];

  try {
    // ── Projects context ──────────────────────────────────────────────────────
    if (needs.needsProjects || needs.needsTasks) {
      const projects = await ProjectService.getProjects().catch(() => []);
      if (projects.length > 0) {
        const activeProjects = projects.filter((p) => p.status === 'active' || !p.status);
        if (activeProjects.length > 0) {
          sections.push(
            `ACTIVE PROJECTS (${activeProjects.length}):\n` +
              activeProjects
                .map((p) => `  • [${p.id}] ${p.name}${p.description ? ` — ${p.description}` : ''}`)
                .join('\n')
          );
        }
      }
    }

    // ── Tasks context (limit to avoid prompt bloat) ───────────────────────────
    if (needs.needsTasks || needs.needsOverdue) {
      const allTasks = await TaskService.getTasks().catch(() => []);

      const inProgressTasks = allTasks
        .filter((t) => t.status === 'in_progress')
        .slice(0, 5);
      if (inProgressTasks.length > 0) {
        sections.push(
          `IN-PROGRESS TASKS (${inProgressTasks.length} shown):\n` +
            inProgressTasks
              .map(
                (t) =>
                  `  • [${t.id}] "${t.title}" | priority:${t.priority} | due:${t.dueDate ?? 'none'}`
              )
              .join('\n')
        );
      }

      const blockedTasks = allTasks.filter((t) => t.status === 'blocked').slice(0, 5);
      if (blockedTasks.length > 0) {
        sections.push(
          `BLOCKED TASKS (${blockedTasks.length}):\n` +
            blockedTasks
              .map((t) => `  • [${t.id}] "${t.title}" | priority:${t.priority}`)
              .join('\n')
        );
      }

      // Overdue: due date in the past and not done
      if (needs.needsOverdue || needs.needsDeadlines) {
        const today = new Date().toISOString().split('T')[0]!;
        const overdueTasks = allTasks
          .filter(
            (t) =>
              t.dueDate &&
              t.dueDate < today &&
              t.status !== 'done'
          )
          .slice(0, 8);
        if (overdueTasks.length > 0) {
          sections.push(
            `OVERDUE TASKS (${overdueTasks.length}):\n` +
              overdueTasks
                .map(
                  (t) =>
                    `  • [${t.id}] "${t.title}" | was due:${t.dueDate} | priority:${t.priority}`
                )
                .join('\n')
          );
        }
      }

      // Upcoming deadlines (next 7 days)
      if (needs.needsDeadlines) {
        const today = new Date();
        const in7Days = new Date(today);
        in7Days.setDate(today.getDate() + 7);
        const todayStr = today.toISOString().split('T')[0]!;
        const in7Str = in7Days.toISOString().split('T')[0]!;
        const upcomingTasks = allTasks
          .filter(
            (t) =>
              t.dueDate &&
              t.dueDate >= todayStr &&
              t.dueDate <= in7Str &&
              t.status !== 'done'
          )
          .slice(0, 6);
        if (upcomingTasks.length > 0) {
          sections.push(
            `UPCOMING DEADLINES (next 7 days, ${upcomingTasks.length}):\n` +
              upcomingTasks
                .map(
                  (t) =>
                    `  • [${t.id}] "${t.title}" | due:${t.dueDate} | priority:${t.priority}`
                )
                .join('\n')
          );
        }
      }

      // High-priority todo tasks
      const highPriorityTodos = allTasks
        .filter(
          (t) =>
            (t.priority === 'critical' || t.priority === 'high') &&
            t.status === 'todo'
        )
        .slice(0, 5);
      if (highPriorityTodos.length > 0) {
        sections.push(
          `HIGH-PRIORITY TODO TASKS:\n` +
            highPriorityTodos
              .map(
                (t) =>
                  `  • [${t.id}] "${t.title}" | due:${t.dueDate ?? 'none'}`
              )
              .join('\n')
        );
      }
    }

    if (sections.length === 0) {
      return { retrievedAt: now, summaryBlock: '', hasData: false };
    }

    const summaryBlock =
      `\n\n--- CURRENT WORKSPACE CONTEXT (retrieved: ${now}) ---\n` +
      `Use this real data to ground your answer. Do not invent task details not present here.\n` +
      sections.join('\n\n') +
      `\n--- END WORKSPACE CONTEXT ---`;

    return { retrievedAt: now, summaryBlock, hasData: true };
  } catch (err) {
    console.warn('[ContextRetrieval] Failed to retrieve workspace context:', err);
    return { retrievedAt: now, summaryBlock: '', hasData: false };
  }
}
