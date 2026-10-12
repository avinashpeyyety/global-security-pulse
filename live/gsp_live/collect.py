"""Collector: scroll X search 'Latest' in HEADLESS Edge (Traceburst HeadlessBrowser, per-run copy of the
signed-in Edge profile, deleted after; FocusGuard logs the frontmost app). No X API, no visible window.

  python -m gsp_live collect --city delhi            # real run (launchd every ~12 min)
  python -m gsp_live collect --city delhi --fixture tests/fixtures/delhi_posts.json   # dry run
"""
from __future__ import annotations

import fcntl
import json
import os
import random
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from . import store
from .cluster import build_incidents, iso, parse_t
from .config import city_dir, load_city
from .extract import extract_post
from .gazetteer import Gazetteer

TRACEBURST_REPO = Path(os.environ.get("TRACEBURST_REPO")
                       or (Path.home() / "Library" / "Application Support" / "traceburst" / "repo"))
TB_STATE = Path.home() / "Library" / "Application Support" / "traceburst" / "state.json"

EXTRACT_JS = r"""
(() => {
  const out = [];
  for (const a of document.querySelectorAll("article")) {
    const t = a.querySelector("time");
    const link = t ? t.closest('a[href*="/status/"]') : a.querySelector('a[href*="/status/"]');
    if (!link) continue;
    const href = (link.getAttribute("href") || "").split("?")[0];
    const p = href.split("/").filter(Boolean);
    if (p.length < 3) continue;
    const raw = a.innerText || "";
    const tx = a.querySelector('[data-testid="tweetText"]');
    out.push({ postId: p[2], author: p[0], url: "https://x.com" + href,
      observedAt: t ? (t.dateTime || "") : "", text: tx ? tx.innerText : "",
      verified: !!a.querySelector('[data-testid="icon-verified"]'),
      isRepost: /reposted/i.test(raw.slice(0, 80)), isReply: raw.indexOf("Replying to") !== -1 });
  }
  return JSON.stringify({ url: location.href, posts: out });
})()
"""


def log(*a: Any) -> None:
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def quiet_hours_now() -> bool:
    """Traceburst standing rule (weekdays 9-17 local) unless ~/.x-scroll-override-until is in the future."""
    try:
        if time.time() < float((Path.home() / ".x-scroll-override-until").read_text().strip()):
            return False
    except (OSError, ValueError):
        pass
    t = time.localtime()
    return t.tm_wday < 5 and 9 <= t.tm_hour < 17


