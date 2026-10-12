"""Deterministic incident extraction from X posts (v1). Grok can override per post (grok.py)."""
from __future__ import annotations

import re
from typing import Any

from .gazetteer import Gazetteer

_B = r"[\w\u0900-\u097F]"


def _rx(words: list[str]) -> re.Pattern:
    return re.compile(r"(?<!%s)(?:%s)(?!%s)" % (_B, "|".join(words), _B), re.I)


# type -> (base severity, family, pattern). Order = precedence when several match.
TYPES: list[tuple[str, int, str, re.Pattern]] = [
    ("blast", 4, "violent", _rx([r"blasts?", r"explosions?", r"explosives?", r"exploded", r"IED", r"bomb (?:blast|went off)",
                                 r"grenade", "धमाका", "धमाके", "विस्फोट", "ब्लास्ट"])),
    ("shooting", 4, "violent", _rx([r"shooting", r"shot dead", r"shot at", r"gunfire", r"opened fire", r"shoot-?out", r"firing",
                                    r"gunshots?", r"encounter", "गोलीबारी", "फायरिंग", "गोली मार", "मुठभेड़"])),
    ("stampede", 4, "crowd", _rx([r"stampede", r"crowd crush", "भगदड़"])),
    ("collapse", 4, "structural", _rx([r"(?:building|wall|roof|bridge|house) collapsed?", r"collapsed", r"caved in",
                                       "इमारत गिरी", "ढह"])),
    ("fire", 3, "fire", _rx([r"fire", r"blaze", r"fire tenders?", r"gutted", r"fire broke out", r"caught fire", r"burnt",
                             r"on fire", "आग", "अग्निकांड"])),
    ("clash", 3, "unrest", _rx([r"clash(?:es|ed)?", r"violence", r"riots?", r"rioting", r"stone[- ]pelting", r"mob",
                                r"lathi[- ]?charge", r"scuffle", r"communal tension", r"vandali[sz]", "झड़प", "हिंसा",
                                "पथराव", "दंगा", "बवाल", "तोड़फोड़"])),
    ("curfew", 3, "unrest", _rx([r"curfew", r"section 144", r"section 163", r"prohibitory orders", r"internet (?:shut ?down|suspended)",
                                 "कर्फ्यू", "धारा 144", "धारा 163"])),
    ("evacuation", 3, "hazard", _rx([r"evacuat\w*", r"vacated", "खाली कराया", "खाली कराई"])),
    ("accident", 2, "traffic", _rx([r"accidents?", r"collision", r"crash(?:ed)?", r"overturned", r"run over", r"mishap",
                                    r"hit[- ]and[- ]run", r"rammed", "हादसा", "हादसे", "दुर्घटना", "टक्कर"])),
    ("threat", 2, "violent", _rx([r"bomb threat", r"hoax (?:call|email|threat)", r"threat (?:email|call)", r"suspicious (?:object|bag)",
                                  "धमकी"])),
    ("protest", 2, "unrest", _rx([r"protests?", r"protesters?", r"protesting", r"dharna", r"demonstrations?", r"agitation",
                                  r"sit-?in", r"gherao", r"march(?:ed)? to", "प्रदर्शन", "धरना", "आंदोलन", "विरोध"])),
    ("aqi", 2, "hazard", _rx([r"AQI", r"smog", r"GRAP", r"air quality", r"air pollution", r"toxic air", "प्रदूषण", "स्मॉग"])),
    ("traffic", 1, "traffic", _rx([r"traffic jam", r"jam", r"blockade", r"roads? blocked", r"traffic advisory",
                                   r"diverted", r"diversion", r"congestion", r"gridlock", r"water-?logging", r"barricad\w*",
                                   r"closed for traffic", r"traffic (?:is )?affected", r"traffic alert", r"breakdown", r"slow[- ]moving traffic", "जाम", "ट्रैफिक"])),
    ("police", 1, "unrest", _rx([r"police", r"raid(?:ed|s)?", r"detained", r"arrested", r"cordon(?:ed)? off", r"bomb squad",
                                 r"security (?:tightened|beefed up)", r"high alert", r"paramilitary", r"RAF", "पुलिस",
                                 "हिरासत", "गिरफ्तार", "अलर्ट"])),
]
CITYWIDE = {"aqi"}
TYPE_INFO = {t: (sev, fam) for t, sev, fam, _ in TYPES}
FAMILY = {t: fam for t, _, fam, _ in TYPES}

_NEG = re.compile(r"(?<!\w)(?:ceasefire|cease-fire|under fire|fire(?:d)? (?:him|her|them|employees|staff)|firebrand|"
                  r"(?:is|so|was|absolute|pure|straight|looks?) fire|fire (?:song|track|album|post|tweet)|traffic of|human traffick\w*|drug traffick\w*)(?!\w)", re.I)
