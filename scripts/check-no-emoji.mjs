#!/usr/bin/env node
// Guard: no emoji anywhere in the project's source. Item pictures are uploaded
// images, status marks are line icons — never emoji characters.
//
//   node scripts/check-no-emoji.mjs            scan tracked files (pre-commit / CI)
//   node scripts/check-no-emoji.mjs --staged   scan only what is staged
//
// Typographic symbols (— – … ₹ ✓ × → •) are fine; only pictographic emoji are
// flagged: anything rendered as a colour picture, and ZWJ / variation-selector
// sequences.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️|[\u{1F1E6}-\u{1F1FF}]/u;
const TEXT_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.html', '.css', '.md', '.txt', '.yml', '.yaml', '.sh', '.env', '.example']);
// Documentation screenshots/exports and third-party content are not product text.
const SKIP = [/^package-lock\.json$/, /(^|\/)node_modules\//, /^docs\/.*\.pdf$/, /(^|\/)dist\//, /(^|\/)\.git\//, /^scripts\/check-no-emoji\.mjs$/];

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const staged = process.argv.includes('--staged');
const list = execFileSync('git', staged ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR'] : ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const hits = [];
for (const rel of list) {
  const norm = rel.replace(/\\/g, '/');
  if (SKIP.some((re) => re.test(norm)) || !TEXT_EXT.has(path.extname(norm).toLowerCase())) continue;
  const full = path.join(root, norm);
  if (!fs.existsSync(full)) continue;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(EMOJI);
    if (m) hits.push(`${norm}:${i + 1}  ${m[0]}  ${line.trim().slice(0, 90)}`);
  });
}

if (hits.length) {
  console.error(`Emoji found in ${hits.length} place(s). Use an uploaded picture or a lucide icon instead:\n`);
  console.error(hits.slice(0, Number(process.env.EMOJI_LIMIT || 60)).join('\n'));
  if (hits.length > Number(process.env.EMOJI_LIMIT || 60)) console.error(`... and ${hits.length - 60} more`);
  process.exit(1);
}
console.log('check-no-emoji: clean');
