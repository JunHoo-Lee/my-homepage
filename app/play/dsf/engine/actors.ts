/*
 * Characters. Every sheet has 16 x 16 frames in four columns (down, up, left,
 * right); the robot's full sheet also has walk rows 0 to 3 and two poses in
 * row 6. A character is drawn 4 px above its tile so its feet sit in it.
 */

import { TILE } from "../map";
import { ATLAS, type SpriteName } from "./atlas";
import type { Dir } from "./input";

export const STEP_MS = 200;
export const WALK_FRAME_MS = 125;
export const LIFT = 4;

/** Someone who walks the grid: `x, y` is the tile stood on or walked into, `t` runs 0 to 1 over a step. */
export type Walker = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
  dir: Dir;
  /** Milliseconds walked without stopping: picks the walk frame. */
  walked: number;
};

export const makeWalker = (x: number, y: number, dir: Dir): Walker => ({ x, y, fromX: x, fromY: y, t: 1, dir, walked: 0 });

export function placeWalker(walker: Walker, x: number, y: number, dir: Dir) {
  walker.x = x;
  walker.y = y;
  walker.fromX = x;
  walker.fromY = y;
  walker.t = 1;
  walker.dir = dir;
  walker.walked = 0;
}

/** Top left of the walker's tile in whole art pixels, part-way through a step. */
export function walkerPx(walker: Walker): [number, number] {
  const t = walker.t >= 1 ? 1 : walker.t;
  return [Math.round((walker.fromX + (walker.x - walker.fromX) * t) * TILE), Math.round((walker.fromY + (walker.y - walker.fromY) * t) * TILE)];
}

export const walkRow = (walker: Walker) => (walker.t < 1 ? Math.floor(walker.walked / WALK_FRAME_MS) % 4 : 0);

/** One 16 x 16 frame of a character sheet, with its tile's top left at (x, y) on the canvas. */
export function drawFrame(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, sprite: SpriteName, col: number, row: number, x: number, y: number) {
  const [ax, ay] = ATLAS[sprite];
  ctx.drawImage(sheet, ax + col * TILE, ay + row * TILE, TILE, TILE, x, y - LIFT, TILE, TILE);
}

/** The pack's soft shadow under a character's feet. */
export function drawShadow(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, x: number, y: number) {
  const [ax, ay, w, h] = ATLAS.shadow;
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * 0.35;
  ctx.drawImage(sheet, ax, ay, w, h, x + 2, y + 7, w, h);
  ctx.globalAlpha = before;
}

/** The way to turn at (fromX, fromY) to look at (toX, toY): the longer axis wins. */
export function dirToward(fromX: number, fromY: number, toX: number, toY: number): Dir | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 2 : 3;
  return dy < 0 ? 1 : 0;
}
