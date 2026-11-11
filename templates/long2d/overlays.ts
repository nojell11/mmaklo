// Explainer overlays for the long-form 2D route (mandatory: numbers + key words on screen). Every overlay pops in at
// its word time t0 (seconds) and stays until the scene ends. All sizes are 1920x1080 canvas px.
import { G, PAL, box, ell, line, pop, easeOut, clamp01, title, pill, checkRow, strike, propCoin } from "./kit";
import { INK, mix } from "./toon2";
import { PROPS, PropName } from "./props2";

const FONT = (px: number) => `900 ${px}px "Segoe UI Black", "Arial Black", "Segoe UI", sans-serif`;
const BOLD = (px: number) => `700 ${px}px "Segoe UI", "Arial", sans-serif`;

/** the number shown while counting up: same prefix / suffix / separators / decimals as the target text */
export const countText = (text: string, k: number) => {
  const m = text.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m || k >= 1) return text;
  const raw = m[2].replace(/,/g, ""), dec = raw.includes(".") ? raw.split(".")[1].length : 0;
  const v = parseFloat(raw) * k;
  let s = v.toFixed(dec);
  if (m[2].includes(",")) { const [i, d] = s.split("."); s = i.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (d ? "." + d : ""); }
  return m[1] + s + m[3];
};

/** big inked number that counts up over 0.7 s, with an optional small label under it */
export const bigNumber = (g: G, text: string, label: string | undefined, x: number, y: number, t: number, t0: number, px = 170, fill = PAL.gold) => {
  if (t < t0) return;
  const k = easeOut((t - t0) / 0.7), s = pop((t - t0) / 0.3);
  g.save(); g.translate(x, y); g.scale(s, s);
  g.font = FONT(px); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  const tx = countText(text, k);
  g.lineWidth = px * 0.16; g.strokeStyle = INK; g.strokeText(tx, 0, 0); g.fillStyle = fill; g.fillText(tx, 0, 0);
  g.restore();
  if (label) pill(g, label, x, y + px * 0.78, t, t0 + 0.15, Math.round(px * 0.26));
};

/** receipt card: rows appear one by one; op "+" green, "-" red, "=" result row with a rule above */
export type MathRow = { text: string; value?: string; op?: "+" | "-" | "=" | ""; at: number };
export const receipt = (g: G, rows: MathRow[], x: number, y: number, w: number, t: number, px = 50) => {
  if (!rows.length || t < rows[0].at) return;
  const rh = px * 1.75, h = rows.length * rh + px * 1.2, u = easeOut((t - rows[0].at) / 0.3);
  g.save(); g.globalAlpha = u; g.translate(0, 30 * (1 - u));
  g.save(); g.translate(8, 10); box(g, x, y, w, h, "rgba(36,23,38,0.25)", 22, 0); g.restore();
  box(g, x, y, w, h, PAL.cream, 22, 6);
  rows.forEach((r, i) => {
    if (t < r.at) return;
    const v = easeOut((t - r.at) / 0.25), ry = y + px * 0.6 + i * rh + rh / 2;
    g.save(); g.globalAlpha *= v; g.translate(-40 * (1 - v), 0);
    if (r.op === "=") line(g, [[x + 30, ry - rh / 2 + 4], [x + w - 30, ry - rh / 2 + 4]], 6);
    const col = r.op === "-" ? PAL.red : r.op === "+" ? PAL.green : INK;
    g.font = r.op === "=" ? FONT(px) : BOLD(px); g.textBaseline = "middle"; g.fillStyle = INK; g.textAlign = "left";
    g.fillText((r.op && r.op !== "=" ? r.op + " " : "") + r.text, x + 34, ry);
    if (r.value) {
      g.textAlign = "right"; g.fillStyle = col; g.font = FONT(px);
      g.fillText(countText(r.value, easeOut((t - r.at) / 0.5)), x + w - 34, ry);
    }
    g.restore();
  });
  g.restore();
};

/** horizontal bars that grow to value / max; the label sits left, the value text at the bar end */
export type Bar = { label: string; value: number; text?: string; at: number; color?: string };
export const bars = (g: G, list: Bar[], x: number, y: number, w: number, t: number, px = 44) => {
  const max = Math.max(...list.map((b) => b.value), 1e-9), lw = w * 0.32, bw = w - lw - 30, rh = px * 2.3;
  list.forEach((b, i) => {
    if (t < b.at) return;
    const k = easeOut((t - b.at) / 0.6), ry = y + i * rh, len = Math.max(8, bw * (b.value / max) * k);
    g.save(); g.globalAlpha = clamp01((t - b.at) / 0.15);
    g.font = FONT(px); g.textBaseline = "middle"; g.textAlign = "right"; g.fillStyle = INK; g.fillText(b.label, x + lw, ry + rh * 0.4);
    box(g, x + lw + 24, ry + rh * 0.12, len, rh * 0.56, b.color ?? [PAL.teal, PAL.terra, PAL.blue, PAL.gold][i % 4], 12, 5);
    if (b.text) { g.textAlign = "left"; g.font = FONT(px * 0.9); g.fillStyle = INK; g.fillText(countText(b.text, k), x + lw + 40 + len, ry + rh * 0.4); }
    g.restore();
  });
};

