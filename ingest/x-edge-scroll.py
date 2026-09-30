#!/usr/bin/env python3
"""Global Security Pulse: focused, human-paced X scroll in the signed-in Edge.

Same mechanism as traceburst/ingest/chrome_scroll.py (AppleScript runs JS in the
front Edge tab). No X API. Each session runs a short list of focused "Latest"
searches, reads each one at human speed (partial-viewport scrolls with reading
pauses), keeps only fresh posts, and writes a browser-handoff JSON that
ingest/x-scroll-browser-handoff.mjs merges.

Usage: python3 x_edge_scroll.py [--out PATH] [--max-age-h 24] [--queries N]
"""
from __future__ import annotations
import argparse, json, os, random, subprocess, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

APP = os.environ.get("X_BROWSER", "Google Chrome")  # his signed-in Chrome (was Edge)
JS_PATH = Path("/tmp/gsp-edge.js")
BASE = " -filter:replies lang:en within_time:12h"

ALLOW = ["CENTCOM","UK_MTO","DeptofDefense","USNavy","NATO","DefenceHQ","UNOCHA","IAEAOrg",
         "USNINews","DefenseOne","Reuters","AP","AFP","BBCWorld","AJEnglish","ModIndia","Aus_Defence"]

# Focused theatres. Each is one "Latest" search.
ALLOWLIST_URL = "https://raw.githubusercontent.com/avinashpeyyety/global-security-pulse/main/ingest/allowlists/x-security.json"
ALLOWLIST_CACHE = Path.home() / "gsp-x" / "allowlist.json"

def allowlist_queries(batch=14):
    """One from: batch search per account group (core, ukraine, verify, mideast, ...)."""
    import urllib.request
    try:
        raw = urllib.request.urlopen(ALLOWLIST_URL, timeout=15).read().decode()
        ALLOWLIST_CACHE.write_text(raw)
    except Exception:
        raw = ALLOWLIST_CACHE.read_text() if ALLOWLIST_CACHE.exists() else ""
    accounts = json.loads(raw)["accounts"] if raw else [{"handle": h, "group": "core"} for h in ALLOW]
    groups = {}
    for a in accounts:
        groups.setdefault(a.get("group", "core"), []).append(a["handle"])
    out = []
    for g, hs in groups.items():
        for i in range(0, len(hs), batch):
            chunk = hs[i:i + batch]
            out.append((f"accounts-{g}-{i // batch + 1}", "(" + " OR ".join(f"from:{h}" for h in chunk) + ")"))
    return out

QUERIES = [
  ("red-sea", '("Red Sea" OR Houthi OR Houthis OR "Bab el-Mandeb" OR Hormuz) (ship OR vessel OR tanker OR missile OR drone OR attack) min_faves:20'),
  ("ukraine-russia", '(Ukraine OR Russia OR Kyiv OR Kharkiv OR Zaporizhzhia OR Donetsk) (missile OR drone OR strike OR shelling OR offensive) min_faves:50'),
  ("israel-gaza-lebanon", '(Gaza OR Lebanon OR Hezbollah OR "West Bank" OR IDF) (strike OR airstrike OR killed OR rockets) min_faves:50'),
  ("iran", '(Iran OR IRGC OR Tehran) (strike OR missile OR nuclear OR sanctions OR drone) min_faves:50'),
  ("sudan-horn", '(Sudan OR Darfur OR RSF OR "El Fasher" OR Ethiopia OR Tigray OR Somalia OR Shabaab) (attack OR clashes OR killed OR offensive) min_faves:10'),
  ("sahel", '(Mali OR "Burkina Faso" OR Niger OR Sahel OR Nigeria) (attack OR jihadist OR ambush OR killed) min_faves:10'),
  ("indo-pacific", '(Taiwan OR PLA OR "South China Sea" OR "North Korea" OR Pyongyang) (drills OR incursion OR missile OR launch OR "coast guard") min_faves:20'),
  ("south-asia", '(Kashmir OR "Line of Control" OR Pakistan OR Afghanistan OR Balochistan) (attack OR blast OR militants OR strike) min_faves:20'),
  ("americas", '(Haiti OR Venezuela OR Colombia OR Mexico OR Ecuador) (gang OR clashes OR cartel OR troops OR attack) min_faves:20'),
  ("cyber", '(cyberattack OR ransomware OR "state-sponsored hackers" OR DDoS) (government OR ministry OR port OR grid OR hospital) min_faves:20'),
  ("disaster", '(earthquake magnitude OR tsunami OR cyclone OR typhoon OR "flash floods") (killed OR evacuate OR warning) min_faves:20'),
]

