import './Sidebar.css';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Bot,
  Github,
  Users,
  Settings,
} from 'lucide-react';

import QlyqLogo from './QlyqLogo';

const mainNavItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: CheckSquare,     label: 'My Tasks'  },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects'  },
  { to: '/deadlines', icon: Calendar,        label: 'Deadlines' },
  { to: '/ai',        icon: Bot,             label: 'AI Assistant', badge: 'MCP' },
  { to: '/github',    icon: Github,          label: 'GitHub',       badge: 'NEW' },
  { to: '/team',      icon: Users,           label: 'Team'      },
];

export default function Sidebar() {
  return (
    <aside className="sidebar flex flex-col justify-between h-full w-60 border-r border-border bg-surface-card shrink-0">
      <div>
        {/* QLYQ Typographic Wordmark & Ribbon Symbol */}
        <div className="sidebar-logo flex items-center justify-between px-5 py-5 border-b border-border/60">
          <QlyqLogo variant="horizontal" size={32} showTagline={true} />
        </div>

        {/* Main navigation */}
        <div className="px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Workspace
          </div>
          <nav className="space-y-1">
            {mainNavItems.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-text-secondary hover:text-white hover:bg-surface-elevated/70'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer / Settings & Profile */}
      <div className="p-3 border-t border-border/60 space-y-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                : 'text-text-secondary hover:text-white hover:bg-surface-elevated/70'
            }`
          }
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>

        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface-elevated/50 border border-border/50">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
            A
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate">Alex Chen</span>
            <span className="text-[10px] text-text-muted truncate">Workspace Owner</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
