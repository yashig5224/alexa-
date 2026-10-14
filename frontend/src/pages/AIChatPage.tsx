import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store';
import { aiApi, type ChatMessage, type ToolCallMetadata } from '../services/endpoints';
import QlyqAIOrb, { type AIOrbState } from '../components/QlyqAIOrb';
import {
  Bot,
  SendHorizontal,
  Trash2,
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Clock,
  Layers,
  Check,
  Copy,
} from 'lucide-react';

const SUGGESTIONS = [
  { label: "Today's priorities", query: "What should I work on today?", icon: Clock },
  { label: "Overdue tasks", query: "Show my overdue tasks.", icon: AlertCircle },
  { label: "Check blockers", query: "What is blocking QLYQ?", icon: AlertCircle },
  { label: "Create task", query: "Create a high-priority task called 'Finalize Hackathon Submission' due tomorrow.", icon: PlusCircle },
  { label: "Summarize projects", query: "Summarize my active projects and their completion status.", icon: CheckCircle2 },
  { label: "GitHub activity", query: "Summarize recent GitHub activity for the repository.", icon: Layers },
];

function getToolDisplayInfo(name: string, input?: Record<string, unknown>): { label: string; action: string; tag: string } {
  switch (name) {
    case 'get_daily_priorities':
      return { label: "Calculating daily priorities...", action: 'Computed weighted urgency schedule', tag: 'PRIORITIES' };
    case 'create_task':
      return {
        label: "Creating task...",
        action: input?.['title'] ? `Created task: "${input['title']}"` : 'Created task in database',
        tag: 'MUTATION',
      };
    case 'update_task':
      return {
        label: input?.['status'] ? `Updating task status...` : "Updating task record...",
        action: 'Updated task state',
        tag: 'MUTATION',
      };
    case 'get_project_status':
      return { label: "Analyzing project blockers...", action: 'Evaluated sprint health & blockers', tag: 'PROJECTS' };
    case 'get_deadlines':
      return { label: "Checking upcoming milestones...", action: 'Queried timeline deadlines', tag: 'DEADLINES' };
    case 'get_tasks':
      return { label: "Querying task records...", action: 'Retrieved task database records', tag: 'READ' };
    case 'get_projects':
      return { label: "Querying projects...", action: 'Retrieved active workspace projects', tag: 'READ' };
    case 'get_github_issues':
      return { label: "Fetching GitHub issues...", action: 'Retrieved repository issues', tag: 'GITHUB' };
    case 'get_github_pull_requests':
      return { label: "Fetching pull requests...", action: 'Retrieved active pull requests', tag: 'GITHUB' };
    case 'get_stale_github_issues':
      return { label: "Checking stale work...", action: 'Identified stale issues', tag: 'GITHUB' };
    case 'summarize_github_activity':
      return { label: "Summarizing GitHub pulse...", action: 'Synthesized repository health', tag: 'AI SUMMARY' };
    case 'summarize_project':
      return { label: "Synthesizing project report...", action: 'Generated project executive summary', tag: 'AI SUMMARY' };
    default:
      return { label: `Running MCP tool: ${name}...`, action: `Executed ${name}`, tag: 'MCP TOOL' };
  }
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCallMetadata }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const info = getToolDisplayInfo(toolCall.name, toolCall.input);

  const copyOutput = () => {
    navigator.clipboard.writeText(JSON.stringify(toolCall.output, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 border border-border/80 bg-slate-950/70 rounded-xl overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/40" />
          <span className="font-mono text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {info.tag}
          </span>
          <span className="font-medium text-slate-200 text-xs truncate">{info.action}</span>
          <span className="text-text-muted text-[11px] font-mono hidden sm:inline">({toolCall.name})</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted shrink-0">
          <span className="text-[10px] uppercase font-mono">{expanded ? 'Hide Payload' : 'View Payload'}</span>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-[#07090e] border-t border-border/60 font-mono text-[11px] text-text-secondary overflow-x-auto max-h-56">
          <div className="flex items-center justify-between mb-1 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <Terminal size={10} /> Tool Input Payload:
            </span>
          </div>
          <pre className="mb-2.5 text-indigo-300 whitespace-pre-wrap">{JSON.stringify(toolCall.input, null, 2)}</pre>
          
          <div className="flex items-center justify-between mb-1 text-[10px] text-text-muted border-t border-white/5 pt-2">
            <span className="flex items-center gap-1">
              <Terminal size={10} /> Tool Result Data:
            </span>
            <button
              type="button"
              onClick={copyOutput}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Copied' : 'Copy Result'}
            </button>
          </div>
          <pre className="text-emerald-300 whitespace-pre-wrap">{JSON.stringify(toolCall.output, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
          <Bot size={16} />
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Compact Tool Activity Badges */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="w-full mb-1.5 space-y-1">
            {msg.toolCalls.map((tc, idx) => (
              <ToolCallBadge key={idx} toolCall={tc} />
            ))}
          </div>
        )}

        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-xs shadow-md shadow-indigo-600/20 font-medium'
              : 'bg-surface-card border border-white/5 text-slate-100 rounded-bl-xs shadow-sm'
          }`}
        >
          <div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>
        </div>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { messages, addMessage, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [orbState, setOrbState] = useState<AIOrbState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to assist with tasks and code.');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, orbState]);

  // Handle incoming prompt passed from Dashboard
  useEffect(() => {
    const initialPrompt = (location.state as any)?.initialPrompt;
    if (initialPrompt && typeof initialPrompt === 'string') {
      handleSend(initialPrompt);
      // Clear location state history
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt ?? input;
    if (!textToSend.trim() || orbState === 'thinking' || orbState === 'executing') return;

    if (!customPrompt) setInput('');

    // Add user message
    addMessage({ role: 'user', content: textToSend.trim() });

    // Transition orb to thinking state
    setOrbState('thinking');
    setStatusMessage('Analyzing intent & discovering MCP tools...');

    try {
      // Simulate real intermediate execution state before backend returns
      setTimeout(() => {
        setOrbState('executing');
        setStatusMessage('Executing Streamable HTTP MCP tool...');
      }, 350);

      const response = await aiApi.chat([
        ...messages,
        { role: 'user', content: textToSend.trim() },
      ]);

      // Add assistant response with tool calls metadata
      addMessage({
        role: 'assistant',
        content: response.reply,
        toolCalls: response.toolCalls,
      });

      // Brief success pulse
      setOrbState('success');
      setStatusMessage('Task completed successfully.');
      setTimeout(() => {
        setOrbState('idle');
        setStatusMessage('Ready for next command.');
      }, 1500);

      // Invalidate relevant queries in case a task or project was modified
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['priorities'] });
      queryClient.invalidateQueries({ queryKey: ['deadlines'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    } catch (err: any) {
      setOrbState('error');
      setStatusMessage('Failed to complete tool request.');
      addMessage({
        role: 'assistant',
        content: `⚠️ Error executing request: ${err?.response?.data?.error || err.message || 'Server error'}`,
      });
      setTimeout(() => {
        setOrbState('idle');
        setStatusMessage('Ready for next command.');
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto pb-4 text-text-primary">
      {/* ── 1. Top Header with Integrated 3D Orb & Live MCP Status ──────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface-card border border-white/5 flex items-center justify-between gap-4 mb-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <QlyqAIOrb state={orbState} size={58} interactive={true} className="shrink-0 drop-shadow-md" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">QLYQ AI Assistant</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold uppercase">
                MCP 2025-11-25
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  orbState === 'thinking' || orbState === 'executing'
                    ? 'bg-amber-400 animate-ping'
                    : orbState === 'error'
                    ? 'bg-rose-400'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-mono text-[11px] text-slate-300">{statusMessage}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearMessages}
          title="Clear conversation"
          className="p-2 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── 2. Message History Area ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-1 sm:px-2 space-y-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
            <QlyqAIOrb state="idle" size={96} interactive={true} className="mb-2" />
            <div className="max-w-md space-y-1.5">
              <h2 className="text-lg font-bold text-white">How can QLYQ help you ship today?</h2>
              <p className="text-xs text-text-muted">
                Connects directly to your project database and GitHub repository using 15 specialized MCP tools.
              </p>
            </div>

            {/* Starter Suggestion Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg text-left mt-2">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => handleSend(s.query)}
                    className="p-3 rounded-xl bg-surface-card hover:bg-slate-800/80 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center gap-3 group text-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-white block truncate">{s.label}</span>
                      <span className="text-[11px] text-text-muted block truncate mt-0.5">{s.query}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => <MessageBubble key={idx} msg={msg} />)
        )}

        {/* Live Loading Pulse Bubble */}
        {(orbState === 'thinking' || orbState === 'executing') && (
          <div className="flex gap-3 mb-4 items-start">
            <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
              <Bot size={16} />
            </div>
            <div className="p-3.5 rounded-2xl bg-surface-card border border-white/5 flex items-center gap-2.5 text-xs text-text-secondary">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span className="font-mono">{statusMessage}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── 3. Command Composer Bar ─────────────────────────────────────── */}
      <div className="pt-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 p-2 rounded-2xl bg-surface-card border border-white/10 focus-within:border-indigo-500/60 transition-all shadow-md"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={orbState === 'thinking' || orbState === 'executing'}
            placeholder="Type your command or question... (e.g. 'What should I work on today?')"
            className="flex-1 px-3 py-2 text-sm bg-transparent text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || orbState === 'thinking' || orbState === 'executing'}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-40 shadow-sm"
          >
            <SendHorizontal size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
