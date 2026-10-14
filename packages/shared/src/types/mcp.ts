// ─────────────────────────────────────────────────────────────────────────────
// MCP Protocol Types (Spec 2025-11-25, Streamable HTTP)
// ─────────────────────────────────────────────────────────────────────────────

// JSON-RPC 2.0 base types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Standard JSON-RPC error codes
export const McpErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// MCP Tool definition
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema object
}

// MCP Tool call result
export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// MCP methods
export type McpMethod =
  | 'initialize'
  | 'tools/list'
  | 'tools/call'
  | 'ping';

// initialize request/response
export interface McpInitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: Record<string, unknown>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

// tools/list response
export interface McpToolsListResult {
  tools: McpToolDefinition[];
}

// tools/call params and response
export interface McpToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

// Re-export GitHub types
export type { GitHubIssue } from './github.js';

// Daily priority item (used by get_daily_priorities tool)
export interface PriorityItem {
  task: import('./task.js').Task;
  score: number;
  reasons: string[];
}

// AI Chat message types
export type ChatRole = 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  toolCall?: {
    name: string;
    status: 'calling' | 'done' | 'error';
    result?: unknown;
  };
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  projectId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  toolCalls: Array<{
    name: string;
    result: unknown;
  }>;
}
