import type { ChatMessage, McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// AIProvider interface — implemented by Bedrock and Mock providers
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolUseRequest {
  name: string;
  id: string;
  input: Record<string, unknown>;
}

export interface AIResponse {
  text: string | null;
  toolUseRequests: ToolUseRequest[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | string;
}

export interface AIProvider {
  /**
   * Send a conversation to the AI and get a response.
   * The provider handles tool definitions and multi-turn context.
   */
  chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse>;
}
