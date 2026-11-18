/**
 * Enterprise Gemini AI Resilient Client for LifeOS
 *
 * Implements:
 * 1. Exact detection of HTTP 503, MODEL_CAPACITY_EXHAUSTED, and UNAVAILABLE.
 * 2. Automatic retry (max 3 attempts) with Exponential Backoff + Random Jitter.
 * 3. Circuit-breaker & in-flight request throttling to prevent server overload.
 * 4. Automatic fallback model switching (e.g. gemini-2.5-pro -> gemini-2.5-flash -> gemini-2.0-flash).
 * 5. Friendly Vietnamese error message: "Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút."
 * 6. Input preservation helper so user text is never lost on failure.
 * 7. Detailed structured logging: HTTP status, model, TraceID, retryCount, responseTimeMs.
 * 8. Strict classification between Server Overload (503/5xx), API Quota/Rate Limit (429),
 *    Authentication Error (401/403), and User/Client Input Error (400).
 * 9. Zero fake AI content masking on error.
 */

export type GeminiErrorCategory =
  | 'SERVER_OVERLOAD'
  | 'QUOTA_LIMIT'
  | 'AUTH_ERROR'
  | 'USER_INPUT_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface GeminiTelemetryEntry {
  traceId: string;
  timestamp: string;
  model: string;
  primaryModel: string;
  fallbackUsed: boolean;
  httpStatus: number;
  retryCount: number;
  responseTimeMs: number;
  success: boolean;
  errorCode?: string;
  errorCategory?: GeminiErrorCategory;
  errorMessage?: string;
}

export interface GeminiClientConfig {
  primaryModel?: string;
  fallbackModels?: string[];
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
  timeoutMs?: number;
  apiKey?: string;
  endpoint?: string;
}

export interface GeminiRequestPayload {
  prompt: string;
  systemInstruction?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  temperature?: number;
  maxOutputTokens?: number;
  config?: GeminiClientConfig;
}

export interface GeminiResponseResult {
  success: boolean;
  text?: string;
  model: string;
  fallbackUsed: boolean;
  traceId: string;
  httpStatus: number;
  retryCount: number;
  responseTimeMs: number;
  errorCategory?: GeminiErrorCategory;
  errorCode?: string;
  userFriendlyMessage?: string;
   preservedInput?: string;
}

export const FRIENDLY_503_MESSAGE = 'Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút.';

const DEFAULT_PRIMARY_MODEL = 'gemini-2.5-pro';
const DEFAULT_FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const MAX_RETRIES_DEFAULT = 3;
const BASE_DELAY_MS_DEFAULT = 800;
const MAX_DELAY_MS_DEFAULT = 8000;
const JITTER_MS_DEFAULT = 450;
const TELEMETRY_STORAGE_KEY = 'lifeos_gemini_telemetry_logs';
const MAX_TELEMETRY_LOGS = 50;

// Anti-spam cooldown & circuit breaker state per model
const modelCooldownUntil = new Map<string, number>();
const inFlightRequests = new Map<string, Promise<GeminiResponseResult>>();
let lastRequestTimestamp = 0;
const MIN_REQUEST_INTERVAL_MS = 350;

/**
 * Generates a unique TraceID for end-to-end request correlation
 */
export function generateTraceId(): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timePart = Date.now().toString(36).toUpperCase();
  return `TRC-AI-${timePart}-${randomPart}`;
}

/**
 * 1. Accurately detects HTTP 503, MODEL_CAPACITY_EXHAUSTED, and UNAVAILABLE
 */
export function isModelCapacityExhausted(
  httpStatus: number,
  errorBody?: any,
  rawMessage?: string
): boolean {
  if (httpStatus === 503) return true;

  const errorCode = String(
    errorBody?.error?.status ||
    errorBody?.error?.code ||
    errorBody?.status ||
    errorBody?.code ||
    ''
  ).toUpperCase();

  const errorMsg = String(
    errorBody?.error?.message ||
    errorBody?.message ||
    rawMessage ||
    ''
  ).toUpperCase();

  const detailsStr = JSON.stringify(errorBody?.error?.details || errorBody?.details || '').toUpperCase();

  if (
    errorCode.includes('MODEL_CAPACITY_EXHAUSTED') ||
    errorCode === 'UNAVAILABLE' ||
    errorCode === '503' ||
    errorMsg.includes('MODEL_CAPACITY_EXHAUSTED') ||
    errorMsg.includes('UNAVAILABLE') ||
    errorMsg.includes('CAPACITY EXHAUSTED') ||
    errorMsg.includes('OVERLOADED') ||
    detailsStr.includes('MODEL_CAPACITY_EXHAUSTED')
  ) {
    return true;
  }

  return false;
}

