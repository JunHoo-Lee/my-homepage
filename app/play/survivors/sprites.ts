/*
 * Gradient Survivors art: the whole sprite sheet is drawn procedurally with
 * canvas 2D paths, gradients and system-font text at load time (no image
 * files, no web fonts). Contract: SpriteSheet in ./contracts.
 *
 * House style ("cute academic" flat vector, homepage palette): every body has
 * a chunky outline in a darker, cooler shade of its fill, 2-tone cel shading
 * (a bottom-right shade and a top-left light crescent), a glossy highlight and
 * a little face. Projectiles and effects are bright with soft halos so they
 * read on sand and also work with additive ("lighter") blending.
 *
 * Sprites are rendered at clamp(pixelRatio, 1, 2) x 1.5 device pixels per
 * world unit, so they stay crisp under the camera zoom (0.78..1.1) and zoom
 * punches. Canvases are padded so outlines and halos are never clipped, and
 * every anchor sits on the logical body centre.
 */

import {
  ENEMY_RADIUS,
  PALETTE,
  PLAYER_ANTENNA_TIP,
  PLAYER_VISOR,
  type EnemyKind,
  type EnemySprites,
  type GlowColor,
  type Sprite,
  type SpriteSheet,
} from "./contracts";
import { REVIEW_COMMENTS } from "./lore";

/** End of the exploding gradient's fuse, world units from its anchor (the game adds the spark here). */
export const FUSE_TIP = { x: 23, y: -32 } as const;

/** Nib of Reviewer 2's red pen, world units from the boss anchor (same in both facings). */
export const BOSS_PEN_TIP = { x: 66, y: -26 } as const;

const FONT = '"Helvetica Neue", Arial, sans-serif';
const TAU = Math.PI * 2;

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------ colour

type Rgb = [number, number, number];

const rgbOf = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Linear blend of two #rrggbb colours. */
const mix = (a: string, b: string, t: number) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

const rgba = (hex: string, a: number) => `rgba(${rgbOf(hex).join(",")},${a})`;

/** Shadows lean cool and highlights warm: that hue shift is most of the cel look. */
const COOL = "#24193b";
const WARM = "#fff7df";

type Tone = { fill: string; shade: string; light: string; line: string };

const tone = (fill: string, line = mix(fill, COOL, 0.48)): Tone => ({
  fill,
  shade: mix(fill, COOL, 0.2),
  light: mix(fill, WARM, 0.4),
  line,
});

// ------------------------------------------------------------------ canvas helpers

function newCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return canvas;
}

/**
 * Paints a sprite covering [x0, x1] x [y0, y1] world units around its anchor.
 * `draw` works in world units with the origin on the anchor.
 */
function paint(scale: number, x0: number, y0: number, x1: number, y1: number, draw: (ctx: Ctx) => void): Sprite {
  const canvas = newCanvas((x1 - x0) * scale, (y1 - y0) * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  draw(ctx);
  return { canvas, w: canvas.width / scale, h: canvas.height / scale, ax: -x0, ay: -y0 };
}

/** Solid silhouette with the same size and anchor (hit flashes). */
function silhouette(s: Sprite, color = "#ffffff"): Sprite {
  const canvas = newCanvas(s.canvas.width, s.canvas.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(s.canvas, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { ...s, canvas };
}

/** Multiplies a sprite's alpha in place. */
function fade(s: Sprite, alpha: number) {
  const ctx = s.canvas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, s.canvas.width, s.canvas.height);
}

/** A path moved by (x, y) and rotated by `angle`. */
function placed(path: Path2D, x: number, y: number, angle = 0) {
  const out = new Path2D();
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out.addPath(path, { a: c, b: s, c: -s, d: c, e: x, f: y });
  return out;
}

/** The shape plus a shifted copy: filled "evenodd" inside the shape, it leaves a crescent. */
function crescent(shape: Path2D, dx: number, dy: number) {
  const out = new Path2D(shape);
  out.addPath(shape, { e: dx, f: dy });
  return out;
}

function circlePath(x: number, y: number, r: number) {
  const p = new Path2D();
  p.arc(x, y, r, 0, TAU);
  return p;
}

function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

function dot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/**
 * A body in the house style. The outline is stroked first at twice its width so
 * the fill covers the inner half (several subpaths merge into one silhouette).
 * Inside, `markings` are painted first, then the bottom-right shade and the
 * top-left light, each the XOR of the shape with a shifted copy of itself.
 * `shape` must be a single non-self-overlapping outline for the XOR to work.
 */
function celBody(ctx: Ctx, shape: Path2D, t: Tone, outline: number, depth: number, markings?: (ctx: Ctx) => void) {
  ctx.lineWidth = outline * 2;
  ctx.strokeStyle = t.line;
  ctx.stroke(shape);
  ctx.fillStyle = t.fill;
  ctx.fill(shape);
  ctx.save();
  ctx.clip(shape);
  markings?.(ctx);
  ctx.fillStyle = t.shade;
  ctx.fill(crescent(shape, -depth * 0.35, -depth), "evenodd");
  ctx.fillStyle = t.light;
  ctx.fill(crescent(shape, depth * 0.3, depth * 0.45), "evenodd");
  ctx.restore();
}

/** Glossy white highlight. */
function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, alpha = 0.85) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
}

/** Bold label centred on its ink (not its em box), stroked underneath for contrast. */
function label(ctx: Ctx, text: string, x: number, y: number, size: number, fill: string, stroke: string, strokeWidth: number, maxWidth = Infinity) {
  ctx.font = `bold ${size}px ${FONT}`;
  const width = ctx.measureText(text).width;
  if (width > maxWidth) ctx.font = `bold ${(size * maxWidth) / width}px ${FONT}`;
  const m = ctx.measureText(text);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const baseline = y + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  if (strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, baseline);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, baseline);
}

/** Round white eye with an outline; the pupil looks along dir (+1 right, -1 left). */
function eye(ctx: Ctx, x: number, y: number, r: number, dir: number, pupil: number, line: string, lineWidth: number) {
  dot(ctx, x, y, r, "#ffffff");
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = line;
  ctx.stroke();
  const pr = r * pupil;
  const px = x + dir * (r - pr) * 0.62;
  const py = y + (r - pr) * 0.18;
  dot(ctx, px, py, pr, PALETTE.ink);
  dot(ctx, px - pr * 0.38, py - pr * 0.42, pr * 0.34, "#ffffff");
}

