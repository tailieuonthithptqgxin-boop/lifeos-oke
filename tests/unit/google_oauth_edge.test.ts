import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../src/cloudflare/worker';

describe('Cloudflare Edge Google OAuth & Session Suite', () => {
  const mockCtx = { waitUntil: () => {}, passThroughOnException: () => {} } as any;

  it('reports disabled config cleanly when GOOGLE_CLIENT_ID/SECRET are missing', async () => {
    const req = new Request('https://lifeos-oke.example.workers.dev/api/auth/google/config');
    const res = await worker.fetch(req, { API_BACKEND_URL: 'http://localhost:3000' }, mockCtx);
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.enabled, false);
    assert.equal(body.redirectUri, 'https://lifeos-oke.example.workers.dev/api/auth/google/callback');
    assert.equal(body.mode, 'cloudflare-edge');
  });

  it('redirects to explicit google_not_configured error instead of 502 when secrets missing', async () => {
    const req = new Request('https://lifeos-oke.example.workers.dev/api/auth/google');
    const res = await worker.fetch(req, { API_BACKEND_URL: 'http://localhost:3000' }, mockCtx);
    assert.equal(res.status, 302);
    const loc = new URL(res.headers.get('Location') || '');
    assert.equal(loc.searchParams.get('login'), 'google_not_configured');
    assert.ok((loc.searchParams.get('reason') || '').includes('GOOGLE_CLIENT_ID'));
  });

  it('initiates Google OAuth 2.0 with SameSite=Lax HttpOnly Secure state cookie when configured', async () => {
    const req = new Request('https://lifeos-oke.example.workers.dev/api/auth/google');
    const res = await worker.fetch(
      req,
      {
        GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
        GOOGLE_CLIENT_SECRET: 'test-client-secret-123456',
      },
      mockCtx
    );
    assert.equal(res.status, 302);
    const loc = new URL(res.headers.get('Location') || '');
    assert.equal(loc.origin, 'https://accounts.google.com');
    assert.equal(loc.pathname, '/o/oauth2/v2/auth');
    assert.equal(loc.searchParams.get('client_id'), 'test-client-id.apps.googleusercontent.com');
    assert.equal(
      loc.searchParams.get('redirect_uri'),
      'https://lifeos-oke.example.workers.dev/api/auth/google/callback'
    );
    assert.ok((loc.searchParams.get('state') || '').includes('.'));

    const setCookie = res.headers.get('Set-Cookie') || '';
    assert.ok(setCookie.includes('google_oauth_state='));
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Lax'));
    assert.ok(setCookie.includes('Secure'));
  });

  it('returns structured 401 NO_TOKEN on /api/auth/me without session token', async () => {
    const req = new Request('https://lifeos-oke.example.workers.dev/api/auth/me');
    const res = await worker.fetch(req, {}, mockCtx);
    assert.equal(res.status, 401);
    const body: any = await res.json();
    assert.equal(body.error?.code, 'NO_TOKEN');
  });

  it('creates quick trial account on POST /api/auth/register and validates token on /api/auth/me', async () => {
    const registerReq = new Request('https://lifeos-oke.example.workers.dev/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Khách Trải Nghiệm #TEST',
        email: 'guest_test1@lifeos.vn',
        password: 'DemoPass@test2026',
      }),
    });
    const regRes = await worker.fetch(registerReq, { API_BACKEND_URL: 'http://localhost:3000' }, mockCtx);
    assert.equal(regRes.status, 201);
    const regBody: any = await regRes.json();
    assert.equal(regBody.success, true);
    assert.equal(regBody.user.email, 'guest_test1@lifeos.vn');
    assert.ok(regBody.token && regBody.token.split('.').length === 3);

    const meReq = new Request('https://lifeos-oke.example.workers.dev/api/auth/me', {
      headers: { Authorization: `Bearer ${regBody.token}` },
    });
    const meRes = await worker.fetch(meReq, { API_BACKEND_URL: 'http://localhost:3000' }, mockCtx);
    assert.equal(meRes.status, 200);
    const meBody: any = await meRes.json();
    assert.equal(meBody.success, true);
    assert.equal(meBody.user.email, 'guest_test1@lifeos.vn');
  });

  it('supports 1-tap Admin login and /api/data-batch on Cloudflare Free Tier without VPS', async () => {
    const loginReq = new Request('https://lifeos-oke.example.workers.dev/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@lifeos.com', password: 'Admin@123456' }),
    });
    const loginRes = await worker.fetch(loginReq, { API_BACKEND_URL: 'http://localhost:3000' }, mockCtx);
    assert.equal(loginRes.status, 200);
    const loginBody: any = await loginRes.json();
    assert.equal(loginBody.success, true);
    assert.equal(loginBody.user.role, 'SUPERADMIN');

    const batchReq = new Request('https://lifeos-oke.example.workers.dev/api/data-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collections: ['tasks', 'habits', 'transactions'] }),
    });
    const batchRes = await worker.fetch(batchReq, { API_BACKEND_URL: 'http://localhost:3000' }, mockCtx);
    assert.equal(batchRes.status, 200);
    const batchBody: any = await batchRes.json();
    assert.equal(batchBody.success, true);
    assert.deepEqual(batchBody.data.tasks, []);
  });
});