/**
 * 8. Distinguishes Server Overload, Quota/Rate Limit, Auth Error, and User Input Error
 */
export function classifyGeminiError(
  httpStatus: number,
  errorBody?: any,
  rawMessage?: string
): {
  category: GeminiErrorCategory;
  errorCode: string;
  userFriendlyMessage: string;
  isRetryable: boolean;
  shouldFallbackModel: boolean;
} {
  const rawStatus = String(
    errorBody?.error?.status ||
    errorBody?.error?.code ||
    errorBody?.code ||
    ''
  ).toUpperCase();
  const rawMsg = String(
    errorBody?.error?.message ||
    errorBody?.message ||
    rawMessage ||
    ''
  );

  // Case A: HTTP 503 / MODEL_CAPACITY_EXHAUSTED / UNAVAILABLE
  if (isModelCapacityExhausted(httpStatus, errorBody, rawMessage)) {
    const code =
      rawStatus.includes('MODEL_CAPACITY_EXHAUSTED') || rawMsg.toUpperCase().includes('MODEL_CAPACITY_EXHAUSTED')
        ? 'MODEL_CAPACITY_EXHAUSTED'
        : rawStatus === 'UNAVAILABLE' || rawMsg.toUpperCase().includes('UNAVAILABLE')
        ? 'UNAVAILABLE'
        : 'HTTP_503_SERVICE_UNAVAILABLE';

    return {
      category: 'SERVER_OVERLOAD',
      errorCode: code,
      userFriendlyMessage: FRIENDLY_503_MESSAGE,
      isRetryable: true,
      shouldFallbackModel: true,
    };
  }

  // Case B: Other 5xx Server Errors (500, 502, 504)
  if (httpStatus === 500 || httpStatus === 502 || httpStatus === 504 || rawStatus === 'INTERNAL') {
    return {
      category: 'SERVER_OVERLOAD',
      errorCode: rawStatus || `HTTP_${httpStatus}`,
      userFriendlyMessage: FRIENDLY_503_MESSAGE,
      isRetryable: true,
      shouldFallbackModel: true,
    };
  }

  // Case C: API Quota / Rate Limit (HTTP 429 / RESOURCE_EXHAUSTED)
  if (
    httpStatus === 429 ||
    rawStatus === 'RESOURCE_EXHAUSTED' ||
    rawStatus === 'RATE_LIMIT_EXCEEDED' ||
    rawMsg.toUpperCase().includes('QUOTA') ||
    rawMsg.toUpperCase().includes('RESOURCE_EXHAUSTED')
  ) {
    return {
      category: 'QUOTA_LIMIT',
      errorCode: rawStatus || 'RESOURCE_EXHAUSTED',
      userFriendlyMessage: 'Đã chạm hạn mức tần suất gọi API (Quota/Rate Limit). Vui lòng đợi ít phút trước khi gửi tiếp.',
      isRetryable: false,
      shouldFallbackModel: true,
    };
  }

  // Case D: Authentication / Permission Error (HTTP 401 / 403)
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    rawStatus === 'UNAUTHENTICATED' ||
    rawStatus === 'PERMISSION_DENIED' ||
    rawMsg.toUpperCase().includes('API_KEY_INVALID') ||
    rawMsg.toUpperCase().includes('API KEY NOT VALID')
  ) {
    return {
      category: 'AUTH_ERROR',
      errorCode: rawStatus || `HTTP_${httpStatus}_AUTH`,
      userFriendlyMessage: 'Lỗi xác thực khóa kết nối AI (API Key không hợp lệ hoặc chưa được cấp quyền). Vui lòng kiểm tra cấu hình.',
      isRetryable: false,
      shouldFallbackModel: false,
    };
  }

  // Case E: User / Client Input Error (HTTP 400 / 422 / INVALID_ARGUMENT)
  if (
    httpStatus === 400 ||
    httpStatus === 422 ||
    rawStatus === 'INVALID_ARGUMENT' ||
    rawStatus === 'FAILED_PRECONDITION'
  ) {
    return {
      category: 'USER_INPUT_ERROR',
      errorCode: rawStatus || 'INVALID_ARGUMENT',
      userFriendlyMessage: 'Nội dung yêu cầu không hợp lệ hoặc vượt quá giới hạn ký tự cho phép. Vui lòng kiểm tra lại nội dung nhập.',
      isRetryable: false,
      shouldFallbackModel: false,
    };
  }

  // Case F: Network / Timeout Error (httpStatus === 0)
  if (httpStatus === 0) {
    return {
      category: 'NETWORK_ERROR',
      errorCode: 'NETWORK_OR_TIMEOUT',
      userFriendlyMessage: 'Kết nối mạng tới máy chủ AI bị gián đoạn hoặc quá thời gian chờ. Vui lòng kiểm tra kết nối Internet.',
      isRetryable: true,
      shouldFallbackModel: false,
    };
  }

  return {
    category: 'UNKNOWN_ERROR',
    errorCode: rawStatus || `HTTP_${httpStatus}`,
    userFriendlyMessage: 'Không thể xử lý yêu cầu AI lúc này. Vui lòng thử lại sau ít phút.',
    isRetryable: false,
    shouldFallbackModel: false,
  };
}

