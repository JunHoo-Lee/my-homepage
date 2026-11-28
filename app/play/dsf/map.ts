/*
 * The island as data: a ring of land five tiles wide around a moat of static,
 * the door on an islet in the middle, the shore to the south.
 *
 * Tiles are 16 art pixels. Coordinates are (x, y) with the origin at the top
 * left. Everything outside the array is sea. The rows were generated and
 * linted by a script (coast rules, reachability, walking distances), so edit
 * them with care: the coast drawing assumes no one-tile channels or spikes.
 */

import type { SiteId } from "./content";
import { ATLAS, type SpriteName } from "./engine/atlas";

export const TILE = 16;
export const MAP_W = 42;
export const MAP_H = 50;

/** `~` static sea, `.` grass, `=` dirt path, `t` tide (grass under static until the slab is solved). */
export const GROUND: readonly string[] = [
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~.....~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~.......~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~.......~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~.......~~~~~.....~~~~~~~~~~~~~~",
  "~~~~~~~~......=....................~~~~~~~",
  "~~~~~~~.......=.....................~~~~~~",
  "~~~......=========================..~~~~~~",
  "~~.......=.......................=..~~~~~~",
  "~~.......=...............~~~~....=..~~~~~~",
  "~~..======...~~~~~~~~~~~~~~~~~...=..~~~~~~",
  "~~.......=..~~~~~~~~~~~~~~~~~~~..=..~~~~~~",
  "~~~......=..~~~~~~~~~~~~~~~~~~~~.=..~~~~~~",
  "~~~~~~~..=..~~~~~~~.....~~~~~~~~.=.....~~~",
  "~~~~~~~..=..~~~~~~.......~~~~~~~.=......~~",
  "~~~~~~...=..~~~~~~.......~~~~~~~.=......~~",
  "~~~~~~...=..~~~~~~.=====.~~~~~~..=......~~",
  "~~~~~~~..=..~~~~~~.=====.~~~~~~..=......~~",
  "~~~~~~~..=..~~~~~~.=====.~~~~~~..=====..~~",
  "~~.......=..~~~~~~~.....~~~~~~~..=.....~~~",
  "~~.......=..~~~~~~~~.=.~~~~~~~~..=.~~~~~~~",
  "~~.......=.~~~~~~~~~.=.~~~~~~~~..=.~~~~~~~",
  "~~.=======.~~~~~~~~~.=.~~~~~~~~..=..~~~~~~",
  "~~.......=.~~~~~~~~~.=.~~~~~~~~..=.....~~~",
  "~~~......=.~~~~~~~~~.=.~~~~~~~~..=......~~",
  "~~~~~~~..=..~~~~~~~~.=.~~~~~~~~..=......~~",
  "~~~~~~~..=...~~~~~~~.=.~~~~~~~...=====..~~",
  "~~~~~~~..=...........=...~~~~....=......~~",
  "~~~~~~~..=...........=...........=.....~~~",
  "~~~~~~~..=========================..~~~~~~",
  "~~~~~~~..............=..............~~~~~~",
  "~~~~~~~~.............=.............~~~~~~~",
  "~~~~~~~~~~.....~~~~..=..~~~~.....~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~ttttt~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~ttttt~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~..=..~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~..=..~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~...=...~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~.......~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~.....~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
];

export type Tile = readonly [number, number];

export const SPAWN: Tile = [21, 44];
/** Where the robot lies on the title screen: beside the slab. */
export const TITLE_BED: Tile = [20, 40];
/** Where "Back to the island" puts the robot after the ending. */
export const AFTER_ENDING: Tile = [21, 19];

/** The neck that the static covers until the slab is solved. */
export const TIDE_TILES: Tile[] = [];
for (let y = 36; y <= 37; y += 1) for (let x = 19; x <= 23; x += 1) TIDE_TILES.push([x, y]);
/** The overlay also covers the coast on both sides of the neck, in art pixels. */
export const TIDE_RECT = { x: 18 * TILE, y: 36 * TILE - 4, w: 7 * TILE, h: 2 * TILE + 8 } as const;

