import type { Response } from 'express';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import prisma from '@/config/prisma';
import type { Prisma } from '@prisma/client';
import { env } from '@/config/env';
import { getTools } from '@/tools/index';
import { buildSystemPrompt } from './agent-system-prompt';
import { runAgenticLoop } from './agent-loop';
import type { AgentMessage } from '@/types/agent.types';

const { user: userDb, userProfile, agentConversation, session } = prisma;

function sendSSE(res: Response, eventType: string, data: unknown): void {
  res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function chatAgent(
  userId: string,
  res: Response,
  messages: AgentMessage[],
  conversationId?: string,
): Promise<void> {
  const timeoutMs = env.agentTimeoutMs;
  let responded = false;

  function end(eventType: string, data: unknown): void {
    if (responded) return;
    responded = true;
    sendSSE(res, eventType, data);
    res.end();
  }

  const timer = setTimeout(() => {
    end('error', { message: "L'agent n'a pas pu répondre dans les temps. Réessaie." });
  }, timeoutMs);

  try {
    const [user, profile, recentSessions, existingConv] = await Promise.all([
      userDb.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true, email: true, favoriteStations: true },
      }),
      userProfile.findUnique({ where: { userId } }),
      session.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 50,
        select: { station: true, conditions: true, rating: true, tricks: true },
      }),
      conversationId
        ? agentConversation.findUnique({ where: { id: conversationId, userId } })
        : null,
    ]);

    const history: MessageParam[] = existingConv
      ? (existingConv.messages as unknown as MessageParam[]).slice(-20)
      : [];

    const allMessages: MessageParam[] = [
      ...history,
      ...messages.map((m) => ({ role: m.role, content: m.content }) satisfies MessageParam),
    ];

    await runAgenticLoop({
      messages: allMessages,
      systemPrompt: buildSystemPrompt(user, profile, recentSessions),
      tools: getTools(),
      maxIterations: env.agentMaxIterations,
      userId,
      onText: (token) => sendSSE(res, 'token', { token }),
      onToolCall: (tool, input) => sendSSE(res, 'tool_call', { tool, input }),
    });

    const savedConv = await saveConversation(userId, conversationId, allMessages);

    clearTimeout(timer);
    end('done', { conversationId: savedConv.id });
  } catch (error) {
    clearTimeout(timer);
    end('error', {
      message: error instanceof Error ? error.message : 'Une erreur est survenue.',
    });
  }
}

async function saveConversation(
  userId: string,
  conversationId: string | undefined,
  messages: MessageParam[],
) {
  const toSave = messages.slice(-40);

  if (conversationId) {
    return agentConversation.update({
      where: { id: conversationId, userId },
      data: { messages: toSave as unknown as Prisma.InputJsonValue },
    });
  }

  return agentConversation.create({
    data: { userId, messages: toSave as unknown as Prisma.InputJsonValue },
  });
}
