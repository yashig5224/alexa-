import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings,
  Cpu,
  User,
  Shield,
  CheckCircle2,
  RefreshCw,
  Code2,
  Layers,
  Database,
  Radio,
} from 'lucide-react';

interface BackendHealth {
  status: string;
  service: string;
  version: string;
  database: string;
  aiProvider: string;
  mcpServerUrl: string;
  timestamp: string;
}

const MCP_TOOLS = [
  { name: 'get_tasks', desc: 'List and filter tasks by project, status, priority, or assignee.' },
  { name: 'create_task', desc: 'Create a new task with title, priority, due date, and project association.' },
  { name: 'update_task', desc: 'Update status (todo, in_progress, done, blocked), priority, or blocker notes.' },
  { name: 'get_projects', desc: 'Retrieve all projects with overall completion percentage.' },
  { name: 'get_project_status', desc: 'Detailed project health inspection, active blockers, and progress metrics.' },
  { name: 'get_deadlines', desc: 'Fetch upcoming deadlines filtered by urgency window or project.' },
  { name: 'get_daily_priorities', desc: 'Rank tasks dynamically based on due dates, priority weight, and blocker status.' },
  { name: 'get_github_issues', desc: 'Fetch open/closed issues from a connected GitHub repository.' },
  { name: 'get_github_pull_requests', desc: 'List pull requests with branch, draft status, and assignee details.' },
  { name: 'get_stale_github_issues', desc: 'Identify stale issues with verified blocker analysis.' },
  { name: 'summarize_github_activity', desc: 'Executive summary of repository activity, blockers, and stale work.' },
];

export default function SettingsPage() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [mcpStatus, setMcpStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [checking, setChecking] = useState(false);

  const checkConnectivity = async () => {
    setChecking(true);
    try {
      const res = await axios.get<BackendHealth>('/health', { timeout: 3000 });
      setHealth(res.data);
      setMcpStatus('connected');
    } catch (e) {
      setHealth(null);
      setMcpStatus('offline');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkConnectivity();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Settings size={14} /> System Configuration
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Architecture</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage workspace profile, MCP server connectivity, and Amazon Bedrock integration.
          </p>
        </div>

        <button
          onClick={checkConnectivity}
          disabled={checking}
          className="btn btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
          <span>Test Connections</span>
        </button>
      </div>

      {/* Connectivity Status Banner */}
      <div className="bg-surface-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              mcpStatus === 'connected'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>
              <Radio size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">MCP Streamable HTTP Transport</h2>
                <span className={`badge text-[10px] font-mono uppercase font-bold ${
                  mcpStatus === 'connected' ? 'badge-low bg-emerald-500/10 text-emerald-400' : 'badge-high bg-amber-500/10 text-amber-400'
                }`}>
                  {mcpStatus === 'connected' ? 'Online · 2025-11-25' : 'Connecting'}
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Endpoint: <code className="text-indigo-300 font-mono">http://localhost:3002/mcp</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-muted border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-text-muted">Backend API</span>
              <span className="text-text-primary font-mono">{health?.status === 'ok' ? '3001 (Ready)' : 'Standby'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-text-muted">Database</span>
              <span className="text-text-primary font-mono">{health?.database ?? 'MongoDB'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-text-muted">AI Provider</span>
              <span className="text-indigo-400 font-mono font-medium">{health?.aiProvider ?? 'mock / bedrock'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <User size={16} className="text-indigo-400" />
          <span>Active User Profile</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-text-muted block text-[11px] uppercase font-semibold">User</span>
            <div className="font-medium text-white text-sm">Alex Chen</div>
            <div className="text-text-muted">alex@trackmate.dev</div>
          </div>
          <div className="space-y-1">
            <span className="text-text-muted block text-[11px] uppercase font-semibold">Role</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium">
              <Shield size={12} />
              <span>Workspace Owner</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-text-muted block text-[11px] uppercase font-semibold">Workspace</span>
            <div className="font-medium text-white text-sm">QLYQ Engineering</div>
            <div className="text-text-muted">3 active projects · 9 tasks</div>
          </div>
        </div>
      </div>

      {/* MCP Modular Tools Architecture */}
      <div className="bg-surface-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Cpu size={16} className="text-indigo-400" />
            <span>Registered Model Context Protocol (MCP) Tools</span>
          </div>
          <span className="text-xs text-text-muted font-mono">{MCP_TOOLS.length} Tools Active</span>
        </div>

        <p className="text-xs text-text-muted">
          These tools are registered with the self-hosted Streamable HTTP MCP Server and can be executed dynamically by Bedrock and the QLYQ AI Agent.
        </p>

        <div className="divide-y divide-border/60">
          {MCP_TOOLS.map((t, idx) => (
            <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
              <div className="flex items-center gap-2">
                <Code2 size={13} className="text-indigo-400 shrink-0" />
                <span className="font-mono text-xs font-semibold text-text-primary">{t.name}</span>
              </div>
              <p className="text-xs text-text-muted text-left sm:text-right">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Provider & Security Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Layers size={16} className="text-indigo-400" />
            <span>AI Reasoning Layer</span>
          </div>
          <ul className="text-xs text-text-muted space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Amazon Bedrock:</strong> Anthropic Claude 3.5 Sonnet / Haiku integration.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Mock Mode:</strong> Offline deterministic reasoning engine for cost-free development.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>No Credential Exposure:</strong> AWS IAM credentials strictly stored on backend environment.</span>
            </li>
          </ul>
        </div>

        <div className="bg-surface-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Database size={16} className="text-indigo-400" />
            <span>Architecture & Data Safety</span>
          </div>
          <ul className="text-xs text-text-muted space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Unified Service Layer:</strong> Both REST APIs and MCP tools share identical business logic.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Mongoose / MongoDB:</strong> Strict document validation, schema indexing, and relation integrity.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />
              <span><strong>Streamable HTTP:</strong> Fast single-hop tool dispatch compliant with MCP specification 2025-11-25.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