function box(x0: number, y0: number, w: number, h: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = y0; y < y0 + h; y += 1) for (let x = x0; x < x0 + w; x += 1) tiles.push([x, y]);
  return tiles;
}

export type Part = {
  sprite: SpriteName;
  /** Art pixels, top left. */
  x: number;
  y: number;
  /** Draw order: the y of the line the thing stands on. */
  foot: number;
  /** A tag the engine uses to swap or animate the part. */
  tag?: "slab" | "tower" | "door" | "sprout" | "plant";
  /** Frame offset in a strip of equal frames. */
  frame?: number;
  /** Width of one frame when the sprite is a strip. */
  fw?: number;
};

const part = (sprite: SpriteName, tx: number, ty: number, footTile: number, extra: Partial<Part> = {}): Part => ({
  sprite,
  x: tx * TILE,
  y: ty * TILE,
  foot: footTile * TILE,
  ...extra,
});

export type Thing = {
  id: string;
  kind: "site" | "statue";
  blocked: Tile[];
  /** Standing 4-adjacent to one of these is "near". */
  touch: Tile[];
  use: Tile;
  /** Tap target, art pixels. */
  hit: { x: number; y: number; w: number; h: number };
  /** Where the bubble's bottom centre sits, art pixels. */
  bubble: readonly [number, number];
  /** What a pan looks at, art pixels. */
  focus: readonly [number, number];
  /** The ruin's own lamp (tile of its base), if it has one. */
  lamp?: Tile;
  /** Where the character stands, for the four suspects. */
  stand?: Tile;
  parts: Part[];
};

const px = (tiles: number) => tiles * TILE;

