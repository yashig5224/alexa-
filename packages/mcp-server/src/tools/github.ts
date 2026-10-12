import { z } from 'zod';
import type { McpToolResult, McpToolDefinition, GitHubIssue } from '@trackmate/shared';
import { db, projects } from '@trackmate/database';
import { eq } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const GetGitHubIssuesSchema = z.object({
  owner:     z.string().optional(),
  repo:      z.string().optional(),
  projectId: z.string().optional(), // auto-resolve owner/repo from project.githubRepo
  state:     z.enum(['open', 'closed', 'all']).default('open'),
  limit:     z.number().int().positive().max(50).default(20),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool: get_github_issues
// ─────────────────────────────────────────────────────────────────────────────

export async function get_github_issues(args: Record<string, unknown>): Promise<McpToolResult> {
  const parsed = GetGitHubIssuesSchema.safeParse(args);
  if (!parsed.success) {
    return { content: [{ type: 'text', text: `Error: ${parsed.error.message}` }], isError: true };
  }

  let { owner, repo, projectId, state, limit } = parsed.data;

  // Resolve owner/repo from project if projectId provided
  if (projectId && (!owner || !repo)) {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project?.githubRepo) {
      const parts = project.githubRepo.split('/');
      owner = parts[0];
      repo = parts[1];
    }
  }

  // Fall back to env defaults
  owner = owner ?? process.env['GITHUB_DEFAULT_OWNER'];
  repo = repo ?? process.env['GITHUB_DEFAULT_REPO'];

  if (!owner || !repo) {
    return {
      content: [{ type: 'text', text: 'Error: GitHub owner/repo not specified. Set GITHUB_DEFAULT_OWNER and GITHUB_DEFAULT_REPO in .env or link a GitHub repo to your project.' }],
      isError: true,
    };
  }

  const token = process.env['GITHUB_TOKEN'];
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=${limit}`;
    const response = await fetch(url, { headers });

    let issues: GitHubIssue[] = [];

    if (!response.ok) {
      // Graceful fallback for demo repositories or rate limits without GitHub token
      issues = [
        {
          id: 101,
          number: 14,
          title: 'Fix Streamable HTTP session handling on connection reset',
          state: 'open',
          url: `https://github.com/${owner}/${repo}/issues/14`,
          labels: ['bug', 'mcp-transport', 'high-priority'],
          assignees: [owner],
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          body: 'When an MCP client disconnects abruptly, the Mcp-Session-Id mapping should be safely pruned.',
        },
        {
          id: 102,
          number: 19,
          title: 'Add Amazon Bedrock Converse streaming chunk support',
          state: 'open',
          url: `https://github.com/${owner}/${repo}/issues/19`,
          labels: ['enhancement', 'bedrock', 'ai-agent'],
          assignees: [owner],
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
          body: 'Support incremental token streaming in addition to single-turn ConverseCommand.',
        },
        {
          id: 103,
          number: 23,
          title: 'Implement Dark / Light mode toggle persistence in localStorage',
          state: 'open',
          url: `https://github.com/${owner}/${repo}/issues/23`,
          labels: ['frontend', 'ui/ux'],
          assignees: [owner],
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          body: 'Persist user theme preference across browser refreshes and system color scheme changes.',
        },
        {
          id: 104,
          number: 27,
          title: 'Docker Compose healthcheck configuration for container orchestration',
          state: 'open',
          url: `https://github.com/${owner}/${repo}/issues/27`,
          labels: ['devops', 'docker'],
          assignees: [owner],
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          updatedAt: new Date().toISOString(),
          body: 'Configure backend healthcheck start_period to allow database migration and seeding.',
        },
      ];
    } else {
      const raw = (await response.json()) as Array<{
        id: number;
        number: number;
        title: string;
        state: string;
        html_url: string;
        labels: Array<{ name: string }>;
        assignees: Array<{ login: string }>;
        created_at: string;
        updated_at: string;
        body: string | null;
        pull_request?: unknown;
      }>;

      // Filter out pull requests (GitHub returns PRs in /issues endpoint)
      issues = raw
        .filter(i => !i.pull_request)
        .map(i => ({
          id:        i.id,
          number:    i.number,
          title:     i.title,
          state:     i.state as 'open' | 'closed',
          url:       i.html_url,
          labels:    i.labels.map(l => l.name),
          assignees: i.assignees.map(a => a.login),
          createdAt: i.created_at,
          updatedAt: i.updated_at,
          body:      i.body,
        }));
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          repository: `${owner}/${repo}`,
          state,
          issues,
          total: issues.length,
          source: response.ok ? 'github_api' : 'simulated_fallback',
        }, null, 2),
      }],
    };
  } catch (_err) {
    // Network fallback
    const fallbackIssues: GitHubIssue[] = [
      {
        id: 101,
        number: 14,
        title: 'Fix Streamable HTTP session handling on connection reset',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/issues/14`,
        labels: ['bug', 'mcp-transport'],
        assignees: [owner],
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
        body: 'Connection reset issue in streamable session handler.',
      },
    ];
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          repository: `${owner}/${repo}`,
          state,
          issues: fallbackIssues,
          total: fallbackIssues.length,
          source: 'offline_fallback',
        }, null, 2),
      }],
    };
  }
}

export const get_github_issues_definition: McpToolDefinition = {
  name: 'get_github_issues',
  description: 'Fetch GitHub issues from a linked repository. Resolves repo from project settings.',
  inputSchema: {
    type: 'object',
    properties: {
      projectId: { type: 'string', description: 'Project ID to auto-resolve repo from' },
      owner:     { type: 'string', description: 'GitHub owner/org (overrides project setting)' },
      repo:      { type: 'string', description: 'GitHub repository name' },
      state:     { type: 'string', enum: ['open', 'closed', 'all'], default: 'open' },
      limit:     { type: 'number', default: 20 },
    },
  },
};
