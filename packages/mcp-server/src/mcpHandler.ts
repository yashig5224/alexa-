import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  McpInitializeResult,
  McpToolsListResult,
  McpToolResult,
} from '@trackmate/shared';
import { McpErrorCode } from '@trackmate/shared';
import { ALL_TOOLS, TOOL_DEFINITIONS } from './tools/index.js';

export const mcpRouter = Router();

// ── Session tracking (in-memory for development) ─────────────────────────────
const sessions = new Map<string, { createdAt: Date; clientInfo?: unknown }>();

// ── MCP Streamable HTTP — POST /mcp ──────────────────────────────────────────
// Per spec 2025-11-25: single endpoint, Accept header determines streaming vs JSON
mcpRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as JsonRpcRequest;

  // Validate JSON-RPC structure
  if (!body || body.jsonrpc !== '2.0' || !body.method) {
    res.status(400).json(makeError(null, McpErrorCode.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request'));
    return;
  }

  const requestId = body.id ?? null;
  let sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    switch (body.method) {
      // ── initialize ──────────────────────────────────────────────────────
      case 'initialize': {
        sessionId = randomUUID();
        sessions.set(sessionId, {
          createdAt: new Date(),
          clientInfo: (body.params as Record<string, unknown>)?.['clientInfo'],
        });

        res.setHeader('Mcp-Session-Id', sessionId);

        const result: McpInitializeResult = {
          protocolVersion: '2025-11-25',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'trackmate-mcp-server',
            version: '1.0.0',
          },
        };
        res.json(makeResult(requestId, result));
        return;
      }

      // ── ping ─────────────────────────────────────────────────────────────
      case 'ping': {
        res.json(makeResult(requestId, {}));
        return;
      }

      // ── tools/list ───────────────────────────────────────────────────────
      case 'tools/list': {
        const result: McpToolsListResult = { tools: TOOL_DEFINITIONS };
        res.json(makeResult(requestId, result));
        return;
      }

      // ── tools/call ───────────────────────────────────────────────────────
      case 'tools/call': {
        const params = body.params as { name?: string; arguments?: Record<string, unknown> };

        if (!params?.name) {
          res.json(makeError(requestId, McpErrorCode.INVALID_PARAMS, 'Missing tool name'));
          return;
        }

        const toolHandler = ALL_TOOLS[params.name];
        if (!toolHandler) {
          res.json(makeError(requestId, McpErrorCode.METHOD_NOT_FOUND, `Unknown tool: ${params.name}`));
          return;
        }

        // Check if client wants streaming (SSE) or plain JSON
        const acceptsStream = req.headers['accept']?.includes('text/event-stream');

        if (acceptsStream) {
          // Streamable HTTP — emit as SSE for long-running tool results
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          if (sessionId) res.setHeader('Mcp-Session-Id', sessionId);

          try {
            const toolResult: McpToolResult = await toolHandler(params.arguments ?? {});
            const response: JsonRpcResponse<McpToolResult> = makeResult(requestId, toolResult);
            res.write(`data: ${JSON.stringify(response)}\n\n`);
          } catch (toolErr) {
            const errResult: McpToolResult = {
              content: [{ type: 'text', text: `Tool error: ${String(toolErr)}` }],
              isError: true,
            };
            res.write(`data: ${JSON.stringify(makeResult(requestId, errResult))}\n\n`);
          }
          res.end();
        } else {
          // Standard JSON response
          if (sessionId) res.setHeader('Mcp-Session-Id', sessionId);
          const toolResult: McpToolResult = await toolHandler(params.arguments ?? {});
          res.json(makeResult(requestId, toolResult));
        }
        return;
      }

      // ── Unknown method ───────────────────────────────────────────────────
      default: {
        res.json(makeError(requestId, McpErrorCode.METHOD_NOT_FOUND, `Unknown method: ${body.method}`));
        return;
      }
    }
  } catch (err) {
    console.error('[MCP] Internal error:', err);
    res.status(500).json(makeError(requestId, McpErrorCode.INTERNAL_ERROR, 'Internal server error'));
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeResult<T>(id: string | number | null, result: T): JsonRpcResponse<T> {
  return { jsonrpc: '2.0', id, result };
}

function makeError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message, data } };
}
