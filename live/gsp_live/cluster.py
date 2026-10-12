"""Cluster post observations into incidents; corroboration + time decay."""
from __future__ import annotations

import hashlib
import math
from datetime import datetime, timezone
from typing import Any

from .extract import TYPE_INFO
from .gazetteer import haversine_km


def parse_t(s: str) -> datetime | None:
    try:
        d = datetime.fromisoformat((s or "").replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def iso(d: datetime) -> str:
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def corroboration(obs: list[dict]) -> dict[str, Any]:
    """distinct accounts + verified/news-desk bonus -> raw, and a 0..1 score."""
    authors = {o["author"].lower() for o in obs if o.get("author")}
    verified = {o["author"].lower() for o in obs if o.get("verified")}
    trusted = {o["author"].lower() for o in obs if o.get("trusted")}
    raw = len(authors) + 0.5 * len(verified - trusted) + 2 * len(trusted)
    return {"accounts": len(authors), "verified": len(verified), "trusted": len(trusted),
            "raw": round(raw, 2), "score": round(1 - math.exp(-raw / 5), 3)}


def decay(last_seen: datetime, now: datetime, half_life_h: float) -> float:
    age_h = max(0.0, (now - last_seen).total_seconds() / 3600)
    return round(0.5 ** (age_h / max(0.1, half_life_h)), 4)


def _compatible(inc: dict, o: dict, t: datetime, window_h: float, radius_km: float) -> bool:
    if inc["family"] != o["family"]:
        return False
    if (t - inc["_last"]).total_seconds() > window_h * 3600:
        return False
    if o["precision"] == "city" or inc["precision"] == "city":
        # city-wide chatter only merges with incidents of the same type
        return inc["type"] == o["type"] or o["type"] in inc["types"]
    return haversine_km(inc["lat"], inc["lon"], o["lat"], o["lon"]) <= radius_km


def build_incidents(obs: list[dict], cfg: dict[str, Any], now: datetime | None = None) -> list[dict]:
    c = cfg.get("cluster") or {}
    window_h, radius_km = float(c.get("window_h", 3)), float(c.get("radius_km", 1.2))
    half_life, min_w = float(c.get("half_life_h", 6)), float(c.get("min_weight", 0.04))
    now = now or datetime.now(timezone.utc)
    seen_posts: set[str] = set()
    rows = []
    for o in obs:
        t = parse_t(o.get("t", ""))
        if t is None or o.get("post_id") in seen_posts:
            continue
        seen_posts.add(o.get("post_id"))
        rows.append((t, o))
    rows.sort(key=lambda r: r[0])
    incs: list[dict] = []
    for t, o in rows:
        cands = [i for i in incs if _compatible(i, o, t, window_h, radius_km)]
        # prefer a place-level incident over a city-level one, then the most recent
        cands.sort(key=lambda i: (i["precision"] != "place", -(i["_last"].timestamp())))
        if cands:
            inc = cands[0]
            if inc["precision"] == "city" and o["precision"] == "place":
                inc.update(precision="place", place=o["place"], place_id=o["place_id"], lat=o["lat"], lon=o["lon"])
        else:
            inc = {"family": o["family"], "type": o["type"], "types": [], "precision": o["precision"],
                   "place": o["place"], "place_id": o["place_id"], "lat": o["lat"], "lon": o["lon"],
                   "_first": t, "_last": t, "posts": []}
            incs.append(inc)
        inc["_last"] = max(inc["_last"], t)
        inc["posts"].append(o)
        for ty in o["types"]:
            if ty not in inc["types"]:
                inc["types"].append(ty)
        # headline type = most severe type seen among the family members
        if TYPE_INFO[o["type"]][0] > TYPE_INFO[inc["type"]][0]:
            inc["type"] = o["type"]
    out = []
    for inc in incs:
        w = decay(inc["_last"], now, half_life)
        if w < min_w:
            continue
        first, last = inc.pop("_first"), inc.pop("_last")
        posts = sorted(inc["posts"], key=lambda o: o["t"], reverse=True)
        corr = corroboration(posts)
        sev = max(o["severity"] for o in posts)
        if corr["raw"] >= 8 and sev < 5:
            sev += 1  # lots of independent chatter -> escalate one band
        key = f'{inc["family"]}|{inc["place_id"] or "city"}|{first.strftime("%Y%m%d%H")}'
        inc.update(
            id=hashlib.sha1(key.encode()).hexdigest()[:12],
            first_seen=iso(first), last_seen=iso(last), severity=sev, corroboration=corr,
            weight=w, n_posts=len(posts),
            posts=[{k: o[k] for k in ("post_id", "author", "url", "text", "t", "type", "severity", "verified", "trusted", "source")}
                   for o in posts],
        )
        out.append(inc)
    out.sort(key=lambda i: (i["weight"] * i["severity"] * (0.5 + i["corroboration"]["score"])), reverse=True)
    return out
