/*
 * The island of "What I Cannot Create": a ring of land around a moat of
 * static, at night, drawn as 16 px tiles and seen from above.
 *
 * The engine only knows about walking, light and what is nearby. Puzzles, the
 * Notebook and every word live in the React shell, which hears from the
 * engine through WorldEvents, tells it what has been understood (setProgress)
 * and asks it to animate the moments in between (cue).
 *
 * A frame, all at art resolution and scaled up by a whole number:
 *   1. the sea of static
 *   2. the ground, baked once per colour grade
 *   3. props and characters, sorted by where they stand
 *   4. the same two layers in lantern colours, cut by a stepped light mask
 *   5. things that glow: flames, bubbles, the arrow, fireflies
 *   6. the tide and the fades
 */

import type { Synth } from "../shared/synth";
import { DOOR_NEEDS, SITES, STATUES, TOASTS, type SiteId } from "./content";
import { LIFT, STEP_MS, dirToward, drawFrame, drawShadow, makeWalker, placeWalker, walkRow, walkerPx } from "./engine/actors";
import { loadSheets, makeCanvas, type Sheets } from "./engine/assets";
import { ATLAS, DOOR_SOCKETS, type SpriteName } from "./engine/atlas";
import { ease, lookAt, makeView, overviewScale, playScale, type View } from "./engine/camera";
import { createCueQueue, type Job } from "./engine/cues";
import { createFireflies, createFx } from "./engine/fx";
import type { Grade } from "./engine/grade";
import { DIR_DX, DIR_DY, DIR_NAME, createInput, type Dir } from "./engine/input";
import { composeMask, type Light } from "./engine/light";
import { flood, nearest, route } from "./engine/path";
import { MAP_PX_H, MAP_PX_W, bakeGround, bakeShore } from "./engine/render";
import { SEA_BASE, createSea } from "./engine/sea";
import { AFTER_ENDING, CAUSEWAY_LAMPS, DECOR, MAP_H, MAP_W, PLANTS, RUIN_LAMPS, SPAWN, THINGS, TIDE_RECT, TILE, TITLE_BED, isBlocked, isLand, isTide, tileHash, type Part, type Thing, type Tile } from "./map";
import { createMusic, createSounds } from "./music";

export type StatueId = "prompter" | "bookkeeper" | "copyist" | "artist";
export type TargetId = SiteId | StatueId;
export type Near = { kind: "site"; id: SiteId; name: string } | { kind: "statue"; id: string; name: string } | null;
export type Scene = "title" | "play" | "ending";

export type Cue =
  | { type: "wake" } // robot stands up, "?" bubble, 900 ms
  | { type: "mote" } // a grain lifts off the slab and joins the robot, 1200 ms
  | { type: "tide" } // the static over the neck dissolves, 600 ms
  | { type: "pan"; to: TargetId | "player"; ms?: number } // default 1500 to a target, 800 back; camera stays until the next pan
  | { type: "lamp"; id: SiteId } // ruin lamp, next causeway lamp and door socket light, 900 ms
  | { type: "five" } // "!" over the door, path pulse, chime, 600 ms
  | { type: "face"; id: StatueId } // NPC and robot turn to each other, 0 ms
  | { type: "emote"; who: "you" | StatueId; mark: "!" | "?" | "..."; ms?: number } // default 700
  | { type: "petrify"; id: StatueId } // hop, flash, stone, 700 ms
  | { type: "doorOpen" } // shake, slab sinks, light, 1600 ms
  | { type: "walkThrough" } // Mote then robot go in and fade, 1500 ms
  | { type: "dawn" } // night to dawn in 8 steps, 2000 ms
  | { type: "overview" } // cut to the whole island, 0 ms
  | { type: "wait"; ms: number };

export type WorldEvents = {
  onNear(near: Near): void;
  onToast(text: string): void; // only TOASTS.sea, at most once per 6 s
  onInteract?(near: NonNullable<Near>): void; // a tap on an object arrived next to it
  onReady?(): void; // atlas decoded and graded
  onScale?(cssPxPerArtPx: number): void; // k / devicePixelRatio, on every resize
};

export type World = {
  setPaused(paused: boolean): void;
  setProgress(solved: SiteId[], questioned: string[], compass: boolean): void;
  setScene(scene: Scene): void;
  cue(cue: Cue): Promise<void>;
  finishCues(): void;
  dispose(): void;
  debug: { goto(id: string): void; state(): Record<string, number | string> };
};

// ----------------------------------------------------------------------------- constants

const GOLD = "#ffe18d";
const DAWN_STEPS = 8;
const TIDE_STEPS = 6;
const TIDE_BLOCK = 4;
const SEA_TOAST_GAP_MS = 6000;
const STATUE_IDS: readonly string[] = ["prompter", "bookkeeper", "copyist", "artist"];
const MARK_SPRITE: Record<"!" | "?" | "...", SpriteName> = { "!": "emoteBang", "?": "emoteAsk", "...": "emoteDots" };

const px = (tiles: number) => tiles * TILE;
const thingOf = (id: string) => THINGS.find((thing) => thing.id === id);
const DOOR = thingOf("door") as Thing;
const DOOR_PART = DOOR.parts.find((part) => part.tag === "door") as Part;
/** The face of the slab: the 6 x 7 panel the static shows through. */
const SLAB_FACE = { x: px(21) + 5, y: px(39) + 19, w: 6, h: 7 } as const;
const DOOR_GLOW: readonly [number, number] = [px(21) + 8, px(18) + 6];

const nameOf = (thing: Thing) =>
  (thing.kind === "site" ? SITES.find((site) => site.id === thing.id)?.name : STATUES.find((statue) => statue.id === thing.id)?.name) ?? thing.id;
const nearOf = (thing: Thing): NonNullable<Near> =>
  thing.kind === "site" ? { kind: "site", id: thing.id as SiteId, name: nameOf(thing) } : { kind: "statue", id: thing.id, name: nameOf(thing) };

/** Where a lamp's glass is, and where its light falls, for the lamp whose base is on a tile. */
const lampGlass = ([x, y]: Tile): [number, number] => [px(x) + 12, px(y - 1) + 18];
const lampLight = ([x, y]: Tile): [number, number] => [px(x) + 11, px(y) + 5];

/** How far each land tile is from the sea, in tiles, for the sound of the surf. */
const COAST: Int8Array = (() => {
  const dist = new Int8Array(MAP_W * MAP_H).fill(99);
  for (let pass = 0; pass < 6; pass += 1) {
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        const i = y * MAP_W + x;
        if (!isLand(x, y)) {
          dist[i] = 0;
          continue;
        }
        let best = dist[i];
        for (let d = 0; d < 4; d += 1) {
          const nx = x + DIR_DX[d];
          const ny = y + DIR_DY[d];
          const near = nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H ? 0 : dist[ny * MAP_W + nx];
          if (near + 1 < best) best = near + 1;
        }
        dist[i] = best;
      }
    }
  }
  return dist;
})();

