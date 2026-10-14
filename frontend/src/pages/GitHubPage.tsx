import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Github,
  GitPullRequest,
  CircleDot,
  AlertTriangle,
  Clock,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Tag,
  User,
  GitBranch,
} from 'lucide-react';
import {
  githubApi,
  type GitHubIssue,
  type GitHubPullRequest,
  type GitHubStaleIssue,
  type GitHubConnectionStatus,
  type GitHubActivitySummary,
} from '../services/endpoints';

type TabId = 'overview' | 'issues' | 'pull-requests' | 'stale';

export default function GitHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const statusQuery = useQuery({
    queryKey: ['github-status'],
    queryFn: () => githubApi.getStatus(),
    staleTime: 60_000,
    retry: 1,
  });

  const summaryQuery = useQuery({
    queryKey: ['github-summary'],
    queryFn: () => githubApi.getActivitySummary(),
    staleTime: 60_000,
    retry: 1,
  });

  const issuesQuery = useQuery({
    queryKey: ['github-issues'],
    queryFn: () => githubApi.getIssues({ state: 'open', limit: 30 }),
    staleTime: 60_000,
    retry: 1,
  });

  const prsQuery = useQuery({
    queryKey: ['github-prs'],
    queryFn: () => githubApi.getPullRequests({ state: 'open', limit: 20 }),
    staleTime: 60_000,
    retry: 1,
  });

  const staleQuery = useQuery({
    queryKey: ['github-stale'],
    queryFn: () => githubApi.getStaleIssues({ daysInactive: 14 }),
    staleTime: 60_000,
    retry: 1,
  });

  const status = statusQuery.data;
  const summary = summaryQuery.data;
  const anyLoading = statusQuery.isLoading || summaryQuery.isLoading;

  const handleRefresh = useCallback(() => {
    statusQuery.refetch();
    summaryQuery.refetch();
    issuesQuery.refetch();
    prsQuery.refetch();
    staleQuery.refetch();
  }, [statusQuery, summaryQuery, issuesQuery, prsQuery, staleQuery]);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'issues', label: 'Issues', count: summary?.openIssuesCount },
    { id: 'pull-requests', label: 'Pull Requests', count: summary?.openPullRequestsCount },
    { id: 'stale', label: 'Stale & Blockers', count: (summary?.staleIssuesCount ?? 0) + (summary?.potentialBlockersCount ?? 0) },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Github size={14} /> GitHub Integration
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Repository Intelligence</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Monitor issues, pull requests, stale work, and blockers from your connected repository.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={anyLoading}
          className="btn btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={anyLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Connection Status */}
      <ConnectionBanner status={status} loading={statusQuery.isLoading} />

      {/* Stat Cards */}
      {summary && <StatCards summary={summary} />}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-text-muted hover:text-white hover:border-border'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-surface-elevated text-[10px] font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab summary={summary} loading={summaryQuery.isLoading} />}
      {activeTab === 'issues' && <IssuesTab issues={issuesQuery.data?.issues ?? []} loading={issuesQuery.isLoading} source={issuesQuery.data?.source} />}
      {activeTab === 'pull-requests' && <PullRequestsTab prs={prsQuery.data?.pullRequests ?? []} loading={prsQuery.isLoading} source={prsQuery.data?.source} />}
      {activeTab === 'stale' && <StaleTab staleIssues={staleQuery.data?.staleIssues ?? []} blockers={summary?.potentialBlockers ?? []} loading={staleQuery.isLoading} source={staleQuery.data?.source} />}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ConnectionBanner({ status, loading }: { status?: GitHubConnectionStatus; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-surface-card border border-border rounded-xl p-4 animate-pulse">
        <div className="h-10 bg-surface-elevated rounded" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-surface-card border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle size={20} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Unable to check GitHub connection</h2>
          <p className="text-xs text-text-muted">Ensure the backend server is running at localhost:3001.</p>
        </div>
      </div>
    );
  }

  const isLive = status.source === 'live';
  const isMock = status.source === 'mock';

  return (
    <div className={`bg-surface-card border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
      status.connected ? 'border-emerald-500/30' : 'border-amber-500/30'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          status.connected
            ? 'bg-emerald-500/10 border border-emerald-500/20'
            : 'bg-amber-500/10 border border-amber-500/20'
        }`}>
          {status.connected ? (
            <CheckCircle2 size={20} className="text-emerald-400" />
          ) : (
            <XCircle size={20} className="text-amber-400" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              {status.connected ? 'Connected' : 'Disconnected'}
            </h2>
            <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
              isLive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : isMock ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isLive ? 'Live API' : isMock ? 'Mock Data' : 'No Token'}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{status.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted sm:border-l border-border sm:pl-4">
        <div>
          <span className="block text-[10px] uppercase font-semibold text-text-muted">Repository</span>
          <span className="text-text-primary font-mono">{status.configuredRepo}</span>
        </div>
        {status.rateLimitRemaining !== undefined && (
          <div>
            <span className="block text-[10px] uppercase font-semibold text-text-muted">Rate Limit</span>
            <span className="text-text-primary font-mono">{status.rateLimitRemaining} remaining</span>
          </div>
        )}
        <div>
          <span className="block text-[10px] uppercase font-semibold text-text-muted">Token</span>
          <span className={`font-mono ${status.hasToken ? 'text-emerald-400' : 'text-amber-400'}`}>
            {status.hasToken ? 'Configured' : 'Not Set'}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCards({ summary }: { summary: GitHubActivitySummary }) {
  const cards = [
    { label: 'Open Issues', value: summary.openIssuesCount, icon: CircleDot, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'Open PRs', value: summary.openPullRequestsCount, icon: GitPullRequest, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { label: 'Stale Issues', value: summary.staleIssuesCount, icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { label: 'Blockers', value: summary.potentialBlockersCount, icon: AlertTriangle, color: summary.potentialBlockersCount > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-surface-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${color}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-[11px] text-text-muted font-medium">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewTab({ summary, loading }: { summary?: GitHubActivitySummary; loading: boolean }) {
  if (loading) return <LoadingSkeleton rows={4} />;
  if (!summary) return <EmptyState message="No activity data available." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Recent Issues */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CircleDot size={14} className="text-blue-400" /> Recent Issues
          </h3>
          <SourceBadge source={summary.source} />
        </div>
        {summary.recentIssues.length === 0 ? (
          <p className="text-xs text-text-muted">No recent issues.</p>
        ) : (
          <div className="space-y-2">
            {summary.recentIssues.map((issue) => (
              <IssueRow key={issue.id} issue={issue} compact />
            ))}
          </div>
        )}
      </div>

      {/* Recent PRs */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <GitPullRequest size={14} className="text-purple-400" /> Recent Pull Requests
          </h3>
          <SourceBadge source={summary.source} />
        </div>
        {summary.recentPullRequests.length === 0 ? (
          <p className="text-xs text-text-muted">No recent pull requests.</p>
        ) : (
          <div className="space-y-2">
            {summary.recentPullRequests.map((pr) => (
              <PRRow key={pr.id} pr={pr} compact />
            ))}
          </div>
        )}
      </div>

      {/* Potential Blockers */}
      {summary.potentialBlockers.length > 0 && (
        <div className="bg-surface-card border border-red-500/20 rounded-xl p-5 space-y-3 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-400" /> Potential Blockers
          </h3>
          <div className="space-y-2">
            {summary.potentialBlockers.map((b) => (
              <div key={b.issueNumber} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white hover:text-indigo-400 transition-colors flex items-center gap-1">
                    #{b.issueNumber} {b.title}
                    <ExternalLink size={10} className="shrink-0" />
                  </a>
                  <p className="text-[11px] text-text-muted mt-0.5">{b.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-amber-400 font-mono">{b.daysInactive}d inactive</span>
                    {b.labels.map((l) => (
                      <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssuesTab({ issues, loading, source }: { issues: GitHubIssue[]; loading: boolean; source?: string }) {
  if (loading) return <LoadingSkeleton rows={6} />;
  if (issues.length === 0) return <EmptyState message="No open issues found." />;

  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-white">{issues.length} Open Issue{issues.length !== 1 ? 's' : ''}</h3>
        {source && <SourceBadge source={source} />}
      </div>
      <div className="divide-y divide-border/60">
        {issues.map((issue) => (
          <IssueRow key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function PullRequestsTab({ prs, loading, source }: { prs: GitHubPullRequest[]; loading: boolean; source?: string }) {
  if (loading) return <LoadingSkeleton rows={4} />;
  if (prs.length === 0) return <EmptyState message="No open pull requests found." />;

  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-white">{prs.length} Open Pull Request{prs.length !== 1 ? 's' : ''}</h3>
        {source && <SourceBadge source={source} />}
      </div>
      <div className="divide-y divide-border/60">
        {prs.map((pr) => (
          <PRRow key={pr.id} pr={pr} />
        ))}
      </div>
    </div>
  );
}

function StaleTab({ staleIssues, blockers, loading, source }: { staleIssues: GitHubStaleIssue[]; blockers: any[]; loading: boolean; source?: string }) {
  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      {staleIssues.length === 0 && blockers.length === 0 ? (
        <EmptyState message="No stale issues or blockers found. Your repository is in great shape!" icon={<CheckCircle2 size={32} className="text-emerald-400" />} />
      ) : (
        <>
          {staleIssues.length > 0 && (
            <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  {staleIssues.length} Stale Issue{staleIssues.length !== 1 ? 's' : ''}
                </h3>
                {source && <SourceBadge source={source} />}
              </div>
              <div className="divide-y divide-border/60">
                {staleIssues.map((s) => (
                  <div key={s.issue.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <a href={s.issue.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                        <span className="text-text-muted font-mono">#{s.issue.number}</span>
                        {s.issue.title}
                        <ExternalLink size={10} className="shrink-0 text-text-muted" />
                      </a>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {s.issue.labels.map((l) => (
                          <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border flex items-center gap-1">
                            <Tag size={8} /> {l}
                          </span>
                        ))}
                        {s.issue.assignees.map((a) => (
                          <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                            <User size={8} /> {a}
                          </span>
                        ))}
                      </div>
                      {s.blockerReason && (
                        <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={10} /> {s.blockerReason}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-mono font-bold ${s.daysInactive >= 30 ? 'text-red-400' : 'text-amber-400'}`}>
                        {s.daysInactive}d
                      </span>
                      <span className="block text-[10px] text-text-muted">inactive</span>
                      {s.isPotentialBlocker && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 mt-1 inline-block">
                          Blocker
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Reusable row components ────────────────────────────────────────────── */

function IssueRow({ issue, compact }: { issue: GitHubIssue; compact?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${compact ? 'py-2' : 'p-4'}`}>
      <div className="min-w-0 flex-1">
        <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5">
          <CircleDot size={12} className={issue.state === 'open' ? 'text-emerald-400' : 'text-red-400'} />
          <span className="text-text-muted font-mono">#{issue.number}</span>
          <span className="truncate">{issue.title}</span>
          <ExternalLink size={10} className="shrink-0 text-text-muted" />
        </a>
        {!compact && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {issue.labels.map((l) => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">{l}</span>
            ))}
            {issue.assignees.map((a) => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <User size={8} /> {a}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="text-[10px] text-text-muted shrink-0 font-mono">{formatRelative(issue.updatedAt)}</span>
    </div>
  );
}

function PRRow({ pr, compact }: { pr: GitHubPullRequest; compact?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 ${compact ? 'py-2' : 'p-4'}`}>
      <div className="min-w-0 flex-1">
        <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white hover:text-indigo-400 transition-colors flex items-center gap-1.5">
          <GitPullRequest size={12} className="text-purple-400" />
          <span className="text-text-muted font-mono">#{pr.number}</span>
          <span className="truncate">{pr.title}</span>
          {pr.draft && <span className="text-[10px] px-1 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">Draft</span>}
          <ExternalLink size={10} className="shrink-0 text-text-muted" />
        </a>
        {!compact && (
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {pr.headBranch && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1 font-mono">
                <GitBranch size={8} /> {pr.headBranch} → {pr.baseBranch}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
              <User size={8} /> {pr.user}
            </span>
            {pr.labels.map((l) => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted border border-border">{l}</span>
            ))}
          </div>
        )}
      </div>
      <span className="text-[10px] text-text-muted shrink-0 font-mono">{formatRelative(pr.updatedAt)}</span>
    </div>
  );
}

/* ─── Utility ────────────────────────────────────────────────────────────── */

function SourceBadge({ source }: { source: string }) {
  const isMock = source === 'mock_data' || source === 'mock';
  return (
    <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border ${
      isMock ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    }`}>
      {isMock ? 'Mock' : 'Live'}
    </span>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="bg-surface-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 bg-surface-elevated rounded" />
      ))}
    </div>
  );
}

function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-border rounded-xl p-12 text-center">
      <div className="flex justify-center mb-3">
        {icon || <Info size={32} className="text-text-muted" />}
      </div>
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