_DRILL = re.compile(r"mock[- ]?drill|\bdrill\b|rehearsal|old video|file (?:photo|pic)|years ago|anniversary|"
                    r"#throwback|मॉक ड्रिल|पुराना वीडियो", re.I)
_DEAD = re.compile(r"(?<!\w)(?:killed|dead|died|deaths?|bod(?:y|ies)|charred|lost (?:their|his|her) lives?|"
                   r"मौत|मारे गए|शव|की जान गई)(?!\w)", re.I)
_DEAD_N = re.compile(r"(\d{1,3})\s+(?:people\s+|persons\s+|men\s+|women\s+)?(?:killed|dead|died|लोगों की मौत)", re.I)
_HURT = re.compile(r"(?<!\w)(?:injured|hurt|wounded|hospitali[sz]ed|critical condition|घायल|जख्मी)(?!\w)", re.I)
_BIG = re.compile(r"(?<!\w)(?:major|massive|huge|big|several|multiple|बड़ा|भीषण)(?!\w)", re.I)
_AQI_N = re.compile(r"AQI[^0-9]{0,20}(\d{3})", re.I)
_AQI_SEV = re.compile(r"severe\+?|hazardous|emergency|GRAP[- ]?(?:III|IV|3|4)|stage (?:III|IV|3|4)|गंभीर", re.I)


def classify(text: str) -> tuple[str | None, list[str]]:
    t = _NEG.sub(" ", text or "")
    found = [name for name, _, _, rx in TYPES if rx.search(t)]
    # "fire" inside "firing" is handled by word boundaries; "police" alone is weak
    return (found[0] if found else None), found


def severity(text: str, typ: str | None) -> int:
    if not typ:
        return 0
    s = TYPE_INFO[typ][0]
    text = text or ""
    bump = 0
    m = _DEAD_N.search(text)
    if m and int(m.group(1)) >= 3:
        bump += 2
    elif _DEAD.search(text):
        bump += 1
    if _HURT.search(text):
        bump += 1
    bump = min(bump, 2)
    if typ in ("fire", "blast", "traffic", "clash", "protest", "accident") and _BIG.search(text):
        bump += 1
    if typ == "aqi":
        m = _AQI_N.search(text)
        n = int(m.group(1)) if m else 0
        s = 4 if (n >= 450 or _AQI_SEV.search(text)) else 3 if n >= 400 else 2
    if _DRILL.search(text):
        bump -= 2
    return max(1, min(5, s + min(bump, 2)))


def mentions_city(text: str, cfg: dict[str, Any]) -> bool:
    low = (text or "").lower()
    return any(term.lower() in low for term in cfg.get("city_terms", []))


def extract_post(post: dict, gaz: Gazetteer, cfg: dict[str, Any], grok: dict | None = None) -> dict | None:
    """Post -> incident observation (or None if not a local incident)."""
    text = " ".join((post.get("text") or "").split())
    typ, types = classify(text)
    hit = gaz.geocode(text)
    place = hit.place if hit else None
    sev = severity(text, typ)
    source = "rules"
    if grok:
        if grok.get("is_incident") is False:
            return None
        gt = grok.get("type")
        if gt in TYPE_INFO:
            typ, source = gt, "grok"
            if gt not in types:
                types = [gt, *types]
        gp = gaz.lookup(grok.get("place"))
        if gp:
            place, source = gp, "grok"
        try:
            gs = int(grok.get("severity"))
            if 1 <= gs <= 5:
                sev, source = gs, "grok"
        except (TypeError, ValueError):
            pass
    if not typ:
        return None
    if not place and not mentions_city(text, cfg):
        return None
    if place and not gaz.in_bounds(place["lat"], place["lon"]):
        return None
    if typ in CITYWIDE:
        place = None  # smog / AQI is a city-wide condition, not a point incident
    lon, lat = (cfg.get("center") or [None, None])[:2]
    handle = (post.get("author") or "").lstrip("@")
    trusted = handle.lower() in {h.lower() for h in cfg.get("trusted_handles", [])}
    return {
        "post_id": str(post.get("postId") or post.get("post_id") or ""),
        "author": handle,
        "url": post.get("url") or (f"https://x.com/{handle}/status/{post.get('postId')}" if handle else ""),
        "text": text[:400],
        "t": post.get("observedAt") or post.get("t") or "",
        "type": typ,
        "types": types,
        "family": FAMILY[typ],
        "severity": sev,
        "place_id": place["id"] if place else None,
        "place": place["name"] if place else cfg.get("name", "city"),
        "lat": place["lat"] if place else lat,
        "lon": place["lon"] if place else lon,
        "precision": "place" if place else "city",
        "verified": bool(post.get("verified")),
        "trusted": trusted,
        "source": source,
    }
