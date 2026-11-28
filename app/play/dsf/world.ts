/*
 * The island of "What I Cannot Create": a thin strip of land in a sea of
 * static, at night, seen from above through a camera that follows the player.
 *
 * The engine only knows about walking, light and what is nearby. Puzzles,
 * the log and every word live in the React shell, which hears from the
 * engine through WorldEvents and tells it what has been solved.
 */

import type { Synth } from "../shared/synth";
import { SITES, STATUES, WORLD, type SiteId } from "./content";

export type Near = { kind: "site"; id: SiteId; name: string } | { kind: "statue"; id: string; name: string } | null;

export type WorldEvents = { onNear(near: Near): void; onToast(text: string): void };

export type World = {
  setPaused(paused: boolean): void;
  /** Ruins that are solved, statues that have been questioned, and whether the compass is known. */
  setProgress(solved: SiteId[], questioned: string[], compass: boolean): void;
  dispose(): void;
  debug: { goto(id: string): void; state(): Record<string, number | string> };
};

const WW = WORLD.w;
const WH = WORLD.h;
const HALF = 72; // half the width of a path
const SPEED = 230;
const NIGHT = "#070a0f";

const at = (id: SiteId) => SITES.find((site) => site.id === id) ?? SITES[0];
const P = (id: SiteId): [number, number] => [at(id).x, at(id).y];
const START: [number, number] = [WORLD.start.x, WORLD.start.y];

/** The paths: a ring around the island and spokes to the door. */
const PATHS: [[number, number], [number, number]][] = [
  [START, P("shore")],
  [P("shore"), P("needle")],
  [P("needle"), P("looks")],
  [P("looks"), P("ruler")],
  [P("ruler"), P("footprints")],
  [P("footprints"), P("clock")],
  [P("clock"), P("bench")],
  [P("bench"), P("shore")],
  [P("shore"), P("door")],
  [P("ruler"), P("door")],
  [P("clock"), P("door")],
  [P("looks"), P("door")],
];

function toSegment(x: number, y: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
}

const clearing = (id: SiteId) => (id === "door" ? 175 : 122);

