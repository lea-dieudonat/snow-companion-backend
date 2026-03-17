import Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';
import type { MessageParam, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import prisma from '@/config/prisma';
import { getTools } from '@/tools/index';
import type { AgentMessage } from '@/types/agent.types';

export class AgentService {
  private client: Anthropic;
  private userId: string;
  private res: Response;

  constructor(userId: string, res: Response) {
    this.client = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
    this.userId = userId;
    this.res = res;
  }

  private sendSSE(eventType: string, data: unknown): void {
    this.res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  async chat(messages: AgentMessage[], conversationId?: string): Promise<void> {
    const timeoutMs = parseInt(process.env['AGENT_TIMEOUT_MS'] ?? '30000');
    const timer = setTimeout(() => {
      this.sendSSE('error', { message: "L'agent n'a pas pu répondre dans les temps. Réessaie." });
      this.res.end();
    }, timeoutMs);

    try {
      const [user, profile, recentSessions, existingConv] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: this.userId }, select: { name: true, email: true, favoriteStations: true } }),
        prisma.userProfile.findUnique({ where: { userId: this.userId } }),
        prisma.session.findMany({
          where: { userId: this.userId },
          orderBy: { date: 'desc' },
          take: 50,
          select: { station: true, conditions: true, rating: true, tricks: true },
        }),
        conversationId
          ? prisma.agentConversation.findUnique({ where: { id: conversationId, userId: this.userId } })
          : null,
      ]);

      // Build history from previous conversation (last 20 messages)
      const history: MessageParam[] = existingConv
        ? (existingConv.messages as MessageParam[]).slice(-20)
        : [];

      // Append new user messages
      const incomingMessages: MessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const allMessages: MessageParam[] = [...history, ...incomingMessages];

      const systemPrompt = this.buildSystemPrompt(user, profile, recentSessions);
      const tools = getTools();
      const toolDefinitions = tools.map((t) => t.definition);

      const maxIterations = parseInt(process.env['AGENT_MAX_ITERATIONS'] ?? '5');
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;

        const stream = this.client.messages.stream({
          model: process.env['AGENT_MODEL_SYNTHESIS'] ?? 'claude-sonnet-4-6',
          max_tokens: parseInt(process.env['AGENT_MAX_TOKENS'] ?? '1024'),
          system: systemPrompt,
          tools: toolDefinitions as Anthropic.Tool[],
          messages: allMessages,
        });

        // Stream text tokens to client in real-time
        stream.on('text', (text: string) => {
          this.sendSSE('token', { token: text });
        });

        const response = await stream.finalMessage();

        // End of conversation turn
        if (response.stop_reason === 'end_turn') {
          break;
        }

        // Tool use — execute and loop
        if (response.stop_reason === 'tool_use') {
          const toolUseBlocks = response.content.filter(
            (b): b is ToolUseBlock => b.type === 'tool_use',
          );

          // Emit tool_call events so the frontend can show which tools are being used
          for (const block of toolUseBlocks) {
            this.sendSSE('tool_call', { tool: block.name, input: block.input });
          }

          // Execute all tool calls in parallel
          const toolResults: ToolResultBlockParam[] = await Promise.all(
            toolUseBlocks.map(async (block) => {
              const tool = tools.find((t) => t.definition.name === block.name);
              let result: unknown;

              if (tool) {
                try {
                  result = await tool.execute(block.input as Record<string, unknown>, this.userId);
                } catch (err) {
                  result = { error: err instanceof Error ? err.message : 'Erreur lors de l\'exécution du tool.' };
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

          // Append assistant turn + tool results and continue loop
          allMessages.push({ role: 'assistant', content: response.content });
          allMessages.push({ role: 'user', content: toolResults });
        } else {
          // Unknown stop reason — exit loop
          break;
        }
      }

      // Persist conversation
      const savedConv = await this.saveConversation(conversationId, allMessages);

      clearTimeout(timer);
      this.sendSSE('done', { conversationId: savedConv.id });
      this.res.end();
    } catch (error) {
      clearTimeout(timer);
      this.sendSSE('error', { message: error instanceof Error ? error.message : 'Une erreur est survenue.' });
      this.res.end();
    }
  }

  private buildSystemPrompt(
    user: { name: string | null; email: string; favoriteStations: string[] },
    profile: {
      disciplines: string[];
      primaryDiscipline: string | null;
      rideStyles: string[];
      freestyleLevel: string | null;
      snowPreference: string | null;
      offPiste: boolean;
      level: string | null;
      withChildren: boolean;
      budgetRange: string | null;
    } | null,
    sessions: { station: string; conditions: string | null; rating: number | null; tricks: string[] }[],
  ): string {
    const sessionCount = sessions.length;
    const topStation = this.mostFrequent(sessions.map((s) => s.station));
    const topCondition = this.mostFrequent(sessions.flatMap((s) => (s.conditions ? [s.conditions] : [])));
    const favoriteStations = user.favoriteStations.join(', ') || 'Aucune';
    const name = user.name ?? user.email.split('@')[0];

    return `Tu es Snow Planner, l'assistant IA intégré à Snow Companion.
Tu aides les riders à préparer leurs weekends ski/snowboard en combinant données personnelles, météo en temps réel, et données de stations.

## RÈGLES ABSOLUES
1. Ne jamais formuler de recommandation sans avoir appelé get_weather.
2. Ne jamais inventer des données d'enneigement, météo, ou infrastructure.
3. Se limiter aux 32 stations françaises de la base de données.
4. Pour les activités hors-ski : utiliser uniquement les champs activities et services de la BDD. Ne rien inventer (restaurants, bars, etc.).
5. Si une donnée manque, le dire clairement plutôt qu'approximer.

## PROFIL RIDER
Nom : ${name}
Disciplines : ${profile?.disciplines.join(', ') || 'Non renseigné'} | Principal : ${profile?.primaryDiscipline || 'Non renseigné'}
Styles de ride : ${profile?.rideStyles.join(', ') || 'Non renseigné'}
Niveau freestyle : ${profile?.freestyleLevel || 'Non renseigné'} | Hors-piste : ${profile?.offPiste ? 'Oui' : 'Non'}
Préférence neige : ${profile?.snowPreference || 'Non renseigné'} | Avec enfants : ${profile?.withChildren ? 'Oui' : 'Non'}
Niveau général : ${profile?.level || 'Non renseigné'} | Budget : ${profile?.budgetRange || 'Non renseigné'}
Sessions cette saison : ${sessionCount}
Station la plus fréquentée : ${topStation || 'Aucune'}
Conditions préférées (historique) : ${topCondition || 'Aucune'}
Stations favorites : ${favoriteStations}

## COMPORTEMENT
- Répondre en français, ton enthousiaste mais direct.
- Adapter le vocabulaire : 'park', 'kickers', 'halfpipe' pour snowboarder freestyle ; 'damage', 'poudreuse', 'off-piste' selon le profil.
- Si l'utilisateur mentionne une station, appeler get_weather immédiatement.
- Pour les activités hors-ski : appeler get_station_activities + get_weather.
- Terminer chaque réponse par 1-2 suggestions d'action concrètes.
- Référencer l'historique sessions pour personnaliser ("Tu avais noté...").`;
  }

  private mostFrequent(arr: string[]): string | null {
    if (arr.length === 0) return null;
    const freq = arr.reduce<Record<string, number>>((acc, val) => {
      acc[val] = (acc[val] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(freq).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  }

  private async saveConversation(conversationId: string | undefined, messages: MessageParam[]) {
    // Keep last 40 messages to bound DB storage
    const toSave = messages.slice(-40);

    if (conversationId) {
      return prisma.agentConversation.update({
        where: { id: conversationId, userId: this.userId },
        data: { messages: toSave as unknown[] },
      });
    }

    return prisma.agentConversation.create({
      data: {
        userId: this.userId,
        messages: toSave as unknown[],
      },
    });
  }
}
