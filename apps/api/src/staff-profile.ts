import { Role } from '@prisma/client';
import { prisma } from './db.js';
import type { StaffProfileSummary } from './permission-capabilities.js';
import { STAFF_ASSIGNABLE_ROLES } from './staff-permissions.js';

const staffProfileSelect = {
  isSuperAdmin: true,
  permissionCodes: true
} as const;

export async function loadStaffProfileForUser(
  userId: string,
  role: Role
): Promise<StaffProfileSummary | null | undefined> {
  if (!STAFF_ASSIGNABLE_ROLES.includes(role)) {
    return undefined;
  }

  const row = await prisma.staffProfile.findUnique({
    where: { userId },
    select: staffProfileSelect
  });

  return row ?? null;
}

export async function attachStaffProfile<T extends { id: string; role: Role }>(
  user: T
): Promise<T & { staffProfile?: StaffProfileSummary | null }> {
  const staffProfile = await loadStaffProfileForUser(user.id, user.role);
  if (staffProfile === undefined) {
    return user;
  }
  return { ...user, staffProfile };
}
