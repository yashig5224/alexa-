import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store';
import { aiApi, type ChatMessage, type ToolCallMetadata } from '../services/endpoints';
import {
  Bot,
  SendHorizontal,
  Trash2,
  Cpu,
  ChevronDown,
  ChevronRight,
  Terminal,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
} from 'lucide-react';

const SUGGESTIONS = [
  { label: "Today's priorities", query: "What should I work on today?", icon: Clock },
  { label: "Overdue tasks", query: "Show my overdue tasks.", icon: AlertCircle },
  { label: "Check blockers", query: "What is blocking TrackMate AI?", icon: AlertCircle },
  { label: "Create task", query: "Create a high-priority task called 'Implement Webhook listener' due tomorrow.", icon: PlusCircle },
  { label: "Summarize projects", query: "Summarize my active projects and their completion status.", icon: CheckCircle2 },
];

function getToolDisplayInfo(name: string, input?: Record<string, unknown>): { label: string; action: string } {
  switch (name) {
    case 'get_daily_priorities':
      return { label: "Getting today's priorities...", action: 'Retrieved ranked daily priority schedule' };
    case 'create_task':
      return {
        label: "Creating task...",
        action: input?.['title'] ? `Created task: "${input['title']}"` : 'Created new task in project',
      };
    case 'update_task':
      return {
        label: input?.['status'] ? `Updating task status...` : "Updating task...",
        action: 'Updated task record',
      };
    case 'get_project_status':
      return { label: "Analyzing project status...", action: 'Inspected blockers, progress, and team metrics' };
    case 'get_deadlines':
      return { label: "Checking upcoming deadlines...", action: 'Queried timeline and milestone schedule' };
    case 'get_tasks':
      return { label: "Fetching tasks...", action: 'Retrieved task database records' };
    case 'get_projects':
      return { label: "Fetching projects...", action: 'Retrieved active workspace projects' };
    case 'summarize_project':
      return { label: "Updating project...", action: 'Generated project executive summary' };
    default:
      return { label: `Running MCP tool: ${name}...`, action: `Executed ${name}` };
  }
}

