import { prisma } from '../db.js';
import {
  GROUP_HELP_COMMAND_DEFINITIONS,
  GROUP_HELP_STAFF_PERMISSION_GROUPS
} from './telegram-group-help.commands.js';

export class GroupHelpStaffPermissionError extends Error {}

export function allowedGroupHelpStaffCommands() {
  return new Set<string>(
    GROUP_HELP_STAFF_PERMISSION_GROUPS.flatMap((group) => [...group.commands])
  );
}

export async function groupHelpStaffPermissions(chatId: string, telegramUserId: string) {
  const assignment = await prisma.telegramCommunityRoleAssignment.findFirst({
    where: { chatId, telegramUserId },
    include: { customRole: { select: { permissions: true } } }
  });
  const customPermissions = assignment?.customRole?.permissions;
  const permissions = Array.isArray(customPermissions)
    ? customPermissions.filter((permission): permission is string => typeof permission === 'string')
    : assignment?.role === 'MODERATOR'
      ? GROUP_HELP_COMMAND_DEFINITIONS.filter((definition) =>
          ['HELPER', 'MODERATOR'].includes(definition.minimumRole)
        ).map((definition) => definition.command)
      : assignment?.role === 'HELPER'
        ? GROUP_HELP_COMMAND_DEFINITIONS.filter(
            (definition) => definition.minimumRole === 'HELPER'
          ).map((definition) => definition.command)
        : [];
  return { assignment, permissions, fullAdmin: permissions.includes('*') };
}

export async function saveGroupHelpStaffPermissions(input: {
  mainGroupId: string;
  staffGroupId: string;
  telegramUserId: string;
  permissions: string[];
  fullAdmin?: boolean;
  actorId: string;
}) {
  const staffMember = await prisma.telegramCommunityMember.findFirst({
    where: {
      chatId: input.staffGroupId,
      telegramUserId: input.telegramUserId,
      leftAt: null
    },
    select: { id: true }
  });
  if (!staffMember) {
    throw new GroupHelpStaffPermissionError(
      'This user has not been detected as an active private staff-group member.'
    );
  }
  const allowedCommands = allowedGroupHelpStaffCommands();
  const permissions = input.fullAdmin
    ? ['*']
    : [...new Set(input.permissions.map((permission) => permission.toLowerCase()))];
  if (!input.fullAdmin && permissions.some((permission) => !allowedCommands.has(permission))) {
    throw new GroupHelpStaffPermissionError('One or more selected commands cannot be delegated.');
  }
  const generatedRoleName = `HH staff ${input.telegramUserId}`;
  // Keep an explicit empty role when all toggles are off. It prevents the
  // automatic daily defaults from undoing an administrator's intentional choice.
  const role = await prisma.telegramCommunityCustomRole.upsert({
    where: {
      chatId_name: { chatId: input.mainGroupId, name: generatedRoleName }
    },
    create: {
      chatId: input.mainGroupId,
      name: generatedRoleName,
      permissions,
      createdById: input.actorId
    },
    update: { permissions, createdById: input.actorId }
  });
  await prisma.$transaction([
    prisma.telegramCommunityRoleAssignment.deleteMany({
      where: { chatId: input.mainGroupId, telegramUserId: input.telegramUserId }
    }),
    prisma.telegramCommunityRoleAssignment.create({
      data: {
        chatId: input.mainGroupId,
        telegramUserId: input.telegramUserId,
        role: 'CUSTOM',
        customRoleId: role.id,
        assignedById: input.actorId
      }
    })
  ]);
  return permissions;
}
