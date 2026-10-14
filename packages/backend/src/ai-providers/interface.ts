import type { McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// AIProvider Interface — Modular AI Layer (Amazon Bedrock & Mock)
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationTurn = { role: 'user' | 'assistant'; content: string };

export interface ToolUseRequest {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolExecutionResult {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
  output: string;
  isError?: boolean | undefined;
}

export interface AIResponse {
  text: string | null;
  toolUseRequests: ToolUseRequest[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
}

export interface AgentChatResult {
  reply: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
  /** Which provider produced this response */
  providerMode: 'mock' | 'bedrock' | string;
  /** Whether workspace context was injected */
  contextInjected: boolean;
}

export interface AIProvider {
  readonly name: string;
  /** Identifies this provider as mock (offline/deterministic) */
  readonly isMock: boolean;

  /**
   * Send a conversation to the AI provider to determine text response or tool calls.
   */
  chat(params: {
    messages: ConversationTurn[];
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse>;

  /**
   * Return tool execution results to the AI provider to produce a natural-language answer.
   */
  chatWithToolResult(params: {
    messages: ConversationTurn[];
    tools: McpToolDefinition[];
    systemPrompt: string;
    toolUseRequests: ToolUseRequest[];
    toolResults: ToolExecutionResult[];
  }): Promise<AIResponse>;
}

