// Block table and the procedurally painted texture atlas. Every tile is drawn
// here pixel by pixel, so the game ships no image assets.

export const B = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LOG: 6,
  LEAVES: 7,
  AUTUMN: 8,
  PLANKS: 9,
  COBBLE: 10,
  SNOW: 11,
  GLASS: 12,
  LANTERN: 13,
  CRYSTAL: 14,
  FLOWER_R: 15,
  FLOWER_Y: 16,
  TALLGRASS: 17,
  SHRINE: 18,
  GOLD: 19,
  BOOKS: 20,
  BIRCH: 21,
  PINE: 22,
  SNOWGRASS: 23,
  CACTUS: 24,
  ROOF: 25,
  MARBLE: 26,
  RUNE: 27,
  PATH: 28,
  PORTAL: 29,
  BEDROCK: 30,
  FLOWER_B: 31,
} as const;

export const TILE = 16;
export const ATLAS_COLS = 8;
export const ATLAS_SIZE = TILE * ATLAS_COLS;

// tile indices
const T = {
  grassTop: 0, grassSide: 1, dirt: 2, stone: 3, sand: 4, water: 5, logSide: 6, logTop: 7,
  leaves: 8, autumn: 9, planks: 10, cobble: 11, snow: 12, glass: 13, lantern: 14, lanternTop: 15,
  crystal: 16, flowerR: 17, flowerY: 18, tallgrass: 19, shrine: 20, gold: 21, books: 22, birchSide: 23,
  birchTop: 24, pine: 25, snowSide: 26, cactusSide: 27, cactusTop: 28, roof: 29, marble: 30, rune: 31,
  path: 32, portal: 33, bedrock: 34, flowerB: 35, crack0: 40, crack1: 41, crack2: 42, crack3: 43,
} as const;

export const CRACK_TILES = [T.crack0, T.crack1, T.crack2, T.crack3];

export type BlockDef = {
  name: string;
  /** [top, side, bottom] tile indices */
  tiles: [number, number, number];
  /** blocks movement */
  solid: boolean;
  /** full cube that hides neighbouring faces and stops light */
  opaque: boolean;
  /** drawn as two crossed quads (plants) */
  cross: boolean;
  /** light emitted, 0-15 */
  emit: number;
  /** seconds to mine; Infinity = protected */
  hard: number;
  /** block id added to the bag when mined (0 = nothing) */
  drop: number;
};

const def = (
  name: string,
  tiles: [number, number, number],
  hard: number,
  drop: number,
  extra: Partial<BlockDef> = {},
): BlockDef => ({ name, tiles, solid: true, opaque: true, cross: false, emit: 0, hard, drop, ...extra });

const plant = (name: string, tile: number): BlockDef =>
  def(name, [tile, tile, tile], 0.05, 0, { solid: false, opaque: false, cross: true });

