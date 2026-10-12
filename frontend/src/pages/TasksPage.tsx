import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, type Task, type Priority, type TaskStatus } from '../services/endpoints';
import TaskCard from '../components/TaskCard';
import { Plus, Filter, Search } from 'lucide-react';

const PRIORITY_OPTIONS: Priority[] = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

interface NewTaskForm {
  title: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
}

const DEFAULT_FORM: NewTaskForm = { title: '', priority: 'medium', dueDate: '', status: 'todo' };

export default function TasksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTaskForm>(DEFAULT_FORM);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setForm(DEFAULT_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const filtered = tasks.filter((t: Task) => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchPriority && matchStatus;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} total · {tasks.filter((t: Task) => t.status !== 'done').length} pending</p>
        </div>
        <button className="btn btn-primary" id="new-task-btn" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="task-search"
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          id="filter-priority"
          className="form-select"
          style={{ width: 140 }}
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | '')}
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          id="filter-status"
          className="form-select"
          style={{ width: 150 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* New task form */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>New Task</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                id="new-task-title"
                className="form-input"
                placeholder="Task title…"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                  {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}>Cancel</button>
              <button
                id="create-task-submit"
                className="btn btn-primary"
                disabled={!form.title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ ...form, dueDate: form.dueDate || undefined })}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <Filter size={40} />
          <p>No tasks match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((task: Task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={(t, status) => updateMutation.mutate({ id: t.id, data: { status } })}
              onDelete={(t) => deleteMutation.mutate(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
