/*
 * The sea of static.
 *
 * Grains are horizontal runs of one to three pixels in a six-step ramp over a
 * dark base. Every third screen row is one step darker (scanlines) and one
 * band of denser grain rolls down the screen. Two pattern sets are re-rolled
 * eight times a second: "deep" (calm, everywhere) and "surf" (dense and
 * bright), which is drawn through a mask baked from the coast so the static
 * breaks on the shore like surf.
 */

import { makeCanvas } from "./assets";
import { gradeColor, type Grade } from "./grade";

export const SEA_BASE = "#0e1226";
const RAMP = ["#1c2240", "#2c345a", "#4a5270", "#7c8cb4", "#b8dce5", "#f2eaf1"];
const SIZE = 96; // a multiple of 3, so the scanlines line up across the seam
const FRAMES = 4;
const RUNS = [1, 1, 2, 2, 3];

type Set = { deep: HTMLCanvasElement[]; surf: HTMLCanvasElement[]; base: string };

function pattern(random: () => number, density: number, bright: boolean, ramp: string[]): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const scan = y % 3 === 2;
    let x = 0;
    while (x < SIZE) {
      const run = RUNS[Math.floor(random() * RUNS.length)];
      if (random() < density) {
        const u = random();
        let step = u < 0.3 ? 0 : u < 0.58 ? 1 : u < 0.8 ? 2 : u < (bright ? 0.87 : 0.93) ? 3 : u < (bright ? 0.95 : 0.985) ? 4 : 5;
        if (scan && step > 0) step -= 1;
        ctx.fillStyle = ramp[step];
        ctx.fillRect(x, y, Math.min(run, SIZE - x), 1);
      }
      x += run;
    }
  }
  return canvas;
}

/** At dawn the static is still there, thin and pale on a morning sea (mock4-dawn.png). */
const DAWN_BASE = "#86a8c2";
const DAWN_RAMP = ["#7fc7db", "#7fc7db", "#7fc7db", "#bfc6d4", "#bfc6d4", "#ffe3e8"];

function makeSet(random: () => number, grade: Grade, thin: number): Set {
  const ramp = grade === "dawn" ? DAWN_RAMP : RAMP.map((hex) => gradeColor(hex, grade));
  const deep: HTMLCanvasElement[] = [];
  const surf: HTMLCanvasElement[] = [];
  for (let n = 0; n < FRAMES; n += 1) {
    deep.push(pattern(random, 0.1 * thin, false, ramp));
    surf.push(pattern(random, 0.45 * thin, true, ramp));
  }
  return { deep, surf, base: grade === "dawn" ? DAWN_BASE : gradeColor(SEA_BASE, grade) };
}

function tile(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, ox: number, oy: number, x0: number, y0: number, w: number, h: number) {
  for (let y = y0 - oy; y < y0 + h; y += SIZE) {
    for (let x = x0 - ox; x < x0 + w; x += SIZE) ctx.drawImage(image, x, y);
  }
}

export type Sea = {
  update(dt: number, reduced: boolean): void;
  /** Fills the whole view. `dawn` is 0 at night and 1 at dawn. */
  draw(
    ctx: CanvasRenderingContext2D,
    scratch: CanvasRenderingContext2D,
    width: number,
    height: number,
    camX: number,
    camY: number,
    shore: HTMLCanvasElement | null,
    dawn: number,
  ): void;
  /** Full-density static in a rectangle of `ctx`, for the tide and the slab's face. */
  surf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void;
  /** Counts up once per re-roll, so callers can re-roll with it. */
  tick(): number;
};

export function createSea(): Sea {
  let seed = 20261;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const night = makeSet(random, "raw", 1);
  const morning = makeSet(random, "dawn", 0.3);
  let timer = 0;
  let ticks = 0;
  let frame = 0;
  let ox = 0;
  let oy = 0;
  let bandFrame = 1;
  let bandOx = 40;
  let band = 0;
  let still = false;

  function layer(
    ctx: CanvasRenderingContext2D,
    scratch: CanvasRenderingContext2D,
    set: Set,
    width: number,
    height: number,
    camX: number,
    camY: number,
    shore: HTMLCanvasElement | null,
    rolling: boolean,
  ) {
    ctx.fillStyle = set.base;
    ctx.fillRect(0, 0, width, height);
    tile(ctx, set.deep[frame], ox, oy, 0, 0, width, height);
    if (rolling) {
      const y = band % (height + 9);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y - 9, width, 9);
      ctx.clip();
      tile(ctx, set.deep[bandFrame], bandOx, oy, 0, 0, width, height);
      ctx.restore();
    }
    if (shore) {
      scratch.globalCompositeOperation = "source-over";
      scratch.clearRect(0, 0, width, height);
      tile(scratch, set.surf[frame], (ox * 7) % SIZE, oy, 0, 0, width, height);
      scratch.globalCompositeOperation = "destination-in";
      scratch.drawImage(shore, -camX, -camY);
      scratch.globalCompositeOperation = "source-over";
      // beyond the map there is no shore: make sure nothing is left there, whatever the browser composited
      const left = -camX;
      const top = -camY;
      if (left > 0) scratch.clearRect(0, 0, left, height);
      if (top > 0) scratch.clearRect(0, 0, width, top);
      if (left + shore.width < width) scratch.clearRect(left + shore.width, 0, width - left - shore.width, height);
      if (top + shore.height < height) scratch.clearRect(0, top + shore.height, width, height - top - shore.height);
      ctx.drawImage(scratch.canvas, 0, 0);
    }
  }

  return {
    update(dt, reduced) {
      still = reduced;
      timer += dt;
      const step = reduced ? 0.5 : 0.125;
      if (timer < step) return;
      timer %= step;
      ticks += 1;
      frame = Math.floor(random() * FRAMES);
      bandFrame = (frame + 1 + Math.floor(random() * (FRAMES - 1))) % FRAMES;
      ox = Math.floor(random() * SIZE);
      bandOx = Math.floor(random() * SIZE);
      oy = Math.floor(random() * (SIZE / 3)) * 3;
      band += 23;
    },
    draw(ctx, scratch, width, height, camX, camY, shore, dawn) {
      if (dawn < 1) layer(ctx, scratch, night, width, height, camX, camY, shore, !still && dawn === 0);
      if (dawn > 0) {
        if (dawn >= 1) {
          layer(ctx, scratch, morning, width, height, camX, camY, shore, false);
        } else {
          // the dawn sea is a flat blend over the night sea while the light changes
          ctx.globalAlpha = dawn;
          ctx.fillStyle = morning.base;
          ctx.fillRect(0, 0, width, height);
          tile(ctx, morning.deep[frame], ox, oy, 0, 0, width, height);
          ctx.globalAlpha = 1;
        }
      }
    },
    surf(ctx, x, y, w, h) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = SEA_BASE;
      ctx.fillRect(x, y, w, h);
      tile(ctx, night.surf[frame], (ox * 7) % SIZE, oy, x, y, w, h);
      ctx.restore();
    },
    tick: () => ticks,
  };
}