export const BLOCKS: BlockDef[] = [];
BLOCKS[B.AIR] = def("Air", [0, 0, 0], 0, 0, { solid: false, opaque: false });
BLOCKS[B.GRASS] = def("Grass", [T.grassTop, T.grassSide, T.dirt], 0.45, B.DIRT);
BLOCKS[B.DIRT] = def("Dirt", [T.dirt, T.dirt, T.dirt], 0.4, B.DIRT);
BLOCKS[B.STONE] = def("Stone", [T.stone, T.stone, T.stone], 0.9, B.COBBLE);
BLOCKS[B.SAND] = def("Sand", [T.sand, T.sand, T.sand], 0.35, B.SAND);
BLOCKS[B.WATER] = def("Water", [T.water, T.water, T.water], Infinity, 0, { solid: false, opaque: false });
BLOCKS[B.LOG] = def("Log", [T.logTop, T.logSide, T.logTop], 0.7, B.LOG);
BLOCKS[B.LEAVES] = def("Leaves", [T.leaves, T.leaves, T.leaves], 0.15, 0);
BLOCKS[B.AUTUMN] = def("Autumn leaves", [T.autumn, T.autumn, T.autumn], 0.15, 0);
BLOCKS[B.PLANKS] = def("Planks", [T.planks, T.planks, T.planks], 0.5, B.PLANKS);
BLOCKS[B.COBBLE] = def("Cobblestone", [T.cobble, T.cobble, T.cobble], 0.8, B.COBBLE);
BLOCKS[B.SNOW] = def("Snow", [T.snow, T.snow, T.snow], 0.25, 0);
BLOCKS[B.GLASS] = def("Glass", [T.glass, T.glass, T.glass], 0.2, B.GLASS, { opaque: false });
BLOCKS[B.LANTERN] = def("Lantern", [T.lanternTop, T.lantern, T.lanternTop], 0.2, B.LANTERN, { emit: 14 });
BLOCKS[B.CRYSTAL] = def("Crystal", [T.crystal, T.crystal, T.crystal], 0.6, 0, { emit: 11 });
BLOCKS[B.FLOWER_R] = plant("Poppy", T.flowerR);
BLOCKS[B.FLOWER_Y] = plant("Buttercup", T.flowerY);
BLOCKS[B.FLOWER_B] = plant("Bluebell", T.flowerB);
BLOCKS[B.TALLGRASS] = plant("Tall grass", T.tallgrass);
BLOCKS[B.SHRINE] = def("Shrine stone", [T.shrine, T.shrine, T.shrine], Infinity, 0);
BLOCKS[B.GOLD] = def("Gold", [T.gold, T.gold, T.gold], Infinity, 0);
BLOCKS[B.BOOKS] = def("Bookshelf", [T.planks, T.books, T.planks], 0.5, B.PLANKS);
BLOCKS[B.BIRCH] = def("Birch log", [T.birchTop, T.birchSide, T.birchTop], 0.7, B.LOG);
BLOCKS[B.PINE] = def("Pine needles", [T.pine, T.pine, T.pine], 0.15, 0);
BLOCKS[B.SNOWGRASS] = def("Snowy grass", [T.snow, T.snowSide, T.dirt], 0.45, B.DIRT);
BLOCKS[B.CACTUS] = def("Cactus", [T.cactusTop, T.cactusSide, T.cactusTop], 0.3, 0);
BLOCKS[B.ROOF] = def("Roof tiles", [T.roof, T.roof, T.roof], 0.5, 0);
BLOCKS[B.MARBLE] = def("Marble", [T.marble, T.marble, T.marble], Infinity, 0);
BLOCKS[B.RUNE] = def("Rune", [T.rune, T.rune, T.shrine], Infinity, 0, { emit: 13 });
BLOCKS[B.PATH] = def("Trail", [T.path, T.dirt, T.dirt], 0.4, B.DIRT);
BLOCKS[B.PORTAL] = def("Portal", [T.portal, T.portal, T.portal], Infinity, 0, { emit: 12 });
BLOCKS[B.BEDROCK] = def("Bedrock", [T.bedrock, T.bedrock, T.bedrock], Infinity, 0);

/** Blocks the player can carry and place, in hotbar order. */
export const ITEMS = [B.DIRT, B.COBBLE, B.SAND, B.LOG, B.PLANKS, B.GLASS, B.LANTERN] as const;

// lookup tables for the hot loops
export const SOLID = new Uint8Array(64);
export const OPAQUE = new Uint8Array(64);
export const CROSS = new Uint8Array(64);
export const EMIT = new Uint8Array(64);
BLOCKS.forEach((block, id) => {
  SOLID[id] = block.solid ? 1 : 0;
  OPAQUE[id] = block.opaque ? 1 : 0;
  CROSS[id] = block.cross ? 1 : 0;
  EMIT[id] = block.emit;
});