def scroll_authorized() -> bool:
    try:
        d = json.loads(TB_STATE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return True
    return not (isinstance(d, dict) and d.get("scroll_authorized") is False)


def busy_with(patterns: list[str]) -> str | None:
    me = os.getpid()
    try:
        out = subprocess.run(["ps", "-axo", "pid=,command="], capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return None
    for line in out.splitlines():
        pid, _, cmd = line.strip().partition(" ")
        if pid.isdigit() and int(pid) != me and "gsp_live" not in cmd:
            for pat in patterns:
                if pat in cmd:
                    return pat
    return None


def gate(cfg: dict, state: dict, force: bool) -> str | None:
    """Reason to skip this run, or None."""
    c = cfg.get("collect") or {}
    if c.get("respect_scroll_authorized") and not scroll_authorized():
        return "traceburst scroll_authorized=false"
    if c.get("respect_quiet_hours") and quiet_hours_now():
        return "traceburst X quiet hours"
    if force:
        return None
    last = parse_t(state.get("last_run_at", ""))
    gap = float(c.get("every_min", 12)) * 60 * 0.8
    if last and (datetime.now(timezone.utc) - last).total_seconds() < gap:
        return "rate limit (min gap)"
    other = busy_with(c.get("skip_if_running") or [])
    if other:
        return f"another X scroll is running ({other})"
    return None


class EdgeSession:
    def __init__(self) -> None:
        if str(TRACEBURST_REPO) not in sys.path:
            sys.path.insert(0, str(TRACEBURST_REPO))
        from traceburst.browser import FocusGuard, HeadlessBrowser
        self.guard = FocusGuard("gsp-live").__enter__()
        try:
            self.hb = HeadlessBrowser(engine="edge").__enter__()
        except Exception:
            self.guard.__exit__(None, None, None)
            raise

    def close(self) -> dict:
        try:
            self.hb.close()  # also deletes the Edge profile copy
        finally:
            self.guard.__exit__(None, None, None)
        return self.guard.as_dict()


def read_query(hb, q: str, scrolls: int, cutoff: datetime) -> tuple[list[dict], str]:
    hb.goto("https://x.com/search?src=typed_query&f=live&q=" + quote(q), wait_s=0.5)
    time.sleep(random.uniform(6.0, 9.0))
    found: dict[str, dict] = {}
    status, stale = "ok", 0
    for i in range(scrolls + 1):
        data = json.loads(hb.eval(EXTRACT_JS) or "{}")
        if any(m in data.get("url", "") for m in ("/login", "/i/flow/", "onboarding", "redirect_after_login")):
            return [], "login_wall"
        fresh = 0
        for p in data.get("posts", []):
            t = parse_t(p.get("observedAt", ""))
            if not t or t < cutoff or p.get("isReply") or p.get("isRepost") or len(p.get("text") or "") < 25:
                continue
            if p["postId"] not in found:
                found[p["postId"]] = p
                fresh += 1
        stale = stale + 1 if fresh == 0 else 0
        if stale >= 2:
            break
        if i < scrolls:
            hb.eval("(() => { window.scrollBy({top: Math.round(innerHeight*(0.55+Math.random()*0.3)), behavior:'smooth'}); return 'ok'; })()")
            time.sleep(random.uniform(4.0, 8.0))
    for p in found.values():
        p.pop("isReply", None)
        p.pop("isRepost", None)
    return list(found.values()), status


def load_fixture(path: Path, now: datetime) -> list[dict]:
    """Fixture rows may use minutes_ago instead of observedAt so dry runs always look fresh."""
    rows = json.loads(Path(path).read_text(encoding="utf-8"))
    out = []
    for r in rows.get("posts", rows) if isinstance(rows, dict) else rows:
        r = dict(r)
        if "minutes_ago" in r:
            r["observedAt"] = iso(now - timedelta(minutes=float(r.pop("minutes_ago"))))
        r.setdefault("url", f"https://x.com/{r.get('author')}/status/{r.get('postId')}")
        out.append(r)
    return out


def rebuild(cfg: dict, d: Path, posts: dict[str, dict], grok_ann: dict, now: datetime, meta: dict) -> dict:
    gaz = Gazetteer.load(Path(cfg["_root"]) / cfg["gazetteer"], cfg.get("bounds"))
    obs = [o for p in posts.values() if (o := extract_post(p, gaz, cfg, grok_ann.get(str(p.get("postId")))))]
    incs = build_incidents(obs, cfg, now)
    doc = {"city": cfg["id"], "generatedAt": iso(now), "posts_seen": len(posts), "observations": len(obs),
           "incidents": incs, "collector": meta}
    store.write_atomic(d / "incidents.json", doc)
    return doc


def run(city: str, *, fixture: str | None = None, force: bool = False, no_grok: bool = False,
        queries: int | None = None, scrolls: int | None = None) -> dict:
    cfg = load_city(city)
    d = city_dir(city, fixture=bool(fixture))
    lockf = (d / ".collect.lock").open("w")
    try:
        fcntl.flock(lockf, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        log("another gsp_live collect holds the lock; skipping")
        return {"skipped": "locked"}
    state = store.read_json(d / "state.json", {})
    now = datetime.now(timezone.utc)
    c = cfg.get("collect") or {}
    rec: dict[str, Any] = {"at": iso(now), "mode": "fixture" if fixture else "edge"}
    if not fixture:
        why = gate(cfg, state, force)
        if why:
            log("skip:", why)
            rec["skipped"] = why
            store.append_run(d, rec)
            return rec
    posts = store.load_posts(d, now=now)
    grok_ann = store.read_json(d / "grok.json", {})
    new: list[dict] = []
    runs = []
    session = None
    try:
        if fixture:
            new = load_fixture(Path(fixture), now)
        else:
            qs = cfg.get("queries") or []
            n = int(queries or c.get("queries_per_run", 3))
            cur = int(state.get("cursor", 0)) % max(1, len(qs))
            plan = [qs[(cur + k) % len(qs)] for k in range(min(n, len(qs)))]
            state["cursor"] = (cur + len(plan)) % max(1, len(qs))
            cutoff = now - timedelta(hours=float(c.get("max_age_h", 6)))
            session = EdgeSession()
            for k, q in enumerate(plan):
                t0 = time.time()
                try:
                    got, status = read_query(session.hb, q["q"] + c.get("suffix", ""), int(scrolls or c.get("scrolls", 3)), cutoff)
                except Exception as e:  # noqa: BLE001
                    got, status = [], f"error: {e}"[:200]
                for p in got:
                    p["query"] = q["id"]
                new.extend(got)
                runs.append({"query": q["id"], "status": status, "kept": len(got), "secs": round(time.time() - t0)})
                log(json.dumps(runs[-1]))
                if status == "login_wall":
                    break
                if k < len(plan) - 1:
                    time.sleep(random.uniform(6, 12))
        added = 0
        for p in new:
            pid = str(p.get("postId") or "")
            if pid and pid not in posts:
                p["collectedAt"] = iso(now)
                posts[pid] = p
                added += 1
        # optional Grok pass (SuperGrok consumer plan, same headless page), throttled
        g = cfg.get("grok") or {}
        last_g = parse_t(state.get("last_grok_at", ""))
        due = not last_g or (now - last_g).total_seconds() >= float(g.get("min_interval_min", 60)) * 60
        pending = [p for pid, p in posts.items() if pid not in grok_ann][-int(g.get("max_posts", 30)):]
        if g.get("enabled") and not no_grok and not fixture and session and due and pending:
            try:
                ann = __import__("gsp_live.grok", fromlist=["annotate"]).annotate(pending, cfg.get("name", city), session.hb)
                for pid, a in ann.items():
                    a["at"] = iso(now)
                    grok_ann[pid] = a
                for p in pending:  # mark as seen even when Grok skipped it
                    grok_ann.setdefault(str(p["postId"]), {"at": iso(now), "skipped": True})
                store.write_atomic(d / "grok.json", grok_ann)
                state["last_grok_at"] = iso(now)
                rec["grok"] = {"asked": len(pending), "annotated": len(ann)}
            except Exception as e:  # noqa: BLE001
                rec["grok"] = {"error": str(e)[:200]}
                state["last_grok_at"] = iso(now)  # back off for an interval
    finally:
        if session:
            rec["focus"] = session.close()
    store.save_posts(d, posts)
    rec.update(runs=runs, fetched=len(new), added=added)
    doc = rebuild(cfg, d, posts, grok_ann, now, {"last_run": rec["at"], "mode": rec["mode"], "runs": runs})
    rec["incidents"] = len(doc["incidents"])
    state["last_run_at"] = iso(now)
    store.write_atomic(d / "state.json", state)
    store.append_run(d, rec)
    log(f"DONE city={city} fetched={len(new)} added={added} posts={len(posts)} incidents={len(doc['incidents'])}")
    return rec
