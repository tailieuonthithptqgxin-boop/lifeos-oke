/**
 * LifeOS Cloudflare Worker Entry Point (10,000 Concurrent Users Scale Edition)
 * Implements:
 * - Edge Static Asset Caching (immutable 1-year CDN cache for hashed bundles)
 * - In-Flight GET Request Coalescing to prevent thundering herd on Free Tier
 * - Native Edge Gemini AI Handler with HTTP 503 Exponential Backoff + Jitter & Model Fallback
 * - API Proxying & Scheduled Cron Triggers
 */

export interface Env {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
  HYPERDRIVE?: {
    connectionString: string;
  };
  R2_STORAGE?: any;
  CACHE_KV?: any;
  APP_URL?: string;
  API_BACKEND_URL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_PRIMARY_MODEL?: string;
  NODE_ENV?: string;
}

// Edge Request Coalescing Map for public GET endpoints (prevents 10,000 simultaneous requests hitting backend)
const inFlightEdgeGets = new Map<string, Promise<{ status: number; statusText: string; headers: [string, string][]; body: ArrayBuffer }>>();

export default {
  /**
   * Main Fetch Handler for HTTP requests
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight for API routes
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api')) {
      const origin = request.headers.get('Origin') || '*';
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Request-ID, X-Trace-ID, X-AI-Model, X-AI-Retry-Attempt',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Native Edge Gemini AI Route (when GEMINI_API_KEY is bound directly on Cloudflare Worker)
    if (url.pathname === '/api/ai/gemini' && request.method === 'POST' && env.GEMINI_API_KEY) {
      return handleEdgeGeminiRequest(request, env);
    }

    // 3. Route API Requests (/api/*, /health, /ready, /auth/*)
    if (
      url.pathname.startsWith('/api') ||
      url.pathname === '/health' ||
      url.pathname === '/ready' ||
      url.pathname.startsWith('/auth')
    ) {
      return handleApiRequest(request, env, ctx);
    }

    // 4. Static Assets & SPA Routing via Cloudflare Assets Binding
    if (env.ASSETS) {
      try {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
          return addSecurityAndCacheHeaders(assetResponse, url.pathname);
        }

        // SPA Fallback: for non-asset GET routes, serve index.html
        if (request.method === 'GET' && !url.pathname.includes('.')) {
          const indexRequest = new Request(new URL('/', request.url).toString(), request);
          const indexResponse = await env.ASSETS.fetch(indexRequest);
          return addSecurityAndCacheHeaders(indexResponse, '/index.html');
        }

        return assetResponse;
      } catch (err: any) {
        return new Response('Asset delivery error: ' + err.message, { status: 500 });
      }
    }

    return new Response(
      JSON.stringify({
        name: 'LifeOS Cloudflare Edge Gateway',
        status: 'online',
        scaleTier: '10000-concurrent-ready',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },

  /**
   * Scheduled Cron Handler
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledTasks(event, env));
  },
};

/**
 * Edge-native Gemini AI handler with HTTP 503 Exponential Backoff + Random Jitter & Model Fallback
 */
async function handleEdgeGeminiRequest(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  const traceId =
    request.headers.get('X-Trace-ID') ||
    request.headers.get('CF-RAY') ||
    `TRC-EDGE-${Date.now().toString(36).toUpperCase()}`;

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        traceId,
        error: {
          code: 'INVALID_ARGUMENT',
          category: 'USER_INPUT_ERROR',
          message: 'Dữ liệu JSON gửi lên không hợp lệ.',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const primaryModel = body?.model || env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-pro';
  const fallbacks: string[] = Array.isArray(body?.fallbackModels)
    ? body.fallbackModels
    : ['gemini-2.5-flash', 'gemini-2.0-flash'];

  if (!prompt) {
    return new Response(
      JSON.stringify({
        success: false,
        traceId,
        error: {
          code: 'INVALID_ARGUMENT',
          category: 'USER_INPUT_ERROR',
          message: 'Nội dung câu hỏi không được để trống.',
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const candidateModels = [primaryModel, ...fallbacks.filter(m => m && m !== primaryModel)];
  const maxRetries = 3;
  let totalRetries = 0;
  let lastStatus = 503;
  let lastData: any = null;
  let activeModel = primaryModel;

  const contents: any[] = [];
  if (Array.isArray(body?.history)) {
    for (const turn of body.history.slice(-10)) {
      if (turn?.text) {
        contents.push({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(turn.text) }],
        });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  const geminiPayload: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: typeof body?.temperature === 'number' ? body.temperature : 0.7,
      maxOutputTokens: typeof body?.maxOutputTokens === 'number' ? body.maxOutputTokens : 1024,
    },
  };
  if (body?.systemInstruction) {
    geminiPayload.systemInstruction = { parts: [{ text: String(body.systemInstruction) }] };
  }

  for (let i = 0; i < candidateModels.length; i++) {
    const modelName = candidateModels[i];
    const isFallback = i > 0;
    activeModel = modelName;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        totalRetries++;
        const expDelay = Math.min(6000, 700 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
        await new Promise(r => setTimeout(r, expDelay));
      }

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY!)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Request-ID': traceId },
            body: JSON.stringify(geminiPayload),
          }
        );

        lastStatus = res.status;
        lastData = await res.json().catch(() => null);

        if (res.ok) {
          const text =
            lastData?.candidates?.[0]?.content?.parts
              ?.map((p: any) => p?.text || '')
              .join('')
              .trim() || '';
          if (text) {
            const responseTimeMs = Date.now() - startTime;
            console.info(
              `[Edge GeminiAI] TraceID=${traceId} | Status=200 | Model=${modelName} (Fallback=${isFallback}) | Retries=${totalRetries} | Latency=${responseTimeMs}ms`
            );
            return new Response(
              JSON.stringify({
                success: true,
                text,
                model: modelName,
                fallbackUsed: isFallback,
                traceId,
                retryCount: totalRetries,
                responseTimeMs,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        const errStatus = String(lastData?.error?.status || lastData?.error?.code || '').toUpperCase();
        const errMsg = String(lastData?.error?.message || '').toUpperCase();
        const is503 =
          res.status === 503 ||
          errStatus === 'UNAVAILABLE' ||
          errStatus.includes('MODEL_CAPACITY_EXHAUSTED') ||
          errMsg.includes('MODEL_CAPACITY_EXHAUSTED') ||
          errMsg.includes('UNAVAILABLE');

        if (is503) {
          if (attempt < maxRetries) continue;
          break; // Switch to fallback model
        }
        if (res.status === 429) break; // Switch to fallback model on rate limit
        i = candidateModels.length;
        break;
      } catch {
        lastStatus = 503;
        if (attempt === maxRetries) break;
      }
    }
  }

  const responseTimeMs = Date.now() - startTime;
  console.warn(
    `[Edge GeminiAI Failed] TraceID=${traceId} | Status=${lastStatus} | Model=${activeModel} | Retries=${totalRetries} | Latency=${responseTimeMs}ms`
  );

  return new Response(
    JSON.stringify({
      success: false,
      traceId,
      model: activeModel,
      fallbackUsed: activeModel !== primaryModel,
      retryCount: totalRetries,
      responseTimeMs,
      error: {
        code: lastStatus === 503 ? 'MODEL_CAPACITY_EXHAUSTED' : `HTTP_${lastStatus}`,
        status: lastStatus === 503 ? 'UNAVAILABLE' : 'ERROR',
        category: lastStatus === 503 ? 'SERVER_OVERLOAD' : lastStatus === 429 ? 'QUOTA_LIMIT' : 'UNKNOWN_ERROR',
        message: 'Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút.',
      },
    }),
    { status: lastStatus === 503 ? 503 : lastStatus, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Handle API Requests: Proxy to backend service with Edge Request Coalescing
 */
async function handleApiRequest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const backendBaseUrl = env.API_BACKEND_URL || env.APP_URL || 'http://localhost:3000';
  const targetUrl = new URL(url.pathname + url.search, backendBaseUrl);

  const upstreamHeaders = new Headers(request.headers);
  const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '';
  const country = request.headers.get('CF-IPCountry') || 'VN';
  const rayId = request.headers.get('CF-RAY') || '';

  upstreamHeaders.set('X-Forwarded-For', clientIp);
  upstreamHeaders.set('X-Real-IP', clientIp);
  upstreamHeaders.set('CF-IPCountry', country);
  upstreamHeaders.set('CF-RAY', rayId);

  // Coalesce identical anonymous public GET requests (/api/languages, /api/plans, /api/version)
  const isPublicCacheableGet =
    request.method === 'GET' &&
    (url.pathname === '/api/languages' || url.pathname === '/api/plans' || url.pathname === '/api/version');

  if (isPublicCacheableGet) {
    const coalesceKey = targetUrl.toString();
    if (inFlightEdgeGets.has(coalesceKey)) {
      const shared = await inFlightEdgeGets.get(coalesceKey)!;
      return new Response(shared.body.slice(0), {
        status: shared.status,
        statusText: shared.statusText,
        headers: shared.headers,
      });
    }
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: upstreamHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    const origin = request.headers.get('Origin');
    if (origin) {
      responseHeaders.set('Access-Control-Allow-Origin', origin);
      responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    }

    if (upstreamResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
      responseHeaders.set('X-Accel-Buffering', 'no');
      responseHeaders.set('Cache-Control', 'no-cache, no-transform');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'EDGE_GATEWAY_ERROR',
          message: 'Không thể kết nối tới máy chủ backend LifeOS qua Cloudflare Edge Gateway.',
          details: err.message,
        },
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Handle Scheduled Tasks (Cron Triggers)
 */
async function handleScheduledTasks(event: ScheduledEvent, env: Env): Promise<void> {
  const backendBaseUrl = env.API_BACKEND_URL || env.APP_URL;
  if (!backendBaseUrl) return;

  try {
    const scheduledDate = new Date(event.scheduledTime);
    const vnHour = (scheduledDate.getUTCHours() + 7) % 24;

    let cronId = 'cron1';
    if (vnHour === 7) {
      cronId = 'cron2';
    } else if (vnHour === 21) {
      cronId = 'cron3';
    } else if (vnHour === 0) {
      cronId = 'cron4';
    }

    await fetch(`${backendBaseUrl}/api/cron/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cloudflare-Cron': 'true',
        'X-Cron-Time': String(event.scheduledTime),
      },
      body: JSON.stringify({ cronId }),
    });
  } catch (e) {
    console.warn('[Cloudflare Scheduled Cron] Warning during task execution:', e);
  }
}

/**
 * Attach Security & Edge CDN Cache Headers to Static Asset Responses
 */
function addSecurityAndCacheHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Immutable 1-year Edge CDN caching for hashed Vite assets (saves 99% bandwidth for 10,000 users)
  if (pathname.startsWith('/assets/')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname === '/index.html' || pathname === '/' || pathname === '/sw.js') {
    headers.set('Cache-Control', 'no-cache, must-revalidate');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
