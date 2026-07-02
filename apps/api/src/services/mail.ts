import nodemailer from 'nodemailer';
import { SERVER_CONFIG } from '../constants/config.constants.js';

const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT || SERVER_CONFIG.SMTP.DEFAULT_PORT);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';

export const smtpFrom = process.env.SMTP_FROM || SERVER_CONFIG.SMTP.DEFAULT_FROM;

export function getMailTransporter() {
  if (!smtpHost || !smtpUser || !smtpPass) return null;

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
}
