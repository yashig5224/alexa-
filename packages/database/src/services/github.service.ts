import type {
  GitHubIssue,
  GitHubPullRequest,
  GitHubStaleIssue,
  GitHubBlocker,
  GitHubActivitySummary,
  GitHubConnectionStatus,
} from '@trackmate/shared';
import { ProjectService } from './project.service.js';

export interface RepoCoordinates {
  owner: string;
  repo: string;
  source: 'project' | 'explicit' | 'env_default';
}

export class GitHubService {
  /**
   * Determine if mock data should be returned (dev/test fallback or explicit mock flag)
   */
  static isMockMode(): boolean {
    if (process.env['GITHUB_MOCK_MODE'] === 'true') return true;
    if (process.env['NODE_ENV'] === 'test') return true;
    // If no token is set in non-production, allow mock fallback for offline hackathon demos
    if (!process.env['GITHUB_TOKEN'] && process.env['NODE_ENV'] !== 'production') {
      return true;
    }
    return false;
  }

  /**
   * Resolve repository owner and name from explicit parameters, linked project, or environment defaults
   */
  static async resolveRepo(params: {
    owner?: string | undefined;
    repo?: string | undefined;
    projectId?: string | undefined;
  }): Promise<RepoCoordinates> {
    // 1. Explicit owner & repo
    if (params.owner && params.repo) {
      return { owner: params.owner.trim(), repo: params.repo.trim(), source: 'explicit' };
    }

    // 2. Resolve from linked Project
    if (params.projectId) {
      const project = await ProjectService.getProjectById(params.projectId).catch(() => null);
      if (project?.githubRepo) {
        const parts = project.githubRepo.split('/');
        if (parts.length === 2 && parts[0] && parts[1]) {
          return { owner: parts[0].trim(), repo: parts[1].trim(), source: 'project' };
        }
      }
    }

    // 3. Fall back to environment defaults
    const defaultRepoCombined = process.env['GITHUB_DEFAULT_REPO'];
    if (defaultRepoCombined && defaultRepoCombined.includes('/')) {
      const [envOwner, envRepo] = defaultRepoCombined.split('/');
      if (envOwner && envRepo) {
        return { owner: envOwner.trim(), repo: envRepo.trim(), source: 'env_default' };
      }
    }

    const envOwner = process.env['GITHUB_DEFAULT_OWNER'] ?? 'trackmate-ai';
    const envRepo = defaultRepoCombined ?? 'trackmate';
    return { owner: envOwner.trim(), repo: envRepo.trim(), source: 'env_default' };
  }

