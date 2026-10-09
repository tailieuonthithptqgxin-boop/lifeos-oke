import { spawn } from 'child_process';

// Check if tsx loader or runtime is already active
const isTsxRunning = Boolean(
  process.env.__TSX_BOOTSTRAPPED__ ||
  process.env.TSX_TSCONFIG_PATH ||
  (process as any).loadTsx ||
  process.execArgv.some(arg => arg.includes('tsx') || arg.includes('loader.mjs') || arg.includes('preflight.cjs'))
);

if (!isTsxRunning) {
  const child = spawn(process.execPath, ['--import', 'tsx', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, __TSX_BOOTSTRAPPED__: '1' }
  });

  const forward = (sig: NodeJS.Signals) => {
    if (!child.killed) child.kill(sig);
  };
  process.on('SIGTERM', () => forward('SIGTERM'));
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGHUP', () => forward('SIGHUP'));
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  // Execute application entry point directly in current process
  await import('./src/backend/serverMain.js');
}

