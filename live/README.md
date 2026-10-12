# GSP live — local ground situation (private)

Live, continuously updating view of local security chatter on X, starting with **Delhi**.
Runs **only on the Air at http://127.0.0.1:8774/live/** — never on GitHub Pages
(Pages builds `apps/web` only; this folder is outside it, and `live/private/` is gitignored).

| Piece | What |
|-------|------|
| `cities/<id>.yaml` | City framing, X queries (EN + Hindi + area names), trusted desks, cluster/decay, Grok toggle. Add a city = add a YAML + gazetteer. |
| `gazetteer/<id>.json` | Local gazetteer (Delhi: ~190 localities/landmarks/borders, EN + Hindi aliases). `build_delhi.py` regenerates it. No paid geocoder. |
| `gsp_live/collect.py` | Headless Edge X scroll via Traceburst `HeadlessBrowser(engine='edge')` (fresh per-run profile copy, deleted after; FocusGuard). Round-robin queries, human-paced, lock + min-gap + skip-if-another-X-scroll-running. |
| `gsp_live/extract.py` | Deterministic type / severity / place extraction (EN + Hindi). |
| `gsp_live/grok.py` | Optional Grok triage via SuperGrok (consumer) in the same headless page (`SuperGrokEdge.ask_long`), throttled (60 min). Never the paid API. |
| `gsp_live/cluster.py` | Clusters chatter into incidents (family + 1.5 km + 3 h), corroboration = distinct accounts + verified + news desks, exponential decay (6 h half-life). |
| `gsp_live/server.py` | stdlib server on 127.0.0.1:8774; `/api/version` polled every 30 s. |
| `web/` | MapLibre GL 4.7.1 (vendored) with pitch, OSM 3D buildings (OpenFreeMap), optional terrain (AWS Terrain Tiles), severity columns, crisp rings, pulse for new, 24 h scrubber. |

Data: `<runtime>/private/<city>/{posts.jsonl,incidents.json,grok.json,state.json,runs.jsonl}`;
fixture dry runs go to `private/_fixture/<city>/` and are viewed with `?data=fixture`.

```bash
PY="$HOME/Library/Application Support/traceburst/venv/bin/python"
cd live && "$PY" -m unittest discover -s tests -t .          # tests
"$PY" -m gsp_live collect --city delhi --fixture tests/fixtures/delhi_posts.json   # dry run
"$PY" -m gsp_live collect --city delhi --force               # one real headless run
"$PY" -m gsp_live serve                                       # http://127.0.0.1:8774/live/
./install.sh                                                  # runtime copy + launchd
```

Pause conventions: `collect.respect_scroll_authorized` / `collect.respect_quiet_hours` (Traceburst's
`state.json` and weekday 9-5 X quiet hours) : Delhi respects `scroll_authorized: false` (pause) and ignores quiet hours (no time-window limits, Avinash 2026-10-12).
