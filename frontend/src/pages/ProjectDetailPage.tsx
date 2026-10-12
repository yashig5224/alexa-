import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  projectsApi,
  tasksApi,
  type Task,
  type GitHubIssue,
  type Priority,
  type TaskStatus,
} from '../services/endpoints';
import TaskCard from '../components/TaskCard';
import {
  ArrowLeft,
  Sparkles,
  Github,
  CheckSquare,
  AlertCircle,
  Plus,
  ExternalLink,
  Bot,
  Filter,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'tasks' | 'github'>('tasks');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    dueDate: '',
  });

  // Project details
  const { data: project, isLoading: pLoading, error: pError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  // Project tasks
  const { data: tasks = [], isLoading: tLoading } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => projectsApi.getTasks(id!),
    enabled: !!id,
  });

  // GitHub issues
  const { data: ghData, isLoading: ghLoading } = useQuery({
    queryKey: ['project-github', id],
    queryFn: () => projectsApi.getGithubIssues(id!),
    enabled: !!id && !!project?.githubRepo,
  });

  // AI Summary mutation
  const [summary, setSummary] = useState<string | null>(null);
  const summaryMutation = useMutation({
    mutationFn: () => projectsApi.summarize(id!),
    onSuccess: (data) => setSummary(data),
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create({ ...data, projectId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '' });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      tasksApi.update(taskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Convert GitHub issue to Task mutation
  const convertMutation = useMutation({
    mutationFn: (issue: GitHubIssue) =>
      projectsApi.convertIssue(id!, {
        title: issue.title,
        description: issue.body ?? `Imported from GitHub issue #${issue.number}`,
        issueNumber: issue.number,
        issueUrl: issue.url,
        priority: issue.labels.some((l) => l.includes('high') || l.includes('critical'))
          ? 'high'
          : 'medium',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-tasks', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setActiveTab('tasks');
    },
  });

  if (pLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (pError || !project) {
    return (
      <div className="card empty-state fade-in" style={{ padding: 48, textAlign: 'center' }}>
        <AlertCircle size={40} style={{ color: 'var(--danger)', marginBottom: 12 }} />
        <h3>Project not found</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          The requested project does not exist or has been deleted.
        </p>
        <Link to="/projects" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Projects
        </Link>
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const issuesList = ghData?.issues ?? [];

  return (
    <div className="fade-in">
      {/* Top breadcrumb & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link to="/projects" className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
          <ArrowLeft size={15} /> All Projects
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => summaryMutation.mutate()}
            disabled={summaryMutation.isPending}
            style={{ gap: 6 }}
          >
            <Sparkles size={14} style={{ color: 'var(--accent-1)' }} />
            {summaryMutation.isPending ? 'Generating Summary…' : 'AI Summary'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowTaskForm(true)}
            style={{ gap: 6 }}
          >
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Project Header Banner */}
      <div className="card" style={{ marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 5,
            bottom: 0,
            background: 'var(--accent-grad)',
          }}
        />
        <div style={{ paddingLeft: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>{project.name}</h1>
                <span className={`badge badge-${project.status === 'active' ? 'success' : 'info'}`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 650, lineHeight: 1.5, marginBottom: 12 }}>
                  {project.description}
                </p>
              )}
            </div>

            {project.githubRepo && (
              <a
                href={`https://github.com/${project.githubRepo}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ gap: 6 }}
              >
                <Github size={15} />
                {project.githubRepo}
                <ExternalLink size={12} style={{ opacity: 0.6 }} />
              </a>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 14, maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Project Completion ({doneCount} of {tasks.length} tasks)</span>
              <span style={{ fontWeight: 600 }}>{progressPct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary Card (if generated) */}
      {(summary || summaryMutation.isPending) && (
        <div className="card fade-in" style={{ marginBottom: 24, border: '1px solid var(--accent-1)', background: 'rgba(99, 102, 241, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bot size={18} style={{ color: 'var(--accent-1)' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>AI Project Status & Recommendation</h3>
          </div>
          {summaryMutation.isPending ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13, padding: '12px 0' }}>
              <div className="spinner" style={{ width: 16, height: 16 }} />
              Analyzing project state and computing recommendations via MCP tools…
            </div>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {summary}
            </div>
          )}
        </div>
      )}

      {/* Task Creation Form */}
      {showTaskForm && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Create Task in {project.name}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Task Title *</label>
              <input
                className="form-input"
                placeholder="What needs to be done?"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Add details, subtasks, or context…"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as Priority })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-secondary" onClick={() => setShowTaskForm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!taskForm.title.trim() || createTaskMutation.isPending}
                onClick={() =>
                  createTaskMutation.mutate({
                    ...taskForm,
                    status: 'todo',
                    dueDate: taskForm.dueDate || undefined,
                  })
                }
              >
                {createTaskMutation.isPending ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <button
          className={`btn btn-ghost ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          style={{
            borderBottom: activeTab === 'tasks' ? '2px solid var(--accent-1)' : '2px solid transparent',
            borderRadius: 0,
            padding: '10px 16px',
            fontWeight: activeTab === 'tasks' ? 700 : 500,
            color: activeTab === 'tasks' ? 'var(--accent-1)' : 'var(--text-secondary)',
          }}
        >
          <CheckSquare size={16} /> Tasks ({tasks.length})
        </button>

        {project.githubRepo && (
          <button
            className={`btn btn-ghost ${activeTab === 'github' ? 'active' : ''}`}
            onClick={() => setActiveTab('github')}
            style={{
              borderBottom: activeTab === 'github' ? '2px solid var(--accent-1)' : '2px solid transparent',
              borderRadius: 0,
              padding: '10px 16px',
              fontWeight: activeTab === 'github' ? 700 : 500,
              color: activeTab === 'github' ? 'var(--accent-1)' : 'var(--text-secondary)',
            }}
          >
            <Github size={16} /> GitHub Issues ({issuesList.length})
          </button>
        )}
      </div>

      {/* Tab: Tasks */}
      {activeTab === 'tasks' && (
        <div>
          {tLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="card empty-state" style={{ padding: 48 }}>
              <Filter size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p>No tasks in this project yet.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowTaskForm(true)}
                style={{ marginTop: 12 }}
              >
                <Plus size={14} /> Add your first task
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tasks.map((task: Task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(t, status) =>
                    updateTaskMutation.mutate({ taskId: t.id, data: { status: status as TaskStatus } })
                  }
                  onDelete={(t) => deleteTaskMutation.mutate(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: GitHub Issues */}
      {activeTab === 'github' && project.githubRepo && (
        <div>
          {ghLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : issuesList.length === 0 ? (
            <div className="card empty-state" style={{ padding: 48 }}>
              <Github size={36} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p>No open issues found in {project.githubRepo}.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {issuesList.map((issue: GitHubIssue) => {
                const isAlreadyImported = tasks.some(
                  (t) => t.githubIssueNumber === issue.number || t.title === issue.title
                );
                return (
                  <div
                    key={issue.id}
                    className="card fade-in"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16,
                      padding: '16px 20px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                          #{issue.number}
                        </span>
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          {issue.title}
                        </a>
                      </div>

                      {issue.body && (
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            marginBottom: 8,
                            maxHeight: 40,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {issue.body}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {issue.labels.map((l) => (
                          <span key={l} className="badge badge-info" style={{ fontSize: 10 }}>
                            {l}
                          </span>
                        ))}
                        {issue.assignees.length > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            assigned to @{issue.assignees.join(', @')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={isAlreadyImported || convertMutation.isPending}
                      onClick={() => convertMutation.mutate(issue)}
                      style={{ flexShrink: 0, gap: 4 }}
                    >
                      {isAlreadyImported ? (
                        <>
                          <CheckSquare size={13} style={{ color: 'var(--success)' }} />
                          Imported
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          Convert to Task
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
