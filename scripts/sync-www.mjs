#!/usr/bin/env node
/**
 * 把电子门牌的共享资源从「源」同步到 APK 资源目录 www/，并检查两处入口的
 * 共享 JSX 段是否已经漂移。
 *
 *   node scripts/sync-www.mjs          # 同步资产 + 报告漂移
 *   node scripts/sync-www.mjs --check  # 只检查（不改文件），漂移则 exit 1
 *
 * 源（唯一）:
 *   doorplate/door-display.css      → www/door-display.css
 *   lib/scoring-rules.js            → www/lib/scoring-rules.js
 *   node_modules/{react,react-dom}/umd/*.development.js
 *   node_modules/@babel/standalone/babel.min.js
 *                                   → www/vendor/*
 *
 * www/index.html 是 doorplate/index.html 的 kiosk 变体：两者共用同一段
 * 「数据 + 组件」JSX（到 `// APP / TOOLBAR / SCALE` 之前），只有外壳 App
 * 不同。这里比对那一段，防止只改一边。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const p = rel => join(root, rel);

const MARKER = '// APP / TOOLBAR / SCALE';
let failed = false;

function sync(from, to) {
  if (!existsSync(p(from))) {
    console.log(`skip  ${from}（源不存在）`);
    return;
  }
  const src = readFileSync(p(from));
  const same = existsSync(p(to)) && readFileSync(p(to)).equals(src);
  if (same) {
    console.log(`ok    ${to}`);
    return;
  }
  if (checkOnly) {
    console.log(`stale ${to}  ←  ${from}`);
    failed = true;
    return;
  }
  mkdirSync(dirname(p(to)), { recursive: true });
  writeFileSync(p(to), src);
  console.log(`sync  ${from}  →  ${to}`);
}

// 1. 共享资产
sync('doorplate/door-display.css', 'www/door-display.css');
sync('lib/scoring-rules.js', 'www/lib/scoring-rules.js');
sync('node_modules/react/umd/react.development.js', 'www/vendor/react.development.js');
sync('node_modules/react-dom/umd/react-dom.development.js', 'www/vendor/react-dom.development.js');
sync('node_modules/@babel/standalone/babel.min.js', 'www/vendor/babel.min.js');

// 2. 两个入口的共享 JSX 段（数据 + 组件）必须一致
function sharedSection(rel) {
  const lines = readFileSync(p(rel), 'utf8').split('\n');
  const start = lines.findIndex(l => l.includes('<script type="text/babel">'));
  const end = lines.findIndex(l => l.includes(MARKER));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`${rel}: 找不到 <script type="text/babel"> 或 "${MARKER}" 标记`);
  }
  return lines.slice(start + 1, end).join('\n');
}

const preview = sharedSection('doorplate/index.html');
const kiosk = sharedSection('www/index.html');
if (preview === kiosk) {
  console.log('ok    doorplate/index.html 与 www/index.html 共享段一致');
} else {
  const a = preview.split('\n');
  const b = kiosk.split('\n');
  const i = a.findIndex((line, idx) => line !== b[idx]);
  console.log(`DRIFT 共享段已分叉，首个差异在第 ${i + 1} 行（相对共享段起点）:`);
  console.log(`      doorplate: ${a[i]?.trim().slice(0, 100)}`);
  console.log(`      www      : ${b[i]?.trim().slice(0, 100)}`);
  failed = true;
}

if (failed) {
  console.log(checkOnly ? '\n检查未通过。' : '\n仍有漂移需要人工处理（共享段不会自动合并）。');
  process.exit(1);
}
console.log('\nwww/ 与源一致。');
