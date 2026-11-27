/*
 * The hidden chalk drawings of "What I Cannot Create".
 *
 * A drawing is one or more layers of chalk strokes, authored on a 1000 x 620
 * sheet and then fitted (uniformly scaled and centred) onto whatever board
 * the screen allows: wide on a laptop, tall on a phone held upright. The game
 * never shows the strokes directly: it rasterizes each layer once, samples
 * points from the ink, and uses those points as the "data manifold" the dust
 * has to reach. The crisp strokes are only faded in when a stage is finished.
 */

/** The authoring sheet, and the board of a landscape screen. */
export const BOARD_W = 1000;
export const BOARD_H = 620;

/** The board a stage is played on, in board units. */
export type Board = { w: number; h: number };

/** Chalk colours. Index 0 is white; drawings refer to colours by index. */
export const CHALK = ["#f4f1e6", "#f6d86b", "#f2a0b5", "#8fc7ee", "#a5d99a", "#f1a55f"] as const;
const WHITE = 0;
const YELLOW = 1;
const PINK = 2;
const BLUE = 3;
const GREEN = 4;
const ORANGE = 5;

export const HAND_FONT = '"Caveat", "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive';

export type DrawingId = "cat" | "scene" | "clock" | "banana" | "understand" | "feynman";

/** A tiny chalk-drawing API over a 2D context. Coordinates are board units. */
class Pen {
  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.color(WHITE).width(5);
  }

  color(index: number) {
    this.ctx.strokeStyle = CHALK[index];
    this.ctx.fillStyle = CHALK[index];
    return this;
  }

  width(w: number) {
    this.ctx.lineWidth = w;
    return this;
  }

  /** Open polyline through (x0, y0, x1, y1, ...). */
  line(...pts: number[]) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
    return this;
  }

  /** Closed outline. */
  loop(...pts: number[]) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.stroke();
    return this;
  }

  /** Filled polygon. */
  fill(...pts: number[]) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, from = 0, to = Math.PI * 2) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, from, to);
    ctx.stroke();
    return this;
  }

  dot(cx: number, cy: number, r: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    return this;
  }

  quad(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
    return this;
  }

  rect(x: number, y: number, w: number, h: number) {
    this.ctx.strokeRect(x, y, w, h);
    return this;
  }

  /** Handwritten text; shrinks to fit maxWidth. Returns the font size used. */
  text(value: string, x: number, y: number, size: number, align: CanvasTextAlign = "left", maxWidth = 0) {
    const { ctx } = this;
    let px = size;
    ctx.font = `700 ${px}px ${HAND_FONT}`;
    if (maxWidth > 0) {
      const measured = ctx.measureText(value).width;
      if (measured > maxWidth) {
        px = Math.floor((size * maxWidth) / measured);
        ctx.font = `700 ${px}px ${HAND_FONT}`;
      }
    }
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(value, x, y);
    return px;
  }
}

type Layer = {
  /** How many grains of dust this layer gets. */
  grains: number;
  draw(pen: Pen): void;
};

// ---------------------------------------------------------------- the drawings

const cat: Layer[] = [
  {
    grains: 2500,
    draw(p) {
      // head and ears
      p.color(WHITE).width(6);
      p.ellipse(500, 345, 172, 140, -0.72, Math.PI + 0.72);
      p.line(371, 253, 352, 122, 452, 214);
      p.line(629, 253, 648, 122, 548, 214);
      p.quad(452, 214, 500, 198, 548, 214);
      p.color(PINK).width(4);
      p.line(381, 226, 372, 165, 424, 213);
      p.line(619, 226, 628, 165, 576, 213);
      // forehead stripes
      p.color(ORANGE).width(5);
      p.line(474, 222, 480, 258).line(500, 216, 500, 262).line(526, 222, 520, 258);
      // eyes
      p.color(GREEN).width(5);
      p.ellipse(432, 322, 27, 31).ellipse(568, 322, 27, 31);
      p.color(WHITE).width(7);
      p.line(432, 302, 432, 342).line(568, 302, 568, 342);
      // nose and mouth
      p.color(PINK).width(5);
      p.loop(485, 372, 515, 372, 500, 390);
      p.color(WHITE).width(5);
      p.line(500, 390, 500, 404);
      p.ellipse(479, 404, 21, 19, 0, Math.PI).ellipse(521, 404, 21, 19, 0, Math.PI);
      // whiskers
      p.width(3);
      p.line(438, 392, 292, 366).line(436, 404, 286, 404).line(438, 416, 292, 442);
      p.line(562, 392, 708, 366).line(564, 404, 714, 404).line(562, 416, 708, 442);
    },
  },
];

