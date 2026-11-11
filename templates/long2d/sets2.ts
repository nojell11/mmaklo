// Extra far-layer sets for the long-form 2D route + the set registry used by plans. All sets are drawn full-frame at
// 1920x1080 and get the lens blur of the scene camera. Concept colourways keep the brand palette (warm neutrals with
// teal / soft blue / terracotta).
import { G, W, H, PAL, box, ell, poly, line, setRoom, setDesk, setConcept } from "./kit";
import { INK, mix } from "./toon2";

/** street: sky, two rows of simple houses / shops, sidewalk + kerb */
export const setStreet = (g: G) => {
  const sky = g.createLinearGradient(0, 0, 0, 640); sky.addColorStop(0, "#9cc8ec"); sky.addColorStop(1, "#d8ebf6");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  ell(g, 1500, 180, 90, 40, "#ffffff", 0); ell(g, 1580, 165, 70, 34, "#ffffff", 0); ell(g, 420, 140, 80, 34, "#ffffff", 0);
  const cols = [PAL.terraLt, PAL.cream, "#e8c99a", PAL.tealLt, "#f0d0b8", PAL.blueLt];
  for (let i = 0; i < 7; i++) {
    const x = -60 + i * 290, w = 260, h = 300 + ((i * 97) % 140), y = 760 - h;
    box(g, x, y, w, h, cols[i % cols.length], 6);
    poly(g, [[x - 14, y], [x + w / 2, y - 80], [x + w + 14, y]], mix(PAL.terra, INK, 0.15 * (i % 2)));
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) box(g, x + 40 + c * 120, y + 50 + r * 110, 60, 70, PAL.sky, 4, 4);
    if (i % 2) box(g, x + w / 2 - 34, 640, 68, 120, "#8a5a3a", 6, 4);
  }
  g.fillStyle = "#cfc4b4"; g.fillRect(0, 760, W, 120); line(g, [[0, 760], [W, 760]], 6);
  g.fillStyle = "#7d7a80"; g.fillRect(0, 880, W, H - 880); line(g, [[0, 880], [W, 880]], 6);
  for (let i = 0; i < 8; i++) box(g, i * 260 + 60, 970, 140, 16, "#e8e2d6", 4, 0);
};

/** explainer wall: a big cream board on a warm wall, like a classroom / office whiteboard */
export const setBoard = (g: G) => {
  g.fillStyle = "#e6d6bd"; g.fillRect(0, 0, W, H);
  box(g, 160, 90, 1600, 760, "#fbf6ea", 18, 8);
  box(g, 130, 850, 1660, 30, "#8a5a3a", 8, 5);
  for (let i = 0; i < 3; i++) box(g, 300 + i * 70, 828, 46, 18, [PAL.terra, PAL.teal, PAL.blue][i], 6, 3);
  g.fillStyle = PAL.floor; g.fillRect(0, 880, W, H - 880); line(g, [[0, 880], [W, 880]], 6);
};

/** office: wall, window band, a plant and a shelf with binders */
export const setOffice = (g: G) => {
  g.fillStyle = "#dfe6ea"; g.fillRect(0, 0, W, H);
  box(g, 120, 140, 900, 360, "#bfe0f0", 8, 6);
  for (const x of [420, 720]) line(g, [[x, 140], [x, 500]], 6);
  for (let i = 0; i < 5; i++) box(g, 180 + i * 160, 380 - (i % 3) * 60, 120, 120 + (i % 3) * 60, mix("#8aa0b8", "#ffffff", 0.3), 4, 3);
  box(g, 1250, 300, 480, 24, "#8a5a3a", 6);
  for (let i = 0; i < 6; i++) box(g, 1270 + i * 72, 196, 56, 104, [PAL.teal, PAL.terra, PAL.blue, PAL.gold, PAL.green, PAL.terraLt][i], 4, 4);
  g.fillStyle = "#b9a58a"; g.fillRect(0, 800, W, H - 800); line(g, [[0, 800], [W, 800]], 6);
  box(g, 1700, 640, 110, 160, "#d98a5a", 10);
  for (const a of [-1, -0.4, 0.3, 0.9]) ell(g, 1755 + 70 * Math.sin(a), 600 - 70 * Math.cos(a), 26, 60, PAL.green, 4);
};

/** concept colourways: [base, ring] */
export const CONCEPT: Record<string, [string, string]> = {
  gold: ["#f3e3c3", PAL.gold], terra: ["#e9d6c6", PAL.terra], teal: ["#d9ece6", PAL.teal], blue: ["#cfe0f2", PAL.blue],
  cream: ["#efe2cc", PAL.terra], green: ["#dcebd2", PAL.green], red: ["#f2d6cf", PAL.red], night: ["#3a4466", "#8a9ad1"],
};

export type SetName = "room" | "night" | "desk" | "street" | "board" | "office" | `concept:${string}`;
export const drawSet = (g: G, name: string) => {
  if (name === "room") return setRoom(g);
  if (name === "night") return setRoom(g, true);
  if (name === "desk") return setDesk(g);
  if (name === "street") return setStreet(g);
  if (name === "board") return setBoard(g);
  if (name === "office") return setOffice(g);
  const [, c] = name.split(":"); const [b, r] = CONCEPT[c ?? "cream"] ?? CONCEPT.cream;
  setConcept(g, b, r);
};
