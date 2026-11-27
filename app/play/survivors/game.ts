/*
 * Gradient Survivors: a small survivors-like (move, auto-attack, pick 1 of N
 * upgrade cards on level up, outlast Reviewer 2). Plain 2D canvas, no deps.
 *
 * The story (every string lives in ./lore): you are a tiny model under peer
 * review. Sanity is HP, citations are XP, the h-index is the level, the timer
 * counts down to the AoE deadline and Reviewer 2 is assigned at 2:30.
 *
 * World units are CSS pixels. Two clocks drive the game:
 *   sim time   update(dt) in fixed sub-steps. Slow motion and the debug speed
 *              scale it; hit-stop, level-ups and pause freeze it.
 *   real time  present(dt): screen shake, zoom punch, camera, screen flashes.
 * draw() only reads state; see "RENDER STATE" inside createGame().
 *
 * createGame() starts in attract mode, a silent self-playing demo behind the
 * title screen that fires no callbacks. restart() starts a real run.
 */

import {
  ENEMY_RADIUS,
  PALETTE,
  PLAYER_ANTENNA_TIP,
  PLAYER_VISOR,
  type AudioEngine,
  type EnemyKind,
  type MusicMode,
  type PickupKind,
  type SfxName,
  type SfxOptions,
  type Sprite,
  type SpriteSheet,
} from "./contracts";
import { REVIEW_COMMENTS, REVIEWER2_DEFEATED, REVIEWER2_ENRAGED, REVIEWER2_QUOTES, TOASTS } from "./lore";
import { BOSS_PEN_TIP, FUSE_TIP, createSprites } from "./sprites";

// ------------------------------------------------------------------ public API

export type PaperLink = { label: string; href: string };

export type CardDef = {
  id: string;
  name: string;
  kind: "weapon" | "passive";
  maxLevel: number;
  icon: string;
  paper?: string; // key into paperLinks
  describe: (nextLevel: number) => string;
};

export type Card = {
  id: string;
  name: string;
  icon: string;
  kind: "weapon" | "passive";
  level: number; // level after picking
  maxLevel: number;
  text: string;
  paper?: PaperLink;
};

export type Hud = {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  time: number;
  kills: number;
  /** Reviewer 2 while on the field; `enraged` is phase 2 (below half HP). */
  boss: { hp: number; maxHp: number; enraged?: boolean } | null;
  revives: number;
  /** Current kill combo (kills chained within a short window), 0 when idle. */
  combo: number;
  /** Seconds (0..1) left before the combo drops. */
  comboTime?: number;
};

export type Grade = "Oral" | "Accept" | "Borderline" | "Reject" | "DeskReject";

export type RunResult = {
  grade: Grade;
  time: number;
  kills: number;
  level: number;
  bossDefeated: boolean;
  build: Card[];
  /** Longest kill combo of the run. */
  maxCombo: number;
  /** Times the player took damage. */
  hitsTaken: number;
};

export type GameCallbacks = {
  onHud: (hud: Hud) => void;
  onLevelUp: (cards: Card[]) => void;
  onEnd: (result: RunResult) => void;
  onToast: (message: string) => void;
  onAutoPause: () => void;
  /** Fired a few seconds before Reviewer 2 spawns, so the UI can show a warning. */
  onBossWarning: () => void;
};

export type GameOptions = {
  audio: AudioEngine;
  /** prefers-reduced-motion: no screen shake, softer flashes. */
  reducedMotion: boolean;
};

export type GameHandle = {
  setMove: (x: number, y: number) => void;
  choose: (cardId: string) => void;
  setPaused: (paused: boolean) => void;
  restart: () => void;
  dispose: () => void;
};

export const RUN_LENGTH = 300;
export const BOSS_TIME = 150;

export const CARDS: CardDef[] = [
  {
    id: "gradient",
    name: "Gradient Bolt",
    kind: "weapon",
    maxLevel: 5,
    icon: "∇",
    describe: (l) => (l === 1 ? "Fires bolts at the nearest bug." : `+damage, faster fire${l % 2 === 0 ? ", +1 bolt" : ""}`),
  },
  {
    id: "dsv",
    name: "Deep Support Vectors",
    kind: "weapon",
    maxLevel: 5,
    icon: "◉",
    paper: "dsv",
    describe: (l) => (l === 1 ? "The decisive samples orbit you and hit what they touch." : "+1 support vector, +damage"),
  },
  {
    id: "dropout",
    name: "Dropout Field",
    kind: "weapon",
    maxLevel: 5,
    icon: "◌",
    describe: (l) => (l === 1 ? "A field that randomly zaps nearby bugs." : "+radius, +damage"),
  },
  {
    id: "attention",
    name: "Attention Beam",
    kind: "weapon",
    maxLevel: 5,
    icon: "⟶",
    describe: (l) => (l === 1 ? "A piercing beam that attends to the nearest bug." : "+damage, wider, more often"),
  },
  {
    id: "shot",
    name: "SHOT Shockwave",
    kind: "weapon",
    maxLevel: 5,
    icon: "◎",
    paper: "shot",
    describe: (l) => (l === 1 ? "Flattens the landscape: a ring that hits and pushes bugs away." : "+range, +damage, more often"),
  },
  {
    id: "looped",
    name: "Looped Boomerang",
    kind: "weapon",
    maxLevel: 5,
    icon: "↻",
    describe: (l) => (l === 1 ? "Its output comes back as its input. Hits on the way out and back." : `+damage${l % 2 === 1 ? ", +1 boomerang" : ""}`),
  },
  {
    id: "anchors",
    name: "Template Anchors",
    kind: "weapon",
    maxLevel: 5,
    icon: "⚓",
    paper: "template-infilling",
    describe: (l) => (l === 1 ? "Drops anchor tokens that fill in the gaps by shooting." : "anchors last longer and drop more often"),
  },
  {
    id: "adam",
    name: "Adam Momentum",
    kind: "passive",
    maxLevel: 4,
    icon: "»",
    describe: () => "+12% move speed",
  },
  {
    id: "decay",
    name: "Weight Decay",
    kind: "passive",
    maxLevel: 4,
    icon: "♥",
    describe: () => "+25 max sanity and restore 25",
  },
  {
    id: "context",
    name: "Longer Context",
    kind: "passive",
    maxLevel: 3,
    icon: "⌖",
    describe: () => "+45% token pickup range",
  },
  {
    id: "mixed",
    name: "Mixed Precision",
    kind: "passive",
    maxLevel: 4,
    icon: "⚡",
    describe: () => "-9% weapon cooldowns",
  },
  {
    id: "anyway",
    name: "Any-Way Meta-Learning",
    kind: "passive",
    maxLevel: 1,
    icon: "✦",
    paper: "any-way-meta-learning",
    describe: () => "Learn from any number of ways: see 4 cards per level-up",
  },
  {
    id: "acro",
    name: "ACRO Rollback",
    kind: "passive",
    maxLevel: 1,
    icon: "⟲",
    paper: "acro",
    describe: () => "On a fatal hit, retract 3 seconds and resume with half sanity",
  },
];

const HEAL_CARD: CardDef = {
  id: "checkpoint",
  name: "Restore Checkpoint",
  kind: "passive",
  maxLevel: 999,
  icon: "✚",
  describe: () => "Restore 40% sanity",
};

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ tuning

/** Base stats per kind; hp and speed grow with run time (see makeEnemy). Colours feed the death pops. */
const ENEMY: Record<EnemyKind, { hp: number; speed: number; dmg: number; xp: number; color: string }> = {
  nan: { hp: 4, speed: 52, dmg: 8, xp: 1, color: PALETTE.grey },
  overfit: { hp: 3, speed: 96, dmg: 6, xp: 1, color: PALETTE.red },
  halluc: { hp: 11, speed: 62, dmg: 10, xp: 2, color: PALETTE.purple },
  explode: { hp: 42, speed: 38, dmg: 18, xp: 6, color: PALETTE.orange },
  comment: { hp: 9, speed: 70, dmg: 9, xp: 2, color: PALETTE.paper },
  boss: { hp: 1500, speed: 58, dmg: 24, xp: 0, color: PALETTE.ink },
};

/** "kill" sfx pitch per kind: small bugs pop higher. */
const KILL_PITCH: Record<EnemyKind, number> = { overfit: 1.25, nan: 1, comment: 1.1, halluc: 0.9, explode: 0.8, boss: 0.6 };
/** Speed of each kind's animation phase (halluc weaves and comments sway with it). */
const PHASE_RATE: Record<EnemyKind, number> = { nan: 5, overfit: 8, halluc: 3, explode: 6, comment: 2.2, boss: 2 };
const CONFETTI = [PALETTE.blue, PALETTE.orange, PALETTE.red, PALETTE.gold, PALETTE.purple, PALETTE.green, PALETTE.sky];

const BASE_HP = 100;
const BASE_SPEED = 170;
const BASE_PICKUP = 120;
const PLAYER_R = 14;
const MAX_ENEMY_R = ENEMY_RADIUS.boss;
const MAX_ENEMIES = 420;
const ATTRACT_ENEMIES = 40;
const MAX_STEP = 1 / 30;
const MAX_PARTICLES = 900;
const MAX_RINGS = 80;
const MAX_TEXTS = 80;
const MAX_GEMS = 450;
/** Enemies fade and scale in over this many seconds. */
const SPAWN_IN = 0.25;
const CRIT_CHANCE = 0.08;
const COMBO_WINDOW = 1;
const COMBO_MILESTONES = [25, 50, 100, 200];
const COFFEE_CHANCE = 0.012;
const MAX_COFFEE = 2;
const MAGNET_DROP_CHANCE = 0.15;
const MAGNET_TIMES = [90, 210];
const PICKUP_LIFE = 30;
const BLAST_R = 70;
const CHAIN_DELAY = 0.09;
const WAVE_TIME = 0.38;
const BOSS_WARNING = 4;
const BOSS_ENTRANCE = 0.8;
const TYPE_RATE = 28;
const DESK_REJECT_TIME = 30;
const LEVELUP_FREEZE = 0.12;
const LEVELUP_PUSH_R = 190;
const HITSTOP_CAP = 0.3;
const TRAUMA_DECAY = 1.6;
const PUNCH_TIME = 0.15;
const VICTORY_BEAT = 1;
const DEATH_BEAT = 0.6;
/** Lifetime of Reviewer 2's rejections (draw() fades them in as they leave its body). */
const BOSS_SHOT_LIFE = 4;

const TAU = Math.PI * 2;
const FONT = '"Helvetica Neue", Arial, sans-serif';
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3;
const easeOutBack = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;

// ------------------------------------------------------------------ entities

type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  /** Knockback velocity; decays quickly. */
  vx: number;
  vy: number;
  /** Total velocity of the last step (steering + knockback). */
  mx: number;
  my: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  /** REVIEW_COMMENTS index for comments, 0 otherwise. */
  variant: number;
  age: number;
  flash: number;
  squash: number;
  face: number;
  phase: number;
  /** Boss only: seconds left of the drop-in; untouchable while > 0. */
  entrance: number;
  orbCd: number;
  boomCd: number;
  waveId: number;
};

type BulletSource = "bolt" | "anchor" | "boss";
type Bullet = { src: BulletSource; x: number; y: number; vx: number; vy: number; dmg: number; r: number; life: number; pierce: number; hostile: boolean };
type Gem = { x: number; y: number; vx: number; vy: number; value: number; pulled: boolean; magnet: boolean; phase: number; age: number };
type Pickup = { kind: PickupKind; x: number; y: number; age: number; phase: number; pulled: boolean };
type ParticleKind = "debris" | "spark" | "dust" | "sparkle" | "confetti" | "heal" | "smoke" | "resolved";
type Particle = {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
  drag: number;
  gravity: number;
};
type RingKind = "pop" | "blast" | "levelup" | "victory" | "impact" | "enrage" | "volley" | "boss" | "revive" | "pickup" | "summon";
type Ring = { kind: RingKind; x: number; y: number; r0: number; r1: number; t: number; dur: number; color: string; width: number };
type FloatText = { x: number; y: number; vy: number; text: string; life: number; max: number; color: string; size: number; crit: boolean };
type Boomerang = { x: number; y: number; dx: number; dy: number; dist: number; returning: boolean; dmg: number; angle: number };
type Anchor = { x: number; y: number; age: number; life: number; fireCd: number; dmg: number };
type Wave = { id: number; x: number; y: number; t: number; maxR: number; dmg: number };
type Beam = { x1: number; y1: number; x2: number; y2: number; width: number; life: number; max: number };
type Blast = { x: number; y: number; dmg: number; delay: number };
type DamageSource = "bolt" | "orb" | "dropout" | "beam" | "wave" | "boomerang" | "blast";
type BossPhase = "none" | "warning" | "entering" | "fight" | "enraged" | "defeated";
type Mode = "attract" | "run";
/** How draw() places an enemy this frame: anchor, height above the ground, rotation, scale, alpha, squash pivot. */
type Pose = { x: number; y: number; lift: number; rot: number; sx: number; sy: number; alpha: number; pivot: number };

// Sounds that can trigger many times per step play at most once per step.
const ONCE_PER_STEP = new Set<SfxName>(["hit", "crit", "kill", "orb", "gem", "bossHit", "talk", "explode"]);

