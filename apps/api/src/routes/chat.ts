import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authOptional } from '../auth.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import {
  getBotReply,
  getGreetingReply,
  getPendingOptions,
  BOT_NAME
} from '../services/chatbot.service.js';
import { syncLeadFromChatSession } from '../services/website-leads.service.js';

export const chatRouter = Router();

type BotExtras = {
  options?: string[];
  showBookButton?: boolean;
  showWhatsAppButton?: boolean;
  allowFreeText?: boolean;
};

function botMessagePayload(
  msg: { id: string; role: string; content: string; createdAt: Date; options?: string[] },
  extras: BotExtras = {}
) {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.createdAt,
    options: msg.options?.length ? msg.options : extras.options,
    showBookButton: extras.showBookButton,
    showWhatsAppButton: extras.showWhatsAppButton,
    allowFreeText: extras.allowFreeText ?? true
  };
}

function userLinkData(user: Express.Request['user']) {
  if (!user) return {};
  return {
    userId: user.id,
    visitorName: user.name,
    visitorEmail: user.email ?? null,
    visitorPhone: user.mobile ?? null
  };
}

async function maybeLinkSessionToUser(sessionId: string, user: Express.Request['user']) {
  if (!user) return;
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId }, select: { userId: true } });
  if (!session || session.userId) return;
  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: userLinkData(user)
  });
  void syncLeadFromChatSession(updated);
}

/** Start a new chat session — stored for all visitors (logged in or anonymous). */
chatRouter.post(
  '/chat/start',
  authOptional,
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        visitorKey: z.string().min(8).max(80).optional(),
        entryPage: z.string().max(500).optional()
      })
      .parse(req.body);

    const greetingReply = getGreetingReply();
    const linked = userLinkData(req.user);

    const session = await prisma.chatSession.create({
      data: {
        botStage: 0,
        visitorKey: body.visitorKey ?? null,
        entryPage: body.entryPage ?? null,
        ...linked
      }
    });

    const greeting = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'bot',
        content: greetingReply.message,
        options: greetingReply.options ?? []
      }
    });

    void syncLeadFromChatSession(session);

    res.status(201).json({
      sessionId: session.id,
      isLoggedIn: Boolean(req.user),
      messages: [
        botMessagePayload(greeting, {
          options: greetingReply.options,
          allowFreeText: greetingReply.allowFreeText
        })
      ],
      botName: BOT_NAME,
      activeOptions: greetingReply.options ?? []
    });
  })
);

/** Link an anonymous session to the logged-in patient (after login). */
chatRouter.patch(
  '/chat/:sessionId/link',
  authOptional,
  asyncRoute(async (req, res) => {
    const sessionId = routeParam(req, 'sessionId');
    if (!req.user) return res.status(401).json({ message: 'Login required to link chat.' });

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    const updated = await prisma.chatSession.update({
      where: { id: sessionId },
      data: userLinkData(req.user)
    });

    void syncLeadFromChatSession(updated);

    res.json({ session: updated, message: 'Chat linked to your account.' });
  })
);

/** Fetch all messages for a session. */
chatRouter.get(
  '/chat/:sessionId',
  authOptional,
  asyncRoute(async (req, res) => {
    const sessionId = routeParam(req, 'sessionId');
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    await maybeLinkSessionToUser(sessionId, req.user);

    const messages = session.messages.map((m) => botMessagePayload(m));
    const pending = session.status === 'ACTIVE' ? getPendingOptions(session.botStage) : undefined;

    res.json({
      session: {
        id: session.id,
        status: session.status,
        botStage: session.botStage,
        userId: session.userId,
        visitorKey: session.visitorKey
      },
      messages,
      activeOptions: pending,
      isLoggedIn: Boolean(req.user)
    });
  })
);

/** Send a user message — every message is stored in the database. */
chatRouter.post(
  '/chat/:sessionId/message',
  authOptional,
  asyncRoute(async (req, res) => {
    const sessionId = routeParam(req, 'sessionId');
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body);

    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ message: 'Session not found.' });

    await maybeLinkSessionToUser(sessionId, req.user);

    const userMsg = await prisma.chatMessage.create({ data: { sessionId, role: 'user', content } });

    const reply = getBotReply(session.botStage, content);
    const intent =
      session.botStage === 0 ? (reply.capturedIntent ?? content.slice(0, 200)) : undefined;
    const concern = intent ?? session.concern ?? (session.botStage === 10 ? content.slice(0, 200) : undefined);

    const botMsg = await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'bot',
        content: reply.message,
        options: reply.options ?? []
      }
    });

    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        botStage: reply.nextStage,
        status: reply.needsOperator ? 'NEEDS_OPERATOR' : session.status,
        concern: concern ?? session.concern,
        visitorName: reply.capturedName ?? session.visitorName,
        visitorPhone: reply.capturedPhone ?? session.visitorPhone,
        preferredCallbackTime: reply.capturedCallbackTime ?? session.preferredCallbackTime,
        ...(!session.userId && req.user ? userLinkData(req.user) : {})
      }
    });

    void syncLeadFromChatSession(updatedSession);

    res.json({
      userMessage: { id: userMsg.id, role: 'user', content: userMsg.content, createdAt: userMsg.createdAt },
      botMessage: botMessagePayload(botMsg, {
        options: reply.options,
        showBookButton: reply.showBookButton,
        showWhatsAppButton: reply.showWhatsAppButton,
        allowFreeText: reply.allowFreeText
      }),
      activeOptions: reply.options ?? []
    });
  })
);
