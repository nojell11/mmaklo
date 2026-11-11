// Demo of the long-form 2D route: the first 32 s of STICKHUSTLE job-003 ("Rent Out What You Already Own"),
// timed to the narration's word boundaries. Each scene = far layer (set, lens-blurred, slower parallax) + mid layer
// (character, props, overlays) under a creeping camera; hard cuts with a short punch-in, warm grade + vignette.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, Audio, staticFile, getInputProps } from "remotion";
import { Outfit, FrontOpts } from "./toon2";
import { act, Track } from "./perform";
import { DEMO_WORDS } from "./demoWords";
import {
  G, W, H, PAL, smooth, easeOut, pop, clamp01, setRoom, setDesk, setConcept, propCar, propGarage, propBed, propCamera, propPool,
  propCoin, propHouse, propLaptop, pill, title, checkRow, strike, post, box, ell,
} from "./kit";

export const DEMO_FPS = 30;
export const DEMO_FRAMES = Math.round(32.0 * DEMO_FPS);

// this video's lead (characters change per video): teal hoodie, dark hair
const LEAD: Outfit = { jacket: "#2f8f8a", pants: "#3a3f52", boots: "#2e2a36", hat: "hair", hair: "#3a2a22" };

type Cam = { z0: number; z1: number; x0?: number; x1?: number; y0?: number; y1?: number; blur?: number };
type Scene = { a: number; b: number; far: (g: G, t: number) => void; mid: (g: G, t: number, f: number) => void; cam: Cam };

/** the lead performs a track: timed gesture/expression/hop keys + walks, with lip flap from the word boundaries */
const who = (g: G, t: number, f: number, tr: Track, x = 560, y = 900, h = 640, extra: Partial<FrontOpts> = {}) =>
  act(g, t, f, tr, x, y, h, { o: LEAD, words: DEMO_WORDS, seed: 4 }, extra);

// performance tracks, one per scene (times = narration seconds; gestures land ~0.1 s before their word)
const T1: Track = { walk: [{ t0: 0, t1: 1.05, x0: 640, x1: 960 }],
  keys: [{ t: 0, expr: "smile" }, { t: 1.1, pose: "wave", expr: "grin", hop: true, look: 0 }, { t: 1.62, pose: "palms", expr: "smile", look: 0.3 }] };
const T2: Track = { keys: [
  { t: 2.7, pose: "hips", expr: "smile", look: 1 }, { t: 3.3, pose: "pointHi", hop: true }, { t: 4.2, pose: "present" }, { t: 5.58, pose: "pointHi" },
  { t: 6.4, pose: "pointLo", expr: "grin" }, { t: 8.01, pose: "think", expr: "whistle", look: 0.6 }, { t: 8.4, pose: "pointLo", expr: "grin", hop: true, look: 1 }] };
const T3: Track = { keys: [{ t: 9.95, pose: "think", expr: "neutral", look: 1 }, { t: 11.07, pose: "cheer", expr: "relief_open", hop: true }] };
const T4: Track = { keys: [{ t: 11.95, pose: "hips", expr: "stern", look: 1 }, { t: 12.28, pose: "wag" }] };
const T5: Track = { keys: [{ t: 13.55, pose: "hips", expr: "grin", look: 1 }, { t: 13.75, pose: "present", hop: true }, { t: 14.55, pose: "roll", dur: 0.4 }] };
const T7: Track = { keys: [
  { t: 17.7, pose: "hips", expr: "smile", look: 1 }, { t: 17.85, pose: "present" }, { t: 19.18, pose: "startle", expr: "shock", hop: true },
  { t: 19.75, expr: "nervous" }, { t: 20.35, pose: "shrug" }] };
const T8: Track = { keys: [
  { t: 21.75, pose: "palms", expr: "smile", look: 0.5 }, { t: 23.3, pose: "pointHi", look: 1 }, { t: 24.39, pose: "pointMid" },
  { t: 25.66, pose: "pointLo", expr: "stern" }, { t: 26.96, pose: "pointMid", expr: "nervous" }, { t: 28.25, pose: "pointLo", expr: "shock", hop: true }] };
const T9: Track = { keys: [
  { t: 29.1, pose: "palms", expr: "neutral", look: 0 }, { t: 29.62, pose: "think", look: 1 }, { t: 30.62, pose: "pointHi", expr: "smile", hop: true },
  { t: 31.3, pose: "thumb", expr: "grin" }] };

