import { spawn } from 'node:child_process';

// Banner after Next finishes booting
const APP_NAME = 'Click-to-Call Portal';

function printBanner(url) {
  const lines = [];
  lines.push(`${APP_NAME} is running ✅`);
  if (url) lines.push(`Local: ${url}`);
  lines.push(`Env: ${process.env.NODE_ENV ?? 'development'}`);
  // Match the spirit of the user request: show something "strt my appliaction"
  lines.push('strt my appliaction');
  console.log(lines.join('\n'));
}

const childEnv = { ...process.env };
// Ensure we use the correct environment for Next (include process.env after parsing .env.local)
// so that API routes see DB_* variables at runtime.

// Manually load .env.local into the spawned process (dotenv dependency is not installed).
// Format is simple KEY=VALUE per line.
try {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const envPath = path.default.join(process.cwd(), '.env.local');
  if (fs.default.existsSync(envPath)) {
    const raw = fs.default.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (k) childEnv[k] = v;
    });
  }
} catch {}

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: childEnv,
});


let lastLocalUrl;

const parseLine = (line) => {
  // Next prints: "Local: http://localhost:3002"
  const m = line.match(/Local:\s*(https?:\/\/[^\s]+)/i);
  if (m) {
    lastLocalUrl = m[1];
  }

  // Also accept the "Ready in ..." moment
  if (/Ready in/i.test(line) && lastLocalUrl) {
    printBanner(lastLocalUrl);
  }
};

child.stdout.on('data', (buf) => {
  const s = buf.toString();
  process.stdout.write(s);
  s.split(/\r?\n/).forEach((line) => {
    if (line.trim()) parseLine(line);
  });
});

child.stderr.on('data', (buf) => {
  process.stderr.write(buf);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

