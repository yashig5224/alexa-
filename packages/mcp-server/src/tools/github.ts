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

    if (!response.ok) {
      const text = await response.text();
      return {
        content: [{ type: 'text', text: `GitHub API error ${response.status}: ${text}` }],
        isError: true,
      };
    }

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
    const issues: GitHubIssue[] = raw
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

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          repository: `${owner}/${repo}`,
          state,
          issues,
          total: issues.length,
        }, null, 2),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Failed to fetch GitHub issues: ${String(err)}` }],
      isError: true,
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
