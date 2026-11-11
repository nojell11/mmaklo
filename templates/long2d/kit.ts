// Long-form 2D kit (16:9, 1920x1080): flat painted sets, props, overlays and post, in the "not you anymore" look
// (plum ink, two-tone flat colour, lens blur on the far layer, warm grade + vignette). Characters come from
// ./toon2.ts (long-form copy of ../notyou/toon.ts with gesture arms + lip flap; Pen + bodyFront), drawn into an offscreen 600x1000 card each frame.
import { Pen, bodyFront, Outfit, FrontOpts, INK, mix } from "./toon2";

export type G = CanvasRenderingContext2D;
export const W = 1920, H = 1080;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
/** pop-in with a small overshoot (0..1 -> 0..1.06..1) */
export const pop = (x: number) => { const u = clamp01(x); const c = 2.2; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };

export const PAL = {
  wall: "#efe2cc", wallLo: "#e3cfb2", floor: "#c99a6b", floorLine: "#a97a50", teal: "#2f8f8a", tealLt: "#8fcfc6",
  terra: "#c9653f", terraLt: "#f0b79a", blue: "#5b8fd1", blueLt: "#cfe0f2", cream: "#fbf4e6", gold: "#f2b84b", green: "#5d9a4a",
  red: "#d23a3a", sky: "#bfe0f0", night: "#2a3350",
};

const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
/** filled + plum-inked shape helpers (ink 5 px at 1080p, like the world ink of the short) */
export const box = (g: G, x: number, y: number, w: number, h: number, fill: string, r = 10, ink = 5) => {
  rr(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
};
export const ell = (g: G, x: number, y: number, rx: number, ry: number, fill: string, ink = 5) => {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.stroke(); }
};
export const poly = (g: G, pts: [number, number][], fill: string, ink = 5) => {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = fill; g.fill(); if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.lineJoin = "round"; g.stroke(); }
};
export const line = (g: G, pts: [number, number][], w: number, col = INK) => {
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.stroke();
};
/** two-tone fill: base on the lit side, a darker band on the far side (light from upper left) */
export const twoTone = (g: G, x: number, y: number, w: number, h: number, base: string, r = 10) => {
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, base); gr.addColorStop(0.62, base); gr.addColorStop(1, mix(base, "#3a2a5a", 0.22));
  box(g, x, y, w, h, gr as unknown as string, r);
};

// ---------------------------------------------------------------- sets (far layer, gets the lens blur)
/** living room: wall, wainscot, window with curtains, frame, shelf + plant, plank floor */
export const setRoom = (g: G, night = false) => {
  const wall = night ? "#5a6488" : PAL.wall, lo = night ? "#4a5274" : PAL.wallLo;
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  g.fillStyle = lo; g.fillRect(0, 610, W, 170);
  line(g, [[0, 610], [W, 610]], 4, mix(lo, INK, 0.35));
  // floor planks
  g.fillStyle = night ? "#6b5a5a" : PAL.floor; g.fillRect(0, 780, W, H - 780);
  for (let i = 0; i < 6; i++) line(g, [[0, 800 + i * 50], [W, 800 + i * 50]], 3, night ? "#584848" : PAL.floorLine);
  line(g, [[0, 780], [W, 780]], 6);
  // window
  box(g, 1180, 150, 420, 340, night ? PAL.night : PAL.sky, 8, 6);
  if (!night) { ell(g, 1300, 260, 70, 34, "#ffffff", 0); ell(g, 1360, 245, 60, 30, "#ffffff", 0); }
  else for (const [x, y] of [[1250, 210], [1420, 260], [1530, 200]]) ell(g, x, y, 4, 4, "#fff3b0", 0);
  line(g, [[1390, 150], [1390, 490]], 6); line(g, [[1180, 320], [1600, 320]], 6);
  poly(g, [[1150, 130], [1250, 130], [1225, 520], [1140, 520]], PAL.terra);
  poly(g, [[1530, 130], [1630, 130], [1640, 520], [1555, 520]], PAL.terra);
  box(g, 1120, 112, 540, 26, "#8a5a3a", 8);
  // picture frame + shelf with a plant and books
  box(g, 300, 190, 260, 190, "#f6e9cf", 6, 6); box(g, 326, 214, 208, 142, PAL.tealLt, 4, 3);
  poly(g, [[340, 340], [420, 260], [470, 310], [500, 280], [520, 340]], PAL.teal, 3);
  box(g, 700, 330, 330, 24, "#8a5a3a", 6);
  box(g, 720, 250, 34, 80, PAL.terra, 4, 4); box(g, 758, 262, 30, 68, PAL.blue, 4, 4); box(g, 792, 240, 36, 90, PAL.gold, 4, 4);
  box(g, 920, 270, 70, 60, "#d98a5a", 8, 4);
  for (const a of [-0.9, -0.3, 0.3, 0.9]) ell(g, 955 + 42 * Math.sin(a), 240 - 34 * Math.cos(a), 16, 30, PAL.green, 4);
};
/** desk corner: wall + desk + lamp; the laptop is drawn by the scene (screen content changes) */
export const setDesk = (g: G) => {
  g.fillStyle = "#e9dcc4"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#dcc9a9"; g.fillRect(0, 640, W, 160);
  g.fillStyle = PAL.floor; g.fillRect(0, 800, W, H - 800); line(g, [[0, 800], [W, 800]], 6);
  box(g, 1460, 170, 300, 220, "#f6e9cf", 6, 6); box(g, 1484, 194, 252, 172, "#f2d29a", 4, 3);
  ell(g, 1610, 280, 46, 46, PAL.gold, 3);
};
/** clean coloured concept backdrop with soft rings (brand: concept scenes may use plain colour + symbols) */
export const setConcept = (g: G, base: string, ring: string) => {
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  for (let i = 5; i >= 1; i--) ell(g, W / 2, H / 2 + 40, 260 * i, 200 * i, mix(base, ring, 0.12 * (6 - i)), 0);
  g.fillStyle = mix(base, INK, 0.12); g.fillRect(0, 900, W, H - 900);
};

