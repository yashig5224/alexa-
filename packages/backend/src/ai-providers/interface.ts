import type { McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// AIProvider Interface — Modular AI Layer (Amazon Bedrock & Mock)
// ─────────────────────────────────────────────────────────────────────────────

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
}

export interface AIProvider {
  readonly name: string;

  /**
   * Send a conversation to the AI provider to determine text response or tool calls.
   */
  chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse>;

  /**
   * Return tool execution results to the AI provider to produce a natural-language answer.
   */
  chatWithToolResult(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
    toolUseRequests: ToolUseRequest[];
    toolResults: ToolExecutionResult[];
  }): Promise<AIResponse>;
}
