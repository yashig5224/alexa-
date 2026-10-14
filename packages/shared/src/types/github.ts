// ─────────────────────────────────────────────────────────────────────────────
// GitHub Integration Types (Phase 5A)
// ─────────────────────────────────────────────────────────────────────────────

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  body: string | null;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  assignees: string[];
  labels: string[];
  headBranch?: string | undefined;
  baseBranch?: string | undefined;
}

export interface GitHubBlocker {
  issueNumber: number;
  title: string;
  url: string;
  reason: string;
  labels: string[];
  daysInactive: number;
}

export interface GitHubStaleIssue {
  issue: GitHubIssue;
  daysInactive: number;
  lastUpdated: string;
  isPotentialBlocker: boolean;
  blockerReason?: string | undefined;
}

export interface GitHubActivitySummary {
  repository: string;
  openIssuesCount: number;
  openPullRequestsCount: number;
  staleIssuesCount: number;
  potentialBlockersCount: number;
  recentIssues: GitHubIssue[];
  recentPullRequests: GitHubPullRequest[];
  potentialBlockers: GitHubBlocker[];
  lastChecked: string;
  source: 'github_api' | 'mock_data';
}

export interface GitHubConnectionStatus {
  connected: boolean;
  configuredRepo: string | null;
  hasToken: boolean;
  source: 'live' | 'mock' | 'disconnected';
  rateLimitRemaining?: number | undefined;
  message?: string | undefined;
}
