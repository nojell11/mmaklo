// Long-form 2D explainer engine (16:9). Everything comes from a compiled plan (public/long2d/<slug>/plan.json, written
// by scripts/long_plan.py): scenes with set, camera, character track and laid-out overlay items, plus the narration
// word boundaries for the lip flap. Audio is NOT played here: the render is muted and muxed with the mix from
// scripts/long_mix.py. Each scene = far layer (set, lens-blurred, slower parallax) + mid layer (character, overlays)
// under a creeping camera; hard cuts with a short punch-in; warm grade + vignette (same look as the "not you" short).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, staticFile, CalculateMetadataFunction } from "remotion";
import { Outfit } from "./toon2";
import { G, W, H, PAL, smooth, post } from "./kit";
import { act, Track } from "./perform";
import { drawSet } from "./sets2";
import { PropName } from "./props2";
import {
  title, pill, checkRow, strike, bigNumber, receipt, bars, versus, numbered, propItem, coinBurst, chapterCard, MathRow, Bar, Side,
} from "./overlays";

type Cam = { z0: number; z1: number; x0?: number; x1?: number; y0?: number; y1?: number; blur?: number };
type Row = { text: string; at: number };
export type Item =
  | { kind: "title"; text: string; at: number; x: number; y: number; px: number; color?: string }
  | { kind: "pill"; text: string; at: number; x: number; y: number; px: number; color?: string }
  | { kind: "number"; text: string; label?: string; at: number; x: number; y: number; px: number; color?: string }
  | { kind: "check"; rows: Row[]; x: number; y: number; px: number; gap: number; panel?: [number, number, number, number] }
  | { kind: "list"; rows: Row[]; x: number; y: number; px: number; start?: number }
  | { kind: "receipt"; rows: MathRow[]; x: number; y: number; w: number; px: number }
  | { kind: "bars"; bars: Bar[]; x: number; y: number; w: number; px: number }
  | { kind: "versus"; a: Side; b: Side; win?: "a" | "b"; winAt?: number; x: number; y: number; w: number }
  | { kind: "prop"; prop: PropName; label?: string; at: number; x: number; y: number; s: number }
  | { kind: "strike"; text: string; at: number; strikeAt: number; x: number; y: number; px: number; w: number; color?: string }
  | { kind: "coins"; at: number; x: number; y: number }
  | { kind: "chapter"; num: string; text: string; at: number; color?: string };
export type Scene = {
  a: number; b: number; set: string; cam: Cam; items: Item[];
  /** character: null = no character in this scene */
  who: null | { x: number; y: number; h: number; flip?: boolean; track: Track };
};
export type Plan = { slug: string; fps: number; duration: number; lead: Outfit; words: [number, number][]; scenes: Scene[] };
export type Long2DProps = { plan: string; data?: Plan };

export const calcLong2D: CalculateMetadataFunction<Long2DProps> = async ({ props }) => {
  const data: Plan = props.data ?? (await (await fetch(staticFile(props.plan))).json());
  return { durationInFrames: Math.max(1, Math.round(data.duration * data.fps)), fps: data.fps, props: { ...props, data } };
};

const drawItem = (g: G, it: Item, t: number) => {
  switch (it.kind) {
    case "title": return title(g, it.text, it.x, it.y, t, it.at, it.px, it.color ?? PAL.cream);
    case "pill": return pill(g, it.text, it.x, it.y, t, it.at, it.px, it.color ?? PAL.cream);
    case "number": return bigNumber(g, it.text, it.label, it.x, it.y, t, it.at, it.px, it.color ?? PAL.gold);
    case "check":
      if (it.panel && t >= it.rows[0].at - 0.15) {
        const [px, py, pw, ph] = it.panel; g.save(); g.globalAlpha = Math.min(1, (t - it.rows[0].at + 0.15) / 0.2);
        g.fillStyle = "rgba(251,244,230,0.92)"; g.beginPath(); g.roundRect(px, py, pw, ph, 28); g.fill(); g.lineWidth = 6; g.strokeStyle = "#241726"; g.stroke(); g.restore();
      }
      return it.rows.forEach((r, i) => checkRow(g, r.text, it.x, it.y + i * it.gap, t, r.at, it.px));
    case "list": return numbered(g, it.rows, it.x, it.y, t, it.px, it.start ?? 1);
    case "receipt": return receipt(g, it.rows, it.x, it.y, it.w, t, it.px);
    case "bars": return bars(g, it.bars, it.x, it.y, it.w, t, it.px);
    case "versus": return versus(g, it.a, it.b, it.x, it.y, it.w, t, it.win, it.winAt ?? 0);
    case "prop": return propItem(g, it.prop, it.label, it.x, it.y, t, it.at, it.s);
    case "strike":
      title(g, it.text, it.x, it.y, t, it.at, it.px, it.color ?? PAL.terraLt);
      return strike(g, it.x, it.y, it.w, t, it.strikeAt);
    case "coins": return coinBurst(g, it.x, it.y, t, it.at);
    case "chapter": return;
  }
};

/** index of the scene containing t (binary search over contiguous scenes) */
const sceneAt = (S: Scene[], t: number) => {
  let lo = 0, hi = S.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (S[m].a <= t) lo = m; else hi = m - 1; }
  return S[lo];
};

const far = { c: null as HTMLCanvasElement | null };
const draw = (g: G, f: number, P: Plan) => {
  const t = f / P.fps, S = sceneAt(P.scenes, t);
  const chap = S.items.find((i) => i.kind === "chapter") as Extract<Item, { kind: "chapter" }> | undefined;
  if (chap) { // full-screen chapter card, with its own slow push
    const z = 1 + 0.04 * smooth((t - S.a) / (S.b - S.a));
    g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
    chapterCard(g, chap.num, chap.text, t, chap.at, W, H, chap.color ?? PAL.teal); g.restore();
    post(g); return;
  }
  const u = smooth((t - S.a) / (S.b - S.a)), c = S.cam;
  const kick = Math.max(0, 1 - ((t - S.a) * P.fps) / 7) * 0.03;
  const z = c.z0 + (c.z1 - c.z0) * u + kick, x = (c.x0 ?? 0) + ((c.x1 ?? 0) - (c.x0 ?? 0)) * u, y = (c.y0 ?? 0) + ((c.y1 ?? 0) - (c.y0 ?? 0)) * u;
  const fc = far.c ?? (far.c = document.createElement("canvas")); fc.width = W; fc.height = H;
  const fg = fc.getContext("2d")!; fg.clearRect(0, 0, W, H); drawSet(fg, S.set);
  g.save(); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const zf = 1 + (z - 1) * 0.6 + 0.02;
  g.translate(W / 2 - x * 0.6, H / 2 - y * 0.6); g.scale(zf, zf); g.translate(-W / 2, -H / 2);
  g.filter = `blur(${c.blur ?? 0}px)`; g.drawImage(fc, 0, 0); g.filter = "none";
  g.restore();
  g.save(); g.translate(W / 2 - x, H / 2 - y); g.scale(z, z); g.translate(-W / 2, -H / 2);
  for (const it of S.items) if (it.kind === "prop") drawItem(g, it, t); // props behind the character
  if (S.who) act(g, t, f, S.who.track, S.who.x, S.who.y, S.who.h, { o: P.lead, words: P.words, seed: 4, flip: S.who.flip });
  for (const it of S.items) if (it.kind !== "prop") drawItem(g, it, t);
  g.restore();
  post(g);
};

export const Long2D: React.FC<Long2DProps> = ({ data }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { if (data) draw(ref.current!.getContext("2d")!, f, data); }, [f, data]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
