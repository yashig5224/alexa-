import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderKanban,
  Filter,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { deadlinesApi, projectsApi, tasksApi, type Task, type TaskStatus } from '../services/endpoints';

export default function DeadlinesPage() {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedWindow, setSelectedWindow] = useState<number>(30); // 30 days default

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // Fetch upcoming deadlines
  const {
    data: upcomingTasks = [],
    isLoading: loadingUpcoming,
  } = useQuery({
    queryKey: ['deadlines', selectedProjectId, selectedWindow],
    queryFn: () =>
      deadlinesApi.list({
        projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
        withinDays: selectedWindow,
        includeOverdue: false,
      }),
  });

  // Fetch overdue tasks
  const {
    data: overdueTasks = [],
    isLoading: loadingOverdue,
  } = useQuery({
    queryKey: ['deadlines', 'overdue', selectedProjectId],
    queryFn: () =>
      deadlinesApi.overdue({
        projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
      }),
  });

  // Mutation to toggle task status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
    },
  });

  const isLoading = loadingUpcoming || loadingOverdue;

  // Group tasks into buckets
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dueToday: Task[] = [];
  const dueTomorrow: Task[] = [];
  const dueThisWeek: Task[] = [];
  const dueLater: Task[] = [];

  for (const t of upcomingTasks) {
    if (!t.dueDate) continue;
    const dStr = new Date(t.dueDate).toISOString().split('T')[0];
    const dTime = new Date(t.dueDate).getTime();

    if (dStr === todayStr) {
      dueToday.push(t);
    } else if (dStr === tomorrowStr) {
      dueTomorrow.push(t);
    } else if (dTime <= endOfWeek.getTime()) {
      dueThisWeek.push(t);
    } else {
      dueLater.push(t);
    }
  }

  const formatDaysOverdue = (dateStr: string) => {
    const diff = Math.floor((now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 0 ? 'Due recently' : `${diff} day${diff === 1 ? '' : 's'} overdue`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      default:
        return 'badge-low';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar size={14} /> Schedule & Deadlines
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Calendar & Deadlines</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Track urgent milestones, prevent bottlenecks, and keep projects on schedule.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-surface-card border border-border px-3 py-1.5 rounded-lg text-xs text-text-muted">
            <Filter size={13} className="text-text-muted" />
            <select
              className="bg-transparent text-text-primary text-xs focus:outline-none cursor-pointer"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              id="deadlines-project-filter"
            >
              <option value="all" className="bg-surface-elevated">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-surface-elevated">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-surface-card border border-border px-3 py-1.5 rounded-lg text-xs text-text-muted">
            <Clock size={13} className="text-text-muted" />
            <select
              className="bg-transparent text-text-primary text-xs focus:outline-none cursor-pointer"
              value={selectedWindow}
              onChange={(e) => setSelectedWindow(Number(e.target.value))}
              id="deadlines-window-filter"
            >
              <option value={7} className="bg-surface-elevated">Next 7 Days</option>
              <option value={14} className="bg-surface-elevated">Next 14 Days</option>
              <option value={30} className="bg-surface-elevated">Next 30 Days</option>
              <option value={60} className="bg-surface-elevated">Next 60 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-rose-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Overdue Tasks</span>
            <div className="text-2xl font-bold text-white">{overdueTasks.length}</div>
            <p className="text-xs text-text-muted">Requires immediate attention</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-surface-card border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Due Today & Tomorrow</span>
            <div className="text-2xl font-bold text-white">{dueToday.length + dueTomorrow.length}</div>
            <p className="text-xs text-text-muted">High priority focus for this shift</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame size={20} />
          </div>
        </div>

        <div className="bg-surface-card border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Upcoming Next {selectedWindow}d</span>
            <div className="text-2xl font-bold text-white">{upcomingTasks.length}</div>
            <p className="text-xs text-text-muted">Total scheduled deliveries</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-surface-card border border-border rounded-xl p-12 text-center text-text-muted text-sm">
          Loading deadlines & milestones…
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                <AlertTriangle size={16} />
                <span>Overdue ({overdueTasks.length})</span>
                <span className="text-xs font-normal text-rose-400/80">— Action required</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {overdueTasks.map((t) => (
                  <div
                    key={t.id}
                    className="bg-surface-card border border-rose-500/30 rounded-xl p-4 hover:border-rose-500/50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-sm leading-snug">{t.title}</h3>
                        <span className={`badge ${getPriorityBadgeClass(t.priority)} text-[10px] uppercase font-bold shrink-0`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-text-muted line-clamp-2 mb-3">{t.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-400 font-medium">
                          {t.dueDate ? formatDaysOverdue(t.dueDate) : 'Overdue'}
                        </span>
                        {t.projectId && (
                          <Link
                            to={`/projects/${t.projectId}`}
                            className="flex items-center gap-1 text-text-muted hover:text-indigo-400 transition-colors"
                          >
                            <FolderKanban size={11} />
                            <span>{projects.find((p) => p.id === t.projectId)?.name ?? 'Project'}</span>
                          </Link>
                        )}
                      </div>

                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'done' })}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                        title="Mark as done"
                      >
                        <CheckCircle2 size={13} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Today */}
          {dueToday.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <Clock size={16} />
                <span>Due Today ({dueToday.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueToday.map((t) => (
                  <div
                    key={t.id}
                    className="bg-surface-card border border-amber-500/30 rounded-xl p-4 hover:border-amber-500/50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-sm leading-snug">{t.title}</h3>
                        <span className={`badge ${getPriorityBadgeClass(t.priority)} text-[10px] uppercase font-bold shrink-0`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-text-muted line-clamp-2 mb-3">{t.description}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-medium">Today</span>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'done' })}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Tomorrow */}
          {dueTomorrow.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <Calendar size={16} />
                <span>Due Tomorrow ({dueTomorrow.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueTomorrow.map((t) => (
                  <div
                    key={t.id}
                    className="bg-surface-card border border-border rounded-xl p-4 hover:border-indigo-500/40 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-sm leading-snug">{t.title}</h3>
                        <span className={`badge ${getPriorityBadgeClass(t.priority)} text-[10px] uppercase font-bold shrink-0`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-text-muted line-clamp-2 mb-3">{t.description}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-text-muted">Tomorrow</span>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'done' })}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due This Week */}
          {dueThisWeek.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
                <Calendar size={16} />
                <span>This Week ({dueThisWeek.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueThisWeek.map((t) => (
                  <div
                    key={t.id}
                    className="bg-surface-card border border-border rounded-xl p-4 hover:border-border-active transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-sm leading-snug">{t.title}</h3>
                        <span className={`badge ${getPriorityBadgeClass(t.priority)} text-[10px] uppercase font-bold shrink-0`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-text-muted line-clamp-2 mb-3">{t.description}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-text-muted">
                        Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Soon'}
                      </span>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'done' })}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Later / Upcoming */}
          {dueLater.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-text-muted font-semibold text-sm">
                <Clock size={16} />
                <span>Later ({dueLater.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dueLater.map((t) => (
                  <div
                    key={t.id}
                    className="bg-surface-card border border-border rounded-xl p-4 hover:border-border-active transition-colors flex flex-col justify-between opacity-80 hover:opacity-100"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-white text-sm leading-snug">{t.title}</h3>
                        <span className={`badge ${getPriorityBadgeClass(t.priority)} text-[10px] uppercase font-bold shrink-0`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-text-muted line-clamp-2 mb-3">{t.description}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-text-muted">
                        Due {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Later'}
                      </span>
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: t.id, status: 'done' })}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium hover:underline cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {overdueTasks.length === 0 && upcomingTasks.length === 0 && (
            <div className="bg-surface-card border border-border rounded-xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-white font-semibold text-base">All caught up!</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                No upcoming or overdue deadlines found for the selected filter. Great work keeping tasks on schedule.
              </p>
              <Link
                to="/tasks"
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-2"
              >
                <span>View all tasks</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
