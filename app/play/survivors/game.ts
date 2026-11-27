/*
 * Gradient Survivors: a small survivors-like (move, auto-attack, pick 1 of N
 * upgrade cards on level up, outlast a boss). Plain 2D canvas, no deps.
 *
 * World units are CSS pixels; the camera keeps the player centred.
 */

import type { AudioEngine, EnemyKind } from "./contracts";

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
  boss: { hp: number; maxHp: number } | null;
  revives: number;
  /** Current kill combo (kills chained within a short window), 0 when idle. */
  combo: number;
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

const COLORS = {
  bg: "#f3e9d8",
  dot: "#e0cfae",
  ink: "#2b2b2b",
  accent: "#2673bd",
  accentLight: "#7fb4e6",
  orange: "#d77a2b",
  gem: "#2f8fd8",
  gemBig: "#e3b23c",
  hurt: "#d64545",
};

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
    describe: () => "+25 max HP and heal 25",
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
    describe: () => "On a fatal hit, retract 3 seconds and resume with half HP",
  },
];

const HEAL_CARD: CardDef = {
  id: "checkpoint",
  name: "Restore Checkpoint",
  kind: "passive",
  maxLevel: 999,
  icon: "✚",
  describe: () => "Heal 40% HP",
};


const ENEMY: Record<EnemyKind, { r: number; hp: number; speed: number; dmg: number; color: string; label: string; xp: number }> = {
  nan: { r: 13, hp: 4, speed: 52, dmg: 8, color: "#8f9aa6", label: "NaN", xp: 1 },
  overfit: { r: 10, hp: 3, speed: 96, dmg: 6, color: "#d64545", label: "fit", xp: 1 },
  halluc: { r: 16, hp: 11, speed: 62, dmg: 10, color: "#7a5bb5", label: "?!", xp: 2 },
  explode: { r: 24, hp: 42, speed: 38, dmg: 18, color: "#d77a2b", label: "∇∞", xp: 6 },
  comment: { r: 16, hp: 9, speed: 70, dmg: 9, color: "#fffdf8", label: "R?", xp: 2 },
  boss: { r: 50, hp: 1500, speed: 58, dmg: 24, color: "#2b2b2b", label: "R2", xp: 0 },
};

type Enemy = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  flash: number;
  orbCd: number;
  boomCd: number;
  waveId: number;
  phase: number;
  fireCd: number;
};