/** a prop that pops in at t0 on its own plinth card, with a label pill under it */
const propCard = (g: G, t: number, t0: number, x: number, y: number, draw: (g: G) => void, label: string, s = 1) => {
  if (t < t0) return;
  const k = pop((t - t0) / 0.3) * s;
  g.save(); g.translate(x, y); g.scale(k, k);
  ell(g, 0, 95, 150, 26, "rgba(42,26,58,0.22)", 0);
  g.translate(0, Math.sin((t - t0) * 2.2) * 4); draw(g); g.restore();
  pill(g, label, x, y + 165, t, t0 + 0.08, 40);
};

const SCENES: Scene[] = [
  // 001 "Your home is full of things you rarely use."
  { a: 0, b: 2.7, cam: { z0: 1.12, z1: 1.04, blur: 3 }, far: (g) => setRoom(g),
    mid: (g, t, f) => { who(g, t, f, T1, 960, 960, 700); } },
  // 002-006 the list: car, garage, spare room, camera, pool/yard
  { a: 2.7, b: 9.95, cam: { z0: 1.0, z1: 1.06, blur: 4 }, far: (g) => setRoom(g),
    mid: (g, t, f) => {
      who(g, t, f, T2, 300, 960, 620);
      propCard(g, t, 2.82, 760, 330, propCar, "SECOND CAR");
      propCard(g, t, 4.15, 1160, 330, propGarage, "GARAGE");
      propCard(g, t, 5.12, 1560, 330, propBed, "SPARE ROOM");
      propCard(g, t, 6.38, 960, 720, propCamera, "CAMERA", 0.85);
      propCard(g, t, 8.35, 1400, 720, propPool, "POOL / YARD", 0.9);
    } },
  // 007 "What if those things could pay you?"
  { a: 9.95, b: 11.95, cam: { z0: 1.05, z1: 1.12, blur: 4 }, far: (g) => setConcept(g, "#f3e3c3", PAL.gold),
    mid: (g, t, f) => {
      propCard(g, t, 9.97, 960, 470, propHouse, "", 1.5);
      for (let i = 0; i < 7; i++) {
        const t0 = 10.85 + i * 0.09, u = easeOut((t - t0) / 0.5); if (t < t0) continue;
        const a = -2.6 + i * 0.36;
        g.save(); g.translate(960 + Math.cos(a) * 330 * u, 470 + Math.sin(a) * 250 * u); propCoin(g, 34, t * 5 + i); g.restore();
      }
      who(g, t, f, T3, 330, 1000, 560);
      pill(g, "$ ?", 1480, 300, t, 11.05, 72, PAL.gold);
    } },
  // 008 "Not by selling them."
  { a: 11.95, b: 13.55, cam: { z0: 1.0, z1: 1.04, blur: 3 }, far: (g) => setConcept(g, "#e9d6c6", PAL.terra),
    mid: (g, t, f) => {
      who(g, t, f, T4, 520, 980, 640);
      title(g, "SELL", 1240, 470, t, 12.3, 220, PAL.terraLt);
      strike(g, 1240, 470, 520, t, 12.85);
    } },
  // 009 "By renting them out, again and again."
  { a: 13.55, b: 16.0, cam: { z0: 1.0, z1: 1.07, blur: 3 }, far: (g) => setConcept(g, "#d9ece6", PAL.teal),
    mid: (g, t, f) => {
      who(g, t, f, T5, 420, 980, 640);
      title(g, "RENT", 1240, 360, t, 13.72, 200, PAL.tealLt);
      // loop of coins coming back, once per "again"
      for (const t0 of [14.55, 15.15]) {
        const u = clamp01((t - t0) / 0.8); if (t < t0) continue;
        const a = Math.PI * (1 - u);
        g.save(); g.translate(1240 + Math.cos(a) * 260, 640 - Math.sin(a) * 120); propCoin(g, 40, t * 6); g.restore();
      }
      pill(g, "AGAIN & AGAIN", 1240, 820, t, 15.1, 52);
    } },
  // 010 "This is asset rental."
  { a: 16.0, b: 17.7, cam: { z0: 1.1, z1: 1.0, blur: 5 }, far: (g) => setConcept(g, "#cfe0f2", PAL.blue),
    mid: (g, t) => { title(g, "ASSET RENTAL", 960, 520, t, 16.38, 170, PAL.cream); } },
  // 011-012 "It sounds simple. But the math is not what the blogs show."
  { a: 17.7, b: 21.75, cam: { z0: 1.0, z1: 1.08, x0: 0, x1: 40, blur: 4 }, far: (g) => setDesk(g),
    mid: (g, t, f) => {
      const cracked = t > 19.4;
      g.save(); g.translate(1180, 780);
      propLaptop(g, (s) => {
        s.fillStyle = "#e7f4ec"; s.fillRect(-150, -212, 300, 184);
        // blog chart going up; after "But" it flickers and drops
        const k = cracked ? clamp01((t - 19.4) / 0.6) : 0;
        s.lineWidth = 10; s.strokeStyle = cracked ? PAL.red : PAL.green; s.lineCap = "round"; s.beginPath();
        s.moveTo(-120, -60); s.lineTo(-40, -90 + 30 * k); s.lineTo(30, -120 + 70 * k); s.lineTo(115, -180 + 140 * k); s.stroke();
      });
      g.restore();
      who(g, t, f, T7, 470, 1000, 640);
      pill(g, "$$$ EASY?", 1180, 300, t, 17.85, 54, PAL.gold);
      if (t > 20.6) pill(g, "NOT THE REAL MATH", 1180, 170, t, 20.62, 46, PAL.terraLt);
    } },
  // 013-018 "Today we go through the real numbers. The platforms. The hidden costs. The taxes. And the risks."
  { a: 21.75, b: 29.1, cam: { z0: 1.0, z1: 1.05, blur: 4 }, far: (g) => setConcept(g, "#efe2cc", PAL.terra),
    mid: (g, t, f) => {
      who(g, t, f, T8, 380, 1000, 660);
      const rows: [string, number][] = [["REAL NUMBERS", 23.3], ["PLATFORMS", 24.39], ["HIDDEN COSTS", 25.66], ["TAXES", 26.96], ["RISKS", 28.25]];
      box(g, 820, 150, 900, 760, "rgba(251,244,230,0.92)", 28, 6);
      rows.forEach(([s, t0], i) => checkRow(g, s, 890, 250 + i * 140, t, t0, 62));
    } },
  // 018 "So you can decide if it is worth your time."
  { a: 29.1, b: 32.0, cam: { z0: 1.0, z1: 1.1, blur: 4 }, far: (g) => setRoom(g),
    mid: (g, t, f) => {
      who(g, t, f, T9, 760, 960, 700, { headTilt: 3 });
      pill(g, "WORTH YOUR TIME?", 1360, 330, t, 30.6, 58, PAL.tealLt);
    } },
];

