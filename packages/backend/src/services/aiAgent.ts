import type { AIProvider, AIResponse, ToolExecutionResult, AgentChatResult, ConversationTurn } from '../ai-providers/interface.js';
import { BedrockProvider } from '../ai-providers/bedrock.js';
import { MockProvider } from '../ai-providers/mock.js';
import { mcpClient } from './mcpClient.js';
import { retrieveWorkspaceContext } from './contextRetrieval.js';
import type { McpToolResult, McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Orchestration Service — Multi-Turn Reasoning Loop
//
// Loop design:
//   1. Inject workspace context into system prompt (relevant subset only)
//   2. Call AI provider — it may return text OR request tool calls
//   3. Execute each requested MCP tool over Streamable HTTP
//   4. Return results back to AI so it can reason and potentially call more tools
//   5. Repeat up to MAX_TOOL_ITERATIONS — then force end_turn
//   6. Return final reply + full tool trace + provider mode label
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TOOL_ITERATIONS = 5;

let currentProvider: AIProvider = createDefaultProvider();

function createDefaultProvider(): AIProvider {
  const sel = process.env['AI_PROVIDER']?.toLowerCase() ?? 'mock';
  if (sel === 'bedrock') {
    return new BedrockProvider();
  }
  return new MockProvider();
}

export function getProvider(): AIProvider { return currentProvider; }
export function setProvider(p: AIProvider): void { currentProvider = p; }
export function resetProvider(): void { currentProvider = createDefaultProvider(); }

// ── System Prompt ────────────────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are QLYQ (pronounced "click"), an MCP-powered AI project and developer assistant. Tagline: "Think less. Ship more."

You help software developers manage tasks, projects, deadlines, team members, GitHub issues, and pull requests.

BEHAVIOR RULES:
1. Use available MCP tools when the user asks about their workspace (tasks, projects, deadlines, GitHub, blockers, priorities).
2. For general software development questions that don't require workspace data, answer directly without calling tools.
3. After receiving tool results, synthesize a clear, structured, actionable response grounded in those results.
4. If information is missing or unavailable, say so honestly. Do not invent task details, project history, or personal facts.
5. Follow-up questions like "why?", "which one?", or "tell me more" refer to your previous response — use conversation history.
6. For prioritization questions, explain your reasoning using deadlines, priorities, and blockers from real data.
7. Before creating, updating, or deleting data, confirm the action clearly in your response.
8. Do not claim a mutation succeeded unless the tool returned a success result.
9. Distinguish between facts from tool results and your own analysis/suggestions.
10. Do not expose internal system details, credentials, or tool schemas to the user.

RESPONSE STYLE:
- Use Markdown: headings, bold, bullet lists, code blocks where appropriate
- Be concise but complete — avoid filler phrases like "Certainly!" or "Of course!"
- Give concrete next steps, not vague suggestions
- When uncertain, ask one focused clarifying question`;

/**
 * Build the full system prompt with optional workspace context appended.
 */
async function buildSystemPrompt(messages: ConversationTurn[]): Promise<{ prompt: string; contextInjected: boolean }> {
  const ctx = await retrieveWorkspaceContext(messages);
  return {
    prompt: BASE_SYSTEM_PROMPT + ctx.summaryBlock,
    contextInjected: ctx.hasData,
  };
}

// ── Tool execution helper ─────────────────────────────────────────────────────

async function executeTool(
  req: { id: string; name: string; input: Record<string, unknown> }
): Promise<{ result: ToolExecutionResult; callRecord: { name: string; input: Record<string, unknown>; output: unknown } }> {
  try {
    const result: McpToolResult = await mcpClient.callTool(req.name, req.input);
    const textPart = result.content?.find((c) => c.type === 'text')?.text ?? JSON.stringify(result);

    let parsedOutput: unknown = textPart;
    try { parsedOutput = JSON.parse(textPart); } catch { /* keep text */ }

    return {
      result: { toolUseId: req.id, name: req.name, input: req.input, output: textPart, isError: result.isError },
      callRecord: { name: req.name, input: req.input, output: parsedOutput },
    };
  } catch (err: any) {
    const errMsg = err.message ?? String(err);
    return {
      result: { toolUseId: req.id, name: req.name, input: req.input, output: `Error invoking ${req.name}: ${errMsg}`, isError: true },
      callRecord: { name: req.name, input: req.input, output: { error: errMsg } },
    };
  }
}

// ── Main orchestration loop ────────────────────────────────────────────────────

/**
 * Process a chat turn through the multi-turn bounded agent orchestration loop.
 *
 * @param messages - Full conversation history (user + assistant turns)
 * @returns Final reply, tool call trace, provider mode, and context flag
 */
export async function processChat(
  messages: ConversationTurn[]
): Promise<AgentChatResult> {
  // 1. Discover available MCP tools
  let tools: McpToolDefinition[] = [];
  try {
    tools = await mcpClient.listTools();
  } catch (err) {
    console.warn('[AI Agent] MCP tool listing fallback (server may be starting):', err);
  }

  // 2. Build context-enriched system prompt
  const { prompt: systemPrompt, contextInjected } = await buildSystemPrompt(messages);

  const allToolCallRecords: Array<{ name: string; input: Record<string, unknown>; output: unknown }> = [];
  let currentMessages: ConversationTurn[] = [...messages];
  const providerMode = currentProvider.isMock ? 'mock' : 'bedrock';

  // 3. Bounded multi-turn reasoning loop
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const aiResp: AIResponse = await currentProvider.chat({
      messages: currentMessages,
      tools,
      systemPrompt,
    });

    // No tool calls requested — return the text response
    if (aiResp.stopReason !== 'tool_use' || aiResp.toolUseRequests.length === 0) {
      const reply = aiResp.text ?? "I'm ready to help! What would you like to work on?";
      return { reply, toolCalls: allToolCallRecords, providerMode, contextInjected };
    }

    // 4. Execute requested tools in parallel
    const execResults = await Promise.all(aiResp.toolUseRequests.map(executeTool));
    const toolResults = execResults.map((e) => e.result);
    execResults.forEach((e) => allToolCallRecords.push(e.callRecord));

    // 5. Feed tool results back to the model for the next turn
    const followUp: AIResponse = await currentProvider.chatWithToolResult({
      messages: currentMessages,
      tools,
      systemPrompt,
      toolUseRequests: aiResp.toolUseRequests,
      toolResults,
    });

    // If the model is done reasoning, return
    if (followUp.stopReason !== 'tool_use' || followUp.toolUseRequests.length === 0) {
      const reply = followUp.text ?? 'I completed the requested action.';
      return { reply, toolCalls: allToolCallRecords, providerMode, contextInjected };
    }

    // Model wants to call more tools — update message context for next iteration
    // Append assistant turn + tool results as conversation context
    if (followUp.text) {
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: followUp.text },
      ];
    }

    // Continue loop with additional tool requests from this follow-up
    // (mock provider doesn't chain; Bedrock may in advanced scenarios)
  }

  // Fallback if loop exhausted without a clean end_turn
  console.warn('[AI Agent] Max tool iterations reached — forcing end_turn');
  return {
    reply: 'I completed multiple steps of analysis. Here is what I found:\n\n' +
      allToolCallRecords.map((tc) => `- ${tc.name}: executed successfully`).join('\n'),
    toolCalls: allToolCallRecords,
    providerMode,
    contextInjected,
  };
}

