/*
 * Scale and view. One art pixel is a whole number of device pixels, the same
 * number everywhere on the screen.
 */

import { MAP_H, MAP_W, TILE } from "../map";

export type View = {
  /** Device pixels per art pixel. */
  k: number;
  /** Backing size in art pixels. */
  w: number;
  h: number;
  portrait: boolean;
};

const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);

/** The scale for play: about 9 tiles across a phone held upright, 20 across a desktop. */
export function playScale(devW: number, devH: number): number {
  if (devH >= devW) return clamp(Math.round(devW / 144), 2, 10);
  let k = clamp(Math.round(devW / 320), 2, 10);
  while (k > 2 && devH / k / TILE < 11) k -= 1;
  return k;
}

/** The scale at which the whole island fits. */
export function overviewScale(devW: number, devH: number): number {
  return Math.max(1, Math.floor(Math.min(devW / (MAP_W * TILE), devH / (MAP_H * TILE))));
}

/**
 * Browsers lay boxes out in 1/64ths of a CSS pixel. A canvas whose CSS size is not on that grid is
 * stretched by a fraction of a device pixel and one row of art pixels comes out thinner than the rest
 * (ratio 3 is the common case). So the backing store grows by a few art pixels until its CSS size is exact.
 */
function exact(artPx: number, k: number, ratio: number): number {
  for (let more = 0; more < 16; more += 1) {
    const units = ((artPx + more) * k * 64) / ratio;
    if (Math.abs(units - Math.round(units)) < 0.01) return artPx + more;
  }
  return artPx;
}

export function makeView(devW: number, devH: number, k: number, ratio: number): View {
  return { k, w: exact(Math.max(1, Math.ceil(devW / k)), k, ratio), h: exact(Math.max(1, Math.ceil(devH / k)), k, ratio), portrait: devH >= devW };
}

/** Where on the screen the thing the camera follows sits, as a fraction of the height. */
export const anchorY = (view: View) => (view.portrait ? 0.45 : 0.5);

/** The camera position (top left, art pixels) that puts a point at the anchor. */
export function lookAt(view: View, x: number, y: number, fy = anchorY(view)): [number, number] {
  return [Math.round(x - view.w / 2), Math.round(y - view.h * fy)];
}

/** Smooth start and stop for pans. The result is still rounded to whole art pixels by the caller. */
export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
