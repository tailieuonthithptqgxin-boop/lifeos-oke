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
});
