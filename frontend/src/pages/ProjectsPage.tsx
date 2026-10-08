import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, tasksApi, type Project, type Task } from '../services/endpoints';
import { useState } from 'react';
import { Plus, FolderOpen, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', githubRepo: '' });

  const { data: projects = [], isLoading: pLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); setForm({ name: '', description: '', githubRepo: '' }); },
  });

  const tasksByProject = (id: string) => tasks.filter((t: Task) => t.projectId === id);
  const doneByProject  = (id: string) => tasksByProject(id).filter((t: Task) => t.status === 'done').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} projects · {projects.filter((p: Project) => p.status === 'active').length} active</p>
        </div>
        <button className="btn btn-primary" id="new-project-btn" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>New Project</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input id="new-project-name" className="form-input" placeholder="Project name…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Brief description…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub Repo (optional)</label>
              <input className="form-input" placeholder="owner/repo" value={form.githubRepo} onChange={(e) => setForm({ ...form, githubRepo: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                id="create-project-submit"
                className="btn btn-primary"
                disabled={!form.name.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, status: 'active' })}
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card empty-state">
          <FolderOpen size={40} />
          <p>No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((project: Project) => {
            const total = tasksByProject(project.id).length;
            const done  = doneByProject(project.id);
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={project.id} to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</h3>
                    <span className={`badge badge-${project.status === 'active' ? 'success' : 'info'}`}>{project.status}</span>
                  </div>
                  {project.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{project.description}</p>
                  )}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckSquare size={11} /> {total} tasks
                    </span>
                    <span>{done} done</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
