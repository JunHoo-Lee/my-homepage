"use client";

/*
 * Figures 2 and 3 share one board: 640 x 400 of static with a thin curve of
 * "pictures" hidden in it (the image manifold, in two dimensions).
 *
 *   find  the reader taps blindly, eight times, and almost always hits static
 *   home  the reader drags a classifier around; cells turn green where its
 *         answer is right and red where it answers anyway. The green region
 *         is the curve of the first figure.
 */

import { useEffect, useRef } from "react";

import type { Synth } from "../../shared/synth";

const W = 640;
const H = 400;
const CELL = 16;
const COLS = W / CELL;
const ROWS = H / CELL;
const HIT = 11;
const BAND = 21;
const TAPS = 8;
const NIGHT = "#141b1b";

// two quadratic arcs, sampled once: the hidden curve
const CURVE: [number, number][] = [];
for (let i = 0; i <= 120; i += 1) {
  const t = i / 120;
  const u = 1 - t;
  CURVE.push([u * u * 46 + 2 * u * t * 190 + t * t * 322, u * u * 318 + 2 * u * t * 20 + t * t * 206]);
}
for (let i = 1; i <= 120; i += 1) {
  const t = i / 120;
  const u = 1 - t;
  CURVE.push([u * u * 322 + 2 * u * t * 454 + t * t * 596, u * u * 206 + 2 * u * t * 392 + t * t * 84]);
}

/** Distance to the curve and how far along it the nearest point is (0..1). */
function nearest(x: number, y: number) {
  let best = Infinity;
  let at = 0;
  for (let i = 0; i < CURVE.length; i += 1) {
    const d = (CURVE[i][0] - x) ** 2 + (CURVE[i][1] - y) ** 2;
    if (d < best) {
      best = d;
      at = i;
    }
  }
  return { d: Math.sqrt(best), t: at / (CURVE.length - 1) };
}

const RIGHT = ["tabby cat", "harbour", "golden retriever", "analog clock", "banana", "lighthouse"];
// every one of these is a famous adversarial example
const WRONG = ["ostrich · 99.9%", "gibbon · 99.3%", "guacamole · 99.0%", "toaster · 99.1%"];

export type Reading = { label: string; right: boolean };
export type FindResult = { hits: number; taps: number; share: number };

type Props =
  | { mode: "find"; solved: boolean; revealSignal?: number; synth: Synth | null; label: string; onTap(left: number, hit: boolean): void; onSolved(result: FindResult): void }
  | { mode: "home"; solved: boolean; revealSignal?: number; synth: Synth | null; label: string; onRead(reading: Reading): void; onProgress(share: number): void; onSolved(): void };