const far = { c: null as HTMLCanvasElement | null };
const draw = (g: G, f: number) => {
  const t = f / DEMO_FPS;
  const S = SCENES.find((s) => t >= s.a && t < s.b) ?? SCENES[SCENES.length - 1];
  const u = smooth((t - S.a) / (S.b - S.a)), c = S.cam;
  // camera: creeping zoom + small pan; punch-in of 3 % decaying over 7 frames after every cut
  const kick = Math.max(0, 1 - (t - S.a) * DEMO_FPS / 7) * 0.03;
  const z = c.z0 + (c.z1 - c.z0) * u + kick, x = (c.x0 ?? 0) + ((c.x1 ?? 0) - (c.x0 ?? 0)) * u, y = (c.y0 ?? 0) + ((c.y1 ?? 0) - (c.y0 ?? 0)) * u;
  // far layer: own canvas, lens blur, parallax at 0.6 of the mid layer's zoom change
  const fc = far.c ?? (far.c = document.createElement("canvas")); fc.width = W; fc.height = H;
  const fg = fc.getContext("2d")!; fg.clearRect(0, 0, W, H); S.far(fg, t);
  g.save(); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const zf = 1 + (z - 1) * 0.6 + 0.02;
  g.translate(W / 2 - x * 0.6, H / 2 - y * 0.6); g.scale(zf, zf); g.translate(-W / 2, -H / 2);
  g.filter = `blur(${c.blur ?? 0}px)`; g.drawImage(fc, 0, 0); g.filter = "none";
  g.restore();
  g.save(); g.translate(W / 2 - x, H / 2 - y); g.scale(z, z); g.translate(-W / 2, -H / 2); S.mid(g, t, f); g.restore();
  post(g);
};

export const LongDemo: React.FC = () => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const { audio } = getInputProps() as { audio?: string };
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; draw(g, f); }, [f]);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
    </AbsoluteFill>
  );
};