// ---------------------------------------------------------------- props (each drawn around (0,0), ~240 px wide)
export const propCar = (g: G) => {
  poly(g, [[-120, 10], [-95, -40], [-40, -70], [55, -70], [100, -30], [125, 10], [125, 45], [-120, 45]], PAL.terra);
  poly(g, [[-70, -35], [-35, -60], [0, -60], [0, -35]], PAL.sky, 4); poly(g, [[12, -35], [12, -60], [50, -60], [80, -35]], PAL.sky, 4);
  ell(g, -65, 48, 30, 30, "#2e2a36"); ell(g, 75, 48, 30, 30, "#2e2a36"); ell(g, -65, 48, 11, 11, "#c9ccd2", 3); ell(g, 75, 48, 11, 11, "#c9ccd2", 3);
};
export const propGarage = (g: G) => {
  poly(g, [[-120, -30], [0, -100], [120, -30], [120, 80], [-120, 80]], PAL.wallLo);
  box(g, -85, -10, 170, 90, "#c9ccd2", 4);
  for (let i = 1; i < 5; i++) line(g, [[-85, -10 + i * 18], [85, -10 + i * 18]], 3);
};
export const propBed = (g: G) => {
  box(g, -125, -10, 250, 60, PAL.blue, 10); box(g, -125, -70, 30, 130, "#8a5a3a", 6); box(g, -90, -30, 70, 26, PAL.cream, 10, 4);
  box(g, -15, -22, 140, 30, PAL.blueLt, 10, 4); line(g, [[-110, 60], [-110, 80]], 8); line(g, [[110, 50], [110, 80]], 8);
};
export const propCamera = (g: G) => {
  box(g, -100, -50, 200, 120, "#3a3f52", 16); box(g, -60, -78, 70, 34, "#3a3f52", 8);
  ell(g, 10, 10, 50, 50, "#c9ccd2"); ell(g, 10, 10, 30, 30, "#2a3350", 4); ell(g, -2, -2, 8, 8, "#ffffff", 0);
  box(g, 60, -38, 26, 16, PAL.gold, 4, 3);
};
export const propPool = (g: G) => {
  ell(g, 0, 20, 130, 60, "#e6d3b8"); ell(g, 0, 20, 108, 44, "#5fc3e4", 4);
  for (const x of [-50, 0, 45]) line(g, [[x - 20, 15], [x - 6, 9], [x + 8, 15], [x + 22, 9]], 3, "#e8fbff");
  line(g, [[80, -40], [80, 0]], 6); line(g, [[100, -40], [100, 0]], 6);
  for (const y of [-28, -12]) line(g, [[80, y], [100, y]], 5);
};
export const propCoin = (g: G, r = 34, spin = 0) => {
  const k = Math.abs(Math.cos(spin)) * 0.75 + 0.25;
  ell(g, 0, 0, r * k, r, PAL.gold, 4); ell(g, 0, 0, r * k * 0.66, r * 0.66, mix(PAL.gold, "#ffffff", 0.35), 0);
};
export const propHouse = (g: G) => {
  poly(g, [[-110, -10], [0, -100], [110, -10]], PAL.terra); box(g, -85, -10, 170, 120, PAL.cream, 4);
  box(g, -25, 40, 50, 70, PAL.teal, 4, 4); box(g, -70, 10, 36, 36, PAL.sky, 4, 4); box(g, 34, 10, 36, 36, PAL.sky, 4, 4);
};
export const propLaptop = (g: G, screen: (g: G) => void) => {
  box(g, -170, -230, 340, 220, "#3a3f52", 12);
  g.save(); rr(g, -150, -212, 300, 184, 6); g.clip(); g.fillStyle = "#f4f8ff"; g.fillRect(-150, -212, 300, 184); screen(g); g.restore();
  poly(g, [[-210, -10], [210, -10], [240, 20], [-240, 20]], "#c9ccd2");
};

