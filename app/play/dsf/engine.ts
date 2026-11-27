/*
 * Simulation and rendering for "What I Cannot Create".
 *
 * The board is a blackboard of about 1000 x 620 units whose shape follows the
 * screen (tall on a phone held upright). A stage hides a chalk drawing (the
 * data manifold) and scatters a few thousand grains of dust (candidate
 * images) around it. Dust inside the ring around the player is "activated":
 * it flows to its point on the drawing and stays there. Erasers knock settled
 * dust loose again and adversarial label tags hoard it.
 *
 * The engine owns the canvas, the input and the clock; the React shell only
 * hears about it through EngineEvents.
 */

import type { Synth } from "../shared/synth";
import { BOARD_H, BOARD_W, CHALK, HAND_FONT, layerCount, loadChalkFont, renderDrawing, sampleLayer } from "./drawings";
import { ADVERSARIAL_LABELS, FEYNMAN, HECKLES, TOASTS, type StageDef } from "./lore";

export type Hud = {
  /** Share of dust on the manifold, 0..1. */
  progress: number;
  goal: number;
  /** Sampler step, 0..1000. */
  step: number;
  /** 1 = the augmentation burst is ready. */
  burst: number;
  /** Seconds of H100 left. */
  boost: number;
  guess: string;
  tokensLeft: number;
};

export type StageResult = { won: boolean; stepsLeft: number; snapshot: string | null };

export type EngineEvents = {
  onHud(hud: Hud): void;
  onToast(text: string): void;
  onEnd(result: StageResult): void;
};

export type Engine = {
  load(stage: StageDef): Promise<void>;
  begin(): void;
  setPaused(paused: boolean): void;
  burst(): void;
  dispose(): void;
  /** Test hook, see ?debug in DsfClient. */
  debug: { state(): Record<string, number | string>; finish(): void; expire(): void; next(): { x: number; y: number } | null };
};

const MAX = 5600;
const FREE = 0;
const FLOW = 1;
const SET = 2;
const CAPTURED = 3;
const FROZEN = 4;

const AURA = 64;
const SPEED = 235;
const BURST_RADIUS = 135;
const BURST_COOLDOWN = 8;
const BOOST_SECONDS = 7;
const GRID = 25;
const FULL_AREA = BOARD_W * BOARD_H;

// The board of the current stage. One engine per page, so module state is fine.
let W = BOARD_W;
let H = BOARD_H;
let COLS = Math.ceil(W / GRID);
let ROWS = Math.ceil(H / GRID);
/** Board area relative to the full-size board: small screens get a smaller board and less dust. */
let density = 1;
const SLATE = "#1f2e2b";

type Eraser = { x: number; y: number; tx: number; ty: number; speed: number; text: string; wobble: number; alive: boolean };
type Boss = { x: number; y: number; dir: number; half: number; speed: number; intro: boolean };
type Tag = { x: number; y: number; label: string; held: number; grab: number; age: number; alive: boolean };
type Token = { kind: "guide" | "gpu"; x: number; y: number; text: string; layer: number; toast: string; age: number; alive: boolean };
type Ring = { x: number; y: number; from: number; to: number; age: number; life: number; color: string };
type Floater = { x: number; y: number; text: string; age: number; color: string };
type Status = "empty" | "ready" | "intro" | "play" | "won" | "lost";

