/*
 * Small things that glow: one-shot sprite effects and the fireflies.
 * Everything here is drawn at full colour, after the light.
 */

import { MAP_H, MAP_W, TILE, isFreeGrass, tileHash } from "../map";
import { ATLAS, type SpriteName } from "./atlas";
import type { Light } from "./light";

type Shot = { sprite: SpriteName; x: number; y: number; fw: number; frames: number; fps: number; age: number; from: number };

export type Fx = {
  /** A strip of equal frames played once, centred on (x, y) in art pixels. */
  spawn(sprite: SpriteName, x: number, y: number, fw: number, fps: number, from?: number): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, camX: number, camY: number): void;
  clear(): void;
};

export function createFx(): Fx {
  let shots: Shot[] = [];
  return {
    spawn(sprite, x, y, fw, fps, from = 0) {
      const [, , w] = ATLAS[sprite];
      shots.push({ sprite, x, y, fw, frames: Math.floor(w / fw), fps, age: 0, from });
    },
    update(dt) {
      if (shots.length === 0) return;
      for (const shot of shots) shot.age += dt;
      shots = shots.filter((shot) => shot.from + Math.floor(shot.age * shot.fps) < shot.frames);
    },
    draw(ctx, sheet, camX, camY) {
      for (const shot of shots) {
        const [ax, ay, , h] = ATLAS[shot.sprite];
        const frame = shot.from + Math.floor(shot.age * shot.fps);
        ctx.drawImage(sheet, ax + frame * shot.fw, ay, shot.fw, h, Math.round(shot.x - shot.fw / 2) - camX, Math.round(shot.y - h / 2) - camY, shot.fw, h);
      }
    },
    clear() {
      shots = [];
    },
  };
}

type Fly = { x: number; y: number; a: number; b: number; p: number; q: number; f: number };

export type Fireflies = {
  /** Draws them and adds their small lights to the list. */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number, still: boolean): void;
  lights(out: Light[], time: number, still: boolean): void;
};

const FLY_COUNT = 14;

export function createFireflies(): Fireflies {
  const flies: Fly[] = [];
  // spread over the island: the best-scoring free grass tile of each of 14 sectors
  for (let n = 0; n < FLY_COUNT; n += 1) {
    let best = -1;
    let bx = 0;
    let by = 0;
    for (let y = 0; y < MAP_H; y += 1) {
      for (let x = 0; x < MAP_W; x += 1) {
        if (!isFreeGrass(x, y) || (x * 3 + y * 5) % FLY_COUNT !== n) continue;
        const score = tileHash(x, y, 31 + n);
        if (score > best) {
          best = score;
          bx = x;
          by = y;
        }
      }
    }
    if (best < 0) continue;
    flies.push({
      x: bx * TILE + 8,
      y: by * TILE + 2,
      a: 0.3 + tileHash(bx, by, 41) * 0.14,
      b: 0.22 + tileHash(bx, by, 42) * 0.14,
      p: tileHash(bx, by, 43) * 6.28,
      q: tileHash(bx, by, 44) * 6.28,
      f: 0.7 + tileHash(bx, by, 45) * 0.6,
    });
  }

  const place = (fly: Fly, time: number, still: boolean): [number, number, number] => {
    const t = still ? 0 : time;
    // a slow loop about 16 px wide: roughly 3 px a second
    const x = Math.round(fly.x + Math.sin(t * fly.a + fly.p) * 9);
    const y = Math.round(fly.y + Math.cos(t * fly.b + fly.q) * 6);
    const glow = still ? 0.75 : Math.round((0.5 + 0.5 * Math.sin(time * fly.f + fly.p * 2)) * 4) / 4;
    return [x, y, glow];
  };

  return {
    draw(ctx, camX, camY, time, still) {
      ctx.fillStyle = "#ffe18d";
      for (const fly of flies) {
        const [x, y, glow] = place(fly, time, still);
        if (glow <= 0) continue;
        ctx.globalAlpha = glow;
        ctx.fillRect(x - camX, y - camY, 1, 1);
      }
      ctx.globalAlpha = 1;
    },
    lights(out, time, still) {
      for (const fly of flies) {
        const [x, y, glow] = place(fly, time, still);
        if (glow >= 0.5) out.push({ x, y: y + 2, r: 5, bands: 1, flat: true });
      }
    },
  };
}
