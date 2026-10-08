import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { projectsRouter } from './routes/projects.js';
import { tasksRouter }    from './routes/tasks.js';
import { usersRouter }    from './routes/users.js';
import { aiRouter }       from './routes/ai.js';

const PORT        = parseInt(process.env['PORT'] ?? '3001', 10);
const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:5173';

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '900000', 10),
  max:      parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// AI endpoint gets stricter limiting
const aiLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded. Please wait before sending more messages.' },
});

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '512kb' }));

// ── Health endpoint ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'trackmate-backend',
    version: '1.0.0',
    aiProvider: process.env['AI_PROVIDER'] ?? 'mock',
    mcpServerUrl: process.env['MCP_SERVER_URL'] ?? 'http://localhost:3002',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/projects', projectsRouter);
app.use('/api/tasks',    tasksRouter);
app.use('/api/users',    usersRouter);
app.use('/api/ai',       aiLimiter, aiRouter);

// ── 404 fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Backend] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 TrackMate Backend running on http://localhost:${PORT}`);
  console.log(`   AI Provider: ${process.env['AI_PROVIDER'] ?? 'mock'}`);
  console.log(`   MCP Server:  ${process.env['MCP_SERVER_URL'] ?? 'http://localhost:3002'}`);
});

export { app };
