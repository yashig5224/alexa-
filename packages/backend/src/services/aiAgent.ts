// packages/backend/src/services/aiAgent.ts
/**
 * Core AI agent service – glues the selected AIProvider (mock or Bedrock) with the
 * MCP client. It receives a conversation, asks the provider for a response, and
 * if the provider requests tool use it invokes the appropriate MCP tool and
 * returns the tool result to the caller.
 *
 * For the hackathon demo we keep the interaction model simple: a single round
 * of tool use is supported. The provider can return multiple toolUseRequests –
 * we execute them sequentially and concatenate the textual results.
 */

import type { AIProvider, AIResponse } from '../ai-providers/interface.js';
import { BedrockProvider } from '../ai-providers/bedrock.js';
import { MockProvider } from '../ai-providers/mock.js';
import { mcpClient } from './mcpClient.js';
import type { McpToolResult } from '@trackmate/shared';

/** Choose provider based on the AI_PROVIDER env var (default mock). */
const provider: AIProvider = (() => {
  const sel = process.env['AI_PROVIDER']?.toLowerCase() ?? 'mock';
  if (sel === 'bedrock') return new BedrockProvider();
  return new MockProvider();
})();

/**
 * Process a chat turn.
 * @param messages Array of chat messages from the user and assistant so far.
 * @returns A string that should be displayed to the user.
 */
export async function processChat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
  // Load tool definitions from MCP once per request (could be cached globally).
  const tools = await mcpClient.listTools();
  // The MCP server returns full tool definitions; we only need name/desc/inputSchema.
  // For simplicity we pass the raw definitions (the provider only cares about name).

  // System prompt – static for now.
  const systemPrompt = 'You are TrackMate AI, a productivity assistant. Use the provided tools when appropriate.';

  const aiResp: AIResponse = await provider.chat({ messages, tools, systemPrompt });

  // If the provider returned plain text – just forward it.
  if (aiResp.text) return aiResp.text;

  // Otherwise handle tool use requests.
  if (aiResp.toolUseRequests.length === 0) return 'No response from AI provider.';

  const toolOutputs: string[] = [];
  for (const req of aiResp.toolUseRequests) {
    try {
      const result: McpToolResult = await mcpClient.callTool(req.name, req.input);
      // Render result content – assume a simple text field for now.
      const textPart = result.content?.find(c => c.type === 'text')?.text ?? JSON.stringify(result);
      toolOutputs.push(`Tool ${req.name} result: ${textPart}`);
    } catch (e: any) {
      toolOutputs.push(`Error calling tool ${req.name}: ${e.message}`);
    }
  }

  return toolOutputs.join('\n');
}
