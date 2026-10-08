import { useQuery } from '@tanstack/react-query';
import { tasksApi, projectsApi, type Task, type Project } from '../services/endpoints';
import { CheckSquare, FolderOpen, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { Link } from 'react-router-dom';

/* ── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, accent }: {
  label: string;
  value: number | string;
  icon: React.FC<{ size?: number }>;
  accent?: string;
}) {
  return (
    <div className="card stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value" style={accent ? { color: accent } : {}}>{value}</p>
        </div>
        <div
          style={{
            width: 44, height: 44,
            borderRadius: 12,
            background: accent ? `${accent}1a` : 'var(--bg-hover)',
            display: 'grid',
            placeItems: 'center',
            color: accent ?? 'var(--text-secondary)',
          }}
        >
          <Icon size={20} />
        </div>
      </div>
      {/* Subtle glow bottom */}
      <div style={{
        position: 'absolute',
        bottom: -30, left: '50%',
        transform: 'translateX(-50%)',
        width: 160, height: 60,
        background: accent ?? 'var(--accent-1)',
        opacity: 0.06,
        borderRadius: '50%',
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ── Project Row ───────────────────────────────────────────── */
function ProjectRow({ project, taskCount }: { project: Project; taskCount: number }) {
  const pct = Math.min(100, Math.round((taskCount / Math.max(taskCount, 1)) * 100));
  return (
    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ padding: '14px 18px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{project.name}</span>
          <span className={`badge badge-${project.status === 'active' ? 'success' : 'info'}`}>
            {project.status}
          </span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{taskCount} tasks</p>
      </div>
    </Link>
  );
}

/* ── Dashboard Page ────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: tasks = [], isLoading: tLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
  });
  const { data: projects = [], isLoading: pLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const loading = tLoading || pLoading;

  const overdue = tasks.filter(
    (t: Task) => t.dueDate && t.status !== 'done' && new Date(t.dueDate) < new Date()
  );
  const todayTasks = tasks
    .filter((t: Task) => t.status !== 'done')
    .sort((a: Task, b: Task) => {
      const pri = { critical: 0, high: 1, medium: 2, low: 3 };
      return pri[a.priority] - pri[b.priority];
    })
    .slice(0, 5);
  const done = tasks.filter((t: Task) => t.status === 'done').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning 👋</h1>
          <p className="page-subtitle">Here's what's on your plate today.</p>
        </div>
        <Link to="/ai" className="btn btn-primary">
          Ask AI Agent
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 28 }}>
            <StatCard label="Active Projects"  value={projects.filter((p: Project) => p.status === 'active').length} icon={FolderOpen}    accent="var(--accent-1)" />
            <StatCard label="Total Tasks"      value={tasks.length}   icon={CheckSquare}   accent="var(--info)"     />
            <StatCard label="Overdue"          value={overdue.length} icon={AlertTriangle}  accent="var(--danger)"   />
            <StatCard label="Completed"        value={done}           icon={TrendingUp}     accent="var(--success)"  />
          </div>

          <div className="grid-2">
            {/* Today's priorities */}
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} style={{ color: 'var(--accent-1)' }} />
                Today's Priorities
              </h2>
              {todayTasks.length === 0 ? (
                <div className="card empty-state">
                  <CheckSquare size={40} />
                  <p>All clear! No pending tasks.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {todayTasks.map((task: Task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {/* Projects overview */}
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen size={16} style={{ color: 'var(--accent-2)' }} />
                Projects
              </h2>
              {projects.length === 0 ? (
                <div className="card empty-state">
                  <FolderOpen size={40} />
                  <p>No projects yet.</p>
                </div>
              ) : (
                projects.slice(0, 5).map((project: Project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    taskCount={tasks.filter((t: Task) => t.projectId === project.id).length}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
