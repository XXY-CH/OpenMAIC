#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const candidates = [
  '.open-next/worker.js',
  '.open-next/worker.mjs',
  '.open-next/worker/index.js',
  '.open-next/worker/index.mjs',
];

const foundMain = candidates.find((p) => existsSync(p));

if (!foundMain) {
  console.error(
    '[cloudflare-deploy] 找不到 OpenNext Worker 入口文件。请先执行: pnpm dlx opennextjs-cloudflare build',
  );
  process.exit(1);
}

if (!existsSync('wrangler.toml')) {
  console.error('[cloudflare-deploy] 找不到 wrangler.toml（需要在仓库根目录）。');
  process.exit(1);
}

const original = readFileSync('wrangler.toml', 'utf8');
const replaced = original.match(/^main\s*=\s*".*"\s*$/m)
  ? original.replace(/^main\s*=\s*".*"\s*$/m, `main = "${foundMain}"`)
  : `main = "${foundMain}"\n${original}`;

const generated = '.wrangler.autogen.toml';
writeFileSync(generated, replaced);

console.log(`[cloudflare-deploy] 使用入口: ${foundMain}`);

const result = spawnSync('npx', ['wrangler', 'deploy', '--config', generated], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
