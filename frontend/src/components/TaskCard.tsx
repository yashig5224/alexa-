import type { Task } from '../services/endpoints';
import { formatDistanceToNow } from 'date-fns';
import { Circle, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  task: Task;
  onClick?: (task: Task) => void;
  onStatusChange?: (task: Task, status: Task['status']) => void;
}

const STATUS_ICONS: Record<Task['status'], JSX.Element> = {
  todo:        <Circle size={14} />,
  in_progress: <Clock  size={14} style={{ color: 'var(--info)' }} />,
  done:        <Circle size={14} style={{ color: 'var(--success)' }} />,
  blocked:     <AlertTriangle size={14} style={{ color: 'var(--danger)' }} />,
};

export default function TaskCard({ task, onClick, onStatusChange }: Props) {
  const isOverdue =
    task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

  return (
    <div
      className="card task-card fade-in"
      onClick={() => onClick?.(task)}
      style={{ cursor: onClick ? 'pointer' : 'default', padding: '16px 18px' }}
    >
      {/* Priority stripe */}
      <div
        className="task-priority-stripe"
        data-priority={task.priority}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
          background: `var(--priority-${task.priority})`,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingLeft: 6 }}>
        {/* Status icon */}
        <button
          className="btn-ghost btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            const next: Task['status'] =
              task.status === 'todo' ? 'in_progress'
              : task.status === 'in_progress' ? 'done'
              : 'todo';
            onStatusChange?.(task, next);
          }}
          title="Change status"
          style={{ marginTop: 1, color: 'var(--text-secondary)' }}
        >
          {STATUS_ICONS[task.status]}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.4,
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.title}
          </p>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span className={`badge badge-${task.priority}`}>{task.priority}</span>

            {task.dueDate && (
              <span
                style={{
                  fontSize: 11,
                  color: isOverdue ? 'var(--danger)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <Clock size={10} />
                {isOverdue ? 'Overdue · ' : ''}
                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </span>
            )}

            {task.githubIssueNumber && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                #{task.githubIssueNumber}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
