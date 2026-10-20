import test from 'node:test';
import assert from 'node:assert/strict';
import { getPrisma, dbService } from '../src/backend/db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

test('Password Reset & Google OAuth Integration Test Suite', async (t) => {
  const prisma = getPrisma();
  const testEmail = `test_reset_${Date.now()}@lifeos.test`;
  let testUserId = '';

  await t.test('1. Setup Test User', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('OldPassword@123', salt);

    const user = await dbService.createUser({
      name: 'Reset Test User',
      email: testEmail,
      username: `user_${Date.now()}`,
      passwordHash,
      role: 'USER',
      plan: 'FREE',
      status: 'ACTIVE'
    });

    assert.ok(user.id);
    testUserId = user.id;
  });

  let validToken = '';

  await t.test('2. Generate and Verify Password Reset Token', async () => {
    validToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: testUserId,
        token: validToken,
        expiresAt,
        used: false
      }
    });

    assert.equal(tokenRecord.token, validToken);
    assert.equal(tokenRecord.used, false);

    // Verify token validity
    const check = await prisma.passwordResetToken.findUnique({
      where: { token: validToken },
      include: { user: true }
    });

    assert.ok(check);
    assert.equal(check.used, false);
    assert.ok(new Date(check.expiresAt).getTime() > Date.now());
  });

  await t.test('3. Perform Password Reset with Valid Token', async () => {
    const newPassword = 'NewSecretPassword@2026';
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: testUserId },
        data: { passwordHash: newHash }
      }),
      prisma.passwordResetToken.update({
        where: { token: validToken },
        data: { used: true }
      }),
      prisma.session.deleteMany({
        where: { userId: testUserId }
      })
    ]);

    // Verify token marked used
    const updatedToken = await prisma.passwordResetToken.findUnique({
      where: { token: validToken }
    });
    assert.equal(updatedToken?.used, true);

    // Verify user password updated
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUserId }
    });
    const matches = await bcrypt.compare(newPassword, updatedUser!.passwordHash);
    assert.equal(matches, true);
  });

  await t.test('4. Reject Re-use of Already Used Token', async () => {
    const check = await prisma.passwordResetToken.findUnique({
      where: { token: validToken }
    });
    assert.equal(check?.used, true);
    // Simulating rejection
    const canUse = !check?.used && new Date(check?.expiresAt || 0).getTime() > Date.now();
    assert.equal(canUse, false);
  });

  await t.test('5. Verify Google ID Field in User Model', async () => {
    const mockGoogleId = `google_sub_${Date.now()}`;
    const updated = await prisma.user.update({
      where: { id: testUserId },
      data: { googleId: mockGoogleId }
    });

    assert.equal(updated.googleId, mockGoogleId);

    // Test finding by googleId
    const found = await prisma.user.findFirst({
      where: { googleId: mockGoogleId }
    });
    assert.equal(found?.id, testUserId);
  });

  await t.test('6. Teardown Test Data', async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });
});
