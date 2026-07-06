import { SERVER_CONFIG } from '../constants/config.constants.js';
import { storeOtpEntry, verifyOtpEntry } from './otp-store.js';

export const devOtp = SERVER_CONFIG.DEV_OTP;
export const isProduction = process.env.NODE_ENV === 'production';

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeOtp(mobile: string, otp: string): Promise<void> {
  await storeOtpEntry(mobile, otp);
}

export async function verifyOtp(mobile: string, otp: string): Promise<boolean> {
  return verifyOtpEntry(mobile, otp);
}

export async function sendOtpSms(mobile: string, otp: string): Promise<void> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
  const twilioSmsFrom = process.env.TWILIO_SMS_FROM || '';

  if (!twilioAccountSid || !twilioAuthToken || !twilioSmsFrom) {
    console.info(`[otp] DEV — OTP for ${mobile}: ${otp}`);
    return;
  }

  const { default: twilio } = await import('twilio');
  const client = twilio(twilioAccountSid, twilioAuthToken);
  const to = mobile.startsWith('+') ? mobile : `+${mobile.replace(/\D/g, '')}`;
  await client.messages.create({
    to,
    from: twilioSmsFrom,
    body: `Your Vitalis Care OTP is: ${otp}. Valid for 10 minutes. Do not share it with anyone.`
  });
}
