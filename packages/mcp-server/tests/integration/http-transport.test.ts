import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { mcpRouter } from '../../src/mcpHandler.js';
import type { AddressInfo } from 'net';

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests for MCP Streamable HTTP transport
// These tests hit the real POST /mcp endpoint over HTTP
// ─────────────────────────────────────────────────────────────────────────────

let serverUrl: string;
let server: ReturnType<typeof app.listen>;
const app = express();
app.use(express.json());
app.use('/mcp', mcpRouter);

beforeAll(async () => {
  await new Promise<void>(resolve => {
    server = app.listen(0, () => {
      const addr = server.address() as AddressInfo;
      serverUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

async function mcpPost(body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${serverUrl}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { res, data: await res.json() as Record<string, unknown> };
}

describe('MCP Streamable HTTP Transport (integration)', () => {
  let sessionId: string;

  // ── initialize ─────────────────────────────────────────────────────────────
  it('POST /mcp initialize returns protocolVersion 2025-11-25 and session ID', async () => {
    const { res, data } = await mcpPost({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
    });

    expect(res.status).toBe(200);
    expect(data['jsonrpc']).toBe('2.0');
    expect(data['id']).toBe(1);
    expect((data['result'] as Record<string, unknown>)['protocolVersion']).toBe('2025-11-25');
    expect((data['result'] as Record<string, unknown>)['serverInfo']).toBeDefined();

    sessionId = res.headers.get('mcp-session-id') ?? '';
    expect(sessionId).toBeTruthy();
  });

  // ── ping ───────────────────────────────────────────────────────────────────
  it('POST /mcp ping responds with empty result', async () => {
    const { res, data } = await mcpPost({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    });

    expect(res.status).toBe(200);
    expect(data['result']).toEqual({});
  });

  // ── tools/list ─────────────────────────────────────────────────────────────
  it('POST /mcp tools/list returns 12 tools', async () => {
    const { res, data } = await mcpPost({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    });

    expect(res.status).toBe(200);
    const tools = (data['result'] as Record<string, unknown>)['tools'] as unknown[];
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(12);
  });

  // ── tools/call — invalid tool ───────────────────────────────────────────────
  it('POST /mcp tools/call with unknown tool name returns METHOD_NOT_FOUND', async () => {
    const { res, data } = await mcpPost({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'nonexistent_tool', arguments: {} },
    });

    expect(res.status).toBe(200);
    expect(data['error']).toBeDefined();
    expect((data['error'] as Record<string, unknown>)['code']).toBe(-32601);
  });

  // ── invalid JSON-RPC ───────────────────────────────────────────────────────
  it('POST /mcp with missing jsonrpc field returns INVALID_REQUEST', async () => {
    const { res, data } = await mcpPost({ id: 5, method: 'ping' });

    expect(res.status).toBe(400);
    expect(data['error']).toBeDefined();
    expect((data['error'] as Record<string, unknown>)['code']).toBe(-32600);
  });

  // ── tools/call — get_projects ───────────────────────────────────────────────
  it('POST /mcp tools/call get_projects returns a result object', async () => {
    const { res, data } = await mcpPost({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'get_projects', arguments: {} },
    });

    expect(res.status).toBe(200);
    expect(data['result']).toBeDefined();
    expect(data['error']).toBeUndefined();

    const result = data['result'] as Record<string, unknown>;
    const content = result['content'] as Array<{ type: string; text: string }>;
    expect(Array.isArray(content)).toBe(true);
    expect(content[0]?.type).toBe('text');
  });

  // ── unknown method ─────────────────────────────────────────────────────────
  it('POST /mcp unknown method returns METHOD_NOT_FOUND', async () => {
    const { res, data } = await mcpPost({
      jsonrpc: '2.0',
      id: 7,
      method: 'resources/list',
    });

    expect(res.status).toBe(200);
    expect((data['error'] as Record<string, unknown>)['code']).toBe(-32601);
  });
});
