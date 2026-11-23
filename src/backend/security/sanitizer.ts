import { Request, Response, NextFunction } from 'express';

/**
 * Sanitize a string against dangerous HTML/script tags, pseudo-protocols, and event handlers.
 * Employs iterative parsing to prevent nested bypass vectors (e.g., <scr<script>ipt>).
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  
  let cleaned = val
    // Remove null bytes
    .replace(/\0/g, '')
    // Strip dangerous pseudo-protocols
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '');

  // Iteratively strip dangerous tags & their inner contents for executable containers (<script>, <iframe>, <style>)
  let prev: string;
  let iterations = 0;
  do {
    prev = cleaned;
    // Strip script blocks and their executable content entirely
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Strip iframe blocks and their content
    cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // Strip style blocks and their content
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    // Strip dangerous tags (including unclosed tags or isolated tags)
    cleaned = cleaned.replace(/<\/?(script|iframe|object|embed|applet|meta|link|style|base|form|input|button)\b[^>]*>/gi, '');
    // Strip tags with inline event handlers
    cleaned = cleaned.replace(/<[a-z0-9_-]+\b[^>]*?\bon\w+\s*=[^>]*>/gi, '');
    // Strip dangling event handler attributes
    cleaned = cleaned.replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
    // Strip incomplete or dangling tag fragments (e.g., <scr from nested script evasion)
    cleaned = cleaned.replace(/<\/?(scr|script|iframe|style|object|embed|applet)?$/gi, '');
    iterations++;
  } while (cleaned !== prev && iterations < 10);

  return cleaned.trim();
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