export default function ProbeBoard(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const api = useRef<{ reveal(): void } | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const { mode, solved, revealSignal = 0, label } = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // which cells belong to the band around the curve
    const band = new Uint8Array(COLS * ROWS);
    let bandCells = 0;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (nearest(col * CELL + CELL / 2, row * CELL + CELL / 2).d < BAND) {
          band[row * COLS + col] = 1;
          bandCells += 1;
        }
      }
    }
    const share = bandCells / (COLS * ROWS);

    const painted = new Uint8Array(COLS * ROWS);
    let paintedBand = 0;
    const taps: { x: number; y: number; hit: boolean }[] = [];
    let done = latest.current.solved;
    let reveal = done ? 1 : 0;
    let visible = false;
    let disposed = false;
    let scale = 1;
    const pointer = { on: false, x: 0, y: 0 };

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = Math.round((width * H) / W);
      }
      scale = canvas.width / W;
    }

    function solve() {
      if (done) return;
      done = true;
      const now = latest.current;
      now.synth?.arp([523, 659, 784], 0.09, { dur: 0.4, type: "triangle", gain: 0.11 });
      if (now.mode === "find") now.onSolved({ hits: taps.filter((tap) => tap.hit).length, taps: taps.length, share });
      else now.onSolved();
    }

    function paintAround(x: number, y: number) {
      const now = latest.current;
      if (now.mode !== "home") return;
      const c0 = Math.max(0, Math.floor((x - 30) / CELL));
      const c1 = Math.min(COLS - 1, Math.floor((x + 30) / CELL));
      const r0 = Math.max(0, Math.floor((y - 30) / CELL));
      const r1 = Math.min(ROWS - 1, Math.floor((y + 30) / CELL));
      for (let row = r0; row <= r1; row += 1) {
        for (let col = c0; col <= c1; col += 1) {
          const index = row * COLS + col;
          if (painted[index]) continue;
          if ((col * CELL + CELL / 2 - x) ** 2 + (row * CELL + CELL / 2 - y) ** 2 > 30 * 30) continue;
          painted[index] = 1;
          if (band[index]) paintedBand += 1;
        }
      }
      const near = nearest(x, y);
      const right = near.d < BAND;
      now.onRead({
        label: right ? `${RIGHT[Math.min(RIGHT.length - 1, Math.floor(near.t * RIGHT.length))]} · ${(0.9 + ((near.t * 7) % 0.08)).toFixed(2)}` : WRONG[(Math.floor(x / 90) + Math.floor(y / 70) * 3) % WRONG.length],
        right,
      });
      const progress = paintedBand / bandCells;
      now.onProgress(Math.min(1, progress / 0.6));
      if (progress >= 0.6) solve();
    }

    function render() {
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, W, H);
      const now = latest.current;
      if (now.mode === "home") {
        for (let row = 0; row < ROWS; row += 1) {
          for (let col = 0; col < COLS; col += 1) {
            const index = row * COLS + col;
            if (!painted[index] && !(done && reveal > 0.99)) continue;
            ctx.fillStyle = band[index] ? "rgba(120,205,140,0.5)" : "rgba(214,84,96,0.22)";
            ctx.fillRect(col * CELL + 1, row * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }
      // static
      ctx.fillStyle = "rgba(210,218,232,0.5)";
      ctx.beginPath();
      for (let n = 0; n < 620; n += 1) ctx.rect(Math.random() * W, Math.random() * H, 1.7, 1.7);
      ctx.fill();
      // the curve, once it is known
      if (reveal > 0) {
        const upto = Math.floor(reveal * (CURVE.length - 1));
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = now.mode === "home" ? "rgba(244,241,230,0.55)" : "rgba(255,225,141,0.3)";
        ctx.lineWidth = HIT * 2;
        ctx.beginPath();
        ctx.moveTo(CURVE[0][0], CURVE[0][1]);
        for (let i = 1; i <= upto; i += 1) ctx.lineTo(CURVE[i][0], CURVE[i][1]);
        if (now.mode === "find") ctx.stroke();
        ctx.strokeStyle = "#f4f1e6";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      for (const tap of taps) {
        ctx.lineWidth = 3.2;
        if (tap.hit) {
          ctx.strokeStyle = "#adbc3a";
          ctx.beginPath();
          ctx.arc(tap.x, tap.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#e0394c";
          ctx.beginPath();
          ctx.moveTo(tap.x - 6, tap.y - 6);
          ctx.lineTo(tap.x + 6, tap.y + 6);
          ctx.moveTo(tap.x + 6, tap.y - 6);
          ctx.lineTo(tap.x - 6, tap.y + 6);
          ctx.stroke();
        }
      }
      if (now.mode === "home" && pointer.on && !done) {
        ctx.strokeStyle = "rgba(244,241,230,0.9)";
        ctx.lineWidth = 2;
        ctx.strokeRect(pointer.x - 15, pointer.y - 12, 30, 24);
        ctx.fillStyle = "#f4f1e6";
        ctx.fillRect(pointer.x - 8, pointer.y - 4, 4, 4);
        ctx.fillRect(pointer.x + 4, pointer.y - 4, 4, 4);
      }
    }

    let last = performance.now();
    let frame = 0;
    function loop(now: number) {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (visible) {
        if (done && reveal < 1) reveal = Math.min(1, reveal + dt / 1.2);
        render();
      }
      frame = requestAnimationFrame(loop);
    }

    function locate(event: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * W;
      pointer.y = ((event.clientY - rect.top) / rect.height) * H;
    }
    function onDown(event: PointerEvent) {
      const now = latest.current;
      now.synth?.unlock();
      locate(event);
      pointer.on = true;
      if (done) return;
      if (now.mode === "find") {
        const hit = nearest(pointer.x, pointer.y).d < HIT;
        taps.push({ x: pointer.x, y: pointer.y, hit });
        if (hit) now.synth?.tone({ freq: 880, dur: 0.12, gain: 0.1 });
        else now.synth?.noise({ dur: 0.06, gain: 0.1, freq: 900 });
        now.onTap(TAPS - taps.length, hit);
        if (hit || taps.length >= TAPS) solve();
      } else paintAround(pointer.x, pointer.y);
    }
    function onMove(event: PointerEvent) {
      locate(event);
      pointer.on = true;
      if (!done && latest.current.mode === "home") paintAround(pointer.x, pointer.y);
    }
    function onLeave() {
      pointer.on = false;
    }
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerup", onLeave);
    canvas.addEventListener("pointercancel", onLeave);

    const resizer = new ResizeObserver(() => resize());
    resizer.observe(canvas);
    const watcher = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        last = performance.now();
      },
      { threshold: 0.2 },
    );
    watcher.observe(canvas);
    api.current = { reveal: solve };
    resize();
    frame = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      api.current = null;
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onLeave);
      canvas.removeEventListener("pointercancel", onLeave);
    };
  }, [mode]);

  useEffect(() => {
    if (revealSignal > 0) api.current?.reveal();
  }, [revealSignal]);

  return <canvas ref={canvasRef} role="img" aria-label={label} style={{ display: "block", width: "100%", aspectRatio: `${W} / ${H}`, touchAction: solved ? "auto" : "none", cursor: solved ? "default" : "crosshair" }} />;
}
