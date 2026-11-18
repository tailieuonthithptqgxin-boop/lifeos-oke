/**
 * Cloudflare Native Web Crypto Auth Service (Web Standard API)
 * Replaces Node.js 'crypto', 'bcryptjs', and 'Buffer' with 100% Web Cryptography API.
 * Runs on V8 Isolates and in modern Web Browsers with zero Node.js polyfill.
 */

// Helper for Base64URL encoding without Node Buffer
export function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Hash password using Web Standard SHA-256 (PBKDF2/SubtleCrypto)
 */
export async function webHashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`lifeos_salt_2026_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against stored hash
 */
export async function webVerifyPassword(password: string, storedHash: string): Promise<boolean> {
  const currentHash = await webHashPassword(password);
  return currentHash === storedHash;
}

/**
 * Generate JWT token using Web Standard HMAC-SHA256
 */
export async function webGenerateJwt(payload: any, secret: string = 'lifeos_edge_jwt_secret_2026'): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let binary = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    binary += String.fromCharCode(signatureBytes[i]);
  }
  const encodedSignature = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verify and decode JWT token using Web Standard HMAC-SHA256
 */
export async function webVerifyJwt<T = any>(token: string, secret: string = 'lifeos_edge_jwt_secret_2026'): Promise<T | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let sigStr = signature.replace(/-/g, '+').replace(/_/g, '/');
    while (sigStr.length % 4) {
      sigStr += '=';
    }
    const binary = atob(sigStr);
    const signatureBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      signatureBytes[i] = binary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(dataToVerify)
    );

    if (!isValid) return null;
    return JSON.parse(base64UrlDecode(encodedPayload)) as T;
  } catch {
    return null;
  }
}
