# Global Security Pulse — backlog (v0.2+)

Ingested from critical feature review (2026-09-20). Status: `backlog` until an iteration picks it up.  
Priority bands: **P0** credibility, **P1** pulse value, **P2** depth, **P3** polish.

Suggested iteration order (from review):  
1 → topic-strict evidence + single-source flags · 2 → crisis timeline / since-last-diff · 3 → alert + AOI · 4 → markets↔chokepoint · 5 → broaden open wires / official channels.

---

## 1. Truth rail

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-T1 | P0 | backlog | **Multi-source adjudication briefs** — replace thin wire-copy with agent briefs that reconcile ≥2 independent sources before stating facts. |
| GSP-T2 | P0 | backlog | **Claim → evidence linking** — each map pin shows corroborating wires + contradicting claims; X only as supporting evidence under curated brief. |
| GSP-T3 | P0 | backlog | **Topic-strict X attach** — finish/harden matcher (no place-only glue; reject entertainment noise; one X post → at most one event). *Partial: in flight / verify after Ed Sheeran–Riyadh bug.* |
| GSP-T4 | P0 | backlog | **Single-source / unconfirmed badges** — discipline beyond REL letters; show confidence + source-count on every popup. |
| GSP-T5 | P1 | backlog | **Confidence decay** — age and non-corroboration reduce displayed confidence over time. |
| GSP-T6 | P1 | backlog | **GDELT live reliability** — reduce seed fallback; Warn/Fail honestly when GEO is empty; optional second open intel feed. |

## 2. Collection completeness

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-C1 | P0 | backlog | **Continuous live X on box** — browser handoff (or Chrome-channel) in data-inject routine by default; remove dry-run from happy path of `ingest:all`. |
| GSP-C2 | P1 | backlog | **Widen wire RSS** — Reuters/AP or equivalents when free endpoints work; document blocked sources. |
| GSP-C3 | P1 | backlog | **Official / MoD channels** — CENTCOM, DefenceHQ, UKMTO incident posts (not generic PDF dumps), state MoD feeds. |
| GSP-C4 | P1 | backlog | **Telegram / messenger rails** — optional open channels for claims that hit wires late (Houthi, regional MoD). |
| GSP-C5 | P2 | backlog | **AIS / maritime density** — shipping risk layer near chokepoints. |
| GSP-C6 | P2 | backlog | **Flight / NOTAM layer** — closures and restrictions as security context. |
| GSP-C7 | P2 | backlog | **Nuclear / strategic indicators** — sparse but high-signal open sources. |
| GSP-C8 | P2 | backlog | **Cyber CVE → campaign layer** — only nation-state / critical-infra relevant. |
| GSP-C9 | P2 | backlog | **Image/video verification lane** — geolocation of blast/footage claims (manual or assisted). |

## 3. Time & causality

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-X1 | P0 | backlog | **Crisis timeline playback** — scrubber replays how a crisis evolved, not only a time window filter. |
| GSP-X2 | P0 | backlog | **Since-last-diff** — “what changed since last snapshot” on glass (new/escalated/resolved). |
| GSP-X3 | P1 | backlog | **Posture ↔ event graph** — UI links `inResponseTo` to event ids; show response chains. |
| GSP-X4 | P1 | backlog | **Escalation ladder** — ordered stages per theater (watch → posture → kinetic → spillover). |

## 4. Economy ↔ security join

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-E1 | P0 | backlog | **Markets ↔ chokepoint/event join** — oil/VIX/FX moves highlight linked routes and events. |
| GSP-E2 | P1 | backlog | **FRED live** — clear Warn when no key; wire macros when key present. |
| GSP-E3 | P1 | backlog | **Baltic Dry (or open freight proxy)** — move off Not run. |
| GSP-E4 | P2 | backlog | **War-risk / shipping premiums** — open proxies if available. |
| GSP-E5 | P2 | backlog | **Conflict FX** — selected EM/conflict currencies as stress inputs. |
| GSP-E6 | P2 | backlog | **Sanctions-list hits as map layer** — designations geocoded where possible. |

## 5. Ops product

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-O1 | P0 | backlog | **Alerting** — threshold breach → chat/email/push (fallout high/critical, stress dial, feed Fail). |
| GSP-O2 | P0 | backlog | **AOI watchlist** — saved map boxes / theaters; filter + alert scoped to AOI. |
| GSP-O3 | P1 | backlog | **Ranked hotspots “why now”** — not just region counts; exception-first rationale. |
| GSP-O4 | P1 | backlog | **Day diff + exec brief** — side-by-side archive days; one-pager PDF/Markdown export. |
| GSP-O5 | P2 | backlog | **Role views** — watch officer / exec / markets desk on same snapshot truth. |

## 6. Map craft

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-M1 | P1 | backlog | **Clustering / deconfliction** — capitals with many pins; zoom-stable clusters with drill-down. |
| GSP-M2 | P2 | backlog | **Territory / front-line overlays** — open conflict geometry where licensed/usable. |
| GSP-M3 | P2 | backlog | **Weather / terrain context** — optional ops overlays. |
| GSP-M4 | P3 | backlog | **Basemap SLA / offline story** — tile attribution, failure modes, optional cache. |

## 7. Governance

| ID | Pri | Status | Item |
|----|-----|--------|------|
| GSP-G1 | P0 | backlog | **Published source doctrine** — allowlist, reliability grades, what may become a pin. |
| GSP-G2 | P0 | backlog | **Snapshot id on every popup** — “evaluated at T against rule R on snapshot S” visible. |
| GSP-G3 | P1 | backlog | **Editorial changelog** — human-readable note per data inject / curation change. |

---

## Already shipped (do not re-open as gaps)

- Impact-only map eligibility + null-island guard + Global Africa dump fix  
- MapLibre **circle/symbol layers** (zoom-stable pins)  
- Curated popup + collapsible X section + popup stacking  
- Supply routes + military postures layers  
- Markets anomalies + stress dial (Yahoo path)  
- Daily reports archive + Updated/Next header + 3× daily inject (7 days)  
- Pages hosting + no gen-seed wipe on deploy  

When picking an item: set Status → `in_progress`, open a short branch/PR, link the ID in the commit message (`GSP-T2:` …).
