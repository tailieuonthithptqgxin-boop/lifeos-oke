import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import functions from the Edge API route
// Simulating Edge Environment for onRequest
import { onRequest as onRequestPagesFunction } from '../functions/api/[[route]]';
import worker from '../src/cloudflare/worker';

describe('Cloudflare Pages Functions Auth Audit', () => {
  const mockEnv: Record<string, any> = {
    JWT_SECRET: 'test_jwt_secret_super_secure_32_characters_long_min',
    INITIAL_ADMIN_EMAIL: 'admin@lifeos.com',
    INITIAL_ADMIN_PASSWORD: 'Admin@123456',
    NODE_ENV: 'production'
  };

  test('1. Admin login with correct password must grant SUPERADMIN role and TEAM plan', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@lifeos.com',
        password: 'Admin@123456'
      })
    });

    const res = await onRequestPagesFunction({
      request: req,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'SUPERADMIN');
    assert.equal(data.user.plan, 'TEAM');
    assert.ok(data.token, 'Token must be issued');
  });

  test('2. Admin login with identifier "admin" and "LifeOS@Admin2026" must also succeed as SUPERADMIN', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin',
        password: 'LifeOS@Admin2026'
      })
    });

    const res = await onRequestPagesFunction({
      request: req,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'SUPERADMIN');
  });

  test('3. Admin login with wrong password must return 401 and NEVER demote to normal USER', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@lifeos.com',
        password: 'WrongPassword123'
      })
    });

    const res = await onRequestPagesFunction({
      request: req,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(res.status, 401, 'Must reject with 401 Unauthorized');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Quản trị viên'), 'Error message must clearly state admin password was wrong');
    assert.equal(data.user, undefined, 'No user object or token must be returned');
  });

  test('4. Unregistered user login attempt must return 401 (Zero-Bypass Enforcement)', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'unregistered_random_user_9999@example.com',
        password: 'AnyRandomPassword123!'
      })
    });

    const res = await onRequestPagesFunction({
      request: req,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(res.status, 401, 'Unregistered user must be rejected with 401');
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Tài khoản không tồn tại'), 'Must inform user to register');
  });

  test('5. Attempting to register with admin email must be rejected (400)', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: 'admin@lifeos.com',
        password: 'Password123!'
      })
    });

    const res = await onRequestPagesFunction({
      request: req,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Quản trị viên'));
  });

  test('6. User registration and subsequent login with valid password must succeed', async () => {
    const testEmail = `newuser_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword2026!';

    // Register
    const regReq = new Request('https://quanlicanhan.online/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nguyen Van A',
        email: testEmail,
        password: testPassword
      })
    });

    const regRes = await onRequestPagesFunction({
      request: regReq,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(regRes.status, 201);
    const regData = await regRes.json();
    assert.equal(regData.success, true);
    assert.equal(regData.user.email, testEmail);

    // Login with correct password
    const loginReq = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: testPassword
      })
    });

    const loginRes = await onRequestPagesFunction({
      request: loginReq,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.equal(loginData.success, true);
    assert.equal(loginData.user.email, testEmail);
    assert.equal(loginData.user.role, 'USER');

    // Login with incorrect password
    const badLoginReq = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: 'WrongPassword999!'
      })
    });

    const badLoginRes = await onRequestPagesFunction({
      request: badLoginReq,
      env: mockEnv,
      next: async () => new Response('next', { status: 404 })
    } as any);

    assert.equal(badLoginRes.status, 401);
    const badLoginData = await badLoginRes.json();
    assert.equal(badLoginData.success, false);
    assert.ok(badLoginData.message.includes('Mật khẩu không chính xác'));
  });
});

describe('Cloudflare Worker Entry Point Auth Audit', () => {
  const mockEnv: Record<string, any> = {
    JWT_SECRET: 'test_jwt_secret_super_secure_32_characters_long_min',
    INITIAL_ADMIN_EMAIL: 'admin@lifeos.com',
    INITIAL_ADMIN_PASSWORD: 'Admin@123456',
    NODE_ENV: 'production'
  };

  test('Worker: Admin login with correct password must grant SUPERADMIN', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@lifeos.com',
        password: 'Admin@123456'
      })
    });

    const res = await worker.fetch(req, mockEnv as any, { waitUntil: () => {}, passThroughOnException: () => {} } as any);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.role, 'SUPERADMIN');
    assert.equal(data.user.plan, 'TEAM');
  });

  test('Worker: Admin login with wrong password must return 401 and NEVER demote to normal USER', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@lifeos.com',
        password: 'WrongPassword999'
      })
    });

    const res = await worker.fetch(req, mockEnv as any, { waitUntil: () => {}, passThroughOnException: () => {} } as any);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.user, undefined);
  });

  test('Worker: Unregistered user login must return 401', async () => {
    const req = new Request('https://quanlicanhan.online/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'totally_unregistered_edge_user@example.com',
        password: 'RandomPassword123'
      })
    });

    const res = await worker.fetch(req, mockEnv as any, { waitUntil: () => {}, passThroughOnException: () => {} } as any);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(data.message.includes('Tài khoản không tồn tại'));
  });
});