/** In which of the six steps each 4 x 4 block of the tide dissolves. The rim goes first, so the edge is ragged. */
const TIDE_COLS = Math.ceil(TIDE_RECT.w / TIDE_BLOCK);
const TIDE_ROWS = Math.ceil(TIDE_RECT.h / TIDE_BLOCK);
const TIDE_ORDER: Uint8Array = (() => {
  const order = new Uint8Array(TIDE_COLS * TIDE_ROWS);
  for (let by = 0; by < TIDE_ROWS; by += 1) {
    for (let bx = 0; bx < TIDE_COLS; bx += 1) {
      // the rim lies outside the tide tiles (4 px above and below, the coast tiles left and right)
      const side = Math.min(bx, TIDE_COLS - 1 - bx);
      const rim = by === 0 || by === TIDE_ROWS - 1 || side === 0 ? 0.6 : side === 1 ? 0.3 : 0;
      // 0 is never drawn: most of the rim, so the static has no straight edge and does not bury whoever stands next to it
      order[by * TIDE_COLS + bx] = tileHash(bx, by, 77) < rim ? 0 : 1 + Math.floor(tileHash(bx, by, 78) * TIDE_STEPS);
    }
  }
  return order;
})();

type Ent = {
  /** Draw order: the y of the line the thing stands on. */
  foot: number;
  /** Bounds in art pixels, for culling. */
  x: number;
  y: number;
  w: number;
  h: number;
  draw(g: CanvasRenderingContext2D, grade: Grade): void;
};

// ----------------------------------------------------------------------------- the world

