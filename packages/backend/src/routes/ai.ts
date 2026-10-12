import { Router } from 'express';
import { processChat } from '../services/aiAgent.js';

export const aiRouter = Router();

/**
 * POST /api/ai/chat
 * Body: { messages: [{ role: 'user' | 'assistant'; content: string }] }
 * Returns: { reply: string, toolCalls: [...] }
 */
aiRouter.post('/chat', async (req, res) => {
  try {
    const raw = req.body as { messages?: Array<{ role?: string; content?: string }> };
    if (!Array.isArray(raw?.messages)) {
      return res.status(400).json({ error: 'Invalid request – "messages" array required' });
    }
    const messages = raw.messages
      .filter((m): m is { role: 'user' | 'assistant'; content: string } => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: String(m.content ?? '') }));

    const result = await processChat(messages);
    res.json({ reply: result.reply, toolCalls: result.toolCalls });
  } catch (err: any) {
    console.error('[AI] error processing chat:', err);
    res.status(500).json({ error: err?.message ?? 'Internal server error' });
  }
});
