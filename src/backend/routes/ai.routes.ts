import { Router, Request, Response } from 'express';

export const aiRouter = Router();

export interface ServerAiTelemetryLog {
  traceId: string;
  timestamp: string;
  model: string;
  primaryModel: string;
  fallbackUsed: boolean;
  httpStatus: number;
  retryCount: number;
  responseTimeMs: number;
  errorCategory?: 'SERVER_OVERLOAD' | 'QUOTA_LIMIT' | 'AUTH_ERROR' | 'USER_INPUT_ERROR' | 'UNKNOWN_ERROR';
  errorCode?: string;
}

const recentServerAiTelemetry: ServerAiTelemetryLog[] = [];
const MAX_SERVER_TELEMETRY = 100;

// Rate limiter per IP/User to prevent continuous request flooding (Requirement 3)
const clientLastRequestMap = new Map<string, { count: number; windowStart: number; lastTs: number }>();

function recordServerTelemetry(entry: ServerAiTelemetryLog) {
  recentServerAiTelemetry.unshift(entry);
  if (recentServerAiTelemetry.length > MAX_SERVER_TELEMETRY) {
    recentServerAiTelemetry.length = MAX_SERVER_TELEMETRY;
  }
  console.info(
    `[Server GeminiAI] TraceID=${entry.traceId} | Status=${entry.httpStatus} | Model=${entry.model} (Fallback=${entry.fallbackUsed}) | Retries=${entry.retryCount} | Latency=${entry.responseTimeMs}ms | Category=${entry.errorCategory || 'OK'}`
  );
}

function isCapacityExhaustedError(status: number, body: any): boolean {
  if (status === 503) return true;
  const errStatus = String(body?.error?.status || body?.error?.code || '').toUpperCase();
  const errMsg = String(body?.error?.message || '').toUpperCase();
  const detailsStr = JSON.stringify(body?.error?.details || '').toUpperCase();
  return (
    errStatus === 'UNAVAILABLE' ||
    errStatus.includes('MODEL_CAPACITY_EXHAUSTED') ||
    errMsg.includes('MODEL_CAPACITY_EXHAUSTED') ||
    errMsg.includes('UNAVAILABLE') ||
    errMsg.includes('OVERLOADED') ||
    detailsStr.includes('MODEL_CAPACITY_EXHAUSTED')
  );
}

function computeBackoffWithJitter(attempt: number, baseMs = 700, maxMs = 6000, jitterMs = 400): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * jitterMs);
  return exp + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

