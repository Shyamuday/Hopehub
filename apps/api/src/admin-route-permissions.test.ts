import assert from 'node:assert/strict';
import test from 'node:test';
import { PERMISSIONS } from './staff-permissions.js';
import { resolveAdminRouteRequirement } from './admin-route-permissions.js';

test('alternative read permissions use any-match semantics', () => {
  assert.deepEqual(resolveAdminRouteRequirement('GET', '/admin/diseases'), {
    permissions: [PERMISSIONS.DISEASES_READ, PERMISSIONS.CATALOG_READ],
    match: 'any'
  });
  assert.deepEqual(resolveAdminRouteRequirement('GET', '/admin/telegram-bots'), {
    permissions: [PERMISSIONS.STAFF_READ, PERMISSIONS.NOTIFICATIONS_WRITE],
    match: 'any'
  });
});

test('sensitive consultation changes retain all-match semantics', () => {
  assert.deepEqual(resolveAdminRouteRequirement('PATCH', '/admin/consultations/example/status'), {
    permissions: [PERMISSIONS.ASSIGNMENTS_WRITE, PERMISSIONS.CONSULTATIONS_READ],
    match: 'all'
  });
});

test('payment readers do not also need report access', () => {
  assert.deepEqual(resolveAdminRouteRequirement('GET', '/admin/payments'), {
    permissions: [PERMISSIONS.PAYMENTS_READ],
    match: 'all'
  });
});

test('previously uncovered admin areas have explicit requirements', () => {
  const routes = [
    ['GET', '/admin/assessment-definitions'],
    ['GET', '/admin/auth-sessions'],
    ['PATCH', '/admin/blog/example'],
    ['GET', '/admin/chat-sessions'],
    ['GET', '/admin/call-health'],
    ['GET', '/admin/counsellor-applications'],
    ['GET', '/admin/lab-referrals'],
    ['GET', '/admin/pricing/location-fees'],
    ['PATCH', '/admin/provider-roles/listener'],
    ['GET', '/admin/site-config'],
    ['GET', '/admin/visitor-leads']
  ] as const;

  for (const [method, path] of routes) {
    assert.ok(resolveAdminRouteRequirement(method, path), `${method} ${path} is unprotected`);
  }
});
