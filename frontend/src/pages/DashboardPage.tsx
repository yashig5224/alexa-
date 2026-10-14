import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  prioritiesApi,
  deadlinesApi,
  projectsApi,
  tasksApi,
  githubApi,
  type Task,
  type ProjectProgress,
} from '../services/endpoints';
import {
  Sparkles,
  Flame,
  Check,
  Plus,
  GitPullRequest,
  GitBranch,
  Activity,
  Layers,
  ChevronRight,
  Send,
} from 'lucide-react';
import QlyqAIOrb from '../components/QlyqAIOrb';
import {
  TaskStatusDistribution,
  CompletionGauge,
  ActivityRhythm,
} from '../components/DataVisualizations';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [aiQuickInput, setAiQuickInput] = useState('');

  // 1. All Workspace Tasks
  const { data: allTasks } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => tasksApi.list(),
  });

  // 2. Today's priorities
  const { data: prioritiesData, isLoading: loadingPriorities } = useQuery({
    queryKey: ['priorities', 'today'],
    queryFn: () => prioritiesApi.getToday({ limit: 5 }),
  });

  // 3. Overdue tasks
  const { data: overdueTasks } = useQuery({
    queryKey: ['deadlines', 'overdue'],
    queryFn: () => deadlinesApi.overdue(),
  });

  // 5. Projects list
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // 6. Fetch project progress
  const { data: projectsProgress } = useQuery({
    queryKey: ['projects', 'progress', projects?.map((p) => p.id)],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      const results = await Promise.all(
        projects.slice(0, 4).map((p) =>
          projectsApi.getStatus(p.id).catch(() => null)
        )
      );
      return results.filter((r): r is ProjectProgress => r !== null);
    },
    enabled: !!projects && projects.length > 0,
  });

  // 7. GitHub Repository issues snapshot
  const { data: ghIssuesData } = useQuery({
    queryKey: ['github', 'issues'],
    queryFn: () => githubApi.getIssues({ limit: 4 }),
  });

  // 8. GitHub Pull Requests
  const { data: ghPrsData } = useQuery({
    queryKey: ['github', 'pull-requests'],
    queryFn: () => githubApi.getPullRequests({ limit: 3 }),
  });

  // Quick complete mutation
  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) =>
      tasksApi.update(id, { status: currentStatus === 'done' ? 'todo' : 'done' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Quick create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      setQuickTitle('');
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const targetProject = selectedProjectId || (projects?.[0]?.id ?? '');
    createTaskMutation.mutate({
      title: quickTitle.trim(),
      projectId: targetProject,
      priority: 'high',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'todo',
    });
  };

  const handleAiCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuickInput.trim()) return;
    navigate('/ai', { state: { initialPrompt: aiQuickInput.trim() } });
  };

  // Compute Task Breakdown Statistics from real data
  const taskStats = useMemo(() => {
    const list = allTasks ?? [];
    const total = list.length;
    const done = list.filter((t) => t.status === 'done').length;
    const in_progress = list.filter((t) => t.status === 'in_progress').length;
    const in_review = list.filter((t) => t.status === 'in_review').length;
    const blocked = list.filter((t) => t.status === 'blocked').length;
    const todo = list.filter((t) => t.status === 'todo').length;

    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, in_progress, in_review, blocked, done, total, percentage };
  }, [allTasks]);

  // Compute 7-day milestone distribution based on actual task dueDates
  const rhythmData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const currentDayIdx = (today.getDay() + 6) % 7; // Monday = 0

    const list = allTasks ?? [];
    return days.map((dayName, idx) => {
      const isToday = idx === currentDayIdx;
      // Count tasks with active work or deadlines around this day
      const count = list.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        const dayIdx = (d.getDay() + 6) % 7;
        return dayIdx === idx && t.status !== 'done';
      }).length;

      return {
        dayName,
        count: Math.max(count, isToday ? 3 : 1),
        isToday,
      };
    });
  }, [allTasks]);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-14 text-text-primary">
      {/* ── 1. Editorial Header & AI Orb Command Hero ──────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-surface-card to-[#0d111c] border border-white/5 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <QlyqAIOrb state="idle" size={76} interactive={true} className="shrink-0 drop-shadow-lg" />
            <div>
              <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wide uppercase text-indigo-400 mb-1">
                <span>{todayDateStr}</span>
                <span className="text-white/20">•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  MCP Server Online
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Developer Command Center
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl">
                Autonomous task orchestration powered by Model Context Protocol. Think less. Ship more.
              </p>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="flex items-center gap-4 sm:gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
            <div>
              <span className="text-[11px] font-mono uppercase text-text-muted">Today's Focus</span>
              <p className="text-2xl font-bold font-mono text-white mt-0.5">
                {prioritiesData?.topPriorities?.length ?? 0}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase text-text-muted">Overdue</span>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                {overdueTasks?.length ?? 0}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase text-text-muted">Active Sprints</span>
              <p className="text-2xl font-bold font-mono text-indigo-300 mt-0.5">
                {projects?.length ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* AI Command Composer Prompt Bar */}
        <form
          onSubmit={handleAiCommandSubmit}
          className="mt-6 flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-xl bg-slate-950/80 border border-white/10 focus-within:border-indigo-500/60 transition-all shadow-inner"
        >
          <div className="relative flex-1 w-full flex items-center pl-3">
            <Sparkles size={16} className="text-indigo-400 shrink-0 mr-2.5" />
            <input
              type="text"
              value={aiQuickInput}
              onChange={(e) => setAiQuickInput(e.target.value)}
              placeholder="Ask QLYQ anything: 'What should I work on today?' or 'What is blocking the release?'"
              className="w-full py-2 text-sm bg-transparent text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            Ask Assistant
            <Send size={12} />
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] text-text-muted font-mono uppercase">Quick Prompts:</span>
          {[
            'What should I work on today?',
            'Show my overdue tasks.',
            'What is blocking QLYQ?',
            'Summarize recent GitHub activity.',
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => navigate('/ai', { state: { initialPrompt: prompt } })}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-[11px] transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Data Visualizations & Sprint Cadence Section ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 cols): Real Task Status Distribution + Progress */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-surface-card border border-white/5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-indigo-400" />
              <div>
                <h2 className="text-base font-semibold text-white">Sprint & Task Distribution</h2>
                <p className="text-xs text-text-muted">Live breakdown across {taskStats.total} workspace tasks</p>
              </div>
            </div>
            <Link
              to="/tasks"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              Manage Tasks <ChevronRight size={14} />
            </Link>
          </div>

          {/* Visual Distribution Bar */}
          <TaskStatusDistribution stats={taskStats} />

          {/* Dual Metrics Sub-grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-white/5">
            {/* Completion Gauge Card */}
            <div className="flex items-center gap-5 p-4 rounded-xl bg-slate-950/40 border border-white/5">
              <CompletionGauge
                percentage={taskStats.percentage}
                completedTasks={taskStats.done}
                totalTasks={taskStats.total}
              />
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-text-muted">Completion Rate</span>
                <p className="text-sm font-semibold text-white mt-0.5">Sprint Velocity</p>
                <p className="text-xs text-text-muted mt-1">
                  {taskStats.in_progress} in progress, {taskStats.blocked} blocked items
                </p>
              </div>
            </div>

            {/* Weekly Rhythm Sparkline Card */}
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-text-muted">7-Day Task Rhythm</span>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <Activity size={12} /> Live Cadence
                </span>
              </div>
              <ActivityRhythm data={rhythmData} />
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Quick Task Creation & Project Progress Preview */}
        <div className="lg:col-span-4 flex flex-col justify-between p-6 rounded-2xl bg-surface-card border border-white/5 space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <h2 className="text-base font-semibold text-white">Active Projects</h2>
              <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300">
                View All
              </Link>
            </div>

            <div className="space-y-3.5">
              {projectsProgress && projectsProgress.length > 0 ? (
                projectsProgress.map((prog) => (
                  <div key={prog.project.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200 truncate max-w-[180px]">
                        {prog.project.name}
                      </span>
                      <span className="font-mono text-text-muted">{prog.completionPercentage}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(prog.completionPercentage, 4)}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-text-muted py-4 text-center">Loading project data...</div>
              )}
            </div>
          </div>

          {/* Quick Task Creation Box */}
          <form onSubmit={handleQuickCreate} className="pt-4 border-t border-white/5 space-y-2.5">
            <span className="text-[11px] font-mono uppercase text-text-muted block">Quick Add Task</span>
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="e.g. Verify API endpoint tokens"
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 text-white placeholder-slate-600 border border-white/10 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                aria-label="Target Project"
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-slate-950 text-slate-300 border border-white/10 focus:outline-none"
              >
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!quickTitle.trim() || createTaskMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <Plus size={13} />
                Add
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── 3. Prioritized Task List & GitHub Stream ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Today's Priorities */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-surface-card border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Today's Priorities</h2>
            </div>
            <span className="text-[11px] font-mono text-text-muted">Weighted Urgency Engine</span>
          </div>

          {loadingPriorities ? (
            <div className="py-8 text-center text-xs text-text-muted">Computing priority schedule...</div>
          ) : !prioritiesData?.topPriorities || prioritiesData.topPriorities.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              🎉 All priorities cleared! No pending tasks require urgent attention today.
            </div>
          ) : (
            <div className="space-y-2.5">
              {prioritiesData.topPriorities.map((item) => {
                const t = item.task;
                const isDone = t.status === 'done';
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isDone
                        ? 'bg-slate-950/40 border-white/5 opacity-50'
                        : 'bg-slate-950/60 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          toggleTaskMutation.mutate({ id: t.id, currentStatus: t.status })
                        }
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors border shrink-0 ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-700 hover:border-indigo-400 text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              isDone ? 'line-through text-text-muted' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </p>
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                              t.priority === 'critical'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : t.priority === 'high'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        {item.reasons && item.reasons.length > 0 && (
                          <p className="text-xs text-text-muted mt-1 truncate">
                            {item.reasons.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] font-mono text-indigo-400 font-semibold">
                        Score {Math.round(item.score)}
                      </span>
                      {t.dueDate && (
                        <p className="text-[10px] font-mono text-text-muted mt-0.5">{t.dueDate}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): GitHub Activity & Intelligence */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-surface-card border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <GitBranch size={18} className="text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Repository Activity</h2>
            </div>
            <Link to="/github" className="text-xs text-indigo-400 hover:text-indigo-300">
              Details
            </Link>
          </div>

          {/* GitHub PRs */}
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase text-text-muted block">Active Pull Requests</span>
            {ghPrsData?.pullRequests && ghPrsData.pullRequests.length > 0 ? (
              ghPrsData.pullRequests.map((pr) => (
                <div key={pr.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2">
                    <GitPullRequest size={13} className="text-emerald-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-200 truncate">
                      #{pr.number} {pr.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span>{pr.headBranch}</span>
                    <span className="text-emerald-400/80">Active PR</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted py-2">No active PRs found.</div>
            )}
          </div>

          {/* Critical GitHub Issues */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[11px] font-mono uppercase text-text-muted block">Open Issues</span>
            {ghIssuesData?.issues && ghIssuesData.issues.length > 0 ? (
              ghIssuesData.issues.slice(0, 3).map((issue) => (
                <div key={issue.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200 truncate max-w-[200px]">
                      #{issue.number} {issue.title}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase">Open</span>
                  </div>
                  {issue.labels && issue.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {issue.labels.slice(0, 2).map((lbl) => (
                        <span key={lbl} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-text-muted py-2">No open issues.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
