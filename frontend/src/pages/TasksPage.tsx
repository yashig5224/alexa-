import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tasksApi,
  projectsApi,
  type Task,
  type Priority,
  type TaskStatus,
} from '../services/endpoints';
import {
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Calendar,
  X,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  todo: {
    label: 'To Do',
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  in_review: {
    label: 'In Review',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
  },
  done: {
    label: 'Done',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
  },
  blocked: {
    label: 'Blocked',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
  },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; badge: string }> = {
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  high: {
    label: 'High',
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-400',
    badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  low: {
    label: 'Low',
    color: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState('');

  // 1. Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
  });

  // 2. Fetch projects for dropdowns & labels
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId('');
    setPriority('medium');
    setStatus('todo');
    setDueDate('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const targetProject = projectId || projects[0]?.id || '';
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      projectId: targetProject,
      priority,
      status,
      dueDate: dueDate || undefined,
    });
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchSearch =
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchProject = filterProject === 'all' || t.projectId === filterProject;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchSearch && matchProject && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Tasks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage, filter, and track tasks across all your active projects.
          </p>
        </div>

        <button
          onClick={() => {
            setProjectId(projects[0]?.id || '');
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          Create Task
        </button>
      </div>

      {/* ── Filter & Search Toolbar ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search size={16} className="absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-900/80 text-white border border-white/10 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Project Filter */}
        <div>
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            aria-label="Filter by project"
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900/80 text-slate-300 border border-white/10 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900/80 text-slate-300 border border-white/10 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            aria-label="Filter by priority"
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-900/80 text-slate-300 border border-white/10 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* ── Tasks Table / List ───────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-900/60 border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-300">No tasks found</p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or create a new task.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredTasks.map((t) => {
              const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo;
              const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
              const projectName = projectMap.get(t.projectId) || 'Project';

              return (
                <div
                  key={t.id}
                  className="p-4 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* Left: Check, Title, Project, Tags */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: t.id,
                          data: { status: t.status === 'done' ? 'todo' : 'done' },
                        })
                      }
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors border flex-shrink-0 ${
                        t.status === 'done'
                          ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                          : 'border-slate-600 hover:border-indigo-400 text-transparent'
                      }`}
                    >
                      <CheckCircle2 size={13} strokeWidth={3} />
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${
                            t.status === 'done' ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {t.title}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded bg-white/5">
                          {projectName}
                        </span>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {t.description}
                        </p>
                      )}

                      {/* Due date and tags */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                        {t.dueDate && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar size={12} /> {t.dueDate}
                          </span>
                        )}
                        {t.tags &&
                          t.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status selector, Priority, Delete */}
                  <div className="flex items-center gap-2.5 self-end md:self-auto flex-shrink-0">
                    {/* Status Dropdown */}
                    <select
                      value={t.status}
                      onChange={(e) =>
                        updateMutation.mutate({
                          id: t.id,
                          data: { status: e.target.value as TaskStatus },
                        })
                      }
                      aria-label="Change task status"
                      className={`text-xs font-medium px-2.5 py-1 rounded-md border focus:outline-none ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>

                    {/* Priority Badge */}
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-1 rounded border ${priorityCfg.badge}`}
                    >
                      {priorityCfg.label}
                    </span>

                    {/* Delete button */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete task "${t.title}"?`)) {
                          deleteMutation.mutate(t.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded hover:bg-white/5"
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Task Modal ───────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-base font-semibold text-white">Create New Task</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement user authentication"
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-white border border-white/10 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief details or acceptance criteria..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-white border border-white/10 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Project *
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-slate-200 border border-white/10 focus:outline-none focus:border-indigo-500"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-slate-200 border border-white/10 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-slate-200 border border-white/10 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-slate-200 border border-white/10 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
