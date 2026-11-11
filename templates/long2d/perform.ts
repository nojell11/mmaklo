// Character acting for the long-form 2D route: a per-scene "performance track" of timed keys (arm pose, expression,
// hop, look) blended with a back-out ease, plus always-on life: lip flap from the narration word boundaries, breathing,
// weight sway, small head nods on word onsets, blinks, and optional walks (stroll cycle + x travel).
// Poses are arm targets relative to each shoulder in u (1 % of head width): x positive = outward, y positive = down.
import { ArmPose, Expr, FrontOpts, Outfit } from "./toon2";
import { G, character, blinkAt, clamp01 } from "./kit";

type P2 = [number, number];
export type Arms = { l?: ArmPose; r?: ArmPose };
export type PoseName = keyof typeof POSES;
export type Key = { t: number; pose?: PoseName; expr?: Expr; hop?: boolean; look?: number; dur?: number };
export type Walk = { t0: number; t1: number; x0: number; x1: number };
export type Track = { keys: Key[]; walk?: Walk[] };

const A = (e: P2, h: P2, hand?: ArmPose["hand"], front = false): ArmPose => ({ e, h, hand, front });
/** matches the default hanging arm of bodyFront for the adult build (so blends from/to rest do not jump) */
const REST: ArmPose = A([14, 45], [17, 86.5]);
const HIP = A([38, 30], [12, 62]);
const TAU = Math.PI * 2;

export const POSES = {
  rest: (): Arms => ({}),
  /** hands on hips: confident listening pose */
  hips: (): Arms => ({ l: HIP, r: HIP }),
  wave: (τ: number): Arms => ({ r: A([30, -26], [40 + 11 * Math.sin(τ * TAU * 2.2), -76], "open") }),
  /** pointing to the screen-right side, high / level / low (overlays live there) */
  pointHi: (): Arms => ({ r: A([40, 6], [82, -22], "point"), l: HIP }),
  pointMid: (): Arms => ({ r: A([42, 18], [86, 6], "point"), l: HIP }),
  pointLo: (): Arms => ({ r: A([40, 30], [80, 36], "point"), l: HIP }),
  /** open palm presenting something on the right */
  present: (): Arms => ({ r: A([36, 30], [74, 14], "open") }),
  /** both palms out, "ta-da" */
  palms: (): Arms => ({ l: A([34, 28], [64, 6], "open"), r: A([34, 28], [64, 6], "open") }),
  /** hand to chin, other arm folded under it */
  think: (): Arms => ({ r: A([12, 32], [-22, -6], "dot", true), l: A([16, 46], [-24, 44], "dot", true) }),
  cheer: (τ: number): Arms => { const s = 4 * Math.sin(τ * TAU * 3); return { l: A([22, -34], [30, -82 + s], "open"), r: A([22, -34], [30, -82 - s], "open") }; },
  /** "no, no": finger raised and wagging */
  wag: (τ: number): Arms => ({ r: A([24, 20], [30 + 9 * Math.sin(τ * TAU * 3), -32], "point"), l: HIP }),
  shrug: (): Arms => ({ l: A([30, 34], [56, 6], "open"), r: A([30, 34], [56, 6], "open") }),
  /** startled hands up by the face */
  startle: (): Arms => ({ l: A([28, 12], [32, -26], "open"), r: A([28, 12], [32, -26], "open") }),
  thumb: (): Arms => ({ r: A([32, 30], [38, -12], "thumb"), l: HIP }),
  /** open hand rolling forward in a circle ("again and again") */
  roll: (τ: number): Arms => ({ r: A([36, 26], [70 + 14 * Math.cos(τ * TAU * 1.7), 10 + 14 * Math.sin(τ * TAU * 1.7)], "open") }),
};

