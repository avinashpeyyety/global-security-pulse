#!/usr/bin/env node
/**
 * Browser handoff ingest — preferred path on Grok box.
 *
 * Headless Playwright against x.com often gets HTTP 403 from datacenter egress.
 * Real box Chrome (computerUse) loads public profiles fine. Chief routine scrolls
 * allowlisted profiles in that UI, writes a handoff JSON, then this script merges.
 *
 * Usage:
 *   npm run ingest:x-scroll:browser
 *   node ingest/x-scroll-browser-handoff.mjs [path/to/handoff.json]
 *
 * Default input: data/raw/x-scroll-browser-latest.json
 *
 * Schema:
 * {
 *   "mode": "browser",
 *   "generatedAt": "ISO-8601",
 *   "pointers": [
 *     {
 *       "author": "BBCWorld",
 *       "title": "headline or short text",   // or "text"
 *       "url": "https://x.com/BBCWorld/status/…",
 *       "observedAt": "ISO-8601?",            // optional
 *       "postId": "123…?"                     // optional; derived from url if omitted
 *     }
 *   ]
 * }
 *
 * No X API. No user-X MCP. No Air required.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stampMeta } from './lib/stamp-meta.mjs';
import {
  root,
  allowlistPath,
  rawDir,
  loadAllowlist,
  allowlistByHandle,
  loadExistingEvents,
  mergeById,
  pointerToEvent,
  normalizeBrowserPointer,
  updateFeedStatus,
  writeRaw,
  writeEventsAndSnapshot,
} from './lib/x-scroll-shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_HANDOFF = path.join(root, 'data/raw/x-scroll-browser-latest.json');

function usage() {
  console.log(`Usage: node ingest/x-scroll-browser-handoff.mjs [handoff.json]
Default: ${path.relative(root, DEFAULT_HANDOFF)}
See docs/x-scroll-browser-example.json for schema.`);
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('-h') || argv.includes('--help')) {
    usage();
    process.exit(0);
  }
  const handoffPath = path.resolve(argv[0] || DEFAULT_HANDOFF);

  if (!fs.existsSync(handoffPath)) {
    console.error(`x-scroll-browser: missing handoff file: ${handoffPath}`);
    console.error('  Chief routine: computerUse Chrome scroll → write JSON → npm run ingest:x-scroll:browser');
    console.error('  Example schema: docs/x-scroll-browser-example.json');
    process.exit(1);
  }
  if (!fs.existsSync(allowlistPath)) {
    console.error('Missing allowlist at', allowlistPath);
    process.exit(1);
  }

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
  } catch (err) {
    console.error(`x-scroll-browser: invalid JSON at ${handoffPath}: ${err.message}`);
    process.exit(1);
  }

  if (!doc || typeof doc !== 'object') {
    console.error('x-scroll-browser: handoff root must be an object');
    process.exit(1);
  }
  if (doc.mode && doc.mode !== 'browser') {
    console.warn(`x-scroll-browser: mode=${doc.mode} (expected "browser") — continuing`);
  }
  const rawPointers = Array.isArray(doc.pointers) ? doc.pointers : null;
  if (!rawPointers) {
    console.error('x-scroll-browser: missing pointers[] array');
    process.exit(1);
  }

  const allowlist = loadAllowlist();
  const byHandle = allowlistByHandle(allowlist);
  const ingestedAt = new Date().toISOString();
  const pointers = [];
  let skipped = 0;
  for (const raw of rawPointers) {
    const ptr = normalizeBrowserPointer(raw, byHandle, ingestedAt);
    if (!ptr) {
      skipped++;
      continue;
    }
    pointers.push(ptr);
  }

  const day = ingestedAt.slice(0, 10).replace(/-/g, '');
  const archiveName = `x-scroll-browser-${day}.json`;
  const rawPath = writeRaw(
    pointers,
    'browser',
    {
      handoffPath: path.relative(root, handoffPath),
      sourceGeneratedAt: doc.generatedAt || null,
      inputCount: rawPointers.length,
      skipped,
    },
    archiveName,
  );

  // Also refresh the canonical latest path if we ingested from elsewhere
  fs.mkdirSync(rawDir, { recursive: true });
  const latestPath = path.join(rawDir, 'x-scroll-browser-latest.json');
  if (path.resolve(handoffPath) !== path.resolve(latestPath)) {
    fs.writeFileSync(
      latestPath,
      JSON.stringify(
        {
          mode: 'browser',
          generatedAt: doc.generatedAt || ingestedAt,
          pointers: rawPointers,
        },
        null,
        2,
      ),
    );
  }

  const incoming = pointers.map(pointerToEvent);
  const existing = loadExistingEvents();
  const { events, added, updated } = mergeById(existing, incoming);
  writeEventsAndSnapshot(events);
  // feeds detail exactly: "browser: N pointers" (plus optional skip note)
  if (fs.existsSync(path.join(root, 'apps/web/public/data/feeds.json'))) {
    const feedsPath = path.join(root, 'apps/web/public/data/feeds.json');
    const feeds = JSON.parse(fs.readFileSync(feedsPath, 'utf8'));
    const now = new Date().toISOString();
    const idx = feeds.findIndex((f) => f.id === 'x-scroll');
    const detail =
      `browser: ${incoming.length} pointers` + (skipped ? ` (${skipped} skipped)` : '');
    const entry = {
      id: 'x-scroll',
      name: 'X allowlist scroll',
      status: incoming.length > 0 ? 'Pass' : 'Warn',
      lastEvaluatedAt: now,
      detail,
      rule: 'allowlist_scroll && merge_by_id',
      snapshot: `x-scroll@${now.slice(0, 10)}`,
    };
    if (idx >= 0) feeds[idx] = entry;
    else feeds.push(entry);
    fs.writeFileSync(feedsPath, JSON.stringify(feeds, null, 2));
  } else {
    updateFeedStatus('browser', incoming.length, skipped ? `${skipped} skipped` : '');
  }

  const um = stampMeta();
  console.log(
    `ingest:x-scroll:browser — ${incoming.length} pointers (added ${added}, updated ${updated}, skipped ${skipped})`,
  );
  console.log(`  handoff ← ${path.relative(root, handoffPath)}`);
  console.log(`  archive → ${path.relative(root, rawPath)}`);
  console.log('No X API credits used. Prefer this path on Grok box (Playwright --live may 403).');
  console.log(`  ${um.updatedAtLabel} · ${um.nextUpdateHint}`);
}

main();
