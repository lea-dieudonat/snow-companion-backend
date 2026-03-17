import Anthropic from '@anthropic-ai/sdk';
import type {
  MessageParam,
  ToolUseBlock,
  ToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/messages';
import anthropic from '@/config/anthropic';
import { env } from '@/config/env';
import type { AgentTool } from '@/types/agent.types';

interface AgentLoopOptions {
  messages: MessageParam[];
  systemPrompt: string;
  tools: AgentTool[];
  maxIterations: number;
  onText: (token: string) => void;
  onToolCall: (tool: string, input: Record<string, unknown>) => void;
  userId: string;
}

export async function runAgenticLoop({
  messages,
  systemPrompt,
  tools,
  maxIterations,
  onText,
  onToolCall,
  userId,
}: AgentLoopOptions): Promise<MessageParam[]> {
  const allMessages = [...messages];
  const toolDefinitions = tools.map((t) => t.definition);
  let iteration = 0;
  let toolsUsed = false;

  while (iteration < maxIterations) {
    iteration++;

    const model = toolsUsed ? env.agentModelSynthesis : env.agentModelTools;

    const stream = anthropic.messages.stream({
      model,
      max_tokens: env.agentMaxTokens,
      system: systemPrompt,
      tools: toolDefinitions as Anthropic.Tool[],
      messages: allMessages,
    });

    stream.on('text', onText);

    const response = await stream.finalMessage();

    if (response.stop_reason === 'end_turn') {
      allMessages.push({ role: 'assistant', content: response.content });
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is ToolUseBlock => b.type === 'tool_use',
      );

      for (const block of toolUseBlocks) {
        onToolCall(block.name, block.input as Record<string, unknown>);
      }

      const toolResults: ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block) => {
          const tool = tools.find((t) => t.definition.name === block.name);
          let result: unknown;

          if (tool) {
            try {
              result = await tool.execute(block.input as Record<string, unknown>, userId);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : "Erreur lors de l'exécution du tool." };
            }
          } else {
            result = { error: `Tool "${block.name}" inconnu.` };
          }

          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        }),
      );

      allMessages.push({ role: 'assistant', content: response.content });
      allMessages.push({ role: 'user', content: toolResults });
      toolsUsed = true;
    } else {
      break;
    }
  }

  return allMessages;
}
