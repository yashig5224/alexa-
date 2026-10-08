// packages/backend/src/routes/ai.ts
import { Router } from 'express';
import { processChat } from '../services/aiAgent.js';

export const aiRouter = Router();

/**
 * POST /api/ai/chat
 * Body: { messages: [{ role: 'user' | 'assistant'; content: string }] }
 * Returns: { reply: string }
 *
 * In a real implementation this would be protected by JWT middleware – for the
 * hackathon demo we simply accept the payload.
 */
aiRouter.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request – "messages" array required' });
    }
    const reply = await processChat(messages);
    res.json({ reply });
  } catch (err: any) {
    console.error('[AI] error processing chat:', err);
    res.status(500).json({ error: err?.message ?? 'Internal server error' });
  }
});
