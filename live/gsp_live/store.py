"""Private per-city data: <private>/<city>/{posts.jsonl, grok.json, incidents.json, state.json, runs.jsonl}."""
from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from .cluster import parse_t


def write_atomic(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp-", suffix=path.suffix)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def read_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def load_posts(d: Path, retention_h: float = 72, now: datetime | None = None) -> dict[str, dict]:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=retention_h)
    out: dict[str, dict] = {}
    try:
        lines = (d / "posts.jsonl").read_text(encoding="utf-8").splitlines()
    except OSError:
        return out
    for ln in lines:
        try:
            p = json.loads(ln)
        except ValueError:
            continue
        t = parse_t(p.get("observedAt", ""))
        if t and t >= cutoff and p.get("postId"):
            out.setdefault(str(p["postId"]), p)
    return out


def save_posts(d: Path, posts: dict[str, dict]) -> None:
    """Rewrite (compacts retention) atomically."""
    tmp = d / ".posts.jsonl.tmp"
    with tmp.open("w", encoding="utf-8") as f:
        for p in sorted(posts.values(), key=lambda p: p.get("observedAt", "")):
            f.write(json.dumps(p, ensure_ascii=False) + "\n")
    os.replace(tmp, d / "posts.jsonl")


def append_run(d: Path, rec: dict) -> None:
    with (d / "runs.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
