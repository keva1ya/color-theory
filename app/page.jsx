"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
/* ──────────────────────────────────────────────────────────────────────────────────────── */

// ══════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function mixColors(hex1, hex2, ratio = 0.5) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function getContrast(h1, h2) {
  const l1 = getLuminance(h1), l2 = getLuminance(h2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
function buildCoolorsUrl(hexArr) {
  return "https://coolors.co/" + hexArr.map(h => h.replace("#", "")).join("-");
}
function copyText(t) { navigator.clipboard?.writeText(t).catch(() => {}); }

// ══════════════════════════════════════════════════════════════════
// GLOBAL CSS STRING
// ══════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@300;400;600&family=Inter:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#12101a; --bg2:#16131f; --bg3:#1d1928; --sf:#252030; --bd:#332d45;
  --tx:#ede8f5; --td:#9589b0; --tm:#4e4666;
  --ac:#b57bee; --as:rgba(181,123,238,.11); --am:rgba(181,123,238,.24);
  --serif:'DM Serif Display',Georgia,serif;
  --mono:'JetBrains Mono',monospace;
  --sans:'Inter',system-ui,sans-serif;
}
.lm {
  --bg:#f5f0fa; --bg2:#ede6f5; --bg3:#e3d9ef; --sf:#d8cce8; --bd:#c4b4dc;
  --tx:#1a1225; --td:#6b5889; --tm:#b09cc8;
  --ac:#8a48c8; --as:rgba(138,72,200,.08); --am:rgba(138,72,200,.20);
}
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--tx); font-family: var(--sans); }
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: var(--ac); border-radius: 2px; }
button { cursor: pointer; border: none; background: none; font-family: inherit; color: inherit; }
input[type=range] {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 4px; background: var(--bd); border-radius: 2px; outline: none; cursor: pointer;
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px;
  border-radius: 50%; background: var(--ac); border: 2px solid var(--bg);
}
@keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes pop    { from { opacity:0; transform:scale(.85); }      to { opacity:1; transform:scale(1); } }
@keyframes spin   { to { transform: rotate(360deg); } }
.fu { animation: fadeUp .22s ease both; }
.pp { animation: pop .18s ease both; }
`;

// ══════════════════════════════════════════════════════════════════
// CHAPTERS MANIFEST
// ══════════════════════════════════════════════════════════════════
const CHAPTERS = [
  { id: "wheel",      label: "Color Wheel",     short: "Wheel",    icon: "◎", num: "01" },
  { id: "properties", label: "HSL Properties",  short: "HSL",      icon: "◈", num: "02" },
  { id: "harmony",    label: "Color Harmony",   short: "Harmony",  icon: "⬡", num: "03" },
  { id: "schemes",    label: "Color Schemes",   short: "Schemes",  icon: "◫", num: "04" },
  { id: "contrast",   label: "Contrast & WCAG", short: "Contrast", icon: "◑", num: "05" },
  { id: "mixing",     label: "Color Mixing",    short: "Mixing",   icon: "⊕", num: "06" },
  { id: "psychology", label: "Psychology",      short: "Psych",    icon: "◇", num: "07" },
  { id: "coolors",    label: "Coolors Studio",  short: "Studio",   icon: "🎨", num: "—"  },
];

// ══════════════════════════════════════════════════════════════════
// SHARED ATOMS
// ══════════════════════════════════════════════════════════════════
function Callout({ icon, children }) {
  return (
    <div style={{ padding: "15px 18px", background: "var(--as)", border: "1px solid var(--am)", borderRadius: 8, display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 28 }}>
      <span style={{ color: "var(--ac)", fontSize: 17, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--td)" }}>{children}</p>
    </div>
  );
}
function ML({ children }) {
  return <span style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11, color: "var(--tm)", letterSpacing: ".05em", marginBottom: 7 }}>{children}</span>;
}
function Divider() { return <div style={{ borderTop: "1px solid var(--bd)", margin: "26px 0" }} />; }

function HexChip({ hex }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { copyText(hex); setOk(true); setTimeout(() => setOk(false), 1300); }}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 5, background: "var(--bg3)", border: "1px solid var(--bd)", fontFamily: "var(--mono)", fontSize: 11, color: ok ? "var(--ac)" : "var(--td)", transition: "all .14s" }}
    >
      <span style={{ width: 9, height: 9, borderRadius: 2, background: hex, display: "inline-block", border: "1px solid rgba(255,255,255,.1)" }} />
      {ok ? "✓ copied" : hex.toUpperCase()}
    </button>
  );
}

function CoolorsBtn({ hexArr, label = "Open in Coolors ↗" }) {
  const url = buildCoolorsUrl(hexArr.filter(Boolean).slice(0, 5));
  const [hov, setHov] = useState(false);
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 7, background: "var(--sf)", border: `1px solid ${hov ? "var(--ac)" : "var(--bd)"}`, color: hov ? "var(--ac)" : "var(--td)", fontSize: 12, fontFamily: "var(--mono)", textDecoration: "none", transition: "all .14s" }}
    >
      🎨 {label}
    </a>
  );
}

function PaletteRow({ hexArr, height = 52 }) {
  return (
    <>
      <div style={{ display: "flex", height, borderRadius: 8, overflow: "hidden", border: "1px solid var(--bd)", marginBottom: 8 }}>
        {hexArr.map((h, i) => <div key={i} style={{ flex: 1, background: h }} title={h} />)}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {hexArr.map((h, i) => <HexChip key={i} hex={h} />)}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 1 — COLOR WHEEL
// ══════════════════════════════════════════════════════════════════
function WheelChapter() {
  const cvs = useRef();
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);

  const swatches = [
    { hue: 0,   name: "Red",          type: "primary"   },
    { hue: 30,  name: "Red-Orange",   type: "tertiary"  },
    { hue: 60,  name: "Yellow",       type: "secondary" },
    { hue: 90,  name: "Yellow-Green", type: "tertiary"  },
    { hue: 120, name: "Green",        type: "primary"   },
    { hue: 150, name: "Blue-Green",   type: "tertiary"  },
    { hue: 180, name: "Cyan",         type: "secondary" },
    { hue: 210, name: "Blue-Cyan",    type: "tertiary"  },
    { hue: 240, name: "Blue",         type: "primary"   },
    { hue: 270, name: "Blue-Violet",  type: "tertiary"  },
    { hue: 300, name: "Magenta",      type: "secondary" },
    { hue: 330, name: "Red-Magenta",  type: "tertiary"  },
  ];

  const types = {
    primary:   { c: "#b57bee", d: "Cannot be created by mixing other colors." },
    secondary: { c: "#7bb8ee", d: "Made by mixing two adjacent primaries." },
    tertiary:  { c: "#e8a0d4", d: "Made by mixing a primary with an adjacent secondary." },
  };

  useEffect(() => {
    const canvas = cvs.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = 150, cy = 150, outer = 128, inner = 52;
    ctx.clearRect(0, 0, 300, 300);
    for (let i = 0; i < 360; i++) {
      const a1 = ((i - 0.5) / 360) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 0.5) / 360) * Math.PI * 2 - Math.PI / 2;
      const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
      g.addColorStop(0, `hsla(${i},18%,88%,.18)`);
      g.addColorStop(1, `hsl(${i},88%,56%)`);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * inner, cy + Math.sin(a1) * inner);
      ctx.arc(cx, cy, outer, a1, a2);
      ctx.arc(cx, cy, inner, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }
  }, []);

  const onMove = useCallback(e => {
    const canvas = cvs.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 150;
    const y = e.clientY - rect.top - 150;
    const dist = Math.sqrt(x * x + y * y);
    if (dist > 52 && dist < 128) {
      setHov(Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 90 + 360) % 360));
    } else {
      setHov(null);
    }
  }, []);

  const s = sel != null ? swatches[sel] : null;
  const hh = hov != null ? hslToHex(hov, 82, 55) : null;

  return (
    <div>
      <Callout icon="◎">
        The <strong>color wheel</strong> arranges all hues in a circle revealing their natural relationships. <strong>Hover</strong> to sample any hue — <strong>click</strong> a swatch below to inspect it.
      </Callout>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 28, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <canvas
              ref={cvs} width={300} height={300}
              style={{ borderRadius: "50%", border: "1px solid var(--bd)", cursor: "crosshair", display: "block" }}
              onMouseMove={onMove} onMouseLeave={() => setHov(null)}
            />
            {hh && (
              <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: 6, padding: "5px 11px", fontFamily: "var(--mono)", fontSize: 11, display: "flex", gap: 8, alignItems: "center", pointerEvents: "none", whiteSpace: "nowrap" }}>
                <span style={{ width: 11, height: 11, borderRadius: 2, background: hh, display: "inline-block" }} />
                {hh.toUpperCase()} · {hov}°
              </div>
            )}
          </div>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>// hover · click swatches</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <ML>color classes</ML>
          {Object.entries(types).map(([k, v]) => (
            <div key={k} style={{ padding: "11px 14px", background: "var(--sf)", border: "1px solid var(--bd)", borderLeft: `3px solid ${v.c}`, borderRadius: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: v.c, flexShrink: 0 }} />
                <strong style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>{k}</strong>
              </div>
              <p style={{ fontSize: 12, color: "var(--td)", marginBottom: 7 }}>{v.d}</p>
              <div style={{ display: "flex", gap: 4 }}>
                {swatches.filter(sw => sw.type === k).map(sw => (
                  <div key={sw.hue} style={{ width: 20, height: 20, borderRadius: 3, background: `hsl(${sw.hue},80%,56%)`, cursor: "pointer", border: "1px solid rgba(255,255,255,.07)" }} title={`${sw.name} · ${sw.hue}°`} />
                ))}
              </div>
            </div>
          ))}
          {s && (
            <div className="pp" style={{ padding: 13, background: `hsl(${s.hue},55%,16%)`, border: `1px solid hsl(${s.hue},45%,32%)`, borderRadius: 8, display: "flex", gap: 13, alignItems: "center" }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: `hsl(${s.hue},80%,56%)`, flexShrink: 0 }} />
              <div>
                <strong style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{s.name}</strong>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--td)", marginTop: 3, marginBottom: 7 }}>hue: {s.hue}° · {s.type}</p>
                <CoolorsBtn hexArr={[hslToHex(s.hue, 80, 56), hslToHex((s.hue + 30) % 360, 80, 56), hslToHex((s.hue + 60) % 360, 80, 56)]} label="Explore on Coolors" />
              </div>
            </div>
          )}
        </div>
      </div>

      <Divider />
      <ML>12-hue spectrum — click to inspect</ML>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
        {swatches.map((sw, i) => (
          <button key={i} onClick={() => setSel(i === sel ? null : i)}
            style={{ width: 50, height: 50, borderRadius: 9, background: `hsl(${sw.hue},80%,56%)`, border: sel === i ? "3px solid var(--tx)" : "2px solid transparent", transform: sel === i ? "scale(1.12)" : "scale(1)", transition: "all .14s" }}
            title={sw.name} />
        ))}
      </div>
      <CoolorsBtn hexArr={[0, 60, 120, 180, 240, 300].map(h => hslToHex(h, 80, 56))} label="Full spectrum on Coolors" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 2 — HSL PROPERTIES
// ══════════════════════════════════════════════════════════════════
function HSLChapter() {
  const [hue, setHue] = useState(275);
  const [sat, setSat] = useState(68);
  const [lit, setLit] = useState(55);
  const [copied, setCopied] = useState("");

  const hex = hslToHex(hue, sat, lit);
  const { r, g, b } = hexToRgb(hex);
  const copy = v => { copyText(v); setCopied(v); setTimeout(() => setCopied(""), 1400); };

  const sliders = [
    { label: "Hue",        val: hue, set: setHue, min: 0,   max: 360, unit: "°", desc: "The color's identity — its position on the wheel.", grad: "linear-gradient(to right,hsl(0,80%,54%),hsl(60,80%,54%),hsl(120,80%,54%),hsl(180,80%,54%),hsl(240,80%,54%),hsl(300,80%,54%),hsl(360,80%,54%))" },
    { label: "Saturation", val: sat, set: setSat, min: 0,   max: 100, unit: "%", desc: "The intensity — 0% = grey, 100% = fully vivid.", grad: `linear-gradient(to right,hsl(${hue},0%,${lit}%),hsl(${hue},100%,${lit}%))` },
    { label: "Lightness",  val: lit, set: setLit, min: 0,   max: 100, unit: "%", desc: "The brightness — 0% = black, 50% = pure, 100% = white.", grad: `linear-gradient(to right,hsl(${hue},${sat}%,0%),hsl(${hue},${sat}%,50%),hsl(${hue},${sat}%,100%))` },
  ];
  const vals = [["HEX", hex.toUpperCase()], ["RGB", `rgb(${r},${g},${b})`], ["HSL", `hsl(${hue},${sat}%,${lit}%)`]];
  const tints  = [80, 70, 60, 54, 44, 34].map(l => hslToHex(hue, sat, l));
  const shades = [70, 56, 44, 32, 20, 10].map(l => hslToHex(hue, sat, l));
  const tones  = [90, 72, 55, 40, 25, 12].map(s => hslToHex(hue, s, lit));

  return (
    <div>
      <Callout icon="◈">Every color maps to three axes: <strong>Hue</strong> (which color?), <strong>Saturation</strong> (how vivid?), <strong>Lightness</strong> (how bright?). Drag the sliders to see values update live.</Callout>

      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--bd)", marginBottom: 28 }}>
        <div style={{ height: 110, background: `hsl(${hue},${sat}%,${lit}%)`, transition: "background .08s" }} />
        <div style={{ background: "var(--sf)", padding: "12px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {vals.map(([lbl, v]) => (
            <button key={lbl} onClick={() => copy(v)}
              style={{ padding: "6px 11px", borderRadius: 6, background: copied === v ? "var(--as)" : "var(--bg3)", border: `1px solid ${copied === v ? "var(--ac)" : "var(--bd)"}`, display: "flex", gap: 7, alignItems: "center", transition: "all .14s" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>{lbl}</span>
              <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: copied === v ? "var(--ac)" : "var(--tx)" }}>{v}</code>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 28 }}>
        {sliders.map(row => (
          <div key={row.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 19 }}>{row.label}</span>
              <code style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--ac)" }}>{Math.round(row.val)}{row.unit}</code>
            </div>
            <p style={{ fontSize: 13, color: "var(--td)", marginBottom: 10 }}>{row.desc}</p>
            <div style={{ position: "relative" }}>
              <div style={{ height: 10, borderRadius: 5, background: row.grad }} />
              <input type="range" min={row.min} max={row.max} value={row.val} onChange={e => row.set(Number(e.target.value))}
                style={{ position: "absolute", inset: 0, opacity: 0, height: 10, cursor: "pointer", zIndex: 2 }} />
              <div style={{ position: "absolute", top: -3, left: `${((row.val - row.min) / (row.max - row.min)) * 100}%`, width: 16, height: 16, borderRadius: "50%", background: "var(--ac)", border: "2px solid var(--bg)", transform: "translateX(-50%)", pointerEvents: "none", transition: "left .04s" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
        {[{ l: "tints", cols: tints }, { l: "shades", cols: shades }, { l: "tones", cols: tones }].map(({ l, cols }) => (
          <div key={l}>
            <ML>{l}</ML>
            <div style={{ display: "flex", gap: 3 }}>
              {cols.map((c, i) => <div key={i} style={{ flex: 1, height: 32, borderRadius: 3, background: c, cursor: "pointer", border: "1px solid rgba(128,128,128,.1)" }} title={c} onClick={() => copy(c)} />)}
            </div>
          </div>
        ))}
      </div>
      <CoolorsBtn hexArr={[hslToHex(hue, sat, 70), hex, hslToHex(hue, sat, 35), hslToHex((hue + 30) % 360, sat, lit), hslToHex((hue - 30 + 360) % 360, sat, lit)]} label="Send to Coolors" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 3 — HARMONY
// ══════════════════════════════════════════════════════════════════
function HarmonyChapter() {
  const [base, setBase] = useState(275);
  const [scheme, setScheme] = useState("complementary");
  const [sat, setSat] = useState(72);
  const [lit, setLit] = useState(55);

  const schemes = {
    complementary:  { label: "Complementary",       offsets: [180],           desc: "Two colors directly opposite — max contrast, energetic." },
    analogous:      { label: "Analogous",            offsets: [-30, 30],       desc: "Three neighbors — serene, natural, harmonious." },
    triadic:        { label: "Triadic",              offsets: [120, 240],      desc: "Three evenly spaced at 120° — vibrant but balanced." },
    splitcomp:      { label: "Split-Complementary",  offsets: [150, 210],      desc: "Complement split in two — gentler contrast." },
    tetradic:       { label: "Tetradic",             offsets: [90, 180, 270],  desc: "Four hues at 90° — rich complexity." },
    monochromatic:  { label: "Monochromatic",        offsets: [],              desc: "One hue at varying lightness — refined, cohesive." },
  };

  const hues = [base, ...schemes[scheme].offsets.map(o => ((base + o) % 360 + 360) % 360)];
  const hexArr = scheme === "monochromatic"
    ? [70, 60, 50, 40, 28].map(l => hslToHex(base, sat, l))
    : hues.map(h => hslToHex(h, sat, lit));

  return (
    <div>
      <Callout icon="⬡"><strong>Color harmony</strong> uses wheel geometry to build palettes that feel intentional. Every professional palette follows one of these patterns.</Callout>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
        <div>
          <ML>base hue — {Math.round(base)}°</ML>
          <div style={{ position: "relative", marginBottom: 10 }}>
            <div style={{ height: 10, borderRadius: 5, background: "linear-gradient(to right,hsl(0,80%,54%),hsl(60,80%,54%),hsl(120,80%,54%),hsl(180,80%,54%),hsl(240,80%,54%),hsl(300,80%,54%),hsl(360,80%,54%))" }} />
            <input type="range" min={0} max={360} value={base} onChange={e => setBase(Number(e.target.value))} style={{ position: "absolute", inset: 0, opacity: 0, height: 10, cursor: "pointer" }} />
            <div style={{ position: "absolute", top: -3, left: `${(base / 360) * 100}%`, width: 16, height: 16, borderRadius: "50%", background: "var(--ac)", border: "2px solid var(--bg)", transform: "translateX(-50%)", pointerEvents: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[{ l: "Sat", v: sat, s: setSat }, { l: "Light", v: lit, s: setLit }].map(sl => (
              <div key={sl.l} style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "var(--td)" }}>{sl.l}</span>
                  <code style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ac)" }}>{sl.v}%</code>
                </div>
                <input type="range" min={0} max={100} value={sl.v} onChange={e => sl.s(Number(e.target.value))} />
              </div>
            ))}
          </div>
          <ML>scheme</ML>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(schemes).map(([k, v]) => (
              <button key={k} onClick={() => setScheme(k)}
                style={{ textAlign: "left", padding: "9px 12px", borderRadius: 7, fontSize: 13, background: scheme === k ? "var(--as)" : "var(--sf)", border: `1px solid ${scheme === k ? "var(--ac)" : "var(--bd)"}`, color: scheme === k ? "var(--tx)" : "var(--td)", transition: "all .12s" }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <ML>palette</ML>
          <PaletteRow hexArr={hexArr} height={80} />
          <CoolorsBtn hexArr={hexArr} />
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--sf)", border: "1px solid var(--bd)", borderLeft: "3px solid var(--ac)", borderRadius: 6 }}>
            <strong style={{ fontFamily: "var(--serif)", fontSize: 15, display: "block", marginBottom: 6 }}>{schemes[scheme].label}</strong>
            <p style={{ fontSize: 13, color: "var(--td)" }}>{schemes[scheme].desc}</p>
          </div>
          <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--bg3)", borderRadius: 6, border: "1px solid var(--bd)" }}>
            <ML>// 60·30·10 rule</ML>
            <div style={{ display: "flex", height: 12, borderRadius: 3, overflow: "hidden", margin: "6px 0 7px" }}>
              <div style={{ width: "60%", background: hexArr[0] }} />
              <div style={{ width: "30%", background: hexArr[1] || hexArr[0] }} />
              <div style={{ width: "10%", background: hexArr[2] || hexArr[0] }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--td)" }}>60% dominant · 30% secondary · 10% accent</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 4 — COLOR SCHEMES
// ══════════════════════════════════════════════════════════════════
const PRESETS = [
  { name: "Mauve Dusk",    colors: ["#2a1f3d","#5c3d7a","#b57bee","#e8a0d4","#f5eeff"], mood: "Mysterious · Creative",  use: "Luxury, beauty, events" },
  { name: "Ocean Depths",  colors: ["#0a1628","#1a3a5c","#2e6fa0","#5ba3cc","#b8ddf0"], mood: "Calm · Trustworthy",      use: "Tech, finance, health" },
  { name: "Terracotta",    colors: ["#2c1810","#7a3b28","#c4633a","#e8a080","#f5ddd0"], mood: "Warm · Earthy",           use: "Food, lifestyle, artisan" },
  { name: "Sage Garden",   colors: ["#1a2818","#3a5c36","#6a9a64","#a8c8a0","#e0f0dc"], mood: "Natural · Fresh",         use: "Eco, wellness, food" },
  { name: "Midnight Gold", colors: ["#0d0d18","#1a1a3a","#3a3070","#c9a020","#f5e8b0"], mood: "Luxury · Bold",           use: "Premium brands" },
  { name: "Coral Pop",     colors: ["#1a0808","#5c1a1a","#e85454","#f5a080","#fff0ec"], mood: "Energetic · Youthful",    use: "Startups, fitness" },
  { name: "Slate Minimal", colors: ["#101418","#1e2832","#3a4a5a","#8a9aaa","#e8eef4"], mood: "Clean · Modern",          use: "Portfolio, SaaS" },
  { name: "Lavender Dream",colors: ["#18101a","#3a2050","#7a50a0","#c0a0e8","#f0e8ff"], mood: "Soft · Whimsical",        use: "Wellness, beauty" },
  { name: "Forest Ember",  colors: ["#0d1208","#2a3c18","#5a7a30","#c87820","#f5c878"], mood: "Earthy · Adventurous",    use: "Outdoor, travel" },
  { name: "Arctic Steel",  colors: ["#0a1018","#1a2838","#304a60","#78a8cc","#e0f0ff"], mood: "Cool · Futuristic",       use: "Tech, aerospace" },
  { name: "Berry Burst",   colors: ["#180818","#4a1040","#a03080","#e870b8","#ffd0f0"], mood: "Vibrant · Playful",       use: "Music, entertainment" },
  { name: "Sand & Stone",  colors: ["#18140c","#4a3c28","#8a7050","#c8aa80","#f0e8d8"], mood: "Neutral · Timeless",      use: "Architecture, fashion" },
];

function SchemesChapter() {
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState("presets");
  const [custom, setCustom] = useState(["#b57bee","#7bb8ee","#e8a0d4","#252030","#ede8f5"]);
  const [preview, setPreview] = useState("palette");
  const s = PRESETS[active];

  const UIPreview = ({ cols }) => (
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--bd)" }}>
      <div style={{ background: cols[0], padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 13, color: cols[4] }}>Brand</span>
        <div style={{ display: "flex", gap: 10 }}>
          {["Home","About","Work"].map(x => <span key={x} style={{ fontSize: 11, color: cols[3] }}>{x}</span>)}
        </div>
      </div>
      <div style={{ background: cols[1], padding: "22px 14px" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, color: cols[4], marginBottom: 7 }}>Hero Headline</div>
        <div style={{ fontSize: 12, color: cols[3], marginBottom: 13, maxWidth: 280 }}>A short description that explains the value proposition.</div>
        <button style={{ padding: "7px 16px", borderRadius: 5, background: cols[2], color: cols[0], fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>Get Started</button>
      </div>
      <div style={{ background: cols[0], padding: "10px 14px", display: "flex", gap: 7 }}>
        {["Feature A","Feature B","Feature C"].map((f, i) => (
          <div key={i} style={{ flex: 1, padding: "9px 10px", borderRadius: 5, background: cols[1], border: `1px solid ${cols[2]}40` }}>
            <div style={{ width: 18, height: 18, borderRadius: 3, background: cols[2], marginBottom: 5 }} />
            <div style={{ fontSize: 11, color: cols[3] }}>{f}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <Callout icon="◫">A <strong>color scheme</strong> is a curated palette working as a complete design system. Study real-world examples in Palette or UI Preview mode, then build your own in the Builder.</Callout>

      <div style={{ display: "flex", gap: 7, marginBottom: 22 }}>
        {[["presets","📚 Preset Schemes"],["builder","🛠 Scheme Builder"]].map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, background: tab === id ? "var(--ac)" : "var(--sf)", color: tab === id ? "#fff" : "var(--td)", border: `1px solid ${tab === id ? "var(--ac)" : "var(--bd)"}`, transition: "all .13s" }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "presets" && (
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ maxHeight: 520, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, paddingRight: 3 }}>
            {PRESETS.map((ps, i) => (
              <button key={i} onClick={() => setActive(i)}
                style={{ textAlign: "left", padding: "9px 11px", borderRadius: 7, background: active === i ? "var(--as)" : "var(--sf)", border: `1px solid ${active === i ? "var(--ac)" : "var(--bd)"}`, transition: "all .12s", display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  {ps.colors.map((c, j) => <div key={j} style={{ width: 10, height: 22, borderRadius: 2, background: c }} />)}
                </div>
                <span style={{ fontSize: 12, color: active === i ? "var(--tx)" : "var(--td)", fontWeight: active === i ? 500 : 400 }}>{ps.name}</span>
              </button>
            ))}
          </div>

          <div className="fu">
            <div style={{ display: "flex", gap: 6, marginBottom: 13 }}>
              {[["palette","Palette"],["ui","UI Preview"]].map(([id, lbl]) => (
                <button key={id} onClick={() => setPreview(id)}
                  style={{ padding: "6px 13px", borderRadius: 6, fontSize: 12, background: preview === id ? "var(--as)" : "var(--bg3)", border: `1px solid ${preview === id ? "var(--ac)" : "var(--bd)"}`, color: preview === id ? "var(--ac)" : "var(--td)", transition: "all .12s" }}>
                  {lbl}
                </button>
              ))}
            </div>
            {preview === "palette" ? <PaletteRow hexArr={s.colors} height={80} /> : <UIPreview cols={s.colors} />}
            <div style={{ padding: "12px 14px", background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 8, marginTop: 13, marginBottom: 11 }}>
              <strong style={{ fontFamily: "var(--serif)", fontSize: 16, display: "block", marginBottom: 5 }}>{s.name}</strong>
              <p style={{ fontSize: 12, color: "var(--ac)", fontFamily: "var(--mono)", marginBottom: 5 }}>{s.mood}</p>
              <p style={{ fontSize: 13, color: "var(--td)" }}>Best for: {s.use}</p>
            </div>
            <CoolorsBtn hexArr={s.colors} label={`Open "${s.name}" in Coolors`} />
          </div>
        </div>
      )}

      {tab === "builder" && (
        <div>
          <ML>pick 5 colors for your scheme</ML>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {custom.map((c, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <label style={{ cursor: "pointer", position: "relative" }}>
                  <div style={{ width: 60, height: 60, borderRadius: 9, background: c, border: "2px solid var(--bd)" }} />
                  <input type="color" value={c} onChange={e => { const n = [...custom]; n[i] = e.target.value; setCustom(n); }} style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} />
                </label>
                <HexChip hex={c} />
              </div>
            ))}
          </div>
          <PaletteRow hexArr={custom} height={64} />
          <ML>ui preview</ML>
          <UIPreview cols={custom} />
          <div style={{ marginTop: 14, display: "flex", gap: 9, flexWrap: "wrap" }}>
            <CoolorsBtn hexArr={custom} label="Refine on Coolors ↗" />
            <button onClick={() => setCustom(PRESETS[Math.floor(Math.random() * PRESETS.length)].colors)}
              style={{ padding: "8px 14px", borderRadius: 7, background: "var(--sf)", border: "1px solid var(--bd)", color: "var(--td)", fontSize: 12, fontFamily: "var(--mono)" }}>
              🎲 Random preset
            </button>
            <button onClick={() => {
              const bh = Math.floor(Math.random() * 360);
              setCustom([hslToHex(bh,65,25), hslToHex(bh,70,40), hslToHex(bh,75,55), hslToHex((bh+180)%360,65,55), hslToHex(bh,20,88)]);
            }} style={{ padding: "8px 14px", borderRadius: 7, background: "var(--sf)", border: "1px solid var(--bd)", color: "var(--td)", fontSize: 12, fontFamily: "var(--mono)" }}>
              ✨ Auto-generate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 5 — CONTRAST
// ══════════════════════════════════════════════════════════════════
function ContrastChapter() {
  const [fg, setFg] = useState("#ede8f5");
  const [bg, setBg] = useState("#12101a");
  const [txt, setTxt] = useState("The quick brown fox jumps over the lazy dog.");

  const ratio = getContrast(fg, bg);
  const pct = Math.min((ratio / 21) * 100, 100);
  const bc = ratio >= 7 ? "#3caa6e" : ratio >= 4.5 ? "#c9a022" : ratio >= 3 ? "#e07c30" : "#c0192c";

  const levels = [
    { name: "AA Large",   min: 3.0, pass: ratio >= 3.0, desc: "Large text ≥18pt" },
    { name: "AA Normal",  min: 4.5, pass: ratio >= 4.5, desc: "Regular body text" },
    { name: "AAA Large",  min: 4.5, pass: ratio >= 4.5, desc: "Enhanced large text" },
    { name: "AAA Normal", min: 7.0, pass: ratio >= 7.0, desc: "Enhanced body (strictest)" },
  ];
  const presets = [
    { name: "This site",   fg: "#ede8f5", bg: "#12101a" },
    { name: "Black/White", fg: "#000",    bg: "#fff"    },
    { name: "Fail",        fg: "#888",    bg: "#aaa"    },
    { name: "AA Pass",     fg: "#fff",    bg: "#767676" },
  ];

  return (
    <div>
      <Callout icon="◑"><strong>Contrast ratio</strong> quantifies legibility. WCAG 2.1 minimums ensure your UI is readable for people with low vision. Click presets or use the pickers.</Callout>

      <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
        {presets.map(p => (
          <button key={p.name} onClick={() => { setFg(p.fg); setBg(p.bg); }}
            style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12, background: "var(--sf)", border: "1px solid var(--bd)", color: "var(--td)" }}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[{ label: "foreground (text)", val: fg, set: setFg }, { label: "background", val: bg, set: setBg }].map(item => (
            <div key={item.label}>
              <ML>{item.label}</ML>
              <label style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer", position: "relative" }}>
                <div style={{ width: 46, height: 46, borderRadius: 9, background: item.val, border: "2px solid var(--bd)" }} />
                <code style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--tx)" }}>{item.val.toUpperCase()}</code>
                <input type="color" value={item.val} onChange={e => item.set(e.target.value)} style={{ position: "absolute", opacity: 0, inset: 0, width: 46, height: 46, cursor: "pointer" }} />
              </label>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 9, overflow: "hidden", border: "1px solid var(--bd)" }}>
          <div style={{ background: bg, padding: "18px 16px", minHeight: 125 }}>
            <textarea value={txt} onChange={e => setTxt(e.target.value)}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: fg, fontFamily: "var(--serif)", fontSize: 19, resize: "none", lineHeight: 1.5, marginBottom: 7 }} rows={2} />
            <p style={{ color: fg, fontSize: 13, marginBottom: 4 }}>Small body text — is this readable?</p>
            <p style={{ color: fg, fontSize: 11 }}>Even smaller — 11px stress test.</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
          <ML>contrast ratio</ML>
          <span style={{ fontFamily: "var(--serif)", fontSize: 40, color: bc, transition: "color .3s" }}>{ratio.toFixed(2)}:1</span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: "var(--bd)", overflow: "hidden", marginBottom: 4 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: bc, transition: "width .3s,background .3s", borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>1:1</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>21:1</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
        <ML>wcag 2.1 compliance</ML>
        {levels.map(l => (
          <div key={l.name} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 13px", borderRadius: 7, background: "var(--sf)", border: `1px solid ${l.pass ? "#3caa6e44" : "var(--bd)"}`, transition: "border .2s" }}>
            <span style={{ color: l.pass ? "#3caa6e" : "var(--tm)", fontSize: 14 }}>{l.pass ? "✓" : "✗"}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: l.pass ? "#3caa6e" : "#c0192c", minWidth: 88 }}>{l.name}</span>
            <span style={{ fontSize: 12, color: "var(--td)", flex: 1 }}>{l.desc}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tm)" }}>≥ {l.min}</span>
          </div>
        ))}
      </div>
      <CoolorsBtn hexArr={[fg, bg]} label="Check on Coolors Contrast Checker" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 6 — MIXING
// ══════════════════════════════════════════════════════════════════
function MixingChapter() {
  const [c1, setC1] = useState("#b57bee");
  const [c2, setC2] = useState("#7bb8ee");
  const [ratio, setRatio] = useState(50);
  const [steps, setSteps] = useState(7);
  const [model, setModel] = useState("additive");

  const mixed = mixColors(c1, c2, ratio / 100);
  const grad = Array.from({ length: steps }, (_, i) => mixColors(c1, c2, i / (steps - 1)));

  const models = [
    { id: "additive",    label: "Additive (Light/RGB)",     desc: "Screens emit light — mixing adds energy. All primaries → White.",  primaries: ["#ff0000","#00ff00","#0000ff"], result: "#ffffff" },
    { id: "subtractive", label: "Subtractive (Pigment/CMY)", desc: "Pigments absorb light. All primaries → Black.", primaries: ["#00e5e5","#e500e5","#e5e500"], result: "#111" },
  ];
  const cur = models.find(m => m.id === model);

  return (
    <div>
      <Callout icon="⊕">Color mixing works differently for <strong>light</strong> vs <strong>pigment</strong>. Digital = additive RGB; print = subtractive CMYK. Understanding both prevents costly mistakes.</Callout>

      <div style={{ display: "flex", gap: 9, marginBottom: 14 }}>
        {models.map(m => (
          <button key={m.id} onClick={() => setModel(m.id)}
            style={{ flex: 1, padding: "9px 13px", borderRadius: 8, fontSize: 13, background: model === m.id ? "var(--ac)" : "var(--sf)", border: `1px solid ${model === m.id ? "var(--ac)" : "var(--bd)"}`, color: model === m.id ? "#fff" : "var(--td)", transition: "all .13s" }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "13px 15px", background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 8, marginBottom: 22 }}>
        <p style={{ fontSize: 13, color: "var(--td)", marginBottom: 9 }}>{cur.desc}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>primaries →</span>
          {cur.primaries.map((c, i) => <div key={i} style={{ width: 26, height: 26, borderRadius: 4, background: c, border: "1px solid rgba(255,255,255,.1)" }} />)}
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tm)" }}>=</span>
          <div style={{ width: 26, height: 26, borderRadius: 4, background: cur.result, border: "1px solid var(--bd)" }} />
          <HexChip hex={cur.result} />
        </div>
      </div>

      <ML>interactive mixer — click swatches to change color</ML>
      <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid var(--bd)", height: 82, marginBottom: 13 }}>
        <div style={{ flex: 1, background: c1, display: "flex", alignItems: "flex-end", padding: 9, position: "relative" }}>
          <label style={{ cursor: "pointer", position: "relative" }}>
            <HexChip hex={c1} />
            <input type="color" value={c1} onChange={e => setC1(e.target.value)} style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} />
          </label>
        </div>
        <div style={{ flex: 1, background: mixed, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <HexChip hex={mixed} />
        </div>
        <div style={{ flex: 1, background: c2, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 9, position: "relative" }}>
          <label style={{ cursor: "pointer", position: "relative" }}>
            <HexChip hex={c2} />
            <input type="color" value={c2} onChange={e => setC2(e.target.value)} style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} />
          </label>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: "var(--td)" }}>Mix ratio</span>
          <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ac)" }}>{100 - ratio}% ↔ {ratio}%</code>
        </div>
        <input type="range" min={0} max={100} value={ratio} onChange={e => setRatio(Number(e.target.value))} />
      </div>

      <Divider />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
        <ML>gradient — {steps} steps</ML>
        <div style={{ display: "flex", gap: 4 }}>
          {[3, 5, 7, 10, 15].map(n => (
            <button key={n} onClick={() => setSteps(n)}
              style={{ width: 27, height: 27, borderRadius: 5, fontSize: 11, background: steps === n ? "var(--as)" : "var(--sf)", border: `1px solid ${steps === n ? "var(--ac)" : "var(--bd)"}`, color: steps === n ? "var(--ac)" : "var(--tm)" }}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
        {grad.map((c, i) => <div key={i} style={{ flex: 1, height: 40, borderRadius: 4, background: c, cursor: "pointer", border: "1px solid rgba(128,128,128,.1)" }} title={c} onClick={() => copyText(c)} />)}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 13 }}>
        {grad.map((c, i) => <HexChip key={i} hex={c} />)}
      </div>
      <CoolorsBtn hexArr={grad.slice(0, 5)} label="Send gradient to Coolors" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 7 — PSYCHOLOGY
// ══════════════════════════════════════════════════════════════════
function PsychologyChapter() {
  const [active, setActive] = useState(0);
  const [compare, setCompare] = useState(false);
  const [cmp, setCmp] = useState([0, 4]);

  const colors = [
    { hex: "#c0192c", name: "Red",    temp: "warm",    feelings: ["Urgency","Passion","Danger","Power"],    brands: ["Netflix","Coca-Cola","YouTube"],   tip: "Use sparingly as high-impact accent.",    avoid: "Overusing triggers anxiety." },
    { hex: "#e07c14", name: "Orange", temp: "warm",    feelings: ["Creativity","Warmth","Enthusiasm"],      brands: ["Amazon","Fanta","Duolingo"],        tip: "Great for CTAs — less aggressive than red.", avoid: "Can feel cheap at full saturation." },
    { hex: "#c9a020", name: "Yellow", temp: "warm",    feelings: ["Optimism","Clarity","Caution"],          brands: ["McDonald's","IKEA","Snapchat"],     tip: "Use muted gold for sophistication.",      avoid: "Hard to read as text on light bg." },
    { hex: "#3caa6e", name: "Green",  temp: "cool",    feelings: ["Growth","Health","Nature","Permission"], brands: ["Spotify","Whole Foods","WhatsApp"], tip: "Most universally positive hue.",          avoid: "Dark desaturated = military/toxic." },
    { hex: "#1a72c4", name: "Blue",   temp: "cool",    feelings: ["Trust","Stability","Intelligence"],      brands: ["Facebook","PayPal","LinkedIn"],     tip: "Default choice for corporate/tech.",      avoid: "Can feel cold and impersonal." },
    { hex: "#8e44ad", name: "Purple", temp: "cool",    feelings: ["Luxury","Wisdom","Mystery"],             brands: ["Cadbury","Twitch","Hallmark"],      tip: "Signals premium positioning.",            avoid: "Garish at high saturation." },
    { hex: "#b57bee", name: "Violet", temp: "cool",    feelings: ["Calm","Spiritual","Creative"],           brands: ["Hallmark","Aussie","Taco Bell"],    tip: "Softer luxury than deep purple.",         avoid: "Can feel immature if overused." },
    { hex: "#888080", name: "Grey",   temp: "neutral", feelings: ["Balance","Professionalism","Calm"],      brands: ["Apple","Mercedes","Wikipedia"],     tip: "Ideal supporting neutral.",               avoid: "Lifeless without contrast hierarchy." },
  ];

  const e = colors[active];
  const cA = colors[cmp[0]];
  const cB = colors[cmp[1]];

  return (
    <div>
      <Callout icon="◇">Colors carry <strong>psychological weight</strong> — they shape perception before conscious thought. This is the foundation of color branding.</Callout>

      <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
        <button onClick={() => setCompare(false)} style={{ padding: "7px 15px", borderRadius: 7, fontSize: 13, background: !compare ? "var(--ac)" : "var(--sf)", border: `1px solid ${!compare ? "var(--ac)" : "var(--bd)"}`, color: !compare ? "#fff" : "var(--td)", transition: "all .12s" }}>Explore</button>
        <button onClick={() => setCompare(true)}  style={{ padding: "7px 15px", borderRadius: 7, fontSize: 13, background:  compare ? "var(--ac)" : "var(--sf)", border: `1px solid ${ compare ? "var(--ac)" : "var(--bd)"}`, color:  compare ? "#fff" : "var(--td)", transition: "all .12s" }}>Compare Two</button>
      </div>

      {!compare ? (
        <>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
            {colors.map((c, i) => (
              <button key={i} onClick={() => setActive(i)}
                style={{ width: 44, height: 44, borderRadius: 9, background: c.hex, border: active === i ? "3px solid var(--tx)" : "2px solid transparent", transform: active === i ? "scale(1.13)" : "scale(1)", transition: "all .13s" }}
                title={c.name} />
            ))}
          </div>
          <div className="fu" style={{ borderRadius: 11, overflow: "hidden", border: "1px solid var(--bd)" }}>
            <div style={{ background: e.hex, padding: "22px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "rgba(255,255,255,.5)" }}>// profile</span>
                <h3 style={{ fontFamily: "var(--serif)", fontSize: 38, color: "#fff", marginTop: 3 }}>{e.name}</h3>
              </div>
              <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "rgba(255,255,255,.55)" }}>{e.hex.toUpperCase()}</code>
            </div>
            <div style={{ background: "var(--sf)", padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <ML>// emotions evoked</ML>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {e.feelings.map(f => <span key={f} style={{ padding: "3px 9px", borderRadius: 20, background: `${e.hex}22`, border: `1px solid ${e.hex}55`, fontSize: 12 }}>{f}</span>)}
                </div>
              </div>
              <div>
                <ML>// brands</ML>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {e.brands.map(b => <span key={b} style={{ padding: "3px 9px", borderRadius: 20, background: "var(--bg3)", border: "1px solid var(--bd)", fontSize: 12, color: "var(--td)" }}>{b}</span>)}
                </div>
              </div>
              <div style={{ padding: "11px 13px", background: "var(--bg3)", borderLeft: `3px solid ${e.hex}`, borderRadius: 4 }}>
                <ML>// tip</ML>
                <p style={{ fontSize: 13, color: "var(--td)", marginTop: 3 }}>{e.tip}</p>
              </div>
              <div style={{ padding: "11px 13px", background: "var(--bg3)", borderLeft: "3px solid #c0192c", borderRadius: 4 }}>
                <ML>// avoid</ML>
                <p style={{ fontSize: 13, color: "var(--td)", marginTop: 3 }}>{e.avoid}</p>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 13 }}>
            <CoolorsBtn hexArr={[e.hex, hslToHex(hexToHsl(e.hex).h, 50, 30), hslToHex(hexToHsl(e.hex).h, 70, 70)]} label="Explore tones on Coolors" />
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {[0, 1].map(side => (
              <div key={side}>
                <ML>{side === 0 ? "color A" : "color B"}</ML>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {colors.map((c, i) => (
                    <button key={i} onClick={() => { const n = [...cmp]; n[side] = i; setCmp(n); }}
                      style={{ width: 32, height: 32, borderRadius: 6, background: c.hex, border: cmp[side] === i ? "2px solid var(--tx)" : "1px solid transparent", transition: "all .11s" }}
                      title={c.name} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[cA, cB].map((c, side) => (
              <div key={side} style={{ borderRadius: 9, overflow: "hidden", border: "1px solid var(--bd)" }}>
                <div style={{ height: 64, background: c.hex }} />
                <div style={{ background: "var(--sf)", padding: "11px 13px" }}>
                  <strong style={{ fontFamily: "var(--serif)", fontSize: 17, display: "block", marginBottom: 7 }}>{c.name}</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
                    {c.feelings.map(f => <span key={f} style={{ padding: "2px 7px", borderRadius: 20, background: `${c.hex}22`, border: `1px solid ${c.hex}44`, fontSize: 11 }}>{f}</span>)}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--td)" }}>{c.tip}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 13 }}>
            <CoolorsBtn hexArr={[cA.hex, cB.hex]} label="See both on Coolors" />
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER 8 — COOLORS STUDIO (iframe embed)
// ══════════════════════════════════════════════════════════════════
const COOLORS_TOOLS = [
  { id: "generator",  label: "🎨 Generator",        url: "https://coolors.co/generate",                        desc: "Generate palettes. Press Space for new, click 🔒 to lock a color." },
  { id: "explore",    label: "🗂 Explore",           url: "https://coolors.co/palettes/trending",               desc: "Browse thousands of trending community palettes." },
  { id: "contrast",   label: "◑ Contrast",          url: "https://coolors.co/contrast-checker/112a46-acc8e5",  desc: "Check WCAG contrast ratios between any two colors." },
  { id: "visualizer", label: "◎ Color Wheel",       url: "https://coolors.co/color-wheel",                     desc: "Interactive color wheel and relationship explorer." },
  { id: "image",      label: "🖼 Image Picker",      url: "https://coolors.co/image-picker",                    desc: "Extract a palette from any image you upload." },
  { id: "gradient",   label: "↗ Gradient Maker",    url: "https://coolors.co/gradient-palette",                desc: "Create smooth CSS gradients between any two colors." },
];

function CoolorsChapter() {
  const [tool, setTool] = useState("generator");
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(0);
  const cur = COOLORS_TOOLS.find(t => t.id === tool);

  return (
    <div>
      <Callout icon="🎨">
        <strong>Coolors Studio</strong> is embedded below — use the full suite of tools without leaving the page. Switch tools using the tabs above the frame.
      </Callout>

      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {COOLORS_TOOLS.map(t => (
          <button key={t.id} onClick={() => { setTool(t.id); setLoaded(false); }}
            style={{ padding: "7px 13px", borderRadius: 7, fontSize: 12, background: tool === t.id ? "var(--ac)" : "var(--sf)", border: `1px solid ${tool === t.id ? "var(--ac)" : "var(--bd)"}`, color: tool === t.id ? "#fff" : "var(--td)", transition: "all .13s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 8, marginBottom: 12 }}>
        <p style={{ fontSize: 13, color: "var(--td)", flex: 1 }}>{cur.desc}</p>
        <div style={{ display: "flex", gap: 8, marginLeft: 16, flexShrink: 0 }}>
          <button onClick={() => { setLoaded(false); setKey(k => k + 1); }}
            style={{ padding: "6px 12px", borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--bd)", color: "var(--td)", fontSize: 12, fontFamily: "var(--mono)" }}>
            ↺ Reload
          </button>
          <a href={cur.url} target="_blank" rel="noopener noreferrer"
            style={{ padding: "6px 12px", borderRadius: 6, background: "var(--bg3)", border: "1px solid var(--bd)", color: "var(--td)", fontSize: 12, fontFamily: "var(--mono)", textDecoration: "none", display: "inline-block" }}>
            ↗ Full page
          </a>
        </div>
      </div>

      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--bd)", position: "relative", background: "var(--bg3)" }}>
        {!loaded && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg3)", zIndex: 2, gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--ac)", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--td)" }}>// loading coolors…</span>
          </div>
        )}
        <iframe
          key={key}
          src={cur.url}
          title={cur.label}
          onLoad={() => setLoaded(true)}
          style={{ width: "100%", height: 620, border: "none", display: "block", opacity: loaded ? 1 : 0, transition: "opacity .3s" }}
          allow="clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        />
      </div>

      <div style={{ marginTop: 14, padding: "12px 16px", background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 8 }}>
        <ML>// keyboard shortcuts (generator)</ML>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          {[["Space","New palette"],["🔒 Lock","Keep a color"],["← →","Adjust hue"],["Export","Get CSS/HEX"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <code style={{ padding: "2px 7px", borderRadius: 4, background: "var(--bg3)", border: "1px solid var(--bd)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ac)" }}>{k}</code>
              <span style={{ fontSize: 12, color: "var(--td)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CHAPTER MAP
// ══════════════════════════════════════════════════════════════════
const CHAPTER_COMPONENTS = {
  wheel:      <WheelChapter />,
  properties: <HSLChapter />,
  harmony:    <HarmonyChapter />,
  schemes:    <SchemesChapter />,
  contrast:   <ContrastChapter />,
  mixing:     <MixingChapter />,
  psychology: <PsychologyChapter />,
  coolors:    <CoolorsChapter />,
};

// ══════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [chapter, setChapter] = useState("wheel");
  const [light, setLight] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const goTo = id => { setChapter(id); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const curIdx = CHAPTERS.findIndex(c => c.id === chapter);
  const cur = CHAPTERS[curIdx];
  const prev = CHAPTERS[curIdx - 1];
  const next = CHAPTERS[curIdx + 1];

  return (
    <div className={light ? "lm" : ""} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--tx)", transition: "background .2s,color .2s" }}>

      {/* ── HERO ── */}
      <header style={{ maxWidth: 1160, margin: "0 auto", padding: "72px 28px 52px", borderBottom: "1px solid var(--bd)" }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ac)", marginBottom: 12, letterSpacing: ".04em" }}>// an interactive course in color</p>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(42px,7vw,84px)", lineHeight: 1.06, marginBottom: 18 }}>
          The Language<br />of <em style={{ color: "var(--ac)" }}>Color</em>
        </h1>
        <p style={{ maxWidth: 460, fontSize: 15, color: "var(--td)", lineHeight: 1.8, marginBottom: 36 }}>
          Seven interactive chapters + an embedded Coolors studio — learn through doing, not reading.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, maxWidth: 760 }}>
          {CHAPTERS.map(c => {
            const active = chapter === c.id;
            return (
              <button key={c.id} onClick={() => goTo(c.id)}
                style={{ textAlign: "left", padding: "14px 14px", borderRadius: 10, background: active ? "var(--as)" : "var(--sf)", border: `1px solid ${active ? "var(--ac)" : "var(--bd)"}`, transition: "all .15s", display: "flex", flexDirection: "column", gap: 5, boxShadow: active ? "0 0 0 1px var(--ac)" : "none" }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{c.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--tx)", lineHeight: 1.3 }}>{c.label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>{c.num === "—" ? "// tool" : c.num === "01" ? "// start here" : `// ch ${c.num}`}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 28px", display: "grid", gridTemplateColumns: "188px 1fr", gap: 48, paddingTop: 40, paddingBottom: 100, alignItems: "start" }}>

        {/* Sidebar */}
        <aside style={{ position: "sticky", top: 20 }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)", marginBottom: 10, letterSpacing: ".06em" }}>CHAPTERS</p>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {CHAPTERS.map(c => {
              const active = chapter === c.id;
              return (
                <button key={c.id} onClick={() => goTo(c.id)}
                  style={{ textAlign: "left", padding: "8px 12px", borderRadius: 7, fontSize: 13, background: active ? "var(--as)" : "transparent", color: active ? "var(--tx)" : "var(--td)", border: "1px solid transparent", borderLeft: active ? "3px solid var(--ac)" : "3px solid transparent", display: "flex", alignItems: "center", gap: 8, transition: "all .11s" }}>
                  <span style={{ color: active ? "var(--ac)" : "var(--tm)", fontSize: 12, flexShrink: 0 }}>{c.icon}</span>
                  <div>
                    <div>{c.label}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--tm)", marginTop: 1 }}>{c.num === "—" ? "tool" : `ch ${c.num}`}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop: "1px solid var(--bd)", marginTop: 18, paddingTop: 16 }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)", marginBottom: 7 }}>// progress</p>
            <div style={{ height: 3, background: "var(--bd)", borderRadius: 2 }}>
              <div style={{ width: `${((curIdx + 1) / CHAPTERS.length) * 100}%`, height: "100%", background: "linear-gradient(to right,var(--ac),#e8a0d4)", borderRadius: 2, transition: "width .3s" }} />
            </div>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)", marginTop: 5 }}>{curIdx + 1} / {CHAPTERS.length}</p>
          </div>

          <div style={{ marginTop: 18, padding: "11px 12px", background: "var(--sf)", border: "1px solid var(--bd)", borderRadius: 8 }}>
            <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)", marginBottom: 8 }}>🎨 coolors tools</p>
            {COOLORS_TOOLS.slice(0, 4).map(t => (
              <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0", fontSize: 11, color: "var(--td)", textDecoration: "none", fontFamily: "var(--mono)", borderBottom: "1px solid var(--bd)" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--ac)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--td)"}>
                ↗ {t.label.replace(/^[^\s]+ /, "")}
              </a>
            ))}
            <button onClick={() => goTo("coolors")}
              style={{ marginTop: 9, width: "100%", padding: "7px 0", borderRadius: 6, background: "var(--ac)", color: "#fff", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600 }}>
              Open Studio →
            </button>
          </div>
        </aside>

        {/* Content */}
        <article>
          <div style={{ marginBottom: 26, paddingBottom: 18, borderBottom: "1px solid var(--bd)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>Color Theory</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>›</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--ac)" }}>{cur.label}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ac)" }}>{cur.num === "—" ? "// tool" : `// chapter ${cur.num}`}</span>
              {cur.num !== "—" && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)" }}>of 07</span>}
            </div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "clamp(26px,4vw,42px)", lineHeight: 1.12, marginTop: 6 }}>{cur.label}</h2>
          </div>

          <div key={chapter} className="fu">
            {CHAPTER_COMPONENTS[chapter]}
          </div>

          {/* Prev / Next */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--bd)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            {prev ? (
              <button onClick={() => goTo(prev.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "var(--sf)", border: "1px solid var(--bd)", color: "var(--td)", fontSize: 13, transition: "all .14s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--ac)"; e.currentTarget.style.color = "var(--tx)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bd)"; e.currentTarget.style.color = "var(--td)"; }}>
                <span>←</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--tm)", marginBottom: 1 }}>PREV</div>
                  <div>{prev.label}</div>
                </div>
              </button>
            ) : <span />}
            {next && (
              <button onClick={() => goTo(next.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, background: "var(--ac)", border: "1px solid var(--ac)", color: "#fff", fontSize: 13, transition: "all .14s" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "rgba(255,255,255,.6)", marginBottom: 1 }}>NEXT</div>
                  <div>{next.label}</div>
                </div>
                <span>→</span>
              </button>
            )}
          </div>
        </article>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid var(--bd)", padding: "22px 28px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tm)" }}>
          Color Theory · Interactive Learning · 2026 ·{" "}
          <a href="https://coolors.co" target="_blank" rel="noopener noreferrer" style={{ color: "var(--ac)", textDecoration: "none" }}>coolors.co ↗</a>
        </p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--tm)", marginTop: 4 }}>// theme inspired by kevalya-portfolio.vercel.app</p>
      </footer>

      {/* ── BACK TO TOP ── */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ position: "fixed", bottom: 32, right: 32, zIndex: 300, width: 44, height: 44, borderRadius: "50%", background: "var(--ac)", border: "none", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(181,123,238,.45)", cursor: "pointer", transition: "opacity .2s,transform .2s", animation: "pop .18s ease both" }}
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
