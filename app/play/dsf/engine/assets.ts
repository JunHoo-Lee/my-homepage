/*
 * The one world image, decoded once and graded three ways.
 */

import { ATLAS_SIZE } from "./atlas";
import { gradeCanvas, type Grade } from "./grade";

export const ATLAS_URL = "/play/dsf/world/atlas.png";

export type Sheets = Record<Grade, HTMLCanvasElement>;

export function loadSheets(onReady: (sheets: Sheets) => void, onError: () => void): () => void {
  let cancelled = false;
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    if (cancelled) return;
    const [w, h] = ATLAS_SIZE;
    onReady({
      raw: gradeCanvas(image, w, h, "raw"),
      night: gradeCanvas(image, w, h, "night"),
      lit: gradeCanvas(image, w, h, "lit"),
      dawn: gradeCanvas(image, w, h, "dawn"),
    });
  };
  image.onerror = () => {
    if (!cancelled) onError();
  };
  image.src = ATLAS_URL;
  return () => {
    cancelled = true;
    image.onload = null;
    image.onerror = null;
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