aiRouter.post('/gemini', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const traceId =
    (req.headers['x-trace-id'] as string) ||
    req.body?.traceId ||
    `TRC-SRV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const clientKey = String(req.headers['cf-connecting-ip'] || req.ip || 'anon');
  const now = Date.now();
  const rateState = clientLastRequestMap.get(clientKey) || { count: 0, windowStart: now, lastTs: 0 };

  if (now - rateState.windowStart > 60000) {
    rateState.count = 0;
    rateState.windowStart = now;
  }
  rateState.count += 1;
  rateState.lastTs = now;
  clientLastRequestMap.set(clientKey, rateState);

  if (rateState.count > 30) {
    const responseTimeMs = Date.now() - startTime;
    recordServerTelemetry({
      traceId,
      timestamp: new Date().toISOString(),
      model: req.body?.model || 'gemini-2.5-pro',
      primaryModel: req.body?.model || 'gemini-2.5-pro',
      fallbackUsed: false,
      httpStatus: 429,
      retryCount: 0,
      responseTimeMs,
      errorCategory: 'QUOTA_LIMIT',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    });
    res.status(429).json({
      success: false,
      traceId,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        category: 'QUOTA_LIMIT',
        message: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng đợi ít giây rồi thử lại.',
      },
    });
    return;
  }

  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const primaryModel = typeof req.body?.model === 'string' && req.body.model.trim()
    ? req.body.model.trim()
    : (process.env.GEMINI_PRIMARY_MODEL || 'gemini-2.5-pro');

  const configuredFallbacks: string[] = Array.isArray(req.body?.fallbackModels)
    ? req.body.fallbackModels
    : ['gemini-2.5-flash', 'gemini-2.0-flash'];

  // Requirement 8: Validate User Input Error (400)
  if (!prompt) {
    const responseTimeMs = Date.now() - startTime;
    recordServerTelemetry({
      traceId,
      timestamp: new Date().toISOString(),
      model: primaryModel,
      primaryModel,
      fallbackUsed: false,
      httpStatus: 400,
      retryCount: 0,
      responseTimeMs,
      errorCategory: 'USER_INPUT_ERROR',
      errorCode: 'INVALID_ARGUMENT',
    });
    res.status(400).json({
      success: false,
      traceId,
      error: {
        code: 'INVALID_ARGUMENT',
        category: 'USER_INPUT_ERROR',
        message: 'Nội dung câu hỏi không được để trống.',
      },
    });
    return;
  }

  if (prompt.length > 16000) {
    const responseTimeMs = Date.now() - startTime;
    recordServerTelemetry({
      traceId,
      timestamp: new Date().toISOString(),
      model: primaryModel,
      primaryModel,
      fallbackUsed: false,
      httpStatus: 400,
      retryCount: 0,
      responseTimeMs,
      errorCategory: 'USER_INPUT_ERROR',
      errorCode: 'PROMPT_TOO_LONG',
    });
    res.status(400).json({
      success: false,
      traceId,
      error: {
        code: 'PROMPT_TOO_LONG',
        category: 'USER_INPUT_ERROR',
        message: 'Nội dung yêu cầu vượt quá độ dài tối đa (16.000 ký tự).',
      },
    });
    return;
  }

  // Requirement 8: Distinguish Auth Error if API Key is missing or invalid
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    const responseTimeMs = Date.now() - startTime;
    recordServerTelemetry({
      traceId,
      timestamp: new Date().toISOString(),
      model: primaryModel,
      primaryModel,
      fallbackUsed: false,
      httpStatus: 401,
      retryCount: 0,
      responseTimeMs,
      errorCategory: 'AUTH_ERROR',
      errorCode: 'API_KEY_NOT_CONFIGURED',
    });
    res.status(401).json({
      success: false,
      traceId,
      error: {
        code: 'API_KEY_NOT_CONFIGURED',
        category: 'AUTH_ERROR',
        message: 'Chưa cấu hình khóa xác thực GEMINI_API_KEY trên máy chủ.',
      },
    });
    return;
  }

  const candidateModels = [
    primaryModel,
    ...configuredFallbacks.filter(m => m && m !== primaryModel),
  ];

  const maxRetries = 3;
  let totalRetries = 0;
  let lastStatus = 503;
  let lastErrorBody: any = null;
  let activeModel = primaryModel;

  const contents: any[] = [];
  if (Array.isArray(req.body?.history)) {
    for (const turn of req.body.history.slice(-10)) {
      if (turn && typeof turn.text === 'string' && turn.text.trim()) {
        contents.push({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: turn.text }],
        });
      }
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  const requestBody: Record<string, any> = {
    contents,
    generationConfig: {
      temperature: typeof req.body?.temperature === 'number' ? req.body.temperature : 0.7,
      maxOutputTokens: typeof req.body?.maxOutputTokens === 'number' ? req.body.maxOutputTokens : 1024,
    },
  };

  if (typeof req.body?.systemInstruction === 'string' && req.body.systemInstruction.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: req.body.systemInstruction.trim() }],
    };
  }

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const modelName = candidateModels[mIdx];
    const isFallback = mIdx > 0;
    activeModel = modelName;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        totalRetries += 1;
        const delayMs = computeBackoffWithJitter(attempt - 1);
        await sleep(delayMs);
      }

      try {
        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName
        )}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const upstreamRes = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': traceId,
          },
          body: JSON.stringify(requestBody),
        });

        lastStatus = upstreamRes.status;
        let data: any = null;
        try {
          data = await upstreamRes.json();
        } catch {
          data = null;
        }

        if (upstreamRes.ok) {
          const generatedText =
            data?.candidates?.[0]?.content?.parts
              ?.map((p: any) => p?.text || '')
              .join('')
              .trim() || '';

          if (generatedText) {
            const responseTimeMs = Date.now() - startTime;
            recordServerTelemetry({
              traceId,
              timestamp: new Date().toISOString(),
              model: modelName,
              primaryModel,
              fallbackUsed: isFallback,
              httpStatus: 200,
              retryCount: totalRetries,
              responseTimeMs,
            });

            res.status(200).json({
              success: true,
              text: generatedText,
              model: modelName,
              fallbackUsed: isFallback,
              traceId,
              retryCount: totalRetries,
              responseTimeMs,
            });
            return;
          }
        }

        lastErrorBody = data;

        // Check if 503 / MODEL_CAPACITY_EXHAUSTED / UNAVAILABLE
        if (isCapacityExhaustedError(upstreamRes.status, data)) {
          if (attempt < maxRetries) {
            continue; // Retry with exponential backoff + jitter
          }
          // After maxRetries on this model, break inner loop to try fallback model
          break;
        }

        // Non-503 errors: check if 429 Quota (can fallback to another model, but don't spam retries on same model)
        if (upstreamRes.status === 429) {
          break;
        }

        // Auth (401/403) or Invalid Argument (400): do not retry or fallback
        mIdx = candidateModels.length;
        break;
      } catch (err: any) {
        lastStatus = 503;
        lastErrorBody = {
          error: {
            status: 'UNAVAILABLE',
            code: 'MODEL_CAPACITY_EXHAUSTED',
            message: err?.message || 'Upstream connection failed',
          },
        };
        if (attempt === maxRetries) {
          break;
        }
      }
    }
  }

  // Classify final failure
  const responseTimeMs = Date.now() - startTime;
  const is503 = isCapacityExhaustedError(lastStatus, lastErrorBody);
  const errorCategory: ServerAiTelemetryLog['errorCategory'] = is503
    ? 'SERVER_OVERLOAD'
    : lastStatus === 429
    ? 'QUOTA_LIMIT'
    : lastStatus === 401 || lastStatus === 403
    ? 'AUTH_ERROR'
    : lastStatus === 400
    ? 'USER_INPUT_ERROR'
    : 'UNKNOWN_ERROR';

  const errorCode = is503
    ? 'MODEL_CAPACITY_EXHAUSTED'
    : String(lastErrorBody?.error?.status || lastErrorBody?.error?.code || `HTTP_${lastStatus}`);

  const friendlyMessage = is503
    ? 'Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút.'
    : lastStatus === 429
    ? 'Đã chạm hạn mức tần suất gọi API (Quota/Rate Limit). Vui lòng thử lại sau ít phút.'
    : lastStatus === 401 || lastStatus === 403
    ? 'Lỗi xác thực API Key với máy chủ Gemini.'
    : lastStatus === 400
    ? 'Yêu cầu gửi lên không hợp lệ.'
    : 'Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút.';

  recordServerTelemetry({
    traceId,
    timestamp: new Date().toISOString(),
    model: activeModel,
    primaryModel,
    fallbackUsed: activeModel !== primaryModel,
    httpStatus: is503 ? 503 : lastStatus,
    retryCount: totalRetries,
    responseTimeMs,
    errorCategory,
    errorCode,
  });

  res.status(is503 ? 503 : lastStatus).json({
    success: false,
    traceId,
    model: activeModel,
    fallbackUsed: activeModel !== primaryModel,
    retryCount: totalRetries,
    responseTimeMs,
    error: {
      code: errorCode,
      status: is503 ? 'UNAVAILABLE' : errorCode,
      category: errorCategory,
      message: friendlyMessage,
    },
  });
});

aiRouter.get('/telemetry', (_req: Request, res: Response) => {
  res.json({
    success: true,
    logs: recentServerAiTelemetry,
  });
});
