import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

function getMcpServerUrl(): string {
  return process.env['MCP_SERVER_URL'] ?? 'http://localhost:3002';
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP HTTP Client
// The backend calls the MCP server over Streamable HTTP (POST /mcp)
// ─────────────────────────────────────────────────────────────────────────────

export class McpClient {
  private sessionId: string | null = null;

  /** Initialize MCP session and return server info */
  async initialize(): Promise<void> {
    const res = await fetch(`${getMcpServerUrl()}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'trackmate-backend', version: '1.0.0' },
        },
      }),
    });

    this.sessionId = res.headers.get('mcp-session-id');
  }

  /** Fetch all available tools from the MCP server */
  async listTools(): Promise<McpToolDefinition[]> {
    const res = await this.post({ id: 2, method: 'tools/list' });
    return (res.result as { tools: McpToolDefinition[] }).tools;
  }

  /** Call a specific MCP tool with arguments */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolResult> {
    const res = await this.post({
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args },
    });

    if (res.error) {
      return {
        content: [{ type: 'text', text: `MCP Error: ${res.error.message}` }],
        isError: true,
      };
    }

    return res.result as McpToolResult;
  }

  private async post(body: Record<string, unknown>) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(`${getMcpServerUrl()}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', ...body }),
    });

    if (!res.ok) {
      throw new Error(`MCP HTTP error: ${res.status}`);
    }

    return res.json() as Promise<{ result?: unknown; error?: { message: string } }>;
  }
}

// Singleton client — initialized once at server startup
export const mcpClient = new McpClient();
