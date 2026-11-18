// LifeOS Cloudflare Worker Cron Script (worker-cron.js)
// Standalone Edge Cron Trigger Handler for Cloudflare Workers (Free Tier)
// Configured with Cron Triggers: ["*/5 * * * *", "0 0,7,21 * * *"]

export default {
  /**
   * Main HTTP fetch handler
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' || url.pathname === '/cron/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        edgeService: 'LifeOS Cloudflare Cron Edge Worker',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Manual test trigger endpoint
    if (url.pathname === '/cron/trigger' && request.method === 'POST') {
      const result = await triggerBackendCron(env, 'all');
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('LifeOS Cloudflare Edge Cron Worker Running', { status: 200 });
  },

  /**
   * Scheduled Cron Event Handler (Runs automatically on Cloudflare Network)
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduledExecution(event, env));
  }
};

async function handleScheduledExecution(event, env) {
  const cronExpression = event.cron;
  console.log(`[Cloudflare Cron Trigger] Fired expression: ${cronExpression} at ${new Date(event.scheduledTime).toISOString()}`);

  try {
    const now = new Date(event.scheduledTime);
    const hour = now.getUTCHours() + 7; // Vietnam Time (UTC+7)
    const normalizedHour = hour >= 24 ? hour - 24 : hour;

    let targetCron = 'cron1';
    if (normalizedHour === 7) {
      targetCron = 'cron2';
    } else if (normalizedHour === 21) {
      targetCron = 'cron3';
    } else if (normalizedHour === 0) {
      targetCron = 'cron4';
    }

    await triggerBackendCron(env, targetCron);
  } catch (error) {
    console.error('[Cloudflare Cron Worker] Scheduled task error:', error);
  }
}

async function triggerBackendCron(env, cronId) {
  const backendUrl = env.API_BACKEND_URL || env.APP_URL || 'https://lifeos.vn';
  const secret = env.CRON_SECRET || 'lifeos_cron_secure_key_2026';

  const res = await fetch(`${backendUrl}/api/cron/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cloudflare-Cron': 'true',
      'X-Cron-Secret': secret
    },
    body: JSON.stringify({ cronId })
  });

  return await res.json();
}
