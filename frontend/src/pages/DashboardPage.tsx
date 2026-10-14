import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  prioritiesApi,
  deadlinesApi,
  projectsApi,
  tasksApi,
  type Task,
  type ProjectProgress,
} from '../services/endpoints';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Sparkles,
  ArrowRight,
  Calendar,
  Flame,
  Check,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [quickTitle, setQuickTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // 1. Today's priorities
  const { data: prioritiesData, isLoading: loadingPriorities } = useQuery({
    queryKey: ['priorities', 'today'],
    queryFn: () => prioritiesApi.getToday({ limit: 5 }),
  });

  // 2. Overdue tasks
  const { data: overdueTasks } = useQuery({
    queryKey: ['deadlines', 'overdue'],
    queryFn: () => deadlinesApi.overdue(),
  });

  // 3. Upcoming deadlines
  const { data: upcomingDeadlines, isLoading: loadingDeadlines } = useQuery({
    queryKey: ['deadlines', 'upcoming'],
    queryFn: () => deadlinesApi.list({ withinDays: 14, includeOverdue: false }),
  });

  // 4. Projects list
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // 5. Fetch project status for each project
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

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & Greeting ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
            <Calendar size={14} />
            <span>{todayDateStr}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Welcome back, Alex
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            TrackMate AI has analyzed your projects and prioritized today's action items.
          </p>
        </div>

        {/* AI Action CTA */}
        <div className="flex items-center gap-3">
          <Link
            to="/ai"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
          >
            <Sparkles size={16} />
            Ask AI Assistant
          </Link>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
          >
            View All Tasks
          </Link>
        </div>
      </div>

      {/* ── Metric Snapshot Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Today's Focus</p>
            <p className="text-2xl font-bold text-white mt-1">
              {prioritiesData?.topPriorities?.length ?? 0}
            </p>
            <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
              <Flame size={12} /> Ranked by urgency
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Flame size={20} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overdue Tasks</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {overdueTasks?.length ?? 0}
            </p>
            <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Needs attention
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Next 14 Days</p>
            <p className="text-2xl font-bold text-white mt-1">
              {upcomingDeadlines?.length ?? 0}
            </p>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <Clock size={12} /> Upcoming deadlines
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Projects</p>
            <p className="text-2xl font-bold text-white mt-1">
              {projects?.length ?? 0}
            </p>
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Healthy cadence
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <FolderKanban size={20} />
          </div>
        </div>
      </div>

      {/* ── Quick Add Task Bar ────────────────────────────────────────────── */}
      <form
        onSubmit={handleQuickCreate}
        className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-white/10"
      >
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick add a high-priority task for today..."
            className="w-full px-3 py-2 text-sm bg-transparent text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          aria-label="Select Project"
          className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg bg-slate-800 text-slate-300 border border-white/10 focus:outline-none"
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
          className="w-full sm:w-auto px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          Add Task
        </button>
      </form>

      {/* ── Main Two-Column Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Today's Priorities & Overdue */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Priorities Card */}
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-base font-semibold text-white">Today's Priorities</h2>
              </div>
              <span className="text-xs text-slate-400">
                Ranked by Bedrock / MCP Scoring Engine
              </span>
            </div>

            {loadingPriorities ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading priorities...</div>
            ) : !prioritiesData?.topPriorities || prioritiesData.topPriorities.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                🎉 No pending priorities for today! You're completely up to date.
              </div>
            ) : (
              <div className="space-y-2.5">
                {prioritiesData.topPriorities.map((item, idx) => {
                  const t = item.task;
                  const isDone = t.status === 'done';
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-lg border transition-all flex items-start gap-3 ${
                        isDone
                          ? 'bg-slate-950/40 border-white/5 opacity-50'
                          : 'bg-slate-800/40 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() =>
                          toggleTaskMutation.mutate({ id: t.id, currentStatus: t.status })
                        }
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors border ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-600 hover:border-indigo-400 text-transparent'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-medium text-white ${
                              isDone ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {t.title}
                          </span>
                          {/* Priority badge */}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                              t.priority === 'critical'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : t.priority === 'high'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {t.priority}
                          </span>
                          {t.status === 'blocked' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-900/30 text-red-300 border border-red-700/40">
                              Blocked
                            </span>
                          )}
                        </div>

                        {/* Reason / Why tags */}
                        {item.reasons && item.reasons.length > 0 && (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {item.reasons.slice(0, 2).map((r, ri) => (
                              <span
                                key={ri}
                                className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Urgency Rank */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-medium text-indigo-400">
                          #{idx + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overdue Tasks Alert Card */}
          {overdueTasks && overdueTasks.length > 0 && (
            <div className="rounded-xl bg-red-950/20 border border-red-900/30 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={18} />
                  <h2 className="text-base font-semibold text-white">
                    Overdue Tasks ({overdueTasks.length})
                  </h2>
                </div>
                <Link to="/deadlines" className="text-xs text-red-400 hover:underline">
                  View all overdue →
                </Link>
              </div>

              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg bg-slate-900/70 border border-red-900/20 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.title}</p>
                      <p className="text-xs text-red-400 mt-0.5">
                        Due: {t.dueDate} · Priority: {t.priority}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        toggleTaskMutation.mutate({ id: t.id, currentStatus: t.status })
                      }
                      className="px-2.5 py-1 text-xs rounded bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-300 text-slate-300 transition-colors border border-white/10"
                    >
                      Mark Done
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines List */}
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Upcoming Deadlines (14 Days)</h2>
              <Link to="/deadlines" className="text-xs text-indigo-400 hover:underline">
                View Calendar →
              </Link>
            </div>

            {loadingDeadlines ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading deadlines...</div>
            ) : !upcomingDeadlines || upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming deadlines.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {upcomingDeadlines.slice(0, 5).map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">{t.title}</p>
                      <p className="text-xs text-slate-400">
                        {t.dueDate ? `Due ${t.dueDate}` : 'No date'}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                        t.priority === 'critical'
                          ? 'text-red-400 bg-red-400/10'
                          : t.priority === 'high'
                          ? 'text-amber-400 bg-amber-400/10'
                          : 'text-slate-400 bg-slate-800'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Project Progress & Quick Prompts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Project Progress Widget */}
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Project Progress</h2>
              <Link to="/projects" className="text-xs text-indigo-400 hover:underline">
                All Projects →
              </Link>
            </div>

            <div className="space-y-4">
              {projectsProgress?.map((p) => (
                <div key={p.project.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <Link
                      to={`/projects/${p.project.id}`}
                      className="font-medium text-white hover:text-indigo-400 transition-colors truncate max-w-[160px]"
                    >
                      {p.project.name}
                    </Link>
                    <span className="font-mono text-slate-400">
                      {p.completionPercentage}% ({p.completedTasks}/{p.totalTasks})
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${p.completionPercentage}%` }}
                    />
                  </div>

                  {p.blockers && p.blockers.length > 0 && (
                    <p className="text-[11px] text-red-400/90 flex items-center gap-1">
                      <AlertTriangle size={10} /> {p.blockers.length} blocker reported
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Productivity Assistant Quick Prompts */}
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-3 text-indigo-400">
              <Sparkles size={16} />
              <h2 className="text-sm font-semibold text-white">AI Quick Prompts</h2>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              One-click queries to trigger MCP autonomous agent actions:
            </p>

            <div className="space-y-2">
              {[
                'What should I work on today?',
                'Show my overdue tasks.',
                'What is blocking TrackMate AI?',
                'Summarize my project.',
              ].map((prompt, pi) => (
                <Link
                  key={pi}
                  to={`/ai?prompt=${encodeURIComponent(prompt)}`}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/30 text-xs text-slate-300 flex items-center justify-between group transition-all"
                >
                  <span>"{prompt}"</span>
                  <ArrowRight
                    size={12}
                    className="text-slate-500 group-hover:text-indigo-400 transition-colors"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Team / Project Overview */}
          <div className="rounded-xl bg-slate-900/60 border border-white/5 p-4 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Connected to MongoDB & MCP Server (Port 3002)
            </span>
            <Link to="/settings" className="text-indigo-400 hover:underline">
              Status
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