EXTRACT_JS = r"""
(() => {
  const out = [];
  for (const a of document.querySelectorAll("article")) {
    const link = a.querySelector('a[href*="/status/"] time') ? a.querySelector('a[href*="/status/"] time').closest('a') : a.querySelector('a[href*="/status/"]');
    if (!link) continue;
    const href = (link.getAttribute("href") || "").split("?")[0];
    const p = href.split("/").filter(Boolean);
    if (p.length < 3) continue;
    const raw = a.innerText || "";
    const t = a.querySelector("time");
    const tx = a.querySelector('[data-testid="tweetText"]');
    out.push({ postId: p[2], author: p[0], url: "https://x.com" + href,
      observedAt: t ? (t.dateTime || "") : "", text: tx ? tx.innerText : "",
      isRepost: /reposted/i.test(raw.slice(0, 80)), isReply: raw.indexOf("Replying to") !== -1 });
  }
  return JSON.stringify({ url: location.href, posts: out });
})()
"""

def osa(script: str, timeout=30) -> str:
    p = subprocess.run(["osascript"], input=script, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout).strip()[:300])
    return p.stdout.strip()

# --- Target window: one private, minimized worker window shared with the Traceburst
# scroller (~/.x-worker-window.id). Never his own windows; focus is handed back if a
# window has to be created (Avinash 2026-09-29: keep X scrolling under the hood).
# GSP_X_WINDOW_ID overrides the pick.
_WIN = {"id": None, "tab": None}
WORKER_FILE = Path.home() / ".x-worker-window.id"

def _front_app() -> str:
    try:
        return osa('tell application "System Events" to return name of first process whose frontmost is true', timeout=10)
    except Exception:
        return ""

def target_window() -> str:
    if _WIN["id"]:
        return _WIN["id"]
    forced = os.environ.get("GSP_X_WINDOW_ID")
    if forced:
        _WIN["id"] = forced
        return forced
    try:
        wid = WORKER_FILE.read_text().strip()
        if wid and osa(f'tell application "{APP}" to return exists window id {wid}') == "true":
            try:
                osa(f'tell application "{APP}" to set minimized of window id {wid} to true')
            except RuntimeError:
                pass
            _WIN["id"] = wid
            return wid
    except FileNotFoundError:
        pass
    prev = _front_app()
    wid = osa(f'''tell application "{APP}"
  set w to make new window
  delay 0.8
  set minimized of w to true
  return id of w
end tell''').strip()
    if prev and prev != APP:
        try:
            osa(f'tell application "{prev}" to activate', timeout=10)
        except Exception:
            pass
    WORKER_FILE.write_text(wid)
    _WIN["id"] = wid
    return wid

def _tab_ref() -> str:
    return f'tab id {_WIN["tab"]} of window id {target_window()}'

def js(code: str) -> str:
    JS_PATH.write_text(code, encoding="utf-8")
    return osa(f'set js to read POSIX file "{JS_PATH}" as «class utf8»\n'
               f'tell application "{APP}" to execute {_tab_ref()} javascript js')

def open_tab(url: str):
    wid = target_window()
    if _WIN["tab"]:
        try:
            osa(f'tell application "{APP}" to set URL of {_tab_ref()} to "{url}"')
            osa(f'''tell application "{APP}"
  set w to window id {wid}
  repeat with i from 1 to count of tabs of w
    if id of tab i of w is {_WIN["tab"]} then set active tab index of w to i
  end repeat
end tell''')
            return
        except RuntimeError:
            _WIN["tab"] = None
    tid = osa(f'''tell application "{APP}"
  set w to window id {wid}
  set t to make new tab at end of tabs of w with properties {{URL:"{url}"}}
  set active tab index of w to (count of tabs of w)
  return id of t
end tell''')
    _WIN["tab"] = tid.strip()

