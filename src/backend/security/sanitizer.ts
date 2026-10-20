import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize a string against dangerous HTML/script tags and event handlers.
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  
  return val
    // Remove null bytes
    .replace(/\0/g, '')
    // Strip <script>...</script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip javascript: pseudo protocol
    .replace(/javascript:/gi, '')
    // Strip common dangerous event handlers (onerror, onload, onclick, onmouseover)
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Deep recursive sanitizer for request bodies, query params, and route parameters.
 */
export function deepSanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitize(item));
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleaned[key] = deepSanitize(value);
    }
    return cleaned;
  }

  return obj;
}

/**
 * Express middleware to sanitize all incoming body, query, and params.
 */
export function sanitizeInputMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = deepSanitize(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = deepSanitize(req.params);
  }
  next();
}