export const THINGS: Thing[] = [
  {
    id: "shore",
    kind: "site",
    blocked: [[21, 40]],
    touch: [[21, 40]],
    use: [21, 41],
    hit: { x: px(21), y: px(39), w: 16, h: 32 },
    bubble: [px(21) + 8, px(39) - 1],
    focus: [px(21) + 8, px(40)],
    lamp: [23, 40],
    parts: [part("slab", 21, 39, 41, { tag: "slab" })],
  },
  {
    id: "needle",
    kind: "site",
    blocked: [[18, 30]],
    touch: [[18, 30]],
    use: [18, 31],
    hit: { x: px(18), y: px(29), w: 16, h: 32 },
    bubble: [px(18) + 8, px(29) + 5],
    focus: [px(18) + 8, px(30)],
    lamp: [17, 30],
    parts: [part("board", 18, 29, 31)],
  },
  {
    id: "looks",
    kind: "site",
    blocked: box(2, 22, 4, 3),
    touch: [[3, 24]],
    use: [3, 25],
    hit: { x: px(2), y: px(22), w: 64, h: 48 },
    bubble: [px(3) + 8, px(22) + 6],
    focus: [px(4), px(23) + 8],
    lamp: [5, 26],
    parts: [part("hall", 2, 22, 25)],
  },
  {
    id: "garden",
    kind: "site",
    blocked: box(3, 11, 3, 2),
    touch: box(3, 11, 3, 2),
    use: [4, 13],
    hit: { x: px(3), y: px(11), w: 48, h: 32 },
    bubble: [px(4) + 8, px(11) - 1],
    focus: [px(4) + 8, px(12)],
    lamp: [2, 13],
    parts: box(3, 11, 3, 2).map(([x, y], index) => ({
      sprite: "sprout0" as const,
      x: px(x) + 3,
      y: px(y) + 1,
      foot: px(y + 1),
      tag: "sprout" as const,
      frame: index,
    })),
  },
  {
    id: "ruler",
    kind: "site",
    blocked: box(13, 5, 3, 3),
    touch: [[14, 7]],
    use: [14, 8],
    hit: { x: px(13), y: px(5), w: 48, h: 48 },
    bubble: [px(14) + 8, px(5) + 3],
    focus: [px(14) + 8, px(6) + 8],
    lamp: [16, 8],
    parts: [part("cave", 13, 5, 8)],
  },
  {
    id: "footprints",
    kind: "site",
    blocked: [[33, 9]],
    touch: [[33, 9]],
    use: [33, 10],
    hit: { x: px(33), y: px(7), w: 16, h: 48 },
    bubble: [px(33) + 8, px(7) + 1],
    focus: [px(33) + 8, px(9)],
    lamp: [34, 9],
    parts: [part("stone", 33, 7, 10)],
  },
  {
    id: "clock",
    kind: "site",
    blocked: box(37, 19, 2, 2),
    touch: [
      [37, 20],
      [38, 20],
    ],
    use: [37, 21],
    hit: { x: px(37), y: px(19), w: 32, h: 32 },
    bubble: [px(38), px(19) - 1],
    focus: [px(38), px(20)],
    lamp: [39, 21],
    parts: [part("tower", 37, 19, 21, { tag: "tower" })],
  },
  {
    id: "bench",
    kind: "site",
    blocked: [
      [36, 28],
      [37, 28],
      [38, 28],
      [36, 27],
      [38, 27],
    ],
    touch: box(36, 28, 3, 1),
    use: [37, 29],
    hit: { x: px(36), y: px(26), w: 48, h: 48 },
    bubble: [px(37) + 8, px(27) + 2],
    focus: [px(37) + 8, px(28)],
    lamp: [39, 28],
    parts: [
      part("shelfA", 36, 26, 28),
      part("shelfB", 38, 26, 28),
      part("table", 36, 28, 29),
      { sprite: "card0", x: px(36) + 7, y: px(28) + 1, foot: px(29) + 1 },
      { sprite: "card1", x: px(36) + 14, y: px(28) + 2, foot: px(29) + 1 },
      { sprite: "candle", x: px(38) - 2, y: px(28) - 8, foot: px(29) + 1 },
    ],
  },
  {
    id: "door",
    kind: "site",
    blocked: [...box(20, 16, 3, 3), [19, 18], [23, 18]],
    touch: [[21, 18]],
    use: [21, 19],
    hit: { x: px(20), y: px(16), w: 48, h: 48 },
    bubble: [px(21) + 8, px(16) + 1],
    focus: [px(21) + 8, px(18)],
    parts: [
      { sprite: "doorClosed", x: px(20) + 13, y: px(16) + 14, foot: px(16) + 2, tag: "door" },
      part("arch", 20, 16, 19),
      part("pillar", 19, 16, 19),
      part("pillar", 23, 16, 19),
    ],
  },
  {
    id: "prompter",
    kind: "statue",
    blocked: [[24, 31]],
    touch: [[24, 31]],
    use: [24, 32],
    hit: { x: px(24), y: px(31) - 4, w: 16, h: 20 },
    bubble: [px(24) + 8, px(31) - 5],
    focus: [px(24) + 8, px(31) + 8],
    stand: [24, 31],
    parts: [],
  },
  {
    id: "bookkeeper",
    kind: "statue",
    blocked: [[10, 18], ...box(10, 16, 2, 2)],
    touch: [[10, 18]],
    use: [10, 19],
    hit: { x: px(10), y: px(18) - 4, w: 16, h: 20 },
    bubble: [px(10) + 8, px(18) - 5],
    focus: [px(10) + 8, px(18) + 8],
    stand: [10, 18],
    parts: [part("desk", 10, 16, 18)],
  },
  {
    id: "copyist",
    kind: "statue",
    blocked: [
      [21, 9],
      [20, 9],
      [22, 9],
    ],
    touch: [[21, 9]],
    use: [21, 10],
    hit: { x: px(21), y: px(9) - 4, w: 16, h: 20 },
    bubble: [px(21) + 8, px(9) - 5],
    focus: [px(21) + 8, px(9) + 8],
    stand: [21, 9],
    parts: [part("slab", 20, 8, 10), part("board", 22, 8, 10)],
  },
  {
    id: "artist",
    kind: "statue",
    blocked: [[32, 25], ...box(31, 23, 2, 2)],
    touch: [[32, 25]],
    use: [32, 26],
    hit: { x: px(32), y: px(25) - 4, w: 16, h: 20 },
    bubble: [px(32) + 8, px(25) - 5],
    focus: [px(32) + 8, px(25) + 8],
    stand: [32, 25],
    parts: [part("bookcase", 31, 23, 25)],
  },
];