def close_tab():
    # Worker tab is reused across searches; closed once at the end of the session.
    pass

def close_worker():
    if _WIN["tab"]:
        try:
            osa(f'tell application "{APP}" to close {_tab_ref()}')
        except RuntimeError:
            pass
        _WIN["tab"] = None

def human_sleep(lo, hi):
    time.sleep(random.uniform(lo, hi))

def read_query(q: str, scrolls: int, cutoff: datetime, log):
    url = "https://x.com/search?src=typed_query&f=live&q=" + quote(q + BASE)
    open_tab(url)
    human_sleep(6.5, 9.5)                       # let the page load like a person would
    found, stale_streak, status = {}, 0, "ok"
    try:
        for i in range(scrolls + 1):
            data = json.loads(js(EXTRACT_JS) or "{}")
            page = data.get("url", "")
            if any(m in page for m in ("/login", "/i/flow/", "onboarding", "redirect_after_login")):
                status = "login_wall"; break
            fresh_here = 0
            for p in data.get("posts", []):
                try:
                    ts = datetime.fromisoformat(p["observedAt"].replace("Z", "+00:00"))
                except Exception:
                    continue
                if ts < cutoff or p["isReply"] or len(p["text"]) < 40:
                    continue
                if p["postId"] not in found:
                    found[p["postId"]] = p; fresh_here += 1
            stale_streak = stale_streak + 1 if fresh_here == 0 else 0
            if stale_streak >= 2:              # timeline has run past the freshness window
                break
            if i < scrolls:
                # partial-viewport scroll, then read (4-9 s), sometimes a longer pause
                js("window.scrollBy({top: Math.round(window.innerHeight*(0.55+Math.random()*0.3)), behavior:'smooth'}); 'ok'")
                human_sleep(4.0, 9.0)
                if random.random() < 0.2:
                    human_sleep(3.0, 7.0)
    finally:
        try: close_tab()
        except Exception: pass
    return list(found.values()), status

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path.home() / "gsp-x" / "x-scroll-browser-latest.json"))
    ap.add_argument("--max-age-h", type=float, default=24)
    ap.add_argument("--scrolls", type=int, default=8)
    ap.add_argument("--queries", type=int, default=99)
    a = ap.parse_args()
    started = datetime.now(timezone.utc)
    cutoff = started - timedelta(hours=a.max_age_h)
    pointers, runs = {}, []
    plan = (allowlist_queries() + QUERIES)[: a.queries]
    for n, (name, q) in enumerate(plan):
        t0 = time.time()
        try:
            posts, status = read_query(q, a.scrolls, cutoff, print)
        except Exception as e:
            posts, status = [], f"error: {e}"[:200]
        for p in posts:
            p.pop("isReply", None)
            if p.pop("isRepost", False): continue
            p["title"] = " ".join(p["text"].split())[:160]
            p["theatre"] = name
            pointers.setdefault(p["postId"], p)
        runs.append({"query": name, "status": status, "kept": len(posts), "secs": round(time.time() - t0)})
        print(json.dumps(runs[-1]), flush=True)
        if status == "login_wall": break
        if n < len(plan) - 1: human_sleep(8, 15)   # break between searches
    doc = {"mode": "browser", "collector": "edge-focused-scroll", "generatedAt": datetime.now(timezone.utc).isoformat(),
           "startedAt": started.isoformat(), "maxAgeHours": a.max_age_h, "runs": runs,
           "pointers": sorted(pointers.values(), key=lambda p: p["observedAt"], reverse=True)}
    Path(a.out).write_text(json.dumps(doc, indent=1, ensure_ascii=False))
    close_worker()
    print(f"DONE {len(pointers)} fresh posts -> {a.out}", flush=True)

if __name__ == "__main__":
    main()