/** back-out ease: overshoots ~8 % then settles (gesture arrival with a little snap) */
const backOut = (x: number) => { const u = clamp01(x), c = 1.6; return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpArm = (a: ArmPose, b: ArmPose, k: number): ArmPose => ({
  e: [lerp(a.e[0], b.e[0], k), lerp(a.e[1], b.e[1], k)], h: [lerp(a.h[0], b.h[0], k), lerp(a.h[1], b.h[1], k)],
  hand: k > 0.45 ? b.hand : a.hand, front: k > 0.5 ? b.front : a.front,
});

/** gestures land a little before their word (reaction 0-3 frames early) */
const LEAD = 0.1;
const armsAt = (keys: Key[], t: number): Arms => {
  const pk = keys.filter((k) => k.pose);
  let i = -1; for (let j = 0; j < pk.length; j++) if (pk[j].t - LEAD <= t) i = j;
  if (i < 0) return {};
  const cur = pk[i], prev = pk[i - 1];
  const B = POSES[cur.pose!](t - cur.t);
  // same pose again (e.g. pointing at the next list row): re-gesture from a pulled-back hand so it still reads as a beat
  const cock = (a?: ArmPose): ArmPose | undefined => a && { ...a, e: [a.e[0] - 6, a.e[1] + 6], h: [a.h[0] - 22, a.h[1] + 12] };
  const Pv: Arms = !prev ? {} : prev.pose === cur.pose ? { l: B.l, r: cock(B.r) } : POSES[prev.pose!](t - prev.t);
  const k = backOut((t - (cur.t - LEAD)) / (cur.dur ?? 0.32));
  return { l: lerpArm(Pv.l ?? REST, B.l ?? REST, k), r: lerpArm(Pv.r ?? REST, B.r ?? REST, k) };
};

/** lip flap from word boundaries: ~1 open/close per 0.17 s of word, a little random per word */
/** index of the last word starting at or before t (binary search; words sorted by start), -1 if none */
const wordIdx = (words: [number, number][], t: number) => {
  let lo = 0, hi = words.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (words[m][0] <= t) { r = m; lo = m + 1; } else hi = m - 1; }
  return r;
};
export const talkAt = (words: [number, number][], t: number) => {
  const i = wordIdx(words, t); if (i < 0) return 0;
  const [a, b] = words[i]; if (t > b) return 0;
  const n = Math.max(1, Math.round((b - a) / 0.17)), ph = (t - a) / (b - a);
  return Math.sin(Math.PI * ph * n) ** 2 * (0.65 + 0.35 * Math.abs(Math.sin(i * 12.9898)));
};
const lastOnset = (words: [number, number][], t: number) => { const i = wordIdx(words, t); return i < 0 ? -9 : words[i][0]; };

export type ActOpts = { o: Outfit; words: [number, number][]; seed?: number; light?: number; look?: number; facing?: -1 | 0 | 1;
  /** mirror the character (stands on the right, gestures toward screen-left) */ flip?: boolean };

/** draw the performing character: soles at (x, y) unless a walk moves it, h = card height in px */
export const act = (g: G, t: number, f: number, tr: Track, x: number, y: number, h: number, ao: ActOpts, extra: Partial<FrontOpts> = {}) => {
  const keys = tr.keys;
  // expression + look: last key that set them (expressions switch 1 frame early)
  let expr: Expr = "neutral", look = ao.look ?? 0.4, hopAt = -9;
  for (const k of keys) {
    if (k.t - 0.04 > t) break;
    if (k.expr) expr = k.expr;
    if (k.look !== undefined) look = k.look;
    if (k.hop) hopAt = k.t - 0.06;
  }
  // walk: stroll cycle (one cycle = two steps) while travelling, then plant
  const walks = tr.walk ?? [];
  let px = walks.length && t < walks[0].t0 ? walks[0].x0 : x, walking = false, facing = ao.facing ?? 1, phase = 0;
  for (const w of walks) {
    if (t >= w.t1) px = w.x1;
    else if (t >= w.t0) { px = lerp(w.x0, w.x1, (t - w.t0) / (w.t1 - w.t0)); walking = true; phase = t - w.t0; facing = (w.x1 > w.x0 ? 1 : -1) * (ao.flip ? -1 : 1) as -1 | 1; }
  }
  // life: breathing (3.2 s), weight sway (3.7 s), idle head drift + a small nod on every word onset
  const breath = Math.sin((t * TAU) / 3.2), ws = lastOnset(ao.words, t), nod = t - ws < 0.28 ? Math.sin(Math.PI * (t - ws) / 0.28) * 1.6 : 0;
  const tilt = 1.2 * Math.sin((t * TAU) / 3.7) + (extra.tilt ?? 0);
  const headTilt = 2.2 * Math.sin(t * 1.3 + 1) + nod + (extra.headTilt ?? 0);
  let arms: Arms | undefined = walking ? undefined : armsAt(keys, t);
  if (arms) { // arms rise and fall with the breath
    const b = 1.2 * breath;
    arms = { l: arms.l && { ...arms.l, h: [arms.l.h[0], arms.l.h[1] - b] }, r: arms.r && { ...arms.r, h: [arms.r.h[0], arms.r.h[1] - b] } };
  }
  // hop on reaction keys: 0.28 s in the air, then a 0.12 s landing squash
  const th = t - hopAt;
  let dy = 0, sx = 1 + 0.004 * breath, sy = 1 + 0.008 * breath;
  if (th >= 0 && th < 0.28) { dy = -0.06 * h * Math.sin((Math.PI * th) / 0.28); sy *= 1.03; sx *= 0.98; }
  else if (th >= 0.28 && th < 0.4) { const q = Math.sin((Math.PI * (th - 0.28)) / 0.12); sy *= 1 - 0.05 * q; sx *= 1 + 0.035 * q; }
  character(g, ao.o, {
    mode: walking ? "stroll" : "stand", phase, expr, blink: blinkAt(f, ao.seed ?? 2), facing, light: ao.light ?? -2.1, seed: ao.seed ?? 4,
    look: walking ? facing : look, talk: talkAt(ao.words, t), ...extra, tilt, headTilt, arms,
  }, px, y, h, !!ao.flip, { sx, sy, dy });
};
