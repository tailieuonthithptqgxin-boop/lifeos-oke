import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isModelCapacityExhausted,
  classifyGeminiError,
  calculateBackoffWithJitter,
  FRIENDLY_503_MESSAGE,
} from '../../src/lib/geminiClient.js';

test('Gemini 503 Resilience Suite - Accurate 503 / MODEL_CAPACITY_EXHAUSTED / UNAVAILABLE Detection', () => {
  // 1. Detect HTTP 503 directly
  assert.equal(isModelCapacityExhausted(503, {}), true);

  // 2. Detect MODEL_CAPACITY_EXHAUSTED in body
  assert.equal(
    isModelCapacityExhausted(500, {
      error: { code: 503, status: 'UNAVAILABLE', message: 'MODEL_CAPACITY_EXHAUSTED: No capacity available' },
    }),
    true
  );

  // 3. Detect UNAVAILABLE status
  assert.equal(
    isModelCapacityExhausted(503, {
      error: { status: 'UNAVAILABLE', message: 'The model is currently overloaded.' },
    }),
    true
  );

  // 4. Distinguish from 400 / 401 / 429
  assert.equal(isModelCapacityExhausted(400, { error: { status: 'INVALID_ARGUMENT' } }), false);
  assert.equal(isModelCapacityExhausted(401, { error: { status: 'UNAUTHENTICATED' } }), false);
  assert.equal(isModelCapacityExhausted(429, { error: { status: 'RESOURCE_EXHAUSTED' } }), false);
});

test('Gemini 503 Resilience Suite - Error Classification & Friendly Vietnamese Message', () => {
  // Server Overload (503)
  const overload = classifyGeminiError(503, {
    error: { status: 'UNAVAILABLE', message: 'MODEL_CAPACITY_EXHAUSTED' },
  });
  assert.equal(overload.category, 'SERVER_OVERLOAD');
  assert.equal(overload.errorCode, 'MODEL_CAPACITY_EXHAUSTED');
  assert.equal(overload.userFriendlyMessage, FRIENDLY_503_MESSAGE);
  assert.equal(overload.isRetryable, true);
  assert.equal(overload.shouldFallbackModel, true);

  // Quota / Rate Limit (429)
  const quota = classifyGeminiError(429, {
    error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' },
  });
  assert.equal(quota.category, 'QUOTA_LIMIT');
  assert.equal(quota.isRetryable, false);
  assert.equal(quota.shouldFallbackModel, true);

  // Auth Error (401/403)
  const auth = classifyGeminiError(401, {
    error: { status: 'UNAUTHENTICATED', message: 'API_KEY_INVALID' },
  });
  assert.equal(auth.category, 'AUTH_ERROR');
  assert.equal(auth.isRetryable, false);
  assert.equal(auth.shouldFallbackModel, false);

  // User Input Error (400)
  const inputErr = classifyGeminiError(400, {
    error: { status: 'INVALID_ARGUMENT', message: 'Prompt is empty' },
  });
  assert.equal(inputErr.category, 'USER_INPUT_ERROR');
  assert.equal(inputErr.isRetryable, false);
  assert.equal(inputErr.shouldFallbackModel, false);
});

test('Gemini 503 Resilience Suite - Exponential Backoff with Random Jitter bounds', () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const delay = calculateBackoffWithJitter(attempt, 800, 8000, 450);
    const minExpected = 800 * Math.pow(2, attempt);
    const maxExpected = minExpected + 450;
    assert.ok(
      delay >= minExpected && delay <= maxExpected,
      `Attempt ${attempt} delay ${delay}ms should be within [${minExpected}, ${maxExpected}]`
    );
  }
});
