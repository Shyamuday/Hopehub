import assert from 'node:assert/strict';
import {
  buildPeriodBuckets,
  resolvePeriodFromPreset,
  suggestGranularity
} from '../src/services/finance-period-report.js';
import { parsePaymentFeeBreakdown } from '../src/services/doctor-earnings.js';

function testPresets() {
  const month = resolvePeriodFromPreset('this_month');
  assert.equal(month.preset, 'this_month');
  assert.ok(month.from <= month.to);

  const custom = resolvePeriodFromPreset('custom', '2026-01-01', '2026-01-31');
  assert.equal(isoDateLocal(custom.from), '2026-01-01');
  assert.equal(isoDateLocal(custom.to), '2026-01-31');
}

function isoDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function testGranularity() {
  const from = new Date('2026-01-01');
  const to = new Date('2026-01-15');
  assert.equal(suggestGranularity(from, to), 'daily');

  const yearFrom = new Date('2024-01-01');
  const yearTo = new Date('2026-01-01');
  assert.equal(suggestGranularity(yearFrom, yearTo), 'yearly');
}

function testBuckets() {
  const buckets = buildPeriodBuckets(new Date('2026-01-01'), new Date('2026-01-03'), 'daily');
  assert.equal(buckets.length, 3);
}

// re-export sanity
assert.equal(parsePaymentFeeBreakdown({ consultationFeeInPaise: 100 }, 100).consultationFeeInPaise, 100);

testPresets();
testGranularity();
testBuckets();

console.log('finance-period verification passed');
