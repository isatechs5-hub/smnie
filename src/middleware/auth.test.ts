import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdminSessionToken,
  createSessionToken,
  verifyAdminSessionToken,
  verifySessionToken,
} from './auth';

test('admin session token verifies only with admin verifier and rejects public verifier', () => {
  const token = createAdminSessionToken({
    sessionId: 'sess-1234',
    adminUserId: 1,
    email: 'isatechs5@gmail.com',
    roleCode: 'SUPER_ADMIN',
    expiresAtMs: Date.now() + 60_000,
  });

  const adminPayload = verifyAdminSessionToken(token);
  assert.ok(adminPayload);
  assert.equal(adminPayload.sessionId, 'sess-1234');
  assert.equal(adminPayload.adminUserId, 1);
  assert.equal(adminPayload.roleCode, 'SUPER_ADMIN');

  // Strict domain separation: public verifier must reject admin token
  assert.equal(verifySessionToken(token), null);
});

test('public student session token verifies only with public verifier and rejects admin verifier', () => {
  const token = createSessionToken({
    userId: 7,
    email: 'student@smnie.in',
    role: 'student',
  });

  const publicPayload = verifySessionToken(token);
  assert.ok(publicPayload);
  assert.equal(publicPayload.userId, 7);
  assert.equal(publicPayload.role, 'student');

  // Strict domain separation: admin verifier must reject public student token
  assert.equal(verifyAdminSessionToken(token), null);
});

test('expired or tampered admin tokens are rejected', () => {
  const expired = createAdminSessionToken({
    sessionId: 'sess-expired',
    adminUserId: 2,
    email: 'mpmujahed@gmail.com',
    roleCode: 'SUPER_ADMIN',
    expiresAtMs: Date.now() - 1000,
  });
  assert.equal(verifyAdminSessionToken(expired), null);

  const valid = createAdminSessionToken({
    sessionId: 'sess-valid',
    adminUserId: 2,
    email: 'mpmujahed@gmail.com',
    roleCode: 'SUPER_ADMIN',
    expiresAtMs: Date.now() + 60_000,
  });
  const tampered = `${valid.slice(0, -2)}xx`;
  assert.equal(verifyAdminSessionToken(tampered), null);
});
