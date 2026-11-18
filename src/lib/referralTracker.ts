/**
 * Referral Tracking Service (Client-Side)
 * - Captures ?ref=... parameter from landing URL
 * - Persists in localStorage with 30-day expiration window
 * - Prevents losing customer attribution across page navigations and browser sessions
 */

const REFERRAL_CODE_KEY = 'lifeos_referral_code';
const REFERRAL_EXP_KEY = 'lifeos_referral_expires';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function cleanReferralCode(code?: string | null): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20);
}

export function saveReferralTracking(rawCode: string): boolean {
  if (typeof window === 'undefined') return false;
  const code = cleanReferralCode(rawCode);
  if (!code || code.length < 3) return false;

  try {
    const expiresAt = Date.now() + THIRTY_DAYS_MS;
    localStorage.setItem(REFERRAL_CODE_KEY, code);
    localStorage.setItem(REFERRAL_EXP_KEY, String(expiresAt));
    return true;
  } catch (err) {
    console.warn('[ReferralTracker] Could not save referral code to storage:', err);
    return false;
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = localStorage.getItem(REFERRAL_CODE_KEY);
    const expStr = localStorage.getItem(REFERRAL_EXP_KEY);
    if (!code) return null;

    if (expStr) {
      const expTime = parseInt(expStr, 10);
      if (!isNaN(expTime) && Date.now() > expTime) {
        clearStoredReferralCode();
        return null;
      }
    }

    return cleanReferralCode(code);
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_CODE_KEY);
    localStorage.removeItem(REFERRAL_EXP_KEY);
  } catch {}
}

export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || params.get('affiliate') || params.get('aff');
    if (refParam) {
      const cleaned = cleanReferralCode(refParam);
      if (cleaned) {
        saveReferralTracking(cleaned);
        return cleaned;
      }
    }
    return getStoredReferralCode();
  } catch {
    return null;
  }
}
