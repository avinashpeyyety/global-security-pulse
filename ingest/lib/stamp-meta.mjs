/**
 * Stamp apps/web/public/data/meta.json + snapshot updatedAt / nextUpdate* fields.
 * Call after any ingest that refreshes public data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataUpdateMeta } from './schedule.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const publicData = path.join(root, 'apps/web/public/data');
const metaPath = path.join(publicData, 'meta.json');
const snapshotPath = path.join(publicData, 'snapshot.json');

export function stampMeta(at = new Date(), extra = {}) {
  fs.mkdirSync(publicData, { recursive: true });
  const meta = { ...buildDataUpdateMeta(at), ...extra };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

  if (fs.existsSync(snapshotPath)) {
    const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    snap.updatedAt = meta.updatedAt;
    snap.nextUpdateAt = meta.nextUpdateAt;
    snap.nextUpdateHint = meta.nextUpdateHint;
    snap.generatedAt = meta.updatedAt;
    fs.writeFileSync(snapshotPath, JSON.stringify(snap, null, 2));
  }

  return meta;
}

// CLI: node ingest/lib/stamp-meta.mjs
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('stamp-meta.mjs')) {
  const meta = stampMeta();
  console.log(`stamp-meta: ${meta.updatedAtLabel} · ${meta.nextUpdateHint}`);
}
