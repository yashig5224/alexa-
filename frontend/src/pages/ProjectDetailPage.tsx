import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectsApi,
  tasksApi,
  usersApi,
  type Task,
  type GitHubIssue,
  type Priority,
} from '../services/endpoints';
import {
  ArrowLeft,
  Sparkles,
  Github,
  AlertTriangle,
  Plus,
  Users,
  Check,
  Trash2,
  ExternalLink,
  Layers,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'tasks' | 'members' | 'github'>('tasks');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [summary, setSummary] = useState<string | null>(null);

  // New member form
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  // 1. Project details
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  // 2. Project status / progress metrics
  const { data: progress } = useQuery({
    queryKey: ['project', id, 'status'],
    queryFn: () => projectsApi.getStatus(id!),
    enabled: !!id,
  });

  // 3. Project tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['project', id, 'tasks'],
    queryFn: () => projectsApi.getTasks(id!),
    enabled: !!id,
  });

  // 4. Project members
  const { data: members = [] } = useQuery({
    queryKey: ['project', id, 'members'],
    queryFn: () => projectsApi.getMembers(id!),
    enabled: !!id,
  });

  // 5. All users (for add member dropdown)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  // 6. GitHub issues (if github repo linked)
  const { data: ghData, isLoading: loadingGh } = useQuery({
    queryKey: ['project', id, 'github'],
    queryFn: () => projectsApi.getGithubIssues(id!),
    enabled: !!id && !!project?.githubRepo,
  });

  // Mutations
  const toggleTaskMutation = useMutation({
    mutationFn: ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) =>
      tasksApi.update(taskId, { status: currentStatus === 'done' ? 'todo' : 'done' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create({ ...data, projectId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      setIsTaskFormOpen(false);
      setTaskTitle('');
      setTaskDueDate('');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  });

  const summarizeMutation = useMutation({
    mutationFn: () => projectsApi.summarize(id!),
    onSuccess: (data) => setSummary(data),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      projectsApi.addMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'members'] });
      setNewMemberUserId('');
    },
  });

  const convertIssueMutation = useMutation({
    mutationFn: (issue: GitHubIssue) =>
      projectsApi.convertIssue(id!, {
        title: issue.title,
        description: issue.body || undefined,
        issueNumber: issue.number,
        issueUrl: issue.url,
        priority: 'high',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id, 'tasks'] });
      alert('Issue converted to TrackMate task!');
    },
  });

  if (loadingProject) {
    return <div className="p-12 text-center text-sm text-slate-500">Loading project details...</div>;
  }

  if (!project) {
    return (
      <div className="p-12 text-center">
        <p className="text-base text-red-400">Project not found.</p>
        <Link to="/projects" className="text-xs text-indigo-400 hover:underline mt-2 inline-block">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const filteredTasks = tasks.filter(
    (t) => taskStatusFilter === 'all' || t.status === taskStatusFilter
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Back & Top Actions ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Projects
        </Link>

        <button
          onClick={() => summarizeMutation.mutate()}
          disabled={summarizeMutation.isPending}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
        >
          <Sparkles size={14} />
          {summarizeMutation.isPending ? 'Analyzing with AI...' : 'AI Project Summary'}
        </button>
      </div>

      {/* ── Project Header ──────────────────────────────────────────────── */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color || '#6366f1' }}
            />
            <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
          </div>
          <span className="text-xs uppercase font-semibold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
            {project.status}
          </span>
        </div>

        {project.description && (
          <p className="text-sm text-slate-400 max-w-3xl">{project.description}</p>
        )}

        {project.githubRepo && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Github size={14} className="text-slate-500" />
            <a
              href={`https://github.com/${project.githubRepo}`}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline flex items-center gap-1"
            >
              {project.githubRepo} <ExternalLink size={11} />
            </a>
          </div>
        )}

        {/* ── Progress Strip ──────────────────────────────────────────────── */}
        {progress && (
          <div className="pt-4 border-t border-white/5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5">
                <span className="text-[11px] text-slate-400 uppercase">Completion</span>
                <p className="text-lg font-bold text-indigo-400 mt-0.5">
                  {progress.completionPercentage}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5">
                <span className="text-[11px] text-slate-400 uppercase">Done</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {progress.completedTasks}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5">
                <span className="text-[11px] text-slate-400 uppercase">In Progress</span>
                <p className="text-lg font-bold text-blue-400 mt-0.5">
                  {progress.inProgressTasks}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5">
                <span className="text-[11px] text-slate-400 uppercase">Blocked</span>
                <p className="text-lg font-bold text-red-400 mt-0.5">
                  {progress.blockedTasks}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 uppercase">Total Tasks</span>
                <p className="text-lg font-bold text-white mt-0.5">{progress.totalTasks}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── AI Generated Summary Box ────────────────────────────────────── */}
      {summary && (
        <div className="p-5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={14} /> AI Project Briefing
            </span>
            <button
              onClick={() => setSummary(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Dismiss
            </button>
          </div>
          <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-line font-mono bg-slate-900/60 p-4 rounded-lg border border-white/5">
            {summary}
          </div>
        </div>
      )}

      {/* ── Blockers Alert (if any) ─────────────────────────────────────── */}
      {progress && progress.blockers && progress.blockers.length > 0 && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 flex items-start gap-3 text-red-300">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
              Active Project Blockers Requiring Immediate Attention:
            </p>
            <ul className="text-xs space-y-0.5 list-disc list-inside text-slate-300">
              {progress.blockers.map((b, bi) => (
                <li key={bi}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Tabbed View (Tasks, Members, GitHub) ─────────────────────────── */}
      <div className="space-y-4">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Layers size={13} /> Tasks ({tasks.length})
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Users size={13} /> Team Members ({members.length})
          </button>

          {project.githubRepo && (
            <button
              onClick={() => setActiveTab('github')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'github'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Github size={13} /> GitHub Issues ({ghData?.issues?.length ?? 0})
            </button>
          )}
        </div>

        {/* ── TAB 1: Tasks ──────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {/* Filter toolbar & Add Task */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-900 text-slate-300 border border-white/10 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              <button
                onClick={() => setIsTaskFormOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors self-start sm:self-auto"
              >
                <Plus size={13} /> Add Task
              </button>
            </div>

            {/* Inline Task Form */}
            {isTaskFormOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!taskTitle.trim()) return;
                  createTaskMutation.mutate({
                    title: taskTitle.trim(),
                    priority: taskPriority,
                    dueDate: taskDueDate || undefined,
                    status: 'todo',
                  });
                }}
                className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3"
              >
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full px-3 py-1.5 text-sm rounded bg-slate-800 text-white border border-white/10 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 border border-white/10"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical Priority</option>
                  </select>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 border border-white/10"
                  />
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => setIsTaskFormOpen(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createTaskMutation.isPending}
                    className="px-3 py-1 text-xs rounded bg-indigo-600 text-white font-medium"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}

            {/* Tasks list */}
            <div className="rounded-xl bg-slate-900/60 border border-white/5 divide-y divide-white/5">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No tasks match the selected filter.
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() =>
                          toggleTaskMutation.mutate({
                            taskId: t.id,
                            currentStatus: t.status,
                          })
                        }
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          t.status === 'done'
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : 'border-slate-600 text-transparent hover:border-indigo-400'
                        }`}
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>

                      <div className="min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            t.status === 'done' ? 'line-through text-slate-500' : 'text-white'
                          }`}
                        >
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          {t.dueDate && (
                            <span className="font-mono text-[11px] text-slate-400">
                              Due {t.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                      <button
                        onClick={() => {
                          if (confirm(`Delete task "${t.title}"?`)) {
                            deleteTaskMutation.mutate(t.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: Members ─────────────────────────────────────────────── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Add member form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newMemberUserId) return;
                addMemberMutation.mutate({
                  userId: newMemberUserId,
                  role: newMemberRole,
                });
              }}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-white/10"
            >
              <select
                value={newMemberUserId}
                onChange={(e) => setNewMemberUserId(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-200 border border-white/10"
              >
                <option value="">Select team user to assign...</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>

              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="px-3 py-1.5 text-xs rounded bg-slate-800 text-slate-200 border border-white/10"
              >
                <option value="member">Member</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={!newMemberUserId || addMemberMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Add Member
              </button>
            </form>

            {/* Members list */}
            <div className="rounded-xl bg-slate-900/60 border border-white/5 divide-y divide-white/5">
              {members.map((m, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        m.user.avatarUrl ||
                        `https://api.dicebear.com/9.x/avataaars/svg?seed=${m.user.name}`
                      }
                      alt={m.user.name}
                      className="w-8 h-8 rounded-full bg-slate-800"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">{m.user.name}</p>
                      <p className="text-xs text-slate-400">{m.user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-white/5 text-slate-300">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: GitHub Issues ───────────────────────────────────────── */}
        {activeTab === 'github' && (
          <div className="space-y-3">
            {loadingGh ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading GitHub issues...</div>
            ) : !ghData?.issues || ghData.issues.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No open GitHub issues found for {project.githubRepo}.
              </div>
            ) : (
              <div className="rounded-xl bg-slate-900/60 border border-white/5 divide-y divide-white/5">
                {ghData.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-indigo-400">#{issue.number}</span>
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-white hover:underline truncate"
                        >
                          {issue.title}
                        </a>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        State: {issue.state} · Updated: {new Date(issue.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => convertIssueMutation.mutate(issue)}
                      disabled={convertIssueMutation.isPending}
                      className="px-2.5 py-1 text-xs rounded bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 text-slate-300 transition-colors border border-white/10 flex-shrink-0"
                    >
                      Convert to Task
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
