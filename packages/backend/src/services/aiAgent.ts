import type { AIProvider, AIResponse, ToolExecutionResult, AgentChatResult } from '../ai-providers/interface.js';
import { BedrockProvider } from '../ai-providers/bedrock.js';
import { MockProvider } from '../ai-providers/mock.js';
import { mcpClient } from './mcpClient.js';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Orchestration Service
// Manages the complete multi-stage AI reasoning loop:
// 1. Natural Language Input
// 2. Intent Analysis & Tool Selection
// 3. MCP Tool Discovery & Execution over Streamable HTTP
// 4. Returning Tool Results to AI
// 5. Final Natural-Language Response Synthesis
// ─────────────────────────────────────────────────────────────────────────────

let currentProvider: AIProvider = createDefaultProvider();

function createDefaultProvider(): AIProvider {
  const sel = process.env['AI_PROVIDER']?.toLowerCase() ?? 'mock';
  if (sel === 'bedrock') {
    return new BedrockProvider();
  }
  return new MockProvider();
}

export function getProvider(): AIProvider {
  return currentProvider;
}

export function setProvider(p: AIProvider): void {
  currentProvider = p;
}

export function resetProvider(): void {
  currentProvider = createDefaultProvider();
}

const SYSTEM_PROMPT = `You are TrackMate AI, an agentic productivity and project-management platform for students and developers.
You have access to self-hosted Model Context Protocol (MCP) tools for managing projects, tasks, deadlines, team members, priorities, and project status.
Always use the tools when the user requests information or actions related to tasks, projects, deadlines, priorities, or blockers.
After receiving tool execution results, synthesize a clear, friendly, and structured natural-language response.`;

/**
 * Process a chat turn through the agent orchestration loop.
 */
export async function processChat(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<AgentChatResult> {
  // 1. Discover available MCP tools
  let tools: McpToolDefinition[] = [];
  try {
    tools = await mcpClient.listTools();
  } catch (err) {
    console.warn('[AI Agent] MCP tool listing fallback:', err);
    // Fallback if MCP server is temporarily starting up
    tools = [];
  }

  // 2. Stage 1: AI determines whether a tool is required
  const aiResp: AIResponse = await currentProvider.chat({
    messages,
    tools,
    systemPrompt: SYSTEM_PROMPT,
  });

  // If no tool is needed, return the AI direct response
  if (aiResp.stopReason !== 'tool_use' || aiResp.toolUseRequests.length === 0) {
    return {
      reply: aiResp.text ?? "I'm ready to help! What would you like to work on?",
      toolCalls: [],
    };
  }

  // 3. Stage 2: Invoke selected MCP tools
  const toolResults: ToolExecutionResult[] = [];
  const executedToolCalls: Array<{ name: string; input: Record<string, unknown>; output: unknown }> = [];

  for (const req of aiResp.toolUseRequests) {
    try {
      const result: McpToolResult = await mcpClient.callTool(req.name, req.input);
      const textPart =
        result.content?.find((c) => c.type === 'text')?.text ?? JSON.stringify(result);

      toolResults.push({
        toolUseId: req.id,
        name: req.name,
        input: req.input,
        output: textPart,
        isError: result.isError,
      });

      let parsedOutput: unknown = textPart;
      try {
        parsedOutput = JSON.parse(textPart);
      } catch {
        // keep text
      }

      executedToolCalls.push({
        name: req.name,
        input: req.input,
        output: parsedOutput,
      });
    } catch (err: any) {
      const errMsg = err.message ?? String(err);
      toolResults.push({
        toolUseId: req.id,
        name: req.name,
        input: req.input,
        output: `Error invoking tool ${req.name}: ${errMsg}`,
        isError: true,
      });

      executedToolCalls.push({
        name: req.name,
        input: req.input,
        output: { error: errMsg },
      });
    }
  }

  // 4. Stage 3: Return tool results back to AI to synthesize natural-language response
  const finalResp: AIResponse = await currentProvider.chatWithToolResult({
    messages,
    tools,
    systemPrompt: SYSTEM_PROMPT,
    toolUseRequests: aiResp.toolUseRequests,
    toolResults,
  });

  return {
    reply: finalResp.text ?? 'I completed the requested action.',
    toolCalls: executedToolCalls,
  };
}
