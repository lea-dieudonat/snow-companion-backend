import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '@/middlewares/auth';
import { ChatRequestSchema } from '@/schemas/agent.schema';
import { chatAgent } from '@/services/agent.service';

export const chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req as AuthRequest;
    const { messages, conversationId } = ChatRequestSchema.parse(req.body);

    // SSE headers — must be set before any processing
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    await chatAgent(userId, res, messages, conversationId);
  } catch (error) {
    next(error);
  }
};