const scene: Layer[] = [
  {
    grains: 3000,
    draw(p) {
      // ground
      p.color(GREEN).width(4).line(70, 505, 930, 505);
      // person, mid-throw
      p.color(WHITE).width(6);
      p.ellipse(262, 216, 31, 31);
      p.line(262, 247, 262, 382);
      p.line(262, 292, 204, 346).line(262, 292, 342, 236);
      p.line(262, 382, 218, 502).line(262, 382, 306, 502);
      // frisbee
      p.color(ORANGE).width(6).ellipse(522, 172, 44, 12);
      p.width(3).line(452, 170, 420, 172).line(456, 184, 430, 190);
      // dog
      p.color(WHITE).width(6);
      p.ellipse(742, 412, 86, 42);
      p.ellipse(846, 356, 33, 31);
      p.line(828, 332, 814, 292, 846, 324);
      p.ellipse(884, 366, 17, 12);
      p.dot(853, 348, 5);
      p.line(690, 446, 684, 502).line(716, 452, 712, 502).line(772, 452, 776, 502).line(798, 446, 804, 502);
      p.quad(660, 398, 628, 388, 620, 340);
      // the boxes a detector cannot help drawing
      p.color(YELLOW).width(3);
      p.rect(182, 170, 184, 344).rect(404, 146, 166, 56).rect(604, 278, 312, 236);
      p.text("person 0.99", 184, 160, 30);
      p.text("frisbee 0.91", 406, 136, 30);
      p.text("dog 0.98", 606, 268, 30);
    },
  },
];

const clock: Layer[] = [
  {
    grains: 2600,
    draw(p) {
      const cx = 500;
      const cy = 318;
      p.color(WHITE).width(7).ellipse(cx, cy, 214, 214);
      p.width(3).ellipse(cx, cy, 228, 228, -2.4, -0.75);
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const major = i % 3 === 0;
        const r0 = major ? 168 : 182;
        p.color(major ? YELLOW : WHITE).width(major ? 6 : 4);
        p.line(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * 198, cy - Math.cos(a) * 198);
      }
      p.color(YELLOW);
      p.text("12", cx, cy - 116, 52, "center");
      p.text("3", cx + 138, cy + 18, 52, "center");
      p.text("6", cx, cy + 152, 52, "center");
      p.text("9", cx - 138, cy + 18, 52, "center");
      // 10:10, like every watch advertisement
      const hour = ((10 + 10 / 60) / 12) * Math.PI * 2;
      const minute = (10 / 60) * Math.PI * 2;
      p.color(PINK).width(9).line(cx, cy, cx + Math.sin(hour) * 104, cy - Math.cos(hour) * 104);
      p.color(BLUE).width(6).line(cx, cy, cx + Math.sin(minute) * 158, cy - Math.cos(minute) * 158);
      p.color(WHITE).dot(cx, cy, 10);
    },
  },
];