function stroke(ctx: Ctx, path: Path2D, width: number, color: string) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke(path);
}

// ------------------------------------------------------------------ enemies

/** NaN: a grey jelly blob with a flat bottom, a tiny drip and "NaN" on the belly. */
function drawNan(ctx: Ctx, dir: number) {
  const t = tone(PALETTE.grey);
  const shape = new Path2D();
  shape.moveTo(-14, 1);
  shape.bezierCurveTo(-14, -8, -8, -12.5, 0, -12.5);
  shape.bezierCurveTo(8, -12.5, 14, -8, 14, 1);
  shape.bezierCurveTo(14, 7.5, 12.5, 11, 8, 11);
  shape.lineTo(7.4, 11);
  shape.bezierCurveTo(6.6, 11, 6.9, 12.6, 6.9, 13.8);
  shape.arc(5, 14.1, 1.9, -0.16, Math.PI + 0.16);
  shape.bezierCurveTo(3.1, 12.6, 3.4, 11, 2.6, 11);
  shape.lineTo(-8, 11);
  shape.bezierCurveTo(-12.5, 11, -14, 7.5, -14, 1);
  shape.closePath();
  celBody(ctx, shape, t, 1.6, 3);
  gloss(ctx, -6.6, -7, 3.4, 1.8, -0.7);
  dot(ctx, -10, -2.6, 1, "rgba(255,255,255,0.8)");
  // blush and dot eyes
  for (const s of [-1, 1]) {
    ctx.fillStyle = rgba(PALETTE.red, 0.25);
    ctx.beginPath();
    ctx.ellipse(s * 9.2, -0.6, 2.3, 1.3, 0, 0, TAU);
    ctx.fill();
    const x = s * 4.6 + dir * 1.3;
    dot(ctx, x, -3.6, 2.2, PALETTE.ink);
    dot(ctx, x - 0.7, -4.4, 0.8, "#ffffff");
  }
  label(ctx, "NaN", 0, 5.2, 8.6, "#ffffff", t.line, 2.4);
}

/** Overfit: a red spiky ball with angry brows and a tiny "fit" label. */
function drawOverfit(ctx: Ctx, dir: number) {
  const t = tone(PALETTE.red);
  const r = ENEMY_RADIUS.overfit;
  const spikes = 8;
  const half = 0.27;
  const shape = new Path2D();
  for (let i = 0; i < spikes; i += 1) {
    const a = Math.PI / spikes + (i * TAU) / spikes;
    shape.arc(0, 0, r, a - TAU / spikes + half, a - half);
    shape.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
  }
  shape.closePath();
  celBody(ctx, shape, t, 1.5, 2.6);
  gloss(ctx, -4.6, -5.2, 2.2, 1.2, -0.75);
  for (const s of [-1, 1]) {
    eye(ctx, s * 3.7, -0.6, 3.1, dir, 0.55, t.line, 0.9);
    // angry brow, inner end low
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(s * 6.6, -5.9);
    ctx.lineTo(s * 1.4, -3.9);
    ctx.stroke();
  }
  label(ctx, "fit", 0, 5.6, 5.8, "#ffffff", t.line, 1.7);
}