/** Map colours (top-down view), one per block id. */
export const MAP_COLORS: Record<number, [number, number, number]> = {
  [B.GRASS]: [104, 172, 78],
  [B.DIRT]: [138, 96, 62],
  [B.STONE]: [140, 144, 150],
  [B.SAND]: [226, 210, 150],
  [B.WATER]: [66, 140, 214],
  [B.LOG]: [104, 76, 48],
  [B.LEAVES]: [62, 134, 60],
  [B.AUTUMN]: [214, 132, 48],
  [B.PLANKS]: [196, 154, 92],
  [B.COBBLE]: [124, 126, 132],
  [B.SNOW]: [240, 244, 250],
  [B.SNOWGRASS]: [232, 238, 246],
  [B.PINE]: [44, 104, 74],
  [B.BIRCH]: [220, 216, 204],
  [B.CACTUS]: [80, 150, 76],
  [B.ROOF]: [180, 72, 58],
  [B.MARBLE]: [232, 230, 224],
  [B.SHRINE]: [78, 84, 104],
  [B.RUNE]: [120, 240, 255],
  [B.PATH]: [184, 158, 110],
  [B.GOLD]: [242, 196, 60],
  [B.PORTAL]: [140, 96, 255],
  [B.LANTERN]: [255, 214, 130],
  [B.CRYSTAL]: [120, 240, 255],
  [B.GLASS]: [200, 230, 245],
  [B.BOOKS]: [170, 120, 80],
  [B.BEDROCK]: [40, 40, 46],
};

// ------------------------------------------------------------ painting

type RGBA = [number, number, number, number];
type Painter = (x: number, y: number, rnd: () => number) => RGBA;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(color: string, delta = 0, alpha = 255): RGBA {
  const n = parseInt(color.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + delta)));
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255), alpha];
}

const CLEAR: RGBA = [0, 0, 0, 0];
const hash2 = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

const noisy = (color: string, amp: number): Painter => (_x, _y, r) => hex(color, (r() - 0.5) * amp);

const dirt: Painter = (x, y, r) => {
  const v = r();
  if (v < 0.07) return hex("#6b452b", (r() - 0.5) * 8);
  if (v > 0.94) return hex("#a3714b", 0);
  return hex("#8a5a3a", (r() - 0.5) * 16);
};

const topped = (cap: Painter, depth: number): Painter => (x, y, r) => {
  const edge = depth + Math.floor(hash2(x, 3) * 3);
  return y < edge ? cap(x, y, r) : dirt(x, y, r);
};

const grassTop: Painter = (_x, _y, r) => {
  const v = r();
  if (v > 0.9) return hex("#7fc257", 0);
  if (v < 0.1) return hex("#4c9238", 0);
  return hex("#5fa844", (r() - 0.5) * 14);
};

const leaves = (base: string, dark: string, accent: string): Painter => (_x, _y, r) => {
  const v = r();
  if (v < 0.22) return hex(dark, (r() - 0.5) * 10);
  if (v > 0.9) return hex(accent, 0);
  return hex(base, (r() - 0.5) * 22);
};

const log = (base: string, dark: string): Painter => (x, y, r) => {
  const stripe = hash2(x, 9) > 0.62;
  const knot = hash2(x >> 1, y >> 2) > 0.93;
  return hex(stripe || knot ? dark : base, (r() - 0.5) * 12);
};

const rings = (base: string, dark: string, bark: string): Painter => (x, y, r) => {
  const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
  if (d > 7) return hex(bark, (r() - 0.5) * 10);
  return hex(Math.floor(d) % 2 === 0 ? base : dark, (r() - 0.5) * 8);
};

const planks: Painter = (x, y, r) => {
  const row = y >> 2;
  if (y % 4 === 3) return hex("#8f6a38", (r() - 0.5) * 8);
  if ((x + row * 5) % 16 === 0) return hex("#9a7440", 0);
  return hex("#c49a5c", (hash2(row, 4) - 0.5) * 22 + (r() - 0.5) * 8);
};

const brick = (base: string, mortar: string, spread: number): Painter => (x, y, r) => {
  const row = y >> 2;
  const shift = row % 2 === 0 ? 0 : 4;
  if (y % 4 === 3 || (x + shift) % 8 === 7) return hex(mortar, (r() - 0.5) * 8);
  const cell = Math.floor((x + shift) / 8) + row * 7;
  const bevel = y % 4 === 0 ? 8 : 0;
  return hex(base, (hash2(cell, 2) - 0.5) * spread + bevel + (r() - 0.5) * 8);
};

