#!/usr/bin/env node
/**
 * X allowlist scroll — DRY RUN
 * Reads allowlist.yaml and writes sample pointers to data/ingest/x-pointers.jsonl.
 * Does NOT call X search_posts_all or any paid X API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const allowlistPath = path.join(__dirname, '../allowlist.yaml');
const outDir = path.join(root, 'data/ingest');
const outFile = path.join(outDir, 'x-pointers.jsonl');

function parseAllowlist(text) {
  const accounts = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\t/g, '  ');
    const handle = line.match(/^\s*-\s*handle:\s*(\S+)/);
    if (handle) {
      current = { handle: handle[1], category: 'unknown', reliability: 'C' };
      accounts.push(current);
      continue;
    }
    if (!current) continue;
    const cat = line.match(/^\s*category:\s*(\S+)/);
    if (cat) current.category = cat[1];
    const rel = line.match(/^\s*reliability:\s*(\S+)/);
    if (rel) current.reliability = rel[1];
  }
  return accounts;
}

function samplePointer(account, i) {
  const now = new Date();
  const observed = new Date(now.getTime() - i * 3600e3);
  const id = `dry_${account.handle}_${observed.getTime()}`;
  return {
    id,
    postId: `sample_${account.handle}_${i}`,
    author: account.handle,
    category: account.category,
    reliability: account.reliability,
    text: `[dry-run] Placeholder pointer from @${account.handle} (${account.category}). Replace via Playwright scroll.`,
    url: `https://x.com/${account.handle}/status/sample_${i}`,
    observedAt: observed.toISOString(),
    ingestedAt: now.toISOString(),
    geoMentions: [],
    mode: 'dry-run',
  };
}

function main() {
  if (!fs.existsSync(allowlistPath)) {
    console.error('Missing allowlist.yaml at', allowlistPath);
    process.exit(1);
  }
  const yaml = fs.readFileSync(allowlistPath, 'utf8');
  const accounts = parseAllowlist(yaml);
  if (accounts.length === 0) {
    console.error('No accounts parsed from allowlist');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const lines = [];
  // 1 sample pointer per account for dry-run
  accounts.forEach((a, i) => lines.push(JSON.stringify(samplePointer(a, i))));
  fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');

  console.log(`x-scroll dry-run: wrote ${lines.length} pointers → ${path.relative(root, outFile)}`);
  console.log('No X API called. Live scroll: see agents/x-scroll/README.md');
}

main();
