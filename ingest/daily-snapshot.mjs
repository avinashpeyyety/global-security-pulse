#!/usr/bin/env node
/**
 * Daily report snapshot — archives current dashboard public/data into
 *   reports/daily/YYYY-MM-DD/          (git-versioned history)
 *   apps/web/public/reports/daily/…    (Pages-served copy)
 * Updates:
 *   reports/daily/index.json
 *   apps/web/public/data/reports-index.json
 *
 * Usage:
 *   npm run report:daily
 *   node ingest/daily-snapshot.mjs [--date YYYY-MM-DD] [--with-ingest]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicData = path.join(root, 'apps/web/public/data');
const archiveRoot = path.join(root, 'reports/daily');
const publicReports = path.join(root, 'apps/web/public/reports/daily');

const FILES = [
  'events.json',
  'postures.json',
  'anomalies.json',
  'stress.json',
  'series.json',
  'feeds.json',
  'hotspots.json',
  'supply-routes.json',
  'snapshot.json',
];

function parseArgs(argv) {
  const out = { date: null, withIngest: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date' && argv[i + 1]) out.date = argv[++i];
    if (argv[i] === '--with-ingest') out.withIngest = true;
  }
  return out;
}

function readJson(file, fallback = null) {
  const p = path.join(publicData, file);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function absZ(a) {
  return Math.abs(Number(a.zScore) || 0);
}

function buildMarkdown({ date, events, postures, anomalies, stress, feeds, supply, meta }) {
  const topAnoms = [...(anomalies || [])].sort((a, b) => absZ(b) - absZ(a)).slice(0, 8);
  const hiEvents = (events || []).filter((e) =>
    ['high', 'critical'].includes(e.falloutRisk || (e.severity >= 4 ? 'high' : 'low')),
  );
  const hiPostures = (postures || []).filter((p) =>
    ['high', 'critical'].includes(p.precipitatePotential),
  );

  const lines = [
    `# Global Security Pulse — Daily Report ${date}`,
    '',
    `Generated: ${meta.generatedAt}`,
    `Ingest package: ${meta.packageId}`,
    '',
    '## Stress composite',
    '',
    stress
      ? `- **Score:** ${stress.score} (equities ${stress.components?.equities}, USD ${stress.components?.usd}, VIX ${stress.components?.vix}, oil ${stress.components?.oil})`
      : '- Stress data unavailable',
    stress?.evaluatedAt ? `- Evaluated at: ${stress.evaluatedAt}` : '',
    stress?.rule ? `- Rule: \`${stress.rule}\`` : '',
    '',
    '## Top anomalies (|z|)',
    '',
  ];

  if (!topAnoms.length) lines.push('_No anomalies._');
  else {
    lines.push('| Series | z | 1d% | 5d% | Streak |');
    lines.push('|--------|---|-----|-----|--------|');
    for (const a of topAnoms) {
      lines.push(
        `| ${a.seriesName || a.seriesId} | ${a.zScore} | ${a.pctChange1d} | ${a.pctChange5d} | ${a.adverseStreak} |`,
      );
    }
  }

  lines.push('', '## High / critical fallout events', '');
  if (!hiEvents.length) lines.push('_None in current snapshot._');
  else {
    for (const e of hiEvents.slice(0, 15)) {
      lines.push(
        `- **[${e.falloutRisk || 'n/a'}]** ${e.title} — ${e.region || '?'} (${e.source || '?'}${e.url ? `; [link](${e.url})` : ''})`,
      );
    }
  }

  lines.push('', '## High / critical postures', '');
  if (!hiPostures.length) lines.push('_None in current snapshot._');
  else {
    for (const p of hiPostures.slice(0, 12)) {
      lines.push(
        `- **[${p.precipitatePotential}]** ${p.title} — ${p.region || '?'} (${(p.actors || []).join(', ') || p.source})`,
      );
    }
  }

  lines.push('', '## Supply routes (metadata)', '');
  const routes = Array.isArray(supply) ? supply : supply?.routes || [];
  if (!routes.length) lines.push('_No supply-route metadata._');
  else {
    for (const r of routes.slice(0, 20)) {
      lines.push(`- **${r.name || r.id}** (${r.kind || r.type || '?'}) — ${r.status || r.note || 'tracked'}`);
    }
  }

  lines.push('', '## Feed status', '');
  for (const f of feeds || []) {
    lines.push(
      `- ${f.name || f.id}: **${f.status}** @ ${f.lastEvaluatedAt || 'n/a'}${f.detail ? ` — ${f.detail}` : ''}`,
    );
  }

  lines.push(
    '',
    '## Notes',
    '',
    '- Snapshot archived under `reports/daily/` (git history) and mirrored to `apps/web/public/reports/daily/` for Pages.',
    '- Weekday / evening routine should run `npm run report:daily` (optionally after `npm run ingest:all`) and commit.',
    '',
  );

  return lines.filter((l) => l !== undefined).join('\n');
}

function ensureDirs(...dirs) {
  for (const d of dirs) fs.mkdirSync(d, { recursive: true });
}

function copyDataFiles(destDir) {
  ensureDirs(destDir);
  const copied = [];
  for (const file of FILES) {
    const src = path.join(publicData, file);
    if (!fs.existsSync(src)) continue;
    fs.copyFileSync(src, path.join(destDir, file));
    copied.push(file);
  }
  return copied;
}

function updateIndex(date, meta) {
  ensureDirs(archiveRoot);
  const indexPath = path.join(archiveRoot, 'index.json');
  let index = { updatedAt: meta.generatedAt, dates: [] };
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {
      /* keep default */
    }
  }
  const entry = {
    date,
    path: `reports/daily/${date}/`,
    publicPath: `reports/daily/${date}/`,
    generatedAt: meta.generatedAt,
    packageId: meta.packageId,
    stressScore: meta.stressScore,
    eventCount: meta.eventCount,
    anomalyCount: meta.anomalyCount,
  };
  const dates = (index.dates || []).filter((d) => d.date !== date);
  dates.push(entry);
  dates.sort((a, b) => (a.date < b.date ? 1 : -1));
  index.updatedAt = meta.generatedAt;
  index.dates = dates.slice(0, 90);
  index.latest = dates[0]?.date || date;
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  const publicIndex = path.join(publicData, 'reports-index.json');
  fs.writeFileSync(publicIndex, JSON.stringify(index, null, 2));
  return index;
}

