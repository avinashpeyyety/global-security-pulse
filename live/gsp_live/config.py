"""City config + private data locations."""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

LIVE_ROOT = Path(__file__).resolve().parents[1]
_CID = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")


def _yaml_load(text: str) -> Any:
    import yaml  # PyYAML (present in the Traceburst venv)
    return yaml.safe_load(text)


def city_ids(root: Path = LIVE_ROOT) -> list[str]:
    return sorted(p.stem for p in (root / "cities").glob("*.yaml") if _CID.match(p.stem))


def load_city(city: str, root: Path = LIVE_ROOT) -> dict[str, Any]:
    if not _CID.match(city or ""):
        raise ValueError(f"bad city id: {city!r}")
    cfg = _yaml_load((root / "cities" / f"{city}.yaml").read_text(encoding="utf-8")) or {}
    cfg.setdefault("id", city)
    cfg["_root"] = str(root)
    return cfg


def private_root() -> Path:
    return Path(os.environ.get("GSP_LIVE_PRIVATE") or (LIVE_ROOT / "private"))


def city_dir(city: str, fixture: bool = False) -> Path:
    """Real data: <private>/<city>/ ; fixture dry runs: <private>/_fixture/<city>/ (never mixed)."""
    if not _CID.match(city or ""):
        raise ValueError(f"bad city id: {city!r}")
    d = (private_root() / "_fixture" / city) if fixture else (private_root() / city)
    d.mkdir(parents=True, exist_ok=True)
    return d


def public_city(cfg: dict[str, Any]) -> dict[str, Any]:
    """What the local page needs to frame the map (no queries / handles)."""
    keys = ("id", "name", "timezone", "center", "zoom", "pitch", "bearing", "bounds")
    out = {k: cfg.get(k) for k in keys}
    out["half_life_h"] = (cfg.get("cluster") or {}).get("half_life_h", 6)
    out["min_weight"] = (cfg.get("cluster") or {}).get("min_weight", 0.04)
    return out
