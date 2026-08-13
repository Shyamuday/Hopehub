import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PROVIDER_ROLE_CODES,
  PROVIDER_ROLE_DEFINITIONS,
  PROVIDER_SESSION_MODE_DEFINITIONS,
  PROVIDER_SESSION_MODES,
  normalizeProviderRoles,
  providerClassificationFromAssignments,
  providerClassificationFromLegacy,
  providerHasRoleCategory,
  providerSessionModeFromValue,
  providerSessionModeMatchesText
} from '@hopehub/contracts';

test('session modes have one canonical API and UI definition', () => {
  assert.deepEqual(PROVIDER_SESSION_MODES, ['CHAT', 'VOICE', 'VIDEO']);
  assert.equal(providerSessionModeFromValue('online_audio'), 'VOICE');
  assert.equal(providerSessionModeFromValue('chat'), 'CHAT');
  assert.equal(providerSessionModeFromValue('VIDEO'), 'VIDEO');
  assert.equal(providerSessionModeMatchesText('VOICE', 'Video call'), false);
  for (const mode of PROVIDER_SESSION_MODES) {
    assert.equal(PROVIDER_SESSION_MODE_DEFINITIONS[mode].code, mode);
    assert.ok(PROVIDER_SESSION_MODE_DEFINITIONS[mode].label);
  }
});

test('every provider role has one complete canonical definition', () => {
  assert.equal(new Set(PROVIDER_ROLE_CODES).size, PROVIDER_ROLE_CODES.length);
  for (const code of PROVIDER_ROLE_CODES) {
    const definition = PROVIDER_ROLE_DEFINITIONS[code];
    assert.equal(definition.code, code);
    assert.ok(definition.label.length > 2);
    assert.ok(definition.description.length > 10);
    assert.ok(definition.scope.length > 10);
  }
});

test('database assignments support future role codes without changing frontend enums', () => {
  assert.deepEqual(
    providerClassificationFromAssignments({
      providerDomain: 'HOPE_HUB',
      roleAssignments: [
        { roleCode: 'FUTURE_SUPPORT_ROLE', isPrimary: true, status: 'ACTIVE' },
        { roleCode: 'LIFE_COACH', status: 'ACTIVE' },
        { roleCode: 'RETIRED_ROLE', status: 'INACTIVE' }
      ]
    }),
    {
      domain: 'HOPE_HUB',
      primaryRole: 'FUTURE_SUPPORT_ROLE',
      roles: ['FUTURE_SUPPORT_ROLE', 'LIFE_COACH']
    }
  );
});

test('legacy primary role stays first and selected roles are deduplicated', () => {
  assert.deepEqual(normalizeProviderRoles('LIFE_COACH', ['PEER_SUPPORT_VOLUNTEER', 'LIFE_COACH']), [
    'LIFE_COACH',
    'PEER_SUPPORT_VOLUNTEER'
  ]);
});

test('legacy Hope Hub profile becomes canonical provider classification', () => {
  const classification = providerClassificationFromLegacy({
    doctorType: 'PSYCHOLOGIST',
    mentalHealthProfile: {
      careTeamType: 'PEER_SUPPORT_VOLUNTEER',
      careTeamTypes: ['LIFE_COACH', 'PEER_SUPPORT_VOLUNTEER']
    }
  });

  assert.equal(classification.domain, 'HOPE_HUB');
  assert.equal(classification.primaryRole, 'PEER_SUPPORT_VOLUNTEER');
  assert.deepEqual(classification.roles, ['PEER_SUPPORT_VOLUNTEER', 'LIFE_COACH']);
  assert.equal(providerHasRoleCategory(classification.roles, 'EMOTIONAL_LISTENER'), true);
  assert.equal(providerHasRoleCategory(classification.roles, 'COACH_MENTOR'), true);
});

test('homeopathy providers never inherit Hope Hub roles', () => {
  assert.deepEqual(
    providerClassificationFromLegacy({
      doctorType: 'JUNIOR_DOCTOR',
      mentalHealthProfile: { careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL' }
    }),
    { domain: 'HOMEOPATHY', primaryRole: null, roles: [] }
  );
});