  /**
   * Build standard headers for GitHub REST API calls
   */
  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'TrackMate-AI/1.0',
    };
    const token = process.env['GITHUB_TOKEN'];
    if (token && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return headers;
  }

  /**
   * Fetch open or closed issues for a repository (read-only)
   */
  static async getIssues(params: {
    owner?: string | undefined;
    repo?: string | undefined;
    projectId?: string | undefined;
    state?: 'open' | 'closed' | 'all' | undefined;
    limit?: number | undefined;
  }): Promise<{
    repository: string;
    state: string;
    issues: GitHubIssue[];
    total: number;
    source: 'github_api' | 'mock_data';
  }> {
    const coords = await this.resolveRepo(params);
    const state = params.state ?? 'open';
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);

    const token = process.env['GITHUB_TOKEN'];

    // In production without token and not in test/mock mode, return clear error
    if (!token && !this.isMockMode()) {
      throw new Error(
        'GitHub credentials missing. Configure GITHUB_TOKEN in backend environment to access live repository data.'
      );
    }

    // Attempt live GitHub API call if token is provided or mock mode not forced
    if (token && process.env['GITHUB_MOCK_MODE'] !== 'true') {
      try {
        const url = `https://api.github.com/repos/${coords.owner}/${coords.repo}/issues?state=${state}&per_page=${limit}`;
        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('GitHub API authentication failed. Verify GITHUB_TOKEN validity.');
          }
          if (response.status === 403) {
            throw new Error('GitHub API rate limit exceeded or access forbidden.');
          }
          if (response.status === 404) {
            throw new Error(`GitHub repository "${coords.owner}/${coords.repo}" not found.`);
          }
          throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
        }

        const raw = (await response.json()) as any[];
        // Filter out pull requests (GitHub includes PRs in the /issues endpoint)
        const issues: GitHubIssue[] = raw
          .filter((item) => !item.pull_request)
          .map((item) => ({
            id: item.id,
            number: item.number,
            title: item.title,
            state: item.state as 'open' | 'closed',
            url: item.html_url,
            labels: Array.isArray(item.labels) ? item.labels.map((l: any) => l.name ?? String(l)) : [],
            assignees: Array.isArray(item.assignees) ? item.assignees.map((a: any) => a.login) : [],
            createdAt: item.created_at,
            updatedAt: item.updated_at,
            body: item.body ?? null,
          }));

        return {
          repository: `${coords.owner}/${coords.repo}`,
          state,
          issues,
          total: issues.length,
          source: 'github_api',
        };
      } catch (err: any) {
        if (!this.isMockMode()) {
          throw err;
        }
        // Fall through to mock in development mode
      }
    }

    // Deterministic Mock Data for testing and offline development
    const mockIssues = this.getMockIssues(coords.owner, coords.repo).filter(
      (i) => state === 'all' || i.state === state
    ).slice(0, limit);

    return {
      repository: `${coords.owner}/${coords.repo}`,
      state,
      issues: mockIssues,
      total: mockIssues.length,
      source: 'mock_data',
    };
  }

  /**
   * Fetch open or closed pull requests for a repository (read-only)
   */
  static async getPullRequests(params: {
    owner?: string | undefined;
    repo?: string | undefined;
    projectId?: string | undefined;
    state?: 'open' | 'closed' | 'all' | undefined;
    limit?: number | undefined;
  }): Promise<{
    repository: string;
    state: string;
    pullRequests: GitHubPullRequest[];
    total: number;
    source: 'github_api' | 'mock_data';
  }> {
    const coords = await this.resolveRepo(params);
    const state = params.state ?? 'open';
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const token = process.env['GITHUB_TOKEN'];

    if (!token && !this.isMockMode()) {
      throw new Error(
        'GitHub credentials missing. Configure GITHUB_TOKEN in backend environment to access live repository data.'
      );
    }

    if (token && process.env['GITHUB_MOCK_MODE'] !== 'true') {
      try {
        const url = `https://api.github.com/repos/${coords.owner}/${coords.repo}/pulls?state=${state}&per_page=${limit}`;
        const response = await fetch(url, { headers: this.getHeaders() });

        if (!response.ok) {
          if (response.status === 401) throw new Error('GitHub authentication failed.');
          if (response.status === 403) throw new Error('GitHub API rate limit exceeded.');
          if (response.status === 404) throw new Error(`Repository "${coords.owner}/${coords.repo}" not found.`);
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const raw = (await response.json()) as any[];
        const pullRequests: GitHubPullRequest[] = raw.map((pr) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state as 'open' | 'closed',
          url: pr.html_url,
          user: pr.user?.login ?? 'unknown',
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          draft: !!pr.draft,
          assignees: Array.isArray(pr.assignees) ? pr.assignees.map((a: any) => a.login) : [],
          labels: Array.isArray(pr.labels) ? pr.labels.map((l: any) => l.name ?? String(l)) : [],
          headBranch: pr.head?.ref,
          baseBranch: pr.base?.ref,
        }));

        return {
          repository: `${coords.owner}/${coords.repo}`,
          state,
          pullRequests,
          total: pullRequests.length,
          source: 'github_api',
        };
      } catch (err: any) {
        if (!this.isMockMode()) throw err;
      }
    }

    const mockPrs = this.getMockPullRequests(coords.owner, coords.repo).filter(
      (pr) => state === 'all' || pr.state === state
    ).slice(0, limit);

    return {
      repository: `${coords.owner}/${coords.repo}`,
      state,
      pullRequests: mockPrs,
      total: mockPrs.length,
      source: 'mock_data',
    };
  }

  /**
   * Filter issues that have not been updated for a given number of days (default 14 days)
   * and analyze potential blocker indicators.
   */
  static async getStaleIssues(params: {
    owner?: string | undefined;
    repo?: string | undefined;
    projectId?: string | undefined;
    daysInactive?: number | undefined;
    limit?: number | undefined;
  }): Promise<{
    repository: string;
    thresholdDays: number;
    staleIssues: GitHubStaleIssue[];
    total: number;
    source: 'github_api' | 'mock_data';
  }> {
    const coords = await this.resolveRepo(params);
    const thresholdDays = params.daysInactive ?? 14;
    const limit = params.limit ?? 20;

    // Fetch open issues
    const { issues, source } = await this.getIssues({
      owner: coords.owner,
      repo: coords.repo,
      projectId: params.projectId,
      state: 'open',
      limit: 50,
    });

    const now = Date.now();
    const staleIssues: GitHubStaleIssue[] = [];

    for (const issue of issues) {
      const updatedTime = new Date(issue.updatedAt).getTime();
      const daysInactive = Math.floor((now - updatedTime) / (1000 * 60 * 60 * 24));

      if (daysInactive >= thresholdDays) {
        // Block evaluation based on facts: labels and title/body indicators
        const blockerAnalysis = this.analyzeBlocker(issue);
        staleIssues.push({
          issue,
          daysInactive,
          lastUpdated: issue.updatedAt,
          isPotentialBlocker: blockerAnalysis.isBlocker,
          blockerReason: blockerAnalysis.reason,
        });
      }
    }

    // Sort by most days inactive first
    staleIssues.sort((a, b) => b.daysInactive - a.daysInactive);

    return {
      repository: `${coords.owner}/${coords.repo}`,
      thresholdDays,
      staleIssues: staleIssues.slice(0, limit),
      total: staleIssues.length,
      source,
    };
  }

  /**
   * Analyze if an issue represents a potential project blocker based on verified data
   */
  private static analyzeBlocker(issue: GitHubIssue): { isBlocker: boolean; reason?: string } {
    const lowerLabels = issue.labels.map((l) => l.toLowerCase());
    const lowerTitle = issue.title.toLowerCase();
    const lowerBody = (issue.body ?? '').toLowerCase();

    // 1. Explicit blocker/critical labels
    if (lowerLabels.some((l) => ['blocker', 'critical', 'p0', 'high-priority', 'showstopper'].includes(l))) {
      return {
        isBlocker: true,
        reason: `Labeled with high-urgency flag: "${issue.labels.find((l) =>
          ['blocker', 'critical', 'p0', 'high-priority', 'showstopper'].includes(l.toLowerCase())
        )}"`,
      };
    }

    // 2. Keyword detection in title
    if (
      lowerTitle.includes('block') ||
      lowerTitle.includes('prevents') ||
      lowerTitle.includes('fatal') ||
      lowerTitle.includes('cannot start') ||
      lowerTitle.includes('regression')
    ) {
      return {
        isBlocker: true,
        reason: `Title indicates blocking dependency: "${issue.title}"`,
      };
    }

    // 3. Keyword detection in body
    if (
      lowerBody.includes('blocks release') ||
      lowerBody.includes('blocking PR') ||
      lowerBody.includes('blocks deployment') ||
      lowerBody.includes('is blocking')
    ) {
      return {
        isBlocker: true,
        reason: 'Issue description explicitly mentions blocking downstream deliverables',
      };
    }

    return { isBlocker: false };
  }

  /**
   * Summarize overall GitHub activity: open issues, PRs, stale items, and potential blockers
   */
  static async summarizeActivity(params: {
    owner?: string | undefined;
    repo?: string | undefined;
    projectId?: string | undefined;
  }): Promise<GitHubActivitySummary> {
    const coords = await this.resolveRepo(params);

    const [issuesResult, prsResult] = await Promise.all([
      this.getIssues({ ...params, state: 'open', limit: 30 }),
      this.getPullRequests({ ...params, state: 'open', limit: 20 }),
    ]);

    const now = Date.now();
    const potentialBlockers: GitHubBlocker[] = [];
    let staleCount = 0;

    for (const issue of issuesResult.issues) {
      const updatedTime = new Date(issue.updatedAt).getTime();
      const daysInactive = Math.floor((now - updatedTime) / (1000 * 60 * 60 * 24));

      if (daysInactive >= 14) {
        staleCount++;
      }

      const analysis = this.analyzeBlocker(issue);
      if (analysis.isBlocker) {
        potentialBlockers.push({
          issueNumber: issue.number,
          title: issue.title,
          url: issue.url,
          reason: analysis.reason ?? 'Potential blocker identified',
          labels: issue.labels,
          daysInactive,
        });
      }
    }

    return {
      repository: `${coords.owner}/${coords.repo}`,
      openIssuesCount: issuesResult.total,
      openPullRequestsCount: prsResult.total,
      staleIssuesCount: staleCount,
      potentialBlockersCount: potentialBlockers.length,
      recentIssues: issuesResult.issues.slice(0, 5),
      recentPullRequests: prsResult.pullRequests.slice(0, 5),
      potentialBlockers,
      lastChecked: new Date().toISOString(),
      source: issuesResult.source,
    };
  }

  /**
   * Check connection status and configuration state
   */
  static async getConnectionStatus(params?: {
    owner?: string | undefined;
    repo?: string | undefined;
    projectId?: string | undefined;
  }): Promise<GitHubConnectionStatus> {
    const coords = await this.resolveRepo(params ?? {});
    const token = process.env['GITHUB_TOKEN'];
    const repoStr = `${coords.owner}/${coords.repo}`;

    if (!token) {
      if (this.isMockMode()) {
        return {
          connected: true,
          configuredRepo: repoStr,
          hasToken: false,
          source: 'mock',
          message: 'Running in simulated development mode. Configure GITHUB_TOKEN for live repository sync.',
        };
      }
      return {
        connected: false,
        configuredRepo: repoStr,
        hasToken: false,
        source: 'disconnected',
        message: 'No GITHUB_TOKEN configured. Provide a GitHub personal access token in backend .env to connect.',
      };
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${coords.owner}/${coords.repo}`, {
        headers: this.getHeaders(),
      });
      const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');

      if (!res.ok) {
        return {
          connected: false,
          configuredRepo: repoStr,
          hasToken: true,
          source: 'disconnected',
          message: `GitHub returned status ${res.status}: ${res.statusText}`,
        };
      }

      return {
        connected: true,
        configuredRepo: repoStr,
        hasToken: true,
        source: 'live',
        rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : undefined,
        message: 'Connected to GitHub REST API (read-only).',
      };
    } catch (e: any) {
      return {
        connected: false,
        configuredRepo: repoStr,
        hasToken: true,
        source: 'disconnected',
        message: `Network error connecting to GitHub: ${e.message}`,
      };
    }
  }

  /**
   * Deterministic realistic mock issues for testing without external network
   */
  private static getMockIssues(owner: string, repo: string): GitHubIssue[] {
    const now = Date.now();
    return [
      {
        id: 101,
        number: 14,
        title: 'Fix Streamable HTTP session handling on connection reset',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/issues/14`,
        labels: ['bug', 'mcp-transport', 'blocker'],
        assignees: ['alexachen'],
        createdAt: new Date(now - 86400000 * 2).toISOString(),
        updatedAt: new Date(now - 3600000 * 4).toISOString(),
        body: 'When an MCP client disconnects abruptly, the Mcp-Session-Id mapping should be pruned. Blocks release.',
      },
      {
        id: 102,
        number: 19,
        title: 'Add Amazon Bedrock Converse streaming chunk support',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/issues/19`,
        labels: ['enhancement', 'bedrock', 'ai-agent'],
        assignees: ['jordanlee'],
        createdAt: new Date(now - 86400000 * 22).toISOString(),
        updatedAt: new Date(now - 86400000 * 18).toISOString(), // 18 days inactive -> STALE
        body: 'Support incremental token streaming in addition to single-turn ConverseCommand.',
      },
      {
        id: 103,
        number: 23,
        title: 'Implement Dark / Light mode toggle persistence in localStorage',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/issues/23`,
        labels: ['frontend', 'ui/ux'],
        assignees: ['samrivera'],
        createdAt: new Date(now - 86400000 * 25).toISOString(),
        updatedAt: new Date(now - 86400000 * 19).toISOString(), // 19 days inactive -> STALE
        body: 'Persist user theme preference across browser refreshes and system color scheme changes.',
      },
      {
        id: 104,
        number: 27,
        title: 'Docker Compose healthcheck configuration for container orchestration',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/issues/27`,
        labels: ['devops', 'docker', 'p0'],
        assignees: ['alexachen'],
        createdAt: new Date(now - 86400000 * 3).toISOString(),
        updatedAt: new Date(now - 3600000 * 12).toISOString(),
        body: 'Configure backend healthcheck start_period to allow database migration and seeding. Blocks deployment.',
      },
      {
        id: 105,
        number: 31,
        title: 'TypeScript strict null checks in task service',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/issues/31`,
        labels: ['maintenance'],
        assignees: ['jordanlee'],
        createdAt: new Date(now - 86400000 * 6).toISOString(),
        updatedAt: new Date(now - 86400000 * 5).toISOString(),
        body: 'Resolve null-coalescing warnings in task filter query builders.',
      },
    ];
  }

  /**
   * Deterministic realistic mock pull requests
   */
  private static getMockPullRequests(owner: string, repo: string): GitHubPullRequest[] {
    const now = Date.now();
    return [
      {
        id: 201,
        number: 28,
        title: 'feat(mcp): Add Streamable HTTP transport compliant with spec 2025-11-25',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/pull/28`,
        user: 'alexachen',
        createdAt: new Date(now - 86400000 * 1).toISOString(),
        updatedAt: new Date(now - 3600000 * 2).toISOString(),
        draft: false,
        assignees: ['alexachen', 'jordanlee'],
        labels: ['mcp', 'feature'],
        headBranch: 'feat/streamable-http',
        baseBranch: 'main',
      },
      {
        id: 202,
        number: 29,
        title: 'fix(agent): handle Bedrock token throttling with exponential backoff',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/pull/29`,
        user: 'jordanlee',
        createdAt: new Date(now - 86400000 * 4).toISOString(),
        updatedAt: new Date(now - 86400000 * 2).toISOString(),
        draft: true,
        assignees: ['jordanlee'],
        labels: ['ai-agent', 'bugfix'],
        headBranch: 'fix/bedrock-backoff',
        baseBranch: 'main',
      },
      {
        id: 203,
        number: 30,
        title: 'docs: add architecture sequence diagram for MCP reasoning loop',
        state: 'open',
        url: `https://github.com/${owner}/${repo}/pull/30`,
        user: 'samrivera',
        createdAt: new Date(now - 86400000 * 6).toISOString(),
        updatedAt: new Date(now - 86400000 * 4).toISOString(),
        draft: false,
        assignees: ['samrivera'],
        labels: ['documentation'],
        headBranch: 'docs/architecture',
        baseBranch: 'main',
      },
    ];
  }
}
