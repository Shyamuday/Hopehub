import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapProfileUpdateToUserData,
  patientProfilePatchSchema,
  patientProfileUpdateSchema
} from './patient-profile.js';

test('patient profile accepts and normalizes self-description fields', () => {
  const profile = patientProfileUpdateSchema.parse({
    name: '  Asha Sen  ',
    email: '  ASHA@EXAMPLE.COM ',
    preferredName: '  Asha  ',
    pronouns: '  she/her  ',
    aboutMe: '  I enjoy music and quiet conversations.  ',
    supportPreferences: '  Please listen before suggesting solutions.  '
  });

  assert.equal(profile.name, 'Asha Sen');
  assert.equal(profile.email, 'asha@example.com');
  assert.equal(profile.preferredName, 'Asha');
  assert.equal(profile.pronouns, 'she/her');
  assert.equal(profile.aboutMe, 'I enjoy music and quiet conversations.');
  assert.equal(profile.supportPreferences, 'Please listen before suggesting solutions.');
});

test('patient profile PATCH supports one-field updates without clearing absent fields', () => {
  const patch = patientProfilePatchSchema.parse({ aboutMe: ' Updated introduction ' });
  const data = mapProfileUpdateToUserData(patch, undefined);

  assert.equal(data.aboutMe, 'Updated introduction');
  assert.equal(data.name, undefined);
  assert.equal(data.email, undefined);
  assert.equal(data.alternateMobile, undefined);
  assert.equal(data.dateOfBirth, undefined);
});

test('patient self-description length limits are enforced', () => {
  const result = patientProfilePatchSchema.safeParse({ aboutMe: 'x'.repeat(1201) });
  assert.equal(result.success, false);
});
