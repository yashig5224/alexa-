import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';
import type { AIProvider, AIResponse, ToolUseRequest } from './interface.js';
import type { McpToolDefinition } from '@trackmate/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Amazon Bedrock AI Provider
// Uses the Converse API for tool-use (function calling)
// ─────────────────────────────────────────────────────────────────────────────

export class BedrockProvider implements AIProvider {
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor() {
    this.client = new BedrockRuntimeClient({
      region: process.env['AWS_REGION'] ?? 'us-east-1',
    });
    this.modelId = process.env['BEDROCK_MODEL_ID'] ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  }

  async chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tools: McpToolDefinition[];
    systemPrompt: string;
  }): Promise<AIResponse> {
    // Convert MCP tool definitions to Bedrock Tool format
    const bedrockTools: Tool[] = params.tools.map(t => ({
      toolSpec: {
        name: t.name,
        description: t.description,
        inputSchema: {
          json: t.inputSchema,
        },
      },
    }));

    // Convert conversation history to Bedrock Message format
    const bedrockMessages: Message[] = params.messages.map(m => ({
      role: m.role,
      content: [{ text: m.content }],
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
        temperature: 0.1,
      },
    });

    const response = await this.client.send(command);

    const toolUseRequests: ToolUseRequest[] = [];
    let text: string | null = null;

    for (const block of response.output?.message?.content ?? []) {
      if (block.text) {
        text = block.text;
      }
      if (block.toolUse) {
        toolUseRequests.push({
          name: block.toolUse.name!,
          id:   block.toolUse.toolUseId!,
          input: (block.toolUse.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    return {
      text,
      toolUseRequests,
      stopReason: response.stopReason ?? 'end_turn',
    };
  }
}
