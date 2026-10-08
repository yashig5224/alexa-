import type { McpToolDefinition, McpToolResult } from '@trackmate/shared';

// Task tools
import {
  get_tasks,      get_tasks_definition,
  get_task,       get_task_definition,
  create_task,    create_task_definition,
  update_task,    update_task_definition,
  delete_task,    delete_task_definition,
} from './tasks.js';

// Project tools
import {
  get_projects,       get_projects_definition,
  get_project_status, get_project_status_definition,
} from './projects.js';

// Deadline tools
import {
  get_deadlines,      get_deadlines_definition,
  get_overdue_tasks,  get_overdue_tasks_definition,
} from './deadlines.js';

// Priority tool
import {
  get_daily_priorities, get_daily_priorities_definition,
} from './priorities.js';

// GitHub tool
import {
  get_github_issues, get_github_issues_definition,
} from './github.js';

// Summarize tool
import {
  summarize_project, summarize_project_definition,
} from './summarize.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tool registry
// ─────────────────────────────────────────────────────────────────────────────

export type ToolHandler = (args: Record<string, unknown>) => Promise<McpToolResult>;

export const ALL_TOOLS: Record<string, ToolHandler> = {
  get_tasks,
  get_task,
  create_task,
  update_task,
  delete_task,
  get_projects,
  get_project_status,
  get_deadlines,
  get_overdue_tasks,
  get_daily_priorities,
  get_github_issues,
  summarize_project,
};

export const TOOL_DEFINITIONS: McpToolDefinition[] = [
  get_tasks_definition,
  get_task_definition,
  create_task_definition,
  update_task_definition,
  delete_task_definition,
  get_projects_definition,
  get_project_status_definition,
  get_deadlines_definition,
  get_overdue_tasks_definition,
  get_daily_priorities_definition,
  get_github_issues_definition,
  summarize_project_definition,
];
