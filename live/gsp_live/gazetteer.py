"""Local gazetteer geocoder (no paid APIs). Matches English, Hindi and hashtag forms."""
from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Prefer the most specific hit: landmarks/borders > stations/localities > roads > whole cities.
KIND_RANK = {"landmark": 0, "border": 0, "station": 1, "locality": 1, "road": 3, "city": 4}
_B = r"[\w\u0900-\u097F]"  # word chars incl. Devanagari (matras are not \w in Python)


@dataclass(frozen=True)
class Hit:
    place: dict
    alias: str
    start: int
    end: int

    @property
    def rank(self) -> tuple:
        return (KIND_RANK.get(self.place.get("kind"), 2), -(self.end - self.start))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class Gazetteer:
    def __init__(self, places: list[dict], bounds: list[float] | None = None):
        self.places = places
        self.by_id = {p["id"]: p for p in places}
        self.bounds = bounds
        forms: list[tuple[str, dict]] = []
        for p in places:
            for n in [p["name"], *p.get("aliases", [])]:
                n = n.strip()
                if len(n) < 2:
                    continue
                forms.append((n, p))
                if " " in n and n.isascii():
                    forms.append((n.replace(" ", ""), p))  # #ShaheenBagh, #ConnaughtPlace
        forms.sort(key=lambda f: -len(f[0]))
        self._forms = forms
        self._exact = {n.lower(): p for n, p in forms}
        alt = "|".join(re.escape(n) for n, _ in forms)
        self._rx = re.compile(rf"(?<!{_B})(?:{alt})(?!{_B})", re.I)
        self._lookup_form = {}
        for n, p in forms:
            self._lookup_form.setdefault(n.lower(), p)

    @classmethod
    def load(cls, path: str | Path, bounds: list[float] | None = None) -> "Gazetteer":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(data["places"], bounds)

    def matches(self, text: str) -> list[Hit]:
        hits = []
        for m in self._rx.finditer(text or ""):
            p = self._lookup_form.get(m.group(0).lower())
            if p:
                hits.append(Hit(p, m.group(0), m.start(), m.end()))
        return hits

    def geocode(self, text: str) -> Hit | None:
        hits = self.matches(text)
        if not hits:
            return None
        return sorted(hits, key=lambda h: (h.rank, h.start))[0]

    def lookup(self, name: str | None) -> dict | None:
        """Resolve a free-form place name (e.g. from Grok) to a gazetteer entry."""
        if not name:
            return None
        n = name.strip().lower()
        if n in self._exact:
            return self._exact[n]
        h = self.geocode(name)
        return h.place if h else None

    def in_bounds(self, lat: float, lon: float) -> bool:
        if not self.bounds:
            return True
        w, s, e, n = self.bounds
        return w <= lon <= e and s <= lat <= n