/** Ruin lamps in the order the ruins are listed, by site. */
export const RUIN_LAMPS: { id: SiteId; tile: Tile }[] = THINGS.filter((thing) => thing.lamp).map((thing) => ({
  id: thing.id as SiteId,
  tile: thing.lamp as Tile,
}));

/** Causeway lamps, in lighting order 1 to 5. */
export const CAUSEWAY_LAMPS: Tile[] = [
  [20, 28],
  [22, 27],
  [20, 26],
  [22, 25],
  [20, 24],
];

type Decor = { parts: Part[]; blocked: Tile[] };

function tall(sprite: SpriteName, x: number, baseY: number, w: number, h: number): Decor {
  return { parts: [part(sprite, x, baseY - h + 1, baseY + 1)], blocked: box(x, baseY, w, 1) };
}

const stake = (x: number, y: number, dx: number, dy: number): Part => ({ sprite: "stake", x: px(x) + dx, y: px(y) + dy, foot: px(y) + dy + 9 });

export const DECOR: Decor[] = [
  tall("treeRound", 18, 44, 2, 2),
  tall("treeDark", 27, 34, 2, 2),
  tall("treeDark", 7, 29, 2, 2),
  tall("treeRound", 10, 9, 2, 2),
  tall("treeDark", 26, 9, 2, 2),
  tall("treeRound", 34, 14, 2, 2),
  tall("treeDark", 34, 19, 2, 2),
  tall("treeDead", 7, 16, 2, 2),
  tall("frog", 8, 34, 2, 2),
  tall("seated", 7, 21, 2, 3),
  tall("pillarBroken", 23, 35, 1, 3),
  tall("stone", 34, 27, 1, 3),
  tall("rock", 34, 33, 2, 2),
  tall("rock", 11, 7, 2, 2),
  tall("rock", 16, 7, 2, 2),
  tall("rockSmall", 35, 11, 1, 1),
  tall("post", 19, 22, 1, 2),
  tall("post", 23, 22, 1, 2),
  { parts: [part("bushes", 24, 42, 43, { frame: 1, fw: 16 })], blocked: [[24, 42]] },
  { parts: [part("bushes", 19, 38, 39, { frame: 3, fw: 16 })], blocked: [[19, 38]] },
  // the Needle Field: stakes where earlier visitors gave up
  { parts: [stake(16, 30, 3, 2), stake(16, 30, 10, 6)], blocked: [[16, 30]] },
  { parts: [stake(14, 30, 6, 3)], blocked: [[14, 30]] },
  { parts: [stake(13, 31, 2, 5), stake(13, 31, 9, 1)], blocked: [[13, 31]] },
  { parts: [stake(15, 34, 7, 2)], blocked: [[15, 34]] },
  { parts: [stake(19, 34, 4, 4), stake(19, 34, 11, 1)], blocked: [[19, 34]] },
  { parts: [stake(12, 33, 6, 3)], blocked: [[12, 33]] },
  // the garden fence
  {
    parts: [part("fenceEnd", 3, 10, 11), part("fenceMid", 4, 10, 11), part("fenceEndR", 5, 10, 11)],
    blocked: box(3, 10, 3, 1),
  },
];

/** Footprints on the north path, leading east to the standing stone. Art pixels. */
export const FOOTPRINTS: { sprite: SpriteName; x: number; y: number }[] = [27, 28, 29, 30, 31, 32].map((x, index) => ({
  sprite: index % 2 === 0 ? ("footA" as const) : ("footB" as const),
  x: px(x) + 4,
  y: px(10) + (index % 2 === 0 ? 3 : 8),
}));

// ----------------------------------------------------------------------------- queries

export function groundAt(x: number, y: number): string {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return "~";
  return GROUND[y][x];
}

export const isLand = (x: number, y: number) => groundAt(x, y) !== "~";
/** The dirt path. It runs on under the tide, so the spine is whole once the static is gone. */
export const isPath = (x: number, y: number) => groundAt(x, y) === "=" || (x === 21 && groundAt(x, y) === "t");

