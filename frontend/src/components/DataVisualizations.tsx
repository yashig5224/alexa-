import React from 'react';

/* ── 1. Task Status Distribution Bar ─────────────────────────────── */
interface TaskStatusDistributionProps {
  stats: {
    todo: number;
    in_progress: number;
    in_review: number;
    blocked: number;
    done: number;
    total: number;
  };
}

export const TaskStatusDistribution: React.FC<TaskStatusDistributionProps> = ({ stats }) => {
  const { todo, in_progress, in_review, blocked, done, total } = stats;
  if (total === 0) {
    return (
      <div className="text-xs text-text-muted py-2">No tasks available to visualize.</div>
    );
  }

  const segments = [
    { label: 'Completed', count: done, color: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'In Progress', count: in_progress, color: 'bg-indigo-500', text: 'text-indigo-400' },
    { label: 'Review', count: in_review, color: 'bg-sky-500', text: 'text-sky-400' },
    { label: 'To Do', count: todo, color: 'bg-slate-500', text: 'text-slate-400' },
    { label: 'Blocked', count: blocked, color: 'bg-rose-500', text: 'text-rose-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Segmented Horizontal Progress Bar */}
      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
        {segments.map((seg) => {
          if (seg.count === 0) return null;
          const pct = Math.max((seg.count / total) * 100, 2);
          return (
            <div
              key={seg.label}
              style={{ width: `${pct}%` }}
              className={`${seg.color} h-full transition-all duration-500`}
              title={`${seg.label}: ${seg.count} (${Math.round((seg.count / total) * 100)}%)`}
            />
          );
        })}
      </div>

      {/* Legend / Breakdown Pills */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${seg.color}`} />
            <span className="text-text-muted">{seg.label}</span>
            <span className={`font-mono font-medium ${seg.text}`}>{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── 2. Sprint Velocity / Completion Gauge ───────────────────────── */
interface CompletionGaugeProps {
  percentage: number;
  completedTasks: number;
  totalTasks: number;
  size?: number;
}

export const CompletionGauge: React.FC<CompletionGaugeProps> = ({
  percentage,
  completedTasks,
  totalTasks,
  size = 110,
}) => {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPct = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800"
          fill="transparent"
        />
        {/* Progress gradient stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#qlyq-gauge-grad)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          fill="transparent"
        />
        <defs>
          <linearGradient id="qlyq-gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="60%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold font-mono tracking-tight text-white">{validPct}%</span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
          {completedTasks}/{totalTasks}
        </span>
      </div>
    </div>
  );
};

/* ── 3. Weekly Task Milestone Rhythm (7-Day Sparkline) ────────────── */
interface DailyActivityPoint {
  dayName: string;
  count: number;
  isToday?: boolean;
}

interface ActivityRhythmProps {
  data: DailyActivityPoint[];
}

export const ActivityRhythm: React.FC<ActivityRhythmProps> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2 h-16 pt-2">
        {data.map((item, idx) => {
          const heightPct = Math.max((item.count / max) * 100, 8);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <div className="w-full relative flex justify-center items-end h-full">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[20px] rounded-t transition-all duration-500 ${
                    item.isToday
                      ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                  title={`${item.dayName}: ${item.count} items active`}
                />
              </div>
              <span
                className={`text-[10px] font-mono ${
                  item.isToday ? 'text-indigo-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {item.dayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
