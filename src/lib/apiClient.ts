/**
 * Production API Client for LifeOS
 * Uses HTTP-Only Cookie session authentication by default, with Bearer header fallback.
 * Hardened with In-flight Request Deduplication, Network Chaos Guards, Client-Side SWR Caching,
 * and Anti-Spam Click Throttling for Free-Tier 10,000 Users Scale.
 */

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lifeos_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// --------------------------------------------------------------------------
// Free-Tier 10,000 Users Scale Engine: Client-Side SWR Cache & Cooldown Locks
// --------------------------------------------------------------------------
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryApiCache = new Map<string, CacheEntry<any>>();
const mutatingCooldownMap = new Map<string, number>();

// Static / Semi-static endpoints that default to client-side caching
const DEFAULT_CACHED_ENDPOINTS: Record<string, number> = {
  '/api/languages': 600000,        // 10 minutes
  '/api/admin/plans': 900000,      // 15 minutes
  '/api/plans': 900000,            // 15 minutes
  '/api/templates': 1800000,       // 30 minutes
  '/api/version': 300000           // 5 minutes
};

export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    memoryApiCache.clear();
    return;
  }
  for (const key of memoryApiCache.keys()) {
    if (key.includes(prefix)) {
      memoryApiCache.delete(key);
    }
  }
}

// In-flight Mutating Request Deduplication Map to neutralize Spam-Clicking (Scenario 1)
const inFlightMutations = new Map<string, Promise<any>>();

export interface ApiCallOptions {
  timeoutMs?: number;
  silent?: boolean;
  cacheTtlMs?: number;
  forceRefresh?: boolean;
  maxRetries?: number;
  baseDelayMs?: number;
}

