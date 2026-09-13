import assert from 'node:assert/strict';
import test from 'node:test';
import type { RewardProgramRule } from '@prisma/client';
import { computeDiscountAmount, DEFAULT_REWARD_RULES } from './reward-rules.js';

test('FIRSTCHAT makes an eligible consultation fully free and remains reusable', () => {
  const rule = DEFAULT_REWARD_RULES.find(
    (candidate) => candidate.code === 'FIRSTCHAT_LISTENER_FREE'
  );

  assert.ok(rule, 'FIRSTCHAT must be present in the default reward rules');
  assert.equal(rule.promoCode, 'FIRSTCHAT');
  assert.equal(rule.valueAmount, 10_000);
  assert.equal(rule.maxUsesPerPatient, null);
  assert.equal(rule.minPayableInPaise, 0);
  assert.equal(rule.conditions.targetPayableInPaise, 0);
  assert.deepEqual(rule.conditions.providerCareTeamTypes, [
    'PEER_SUPPORT_VOLUNTEER',
    'PSYCHOLOGY_STUDENT_VOLUNTEER'
  ]);
  assert.equal(computeDiscountAmount(rule as unknown as RewardProgramRule, 9_900), 9_900);
});

test('WELCOMEFREE is the featured free coupon for every live service', () => {
  const rule = DEFAULT_REWARD_RULES.find(
    (candidate) => candidate.code === 'WELCOMEFREE_ALL_LIVE_SERVICES'
  );

  assert.ok(rule, 'WELCOMEFREE must be present in the default reward rules');
  assert.equal(rule.promoCode, 'WELCOMEFREE');
  assert.equal(rule.maxUsesPerPatient, null);
  assert.equal(rule.minPayableInPaise, 0);
  assert.equal(rule.conditions.targetPayableInPaise, 0);
  assert.equal(rule.conditions.showToConsumers, true);
  assert.equal(rule.conditions.featured, true);
});

test('FIRSTTALK1 remains the separate reusable one-rupee offer', () => {
  const rule = DEFAULT_REWARD_RULES.find(
    (candidate) => candidate.code === 'FIRSTTALK1_LISTENER_OFFER'
  );

  assert.ok(rule, 'FIRSTTALK1 must be present in the default reward rules');
  assert.equal(rule.promoCode, 'FIRSTTALK1');
  assert.equal(rule.maxUsesPerPatient, null);
  assert.equal(rule.conditions.targetPayableInPaise, 100);
  assert.equal(rule.conditions.showToConsumers, false);
  assert.equal(rule.conditions.featured, false);
});