/** two cards side by side (A vs B), each with a header and a big value; the "win" side gets a gold ring */
export type Side = { head: string; value?: string; at: number; color?: string };
export const versus = (g: G, A: Side, B: Side, x: number, y: number, w: number, t: number, win?: "a" | "b", winAt = 0) => {
  const cw = (w - 80) / 2, ch = 330;
  ([[A, x], [B, x + cw + 80]] as [Side, number][]).forEach(([S, cx], i) => {
    if (t < S.at) return;
    const k = pop((t - S.at) / 0.3);
    g.save(); g.translate(cx + cw / 2, y + ch / 2); g.scale(k, k); g.translate(-cw / 2, -ch / 2);
    if (win && t > winAt && ((win === "a") === (i === 0))) box(g, -14, -14, cw + 28, ch + 28, PAL.gold, 34, 0);
    box(g, 0, 0, cw, ch, PAL.cream, 26, 6);
    box(g, 0, 0, cw, 96, S.color ?? (i ? PAL.terraLt : PAL.tealLt), 26, 6);
    g.font = FONT(46); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText(S.head, cw / 2, 50);
    if (S.value) { g.font = FONT(84); g.fillText(countText(S.value, easeOut((t - S.at) / 0.6)), cw / 2, 210); }
    g.restore();
  });
  if (t > Math.max(A.at, B.at)) { g.font = FONT(56); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText("VS", x + w / 2, y + ch / 2); }
};

/** numbered list: a big index bubble + text per row */
export const numbered = (g: G, rows: { text: string; at: number }[], x: number, y: number, t: number, px = 56, start = 1) => {
  rows.forEach((r, i) => {
    if (t < r.at) return;
    const u = easeOut((t - r.at) / 0.3), ry = y + i * px * 2.1;
    g.save(); g.globalAlpha = u; g.translate(x - 60 * (1 - u), ry);
    ell(g, px * 0.6, 0, px * 0.62, px * 0.62, [PAL.teal, PAL.terra, PAL.blue, PAL.gold, PAL.green][i % 5], 6);
    g.font = FONT(px * 0.8); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = PAL.cream; g.fillText(String(start + i), px * 0.6, px * 0.04);
    g.font = FONT(px); g.textAlign = "left"; g.fillStyle = INK; g.fillText(r.text, px * 1.6, px * 0.04);
    g.restore();
  });
};

/** prop icon on a plinth shadow, bobbing, with an optional label pill */
export const propItem = (g: G, name: PropName, label: string | undefined, x: number, y: number, t: number, t0: number, s = 1) => {
  if (t < t0) return;
  const k = pop((t - t0) / 0.3) * s;
  g.save(); g.translate(x, y); g.scale(k, k);
  ell(g, 0, 95, 150, 26, "rgba(42,26,58,0.22)", 0);
  g.translate(0, Math.sin((t - t0) * 2.2) * 4); PROPS[name](g, t - t0); g.restore();
  if (label) pill(g, label, x, y + 165 * s, t, t0 + 0.08, 40);
};

/** coins bursting out of a point and falling (money moments) */
export const coinBurst = (g: G, x: number, y: number, t: number, t0: number, n = 9) => {
  if (t < t0 || t > t0 + 2.2) return;
  for (let i = 0; i < n; i++) {
    const tt = t - t0 - i * 0.04; if (tt < 0) continue;
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2, v = 620 + 90 * Math.sin(i * 7.1);
    const cx = x + Math.cos(a) * v * tt, cy = y + Math.sin(a) * v * tt + 900 * tt * tt;
    g.save(); g.globalAlpha = clamp01((2.2 - (t - t0)) / 0.4); g.translate(cx, cy); propCoin(g, 30, tt * 9 + i); g.restore();
  }
};

/** full-screen chapter card: number + title on a coloured field; drawn instead of a scene */
export const chapterCard = (g: G, num: string, text: string, t: number, t0: number, W: number, H: number, col: string) => {
  g.fillStyle = col; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i++) { g.fillStyle = mix(col, "#ffffff", 0.06); g.fillRect(-200 + i * 180 + ((t - t0) * 60) % 180, 0, 70, H); }
  title(g, num, W / 2, H / 2 - 150, t, t0 + 0.05, 120, PAL.gold);
  title(g, text, W / 2, H / 2 + 40, t, t0 + 0.2, Math.min(130, (1500 / Math.max(6, text.length)) * 1.8), PAL.cream);
};

export { title, pill, checkRow, strike };
