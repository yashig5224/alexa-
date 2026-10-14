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
  Zap,
} from 'lucide-react';

import QlyqLogo from './QlyqLogo';

const mainNavItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/tasks',     icon: CheckSquare,     label: 'My Tasks'     },
  { to: '/projects',  icon: FolderKanban,    label: 'Projects'     },
  { to: '/deadlines', icon: Calendar,        label: 'Deadlines'    },
  { to: '/ai',        icon: Bot,             label: 'AI Assistant', badge: 'MCP' },
  { to: '/github',    icon: Github,          label: 'GitHub'       },
  { to: '/team',      icon: Users,           label: 'Team'         },
];

export default function Sidebar() {
  return (
    <aside className="sidebar flex flex-col h-full shrink-0">

      {/* ── Brand lockup ── */}
      <div
        style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <QlyqLogo variant="horizontal" size={28} showTagline={false} />

        {/* MCP online indicator */}
        <div
          title="MCP Server online"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '99px',
            background: 'rgba(34,211,165,0.08)',
            border: '1px solid rgba(34,211,165,0.18)',
            fontSize: '10px',
            fontWeight: 600,
            color: '#22d3a5',
            letterSpacing: '0.04em',
            cursor: 'default',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#22d3a5',
              boxShadow: '0 0 6px #22d3a5',
              display: 'inline-block',
            }}
          />
          MCP
        </div>
      </div>

      {/* ── Navigation ── */}
      <div style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            padding: '0 10px',
            marginBottom: '6px',
          }}
        >
          Workspace
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {mainNavItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="sidebar-nav-icon">
                <Icon size={15} />
              </span>
              <span className="sidebar-nav-label">{label}</span>
              {badge && (
                <span className="sidebar-nav-badge">{badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: '10px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-nav-link${isActive ? ' active' : ''}`
          }
        >
          <span className="sidebar-nav-icon"><Settings size={15} /></span>
          <span className="sidebar-nav-label">Settings</span>
        </NavLink>

        {/* User chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '8px 10px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            marginTop: '4px',
          }}
        >
          {/* Avatar with gradient ring */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7C3AED, #60A5FA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 0 0 2px rgba(167,139,250,0.25)',
            }}
          >
            A
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Alex Chen
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Workspace Owner
            </div>
          </div>
          <Zap size={12} color="#A78BFA" style={{ flexShrink: 0, opacity: 0.7 }} />
        </div>
      </div>
    </aside>
  );
}