export function createWorld(canvas: HTMLCanvasElement, synth: Synth, events: WorldEvents): World {
  const maybe = canvas.getContext("2d", { alpha: false });
  if (!maybe) throw new Error("2D canvas is not available");
  const ctx: CanvasRenderingContext2D = maybe;
  canvas.style.imageRendering = "pixelated";
  canvas.style.touchAction = "none";
  canvas.style.display = "block";

  const reduceQuery = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  let reduced = reduceQuery?.matches ?? false;

  // --------------------------------------------------------------------------- state
  let disposed = false;
  let ready = false;
  let broken = false;
  let paused = true;
  let scene: Scene = "title";
  /** What is displayed as understood. Cues add to it when they end; setProgress replaces it. */
  let solved = new Set<SiteId>();
  let stone = new Set<string>();
  let compass = false;
  /** After the slab's lamp cue, Mote and the tide wait for their own cues instead of appearing with setProgress. */
  let awaitMote = false;
  let awaitTide = false;
  /** 0 is night, 8 is dawn. */
  let dawn = 0;
  let overview = false;
  /** The robot and Mote have gone through the door. */
  let gone = false;
  let lying = true;
  let clock = 0; // ms of animation time
  let fadeIn = -1; // ms into the opening fade, -1 when done
  let lastSeaToast = -SEA_TOAST_GAP_MS;

  const player = makeWalker(TITLE_BED[0], TITLE_BED[1], 0);
  const npcDir: Record<string, Dir> = { prompter: 0, bookkeeper: 0, copyist: 0, artist: 0 };
  let goal: { path: Tile[]; thing: Thing | null } | null = null;
  let near: Thing | null = null;
  let toldNear: string | null = null;

  /** Running cue animations, in ms since they began; -1 or null when idle. */
  const anim = {
    wake: -1,
    mote: -1,
    tide: -1,
    door: -1,
    walk: -1,
    five: -1,
    lamp: null as { id: SiteId; causeway: number; ms: number } | null,
    petrify: null as { id: string; ms: number } | null,
  };
  let emotes: { who: string; mark: "!" | "?" | "..." }[] = [];

  const cues = createCueQueue();
  const sea = createSea();
  const fx = createFx();
  const flies = createFireflies();
  const music = createMusic(synth);
  const sounds = createSounds(synth);

  const insights = () => {
    let count = 0;
    for (const id of solved) if (id !== "door") count += 1;
    return Math.min(DOOR_NEEDS, count);
  };
  const moteHere = () => !gone && (anim.mote >= 0 || (solved.has("shore") && !awaitMote));
  const tideStep = () => (anim.tide >= 0 ? Math.min(TIDE_STEPS, Math.floor(anim.tide / 100)) : solved.has("shore") && !awaitTide ? TIDE_STEPS : 0);
  const tideGone = () => anim.tide < 0 && solved.has("shore") && !awaitTide;
  const walkable = (x: number, y: number) => isLand(x, y) && !isBlocked(x, y) && (!isTide(x, y) || tideGone());
  const isSea = (x: number, y: number) => !isLand(x, y) || (isTide(x, y) && !tideGone());

  // --------------------------------------------------------------------------- view and camera
  const stage = canvas.parentElement;
  let dpr = window.devicePixelRatio || 1;
  let devW = 0;
  let devH = 0;
  let view: View = makeView(320, 200, 2, 1);
  let camX = 0;
  let camY = 0;
  /** Where a pan left the camera; null while it follows the robot. */
  let camFixed: [number, number] | null = null;
  let shakeX = 0;

  const [litCanvas, litCtx] = makeCanvas(1, 1);
  const [maskCanvas, maskCtx] = makeCanvas(1, 1);
  const [bandCanvas, bandCtx] = makeCanvas(1, 1);
  const [scratchCanvas, scratchCtx] = makeCanvas(1, 1);
  const [tideCanvas, tideCtx] = makeCanvas(TIDE_RECT.w, TIDE_RECT.h);

  function measure() {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    devW = Math.round(rect.width * dpr);
    devH = Math.round(rect.height * dpr);
  }

  function applyView() {
    if (!(devW > 0 && devH > 0)) return;
    const base = playScale(devW, devH);
    const next = makeView(devW, devH, overview ? overviewScale(devW, devH) : base, dpr);
    view = next;
    if (canvas.width !== next.w) canvas.width = next.w;
    if (canvas.height !== next.h) canvas.height = next.h;
    canvas.style.width = `${(next.w * next.k) / dpr}px`;
    canvas.style.height = `${(next.h * next.k) / dpr}px`;
    for (const buffer of [litCanvas, maskCanvas, bandCanvas, scratchCanvas]) {
      if (buffer.width !== next.w) buffer.width = next.w;
      if (buffer.height !== next.h) buffer.height = next.h;
    }
    for (const context of [ctx, litCtx, maskCtx, bandCtx, scratchCtx]) context.imageSmoothingEnabled = false;
    // the interface borrows the size of an art pixel in play; the overview is a shot, not a new scale
    events.onScale?.(base / dpr);
  }

  /** The robot's tile corner in art pixels, wherever a cue has it. */
  function playerPx(): [number, number] {
    const [x, y] = walkerPx(player);
    if (anim.walk >= 0) return [x, y - Math.round(Math.min(1, Math.max(0, (anim.walk - 300) / 600)) * 2 * TILE)];
    return [x, y];
  }

  function followCam(): [number, number] {
    if (overview) return [Math.round(MAP_PX_W / 2 - view.w / 2), Math.round(MAP_PX_H / 2 - view.h / 2)];
    if (scene === "title") return lookAt(view, px(TITLE_BED[0]) + TILE, px(TITLE_BED[1]) + 6, 0.6);
    const [x, y] = walkerPx(player);
    return lookAt(view, x + 8, y + 8);
  }

  function placeCamera() {
    [camX, camY] = camFixed && !overview && scene !== "title" ? camFixed : followCam();
  }

  // --------------------------------------------------------------------------- what is nearby
  function findNear(): Thing | null {
    if (player.t < 1 && goal) return null; // walking a route: nothing is offered on the way
    let first: Thing | null = null;
    for (const thing of THINGS) {
      let beside = false;
      let faced = false;
      for (const [x, y] of thing.touch) {
        if (Math.abs(x - player.x) + Math.abs(y - player.y) !== 1) continue;
        beside = true;
        if (x === player.x + DIR_DX[player.dir] && y === player.y + DIR_DY[player.dir]) faced = true;
      }
      if (faced) return thing;
      if (beside && !first) first = thing;
    }
    return first;
  }

  function tellNear(force = false) {
    near = scene === "play" && !gone ? findNear() : null;
    if (!force && (paused || scene !== "play")) return;
    const id = near ? near.id : null;
    if (!force && id === toldNear) return;
    toldNear = id;
    events.onNear(near ? nearOf(near) : null);
  }

  // --------------------------------------------------------------------------- walking
  function seaToast() {
    if (clock - lastSeaToast < SEA_TOAST_GAP_MS) return;
    lastSeaToast = clock;
    events.onToast(TOASTS.sea);
  }

  function arrive() {
    music.setCoast(1 - Math.min(6, COAST[player.y * MAP_W + player.x]) / 6);
    if (!goal) return;
    if (goal.path.length && goal.path[0][0] === player.x && goal.path[0][1] === player.y) goal.path.shift();
    if (goal.path.length) return;
    const thing = goal.thing;
    goal = null;
    if (thing && player.x === thing.use[0] && player.y === thing.use[1]) player.dir = 1;
    else if (!thing) tellNear(); // the route ended beside something: offer it
    if (thing && !paused) {
      tellNear();
      events.onInteract?.(nearOf(thing));
    }
  }

  /** While a window is open nothing new begins, but a step already taken is finished: nobody freezes mid-stride. */
  function settle(dtMs: number) {
    if (player.t >= 1) return;
    player.t += dtMs / STEP_MS;
    player.walked += dtMs;
    if (player.t >= 1) {
      player.t = 1;
      player.walked = 0;
      arrive();
    }
  }

  /** Which way the robot should step next, and whether the player (not a route) is asking. */
  function wanted(now: number): [Dir | null, boolean] {
    const key = input.keyDir();
    if (key !== null) {
      goal = null;
      return [key, true];
    }
    const held = input.held(now);
    if (held) {
      goal = null;
      const [x, y] = walkerPx(player);
      const perArt = view.k / dpr;
      const dx = held.x / perArt + camX - (x + 8);
      const dy = held.y / perArt + camY - (y + 6);
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return [null, true];
      return [Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 2 : 3) : dy < 0 ? 1 : 0, true];
    }
    if (goal && goal.path.length) {
      const [nx, ny] = goal.path[0];
      const dir = dirToward(player.x, player.y, nx, ny);
      if (dir !== null && Math.abs(nx - player.x) + Math.abs(ny - player.y) === 1) return [dir, false];
      goal = null;
    }
    return [null, false];
  }

  function updatePlayer(dtMs: number, now: number) {
    let budget = dtMs;
    for (let guard = 0; guard < 6; guard += 1) {
      if (player.t < 1) {
        const need = (1 - player.t) * STEP_MS;
        if (budget < need) {
          // never reaches 1 here, whatever the rounding: a step ends only below, where arriving is handled
          player.t = Math.min(0.9999, player.t + budget / STEP_MS);
          player.walked += budget;
          return;
        }
        budget -= need;
        player.walked += need;
        player.t = 1;
        arrive();
        if (paused) return; // arriving opened a window
      }
      const [dir, byHand] = wanted(now);
      if (dir === null) break;
      const turned = dir !== player.dir;
      player.dir = dir;
      const nx = player.x + DIR_DX[dir];
      const ny = player.y + DIR_DY[dir];
      if (!walkable(nx, ny)) {
        if (byHand && isSea(nx, ny)) seaToast();
        goal = null;
        if (turned) tellNear();
        break;
      }
      player.fromX = player.x;
      player.fromY = player.y;
      player.x = nx;
      player.y = ny;
      player.t = 0;
      lying = false;
      camFixed = null;
      for (const id of STATUE_IDS) if (!stone.has(id)) npcDir[id] = 0;
      sounds.step();
      tellNear();
    }
    if (player.t >= 1) player.walked = 0;
  }

  function onTap(cssX: number, cssY: number) {
    if (paused || scene !== "play" || gone) return;
    const perArt = view.k / dpr;
    const ax = Math.floor(cssX / perArt) + camX;
    const ay = Math.floor(cssY / perArt) + camY;
    const least = 48 / perArt;
    let hit: Thing | null = null;
    let best = Infinity;
    for (const thing of THINGS) {
      const box = thing.hit;
      const gx = Math.max(0, (least - box.w) / 2);
      const gy = Math.max(0, (least - box.h) / 2);
      if (ax < box.x - gx || ax >= box.x + box.w + gx || ay < box.y - gy || ay >= box.y + box.h + gy) continue;
      const d = (ax - box.x - box.w / 2) ** 2 + (ay - box.y - box.h / 2) ** 2;
      if (d < best) {
        best = d;
        hit = thing;
      }
    }
    const reach = flood([player.x, player.y], walkable);
    let target: Tile = [Math.floor(ax / TILE), Math.floor(ay / TILE)];
    if (hit) {
      if (player.t >= 1 && player.x === hit.use[0] && player.y === hit.use[1]) {
        goal = null;
        player.dir = 1;
        tellNear();
        events.onInteract?.(nearOf(hit));
        return;
      }
      target = hit.use;
    } else if (isSea(target[0], target[1])) seaToast();
    let to: Tile | null = target;
    if (target[0] < 0 || target[1] < 0 || target[0] >= MAP_W || target[1] >= MAP_H || reach.dist[target[1] * MAP_W + target[0]] < 0) to = nearest(reach, target);
    if (!to) return;
    const path = route(reach, to);
    const arrives = hit !== null && to[0] === hit.use[0] && to[1] === hit.use[1];
    goal = path.length ? { path, thing: arrives ? hit : null } : null;
  }

  const input = createInput(canvas, {
    paused: () => paused || scene !== "play",
    onTap,
    onGesture: () => synth.unlock(),
  });

  // --------------------------------------------------------------------------- things to draw
  let sheets: Sheets | null = null;
  let ground: { night: HTMLCanvasElement; lit: HTMLCanvasElement; dawn: HTMLCanvasElement } | null = null;
  let shore: HTMLCanvasElement | null = null;

  const sheetFor = (grade: Grade) => (sheets as Sheets)[grade];
  const groundFor = (grade: Grade) => (grade === "lit" ? ground?.lit : grade === "dawn" ? ground?.dawn : ground?.night) as HTMLCanvasElement;

  function sprite(g: CanvasRenderingContext2D, sheet: HTMLCanvasElement, name: SpriteName, x: number, y: number, frame = 0, fw = 0) {
    const [ax, ay, w, h] = ATLAS[name];
    const width = fw || w;
    g.drawImage(sheet, ax + frame * width, ay, width, h, x - camX, y - camY, width, h);
  }

  const doorIsOpen = () => solved.has("door") && anim.door < 0;
  const lampIsLit = (index: number, id: SiteId | null) => {
    if (overview) return true;
    if (id) return solved.has(id) && !(anim.lamp && anim.lamp.id === id && anim.lamp.ms < 120);
    const lit = insights();
    if (anim.lamp && anim.lamp.causeway === index) return anim.lamp.ms >= 300;
    return index < lit;
  };

  const ents: Ent[] = [];

  function partEnt(part: Part): Ent {
    const [, , w, h] = ATLAS[part.sprite];
    const width = part.fw ?? w;
    const ent: Ent = { foot: part.foot, x: part.x, y: part.y, w: width, h, draw: () => undefined };
    if (part.tag === "sprout") {
      const phase = (part.frame ?? 0) * 170;
      ent.draw = (g, grade) => sprite(g, sheetFor(grade), !reduced && Math.floor((clock + phase) / 600) % 2 === 1 ? "sprout1" : "sprout0", part.x, part.y);
    } else if (part.tag === "tower") {
      ent.draw = (g, grade) => {
        sprite(g, sheetFor(grade), part.sprite, part.x, part.y);
        sprite(g, sheetFor(grade), solved.has("clock") ? "clock1" : "clock0", part.x + 11, part.y + 5);
      };
    } else if (part.tag === "door") {
      ent.draw = (g, grade) => {
        const [ax, ay, dw, dh] = ATLAS.doorClosed;
        if (doorIsOpen()) {
          sprite(g, sheetFor("raw"), "doorOpen", part.x, part.y);
          return;
        }
        const slide = anim.door < 0 ? 0 : Math.round(Math.min(1, Math.max(0, (anim.door - 400) / 600)) * 24);
        if (slide > 0) {
          sprite(g, sheetFor("raw"), "doorOpen", part.x, part.y);
          // the slab sinks inside its own rect: its top rows, drawn lower
          g.drawImage(sheetFor(grade), ax, ay, dw, dh - slide, part.x - camX, part.y + slide - camY, dw, dh - slide);
        } else sprite(g, sheetFor(grade), "doorClosed", part.x, part.y);
      };
    } else {
      ent.draw = (g, grade) => sprite(g, sheetFor(grade), part.sprite, part.x, part.y, part.frame ?? 0, part.fw ?? 0);
    }
    return ent;
  }

  for (const thing of THINGS) for (const part of thing.parts) ents.push(partEnt(part));
  for (const decor of DECOR) for (const part of decor.parts) ents.push(partEnt(part));
  for (const [x, y] of PLANTS) {
    const phase = Math.floor(tileHash(x, y, 5) * 4);
    ents.push({
      foot: px(y) + 2,
      x: px(x),
      y: px(y),
      w: TILE,
      h: TILE,
      draw: (g, grade) => sprite(g, sheetFor(grade), "plant", px(x), px(y), reduced ? 0 : (Math.floor(clock / 250) + phase) % 4, TILE),
    });
  }
  const lampEnt = (tile: Tile, index: number, id: SiteId | null): Ent => ({
    foot: px(tile[1] + 1),
    x: px(tile[0]),
    y: px(tile[1] - 1),
    w: TILE,
    h: TILE * 2,
    draw: (g, grade) => sprite(g, sheetFor(grade), lampIsLit(index, id) ? "lamp" : "lampOff", px(tile[0]), px(tile[1] - 1)),
  });
  for (const lamp of RUIN_LAMPS) ents.push(lampEnt(lamp.tile, -1, lamp.id));
  CAUSEWAY_LAMPS.forEach((tile, index) => ents.push(lampEnt(tile, index, null)));

  // the four suspects
  for (const thing of THINGS) {
    const stand = thing.stand;
    if (!stand) continue;
    const id = thing.id;
    const phase = Math.floor(tileHash(stand[0], stand[1], 3) * 560);
    ents.push({
      foot: px(stand[1] + 1),
      x: px(stand[0]),
      y: px(stand[1]) - LIFT - 4,
      w: TILE,
      h: TILE + 4,
      draw: (g, grade) => {
        const turning = anim.petrify && anim.petrify.id === id ? anim.petrify.ms : -1;
        const isStone = stone.has(id) && turning < 0 ? true : turning >= 520;
        const x = px(stand[0]) - camX;
        let y = px(stand[1]) - camY;
        drawShadow(g, sheetFor(grade), x, y);
        if (turning >= 250 && turning < 450) y -= Math.round(Math.sin(((turning - 250) / 200) * Math.PI) * 4);
        else if (!isStone && turning < 0 && !reduced) y -= Math.floor((clock + phase) / 560) % 2;
        const flash = turning >= 450 && turning < 520;
        drawFrame(g, sheetFor(flash ? "flash" : grade), (isStone ? `${id}Stone` : id) as SpriteName, npcDir[id] ?? 0, 0, x, y);
      },
    });
  }

  // the robot
  const playerEnt: Ent = {
    foot: 0,
    x: 0,
    y: 0,
    w: TILE,
    h: TILE + LIFT,
    draw: (g, grade) => {
      if (gone) return;
      const [x, y] = playerPx();
      let alpha = 1;
      let col: number = player.dir;
      let row = walkRow(player);
      if (anim.walk >= 0) {
        col = 1;
        row = anim.walk >= 300 && anim.walk < 900 ? Math.floor((anim.walk - 300) / 125) % 4 : 0;
        alpha = anim.walk < 900 ? 1 : Math.max(0, 1 - (1 + Math.floor((anim.walk - 900) / 100)) / 4);
      } else if (anim.wake >= 0 ? anim.wake < 300 : lying) {
        col = 0;
        row = 6;
      } else if ((anim.wake >= 300 && anim.wake < 600) || (anim.mote >= 250 && anim.mote < 1000)) {
        col = 1;
        row = 6;
      }
      if (alpha <= 0) return;
      g.globalAlpha = alpha;
      if (row !== 6 || col !== 0) drawShadow(g, sheetFor(grade), x - camX, y - camY);
      drawFrame(g, sheetFor(grade), "you", col, row, x - camX, y - camY);
      g.globalAlpha = 1;
    },
  };
  ents.push(playerEnt);

  /** Where Mote is: at the robot's shoulder, or on its way there or through the door. */
  function motePx(): [number, number, number] {
    const [x, y] = playerPx();
    const side = player.dir === 2 ? -4 : 15;
    const bob = reduced ? 1 : Math.round(1 + Math.sin((clock / 1000) * 1.2 * Math.PI * 2));
    let mx = x + side;
    let my = y - 7 + bob;
    let alpha = 1;
    if (anim.mote >= 0) {
      // off the slab's face, up, then across to the shoulder
      const sx = SLAB_FACE.x + 3;
      const sy = SLAB_FACE.y + 3;
      const rise = Math.min(1, anim.mote / 300);
      const drift = ease((anim.mote - 300) / 600);
      mx = Math.round(sx + (mx - sx) * drift);
      my = Math.round(sy - 10 * rise + (my - (sy - 10)) * drift);
    } else if (anim.walk >= 0) {
      const lead = ease(anim.walk / 500);
      mx = Math.round(mx + (px(21) + 6 - mx) * lead);
      my = Math.round(my + (px(17) + 4 - my) * lead);
      alpha = anim.walk < 500 ? 1 : Math.max(0, 1 - (1 + Math.floor((anim.walk - 500) / 75)) / 4);
    }
    return [mx - 2, my - 2, alpha];
  }
  const moteEnt: Ent = {
    foot: 0,
    x: 0,
    y: 0,
    w: 5,
    h: 5,
    draw: (g) => {
      if (!moteHere()) return;
      const [x, y, alpha] = motePx();
      if (alpha <= 0) return;
      g.globalAlpha = alpha;
      sprite(g, sheetFor("raw"), !reduced && Math.floor(clock / 167) % 2 === 1 ? "mote1" : "mote0", x, y);
      g.globalAlpha = 1;
    },
  };
  ents.push(moteEnt);

  // --------------------------------------------------------------------------- light
  const lights: Light[] = [];

  function collectLights() {
    lights.length = 0;
    if (dawn >= DAWN_STEPS || overview) return;
    const cap = 4 - Math.ceil(dawn / 2);
    const add = (x: number, y: number, r: number, bands = 4) => {
      const reach = Math.min(cap, bands);
      if (reach > 0) lights.push({ x, y, r, bands: reach });
    };
    const opening = (ms: number) => Math.min(4, 1 + Math.floor(ms / 150));
    if (!solved.has("shore") || (anim.lamp && anim.lamp.id === "shore" && anim.lamp.ms < 150)) add(SLAB_FACE.x + 3, SLAB_FACE.y + 6, 26);
    for (const lamp of RUIN_LAMPS) {
      if (!solved.has(lamp.id)) continue;
      const [x, y] = lampLight(lamp.tile);
      add(x, y, 40, anim.lamp && anim.lamp.id === lamp.id ? (anim.lamp.ms < 120 ? 0 : opening(anim.lamp.ms - 120)) : 4);
    }
    const count = insights();
    const pulse = anim.five >= 150 && anim.five < 450 ? 6 : 0;
    CAUSEWAY_LAMPS.forEach((tile, index) => {
      const running = anim.lamp && anim.lamp.causeway === index ? anim.lamp.ms : -1;
      if (running < 0 ? index >= count : running < 300) return;
      const [x, y] = lampLight(tile);
      add(x, y, 32 + pulse, running < 0 ? 4 : opening(running - 300));
    });
    if (solved.has("door") || anim.door >= 1000) add(DOOR_GLOW[0], DOOR_GLOW[1], 72, anim.door >= 0 ? opening(anim.door - 1000) : 4);
    if (moteHere()) {
      const [mx, my, alpha] = motePx();
      const flicker = reduced ? 54 : 52 + 2 * (Math.floor(clock / 143) % 3);
      if (anim.mote >= 0) {
        if (anim.mote >= 600) add(mx + 2, my + 8, flicker, opening(anim.mote - 600));
      } else if (anim.walk >= 0) {
        add(mx + 2, my + 8, flicker, Math.round(alpha * 4));
      } else {
        const [x, y] = playerPx();
        add(x + 8, y + 6, flicker);
      }
    }
    if (cap >= 2) flies.lights(lights, clock / 1000, reduced);
  }

  // --------------------------------------------------------------------------- drawing
  function visible(ent: Ent) {
    return ent.x + ent.w > camX && ent.x < camX + view.w && ent.y + ent.h > camY && ent.y < camY + view.h;
  }

  function scenePass(g: CanvasRenderingContext2D, grade: Grade) {
    g.drawImage(groundFor(grade), -camX, -camY);
    for (const ent of ents) if (visible(ent)) ent.draw(g, grade);
  }

  function bubble(mark: "!" | "?" | "...", x: number, y: number, phase: number) {
    const bob = reduced ? 0 : Math.floor((clock + phase) / 250) % 2;
    sprite(ctx, sheetFor("raw"), MARK_SPRITE[mark], x - 7, y - 13 - bob);
  }

  function drawGlow() {
    const raw = sheetFor("raw");
    const night = dawn < DAWN_STEPS;

    // the slab's face: static until it is understood, then a small cyan cat
    if (solved.has("shore")) sprite(ctx, raw, "slabFace", SLAB_FACE.x, SLAB_FACE.y);
    else sea.surf(ctx, SLAB_FACE.x - camX, SLAB_FACE.y - camY, SLAB_FACE.w, SLAB_FACE.h);

    // lamps that are lit, and the sockets on the door
    const flicker = reduced ? 0 : Math.floor(clock / 125);
    RUIN_LAMPS.forEach((lamp, index) => {
      if (!lampIsLit(-1, lamp.id)) return;
      const [x, y] = lampGlass(lamp.tile);
      sprite(ctx, raw, (flicker + index * 3) % 5 === 0 ? "glow1" : "glow0", x - 3, y - 3);
    });
    CAUSEWAY_LAMPS.forEach((tile, index) => {
      if (!lampIsLit(index, null)) return;
      const [x, y] = lampGlass(tile);
      sprite(ctx, raw, (flicker + index * 2 + 1) % 5 === 0 ? "glow1" : "glow0", x - 3, y - 3);
    });
    if (!solved.has("door") && anim.door < 400) {
      let lit = overview ? DOOR_NEEDS : insights();
      if (anim.lamp && anim.lamp.causeway >= 0 && anim.lamp.ms < 300) lit = Math.min(lit, anim.lamp.causeway);
      ctx.fillStyle = GOLD;
      for (let n = 0; n < lit && n < DOOR_SOCKETS.length; n += 1) {
        ctx.fillRect(DOOR_PART.x + DOOR_SOCKETS[n][0] - camX, DOOR_PART.y + DOOR_SOCKETS[n][1] - camY, 2, 2);
      }
    }

    if (night && !overview) flies.draw(ctx, camX, camY, clock / 1000, reduced);
    fx.draw(ctx, raw, camX, camY);

    // bubbles: what still has something to say
    if (scene !== "ending" && !overview) {
      THINGS.forEach((thing, index) => {
        const said = emotes.find((emote) => emote.who === thing.id);
        const turning = anim.petrify && anim.petrify.id === thing.id ? anim.petrify.ms : -1;
        let mark: "!" | "?" | "..." | null = null;
        if (said) mark = said.mark;
        else if (turning >= 0) mark = turning < 450 ? "!" : null;
        else if (thing.kind === "statue") mark = stone.has(thing.id) ? null : "...";
        else if (thing.id === "door") mark = solved.has("door") ? null : anim.five >= 0 || insights() >= DOOR_NEEDS ? "!" : "?";
        else mark = solved.has(thing.id as SiteId) ? null : "?";
        if (mark) bubble(mark, thing.bubble[0], thing.bubble[1], index * 90);
      });
      const mine = emotes.find((emote) => emote.who === "you");
      const [x, y] = playerPx();
      if (!gone && (mine || (anim.wake >= 600 && anim.wake < 900))) bubble(mine ? mine.mark : "?", x + 8, y - LIFT - 1, 0);

      // the arrow at the robot's feet: the field, read from where it stands
      if (compass && scene === "play" && !gone && !paused) {
        const target = compassTarget();
        if (target && target !== near) {
          const angle = Math.atan2(target.focus[1] - (y + 8), target.focus[0] - (x + 8));
          const way = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
          const ax = x + 8 + Math.round(Math.cos((way * Math.PI) / 4) * 12);
          const ay = y + 11 + Math.round(Math.sin((way * Math.PI) / 4) * 12);
          sprite(ctx, raw, "arrows", ax - 3, ay - 3, way, 7);
        }
      }
      // where a tap is taking the robot
      if (goal && goal.path.length && !goal.thing) {
        const [tx, ty] = goal.path[goal.path.length - 1];
        sprite(ctx, raw, "bracket", px(tx), px(ty), reduced ? 0 : Math.floor(clock / 167) % 2, TILE);
      }
    }
  }

  function compassTarget(): Thing | null {
    if (insights() >= DOOR_NEEDS && !solved.has("door")) return DOOR;
    let best: Thing | null = null;
    let least = Infinity;
    for (const thing of THINGS) {
      if (thing.kind !== "site" || thing.id === "door" || solved.has(thing.id as SiteId)) continue;
      const d = (thing.use[0] - player.x) ** 2 + (thing.use[1] - player.y) ** 2;
      if (d < least) {
        least = d;
        best = thing;
      }
    }
    return best;
  }

  function drawTide() {
    const step = tideStep();
    if (step >= TIDE_STEPS) return;
    const x = TIDE_RECT.x - camX;
    const y = TIDE_RECT.y - camY;
    if (x >= view.w || y >= view.h || x + TIDE_RECT.w <= 0 || y + TIDE_RECT.h <= 0) return;
    tideCtx.clearRect(0, 0, TIDE_RECT.w, TIDE_RECT.h);
    sea.surf(tideCtx, 0, 0, TIDE_RECT.w, TIDE_RECT.h);
    for (let by = 0; by < TIDE_ROWS; by += 1) {
      for (let bx = 0; bx < TIDE_COLS; bx += 1) {
        if (TIDE_ORDER[by * TIDE_COLS + bx] <= step) tideCtx.clearRect(bx * TIDE_BLOCK, by * TIDE_BLOCK, TIDE_BLOCK, TIDE_BLOCK);
      }
    }
    ctx.drawImage(tideCanvas, x, y);
  }

  function draw() {
    if (disposed) return;
    placeCamera();
    camX += shakeX;
    const { w, h } = view;
    const day = dawn / DAWN_STEPS;
    sea.draw(ctx, scratchCtx, w, h, camX, camY, shore, day);
    if (sheets && ground) {
      order();
      if (dawn < DAWN_STEPS) scenePass(ctx, "night");
      if (dawn > 0) {
        if (dawn >= DAWN_STEPS) scenePass(ctx, "dawn");
        else {
          litCtx.clearRect(0, 0, w, h);
          scenePass(litCtx, "dawn");
          ctx.globalAlpha = day;
          ctx.drawImage(litCanvas, 0, 0);
          ctx.globalAlpha = 1;
        }
      }
      collectLights();
      if (lights.length) {
        composeMask(maskCtx, bandCtx, lights, w, h, camX, camY);
        litCtx.globalCompositeOperation = "source-over";
        litCtx.clearRect(0, 0, w, h);
        scenePass(litCtx, "lit");
        litCtx.globalCompositeOperation = "destination-in";
        litCtx.drawImage(maskCanvas, 0, 0);
        litCtx.globalCompositeOperation = "source-over";
        ctx.drawImage(litCanvas, 0, 0);
      }
      drawTide();
      drawGlow();
    }
    if (fadeIn >= 0) {
      // the opening: out of the dark in four flat steps
      ctx.globalAlpha = 1 - Math.floor(fadeIn / 225) / 4;
      ctx.fillStyle = SEA_BASE;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    camX -= shakeX;
  }

  // --------------------------------------------------------------------------- cues
  const rest = (dur: number): Job => ({ dur, end: () => undefined });

  function jobFor(cue: Cue): Job {
    switch (cue.type) {
      case "wake":
        return {
          dur: 900,
          begin: () => {
            anim.wake = 0;
            sounds.wake();
          },
          step: (ms) => {
            anim.wake = ms;
          },
          end: () => {
            anim.wake = -1;
            lying = false;
          },
        };
      case "mote":
        return {
          dur: 1200,
          begin: () => {
            awaitMote = false;
            anim.mote = 0;
            sounds.mote();
          },
          step: (ms) => {
            anim.mote = ms;
          },
          end: () => {
            awaitMote = false;
            anim.mote = -1;
          },
        };
      case "tide":
        return {
          dur: 600,
          begin: () => {
            anim.tide = 0;
            sounds.tide();
          },
          step: (ms) => {
            anim.tide = ms;
          },
          end: () => {
            awaitTide = false;
            anim.tide = -1;
          },
        };
      case "pan": {
        const thing = cue.to === "player" ? null : thingOf(cue.to);
        let from: [number, number] = [0, 0];
        const target = (): [number, number] => {
          if (!thing) {
            const [x, y] = walkerPx(player);
            return lookAt(view, x + 8, y + 8);
          }
          return lookAt(view, thing.focus[0], thing.focus[1]);
        };
        const dur = cue.ms ?? (thing ? 1500 : 800);
        return {
          dur,
          begin: () => {
            from = [camX, camY];
            camFixed = from;
          },
          step: (ms) => {
            const to = target();
            const t = ease(ms / dur);
            camFixed = [Math.round(from[0] + (to[0] - from[0]) * t), Math.round(from[1] + (to[1] - from[1]) * t)];
          },
          end: () => {
            camFixed = thing ? target() : null;
          },
        };
      }
      case "lamp": {
        const id = cue.id;
        return {
          dur: 900,
          begin: () => {
            const fresh = !solved.has(id);
            solved.add(id);
            const count = insights();
            anim.lamp = { id, causeway: fresh && id !== "door" ? count - 1 : -1, ms: 0 };
            if (id === "shore" && fresh) {
              awaitMote = true;
              awaitTide = true;
            }
            const lamp = RUIN_LAMPS.find((entry) => entry.id === id);
            if (lamp) {
              const [x, y] = lampGlass(lamp.tile);
              fx.spawn("ring", x, y, 32, 12);
              fx.spawn("fire", x, y - 5, 12, 10, 2);
            }
            sounds.lamp();
            music.setInsights(count);
          },
          step: (ms) => {
            if (!anim.lamp) return;
            if (anim.lamp.ms < 300 && ms >= 300 && anim.lamp.causeway >= 0) {
              const [x, y] = lampGlass(CAUSEWAY_LAMPS[anim.lamp.causeway]);
              fx.spawn("spark", x, y, 10, 14);
            }
            anim.lamp.ms = ms;
          },
          end: () => {
            if (id === "shore" && !solved.has(id) && !anim.lamp) {
              awaitMote = true;
              awaitTide = true;
            }
            solved.add(id);
            anim.lamp = null;
            music.setInsights(insights());
          },
        };
      }
      case "five":
        return {
          dur: 600,
          begin: () => {
            anim.five = 0;
            sounds.five();
          },
          step: (ms) => {
            anim.five = ms;
          },
          end: () => {
            anim.five = -1;
          },
        };
      case "face": {
        const thing = thingOf(cue.id);
        const turn = () => {
          if (!thing || !thing.stand) return;
          const toNpc = dirToward(player.x, player.y, thing.stand[0], thing.stand[1]);
          const toYou = dirToward(thing.stand[0], thing.stand[1], player.x, player.y);
          if (toNpc !== null && player.t >= 1) player.dir = toNpc;
          if (toYou !== null && !stone.has(cue.id)) npcDir[cue.id] = toYou;
        };
        return { dur: 0, end: turn };
      }
      case "emote": {
        const entry = { who: cue.who, mark: cue.mark };
        return {
          dur: cue.ms ?? 700,
          begin: () => {
            emotes.push(entry);
          },
          end: () => {
            emotes = emotes.filter((emote) => emote !== entry);
          },
        };
      }
      case "petrify": {
        const id = cue.id;
        let struck = false;
        return {
          dur: 700,
          begin: () => {
            anim.petrify = { id, ms: 0 };
            if (reduced) sounds.petrify();
          },
          step: (ms) => {
            if (anim.petrify) anim.petrify.ms = ms;
            if (ms >= 450 && !struck) {
              struck = true;
              sounds.petrify();
              const stand = thingOf(id)?.stand;
              if (stand) fx.spawn("spark", px(stand[0]) + 8, px(stand[1]) - 2, 10, 14);
            }
          },
          end: () => {
            stone.add(id);
            anim.petrify = null;
          },
        };
      }
      case "doorOpen":
        return {
          dur: 1600,
          begin: () => {
            anim.door = 0;
            sounds.door();
          },
          step: (ms) => {
            anim.door = ms;
            shakeX = ms < 400 && !reduced ? (Math.floor(ms / 50) % 2 === 0 ? 2 : -2) : 0;
          },
          end: () => {
            solved.add("door");
            anim.door = -1;
            shakeX = 0;
          },
        };
      case "walkThrough":
        return {
          dur: 1500,
          begin: () => {
            goal = null;
            lying = false;
            camFixed = null;
            placeWalker(player, DOOR.use[0], DOOR.use[1], 1);
            anim.walk = 0;
            music.setMode("sea");
          },
          step: (ms) => {
            anim.walk = ms;
          },
          end: () => {
            anim.walk = -1;
            gone = true;
            placeWalker(player, DOOR.use[0], DOOR.use[1], 1);
            music.setMode("sea");
          },
        };
      case "dawn":
        return {
          dur: 2000,
          step: (ms) => {
            dawn = Math.max(dawn, Math.min(DAWN_STEPS, 1 + Math.floor(ms / 250)));
          },
          end: () => {
            dawn = DAWN_STEPS;
          },
        };
      case "overview":
        return {
          dur: 0,
          end: () => {
            overview = true;
            camFixed = null;
            fx.clear();
            applyView();
            music.setMode("full");
          },
        };
      case "wait":
        return rest(Math.max(0, cue.ms));
    }
  }

  // --------------------------------------------------------------------------- loop
  let frame = 0;
  let running = false;
  let last = 0;
  let cost = 0;
  let slow = 0;

  function tick(now: number) {
    if (disposed || !running) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min(50, Math.max(0, now - last));
    last = now;
    const began = performance.now();
    clock += dt;
    sea.update(dt / 1000, reduced);
    fx.update(dt / 1000);
    if (fadeIn >= 0) {
      fadeIn += dt;
      if (fadeIn >= 900 || reduced) fadeIn = -1;
    }
    if (ready || broken) cues.update(dt);
    if (scene === "play" && !gone) {
      if (paused) settle(dt);
      else updatePlayer(dt, now);
    }
    draw();
    const spent = performance.now() - began;
    cost += (spent - cost) * 0.05;
    if (spent > slow) slow = spent;
  }

  function start() {
    if (running || disposed || document.hidden) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frame);
  }
  function onVisibility() {
    if (document.hidden) {
      stop();
      input.drop();
    } else start();
  }
  function onMotion() {
    reduced = reduceQuery?.matches ?? false;
  }

  const observer = new ResizeObserver((entries) => {
    if (disposed) return;
    const entry = entries[entries.length - 1];
    const box = entry?.devicePixelContentBoxSize?.[0];
    measure();
    // the exact device size where the browser knows it; emulated ratios report CSS pixels here, so it must agree with the layout
    if (box && Math.abs(box.inlineSize - devW) < 2 && Math.abs(box.blockSize - devH) < 2) {
      devW = box.inlineSize;
      devH = box.blockSize;
    }
    applyView();
    draw();
  });
  if (stage) {
    try {
      observer.observe(stage, { box: "device-pixel-content-box" });
    } catch {
      observer.observe(stage);
    }
  }
  document.addEventListener("visibilitychange", onVisibility);
  reduceQuery?.addEventListener("change", onMotion);

  const cancelLoad = loadSheets(
    (loaded) => {
      if (disposed) return;
      sheets = loaded;
      ground = { night: bakeGround(loaded.night), lit: bakeGround(loaded.lit), dawn: bakeGround(loaded.dawn) };
      shore = bakeShore(ground.night);
      ents.sort((a, b) => a.foot - b.foot);
      ready = true;
      events.onReady?.();
      draw();
    },
    () => {
      // without the atlas there is still a sea, and the story must not wait for pictures that will not come
      broken = true;
    },
  );

  /** The robot and Mote move, so their place in the draw order is found every frame. */
  function order() {
    const [x, top] = playerPx();
    playerEnt.x = x;
    playerEnt.y = top - LIFT;
    playerEnt.foot = top + TILE - (anim.walk >= 300 ? 1 : 0);
    const [mx, my] = motePx();
    moteEnt.x = mx;
    moteEnt.y = my;
    moteEnt.foot = playerEnt.foot + 1;
    // both sit near the end of a list that is otherwise fixed: one insertion pass is enough
    for (let i = 1; i < ents.length; i += 1) {
      const ent = ents[i];
      let j = i - 1;
      while (j >= 0 && ents[j].foot > ent.foot) {
        ents[j + 1] = ents[j];
        j -= 1;
      }
      ents[j + 1] = ent;
    }
  }
  measure();
  applyView();
  placeCamera();
  start();

  const api: World = {
    setPaused(next) {
      if (paused === next) return;
      paused = next;
      if (next) {
        input.drop();
        goal = null;
      } else tellNear();
    },
    setProgress(nextSolved, nextQuestioned, nextCompass) {
      solved = new Set(nextSolved);
      stone = new Set(nextQuestioned);
      compass = nextCompass;
      if (!solved.has("shore")) {
        awaitMote = false;
        awaitTide = false;
      }
      music.setInsights(insights());
    },
    setScene(next) {
      if (next === scene) return;
      const from = scene;
      scene = next;
      goal = null;
      input.drop();
      camFixed = null;
      if (next !== "play") near = null;
      if (next === "title") {
        placeWalker(player, TITLE_BED[0], TITLE_BED[1], 0);
        lying = true;
        gone = false;
      } else if (next === "play") {
        if (from === "title") {
          placeWalker(player, SPAWN[0], SPAWN[1], 0);
          lying = true;
          fadeIn = reduced ? -1 : 0;
        } else {
          // back from the ending: the morning stays, the robot stands at the door
          placeWalker(player, AFTER_ENDING[0], AFTER_ENDING[1], 0);
          lying = false;
          gone = false;
          if (overview) {
            overview = false;
            applyView();
          }
          music.setMode("layers");
        }
        tellNear();
      }
    },
    cue(cue) {
      if (disposed) return Promise.resolve();
      const job = jobFor(cue);
      if (reduced && job.dur > 150) {
        job.dur = 150;
        job.step = undefined;
      }
      return cues.push(job);
    },
    finishCues() {
      cues.finish();
      shakeX = 0;
      if (!overview) camFixed = null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      cancelLoad();
      cues.drop();
      observer.disconnect();
      input.dispose();
      music.dispose();
      const holder = window as unknown as { __dsfWorld?: World };
      if (holder.__dsfWorld === api) delete holder.__dsfWorld;
      document.removeEventListener("visibilitychange", onVisibility);
      reduceQuery?.removeEventListener("change", onMotion);
    },
    debug: {
      goto(id) {
        const thing = thingOf(id);
        if (!thing) return;
        goal = null;
        lying = false;
        gone = false;
        camFixed = null;
        placeWalker(player, thing.use[0], thing.use[1], 1);
        placeCamera();
        tellNear(true);
      },
      state() {
        const [x, y] = walkerPx(player);
        placeCamera();
        return {
          x,
          y,
          tx: player.x,
          ty: player.y,
          facing: DIR_NAME[player.dir],
          camX,
          camY,
          w: view.w,
          h: view.h,
          k: view.k,
          near: near ? near.id : "",
          onLand: isLand(player.x, player.y) ? 1 : 0,
          ready: ready ? 1 : 0,
          scene,
          paused: paused ? 1 : 0,
          moving: player.t < 1 ? 1 : 0,
          tide: tideStep(),
          mote: moteHere() ? 1 : 0,
          lamps: insights(),
          dawn,
          overview: overview ? 1 : 0,
          cues: cues.busy() ? 1 : 0,
          frameMs: Math.round(cost * 100) / 100,
          slowMs: Math.round(slow * 100) / 100,
        };
      },
    },
  };
  // a handle for scripted checks of the engine alone (cues, progress), next to the shell's window.__dsf
  if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __dsfWorld?: World }).__dsfWorld = api;
  return api;
}