/** Is there ground at (x, y)? Everything else is static. */
function land(x: number, y: number) {
  for (const site of SITES) if ((x - site.x) ** 2 + (y - site.y) ** 2 < clearing(site.id) ** 2) return true;
  for (const [a, b] of PATHS) if (toSegment(x, y, a, b) < HALF) return true;
  return false;
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

export function createWorld(canvas: HTMLCanvasElement, synth: Synth, events: WorldEvents): World {
  const maybe = canvas.getContext("2d");
  if (!maybe) throw new Error("2D canvas is not available");
  const ctx: CanvasRenderingContext2D = maybe;

  let W = 1000;
  let H = 620;
  let scale = 1;
  let camX = 0;
  let camY = 0;
  let paused = true;
  let disposed = false;
  let clock = 0;
  let stepTimer = 0;
  let solved: SiteId[] = [];
  let questioned: string[] = [];
  let compass = false;
  let near: Near = null;
  let warnedSea = 0;
  const player = { x: START[0], y: START[1], vx: 0, vy: 0, fx: 0, fy: -1, moving: 0 };

  // ------------------------------------------------------------ the island, drawn once
  const MAP = 0.5;
  const island = document.createElement("canvas");
  island.width = WW * MAP;
  island.height = WH * MAP;
  {
    const g = island.getContext("2d");
    if (g) {
      g.scale(MAP, MAP);
      g.lineCap = "round";
      g.lineJoin = "round";
      const shape = (width: number, extra: number, style: string) => {
        g.strokeStyle = style;
        g.fillStyle = style;
        g.lineWidth = width;
        g.beginPath();
        for (const [a, b] of PATHS) {
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
        g.stroke();
        for (const site of SITES) {
          g.beginPath();
          g.arc(site.x, site.y, clearing(site.id) + extra, 0, Math.PI * 2);
          g.fill();
        }
      };
      shape(HALF * 2 + 40, 20, "rgba(150,205,245,0.14)"); // surf
      shape(HALF * 2 + 14, 7, "rgba(170,215,250,0.42)");
      shape(HALF * 2, 0, "#24414f"); // ground
      shape(HALF * 2 - 30, -15, "#2c4e5c");
      // worn trails
      g.setLineDash([3, 16]);
      g.strokeStyle = "rgba(240,236,224,0.55)";
      g.lineWidth = 5;
      g.beginPath();
      for (const [a, b] of PATHS) {
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
      }
      g.stroke();
      g.setLineDash([]);
      // scrub and stones, away from the trails
      let seed = 7;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let n = 0; n < 900; n += 1) {
        const x = random() * WW;
        const y = random() * WH;
        if (!land(x, y) || !land(x + 14, y) || !land(x - 14, y) || !land(x, y + 14)) continue;
        if (PATHS.some(([a, b]) => toSegment(x, y, a, b) < 26)) continue;
        if (SITES.some((site) => (x - site.x) ** 2 + (y - site.y) ** 2 < 70 ** 2)) continue;
        if (random() < 0.55) {
          g.fillStyle = "#3b6a66";
          g.beginPath();
          g.moveTo(x, y - 13);
          g.lineTo(x + 8, y + 6);
          g.lineTo(x - 8, y + 6);
          g.closePath();
          g.fill();
        } else {
          g.fillStyle = "#47606e";
          g.beginPath();
          g.ellipse(x, y, 7 + random() * 5, 5, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
  const dark = document.createElement("canvas");

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const bounds = parent.getBoundingClientRect();
    if (!(bounds.width > 0 && bounds.height > 0)) return;
    // show about the same amount of island on any screen: a phone sees a tall slice
    const aspect = clamp(bounds.width / bounds.height, 0.5, 2);
    const area = clamp((bounds.width * bounds.height) / 0.7 ** 2, 380000, 640000);
    W = Math.round(Math.sqrt(area * aspect));
    H = Math.round(W / aspect);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${bounds.width}px`;
    canvas.style.height = `${bounds.height}px`;
    canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    scale = canvas.width / W;
    dark.width = canvas.width;
    dark.height = canvas.height;
  }

  // ------------------------------------------------------------ input
  const keys = new Set<string>();
  const pointer = { active: false, x: 0, y: 0, stick: false, ox: 0, oy: 0 };
  const STICK = 46;

  function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (!paused && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) event.preventDefault();
    keys.add(key);
  }
  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }
  function toView(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * W;
    pointer.y = ((event.clientY - rect.top) / rect.height) * H;
  }
  function onPointerDown(event: PointerEvent) {
    synth.unlock();
    pointer.active = true;
    pointer.stick = event.pointerType === "touch";
    toView(event);
    pointer.ox = pointer.x;
    pointer.oy = pointer.y;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* not every pointer can be captured */
    }
  }
  function onPointerMove(event: PointerEvent) {
    if (pointer.active) toView(event);
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

  // ------------------------------------------------------------ update
  function follow(blend: number) {
    camX += (clamp(player.x - W / 2, -120, WW - W + 120) - camX) * blend;
    camY += (clamp(player.y - H / 2, -120, WH - H + 120) - camY) * blend;
  }

  function update(dt: number) {
    clock += dt;
    let ix = 0;
    let iy = 0;
    if (keys.has("ArrowLeft") || keys.has("a")) ix -= 1;
    if (keys.has("ArrowRight") || keys.has("d")) ix += 1;
    if (keys.has("ArrowUp") || keys.has("w")) iy -= 1;
    if (keys.has("ArrowDown") || keys.has("s")) iy += 1;
    if (ix === 0 && iy === 0 && pointer.active) {
      // a finger works a floating joystick; a mouse leads the robot by the nose
      const dx = pointer.stick ? pointer.x - pointer.ox : pointer.x + camX - player.x;
      const dy = pointer.stick ? pointer.y - pointer.oy : pointer.y + camY - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const push = Math.min(1, d / (pointer.stick ? STICK : 40));
        ix = (dx / d) * push;
        iy = (dy / d) * push;
        if (pointer.stick && d > STICK * 1.5) {
          pointer.ox += (dx / d) * (d - STICK * 1.5);
          pointer.oy += (dy / d) * (d - STICK * 1.5);
        }
      }
    } else if (ix !== 0 && iy !== 0) {
      ix *= Math.SQRT1_2;
      iy *= Math.SQRT1_2;
    }
    const blend = 1 - Math.exp(-dt * 12);
    player.vx += (ix * SPEED - player.vx) * blend;
    player.vy += (iy * SPEED - player.vy) * blend;
    // the sea is static: there is nothing to stand on
    const nx = player.x + player.vx * dt;
    const ny = player.y + player.vy * dt;
    let blocked = false;
    if (land(nx, player.y)) player.x = nx;
    else {
      player.vx = 0;
      blocked = true;
    }
    if (land(player.x, ny)) player.y = ny;
    else {
      player.vy = 0;
      blocked = true;
    }
    if (blocked && (ix !== 0 || iy !== 0) && clock - warnedSea > 14) {
      warnedSea = clock;
      events.onToast("Static. Nothing to stand on out there.");
    }
    player.moving = Math.hypot(player.vx, player.vy);
    if (player.moving > 20) {
      player.fx = player.vx / player.moving;
      player.fy = player.vy / player.moving;
      stepTimer -= dt;
      if (stepTimer <= 0) {
        stepTimer = 0.3;
        synth.noise({ dur: 0.04, gain: 0.035, freq: 240 + Math.random() * 80 });
      }
    }
    follow(1 - Math.exp(-dt * 8));

    // what is within reach
    let next: Near = null;
    let best = 62 * 62;
    for (const site of SITES) {
      const d = (site.x - player.x) ** 2 + (site.y - player.y) ** 2;
      if (d < best) {
        best = d;
        next = { kind: "site", id: site.id, name: site.name };
      }
    }
    for (const statue of STATUES) {
      const d = (statue.x - player.x) ** 2 + (statue.y - player.y) ** 2;
      if (d < best) {
        best = d;
        next = { kind: "statue", id: statue.id, name: statue.name };
      }
    }
    if (next?.id !== near?.id) {
      near = next;
      events.onNear(near);
      if (near) synth.tone({ freq: 620, dur: 0.06, gain: 0.05 });
    }
  }

  // ------------------------------------------------------------ drawing
  function visible(x: number, y: number, margin: number) {
    return x > camX - margin && x < camX + W + margin && y > camY - margin && y < camY + H + margin;
  }

  function light(g: CanvasRenderingContext2D, x: number, y: number, radius: number, strength: number) {
    const sx = (x - camX) * scale;
    const sy = (y - camY) * scale;
    const r = radius * scale;
    const glow = g.createRadialGradient(sx, sy, r * 0.15, sx, sy, r);
    glow.addColorStop(0, `rgba(0,0,0,${strength})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.fillRect(sx - r, sy - r, r * 2, r * 2);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);

    // the sea of static
    ctx.fillStyle = "rgba(176,206,240,0.6)";
    ctx.beginPath();
    const specks = Math.round((W * H) / 330);
    for (let n = 0; n < specks; n += 1) ctx.rect(camX + Math.random() * W, camY + Math.random() * H, 1.8, 1.8);
    ctx.fill();
    ctx.drawImage(island, 0, 0, WW, WH);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const statue of STATUES) {
      if (!visible(statue.x, statue.y, 80)) continue;
      const out = questioned.includes(statue.id);
      ctx.fillStyle = out ? "#55636f" : "#93a4b3";
      ctx.beginPath();
      ctx.moveTo(statue.x - 13, statue.y + 18);
      ctx.lineTo(statue.x - 9, statue.y - 8);
      ctx.arc(statue.x, statue.y - 12, 10, Math.PI, 0);
      ctx.lineTo(statue.x + 13, statue.y + 18);
      ctx.closePath();
      ctx.fill();
      if (out) {
        ctx.strokeStyle = "#f2a0b5";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(statue.x - 15, statue.y - 20);
        ctx.lineTo(statue.x + 15, statue.y + 18);
        ctx.stroke();
      }
    }
    for (const site of SITES) {
      if (!visible(site.x, site.y, 160)) continue;
      const done = solved.includes(site.id);
      const door = site.id === "door";
      const w = door ? 88 : 54;
      const h = door ? 112 : 76;
      if (done) {
        const beam = ctx.createLinearGradient(0, site.y - h / 2 - 190, 0, site.y - h / 2);
        beam.addColorStop(0, "rgba(246,216,107,0)");
        beam.addColorStop(1, "rgba(246,216,107,0.5)");
        ctx.fillStyle = beam;
        ctx.fillRect(site.x - 7, site.y - h / 2 - 190, 14, 190);
      }
      ctx.fillStyle = "#0c1218";
      ctx.strokeStyle = done ? "#f6d86b" : "rgba(232,228,216,0.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(site.x - w / 2, site.y + h / 2);
      ctx.lineTo(site.x - w / 2, site.y - h / 2 + w / 2);
      ctx.arc(site.x, site.y - h / 2 + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(site.x + w / 2, site.y + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = done ? "#f6d86b" : "rgba(232,228,216,0.9)";
      ctx.font = `700 ${door ? 40 : 26}px Georgia, serif`;
      ctx.fillText(done && !door ? "✓" : site.glyph, site.x, site.y + 2);
    }

    // the compass: the field, read from where you stand
    if (compass) {
      let target: (typeof SITES)[number] | null = null;
      let best = Infinity;
      for (const site of SITES) {
        if (solved.includes(site.id)) continue;
        const d = (site.x - player.x) ** 2 + (site.y - player.y) ** 2;
        if (d < best && d > 90 * 90) {
          best = d;
          target = site;
        }
      }
      if (target) {
        const angle = Math.atan2(target.y - player.y, target.x - player.x);
        ctx.save();
        ctx.translate(player.x + Math.cos(angle) * (46 + Math.sin(clock * 4) * 3), player.y + Math.sin(angle) * (46 + Math.sin(clock * 4) * 3));
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(150,205,245,0.95)";
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-5, -8);
        ctx.lineTo(-1, 0);
        ctx.lineTo(-5, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // the classifier, carrying a lantern
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(1.35, 1.35);
    ctx.translate(-player.x, -player.y);
    const { x, y } = player;
    const bob = player.moving > 30 ? Math.sin(clock * 16) * 1.6 : Math.sin(clock * 3) * 0.8;
    const top = y - 17 + bob;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#e8e4d8";
    ctx.lineWidth = 2.6;
    const stride = player.moving > 30 ? Math.sin(clock * 16) * 3 : 0;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 12);
    ctx.lineTo(x - 7 - stride, y + 19);
    ctx.moveTo(x + 7, y + 12);
    ctx.lineTo(x + 7 + stride, y + 19);
    ctx.stroke();
    ctx.fillStyle = "#101820";
    ctx.beginPath();
    ctx.roundRect(x - 19, top, 38, 30, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top - 9);
    ctx.stroke();
    ctx.fillStyle = "#f6d86b";
    ctx.beginPath();
    ctx.arc(x, top - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8e4d8";
    ctx.beginPath();
    ctx.arc(x - 7 + player.fx * 2.6, top + 12 + player.fy * 2, 2.8, 0, Math.PI * 2);
    ctx.arc(x + 7 + player.fx * 2.6, top + 12 + player.fy * 2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // night: everything is dimmed except the lantern and the beacons of what is understood
    const g = dark.getContext("2d");
    if (g) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, dark.width, dark.height);
      g.fillStyle = "rgba(5,9,20,0.6)";
      g.fillRect(0, 0, dark.width, dark.height);
      g.globalCompositeOperation = "destination-out";
      light(g, x, y, 290 + Math.sin(clock * 2.3) * 6, 1);
      for (const site of SITES) {
        if (!visible(site.x, site.y, 320)) continue;
        if (solved.includes(site.id)) light(g, site.x, site.y, 340, 1);
        else light(g, site.x, site.y, 110, 0.7);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(dark, 0, 0);
    }

    // name plates, drawn over the night so they are always readable
    ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '600 15px "Helvetica Neue", Helvetica, Arial, sans-serif';
    const plate = (text: string, px: number, py: number, ink: string) => {
      const width = ctx.measureText(text).width + 18;
      ctx.fillStyle = "rgba(7,10,15,0.82)";
      ctx.beginPath();
      ctx.roundRect(px - width / 2, py - 12, width, 24, 7);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(text, px, py + 1);
    };
    for (const site of SITES) {
      if (!visible(site.x, site.y, 200)) continue;
      const tall = site.id === "door" ? 112 : 76;
      plate(site.name, site.x, site.y - tall / 2 - 22, solved.includes(site.id) ? "#f6d86b" : "#f1eee6");
    }
    for (const statue of STATUES) {
      if (near?.id !== statue.id) continue;
      plate(statue.name, statue.x, statue.y - 44, "#f1eee6");
    }

    // joystick and a small map, in screen space
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (pointer.active && pointer.stick) {
      const dx = pointer.x - pointer.ox;
      const dy = pointer.y - pointer.oy;
      const d = Math.hypot(dx, dy) || 1;
      const reach = Math.min(STICK, d);
      ctx.strokeStyle = "rgba(232,228,216,0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pointer.ox, pointer.oy, STICK, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(232,228,216,0.45)";
      ctx.beginPath();
      ctx.arc(pointer.ox + (dx / d) * reach, pointer.oy + (dy / d) * reach, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    const mw = Math.min(150, W * 0.3);
    const mh = (mw * WH) / WW;
    const mx = W - mw - 10;
    const my = 10;
    const k = mw / WW;
    ctx.fillStyle = "rgba(7,10,15,0.85)";
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.strokeStyle = "rgba(232,228,216,0.35)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(island, mx, my, mw, mh);
    ctx.globalAlpha = 1;
    for (const site of SITES) {
      ctx.fillStyle = solved.includes(site.id) ? "#f6d86b" : "rgba(232,228,216,0.75)";
      ctx.beginPath();
      ctx.arc(mx + site.x * k, my + site.y * k, site.id === "door" ? 4 : 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#96cdf5";
    ctx.beginPath();
    ctx.arc(mx + player.x * k, my + player.y * k, 3.2, 0, Math.PI * 2);
    ctx.fill();
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
  follow(1);
  frame = requestAnimationFrame(loop);

  return {
    setPaused(next) {
      paused = next;
      if (next) {
        keys.clear();
        pointer.active = false;
      }
      last = performance.now();
    },
    setProgress(nextSolved, nextQuestioned, nextCompass) {
      solved = nextSolved;
      questioned = nextQuestioned;
      compass = nextCompass;
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
      goto(id) {
        const target = SITES.find((site) => site.id === id) ?? STATUES.find((statue) => statue.id === id);
        if (!target) return;
        player.x = target.x;
        player.y = target.y + 30;
        follow(1);
      },
      state: () => ({ x: player.x, y: player.y, camX, camY, w: W, h: H, near: near ? near.id : "", onLand: String(land(player.x, player.y)) }),
    },
  };
}
