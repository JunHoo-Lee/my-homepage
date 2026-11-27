/*
 * Contracts shared by the Gradient Survivors modules:
 *
 *   audio.ts   procedural WebAudio sound effects + music      (AudioEngine)
 *   sprites.ts procedurally drawn sprite sheet / art assets   (SpriteSheet)
 *   icons.tsx  SVG icons for upgrade cards and UI controls    (CardIconId)
 *   game.ts    simulation + rendering, uses audio and sprites
 *   SurvivorsClient.tsx  React UI around the canvas
 *
 * Everything here is types only, so it is safe to import from server code.
 */

// ------------------------------------------------------------------ world

/**
 * nan / overfit / halluc / explode are ML bugs; "comment" is a reviewer comment
 * in a speech bubble (its text is REVIEW_COMMENTS[variant] from ./lore);
 * "boss" is Reviewer 2.
 */
export type EnemyKind = "nan" | "overfit" | "halluc" | "explode" | "comment" | "boss";

/** Collision/body radius of each enemy in world units (CSS px at zoom 1). */
export const ENEMY_RADIUS: Record<EnemyKind, number> = {
  nan: 13,
  overfit: 10,
  halluc: 16,
  explode: 24,
  comment: 16,
  boss: 50,
};

export type PickupKind = "magnet" | "coffee";

// ------------------------------------------------------------------ palette

/** The homepage palette. Every asset should be built from these. */
export const PALETTE = {
  sand: "#f3e9d8",
  sandDark: "#e0cfae",
  paper: "#fffdf8",
  ink: "#2b2b2b",
  blue: "#2673bd",
  blueDark: "#135d9f",
  blueLight: "#7fb4e6",
  sky: "#2f8fd8",
  orange: "#d77a2b",
  red: "#d64545",
  gold: "#e3b23c",
  purple: "#7a5bb5",
  green: "#4f9a6b",
  grey: "#8f9aa6",
} as const;

// ------------------------------------------------------------------ audio

export type SfxName =
  | "shoot" // gradient bolt fired (very frequent, must be soft)
  | "hit" // player projectile hits a bug (very frequent, tiny tick)
  | "crit" // critical hit
  | "kill" // a bug pops
  | "explode" // exploding-gradient bug blows up
  | "gem" // token picked up (pitch rises with the pickup chain)
  | "levelup" // level reached, cards about to show
  | "pick" // upgrade card chosen
  | "hover" // pointer/keyboard moves onto a card or button
  | "click" // generic UI button
  | "hurt" // player takes damage
  | "heartbeat" // low HP warning, about once per second
  | "beam" // attention beam
  | "shock" // SHOT shockwave
  | "boomerang" // looped boomerang thrown
  | "anchor" // template anchor dropped
  | "orb" // DSV support vector hits a bug
  | "zap" // dropout field tick
  | "bossWarn" // Reviewer 2 is about to arrive (siren)
  | "bossShot" // Reviewer 2 fires a ring of rejections
  | "bossHit" // Reviewer 2 takes damage
  | "bossDie" // Reviewer 2 defeated (big)
  | "revive" // ACRO rollback (rewind sweep)
  | "heal" // coffee / checkpoint heal
  | "magnet" // magnet pickup: every token flies to the player
  | "combo" // combo milestone
  | "talk" // one gibberish syllable of Reviewer 2 speaking (typewriter blips)
  | "stamp"; // the review decision stamp slams onto the results card

export type MusicMode = "off" | "title" | "run" | "boss" | "victory" | "defeat";

export type SfxOptions = {
  /** Playback-rate style multiplier, 1 = default. */
  pitch?: number;
  /** 0..1 extra gain multiplier. */
  volume?: number;
  /** -1 (left) .. 1 (right). */
  pan?: number;
};

export type AudioSettings = {
  muted: boolean;
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
};