/** A stable pseudo-random number in [0, 1) for a tile, so decoration never moves. */
export function tileHash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const key = (x: number, y: number) => y * MAP_W + x;

/** Tiles that props, lamps and characters stand on. The tide is handled by the engine. */
export const BLOCKED: Set<number> = new Set();
for (const thing of THINGS) for (const [x, y] of thing.blocked) BLOCKED.add(key(x, y));
for (const decor of DECOR) for (const [x, y] of decor.blocked) BLOCKED.add(key(x, y));
for (const lamp of RUIN_LAMPS) BLOCKED.add(key(lamp.tile[0], lamp.tile[1]));
for (const [x, y] of CAUSEWAY_LAMPS) BLOCKED.add(key(x, y));

export const isBlocked = (x: number, y: number) => BLOCKED.has(key(x, y));
export const isTide = (x: number, y: number) => groundAt(x, y) === "t";

const RESERVED: Set<number> = new Set([key(SPAWN[0], SPAWN[1]), key(TITLE_BED[0], TITLE_BED[1])]);
for (const thing of THINGS) RESERVED.add(key(thing.use[0], thing.use[1]));

/** Tiles a sprite reaches over, though only its base blocks: nothing small should grow there and poke out. */
const COVERED: Set<number> = new Set();
{
  const cover = (x: number, y: number, w: number, h: number) => {
    for (let ty = Math.floor(y / TILE); ty <= Math.floor((y + h - 1) / TILE); ty += 1) {
      for (let tx = Math.floor(x / TILE); tx <= Math.floor((x + w - 1) / TILE); tx += 1) COVERED.add(key(tx, ty));
    }
  };
  const coverPart = (item: Part) => cover(item.x, item.y, item.fw ?? ATLAS[item.sprite][2], ATLAS[item.sprite][3]);
  for (const thing of THINGS) thing.parts.forEach(coverPart);
  for (const decor of DECOR) decor.parts.forEach(coverPart);
  for (const lamp of RUIN_LAMPS) cover(lamp.tile[0] * TILE, (lamp.tile[1] - 1) * TILE, TILE, TILE * 2);
  for (const [x, y] of CAUSEWAY_LAMPS) cover(x * TILE, (y - 1) * TILE, TILE, TILE * 2);
  // the suspects, and the bubbles over everything that has one
  for (const thing of THINGS) cover(thing.bubble[0] - 7, thing.bubble[1] - 14, 14, 14);
}

/** Plain grass with nothing on it, over it or standing on it: where decoration may go. */
export function isFreeGrass(x: number, y: number): boolean {
  return groundAt(x, y) === "." && !BLOCKED.has(key(x, y)) && !RESERVED.has(key(x, y)) && !COVERED.has(key(x, y));
}

export type Decal = { sprite: SpriteName; frame: number; x: number; y: number };

/** Flowers, sprigs and stepping stones, chosen by position hash. Baked into the ground. */
export const DECALS: Decal[] = [];
/** White flowers that sway: drawn each frame. */
export const PLANTS: Tile[] = [];
{
  let flowers = 0;
  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      if (!isFreeGrass(x, y)) continue;
      const roll = tileHash(x, y, 7);
      if (roll < 0.05) DECALS.push({ sprite: "details", frame: Math.floor(tileHash(x, y, 8) * 5), x: px(x), y: px(y) });
      else if (roll < 0.064) DECALS.push({ sprite: "details", frame: 5 + Math.floor(tileHash(x, y, 8) * 3), x: px(x), y: px(y) });
      else if (roll < 0.082 && flowers < 12) {
        flowers += 1;
        DECALS.push({ sprite: "flowers", frame: [0, 2, 3, 6, 1][Math.floor(tileHash(x, y, 9) * 5)], x: px(x), y: px(y) });
      } else if (roll < 0.094) DECALS.push({ sprite: "steps", frame: Math.floor(tileHash(x, y, 10) * 4), x: px(x), y: px(y) });
      else if (roll < 0.104 && PLANTS.length < 8) PLANTS.push([x, y]);
    }
  }
}
