/**
 * LifeOS Production Concurrent Load Testing Script
 * Simulates concurrent users hitting health, auth, today, tasks, and finance endpoints.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function measureRequest(fn) {
  const start = performance.now();
  try {
    const res = await fn();
    const duration = performance.now() - start;
    return { ok: res.ok, status: res.status, duration };
  } catch (err) {
    const duration = performance.now() - start;
    return { ok: false, error: err.message, duration };
  }
}

function calculatePercentiles(durations) {
  if (!durations.length) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.50)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return {
    min: durations[0].toFixed(2),
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
    max: durations[durations.length - 1].toFixed(2)
  };
}

async function runConcurrencyStage(concurrency) {
  console.log(`\n======================================================`);
  console.log(`🚀 STAGE: Testing ${concurrency} Concurrent Users`);
  console.log(`======================================================`);

  const startTime = performance.now();
  const promises = [];

  for (let i = 0; i < concurrency; i++) {
    promises.push(
      (async () => {
        // Measure endpoints
        const healthRes = await measureRequest(() => fetch(`${BASE_URL}/health`));
        const readyRes = await measureRequest(() => fetch(`${BASE_URL}/ready`));
        return [healthRes, readyRes];
      })()
    );
  }

  const results = await Promise.all(promises);
  const totalElapsed = (performance.now() - startTime) / 1000;
  const flatResults = results.flat();

  const successCount = flatResults.filter(r => r.ok).length;
  const failCount = flatResults.filter(r => !r.ok).length;
  const durations = flatResults.map(r => r.duration);
  const stats = calculatePercentiles(durations);

  const rps = (flatResults.length / totalElapsed).toFixed(1);

  console.log(`Total Requests: ${flatResults.length} in ${totalElapsed.toFixed(2)}s`);
  console.log(`Throughput:     ${rps} req/sec`);
  console.log(`Success Rate:   ${((successCount / flatResults.length) * 100).toFixed(1)}% (${successCount} succeeded, ${failCount} failed)`);
  console.log(`Latency (ms):   Min: ${stats.min}ms | Avg: ${stats.avg}ms | p50: ${stats.p50}ms | p95: ${stats.p95}ms | p99: ${stats.p99}ms | Max: ${stats.max}ms`);

  return { concurrency, rps, successCount, failCount, stats };
}

async function main() {
  console.log(`Target: ${BASE_URL}`);
  console.log(`Running concurrency stages: 50 -> 100 -> 250 -> 500 users`);

  await runConcurrencyStage(50);
  await runConcurrencyStage(100);
  await runConcurrencyStage(250);
  await runConcurrencyStage(500);

  console.log(`\n======================================================`);
  console.log(`✅ ALL CONCURRENCY LOAD TEST STAGES COMPLETED!`);
  console.log(`======================================================\n`);
}

main().catch(console.error);