const banana: Layer[] = [
  {
    grains: 2100,
    draw(p) {
      p.color(YELLOW).width(6);
      p.quad(265, 235, 470, 650, 775, 285);
      p.quad(285, 225, 500, 455, 760, 268);
      p.line(265, 235, 250, 204, 273, 195, 285, 225);
      p.line(775, 285, 782, 268, 760, 268);
      p.color(ORANGE).width(3).quad(276, 232, 486, 560, 768, 278);
      p.color(GREEN).width(4).line(253, 206, 270, 199);
    },
  },
  {
    // CLIP: "wearing sunglasses"
    grains: 520,
    draw(p) {
      p.color(BLUE);
      p.fill(338, 348, 402, 350, 400, 384, 388, 392, 350, 390, 338, 380);
      p.fill(414, 352, 478, 356, 476, 390, 464, 398, 426, 396, 414, 386);
      p.width(5).line(400, 360, 416, 362).line(338, 356, 296, 330);
      p.color(WHITE).width(3).line(350, 358, 366, 372).line(426, 362, 442, 376);
    },
  },
  {
    // CLIP: "duct-taped to a wall"
    grains: 620,
    draw(p) {
      p.color(WHITE).width(4);
      p.loop(581, 281, 671, 481, 629, 499, 539, 299);
      p.width(3);
      p.line(566, 308, 604, 292).line(584, 348, 622, 332).line(602, 388, 640, 372).line(620, 428, 658, 412).line(638, 466, 664, 455);
      p.color(PINK).text("$6.2M", 700, 540, 44);
      p.width(3).line(696, 552, 808, 548);
    },
  },
];

/** A small Feynman diagram, two electrons trading a photon, centred on (cx, cy). */
function feynmanDiagram(p: Pen, cx: number, cy: number) {
  p.color(BLUE).width(4);
  p.line(cx - 148, cy - 53, cx - 80, cy, cx - 148, cy + 53);
  p.line(cx + 148, cy - 53, cx + 80, cy, cx + 148, cy + 53);
  p.color(PINK).width(4);
  const wave: number[] = [];
  for (let i = 0; i <= 40; i += 1) wave.push(cx - 80 + i * 4, cy + Math.sin((i / 40) * Math.PI * 8) * 11);
  p.line(...wave);
  p.color(WHITE).dot(cx - 80, cy, 6).dot(cx + 80, cy, 6);
}

/** A sentence in two colours. Wide boards get two lines, tall boards four. */
function sentence(white: string[], yellow: string[], doodle: boolean): Layer[] {
  return [
    {
      grains: doodle ? 3300 : 3000,
      draw(p) {
        const lines = [...white, ...yellow];
        const wide = lines.length <= 2;
        const size = wide ? 124 : 150;
        const leading = wide ? 140 : 150;
        lines.forEach((line, index) => {
          p.color(index < white.length ? WHITE : YELLOW);
          p.text(line, 500, 232 + index * leading, size, "center", wide ? 880 : 600);
        });
        if (doodle) feynmanDiagram(p, 500, 232 + (lines.length - 1) * leading + 133);
      },
    },
  ];
}

const DRAWINGS: Record<DrawingId, Layer[]> = {
  cat,
  scene,
  clock,
  banana,
  understand: sentence(["What I understand,"], ["I can create."], true),
  feynman: sentence(["What I cannot create,"], ["I do not understand."], false),
};

/** The same sentences broken for a tall board. */
const TALL: Partial<Record<DrawingId, Layer[]>> = {
  understand: sentence(["What I", "understand,"], ["I can", "create."], true),
  feynman: sentence(["What I cannot", "create,"], ["I do not", "understand."], false),
};

function layersOf(id: DrawingId, board: Board) {
  return (board.w / board.h < 0.9 ? TALL[id] : undefined) ?? DRAWINGS[id];
}

// ---------------------------------------------------------------- sampling

export type Target = { x: number; y: number; color: number };

function paletteRgb() {
  return CHALK.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
}

export function layerCount(id: DrawingId) {
  return DRAWINGS[id].length;
}

type Fit = { k: number; x: number; y: number };
const fits = new Map<string, Fit>();