export function createGame(
  canvas: HTMLCanvasElement,
  paperLinks: Record<string, PaperLink>,
  callbacks: GameCallbacks,
  options: GameOptions,
): GameHandle {
  const ctx = canvas.getContext("2d")!;
  const audio = options.audio;
  let width = 0;
  let height = 0;
  let dpr = 1;
  // Render caches, baked lazily by draw(): the sprite sheet and its derived art (dropped only
  // when the pixel ratio changes) and the screen-sized vignettes (dropped on every resize).
  let art: Art | null = null;
  let screenArt: ScreenArt | null = null;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (ratio !== dpr) art = null;
    dpr = ratio;
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    screenArt = null;
  };
  resize();
  window.addEventListener("resize", resize);

  // Zoom out a little on small screens so there is room to dodge.
  const baseZoom = () => (Math.min(width, height) < 560 ? 0.78 : 1);
  const spawnRadius = () => Math.hypot(width, height) / 2 / baseZoom() + 60;

  // ---------------------------------------------------------- state
  let mode: Mode = "attract";
  let t = 0; // run time: seconds into the review period
  let clock = 0; // animation clock: sim seconds since reset, keeps going in every phase
  let nextId = 1;
  let paused = false;
  let ended = false;
  let choosing = false;
  let levelUpDelay = 0; // real seconds of level-up freeze left before onLevelUp
  let offeredCards: Card[] = [];
  let pendingLevelUps = 0;
  let move = { x: 0, y: 0 };
  let spawnTimer = 0;
  let hudTimer = 0;
  let heartTimer = 0;
  let waveCounter = 0;
  let bossDefeated = false;
  let oneMinuteToasted = false;
  let magnetDrops = 0;
  let deathTime = -1;
  let lastResult: RunResult | null = null;

  let level = 1;
  let xp = 0;
  let kills = 0;
  let combo = 0;
  let comboTimer = 0;
  let maxCombo = 0;
  let hitsTaken = 0;
  let gemChain = 0;
  let lastGemAt = -1;
  let critStopCd = 0;
  const levels: Record<string, number> = {};
  const cooldowns: Record<string, number> = {};

  const player = { x: 0, y: 0, vx: 0, vy: 0, hp: BASE_HP, maxHp: BASE_HP, speed: BASE_SPEED, iframes: 0, faceX: 1, faceY: 0, pickup: BASE_PICKUP, revives: 0 };
  const anim = { moving: 0, bob: 0, squash: 0, lean: 0, dust: 0, hurt: 0, blink: 0, blinkIn: 3, lowSanity: false };
  const autopilot = { heading: 0, mx: 0, my: 0 };
  const history: { x: number; y: number }[] = [];
  let historyTimer = 0;

  const enemies: Enemy[] = [];
  const bullets: Bullet[] = [];
  const gems: Gem[] = [];
  const pickups: Pickup[] = [];
  const particles: Particle[] = [];
  const particlePool: Particle[] = [];
  let evictAt = 0;
  const rings: Ring[] = [];
  const texts: FloatText[] = [];
  const boomerangs: Boomerang[] = [];
  const anchors: Anchor[] = [];
  const waves: Wave[] = [];
  const beams: Beam[] = [];
  const blasts: Blast[] = [];
  let detonating = false;
  let orbAngle = 0;
  let auraTick = 0;
  let auraPulse = 0;

  const boss = { phase: "none" as BossPhase, enemy: null as Enemy | null, warn: 0, fireCd: 0, summonCd: 0, volleys: 0 };
  const speech = { text: "", shown: 0, age: 0, hold: 0, gap: 0, x: 0, y: 0, visible: false, final: false, last: -1 };

  let hitStop = 0;
  let timeScale = 1;
  const slowMo = { from: 1, t: 0, dur: 0 };
  let trauma = 0;
  let shakeClock = 0;
  const cam = { x: 0, y: 0, zoom: 1, leadX: 0, leadY: 0, punch: 0, shakeX: 0, shakeY: 0, shakeRot: 0 };
  const screenFlash = { color: "#ffffff", alpha: 0, decay: 1 };
  let victory = 0;
  let dying = 0;

  let debugSpeed = 1;
  let godMode = false;

  /*
   * RENDER STATE (read by draw())
   *
   * draw() runs every animation frame, also while paused, during a level-up
   * and after the run ended, and only reads what is listed here. World units
   * are CSS px. Use `clock` (sim seconds, frozen by pause and hit-stop) for
   * idle animation so everything freezes together on impact.
   *
   * Global
   *   mode            "attract": title-screen demo (autopilot, invulnerable, no HUD); "run": a real run
   *   t               run time 0..RUN_LENGTH (BOSS_TIME = Reviewer 2 lands); clock: animation clock
   *   paused, choosing, ended
   *   hitStop         > 0 while the simulation is frozen on an impact (real seconds left)
   *   timeScale       slow-motion factor of the current frame (1 = normal speed)
   *   victory         > 0 during the deadline celebration (slow-mo + confetti) before the decision
   *   dying           > 0 during the death beat; the player has popped (deathTime >= 0 stays set)
   *   levels          card id -> level; weapons are drawn only when their level is > 0
   *   combo           live kill combo (the HUD shows it; optional world flourish)
   *   levelUpDelay    > 0 during the level-up freeze before the cards show (with `choosing`: cards are up)
   *
   * Camera (cam), resolved by present() just before draw()
   *   x, y            world point at the screen centre (player + look-ahead lead)
   *   zoom            CSS px per world unit (base zoom x zoom punch)
   *   shakeX, shakeY  screen-space shake offset in CSS px; shakeRot: radians around the screen
   *                   centre (all 0 with reducedMotion or in attract mode)
   *   leadX, leadY    the look-ahead offset; punch: seconds left of the zoom punch
   *   shakeClock      real seconds; keeps running while the simulation is frozen
   *
   * Screen
   *   screenFlash     { color, alpha }: full-screen tint, alpha already halved for reducedMotion
   *                   (white level-up, red hurt, gold boss defeat)
   *   boss.phase "warning" with boss.warn (seconds until Reviewer 2 lands): pulse the screen edges
   *   anim.lowSanity  sanity < 30%: heartbeat vignette; heartTimer: real seconds to the next
   *                   heartbeat sound (0.9 s period), to pulse in sync
   *
   * Player (player, anim)
   *   player.x/y, vx/vy, faceX/faceY (unit vector of the last move), hp/maxHp
   *   player.iframes  > 0: invulnerable after a hit; blink;  player.revives: ACRO charges left
   *   anim.moving     0..1 eased "is walking";  anim.bob: walk-cycle phase in radians
   *   anim.squash     1 -> 0 after a sharp turn (squash and stretch)
   *   anim.lean       -1..1 eased horizontal velocity (tilt into the run)
   *   anim.hurt       seconds left of the red hurt tint;  anim.blink: > 0 while the eyes are shut
   *   dust puffs are particles of kind "dust"
   *   history         recent positions, one per 0.1 s, the last 4 s (the path ACRO rolls back along)
   *
   * Enemies (enemies[]; all alive)
   *   kind, x, y, r (= ENEMY_RADIUS), hp/maxHp, face (+1 moving right, -1 left)
   *   id              stable per enemy (seed for per-entity variation)
   *   variant         REVIEW_COMMENTS index of a "comment" speech bubble
   *   age             seconds since spawn; spawn-in = min(1, age / SPAWN_IN) for scale and alpha
   *   flash           > 0: draw the white hit silhouette
   *   squash          1 -> 0 over 0.12 s after a hit
   *   mx, my          current velocity (tilt, motion lines)
   *   phase           animation phase; comments tilt by sin(phase) * 0.12, halluc weaves with it
   *   entrance        boss only: seconds left of the drop-in (fall from above, shadow growing)
   *
   * Reviewer 2 (boss, speech)
   *   boss.phase      "none" | "warning" | "entering" | "fight" | "enraged" | "defeated"
   *   boss.enemy      the live boss (also in enemies[]) or null;  boss.warn: see Screen
   *   boss.fireCd     seconds to the next ring volley (a wind-up tell when it is below ~0.4)
   *   speech.visible  a bubble is up;  speech.text: the whole line (size the bubble to it)
   *   speech.shown    typewriter: characters revealed so far;  speech.age: seconds since it started
   *   speech.x/y      anchor: top of the boss, or the death position when speech.final
   *   speech.final    the REVIEWER2_DEFEATED line, which outlives the boss
   *
   * Weapons and projectiles
   *   bullets[]       src "bolt" (player, blue) | "anchor" (anchor turret) | "boss" (hostile ✗);
   *                   x, y, vx, vy (rotate to it), r, life (seconds left; fade the last 0.3 s;
   *                   hostile shots start at BOSS_SHOT_LIFE)
   *   beams[]         attention beam segments; fade with life / max
   *   waves[]         SHOT shockwaves; radius = (t / WAVE_TIME) * maxR
   *   boomerangs[]    x, y, angle (spin);  anchors[]: x, y, age, life (fade in the last 0.5 s)
   *   orbAngle        DSV support vectors: see dsvOrb(i) / dsvCount()
   *   dropoutRadius() and auraPulse (1 -> 0 after each dropout tick)
   *
   * Loot
   *   gems[]          tokens: x, y, value (>= 3 is a gold "big" token), phase (twinkle), age (pop-in),
   *                   pulled (flying to the player), vx/vy (trail direction while pulled)
   *   pickups[]       kind "coffee" | "magnet" (viral thread), x, y, age, phase; blink when
   *                   PICKUP_LIFE - age < 5
   *
   * Effects
   *   particles[]     kind "debris" (chunk in the enemy colour), "spark" (white additive streak
   *                   along vx/vy), "dust" (soft puff), "sparkle" (4-point star in its colour),
   *                   "confetti" (spinning paper, rot), "heal" (green plus, floats up), "smoke",
   *                   "resolved" (green ✓ rising from an addressed reviewer comment);
   *                   plus x, y, life/max (fade), size, color, rot
   *   rings[]         kind "pop" (death) | "blast" (exploding gradient) | "levelup" (pushback) |
   *                   "victory" (deadline) | "impact" (boss landing) | "enrage" | "volley" (boss
   *                   muzzle) | "boss" (defeat) | "revive" | "pickup" | "summon"; plus color, width;
   *                   radius = lerp(r0, r1, easeOutCubic(t / dur)), alpha 1 - t / dur; t < 0 means
   *                   it has not started yet
   *   texts[]         damage numbers: text, crit (draw bigger), color, size, life/max
   */

  const xpFor = (l: number) => Math.floor(2 + l * 2.6 + Math.pow(l, 1.5));
  const xpNext = () => xpFor(level + pendingLevelUps);
  const lvl = (id: string) => levels[id] ?? 0;
  const cdScale = () => Math.pow(0.91, lvl("mixed"));
  const dsvCount = () => 1 + lvl("dsv");
  const dsvRadius = () => 62 + lvl("dsv") * 7;
  const dropoutRadius = () => 56 + lvl("dropout") * 13;
  const orbPos = { x: 0, y: 0 };
  /** Position of DSV support vector i (written into orbPos to avoid allocating). */
  const dsvOrb = (i: number) => {
    const a = orbAngle + (i * TAU) / dsvCount();
    orbPos.x = player.x + Math.cos(a) * dsvRadius();
    orbPos.y = player.y + Math.sin(a) * dsvRadius();
    return orbPos;
  };

  // ---------------------------------------------------------- feedback
  const playedThisStep = new Set<SfxName>();
  const sfx = (name: SfxName, opts?: SfxOptions) => {
    if (mode !== "run") return;
    if (ONCE_PER_STEP.has(name)) {
      if (playedThisStep.has(name)) return;
      playedThisStep.add(name);
    }
    audio.sfx(name, opts);
  };
  /** Stereo position of a world x coordinate relative to the view. */
  const panAt = (x: number) => clamp(((x - cam.x) * cam.zoom) / (width / 2 || 1), -1, 1) * 0.6;
  const music = (next: MusicMode) => {
    if (mode === "run") audio.setMusic(next);
  };
  const toast = (message: string) => {
    if (mode === "run") callbacks.onToast(message);
  };
  const addTrauma = (amount: number) => {
    if (mode === "run") trauma = Math.min(1, trauma + amount);
  };
  /** Hit-stop: freeze the simulation for a moment of real time (never more than HITSTOP_CAP queued). */
  const freeze = (seconds: number) => {
    if (mode === "run") hitStop = Math.min(HITSTOP_CAP, hitStop + seconds);
  };
  /** Hit-stop for impacts that can repeat within a step (blasts, crit kills): they do not stack. */
  const freezeAtLeast = (seconds: number) => {
    if (mode === "run") hitStop = Math.min(HITSTOP_CAP, Math.max(hitStop, seconds));
  };
  const flashScreen = (color: string, alpha: number, duration: number) => {
    const a = alpha * (options.reducedMotion ? 0.5 : 1);
    if (mode !== "run" || a < screenFlash.alpha) return;
    screenFlash.color = color;
    screenFlash.alpha = a;
    screenFlash.decay = a / duration;
  };
  const punchZoom = () => {
    if (mode === "run" && !options.reducedMotion) cam.punch = PUNCH_TIME;
  };
  const slowMotion = (from: number, duration: number) => {
    slowMo.from = from;
    slowMo.t = 0;
    slowMo.dur = duration;
    timeScale = from;
  };

  const newParticle = (): Particle => ({ kind: "debris", x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, color: "", rot: 0, vrot: 0, drag: 0, gravity: 0 });
  /** Spawns a pooled particle. At the cap it is dropped, unless `force` recycles a live one. */
  const spawnParticle = (kind: ParticleKind, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, drag = 3, gravity = 0, force = false) => {
    let p: Particle;
    if (particles.length < MAX_PARTICLES) {
      p = particlePool.pop() ?? newParticle();
      particles.push(p);
    } else if (force) {
      evictAt = (evictAt + 1) % particles.length;
      p = particles[evictAt];
    } else return;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.size = size;
    p.color = color;
    p.rot = Math.random() * TAU;
    p.vrot = rand(-9, 9);
    p.drag = drag;
    p.gravity = gravity;
  };
  const burst = (kind: ParticleKind, x: number, y: number, count: number, speed: number, size: number, color: string, life = 0.5, drag = 3, gravity = 0) => {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * TAU;
      const s = speed * rand(0.35, 1);
      spawnParticle(kind, x, y, Math.cos(a) * s, Math.sin(a) * s, life * rand(0.6, 1.2), size * rand(0.7, 1.3), color, drag, gravity);
    }
  };
  /** Paper confetti shot upwards from (x, y); never dropped at the particle cap. */
  const confetti = (x: number, y: number, count: number, power: number) => {
    for (let i = 0; i < count; i += 1) {
      const a = -Math.PI / 2 + rand(-1.25, 1.25);
      const s = power * rand(0.35, 1);
      spawnParticle("confetti", x, y, Math.cos(a) * s, Math.sin(a) * s, rand(1.6, 2.6), rand(4, 7), CONFETTI[i % CONFETTI.length], 1.6, 260, true);
    }
  };
  const ring = (kind: RingKind, x: number, y: number, r0: number, r1: number, dur: number, color: string, lineWidth: number, delay = 0) => {
    if (rings.length >= MAX_RINGS) return;
    rings.push({ kind, x, y, r0, r1, t: -delay, dur, color, width: lineWidth });
  };
  const floatText = (x: number, y: number, text: string, color: string, size: number, crit = false) => {
    if (texts.length >= MAX_TEXTS) texts.shift();
    const life = crit ? 0.85 : 0.7;
    texts.push({ x: x + rand(-6, 6), y, vy: crit ? -70 : -42, text, life, max: life, color, size, crit });
  };
  const hitSpark = (x: number, y: number, dx: number, dy: number) => {
    const back = Math.atan2(-dy, -dx);
    for (let k = 0; k < 2; k += 1) {
      const a = back + rand(-0.9, 0.9);
      const s = rand(120, 240);
      spawnParticle("spark", x, y, Math.cos(a) * s, Math.sin(a) * s, 0.18, 2, "#ffffff", 6);
    }
  };

  // ---------------------------------------------------------- cards
  const toCard = (def: CardDef): Card => {
    const next = lvl(def.id) + 1;
    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      kind: def.kind,
      level: next,
      maxLevel: def.maxLevel,
      text: def.describe(next),
      paper: def.paper ? paperLinks[def.paper] : undefined,
    };
  };

  const rollCards = (): Card[] => {
    const weaponsHeld = CARDS.filter((def) => def.kind === "weapon" && lvl(def.id) > 0).length;
    const pool = CARDS.filter((def) => {
      if (lvl(def.id) >= def.maxLevel) return false;
      // Cap the arsenal at 5 weapons so upgrades keep showing up.
      if (def.kind === "weapon" && lvl(def.id) === 0 && weaponsHeld >= 5) return false;
      return true;
    });
    const count = lvl("anyway") ? 4 : 3;
    const picks: CardDef[] = [];
    const bag = [...pool];
    while (picks.length < count && bag.length) {
      // Paper cards are a little more likely, so people actually see them.
      const weights = bag.map((def) => (def.paper ? 1.5 : 1) * (lvl(def.id) > 0 ? 1.2 : 1));
      const total = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * total;
      let index = 0;
      while (roll > weights[index]) {
        roll -= weights[index];
        index += 1;
      }
      picks.push(bag[index]);
      bag.splice(index, 1);
    }
    if (!picks.length) picks.push(HEAL_CARD);
    return picks.map(toCard);
  };

  const build = (): Card[] =>
    CARDS.filter((def) => lvl(def.id) > 0).map((def) => ({
      ...toCard(def),
      level: lvl(def.id),
      text: def.describe(1),
    }));

  /** Derived player stats come from the card levels, so setting a level directly stays consistent. */
  const recomputeStats = () => {
    player.speed = BASE_SPEED * Math.pow(1.12, lvl("adam"));
    player.pickup = BASE_PICKUP * Math.pow(1.45, lvl("context"));
    player.maxHp = BASE_HP + 25 * lvl("decay");
    player.hp = Math.min(player.hp, player.maxHp);
  };

  const heal = (amount: number) => {
    const before = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + amount);
    floatText(player.x, player.y - 26, `+${Math.round(player.hp - before)}`, PALETTE.green, 15);
    burst("heal", player.x, player.y, 8, 70, 7, PALETTE.green, 0.8, 2, -40);
    ring("pickup", player.x, player.y, 10, 60, 0.4, PALETTE.green, 3);
    sfx("heal");
  };

  const applyCard = (id: string) => {
    if (id === HEAL_CARD.id) {
      heal(player.maxHp * 0.4);
      return;
    }
    levels[id] = lvl(id) + 1;
    recomputeStats();
    if (id === "decay") player.hp = Math.min(player.maxHp, player.hp + 25);
    if (id === "acro") player.revives += 1;
  };

  const pushHud = () => {
    if (mode !== "run") return;
    const b = boss.enemy;
    callbacks.onHud({
      hp: Math.max(0, Math.ceil(player.hp)),
      maxHp: player.maxHp,
      xp,
      xpNext: xpNext(),
      level,
      time: Math.min(t, RUN_LENGTH),
      kills,
      boss: b ? { hp: Math.max(0, b.hp), maxHp: b.maxHp, enraged: boss.phase === "enraged" } : null,
      revives: player.revives,
      combo,
      comboTime: combo > 0 ? comboTimer : 0,
    });
  };

  // ---------------------------------------------------------- spatial grid
  // A dense grid centred on the player, rebuilt every step. Enemies outside it
  // are clamped into the border cells, which keeps queries correct there.
  const CELL = 48;
  const GRID_N = 68;
  const cellHead = new Int32Array(GRID_N * GRID_N);
  let cellNext = new Int32Array(1024);
  let gridX0 = 0;
  let gridY0 = 0;
  const cellOf = (v: number, origin: number) => {
    const c = Math.floor((v - origin) / CELL);
    return c < 0 ? 0 : c >= GRID_N ? GRID_N - 1 : c;
  };
  const rebuildGrid = () => {
    gridX0 = player.x - (GRID_N / 2) * CELL;
    gridY0 = player.y - (GRID_N / 2) * CELL;
    cellHead.fill(-1);
    if (cellNext.length < enemies.length) cellNext = new Int32Array(enemies.length * 2);
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      const c = cellOf(e.y, gridY0) * GRID_N + cellOf(e.x, gridX0);
      cellNext[i] = cellHead[c];
      cellHead[c] = i;
    }
  };
  const hitBuf: Enemy[] = [];
  /** Live, touchable enemies whose cells overlap the square around (x, y); fills and returns `out`. */
  const nearby = (x: number, y: number, r: number, out: Enemy[]) => {
    out.length = 0;
    const reach = r + MAX_ENEMY_R;
    const x0 = cellOf(x - reach, gridX0);
    const x1 = cellOf(x + reach, gridX0);
    const y0 = cellOf(y - reach, gridY0);
    const y1 = cellOf(y + reach, gridY0);
    for (let cy = y0; cy <= y1; cy += 1) {
      for (let cx = x0; cx <= x1; cx += 1) {
        for (let i = cellHead[cy * GRID_N + cx]; i !== -1; i = cellNext[i]) {
          const e = enemies[i];
          if (e.hp > 0 && e.entrance <= 0) out.push(e);
        }
      }
    }
    return out;
  };

  const nearestEnemy = (x: number, y: number, maxDist = Infinity) => {
    let best: Enemy | null = null;
    let bestD = maxDist * maxDist;
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      if (e.hp <= 0 || e.entrance > 0) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  };

  // ---------------------------------------------------------- spawning
  const makeEnemy = (kind: EnemyKind, x: number, y: number): Enemy => {
    const def = ENEMY[kind];
    const scaled = mode === "run" && kind !== "boss";
    const hp = def.hp * (scaled ? 1 + t / 95 : 1);
    return {
      id: nextId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      mx: 0,
      my: 0,
      r: ENEMY_RADIUS[kind],
      hp,
      maxHp: hp,
      speed: def.speed * (scaled ? 1 + Math.min(t / 600, 0.35) : 1),
      dmg: def.dmg,
      xp: def.xp,
      variant: kind === "comment" ? Math.floor(Math.random() * REVIEW_COMMENTS.length) : 0,
      age: 0,
      flash: 0,
      squash: 0,
      face: x < player.x ? 1 : -1,
      phase: Math.random() * TAU,
      entrance: 0,
      orbCd: 0,
      boomCd: 0,
      waveId: -1,
    };
  };

  const spawnAtEdge = (kind: EnemyKind) => {
    const radius = spawnRadius();
    const a = Math.random() * TAU;
    enemies.push(makeEnemy(kind, player.x + Math.cos(a) * radius, player.y + Math.sin(a) * radius));
  };

  /** Stragglers left far behind come back at the edge ahead of the player instead of vanishing. */
  const relocate = (e: Enemy) => {
    const moving = Math.hypot(player.vx, player.vy) > 1;
    const a = moving ? Math.atan2(player.vy, player.vx) + rand(-1.1, 1.1) : Math.random() * TAU;
    const radius = spawnRadius();
    e.x = player.x + Math.cos(a) * radius;
    e.y = player.y + Math.sin(a) * radius;
    e.vx = 0;
    e.vy = 0;
    e.age = 0;
  };

  const rollKind = (): EnemyKind => {
    // Reviewer comments join at 0:35 and make up a fifth of the swarm after 1:00.
    const commentShare = t < 35 ? 0 : Math.min(0.2, 0.06 + ((t - 35) / 25) * 0.14);
    if (Math.random() < commentShare) return "comment";
    const roll = Math.random();
    if (t > 95 && roll > 0.93) return "explode";
    if (t > 55 && roll > 0.72) return "halluc";
    if (t > 20 && roll < 0.35) return "overfit";
    return "nan";
  };

  const spawnRun = (dt: number) => {
    spawnTimer -= dt;
    if (spawnTimer > 0 || enemies.length >= MAX_ENEMIES) return;
    // Pressure ramps to the boss; the third bug per wave waits until 3:00 so the two spikes do not
    // stack, then another joins every 40 s until the deadline.
    spawnTimer = Math.max(0.3, 1.0 - t / 190);
    const batch = t < 180 ? 1 + Math.floor(t / 90) : 3 + Math.floor((t - 180) / 40);
    for (let i = 0; i < batch; i += 1) spawnAtEdge(rollKind());
  };

  const spawnAttract = (dt: number) => {
    spawnTimer -= dt;
    if (spawnTimer > 0 || enemies.length >= ATTRACT_ENEMIES) return;
    spawnTimer = 0.35;
    const roll = Math.random();
    spawnAtEdge(roll < 0.3 ? "nan" : roll < 0.5 ? "overfit" : roll < 0.66 ? "halluc" : roll < 0.94 ? "comment" : "explode");
  };

  const dropGem = (x: number, y: number, value: number) => {
    gems.push({ x, y, vx: 0, vy: 0, value, pulled: false, magnet: false, phase: Math.random() * TAU, age: 0 });
    // Over the cap the oldest token merges into the next one, so no citation is lost.
    if (gems.length > MAX_GEMS) {
      gems[1].value += gems[0].value;
      gems.shift();
    }
  };

  const dropPickup = (kind: PickupKind, x: number, y: number) => {
    pickups.push({ kind, x, y, age: 0, phase: Math.random() * TAU, pulled: false });
    ring("pickup", x, y, 4, 34, 0.35, kind === "coffee" ? PALETTE.orange : PALETTE.red, 2);
  };

  const dropNearPlayer = (kind: PickupKind) => {
    const a = Math.random() * TAU;
    const d = rand(170, 230);
    dropPickup(kind, player.x + Math.cos(a) * d, player.y + Math.sin(a) * d);
  };

  // ---------------------------------------------------------- combat
  const countCombo = () => {
    combo = comboTimer > 0 ? combo + 1 : 1;
    comboTimer = COMBO_WINDOW;
    if (combo > maxCombo) maxCombo = combo;
    if (COMBO_MILESTONES.includes(combo)) {
      toast(TOASTS.combo[combo]);
      sfx("combo");
    }
  };

  const popEnemy = (e: Enemy) => {
    const size = e.r / ENEMY_RADIUS.nan;
    const color = e.kind === "comment" ? PALETTE.grey : ENEMY[e.kind].color;
    ring("pop", e.x, e.y, e.r * 0.5, e.r * 2 + 10, 0.3, color, 2 + size * 1.5);
    burst("debris", e.x, e.y, Math.round(4 + size * 4), 130 + size * 60, 3 + size, color, 0.45);
    burst("spark", e.x, e.y, 2 + Math.round(size * 2), 230, 2, "#ffffff", 0.25, 5);
    // A reviewer comment, addressed: a green ✓ rises from it (purely visual).
    if (e.kind === "comment") spawnParticle("resolved", e.x, e.y - 10, 0, -70, 0.8, 1, PALETTE.green, 2.2);
  };

  const queueBlast = (x: number, y: number, dmg: number) => {
    blasts.push({ x, y, dmg, delay: detonating ? CHAIN_DELAY : 0 });
  };

  const kill = (e: Enemy, crit: boolean) => {
    e.hp = 0;
    kills += 1;
    if (mode === "run") countCombo();
    if (e === boss.enemy) {
      defeatBoss(e);
      return;
    }
    popEnemy(e);
    if (e.kind === "explode") {
      queueBlast(e.x, e.y, 12 + e.maxHp * 0.15);
      if (mode === "run" && Math.random() < MAGNET_DROP_CHANCE) dropPickup("magnet", e.x, e.y);
    } else {
      sfx("kill", { pitch: KILL_PITCH[e.kind], pan: panAt(e.x) });
    }
    // A crit that kills gets a tiny freeze; rate-limited so big fights do not stutter.
    if (crit && critStopCd <= 0) {
      freezeAtLeast(0.03);
      critStopCd = 0.6;
    }
    dropGem(e.x, e.y, e.xp);
    if (mode === "run" && Math.random() < COFFEE_CHANCE && pickups.filter((p) => p.kind === "coffee").length < MAX_COFFEE) {
      dropPickup("coffee", e.x, e.y);
    }
  };

  const damage = (e: Enemy, amount: number, kx: number, ky: number, source: DamageSource) => {
    if (e.hp <= 0 || e.entrance > 0) return;
    const crit = source !== "dropout" && source !== "blast" && Math.random() < CRIT_CHANCE;
    const dealt = crit ? amount * 2 : amount;
    const isBoss = e === boss.enemy;
    e.hp -= dealt;
    e.flash = 0.08;
    e.squash = 1;
    const knock = isBoss ? 0.15 : crit ? 1.6 : 1;
    e.vx += kx * knock;
    e.vy += ky * knock;
    floatText(e.x, e.y - e.r, String(Math.round(dealt)), crit ? PALETTE.red : isBoss ? PALETTE.orange : PALETTE.ink, crit ? 18 : dealt >= 10 ? 15 : 12, crit);
    if (source === "bolt") sfx(crit ? "crit" : "hit", { pan: panAt(e.x) });
    else if (source === "orb") sfx("orb", { pan: panAt(e.x) });
    else if (crit) sfx("crit", { pan: panAt(e.x) });
    if (isBoss) sfx("bossHit", { pan: panAt(e.x) });
    if (e.hp <= 0) kill(e, crit);
  };

  const detonate = (b: Blast) => {
    const hits = nearby(b.x, b.y, BLAST_R, hitBuf);
    for (let i = 0; i < hits.length; i += 1) {
      const e = hits[i];
      const dx = e.x - b.x;
      const dy = e.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < BLAST_R + e.r) damage(e, b.dmg, (dx / d) * 380, (dy / d) * 380, "blast");
    }
    ring("blast", b.x, b.y, 12, BLAST_R + 20, 0.35, PALETTE.orange, 8);
    ring("blast", b.x, b.y, 4, BLAST_R * 0.7, 0.22, PALETTE.gold, 4);
    burst("debris", b.x, b.y, 14, 280, 4, PALETTE.orange, 0.5);
    burst("spark", b.x, b.y, 6, 320, 2.5, "#ffffff", 0.3, 5);
    burst("smoke", b.x, b.y, 5, 70, 14, PALETTE.ink, 0.7, 2.5, -20);
    // The player never takes blast damage, but feels it.
    const dist = Math.hypot(b.x - player.x, b.y - player.y);
    const near = clamp(1.2 - dist / 450, 0.15, 1);
    addTrauma(0.25 * near);
    if (dist < spawnRadius()) freezeAtLeast(0.08); // only for blasts the player can see
    sfx("explode", { pan: panAt(b.x), volume: clamp(1.2 - dist / 700, 0.35, 1) });
  };

  const updateBlasts = (dt: number) => {
    detonating = true;
    const due = blasts.length;
    let n = 0;
    for (let i = 0; i < due; i += 1) {
      const b = blasts[i];
      b.delay -= dt;
      if (b.delay <= 0) detonate(b);
      else blasts[n++] = b;
    }
    // Chain reactions queued while detonating wait for their own delay.
    for (let i = due; i < blasts.length; i += 1) blasts[n++] = blasts[i];
    blasts.length = n;
    detonating = false;
  };

  // ---------------------------------------------------------- player fate
  const rollback = () => {
    player.revives -= 1;
    // ACRO: physically retract along the recent trajectory and resume.
    const back = history[Math.max(0, history.length - 30)] ?? player;
    ring("revive", player.x, player.y, 46, 4, 0.35, PALETTE.blue, 3);
    player.x = back.x;
    player.y = back.y;
    player.hp = player.maxHp * 0.5;
    player.iframes = 2;
    for (const e of enemies) {
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d < 220 && e !== boss.enemy) {
        e.vx += ((e.x - player.x) / (d || 1)) * 600;
        e.vy += ((e.y - player.y) / (d || 1)) * 600;
      }
    }
    ring("revive", player.x, player.y, 10, 240, 0.5, PALETTE.blue, 5);
    burst("sparkle", player.x, player.y, 30, 300, 4, PALETTE.blueLight, 0.6);
    flashScreen("#ffffff", 0.45, 0.35);
    sfx("revive");
    toast(TOASTS.revive);
  };

  const die = () => {
    player.hp = 0;
    deathTime = t;
    dying = DEATH_BEAT;
    slowMotion(0.25, DEATH_BEAT);
    ring("pop", player.x, player.y, 10, 90, 0.5, PALETTE.blue, 5);
    burst("debris", player.x, player.y, 24, 260, 4, PALETTE.blue, 0.7);
    burst("spark", player.x, player.y, 10, 320, 2.5, "#ffffff", 0.4, 5);
    addTrauma(0.5);
  };

  const hurtPlayer = (amount: number) => {
    if (mode !== "run" || godMode || player.iframes > 0 || ended || victory > 0 || dying > 0) return;
    player.hp -= amount;
    player.iframes = 0.45;
    anim.hurt = 0.3;
    hitsTaken += 1;
    freeze(0.05);
    addTrauma(0.35);
    flashScreen(PALETTE.red, 0.28, 0.25);
    sfx("hurt");
    floatText(player.x, player.y - 24, `-${Math.round(amount)}`, PALETTE.red, 15);
    burst("debris", player.x, player.y, 6, 160, 3, PALETTE.red, 0.35);
    if (player.hp > 0) return;
    if (player.revives > 0) rollback();
    else die();
  };

  const finish = () => {
    if (ended || mode !== "run") return;
    ended = true;
    victory = 0;
    dying = 0;
    const died = deathTime >= 0;
    const time = died ? Math.min(deathTime, RUN_LENGTH) : RUN_LENGTH;
    const grade: Grade = !died ? (bossDefeated ? "Oral" : "Accept") : time < DESK_REJECT_TIME ? "DeskReject" : time >= BOSS_TIME ? "Borderline" : "Reject";
    pushHud();
    music(grade === "Oral" || grade === "Accept" ? "victory" : "defeat");
    lastResult = { grade, time, kills, level, bossDefeated, build: build(), maxCombo, hitsTaken };
    callbacks.onEnd(lastResult);
  };

  const startVictory = () => {
    t = RUN_LENGTH;
    victory = VICTORY_BEAT;
    slowMotion(0.3, VICTORY_BEAT);
    confetti(player.x - 140, player.y + 80, 60, 560);
    confetti(player.x + 140, player.y + 80, 60, 560);
    ring("victory", player.x, player.y, 20, 260, 0.7, PALETTE.gold, 6);
    flashScreen("#ffffff", 0.35, 0.4);
  };

  const startLevelUp = () => {
    pendingLevelUps -= 1;
    level += 1;
    choosing = true;
    offeredCards = rollCards();
    levelUpDelay = LEVELUP_FREEZE;
    burst("sparkle", player.x, player.y, 26, 320, 4, PALETTE.blueLight, 0.6);
    burst("spark", player.x, player.y, 10, 380, 2.5, "#ffffff", 0.35, 5);
    ring("levelup", player.x, player.y, 16, LEVELUP_PUSH_R, 0.45, PALETTE.blue, 6);
    // Shove the crowd back about 150 px (no damage) so the player gets a breather.
    for (const e of enemies) {
      if (e === boss.enemy || e.hp <= 0) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > LEVELUP_PUSH_R) continue;
      const push = 590 * (1 - (d / LEVELUP_PUSH_R) * 0.5);
      e.vx += (dx / d) * push;
      e.vy += (dy / d) * push;
    }
    flashScreen("#ffffff", 0.5, 0.25);
    addTrauma(0.15);
    punchZoom();
    sfx("levelup");
  };

  // ---------------------------------------------------------- Reviewer 2
  const pickQuote = () => {
    const pool: readonly string[] = boss.phase === "enraged" ? REVIEWER2_ENRAGED : REVIEWER2_QUOTES;
    let i = Math.floor(Math.random() * pool.length);
    // No immediate repeats.
    if (i === speech.last && pool.length > 1) i = (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    speech.last = i;
    return pool[i];
  };

  const say = (text: string, final = false) => {
    speech.text = text;
    speech.shown = 0;
    speech.age = 0;
    speech.visible = true;
    speech.final = final;
    // Regular lines hold 2.5 s once typed out; the last words stay ~2.5 s in total.
    speech.hold = final ? Math.max(1, 2.5 - text.length / TYPE_RATE) : 2.5;
  };

  const updateSpeech = (dt: number) => {
    const b = boss.enemy;
    if (b && !speech.final) {
      speech.x = b.x;
      speech.y = b.y - b.r;
    }
    if (!speech.visible) {
      if (b && b.entrance <= 0) {
        speech.gap -= dt;
        if (speech.gap <= 0) say(pickQuote());
      }
      return;
    }
    speech.age += dt;
    const shown = Math.min(speech.text.length, Math.floor(speech.age * TYPE_RATE));
    if (shown > speech.shown) {
      // One gibberish syllable every 2 revealed characters.
      if (Math.floor(shown / 2) > Math.floor(speech.shown / 2)) {
        sfx("talk", { pitch: (boss.phase === "enraged" ? 0.85 : 1) * rand(0.92, 1.12), pan: panAt(speech.x) });
      }
      speech.shown = shown;
    }
    if (speech.shown < speech.text.length) return;
    speech.hold -= dt;
    if (speech.hold > 0) return;
    speech.visible = false;
    speech.final = false;
    speech.gap = 1;
  };

  const warnBoss = () => {
    boss.phase = "warning";
    boss.warn = Math.max(0, BOSS_TIME - t);
    if (mode === "run") callbacks.onBossWarning();
    sfx("bossWarn");
  };

  const spawnBoss = () => {
    // Drop in on screen, along the longer screen axis, a fair distance from the player.
    const hw = width / 2 / baseZoom();
    const hh = height / 2 / baseZoom();
    const a = (hw >= hh ? 0 : Math.PI / 2) + (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.6, 0.6);
    const edge = Math.min(Math.abs(hw / (Math.cos(a) || 1e-6)), Math.abs(hh / (Math.sin(a) || 1e-6)));
    const d = Math.min(340, edge * 0.72);
    const e = makeEnemy("boss", player.x + Math.cos(a) * d, player.y + Math.sin(a) * d);
    e.entrance = BOSS_ENTRANCE;
    enemies.push(e);
    boss.enemy = e;
    boss.phase = "entering";
    boss.warn = 0;
    boss.fireCd = 2.2;
    boss.summonCd = 6;
    boss.volleys = 0;
    speech.visible = false;
    speech.final = false;
    speech.gap = 0.6;
    speech.last = -1;
    toast(TOASTS.bossSpawn);
    music("boss");
  };

  /** The drop-in lands: impact ring, shove, shake, zoom punch. */
  const landBoss = (e: Enemy) => {
    boss.phase = "fight";
    ring("impact", e.x, e.y, e.r, 300, 0.55, PALETTE.ink, 8);
    ring("impact", e.x, e.y, e.r * 0.6, 190, 0.4, PALETTE.red, 4, 0.08);
    // Ground debris kicks out from around its feet.
    for (let i = 0; i < 30; i += 1) {
      const a = Math.random() * TAU;
      const s = rand(120, 340);
      const dust = i % 3 === 0;
      spawnParticle(dust ? "dust" : "debris", e.x + Math.cos(a) * e.r, e.y + e.r * 0.6 + Math.sin(a) * e.r * 0.35, Math.cos(a) * s, Math.sin(a) * s * 0.35, rand(0.4, 0.7), dust ? 12 : rand(3, 6), PALETTE.sandDark, 3);
    }
    for (const other of enemies) {
      if (other === e || other.hp <= 0) continue;
      const dx = other.x - e.x;
      const dy = other.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 300) {
        other.vx += (dx / d) * 520 * (1 - d / 300);
        other.vy += (dy / d) * 520 * (1 - d / 300);
      }
    }
    addTrauma(0.55);
    punchZoom();
    flashScreen("#ffffff", 0.3, 0.2);
    sfx("explode", { pitch: 0.55, pan: panAt(e.x) });
  };

  const enrage = (e: Enemy) => {
    boss.phase = "enraged";
    boss.summonCd = 1.5;
    speech.last = -1;
    ring("enrage", e.x, e.y, e.r, e.r + 170, 0.5, PALETTE.red, 7);
    burst("spark", e.x, e.y, 14, 360, 3, "#ffffff", 0.4, 4);
    addTrauma(0.3);
    flashScreen(PALETTE.red, 0.18, 0.3);
    // The rebuttal made it worse: switch to the enraged lines right away.
    say(pickQuote());
  };

  const summonMinions = (e: Enemy) => {
    const base = Math.random() * TAU;
    for (let i = 0; i < 3; i += 1) {
      const a = base + (i * TAU) / 3;
      const m = makeEnemy("comment", e.x + Math.cos(a) * (e.r + 24), e.y + Math.sin(a) * (e.r + 24));
      m.vx = Math.cos(a) * 180;
      m.vy = Math.sin(a) * 180;
      enemies.push(m);
      ring("summon", m.x, m.y, 4, 36, 0.3, PALETTE.ink, 2);
    }
  };

  const updateBoss = (e: Enemy, dt: number) => {
    if (boss.phase === "fight" && e.hp < e.maxHp * 0.5) enrage(e);
    const enraged = boss.phase === "enraged";
    boss.fireCd -= dt;
    if (boss.fireCd <= 0) {
      // A ring of rejections; phase 2 fires faster and denser.
      boss.fireCd = enraged ? 1.35 : 2.2;
      boss.volleys += 1;
      const n = enraged ? 18 : 12;
      const speed = enraged ? 165 : 150;
      const offset = Math.random() * TAU;
      for (let i = 0; i < n; i += 1) {
        const a = offset + (i * TAU) / n;
        bullets.push({ src: "boss", x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: 12, r: 7, life: BOSS_SHOT_LIFE, pierce: 1, hostile: true });
      }
      ring("volley", e.x, e.y, e.r, e.r + 40, 0.25, PALETTE.red, 4);
      addTrauma(0.08);
      sfx("bossShot", { pan: panAt(e.x) });
    }
    if (enraged) {
      boss.summonCd -= dt;
      if (boss.summonCd <= 0) {
        boss.summonCd = 6;
        summonMinions(e);
      }
    }
  };

  const defeatBoss = (e: Enemy) => {
    bossDefeated = true;
    boss.phase = "defeated";
    boss.enemy = null;
    freeze(0.25);
    slowMotion(0.35, 1.2);
    addTrauma(0.9);
    flashScreen(PALETTE.gold, 0.6, 0.6);
    ring("boss", e.x, e.y, e.r, 340, 0.7, PALETTE.gold, 10);
    ring("boss", e.x, e.y, e.r * 0.5, 240, 0.6, PALETTE.orange, 7, 0.12);
    ring("boss", e.x, e.y, 10, 160, 0.5, PALETTE.ink, 5, 0.24);
    confetti(e.x, e.y, 120, 520);
    burst("debris", e.x, e.y, 30, 360, 5, PALETTE.ink, 0.8);
    burst("spark", e.x, e.y, 16, 420, 3, "#ffffff", 0.5, 4);
    // The rejection volley pops harmlessly (removed by removeDead; this may run inside the bullet loop).
    for (const b of bullets) {
      if (!b.hostile) continue;
      b.life = 0;
      spawnParticle("spark", b.x, b.y, 0, 0, 0.25, 3, PALETTE.red);
    }
    for (let i = 0; i < 40; i += 1) dropGem(e.x + rand(-80, 80), e.y + rand(-80, 80), 3);
    dropPickup("magnet", e.x, e.y);
    speech.x = e.x;
    speech.y = e.y - e.r;
    say(REVIEWER2_DEFEATED, true);
    sfx("bossDie");
    music("run");
    toast(TOASTS.bossDefeated);
  };

  // ---------------------------------------------------------- weapons
  const fireAt = (fromX: number, fromY: number, target: Enemy | null, dmg: number, count: number, speed: number, src: BulletSource) => {
    let ax = player.faceX;
    let ay = player.faceY;
    if (target) {
      const d = Math.hypot(target.x - fromX, target.y - fromY) || 1;
      ax = (target.x - fromX) / d;
      ay = (target.y - fromY) / d;
    }
    const base = Math.atan2(ay, ax);
    for (let i = 0; i < count; i += 1) {
      const a = base + (i - (count - 1) / 2) * 0.16;
      bullets.push({ src, x: fromX, y: fromY, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, r: 5, life: 1.3, pierce: 1, hostile: false });
    }
  };

  /** Counts down a weapon cooldown; true when it fires this step. */
  const ready = (id: string, cooldown: number, dt: number) => {
    cooldowns[id] = (cooldowns[id] ?? 0) - dt;
    if (cooldowns[id] > 0) return false;
    cooldowns[id] = cooldown * cdScale();
    return true;
  };

  const updateWeapons = (dt: number) => {
    const g = lvl("gradient");
    if (g && ready("gradient", 0.7 - 0.07 * (g - 1), dt)) {
      fireAt(player.x, player.y, nearestEnemy(player.x, player.y, 360), 4.5 + g * 1.5, 1 + Math.floor(g / 2), 430, "bolt");
      sfx("shoot");
    }

    const a = lvl("attention");
    if (a && ready("attention", 2.7 - 0.25 * a, dt)) {
      const target = nearestEnemy(player.x, player.y, 600);
      let dx = player.faceX;
      let dy = player.faceY;
      if (target) {
        const d = Math.hypot(target.x - player.x, target.y - player.y) || 1;
        dx = (target.x - player.x) / d;
        dy = (target.y - player.y) / d;
      }
      const length = 560;
      const beamWidth = 10 + a * 3;
      beams.push({ x1: player.x, y1: player.y, x2: player.x + dx * length, y2: player.y + dy * length, width: beamWidth, life: 0.18, max: 0.18 });
      for (let i = 0; i < enemies.length; i += 1) {
        const e = enemies[i];
        const px = e.x - player.x;
        const py = e.y - player.y;
        const along = px * dx + py * dy;
        if (along < 0 || along > length) continue;
        if (Math.abs(px * dy - py * dx) < beamWidth / 2 + e.r) damage(e, 7 + a * 3.5, dx * 60, dy * 60, "beam");
      }
      sfx("beam");
    }

    const s = lvl("shot");
    if (s && ready("shot", 4.6 - 0.4 * s, dt)) {
      waveCounter += 1;
      waves.push({ id: waveCounter, x: player.x, y: player.y, t: 0, maxR: 120 + 28 * s, dmg: 4 + 2.2 * s });
      sfx("shock");
    }

    const l = lvl("looped");
    if (l && ready("looped", 2.3 - 0.2 * l, dt)) {
      const count = Math.ceil(l / 2);
      const target = nearestEnemy(player.x, player.y, 500);
      const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
      for (let i = 0; i < count; i += 1) {
        const ang = base + (i * TAU) / count;
        boomerangs.push({ x: player.x, y: player.y, dx: Math.cos(ang), dy: Math.sin(ang), dist: 0, returning: false, dmg: 5 + 2.2 * l, angle: 0 });
      }
      sfx("boomerang");
    }

    const an = lvl("anchors");
    if (an && ready("anchors", 7.2 - 0.8 * an, dt)) {
      anchors.push({ x: player.x, y: player.y, age: 0, life: 5 + 0.8 * an, fireCd: 0, dmg: 3 + an * 1.1 });
      sfx("anchor");
    }

    const dsv = lvl("dsv");
    if (dsv) {
      orbAngle += dt * (2.4 + dsv * 0.15);
      for (let i = 0; i < dsvCount(); i += 1) {
        const { x: ox, y: oy } = dsvOrb(i);
        const hits = nearby(ox, oy, 10, hitBuf);
        for (let j = 0; j < hits.length; j += 1) {
          const e = hits[j];
          if (e.orbCd > 0 || e.hp <= 0) continue;
          if ((e.x - ox) ** 2 + (e.y - oy) ** 2 < (e.r + 10) ** 2) {
            e.orbCd = 0.4;
            const ang = Math.atan2(oy - player.y, ox - player.x);
            damage(e, 2.4 + dsv * 0.9, Math.cos(ang) * 120, Math.sin(ang) * 120, "orb");
          }
        }
      }
    }

    const dr = lvl("dropout");
    if (dr) {
      auraTick -= dt;
      auraPulse = Math.max(0, auraPulse - dt * 3);
      if (auraTick <= 0) {
        auraTick = 0.45 * cdScale();
        auraPulse = 1;
        const radius = dropoutRadius();
        const hits = nearby(player.x, player.y, radius, hitBuf);
        let zapped = false;
        for (let i = 0; i < hits.length; i += 1) {
          const e = hits[i];
          // dropout: each bug in range only gets hit with p = 0.8
          if (Math.random() < 0.2) continue;
          if ((e.x - player.x) ** 2 + (e.y - player.y) ** 2 < (radius + e.r) ** 2) {
            damage(e, 1.2 + dr * 0.8, 0, 0, "dropout");
            zapped = true;
          }
        }
        if (zapped) sfx("zap");
      }
    }

    // anchors fire on their own
    let n = 0;
    for (let i = 0; i < anchors.length; i += 1) {
      const anchor = anchors[i];
      anchor.age += dt;
      anchor.fireCd -= dt;
      if (anchor.fireCd <= 0) {
        anchor.fireCd = 0.55;
        const target = nearestEnemy(anchor.x, anchor.y, 380);
        if (target) {
          fireAt(anchor.x, anchor.y, target, anchor.dmg, 1, 380, "anchor");
          sfx("shoot", { volume: 0.5, pan: panAt(anchor.x) });
        }
      }
      if (anchor.age < anchor.life) anchors[n++] = anchor;
    }
    anchors.length = n;
  };

  // ---------------------------------------------------------- update
  const steerAutopilot = (dt: number) => {
    // Smooth wandering: the heading drifts with a sum of slow sines...
    autopilot.heading += (Math.sin(clock * 0.53) * 1.1 + Math.sin(clock * 1.37 + 2) * 0.6) * dt;
    let tx = Math.cos(autopilot.heading);
    let ty = Math.sin(autopilot.heading);
    // ...and steers away from the nearest bug.
    const threat = nearestEnemy(player.x, player.y, 170);
    if (threat) {
      const dx = player.x - threat.x;
      const dy = player.y - threat.y;
      const d = Math.hypot(dx, dy) || 1;
      const w = 4 * (1 - d / 170);
      tx += (dx / d) * w;
      ty += (dy / d) * w;
    }
    const len = Math.hypot(tx, ty) || 1;
    const k = 1 - Math.exp(-dt * 4);
    autopilot.mx += ((tx / len) * 0.75 - autopilot.mx) * k;
    autopilot.my += ((ty / len) * 0.75 - autopilot.my) * k;
    // Keep wandering from wherever the dodge took us.
    const actual = Math.atan2(autopilot.my, autopilot.mx);
    const diff = Math.atan2(Math.sin(actual - autopilot.heading), Math.cos(actual - autopilot.heading));
    autopilot.heading += diff * Math.min(1, dt * 2);
  };

  const updatePlayer = (dt: number) => {
    let mx = move.x;
    let my = move.y;
    if (mode === "attract") {
      steerAutopilot(dt);
      mx = autopilot.mx;
      my = autopilot.my;
    }
    if (dying > 0) {
      mx = 0;
      my = 0;
    }
    const len = Math.hypot(mx, my);
    const moving = len > 0.05;
    if (moving) {
      const nx = mx / len;
      const ny = my / len;
      // A sharp turn squashes the robot.
      if (anim.moving > 0.6 && nx * player.faceX + ny * player.faceY < 0.3) anim.squash = 1;
      const k = Math.min(1, len) / len; // analog input up to full speed
      player.vx = mx * k * player.speed;
      player.vy = my * k * player.speed;
      player.faceX = nx;
      player.faceY = ny;
    } else {
      player.vx = 0;
      player.vy = 0;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.iframes = Math.max(0, player.iframes - dt);

    anim.moving += ((moving ? 1 : 0) - anim.moving) * Math.min(1, dt * 10);
    anim.bob = (anim.bob + dt * 14 * anim.moving) % TAU;
    anim.squash = Math.max(0, anim.squash - dt / 0.2);
    anim.lean += (clamp(player.vx / player.speed, -1, 1) - anim.lean) * Math.min(1, dt * 8);
    anim.hurt = Math.max(0, anim.hurt - dt);
    anim.lowSanity = mode === "run" && player.hp > 0 && player.hp < player.maxHp * 0.3;
    anim.blink = Math.max(0, anim.blink - dt);
    anim.blinkIn -= dt;
    if (anim.blinkIn <= 0) {
      anim.blink = 0.12;
      anim.blinkIn = rand(2.2, 4.5);
    }
    if (moving && dying <= 0) {
      anim.dust -= dt;
      if (anim.dust <= 0) {
        anim.dust = 0.18;
        spawnParticle("dust", player.x - player.faceX * 8 + rand(-3, 3), player.y + 12, -player.vx * 0.12, rand(-14, -4), 0.45, rand(4, 6), PALETTE.sandDark, 4);
      }
    }

    historyTimer -= dt;
    if (historyTimer <= 0) {
      historyTimer = 0.1;
      history.push({ x: player.x, y: player.y });
      if (history.length > 40) history.shift();
    }
  };

  const updateTimeline = () => {
    if (!oneMinuteToasted && t >= RUN_LENGTH - 60) {
      oneMinuteToasted = true;
      toast(TOASTS.oneMinute);
    }
    while (magnetDrops < MAGNET_TIMES.length && t >= MAGNET_TIMES[magnetDrops]) {
      magnetDrops += 1;
      dropNearPlayer("magnet");
    }
    if (boss.phase === "none" && t >= BOSS_TIME - BOSS_WARNING) warnBoss();
    if (boss.phase === "warning") {
      boss.warn = Math.max(0, BOSS_TIME - t);
      if (t >= BOSS_TIME) spawnBoss();
    }
    if (t >= RUN_LENGTH) startVictory();
  };

  const updateEnemies = (dt: number) => {
    const knockDecay = Math.pow(0.02, dt);
    const despawn = spawnRadius() + 400;
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      if (e.hp <= 0) continue;
      e.age += dt;
      e.phase += dt * PHASE_RATE[e.kind];
      e.flash = Math.max(0, e.flash - dt);
      e.squash = Math.max(0, e.squash - dt / 0.12);
      if (e.entrance > 0) {
        e.entrance -= dt;
        if (e.entrance <= 0) {
          e.entrance = 0;
          landBoss(e);
        }
        continue;
      }
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      let sx = ux * e.speed;
      let sy = uy * e.speed;
      if (e.kind === "halluc" || e.kind === "comment") {
        const sway = Math.cos(e.phase) * (e.kind === "halluc" ? 40 : 18);
        sx -= uy * sway;
        sy += ux * sway;
      }
      // Separation from neighbours so they do not collapse into one blob.
      const reach = e.r + MAX_ENEMY_R;
      const x0 = cellOf(e.x - reach, gridX0);
      const x1 = cellOf(e.x + reach, gridX0);
      const y0 = cellOf(e.y - reach, gridY0);
      const y1 = cellOf(e.y + reach, gridY0);
      for (let cy = y0; cy <= y1; cy += 1) {
        for (let cx = x0; cx <= x1; cx += 1) {
          for (let j = cellHead[cy * GRID_N + cx]; j !== -1; j = cellNext[j]) {
            if (j === i) continue;
            const o = enemies[j];
            if (o.hp <= 0 || o.entrance > 0) continue;
            const ox = e.x - o.x;
            const oy = e.y - o.y;
            const min = e.r + o.r;
            const dd = ox * ox + oy * oy;
            if (dd > 0 && dd < min * min) {
              const od = Math.sqrt(dd);
              const push = ((min - od) / min) * 90;
              sx += (ox / od) * push;
              sy += (oy / od) * push;
            }
          }
        }
      }
      const vx = sx + e.vx;
      const vy = sy + e.vy;
      e.x += vx * dt;
      e.y += vy * dt;
      e.mx = vx;
      e.my = vy;
      if (vx > 8) e.face = 1;
      else if (vx < -8) e.face = -1;
      e.vx *= knockDecay;
      e.vy *= knockDecay;
      e.orbCd = Math.max(0, e.orbCd - dt);
      e.boomCd = Math.max(0, e.boomCd - dt);
      if (e === boss.enemy) updateBoss(e, dt);
      if (d < e.r + PLAYER_R) hurtPlayer(e.dmg);
      else if (d > despawn && e !== boss.enemy) relocate(e);
    }
  };

  const updateBullets = (dt: number) => {
    let n = 0;
    for (let i = 0; i < bullets.length; i += 1) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life > 0 && b.hostile) {
        if ((b.x - player.x) ** 2 + (b.y - player.y) ** 2 < (b.r + 12) ** 2) {
          hurtPlayer(b.dmg);
          b.life = 0;
        }
      } else if (b.life > 0) {
        const hits = nearby(b.x, b.y, b.r, hitBuf);
        for (let j = 0; j < hits.length && b.life > 0; j += 1) {
          const e = hits[j];
          if (e.hp <= 0) continue;
          const rr = e.r + b.r;
          if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 >= rr * rr) continue;
          const sp = Math.hypot(b.vx, b.vy) || 1;
          damage(e, b.dmg, (b.vx / sp) * 90, (b.vy / sp) * 90, "bolt");
          hitSpark(b.x, b.y, b.vx / sp, b.vy / sp);
          b.pierce -= 1;
          if (b.pierce <= 0) b.life = 0;
        }
      }
      if (b.life > 0) bullets[n++] = b;
    }
    bullets.length = n;
  };

  const updateBoomerangs = (dt: number) => {
    let n = 0;
    for (let i = 0; i < boomerangs.length; i += 1) {
      const boom = boomerangs[i];
      boom.angle += dt * 14;
      const speed = 380;
      if (!boom.returning) {
        boom.x += boom.dx * speed * dt;
        boom.y += boom.dy * speed * dt;
        boom.dist += speed * dt;
        if (boom.dist > 270) boom.returning = true;
      } else {
        const dx = player.x - boom.x;
        const dy = player.y - boom.y;
        const d = Math.hypot(dx, dy) || 1;
        boom.x += (dx / d) * speed * 1.15 * dt;
        boom.y += (dy / d) * speed * 1.15 * dt;
        if (d < 18) continue;
      }
      const hits = nearby(boom.x, boom.y, 14, hitBuf);
      for (let j = 0; j < hits.length; j += 1) {
        const e = hits[j];
        if (e.boomCd > 0 || e.hp <= 0) continue;
        if ((e.x - boom.x) ** 2 + (e.y - boom.y) ** 2 < (e.r + 14) ** 2) {
          e.boomCd = 0.3;
          damage(e, boom.dmg, boom.dx * 80, boom.dy * 80, "boomerang");
        }
      }
      boomerangs[n++] = boom;
    }
    boomerangs.length = n;
  };

  const updateWaves = (dt: number) => {
    let n = 0;
    for (let i = 0; i < waves.length; i += 1) {
      const wave = waves[i];
      wave.t += dt;
      const r = (wave.t / WAVE_TIME) * wave.maxR;
      const hits = nearby(wave.x, wave.y, r, hitBuf);
      for (let j = 0; j < hits.length; j += 1) {
        const e = hits[j];
        if (e.waveId === wave.id) continue;
        const d = Math.hypot(e.x - wave.x, e.y - wave.y);
        if (d < r + e.r) {
          e.waveId = wave.id;
          damage(e, wave.dmg, ((e.x - wave.x) / (d || 1)) * 420, ((e.y - wave.y) / (d || 1)) * 420, "wave");
        }
      }
      if (wave.t < WAVE_TIME) waves[n++] = wave;
    }
    waves.length = n;
  };

  const collectPickup = (p: Pickup) => {
    if (p.kind === "coffee") {
      heal(30);
      toast(TOASTS.coffee);
      return;
    }
    // The viral thread: every token on the field flies to the player.
    for (const g of gems) {
      g.pulled = true;
      g.magnet = true;
    }
    ring("pickup", player.x, player.y, 20, 420, 0.6, PALETTE.red, 4);
    burst("sparkle", player.x, player.y, 14, 260, 4, PALETTE.gold, 0.5);
    sfx("magnet");
    toast(TOASTS.magnet);
  };

  const updateLoot = (dt: number) => {
    let n = 0;
    let collected = 0;
    for (let i = 0; i < gems.length; i += 1) {
      const g = gems[i];
      g.age += dt;
      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!g.pulled && d < player.pickup) g.pulled = true;
      if (!g.pulled || dying > 0) {
        g.vx = 0;
        g.vy = 0;
        gems[n++] = g;
        continue;
      }
      const speed = g.magnet ? 520 + d * 1.2 : 420 + Math.max(0, 300 - d) * 2;
      g.vx = (dx / d) * speed;
      g.vy = (dy / d) * speed;
      if (d > 16 && speed * dt < d) {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        gems[n++] = g;
        continue;
      }
      // Collected: citations go up, a sparkle pops, the chime climbs with the chain.
      if (mode === "run") xp += g.value;
      gemChain = clock - lastGemAt < 0.35 ? gemChain + 1 : 0;
      lastGemAt = clock;
      collected += 1;
      const big = g.value >= 3;
      spawnParticle("sparkle", player.x + rand(-8, 8), player.y + rand(-10, 4), rand(-30, 30), rand(-90, -50), 0.4, big ? 5 : 3.5, big ? PALETTE.gold : PALETTE.sky, 3);
    }
    gems.length = n;
    if (collected) sfx("gem", { pitch: Math.min(2.2, 1 + 0.045 * gemChain) });

    n = 0;
    for (let i = 0; i < pickups.length; i += 1) {
      const p = pickups[i];
      p.age += dt;
      if (p.age >= PICKUP_LIFE) continue;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!p.pulled && d < Math.max(60, player.pickup * 0.5)) p.pulled = true;
      if (p.pulled && dying <= 0) {
        const step = Math.min(d, 380 * dt);
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      if (dying <= 0 && Math.hypot(player.x - p.x, player.y - p.y) < PLAYER_R + 12) {
        collectPickup(p);
        continue;
      }
      pickups[n++] = p;
    }
    pickups.length = n;

    while (xp >= xpNext()) {
      xp -= xpNext();
      pendingLevelUps += 1;
    }
  };

  const updateFx = (dt: number) => {
    let n = 0;
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particlePool.push(p);
        continue;
      }
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      particles[n++] = p;
    }
    particles.length = n;

    n = 0;
    for (let i = 0; i < rings.length; i += 1) {
      const r = rings[i];
      r.t += dt;
      if (r.t < r.dur) rings[n++] = r;
    }
    rings.length = n;

    n = 0;
    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i];
      text.y += text.vy * dt;
      text.vy *= Math.exp(-3 * dt);
      text.life -= dt;
      if (text.life > 0) texts[n++] = text;
    }
    texts.length = n;

    n = 0;
    for (let i = 0; i < beams.length; i += 1) {
      const beam = beams[i];
      beam.life -= dt;
      if (beam.life > 0) beams[n++] = beam;
    }
    beams.length = n;
  };

  /** Drops dead enemies and spent bullets; runs outside the entity loops, so it can compact. */
  const removeDead = () => {
    let n = 0;
    for (let i = 0; i < enemies.length; i += 1) {
      if (enemies[i].hp > 0) enemies[n++] = enemies[i];
    }
    enemies.length = n;
    n = 0;
    for (let i = 0; i < bullets.length; i += 1) {
      if (bullets[i].life > 0) bullets[n++] = bullets[i];
    }
    bullets.length = n;
  };

  /** One fixed simulation step of `dt` sim seconds. */
  const update = (dt: number) => {
    playedThisStep.clear();
    clock += dt;
    const resolving = victory > 0 || dying > 0;
    if (mode === "run" && !resolving) {
      t += dt;
      updateTimeline();
    }
    critStopCd = Math.max(0, critStopCd - dt);
    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer <= 0) combo = 0;

    updatePlayer(dt);
    if (!resolving) {
      if (mode === "run") spawnRun(dt);
      else spawnAttract(dt);
    }
    rebuildGrid();
    if (dying <= 0) updateWeapons(dt);
    updateEnemies(dt);
    updateBullets(dt);
    updateBoomerangs(dt);
    updateWaves(dt);
    updateBlasts(dt);
    removeDead();
    updateLoot(dt);
    updateFx(dt);
    updateSpeech(dt);

    if (mode === "run" && pendingLevelUps > 0 && !choosing && victory <= 0 && dying <= 0) startLevelUp();
  };

  // ---------------------------------------------------------- real time
  /** Smooth shake noise in -1..1: a sum of incommensurate sines per channel. */
  const wobble = (time: number, channel: number) =>
    0.55 * Math.sin(time * 31 + channel * 1.7) + 0.3 * Math.sin(time * 53 + channel * 4.1) + 0.15 * Math.sin(time * 97 + channel * 2.3);

  /** Camera, shake, zoom punch and flashes: real time, every frame. */
  const present = (dt: number) => {
    trauma = Math.max(0, trauma - dt * TRAUMA_DECAY);
    shakeClock += dt;
    const shake = options.reducedMotion || mode !== "run" ? 0 : trauma * trauma;
    cam.shakeX = shake * 14 * wobble(shakeClock, 0);
    cam.shakeY = shake * 14 * wobble(shakeClock, 1);
    cam.shakeRot = shake * 0.02 * wobble(shakeClock, 2);

    cam.punch = Math.max(0, cam.punch - dt);
    let punch = 0;
    if (cam.punch > 0) {
      // Snap in over the first fifth, ease back out over the rest.
      const p = 1 - cam.punch / PUNCH_TIME;
      const k = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      punch = 0.06 * k * k * (3 - 2 * k);
    }
    cam.zoom = baseZoom() * (1 + punch);

    // Look ~0.35 s ahead of the movement, at most 50 px, eased.
    let lx = player.vx * 0.35;
    let ly = player.vy * 0.35;
    const lead = Math.hypot(lx, ly);
    if (lead > 50) {
      lx *= 50 / lead;
      ly *= 50 / lead;
    }
    const ease = 1 - Math.exp(-dt * 4);
    cam.leadX += (lx - cam.leadX) * ease;
    cam.leadY += (ly - cam.leadY) * ease;
    cam.x = player.x + cam.leadX;
    cam.y = player.y + cam.leadY;

    screenFlash.alpha = Math.max(0, screenFlash.alpha - screenFlash.decay * dt);
  };

  const tickHud = (realDt: number) => {
    hudTimer -= realDt;
    if (hudTimer > 0) return;
    hudTimer = 0.1;
    pushHud();
    audio.setIntensity(clamp((t / RUN_LENGTH) * 0.75 + (Math.min(enemies.length, 400) / 400) * 0.35, 0, 1));
  };

  const tickHeartbeat = (realDt: number) => {
    if (!anim.lowSanity || dying > 0) {
      heartTimer = 0;
      return;
    }
    heartTimer -= realDt;
    if (heartTimer <= 0) {
      heartTimer = 0.9;
      sfx("heartbeat");
    }
  };

  /** Advances the game by one frame of real time (not called while paused or ended). */
  const advance = (realDt: number) => {
    // Presentation timers run faster at a debug speed too, so tests stay quick.
    const dt = realDt * debugSpeed;
    if (victory > 0) {
      victory -= dt;
      if (victory <= 0) return finish();
    }
    if (dying > 0) {
      dying -= dt;
      if (dying <= 0) return finish();
    }
    if (levelUpDelay > 0) {
      levelUpDelay -= dt;
      if (levelUpDelay <= 0) {
        levelUpDelay = 0;
        if (mode === "run") callbacks.onLevelUp(offeredCards);
      }
      return;
    }
    if (choosing) return;
    if (mode === "run") {
      tickHud(realDt);
      tickHeartbeat(realDt);
    }
    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - dt);
      return;
    }
    if (slowMo.t < slowMo.dur) {
      slowMo.t = Math.min(slowMo.dur, slowMo.t + dt);
      const p = slowMo.t / slowMo.dur;
      timeScale = slowMo.from + (1 - slowMo.from) * p * p;
    } else {
      timeScale = 1;
    }
    // Fixed sub-steps of at most MAX_STEP keep the physics stable at any speed.
    const simDt = dt * timeScale;
    const steps = Math.max(1, Math.ceil(simDt / MAX_STEP - 1e-9));
    for (let i = 0; i < steps; i += 1) {
      update(simDt / steps);
      if (choosing || ended || hitStop > 0) break;
    }
  };

  // ---------------------------------------------------------- draw
  /*
   * Art pass. Blits the procedural sprite sheet (./sprites) plus a few sprites
   * derived from it (bakeArt, end of file), all baked once per pixel ratio.
   * Every entity is placed with setTransform from one camera matrix (no
   * save/restore per entity), additive light is batched into a few "lighter"
   * passes and anything outside the view is culled. Additive light on sand
   * can only brighten towards white, so coloured halos use normal blending and
   * the additive passes add the hot cores. Reads only the RENDER STATE above.
   */
  const fonts = new Map<number, string>();
  /** Cached CSS font strings, so the draw loops do not build a string per entity per frame. */
  const font = (weight: number, px: number) => {
    const key = weight * 1000 + px;
    let f = fonts.get(key);
    if (!f) {
      f = `${weight} ${px}px ${FONT}`;
      fonts.set(key, f);
    }
    return f;
  };
  const NO_DASH: number[] = [];
  const LANDING_DASH = [10, 8];
  const FIELD_DASH = [5, 7];
  const MARGIN_DASH = [3, 7];
  /** Comment bubbles and damage numbers grow a little when the camera zooms out (phones). */
  const readable = () => clamp(0.9 / baseZoom(), 1, 1.2);

  // Camera: the world -> device-pixel matrix and the world rectangle on screen (shake included).
  const cm = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const view = { l: 0, r: 0, t: 0, b: 0 };
  const setCamera = () => {
    const cos = Math.cos(cam.shakeRot);
    const sin = Math.sin(cam.shakeRot);
    const k = cam.zoom * dpr;
    cm.a = cos * k;
    cm.b = sin * k;
    cm.c = -sin * k;
    cm.d = cos * k;
    cm.e = dpr * (width / 2 + cam.shakeX) - (cm.a * cam.x + cm.c * cam.y);
    cm.f = dpr * (height / 2 + cam.shakeY) - (cm.b * cam.x + cm.d * cam.y);
    const slack = (Math.abs(cam.shakeX) + Math.abs(cam.shakeY)) / cam.zoom;
    const hw = width / 2 / cam.zoom;
    const hh = height / 2 / cam.zoom;
    const ex = Math.abs(cos) * hw + Math.abs(sin) * hh + slack;
    const ey = Math.abs(sin) * hw + Math.abs(cos) * hh + slack;
    view.l = cam.x - ex;
    view.r = cam.x + ex;
    view.t = cam.y - ey;
    view.b = cam.y + ey;
  };
  const inView = (x: number, y: number, r: number) => x > view.l - r && x < view.r + r && y > view.t - r && y < view.b + r;
  const worldSpace = () => ctx.setTransform(cm.a, cm.b, cm.c, cm.d, cm.e, cm.f);
  const screenSpace = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  /** Sets a local frame at world (x, y), rotated by `rot` and scaled by (sx, sy). */
  const place = (x: number, y: number, rot: number, sx: number, sy: number) => {
    const tx = cm.a * x + cm.c * y + cm.e;
    const ty = cm.b * x + cm.d * y + cm.f;
    if (rot === 0) {
      ctx.setTransform(cm.a * sx, cm.b * sx, cm.c * sy, cm.d * sy, tx, ty);
      return;
    }
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    ctx.setTransform((cm.a * cos + cm.c * sin) * sx, (cm.b * cos + cm.d * sin) * sx, (cm.c * cos - cm.a * sin) * sy, (cm.d * cos - cm.b * sin) * sy, tx, ty);
  };
  /** Draws a sprite on its anchor in the current frame, shifted `dy` units down. */
  const stamp = (s: Sprite, dy = 0) => ctx.drawImage(s.canvas, -s.ax, dy - s.ay, s.w, s.h);
  const blit = (s: Sprite, x: number, y: number, rot: number, scale: number) => {
    place(x, y, rot, scale, scale);
    stamp(s);
  };
  const pt = { x: 0, y: 0 };
  /** World position of (u, v) in the frame place(ox, oy, rot, sx, sy) would set (written into pt). */
  const framePoint = (ox: number, oy: number, rot: number, sx: number, sy: number, u: number, v: number) => {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    pt.x = ox + cos * u * sx - sin * v * sy;
    pt.y = oy + sin * u * sx + cos * v * sy;
    return pt;
  };
  // Spinning sparkles and debris use pre-rotated frames: rotated blits are slow without a GPU.
  const STAR_FRAMES = 4; // a four-point star repeats every quarter turn
  const SHARD_FRAMES = 8;
  const frameOf = (rot: number, period: number, n: number) => ((Math.round((rot / period) * n) % n) + n) % n;
  const starOf = (a: Art, color: string, rot: number) => {
    let frames = a.stars.get(color);
    if (!frames) {
      frames = [];
      for (let i = 0; i < STAR_FRAMES; i += 1) frames.push(bakeStar(a.scale, color, (i / STAR_FRAMES) * (Math.PI / 2)));
      a.stars.set(color, frames);
    }
    return frames[frameOf(rot, Math.PI / 2, STAR_FRAMES)];
  };
  const shardOf = (a: Art, color: string, rot: number) => {
    let frames = a.shards.get(color);
    if (!frames) {
      frames = [];
      for (let i = 0; i < SHARD_FRAMES; i += 1) frames.push(bakeShard(a.scale, color, (i / SHARD_FRAMES) * TAU));
      a.shards.set(color, frames);
    }
    return frames[frameOf(rot, TAU, SHARD_FRAMES)];
  };
  const backs = new Map<string, string>();
  /** The darker back of a confetti colour. */
  const backOf = (color: string) => {
    let b = backs.get(color);
    if (!b) {
      b = mixHex(color, PALETTE.ink, 0.3);
      backs.set(color, b);
    }
    return b;
  };

  // ---- enemy poses: idle animation, spawn-in and squash of every visible enemy, back to front
  const drawList: Enemy[] = [];
  const poses: Pose[] = [];
  const byDepth = (p: Enemy, q: Enemy) => p.y - q.y;
  /** Squash-and-stretch pivot of each kind (its feet), units below the anchor. */
  const PIVOT: Record<EnemyKind, number> = { nan: 12, overfit: 0, halluc: 0, explode: 22, comment: 0, boss: 46 };
  /** Ground shadow of each kind: width, drop below the anchor, alpha. */
  const SHADOW: Record<EnemyKind, readonly [number, number, number]> = {
    nan: [28, 12, 1],
    overfit: [24, 13, 0.9],
    halluc: [26, 18, 0.6],
    explode: [50, 23, 1],
    comment: [36, 22, 0.45],
    boss: [108, 46, 1],
  };
  let bossLift = 0;
  /** World position of a point given relative to an enemy's anchor, in its current pose. */
  const poseLocal = (p: Pose, x: number, y: number) => framePoint(p.x, p.y - p.lift + p.pivot, p.rot, p.sx, p.sy, x, y - p.pivot);
  /** 0..1 while Reviewer 2 winds up a volley (its red pen glows). */
  const bossWindup = () => (boss.enemy && boss.enemy.entrance <= 0 && boss.fireCd < 0.45 ? 1 - Math.max(0, boss.fireCd) / 0.45 : 0);

  const poseEnemies = () => {
    drawList.length = 0;
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      if (e.hp > 0 && inView(e.x, e.y, e.kind === "boss" ? 150 : 60)) drawList.push(e);
    }
    drawList.sort(byDepth);
    const big = readable();
    bossLift = 0;
    for (let i = 0; i < drawList.length; i += 1) {
      const e = drawList[i];
      let p = poses[i];
      if (!p) {
        p = { x: 0, y: 0, lift: 0, rot: 0, sx: 1, sy: 1, alpha: 1, pivot: 0 };
        poses[i] = p;
      }
      const spawn = Math.min(1, e.age / SPAWN_IN);
      const grow = spawn < 1 ? Math.max(0.05, easeOutBack(spawn)) : 1;
      p.x = e.x;
      p.y = e.y;
      p.lift = 0;
      p.rot = 0;
      p.alpha = spawn;
      p.sx = grow * (1 + 0.24 * e.squash);
      p.sy = grow * (1 - 0.2 * e.squash);
      p.pivot = PIVOT[e.kind];
      switch (e.kind) {
        case "nan": {
          // a jelly hopping along, squashed on every landing
          const hop = Math.abs(Math.sin(e.phase));
          const land = (1 - hop) ** 4;
          p.lift = hop * 4;
          p.sx *= 1 + 0.14 * land;
          p.sy *= 1 - 0.12 * land;
          break;
        }
        case "overfit": {
          // it memorised every pixel: it vibrates and throbs
          const throb = 1 + 0.06 * Math.sin(e.phase * 2);
          p.x += Math.sin(clock * 61 + e.id) * 0.8;
          p.y += Math.sin(clock * 53 + e.id * 1.7) * 0.8;
          p.sx *= throb;
          p.sy *= throb;
          break;
        }
        case "halluc":
          // floats, and flickers in and out of existence
          p.lift = 5 + Math.sin(e.phase * 2) * 3;
          p.alpha *= 0.86 + 0.14 * Math.sin(clock * 2.7 + e.id);
          break;
        case "explode": {
          const swell = 0.03 * Math.sin(e.phase * 2);
          p.sx *= 1 + swell;
          p.sy *= 1 - swell;
          break;
        }
        case "comment":
          p.lift = 7 + Math.sin(e.phase * 1.4) * 2;
          p.rot = Math.sin(e.phase) * 0.12;
          p.sx *= big;
          p.sy *= big;
          break;
        case "boss": {
          // drops in stretched, then hovers and breathes; swells before each volley
          const falling = e.entrance > 0 ? e.entrance / BOSS_ENTRANCE : 0;
          const windup = bossWindup();
          const breathe = 0.02 * Math.sin(clock * 2.4 + 1);
          p.lift = falling > 0 ? falling * falling * 420 : 2 + 2 * Math.sin(clock * 2.4);
          p.sx = (1 + 0.05 * e.squash + 0.05 * windup + breathe) * (1 - 0.12 * falling);
          p.sy = (1 - 0.04 * e.squash + 0.05 * windup - breathe) * (1 + 0.18 * falling);
          p.rot = boss.phase === "enraged" ? Math.sin(clock * 23) * 0.025 : Math.sin(clock * 1.3) * 0.03;
          p.alpha = 1;
          bossLift = p.lift;
          break;
        }
      }
    }
  };

  // ---- ground: the loss-landscape tile with the light of the day baked in
  /** Ground tint by run time: [time, r, g, b, alpha], warm afternoon to dusk by 4:00. */
  const DAYLIGHT = [
    [0, 255, 196, 120, 0.05],
    [150, 248, 150, 90, 0.06],
    [240, 70, 58, 125, 0.13],
  ] as const;
  let ground: GroundTile | null = null;
  let tintColor = "";
  const groundMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  /**
   * The tint over the ground (time of day, red while Reviewer 2 is around, more in phase 2),
   * quantised so the tile is re-baked only every few seconds. Returns its key; when that
   * differs from `key`, tintColor holds the new CSS colour.
   */
  const groundTint = (key: number) => {
    const time = Math.min(t, 240);
    const i = time > DAYLIGHT[1][0] ? 1 : 0;
    const from = DAYLIGHT[i];
    const to = DAYLIGHT[i + 1];
    const q = clamp((time - from[0]) / (to[0] - from[0]), 0, 1);
    let r = from[1] + (to[1] - from[1]) * q;
    let g = from[2] + (to[2] - from[2]) * q;
    let b = from[3] + (to[3] - from[3]) * q;
    let alpha = from[4] + (to[4] - from[4]) * q;
    const rage = !boss.enemy ? 0 : boss.phase === "enraged" ? 0.075 : 0.035;
    if (rage > 0) {
      // red over the daylight, folded into one overlay
      const out = alpha + rage - alpha * rage;
      r = (r * alpha * (1 - rage) + 214 * rage) / out;
      g = (g * alpha * (1 - rage) + 69 * rage) / out;
      b = (b * alpha * (1 - rage) + 69 * rage) / out;
      alpha = out;
    }
    const qr = Math.round(r / 4);
    const qg = Math.round(g / 4);
    const qb = Math.round(b / 4);
    const qa = Math.round(alpha * 400);
    const next = ((qr * 64 + qg) * 64 + qb) * 512 + qa;
    if (next !== key) tintColor = `rgba(${Math.min(255, qr * 4)},${qg * 4},${qb * 4},${qa / 400})`;
    return next;
  };
  const drawGround = (a: Art) => {
    const tile = a.sheet.groundTile;
    const px = Math.max(64, Math.round(a.sheet.groundTileSize * dpr * baseZoom()));
    const known = ground && ground.px === px && ground.tile === tile ? ground.key : -1;
    const key = groundTint(known);
    if (!ground || key !== known) ground = bakeGround(ctx, tile, px, tintColor, key, ground?.canvas);
    // tile pixels -> device pixels, through the camera
    const k = a.sheet.groundTileSize / px;
    groundMatrix.a = cm.a * k;
    groundMatrix.b = cm.b * k;
    groundMatrix.c = cm.c * k;
    groundMatrix.d = cm.d * k;
    groundMatrix.e = cm.e;
    groundMatrix.f = cm.f;
    if (groundMatrix.b === 0 && Math.abs(groundMatrix.a - 1) < 0.003) {
      // at rest (no zoom punch, no roll) the tile maps 1:1 onto device pixels: snap it so it blits unfiltered
      groundMatrix.a = 1;
      groundMatrix.d = 1;
      groundMatrix.e = Math.round(cm.e);
      groundMatrix.f = Math.round(cm.f);
    }
    ground.pattern.setTransform(groundMatrix);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = ground.pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // ---- shadows, all in one pass (one texture)
  const drawShadows = (a: Art) => {
    const sh = a.sheet.shadow;
    for (let i = 0; i < drawList.length; i += 1) {
      const e = drawList[i];
      const p = poses[i];
      const s = SHADOW[e.kind];
      ctx.globalAlpha = (s[2] * p.alpha) / (1 + p.lift * 0.02);
      blit(sh, e.x, e.y + s[1], 0, ((s[0] / 64) * p.sx) / (1 + p.lift * 0.015));
    }
    ctx.globalAlpha = 0.7;
    for (const g of gems) {
      if (!g.pulled && inView(g.x, g.y, 10)) blit(sh, g.x, g.y + 6, 0, g.value >= 3 ? 0.22 : 0.17);
    }
    for (const p of pickups) {
      if (!inView(p.x, p.y, 30)) continue;
      ctx.globalAlpha = 0.8 * pickupBlink(p);
      blit(sh, p.x, p.y + 12, 0, 0.42);
    }
    for (const an of anchors) {
      if (!inView(an.x, an.y, 30)) continue;
      ctx.globalAlpha = clamp((an.life - an.age) * 2, 0, 1);
      blit(sh, an.x, an.y + 11, 0, 0.4);
    }
    if (deathTime < 0) {
      ctx.globalAlpha = 1;
      blit(sh, player.x, player.y + 14, 0, 0.48 - 0.03 * Math.abs(Math.sin(anim.bob)) * anim.moving);
    }
    ctx.globalAlpha = 1;
  };

  // ---- the robot's recent path, plotted like an optimiser trajectory on the contour map
  const TRAIL_BUCKETS = 4;
  const drawTrail = () => {
    const n = history.length;
    if (n < 2 || deathTime >= 0) return;
    worldSpace();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = PALETTE.blue;
    ctx.fillStyle = PALETTE.blue;
    ctx.lineWidth = 1;
    // older steps fade out: a thin polyline with a marker per step, one batch per age bucket
    for (let k = 0; k < TRAIL_BUCKETS; k += 1) {
      const from = Math.floor((k * (n - 1)) / TRAIL_BUCKETS);
      const to = Math.floor(((k + 1) * (n - 1)) / TRAIL_BUCKETS);
      ctx.globalAlpha = 0.08 + 0.28 * ((k + 1) / TRAIL_BUCKETS);
      ctx.beginPath();
      ctx.moveTo(history[from].x, history[from].y + 12);
      for (let i = from + 1; i <= to; i += 1) ctx.lineTo(history[i].x, history[i].y + 12);
      ctx.stroke();
      ctx.beginPath();
      for (let i = from; i < to; i += 1) {
        ctx.moveTo(history[i].x + 2.2, history[i].y + 12);
        ctx.arc(history[i].x, history[i].y + 12, 2.2, 0, TAU);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ---- dropout field: a ring of units, a fresh random fifth of them dropped on every tick
  const NEURONS = 14;
  let dropoutTick = 0;
  let lastAuraPulse = 0;
  const dropped = (k: number) => fract(Math.sin((dropoutTick * 31 + k) * 12.9898) * 43758.5453) < 0.2;
  const drawDropout = () => {
    if (!lvl("dropout") || deathTime >= 0) return;
    if (auraPulse > lastAuraPulse + 0.3) dropoutTick += 1;
    lastAuraPulse = auraPulse;
    const r = dropoutRadius();
    worldSpace();
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, TAU);
    ctx.globalAlpha = 0.07 + 0.07 * auraPulse;
    ctx.fillStyle = PALETTE.sky;
    ctx.fill();
    ctx.globalAlpha = 0.35 + 0.35 * auraPulse;
    ctx.strokeStyle = PALETTE.blue;
    ctx.lineWidth = 1.6 + 1.4 * auraPulse;
    ctx.setLineDash(FIELD_DASH);
    ctx.lineDashOffset = -clock * 14;
    ctx.stroke();
    ctx.setLineDash(NO_DASH);
    const ring = r * 0.5;
    const unit = 2.3 + auraPulse;
    for (let pass = 0; pass < 2; pass += 1) {
      ctx.beginPath();
      for (let k = 0; k < NEURONS; k += 1) {
        if (dropped(k) !== (pass === 1)) continue;
        const ang = (k / NEURONS) * TAU + clock * 0.25;
        const x = player.x + Math.cos(ang) * ring;
        const y = player.y + Math.sin(ang) * ring;
        ctx.moveTo(x + unit, y);
        ctx.arc(x, y, unit, 0, TAU);
      }
      if (pass === 0) {
        ctx.globalAlpha = 0.5 + 0.5 * auraPulse;
        ctx.fillStyle = PALETTE.blue;
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = PALETTE.grey;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  // ---- loot: tokens (citations) and pickups
  /** 1, or a blink that quickens over the last 5 s of a pickup's life. */
  const pickupBlink = (p: Pickup) => {
    const u = p.age - (PICKUP_LIFE - 5);
    return u <= 0 || Math.sin(u * (9 + 1.5 * u)) > -0.2 ? 1 : 0.2;
  };
  const pickupHover = (p: Pickup) => 5 + 3 * Math.sin(clock * 3 + p.phase);
  const drawLoot = (a: Art) => {
    const sheet = a.sheet;
    // tokens flying to the player leave a streak, one stroke per colour
    worldSpace();
    ctx.lineCap = "round";
    for (let pass = 0; pass < 2; pass += 1) {
      const big = pass === 1;
      let any = false;
      ctx.beginPath();
      for (const g of gems) {
        if (!g.pulled || g.value >= 3 !== big || !inView(g.x, g.y, 30)) continue;
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x - g.vx * 0.04, g.y - g.vy * 0.04);
        any = true;
      }
      if (!any) continue;
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = big ? PALETTE.gold : PALETTE.sky;
      ctx.lineWidth = big ? 4.5 : 3;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // tokens pop in, hover and twinkle
    for (const g of gems) {
      if (!inView(g.x, g.y, 14)) continue;
      const grow = g.age < 0.25 ? Math.max(0.05, easeOutBack(g.age / 0.25)) : 1;
      const twinkle = 1 + 0.07 * Math.sin(clock * 6 + g.phase);
      const hover = g.pulled ? 0 : 2 + 1.5 * Math.sin(clock * 3 + g.phase);
      blit(g.value >= 3 ? sheet.gem.big : sheet.gem.small, g.x, g.y - hover, 0, grow * twinkle);
    }
    // pickups hover over a pulsing halo
    for (const p of pickups) {
      if (!inView(p.x, p.y, 40)) continue;
      const fade = pickupBlink(p);
      const grow = p.age < 0.35 ? Math.max(0.05, easeOutBack(p.age / 0.35)) : 1;
      const y = p.y - pickupHover(p);
      ctx.globalAlpha = fade * (0.55 + 0.2 * Math.sin(clock * 4 + p.phase));
      blit(p.kind === "coffee" ? a.halo.gold : a.halo.red, p.x, y, 0, 0.75 * grow);
      ctx.globalAlpha = fade;
      blit(sheet.pickups[p.kind], p.x, y, Math.sin(clock * 2.2 + p.phase) * 0.1, 1.15 * grow);
    }
    ctx.globalAlpha = 1;
  };

  // ---- template anchors: dropped in from above, recoil on every shot
  const drawAnchors = (a: Art) => {
    for (const an of anchors) {
      if (!inView(an.x, an.y, 30)) continue;
      const land = Math.min(1, an.age / 0.3);
      const grow = Math.max(0.05, easeOutBack(land));
      const drop = (1 - easeOutCubic(land)) * 26;
      const recoil = Math.max(0, (an.fireCd - 0.43) / 0.12);
      ctx.globalAlpha = clamp((an.life - an.age) * 2, 0, 1);
      place(an.x, an.y + 10 - drop, 0, grow * (1 + 0.14 * recoil), grow * (1 - 0.14 * recoil));
      stamp(a.sheet.anchor, -10);
    }
    ctx.globalAlpha = 1;
  };

  // ---- enemies and Reviewer 2
  /** The manga anger mark, for Reviewer 2 in phase 2. */
  const drawAngerMark = (x: number, y: number, s: number) => {
    place(x, y, 0.2, s, s);
    ctx.beginPath();
    for (let q = 0; q < 4; q += 1) {
      const qx = q & 1 ? 1 : -1;
      const qy = q & 2 ? 1 : -1;
      ctx.moveTo(qx * 2.2, qy * 7.5);
      ctx.quadraticCurveTo(qx * 2.2, qy * 2.2, qx * 7.5, qy * 2.2);
    }
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = PALETTE.paper;
    ctx.stroke();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = PALETTE.red;
    ctx.stroke();
  };

  const drawBoss = (a: Art, e: Enemy, p: Pose) => {
    const set = a.sheet.enemies.boss;
    const enraged = boss.phase === "enraged";
    if (e.entrance > 0) {
      // the landing spot: a red target that tightens as Reviewer 2 drops in
      const falling = e.entrance / BOSS_ENTRANCE;
      worldSpace();
      ctx.globalAlpha = 0.3 + 0.6 * (1 - falling);
      ctx.strokeStyle = PALETTE.red;
      ctx.lineWidth = 3;
      ctx.setLineDash(LANDING_DASH);
      ctx.lineDashOffset = clock * 60;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + 40, e.r * (0.9 + falling), e.r * 0.36 * (0.9 + falling), 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash(NO_DASH);
    }
    if (enraged) {
      ctx.globalAlpha = 0.5 + 0.18 * Math.sin(clock * 5);
      blit(a.halo.red, e.x, e.y - p.lift, 0, (e.r * 3) / 32);
    }
    ctx.globalAlpha = 1;
    place(p.x, p.y - p.lift + p.pivot, p.rot, p.sx, p.sy);
    stamp(e.face < 0 ? set.left : set.right, -p.pivot);
    // rage and the wind-up before a volley flush it red; hits flash it white, capped (it is hit a lot)
    const red = (enraged ? 0.08 + 0.06 * Math.sin(clock * 6) : 0) + 0.25 * bossWindup();
    if (red > 0.01) {
      ctx.globalAlpha = Math.min(0.4, red);
      stamp(a.heat.boss, -p.pivot);
    }
    if (e.flash > 0) {
      ctx.globalAlpha = 0.3 * Math.min(1, e.flash / 0.05);
      stamp(set.flash, -p.pivot);
    }
    ctx.globalAlpha = 1;
    if (enraged) {
      const mark = poseLocal(p, -34, -42);
      drawAngerMark(mark.x, mark.y, 1.1 + 0.18 * Math.abs(Math.sin(clock * 6)));
    }
  };

  const drawEnemies = (a: Art) => {
    const sheet = a.sheet;
    for (let i = 0; i < drawList.length; i += 1) {
      const e = drawList[i];
      const p = poses[i];
      if (e.kind === "boss") {
        drawBoss(a, e, p);
        continue;
      }
      const set = e.kind === "comment" ? null : sheet.enemies[e.kind];
      ctx.globalAlpha = p.alpha;
      place(p.x, p.y - p.lift + p.pivot, p.rot, p.sx, p.sy);
      stamp(set ? (e.face < 0 ? set.left : set.right) : sheet.comments.sprites[e.variant], -p.pivot);
      if (e.kind === "explode" && e.hp < e.maxHp * 0.5) {
        // overheating: a red pulse, stronger as it nears detonation
        const heat = 1 - e.hp / (e.maxHp * 0.5);
        ctx.globalAlpha = p.alpha * heat * (0.3 + 0.25 * Math.sin(clock * 12 + e.id));
        stamp(a.heat.explode, -p.pivot);
      }
      if (e.flash > 0) {
        // capped, so the outline still shows through and a flashing bug never reads as a hole in the sand
        ctx.globalAlpha = p.alpha * Math.min(0.75, e.flash / 0.06);
        stamp(set ? set.flash : sheet.comments.flash[e.variant], -p.pivot);
      }
      if (e.kind === "explode") {
        // the fuse fizzles
        const tip = poseLocal(p, FUSE_TIP.x, FUSE_TIP.y);
        ctx.globalAlpha = p.alpha;
        blit(starOf(a, PALETTE.gold, clock * 9 + e.id), tip.x, tip.y, 0, 0.45 + 0.2 * Math.sin(clock * 37 + e.id * 2));
      }
    }
    ctx.globalAlpha = 1;
  };

  // ---- weapons
  const drawOrbitals = (a: Art) => {
    const dsv = lvl("dsv");
    if (dsv && deathTime < 0) {
      const n = dsvCount();
      const radius = dsvRadius();
      // the margin the support vectors ride on
      worldSpace();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = PALETTE.blue;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(MARGIN_DASH);
      ctx.lineDashOffset = -orbAngle * radius;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash(NO_DASH);
      // each vector trails a few afterimages, oldest first
      const orb = a.sheet.orb;
      for (let i = 0; i < n; i += 1) {
        const base = orbAngle + (i * TAU) / n;
        for (let k = 4; k >= 0; k -= 1) {
          const ang = base - k * 0.15;
          ctx.globalAlpha = k ? 0.3 * (1 - k / 5) : 1;
          blit(orb, player.x + Math.cos(ang) * radius, player.y + Math.sin(ang) * radius, 0, k ? 0.95 - k * 0.07 : 1);
        }
      }
    }
    // boomerangs: three fading copies, rotated back, read as motion blur
    for (const b of boomerangs) {
      if (!inView(b.x, b.y, 20)) continue;
      for (let k = 3; k >= 0; k -= 1) {
        ctx.globalAlpha = k ? 0.42 - k * 0.11 : 1;
        blit(a.sheet.boomerang, b.x, b.y, b.angle - k * 0.42, 1);
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawShots = (a: Art) => {
    const glow = a.sheet.glow;
    // light under the player's shots (one additive pass)
    ctx.globalCompositeOperation = "lighter";
    for (const b of bullets) {
      if (b.hostile || !inView(b.x, b.y, 24)) continue;
      ctx.globalAlpha = Math.min(1, b.life / 0.3) * 0.8;
      blit(b.src === "anchor" ? glow.orange : glow.blue, b.x, b.y, 0, 0.5);
    }
    ctx.globalCompositeOperation = "source-over";
    for (const b of bullets) {
      if (b.hostile || !inView(b.x, b.y, 24)) continue;
      const fade = Math.min(1, b.life / 0.3);
      const rot = Math.atan2(b.vy, b.vx);
      const sprite = b.src === "anchor" ? a.anchorBolt : a.sheet.bolt;
      // a stretched, faded copy behind it reads as a short trail
      ctx.globalAlpha = fade * 0.35;
      place(b.x - b.vx * 0.018, b.y - b.vy * 0.018, rot, 1.7, 0.75);
      stamp(sprite);
      ctx.globalAlpha = fade;
      place(b.x, b.y, rot, 1, 1);
      stamp(sprite);
    }
    // Reviewer 2's rejections: a pulsing red danger halo; never rotated (a turned ✗ reads as +).
    // They grow in as they leave its outline, so a fresh volley does not cover its face.
    const r2 = boss.enemy;
    for (const b of bullets) {
      if (!b.hostile || !inView(b.x, b.y, 24)) continue;
      const out = r2 ? (Math.hypot(b.x - r2.x, b.y - r2.y) - r2.r * 0.6) / (r2.r * 0.5) : 1;
      const grow = clamp(Math.max(out, (BOSS_SHOT_LIFE - b.life) / 0.5), 0, 1);
      const fade = Math.min(1, b.life / 0.3, grow);
      const pulse = 0.5 + 0.5 * Math.sin(clock * 11 + Math.atan2(b.vy, b.vx) * 3);
      const size = 0.4 + 0.6 * grow;
      ctx.globalAlpha = fade * (0.5 + 0.3 * pulse);
      blit(a.halo.red, b.x, b.y, 0, (0.42 + 0.08 * pulse) * size);
      ctx.globalAlpha = fade;
      blit(a.sheet.hostileBolt, b.x, b.y, 0, (1 + 0.08 * pulse) * size);
    }
    ctx.globalAlpha = 1;
  };

  // ---- player
  const antenna = { x: 0, y: 0, on: false, alarm: false };
  /** Pupils, blinks and moods inside the visor; the frame's anchor is `dy` units down. */
  const drawFace = (dy: number, happy: boolean) => {
    const cx = PLAYER_VISOR.x;
    const cy = PLAYER_VISOR.y + dy;
    const lx = player.faceX * 2.6;
    const ly = player.faceY * 1.5;
    ctx.fillStyle = PALETTE.ink;
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (happy) {
      // ^ ^
      for (let s = -1; s <= 1; s += 2) {
        ctx.moveTo(cx + s * 4.6 - 2.6, cy + 1);
        ctx.lineTo(cx + s * 4.6, cy - 1.6);
        ctx.lineTo(cx + s * 4.6 + 2.6, cy + 1);
      }
      ctx.stroke();
    } else if (anim.hurt > 0.12) {
      // > <
      for (let s = -1; s <= 1; s += 2) {
        ctx.moveTo(cx + s * 7, cy - 2.2);
        ctx.lineTo(cx + s * 3.4, cy);
        ctx.lineTo(cx + s * 7, cy + 2.2);
      }
      ctx.stroke();
    } else if (anim.blink > 0) {
      for (let s = -1; s <= 1; s += 2) {
        ctx.moveTo(cx + s * 7 + lx, cy + ly);
        ctx.lineTo(cx + s * 2.6 + lx, cy + ly);
      }
      ctx.stroke();
    } else {
      const r = anim.lowSanity ? 1.9 : 2.5;
      for (let s = -1; s <= 1; s += 2) {
        ctx.moveTo(cx + s * 4.6 + lx + r, cy + ly);
        ctx.arc(cx + s * 4.6 + lx, cy + ly, r, 0, TAU);
      }
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      for (let s = -1; s <= 1; s += 2) {
        const gx = cx + s * 4.6 + lx - r * 0.35;
        const gy = cy + ly - r * 0.4;
        ctx.moveTo(gx + r * 0.32, gy);
        ctx.arc(gx, gy, r * 0.32, 0, TAU);
      }
      ctx.fill();
    }
    if (anim.lowSanity) {
      // a sweat drop slides down the side of the head
      const y = dy - 15 + ((clock * 9) % 7);
      ctx.beginPath();
      ctx.moveTo(13, y - 3.4);
      ctx.quadraticCurveTo(15.6, y + 0.6, 13, y + 1.8);
      ctx.quadraticCurveTo(10.4, y + 0.6, 13, y - 3.4);
      ctx.fillStyle = "#bfe0f7";
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = PALETTE.blueDark;
      ctx.stroke();
    }
  };

  const drawPlayer = (a: Art) => {
    const sheet = a.sheet;
    if (deathTime >= 0) {
      if (dying > 0) {
        // popped: its ghost drifts up during the death beat
        const q = 1 - dying / DEATH_BEAT;
        ctx.globalAlpha = 0.6 * (1 - q);
        blit(sheet.player.flash, player.x, player.y - 4 - q * 36, Math.sin(q * 8) * 0.15, 1 + 0.2 * q);
        ctx.globalAlpha = 1;
      }
      return;
    }
    const happy = choosing || levelUpDelay > 0 || victory > 0;
    if (happy) {
      // a halo and a sunburst behind the player; the rays turn in real time while the world is frozen
      const gold = victory > 0;
      ctx.globalAlpha = 0.9;
      blit(gold ? a.halo.gold : a.halo.blue, player.x, player.y - 4, 0, 1.6);
      ctx.globalAlpha = gold ? 0.8 : 0.7;
      blit(gold ? a.rays.gold : a.rays.blue, player.x, player.y - 4, shakeClock * 0.5, 1.4);
    }
    // i-frames flicker white instead of fading: the robot stays visible inside a swarm
    const blink = player.iframes > 0 && Math.floor(player.iframes * 18) % 2 === 0;
    const hop = Math.abs(Math.sin(anim.bob)) * 2.6 * anim.moving;
    const breathe = Math.sin(clock * 3) * 0.035 * (1 - anim.moving);
    const sx = 1 + 0.2 * anim.squash - breathe;
    const sy = 1 - 0.16 * anim.squash + breathe;
    const rot = anim.lean * 0.12;
    const pivot = 13;
    const fy = player.y - hop + pivot;
    place(player.x, fy, rot, sx, sy);
    ctx.globalAlpha = 0.9;
    stamp(a.rim, -pivot);
    ctx.globalAlpha = 1;
    stamp(sheet.player.body, -pivot);
    if (anim.hurt > 0) {
      ctx.globalAlpha = Math.min(1, anim.hurt / 0.3) * 0.45;
      stamp(a.heat.player, -pivot);
    }
    if (blink) {
      ctx.globalAlpha = 0.55;
      stamp(sheet.player.flash, -pivot);
    }
    ctx.globalAlpha = 1;
    drawFace(-pivot, happy);
    // the antenna light: a calm blink, frantic red at low sanity
    const alarm = anim.lowSanity;
    const on = alarm ? Math.sin(clock * 18) > 0 : Math.sin(clock * 3.2) > -0.4;
    const tx = PLAYER_ANTENNA_TIP.x;
    const ty = PLAYER_ANTENNA_TIP.y - pivot;
    ctx.beginPath();
    ctx.arc(tx, ty, alarm && on ? 3.6 : 3, 0, TAU);
    ctx.fillStyle = alarm ? (on ? PALETTE.red : "#8e3b3b") : on ? PALETTE.gold : "#b48f52";
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "#3d2a12";
    ctx.stroke();
    if (on) {
      ctx.beginPath();
      ctx.arc(tx - 1, ty - 1, 0.9, 0, TAU);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
    framePoint(player.x, fy, rot, sx, sy, tx, ty);
    antenna.x = pt.x;
    antenna.y = pt.y;
    antenna.on = on;
    antenna.alarm = alarm;
  };

  // ---- light passes
  /** Under the middle layer: fuses, Reviewer 2's aura and pen, pickups, token glints, support vectors. */
  const drawLowLights = (a: Art) => {
    const glow = a.sheet.glow;
    for (let i = 0; i < drawList.length; i += 1) {
      const e = drawList[i];
      const p = poses[i];
      if (e.kind === "explode") {
        const tip = poseLocal(p, FUSE_TIP.x, FUSE_TIP.y);
        ctx.globalAlpha = p.alpha * (0.65 + 0.35 * Math.sin(clock * 41 + e.id));
        blit(glow.orange, tip.x, tip.y, 0, 0.4);
      } else if (e.kind === "boss") {
        if (boss.phase === "enraged") {
          ctx.globalAlpha = 0.35 + 0.15 * Math.sin(clock * 5);
          blit(glow.red, p.x, p.y - p.lift, 0, (e.r * 2.4) / 32);
        }
        const windup = bossWindup();
        if (windup > 0) {
          const tip = poseLocal(p, BOSS_PEN_TIP.x, BOSS_PEN_TIP.y);
          ctx.globalAlpha = windup;
          blit(glow.red, tip.x, tip.y, 0, 0.35 + 0.5 * windup);
          blit(glow.white, tip.x, tip.y, 0, 0.25 * windup);
        }
      }
    }
    for (const p of pickups) {
      if (!inView(p.x, p.y, 40)) continue;
      ctx.globalAlpha = pickupBlink(p) * (0.6 + 0.25 * Math.sin(clock * 4 + p.phase));
      blit(p.kind === "coffee" ? glow.gold : glow.red, p.x, p.y - pickupHover(p), 0, 0.75);
    }
    // now and then a glint on a resting token
    for (const g of gems) {
      const glint = Math.sin(clock * 2.1 + g.phase * 7);
      if (glint < 0.94 || g.pulled || !inView(g.x, g.y, 10)) continue;
      ctx.globalAlpha = (glint - 0.94) / 0.06;
      blit(a.sheet.spark, g.x - 2, g.y - 7 - 1.5 * Math.sin(clock * 3 + g.phase), 0, 0.55);
    }
    if (lvl("dsv") && deathTime < 0) {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < dsvCount(); i += 1) {
        const o = dsvOrb(i);
        blit(glow.blue, o.x, o.y, 0, 0.5);
      }
    }
    ctx.globalAlpha = 1;
  };

  /** Over everything: the antenna, beam cores, flashes and sparks. */
  const drawHighLights = (a: Art) => {
    if (antenna.on && deathTime < 0) {
      ctx.globalAlpha = antenna.alarm ? 0.9 : 0.6;
      blit(antenna.alarm ? a.sheet.glow.red : a.sheet.glow.gold, antenna.x, antenna.y, 0, antenna.alarm ? 0.42 : 0.3);
      ctx.globalAlpha = 1;
    }
    drawBeams(a, true);
    drawRings(a, true);
    drawParticles(a, true);
  };

  // ---- effects
  /** Attention beams: a blue body (normal blend) under a white-hot core with motes (additive). */
  const drawBeams = (a: Art, light: boolean) => {
    for (const b of beams) {
      const k = b.life / b.max;
      const w = b.width * (0.75 + 0.5 * k);
      const dx = b.x2 - b.x1;
      const dy = b.y2 - b.y1;
      const len = Math.hypot(dx, dy) || 1;
      // it leaves from the robot's edge, not through its face
      const x0 = b.x1 + (dx / len) * 15;
      const y0 = b.y1 + (dy / len) * 15;
      worldSpace();
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(b.x2, b.y2);
      if (!light) {
        ctx.globalAlpha = 0.35 * k;
        ctx.strokeStyle = PALETTE.sky;
        ctx.lineWidth = w * 2.6;
        ctx.stroke();
        ctx.globalAlpha = 0.75 * k;
        ctx.strokeStyle = PALETTE.blue;
        ctx.lineWidth = w * 1.15;
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = k;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = w * 0.5;
      ctx.stroke();
      const seed = b.x2 * 0.37 + b.y2 * 0.61;
      for (let i = 0; i < 8; i += 1) {
        const f = fract(seed + i * 0.618);
        const side = (fract(seed * 1.7 + i * 0.37) - 0.5) * w * (0.6 + 2.2 * (1 - k));
        blit(a.sheet.spark, x0 + (b.x2 - x0) * f - (dy / len) * side, y0 + (b.y2 - y0) * f + (dx / len) * side, 0, 0.6 * k + 0.25);
      }
      blit(a.sheet.glow.white, x0, y0, 0, 0.6 * k);
    }
    ctx.globalAlpha = 1;
  };

  /** SHOT shockwaves: a soft lit disc inside a double ring. */
  const drawWaves = (a: Art) => {
    for (const w of waves) {
      const p = Math.min(1, w.t / WAVE_TIME);
      const r = p * w.maxR;
      if (r < 1 || !inView(w.x, w.y, r + 10)) continue;
      const k = 1 - p;
      ctx.globalAlpha = k * 0.9;
      blit(a.ripple.orange, w.x, w.y, 0, r / 32);
      worldSpace();
      ctx.globalAlpha = k;
      ctx.strokeStyle = PALETTE.orange;
      ctx.lineWidth = 2 + 5 * k;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = k * 0.7;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1 + 2.5 * k;
      ctx.beginPath();
      ctx.arc(w.x, w.y, r * 0.84, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  /** Rings: death pops, blasts with a fireball, the level-up pushback; `light` adds their flashes. */
  const drawRings = (a: Art, light: boolean) => {
    const glow = a.sheet.glow;
    for (const r of rings) {
      if (r.t < 0) continue;
      const p = Math.min(1, r.t / r.dur);
      const radius = Math.max(0, r.r0 + (r.r1 - r.r0) * easeOutCubic(p));
      if (!inView(r.x, r.y, radius + 30)) continue;
      const k = 1 - p;
      const fireball = r.kind === "blast" && r.color === PALETTE.orange;
      if (light) {
        let flash: Sprite | null = null;
        let size = 0;
        if (fireball) {
          flash = glow.gold;
          size = BLAST_R * 1.6;
        } else if (r.kind === "impact") {
          flash = glow.white;
          size = 160;
        } else if (r.kind === "victory" || (r.kind === "boss" && r.color === PALETTE.gold)) {
          flash = glow.gold;
          size = 200;
        } else if (r.kind === "revive") {
          flash = glow.cyan;
          size = 110;
        } else if (r.kind === "enrage") {
          flash = glow.red;
          size = 140;
        }
        if (flash && p < 0.5) {
          ctx.globalAlpha = (1 - p / 0.5) ** 2;
          blit(flash, r.x, r.y, 0, size / 32);
        }
        continue;
      }
      if (fireball && p < 0.6) {
        ctx.globalAlpha = 1 - p / 0.6;
        blit(a.halo.orange, r.x, r.y, 0, (radius * 1.1) / 32);
      }
      // the big rings light up their inside
      const inner = r.kind === "levelup" || r.kind === "revive" ? a.ripple.blue : r.kind === "victory" || (r.kind === "boss" && r.color === PALETTE.gold) ? a.ripple.gold : null;
      if (inner && radius > 4) {
        ctx.globalAlpha = k * 0.9;
        blit(inner, r.x, r.y, 0, radius / 32);
      }
      worldSpace();
      if ((r.kind === "pop" && p < 0.35) || (fireball && p < 0.3)) {
        // a quick paper-white poof inside a pop; the flash disc of an explosion
        ctx.globalAlpha = fireball ? 1 - p / 0.3 : (1 - p / 0.35) * 0.75;
        ctx.fillStyle = PALETTE.paper;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius * (fireball ? 0.8 : 0.7), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - p * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, TAU);
      ctx.stroke();
      if (r.kind === "levelup" || r.kind === "victory") {
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = r.width * 0.4 * k;
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius * 0.9, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  /** A spark fast enough to draw as a streak (slow ones become little stars). */
  const streaking = (p: Particle) => Math.abs(p.vx) + Math.abs(p.vy) > 40;
  /** The level-up burst waits, unborn, while the cards are up: it bursts out after the pick. */
  const unborn = (p: Particle) => p.life === p.max && (choosing || levelUpDelay > 0);
  const sparkPath = () => {
    ctx.beginPath();
    for (const p of particles) {
      if (p.kind !== "spark" || !streaking(p) || unborn(p) || !inView(p.x, p.y, 20)) continue;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
    }
  };
  /** Particles; `light` draws the additive white cores of the spark streaks. */
  const drawParticles = (a: Art, light: boolean) => {
    worldSpace();
    ctx.lineCap = "round";
    sparkPath();
    if (light) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    // warm underlay so the streaks also read on sand
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = SPARK_UNDER;
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const p of particles) {
      if (unborn(p) || !inView(p.x, p.y, 24)) continue;
      const f = p.life / p.max;
      switch (p.kind) {
        case "debris":
          ctx.globalAlpha = Math.min(1, f * 3);
          blit(shardOf(a, p.color, p.rot), p.x, p.y, 0, (p.size / 6) * (0.55 + 0.45 * f));
          break;
        case "confetti": {
          // spinning paper: its width follows the flip, the back is darker
          const flip = Math.cos(p.rot * 1.4);
          ctx.globalAlpha = Math.min(1, f * 3);
          place(p.x, p.y, p.rot * 0.45, 1.5, 1.5);
          ctx.fillStyle = flip > 0 ? p.color : backOf(p.color);
          ctx.fillRect(-p.size * 0.5 * Math.abs(flip), -p.size * 0.32, p.size * Math.abs(flip), p.size * 0.64);
          break;
        }
        case "dust":
          ctx.globalAlpha = f * 0.7;
          blit(a.puff, p.x, p.y, 0, (p.size * (1.7 - 0.7 * f)) / 16);
          break;
        case "smoke":
          // rises after the flash, then thins out
          ctx.globalAlpha = Math.min(1, (1 - f) * 4) * f * 0.5;
          blit(a.smoke, p.x, p.y, 0, (p.size * (2 - f)) / 16);
          break;
        case "heal":
          ctx.globalAlpha = Math.min(1, f * 2);
          blit(a.plus, p.x, p.y, 0, p.size / 7);
          break;
        case "sparkle":
          ctx.globalAlpha = Math.min(1, f * 2);
          blit(starOf(a, p.color, p.rot * 0.3), p.x, p.y, 0, (p.size / 6) * (0.5 + 0.5 * f));
          break;
        case "spark":
          if (streaking(p)) break;
          ctx.globalAlpha = f;
          blit(starOf(a, p.color, p.rot), p.x, p.y, 0, p.size / 6);
          break;
        case "resolved": {
          // an addressed reviewer comment: a green ✓ pops and rises
          const age = p.max - p.life;
          ctx.globalAlpha = Math.min(1, f * 3);
          blit(a.check, p.x, p.y, Math.sin(age * 14) * 0.25 * Math.max(0, 1 - age * 3), Math.max(0.05, easeOutBack(Math.min(1, age / 0.2))));
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  const critLabels = new Map<string, string>();
  /** Damage numbers pop in; crits are gold, bigger, outlined in ink and shout "!". */
  const drawNumbers = () => {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const big = readable();
    let current = "";
    for (const text of texts) {
      if (!inView(text.x, text.y, 40)) continue;
      const age = text.max - text.life;
      let s: number;
      let rot = 0;
      if (text.crit) {
        const q = Math.min(1, age / 0.16);
        s = 1 + 0.9 * (1 - easeOutCubic(q));
        rot = -0.12 * (1 - q);
      } else {
        s = Math.max(0.05, easeOutBack(Math.min(1, age / 0.12)));
      }
      const f = font(800, text.size);
      if (f !== current) {
        ctx.font = f;
        current = f;
      }
      let label = text.text;
      if (text.crit) {
        let shout = critLabels.get(text.text);
        if (!shout) {
          shout = `${text.text}!`;
          critLabels.set(text.text, shout);
        }
        label = shout;
      }
      ctx.globalAlpha = Math.min(1, text.life * 4);
      place(text.x, text.y, rot, s * big, s * big);
      ctx.lineWidth = text.crit ? 5 : 3.4;
      ctx.strokeStyle = text.crit ? PALETTE.ink : PALETTE.paper;
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = text.crit ? PALETTE.gold : text.color;
      ctx.fillText(label, 0, 0);
    }
    ctx.globalAlpha = 1;
  };

  // ---- Reviewer 2's speech bubble (typewriter)
  const SPEECH_LINE = 16;
  const speechLines: string[] = [];
  let speechFor = "";
  let speechWidth = 0;
  const drawSpeech = (a: Art) => {
    if (!speech.visible) return;
    ctx.font = font(700, 13);
    if (speechFor !== speech.text) {
      // wrap the whole line once, so the bubble keeps its size while it types
      speechFor = speech.text;
      speechLines.length = 0;
      let line = "";
      for (const word of speech.text.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > 220) {
          speechLines.push(line);
          line = word;
        } else line = next;
      }
      speechLines.push(line);
      speechWidth = 0;
      for (const l of speechLines) speechWidth = Math.max(speechWidth, ctx.measureText(l).width);
    }
    const k = Math.min(1.3, 1 / baseZoom());
    const w = speechWidth + 28;
    const h = speechLines.length * SPEECH_LINE + 14;
    const gap = 13;
    const final = speech.final;
    const angry = boss.phase === "enraged" && !final;
    // the tail points at the top of Reviewer 2 (riding its bob) or where it fell;
    // the bubble slides along to stay on screen
    let tipX = speech.x;
    let tipY = speech.y - (final ? 2 : 6 + bossLift);
    const half = (w / 2 + 10) * k;
    const cx = clamp(tipX, view.l + half, view.r - half);
    const top = tipY - (gap + h) * k;
    if (top < view.t + 10 * k) tipY += view.t + 10 * k - top;
    if (angry && !options.reducedMotion) tipX += Math.sin(clock * 47) * 0.8;
    const pop = Math.max(0.05, easeOutBack(Math.min(1, speech.age / 0.16)));
    place(tipX, tipY, 0, k * pop, k * pop);
    const bx = (cx - tipX) / k - w / 2;
    const by = -gap - h;
    const base = clamp(0, bx + 18, bx + w - 18);
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 11);
    // the tail winds the same way as the rounded rectangle, so their overlap stays filled
    ctx.moveTo(base + 7, -gap - 3);
    ctx.lineTo(0, 0);
    ctx.lineTo(base - 7, -gap - 3);
    ctx.closePath();
    // stroked at twice the width, then filled: one clean outline around bubble and tail
    ctx.lineJoin = "round";
    ctx.lineWidth = 5;
    ctx.strokeStyle = angry ? PALETTE.red : final ? GOLD_LINE : PALETTE.ink;
    ctx.stroke();
    ctx.fillStyle = PALETTE.paper;
    ctx.fill();
    // the text typed so far, with a blinking caret
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const tx = bx + 16;
    const ty = by + 7 + SPEECH_LINE / 2;
    let left = speech.shown;
    let part = "";
    let row = 0;
    for (let i = 0; i < speechLines.length && left > 0; i += 1) {
      const line = speechLines[i];
      part = left >= line.length ? line : line.slice(0, left);
      row = i;
      ctx.fillText(part, tx, ty + i * SPEECH_LINE);
      left -= line.length + 1;
    }
    if (speech.shown < speech.text.length && Math.sin(clock * 18) > -0.3) {
      ctx.fillRect(tx + ctx.measureText(part).width + 1, ty + row * SPEECH_LINE - 6, 1.8, 12);
    }
    // the reviewer's avatar on the corner; a ✓ once the score is raised
    const badge = a.badge;
    ctx.drawImage(badge.canvas, bx + 3 - badge.w * 0.45, by + 3 - badge.h * 0.45, badge.w * 0.9, badge.h * 0.9);
    if (final) ctx.drawImage(a.check.canvas, bx + w - 3 - a.check.w * 0.45, by + 3 - a.check.h * 0.45, a.check.w * 0.9, a.check.h * 0.9);
  };

  // ---- screen space
  const marker = { x: 0, y: 0, angle: 0 };
  /** Where an off-screen world point meets the screen edge (inset px), into marker; false while visible. */
  const offscreen = (x: number, y: number, inset: number, slack: number) => {
    const dx = (x - cam.x) * cam.zoom;
    const dy = (y - cam.y) * cam.zoom;
    if (Math.abs(dx) < width / 2 + slack && Math.abs(dy) < height / 2 + slack) return false;
    const k = Math.min((width / 2 - inset) / Math.max(1e-6, Math.abs(dx)), (height / 2 - inset) / Math.max(1e-6, Math.abs(dy)));
    marker.x = width / 2 + dx * k;
    marker.y = height / 2 + dy * k;
    marker.angle = Math.atan2(dy, dx);
    return true;
  };

  /** Arrows at the screen edge towards off-screen pickups and Reviewer 2. */
  const drawMarkers = (a: Art) => {
    ctx.lineJoin = "round";
    for (const p of pickups) {
      if (!offscreen(p.x, p.y, 26, 6)) continue;
      const c = Math.cos(marker.angle);
      const s = Math.sin(marker.angle);
      ctx.globalAlpha = pickupBlink(p);
      ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, dpr * marker.x, dpr * marker.y);
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(10, -6.5);
      ctx.lineTo(10, 6.5);
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();
      ctx.fillStyle = p.kind === "coffee" ? PALETTE.orange : PALETTE.red;
      ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, dpr * marker.x, dpr * marker.y);
      ctx.beginPath();
      ctx.arc(0, 0, 12.5, 0, TAU);
      ctx.fillStyle = PALETTE.paper;
      ctx.fill();
      ctx.stroke();
      const icon = a.sheet.pickups[p.kind];
      ctx.drawImage(icon.canvas, -icon.ax * 0.62, -icon.ay * 0.62, icon.w * 0.62, icon.h * 0.62);
    }
    const b = boss.enemy;
    if (b && b.entrance <= 0 && offscreen(b.x, b.y, 34, -b.r * cam.zoom * 0.5)) {
      const c = Math.cos(marker.angle);
      const s = Math.sin(marker.angle);
      const pulse = 1 + 0.1 * Math.sin(clock * 9);
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr * c * pulse, dpr * s * pulse, -dpr * s * pulse, dpr * c * pulse, dpr * marker.x, dpr * marker.y);
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(13, -14);
      ctx.lineTo(18, 0);
      ctx.lineTo(13, 14);
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = PALETTE.ink;
      ctx.stroke();
      ctx.fillStyle = PALETTE.red;
      ctx.fill();
      const badge = a.badge;
      ctx.setTransform(dpr * pulse, 0, 0, dpr * pulse, dpr * marker.x, dpr * marker.y);
      ctx.drawImage(badge.canvas, -badge.ax * 1.4, -badge.ay * 1.4, badge.w * 1.4, badge.h * 1.4);
    }
    ctx.globalAlpha = 1;
  };

  const drawScreen = (a: Art, s: ScreenArt) => {
    screenSpace();
    // warm vignette: stronger behind the title screen, at dusk and in slow motion
    ctx.globalAlpha = mode === "attract" ? 1 : Math.min(1, 0.62 + 0.25 * (t / RUN_LENGTH) + 0.6 * (1 - timeScale));
    ctx.drawImage(s.vignette, 0, 0, width, height);
    // red edges: a heartbeat in sync with its sound at low sanity, a siren while Reviewer 2 is on the way
    let red = 0;
    if (anim.lowSanity && deathTime < 0) {
      const since = 0.9 - heartTimer;
      red = 0.4 + 0.6 * Math.exp(-since * 10) + (since > 0.2 ? 0.4 * Math.exp(-(since - 0.2) * 10) : 0);
    }
    if (boss.phase === "warning") red = Math.max(red, (0.3 + 0.4 * (1 - boss.warn / BOSS_WARNING)) * (0.6 + 0.4 * Math.sin(clock * 10)));
    if (options.reducedMotion) red *= 0.5;
    if (screenFlash.alpha > 0 && screenFlash.color === PALETTE.red) red = Math.max(red, screenFlash.alpha * 2.5);
    if (red > 0) {
      ctx.globalAlpha = Math.min(1, red);
      ctx.drawImage(s.redEdge, 0, 0, width, height);
    }
    // full-screen flashes (already halved for reduced motion); red ones mostly live on the edges
    if (screenFlash.alpha > 0) {
      ctx.globalAlpha = screenFlash.color === PALETTE.red ? screenFlash.alpha * 0.45 : screenFlash.alpha;
      ctx.fillStyle = screenFlash.color;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalAlpha = 1;
    drawMarkers(a);
  };

  const draw = () => {
    const a = (art ??= bakeArt(dpr));
    const s = (screenArt ??= bakeScreenArt(width, height));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    setCamera();
    drawGround(a);
    poseEnemies();
    drawShadows(a);
    drawTrail();
    drawDropout();
    drawLoot(a);
    drawAnchors(a);
    drawEnemies(a);
    ctx.globalCompositeOperation = "lighter";
    drawLowLights(a);
    ctx.globalCompositeOperation = "source-over";
    drawOrbitals(a);
    drawShots(a);
    drawPlayer(a);
    drawBeams(a, false);
    drawWaves(a);
    drawRings(a, false);
    drawParticles(a, false);
    ctx.globalCompositeOperation = "lighter";
    drawHighLights(a);
    ctx.globalCompositeOperation = "source-over";
    drawNumbers();
    drawSpeech(a);
    drawScreen(a, s);
  };

  // ---------------------------------------------------------- loop
  const reset = (nextMode: Mode) => {
    mode = nextMode;
    t = 0;
    clock = 0;
    paused = false;
    ended = false;
    choosing = false;
    levelUpDelay = 0;
    offeredCards = [];
    pendingLevelUps = 0;
    spawnTimer = 0;
    hudTimer = 0;
    heartTimer = 0;
    bossDefeated = false;
    oneMinuteToasted = false;
    magnetDrops = 0;
    deathTime = -1;
    lastResult = null;
    level = 1;
    xp = 0;
    kills = 0;
    combo = 0;
    comboTimer = 0;
    maxCombo = 0;
    hitsTaken = 0;
    gemChain = 0;
    lastGemAt = -1;
    critStopCd = 0;
    Object.assign(player, { x: 0, y: 0, vx: 0, vy: 0, hp: BASE_HP, iframes: 0, faceX: 1, faceY: 0, revives: 0 });
    Object.assign(anim, { moving: 0, bob: 0, squash: 0, lean: 0, dust: 0, hurt: 0, blink: 0, blinkIn: 3, lowSanity: false });
    Object.assign(autopilot, { heading: Math.random() * TAU, mx: 0, my: 0 });
    history.length = 0;
    historyTimer = 0;
    for (const key of Object.keys(levels)) delete levels[key];
    for (const key of Object.keys(cooldowns)) delete cooldowns[key];
    levels.gradient = mode === "run" ? 1 : 2;
    if (mode === "attract") levels.dsv = 2; // a livelier demo
    recomputeStats();
    player.hp = player.maxHp;
    enemies.length = 0;
    bullets.length = 0;
    gems.length = 0;
    pickups.length = 0;
    for (const p of particles) particlePool.push(p);
    particles.length = 0;
    rings.length = 0;
    texts.length = 0;
    boomerangs.length = 0;
    anchors.length = 0;
    waves.length = 0;
    beams.length = 0;
    blasts.length = 0;
    orbAngle = 0;
    auraTick = 0;
    auraPulse = 0;
    Object.assign(boss, { phase: "none", enemy: null, warn: 0, fireCd: 0, summonCd: 0, volleys: 0 });
    Object.assign(speech, { text: "", shown: 0, age: 0, hold: 0, gap: 0, x: 0, y: 0, visible: false, final: false, last: -1 });
    hitStop = 0;
    timeScale = 1;
    Object.assign(slowMo, { from: 1, t: 0, dur: 0 });
    trauma = 0;
    victory = 0;
    dying = 0;
    Object.assign(cam, { x: 0, y: 0, leadX: 0, leadY: 0, punch: 0, shakeX: 0, shakeY: 0, shakeRot: 0 });
    screenFlash.alpha = 0;
  };

  const perf = { update: 0, draw: 0, frame: 1000 / 60 };
  const average = (prev: number, sample: number) => prev + (sample - prev) * 0.05;
  let last = performance.now();
  let raf = 0;
  let disposed = false;
  const frame = (now: number) => {
    if (disposed) return;
    const elapsed = Math.max(0, now - last);
    last = now;
    const realDt = Math.min(elapsed / 1000, 0.05);
    const t0 = performance.now();
    if (!paused && !ended) advance(realDt);
    const t1 = performance.now();
    present(realDt);
    draw();
    const t2 = performance.now();
    perf.update = average(perf.update, t1 - t0);
    perf.draw = average(perf.draw, t2 - t1);
    if (elapsed > 0 && elapsed < 250) perf.frame = average(perf.frame, elapsed);
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    if (document.hidden && mode === "run" && !ended && !paused && !choosing) {
      paused = true;
      callbacks.onAutoPause();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  reset("attract");
  raf = requestAnimationFrame(frame);

  // ---------------------------------------------------------- debug hook (?debug)
  type DebugWindow = { __survivors?: unknown };
  let debugHook: object | null = null;
  if (new URLSearchParams(window.location.search).has("debug")) {
    const nearestGem = () => {
      let best: Gem | null = null;
      let bestD = Infinity;
      for (const g of gems) {
        const d = (g.x - player.x) ** 2 + (g.y - player.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = g;
        }
      }
      return best;
    };
    const nearestShot = (maxDist: number) => {
      let best: Bullet | null = null;
      let bestD = maxDist * maxDist;
      for (const b of bullets) {
        const d = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
        if (b.hostile && d < bestD) {
          bestD = d;
          best = b;
        }
      }
      return best;
    };
    const rel = (p: { x: number; y: number } | null) => (p ? { dx: p.x - player.x, dy: p.y - player.y } : null);
    debugHook = {
      get t() {
        return t;
      },
      set t(value: number) {
        t = value;
      },
      player,
      levels,
      /** The live Reviewer 2 enemy (mutable, e.g. hp), or null. */
      get boss() {
        return boss.enemy;
      },
      get enemies() {
        return enemies.length;
      },
      get info() {
        return {
          mode,
          kills,
          xp,
          level,
          pendingLevelUps,
          gems: gems.length,
          choosing,
          paused,
          ended,
          combo,
          maxCombo,
          boss: boss.phase,
          pickups: pickups.map((p) => ({ kind: p.kind, ...rel(p)!, age: p.age })),
          gem: rel(nearestGem()),
          threat: rel(nearestEnemy(player.x, player.y, 140)),
          shot: rel(nearestShot(140)),
        };
      },
      addXp: (amount: number) => {
        xp += amount;
      },
      /** Simulation speed multiplier 1..8 (fixed sub-steps of at most 1/30 s). */
      get speed() {
        return debugSpeed;
      },
      set speed(value: number) {
        debugSpeed = clamp(Number(value) || 1, 1, 8);
      },
      get godMode() {
        return godMode;
      },
      set godMode(value: boolean) {
        godMode = Boolean(value);
      },
      /** Sets a card level and applies its effects (heal, max sanity, revives, ...). */
      setLevel: (id: string, value: number) => {
        const def = CARDS.find((card) => card.id === id);
        if (!def) return;
        const target = clamp(Math.floor(value), 0, def.maxLevel);
        while (lvl(id) < target) applyCard(id);
        if (lvl(id) > target) {
          levels[id] = target;
          if (id === "acro") player.revives = Math.min(player.revives, target);
          recomputeStats();
        }
        if (!levels[id]) delete levels[id];
      },
      spawn: (kind: EnemyKind, count = 1) => {
        if (!(kind in ENEMY)) return;
        if (kind === "boss") {
          if (!boss.enemy) spawnBoss();
          return;
        }
        for (let i = 0; i < count; i += 1) spawnAtEdge(kind);
      },
      spawnBoss: () => {
        if (!boss.enemy) spawnBoss();
      },
      spawnPickup: (kind: PickupKind) => {
        if (kind === "coffee" || kind === "magnet") dropNearPlayer(kind);
      },
      killBoss: () => {
        const b = boss.enemy;
        if (!b) return;
        b.entrance = 0;
        kill(b, false);
        removeDead();
      },
      /** Rolling averages in ms (update = simulation, draw = rendering, frame = time between frames). */
      get perf() {
        return {
          update: perf.update,
          draw: perf.draw,
          frame: perf.frame,
          fps: 1000 / perf.frame,
          enemies: enemies.length,
          particles: particles.length,
          bullets: bullets.length,
          gems: gems.length,
        };
      },
      /** The audio engine's test counters (music mode playing, voices, ...), when it has them. */
      get audio() {
        return (audio as AudioEngine & { __debug?: unknown }).__debug ?? null;
      },
      /** Read-only snapshot for tests. */
      get state() {
        const kinds: Partial<Record<EnemyKind, number>> = {};
        for (const e of enemies) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
        const ringKinds: Partial<Record<RingKind, number>> = {};
        for (const r of rings) ringKinds[r.kind] = (ringKinds[r.kind] ?? 0) + 1;
        return {
          mode,
          t,
          clock,
          paused,
          ended,
          choosing,
          levelUpDelay,
          hitStop,
          timeScale,
          trauma,
          victory,
          dying,
          speed: debugSpeed,
          godMode,
          level,
          xp,
          xpNext: xpNext(),
          pendingLevelUps,
          kills,
          combo,
          maxCombo,
          hitsTaken,
          player: { x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp, speed: player.speed, pickup: player.pickup, revives: player.revives, iframes: player.iframes },
          anim: { ...anim },
          levels: { ...levels },
          enemies: enemies.length,
          enemyKinds: kinds,
          bullets: bullets.length,
          hostileBullets: bullets.filter((b) => b.hostile).length,
          gems: gems.length,
          pickups: pickups.map((p) => ({ kind: p.kind, x: p.x, y: p.y, age: p.age })),
          particles: particles.length,
          rings: rings.length,
          ringKinds,
          texts: texts.length,
          critTexts: texts.filter((text) => text.crit).length,
          boss: {
            phase: boss.phase,
            warn: boss.warn,
            hp: boss.enemy?.hp ?? 0,
            maxHp: boss.enemy?.maxHp ?? 0,
            entrance: boss.enemy?.entrance ?? 0,
            volleys: boss.volleys,
          },
          speech: { visible: speech.visible, text: speech.text, shown: speech.shown, final: speech.final },
          flash: { color: screenFlash.color, alpha: screenFlash.alpha },
          camera: { ...cam },
          offeredCards: offeredCards.map((card) => card.id),
          result: lastResult,
        };
      },
    };
    (window as unknown as DebugWindow).__survivors = debugHook;
  }

  return {
    setMove(x, y) {
      move = { x, y };
    },
    choose(cardId) {
      if (!choosing || levelUpDelay > 0) return;
      if (cardId !== HEAL_CARD.id && !CARDS.some((def) => def.id === cardId)) return;
      applyCard(cardId);
      choosing = false;
      offeredCards = [];
      last = performance.now();
      pushHud();
    },
    setPaused(next) {
      paused = next;
      last = performance.now();
    },
    restart() {
      reset("run");
      last = performance.now();
      audio.setMusic("run");
      pushHud();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      const w = window as unknown as DebugWindow;
      if (debugHook && w.__survivors === debugHook) delete w.__survivors;
    },
  };
}

// ------------------------------------------------------------------ baked art
// Sprites derived from the sheet, baked once per pixel ratio (browser only).

type Art = {
  sheet: SpriteSheet;
  /** Device px per world unit of the baked sprites (the sheet's density). */
  scale: number;
  /** Red silhouettes: the bomb overheating, Reviewer 2 enraged or winding up, the player hurt. */
  heat: { explode: Sprite; boss: Sprite; player: Sprite };
  /** Soft white rim behind the player, so it pops on any background. */
  rim: Sprite;
  /** Template-anchor shot: the bolt in orange. */
  anchorBolt: Sprite;
  /** Tinted soft discs for normal blending (additive light washes out to white on sand). */
  halo: Record<"red" | "gold" | "orange" | "blue", Sprite>;
  /** Soft rings that light the inside of shockwaves and of the big rings. */
  ripple: Record<"orange" | "gold" | "blue", Sprite>;
  /** Sunburst behind the player: blue for a level-up, gold at the deadline. */
  rays: { blue: Sprite; gold: Sprite };
  puff: Sprite;
  smoke: Sprite;
  plus: Sprite;
  /** Green ✓ left by an addressed reviewer comment. */
  check: Sprite;
  /** Red "R2" avatar for the off-screen marker and the speech bubble. */
  badge: Sprite;
  /** Sparkles and debris shards per colour, pre-rotated frames baked on first use. */
  stars: Map<string, Sprite[]>;
  shards: Map<string, Sprite[]>;
};

/** Screen-sized overlays, rebuilt after every resize. */
type ScreenArt = { vignette: HTMLCanvasElement; redEdge: HTMLCanvasElement };

/** The ground tile at screen density with its tint baked in; `key` identifies the tint. */
type GroundTile = { canvas: HTMLCanvasElement; pattern: CanvasPattern; tile: HTMLCanvasElement; px: number; key: number };

const SPARK_UNDER = "#f2b33d";
const GOLD_LINE = "#b8892a";
const COOL = "#24193b";

const fract = (v: number) => v - Math.floor(v);
const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex: string, a: number) => `rgba(${rgbOf(hex).join(",")},${a})`;
/** Linear blend of two #rrggbb colours. */
const mixHex = (a: string, b: string, t: number) => {
  const x = rgbOf(a);
  const y = rgbOf(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
};

function newCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  return canvas;
}

/** A sprite covering [x0, x1] x [y0, y1] world units at `scale` px per unit; `paint` draws around the anchor. */
function bake(scale: number, x0: number, y0: number, x1: number, y1: number, paint: (g: CanvasRenderingContext2D) => void): Sprite {
  const canvas = newCanvas((x1 - x0) * scale, (y1 - y0) * scale);
  const g = canvas.getContext("2d")!;
  g.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
  g.lineCap = "round";
  g.lineJoin = "round";
  paint(g);
  return { canvas, w: canvas.width / scale, h: canvas.height / scale, ax: -x0, ay: -y0 };
}

/** The sprite's silhouette in one colour (same size and anchor). */
function silhouette(s: Sprite, color: string): Sprite {
  const canvas = newCanvas(s.canvas.width, s.canvas.height);
  const g = canvas.getContext("2d")!;
  g.drawImage(s.canvas, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, canvas.width, canvas.height);
  return { ...s, canvas };
}

/** A white silhouette grown by 2 units, with a softer edge beyond: a rim light. */
function dilate(s: Sprite, scale: number): Sprite {
  const pad = 4;
  const canvas = newCanvas(s.canvas.width + pad * 2 * scale, s.canvas.height + pad * 2 * scale);
  const g = canvas.getContext("2d")!;
  for (const [radius, alpha] of [
    [3.4, 0.3],
    [2, 1],
  ]) {
    g.globalAlpha = alpha;
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * TAU;
      g.drawImage(s.canvas, (pad + Math.cos(a) * radius) * scale, (pad + Math.sin(a) * radius) * scale);
    }
  }
  return { canvas, w: canvas.width / scale, h: canvas.height / scale, ax: s.ax + pad, ay: s.ay + pad };
}

/** A teardrop bolt along +x with a white-hot core (anchor = head centre), like the sheet's bolt. */
function bakeBolt(scale: number, color: string, light: string): Sprite {
  const drop = (len: number, r: number, x: number) => {
    const p = new Path2D();
    p.moveTo(x - len, 0);
    p.quadraticCurveTo(x - len * 0.45, -r, x, -r);
    p.arc(x, 0, r, -Math.PI / 2, Math.PI / 2);
    p.quadraticCurveTo(x - len * 0.45, r, x - len, 0);
    return p;
  };
  return bake(scale, -16, -6, 6, 6, (g) => {
    const outer = g.createLinearGradient(-14, 0, 4, 0);
    outer.addColorStop(0, rgba(color, 0));
    outer.addColorStop(0.5, rgba(color, 0.85));
    outer.addColorStop(1, color);
    g.fillStyle = outer;
    g.fill(drop(14, 4, 0));
    g.fillStyle = light;
    g.fill(drop(10, 2.9, 0.4));
    const core = g.createLinearGradient(-9, 0, 2, 0);
    core.addColorStop(0, "rgba(255,255,255,0)");
    core.addColorStop(1, "#ffffff");
    g.fillStyle = core;
    g.fill(drop(9, 1.9, 0.8));
  });
}

/** A soft disc, 32 units in radius, at 1 px per unit: smooth gradients scale up cleanly. */
function bakeHalo(color: string, peak: number): Sprite {
  return bake(1, -32, -32, 32, 32, (g) => {
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    for (let i = 0; i <= 8; i += 1) {
      const f = i / 8;
      grad.addColorStop(f, rgba(color, Math.round(peak * (1 - f * f) ** 2 * 1000) / 1000));
    }
    g.fillStyle = grad;
    g.fillRect(-32, -32, 64, 64);
  });
}

/** A soft ring, 32 units in radius, brightest just inside its edge. */
function bakeRipple(color: string): Sprite {
  return bake(2, -32, -32, 32, 32, (g) => {
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    grad.addColorStop(0, rgba(color, 0));
    grad.addColorStop(0.55, rgba(color, 0.04));
    grad.addColorStop(0.86, rgba(color, 0.28));
    grad.addColorStop(0.95, rgba(color, 0.5));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(-32, -32, 64, 64);
  });
}

/** Twelve tapered rays, 64 units long, fading outwards. */
function bakeRays(color: string): Sprite {
  return bake(2, -64, -64, 64, 64, (g) => {
    const grad = g.createRadialGradient(0, 0, 4, 0, 0, 64);
    grad.addColorStop(0, rgba(color, 0.7));
    grad.addColorStop(0.5, rgba(color, 0.25));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.beginPath();
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU;
      const half = i % 2 ? 0.07 : 0.12;
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a - half) * 64, Math.sin(a - half) * 64);
      g.lineTo(Math.cos(a + half) * 64, Math.sin(a + half) * 64);
      g.closePath();
    }
    g.fill();
  });
}

/** A soft round puff, 16 units in radius (dust, smoke). */
function bakePuff(color: string, peak: number): Sprite {
  return bake(2, -16, -16, 16, 16, (g) => {
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    grad.addColorStop(0, rgba(color, peak));
    grad.addColorStop(0.55, rgba(color, peak * 0.75));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(-16, -16, 32, 32);
  });
}

/** Green plus with a white outline (heal particles). */
function bakePlus(scale: number): Sprite {
  return bake(scale, -6, -6, 6, 6, (g) => {
    g.beginPath();
    g.moveTo(-3.6, 0);
    g.lineTo(3.6, 0);
    g.moveTo(0, -3.6);
    g.lineTo(0, 3.6);
    g.lineWidth = 4.6;
    g.strokeStyle = "#ffffff";
    g.stroke();
    g.lineWidth = 2.5;
    g.strokeStyle = PALETTE.green;
    g.stroke();
  });
}

/** Green badge with a white check mark: a reviewer concern, addressed. */
function bakeCheck(scale: number): Sprite {
  return bake(scale, -10, -10, 10, 10, (g) => {
    g.beginPath();
    g.arc(0, 0, 8, 0, TAU);
    g.lineWidth = 3.2;
    g.strokeStyle = mixHex(PALETTE.green, COOL, 0.45);
    g.stroke();
    g.fillStyle = PALETTE.green;
    g.fill();
    g.beginPath();
    g.arc(0, 0, 5.6, Math.PI * 1.05, Math.PI * 1.45);
    g.lineWidth = 1.4;
    g.strokeStyle = "rgba(255,255,255,0.5)";
    g.stroke();
    g.beginPath();
    g.moveTo(-3.8, 0.3);
    g.lineTo(-1.1, 3);
    g.lineTo(4, -2.8);
    g.lineWidth = 2.4;
    g.strokeStyle = "#ffffff";
    g.stroke();
  });
}

/** Reviewer 2's avatar: a red disc with "R2", ringed in paper and ink. */
function bakeBadge(scale: number): Sprite {
  return bake(scale, -11, -11, 11, 11, (g) => {
    g.beginPath();
    g.arc(0, 0, 9.2, 0, TAU);
    g.fillStyle = PALETTE.red;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = PALETTE.paper;
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 10.4, 0, TAU);
    g.lineWidth = 1.2;
    g.strokeStyle = PALETTE.ink;
    g.stroke();
    g.font = `800 9px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#ffffff";
    g.fillText("R2", 0, 0.6);
  });
}

/** A four-point star in `color`, turned by `angle`, with a white core and a darker edge so it reads on sand. */
function bakeStar(scale: number, color: string, angle: number): Sprite {
  const star = (g: CanvasRenderingContext2D, r: number, waist: number) => {
    g.beginPath();
    g.moveTo(0, -r);
    g.quadraticCurveTo(waist, -waist, r, 0);
    g.quadraticCurveTo(waist, waist, 0, r);
    g.quadraticCurveTo(-waist, waist, -r, 0);
    g.quadraticCurveTo(-waist, -waist, 0, -r);
  };
  return bake(scale, -8, -8, 8, 8, (g) => {
    g.rotate(angle);
    star(g, 7.4, 1.3);
    g.lineWidth = 1.4;
    g.strokeStyle = mixHex(color, COOL, 0.35);
    g.stroke();
    g.fillStyle = color;
    g.fill();
    star(g, 3.6, 0.7);
    g.fillStyle = "#ffffff";
    g.fill();
  });
}

/** A small outlined shard of a popped bug, turned by `angle`. */
function bakeShard(scale: number, color: string, angle: number): Sprite {
  return bake(scale, -6, -6, 6, 6, (g) => {
    g.rotate(angle);
    g.beginPath();
    g.moveTo(-4.2, -2.4);
    g.lineTo(3.6, -3.6);
    g.lineTo(1.6, 3.9);
    g.closePath();
    g.lineWidth = 2;
    g.strokeStyle = mixHex(color, COOL, 0.45);
    g.stroke();
    g.fillStyle = color;
    g.fill();
    g.beginPath();
    g.moveTo(-2.4, -1.9);
    g.lineTo(1.9, -2.6);
    g.lineWidth = 1.1;
    g.strokeStyle = "rgba(255,255,255,0.55)";
    g.stroke();
  });
}

/**
 * The ground tile resampled to `px` device pixels (through a repeating pattern, so the edges
 * stay seamless) with `tint` laid over it. At rest it then blits 1:1, without filtering.
 * Re-bakes draw into the previous canvas when it has the right size.
 */
function bakeGround(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, px: number, tint: string, key: number, reuse?: HTMLCanvasElement): GroundTile {
  const canvas = reuse && reuse.width === px ? reuse : newCanvas(px, px);
  const g = canvas.getContext("2d")!;
  const source = g.createPattern(tile, "repeat")!;
  source.setTransform(new DOMMatrix().scale(px / tile.width));
  g.fillStyle = source;
  g.fillRect(0, 0, px, px);
  g.fillStyle = tint;
  g.fillRect(0, 0, px, px);
  return { canvas, pattern: ctx.createPattern(canvas, "repeat")!, tile, px, key };
}

function bakeArt(ratio: number): Art {
  const sheet = createSprites(ratio);
  const scale = sheet.player.body.canvas.width / sheet.player.body.w;
  return {
    sheet,
    scale,
    heat: {
      explode: silhouette(sheet.enemies.explode.flash, PALETTE.red),
      boss: silhouette(sheet.enemies.boss.flash, PALETTE.red),
      player: silhouette(sheet.player.flash, PALETTE.red),
    },
    rim: dilate(sheet.player.flash, scale),
    anchorBolt: bakeBolt(scale, PALETTE.orange, mixHex(PALETTE.orange, "#ffffff", 0.45)),
    halo: { red: bakeHalo(PALETTE.red, 0.55), gold: bakeHalo(PALETTE.gold, 0.5), orange: bakeHalo(PALETTE.orange, 0.6), blue: bakeHalo(PALETTE.sky, 0.45) },
    ripple: { orange: bakeRipple(PALETTE.orange), gold: bakeRipple(PALETTE.gold), blue: bakeRipple(PALETTE.sky) },
    rays: { blue: bakeRays(PALETTE.blueLight), gold: bakeRays(PALETTE.gold) },
    puff: bakePuff("#fffaf0", 0.9),
    smoke: bakePuff("#4a4458", 0.55),
    plus: bakePlus(scale),
    check: bakeCheck(scale),
    badge: bakeBadge(scale),
    stars: new Map(),
    shards: new Map(),
  };
}

/** An elliptical radial gradient over the screen at quarter resolution; stops are in half-axis units. */
function edgeGlow(width: number, height: number, color: string, stops: [number, number][]) {
  const canvas = newCanvas(Math.max(8, width / 4), Math.max(8, height / 4));
  const g = canvas.getContext("2d")!;
  g.setTransform(canvas.width / 2, 0, 0, canvas.height / 2, canvas.width / 2, canvas.height / 2);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, Math.SQRT2);
  for (const [at, alpha] of stops) grad.addColorStop(at / Math.SQRT2, rgba(color, alpha));
  g.fillStyle = grad;
  g.fillRect(-1, -1, 2, 2);
  return canvas;
}

function bakeScreenArt(width: number, height: number): ScreenArt {
  return {
    vignette: edgeGlow(width, height, "#5a3b1e", [
      [0.5, 0],
      [1, 0.14],
      [Math.SQRT2, 0.42],
    ]),
    redEdge: edgeGlow(width, height, PALETTE.red, [
      [0.55, 0],
      [1, 0.32],
      [Math.SQRT2, 0.85],
    ]),
  };
}
