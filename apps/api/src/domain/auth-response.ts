import { Role } from '@prisma/client';
import type { AuthUser } from '../auth.js';
import { signToken } from '../auth.js';

export function toAuthResponse(user: {
  id: string;
  name: string;
  role: Role;
  email?: string | null;
  mobile?: string | null;
  staffProfile?: AuthUser['staffProfile'];
}) {
  const core = {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    mobile: user.mobile
  };
  const token = signToken({ ...core, staffProfile: undefined });
  if (user.role === Role.ADMIN) {
    return {
      token,
      user: { ...core, staffProfile: user.staffProfile ?? null }
    };
  }
  return { token, user: core };
}
