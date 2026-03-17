export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AgentTool {
  definition: AgentToolDefinition;
  execute: (input: Record<string, unknown>, userId: string) => Promise<unknown>;
}

export interface ToolCallSSEEvent {
  type: 'tool_call';
  tool: string;
  input?: Record<string, unknown>;
}

export interface TokenSSEEvent {
  type: 'token';
  token: string;
}

export interface DoneSSEEvent {
  type: 'done';
  conversationId: string;
}

export interface ErrorSSEEvent {
  type: 'error';
  message: string;
}

export type AgentSSEEvent = ToolCallSSEEvent | TokenSSEEvent | DoneSSEEvent | ErrorSSEEvent;
