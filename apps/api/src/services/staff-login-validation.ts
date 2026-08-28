import { z } from 'zod';

/**
 * Login validates only that a password was supplied. Password strength belongs
 * to enrollment and reset flows; enforcing today's minimum here would lock out
 * accounts created under an older password policy.
 */
export const staffPasswordLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});
