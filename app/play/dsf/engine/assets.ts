/*
 * The one world image, decoded once and graded three ways.
 */

import { ATLAS_SIZE } from "./atlas";
import { gradeCanvas, type Grade } from "./grade";

export const ATLAS_URL = "/play/dsf/world/atlas.png";

export type Sheets = Record<Grade, HTMLCanvasElement>;

/** Loads the atlas, trying a second time after a short wait before giving up. */
export function loadSheets(onReady: (sheets: Sheets) => void, onError: () => void): () => void {
  let cancelled = false;
  let image: HTMLImageElement | null = null;
  let timer = 0;
  const attempt = (tries: number) => {
    const next = new Image();
    image = next;
    next.decoding = "async";
    next.onload = () => {
      if (cancelled) return;
      const [w, h] = ATLAS_SIZE;
      onReady({
        raw: gradeCanvas(next, w, h, "raw"),
        night: gradeCanvas(next, w, h, "night"),
        lit: gradeCanvas(next, w, h, "lit"),
        dawn: gradeCanvas(next, w, h, "dawn"),
        flash: gradeCanvas(next, w, h, "flash"),
      });
    };
    next.onerror = () => {
      if (cancelled) return;
      if (tries > 0) onError();
      else timer = window.setTimeout(() => attempt(1), 1200);
    };
    next.src = tries > 0 ? `${ATLAS_URL}?retry=${Date.now()}` : ATLAS_URL;
  };
  attempt(0);
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (image) {
      image.onload = null;
      image.onerror = null;
    }
  };
}

export function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas is not available");
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}