const stone: Painter = (x, y, r) => {
  const blotch = hash2(x >> 2, y >> 1) > 0.72 ? -14 : 0;
  const crack = hash2(x >> 1, y) > 0.95 ? -26 : 0;
  return hex("#8b8f96", blotch + crack + (r() - 0.5) * 10);
};

const water: Painter = (x, y, r) => {
  const wave = (y + Math.floor(Math.sin(x * 0.8) * 1.5)) % 5 === 0 && hash2(x >> 2, y) > 0.35;
  return hex(wave ? "#6fb4ee" : "#3f8fd8", (r() - 0.5) * 8);
};

const glass: Painter = (x, y) => {
  if (x === 0 || y === 0 || x === 15 || y === 15) return hex("#d7ecf7");
  if ((x + y === 9 && x > 2 && x < 7) || (x + y === 12 && x > 3 && x < 6)) return hex("#ffffff");
  return CLEAR;
};

const lantern: Painter = (x, y) => {
  if (x === 0 || y === 0 || x === 15 || y === 15 || x === 7 || x === 8) return hex("#3a2f25");
  if (y === 1 || y === 14) return hex("#5a4632");
  const d = Math.hypot(x - 7.5, y - 7.5);
  return hex("#ffd27a", Math.max(0, 40 - d * 7));
};

const lanternTop: Painter = (x, y, r) => {
  const edge = x < 2 || y < 2 || x > 13 || y > 13;
  return hex(edge ? "#3a2f25" : "#5a4632", (r() - 0.5) * 10);
};

const crystal: Painter = (x, y, r) => {
  if (x === 0 || y === 0 || x === 15 || y === 15) return hex("#1f8fb5");
  const band = (x + y * 2) % 9;
  if (band < 2) return hex("#f2feff");
  if (band < 5) return hex("#8ef0ff", (r() - 0.5) * 10);
  return hex("#3fc6e8", (r() - 0.5) * 12);
};

const flower = (petal: string, heart: string): Painter => (x, y) => {
  const d = Math.hypot(x - 7.5, y - 4.5);
  if (d < 1.2) return hex(heart);
  if (d < 3.4 && (x + y) % 2 === 0) return hex(petal);
  if (d < 3) return hex(petal, -22);
  if ((x === 7 || x === 8) && y > 5) return hex("#3f8a3a", x === 7 ? 0 : -16);
  if (y > 9 && y < 13 && (x === 5 + (y - 10) || x === 10 - (y - 10))) return hex("#4c9c42");
  return CLEAR;
};

const tallgrass: Painter = (x, y) => {
  const height = 5 + Math.floor(hash2(x, 21) * 10);
  if (y < 16 - height) return CLEAR;
  if (hash2(x, 5) < 0.4) return CLEAR;
  return hex("#5fa844", (hash2(x, y) - 0.5) * 40);
};

const shrine: Painter = (x, y, r) => {
  if (x === 0 || y === 0) return hex("#6b7190");
  if (x === 15 || y === 15) return hex("#33374a");
  if ((x === 3 || x === 12) && y > 2 && y < 13) return hex("#3c4158");
  if ((y === 3 || y === 12) && x > 2 && x < 13) return hex("#3c4158");
  return hex("#4a4f66", (r() - 0.5) * 10);
};

const GLYPH = [
  "................",
  "................",
  "......####......",
  "....##....##....",
  "...#........#...",
  "...#..####..#...",
  "..#..#....#..#..",
  "..#..#.##.#..#..",
  "..#..#.##.#..#..",
  "..#..#....#..#..",
  "...#..####..#...",
  "...#........#...",
  "....##....##....",
  "......####......",
  "................",
  "................",
];

const rune: Painter = (x, y, r) => (GLYPH[y][x] === "#" ? hex("#9ff6ff", (r() - 0.5) * 20) : shrine(x, y, r));

