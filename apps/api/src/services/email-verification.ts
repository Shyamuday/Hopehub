import type { Request } from 'express';
import { prisma } from '../db.js';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { hashToken, randomToken } from '../utils/helpers.js';
import { isProduction } from './otp.js';
import { getMailTransporter, smtpFrom, supportReplyTo } from './mail.js';
import { recordAuthProcess } from './auth-process-log.js';

const EMAIL_VERIFICATION_TOKEN_TTL_MS =
  Number(process.env.EMAIL_VERIFICATION_TOKEN_TTL_MS || '') || 24 * 60 * 60 * 1000;

export async function createEmailVerificationToken(input: {
  userId: string;
  email: string;
  portal?: 'patient' | 'provider' | 'admin';
  req?: Request;
}) {
  const token = randomToken();
  const email = input.email.trim().toLowerCase();
  await prisma.emailVerificationToken.create({
    data: {
      userId: input.userId,
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS)
    }
  });

  const origin =
    input.portal === 'provider'
      ? SERVER_CONFIG.ORIGINS.DOCTOR
      : input.portal === 'admin'
        ? SERVER_CONFIG.ORIGINS.ADMIN
        : SERVER_CONFIG.ORIGINS.WEB;
  const verifyUrl = `${origin}/auth/verify-email?token=${token}`;
  const mailer = getMailTransporter();

  if (mailer) {
    await mailer.sendMail({
      from: smtpFrom,
      replyTo: supportReplyTo,
      to: email,
      subject: 'Verify your HopeHub email',
      html: `<p>Welcome to HopeHub.</p><p>Please verify your email address:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
    });
  } else if (!isProduction) {
    console.info(`[dev] Email verification for ${email}: ${verifyUrl}`);
  }

  await recordAuthProcess({
    processType: 'email_verification',
    step: 'send',
    status: mailer || !isProduction ? 'success' : 'blocked',
    identifier: email,
    reason: mailer || !isProduction ? undefined : 'email_delivery_not_configured',
    req: input.req,
    metadata: { userId: input.userId, portal: input.portal || 'patient' }
  });

  return { sent: Boolean(mailer), devVerifyUrl: !isProduction && !mailer ? verifyUrl : undefined };
}

export async function verifyEmailToken(token: string, req?: Request) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, emailVerified: true } } }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    await recordAuthProcess({
      processType: 'email_verification',
      step: 'verify',
      status: 'failure',
      identifier: record?.email || 'unknown',
      reason: !record ? 'token_not_found' : record.usedAt ? 'token_used' : 'token_expired',
      req
    });
    return null;
  }

  const user = await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
    select: { id: true, email: true, role: true, emailVerified: true }
  });
  await prisma.emailVerificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() }
  });

  await recordAuthProcess({
    processType: 'email_verification',
    step: 'verify',
    status: 'success',
    identifier: record.email,
    req,
    metadata: { userId: user.id, role: user.role }
  });

  return user;
}