/**
 * 2. Calculates Exponential Backoff + Random Jitter delay
 * attempt is 0-indexed (attempt 0 = first retry, attempt 1 = second retry, attempt 2 = third retry)
 */
export function calculateBackoffWithJitter(
  attempt: number,
  baseDelayMs: number = BASE_DELAY_MS_DEFAULT,
  maxDelayMs: number = MAX_DELAY_MS_DEFAULT,
  jitterMs: number = JITTER_MS_DEFAULT
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  const randomJitter = Math.floor(Math.random() * jitterMs);
  return exponential + randomJitter;
}

/**
 * 7. Detailed Structured Telemetry Logger
 */
export function recordGeminiTelemetry(entry: GeminiTelemetryEntry): void {
  const statusTag = entry.success ? 'SUCCESS' : `FAILED [${entry.errorCategory || 'ERR'}:${entry.errorCode || entry.httpStatus}]`;
  console.info(
    `[GeminiAI Telemetry] TraceID=${entry.traceId} | Status=${entry.httpStatus} (${statusTag}) | Model=${entry.model} (Primary=${entry.primaryModel}, Fallback=${entry.fallbackUsed}) | Retries=${entry.retryCount} | Latency=${entry.responseTimeMs}ms`
  );

  if (typeof window !== 'undefined') {
    try {
      const existingRaw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
      const list: GeminiTelemetryEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
      list.unshift(entry);
      if (list.length > MAX_TELEMETRY_LOGS) {
        list.length = MAX_TELEMETRY_LOGS;
      }
      localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignore storage quota warnings
    }
  }
}

export function getGeminiTelemetryLogs(): GeminiTelemetryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a single model call with up to maxRetries (default 3) using Exponential Backoff + Random Jitter
 */