const gold: Painter = (x, y, r) => {
  if (x === 0 || y === 0) return hex("#fff0a0");
  if (x === 15 || y === 15) return hex("#b8861c");
  if ((x + y) % 7 === 0) return hex("#ffe487");
  return hex("#f2c53d", (r() - 0.5) * 14);
};

const SPINES = ["#b5473a", "#3f7fbf", "#4c9c42", "#e0b23c", "#7b4dff", "#d9822b", "#2f6b6a"];
const books: Painter = (x, y, r) => {
  if (y < 2 || y > 13 || y === 7 || y === 8) return planks(x, y, r);
  const spine = SPINES[Math.floor(hash2(x >> 1, y > 7 ? 1 : 0) * SPINES.length)];
  if (x % 2 === 1 && hash2(x, y > 7 ? 5 : 6) > 0.6) return hex(spine, -30);
  return hex(spine, (y === 2 || y === 9 ? 18 : 0) + (r() - 0.5) * 6);
};

const birch: Painter = (x, y, r) => {
  const mark = hash2(x >> 2, y) > 0.86 && hash2(y, 7) > 0.4;
  return mark ? hex("#3d3a36") : hex("#e8e4d8", (r() - 0.5) * 10);
};

const cactus: Painter = (x, y, r) => {
  if (x % 4 === 0) return hex("#3b7d3a", (r() - 0.5) * 8);
  if (x % 4 === 2 && y % 4 === 1) return hex("#e9f2c8");
  return hex("#4f9a4a", (r() - 0.5) * 12);
};

const roof: Painter = (x, y, r) => {
  const row = y >> 2;
  if (y % 4 === 3) return hex("#7d2f27");
  if ((x + (row % 2) * 4) % 8 === 0) return hex("#8f372d");
  return hex("#b5473a", (y % 4 === 0 ? 14 : 0) + (r() - 0.5) * 10);
};

const marble: Painter = (x, y, r) => {
  const vein = Math.abs(((x * 3 + y * 5 + Math.floor(hash2(x >> 2, y >> 2) * 6)) % 23) - 11) < 1;
  return hex("#eceae4", (vein ? -24 : 0) + (r() - 0.5) * 6);
};

const path: Painter = (_x, _y, r) => {
  const v = r();
  if (v < 0.1) return hex("#8f7850");
  if (v > 0.9) return hex("#d3bd8e");
  return hex("#b59a6a", (r() - 0.5) * 18);
};

const portal: Painter = (x, y, r) => {
  const swirl = Math.sin(Math.hypot(x - 7.5, y - 7.5) * 1.3 + Math.atan2(y - 7.5, x - 7.5) * 2);
  if (swirl > 0.55) return hex("#e2d2ff");
  if (swirl > 0) return hex("#a67dff", (r() - 0.5) * 16);
  return hex("#6a3de0", (r() - 0.5) * 16);
};

function crack(stage: number): Painter {
  // a handful of random walks from the centre; later stages keep earlier lines
  const cells = new Set<number>();
  const r = rng(977);
  for (let line = 0; line < 2 + stage * 2; line++) {
    let x = 7 + Math.floor(r() * 2);
    let y = 7 + Math.floor(r() * 2);
    const angle = r() * Math.PI * 2;
    const length = 4 + stage * 2 + Math.floor(r() * 3);
    for (let step = 0; step < length; step++) {
      cells.add(y * 16 + x);
      x = Math.max(0, Math.min(15, Math.round(x + Math.cos(angle) + (r() - 0.5) * 1.4)));
      y = Math.max(0, Math.min(15, Math.round(y + Math.sin(angle) + (r() - 0.5) * 1.4)));
    }
  }
  return (x, y) => (cells.has(y * 16 + x) ? [20, 16, 12, 255] : CLEAR);
}

