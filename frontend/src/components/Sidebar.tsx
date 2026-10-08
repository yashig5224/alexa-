import './Sidebar.css';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Bot,
  GitBranch,
  Settings,
  Zap,
} from 'lucide-react';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects'  },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks'     },
  { to: '/team',      icon: Users,           label: 'Team'      },
  { to: '/github',    icon: GitBranch,       label: 'GitHub'    },
  { to: '/ai',        icon: Bot,             label: 'AI Agent', badge: true },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="#fff" />
        </div>
        <div className="sidebar-logo-text">
          Track<span>Mate</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
              {badge && <span className="link-badge">AI</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
          <Settings size={16} />
          Settings
        </NavLink>
        <div className="sidebar-user">
          <div className="sidebar-avatar">J</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Jane Dev</div>
            <div className="sidebar-user-role">Owner</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
