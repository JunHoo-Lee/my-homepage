/*
 * Lantern light as a stepped mask: four flat bands, no gradient.
 *
 * For a light of radius r, with d the distance from its centre divided by r
 * (y squashed by 1.15), the band is q = ceil((1 - d^2) * 4) / 4. Where lights
 * overlap the brighter one wins, which is what building the mask band by band
 * gives: band n is the union of every light's disc for q >= n / 4.
 */

import { makeCanvas } from "./assets";

export type Light = {
  x: number;
  y: number;
  r: number;
  /** How many of the four bands the light reaches (4 = full). */
  bands: number;
  /** One flat disc instead of shrinking bands (fireflies). */
  flat?: boolean;
};

const SQUASH = 1.15;
const SHRINK = [1, Math.sqrt(0.75), Math.sqrt(0.5), 0.5];
const discs = new Map<number, HTMLCanvasElement>();

/** An opaque disc with hard edges, cached by radius. */
function disc(radius: number): HTMLCanvasElement {
  const r = Math.max(1, Math.round(radius));
  const cached = discs.get(r);
  if (cached) return cached;
  const ry = Math.ceil(r / SQUASH);
  const [canvas, ctx] = makeCanvas(r * 2 + 1, ry * 2 + 1);
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const dx = x - r;
      const dy = (y - ry) * SQUASH;
      if (dx * dx + dy * dy < r * r) image.data[(y * canvas.width + x) * 4 + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  discs.set(r, canvas);
  return canvas;
}

export function composeMask(
  mask: CanvasRenderingContext2D,
  band: CanvasRenderingContext2D,
  lights: Light[],
  width: number,
  height: number,
  camX: number,
  camY: number,
) {
  mask.globalCompositeOperation = "source-over";
  mask.globalAlpha = 1;
  mask.clearRect(0, 0, width, height);
  for (let level = 0; level < 4; level += 1) {
    let any = false;
    band.clearRect(0, 0, width, height);
    for (const light of lights) {
      if (light.bands <= level) continue;
      const sprite = disc(light.flat ? light.r : light.r * SHRINK[level]);
      const x = Math.round(light.x - camX) - (sprite.width - 1) / 2;
      const y = Math.round(light.y - camY) - (sprite.height - 1) / 2;
      if (x > width || y > height || x + sprite.width < 0 || y + sprite.height < 0) continue;
      band.drawImage(sprite, x, y);
      any = true;
    }
    if (!any) continue;
    mask.globalCompositeOperation = "lighter";
    mask.globalAlpha = 0.25;
    mask.drawImage(band.canvas, 0, 0);
  }
  mask.globalCompositeOperation = "source-over";
  mask.globalAlpha = 1;
}
