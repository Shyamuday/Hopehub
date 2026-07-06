import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import { getBotReply, GREETING, BOT_NAME } from '../services/chatbot.service.js';

export const chatRouter = Router();

/** Start a new chat session — returns session ID + first bot greeting. */
chatRouter.post(
  '/chat/start',
  asyncRoute(async (req, res) => {
    const { userId } = z.object({ userId: z.string().optional() }).parse(req.body);

    const session = await prisma.chatSession.create({
      data: { userId: userId || null, botStage: 0 }
    });

    const greeting = await prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'bot', content: GREETING }
    });

    res.status(201).json({
      sessionId: session.id,
      messages: [{ id: greeting.id, role: 'bot', content: greeting.content, createdAt: greeting.createdAt }],
      botName: BOT_NAME
    });
  })
);

/** Fetch all messages for a session. */
chatRouter.get(
  '/chat/:sessionId',
  asyncRoute(async (req, res) => {
    const sessionId = routeParam(req, 'sessionId');
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    res.json({ session: { id: session.id, status: session.status, botStage: session.botStage }, messages: session.messages });
  })
);

/** Send a user message — returns bot reply. */
chatRouter.post(
  '/chat/:sessionId/message',
  asyncRoute(async (req, res) => {
    const sessionId = routeParam(req, 'sessionId');
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    // Save user message
    const userMsg = await prisma.chatMessage.create({ data: { sessionId, role: 'user', content } });

    // Capture concern from first user message
    const concern = session.concern ?? (session.botStage === 0 ? content.slice(0, 200) : undefined);

    // Get bot response
    const reply = getBotReply(session.botStage, content);

    // Save bot reply
    const botMsg = await prisma.chatMessage.create({ data: { sessionId, role: 'bot', content: reply.message } });

    // Update session state
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        botStage: reply.nextStage,
        status: reply.needsOperator ? 'NEEDS_OPERATOR' : session.status,
        concern: concern ?? session.concern,
        visitorName: reply.capturedName ?? session.visitorName,
        visitorPhone: reply.capturedPhone ?? session.visitorPhone
      }
    });

    res.json({
      userMessage: { id: userMsg.id, role: 'user', content: userMsg.content, createdAt: userMsg.createdAt },
      botMessage: {
        id: botMsg.id,
        role: 'bot',
        content: botMsg.content,
        createdAt: botMsg.createdAt,
        showBookButton: reply.showBookButton,
        showWhatsAppButton: reply.showWhatsAppButton
      }
    });
  })
);
