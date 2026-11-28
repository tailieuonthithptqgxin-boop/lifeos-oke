import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/cloudflare/worker';

const mockEnv: any = {
  JWT_SECRET: 'test_jwt_secret_super_secure_32_characters_long_min',
  INITIAL_ADMIN_EMAIL: 'admin@lifeos.com',
  INITIAL_ADMIN_PASSWORD: 'Admin@123456',
  APP_URL: 'https://quanlicanhan.online',
  NODE_ENV: 'production',
};

const mockCtx: any = {
  waitUntil: (p: Promise<any>) => p,
  passThroughOnException: () => {},
};

describe('Cloudflare Edge Automated Email & 24/7 Cron Trigger Audit', () => {
  test('1. Test-email returns honest failure (never fake success) when no email gateway is configured yet', async () => {
    const res = await worker.fetch(
      new Request('https://quanlicanhan.online/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-LifeOS-User-Id': 'unconfigured_user_1' },
        body: JSON.stringify({ targetEmail: 'student@example.com' }),
      }),
      mockEnv,
      mockCtx
    );
    assert.equal(res.status, 200);
    const body: any = await res.json();
    assert.equal(body.success, false, 'Must NOT return fake success when unconfigured!');
    assert.ok(body.message.includes('Chưa cấu hình'));
  });

  test('2. Saving Google Apps Script Webhook & sending live test-email + 24/7 Cron deadline email succeeds with anti-duplicate lock', async () => {
    const capturedWebhooks: any[] = [];
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: any, init?: any) => {
      const urlStr = typeof input === 'string' ? input : input?.url || '';
      if (urlStr.startsWith('https://script.google.com/macros/s/test-webhook/exec')) {
        const parsed = JSON.parse(init?.body || '{}');
        capturedWebhooks.push(parsed);
        return new Response(JSON.stringify({ success: true, message: 'Email sent' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as any;

    try {
      // A. Register user so they are in the 24/7 Edge Active Users Directory
      const regRes = await worker.fetch(
        new Request('https://quanlicanhan.online/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Học Viên Nhận Mail',
            email: 'autocron@example.com',
            password: 'StrongPassword@2026',
          }),
        }),
        mockEnv,
        mockCtx
      );
      const regData: any = await regRes.json();
      const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.token}`,
        'X-LifeOS-User-Id': regData.user.id,
      };

      // B. Configure Google Apps Script Webhook via /api/notifications/email-config
      const cfgRes = await worker.fetch(
        new Request('https://quanlicanhan.online/api/notifications/email-config', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            enabled: true,
            serviceType: 'webhook',
            webhookUrl: 'https://script.google.com/macros/s/test-webhook/exec',
            fromName: 'LifeOS Edge Bot',
          }),
        }),
        mockEnv,
        mockCtx
      );
      assert.equal(cfgRes.status, 200);

      // C. Send live Test Email
      const testMailRes = await worker.fetch(
        new Request('https://quanlicanhan.online/api/notifications/test-email', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ targetEmail: 'autocron@example.com' }),
        }),
        mockEnv,
        mockCtx
      );
      const testMailBody: any = await testMailRes.json();
      assert.equal(testMailBody.success, true);
      assert.equal(testMailBody.method, 'google_apps_script_webhook');
      assert.equal(capturedWebhooks.length, 1);
      assert.equal(capturedWebhooks[0].to, 'autocron@example.com');
      assert.equal(capturedWebhooks[0].recipient, 'autocron@example.com');
      assert.ok(capturedWebhooks[0].html.includes('<!DOCTYPE html') || capturedWebhooks[0].html.includes('<div'));
      assert.equal(capturedWebhooks[0].html, capturedWebhooks[0].htmlBody);

      // D. Create a task due in 20 minutes (Vietnam Time UTC+7 -> triggers DEADLINE_30M in background Cron!)
      const nowMs = Date.now();
      const targetVn = new Date(nowMs + 20 * 60 * 1000 + 7 * 3600 * 1000);
      const dueDate = targetVn.toISOString().slice(0, 10);
      const dueTime = targetVn.toISOString().slice(11, 16);

      await worker.fetch(
        new Request('https://quanlicanhan.online/api/data/tasks', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            title: 'Nộp bài tập Vật Lý chương 3',
            dueDate,
            dueTime,
            status: 'Chưa làm',
          }),
        }),
        mockEnv,
        mockCtx
      );

      // E. Fire Cloudflare Scheduled Cron Trigger (simulating browser completely closed!)
      const cronRes = await worker.fetch(
        new Request('https://quanlicanhan.online/api/cron/trigger', {
          method: 'POST',
          headers: authHeaders,
        }),
        mockEnv,
        mockCtx
      );
      const cronBody: any = await cronRes.json();
      assert.equal(cronBody.success, true);
      assert.equal(cronBody.results.emailsDispatched, 1, 'Cron must automatically email the 30m deadline warning!');
      assert.equal(capturedWebhooks.length, 2);
      assert.ok(capturedWebhooks[1].subject.includes('Nộp bài tập Vật Lý chương 3'));

      // F. Fire Cron again 1 minute later -> Anti-duplicate lock must send 0 duplicate emails!
      const cronRes2 = await worker.fetch(
        new Request('https://quanlicanhan.online/api/cron/trigger', {
          method: 'POST',
          headers: authHeaders,
        }),
        mockEnv,
        mockCtx
      );
      const cronBody2: any = await cronRes2.json();
      assert.equal(cronBody2.results.emailsDispatched, 0, 'Must NOT send duplicate email for same milestone!');
      assert.equal(capturedWebhooks.length, 2);

      // G. Verify Outbox Queue Stats recorded both SENT emails
      const statsRes = await worker.fetch(
        new Request('https://quanlicanhan.online/api/admin/email-queue/stats', { headers: authHeaders }),
        mockEnv,
        mockCtx
      );
      const statsBody: any = await statsRes.json();
      assert.ok(statsBody.stats.sent >= 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
