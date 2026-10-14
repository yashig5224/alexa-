import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import type {
  AIProvider,
  AIResponse,
  ToolUseRequest,
  ToolExecutionResult,
  ConversationTurn,
} from './interface.js';
import type { McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Amazon Bedrock AI Provider
// Uses Amazon Bedrock Converse API for tool-calling and reasoning
// ─────────────────────────────────────────────────────────────────────────────

export class BedrockProvider implements AIProvider {
  readonly name = 'Amazon Bedrock';
  readonly isMock = false;
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor() {
    const region = process.env['AWS_REGION'] ?? 'us-east-1';
    const accessKeyId = process.env['AWS_ACCESS_KEY_ID'];
    const secretAccessKey = process.env['AWS_SECRET_ACCESS_KEY'];

    const clientConfig: Record<string, any> = { region };
    if (accessKeyId && secretAccessKey) {
      clientConfig['credentials'] = { accessKeyId, secretAccessKey };
    }

    this.client = new BedrockRuntimeClient(clientConfig);
    this.modelId = process.env['BEDROCK_MODEL_ID'] ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  }

  /**
   * Initial chat turn: Ask Bedrock whether a tool call is required or if it can answer directly.
   */
  async chat(params: {
    messages: ConversationTurn[];
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse> {
    // Map MCP tool definitions into Bedrock Converse API tool specifications
    const bedrockTools: Tool[] = params.tools.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: {
          json: t.inputSchema as any,
        },
      },
    }));

    // Convert conversation history into Bedrock message format
    const bedrockMessages: Message[] = params.messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }] as ContentBlock[],
    }));

    const command = new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: params.systemPrompt }],
      messages: bedrockMessages,
      toolConfig: {
        tools: bedrockTools,
        toolChoice: { auto: {} },
      },
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.2,
      },
    });

    const response = await this.client.send(command);

    const toolUseRequests: ToolUseRequest[] = [];
    let text = '';

    for (const block of response.output?.message?.content ?? []) {
      if (block.text) {
        text += block.text;
      }
      if (block.toolUse) {
        toolUseRequests.push({
          id:    block.toolUse.toolUseId ?? `bedrock-${Date.now()}`,
          name:  block.toolUse.name ?? '',
          input: (block.toolUse.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    return {
      text: text.trim().length > 0 ? text : null,
      toolUseRequests,
      stopReason: response.stopReason ?? (toolUseRequests.length > 0 ? 'tool_use' : 'end_turn'),
    };
  }

  /**
   * Follow-up turn: Return MCP tool results back to Bedrock to synthesize the final natural-language response.
   */
  async chatWithToolResult(params: {
    messages: ConversationTurn[];
    tools: McpToolDefinition[];
    systemPrompt: string;
    toolUseRequests: ToolUseRequest[];
    toolResults: ToolExecutionResult[];
  }): Promise<AIResponse> {
    const bedrockMessages: Message[] = params.messages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }] as ContentBlock[],
    }));

    // Reconstruct the assistant's previous tool-use message
    const assistantContent: ContentBlock[] = params.toolUseRequests.map((req) => ({
      toolUse: {
        toolUseId: req.id,
        name: req.name,
        input: req.input,
      },
    })) as unknown as ContentBlock[];

    const assistantMessage: Message = {
      role: 'assistant',
      content: assistantContent,
    };

    // Construct the user message carrying the tool execution results
    const toolResultBlocks: ContentBlock[] = params.toolResults.map((r) => ({
      toolResult: {
        toolUseId: r.toolUseId,
        content: [{ text: r.output }],
        status: r.isError ? 'error' : 'success',
      },
    })) as unknown as ContentBlock[];

    const toolResultMessage: Message = {
      role: 'user',
      content: toolResultBlocks,
    };

    const bedrockTools: Tool[] = params.tools.map((t) => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: {
          json: t.inputSchema as any,
        },
      },
    }));

    const command = new ConverseCommand({
      modelId: this.modelId,
      system: [{ text: params.systemPrompt }],
      messages: [...bedrockMessages, assistantMessage, toolResultMessage],
      toolConfig: {
        tools: bedrockTools,
        toolChoice: { auto: {} },
      },
      inferenceConfig: {
        maxTokens: 4096,
        temperature: 0.2,
      },
    });

    const response = await this.client.send(command);

    let text = '';
    for (const block of response.output?.message?.content ?? []) {
      if (block.text) {
        text += block.text;
      }
    }

    return {
      text: text.trim(),
      toolUseRequests: [],
      stopReason: response.stopReason ?? 'end_turn',
    };
  }
}