// ---------------------------------------------------------------- characters
const charCanvas: { c?: HTMLCanvasElement } = {};
/** draw a toon character with its soles at (x, y), `h` px tall from soles to the top of the 1000-unit card */
export type Squash = { sx?: number; sy?: number; dy?: number };
export const character = (g: G, o: Outfit, opts: FrontOpts, x: number, y: number, h: number, flip = false, k: Squash = {}) => {
  const c = charCanvas.c ?? (charCanvas.c = document.createElement("canvas"));
  // card is 800 wide (design x 0..600 shifted by 100) so pointing / waving hands past the 600 design edge are not cut
  c.width = 800; c.height = 1000;
  const cg = c.getContext("2d")!; cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, 800, 1000); cg.translate(100, 0);
  bodyFront(new Pen(cg), o, opts);
  const s = h / 1000, sx = k.sx ?? 1, sy = k.sy ?? 1, dy = k.dy ?? 0;
  // tight contact shadow (short's look: dark core under the feet); shrinks while the character is in the air
  const air = Math.max(0, Math.min(1, -dy / (0.12 * h)));
  g.save(); g.globalAlpha = 0.28 * (1 - 0.5 * air); ell(g, x, y - 4, 95 * s * 1.6 * (1 - 0.3 * air), 16 * s * 1.6 * (1 - 0.3 * air), "#2a1a3a", 0); g.restore();
  // squash / stretch about the soles, then the hop offset
  g.save(); g.translate(x, y + dy); g.scale(sx, sy); g.translate(0, -975 * s); if (flip) g.scale(-1, 1);
  g.drawImage(c, -400 * s, 0, 800 * s, 1000 * s); g.restore();
};
/** blink: 4 frames every ~2 s, seeded */
export const blinkAt = (f: number, seed = 0) => { const p = 61 + (seed % 3) * 9, k = (f + seed * 17) % p; return k < 2 ? 1 : k < 4 ? 0.5 : 0; };

// ---------------------------------------------------------------- overlays (wajib: numbers + key words on screen)
const FONT = (px: number) => `900 ${px}px "Segoe UI Black", "Arial Black", "Segoe UI", sans-serif`;
/** pill label that pops in at t0 (seconds); time t */
export const pill = (g: G, text: string, x: number, y: number, t: number, t0: number, px = 54, fill = PAL.cream, col = INK) => {
  const k = pop((t - t0) / 0.28); if (t < t0) return;
  g.save(); g.translate(x, y); g.scale(k, k); g.font = FONT(px);
  const w = g.measureText(text).width + px * 1.1, h = px * 1.55;
  g.save(); g.translate(7, 9); box(g, -w / 2, -h / 2, w, h, "rgba(36,23,38,0.35)", h / 2, 0); g.restore();
  box(g, -w / 2, -h / 2, w, h, fill, h / 2, 6);
  g.fillStyle = col; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, px * 0.05);
  g.restore();
};
/** big inked title (ink stroke + fill), pops in */
export const title = (g: G, text: string, x: number, y: number, t: number, t0: number, px = 150, fill = PAL.cream) => {
  if (t < t0) return; const k = pop((t - t0) / 0.3);
  g.save(); g.translate(x, y); g.scale(k, k); g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = px * 0.16; g.strokeStyle = INK; g.strokeText(text, 0, 0); g.fillStyle = fill; g.fillText(text, 0, 0);
  g.restore();
};
/** checklist row: tick box + label, slides in at t0 */
export const checkRow = (g: G, text: string, x: number, y: number, t: number, t0: number, px = 58) => {
  if (t < t0) return; const u = easeOut((t - t0) / 0.3);
  g.save(); g.globalAlpha = u; g.translate(x - 60 * (1 - u), y);
  box(g, 0, -px * 0.55, px * 1.1, px * 1.1, PAL.cream, 12, 6);
  const v = clamp01((t - t0 - 0.12) / 0.2);
  if (v > 0) line(g, [[px * 0.22, 0], [px * 0.45, px * 0.25], [px * 0.22 + v * 0.7 * px, -px * 0.3 * v]], 10, PAL.teal);
  g.font = FONT(px); g.fillStyle = INK; g.textBaseline = "middle"; g.fillText(text, px * 1.5, px * 0.04);
  g.restore();
};
/** red strike through a word box (e.g. "SELL") */
export const strike = (g: G, x: number, y: number, w: number, t: number, t0: number) => {
  const u = easeOut((t - t0) / 0.25); if (u <= 0) return;
  line(g, [[x - w / 2, y + 30], [x - w / 2 + w * u, y - 30]], 22, PAL.red);
};

// ---------------------------------------------------------------- post: grade + vignette (same intent as grade.ts)
export const post = (g: G) => {
  g.save(); g.globalCompositeOperation = "soft-light"; g.fillStyle = "rgba(255,190,120,0.18)"; g.fillRect(0, 0, W, H); g.restore();
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, "rgba(40,20,50,0)"); v.addColorStop(1, "rgba(40,20,50,0.38)");
  g.fillStyle = v; g.fillRect(0, 0, W, H);
};
