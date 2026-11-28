/*
 * The ground, baked once per grade into a full-map canvas: grass, dirt paths,
 * the coast and the decals. Also the shore mask the surf is drawn through.
 */

import { DECALS, FOOTPRINTS, GROUND, MAP_H, MAP_W, TILE, isLand, isPath, tileHash } from "../map";
import { ATLAS, type SpriteName } from "./atlas";
import { makeCanvas } from "./assets";

export const MAP_PX_W = MAP_W * TILE;
export const MAP_PX_H = MAP_H * TILE;

export function bakeGround(sheet: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(MAP_PX_W, MAP_PX_H);
  const blit = (name: SpriteName, sx: number, sy: number, w: number, h: number, dx: number, dy: number) => {
    const [ax, ay] = ATLAS[name];
    ctx.drawImage(sheet, ax + sx, ay + sy, w, h, dx, dy, w, h);
  };

  for (let y = 0; y < MAP_H; y += 1) {
    for (let x = 0; x < MAP_W; x += 1) {
      const kind = GROUND[y][x];
      const dx = x * TILE;
      const dy = y * TILE;
      if (kind === "~") {
        const n = isLand(x, y - 1);
        const s = isLand(x, y + 1);
        const w = isLand(x - 1, y);
        const e = isLand(x + 1, y);
        if (n || s || w || e) {
          // an edge, or the corner of a bay: the pond block, land on the outside
          const col = w ? 0 : e ? 2 : 1;
          const row = n ? 0 : s ? 2 : 1;
          blit("pond", col * TILE, row * TILE, TILE, TILE, dx, dy);
        } else if (isLand(x + 1, y + 1)) blit("convex", 0, 0, TILE, TILE, dx, dy);
        else if (isLand(x - 1, y + 1)) blit("convex", TILE, 0, TILE, TILE, dx, dy);
        else if (isLand(x + 1, y - 1)) blit("convex", 0, TILE, TILE, TILE, dx, dy);
        else if (isLand(x - 1, y - 1)) blit("convex", TILE, TILE, TILE, TILE, dx, dy);
        continue;
      }
      const path = isPath(x, y);
      if (!path && tileHash(x, y, 1) < 0.38) blit("tufts", Math.floor(tileHash(x, y, 2) * 4) * TILE, 0, TILE, TILE, dx, dy);
      else blit("grass", 0, 0, TILE, TILE, dx, dy);
      if (!path) continue;
      // dirt, assembled from 8 x 8 quadrants so one-tile paths, corners and junctions all work
      for (let qy = 0; qy < 2; qy += 1) {
        for (let qx = 0; qx < 2; qx += 1) {
          const sx = qx ? 1 : -1;
          const sy = qy ? 1 : -1;
          const h = isPath(x + sx, y);
          const v = isPath(x, y + sy);
          const d = isPath(x + sx, y + sy);
          const half = TILE / 2;
          if (h && v && !d) {
            blit("dirtInner", (1 - qx) * TILE + qx * half, (1 - qy) * TILE + qy * half, half, half, dx + qx * half, dy + qy * half);
          } else {
            const col = h ? 1 : qx ? 2 : 0;
            const row = v ? 1 : qy ? 2 : 0;
            blit("dirt", col * TILE + qx * half, row * TILE + qy * half, half, half, dx + qx * half, dy + qy * half);
          }
        }
      }
    }
  }
  for (const decal of DECALS) blit(decal.sprite, decal.frame * TILE, 0, TILE, TILE, decal.x, decal.y);
  for (const print of FOOTPRINTS) {
    const [, , w, h] = ATLAS[print.sprite];
    blit(print.sprite, 0, 0, w, h, print.x, print.y);
  }
  return canvas;
}

/**
 * Three stepped alphas by distance to the land that is actually drawn:
 * under 4 px 1.0, under 10 px 0.6, under 18 px 0.3, nothing farther out.
 */
export function bakeShore(ground: HTMLCanvasElement): HTMLCanvasElement {
  const width = ground.width;
  const height = ground.height;
  const source = ground.getContext("2d", { willReadFrequently: true });
  const [canvas, ctx] = makeCanvas(width, height);
  if (!source) return canvas;
  const alpha = source.getImageData(0, 0, width, height).data;
  // two-pass chamfer distance (3 for a straight step, 4 for a diagonal)
  const FAR = 30000;
  const dist = new Int16Array(width * height);
  for (let i = 0; i < dist.length; i += 1) dist[i] = alpha[i * 4 + 3] > 0 ? 0 : FAR;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      let best = dist[i];
      if (x > 0) best = Math.min(best, dist[i - 1] + 3);
      if (y > 0) {
        best = Math.min(best, dist[i - width] + 3);
        if (x > 0) best = Math.min(best, dist[i - width - 1] + 4);
        if (x < width - 1) best = Math.min(best, dist[i - width + 1] + 4);
      }
      dist[i] = best;
    }
  }
  for (let y = height - 1; y >= 0; y -= 1) {
    for (let x = width - 1; x >= 0; x -= 1) {
      const i = y * width + x;
      let best = dist[i];
      if (x < width - 1) best = Math.min(best, dist[i + 1] + 3);
      if (y < height - 1) {
        best = Math.min(best, dist[i + width] + 3);
        if (x < width - 1) best = Math.min(best, dist[i + width + 1] + 4);
        if (x > 0) best = Math.min(best, dist[i + width - 1] + 4);
      }
      dist[i] = best;
    }
  }
  const image = ctx.createImageData(width, height);
  for (let i = 0; i < dist.length; i += 1) {
    const d = dist[i] / 3;
    image.data[i * 4 + 3] = d < 4 ? 255 : d < 10 ? 153 : d < 18 ? 77 : 0;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