/** Hallucination: a translucent purple ghost with dizzy spiral eyes and "?!". */
function drawHalluc(ctx: Ctx, dir: number) {
  const t = tone(PALETTE.purple);
  const w = 14.5;
  const shape = new Path2D();
  shape.moveTo(-w, 10.5);
  shape.lineTo(-w, -0.5);
  shape.arc(0, -0.5, w, Math.PI, TAU);
  shape.lineTo(w, 10.5);
  const scallops = 4;
  const sr = w / scallops;
  for (let i = 0; i < scallops; i += 1) shape.arc(w - sr * (2 * i + 1), 10.5, sr, 0, Math.PI);
  shape.closePath();
  celBody(ctx, shape, t, 1.6, 3.2);
  gloss(ctx, -7.2, -9.2, 3.6, 2, -0.8);
  dot(ctx, -11, -4.4, 1, "rgba(255,255,255,0.8)");
  for (const s of [-1, 1]) {
    const x = s * 6;
    const y = -2.6;
    const r = 4.7;
    dot(ctx, x, y, r, "#ffffff");
    stroke(ctx, circlePath(x, y, r), 1, t.line);
    // dizzy spiral, its centre drifting toward where it looks
    const cx = x + dir * 0.9;
    ctx.beginPath();
    for (let k = 0; k <= 40; k += 1) {
      const f = k / 40;
      const a = s * f * 1.75 * TAU;
      const rr = 0.3 + f * (r - 1.5);
      ctx.lineTo(cx + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  label(ctx, "?!", 0, 7.6, 9.4, "#ffffff", t.line, 2.4);
}

/** ∇∞ drawn with paths (no font has to have the glyphs). */
function nablaInfinity(ctx: Ctx, x: number, y: number, color: string, under: string) {
  const nabla = new Path2D();
  nabla.moveTo(x - 10, y - 3.2);
  nabla.lineTo(x - 3, y - 3.2);
  nabla.lineTo(x - 6.5, y + 3.4);
  nabla.closePath();
  const inf = new Path2D();
  for (let k = 0; k <= 48; k += 1) {
    const a = (k / 48) * TAU;
    const d = 1 + Math.sin(a) ** 2;
    inf.lineTo(x + 5 + (5.2 * Math.cos(a)) / d, y + (6.4 * Math.sin(a) * Math.cos(a)) / d);
  }
  inf.closePath();
  for (const [width, color2] of [
    [4.4, under],
    [2.1, color],
  ] as const) {
    stroke(ctx, nabla, width, color2);
    stroke(ctx, inf, width, color2);
  }
}

/** Exploding gradient: an orange bomb with a dark band, cracks and a short fuse. */
function drawExplode(ctx: Ctx, dir: number) {
  const t = tone(PALETTE.orange);
  const r = ENEMY_RADIUS.explode;
  const cap = tone("#5d5468");
  // the fuse leaves a cap on the top-right of the shell
  const capAngle = -0.88;
  const capX = Math.cos(capAngle) * (r + 1);
  const capY = Math.sin(capAngle) * (r + 1);
  const fuse = new Path2D();
  fuse.moveTo(capX + Math.cos(capAngle) * 3, capY + Math.sin(capAngle) * 3);
  fuse.bezierCurveTo(capX + 6, capY - 3, FUSE_TIP.x - 5, FUSE_TIP.y + 4, FUSE_TIP.x, FUSE_TIP.y);
  stroke(ctx, fuse, 4.6, "#4a3423");
  stroke(ctx, fuse, 2.4, "#c9a06a");
  ctx.setLineDash([0.8, 2]);
  stroke(ctx, fuse, 1.2, "#8f6a3c");
  ctx.setLineDash([]);
  dot(ctx, FUSE_TIP.x, FUSE_TIP.y, 1.5, "#3b2a1e");
  celBody(ctx, placed(roundRectPath(-5, -4, 10, 8, 2.2), capX, capY, capAngle + Math.PI / 2), cap, 1.4, 1.8);

  const body = circlePath(0, 0, r);
  celBody(ctx, body, t, 2.1, 4.6, (c) => {
    // darker band around the middle, curving with the shell
    c.beginPath();
    c.moveTo(-r - 2, 1);
    c.quadraticCurveTo(0, 8.5, r + 2, 1);
    c.lineTo(r + 2, 12);
    c.quadraticCurveTo(0, 20, -r - 2, 12);
    c.closePath();
    c.fillStyle = mix(PALETTE.orange, COOL, 0.32);
    c.fill();
    c.strokeStyle = mix(PALETTE.orange, WARM, 0.35);
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(-r - 2, 1.6);
    c.quadraticCurveTo(0, 9.1, r + 2, 1.6);
    c.stroke();
  });
  gloss(ctx, -11, -13, 5, 2.6, -0.75);
  dot(ctx, -17, -6.5, 1.3, "rgba(255,255,255,0.8)");

  // small cracks with a lit lower edge
  const crack = new Path2D();
  crack.moveTo(-19.5, -10);
  crack.lineTo(-16, -8.4);
  crack.lineTo(-17, -5.6);
  crack.lineTo(-13.8, -4.2);
  crack.moveTo(8.5, 19.5);
  crack.lineTo(11, 17.2);
  crack.lineTo(12.4, 19.6);
  crack.lineTo(15.4, 16.6);
  ctx.save();
  ctx.translate(0.5, 0.6);
  stroke(ctx, crack, 0.9, t.light);
  ctx.restore();
  stroke(ctx, crack, 1.1, t.line);

  // frantic face: wide eyes, tiny pupils, worried brows, wobbly mouth, sweat
  for (const s of [-1, 1]) {
    eye(ctx, s * 8, -9, 5.6, dir, 0.4, t.line, 1.2);
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(s * 12.6, -15.6);
    ctx.lineTo(s * 4.4, -17.6);
    ctx.stroke();
  }
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let k = 0; k <= 4; k += 1) ctx.lineTo(-4.4 + k * 2.2, -1 + (k % 2) * -1.3);
  ctx.stroke();
  ctx.fillStyle = "#bfe0f7";
  ctx.beginPath();
  ctx.moveTo(-19, -18);
  ctx.quadraticCurveTo(-16.6, -14, -17.3, -13);
  ctx.arc(-19, -13.4, 1.8, 0.25, Math.PI - 0.25);
  ctx.quadraticCurveTo(-21.4, -14, -19, -18);
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = PALETTE.blueDark;
  ctx.stroke();

  nablaInfinity(ctx, 1.5, 9.6, "#ffffff", mix(PALETTE.orange, COOL, 0.55));
}

/** Reviewer 2's red pen, nib at BOSS_PEN_TIP. */
function drawPen(ctx: Ctx, baseX: number, baseY: number) {
  const angle = Math.atan2(BOSS_PEN_TIP.y - baseY, BOSS_PEN_TIP.x - baseX);
  const length = Math.hypot(BOSS_PEN_TIP.x - baseX, BOSS_PEN_TIP.y - baseY);
  const t = tone(PALETTE.red, "#6e1f1f");
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(angle);
  // along +x: cap end at 0, nib tip at `length`
  const nib = new Path2D();
  nib.moveTo(length - 9, -3.4);
  nib.lineTo(length, 0);
  nib.lineTo(length - 9, 3.4);
  nib.closePath();
  celBody(ctx, nib, tone("#e9dcc6", PALETTE.ink), 1.2, 1.2);
  dot(ctx, length - 1.2, 0, 1.3, PALETTE.red);
  celBody(ctx, roundRectPath(0, -4, length - 8, 8, 3.4), t, 1.5, 2.2, (c) => {
    c.fillStyle = mix(PALETTE.red, COOL, 0.35);
    c.fillRect(length - 15, -5, 3, 10);
  });
  // clip
  ctx.strokeStyle = "#f4f1ea";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(4, -2.2);
  ctx.lineTo(16, -2.2);
  ctx.stroke();
  ctx.restore();
}

/** Reviewer 2: big, ink-dark, red rim, stern glasses, red pen, R2 badge. Score: 3. Confidence: 5. */
function drawBoss(ctx: Ctx, dir: number) {
  const r = ENEMY_RADIUS.boss;
  const t: Tone = { fill: PALETTE.ink, shade: "#1b1921", light: "#4a4753", line: "#7c2626" };
  celBody(ctx, circlePath(0, 0, r), t, 2, 7);
  // the red rim, lit at the top-left
  ctx.strokeStyle = PALETTE.red;
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.6, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = "#f08d7d";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.6, Math.PI * 1.08, Math.PI * 1.42);
  ctx.stroke();
  gloss(ctx, -24, -30, 9, 4.4, -0.75, 0.22);

  // bushy brows, inner ends low
  for (const s of [-1, 1]) {
    ctx.strokeStyle = PALETTE.paper;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(s * 33, -30);
    ctx.quadraticCurveTo(s * 21, -33, s * 8, -24);
    ctx.stroke();
  }
  // glasses: white lenses, heavy lids, gold frames
  for (const s of [-1, 1]) {
    const x = s * 18;
    const y = -7;
    const lr = 13;
    ctx.save();
    const lens = circlePath(x, y, lr);
    ctx.fillStyle = "#ffffff";
    ctx.fill(lens);
    ctx.clip(lens);
    ctx.fillStyle = "#dfe7f0";
    ctx.fill(crescent(lens, -2, -4), "evenodd");
    const px = x + dir * 5.2;
    dot(ctx, px, y + 1.6, 5.2, PALETTE.ink);
    dot(ctx, px - 1.8, y - 0.4, 1.7, "#ffffff");
    const outer = x + s * (lr + 2);
    const inner = x - s * (lr + 2);
    ctx.fillStyle = "#3b3743";
    ctx.beginPath();
    ctx.moveTo(outer, y - lr - 2);
    ctx.lineTo(inner, y - lr - 2);
    ctx.lineTo(inner, y - 4);
    ctx.lineTo(outer, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    stroke(ctx, lens, 4.6, "#8a6a1c");
    stroke(ctx, lens, 2.8, PALETTE.gold);
  }
  const frame = new Path2D();
  frame.moveTo(-5.2, -9);
  frame.quadraticCurveTo(0, -13, 5.2, -9);
  frame.moveTo(-31, -10);
  frame.lineTo(-44, -15);
  frame.moveTo(31, -10);
  frame.lineTo(44, -15);
  stroke(ctx, frame, 4.4, "#8a6a1c");
  stroke(ctx, frame, 2.6, PALETTE.gold);

  // small frown
  ctx.strokeStyle = PALETTE.paper;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-4, 21);
  ctx.quadraticCurveTo(3, 15, 10, 20);
  ctx.stroke();

  // conference badge: "R2", "Conf: 5"
  ctx.save();
  ctx.translate(-21, 30);
  ctx.rotate(-0.1);
  celBody(ctx, roundRectPath(-13, -8.5, 26, 18, 3), tone(PALETTE.paper, "#111111"), 1, 1.6);
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(-13, -8.5, 26, 4);
  label(ctx, "R2", 0, 0.4, 9.5, PALETTE.red, PALETTE.paper, 0);
  label(ctx, "Conf: 5", 0, 6.1, 4.6, PALETTE.ink, PALETTE.paper, 0);
  ctx.restore();

  // red pen held up on the right, with a little mitten
  drawPen(ctx, 49, 20);
  const hand = circlePath(53.5, 5.5, 7.2);
  celBody(ctx, hand, { ...t, line: PALETTE.red }, 1.8, 2.4);
  ctx.strokeStyle = "#5a5662";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(48.5, 3.4);
  ctx.lineTo(52.6, 2.4);
  ctx.moveTo(48.4, 7.2);
  ctx.lineTo(52.4, 6.6);
  ctx.stroke();
}

// ------------------------------------------------------------------ reviewer comments

const COMMENT_H = 22;

/** A reviewer comment: paper speech bubble, red pen text, a red "R" avatar dot. */
function drawComment(ctx: Ctx, text: string, w: number, size: number) {
  const h = COMMENT_H;
  const x0 = -w / 2;
  const x1 = w / 2;
  const y0 = -h / 2;
  const y1 = h / 2;
  const r = 8;
  const tail = x0 + r + 7;
  const shape = new Path2D();
  shape.moveTo(x0 + r, y0);
  shape.arcTo(x1, y0, x1, y1, r);
  shape.arcTo(x1, y1, x0, y1, r);
  shape.lineTo(tail, y1);
  shape.quadraticCurveTo(tail - 2, y1 + 4.5, x0 + 1, y1 + 7.5);
  shape.quadraticCurveTo(tail - 5, y1 + 2.5, tail - 6.5, y1);
  shape.arcTo(x0, y1, x0, y0, r);
  shape.arcTo(x0, y0, x1, y0, r);
  shape.closePath();
  celBody(ctx, shape, { fill: PALETTE.paper, shade: "#eee3cf", light: "#ffffff", line: PALETTE.ink }, 1.6, 2.6);
  label(ctx, text, 2, 0.2, size, PALETTE.red, PALETTE.paper, 0);
  // avatar dot on the corner
  dot(ctx, x0 + 2, y0 + 1, 5.6, PALETTE.paper);
  dot(ctx, x0 + 2, y0 + 1, 4.6, PALETTE.red);
  label(ctx, "R", x0 + 2, y0 + 1.1, 6, "#ffffff", PALETTE.red, 0);
}

// ------------------------------------------------------------------ player

/** The robot without pupils and antenna light (the game draws those). */
function drawPlayer(ctx: Ctx) {
  const t = tone(PALETTE.blue, PALETTE.blueDark);
  const dark = tone(PALETTE.blueDark, mix(PALETTE.blueDark, COOL, 0.45));
  for (const s of [-1, 1]) {
    celBody(ctx, roundRectPath(s * 7.5 - 4.5, 8, 9, 7.5, 3.2), dark, 1.3, 1.6);
    celBody(ctx, roundRectPath(s * 15.6 - 2.6, -8.5, 5.2, 8.5, 2.2), dark, 1.3, 1.2);
  }
  // antenna stalk up to the light
  const stalk = new Path2D();
  stalk.moveTo(0, -13);
  stalk.lineTo(PLAYER_ANTENNA_TIP.x, PLAYER_ANTENNA_TIP.y);
  stroke(ctx, stalk, 3.6, dark.line);
  stroke(ctx, stalk, 1.6, "#9fb3c7");
  celBody(ctx, roundRectPath(-3.6, -16.4, 7.2, 4, 1.6), dark, 1.2, 1);

  celBody(ctx, roundRectPath(-14, -14, 28, 26, 8), t, 1.6, 3.2);
  gloss(ctx, -9.6, -11, 2.6, 1.3, -0.5, 0.7);

  // empty visor, recessed: a soft shade along its top edge
  const v = PLAYER_VISOR;
  const visor = roundRectPath(v.x - v.w / 2, v.y - v.h / 2, v.w, v.h, 5);
  ctx.fillStyle = PALETTE.paper;
  ctx.fill(visor);
  ctx.save();
  ctx.clip(visor);
  ctx.fillStyle = "#e7dcc8";
  ctx.fill(crescent(visor, 0, 2.2), "evenodd");
  ctx.restore();
  stroke(ctx, visor, 1.5, PALETTE.blueDark);

  // ∇ on the chest
  const nabla = new Path2D();
  nabla.moveTo(-3.3, 4.6);
  nabla.lineTo(3.3, 4.6);
  nabla.lineTo(0, 9.8);
  nabla.closePath();
  stroke(ctx, nabla, 1.5, rgba(PALETTE.paper, 0.92));
}

// ------------------------------------------------------------------ pickups and projectiles

/** Citation token: a cut gem with a light table, darker pavilion and a white glint. */
function drawGem(ctx: Ctx, hw: number, hh: number, color: string) {
  const t = tone(color);
  const girdle = -hh * 0.3;
  const shape = new Path2D();
  shape.moveTo(-hw * 0.52, -hh);
  shape.lineTo(hw * 0.52, -hh);
  shape.lineTo(hw, girdle);
  shape.lineTo(0, hh);
  shape.lineTo(-hw, girdle);
  shape.closePath();
  celBody(ctx, shape, t, Math.max(1, hw * 0.2), hh * 0.25, (c) => {
    c.fillStyle = t.light;
    c.beginPath();
    c.moveTo(-hw * 0.52, -hh);
    c.lineTo(hw * 0.52, -hh);
    c.lineTo(hw * 0.25, girdle);
    c.lineTo(-hw * 0.25, girdle);
    c.closePath();
    c.fill();
    c.fillStyle = t.shade;
    c.beginPath();
    c.moveTo(hw * 0.25, girdle);
    c.lineTo(hw, girdle);
    c.lineTo(0, hh);
    c.closePath();
    c.fill();
  });
  dot(ctx, -hw * 0.45, girdle - hh * 0.15, hw * 0.22, "#ffffff");
}

/** Coffee: a paper mug with an orange band, dark coffee and curly steam. */
function drawCoffee(ctx: Ctx) {
  const steam = new Path2D();
  for (const x of [-4.4, -0.6, 3.2]) {
    steam.moveTo(x, -6.4);
    steam.bezierCurveTo(x - 2.2, -8.4, x + 2.2, -10, x, -12.4);
  }
  stroke(ctx, steam, 2.8, rgba(PALETTE.grey, 0.55));
  stroke(ctx, steam, 1.3, "#ffffff");

  const handle = new Path2D();
  handle.arc(6.6, 2.4, 3.6, -Math.PI / 2 - 0.5, Math.PI / 2 + 0.5);
  stroke(ctx, handle, 5.2, PALETTE.ink);
  stroke(ctx, handle, 2.2, PALETTE.paper);

  const mug = new Path2D();
  mug.moveTo(-8.4, -4.2);
  mug.lineTo(6.4, -4.2);
  mug.lineTo(5.6, 7.4);
  mug.quadraticCurveTo(5.4, 9.8, 2.8, 9.8);
  mug.lineTo(-4.8, 9.8);
  mug.quadraticCurveTo(-7.4, 9.8, -7.6, 7.4);
  mug.closePath();
  celBody(ctx, mug, { fill: PALETTE.paper, shade: "#e9dcc5", light: "#ffffff", line: PALETTE.ink }, 1.4, 2.4, (c) => {
    c.fillStyle = PALETTE.orange;
    c.fillRect(-9, 0.6, 16, 3.4);
  });
  ctx.fillStyle = PALETTE.paper;
  ctx.beginPath();
  ctx.ellipse(-1, -4.2, 7.4, 2.2, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = PALETTE.ink;
  ctx.stroke();
  ctx.fillStyle = "#6b4226";
  ctx.beginPath();
  ctx.ellipse(-1, -3.9, 5.8, 1.35, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#b07a4a";
  ctx.beginPath();
  ctx.ellipse(-2.4, -4.2, 2.2, 0.5, 0, 0, TAU);
  ctx.fill();
}

/** Magnet: the "viral thread" megaphone with sound lines. */
function drawMegaphone(ctx: Ctx) {
  ctx.save();
  ctx.translate(-1.5, 1);
  ctx.rotate(-0.32);
  const t = tone(PALETTE.red);
  celBody(ctx, roundRectPath(-4.8, 1.6, 3.2, 7, 1.3), tone(mix(PALETTE.red, COOL, 0.3)), 1.2, 1.2);
  celBody(ctx, roundRectPath(-10.6, -2.4, 4, 4.8, 1.2), tone("#5d5468"), 1.2, 1);
  const cone = new Path2D();
  cone.moveTo(-7.4, -2.8);
  cone.lineTo(3.6, -7.6);
  cone.lineTo(3.6, 7.6);
  cone.lineTo(-7.4, 2.8);
  cone.closePath();
  celBody(ctx, cone, t, 1.4, 2.2, (c) => {
    c.fillStyle = PALETTE.paper;
    c.fillRect(-2.6, -9, 2.2, 18);
  });
  const rim = new Path2D();
  rim.ellipse(4, 0, 2.4, 8, 0, 0, TAU);
  celBody(ctx, rim, tone(PALETTE.orange), 1.3, 1.2);
  ctx.fillStyle = mix(PALETTE.red, COOL, 0.45);
  ctx.beginPath();
  ctx.ellipse(4.5, 0, 1.2, 6, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = PALETTE.red;
  ctx.lineWidth = 1.7;
  for (const rr of [6.4, 9.6]) {
    ctx.beginPath();
    ctx.arc(4, 0, rr, -0.62, 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

/** Player bolt along +x: white-hot core, blue edges, soft halo. Anchor = head centre. */
function drawBolt(ctx: Ctx) {
  const drop = (len: number, r: number, x: number) => {
    const p = new Path2D();
    p.moveTo(x - len, 0);
    p.quadraticCurveTo(x - len * 0.45, -r, x, -r);
    p.arc(x, 0, r, -Math.PI / 2, Math.PI / 2);
    p.quadraticCurveTo(x - len * 0.45, r, x - len, 0);
    return p;
  };
  ctx.save();
  ctx.shadowColor = rgba(PALETTE.sky, 0.9);
  ctx.shadowBlur = 5 * ctx.getTransform().a;
  const outer = ctx.createLinearGradient(-14, 0, 4, 0);
  outer.addColorStop(0, rgba(PALETTE.sky, 0));
  outer.addColorStop(0.5, rgba(PALETTE.sky, 0.85));
  outer.addColorStop(1, PALETTE.blue);
  ctx.fillStyle = outer;
  ctx.fill(drop(14, 4, 0));
  ctx.restore();
  ctx.fillStyle = PALETTE.blueLight;
  ctx.fill(drop(10, 2.9, 0.4));
  const core = ctx.createLinearGradient(-9, 0, 2, 0);
  core.addColorStop(0, "rgba(255,255,255,0)");
  core.addColorStop(1, "#ffffff");
  ctx.fillStyle = core;
  ctx.fill(drop(9, 1.9, 0.8));
}

/** Reviewer 2's rejection token: red disc, white ✗, dark outline, faint red halo. */
function drawHostileBolt(ctx: Ctx) {
  const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, 9.5);
  halo.addColorStop(0, rgba(PALETTE.red, 0.45));
  halo.addColorStop(1, rgba(PALETTE.red, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-10, -10, 20, 20);
  celBody(ctx, circlePath(0, 0, 6.3), tone(PALETTE.red, "#4a1515"), 1.3, 1.8);
  gloss(ctx, -2.8, -3.4, 1.6, 0.8, -0.75, 0.7);
  const x = new Path2D();
  x.moveTo(-2.6, -2.6);
  x.lineTo(2.6, 2.6);
  x.moveTo(2.6, -2.6);
  x.lineTo(-2.6, 2.6);
  stroke(ctx, x, 2.3, "#ffffff");
}

/** DSV support vector: blue sphere, dashed white margin ring, centre dot. */
function drawOrb(ctx: Ctx) {
  const ring = circlePath(0, 0, 9.4);
  stroke(ctx, ring, 2.8, rgba(PALETTE.blueDark, 0.6));
  ctx.setLineDash([2.7, 2]);
  stroke(ctx, ring, 1.5, "#ffffff");
  ctx.setLineDash([]);
  celBody(ctx, circlePath(0, 0, 6.6), tone(PALETTE.blue, PALETTE.blueDark), 1.2, 2);
  gloss(ctx, -2.6, -3, 2, 1.1, -0.75);
  dot(ctx, 0, 0, 1.8, PALETTE.blueDark);
  dot(ctx, 0, 0, 1.2, "#ffffff");
}

/** Template anchor: an orange token with a white "[_]" skeleton glyph. */
function drawAnchor(ctx: Ctx) {
  const t = tone(PALETTE.orange);
  celBody(ctx, roundRectPath(-10, -10, 20, 20, 5.5), t, 1.5, 2.6);
  gloss(ctx, -5.6, -6.6, 2.4, 1.2, -0.6, 0.7);
  const glyph = new Path2D();
  glyph.moveTo(-4.6, -4.8);
  glyph.lineTo(-6.6, -4.8);
  glyph.lineTo(-6.6, 4.8);
  glyph.lineTo(-4.6, 4.8);
  glyph.moveTo(4.6, -4.8);
  glyph.lineTo(6.6, -4.8);
  glyph.lineTo(6.6, 4.8);
  glyph.lineTo(4.6, 4.8);
  glyph.moveTo(-2.4, 4.2);
  glyph.lineTo(2.4, 4.2);
  ctx.save();
  ctx.translate(0.4, 0.7);
  stroke(ctx, glyph, 2, t.line);
  ctx.restore();
  stroke(ctx, glyph, 2, "#ffffff");
}

/** Looped boomerang: a thick green loop arrow, readable while spinning. */
function drawBoomerang(ctx: Ctx) {
  const t = tone(PALETTE.green);
  const r = 8;
  const a0 = -Math.PI / 2 + 0.75;
  const a1 = -Math.PI / 2 - 0.3 + TAU;
  const arc = new Path2D();
  arc.arc(0, 0, r, a0, a1);
  const ex = Math.cos(a1) * r;
  const ey = Math.sin(a1) * r;
  const tx = -Math.sin(a1);
  const ty = Math.cos(a1);
  const nx = Math.cos(a1);
  const ny = Math.sin(a1);
  const head = new Path2D();
  head.moveTo(ex + tx * 5.2, ey + ty * 5.2);
  head.lineTo(ex + nx * 5.4 - tx * 0.6, ey + ny * 5.4 - ty * 0.6);
  head.lineTo(ex - nx * 5.4 - tx * 0.6, ey - ny * 5.4 - ty * 0.6);
  head.closePath();
  stroke(ctx, arc, 7.6, t.line);
  stroke(ctx, head, 2.8, t.line);
  stroke(ctx, arc, 4.8, t.fill);
  ctx.fillStyle = t.fill;
  ctx.fill(head);
  const lit = new Path2D();
  lit.arc(0, 0, r + 0.9, Math.PI * 0.95, Math.PI * 1.35);
  stroke(ctx, lit, 1.3, t.light);
  const dim = new Path2D();
  dim.arc(0, 0, r - 0.9, Math.PI * 0.05, Math.PI * 0.75);
  stroke(ctx, dim, 1.3, t.shade);
}

// ------------------------------------------------------------------ effects

/** Soft warm shadow, feathered to nothing at the canvas edge. */
function drawShadow(ctx: Ctx) {
  ctx.scale(1, 24 / 64);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
  for (let i = 0; i <= 8; i += 1) {
    const f = i / 8;
    g.addColorStop(f, rgba("#4a3826", 0.22 * (1 - f * f) ** 2));
  }
  ctx.fillStyle = g;
  ctx.fillRect(-32, -32, 64, 64);
}

/** Radial light for "lighter" blending: whitish tinted core, smooth falloff to fully transparent. */
function drawGlow(ctx: Ctx, color: string) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
  const core = mix(color, "#ffffff", 0.5);
  for (let i = 0; i <= 12; i += 1) {
    const f = i / 12;
    const a = 0.66 * Math.exp(-f * f * 2.2) * (1 - f * f) ** 2;
    g.addColorStop(f, rgba(f < 0.25 ? mix(core, color, f / 0.25) : color, Math.round(a * 1000) / 1000));
  }
  ctx.fillStyle = g;
  ctx.fillRect(-32, -32, 64, 64);
}

/** Four-point white star with a soft core. */
function drawSpark(ctx: Ctx) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -7.6);
  ctx.quadraticCurveTo(1, -1, 7.6, 0);
  ctx.quadraticCurveTo(1, 1, 0, 7.6);
  ctx.quadraticCurveTo(-1, 1, -7.6, 0);
  ctx.quadraticCurveTo(-1, -1, 0, -7.6);
  ctx.fill();
}

const GLOW_TINT: Record<GlowColor, string> = {
  blue: PALETTE.sky,
  cyan: PALETTE.blueLight,
  orange: PALETTE.orange,
  red: PALETTE.red,
  gold: PALETTE.gold,
  purple: PALETTE.purple,
  green: PALETTE.green,
  white: "#ffffff",
};

// ------------------------------------------------------------------ ground

const TILE = 512;
/** Ground tile resolution: calm, low-contrast art that does not need more. */
const TILE_PX_PER_UNIT = 1.5;

/**
 * The loss landscape as [fx, fy, amplitude, phase] waves. Integer frequencies
 * over the tile make it wrap seamlessly; most of the energy sits in the mid
 * frequencies (several hills per tile) so the 512-unit repeat is hard to spot.
 */
const LANDSCAPE = [
  [1, 0, 0.5, 0.4],
  [0, 1, 0.45, 2.1],
  [1, 1, 0.4, 4],
  [1, -1, 0.35, 1.2],
  [2, 1, 0.42, 5.2],
  [1, 2, 0.4, 0.7],
  [2, -1, 0.36, 3.4],
  [1, -2, 0.34, 2.8],
  [3, 1, 0.22, 2.5],
  [1, 3, 0.2, 4.6],
  [3, -2, 0.16, 0.9],
  [2, 3, 0.15, 5.9],
] as const;

/** Loss and its gradient (per world unit) at world position (x, y) on the tile. */
function lossAt(x: number, y: number) {
  let h = 0;
  let gx = 0;
  let gy = 0;
  for (const [fx, fy, amp, phase] of LANDSCAPE) {
    const a = (TAU * (fx * x + fy * y)) / TILE + phase;
    h += amp * Math.sin(a);
    const c = (amp * TAU * Math.cos(a)) / TILE;
    gx += fx * c;
    gy += fy * c;
  }
  return { h, gx, gy };
}

/** Deterministic PRNG so the ground is the same on every load. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Contour lines of the loss by marching squares, plus spots on index contours for labels. */
function contours(spacing: number, indexEvery: number) {
  // sampled one cell past each edge, so strokes run on across the seams
  const cells = 192;
  const step = TILE / cells;
  const side = cells + 3;
  const field = new Float32Array(side * side);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < side; j += 1) {
    for (let i = 0; i < side; i += 1) {
      const h = lossAt((i - 1) * step, (j - 1) * step).h;
      field[j * side + i] = h;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  const minor = new Path2D();
  const major = new Path2D();
  const spots: { x: number; y: number; level: number }[] = [];
  const along = (va: number, vb: number, level: number) => ((level - va) / (vb - va)) * step;
  const pts: number[] = [];
  for (let j = 0; j < side - 1; j += 1) {
    for (let i = 0; i < side - 1; i += 1) {
      const a = field[j * side + i]; // top-left, then clockwise
      const b = field[j * side + i + 1];
      const c = field[(j + 1) * side + i + 1];
      const d = field[(j + 1) * side + i];
      const x = (i - 1) * step;
      const y = (j - 1) * step;
      const top = Math.max(a, b, c, d);
      for (let k = Math.ceil(Math.min(a, b, c, d) / spacing); k * spacing < top; k += 1) {
        const level = k * spacing;
        pts.length = 0;
        if (a < level !== b < level) pts.push(x + along(a, b, level), y);
        if (b < level !== c < level) pts.push(x + step, y + along(b, c, level));
        if (d < level !== c < level) pts.push(x + along(d, c, level), y + step);
        if (a < level !== d < level) pts.push(x, y + along(a, d, level));
        const path = k % indexEvery === 0 ? major : minor;
        if (pts.length === 4) {
          path.moveTo(pts[0], pts[1]);
          path.lineTo(pts[2], pts[3]);
          if (path === major) spots.push({ x: (pts[0] + pts[2]) / 2, y: (pts[1] + pts[3]) / 2, level });
        } else if (pts.length === 8) {
          // saddle: the centre decides which corners the two lines cut off
          const pair = (a + b + c + d) / 4 < level === a < level ? [0, 2, 4, 6] : [0, 6, 2, 4];
          path.moveTo(pts[pair[0]], pts[pair[0] + 1]);
          path.lineTo(pts[pair[1]], pts[pair[1] + 1]);
          path.moveTo(pts[pair[2]], pts[pair[2] + 1]);
          path.lineTo(pts[pair[3]], pts[pair[3] + 1]);
        }
      }
    }
  }
  return { minor, major, spots, lo, hi };
}

/** Sand paper with grain, soft relief, loss-landscape contours (with topo-map loss labels) and a dot grid. */
function drawGround(): HTMLCanvasElement {
  const px = TILE * TILE_PX_PER_UNIT;
  const canvas = newCanvas(px, px);
  const ctx = canvas.getContext("2d")!;
  const sand = rgbOf(PALETTE.sand);
  const ink = "#96764a";

  // 1. very soft relief: hill-shade lit from the top-left plus a touch of
  //    height, computed coarse with a wrapped border and upscaled smoothly
  const n = 64;
  const coarse = newCanvas(n + 2, n + 2);
  const cctx = coarse.getContext("2d")!;
  const img = cctx.createImageData(n + 2, n + 2);
  for (let j = 0; j < n + 2; j += 1) {
    for (let i = 0; i < n + 2; i += 1) {
      const { h, gx, gy } = lossAt(((i - 0.5) * TILE) / n, ((j - 0.5) * TILE) / n);
      const k = Math.max(-1, Math.min(1, (-gx - gy) * 22 + h * 0.15));
      const o = (j * (n + 2) + i) * 4;
      img.data[o] = sand[0] + k * 6;
      img.data[o + 1] = sand[1] + k * 6;
      img.data[o + 2] = sand[2] + k * 5;
      img.data[o + 3] = 255;
    }
  }
  cctx.putImageData(img, 0, 0);
  const cell = px / n;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(coarse, -cell, -cell, (n + 2) * cell, (n + 2) * cell);

  // 2. paper grain: a small noise tile, repeated a whole number of times
  const grainSize = 96;
  const grain = newCanvas(grainSize, grainSize);
  const gctx = grain.getContext("2d")!;
  const noise = gctx.createImageData(grainSize, grainSize);
  const rand = mulberry32(37);
  for (let o = 0; o < noise.data.length; o += 4) {
    const v = rand() * 2 - 1;
    const light = v > 0;
    noise.data[o] = light ? 255 : 110;
    noise.data[o + 1] = light ? 255 : 86;
    noise.data[o + 2] = light ? 250 : 58;
    noise.data[o + 3] = Math.abs(v) ** 1.6 * (light ? 22 : 16);
  }
  gctx.putImageData(noise, 0, 0);
  ctx.fillStyle = ctx.createPattern(grain, "repeat")!;
  ctx.fillRect(0, 0, px, px);

  // 3. contours; index contours carry a few faint loss values, topo-map style,
  //    placed far apart on straight stretches away from the seams
  ctx.setTransform(TILE_PX_PER_UNIT, 0, 0, TILE_PX_PER_UNIT, 0, 0);
  const spacing = 0.3;
  const { minor, major, spots, lo, hi } = contours(spacing, 4);
  ctx.font = `italic bold 6.5px ${FONT}`;
  const labels: { x: number; y: number; angle: number; text: string; w: number }[] = [];
  const order = mulberry32(7);
  for (const spot of spots.map((s) => ({ s, key: order() })).sort((p, q) => p.key - q.key)) {
    const { x, y, level } = spot.s;
    if (labels.length === 5) break;
    if (x < 40 || y < 40 || x > TILE - 40 || y > TILE - 40) continue;
    if (labels.some((l) => Math.hypot(l.x - x, l.y - y) < 150)) continue;
    const { gx, gy } = lossAt(x, y);
    const angle = Math.atan2(gx, -gy); // along the contour
    const bend = (dx: number) => {
      const g = lossAt(x + Math.cos(angle) * dx, y + Math.sin(angle) * dx);
      return Math.abs(Math.atan2(g.gx, -g.gy) - angle) % Math.PI;
    };
    if (Math.min(bend(12), Math.PI - bend(12)) > 0.2 || Math.min(bend(-12), Math.PI - bend(-12)) > 0.2) continue;
    const text = (((level - lo) / (hi - lo)) * 2.4 + 0.05).toFixed(2);
    const upright = Math.cos(angle) < 0 ? angle + Math.PI : angle;
    labels.push({ x, y, angle: upright, text, w: ctx.measureText(text).width });
  }
  // lines stop short of each label, like on a printed map
  const gaps = new Path2D();
  gaps.rect(-8, -8, TILE + 16, TILE + 16);
  for (const l of labels) gaps.addPath(placed(roundRectPath(-l.w / 2 - 2.5, -4.5, l.w + 5, 9, 3), l.x, l.y, l.angle));
  ctx.save();
  ctx.clip(gaps, "evenodd");
  ctx.lineCap = "round";
  stroke(ctx, minor, 1.2, rgba(ink, 0.13));
  stroke(ctx, major, 1.6, rgba(ink, 0.2));

  // 4. the dot grid, every 32 units
  ctx.fillStyle = rgba(PALETTE.sandDark, 0.95);
  for (let y = 16; y < TILE; y += 32) {
    for (let x = 16; x < TILE; x += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = rgba(ink, 0.45);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const l of labels) {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.angle);
    ctx.fillText(l.text, 0, 0.3);
    ctx.restore();
  }
  return canvas;
}

// ------------------------------------------------------------------ sheet

export function createSprites(pixelRatio: number): SpriteSheet {
  const scale = Math.min(Math.max(pixelRatio, 1), 2) * 1.5;
  const sprite = (x0: number, y0: number, x1: number, y1: number, draw: (ctx: Ctx) => void) => paint(scale, x0, y0, x1, y1, draw);

  /** Right/left facings differ only in the pupils; the flash is the right one's silhouette. */
  const enemy = (draw: (ctx: Ctx, dir: number) => void, x0: number, y0: number, x1: number, y1: number, alpha = 1): EnemySprites => {
    const right = sprite(x0, y0, x1, y1, (ctx) => draw(ctx, 1));
    const left = sprite(x0, y0, x1, y1, (ctx) => draw(ctx, -1));
    const flash = silhouette(right);
    if (alpha < 1) {
      fade(right, alpha);
      fade(left, alpha);
    }
    return { right, left, flash };
  };

  const enemies: Record<Exclude<EnemyKind, "comment">, EnemySprites> = {
    nan: enemy(drawNan, -17, -16, 17, 18),
    overfit: enemy(drawOverfit, -16, -16, 16, 16),
    halluc: enemy(drawHalluc, -18, -18, 18, 18, 0.88),
    explode: enemy(drawExplode, -28, -36, 28, 28),
    boss: enemy(drawBoss, -55, -55, 78, 55),
  };

  // speech bubbles sized to their text
  const measure = newCanvas(1, 1).getContext("2d")!;
  const commentSprites = REVIEW_COMMENTS.map((text) => {
    measure.font = `bold 9px ${FONT}`;
    const tw = measure.measureText(text).width;
    const size = tw > 54 ? (9 * 54) / tw : 9;
    const w = Math.max(40, Math.min(72, Math.min(tw, 54) + 18));
    return sprite(-w / 2 - 6, -COMMENT_H / 2 - 7, w / 2 + 2.5, COMMENT_H / 2 + 10, (ctx) => drawComment(ctx, text, w, size));
  });

  const player = sprite(-19, -24, 19, 18, drawPlayer);

  return {
    enemies,
    comments: { sprites: commentSprites, flash: commentSprites.map((s) => silhouette(s)) },
    player: { body: player, flash: silhouette(player) },
    gem: {
      small: sprite(-7, -9, 7, 9, (ctx) => drawGem(ctx, 5, 7, PALETTE.sky)),
      big: sprite(-9, -11, 9, 11, (ctx) => drawGem(ctx, 7, 9, PALETTE.gold)),
    },
    pickups: {
      coffee: sprite(-12, -14, 13, 12, drawCoffee),
      magnet: sprite(-13, -13, 14, 13, drawMegaphone),
    },
    bolt: sprite(-17, -7, 8, 7, drawBolt),
    hostileBolt: sprite(-10, -10, 10, 10, drawHostileBolt),
    orb: sprite(-11.5, -11.5, 11.5, 11.5, drawOrb),
    anchor: sprite(-12, -12, 12, 12, drawAnchor),
    boomerang: sprite(-13, -13, 13, 13, drawBoomerang),
    shadow: sprite(-32, -12, 32, 12, drawShadow),
    glow: Object.fromEntries(
      (Object.keys(GLOW_TINT) as GlowColor[]).map((key) => [key, sprite(-32, -32, 32, 32, (ctx) => drawGlow(ctx, GLOW_TINT[key]))]),
    ) as Record<GlowColor, Sprite>,
    spark: sprite(-8, -8, 8, 8, drawSpark),
    groundTile: drawGround(),
    groundTileSize: TILE,
  };
}
