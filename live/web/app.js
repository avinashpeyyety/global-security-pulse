/* GSP live ground situation — local only (127.0.0.1). MapLibre GL (vendored) with pitch, OSM 3D buildings,
   optional terrain, severity columns + crisp Traceburst-style rings. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const qs = new URLSearchParams(location.search);
  const DATA = qs.get("data") === "fixture" ? "?data=fixture" : "";
  const STYLE = "https://tiles.openfreemap.org/styles/dark";
  const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"; // free, no key
  const BAND = { low: { fill: "#3b4757", ring: "#64748b" }, medium: { fill: "#64748b", ring: "#94a3b8" },
                 high: { fill: "#a5b4c8", ring: "#e2e8f0" }, critical: { fill: "#7dd3fc", ring: "#e0f2fe" } };
  const band = (s) => (s >= 5 ? "critical" : s >= 4 ? "high" : s >= 3 ? "medium" : "low");
  const ACC = "#7dd3fc";
  let city = null, raw = null, version = "", asOf = null, sel = null, map, playing = false, cities = [];

  // ---------- time helpers
  const T = (s) => Date.parse(s);
  const fmt = (ms, tz) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz, hour12: false }).format(ms);
  const fmtCT = (ms) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }).format(ms);
  const ago = (ms, now) => { const m = Math.max(0, Math.round((now - ms) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${Math.floor(m / 1440)}d`; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nowMs = () => asOf ?? Date.now();

  // ---------- state at time t (scrubber): recompute from per-post timestamps
  function corr(posts) {
    const a = new Set(), v = new Set(), tr = new Set();
    for (const p of posts) { const h = (p.author || "").toLowerCase(); if (!h) continue; a.add(h); if (p.verified) v.add(h); if (p.trusted) tr.add(h); }
    const rawc = a.size + 0.5 * [...v].filter((h) => !tr.has(h)).length + 2 * tr.size;
    return { accounts: a.size, verified: v.size, trusted: tr.size, raw: rawc, score: 1 - Math.exp(-rawc / 5) };
  }
  function view() {
    if (!raw) return [];
    const t = nowMs(), hl = city?.half_life_h || 6, minW = city?.min_weight || 0.04;
    const out = [];
    for (const inc of raw.incidents || []) {
      const posts = inc.posts.filter((p) => T(p.t) <= t);
      if (!posts.length) continue;
      const last = Math.max(...posts.map((p) => T(p.t))), first = Math.min(...posts.map((p) => T(p.t)));
      const w = Math.pow(0.5, (t - last) / 3.6e6 / hl);
      if (w < minW) continue;
      const c = corr(posts);
      let sev = Math.max(...posts.map((p) => p.severity));
      if (c.raw >= 8 && sev < 5) sev += 1;
      out.push({ ...inc, posts, last, first, w, c, sev, band: band(sev), fresh: t - last < 30 * 60000 });
    }
    out.sort((a, b) => b.w * b.sev * (0.5 + b.c.score) - a.w * a.sev * (0.5 + a.c.score));
    return out;
  }

  // ---------- geometry
  function hexagon(lon, lat, rM) {
    const ring = [], dLat = rM / 111320, dLon = rM / (111320 * Math.cos((lat * Math.PI) / 180));
    for (let i = 0; i <= 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
    return ring;
  }
  // nudge incidents that share a place so columns don't overlap
  function spread(list) {
    const at = new Map();
    for (const i of list) {
      const k = `${i.lat.toFixed(4)},${i.lon.toFixed(4)}`; const n = at.get(k) || 0; at.set(k, n + 1);
      i.plon = i.lon + (n ? 0.0022 * Math.cos(n * 2.1) : 0); i.plat = i.lat + (n ? 0.0018 * Math.sin(n * 2.1) : 0);
    }
  }
  function features(list) {
    spread(list);
    const pts = [], cols = [];
    for (const i of list) {
      const props = { id: i.id, band: i.band, sev: i.sev, w: +i.w.toFixed(3), corr: +i.c.score.toFixed(3), fresh: i.fresh ? 1 : 0,
                      label: i.sev >= 3 ? `${i.place}` : "", r: +(3 + i.sev * 1.25 + (i.precision === "city" ? 0 : 0.5)).toFixed(2) };
      pts.push({ type: "Feature", id: i.id, geometry: { type: "Point", coordinates: [i.plon, i.plat] }, properties: props });
      if (i.precision === "place") {
        const h = 40 + i.sev * 130 * (0.35 + 0.65 * i.c.score) * Math.max(0.2, i.w);
        cols.push({ type: "Feature", id: i.id, geometry: { type: "Polygon", coordinates: [hexagon(i.plon, i.plat, 38 + i.sev * 12)] },
                    properties: { ...props, h: Math.round(h) } });
      }
    }
    return { pts: { type: "FeatureCollection", features: pts }, cols: { type: "FeatureCollection", features: cols } };
  }
  const bandExpr = (k) => ["match", ["get", "band"], "low", BAND.low[k], "medium", BAND.medium[k], "high", BAND.high[k], "critical", BAND.critical[k], BAND.low[k]];

  // ---------- map
  function initMap() {
    map = new maplibregl.Map({
      container: "map", style: STYLE, center: city.center, zoom: city.zoom, pitch: city.pitch ?? 50, bearing: city.bearing ?? 0,
      maxPitch: 75, pixelRatio: Math.max(1, devicePixelRatio || 1), attributionControl: { compact: true }, antialias: true,
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("load", () => {
      // dim, moody base: mute label + road colours a touch
      for (const l of map.getStyle().layers) {
        if (l.type === "symbol" && l.paint && "text-color" in (l.paint || {})) { try { map.setPaintProperty(l.id, "text-opacity", 0.7); } catch {} }
      }
      map.addSource("dem", { type: "raster-dem", tiles: [DEM], tileSize: 256, encoding: "terrarium", maxzoom: 14,
                             attribution: "Terrain: Mapzen/AWS Terrain Tiles" });
      map.addLayer({ id: "bldg-3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 12.5,
        paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, "#141a22", 40, "#1b2430", 120, "#243041"],
                 "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                 "fill-extrusion-opacity": 0.82, "fill-extrusion-vertical-gradient": true } });
      map.addSource("inc-pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addSource("inc-cols", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "inc-col", type: "fill-extrusion", source: "inc-cols",
        paint: { "fill-extrusion-color": bandExpr("fill"), "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": 0,
                 "fill-extrusion-opacity": 0.72, "fill-extrusion-vertical-gradient": true } });
      map.addLayer({ id: "inc-halo", type: "circle", source: "inc-pts", filter: ["==", ["get", "band"], "critical"],
        paint: { "circle-radius": ["+", ["get", "r"], 5], "circle-color": ACC, "circle-opacity": 0.06, "circle-stroke-width": 0.8,
                 "circle-stroke-color": ACC, "circle-stroke-opacity": 0.55, "circle-pitch-alignment": "map" } });
      map.addLayer({ id: "inc-pulse", type: "circle", source: "inc-pts", filter: ["==", ["get", "fresh"], 1],
        paint: { "circle-radius": ["get", "r"], "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 1, "circle-stroke-color": ACC,
                 "circle-stroke-opacity": 0.6, "circle-pitch-alignment": "map" } });
      map.addLayer({ id: "inc-dot", type: "circle", source: "inc-pts", layout: { "circle-sort-key": ["get", "sev"] },
        paint: { "circle-radius": ["get", "r"], "circle-color": bandExpr("fill"), "circle-opacity": ["interpolate", ["linear"], ["get", "w"], 0, 0.35, 1, 0.98],
                 "circle-stroke-width": 0.8, "circle-stroke-color": bandExpr("ring"), "circle-stroke-opacity": 0.9, "circle-blur": 0,
                 "circle-pitch-alignment": "map" } });
      map.addLayer({ id: "inc-label", type: "symbol", source: "inc-pts", filter: ["!=", ["get", "label"], ""],
        layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top",
                  "text-optional": true },
        paint: { "text-color": "#cbd5e1", "text-halo-color": "#0b0d10", "text-halo-width": 1.2, "text-opacity": ["interpolate", ["linear"], ["get", "w"], 0, 0.4, 1, 1] } });
      for (const id of ["inc-dot", "inc-col"]) {
        map.on("click", id, (e) => { const f = e.features?.[0]; if (f) select(f.properties.id, false); });
        map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
      }
      bindToggles(); render(); pulse();
    });
  }
  function bindToggles() {
    $("#t-bld").onchange = (e) => map.setLayoutProperty("bldg-3d", "visibility", e.target.checked ? "visible" : "none");
    $("#t-ter").onchange = (e) => map.setTerrain(e.target.checked ? { source: "dem", exaggeration: 1.6 } : null);
    $("#t-3d").onchange = (e) => {
      map.easeTo({ pitch: e.target.checked ? city.pitch ?? 50 : 0, bearing: e.target.checked ? city.bearing ?? 0 : 0, duration: 700 });
      map.setLayoutProperty("inc-col", "visibility", e.target.checked ? "visible" : "none");
    };
  }
  let lastPulse = 0;
  function pulse(ts = 0) {
    requestAnimationFrame(pulse);
    if (!map?.getLayer("inc-pulse") || ts - lastPulse < 33) return;
    lastPulse = ts;
    const ph = (ts % 2200) / 2200;
    map.setPaintProperty("inc-pulse", "circle-radius", ["+", ["get", "r"], 2 + ph * 20]);
    map.setPaintProperty("inc-pulse", "circle-stroke-opacity", 0.65 * (1 - ph));
  }

  // ---------- render
  let current = [];
  function render() {
    current = view();
    const f = features(current);
    if (map?.getSource("inc-pts")) { map.getSource("inc-pts").setData(f.pts); map.getSource("inc-cols").setData(f.cols); }
    renderList(); renderStatus(); timeline.draw();
  }
  function renderStatus() {
    const tz = city?.timezone || "Asia/Kolkata";
    const g = raw?.generatedAt ? T(raw.generatedAt) : null;
    $("#st-upd").innerHTML = g ? `collected <b>${fmt(g, tz)} IST</b> · ${fmtCT(g)} CT` : "no collection yet";
    const posts = current.reduce((n, i) => n + i.posts.length, 0);
    $("#st-cnt").innerHTML = `<b>${current.length}</b> incidents · ${posts} posts`;
    $("#st-src").textContent = (DATA ? "fixture dry-run" : "X live chatter") + " · 127.0.0.1";
    $("#asof").textContent = asOf ? `as of ${fmt(asOf, tz)} IST` : `live · ${fmt(Date.now(), tz)} IST`;
    $("#live").classList.toggle("on", !asOf);
    $("#rail-n").textContent = current.length ? `${current.length} active` : "";
  }
  function renderList() {
    const el = $("#list"), t = nowMs();
    if (!current.length) {
      el.innerHTML = `<div class="empty">${raw?.generatedAt ? "No active incidents at this time." : "No data yet. The collector writes <code>private/" + esc(city?.id) + "/incidents.json</code> every ~12 min."}</div>`;
      return;
    }
    el.innerHTML = current.map((i) => {
      const b = BAND[i.band];
      const bars = [1, 2, 3, 4, 5].map((k) => `<i style="${k <= i.sev ? `background:${b.fill};outline:0.5px solid ${b.ring}` : ""}"></i>`).join("");
      const posts = i.posts.slice(0, 12).map((p) => `<div class="post"><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">@${esc(p.author)}</a>
          ${p.trusted ? '<span class="pill">desk</span>' : ""}${p.verified ? '<span class="pill">✓</span>' : ""}${p.source === "grok" ? '<span class="pill">grok</span>' : ""}
          <span class="pm">· ${ago(T(p.t), t)} · ${esc(p.type)}</span><div>${esc(p.text)}</div></div>`).join("");
      return `<div class="inc${sel === i.id ? " sel" : ""}" data-id="${esc(i.id)}">
        <div class="top"><span class="dot" style="background:${b.fill};border-color:${b.ring}"></span><span class="ty">${esc(i.type)}</span>
          <span class="pl">${esc(i.place)}${i.precision === "city" ? ' <span class="pill">city-wide</span>' : ""}</span><span class="age">${ago(i.last, t)}</span></div>
        <div class="meta"><span class="bars" title="severity ${i.sev}/5">${bars}</span>
          <span title="distinct accounts / verified / news desks">◎ ${i.c.accounts} acct · ${i.c.verified} ✓ · ${i.c.trusted} desk</span>
          <span title="corroboration score">corr ${(i.c.score * 100) | 0}%</span><span title="time decay">w ${(i.w * 100) | 0}%</span></div>
        <div class="posts">${posts}</div></div>`;
    }).join("");
    el.querySelectorAll(".inc").forEach((n) => (n.onclick = (e) => { if (e.target.closest("a")) return; select(n.dataset.id, true); }));
  }
  function select(id, fly) {
    sel = sel === id && fly ? null : id;
    renderList();
    const i = current.find((x) => x.id === id);
    if (i && fly) map.flyTo({ center: [i.plon, i.plat], zoom: Math.max(map.getZoom(), 14), pitch: $("#t-3d").checked ? 58 : 0, speed: 0.9 });
    if (!fly) document.querySelector(`.inc[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // ---------- timeline scrubber (DPR-aware canvas, Traceburst style)
  const timeline = {
    span() { const end = Date.now(); return [end - 24 * 3.6e6, end]; },
    draw() {
      const c = $("#tl"), r = c.getBoundingClientRect(), dpr = devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      const x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height);
      const [a, b] = this.span(), W = r.width, H = r.height, nb = 96, bins = new Array(nb).fill(0), hot = new Array(nb).fill(0);
      for (const inc of raw?.incidents || []) for (const p of inc.posts) {
        const k = Math.floor(((T(p.t) - a) / (b - a)) * nb); if (k < 0 || k >= nb) continue; bins[k]++; if (p.severity >= 4) hot[k]++;
      }
      const mx = Math.max(3, ...bins), bw = W / nb;
      x.strokeStyle = "#232833"; x.lineWidth = 1; x.beginPath(); x.moveTo(0, H - 10.5); x.lineTo(W, H - 10.5); x.stroke();
      for (let k = 0; k < nb; k++) {
        if (!bins[k]) continue; const h = Math.max(1.5, ((H - 16) * bins[k]) / mx);
        x.fillStyle = "#3b4757"; x.fillRect(k * bw + 0.5, H - 11 - h, Math.max(1, bw - 1.5), h);
        if (hot[k]) { const hh = ((H - 16) * hot[k]) / mx; x.fillStyle = ACC; x.globalAlpha = 0.85; x.fillRect(k * bw + 0.5, H - 11 - hh, Math.max(1, bw - 1.5), hh); x.globalAlpha = 1; }
      }
      x.fillStyle = "#5b6472"; x.font = "10px Inter,system-ui"; const tz = city?.timezone || "Asia/Kolkata";
      for (let h = 0; h <= 24; h += 3) { const px = (h / 24) * W; x.fillRect(px, H - 10, 0.5, 3); if (h < 24) x.fillText(fmt(a + h * 3.6e6, tz), px + 2, H - 1); }
      const t = nowMs(), px = Math.min(W - 1, Math.max(0, ((t - a) / (b - a)) * W));
      x.strokeStyle = ACC; x.lineWidth = 1; x.beginPath(); x.moveTo(Math.round(px) + 0.5, 2); x.lineTo(Math.round(px) + 0.5, H - 10); x.stroke();
      x.fillStyle = ACC; x.beginPath(); x.arc(px, 4, 2.5, 0, 7); x.fill();
    },
    at(ev) { const r = $("#tl").getBoundingClientRect(), [a, b] = this.span(); return a + ((ev.clientX - r.left) / r.width) * (b - a); },
  };
  function bindTimeline() {
    const c = $("#tl"); let drag = false;
    const set = (ev) => { const t = timeline.at(ev); asOf = t >= Date.now() - 60000 ? null : t; render(); };
    c.onmousedown = (e) => { drag = true; playing = false; set(e); };
    addEventListener("mousemove", (e) => drag && set(e));
    addEventListener("mouseup", () => (drag = false));
    $("#live").onclick = () => { playing = false; asOf = null; render(); };
    $("#play").onclick = () => {
      if (playing) { playing = false; $("#play").textContent = "▶"; return; }
      playing = true; $("#play").textContent = "❚❚"; const [a, b] = timeline.span(); const t0 = performance.now(), dur = 24000;
      const step = (now) => { if (!playing) return; const f = Math.min(1, (now - t0) / dur); asOf = a + f * (b - a); render();
        if (f < 1) setTimeout(() => requestAnimationFrame(step), 120); else { playing = false; asOf = null; $("#play").textContent = "▶"; render(); } };
      requestAnimationFrame(step);
    };
    addEventListener("resize", () => timeline.draw());
  }

  // ---------- data + polling
  async function load() {
    const r = await fetch(`/api/city/${encodeURIComponent(city.id)}/incidents${DATA}`, { cache: "no-store" });
    raw = await r.json(); render();
  }
  async function poll() {
    try { const v = (await (await fetch("/api/version", { cache: "no-store" })).json()).version; if (v !== version) { version = v; await load(); } }
    catch (e) { $("#st-upd").textContent = "server unreachable"; }
  }
  async function boot() {
    cities = (await (await fetch("/api/cities", { cache: "no-store" })).json()).cities || [];
    const want = qs.get("city") || "delhi";
    city = cities.find((c) => c.id === want) || cities[0];
    $("#city").innerHTML = cities.map((c) => `<option value="${esc(c.id)}"${c.id === city.id ? " selected" : ""}>${esc(c.name || c.id)}</option>`).join("");
    $("#city").onchange = (e) => { qs.set("city", e.target.value); location.search = qs.toString(); };
    $("#lg-bands").innerHTML = ["low", "medium", "high", "critical"].map((k, n) => { const s = 7 + n * 2.5;
      return `<span><i style="width:${s}px;height:${s}px;background:${BAND[k].fill};border-color:${BAND[k].ring}${k === "critical" ? `;box-shadow:0 0 0 2px #0b0d10,0 0 0 2.8px ${ACC}88` : ""}"></i>${k}</span>`; }).join("");
    bindTimeline(); initMap(); await poll();
    setInterval(poll, 30000);                      // /api/version every 30 s
    setInterval(() => { if (!asOf && !playing) render(); }, 60000);  // live decay
  }
  boot();
})();
