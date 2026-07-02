import { SERVER_CONFIG } from '../constants/config.constants.js';

export const devOtp = SERVER_CONFIG.DEV_OTP;
export const isProduction = process.env.NODE_ENV === 'production';

// In-memory OTP store: mobile → { otp, expiresAt }
// For multi-instance deployments replace with Redis.
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeOtp(mobile: string, otp: string): void {
  otpStore.set(mobile, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min TTL
}

export function verifyOtp(mobile: string, otp: string): boolean {
  const entry = otpStore.get(mobile);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(mobile);
    return false;
  }
  if (entry.otp !== otp) return false;
  otpStore.delete(mobile); // single-use
  return true;
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