type Bullet = { x: number; y: number; vx: number; vy: number; dmg: number; r: number; life: number; pierce: number; hostile: boolean };
type Gem = { x: number; y: number; value: number; pulled: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
type FloatText = { x: number; y: number; text: string; life: number; color: string; size: number };
type Boomerang = { x: number; y: number; dx: number; dy: number; dist: number; returning: boolean; dmg: number; angle: number };
type Anchor = { x: number; y: number; life: number; fireCd: number; dmg: number };
type Wave = { id: number; x: number; y: number; t: number; maxR: number; dmg: number };
type Beam = { x1: number; y1: number; x2: number; y2: number; width: number; life: number };

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
export { formatTime };

export function createGame(
  canvas: HTMLCanvasElement,
  paperLinks: Record<string, PaperLink>,
  callbacks: GameCallbacks,
  options: GameOptions,
): GameHandle {
  const ctx = canvas.getContext("2d")!;
  void options; // wired up by the audio/juice pass
  let width = 0;
  let height = 0;
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  resize();
  window.addEventListener("resize", resize);

  // Zoom out a little on small screens so there is room to dodge.
  const zoom = () => (Math.min(width, height) < 560 ? 0.78 : 1);

  // ---------------------------------------------------------- state
  let t = 0;
  let nextId = 1;
  let paused = false;
  let ended = false;
  let choosing = false;
  let pendingLevelUps = 0;
  let move = { x: 0, y: 0 };
  let shake = 0;
  let bossSpawned = false;
  let bossWarned = false;
  let bossDefeated = false;
  let waveCounter = 0;
  let spawnTimer = 0;
  let hudTimer = 0;

  const player = { x: 0, y: 0, hp: 100, maxHp: 100, speed: 170, iframes: 0, faceX: 1, faceY: 0, pickup: 120, revives: 0 };
  const history: { x: number; y: number }[] = [];
  let historyTimer = 0;

  let level = 1;
  let xp = 0;
  let kills = 0;
  const levels: Record<string, number> = {};
  const cooldowns: Record<string, number> = {};

  let enemies: Enemy[] = [];
  let bullets: Bullet[] = [];
  let gems: Gem[] = [];
  let particles: Particle[] = [];
  let texts: FloatText[] = [];
  let boomerangs: Boomerang[] = [];
  let anchors: Anchor[] = [];
  let waves: Wave[] = [];
  let beams: Beam[] = [];
  let orbAngle = 0;
  let auraTick = 0;
  let auraPulse = 0;

  const xpFor = (l: number) => Math.floor(2 + l * 2.6 + Math.pow(l, 1.5));
  const xpNext = () => xpFor(level + pendingLevelUps);
  const lvl = (id: string) => levels[id] ?? 0;
  const cdScale = () => Math.pow(0.91, lvl("mixed"));

  const reset = () => {
    t = 0;
    paused = false;
    ended = false;
    choosing = false;
    pendingLevelUps = 0;
    shake = 0;
    bossSpawned = false;
    bossWarned = false;
    bossDefeated = false;
    spawnTimer = 0;
    Object.assign(player, { x: 0, y: 0, hp: 100, maxHp: 100, speed: 170, iframes: 0, pickup: 120, revives: 0 });
    history.length = 0;
    level = 1;
    xp = 0;
    kills = 0;
    for (const key of Object.keys(levels)) delete levels[key];
    for (const key of Object.keys(cooldowns)) delete cooldowns[key];
    levels.gradient = 1;
    enemies = [];
    bullets = [];
    gems = [];
    particles = [];
    texts = [];
    boomerangs = [];
    anchors = [];
    waves = [];
    beams = [];
    pushHud();
  };

  // ---------------------------------------------------------- helpers
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

  const pushHud = () => {
    const boss = enemies.find((enemy) => enemy.kind === "boss");
    callbacks.onHud({
      hp: Math.max(0, Math.ceil(player.hp)),
      maxHp: player.maxHp,
      xp,
      xpNext: xpNext(),
      level,
      time: t,
      kills,
      boss: boss ? { hp: Math.max(0, boss.hp), maxHp: boss.maxHp } : null,
      revives: player.revives,
      combo: 0,
    });
  };

  const burst = (x: number, y: number, color: string, count: number, speed = 160, size = 3) => {
    if (particles.length > 600) return;
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), max: 0.6, color, size: rand(size * 0.6, size * 1.3) });
    }
  };

  const floatText = (x: number, y: number, text: string, color = COLORS.ink, size = 13) => {
    if (texts.length > 80) texts.shift();
    texts.push({ x: x + rand(-6, 6), y, text, life: 0.7, color, size });
  };

  const nearestEnemy = (x: number, y: number, maxDist = Infinity) => {
    let best: Enemy | null = null;
    let bestD = maxDist * maxDist;
    for (const enemy of enemies) {
      const d = (enemy.x - x) ** 2 + (enemy.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = enemy;
      }
    }
    return best;
  };

  const damage = (enemy: Enemy, amount: number, kx = 0, ky = 0) => {
    if (enemy.hp <= 0) return;
    enemy.hp -= amount;
    enemy.flash = 0.08;
    const knock = enemy.kind === "boss" ? 0.15 : 1;
    enemy.vx += kx * knock;
    enemy.vy += ky * knock;
    floatText(enemy.x, enemy.y - enemy.r, String(Math.round(amount)), enemy.kind === "boss" ? COLORS.orange : COLORS.ink, amount >= 10 ? 15 : 12);
    if (enemy.hp <= 0) kill(enemy);
  };

  const kill = (enemy: Enemy) => {
    kills += 1;
    burst(enemy.x, enemy.y, ENEMY[enemy.kind].color, enemy.kind === "boss" ? 60 : 8, enemy.kind === "boss" ? 320 : 160);
    if (enemy.kind === "boss") {
      bossDefeated = true;
      shake = 18;
      callbacks.onToast("Reviewer 2 defeated: Strong Accept! 🏆");
      for (let i = 0; i < 40; i += 1) gems.push({ x: enemy.x + rand(-80, 80), y: enemy.y + rand(-80, 80), value: 3, pulled: false });
      return;
    }
    const value = ENEMY[enemy.kind].xp;
    gems.push({ x: enemy.x, y: enemy.y, value, pulled: false });
  };

  const spawnEnemy = (kind: EnemyKind) => {
    const z = zoom();
    const radius = Math.hypot(width, height) / 2 / z + 40;
    const a = Math.random() * Math.PI * 2;
    const base = ENEMY[kind];
    const scale = kind === "boss" ? 1 : 1 + t / 95;
    enemies.push({
      id: nextId++,
      kind,
      x: player.x + Math.cos(a) * radius,
      y: player.y + Math.sin(a) * radius,
      vx: 0,
      vy: 0,
      r: base.r,
      hp: base.hp * scale,
      maxHp: base.hp * scale,
      speed: base.speed * (kind === "boss" ? 1 : 1 + Math.min(t / 600, 0.35)),
      dmg: base.dmg,
      flash: 0,
      orbCd: 0,
      boomCd: 0,
      waveId: -1,
      phase: Math.random() * 10,
      fireCd: 2,
    });
  };

  const levelUp = () => {
    level += 1;
    burst(player.x, player.y, COLORS.accentLight, 24, 220);
    choosing = true;
    callbacks.onLevelUp(rollCards());
  };

  const applyCard = (id: string) => {
    if (id === "checkpoint") {
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.4);
      return;
    }
    levels[id] = lvl(id) + 1;
    if (id === "adam") player.speed *= 1.12;
    if (id === "decay") {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
    }
    if (id === "context") player.pickup *= 1.45;
    if (id === "acro") player.revives += 1;
  };

  const hurtPlayer = (amount: number) => {
    if (player.iframes > 0 || ended) return;
    player.hp -= amount;
    player.iframes = 0.45;
    shake = Math.max(shake, 6);
    floatText(player.x, player.y - 24, `-${Math.round(amount)}`, COLORS.hurt, 15);
    if (player.hp > 0) return;
    if (player.revives > 0) {
      player.revives -= 1;
      // ACRO: physically retract along the recent trajectory and resume.
      const back = history[Math.max(0, history.length - 30)] ?? { x: player.x, y: player.y };
      player.x = back.x;
      player.y = back.y;
      player.hp = player.maxHp * 0.5;
      player.iframes = 2;
      for (const enemy of enemies) {
        const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (d < 220 && enemy.kind !== "boss") {
          enemy.vx += ((enemy.x - player.x) / (d || 1)) * 600;
          enemy.vy += ((enemy.y - player.y) / (d || 1)) * 600;
        }
      }
      burst(player.x, player.y, COLORS.accent, 40, 300);
      callbacks.onToast("ACRO rollback! Retracted 3 s and resumed ⟲");
      return;
    }
    finish();
  };

  const finish = () => {
    if (ended) return;
    ended = true;
    const survived = t >= RUN_LENGTH;
    const grade: Grade = survived ? (bossDefeated ? "Oral" : "Accept") : t >= BOSS_TIME ? "Borderline" : "Reject";
    pushHud();
    callbacks.onEnd({ grade, time: Math.min(t, RUN_LENGTH), kills, level, bossDefeated, build: build(), maxCombo: 0, hitsTaken: 0 });
  };

  // ---------------------------------------------------------- spatial hash
  const CELL = 48;
  const grid = new Map<number, Enemy[]>();
  const cellKey = (cx: number, cy: number) => (cx + 4096) * 8192 + (cy + 4096);
  const rebuildGrid = () => {
    grid.clear();
    for (const enemy of enemies) {
      const key = cellKey(Math.floor(enemy.x / CELL), Math.floor(enemy.y / CELL));
      const bucket = grid.get(key);
      if (bucket) bucket.push(enemy);
      else grid.set(key, [enemy]);
    }
  };
  const query = (x: number, y: number, r: number, visit: (enemy: Enemy) => void) => {
    const minX = Math.floor((x - r - 50) / CELL);
    const maxX = Math.floor((x + r + 50) / CELL);
    const minY = Math.floor((y - r - 50) / CELL);
    const maxY = Math.floor((y + r + 50) / CELL);
    for (let cx = minX; cx <= maxX; cx += 1) {
      for (let cy = minY; cy <= maxY; cy += 1) {
        const bucket = grid.get(cellKey(cx, cy));
        if (bucket) for (const enemy of bucket) visit(enemy);
      }
    }
  };

  // ---------------------------------------------------------- weapons
  const fireAt = (fromX: number, fromY: number, target: Enemy | null, dmg: number, count: number, speed = 430) => {
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
      bullets.push({ x: fromX, y: fromY, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, r: 5, life: 1.3, pierce: 1, hostile: false });
    }
  };

  const updateWeapons = (dt: number) => {
    const scale = cdScale();
    const tick = (id: string, cd: number, fn: () => void) => {
      cooldowns[id] = (cooldowns[id] ?? 0) - dt;
      if (cooldowns[id] <= 0) {
        cooldowns[id] = cd * scale;
        fn();
      }
    };

    const g = lvl("gradient");
    if (g) tick("gradient", 0.7 - 0.07 * (g - 1), () => fireAt(player.x, player.y, nearestEnemy(player.x, player.y, 360), 4.5 + g * 1.5, 1 + Math.floor(g / 2)));

    const a = lvl("attention");
    if (a)
      tick("attention", 2.7 - 0.25 * a, () => {
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
        const x2 = player.x + dx * length;
        const y2 = player.y + dy * length;
        beams.push({ x1: player.x, y1: player.y, x2, y2, width: beamWidth, life: 0.18 });
        for (const enemy of enemies) {
          const px = enemy.x - player.x;
          const py = enemy.y - player.y;
          const along = px * dx + py * dy;
          if (along < 0 || along > length) continue;
          const perp = Math.abs(px * dy - py * dx);
          if (perp < beamWidth / 2 + enemy.r) damage(enemy, 7 + a * 3.5, dx * 60, dy * 60);
        }
      });

    const s = lvl("shot");
    if (s)
      tick("shot", 4.6 - 0.4 * s, () => {
        waveCounter += 1;
        waves.push({ id: waveCounter, x: player.x, y: player.y, t: 0, maxR: 120 + 28 * s, dmg: 4 + 2.2 * s });
      });

    const l = lvl("looped");
    if (l)
      tick("looped", 2.3 - 0.2 * l, () => {
        const count = Math.ceil(l / 2);
        const target = nearestEnemy(player.x, player.y, 500);
        const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
        for (let i = 0; i < count; i += 1) {
          const ang = base + (i * Math.PI * 2) / count;
          boomerangs.push({ x: player.x, y: player.y, dx: Math.cos(ang), dy: Math.sin(ang), dist: 0, returning: false, dmg: 5 + 2.2 * l, angle: 0 });
        }
      });

    const an = lvl("anchors");
    if (an)
      tick("anchors", 7.2 - 0.8 * an, () => {
        anchors.push({ x: player.x, y: player.y, life: 5 + 0.8 * an, fireCd: 0, dmg: 3 + an * 1.1 });
      });

    const dsv = lvl("dsv");
    if (dsv) {
      orbAngle += dt * (2.4 + dsv * 0.15);
      const count = 1 + dsv;
      const radius = 62 + dsv * 7;
      for (let i = 0; i < count; i += 1) {
        const ang = orbAngle + (i * Math.PI * 2) / count;
        const ox = player.x + Math.cos(ang) * radius;
        const oy = player.y + Math.sin(ang) * radius;
        query(ox, oy, 10, (enemy) => {
          if (enemy.orbCd > 0) return;
          if ((enemy.x - ox) ** 2 + (enemy.y - oy) ** 2 < (enemy.r + 10) ** 2) {
            enemy.orbCd = 0.4;
            damage(enemy, 2.4 + dsv * 0.9, Math.cos(ang) * 120, Math.sin(ang) * 120);
          }
        });
      }
    }

    const dr = lvl("dropout");
    if (dr) {
      auraTick -= dt;
      auraPulse = Math.max(0, auraPulse - dt * 3);
      if (auraTick <= 0) {
        auraTick = 0.45 * scale;
        auraPulse = 1;
        const radius = 56 + dr * 13;
        query(player.x, player.y, radius, (enemy) => {
          // dropout: each bug in range only gets hit with p = 0.8
          if (Math.random() < 0.2) return;
          if ((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2 < (radius + enemy.r) ** 2) damage(enemy, 1.2 + dr * 0.8);
        });
      }
    }

    // anchors fire on their own
    for (const anchor of anchors) {
      anchor.life -= dt;
      anchor.fireCd -= dt;
      if (anchor.fireCd <= 0) {
        anchor.fireCd = 0.55;
        const target = nearestEnemy(anchor.x, anchor.y, 380);
        if (target) fireAt(anchor.x, anchor.y, target, anchor.dmg, 1, 380);
      }
    }
    anchors = anchors.filter((anchor) => anchor.life > 0);
  };

  // ---------------------------------------------------------- update
  const update = (dt: number) => {
    t += dt;
    if (t >= RUN_LENGTH) {
      finish();
      return;
    }

    // player
    const len = Math.hypot(move.x, move.y);
    if (len > 0.05) {
      const mx = move.x / Math.max(1, len);
      const my = move.y / Math.max(1, len);
      player.x += mx * player.speed * dt;
      player.y += my * player.speed * dt;
      player.faceX = move.x / len;
      player.faceY = move.y / len;
    }
    player.iframes = Math.max(0, player.iframes - dt);
    historyTimer -= dt;
    if (historyTimer <= 0) {
      historyTimer = 0.1;
      history.push({ x: player.x, y: player.y });
      if (history.length > 40) history.shift();
    }

    // spawning
    if (!bossWarned && t >= BOSS_TIME - 4) {
      bossWarned = true;
      callbacks.onBossWarning();
    }
    if (!bossSpawned && t >= BOSS_TIME) {
      bossSpawned = true;
      spawnEnemy("boss");
      callbacks.onToast("⚠️ Reviewer 2 has entered the review");
      shake = 10;
    }
    spawnTimer -= dt;
    if (spawnTimer <= 0 && enemies.length < 420) {
      spawnTimer = Math.max(0.3, 1.0 - t / 170);
      const batch = 1 + Math.floor(t / 70);
      for (let i = 0; i < batch; i += 1) {
        const roll = Math.random();
        let kind: EnemyKind = "nan";
        if (t > 20 && roll < 0.35) kind = "overfit";
        if (t > 55 && roll > 0.72) kind = "halluc";
        if (t > 95 && roll > 0.93) kind = "explode";
        spawnEnemy(kind);
      }
    }

    rebuildGrid();
    updateWeapons(dt);

    // enemies
    for (const enemy of enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      let sx = (dx / d) * enemy.speed;
      let sy = (dy / d) * enemy.speed;
      if (enemy.kind === "halluc") {
        enemy.phase += dt * 3;
        sx += Math.cos(enemy.phase) * 40 * (-dy / d);
        sy += Math.cos(enemy.phase) * 40 * (dx / d);
      }
      // separation from neighbours so they do not collapse into one blob
      query(enemy.x, enemy.y, enemy.r, (other) => {
        if (other === enemy) return;
        const ox = enemy.x - other.x;
        const oy = enemy.y - other.y;
        const od = Math.hypot(ox, oy);
        const min = enemy.r + other.r;
        if (od > 0 && od < min) {
          const push = ((min - od) / min) * 90;
          sx += (ox / od) * push;
          sy += (oy / od) * push;
        }
      });
      enemy.x += (sx + enemy.vx) * dt;
      enemy.y += (sy + enemy.vy) * dt;
      enemy.vx *= Math.pow(0.02, dt);
      enemy.vy *= Math.pow(0.02, dt);
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.orbCd = Math.max(0, enemy.orbCd - dt);
      enemy.boomCd = Math.max(0, enemy.boomCd - dt);

      if (enemy.kind === "boss") {
        enemy.fireCd -= dt;
        if (enemy.fireCd <= 0) {
          enemy.fireCd = enemy.hp < enemy.maxHp * 0.5 ? 1.5 : 2.2;
          const n = enemy.hp < enemy.maxHp * 0.5 ? 16 : 12;
          const offset = Math.random() * Math.PI;
          for (let i = 0; i < n; i += 1) {
            const a = offset + (i * Math.PI * 2) / n;
            bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: 12, r: 7, life: 4, pierce: 1, hostile: true });
          }
        }
      }

      if (d < enemy.r + 14) hurtPlayer(enemy.dmg);
      // despawn stragglers that fell far behind
      if (d > 1400 && enemy.kind !== "boss") enemy.hp = -1;
    }

    // bullets
    for (const bullet of bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.hostile) {
        if ((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2 < (bullet.r + 12) ** 2) {
          hurtPlayer(bullet.dmg);
          bullet.life = 0;
        }
        continue;
      }
      query(bullet.x, bullet.y, bullet.r, (enemy) => {
        if (bullet.life <= 0 || enemy.hp <= 0) return;
        if ((enemy.x - bullet.x) ** 2 + (enemy.y - bullet.y) ** 2 < (enemy.r + bullet.r) ** 2) {
          const sp = Math.hypot(bullet.vx, bullet.vy) || 1;
          damage(enemy, bullet.dmg, (bullet.vx / sp) * 90, (bullet.vy / sp) * 90);
          bullet.pierce -= 1;
          if (bullet.pierce <= 0) bullet.life = 0;
        }
      });
    }
    bullets = bullets.filter((bullet) => bullet.life > 0);

    // boomerangs
    for (const boom of boomerangs) {
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
        if (d < 18) boom.dist = -1;
      }
      query(boom.x, boom.y, 14, (enemy) => {
        if (enemy.boomCd > 0) return;
        if ((enemy.x - boom.x) ** 2 + (enemy.y - boom.y) ** 2 < (enemy.r + 14) ** 2) {
          enemy.boomCd = 0.3;
          damage(enemy, boom.dmg);
        }
      });
    }
    boomerangs = boomerangs.filter((boom) => boom.dist >= 0);

    // shockwaves
    for (const wave of waves) {
      wave.t += dt;
      const r = (wave.t / 0.38) * wave.maxR;
      query(wave.x, wave.y, r, (enemy) => {
        if (enemy.waveId === wave.id) return;
        const d = Math.hypot(enemy.x - wave.x, enemy.y - wave.y);
        if (d < r + enemy.r) {
          enemy.waveId = wave.id;
          const nx = (enemy.x - wave.x) / (d || 1);
          const ny = (enemy.y - wave.y) / (d || 1);
          damage(enemy, wave.dmg, nx * 420, ny * 420);
        }
      });
    }
    waves = waves.filter((wave) => wave.t < 0.38);

    enemies = enemies.filter((enemy) => enemy.hp > 0);

    // gems
    for (const gem of gems) {
      const dx = player.x - gem.x;
      const dy = player.y - gem.y;
      const d = Math.hypot(dx, dy);
      if (d < player.pickup) gem.pulled = true;
      if (gem.pulled) {
        const speed = 420 + Math.max(0, 300 - d) * 2;
        gem.x += (dx / (d || 1)) * speed * dt;
        gem.y += (dy / (d || 1)) * speed * dt;
        if (d < 16) {
          xp += gem.value;
          gem.value = 0;
        }
      }
    }
    gems = gems.filter((gem) => gem.value > 0);
    // keep the gem count sane by merging far-away old gems
    if (gems.length > 500) gems.splice(0, gems.length - 500);

    while (xp >= xpNext()) {
      xp -= xpNext();
      pendingLevelUps += 1;
    }

    // fx
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.05, dt);
      p.vy *= Math.pow(0.05, dt);
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const text of texts) {
      text.y -= 38 * dt;
      text.life -= dt;
    }
    texts = texts.filter((text) => text.life > 0);
    for (const beam of beams) beam.life -= dt;
    beams = beams.filter((beam) => beam.life > 0);
    shake = Math.max(0, shake - dt * 30);

    if (pendingLevelUps > 0 && !choosing) {
      pendingLevelUps -= 1;
      levelUp();
    }
  };

  // ---------------------------------------------------------- draw
  const draw = () => {
    const z = zoom();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    const sx = shake ? rand(-shake, shake) * 0.5 : 0;
    const sy = shake ? rand(-shake, shake) * 0.5 : 0;
    const camX = player.x - width / 2 / z + sx;
    const camY = player.y - height / 2 / z + sy;

    ctx.setTransform(dpr * z, 0, 0, dpr * z, -camX * dpr * z, -camY * dpr * z);

    // dot grid
    const spacing = 40;
    ctx.fillStyle = COLORS.dot;
    const startX = Math.floor(camX / spacing) * spacing;
    const startY = Math.floor(camY / spacing) * spacing;
    for (let x = startX; x < camX + width / z + spacing; x += spacing) {
      for (let y = startY; y < camY + height / z + spacing; y += spacing) {
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }

    // dropout aura
    const dr = lvl("dropout");
    if (dr) {
      const radius = 56 + dr * 13;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(38,115,189,${0.06 + auraPulse * 0.08})`;
      ctx.fill();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = "rgba(38,115,189,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // anchors
    for (const anchor of anchors) {
      ctx.globalAlpha = Math.min(1, anchor.life * 2);
      ctx.fillStyle = COLORS.orange;
      ctx.beginPath();
      ctx.roundRect(anchor.x - 11, anchor.y - 11, 22, 22, 5);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "700 11px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("[_]", anchor.x, anchor.y + 1);
      ctx.globalAlpha = 1;
    }

    // gems
    for (const gem of gems) {
      ctx.fillStyle = gem.value >= 3 ? COLORS.gemBig : COLORS.gem;
      const s = gem.value >= 3 ? 7 : 5;
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - s);
      ctx.lineTo(gem.x + s * 0.75, gem.y);
      ctx.lineTo(gem.x, gem.y + s);
      ctx.lineTo(gem.x - s * 0.75, gem.y);
      ctx.closePath();
      ctx.fill();
    }

    // shockwaves
    for (const wave of waves) {
      const r = (wave.t / 0.38) * wave.maxR;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(215,122,43,${1 - wave.t / 0.38})`;
      ctx.lineWidth = 6;
      ctx.stroke();
    }

    // enemies
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const enemy of enemies) {
      const def = ENEMY[enemy.kind];
      ctx.globalAlpha = enemy.kind === "halluc" ? 0.82 : 1;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI * 2);
      ctx.fillStyle = enemy.flash > 0 ? "#ffffff" : def.color;
      ctx.fill();
      ctx.lineWidth = enemy.kind === "boss" ? 4 : 2;
      ctx.strokeStyle = enemy.kind === "boss" ? COLORS.hurt : "rgba(255,255,255,0.85)";
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = enemy.flash > 0 ? def.color : "#fff";
      ctx.font = `800 ${enemy.kind === "boss" ? 26 : Math.round(enemy.r * 0.85)}px "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(def.label, enemy.x, enemy.y + 1);
      if (enemy.kind === "boss") {
        ctx.fillStyle = COLORS.ink;
        ctx.font = '700 13px "Helvetica Neue", Arial, sans-serif';
        ctx.fillText("Reviewer 2", enemy.x, enemy.y - enemy.r - 12);
      }
    }

    // bullets
    for (const bullet of bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      ctx.fillStyle = bullet.hostile ? COLORS.hurt : COLORS.accent;
      ctx.fill();
      if (bullet.hostile) {
        ctx.fillStyle = "#fff";
        ctx.font = '800 8px "Helvetica Neue", Arial, sans-serif';
        ctx.fillText("✗", bullet.x, bullet.y + 0.5);
      }
    }

    // beams
    for (const beam of beams) {
      ctx.globalAlpha = beam.life / 0.18;
      ctx.strokeStyle = COLORS.accentLight;
      ctx.lineWidth = beam.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = beam.width * 0.35;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // boomerangs
    for (const boom of boomerangs) {
      ctx.save();
      ctx.translate(boom.x, boom.y);
      ctx.rotate(boom.angle);
      ctx.fillStyle = "#4f9a6b";
      ctx.fillRect(-12, -3.5, 24, 7);
      ctx.fillRect(-3.5, -12, 7, 24);
      ctx.restore();
    }

    // DSV orbs
    const dsv = lvl("dsv");
    if (dsv) {
      const count = 1 + dsv;
      const radius = 62 + dsv * 7;
      for (let i = 0; i < count; i += 1) {
        const ang = orbAngle + (i * Math.PI * 2) / count;
        const ox = player.x + Math.cos(ang) * radius;
        const oy = player.y + Math.sin(ang) * radius;
        ctx.beginPath();
        ctx.arc(ox, oy, 9, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.accent;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
      }
    }

    // player: a little robot
    const blink = player.iframes > 0 && Math.floor(player.iframes * 20) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 15, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.roundRect(-14, -14, 28, 26, 8);
      ctx.fill();
      ctx.fillStyle = "#f7f3ea";
      ctx.beginPath();
      ctx.roundRect(-10, -9, 20, 12, 5);
      ctx.fill();
      ctx.fillStyle = COLORS.ink;
      const ex = player.faceX * 3;
      const ey = player.faceY * 2;
      ctx.beginPath();
      ctx.arc(-4 + ex, -3 + ey, 2.4, 0, Math.PI * 2);
      ctx.arc(4 + ex, -3 + ey, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(0, -21);
      ctx.stroke();
      ctx.fillStyle = COLORS.orange;
      ctx.beginPath();
      ctx.arc(0, -22, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // damage numbers
    for (const text of texts) {
      ctx.globalAlpha = Math.min(1, text.life * 2);
      ctx.font = `800 ${text.size}px "Helvetica Neue", Arial, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;

    // off-screen boss arrow
    const boss = enemies.find((enemy) => enemy.kind === "boss");
    if (boss) {
      const vx = (boss.x - player.x) * z;
      const vy = (boss.y - player.y) * z;
      if (Math.abs(vx) > width / 2 - 20 || Math.abs(vy) > height / 2 - 20) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const a = Math.atan2(vy, vx);
        const k = Math.min((width / 2 - 34) / Math.abs(Math.cos(a) || 1e-6), (height / 2 - 34) / Math.abs(Math.sin(a) || 1e-6));
        const ax = width / 2 + Math.cos(a) * k;
        const ay = height / 2 + Math.sin(a) * k;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a);
        ctx.fillStyle = COLORS.hurt;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-8, -10);
        ctx.lineTo(-8, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  };

  // ---------------------------------------------------------- loop
  let last = performance.now();
  let raf = 0;
  let disposed = false;
  const frame = (now: number) => {
    if (disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (!paused && !choosing && !ended) {
      update(dt);
      hudTimer -= dt;
      if (hudTimer <= 0) {
        hudTimer = 0.1;
        pushHud();
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    if (document.hidden && !ended && !paused) {
      paused = true;
      callbacks.onAutoPause();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  reset();
  raf = requestAnimationFrame(frame);

  if (new URLSearchParams(window.location.search).has("debug")) {
    (window as unknown as { __survivors?: unknown }).__survivors = {
      get t() {
        return t;
      },
      set t(value: number) {
        t = value;
      },
      player,
      levels,
      get enemies() {
        return enemies.length;
      },
      get info() {
        const gem = gems.reduce<Gem | null>((best, g) => (!best || Math.hypot(g.x - player.x, g.y - player.y) < Math.hypot(best.x - player.x, best.y - player.y) ? g : best), null);
        const threat = nearestEnemy(player.x, player.y, 140);
        return {
          kills, xp, level, pendingLevelUps, gems: gems.length, choosing, paused, ended,
          gem: gem ? { dx: gem.x - player.x, dy: gem.y - player.y } : null,
          threat: threat ? { dx: threat.x - player.x, dy: threat.y - player.y } : null,
        };
      },
      addXp: (amount: number) => {
        xp += amount;
      },
    };
  }

  return {
    setMove(x, y) {
      move = { x, y };
    },
    choose(cardId) {
      if (!choosing) return;
      applyCard(cardId);
      choosing = false;
      last = performance.now();
      pushHud();
    },
    setPaused(next) {
      paused = next;
      last = performance.now();
    },
    restart() {
      reset();
      last = performance.now();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
