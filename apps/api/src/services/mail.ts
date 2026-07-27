import nodemailer from 'nodemailer';
import { SERVER_CONFIG } from '../constants/config.constants.js';

const smtpHost = process.env.AWS_SES_SMTP_HOST || '';
const smtpPort = Number(process.env.AWS_SES_SMTP_PORT || SERVER_CONFIG.SMTP.DEFAULT_PORT);
const smtpUser = process.env.AWS_SES_SMTP_USERNAME || '';
const smtpPass = process.env.AWS_SES_SMTP_PASSWORD || '';

export const smtpFrom = process.env.SMTP_FROM || SERVER_CONFIG.SMTP.DEFAULT_FROM;

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export function getMailTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) return null;

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
}

export function isEmailConfigured() {
  return Boolean(smtpHost && smtpUser && smtpPass && smtpFrom);
}

export function getEmailConfigStatus() {
  return {
    configured: isEmailConfigured(),
    provider: smtpHost.includes('amazonaws.com') ? 'AWS_SES_SMTP' : smtpHost ? 'SMTP' : 'NONE',
    host: smtpHost || null,
    port: smtpPort,
    from: smtpFrom
  };
}

export async function verifyEmailTransport(): Promise<boolean> {
  const mailer = getMailTransporter();
  if (!mailer) return false;
  await mailer.verify();
  return true;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const mailer = getMailTransporter();
  if (!mailer) {
    throw new Error('Email delivery is not configured.');
  }

  await mailer.sendMail({
    from: smtpFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo
  });
}
