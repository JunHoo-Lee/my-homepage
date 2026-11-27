/*
 * STUB — replaced by the real procedurally drawn sprite sheet.
 * Contract: see SpriteSheet in ./contracts.ts.
 */
import { ENEMY_RADIUS, PALETTE, type EnemyKind, type GlowColor, type Sprite, type SpriteSheet } from "./contracts";
import { REVIEW_COMMENTS } from "./lore";

function makeSprite(w: number, h: number, ratio: number, draw: (ctx: CanvasRenderingContext2D) => void): Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * ratio);
  canvas.height = Math.ceil(h * ratio);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(ratio, ratio);
  ctx.translate(w / 2, h / 2);
  draw(ctx);
  return { canvas, w, h, ax: w / 2, ay: h / 2 };
}

const circle = (r: number, color: string) => (ctx: CanvasRenderingContext2D) => {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

const ENEMY_COLOR: Record<Exclude<EnemyKind, "comment">, string> = {
  nan: PALETTE.grey,
  overfit: PALETTE.red,
  halluc: PALETTE.purple,
  explode: PALETTE.orange,
  boss: PALETTE.ink,
};

export function createSprites(pixelRatio: number): SpriteSheet {
  const ratio = Math.min(Math.max(pixelRatio, 1), 2);
  const enemy = (kind: Exclude<EnemyKind, "comment">) => {
    const r = ENEMY_RADIUS[kind];
    const s = makeSprite(r * 2 + 4, r * 2 + 4, ratio, circle(r, ENEMY_COLOR[kind]));
    return { right: s, left: s, flash: makeSprite(r * 2 + 4, r * 2 + 4, ratio, circle(r, "#fff")) };
  };
  const glow = (color: string) => makeSprite(64, 64, ratio, circle(30, color));
  const glowColors: Record<GlowColor, string> = {
    blue: PALETTE.blue, cyan: PALETTE.blueLight, orange: PALETTE.orange, red: PALETTE.red,
    gold: PALETTE.gold, purple: PALETTE.purple, green: PALETTE.green, white: "#ffffff",
  };
  const tile = document.createElement("canvas");
  tile.width = 64;
  tile.height = 64;
  const tctx = tile.getContext("2d")!;
  tctx.fillStyle = PALETTE.sand;
  tctx.fillRect(0, 0, 64, 64);
  return {
    enemies: { nan: enemy("nan"), overfit: enemy("overfit"), halluc: enemy("halluc"), explode: enemy("explode"), boss: enemy("boss") },
    comments: {
      sprites: REVIEW_COMMENTS.map(() => makeSprite(40, 24, ratio, circle(12, PALETTE.paper))),
      flash: REVIEW_COMMENTS.map(() => makeSprite(40, 24, ratio, circle(12, "#fff"))),
    },
    player: { body: makeSprite(32, 32, ratio, circle(14, PALETTE.blue)), flash: makeSprite(32, 32, ratio, circle(14, "#fff")) },
    gem: { small: makeSprite(12, 12, ratio, circle(5, PALETTE.sky)), big: makeSprite(16, 16, ratio, circle(7, PALETTE.gold)) },
    pickups: { magnet: makeSprite(24, 24, ratio, circle(10, PALETTE.red)), coffee: makeSprite(24, 24, ratio, circle(10, PALETTE.orange)) },
    bolt: makeSprite(16, 8, ratio, circle(4, PALETTE.blue)),
    hostileBolt: makeSprite(16, 16, ratio, circle(7, PALETTE.red)),
    orb: makeSprite(22, 22, ratio, circle(9, PALETTE.blue)),
    anchor: makeSprite(24, 24, ratio, circle(11, PALETTE.orange)),
    boomerang: makeSprite(26, 26, ratio, circle(10, PALETTE.green)),
    shadow: makeSprite(64, 24, ratio, (ctx) => {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }),
    glow: Object.fromEntries((Object.keys(glowColors) as GlowColor[]).map((key) => [key, glow(glowColors[key])])) as Record<GlowColor, Sprite>,
    spark: makeSprite(16, 16, ratio, circle(3, "#fff")),
    groundTile: tile,
    groundTileSize: 64,
  };
}
