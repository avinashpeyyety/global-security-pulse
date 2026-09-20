# X allowlist scroll agent

Budgeted scroll of **named** reliable accounts only. Writes append-only pointers to `data/ingest/x-pointers.jsonl`.

## Cost rules

- **Do not** call expensive X `search_posts_all` by default.
- Optional later: enrich known post IDs via `get_posts_by_ids` if an X connector env is present.
- Live scroll uses Playwright (or CDP) against allowlisted profile timelines — not firehose search.

## Dry-run (v0.1, no network / no X login)

```bash
# from repo root
npm run agent:x-scroll
# → data/ingest/x-pointers.jsonl
```

## Live scroll (planned — not wired in v0.1)

1. Install Playwright in this package: `npx playwright install chromium`
2. Authenticate a dedicated browser profile (manual once); never commit cookies.
3. For each handle in `allowlist.yaml`, open `https://x.com/{handle}`, scroll up to `budget.maxScrollsPerAccount`, collect up to `budget.maxPostsPerAccount`.
4. Extract: post id, text snippet, timestamp, author, URL, optional place regex.
5. Append JSONL; schedule every `budget.scheduleMinutes` (e.g. 45).
6. Stop after `budget.stopAfterAccounts` in a run.

Keep sessions short. Prefer wire / defense / think / UN / maritime handles only.

## Output schema (JSONL)

```json
{
  "id": "…",
  "postId": "…",
  "author": "Reuters",
  "category": "wire",
  "reliability": "A",
  "text": "…",
  "url": "https://x.com/…",
  "observedAt": "ISO",
  "ingestedAt": "ISO",
  "geoMentions": [],
  "mode": "dry-run|live"
}
```
