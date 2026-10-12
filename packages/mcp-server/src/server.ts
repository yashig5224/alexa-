import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectMongoDB, SeedService } from '@trackmate/database';
import { mcpRouter } from './mcpHandler.js';

const PORT = parseInt(process.env['MCP_PORT'] ?? '3002', 10);
const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:3001';

const app = express();

// ── Security middleware ─────────────────────────────────────────────────────
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:3001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'Authorization'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

// Rate limiting: 200 MCP calls per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// JSON body parser (required for MCP JSON-RPC 2.0 payloads)
app.use(express.json({ limit: '1mb' }));

// ── Health endpoint ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'trackmate-mcp-server',
    version: '1.0.0',
    transport: 'streamable-http',
    mcpSpec: '2025-11-25',
    timestamp: new Date().toISOString(),
  });
});

// ── MCP Streamable HTTP endpoint ─────────────────────────────────────────────
// Single POST /mcp handles all JSON-RPC 2.0 methods per spec 2025-11-25
app.use('/mcp', mcpRouter);

// ── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start server & DB connection ─────────────────────────────────────────────
async function start() {
  try {
    await connectMongoDB();
    await SeedService.seedMongoDB();
  } catch (err) {
    console.warn('⚠️ MongoDB connection/seeding warning:', err);
  }

  app.listen(PORT, () => {
    console.log(`🚀 TrackMate MCP Server running on http://localhost:${PORT}`);
    console.log(`   Transport: Streamable HTTP (MCP spec 2025-11-25)`);
    console.log(`   Endpoint:  POST http://localhost:${PORT}/mcp`);
    console.log(`   Health:    GET  http://localhost:${PORT}/health`);
  });
}

if (process.env['NODE_ENV'] !== 'test') {
  start();
}

export { app };
