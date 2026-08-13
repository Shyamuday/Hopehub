import { CareTeamMemberType, CredentialVerificationStatus, Prisma } from '@prisma/client';
import {
  PROVIDER_ROLE_CODES,
  PROVIDER_ROLE_DEFINITIONS,
  type ProviderRoleCode
} from '@hopehub/contracts';
import { prisma } from '../db.js';

const CACHE_TTL_MS = 60_000;
let cachedActiveRoles: { expiresAt: number; value: Awaited<ReturnType<typeof loadRoles>> } | null =
  null;

async function loadRoles(includeInactive = false) {
  return prisma.providerRoleDefinition.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
  });
}

export async function listProviderRoles(includeInactive = false) {
  if (includeInactive) return loadRoles(true);
  if (cachedActiveRoles && cachedActiveRoles.expiresAt > Date.now()) return cachedActiveRoles.value;
  const value = await loadRoles(false);
  cachedActiveRoles = { expiresAt: Date.now() + CACHE_TTL_MS, value };
  return value;
}

export function invalidateProviderRoleCache() {
  cachedActiveRoles = null;
}

export async function providerTaxonomyPayload(includeInactive = false) {
  const roles = await listProviderRoles(includeInactive);
  return {
    domains: ['HOMEOPATHY', 'HOPE_HUB'],
    roles,
    roleGroups: roles.reduce<Record<string, string[]>>((groups, role) => {
      (groups[role.category] ??= []).push(role.code);
      return groups;
    }, {}),
    legacy: {
      hopeHubDoctorType: 'PSYCHOLOGIST',
      primaryRoleField: 'careTeamType',
      rolesField: 'careTeamTypes'
    }
  };
}

function legacyRoleCodes(roleCodes: readonly string[]): CareTeamMemberType[] {
  return roleCodes.filter((role): role is CareTeamMemberType =>
    Object.values(CareTeamMemberType).includes(role as CareTeamMemberType)
  );
}

export async function syncProviderRoleAssignments(input: {
  doctorId: string;
  roleCodes: readonly string[];
  primaryRoleCode: string;
  actorId?: string;
}) {
  const roleCodes = Array.from(new Set(input.roleCodes));
  if (!roleCodes.includes(input.primaryRoleCode)) roleCodes.unshift(input.primaryRoleCode);
  const definitions = await prisma.providerRoleDefinition.findMany({
    where: { code: { in: roleCodes }, isActive: true }
  });
  const found = new Set(definitions.map((role) => role.code));
  const invalid = roleCodes.filter((code) => !found.has(code));
  if (invalid.length) throw new Error(`Unknown or inactive provider role: ${invalid.join(', ')}`);
  const before = await prisma.providerRoleAssignment.findMany({
    where: { doctorId: input.doctorId, status: 'ACTIVE' },
    select: { roleCode: true, isPrimary: true },
    orderBy: { roleCode: 'asc' }
  });

  await prisma.$transaction(async (tx) => {
    await tx.providerRoleAssignment.updateMany({
      where: { doctorId: input.doctorId },
      data: { isPrimary: false }
    });
    await tx.providerRoleAssignment.updateMany({
      where: { doctorId: input.doctorId, roleCode: { notIn: roleCodes } },
      data: { status: 'INACTIVE', isPrimary: false }
    });
    for (const definition of definitions) {
      await tx.providerRoleAssignment.upsert({
        where: { doctorId_roleCode: { doctorId: input.doctorId, roleCode: definition.code } },
        create: {
          doctorId: input.doctorId,
          roleCode: definition.code,
          status: 'ACTIVE',
          isPrimary: definition.code === input.primaryRoleCode,
          assignedById: input.actorId,
          credentialStatus: definition.requiresCredentials
            ? CredentialVerificationStatus.PENDING
            : CredentialVerificationStatus.NOT_REQUIRED
        },
        update: {
          status: 'ACTIVE',
          isPrimary: definition.code === input.primaryRoleCode,
          assignedById: input.actorId
        }
      });
    }

    const legacyRoles = legacyRoleCodes(roleCodes);
    const legacyPrimary = legacyRoleCodes([input.primaryRoleCode])[0];
    if (legacyPrimary) {
      await tx.mentalHealthProviderProfile.updateMany({
        where: { doctorId: input.doctorId },
        data: { careTeamType: legacyPrimary, careTeamTypes: legacyRoles }
      });
    }
    await tx.doctor.update({
      where: { id: input.doctorId },
      data: { providerDomain: 'HOPE_HUB' }
    });
    const previous = JSON.stringify(before);
    const next = JSON.stringify(
      roleCodes
        .slice()
        .sort()
        .map((roleCode) => ({
          roleCode,
          isPrimary: roleCode === input.primaryRoleCode
        }))
    );
    if (previous !== next) {
      await tx.auditLog.create({
        data: {
          actorId: input.actorId || null,
          action: 'provider_role.self_assign',
          targetType: 'Doctor',
          targetId: input.doctorId,
          summary: `Provider roles updated; primary role is ${input.primaryRoleCode}.`,
          metadata: { before, roleCodes, primaryRoleCode: input.primaryRoleCode }
        }
      });
    }
  });
}

export async function assertServiceRolesAssigned(doctorId: string, roleCodes: readonly string[]) {
  const requested = Array.from(new Set(roleCodes.filter(Boolean)));
  if (!requested.length) throw new Error('Every service must have a provider role.');
  const assignments = await prisma.providerRoleAssignment.findMany({
    where: {
      doctorId,
      roleCode: { in: requested },
      status: 'ACTIVE',
      role: { isActive: true }
    },
    select: { roleCode: true }
  });
  const assigned = new Set(assignments.map((item) => item.roleCode));
  const invalid = requested.filter((code) => !assigned.has(code));
  if (invalid.length)
    throw new Error(`Service role is not assigned to this provider: ${invalid.join(', ')}`);
}

export async function providerRoleSnapshot(
  roleCode?: string | null
): Promise<Prisma.InputJsonValue | undefined> {
  if (!roleCode) return undefined;
  const role = await prisma.providerRoleDefinition.findUnique({ where: { code: roleCode } });
  if (!role) return undefined;
  return {
    code: role.code,
    label: role.label,
    category: role.category,
    scope: role.scope,
    isClinicalCare: role.isClinicalCare,
    supportedModes: role.supportedModes,
    version: role.version
  };
}

/** Seeds development/test databases that predate the taxonomy migration. */
export async function seedProviderRoleDefinitions() {
  for (const [index, code] of PROVIDER_ROLE_CODES.entries()) {
    const role = PROVIDER_ROLE_DEFINITIONS[code as ProviderRoleCode];
    await prisma.providerRoleDefinition.upsert({
      where: { code },
      create: {
        ...role,
        bestFor: [...role.bestFor],
        notFor: [...role.notFor],
        sortOrder: (index + 1) * 10
      },
      update: {}
    });
  }
  invalidateProviderRoleCache();
}
