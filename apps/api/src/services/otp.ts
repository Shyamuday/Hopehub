import { SERVER_CONFIG } from '../constants/config.constants.js';
import { getMailTransporter, smtpFrom } from './mail.js';
import { storeOtpEntry, verifyOtpEntry } from './otp-store.js';

export const devOtp = SERVER_CONFIG.DEV_OTP;
export const isProduction = process.env.NODE_ENV === 'production';

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeOtp(identifier: string, otp: string): Promise<void> {
  await storeOtpEntry(identifier, otp);
}

export async function verifyOtp(identifier: string, otp: string): Promise<boolean> {
  return verifyOtpEntry(identifier, otp);
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const mailer = getMailTransporter();
  if (!mailer) {
    if (isProduction) {
      throw new Error('Email delivery is not configured.');
    }
    console.info(`[otp] DEV — Email OTP for ${email}: ${otp}`);
    return;
  }

  await mailer.sendMail({
    from: smtpFrom,
    to: email,
    subject: 'Your Vitalis Care login OTP',
    html: `<p>Your Vitalis Care OTP is <strong>${otp}</strong>.</p>
           <p>It is valid for 10 minutes. Do not share it with anyone.</p>`
  });
}
