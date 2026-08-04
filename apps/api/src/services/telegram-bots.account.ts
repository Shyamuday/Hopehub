import { Prisma, Role, TelegramBotKind } from '@prisma/client';
import { prisma } from '../db.js';
import { createPatientRecord } from './patient-identity.js';
import { getMailTransporter } from './mail.js';
import {
  devOtp,
  generateOtp,
  isProduction,
  sendOtpEmail,
  storeOtp,
  verifyOtpDetailed
} from './otp.js';
import { botNameByKind, roleByKind } from './telegram-bots.config.js';
import { sendTelegramMessage } from './telegram-bots.client.js';
import { menuFor } from './telegram-bots.menus.js';
import { escapeHtml, metadataOf } from './telegram-bots.helpers.js';
import { menuCancelRows } from './telegram-bots.ui.js';
import type { SessionMetadata } from './telegram-bots.types.js';
import { updateSession, type TelegramSession } from './telegram-bots.sessions.js';

export async function replyMenu(kind: TelegramBotKind, session: TelegramSession, text: string) {
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: menuFor(kind, Boolean(session.linkedUserId)) }
  });
}

export async function cancelPending(kind: TelegramBotKind, session: TelegramSession) {
  const updated = await updateSession(session, {
    state: 'ACTIVE',
    metadata: {},
    lastCommand: '/cancel'
  });
  await replyMenu(kind, updated, 'Cancelled. Back to main menu.');
}

export function assertLinkedRole(kind: TelegramBotKind, session: TelegramSession) {
  const expectedRole = roleByKind[kind];
  return Boolean(
    session.linkedUserId &&
    session.linkedUser &&
    session.linkedUser.role === expectedRole &&
    session.linkedUser.isActive
  );
}

export async function requireLinked(kind: TelegramBotKind, session: TelegramSession) {
  if (assertLinkedRole(kind, session)) return true;
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      'Please link your Hope Hub account first.',
      '',
      'Tap Link account, then send your registered email. After OTP arrives, send only the OTP.'
    ].join('\n'),
    reply_markup: {
      inline_keyboard: [
        ...(kind === TelegramBotKind.USER
          ? [[{ text: 'Create account', callback_data: 'common:signup' }]]
          : []),
        [{ text: 'Link account', callback_data: 'common:link' }],
        [{ text: 'Main menu', callback_data: 'common:menu' }]
      ]
    }
  });
  return false;
}

export async function startLink(
  kind: TelegramBotKind,
  session: TelegramSession,
  emailText?: string
) {
  const email = (emailText || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await updateSession(session, { state: 'WAITING_LINK_EMAIL', lastCommand: '/link' });
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Please send your registered Hope Hub email address.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  const expectedRole = roleByKind[kind];
  const user = await prisma.user.findFirst({
    where: { email, role: expectedRole, isActive: true },
    select: { id: true, email: true, name: true, role: true }
  });

  if (!user) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: `No active ${expectedRole.toLowerCase()} account was found for this email.`
    });
    return;
  }

  if (isProduction && !getMailTransporter()) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Email OTP delivery is not configured right now. Please try later.'
    });
    return;
  }

  const otp = isProduction ? generateOtp() : devOtp;
  const otpKey = `telegram:${kind}:${session.id}:${email}`;
  await storeOtp(otpKey, otp);
  if (isProduction) {
    await sendOtpEmail(email, otp);
  } else {
    console.info(`[telegram] DEV OTP for ${email}: ${otp}`);
  }

  const metadata: SessionMetadata = {
    ...metadataOf(session),
    pendingLink: {
      email,
      otpKey,
      role: expectedRole,
      requestedAt: new Date().toISOString()
    }
  };

  await updateSession(session, {
    state: 'LINK_OTP',
    metadata: metadata as Prisma.InputJsonValue,
    lastCommand: '/link'
  });

  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: `OTP sent to ${email}.\nPlease send only the OTP code.`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Resend OTP', callback_data: 'common:resend_otp' },
          { text: 'Change email', callback_data: 'common:link' }
        ],
        ...menuCancelRows()
      ]
    }
  });
}

export async function startSignup(
  kind: TelegramBotKind,
  session: TelegramSession,
  emailText?: string
) {
  if (kind !== TelegramBotKind.USER) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Signup from Telegram is available only in the user care bot. Doctor/admin accounts must be created by admin first.'
    });
    return;
  }

  if (
    session.linkedUserId &&
    session.linkedUser?.role === Role.PATIENT &&
    session.linkedUser.isActive
  ) {
    await replyMenu(kind, session, 'You already have a linked Hope Hub account.');
    return;
  }

  const email = (emailText || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await updateSession(session, { state: 'WAITING_SIGNUP_EMAIL', lastCommand: '/signup' });
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: [
        '<b>Create Hope Hub account</b>',
        'Please send your email address.',
        '',
        'If you already have an account, use Link account instead.'
      ].join('\n'),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'I already have account', callback_data: 'common:link' }],
          ...menuCancelRows()
        ]
      }
    });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { email, role: Role.PATIENT },
    select: { id: true, isActive: true }
  });
  if (existing) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'A Hope Hub user account already exists with this email. Please use Link account and verify by OTP.',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Link account', callback_data: 'common:link' }],
          ...menuCancelRows()
        ]
      }
    });
    return;
  }

  const metadata: SessionMetadata = {
    ...metadataOf(session),
    pendingSignup: { email, requestedAt: new Date().toISOString() }
  };
  await updateSession(session, {
    state: 'WAITING_SIGNUP_NAME',
    metadata: metadata as Prisma.InputJsonValue,
    lastCommand: '/signup'
  });
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: 'Great. Now send your full name.',
    reply_markup: { inline_keyboard: menuCancelRows() }
  });
}