function getLoadingActionText(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('priorit') || p.includes('today') || p.includes('work on')) {
    return "Getting today's priorities...";
  }
  if (p.includes('create') && (p.includes('task') || p.includes('todo') || p.includes('item'))) {
    return "Creating task...";
  }
  if (p.includes('update') || p.includes('move') || p.includes('progress') || p.includes('done') || p.includes('status')) {
    return "Updating task...";
  }
  if (p.includes('block') || p.includes('status') || p.includes('health') || p.includes('summary')) {
    return "Analyzing project status...";
  }
  if (p.includes('overdue') || p.includes('deadline') || p.includes('calendar')) {
    return "Checking upcoming deadlines...";
  }
  return "Querying MCP tools...";
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCallMetadata }) {
  const [expanded, setExpanded] = useState(false);
  const info = getToolDisplayInfo(toolCall.name, toolCall.input);

  return (
    <div className="my-1.5 border border-border/80 bg-surface-card/90 rounded-lg overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-surface-elevated/80 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-emerald-400 font-mono text-[11px]">{info.label}</span>
          <span className="text-text-muted text-[11px] hidden sm:inline">({toolCall.name})</span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <span className="text-[10px] uppercase font-mono">Output</span>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>
      </button>

      {expanded && (
        <div className="p-2.5 bg-[#080b12] border-t border-border/60 font-mono text-[11px] text-text-secondary overflow-x-auto max-h-48">
          <div className="text-text-muted mb-1 flex items-center gap-1 text-[10px]">
            <Terminal size={10} /> Tool Input:
          </div>
          <pre className="mb-2 text-indigo-300 whitespace-pre-wrap">{JSON.stringify(toolCall.input, null, 2)}</pre>
          <div className="text-text-muted mb-1 flex items-center gap-1 text-[10px]">
            <Terminal size={10} /> Tool Result:
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
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
          <Bot size={16} />
        </div>
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Compact Tool Activity Indicators */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="w-full mb-1 space-y-1">
            {msg.toolCalls.map((tc, idx) => (
              <ToolCallBadge key={idx} toolCall={tc} />
            ))}
          </div>
        )}

        <div
          className={`px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm font-medium'
              : 'bg-surface-card border border-border text-text-primary rounded-bl-xs'
          }`}
        >
          <div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>
        </div>
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const queryClient = useQueryClient();
  const { messages, isLoading, addMessage, setLoading, setError, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    setInput('');
    setLastUserPrompt(content);
    const userMsg: ChatMessage = { role: 'user', content };
    addMessage(userMsg);
    setLoading(true);
    setError(null);

    try {
      // Send chat history to backend agent orchestration
      const response = await aiApi.chat([...messages, userMsg]);
      addMessage({
        role: 'assistant',
        content: response.reply,
        toolCalls: response.toolCalls,
      });

      // If tools created/updated tasks or projects, refresh cache
      if (response.toolCalls && response.toolCalls.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['deadlines'] });
        queryClient.invalidateQueries({ queryKey: ['priorities'] });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e.message ?? 'Failed to communicate with AI Assistant.';
      setError(msg);
      addMessage({
        role: 'assistant',
        content: `Sorry, an error occurred: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-indigo-400">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">AI Assistant</h1>
              <span className="badge badge-low text-[10px] font-mono tracking-wide py-0.5 px-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                MCP 2025-11-25
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Self-hosted Streamable HTTP Agent · Amazon Bedrock Reasoning Loop
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="btn btn-ghost text-xs text-text-muted hover:text-rose-400 flex items-center gap-1.5"
            title="Clear chat history"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Suggested Quick Actions */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-2 no-scrollbar">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Cpu size={12} /> Quick Actions:
        </span>
        {SUGGESTIONS.map((s, idx) => {
          const Icon = s.icon;
          return (
            <button
              key={idx}
              onClick={() => send(s.query)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-surface-card border border-border hover:border-indigo-500/40 hover:text-white text-text-secondary transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Icon size={12} className="text-indigo-400" />
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Messages Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-1 py-3 space-y-2 border border-border/60 bg-surface-base/40 rounded-xl"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-surface-card border border-border flex items-center justify-center text-indigo-400 shadow-sm">
              <Bot size={24} />
            </div>
            <div className="max-w-md space-y-1">
              <h2 className="text-base font-bold text-white">How can I assist your workflow today?</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                I can review priorities, inspect project blockers, schedule tasks, and track deadlines using the self-hosted MCP tool server.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left w-full max-w-lg mt-2">
              {SUGGESTIONS.slice(0, 4).map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => send(s.query)}
                  className="p-3 rounded-lg bg-surface-card border border-border hover:border-indigo-500/50 hover:bg-surface-elevated/70 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-primary group-hover:text-indigo-400">
                    <s.icon size={13} className="text-indigo-400" />
                    <span>{s.label}</span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 truncate">"{s.query}"</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => <MessageBubble key={idx} msg={m} />)
        )}

        {/* Live Loading & Compact Activity Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 my-2">
            <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0 text-indigo-400">
              <Bot size={16} />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card border border-indigo-500/30 text-xs text-indigo-300 font-medium shadow-sm animate-pulse">
                <RefreshCw size={12} className="animate-spin text-indigo-400" />
                <span>{getLoadingActionText(lastUserPrompt)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="pt-3">
        <div className="relative flex items-center bg-surface-card border border-border rounded-xl focus-within:border-indigo-500/60 transition-colors p-1.5 shadow-sm">
          <textarea
            id="ai-prompt-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={isLoading}
            placeholder="Ask about priorities, blockers, deadlines or instruct: 'Create task...' (Enter to send)"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted px-3 py-2 resize-none focus:outline-none max-h-32 leading-relaxed"
          />
          <button
            id="ai-send-btn"
            type="button"
            onClick={() => send()}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition-colors cursor-pointer shrink-0"
            title="Send prompt"
          >
            <SendHorizontal size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-muted px-1 mt-1.5">
          <span>Tip: Shift+Enter for new line</span>
          <span className="font-mono">MCP Protocol: Streamable HTTP</span>
        </div>
      </div>
    </div>
  );
}
