import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store';
import { aiApi, type ChatMessage } from '../services/endpoints';
import { Bot, SendHorizontal, Trash2, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'What should I work on today?',
  'Show my overdue tasks.',
  "What's blocking my project?",
  'Create a high priority task called Fix auth bug due tomorrow.',
  'Summarize all projects.',
];

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div
      className="fade-in"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        gap: 10,
        alignItems: 'flex-end',
        marginBottom: 16,
      }}
    >
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--accent-grad)',
          display: 'grid', placeItems: 'center',
          flexShrink: 0, boxShadow: 'var(--accent-glow)',
        }}>
          <Bot size={16} color="#fff" />
        </div>
      )}
      <div
        style={{
          maxWidth: '72%',
          padding: '12px 16px',
          borderRadius: isUser
            ? 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)'
            : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
          background: isUser ? 'var(--accent-grad)' : 'var(--bg-elevated)',
          border: isUser ? 'none' : '1px solid var(--border)',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxShadow: isUser ? 'var(--accent-glow)' : 'none',
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

export default function AIChatPage() {
  const { messages, isLoading, addMessage, setLoading, setError, clearMessages } = useChatStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content };
    addMessage(userMsg);
    setLoading(true);
    setError(null);
    try {
      const reply = await aiApi.chat([...messages, userMsg]);
      addMessage({ role: 'assistant', content: reply });
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e.message ?? 'Something went wrong.';
      setError(msg);
      addMessage({ role: 'assistant', content: `⚠️ ${msg}` });
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--accent-grad)',
            display: 'grid', placeItems: 'center',
            boxShadow: 'var(--accent-glow)',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: 20 }}>AI Agent</h1>
            <p className="page-subtitle">Powered by Amazon Bedrock · MCP Tools</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-ghost" onClick={clearMessages} title="Clear chat">
            <Trash2 size={15} /> Clear
          </button>
        )}
      </div>

      {/* Message area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Bot size={56} style={{ color: 'var(--accent-1)', marginBottom: 16, display: 'block', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>How can I help?</p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14 }}>
              Ask me about your tasks, projects, deadlines, or let me take actions for you.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="btn btn-secondary btn-sm"
                  onClick={() => send(s)}
                  style={{ fontSize: 13 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => <ChatBubble key={i} msg={m} />)}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--accent-grad)',
              display: 'grid', placeItems: 'center',
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--accent-1)',
                  animation: `spin 1s ${i * 0.2}s ease-in-out infinite`,
                  display: 'inline-block',
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="card"
        style={{ padding: 12, marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}
      >
        <textarea
          id="ai-chat-input"
          className="form-textarea"
          style={{ flex: 1, minHeight: 44, maxHeight: 180, resize: 'none', border: 'none', background: 'transparent', padding: '8px 0', fontSize: 14 }}
          placeholder="Ask anything about your work… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isLoading}
          rows={1}
        />
        <button
          id="ai-send-btn"
          className="btn btn-primary btn-icon"
          onClick={() => send()}
          disabled={isLoading || !input.trim()}
          style={{ flexShrink: 0, height: 40, width: 40 }}
        >
          <SendHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
