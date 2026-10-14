import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  projectsApi,
  tasksApi,
  type Project,
  type ProjectStatus,
  type Task,
} from '../services/endpoints';
import {
  Plus,
  FolderKanban,
  AlertTriangle,
  Github,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';

const STATUS_BADGES: Record<ProjectStatus, { label: string; badge: string }> = {
  active: { label: 'Active', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  on_hold: { label: 'On Hold', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  completed: { label: 'Completed', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  archived: { label: 'Archived', badge: 'bg-slate-800 text-slate-400 border-slate-700' },
};

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [status, setStatus] = useState<ProjectStatus>('active');

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setGithubRepo('');
    setColor('#6366f1');
    setStatus('active');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      githubRepo: githubRepo.trim() || undefined,
      color,
      status,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize workloads, track milestones, and manage team deliverables.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* ── Projects Grid ───────────────────────────────────────────────── */}
      {loadingProjects ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-white/5">
          <FolderKanban size={36} className="mx-auto text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-300">No projects created yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create your first project to start tracking tasks and deadlines.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const projectTasks = tasks.filter((t: Task) => t.projectId === p.id);
            const total = projectTasks.length;
            const completed = projectTasks.filter((t: Task) => t.status === 'done').length;
            const blocked = projectTasks.filter((t: Task) => t.status === 'blocked').length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const badgeCfg = STATUS_BADGES[p.status] || STATUS_BADGES.active;

            return (
              <div
                key={p.id}
                className="rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Header: Color Indicator, Name, Status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color || '#6366f1' }}
                      />
                      <Link
                        to={`/projects/${p.id}`}
                        className="text-base font-semibold text-white hover:text-indigo-400 transition-colors truncate"
                      >
                        {p.name}
                      </Link>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${badgeCfg.badge}`}
                    >
                      {badgeCfg.label}
                    </span>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{p.description}</p>
                  )}

                  {/* GitHub Repo */}
                  {p.githubRepo && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4 font-mono">
                      <Github size={13} className="text-slate-500" />
                      <span className="truncate">{p.githubRepo}</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar & Footer */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Completion</span>
                      <span className="font-mono text-white">
                        {pct}% ({completed}/{total})
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Blockers alert */}
                  {blocked > 0 && (
                    <p className="text-[11px] text-red-400 flex items-center gap-1">
                      <AlertTriangle size={12} /> {blocked} active blocker(s)
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        if (confirm(`Delete project "${p.name}" and its tasks?`)) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>

                    <Link
                      to={`/projects/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      View Details
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Project Modal ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-base font-semibold text-white">Create New Project</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mobile Companion App"
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
                  placeholder="Goals and scope for this project..."
                  className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-white border border-white/10 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GitHub Repository (optional)
                  </label>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="owner/repo"
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-white border border-white/10 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 text-slate-200 border border-white/10 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tag Color
                </label>
                <div className="flex items-center gap-3">
                  {['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'].map(
                    (hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === hex ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    )
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
