"use client";

/*
 * The Needle Field: 640 x 400 of static with a thin curve of "pictures"
 * hidden in it (the image manifold, in two dimensions). The reader taps
 * blindly, eight times, and almost always hits static; then the curve shows.
 */

import { useEffect, useRef } from "react";

import type { Synth } from "../../shared/synth";

const W = 640;
const H = 400;
const HIT = 11;
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

/** Distance from a point of the board to the curve. */
function distance(x: number, y: number) {
  let best = Infinity;
  for (let i = 0; i < CURVE.length; i += 1) {
    const d = (CURVE[i][0] - x) ** 2 + (CURVE[i][1] - y) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

type Props = { solved: boolean; revealSignal?: number; synth: Synth | null; label: string; onTap(left: number, hit: boolean): void; onSolved(): void };

export default function ProbeBoard(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const api = useRef<{ reveal(): void } | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const { solved, revealSignal = 0, label } = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const taps: { x: number; y: number; hit: boolean }[] = [];
    let done = latest.current.solved;
    let reveal = done ? 1 : 0;
    let visible = false;
    let disposed = false;
    let scale = 1;

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
      now.onSolved();
    }

    function render() {
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, W, H);
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
        ctx.strokeStyle = "rgba(255,225,141,0.3)";
        ctx.lineWidth = HIT * 2;
        ctx.beginPath();
        ctx.moveTo(CURVE[0][0], CURVE[0][1]);
        for (let i = 1; i <= upto; i += 1) ctx.lineTo(CURVE[i][0], CURVE[i][1]);
        ctx.stroke();
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

    function onDown(event: PointerEvent) {
      const now = latest.current;
      now.synth?.unlock();
      if (!canvas || done) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * W;
      const y = ((event.clientY - rect.top) / rect.height) * H;
      const hit = distance(x, y) < HIT;
      taps.push({ x, y, hit });
      if (hit) now.synth?.tone({ freq: 880, dur: 0.12, gain: 0.1 });
      else now.synth?.noise({ dur: 0.06, gain: 0.1, freq: 900 });
      now.onTap(TAPS - taps.length, hit);
      if (hit || taps.length >= TAPS) solve();
    }
    canvas.addEventListener("pointerdown", onDown);

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
    };
  }, []);

  useEffect(() => {
    if (revealSignal > 0) api.current?.reveal();
  }, [revealSignal]);

  return <canvas ref={canvasRef} role="img" aria-label={label} style={{ display: "block", width: "100%", aspectRatio: `${W} / ${H}`, touchAction: solved ? "auto" : "none", cursor: solved ? "default" : "crosshair" }} />;
}
