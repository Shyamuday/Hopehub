import assert from 'node:assert/strict';
import test from 'node:test';
import { scheduledPostTargetAllowed } from './telegram-scheduled-post-target.js';
test('staff group is excluded while user groups remain schedulable', () => {
  assert.equal(scheduledPostTargetAllowed('-100staff', '-100staff'), false);
  assert.equal(scheduledPostTargetAllowed(' -100staff ', '-100staff'), false);
  assert.equal(scheduledPostTargetAllowed('-100user', '-100staff'), true);
  assert.equal(scheduledPostTargetAllowed('', '-100staff'), false);
});