export interface AudioEngine {
  /**
   * Create or resume the AudioContext. Browsers only allow this inside a user
   * gesture (click, keydown, pointerdown, touchend), so the UI calls it from
   * those handlers. Safe to call many times; never throws.
   */
  unlock(): void;
  /** True once an AudioContext is running. */
  readonly unlocked: boolean;
  /** Fire-and-forget sound effect. Throttled per name; never throws. */
  sfx(name: SfxName, opts?: SfxOptions): void;
  /** Switch the music track. "victory" and "defeat" are one-shot stingers. */
  setMusic(mode: MusicMode): void;
  /** 0..1 run intensity (time survived, swarm size); adds music layers. Cheap, call often. */
  setIntensity(value: number): void;
  setSettings(settings: Partial<AudioSettings>): void;
  getSettings(): AudioSettings;
  /** Pause / resume all audio (game paused, tab hidden). */
  suspend(): void;
  resume(): void;
  dispose(): void;
}

// ------------------------------------------------------------------ sprites

/**
 * A pre-rendered image. Sizes are in world units (CSS px at zoom 1); the
 * canvas itself is rendered at a higher pixel ratio for crisp output.
 * Draw centred on (x, y) with: ctx.drawImage(s.canvas, x - s.ax, y - s.ay, s.w, s.h)
 */
export type Sprite = {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
  /** Anchor (logical centre) measured from the sprite's top-left, world units. */
  ax: number;
  ay: number;
};

export type EnemySprites = {
  /** Eyes look right (+x). */
  right: Sprite;
  /** Eyes look left (-x). Labels stay readable (never mirrored text). */
  left: Sprite;
  /** Solid white silhouette with the same geometry and anchor, for hit flashes. */
  flash: Sprite;
};

export type GlowColor = "blue" | "cyan" | "orange" | "red" | "gold" | "purple" | "green" | "white";

export type SpriteSheet = {
  enemies: Record<Exclude<EnemyKind, "comment">, EnemySprites>;
  /**
   * Reviewer-comment speech bubbles, one per REVIEW_COMMENTS entry (same index).
   * Anchor = bubble body centre; text is baked in and never mirrored.
   */
  comments: { sprites: Sprite[]; flash: Sprite[] };
  player: {
    /**
     * The robot without pupils, ~30x30 body. Anchor = body centre.
     * Visor centre is PLAYER_VISOR (world units from the anchor); the game draws
     * the pupils and the blinking antenna light at PLAYER_ANTENNA_TIP.
     */
    body: Sprite;
    flash: Sprite;
  };
  gem: { small: Sprite; big: Sprite };
  pickups: Record<PickupKind, Sprite>;
  /** Player projectile pointing along +x; rotate to the velocity. */
  bolt: Sprite;
  /** Reviewer 2 projectile ("✗" rejection). */
  hostileBolt: Sprite;
  /** DSV support vector orbiting the player. */
  orb: Sprite;
  /** Template anchor token turret. */
  anchor: Sprite;
  /** Looped boomerang (spun by the game). */
  boomerang: Sprite;
  /** Soft dark ellipse, 64x24, centred; the game scales it per entity. */
  shadow: Sprite;
  /** Soft radial light, 64x64, for additive ("lighter") blending. */
  glow: Record<GlowColor, Sprite>;
  /** Small four-point white star, 16x16. */
  spark: Sprite;
  /** Seamless ground tile (draw with createPattern); see groundTileSize. */
  groundTile: HTMLCanvasElement;
  /** World units covered by one groundTile repeat. */
  groundTileSize: number;
};

/** Visor centre relative to the player body anchor (world units). */
export const PLAYER_VISOR = { x: 0, y: -4, w: 20, h: 12 } as const;
/** Where the game draws the blinking antenna light (world units from anchor). */
export const PLAYER_ANTENNA_TIP = { x: 0, y: -22 } as const;

// ------------------------------------------------------------------ icons

export type CardIconId =
  | "gradient"
  | "dsv"
  | "dropout"
  | "attention"
  | "shot"
  | "looped"
  | "anchors"
  | "adam"
  | "decay"
  | "context"
  | "mixed"
  | "anyway"
  | "acro"
  | "csf"
  | "rhd"
  | "dsf"
  | "robotuse"
  | "reworld"
  | "checkpoint";