function runIngestAll() {
  console.log('report:daily — running ingest:all first…');
  const r = spawnSync('npm', ['run', 'ingest:all'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    console.warn('report:daily — ingest:all exited non-zero; snapshotting whatever is in public/data');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.withIngest) runIngestAll();

  const date = args.date || new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();
  const packageId = `daily-${date}`;

  const events = readJson('events.json', []);
  const postures = readJson('postures.json', []);
  const anomalies = readJson('anomalies.json', []);
  const stress = readJson('stress.json', null);
  const feeds = readJson('feeds.json', []);
  const supply = readJson('supply-routes.json', []);
  const hotspots = readJson('hotspots.json', []);
  const snapshot = readJson('snapshot.json', null);

  const meta = {
    date,
    generatedAt,
    packageId,
    stressScore: stress?.score ?? null,
    eventCount: Array.isArray(events) ? events.length : 0,
    postureCount: Array.isArray(postures) ? postures.length : 0,
    anomalyCount: Array.isArray(anomalies) ? anomalies.length : 0,
    feedStatuses: (feeds || []).map((f) => ({ id: f.id, status: f.status, at: f.lastEvaluatedAt })),
    snapshotGeneratedAt: snapshot?.generatedAt || null,
    files: FILES.filter((f) => fs.existsSync(path.join(publicData, f))),
  };

  const archiveDir = path.join(archiveRoot, date);
  const publicDir = path.join(publicReports, date);
  ensureDirs(archiveDir, publicDir);

  const copied = copyDataFiles(archiveDir);
  copyDataFiles(publicDir);

  const reportMd = buildMarkdown({ date, events, postures, anomalies, stress, feeds, supply, meta });
  fs.writeFileSync(path.join(archiveDir, 'report.md'), reportMd);
  fs.writeFileSync(path.join(publicDir, 'report.md'), reportMd);
  fs.writeFileSync(path.join(archiveDir, 'meta.json'), JSON.stringify(meta, null, 2));
  fs.writeFileSync(path.join(publicDir, 'meta.json'), JSON.stringify(meta, null, 2));

  // Compact pack for UI swap (avoid shipping full series twice if huge — still include stress/events/etc.)
  const pack = {
    generatedAt,
    date,
    packageId,
    events,
    postures,
    anomalies,
    stress,
    feeds,
    hotspots,
    supplyRoutes: supply,
    series: readJson('series.json', []),
    timeWindows: ['6h', '24h', '7d', '30d'],
  };
  fs.writeFileSync(path.join(archiveDir, 'pack.json'), JSON.stringify(pack, null, 2));
  fs.writeFileSync(path.join(publicDir, 'pack.json'), JSON.stringify(pack, null, 2));

  const index = updateIndex(date, meta);

  console.log(`report:daily Pass — ${date}`);
  console.log(`  archive: reports/daily/${date}/ (${copied.length} data files + report.md + meta.json + pack.json)`);
  console.log(`  public:  apps/web/public/reports/daily/${date}/`);
  console.log(`  index:   ${index.dates.length} dates (latest ${index.latest})`);
}

main();