// --------------------------------------------------------------------------
// Offline Input Preservation Engine (Form Draft Auto-Retention)
// --------------------------------------------------------------------------
export function saveInputDraft(formKey: string, payload: any): void {
  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!storage) return;
    storage.setItem(`lifeos_draft_${formKey}`, JSON.stringify({
      payload,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.warn('[ApiClient] Failed to store form draft:', err);
  }
}

export function getInputDraft<T = any>(formKey: string): T | null {
  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!storage) return null;
    const raw = storage.getItem(`lifeos_draft_${formKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.payload ?? null;
  } catch {
    return null;
  }
}

export function clearInputDraft(formKey: string): void {
  try {
    const storage = typeof window !== 'undefined' ? window.sessionStorage : (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!storage) return;
    storage.removeItem(`lifeos_draft_${formKey}`);
  } catch {}
}

export async function apiCall<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any,
  timeoutOrOptions: number | ApiCallOptions = 20000
): Promise<T> {
  const timeoutMs = typeof timeoutOrOptions === 'number' ? timeoutOrOptions : (timeoutOrOptions?.timeoutMs ?? 20000);
  const isSilent = typeof timeoutOrOptions === 'object' && Boolean(timeoutOrOptions?.silent);
  const cacheTtl = typeof timeoutOrOptions === 'object' && timeoutOrOptions?.cacheTtlMs !== undefined
    ? timeoutOrOptions.cacheTtlMs
    : (DEFAULT_CACHED_ENDPOINTS[endpoint] || 0);
  const forceRefresh = typeof timeoutOrOptions === 'object' && Boolean(timeoutOrOptions?.forceRefresh);

  // Collapse spam-clicks on mutating calls with identical endpoint and payload
  const isMutating = method !== 'GET';
  const mutationKey = isMutating ? `${method}:${endpoint}:${data ? JSON.stringify(data) : ''}` : null;
  
  if (mutationKey && inFlightMutations.has(mutationKey)) {
    return inFlightMutations.get(mutationKey)! as Promise<T>;
  }

  // Rapid-fire click spam protection (500ms debounce guard per mutating action)
  if (isMutating && mutationKey) {
    const lastCalled = mutatingCooldownMap.get(mutationKey) || 0;
    const now = Date.now();
    if (now - lastCalled < 500) {
      console.warn(`[ApiClient] Spam-click throttled on ${method} ${endpoint}`);
      if (inFlightMutations.has(mutationKey)) {
        return inFlightMutations.get(mutationKey)! as Promise<T>;
      }
      return Promise.resolve({ success: true, throttled: true } as any);
    }
    mutatingCooldownMap.set(mutationKey, now);

    // Invalidate cached GET queries when related mutations occur
    if (endpoint.includes('/languages')) invalidateApiCache('/api/languages');
    if (endpoint.includes('/plans')) invalidateApiCache('/api/plans');
    if (endpoint.includes('/templates')) invalidateApiCache('/api/templates');
  }

  // Client-Side SWR Cache Hit Check for GET requests
  if (method === 'GET' && cacheTtl > 0 && !forceRefresh) {
    const cached = memoryApiCache.get(endpoint);
    const now = Date.now();
    if (cached && now - cached.timestamp < cached.ttlMs) {
      // Background revalidate if older than half TTL (Stale-While-Revalidate)
      if (now - cached.timestamp > cached.ttlMs / 2) {
        setTimeout(() => {
          exec().then(fresh => {
            memoryApiCache.set(endpoint, { data: fresh, timestamp: Date.now(), ttlMs: cacheTtl });
          }).catch(() => {});
        }, 100);
      }
      return Promise.resolve(cached.data as T);
    }
  }

  const exec = async (): Promise<T> => {
    // Immediate Offline Check
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (data && isMutating) {
        saveInputDraft(`last_failed_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, data);
      }
      const netErr = new Error('Thiết bị của bạn đang ở chế độ ngoại tuyến (mất mạng). Dữ liệu được lưu trữ tạm thời.');
      (netErr as any).isOffline = true;
      (netErr as any).isNetworkError = true;
      (netErr as any).preservedPayload = data;
      throw netErr;
    }

    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    // Fallback: If token exists in URL (e.g. from Google OAuth callback), capture and store it immediately
    if (!token && typeof window !== 'undefined') {
      try {
        const urlToken = new URLSearchParams(window.location.search).get('token');
        if (urlToken && urlToken.length > 20) {
          token = urlToken;
          try { localStorage.setItem('token', urlToken); } catch (e) {}
        }
      } catch (e) {}
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Attach CSRF Token for mutating requests if available
    let csrfToken = getCsrfToken();
    if (!csrfToken && method !== 'GET' && typeof window !== 'undefined') {
      try {
        await fetch('/api/languages', { method: 'GET', credentials: 'include' });
        csrfToken = getCsrfToken();
      } catch {}
    }
    if (csrfToken && method !== 'GET') {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Bearer fallback if token exists in localStorage
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const effectiveTimeout = (endpoint.includes('/data-batch') || endpoint.includes('/clear-workspace') || endpoint.includes('/ai'))
      ? Math.max(timeoutMs, 45000)
      : timeoutMs;

    const maxRetries = typeof timeoutOrOptions === 'object' && timeoutOrOptions?.maxRetries !== undefined
      ? timeoutOrOptions.maxRetries
      : 3;
    const baseDelayMs = typeof timeoutOrOptions === 'object' && timeoutOrOptions?.baseDelayMs !== undefined
      ? timeoutOrOptions.baseDelayMs
      : 400;

    let response: Response | null = null;
    let lastError: any = null;

    // Retry Loop with Exponential Backoff + Random Jitter
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const jitter = Math.floor(Math.random() * 250);
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1) + jitter, 4000);
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timeoutId: any = null;
      if (controller) {
        timeoutId = setTimeout(() => {
          controller.abort();
        }, effectiveTimeout);
      }

      const options: RequestInit = {
        method,
        headers,
        credentials: 'include', // Sends HttpOnly cookie automatically
        ...(controller ? { signal: controller.signal } : {})
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      try {
        response = await fetch(endpoint, options);
      } catch (fetchErr: any) {
        if (timeoutId) clearTimeout(timeoutId);
        lastError = fetchErr;

        if (attempt < maxRetries && typeof navigator !== 'undefined' && navigator.onLine !== false) {
          console.warn(`[ApiClient] Retrying (${attempt + 1}/${maxRetries}) after fetch network/timeout error on ${method} ${endpoint}`);
          continue;
        }

        if (data && isMutating) {
          saveInputDraft(`last_failed_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, data);
        }

        if (fetchErr?.name === 'AbortError') {
          const timeoutErr = new Error(`Yêu cầu tới máy chủ quá thời gian chờ (${Math.round(effectiveTimeout / 1000)}s). Dữ liệu nhập của bạn được lưu an toàn. Vui lòng kiểm tra mạng và thử lại.`);
          (timeoutErr as any).isTimeout = true;
          (timeoutErr as any).preservedPayload = data;
          throw timeoutErr;
        }
        if (typeof navigator !== 'undefined' && (!navigator.onLine || (fetchErr instanceof TypeError && (fetchErr.message.includes('fetch') || fetchErr.message.includes('Network'))))) {
          const netErr = new Error('Không thể kết nối đến máy chủ. Kết nối mạng bị gián đoạn, dữ liệu của bạn được bảo toàn.');
          (netErr as any).isNetworkError = true;
          (netErr as any).preservedPayload = data;
          throw netErr;
        }
        (fetchErr as any).preservedPayload = data;
        throw fetchErr;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      // Check if response has retryable status codes (503, 502, 504, 429)
      const isRetryableStatus = response.status === 503 || response.status === 502 || response.status === 504 || response.status === 429;
      if (isRetryableStatus && attempt < maxRetries) {
        if (response.status === 429) {
          const retryAfterSec = Number(response.headers.get('Retry-After'));
          const waitTime = (retryAfterSec && !isNaN(retryAfterSec)) ? retryAfterSec * 1000 : 1200;
          await new Promise(r => setTimeout(r, waitTime + Math.floor(Math.random() * 200)));
        }
        console.warn(`[ApiClient] Retrying (${attempt + 1}/${maxRetries}) on HTTP ${response.status} for ${method} ${endpoint}`);
        continue;
      }

      // Response received and non-retryable or retries exhausted
      break;
    }

    if (!response) {
      if (data && isMutating) {
        saveInputDraft(`last_failed_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, data);
      }
      const fallbackErr = lastError || new Error('Không thể hoàn tất kết nối tới máy chủ sau nhiều lần thử lại.');
      (fallbackErr as any).preservedPayload = data;
      throw fallbackErr;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    let result: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        result = await response.json();
      } catch {
        result = null;
      }
    } else {
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        result = text;
      }
    }

    if (!response.ok) {
      // Only dispatch session-expired if user actively had a token and server confirmed it expired/revoked
      if (response.status === 401 && typeof window !== 'undefined') {
        const isAuthEndpoint = endpoint.includes('/api/auth/login') || endpoint.includes('/api/auth/register');
        const isSilentOrPolling = 
          isSilent || 
          endpoint.includes('/api/auth/me') || 
          endpoint.includes('/api/connect/presence') || 
          endpoint.includes('/api/version') ||
          endpoint.includes('/api/tasks/overview');

        // CRITICAL PROTECTION: Never expire user session or wipe tokens on background polling or silent checks!
        if (!isAuthEndpoint && !isSilentOrPolling) {
          const hadToken = Boolean(localStorage.getItem('token') || localStorage.getItem('lifeos_swr_user'));
          const errorCode = result?.error?.code;
          const isExpiredOrInvalid = 
            errorCode === 'TOKEN_EXPIRED' || 
            errorCode === 'SESSION_REVOKED' || 
            errorCode === 'INVALID_TOKEN' || 
            errorCode === 'NO_TOKEN' || 
            errorCode === 'USER_NOT_FOUND';

          if (hadToken && isExpiredOrInvalid) {
            // Check if user is in an active learning session: if so, protect local session from destruction
            const isStudying = Boolean(
              localStorage.getItem('lifeos_vocab_session_state') ||
              localStorage.getItem('lifeos_pomodoro_active_session') ||
              sessionStorage.getItem('lifeos_active_study')
            );
            if (!isStudying) {
              try { 
                localStorage.removeItem('token'); 
                localStorage.removeItem('lifeos_swr_user');
                localStorage.removeItem('lifeos_swr_collections');
                localStorage.removeItem('lifeos_swr_sub');
              } catch (e) {}
              window.dispatchEvent(
                new CustomEvent('lifeos:session-expired', {
                  detail: {
                    message: (result && result.message) || (result?.error?.message) || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
                  }
                })
              );
            } else {
              console.warn('[ApiClient] Suppressed session expiry kickout because user is actively studying.');
            }
          }
        } else if (isSilentOrPolling) {
          console.warn(`[ApiClient] Suppressed session expiry on silent/polling request: ${endpoint}`);
        }
      }

      let errorMessage = `Yêu cầu thất bại (mã ${response.status})`;
      const rawErrCode = String(result?.error?.code || result?.error?.status || result?.code || '').toUpperCase();
      const isAiOverload =
        endpoint.includes('/ai') &&
        (response.status === 503 || rawErrCode.includes('MODEL_CAPACITY_EXHAUSTED') || rawErrCode === 'UNAVAILABLE');

      if (isAiOverload || rawErrCode.includes('MODEL_CAPACITY_EXHAUSTED')) {
        errorMessage = 'Máy chủ AI hiện đang quá tải. Vui lòng thử lại sau ít phút.';
      } else if (response.status === 429) {
        errorMessage = 'Hệ thống đang tiếp nhận quá nhiều yêu cầu từ bạn. Vui lòng tạm dừng vài giây rồi thử lại.';
      } else if (response.status === 502 || response.status === 503 || response.status === 504) {
        errorMessage = (result?.error?.message && typeof result.error.message === 'string')
          ? result.error.message
          : 'Máy chủ đang tạm thời bảo trì hoặc xử lý. Dữ liệu của bạn được bảo toàn an toàn.';
      } else if (result && typeof result === 'object') {
        if (result.error && typeof result.error === 'object' && result.error.message) {
          errorMessage = String(result.error.message);
        } else if (typeof result.message === 'string' && result.message.trim()) {
          errorMessage = result.message;
        } else if (typeof result.error === 'string' && result.error.trim()) {
          errorMessage = result.error;
        } else {
          try {
            errorMessage = JSON.stringify(result.message || result.error || result);
          } catch {
            errorMessage = `Lỗi hệ thống (${response.status})`;
          }
        }
      } else if (typeof result === 'string' && result.trim()) {
        errorMessage = result;
      }

      const err = new Error(errorMessage);
      (err as any).status = response.status;
      (err as any).data = result;
      (err as any).preservedPayload = data;
      if (data && isMutating) {
        saveInputDraft(`last_failed_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`, data);
      }
      throw err;
    }

    if (isMutating) {
      clearInputDraft(`last_failed_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`);
    }

    if (method === 'GET' && cacheTtl > 0 && result) {
      memoryApiCache.set(endpoint, { data: result, timestamp: Date.now(), ttlMs: cacheTtl });
    }

    return result as T;
  };

  const promise = exec();
  if (mutationKey) {
    inFlightMutations.set(mutationKey, promise);
    promise.finally(() => {
      inFlightMutations.delete(mutationKey);
    });
  }

  return promise;
}
