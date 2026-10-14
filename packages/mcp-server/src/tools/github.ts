import { z } from 'zod';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';
import { GitHubService } from '@trackmate/database';

// ─────────────────────────────────────────────────────────────────────────────
// Input Schemas
// ─────────────────────────────────────────────────────────────────────────────

const GetGitHubIssuesSchema = z.object({
  owner:     z.string().optional(),
  repo:      z.string().optional(),
  projectId: z.string().optional(),
  state:     z.enum(['open', 'closed', 'all']).default('open'),
  limit:     z.number().int().positive().max(50).default(20),
});

const GetGitHubPullRequestsSchema = z.object({
  owner:     z.string().optional(),
  repo:      z.string().optional(),
  projectId: z.string().optional(),
  state:     z.enum(['open', 'closed', 'all']).default('open'),
  limit:     z.number().int().positive().max(50).default(20),
});

const GetStaleGitHubIssuesSchema = z.object({
  owner:        z.string().optional(),
  repo:         z.string().optional(),
  projectId:    z.string().optional(),
  daysInactive: z.number().int().min(1).max(365).default(14),
  limit:        z.number().int().positive().max(50).default(20),
});

const SummarizeGitHubActivitySchema = z.object({
  owner:     z.string().optional(),
  repo:      z.string().optional(),
  projectId: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Tool: get_github_issues
// ─────────────────────────────────────────────────────────────────────────────

export async function get_github_issues(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetGitHubIssuesSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
      isError: true,
    };
  }

  try {
    const result = await GitHubService.getIssues(parsed.data);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `GitHub Issues Error: ${err.message ?? String(err)}` }],
      isError: true,
    };
  }
}

export const get_github_issues_definition: McpToolDefinition = {
  name: 'get_github_issues',
  description: 'Fetch open or closed issues from a connected GitHub repository. Resolves repository from project settings or environment defaults.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'TrackMate Project ID to auto-resolve linked GitHub repository' },
      owner:     { type: 'string', description: 'GitHub organization or username (e.g. "facebook")' },
      repo:      { type: 'string', description: 'GitHub repository name (e.g. "react")' },
      state:     { type: 'string', enum: ['open', 'closed', 'all'], default: 'open', description: 'Filter by issue state' },
      limit:     { type: 'number', default: 20, description: 'Maximum number of issues to return (1-50)' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tool: get_github_pull_requests
// ─────────────────────────────────────────────────────────────────────────────

export async function get_github_pull_requests(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetGitHubPullRequestsSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
      isError: true,
    };
  }

  try {
    const result = await GitHubService.getPullRequests(parsed.data);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `GitHub Pull Requests Error: ${err.message ?? String(err)}` }],
      isError: true,
    };
  }
}

export const get_github_pull_requests_definition: McpToolDefinition = {
  name: 'get_github_pull_requests',
  description: 'List open or closed pull requests for a connected repository, including branches, assignees, draft status, and labels.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'TrackMate Project ID to auto-resolve linked repository' },
      owner:     { type: 'string', description: 'GitHub organization or username' },
      repo:      { type: 'string', description: 'GitHub repository name' },
      state:     { type: 'string', enum: ['open', 'closed', 'all'], default: 'open', description: 'Filter by PR state' },
      limit:     { type: 'number', default: 20, description: 'Maximum number of pull requests to return (1-50)' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Tool: get_stale_github_issues
// ─────────────────────────────────────────────────────────────────────────────

export async function get_stale_github_issues(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetStaleGitHubIssuesSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
      isError: true,
    };
  }

  try {
    const result = await GitHubService.getStaleIssues(parsed.data);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `Stale GitHub Issues Error: ${err.message ?? String(err)}` }],
      isError: true,
    };
  }
}

export const get_stale_github_issues_definition: McpToolDefinition = {
  name: 'get_stale_github_issues',
  description: 'Identify open issues that have had no updates for a specified number of days (default 14), with verified blocker analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId:    { type: 'string', description: 'TrackMate Project ID to auto-resolve linked repository' },
      owner:         { type: 'string', description: 'GitHub organization or username' },
      repo:          { type: 'string', description: 'GitHub repository name' },
      daysInactive:  { type: 'number', default: 14, description: 'Threshold in days of inactivity to consider stale' },
      limit:         { type: 'number', default: 20, description: 'Maximum number of stale issues to return' },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Tool: summarize_github_activity
// ─────────────────────────────────────────────────────────────────────────────

export async function summarize_github_activity(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = SummarizeGitHubActivitySchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [{ type: 'text', text: `Validation Error: ${parsed.error.message}` }],
      isError: true,
    };
  }

  try {
    const result = await GitHubService.summarizeActivity(parsed.data);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `GitHub Activity Summary Error: ${err.message ?? String(err)}` }],
      isError: true,
    };
  }
}

export const summarize_github_activity_definition: McpToolDefinition = {
  name: 'summarize_github_activity',
  description: 'Produce an executive summary of repository activity: total open issues, active pull requests, stale work, and high-urgency blockers.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'TrackMate Project ID to auto-resolve repository' },
      owner:     { type: 'string', description: 'GitHub organization or username' },
      repo:      { type: 'string', description: 'GitHub repository name' },
    },
  },
};
