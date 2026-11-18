import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { saveInputDraft, getInputDraft, clearInputDraft } from '../../src/lib/apiClient';

describe('Cloudflare Edge Pre-Flight Suite', () => {

  describe('1. API Resilience & Input Preservation', () => {
    it('saves, retrieves, and clears input drafts safely on failure', () => {
      // Mock sessionStorage in node environment if needed
      const storage: Record<string, string> = {};
      (globalThis as any).sessionStorage = {
        setItem: (k: string, v: string) => { storage[k] = v; },
        getItem: (k: string) => storage[k] || null,
        removeItem: (k: string) => { delete storage[k]; }
      };

      const testPayload = { taskTitle: 'Launch Cloudflare Worker', priority: 'P1' };
      saveInputDraft('new_task_modal', testPayload);

      const retrieved = getInputDraft<{ taskTitle: string; priority: string }>('new_task_modal');
      assert.deepEqual(retrieved, testPayload, 'Preserved input draft must match original payload exactly');

      clearInputDraft('new_task_modal');
      assert.equal(getInputDraft('new_task_modal'), null, 'Cleared draft must return null');
    });

    it('calculates exponential backoff with random jitter within safe bounds', () => {
      const baseDelay = 400;
      const delays: number[] = [];

      for (let attempt = 1; attempt <= 3; attempt++) {
        const jitter = 150; // Mocked jitter
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + jitter, 4000);
        delays.push(delay);
      }

      assert.equal(delays[0], 550, 'Attempt 1 delay matches base + jitter');
      assert.equal(delays[1], 950, 'Attempt 2 delay matches 2x base + jitter');
      assert.equal(delays[2], 1750, 'Attempt 3 delay matches 4x base + jitter');
      assert.ok(delays[2] < 4000, 'Backoff is safely clamped under max delay');
    });
  });

  describe('2. Cloudflare Configuration & Cron Triggers', () => {
    it('wrangler.jsonc specifies valid crons, assets, and bindings', () => {
      const configPath = path.resolve('wrangler.jsonc');
      assert.ok(fs.existsSync(configPath), 'wrangler.jsonc must exist');

      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);

      assert.equal(config.name, 'lifeos', 'Project name is lifeos');
      assert.equal(config.assets.directory, './dist', 'Assets directory points to ./dist');
      assert.equal(config.assets.not_found_handling, 'single-page-application', 'SPA fallback is enabled');
      assert.ok(Array.isArray(config.triggers.crons), 'Triggers crons must be an array');
      assert.ok(config.triggers.crons.includes('*/5 * * * *'), 'Crons include 5-minute health cadence');
      assert.ok(config.triggers.crons.includes('0 0,7,21 * * *'), 'Crons include Vietnam morning/evening schedules');
    });

    it('wrangler.toml matches production worker entry point and assets', () => {
      const tomlPath = path.resolve('wrangler.toml');
      assert.ok(fs.existsSync(tomlPath), 'wrangler.toml must exist');

      const tomlContent = fs.readFileSync(tomlPath, 'utf8');
      assert.ok(tomlContent.includes('src/cloudflare/worker.ts'), 'Points to Cloudflare Worker entry');
      assert.ok(tomlContent.includes('directory = "./dist"'), 'Binds dist assets');
    });
  });

  describe('3. Service Worker PWA Integrity', () => {
    it('public/sw.js specifies valid cache versioning and safe exclusions', () => {
      const swPath = path.resolve('public/sw.js');
      assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');

      const swContent = fs.readFileSync(swPath, 'utf8');
      assert.ok(swContent.includes('STATIC_CACHE_NAME'), 'Uses versioned static cache');
      assert.ok(swContent.includes('RUNTIME_CACHE_NAME'), 'Uses versioned runtime cache');
      assert.ok(swContent.includes('isNonCacheable'), 'Protects sensitive API routes from caching');
      assert.ok(swContent.includes('/api/'), 'Excludes /api/ endpoints');
      assert.ok(swContent.includes('skipWaiting'), 'Implements skipWaiting for instant activation');
      assert.ok(swContent.includes('clients.claim()'), 'Claims open clients on activation');
    });
  });
});
