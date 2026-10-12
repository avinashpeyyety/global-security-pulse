"""Optional Grok-assisted extraction via SuperGrok (consumer plan) in headless Edge.

Uses traceburst.assess.backends.SuperGrokEdge sharing the collector's HeadlessBrowser page.
Never the paid xAI API. Failures fall back to deterministic rules silently (logged in runs.jsonl).
"""
from __future__ import annotations

import json
import re
from typing import Any

from .extract import TYPE_INFO

PROMPT = """You are triaging X posts for a live local security map of {city}.
For each post decide if it reports a CURRENT, PHYSICAL, LOCAL incident in {city} (not opinion, politics, ads,
old news, or another city). Allowed types: {types}.
Return ONLY a JSON array, one object per post, no prose:
[{{"id": "<post id>", "is_incident": true|false, "type": "<type or null>", "place": "<most specific locality/landmark in {city} or null>", "severity": 1-5}}]
Severity: 1 routine (jam, minor police activity) .. 3 notable (fire, clash, curfew) .. 5 mass-casualty.

POSTS:
{posts}
"""


def build_prompt(posts: list[dict], city: str) -> str:
    lines = [json.dumps({"id": str(p["postId"]), "author": p.get("author"), "text": " ".join((p.get("text") or "").split())[:380]},
                        ensure_ascii=False) for p in posts]
    return PROMPT.format(city=city, types=", ".join(TYPE_INFO), posts="\n".join(lines))


def parse_reply(text: str) -> dict[str, dict[str, Any]]:
    """Grok reply -> {post_id: annotation}. Tolerates code fences / prose around the array."""
    if not text:
        return {}
    s = re.sub(r"```(?:json)?", "", text)
    i, j = s.find("["), s.rfind("]")
    if i < 0 or j <= i:
        return {}
    try:
        arr = json.loads(s[i:j + 1])
    except ValueError:
        return {}
    out = {}
    for a in arr if isinstance(arr, list) else []:
        if not isinstance(a, dict) or not a.get("id"):
            continue
        typ = a.get("type")
        out[str(a["id"])] = {
            "is_incident": bool(a.get("is_incident", True)),
            "type": typ if typ in TYPE_INFO else None,
            "place": a.get("place") if isinstance(a.get("place"), str) else None,
            "severity": a.get("severity"),
        }
    return out


def annotate(posts: list[dict], city: str, browser) -> dict[str, dict]:
    from traceburst.assess.backends import SuperGrokEdge  # runtime copy of traceburst on sys.path
    g = SuperGrokEdge(browser=browser, wait_s=180)
    try:
        reply = g.ask_long(build_prompt(posts, city))
    finally:
        try:
            g.close()
        except Exception:
            pass
    return parse_reply(reply)