async function executeModelWithRetry(
  model: string,
  payload: GeminiRequestPayload,
  traceId: string,
  config: Required<Pick<GeminiClientConfig, 'maxRetries' | 'baseDelayMs' | 'maxDelayMs' | 'jitterMs' | 'timeoutMs'>> & {
    endpoint?: string;
    apiKey?: string;
  }
): Promise<{
  ok: boolean;
  text?: string;
  httpStatus: number;
  retryCount: number;
  errorBody?: any;
  rawErrorMessage?: string;
}> {
  let retryCount = 0;
  let lastHttpStatus = 503;
  let lastErrorBody: any = null;
  let lastErrorMessage = '';

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      retryCount = attempt;
      const delay = calculateBackoffWithJitter(
        attempt - 1,
        config.baseDelayMs,
        config.maxDelayMs,
        config.jitterMs
      );
      console.warn(
        `[GeminiAI Retry] TraceID=${traceId} | Model=${model} | Retry ${attempt}/${config.maxRetries} after ${delay}ms (Exponential Backoff + Jitter)`
      );
      await sleep(delay);
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), config.timeoutMs) : null;

    try {
      const targetEndpoint = config.endpoint || '/api/ai/gemini';
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Trace-ID': traceId,
          'X-AI-Model': model,
          'X-AI-Retry-Attempt': String(attempt),
        },
        credentials: 'include',
        body: JSON.stringify({
          model,
          prompt: payload.prompt,
          systemInstruction: payload.systemInstruction,
          history: payload.history,
          temperature: payload.temperature ?? 0.7,
          maxOutputTokens: payload.maxOutputTokens ?? 1024,
          traceId,
        }),
        ...(controller ? { signal: controller.signal } : {}),
      });

      lastHttpStatus = response.status;
      let body: any = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.ok && body?.success && typeof body?.text === 'string') {
        return {
          ok: true,
          text: body.text,
          httpStatus: response.status,
          retryCount,
        };
      }

      lastErrorBody = body;
      lastErrorMessage = body?.error?.message || body?.message || `HTTP ${response.status}`;

      const classification = classifyGeminiError(response.status, body, lastErrorMessage);

      // Mark model cooldown for 15 seconds if 503 / MODEL_CAPACITY_EXHAUSTED
      if (isModelCapacityExhausted(response.status, body, lastErrorMessage)) {
        modelCooldownUntil.set(model, Date.now() + 15000);
      }

      // Stop retrying immediately if error is not retryable (e.g. 400 Invalid Input, 401/403 Auth, 429 Quota)
      if (!classification.isRetryable || attempt === config.maxRetries) {
        return {
          ok: false,
          httpStatus: response.status,
          retryCount,
          errorBody: body,
          rawErrorMessage: lastErrorMessage,
        };
      }
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      lastHttpStatus = isAbort ? 504 : 0;
      lastErrorMessage = isAbort ? 'Request timed out' : (err?.message || 'Network error');
      lastErrorBody = { error: { code: isAbort ? 'DEADLINE_EXCEEDED' : 'NETWORK_ERROR', message: lastErrorMessage } };

      if (attempt === config.maxRetries) {
        return {
          ok: false,
          httpStatus: lastHttpStatus,
          retryCount,
          errorBody: lastErrorBody,
          rawErrorMessage: lastErrorMessage,
        };
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  return {
    ok: false,
    httpStatus: lastHttpStatus,
    retryCount,
    errorBody: lastErrorBody,
    rawErrorMessage: lastErrorMessage,
  };
}

/**
 * Main entry point to call Gemini API with full 503 resilience, retry + jitter, model fallback, and telemetry.
 */
