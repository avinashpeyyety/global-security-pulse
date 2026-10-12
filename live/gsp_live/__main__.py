"""python -m gsp_live {collect|rebuild|serve} --city delhi"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="gsp_live")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("collect")
    c.add_argument("--city", default="delhi")
    c.add_argument("--fixture")
    c.add_argument("--force", action="store_true", help="ignore min-gap / busy checks (not pause rules)")
    c.add_argument("--no-grok", action="store_true")
    c.add_argument("--queries", type=int)
    c.add_argument("--scrolls", type=int)
    r = sub.add_parser("rebuild")
    r.add_argument("--city", default="delhi")
    s = sub.add_parser("serve")
    s.add_argument("--port", type=int)
    a = ap.parse_args(argv)
    if a.cmd == "collect":
        from .collect import run
        rec = run(a.city, fixture=a.fixture, force=a.force, no_grok=a.no_grok, queries=a.queries, scrolls=a.scrolls)
        print(json.dumps({k: v for k, v in rec.items() if k != "focus"}, ensure_ascii=False)[:2000])
        return 0
    if a.cmd == "rebuild":
        from . import store
        from .collect import rebuild
        from .config import city_dir, load_city
        cfg, d = load_city(a.city), city_dir(a.city)
        now = datetime.now(timezone.utc)
        doc = rebuild(cfg, d, store.load_posts(d, now=now), store.read_json(d / "grok.json", {}), now, {"mode": "rebuild"})
        print(len(doc["incidents"]), "incidents")
        return 0
    if a.cmd == "serve":
        from .server import serve
        serve(a.port)
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
