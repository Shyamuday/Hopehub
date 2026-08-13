import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  doctorListenerScreeningSubmissionSchema,
  doctorProfileStepPatchSchema
} from './routes/auth/doctor.js';

const sourceRoot = path.dirname(fileURLToPath(import.meta.url));

test('step profile contract accepts the five guided profile steps', () => {
  for (const step of ['identity', 'public', 'care', 'safety', 'services'] as const) {
    assert.equal(doctorProfileStepPatchSchema.parse({ step }).step, step);
  }
  assert.throws(() => doctorProfileStepPatchSchema.parse({ step: 'everything' }));
});

test('listener screening submission requires identified answers', () => {
  const parsed = doctorListenerScreeningSubmissionSchema.parse({
    questionSetId: 'set-1',
    questionSetVersion: 'v1',
    answers: [{ questionId: 'q1', optionId: 'safe-response' }]
  });
  assert.equal(parsed.answers.length, 1);
  assert.throws(() =>
    doctorListenerScreeningSubmissionSchema.parse({
      questionSetId: 'set-1',
      questionSetVersion: 'v1',
      answers: []
    })
  );
});

test('provider API lifecycle keeps visibility tied to readiness', () => {
  const doctorRoutes = fs.readFileSync(path.join(sourceRoot, 'routes/auth/doctor.ts'), 'utf8');
  const imageRoutes = fs.readFileSync(
    path.join(sourceRoot, 'routes/auth/profile-image.ts'),
    'utf8'
  );
  assert.match(doctorRoutes, /router\.patch\(\s*['"]\/doctor\/profile['"]/);
  assert.match(doctorRoutes, /router\.post\(\s*['"]\/doctor\/listener-screening['"]/);
  assert.match(doctorRoutes, /data:\s*\{ showOnWebsite: readiness\.ready \}/);
  assert.match(imageRoutes, /syncProviderVisibility\(userId, req\.user!\.role\)/);
});

test('slot API response includes slots, rules, and services', () => {
  const slotRoutes = fs.readFileSync(path.join(sourceRoot, 'routes/slots.ts'), 'utf8');
  assert.match(slotRoutes, /res\.json\(\{ slots, rules, services:/);
});