export async function callGeminiWithResilience(
  payload: GeminiRequestPayload
): Promise<GeminiResponseResult> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  const trimmedPrompt = (payload.prompt || '').trim();

  const primaryModel = payload.config?.primaryModel || DEFAULT_PRIMARY_MODEL;
  const fallbackModels = (payload.config?.fallbackModels || DEFAULT_FALLBACK_MODELS).filter(
    m => m && m !== primaryModel
  );
  const maxRetries = payload.config?.maxRetries ?? MAX_RETRIES_DEFAULT;
  const baseDelayMs = payload.config?.baseDelayMs ?? BASE_DELAY_MS_DEFAULT;
  const maxDelayMs = payload.config?.maxDelayMs ?? MAX_DELAY_MS_DEFAULT;
  const jitterMs = payload.config?.jitterMs ?? JITTER_MS_DEFAULT;
  const timeoutMs = payload.config?.timeoutMs ?? 25000;

  // Validate User Input upfront (Requirement 8: Distinguish user error)
  if (!trimmedPrompt) {
    const responseTimeMs = Date.now() - startTime;
    const entry: GeminiTelemetryEntry = {
      traceId,
      timestamp: new Date().toISOString(),
      model: primaryModel,
      primaryModel,
      fallbackUsed: false,
      httpStatus: 400,
      retryCount: 0,
      responseTimeMs,
      success: false,
      errorCategory: 'USER_INPUT_ERROR',
      errorCode: 'EMPTY_PROMPT',
      errorMessage: 'Vui lòng nhập nội dung câu hỏi trước khi gửi.',
    };
    recordGeminiTelemetry(entry);
    return {
      success: false,
      model: primaryModel,
      fallbackUsed: false,
      traceId,
      httpStatus: 400,
      retryCount: 0,
      responseTimeMs,
      errorCategory: 'USER_INPUT_ERROR',
      errorCode: 'EMPTY_PROMPT',
      userFriendlyMessage: 'Vui lòng nhập nội dung câu hỏi trước khi gửi.',
      preservedInput: payload.prompt,
    };
  }

  // Requirement 3: Prevent continuous rapid-fire spamming to protect server
  const dedupKey = `${primaryModel}:${trimmedPrompt}`;
  if (inFlightRequests.has(dedupKey)) {
    return inFlightRequests.get(dedupKey)!;
  }

  const now = Date.now();
  if (now - lastRequestTimestamp < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - (now - lastRequestTimestamp));
  }
  lastRequestTimestamp = Date.now();

  const executionPromise = (async (): Promise<GeminiResponseResult> => {
    // Build ordered candidate models list: if primaryModel is in cooldown, still try it or prioritize healthy fallback
    const candidateModels = [primaryModel, ...fallbackModels];
    let totalRetries = 0;
    let lastAttemptResult: {
      ok: boolean;
      text?: string;
      httpStatus: number;
      retryCount: number;
      errorBody?: any;
      rawErrorMessage?: string;
    } | null = null;
    let activeModelUsed = primaryModel;

    for (let i = 0; i < candidateModels.length; i++) {
      const candidateModel = candidateModels[i];
      const isFallback = i > 0;
      activeModelUsed = candidateModel;

      // If primary model is currently in circuit-breaker cooldown and we have a fallback, use 1 retry on primary before switching
      const isCoolingDown = (modelCooldownUntil.get(candidateModel) || 0) > Date.now();
      const effectiveMaxRetries = isCoolingDown && candidateModels.length > i + 1 ? 1 : maxRetries;

      const attemptResult = await executeModelWithRetry(candidateModel, payload, traceId, {
        maxRetries: effectiveMaxRetries,
        baseDelayMs,
        maxDelayMs,
        jitterMs,
        timeoutMs,
        endpoint: payload.config?.endpoint,
        apiKey: payload.config?.apiKey,
      });

      totalRetries += attemptResult.retryCount;
      lastAttemptResult = attemptResult;

      if (attemptResult.ok && attemptResult.text) {
        const responseTimeMs = Date.now() - startTime;
        recordGeminiTelemetry({
          traceId,
          timestamp: new Date().toISOString(),
          model: candidateModel,
          primaryModel,
          fallbackUsed: isFallback,
          httpStatus: attemptResult.httpStatus,
          retryCount: totalRetries,
          responseTimeMs,
          success: true,
        });

        return {
          success: true,
          text: attemptResult.text,
          model: candidateModel,
          fallbackUsed: isFallback,
          traceId,
          httpStatus: attemptResult.httpStatus,
          retryCount: totalRetries,
          responseTimeMs,
        };
      }

      // Check if we should switch to fallback model (Requirement 4)
      const classification = classifyGeminiError(
        attemptResult.httpStatus,
        attemptResult.errorBody,
        attemptResult.rawErrorMessage
      );

      if (!classification.shouldFallbackModel || i === candidateModels.length - 1) {
        break;
      }

      console.warn(
        `[GeminiAI Fallback] TraceID=${traceId} | Primary model "${candidateModel}" unavailable (${classification.errorCode}). Switching to fallback model "${candidateModels[i + 1]}"...`
      );
    }

    // All retries and fallback models exhausted — classify and log accurately without fake AI content
    const finalStatus = lastAttemptResult?.httpStatus ?? 503;
    const classification = classifyGeminiError(
      finalStatus,
      lastAttemptResult?.errorBody,
      lastAttemptResult?.rawErrorMessage
    );
    const responseTimeMs = Date.now() - startTime;

    recordGeminiTelemetry({
      traceId,
      timestamp: new Date().toISOString(),
      model: activeModelUsed,
      primaryModel,
      fallbackUsed: activeModelUsed !== primaryModel,
      httpStatus: finalStatus,
      retryCount: totalRetries,
      responseTimeMs,
      success: false,
      errorCategory: classification.category,
      errorCode: classification.errorCode,
      errorMessage: classification.userFriendlyMessage,
    });

    return {
      success: false,
      model: activeModelUsed,
      fallbackUsed: activeModelUsed !== primaryModel,
      traceId,
      httpStatus: finalStatus,
      retryCount: totalRetries,
      responseTimeMs,
      errorCategory: classification.category,
      errorCode: classification.errorCode,
      userFriendlyMessage: classification.userFriendlyMessage,
      preservedInput: payload.prompt,
    };
  })();

  inFlightRequests.set(dedupKey, executionPromise);
  try {
    return await executionPromise;
  } finally {
    inFlightRequests.delete(dedupKey);
  }
}