export async function finishSignup(
  kind: TelegramBotKind,
  session: TelegramSession,
  nameText?: string
) {
  if (kind !== TelegramBotKind.USER) return;
  const metadata = metadataOf(session);
  const pending = metadata.pendingSignup;
  const name = (nameText || '').trim().replace(/\s+/g, ' ');

  if (!pending?.email) {
    await startSignup(kind, session);
    return;
  }

  if (name.length < 2) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Please send a name with at least 2 characters.',
      reply_markup: { inline_keyboard: menuCancelRows() }
    });
    return;
  }

  try {
    const user = await createPatientRecord({
      name: name.slice(0, 120),
      email: pending.email
    });
    await prisma.user.update({
      where: { id: user.id },
      data: {
        authProvider: 'TELEGRAM',
        lastLoginAt: new Date(),
        lastLoginMethod: 'TELEGRAM_BOT_SIGNUP'
      }
    });

    const nextMetadata: SessionMetadata = { ...metadata };
    delete nextMetadata.pendingSignup;
    const linkedSession = await updateSession(session, {
      linkedUser: { connect: { id: user.id } },
      state: 'ACTIVE',
      metadata: nextMetadata as Prisma.InputJsonValue,
      lastCommand: '/signup'
    });

    await replyMenu(
      kind,
      linkedSession,
      [
        '<b>Account created and linked.</b>',
        `Name: ${escapeHtml(user.name)}`,
        `Patient ID: ${escapeHtml(user.patientCode || '-')}`,
        '',
        'You can now use daily plan, assessments, support, booking, and payments from Telegram.'
      ].join('\n')
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
      await sendTelegramMessage(kind, {
        chat_id: session.chatId,
        text: 'This email is already registered. Please use Link account instead.',
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Link account', callback_data: 'common:link' }],
            ...menuCancelRows()
          ]
        }
      });
      return;
    }
    throw error;
  }
}

export async function verifyLink(
  kind: TelegramBotKind,
  session: TelegramSession,
  otpText?: string
) {
  const metadata = metadataOf(session);
  const pending = metadata.pendingLink;
  const otp = (otpText || '').trim();
  if (!pending || !otp) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'No pending link request. Send /link your-email@example.com first.'
    });
    return;
  }

  const result = await verifyOtpDetailed(pending.otpKey, otp);
  if (!result.ok) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'Invalid or expired OTP. Send /link your-email@example.com to request a fresh one.'
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: pending.email, role: pending.role, isActive: true },
    select: { id: true, name: true, email: true, role: true }
  });
  if (!user) {
    await sendTelegramMessage(kind, {
      chat_id: session.chatId,
      text: 'The account could not be linked. Please contact support.'
    });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginMethod: `TELEGRAM_${kind}_LINK`
    }
  });

  const nextMetadata: SessionMetadata = { ...metadata };
  delete nextMetadata.pendingLink;
  const linkedSession = await updateSession(session, {
    linkedUser: { connect: { id: user.id } },
    state: 'ACTIVE',
    metadata: nextMetadata as Prisma.InputJsonValue,
    lastCommand: '/verify'
  });

  await replyMenu(
    kind,
    linkedSession,
    `<b>Linked.</b>\n${escapeHtml(user.name)} is now connected to this ${botNameByKind[kind]}.`
  );
}

export async function unlink(kind: TelegramBotKind, session: TelegramSession) {
  const updated = await updateSession(session, {
    linkedUser: { disconnect: true },
    state: 'ACTIVE',
    metadata: {},
    lastCommand: '/unlink'
  });
  await replyMenu(kind, updated, 'Telegram account unlinked.');
}

export async function showMe(kind: TelegramBotKind, session: TelegramSession) {
  if (!session.linkedUser) {
    await requireLinked(kind, session);
    return;
  }
  await sendTelegramMessage(kind, {
    chat_id: session.chatId,
    text: [
      '<b>Linked account</b>',
      `Name: ${escapeHtml(session.linkedUser.name)}`,
      `Role: ${session.linkedUser.role}`,
      `Email: ${escapeHtml(session.linkedUser.email || 'Not added')}`
    ].join('\n'),
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Unlink', callback_data: 'common:unlink' }],
        [{ text: 'Menu', callback_data: 'common:menu' }]
      ]
    }
  });
}
