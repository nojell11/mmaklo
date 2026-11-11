// Prop icon library for the long-form 2D route: each prop is drawn around (0,0), ~240 px wide, flat two-tone with plum
// ink, the same hand as kit.ts. `a` = seconds since the prop appeared (for small idle motion). Add new props here.
import { G, PAL, box, ell, poly, line, propCar, propGarage, propBed, propCamera, propPool, propCoin, propHouse } from "./kit";

const P = {
  car: (g: G) => propCar(g), garage: (g: G) => propGarage(g), bed: (g: G) => propBed(g), camera: (g: G) => propCamera(g),
  pool: (g: G) => propPool(g), house: (g: G) => propHouse(g),
  coin: (g: G, a: number) => propCoin(g, 70, a * 3),
  coins: (g: G) => { for (let i = 0; i < 5; i++) { g.save(); g.translate(-60 + (i % 3) * 60, 40 - i * 22); g.scale(1, 0.45); ell(g, 0, 0, 56, 56, PAL.gold, 5); g.restore(); } },
  cash: (g: G) => {
    for (const [dx, dy, r] of [[-20, 20, -0.12], [10, 0, 0.06], [0, -20, -0.02]] as const) {
      g.save(); g.translate(dx, dy); g.rotate(r); box(g, -120, -60, 240, 120, "#8fc98a", 10, 5); ell(g, 0, 0, 34, 34, "#6aa865", 4);
      g.font = '900 44px "Segoe UI Black", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#2e5a2b"; g.fillText("$", 0, 2); g.restore();
    }
  },
  bag: (g: G) => {
    poly(g, [[-40, -95], [40, -95], [20, -60], [-20, -60]], "#c9a26a"); ell(g, 0, 20, 115, 95, "#d9b47a", 5);
    g.font = '900 100px "Segoe UI Black", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#7a5a2a"; g.fillText("$", 0, 26);
  },
  phone: (g: G, a: number) => {
    box(g, -70, -120, 140, 240, "#3a3f52", 22); box(g, -56, -100, 112, 196, "#cfe0f2", 10, 4);
    for (let i = 0; i < 3; i++) box(g, -42, -82 + i * 56, 84, 40, i === Math.floor(a * 1.5) % 3 ? PAL.tealLt : "#f4f8ff", 8, 3);
  },
  calendar: (g: G) => {
    box(g, -110, -100, 220, 200, PAL.cream, 14); box(g, -110, -100, 220, 52, PAL.terra, 14);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) box(g, -92 + c * 38, -30 + r * 40, 26, 26, (r * 5 + c) % 4 === 1 ? PAL.tealLt : "#efe2cc", 5, 3);
  },
  wrench: (g: G) => {
    g.save(); g.rotate(-0.6); box(g, -18, -40, 36, 170, "#9aa3ad", 14);
    poly(g, [[-55, -60], [-30, -110], [30, -110], [55, -60], [25, -45], [12, -80], [-12, -80], [-25, -45]], "#9aa3ad"); g.restore();
  },
  shield: (g: G) => {
    poly(g, [[0, -120], [100, -80], [90, 30], [0, 120], [-90, 30], [-100, -80]], PAL.blue);
    line(g, [[-40, 0], [-10, 35], [50, -40]], 18, PAL.cream);
  },
  doc: (g: G) => {
    poly(g, [[-90, -120], [50, -120], [90, -80], [90, 120], [-90, 120]], PAL.cream);
    for (let i = 0; i < 5; i++) line(g, [[-60, -70 + i * 38], [i === 4 ? 0 : 60, -70 + i * 38]], 8, "#b9a98f");
    g.font = '900 40px "Segoe UI Black", sans-serif'; g.textAlign = "center"; g.fillStyle = PAL.terra; g.fillText("TAX", 30, 100);
  },
  chart: (g: G, a: number) => {
    box(g, -130, -100, 260, 200, PAL.cream, 14);
    const k = Math.min(1, a / 0.8);
    [0.35, 0.55, 0.45, 0.8].forEach((v, i) => box(g, -100 + i * 52, 80 - 150 * v * k, 36, 150 * v * k, [PAL.teal, PAL.blue, PAL.terra, PAL.gold][i], 6, 4));
  },
  warning: (g: G) => {
    poly(g, [[0, -115], [120, 95], [-120, 95]], PAL.gold);
    g.font = '900 130px "Segoe UI Black", sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#3a2a22"; g.fillText("!", 0, 30);
  },
  clock: (g: G, a: number) => {
    ell(g, 0, 0, 110, 110, PAL.cream, 6);
    line(g, [[0, 0], [0, -70]], 10); line(g, [[0, 0], [Math.cos(a * 2) * 55, Math.sin(a * 2) * 55]], 8, PAL.terra); ell(g, 0, 0, 10, 10, "#3a2a22", 0);
  },
  key: (g: G) => {
    ell(g, -60, 0, 55, 55, PAL.gold, 6); ell(g, -60, 0, 20, 20, "#f3e3c3", 5);
    box(g, -10, -14, 160, 28, PAL.gold, 8); box(g, 100, 10, 18, 34, PAL.gold, 4); box(g, 130, 10, 18, 26, PAL.gold, 4);
  },
  tent: (g: G) => { poly(g, [[0, -110], [130, 90], [-130, 90]], PAL.green); poly(g, [[0, -20], [40, 90], [-40, 90]], "#3e6a33"); },
  tools: (g: G) => {
    g.save(); g.rotate(0.5); box(g, -14, -100, 28, 200, "#8a5a3a", 8); box(g, -55, -120, 110, 46, "#9aa3ad", 8); g.restore();
    g.save(); g.rotate(-0.5); box(g, -10, -110, 20, 210, "#c9653f", 8); g.restore();
  },
  party: (g: G) => {
    poly(g, [[0, -120], [70, 90], [-70, 90]], PAL.terra);
    for (const [x, y, c] of [[-20, 0, PAL.gold], [20, 40, PAL.teal], [-10, 60, PAL.blue]] as const) ell(g, x, y, 12, 12, c, 3);
  },
  storage: (g: G) => {
    box(g, -120, -60, 110, 110, "#c8955a", 8); box(g, 10, -60, 110, 110, "#b5824a", 8); box(g, -55, -150, 110, 90, "#d9a66a", 8);
  },
};
export type PropName = keyof typeof P;
export const PROPS: Record<PropName, (g: G, a: number) => void> = P;
export const PROP_NAMES = Object.keys(P) as PropName[];