/** How to place a drawing on a board: scale k, then translate by (x, y). */
function fitFor(id: DrawingId, board: Board): Fit {
  const key = `${id}:${board.w}x${board.h}`;
  const cached = fits.get(key);
  if (cached) return cached;
  let fit: Fit = { k: 1, x: 0, y: 0 };
  // the ink's bounding box, all layers together so they stay registered
  const sheet = document.createElement("canvas");
  sheet.width = 1000;
  sheet.height = 1100;
  const ctx = sheet.getContext("2d", { willReadFrequently: true });
  if (ctx) {
    for (const layer of layersOf(id, board)) layer.draw(new Pen(ctx));
    const { data } = ctx.getImageData(0, 0, sheet.width, sheet.height);
    let x0 = sheet.width;
    let y0 = sheet.height;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < sheet.height; y += 2) {
      for (let x = 0; x < sheet.width; x += 2) {
        if (data[(y * sheet.width + x) * 4 + 3] < 60) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 > x0 && y1 > y0) {
      const side = 34;
      const top = 54;
      const bottom = 44;
      const k = Math.min((board.w - side * 2) / (x1 - x0), (board.h - top - bottom) / (y1 - y0), 1.25);
      fit = {
        k,
        x: (board.w - (x1 - x0) * k) / 2 - x0 * k,
        y: top + (board.h - top - bottom - (y1 - y0) * k) / 2 - y0 * k,
      };
    }
  }
  fits.set(key, fit);
  return fit;
}

/** Rasterize one layer on the board and pick ink points from it. `density` scales the grain count. */
export function sampleLayer(id: DrawingId, layerIndex: number, board: Board, density = 1, random: () => number = Math.random): Target[] {
  const layer = layersOf(id, board)[layerIndex];
  const fit = fitFor(id, board);
  const canvas = document.createElement("canvas");
  canvas.width = board.w;
  canvas.height = board.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.setTransform(fit.k, 0, 0, fit.k, fit.x, fit.y);
  layer.draw(new Pen(ctx));
  const { data } = ctx.getImageData(0, 0, board.w, board.h);
  const ink: number[] = [];
  for (let i = 3; i < data.length; i += 4) if (data[i] > 120) ink.push((i - 3) / 4);
  if (ink.length === 0) return [];

  const rgb = paletteRgb();
  const targets: Target[] = [];
  const grains = Math.max(1, Math.round(layer.grains * density));
  // a partial Fisher-Yates shuffle: distinct pixels while there are enough of them
  const distinct = Math.min(grains, ink.length);
  for (let n = 0; n < grains; n += 1) {
    let pixel: number;
    if (n < distinct) {
      const j = n + Math.floor(random() * (ink.length - n));
      pixel = ink[j];
      ink[j] = ink[n];
      ink[n] = pixel;
    } else {
      pixel = ink[Math.floor(random() * ink.length)];
    }
    const o = pixel * 4;
    let best = 0;
    let bestDistance = Infinity;
    for (let c = 0; c < rgb.length; c += 1) {
      const d = (data[o] - rgb[c][0]) ** 2 + (data[o + 1] - rgb[c][1]) ** 2 + (data[o + 2] - rgb[c][2]) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = c;
      }
    }
    targets.push({ x: (pixel % board.w) + random() - 0.5, y: Math.floor(pixel / board.w) + random() - 0.5, color: best });
  }
  return targets;
}

/** The crisp strokes of the first `layers` layers, for the reveal at the end of a stage. */
export function renderDrawing(id: DrawingId, layers: number, board: Board, scale: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(board.w * scale);
  canvas.height = Math.round(board.h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const fit = fitFor(id, board);
  const all = layersOf(id, board);
  ctx.setTransform(scale * fit.k, 0, 0, scale * fit.k, scale * fit.x, scale * fit.y);
  for (let i = 0; i < Math.min(layers, all.length); i += 1) all[i].draw(new Pen(ctx));
  return canvas;
}

/** Make sure the handwriting font is ready before text is rasterized. */
export async function loadChalkFont() {
  try {
    await Promise.all([document.fonts.load(`700 120px "Caveat"`), document.fonts.load(`400 24px "Caveat"`)]);
  } catch {
    /* fall back to the system's cursive font */
  }
}
