"""Local live view server: http://127.0.0.1:8774/live/?city=delhi (launchd com.avinash.gsp-live-server).

stdlib only; bound to 127.0.0.1. Serves live/web/ and private/<city>/incidents.json (read fresh each request).
  /live/...                        static page (web/)
  /api/cities                      city framing from cities/*.yaml (no queries/handles)
  /api/city/<id>/incidents[?data=fixture]
  /api/version                     fingerprint of all incidents.json (page polls every ~30 s)
"""
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from .config import LIVE_ROOT, city_ids, load_city, private_root, public_city

HOST = "127.0.0.1"
PORT = int(os.environ.get("GSP_LIVE_PORT") or 8774)
WEB = LIVE_ROOT / "web"
_CID = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")


def incidents_path(city: str, fixture: bool) -> Path:
    base = private_root() / "_fixture" if fixture else private_root()
    return base / city / "incidents.json"


def version() -> str:
    h = hashlib.sha1()
    for c in city_ids():
        for fx in (False, True):
            p = incidents_path(c, fx)
            try:
                st = p.stat()
                h.update(f"{p}:{st.st_mtime_ns}:{st.st_size};".encode())
            except OSError:
                pass
    return h.hexdigest()[:16]


class Handler(BaseHTTPRequestHandler):
    server_version = "gsp-live/0.1"

    def log_message(self, fmt, *args):  # quiet
        pass

    def _send(self, code: int, body: bytes, ctype: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code: int = 200) -> None:
        self._send(code, json.dumps(obj, ensure_ascii=False).encode(), "application/json; charset=utf-8")

    def do_GET(self):  # noqa: N802
        u = urlparse(self.path)
        path, qs = u.path, parse_qs(u.query)
        if path in ("/", "/live"):
            self.send_response(302)
            self.send_header("Location", "/live/")
            self.end_headers()
            return
        if path == "/api/version":
            return self._json({"version": version()})
        if path == "/api/cities":
            out = []
            for c in city_ids():
                try:
                    out.append(public_city(load_city(c)))
                except Exception as e:  # noqa: BLE001
                    out.append({"id": c, "error": str(e)[:120]})
            return self._json({"cities": out})
        m = re.match(r"^/api/city/([a-z0-9-]+)/incidents$", path)
        if m and _CID.match(m.group(1)):
            p = incidents_path(m.group(1), qs.get("data", [""])[0] == "fixture")
            try:
                return self._send(200, p.read_bytes(), "application/json; charset=utf-8")
            except OSError:
                return self._json({"city": m.group(1), "incidents": [], "generatedAt": None, "empty": True})
        if path.startswith("/live/"):
            rel = path[len("/live/"):] or "index.html"
            f = (WEB / rel).resolve()
            if WEB.resolve() in f.parents and f.is_file():
                ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
                return self._send(200, f.read_bytes(), ctype)
        self._send(404, b"not found", "text/plain")


def serve(port: int | None = None) -> None:
    httpd = ThreadingHTTPServer((HOST, port or PORT), Handler)
    print(f"gsp-live serving http://{HOST}:{port or PORT}/live/  private={private_root()}", flush=True)
    httpd.serve_forever()
