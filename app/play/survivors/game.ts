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
  type AudioEngine,
  type EnemyKind,
  type MusicMode,
  type PickupKind,
  type SfxName,
  type SfxOptions,
} from "./contracts";
import { REVIEW_COMMENTS, REVIEWER2_DEFEATED, REVIEWER2_ENRAGED, REVIEWER2_QUOTES, TOASTS } from "./lore";

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

/** Base stats per kind; hp and speed grow with run time (see makeEnemy). Colours feed the placeholder art and the death pops. */
const ENEMY: Record<EnemyKind, { hp: number; speed: number; dmg: number; xp: number; color: string; shade: string; label: string }> = {
  nan: { hp: 4, speed: 52, dmg: 8, xp: 1, color: PALETTE.grey, shade: "#5e6975", label: "NaN" },
  overfit: { hp: 3, speed: 96, dmg: 6, xp: 1, color: PALETTE.red, shade: "#9e2c2c", label: "fit" },
  halluc: { hp: 11, speed: 62, dmg: 10, xp: 2, color: PALETTE.purple, shade: "#523a85", label: "?!" },
  explode: { hp: 42, speed: 38, dmg: 18, xp: 6, color: PALETTE.orange, shade: "#9c5214", label: "∇∞" },
  comment: { hp: 9, speed: 70, dmg: 9, xp: 2, color: PALETTE.paper, shade: PALETTE.ink, label: "R?" },
  boss: { hp: 1500, speed: 58, dmg: 24, xp: 0, color: PALETTE.ink, shade: "#111111", label: "R2" },
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

const TAU = Math.PI * 2;
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
type ParticleKind = "debris" | "spark" | "dust" | "sparkle" | "confetti" | "heal" | "smoke";
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
  let vignette: CanvasGradient | null = null; // low-sanity vignette, rebuilt after a resize

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    vignette = null;
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
   *
   * Camera (cam), resolved by present() just before draw()
   *   x, y            world point at the screen centre (player + look-ahead lead)
   *   zoom            CSS px per world unit (base zoom x zoom punch)
   *   shakeX, shakeY  screen-space shake offset in CSS px; shakeRot: radians around the screen
   *                   centre (all 0 with reducedMotion or in attract mode)
   *   leadX, leadY    the look-ahead offset; punch: seconds left of the zoom punch
   *
   * Screen
   *   screenFlash     { color, alpha }: full-screen tint, alpha already halved for reducedMotion
   *                   (white level-up, red hurt, gold boss defeat)
   *   boss.phase "warning" with boss.warn (seconds until Reviewer 2 lands): pulse the screen edges
   *   anim.lowSanity  sanity < 30%: heartbeat vignette
   *
   * Player (player, anim)
   *   player.x/y, vx/vy, faceX/faceY (unit vector of the last move), hp/maxHp
   *   player.iframes  > 0: invulnerable after a hit; blink;  player.revives: ACRO charges left
   *   anim.moving     0..1 eased "is walking";  anim.bob: walk-cycle phase in radians
   *   anim.squash     1 -> 0 after a sharp turn (squash and stretch)
   *   anim.lean       -1..1 eased horizontal velocity (tilt into the run)
   *   anim.hurt       seconds left of the red hurt tint;  anim.blink: > 0 while the eyes are shut
   *   dust puffs are particles of kind "dust"
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
   *                   x, y, vx, vy (rotate to it), r, life (seconds left; fade the last 0.3 s)
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
   *                   along vx/vy), "dust" (soft puff), "sparkle" (4-point star, additive),
   *                   "confetti" (spinning paper, rot), "heal" (green plus, floats up), "smoke";
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
        bullets.push({ src: "boss", x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: 12, r: 7, life: 4, pierce: 1, hostile: true });
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
  // Placeholder art: flat shapes in the palette. The art pass replaces this
  // section and reads only the RENDER STATE listed above.
  const FONT = '"Helvetica Neue", Arial, sans-serif';
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
  const commentWidths: number[] = [];
  let speechLinesFor = "";
  let speechLines: string[] = [];
  let speechWidth = 0;

  const drawEnemy = (e: Enemy) => {
    const def = ENEMY[e.kind];
    const spawn = Math.min(1, e.age / SPAWN_IN);
    const s = Math.max(0.05, easeOutBack(spawn));
    const rx = e.r * s * (1 + 0.22 * e.squash);
    const ry = e.r * s * (1 - 0.18 * e.squash);
    ctx.globalAlpha = spawn * (e.kind === "halluc" ? 0.85 : 1);
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, rx, ry, 0, 0, TAU);
    ctx.fillStyle = e.flash > 0 ? "#ffffff" : def.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = def.shade;
    ctx.stroke();
    if (e.flash > 0) return;
    // eyes look where it walks
    const er = e.r * 0.2 * s;
    const ex = e.face * e.r * 0.12 * s;
    const ey = e.y - e.r * 0.2 * s;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(e.x - e.r * 0.3 * s + ex, ey, er, 0, TAU);
    ctx.arc(e.x + e.r * 0.3 * s + ex, ey, er, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(e.x - e.r * 0.3 * s + ex + e.face * er * 0.4, ey, er * 0.5, 0, TAU);
    ctx.arc(e.x + e.r * 0.3 * s + ex + e.face * er * 0.4, ey, er * 0.5, 0, TAU);
    ctx.fill();
    if (e.r >= 13) {
      ctx.fillStyle = "#ffffff";
      ctx.font = font(800, Math.round(e.r * 0.62));
      ctx.fillText(def.label, e.x, e.y + e.r * 0.38 * s);
    }
  };

  const drawComment = (e: Enemy) => {
    const text = REVIEW_COMMENTS[e.variant];
    ctx.font = font(700, 10);
    commentWidths[e.variant] ??= ctx.measureText(text).width;
    const w = commentWidths[e.variant] + 12;
    const h = 20;
    const spawn = Math.min(1, e.age / SPAWN_IN);
    const s = Math.max(0.05, easeOutBack(spawn));
    ctx.save();
    ctx.globalAlpha = spawn;
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.sin(e.phase) * 0.12);
    ctx.scale(s * (1 + 0.15 * e.squash), s * (1 - 0.12 * e.squash));
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 7);
    ctx.moveTo(-e.face * 2, h / 2 - 1);
    ctx.lineTo(-e.face * 10, h / 2 + 7);
    ctx.lineTo(-e.face * 9, h / 2 - 1);
    ctx.fillStyle = e.flash > 0 ? "#ffffff" : PALETTE.paper;
    ctx.fill();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = e.flash > 0 ? PALETTE.grey : PALETTE.ink;
    ctx.fillText(text, 0, 0.5);
    ctx.restore();
  };

  const drawBoss = (e: Enemy) => {
    const falling = e.entrance > 0 ? e.entrance / BOSS_ENTRANCE : 0;
    const lift = falling * falling * 420;
    // landing shadow grows as Reviewer 2 drops in
    ctx.globalAlpha = 0.22 * (1 - falling * 0.6);
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.r * 0.85, e.r * (1 - falling * 0.5), e.r * 0.3 * (1 - falling * 0.5), 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    const y = e.y - lift;
    const enraged = boss.phase === "enraged";
    const squash = e.squash * 0.08;
    ctx.beginPath();
    ctx.ellipse(e.x, y, e.r * (1 + squash), e.r * (1 - squash), 0, 0, TAU);
    ctx.fillStyle = e.flash > 0 ? "#ffffff" : PALETTE.ink;
    ctx.fill();
    ctx.lineWidth = enraged ? 5 + Math.sin(clock * 12) * 2 : 4;
    ctx.strokeStyle = PALETTE.red;
    ctx.stroke();
    // glasses and a frown
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(e.x - 16 + e.face * 4, y - 10, 10, 0, TAU);
    ctx.arc(e.x + 16 + e.face * 4, y - 10, 10, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    ctx.arc(e.x - 16 + e.face * 8, y - 9, 4, 0, TAU);
    ctx.arc(e.x + 16 + e.face * 8, y - 9, 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = enraged ? PALETTE.red : "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.x - 28, y - (enraged ? 28 : 24));
    ctx.lineTo(e.x - 6, y - 20);
    ctx.moveTo(e.x + 28, y - (enraged ? 28 : 24));
    ctx.lineTo(e.x + 6, y - 20);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = font(800, 20);
    ctx.fillText("R2", e.x, y + 18);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = font(700, 13);
    ctx.fillText(enraged ? "Reviewer 2 (enraged)" : "Reviewer 2", e.x, y - e.r - 12);
  };

  const drawPlayer = () => {
    if (deathTime >= 0) return; // popped
    if (player.iframes > 0 && Math.floor(player.iframes * 20) % 2 === 0) return;
    const bob = Math.sin(anim.bob) * 2 * anim.moving;
    const breathe = Math.sin(clock * 3) * 0.03 * (1 - anim.moving);
    const sx = 1 + 0.2 * anim.squash - breathe;
    const sy = 1 - 0.16 * anim.squash + breathe;
    ctx.save();
    ctx.translate(player.x, player.y + 12);
    ctx.fillStyle = "rgba(43,43,43,0.14)";
    ctx.beginPath();
    ctx.ellipse(0, 3, 14, 5, 0, 0, TAU);
    ctx.fill();
    ctx.rotate(anim.lean * 0.12);
    ctx.scale(sx, sy);
    ctx.translate(0, -12 - Math.abs(bob));
    ctx.fillStyle = anim.hurt > 0 ? PALETTE.red : PALETTE.blue;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 26, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.blueDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.paper;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 12, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    const ex = player.faceX * 3;
    const ey = player.faceY * 2;
    if (anim.blink > 0 || anim.hurt > 0.15) {
      ctx.fillRect(-7 + ex, -4.5 + ey, 6, 1.8);
      ctx.fillRect(1 + ex, -4.5 + ey, 6, 1.8);
    } else {
      ctx.beginPath();
      ctx.arc(-4 + ex, -4 + ey, 2.4, 0, TAU);
      ctx.arc(4 + ex, -4 + ey, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(0, -21);
    ctx.stroke();
    // antenna light: calm blink, frantic red at low sanity
    const on = anim.lowSanity ? Math.sin(clock * 18) > 0 : Math.sin(clock * 4) > -0.3;
    ctx.fillStyle = anim.lowSanity ? PALETTE.red : on ? PALETTE.orange : PALETTE.sandDark;
    ctx.beginPath();
    ctx.arc(0, -22, anim.lowSanity && on ? 3.8 : 3, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  const drawSpeech = () => {
    if (!speech.visible) return;
    ctx.font = font(600, 13);
    if (speechLinesFor !== speech.text) {
      // Wrap the whole line once, so the bubble keeps its size while typing.
      speechLinesFor = speech.text;
      speechLines = [];
      let line = "";
      for (const word of speech.text.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > 210) {
          speechLines.push(line);
          line = word;
        } else line = next;
      }
      speechLines.push(line);
      speechWidth = Math.max(...speechLines.map((l) => ctx.measureText(l).width));
    }
    const pop = easeOutBack(Math.min(1, speech.age / 0.15));
    const w = speechWidth + 20;
    const h = speechLines.length * 16 + 12;
    ctx.save();
    ctx.translate(speech.x, speech.y - (speech.final ? 8 : 26));
    ctx.scale(pop, pop);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h - 8, w, h, 10);
    ctx.moveTo(-6, -9);
    ctx.lineTo(0, 0);
    ctx.lineTo(6, -9);
    ctx.fillStyle = speech.final ? PALETTE.paper : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = boss.phase === "enraged" && !speech.final ? PALETTE.red : PALETTE.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = "left";
    let left = speech.shown;
    for (let i = 0; i < speechLines.length && left > 0; i += 1) {
      const line = speechLines[i];
      ctx.fillText(line.slice(0, left), -speechWidth / 2, -h - 8 + 14 + i * 16);
      left -= line.length + 1;
    }
    ctx.textAlign = "center";
    ctx.restore();
  };

  const drawParticles = (additive: boolean) => {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const glow = p.kind === "spark" || p.kind === "sparkle";
      if (glow !== additive) continue;
      const f = p.life / p.max;
      ctx.globalAlpha = p.kind === "confetti" ? Math.min(1, f * 3) : f;
      ctx.fillStyle = p.color;
      switch (p.kind) {
        case "spark":
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        case "sparkle": {
          const s = p.size * (0.6 + 0.4 * f);
          ctx.fillRect(p.x - s, p.y - s * 0.2, s * 2, s * 0.4);
          ctx.fillRect(p.x - s * 0.2, p.y - s, s * 0.4, s * 2);
          break;
        }
        case "confetti": {
          const w = p.size * Math.abs(Math.cos(p.rot));
          ctx.fillRect(p.x - w / 2, p.y - p.size * 0.3, w, p.size * 0.6);
          break;
        }
        case "heal":
          ctx.fillRect(p.x - p.size / 2, p.y - p.size * 0.15, p.size, p.size * 0.3);
          ctx.fillRect(p.x - p.size * 0.15, p.y - p.size / 2, p.size * 0.3, p.size);
          break;
        case "dust":
        case "smoke": {
          ctx.globalAlpha = f * (p.kind === "smoke" ? 0.25 : 0.5);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1.6 - f * 0.6), 0, TAU);
          ctx.fill();
          break;
        }
        default:
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawScreenFx = () => {
    if (boss.phase === "warning") {
      const pulse = 0.5 + 0.5 * Math.sin(clock * 12);
      ctx.globalAlpha = 0.25 + 0.4 * pulse;
      ctx.strokeStyle = PALETTE.red;
      ctx.lineWidth = 20;
      ctx.strokeRect(0, 0, width, height);
    }
    if (anim.lowSanity) {
      if (!vignette) {
        vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.hypot(width, height) / 2);
        vignette.addColorStop(0, "rgba(214,69,69,0)");
        vignette.addColorStop(1, "rgba(214,69,69,0.55)");
      }
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(clock * 7);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    }
    if (screenFlash.alpha > 0) {
      ctx.globalAlpha = screenFlash.alpha;
      ctx.fillStyle = screenFlash.color;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.globalAlpha = 1;

    // off-screen Reviewer 2 arrow
    const b = boss.enemy;
    if (!b) return;
    const vx = (b.x - cam.x) * cam.zoom;
    const vy = (b.y - cam.y) * cam.zoom;
    if (Math.abs(vx) < width / 2 - 20 && Math.abs(vy) < height / 2 - 20) return;
    const a = Math.atan2(vy, vx);
    const k = Math.min((width / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (height / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
    ctx.save();
    ctx.translate(width / 2 + Math.cos(a) * k, height / 2 + Math.sin(a) * k);
    ctx.rotate(a);
    ctx.fillStyle = PALETTE.red;
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const draw = () => {
    const z = cam.zoom;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, 0, width, height);

    // world transform: screen centre, shake, zoom, camera
    ctx.translate(width / 2 + cam.shakeX, height / 2 + cam.shakeY);
    ctx.rotate(cam.shakeRot);
    ctx.scale(z, z);
    ctx.translate(-cam.x, -cam.y);
    const halfW = width / 2 / z + 40;
    const halfH = height / 2 / z + 40;
    const left = cam.x - halfW;
    const right = cam.x + halfW;
    const top = cam.y - halfH;
    const bottom = cam.y + halfH;
    const visible = (x: number, y: number, r: number) => x > left - r && x < right + r && y > top - r && y < bottom + r;

    // dot grid
    const spacing = 40;
    ctx.fillStyle = PALETTE.sandDark;
    for (let x = Math.floor(left / spacing) * spacing; x < right; x += spacing) {
      for (let y = Math.floor(top / spacing) * spacing; y < bottom; y += spacing) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }

    // dropout aura
    if (lvl("dropout")) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, dropoutRadius(), 0, TAU);
      ctx.fillStyle = `rgba(38,115,189,${0.06 + auraPulse * 0.08})`;
      ctx.fill();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = "rgba(38,115,189,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // pickups: coffee and the viral thread, blinking before they expire
    for (const p of pickups) {
      if (!visible(p.x, p.y, 30)) continue;
      if (PICKUP_LIFE - p.age < 5 && Math.floor(clock * 8) % 2 === 0) continue;
      const y = p.y + Math.sin(clock * 3 + p.phase) * 3;
      const coffee = p.kind === "coffee";
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(clock * 5 + p.phase);
      ctx.fillStyle = coffee ? PALETTE.orange : PALETTE.red;
      ctx.beginPath();
      ctx.arc(p.x, y, 18, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.paper;
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(p.x - 10, y - 10, 20, 20, 6);
      ctx.fill();
      ctx.stroke();
      ctx.font = font(800, 13);
      ctx.fillStyle = coffee ? PALETTE.orange : PALETTE.red;
      ctx.fillText(coffee ? "☕" : "📣", p.x, y + 1);
    }

    // tokens: twinkle, and a streak while flying to the player
    for (let pass = 0; pass < 2; pass += 1) {
      const big = pass === 1;
      ctx.strokeStyle = big ? PALETTE.gold : PALETTE.sky;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = big ? 5 : 3.5;
      ctx.beginPath();
      for (const g of gems) {
        if (g.value >= 3 !== big || !g.pulled || !visible(g.x, g.y, 30)) continue;
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x - g.vx * 0.05, g.y - g.vy * 0.05);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = big ? PALETTE.gold : PALETTE.sky;
      ctx.beginPath();
      for (const g of gems) {
        if (g.value >= 3 !== big || !visible(g.x, g.y, 10)) continue;
        const s = (big ? 7 : 5) * (1 + 0.16 * Math.sin(clock * 6 + g.phase)) * Math.min(1, 0.3 + g.age / 0.15);
        ctx.moveTo(g.x, g.y - s);
        ctx.lineTo(g.x + s * 0.75, g.y);
        ctx.lineTo(g.x, g.y + s);
        ctx.lineTo(g.x - s * 0.75, g.y);
        ctx.closePath();
      }
      ctx.fill();
    }

    // anchors
    for (const anchor of anchors) {
      ctx.globalAlpha = Math.min(1, (anchor.life - anchor.age) * 2, anchor.age * 6);
      ctx.fillStyle = PALETTE.orange;
      ctx.beginPath();
      ctx.roundRect(anchor.x - 11, anchor.y - 11, 22, 22, 5);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 11px ui-monospace, monospace";
      ctx.fillText("[_]", anchor.x, anchor.y + 1);
    }
    ctx.globalAlpha = 1;

    // shockwaves
    for (const wave of waves) {
      const p = wave.t / WAVE_TIME;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, p * wave.maxR, 0, TAU);
      ctx.strokeStyle = PALETTE.orange;
      ctx.globalAlpha = 1 - p;
      ctx.lineWidth = 6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // enemies
    for (const e of enemies) {
      if (e.hp <= 0 || !visible(e.x, e.y, e.kind === "boss" ? 480 : 60)) continue;
      if (e.kind === "boss") drawBoss(e);
      else if (e.kind === "comment") drawComment(e);
      else drawEnemy(e);
    }
    ctx.globalAlpha = 1;

    drawPlayer();

    // bullets
    for (const b of bullets) {
      if (b.life <= 0 || !visible(b.x, b.y, 10)) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fillStyle = b.hostile ? PALETTE.red : b.src === "anchor" ? PALETTE.orange : PALETTE.blue;
      ctx.fill();
      if (b.hostile) {
        ctx.fillStyle = "#ffffff";
        ctx.font = font(800, 8);
        ctx.fillText("✗", b.x, b.y + 0.5);
      }
    }

    // attention beams
    ctx.lineCap = "round";
    for (const beam of beams) {
      ctx.globalAlpha = beam.life / beam.max;
      ctx.strokeStyle = PALETTE.blueLight;
      ctx.lineWidth = beam.width;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = beam.width * 0.35;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";

    // boomerangs
    ctx.fillStyle = PALETTE.green;
    for (const boom of boomerangs) {
      ctx.save();
      ctx.translate(boom.x, boom.y);
      ctx.rotate(boom.angle);
      ctx.fillRect(-12, -3.5, 24, 7);
      ctx.fillRect(-3.5, -12, 7, 24);
      ctx.restore();
    }

    // DSV support vectors
    if (lvl("dsv")) {
      for (let i = 0; i < dsvCount(); i += 1) {
        const { x, y } = dsvOrb(i);
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, TAU);
        ctx.fillStyle = PALETTE.blue;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      }
    }

    // rings
    for (const r of rings) {
      if (r.t < 0) continue;
      const p = r.t / r.dur;
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - p * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, Math.max(0, r.r0 + (r.r1 - r.r0) * easeOutCubic(p)), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawParticles(false);
    ctx.globalCompositeOperation = "lighter";
    drawParticles(true);
    ctx.globalCompositeOperation = "source-over";

    // damage numbers
    ctx.lineJoin = "round";
    for (const text of texts) {
      const age = text.max - text.life;
      const pop = text.crit ? 1 + 0.6 * Math.max(0, 1 - age / 0.12) : 1;
      ctx.globalAlpha = Math.min(1, text.life * 3);
      ctx.font = font(800, Math.round(text.size * pop));
      ctx.lineWidth = text.crit ? 4 : 3;
      ctx.strokeStyle = text.crit ? PALETTE.ink : "rgba(255,255,255,0.9)";
      const label = text.crit ? `${text.text}!` : text.text;
      ctx.strokeText(label, text.x, text.y);
      ctx.fillStyle = text.crit ? PALETTE.gold : text.color;
      ctx.fillText(label, text.x, text.y);
    }
    ctx.globalAlpha = 1;

    drawSpeech();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScreenFx();
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