function gauss() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.87;
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function createEngine(canvas: HTMLCanvasElement, synth: Synth, events: EngineEvents): Engine {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("2D canvas is not available");
  const ctx: CanvasRenderingContext2D = maybeCtx;

  // ------------------------------------------------------------ dust (struct of arrays)
  const px = new Float32Array(MAX);
  const py = new Float32Array(MAX);
  const tx = new Float32Array(MAX);
  const ty = new Float32Array(MAX);
  const hx = new Float32Array(MAX);
  const hy = new Float32Array(MAX);
  const seed = new Float32Array(MAX);
  const state = new Uint8Array(MAX);
  const color = new Uint8Array(MAX);
  const targetColor = new Uint8Array(MAX);
  const owner = new Int16Array(MAX);
  let count = 0;
  let settled = 0;

  // nearest-point-on-the-manifold vectors on a coarse grid: the field arrows
  let fieldX = new Float32Array(COLS * ROWS);
  let fieldY = new Float32Array(COLS * ROWS);

  // ------------------------------------------------------------ world
  let stage: StageDef | null = null;
  let status: Status = "empty";
  let paused = false;
  let disposed = false;
  let time = 0;
  let clock = 0; // always running, for animation
  let layers = 0;
  let crisp: HTMLCanvasElement | null = null;
  let reveal = 0;
  let endTimer = 0;
  let shake = 0;
  let guessIndex = 0;
  let guess = "";
  let bubble = 0;
  let warnedTokens = false;
  let nextEraser = 0;
  let labelIndex = 0;
  let gpuIndex = 0;
  let bossIndex = 0;
  let hudTimer = 0;
  let tickTimer = 0;
  let loadId = 0;

  const player = { x: W / 2, y: H - 70, vx: 0, vy: 0, fx: 0, fy: 1, burst: 0, boost: 0, moving: 0 };
  let erasers: Eraser[] = [];
  let boss: Boss | null = null;
  let tags: Tag[] = [];
  let tokens: Token[] = [];
  let rings: Ring[] = [];
  let floaters: Floater[] = [];

  // ------------------------------------------------------------ canvas sizing
  let scale = 1;
  let background: HTMLCanvasElement | null = null;
  let backgroundScale = 0;

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const bounds = parent.getBoundingClientRect();
    const fit = Math.min(bounds.width / W, bounds.height / H);
    if (!(fit > 0)) return;
    const cssW = Math.floor(W * fit);
    const cssH = Math.floor(H * fit);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const width = Math.max(1, Math.round(cssW * dpr));
    const height = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    scale = canvas.width / W;
  }

  function buildBackground() {
    const bg = document.createElement("canvas");
    bg.width = canvas.width;
    bg.height = canvas.height;
    const b = bg.getContext("2d");
    if (!b) return;
    b.scale(scale, scale);
    const slate = b.createLinearGradient(0, 0, W, H);
    slate.addColorStop(0, "#24352f");
    slate.addColorStop(1, "#19262a");
    b.fillStyle = slate;
    b.fillRect(0, 0, W, H);
    // old chalk that was never quite wiped off
    for (let i = 0; i < 46; i += 1) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const r = 60 + Math.random() * 170;
      const cloud = b.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, `rgba(255,255,255,${0.012 + Math.random() * 0.022})`);
      cloud.addColorStop(1, "rgba(255,255,255,0)");
      b.fillStyle = cloud;
      b.fillRect(x - r, y - r, r * 2, r * 2);
    }
    b.lineCap = "round";
    for (let i = 0; i < 9; i += 1) {
      b.strokeStyle = `rgba(255,255,255,${0.008 + Math.random() * 0.014})`;
      b.lineWidth = 30 + Math.random() * 40;
      const y = Math.random() * H;
      b.beginPath();
      b.moveTo(Math.random() * W * 0.4, y);
      b.lineTo(W * 0.5 + Math.random() * W * 0.5, y + (Math.random() - 0.5) * 80);
      b.stroke();
    }
    // what was left on Feynman's board, in the corners where it is not in the way
    b.fillStyle = "rgba(244,241,230,0.2)";
    b.textBaseline = "alphabetic";
    b.font = `400 19px ${HAND_FONT}`;
    b.textAlign = "left";
    b.fillText(FEYNMAN.quote, 18, 30);
    b.strokeStyle = "rgba(244,241,230,0.14)";
    b.lineWidth = 1.5;
    b.strokeRect(10, 10, 318, 30);
    const roomy = W >= 780;
    if (roomy) b.fillText(FEYNMAN.secondLine, 18, H - 16);
    b.textAlign = "right";
    b.fillStyle = "rgba(244,241,230,0.15)";
    if (roomy) b.fillText("x ← x − η ∇ₓ d( g(x; θ), −θ )", W - 18, 30);
    b.fillText("θ: frozen", W - 18, H - 16);
    background = bg;
    backgroundScale = scale;
  }

  // ------------------------------------------------------------ building a stage
  function addLayer(index: number, frozenAt?: { x: number; y: number; color: number }[]) {
    if (!stage) return;
    const targets = sampleLayer(stage.drawing, index, { w: W, h: H }, density);
    for (let n = 0; n < targets.length && count < MAX; n += 1) {
      const target = targets[n];
      const i = count;
      count += 1;
      tx[i] = target.x;
      ty[i] = target.y;
      targetColor[i] = target.color;
      // most dust starts near its part of the manifold, some of it far away
      const spread = (Math.random() < 0.1 ? 170 : 92) * Math.sqrt(density);
      hx[i] = clamp(target.x + gauss() * spread, 8, W - 8);
      hy[i] = clamp(target.y + gauss() * spread, 8, H - 8);
      seed[i] = Math.random();
      owner[i] = -1;
      if (frozenAt && frozenAt.length > 0) {
        const from = frozenAt[i % frozenAt.length];
        px[i] = from.x;
        py[i] = from.y;
        color[i] = from.color;
        state[i] = FROZEN;
      } else {
        px[i] = hx[i];
        py[i] = hy[i];
        color[i] = target.color;
        state[i] = FREE;
      }
    }
    layers = Math.max(layers, index + 1);
    crisp = renderDrawing(stage.drawing, layers, { w: W, h: H }, Math.max(1, Math.min(2, scale)));
    buildField();
  }

  function buildField() {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const cx = col * GRID + GRID / 2;
        const cy = row * GRID + GRID / 2;
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (let i = 0; i < count; i += 3) {
          const dx = tx[i] - cx;
          const dy = ty[i] - cy;
          const d = dx * dx + dy * dy;
          if (d < best) {
            best = d;
            bx = dx;
            by = dy;
          }
        }
        fieldX[row * COLS + col] = bx;
        fieldY[row * COLS + col] = by;
      }
    }
  }

  async function load(next: StageDef) {
    const id = (loadId += 1);
    status = "empty";
    await loadChalkFont();
    if (disposed || id !== loadId) return;
    // shape the board like the space it gets: wide on a laptop, tall on a phone
    const bounds = canvas.parentElement?.getBoundingClientRect();
    if (bounds && bounds.width > 0 && bounds.height > 0) {
      const aspect = clamp(bounds.width / bounds.height, 0.56, 1.75);
      // at least 0.75 CSS px per board unit, so a phone gets a smaller board rather than tiny chalk
      const area = clamp((bounds.width * bounds.height) / 0.75 ** 2, 0.62 * FULL_AREA, FULL_AREA);
      W = Math.round(Math.sqrt(area * aspect));
      H = Math.round(W / aspect);
    }
    COLS = Math.ceil(W / GRID);
    ROWS = Math.ceil(H / GRID);
    fieldX = new Float32Array(COLS * ROWS);
    fieldY = new Float32Array(COLS * ROWS);
    density = (W * H) / FULL_AREA;
    resize();
    buildBackground();
    stage = next;
    count = 0;
    settled = 0;
    layers = 0;
    time = 0;
    reveal = 0;
    endTimer = 0;
    shake = 0;
    guessIndex = 0;
    guess = next.guesses[0][1];
    bubble = 0;
    warnedTokens = false;
    nextEraser = next.erasers.first;
    labelIndex = 0;
    gpuIndex = 0;
    bossIndex = 0;
    erasers = [];
    boss = null;
    tags = [];
    rings = [];
    floaters = [];
    tokens = (next.tokens ?? []).map((token) => ({ kind: "guide", x: (token.x / BOARD_W) * W, y: (token.y / BOARD_H) * H, text: token.card, layer: token.layer, toast: token.toast, age: 0, alive: true }));
    player.x = W / 2;
    player.y = H - 70;
    player.vx = 0;
    player.vy = 0;
    player.burst = 0;
    player.boost = 0;
    keys.clear();
    pointer.active = false;
    addLayer(0, next.prefill ? sampleLayer(next.prefill, 0, { w: W, h: H }, density) : undefined);
    status = "ready";
    emitHud();
  }

  function begin() {
    if (!stage || status !== "ready") return;
    if (stage.prefill) {
      status = "intro";
      time = 0;
      boss = { x: -80, y: H / 2, dir: 1, half: H * 0.44, speed: (W + 160) / 2.4, intro: true };
      events.onToast(TOASTS.boss);
      synth.tone({ freq: 96, to: 60, dur: 0.9, type: "sawtooth", gain: 0.16 });
    } else {
      status = "play";
      time = 0;
    }
  }

  // ------------------------------------------------------------ input
  const keys = new Set<string>();
  // a mouse leads the robot by the nose; a finger works a floating joystick so it does not cover it
  const pointer = { active: false, x: 0, y: 0, stick: false, ox: 0, oy: 0 };
  const STICK = 46;

  function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "].includes(key)) {
      if (status === "play" || status === "intro") event.preventDefault();
    }
    if (key === " " && !event.repeat) burst();
    keys.add(key);
  }

  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function toBoard(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * W;
    pointer.y = ((event.clientY - rect.top) / rect.height) * H;
  }

  function onPointerDown(event: PointerEvent) {
    synth.unlock();
    pointer.active = true;
    pointer.stick = event.pointerType === "touch";
    toBoard(event);
    pointer.ox = pointer.x;
    pointer.oy = pointer.y;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* not every pointer can be captured */
    }
  }

  function onPointerMove(event: PointerEvent) {
    if (pointer.active) toBoard(event);
  }

  function onPointerUp() {
    pointer.active = false;
  }

  function onBlur() {
    keys.clear();
    pointer.active = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  const observer = new ResizeObserver(() => resize());
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  // ------------------------------------------------------------ actions
  function release(i: number, scatter: number) {
    // back to noise, somewhere near its point on the manifold
    if (state[i] === SET) settled -= 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = scatter * (0.45 + Math.random() * 0.55);
    hx[i] = clamp(tx[i] + Math.cos(angle) * radius, 8, W - 8);
    hy[i] = clamp(ty[i] + Math.sin(angle) * radius, 8, H - 8);
    color[i] = targetColor[i];
    owner[i] = -1;
    state[i] = FREE;
  }

  function popEraser(eraser: Eraser) {
    eraser.alive = false;
    rings.push({ x: eraser.x, y: eraser.y, from: 8, to: 46, age: 0, life: 0.35, color: "244,241,230" });
    floaters.push({ x: eraser.x, y: eraser.y - 22, text: pick(TOASTS.eraserPopped), age: 0, color: CHALK[4] });
    synth.noise({ dur: 0.16, gain: 0.16, freq: 1100, to: 260 });
    synth.tone({ freq: 320, to: 140, dur: 0.14, type: "triangle", gain: 0.12 });
  }

  function popTag(index: number) {
    const tag = tags[index];
    tag.alive = false;
    for (let i = 0; i < count; i += 1) if (state[i] === CAPTURED && owner[i] === index) release(i, 46);
    rings.push({ x: tag.x, y: tag.y, from: 10, to: 70, age: 0, life: 0.4, color: "242,160,181" });
    synth.tone({ freq: 240, to: 960, dur: 0.14, type: "square", gain: 0.09 });
    events.onToast(TOASTS.labelPopped);
  }

  function burst() {
    if (status !== "play" || paused || player.burst > 0) return;
    player.burst = BURST_COOLDOWN;
    const r2 = BURST_RADIUS * BURST_RADIUS;
    for (let i = 0; i < count; i += 1) {
      if (state[i] !== FREE) continue;
      const dx = px[i] - player.x;
      const dy = py[i] - player.y;
      if (dx * dx + dy * dy < r2) state[i] = FLOW;
    }
    for (const eraser of erasers) {
      if (eraser.alive && (eraser.x - player.x) ** 2 + (eraser.y - player.y) ** 2 < r2) popEraser(eraser);
    }
    tags.forEach((tag, index) => {
      if (tag.alive && (tag.x - player.x) ** 2 + (tag.y - player.y) ** 2 < r2) popTag(index);
    });
    // released dust is inside the burst too
    for (let i = 0; i < count; i += 1) {
      if (state[i] !== FREE) continue;
      const dx = px[i] - player.x;
      const dy = py[i] - player.y;
      if (dx * dx + dy * dy < r2) state[i] = FLOW;
    }
    rings.push({ x: player.x, y: player.y, from: 20, to: BURST_RADIUS, age: 0, life: 0.45, color: "143,199,238" });
    rings.push({ x: player.x, y: player.y, from: 10, to: BURST_RADIUS * 0.8, age: -0.08, life: 0.45, color: "246,216,107" });
    synth.noise({ dur: 0.34, gain: 0.14, freq: 320, to: 3200 });
    synth.tone({ freq: 196, to: 784, dur: 0.3, type: "triangle", gain: 0.12 });
    shake = Math.max(shake, 0.18);
    events.onToast(TOASTS.burst);
  }

  function spawnEraser() {
    if (!stage) return;
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -30 : side === 1 ? W + 30 : Math.random() * W;
    const y = side === 2 ? -30 : side === 3 ? H + 30 : Math.random() * H;
    const eraser: Eraser = { x, y, tx: W / 2, ty: H / 2, speed: stage.erasers.speed * (0.9 + Math.random() * 0.25), text: pick(HECKLES), wobble: Math.random() * 6, alive: true };
    retarget(eraser);
    erasers.push(eraser);
  }

  function retarget(eraser: Eraser) {
    // go for chalk that is already on the board
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const i = Math.floor(Math.random() * count);
      if (state[i] === SET) {
        eraser.tx = tx[i];
        eraser.ty = ty[i];
        return;
      }
    }
    eraser.tx = 80 + Math.random() * (W - 160);
    eraser.ty = 80 + Math.random() * (H - 160);
  }

  function awayFromPlayer(minDistance: number) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const x = 90 + Math.random() * (W - 180);
      const y = 90 + Math.random() * (H - 180);
      if ((x - player.x) ** 2 + (y - player.y) ** 2 > minDistance * minDistance) return { x, y };
    }
    return { x: W - player.x, y: H - player.y };
  }

  function finish(won: boolean) {
    if (!stage || (status !== "play" && status !== "intro")) return;
    status = won ? "won" : "lost";
    endTimer = 0;
    keys.clear();
    pointer.active = false;
    if (won) {
      // the verdict goes to the HUD; a bubble here would cover the finished image
      guess = stage.verdict;
      bubble = 0;
      for (let i = 0; i < count; i += 1) {
        if (state[i] === CAPTURED || state[i] === FREE || state[i] === FROZEN) {
          color[i] = targetColor[i];
          state[i] = FLOW;
        }
      }
      for (const eraser of erasers) if (eraser.alive) popEraser(eraser);
      tags.forEach((tag) => (tag.alive = false));
      boss = null;
      synth.arp([523, 659, 784, 1047, 1319], 0.09, { dur: 0.5, type: "triangle", gain: 0.14 });
      events.onToast(TOASTS.home);
    } else {
      synth.tone({ freq: 300, to: 70, dur: 0.7, type: "sawtooth", gain: 0.12 });
    }
    emitHud();
  }

  function snapshot() {
    try {
      const shot = document.createElement("canvas");
      shot.width = 480;
      shot.height = Math.round((480 * H) / W);
      const s = shot.getContext("2d");
      if (!s) return null;
      s.fillStyle = SLATE;
      s.fillRect(0, 0, shot.width, shot.height);
      if (background) s.drawImage(background, 0, 0, shot.width, shot.height);
      if (crisp) {
        s.shadowColor = "rgba(244,241,230,0.5)";
        s.shadowBlur = 6;
        s.drawImage(crisp, 0, 0, shot.width, shot.height);
      }
      return shot.toDataURL("image/jpeg", 0.86);
    } catch {
      return null;
    }
  }

  function emitHud() {
    if (!stage) return;
    events.onHud({
      progress: count > 0 ? settled / count : 0,
      goal: stage.goal,
      step: Math.min(1000, Math.round((time / stage.seconds) * 1000)),
      burst: 1 - player.burst / BURST_COOLDOWN,
      boost: player.boost,
      guess,
      tokensLeft: tokens.filter((token) => token.alive && token.kind === "guide").length,
    });
  }

  // ------------------------------------------------------------ update
  function updateDust(dt: number, activate: boolean) {
    const aura = AURA * (player.boost > 0 ? 1.5 : 1);
    const aura2 = aura * aura;
    const pull = Math.min(1, dt * 3.2);
    const rush = status === "won" ? 2.4 : 1;
    let landed = 0;
    for (let i = 0; i < count; i += 1) {
      const s = state[i];
      if (s === SET || s === FROZEN) continue;
      if (s === FREE) {
        px[i] += (hx[i] - px[i]) * pull + (Math.random() - 0.5) * 1.5;
        py[i] += (hy[i] - py[i]) * pull + (Math.random() - 0.5) * 1.5;
        if (activate) {
          const dx = px[i] - player.x;
          const dy = py[i] - player.y;
          if (dx * dx + dy * dy < aura2) state[i] = FLOW;
        }
      } else if (s === FLOW) {
        const dx = tx[i] - px[i];
        const dy = ty[i] - py[i];
        const d = Math.sqrt(dx * dx + dy * dy);
        const stepLength = (150 + d * 3.4) * rush * dt;
        if (d <= stepLength + 1.2) {
          px[i] = tx[i];
          py[i] = ty[i];
          state[i] = SET;
          settled += 1;
          landed += 1;
        } else {
          // a little curl so the flow looks like a field, not a zoom
          const curl = Math.sin(clock * 5 + seed[i] * 40) * 0.35;
          px[i] += ((dx - dy * curl) / d) * stepLength;
          py[i] += ((dy + dx * curl) / d) * stepLength;
        }
      } else if (s === CAPTURED) {
        const tag = tags[owner[i]];
        if (!tag || !tag.alive) {
          release(i, 46);
          continue;
        }
        const angle = clock * (2 + seed[i] * 3) + seed[i] * 50;
        const radius = 8 + seed[i] * 30;
        px[i] += (tag.x + Math.cos(angle) * radius - px[i]) * Math.min(1, dt * 7);
        py[i] += (tag.y + Math.sin(angle) * radius * 0.8 - py[i]) * Math.min(1, dt * 7);
      }
    }
    if (landed > 0) {
      tickTimer -= dt;
      if (tickTimer <= 0) {
        tickTimer = 0.05;
        synth.noise({ dur: 0.03, gain: Math.min(0.07, 0.02 + landed * 0.004), freq: 3800 + Math.random() * 2400 });
      }
    }
  }

  function updatePlay(dt: number) {
    if (!stage) return;
    time += dt;

    // --- player
    let ix = 0;
    let iy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) ix -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) ix += 1;
    if (keys.has("ArrowUp") || keys.has("w")) iy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) iy += 1;
    if (ix === 0 && iy === 0 && pointer.active && pointer.stick) {
      const dx = pointer.x - pointer.ox;
      const dy = pointer.y - pointer.oy;
      const d = Math.hypot(dx, dy);
      if (d > 5) {
        const push = Math.min(1, d / STICK);
        ix = (dx / d) * push;
        iy = (dy / d) * push;
        if (d > STICK * 1.5) {
          // the stick follows a finger that wanders off
          pointer.ox += (dx / d) * (d - STICK * 1.5);
          pointer.oy += (dy / d) * (d - STICK * 1.5);
        }
      }
    } else if (ix === 0 && iy === 0 && pointer.active) {
      const dx = pointer.x - player.x;
      const dy = pointer.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 7) {
        const ease = Math.min(1, d / 40);
        ix = (dx / d) * ease;
        iy = (dy / d) * ease;
      }
    } else if (ix !== 0 && iy !== 0) {
      ix *= Math.SQRT1_2;
      iy *= Math.SQRT1_2;
    }
    const speed = SPEED * (player.boost > 0 ? 1.3 : 1);
    const blend = 1 - Math.exp(-dt * 13);
    player.vx += (ix * speed - player.vx) * blend;
    player.vy += (iy * speed - player.vy) * blend;
    player.x = clamp(player.x + player.vx * dt, 22, W - 22);
    player.y = clamp(player.y + player.vy * dt, 30, H - 22);
    const moving = Math.hypot(player.vx, player.vy);
    player.moving = moving;
    if (moving > 20) {
      player.fx = player.vx / moving;
      player.fy = player.vy / moving;
    }
    player.burst = Math.max(0, player.burst - dt);
    player.boost = Math.max(0, player.boost - dt);

    updateDust(dt, true);

    // --- erasers
    if (time >= nextEraser) {
      nextEraser = time + stage.erasers.every;
      if (erasers.filter((eraser) => eraser.alive).length < stage.erasers.max) spawnEraser();
    }
    for (const eraser of erasers) {
      if (!eraser.alive) continue;
      const dx = eraser.tx - eraser.x;
      const dy = eraser.ty - eraser.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) retarget(eraser);
      else {
        eraser.x += (dx / d) * eraser.speed * dt;
        eraser.y += (dy / d) * eraser.speed * dt;
      }
      eraser.wobble += dt * 7;
      if ((eraser.x - player.x) ** 2 + (eraser.y - player.y) ** 2 < 44 * 44) {
        popEraser(eraser);
        continue;
      }
      for (let i = 0; i < count; i += 1) {
        if (state[i] !== SET) continue;
        const ex = px[i] - eraser.x;
        const ey = py[i] - eraser.y;
        if (ex * ex + ey * ey < 30 * 30) release(i, 74);
      }
    }
    if (erasers.length > 24) erasers = erasers.filter((eraser) => eraser.alive);

    // --- Reviewer 2's big eraser
    if (stage.bossAt && bossIndex < stage.bossAt.length && time >= stage.bossAt[bossIndex] && !boss) {
      bossIndex += 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      boss = { x: dir > 0 ? -70 : W + 70, y: H * (0.3 + Math.random() * 0.4), dir, half: Math.min(150, H * 0.19), speed: (W + 140) / 3.4, intro: false };
      events.onToast(TOASTS.bossAgain);
      synth.tone({ freq: 96, to: 60, dur: 0.9, type: "sawtooth", gain: 0.16 });
    }
    updateBoss(dt);

    // --- adversarial label tags
    if (labelIndex < stage.labelsAt.length && time >= stage.labelsAt[labelIndex]) {
      const spot = awayFromPlayer(230);
      tags.push({ ...spot, label: ADVERSARIAL_LABELS[labelIndex % ADVERSARIAL_LABELS.length], held: 0, grab: 0, age: 0, alive: true });
      labelIndex += 1;
      synth.tone({ freq: 880, to: 220, dur: 0.22, type: "square", gain: 0.07 });
    }
    tags.forEach((tag, index) => {
      if (!tag.alive) return;
      tag.age += dt;
      tag.grab -= dt;
      if ((tag.x - player.x) ** 2 + (tag.y - player.y) ** 2 < 40 * 40) {
        popTag(index);
        return;
      }
      if (tag.grab <= 0 && tag.held < 260 && tag.age > 0.6) {
        tag.grab = 0.1;
        let taken = 0;
        const start = Math.floor(Math.random() * count);
        for (let n = 0; n < count && taken < 5; n += 1) {
          const i = (start + n) % count;
          if (state[i] !== FREE && state[i] !== SET) continue;
          const dx = px[i] - tag.x;
          const dy = py[i] - tag.y;
          if (dx * dx + dy * dy < 150 * 150) {
            if (state[i] === SET) settled -= 1;
            state[i] = CAPTURED;
            owner[i] = index;
            tag.held += 1;
            taken += 1;
          }
        }
      }
    });

    // --- things to pick up
    if (gpuIndex < stage.gpuAt.length && time >= stage.gpuAt[gpuIndex]) {
      gpuIndex += 1;
      tokens.push({ kind: "gpu", ...awayFromPlayer(180), text: "H100", layer: 0, toast: TOASTS.gpu, age: 0, alive: true });
    }
    for (const token of tokens) {
      if (!token.alive) continue;
      token.age += dt;
      if ((token.x - player.x) ** 2 + (token.y - player.y) ** 2 > 38 * 38) continue;
      token.alive = false;
      events.onToast(token.toast);
      rings.push({ x: token.x, y: token.y, from: 10, to: 80, age: 0, life: 0.5, color: "246,216,107" });
      if (token.kind === "gpu") {
        player.boost = BOOST_SECONDS;
        synth.arp([440, 554, 659, 880], 0.06, { dur: 0.18, type: "square", gain: 0.07 });
      } else {
        addLayer(token.layer);
        synth.arp([660, 880, 1320], 0.08, { dur: 0.3, type: "triangle", gain: 0.12 });
      }
    }

    // --- what the model thinks it is looking at
    const progress = count > 0 ? settled / count : 0;
    while (guessIndex + 1 < stage.guesses.length && progress >= stage.guesses[guessIndex + 1][0]) {
      guessIndex += 1;
      guess = stage.guesses[guessIndex][1];
      bubble = 3.2;
      synth.tone({ freq: 520 + guessIndex * 90, dur: 0.09, type: "sine", gain: 0.08 });
    }

    // --- end of stage
    const tokensLeft = tokens.some((token) => token.alive && token.kind === "guide");
    if (progress >= stage.goal) {
      if (!tokensLeft) finish(true);
      else if (!warnedTokens) {
        warnedTokens = true;
        events.onToast(TOASTS.needTokens);
      }
    }
    if (status === "play" && time >= stage.seconds) finish(false);
  }

  function updateBoss(dt: number) {
    if (!boss) return;
    boss.x += boss.dir * boss.speed * dt;
    shake = Math.max(shake, 0.06);
    for (let i = 0; i < count; i += 1) {
      const s = state[i];
      if (s !== SET && s !== FROZEN) continue;
      if (Math.abs(py[i] - boss.y) > boss.half) continue;
      const behind = boss.dir > 0 ? px[i] < boss.x + 24 : px[i] > boss.x - 24;
      if (behind && Math.abs(px[i] - boss.x) < 70) {
        if (s === FROZEN) {
          // the old sentence becomes dust that belongs to the new one
          hx[i] = clamp(px[i] + gauss() * 60, 8, W - 8);
          hy[i] = clamp(py[i] + gauss() * 60, 8, H - 8);
          color[i] = targetColor[i];
          state[i] = FREE;
        } else release(i, 80);
      }
    }
    if (Math.random() < dt * 9) synth.noise({ dur: 0.08, gain: 0.05, freq: 500 + Math.random() * 400 });
    if ((boss.dir > 0 && boss.x > W + 90) || (boss.dir < 0 && boss.x < -90)) boss = null;
  }

  function update(dt: number) {
    clock += dt;
    shake = Math.max(0, shake - dt);
    bubble = Math.max(0, bubble - dt);
    for (const ring of rings) ring.age += dt;
    rings = rings.filter((ring) => ring.age < ring.life);
    for (const floater of floaters) floater.age += dt;
    floaters = floaters.filter((floater) => floater.age < 1.1);

    if (status === "ready") updateDust(dt, false);
    else if (status === "intro") {
      time += dt;
      updateDust(dt, false);
      if (time > 1.1) updateBoss(dt);
      if (time > 1.1 && !boss) {
        // anything the sweep missed
        for (let i = 0; i < count; i += 1) {
          if (state[i] === FROZEN) {
            color[i] = targetColor[i];
            state[i] = FREE;
          }
        }
        status = "play";
        time = 0;
        events.onToast(TOASTS.wiped);
      }
    } else if (status === "play") updatePlay(dt);
    else if (status === "won" || status === "lost") {
      endTimer += dt;
      updateDust(dt, false);
      if (status === "won") reveal = Math.min(1, endTimer / 1.5);
      const wait = status === "won" ? 3.6 : 0.9;
      if (endTimer >= wait && stage) {
        const won = status === "won";
        const result: StageResult = { won, stepsLeft: won ? Math.max(0, 1000 - Math.round((time / stage.seconds) * 1000)) : 0, snapshot: won ? snapshot() : null };
        status = "empty";
        events.onEnd(result);
      }
    }

    hudTimer -= dt;
    if (hudTimer <= 0 && (status === "play" || status === "intro" || status === "won")) {
      hudTimer = 0.1;
      emitHud();
    }
  }

  // ------------------------------------------------------------ drawing
  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function label(text: string, x: number, y: number, size: number, ink: string, alpha = 1) {
    ctx.font = `700 ${size}px ${HAND_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = ctx.measureText(text).width + 16;
    const cx = clamp(x, width / 2 + 6, W - width / 2 - 6);
    const cy = clamp(y, size * 0.7 + 4, H - size * 0.7 - 4);
    ctx.globalAlpha = alpha * 0.82;
    ctx.fillStyle = "#14201e";
    roundRect(cx - width / 2, cy - size * 0.68, width, size * 1.36, 8);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(text, cx, cy + 1);
    ctx.globalAlpha = 1;
  }

  function drawDust() {
    // settled chalk, one path per colour
    const frozenOrSet = (s: number) => s === SET || s === FROZEN;
    for (let c = 0; c < CHALK.length; c += 1) {
      ctx.fillStyle = CHALK[c];
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        if (color[i] !== c || !frozenOrSet(state[i])) continue;
        ctx.rect(px[i] - 1.35, py[i] - 1.35, 2.7, 2.7);
      }
      ctx.fill();
    }
    // free dust flickers like static
    const skip = Math.floor(clock * 30) % 4;
    ctx.fillStyle = "rgba(244,241,230,0.5)";
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      if (state[i] !== FREE || i % 4 === skip) continue;
      ctx.rect(px[i] - 0.9, py[i] - 0.9, 1.8, 1.8);
    }
    ctx.fill();
    // dust following the field
    ctx.strokeStyle = "rgba(170,214,244,0.95)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      if (state[i] !== FLOW) continue;
      const dx = tx[i] - px[i];
      const dy = ty[i] - py[i];
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const tail = Math.min(13, d);
      ctx.moveTo(px[i], py[i]);
      ctx.lineTo(px[i] - (dx / d) * tail, py[i] - (dy / d) * tail);
    }
    ctx.stroke();
    // dust hoarded by a label tag
    ctx.fillStyle = "rgba(246,128,140,0.95)";
    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      if (state[i] !== CAPTURED) continue;
      ctx.rect(px[i] - 1.1, py[i] - 1.1, 2.2, 2.2);
    }
    ctx.fill();
  }

  function drawField(aura: number) {
    ctx.strokeStyle = "rgba(143,199,238,0.62)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const c0 = Math.max(0, Math.floor((player.x - aura) / GRID));
    const c1 = Math.min(COLS - 1, Math.floor((player.x + aura) / GRID));
    const r0 = Math.max(0, Math.floor((player.y - aura) / GRID));
    const r1 = Math.min(ROWS - 1, Math.floor((player.y + aura) / GRID));
    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        const cx = col * GRID + GRID / 2;
        const cy = row * GRID + GRID / 2;
        const away = Math.hypot(cx - player.x, cy - player.y);
        if (away > aura - 6 || away < 26) continue;
        const dx = fieldX[row * COLS + col];
        const dy = fieldY[row * COLS + col];
        const d = Math.hypot(dx, dy);
        if (d < 9) continue;
        const ux = dx / d;
        const uy = dy / d;
        const tipX = cx + ux * 7;
        const tipY = cy + uy * 7;
        ctx.moveTo(cx - ux * 6, cy - uy * 6);
        ctx.lineTo(tipX, tipY);
        ctx.moveTo(tipX - ux * 4 - uy * 3, tipY - uy * 4 + ux * 3);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(tipX - ux * 4 + uy * 3, tipY - uy * 4 - ux * 3);
      }
    }
    ctx.stroke();
  }

  function drawPlayer() {
    const boosted = player.boost > 0;
    const aura = AURA * (boosted ? 1.5 : 1);
    const { x, y } = player;
    if (status === "play") {
      const glow = ctx.createRadialGradient(x, y, aura * 0.2, x, y, aura);
      glow.addColorStop(0, "rgba(143,199,238,0)");
      glow.addColorStop(1, boosted ? "rgba(246,216,107,0.12)" : "rgba(143,199,238,0.09)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, aura, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([7, 9]);
      ctx.lineDashOffset = -clock * 26;
      ctx.strokeStyle = boosted ? "rgba(246,216,107,0.8)" : "rgba(143,199,238,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, aura, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawField(aura);
    }
    const bob = player.moving > 30 ? Math.sin(clock * 16) * 1.6 : Math.sin(clock * 3) * 0.8;
    const top = y - 17 + bob;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // feet
    ctx.strokeStyle = CHALK[0];
    ctx.lineWidth = 2.6;
    const stride = player.moving > 30 ? Math.sin(clock * 16) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 12);
    ctx.lineTo(x - 7 - stride, y + 19);
    ctx.moveTo(x + 7, y + 12);
    ctx.lineTo(x + 7 + stride, y + 19);
    ctx.stroke();
    // head
    ctx.fillStyle = SLATE;
    roundRect(x - 19, top, 38, 30, 8);
    ctx.fill();
    ctx.strokeStyle = boosted ? CHALK[1] : CHALK[0];
    ctx.stroke();
    // antenna
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top - 9);
    ctx.stroke();
    ctx.fillStyle = Math.sin(clock * 6) > 0 ? CHALK[1] : CHALK[5];
    ctx.beginPath();
    ctx.arc(x, top - 11, 3, 0, Math.PI * 2);
    ctx.fill();
    // eyes follow the direction of travel
    ctx.fillStyle = CHALK[0];
    const blink = Math.sin(clock * 0.9) > 0.985 ? 0.3 : 1;
    ctx.beginPath();
    ctx.ellipse(x - 7 + player.fx * 2.6, top + 11 + player.fy * 2, 2.8, 2.8 * blink, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 7 + player.fx * 2.6, top + 11 + player.fy * 2, 2.8, 2.8 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    // a softmax for a mouth
    ctx.fillStyle = CHALK[3];
    for (let b = 0; b < 4; b += 1) {
      const height = 2 + Math.abs(Math.sin(clock * 4 + b * 1.7)) * 5;
      ctx.fillRect(x - 8 + b * 4.4, top + 26 - height, 3, height);
    }
    if (bubble > 0 && guess) label(guess, x, top - 34, 21, CHALK[0], Math.min(1, bubble * 2));
  }

  function drawEraser(x: number, y: number, w: number, h: number, angle: number, face: boolean) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(244,241,230,0.16)";
    roundRect(-w / 2 - 4, h * 0.2, w + 8, h * 0.45, 6);
    ctx.fill();
    ctx.fillStyle = "#b98a4f";
    roundRect(-w / 2, -h / 2, w, h * 0.62, 5);
    ctx.fill();
    ctx.strokeStyle = "#7a5524";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = "#3a3f44";
    roundRect(-w / 2, h * 0.06, w, h * 0.44, 4);
    ctx.fill();
    if (face) {
      ctx.fillStyle = "#1c1a16";
      ctx.fillRect(-w * 0.2 - 2, -h * 0.26, 4, 5);
      ctx.fillRect(w * 0.2 - 2, -h * 0.26, 4, 5);
      ctx.strokeStyle = "#1c1a16";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.32, -h * 0.42);
      ctx.lineTo(-w * 0.1, -h * 0.32);
      ctx.moveTo(w * 0.32, -h * 0.42);
      ctx.lineTo(w * 0.1, -h * 0.32);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawThings() {
    for (const token of tokens) {
      if (!token.alive) continue;
      const y = token.y + Math.sin(token.age * 3) * 4;
      if (token.kind === "gpu") {
        ctx.fillStyle = "#2c4a34";
        roundRect(token.x - 22, y - 14, 44, 28, 4);
        ctx.fill();
        ctx.strokeStyle = CHALK[4];
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        for (let pin = 0; pin < 5; pin += 1) {
          ctx.moveTo(token.x - 16 + pin * 8, y + 14);
          ctx.lineTo(token.x - 16 + pin * 8, y + 19);
        }
        ctx.stroke();
        ctx.fillStyle = CHALK[4];
        ctx.font = `700 13px ui-monospace, Menlo, Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("H100", token.x, y + 1);
      } else {
        const pulse = 0.75 + Math.sin(token.age * 4) * 0.25;
        ctx.strokeStyle = `rgba(246,216,107,${0.35 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(token.x, y, 30 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
        label(token.text, token.x, y, 20, CHALK[1]);
      }
    }
    tags.forEach((tag) => {
      if (!tag.alive) return;
      const flicker = Math.sin(clock * 22 + tag.x) > -0.7 ? 1 : 0.55;
      const pop = Math.min(1, tag.age * 3);
      ctx.save();
      ctx.translate(tag.x, tag.y);
      ctx.scale(pop, pop);
      ctx.rotate(Math.sin(clock * 3 + tag.y) * 0.05);
      ctx.font = `700 15px ui-monospace, Menlo, Consolas, monospace`;
      const width = ctx.measureText(tag.label).width + 18;
      ctx.globalAlpha = flicker;
      ctx.fillStyle = "rgba(60,16,24,0.85)";
      roundRect(-width / 2, -15, width, 30, 5);
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#ff7088";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff9aab";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tag.label, 0, 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
    for (const eraser of erasers) {
      if (!eraser.alive) continue;
      drawEraser(eraser.x, eraser.y, 48, 26, Math.sin(eraser.wobble) * 0.18, true);
      label(eraser.text, eraser.x, eraser.y - 30, 17, "rgba(244,241,230,0.92)");
    }
    if (boss) {
      drawEraser(boss.x, boss.y, boss.half * 2 + 30, 78, Math.PI / 2 + Math.sin(clock * 9) * 0.03, false);
      label("Reviewer 2", boss.x, clamp(boss.y - boss.half - 34, 24, H - 24), 24, CHALK[2]);
    }
  }

  function drawStick() {
    if (!pointer.active || !pointer.stick || status !== "play") return;
    const dx = pointer.x - pointer.ox;
    const dy = pointer.y - pointer.oy;
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(STICK, d);
    ctx.strokeStyle = "rgba(244,241,230,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pointer.ox, pointer.oy, STICK, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(244,241,230,0.45)";
    ctx.beginPath();
    ctx.arc(pointer.ox + (dx / d) * reach, pointer.oy + (dy / d) * reach, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEffects() {
    for (const ring of rings) {
      if (ring.age < 0) continue;
      const k = ring.age / ring.life;
      ctx.strokeStyle = `rgba(${ring.color},${(1 - k) * 0.8})`;
      ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.from + (ring.to - ring.from) * (1 - (1 - k) ** 2), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const floater of floaters) {
      ctx.globalAlpha = Math.max(0, 1 - floater.age / 1.1);
      ctx.fillStyle = floater.color;
      ctx.font = `700 19px ${HAND_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(floater.text, clamp(floater.x, 70, W - 70), floater.y - floater.age * 34);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    if (!background || backgroundScale !== scale) buildBackground();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (background) ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    else {
      ctx.fillStyle = SLATE;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const jolt = shake > 0 ? shake * 14 : 0;
    ctx.setTransform(scale, 0, 0, scale, (Math.random() - 0.5) * jolt * scale, (Math.random() - 0.5) * jolt * scale);
    if (status === "empty" && count === 0) return;
    if (reveal > 0 && crisp) {
      ctx.globalAlpha = reveal;
      ctx.shadowColor = "rgba(244,241,230,0.55)";
      ctx.shadowBlur = 10 * scale;
      ctx.drawImage(crisp, 0, 0, W, H);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    drawDust();
    drawThings();
    if (status !== "empty") drawPlayer();
    drawEffects();
    drawStick();
  }

  // ------------------------------------------------------------ loop
  let last = performance.now();
  let frame = 0;

  function loop(now: number) {
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!paused) update(dt);
    render();
    frame = requestAnimationFrame(loop);
  }

  resize();
  frame = requestAnimationFrame(loop);

  return {
    load,
    begin,
    burst,
    setPaused(next) {
      paused = next;
      if (next) {
        keys.clear();
        pointer.active = false;
      }
      last = performance.now();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    },
    debug: {
      state: () => ({ status, time, count, settled, w: W, h: H, layers: layerCount(stage?.drawing ?? "cat"), x: player.x, y: player.y, erasers: erasers.filter((e) => e.alive).length, tags: tags.filter((t) => t.alive).length }),
      finish: () => {
        tokens.forEach((token) => {
          if (token.alive && token.kind === "guide") {
            token.alive = false;
            addLayer(token.layer);
          }
        });
        finish(true);
      },
      expire: () => {
        if (stage) time = stage.seconds - 0.2;
      },
      // somewhere a bot (or a hint) could go next: a free grain, a label tag or a CLIP card
      next: () => {
        const tag = tags.find((item) => item.alive);
        if (tag && tag.held > 60) return { x: tag.x, y: tag.y };
        const token = tokens.find((item) => item.alive);
        if (token && settled / Math.max(1, count) > 0.5) return { x: token.x, y: token.y };
        let best: { x: number; y: number } | null = null;
        let bestDistance = Infinity;
        for (let n = 0; n < 40; n += 1) {
          const i = Math.floor(Math.random() * count);
          if (state[i] !== FREE) continue;
          const d = (px[i] - player.x) ** 2 + (py[i] - player.y) ** 2;
          if (d < bestDistance) {
            bestDistance = d;
            best = { x: px[i], y: py[i] };
          }
        }
        return best;
      },
    },
  };
}
