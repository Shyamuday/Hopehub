export const INDIA_CALLING_CODE = '+91';

export function indianMobileE164(value: string | null | undefined): string | null {
  const digits = String(value || '').replace(/\D/g, '');
  const nationalNumber = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

  return /^[6-9]\d{9}$/.test(nationalNumber) ? `${INDIA_CALLING_CODE}${nationalNumber}` : null;
}

export function indianMobileDisplay(value: string | null | undefined): string {
  const digits = String(value || '').replace(/\D/g, '');
  const nationalNumber = digits.startsWith('91') ? digits.slice(2, 12) : digits.slice(0, 10);
  return `${INDIA_CALLING_CODE} ${nationalNumber}`;
}
