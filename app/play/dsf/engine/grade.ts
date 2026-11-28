/*
 * Colour grades. Each is applied once, to a whole copy of the atlas, when the
 * game loads. Nothing is graded per frame.
 */

export type Grade = "raw" | "night" | "lit" | "dawn";

type Rgb = [number, number, number];

/** Night: a little grey, then a cool lift so the darkest ground still reads as teal. */
function night([r, g, b]: Rgb): Rgb {
  const luma = 0.3 * r + 0.59 * g + 0.11 * b;
  r += (luma - r) * 0.22;
  g += (luma - g) * 0.22;
  b += (luma - b) * 0.22;
  return [0.36 * r + 6, 0.46 * g + 12, 0.6 * b + 44];
}

/** Lantern light: the pack's own colours, a touch warmer. */
const lit = ([r, g, b]: Rgb): Rgb => [r, 0.94 * g, 0.8 * b];

/** Dawn: washed and warm. */
const dawn = ([r, g, b]: Rgb): Rgb => [0.9 * r + 26, 0.82 * g + 18, 0.78 * b + 34];

const FN: Record<Grade, (c: Rgb) => Rgb> = { raw: (c) => c, night, lit, dawn };

const byte = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : Math.round(value));

export function gradeColor(hex: string, grade: Grade): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = FN[grade]([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  return `rgb(${byte(r)},${byte(g)},${byte(b)})`;
}

/** A graded copy of an image. One getImageData pass. */
export function gradeCanvas(source: CanvasImageSource, width: number, height: number, grade: Grade): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: grade !== "raw" });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  if (grade === "raw") return canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const fn = FN[grade];
  const cache = new Map<number, Rgb>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const packed = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    let out = cache.get(packed);
    if (!out) {
      const [r, g, b] = fn([data[i], data[i + 1], data[i + 2]]);
      out = [byte(r), byte(g), byte(b)];
      cache.set(packed, out);
    }
    data[i] = out[0];
    data[i + 1] = out[1];
    data[i + 2] = out[2];
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