const PAINTERS: Record<number, Painter> = {
  [T.grassTop]: grassTop,
  [T.grassSide]: topped(grassTop, 3),
  [T.dirt]: dirt,
  [T.stone]: stone,
  [T.sand]: noisy("#e6d59a", 12),
  [T.water]: water,
  [T.logSide]: log("#6b4a2b", "#553a20"),
  [T.logTop]: rings("#b08a55", "#96733f", "#5d4126"),
  [T.leaves]: leaves("#3f8a3a", "#2c6a2d", "#62b04e"),
  [T.autumn]: leaves("#d9822b", "#b5532a", "#f0bf46"),
  [T.planks]: planks,
  [T.cobble]: brick("#84868d", "#55575e", 30),
  [T.snow]: noisy("#f2f6fb", 6),
  [T.glass]: glass,
  [T.lantern]: lantern,
  [T.lanternTop]: lanternTop,
  [T.crystal]: crystal,
  [T.flowerR]: flower("#e0473c", "#ffd84a"),
  [T.flowerY]: flower("#f5cf3a", "#e58a1f"),
  [T.flowerB]: flower("#6f8cff", "#f5f0c8"),
  [T.tallgrass]: tallgrass,
  [T.shrine]: shrine,
  [T.gold]: gold,
  [T.books]: books,
  [T.birchSide]: birch,
  [T.birchTop]: rings("#e3d9bd", "#cfc3a2", "#e8e4d8"),
  [T.pine]: leaves("#2f6b4a", "#214f38", "#3f8560"),
  [T.snowSide]: topped(noisy("#f2f6fb", 6), 4),
  [T.cactusSide]: cactus,
  [T.cactusTop]: rings("#5fae58", "#4f9a4a", "#3b7d3a"),
  [T.roof]: roof,
  [T.marble]: marble,
  [T.rune]: rune,
  [T.path]: path,
  [T.portal]: portal,
  [T.bedrock]: noisy("#2b2b30", 30),
  [T.crack0]: crack(0),
  [T.crack1]: crack(1),
  [T.crack2]: crack(2),
  [T.crack3]: crack(3),
};

export function paintAtlas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(ATLAS_SIZE, ATLAS_SIZE);
  for (const [key, painter] of Object.entries(PAINTERS)) {
    const tile = Number(key);
    const ox = (tile % ATLAS_COLS) * TILE;
    const oy = Math.floor(tile / ATLAS_COLS) * TILE;
    const rnd = rng(tile * 7919 + 13);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const [r, g, b, a] = painter(x, y, rnd);
        const at = ((oy + y) * ATLAS_SIZE + ox + x) * 4;
        image.data[at] = r;
        image.data[at + 1] = g;
        image.data[at + 2] = b;
        image.data[at + 3] = a;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** [u0, v0, u1, v1] with v0 at the top row of the tile (texture is not flipped). */
export function tileUV(tile: number): [number, number, number, number] {
  const inset = 0.02 / ATLAS_COLS;
  const u = (tile % ATLAS_COLS) / ATLAS_COLS;
  const v = Math.floor(tile / ATLAS_COLS) / ATLAS_COLS;
  return [u + inset, v + inset, u + 1 / ATLAS_COLS - inset, v + 1 / ATLAS_COLS - inset];
}

/** A small isometric cube icon for the hotbar. */
export function blockIcon(atlas: HTMLCanvasElement, id: number): string {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const [top, side] = BLOCKS[id].tiles;
  const src = (tile: number) => [(tile % ATLAS_COLS) * TILE, Math.floor(tile / ATLAS_COLS) * TILE] as const;
  const face = (tile: number, a: number, b: number, c: number, d: number, e: number, f: number, dark: number) => {
    const [sx, sy] = src(tile);
    ctx.setTransform(a, b, c, d, e, f);
    ctx.drawImage(atlas, sx, sy, TILE, TILE, 0, 0, 1, 1);
    if (dark) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, 1, 1);
    }
  };
  const h = size / 2;
  const q = size / 4;
  face(top, h, q, -h, q, h, 2, 0); // top rhombus
  face(side, h, q, 0, h - 4, 0, q + 2, 0.22); // left
  face(side, h, -q, 0, h - 4, h, h + 2, 0.4); // right
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas.toDataURL();
}
