/**
 * start.js — Safe server launcher
 * Kills any process on PORT before starting, preventing EADDRINUSE crashes.
 */
import { execSync, spawn } from 'child_process';

const PORT = process.env.PORT || 5000;

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execSync(
        `netstat -ano | findstr :${port}`,
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
      );
      const lines = result.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0' && pid !== String(process.pid)) pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`✅ Killed PID ${pid} on port ${port}`);
        } catch (_) {}
      }
    } else {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`);
    }
  } catch (_) {
    // No process on port — fine
  }
}

console.log(`🔍 Checking port ${PORT}...`);
killPort(PORT);

console.log(`🚀 Starting server on port ${PORT}...`);
const child = spawn('node', ['server.js'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
