/**
 * Production API Client for LifeOS
 * Uses HTTP-Only Cookie session authentication by default, with Bearer header fallback.
 */

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lifeos_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiCall<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: any
): Promise<T> {
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

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include' // Sends HttpOnly cookie automatically
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  let result: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    result = await response.json();
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
      const hadToken = Boolean(localStorage.getItem('token'));
      const errorCode = result?.error?.code;
      if (!isAuthEndpoint && hadToken && (errorCode === 'TOKEN_EXPIRED' || errorCode === 'SESSION_REVOKED')) {
        try { localStorage.removeItem('token'); } catch (e) {}
        window.dispatchEvent(
          new CustomEvent('lifeos:session-expired', {
            detail: {
              message: (result && result.message) || (result?.error?.message) || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'
            }
          })
        );
      }
    }

    let errorMessage = `Yêu cầu thất bại (mã ${response.status})`;
    if (result && typeof result === 'object') {
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
    throw err;
  }

  return result as T;
}
