import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { getPrisma, dbService } from '../src/backend/db.js';
import { getJwtSecret } from '../src/backend/auth.middleware.js';

describe('Google OAuth Complete Authentication & Session Lifecycle', () => {
  const prisma = getPrisma();
  const testEmail = `google_oauth_test_${Date.now()}@example.com`;
  const testGoogleId = `gid_${Date.now()}`;
  let createdUserId = '';
  let issuedToken = '';

  after(async () => {
    try {
      if (createdUserId) {
        await prisma.session.deleteMany({ where: { userId: createdUserId } });
        await prisma.user.deleteMany({ where: { id: createdUserId } });
      }
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
  });

  test('1. Simulate New Google User Creation with 7-Day Free Trial', async () => {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const user = await dbService.createUser({
      name: 'Google Test User',
      email: testEmail,
      username: `gtest_${Date.now().toString(36)}`,
      passwordHash: 'oauth_managed_placeholder',
      googleId: testGoogleId,
      role: 'USER',
      plan: 'FREE',
      status: 'ACTIVE',
      avatar: 'https://lh3.googleusercontent.com/test-avatar',
      trialStartedAt: now,
      trialEndsAt,
      trialUsed: true
    });

    assert.ok(user.id, 'User must have an ID');
    assert.equal(user.email, testEmail);
    assert.equal(user.googleId, testGoogleId);
    assert.equal(user.trialUsed, true);
    assert.ok(user.trialEndsAt, 'User must have trialEndsAt');
    createdUserId = user.id;
  });

  test('2. Generate and Verify Signed JWT Token with Secret', async () => {
    const secret = getJwtSecret();
    assert.ok(secret, 'JWT_SECRET must be defined');

    issuedToken = jwt.sign(
      { userId: createdUserId, role: 'USER', email: testEmail },
      secret,
      { expiresIn: '14d' }
    );

    assert.ok(issuedToken, 'Token must be issued');
    const parts = issuedToken.split('.');
    assert.equal(parts.length, 3, 'JWT must have 3 parts (header.payload.signature)');

    const decoded = jwt.verify(issuedToken, secret) as any;
    assert.equal(decoded.userId, createdUserId);
    assert.equal(decoded.email, testEmail);
  });

  test('3. Persist Database Session in PostgreSQL and Verify Session Existence', async () => {
    const sessionExpiry = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const session = await dbService.createSession(createdUserId, issuedToken, sessionExpiry);

    assert.ok(session, 'Session record must be created');
    assert.equal(session.userId, createdUserId);
    assert.equal(session.token, issuedToken);

    // Retrieve session by token
    const retrievedSession = await dbService.findSessionByToken(issuedToken);
    assert.ok(retrievedSession, 'Session must be retrievable by token');
    assert.equal(retrievedSession.userId, createdUserId);
  });

  test('4. Call /api/auth/me to verify user authentication, session, and 7-day trial', async () => {
    const response = await fetch('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${issuedToken}`,
        'Accept': 'application/json'
      }
    });

    assert.equal(response.status, 200, 'HTTP status must be 200 OK');
    const data = await response.json() as any;
    assert.equal(data.success, true);
    assert.equal(data.user.id, createdUserId);
    assert.equal(data.user.email, testEmail);
    assert.ok(data.user.trialEndsAt, 'trialEndsAt must be returned');
    assert.equal(data.user.isTrial, true, 'User must be recognized in active trial');
    assert.equal(data.subscriptionStatus.isTrial, true, 'Subscription status must recognize trial');
  });

  test('5. Verify Account Linking for Existing Users without Duplicates', async () => {
    // Look up by email (same as Google OAuth callback logic)
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: testGoogleId },
          { email: testEmail }
        ]
      }
    });

    assert.ok(existing, 'Must find existing user');
    assert.equal(existing.id, createdUserId, 'Must be the exact same user ID');
  });
});
