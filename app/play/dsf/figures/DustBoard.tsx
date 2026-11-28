"use client";

/*
 * The figure most of the article leans on: a dark board of dust that turns
 * into a chalk drawing wherever the reader drags.
 *
 * One grain of dust is one candidate image; the hidden drawing is the data
 * manifold. Dust under the pointer is "activated": it flows to its point on
 * the drawing and stays. When most of it has arrived the figure is solved,
 * the rest follows on its own and the crisp strokes fade in.
 *
 * Extra layers (prompt cards) can be switched on at any time, and a figure
 * can start with a drawing already on the board that gets erased first.
 */

import { useEffect, useRef } from "react";

import type { Synth } from "../../shared/synth";
import { CHALK, loadChalkFont, renderDrawing, sampleLayer, type DrawingId } from "../drawings";

const W = 640;
const H = 400;
const BOARD = { w: W, h: H };
const MAX = 5200;
const FREE = 0;
const FLOW = 1;
const SET = 2;
const FROZEN = 3;
const REACH = 48;
const GOAL = 0.85;
const NIGHT = "#0f141b";

type Props = {
  drawing: DrawingId;
  /** Layers of the drawing that should be on the board. Layer 0 is always there. */
  layers?: number[];
  /** A drawing that is on the board at first and is erased when the figure comes into view. */
  erase?: DrawingId;
  solved: boolean;
  /** The dust finds its own way, without dragging (used when the picture is the reward, not the puzzle). */
  autoplay?: boolean;
  /** Bump to finish the figure without playing. */
  revealSignal?: number;
  locked?: boolean;
  synth: Synth | null;
  label: string;
  onSolved(figure: string | null): void;
};

function gauss() {
  return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.87;
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

export default function DustBoard({ drawing, layers = [0], erase, solved, autoplay = false, revealSignal = 0, locked = false, synth, label, onSolved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const api = useRef<{ setLayers(next: number[]): void; reveal(): void; setLocked(next: boolean): void } | null>(null);
  const latest = useRef({ onSolved, synth, solved });
  useEffect(() => {
    latest.current = { onSolved, synth, solved };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

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
    let count = 0;
    let settled = 0;
    let have: number[] = [];
    let crisp: HTMLCanvasElement | null = null;
    let done = latest.current.solved;
    let reported = latest.current.solved;
    let since = 0;
    let auto = autoplay;
    let wantReveal = false; // asked to reveal before the board was ready
    let isLocked = locked;
    let frozen = false;
    let sweeping = false; // Reviewer 2's eraser is crossing the board
    let eraser = -60; // its x position
    let visible = false;
    let ready = false;
    let disposed = false;
    let scale = 1;
    let clock = 0;
    let tick = 0;
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

    function addLayer(layer: number, startAt?: { x: number; y: number; color: number }[]) {
      const targets = sampleLayer(drawing, layer, BOARD, 0.8);
      for (let n = 0; n < targets.length && count < MAX; n += 1) {
        const i = count;
        count += 1;
        tx[i] = targets[n].x;
        ty[i] = targets[n].y;
        targetColor[i] = targets[n].color;
        const spread = Math.random() < 0.1 ? 120 : 62;
        hx[i] = clamp(tx[i] + gauss() * spread, 6, W - 6);
        hy[i] = clamp(ty[i] + gauss() * spread, 6, H - 6);
        seed[i] = Math.random();
        if (startAt && startAt.length > 0) {
          const from = startAt[n % startAt.length];
          px[i] = from.x;
          py[i] = from.y;
          color[i] = from.color;
          state[i] = FROZEN;
        } else {
          px[i] = hx[i];
          py[i] = hy[i];
          color[i] = targetColor[i];
          // a card added to a finished picture needs no more dragging
          state[i] = done ? FLOW : FREE;
        }
      }
      have = [...have, layer].sort((a, b) => a - b);
      crisp = renderDrawing(drawing, have, BOARD, Math.max(1, Math.min(2, scale)));
      if (done && layer > 0) {
        // the edited picture is reported again once the new dust has arrived
        reported = false;
        since = 0;
      }
    }

    function finish() {
      if (done) return;
      done = true;
      since = 0;
      for (let i = 0; i < count; i += 1) {
        if (state[i] === FREE || state[i] === FROZEN) {
          color[i] = targetColor[i];
          state[i] = FLOW;
        }
      }
      latest.current.synth?.arp([523, 659, 784, 1047], 0.09, { dur: 0.45, type: "triangle", gain: 0.12 });
    }

    function figure() {
      try {
        const shot = document.createElement("canvas");
        shot.width = 480;
        shot.height = 300;
        const s = shot.getContext("2d");
        if (!s || !crisp) return null;
        s.fillStyle = NIGHT;
        s.fillRect(0, 0, 480, 300);
        s.shadowColor = "rgba(244,241,230,0.5)";
        s.shadowBlur = 5;
        s.drawImage(crisp, 0, 0, 480, 300);
        return shot.toDataURL("image/jpeg", 0.85);
      } catch {
        return null;
      }
    }

    function update(dt: number) {
      clock += dt;
      // the eraser crosses the board once, turning the old sentence into dust
      if (sweeping) {
        eraser += (W + 120) * (dt / 1.7);
        for (let i = 0; i < count; i += 1) {
          if (state[i] === FROZEN && px[i] < eraser) {
            hx[i] = clamp(px[i] + gauss() * 46, 6, W - 6);
            hy[i] = clamp(py[i] + gauss() * 46, 6, H - 6);
            color[i] = targetColor[i];
            state[i] = FREE;
          }
        }
        if (Math.random() < dt * 10) latest.current.synth?.noise({ dur: 0.07, gain: 0.04, freq: 500 + Math.random() * 400 });
        if (eraser > W + 60) {
          sweeping = false;
          frozen = false;
        }
      }
      const reach2 = REACH * REACH;
      const pull = Math.min(1, dt * 3.2);
      const rush = done ? 2.4 : 1;
      const active = pointer.on && !done && !frozen && !isLocked;
      let landed = 0;
      for (let i = 0; i < count; i += 1) {
        const s = state[i];
        if (s === SET || s === FROZEN) continue;
        if (s === FREE) {
          px[i] += (hx[i] - px[i]) * pull + (Math.random() - 0.5) * 1.4;
          py[i] += (hy[i] - py[i]) * pull + (Math.random() - 0.5) * 1.4;
          if (auto && !frozen && Math.random() < dt * 1.6) state[i] = FLOW;
          else if (active) {
            const dx = px[i] - pointer.x;
            const dy = py[i] - pointer.y;
            if (dx * dx + dy * dy < reach2) state[i] = FLOW;
          }
        } else {
          const dx = tx[i] - px[i];
          const dy = ty[i] - py[i];
          const d = Math.sqrt(dx * dx + dy * dy);
          const step = (130 + d * 3.4) * rush * dt;
          if (d <= step + 1.2) {
            px[i] = tx[i];
            py[i] = ty[i];
            state[i] = SET;
            settled += 1;
            landed += 1;
          } else {
            const curl = Math.sin(clock * 5 + seed[i] * 40) * 0.35;
            px[i] += ((dx - dy * curl) / d) * step;
            py[i] += ((dy + dx * curl) / d) * step;
          }
        }
      }
      if (landed > 0) {
        tick -= dt;
        if (tick <= 0) {
          tick = 0.05;
          latest.current.synth?.noise({ dur: 0.03, gain: Math.min(0.06, 0.02 + landed * 0.004), freq: 3800 + Math.random() * 2400 });
        }
      }
      if (!done && count > 0 && settled / count >= GOAL) finish();
      if (done) {
        since += dt;
        if (!reported && since > 1.5) {
          reported = true;
          latest.current.onSolved(figure());
        }
      }
    }

    function render() {
      if (!ctx || !canvas) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = NIGHT;
      ctx.fillRect(0, 0, W, H);
      // static that belongs to no picture
      ctx.fillStyle = "rgba(200,210,225,0.16)";
      ctx.beginPath();
      for (let n = 0; n < 90; n += 1) ctx.rect(Math.random() * W, Math.random() * H, 1.5, 1.5);
      ctx.fill();
      if (!ready) return;

      const settledDone = done && since > 2.4;
      if (done && crisp) {
        ctx.globalAlpha = Math.min(1, since / 1.3);
        ctx.shadowColor = "rgba(244,241,230,0.5)";
        ctx.shadowBlur = 8 * scale;
        ctx.drawImage(crisp, 0, 0, W, H);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      if (!settledDone || count > settled) {
        for (let c = 0; c < CHALK.length; c += 1) {
          ctx.fillStyle = CHALK[c];
          ctx.beginPath();
          for (let i = 0; i < count; i += 1) {
            if (color[i] !== c || (state[i] !== SET && state[i] !== FROZEN)) continue;
            ctx.rect(px[i] - 1.3, py[i] - 1.3, 2.6, 2.6);
          }
          ctx.fill();
        }
        const skip = Math.floor(clock * 30) % 4;
        ctx.fillStyle = "rgba(214,222,235,0.62)";
        ctx.beginPath();
        for (let i = 0; i < count; i += 1) {
          if (state[i] !== FREE || i % 4 === skip) continue;
          ctx.rect(px[i] - 0.9, py[i] - 0.9, 1.8, 1.8);
        }
        ctx.fill();
        ctx.strokeStyle = "rgba(150,205,245,0.95)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i < count; i += 1) {
          if (state[i] !== FLOW) continue;
          const dx = tx[i] - px[i];
          const dy = ty[i] - py[i];
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const tail = Math.min(12, d);
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[i] - (dx / d) * tail, py[i] - (dy / d) * tail);
        }
        ctx.stroke();
      }
      if (sweeping) {
        ctx.fillStyle = "#b98a4f";
        ctx.fillRect(eraser - 16, 20, 32, H - 40);
        ctx.fillStyle = "#3a3f44";
        ctx.fillRect(eraser - 16, 20, 12, H - 40);
        ctx.fillStyle = "rgba(244,241,230,0.9)";
        ctx.font = "700 15px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText("Reviewer 2", clamp(eraser, 60, W - 60), 15);
      }
      if (pointer.on && !done && !frozen && !isLocked) {
        ctx.setLineDash([6, 7]);
        ctx.lineDashOffset = -clock * 24;
        ctx.strokeStyle = "rgba(150,205,245,0.75)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, REACH, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    let last = performance.now();
    let frame = 0;
    function loop(now: number) {
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (ready && visible) {
        update(dt);
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
    function onMove(event: PointerEvent) {
      pointer.on = true;
      locate(event);
    }
    function onDown(event: PointerEvent) {
      latest.current.synth?.unlock();
      onMove(event);
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
        if (visible && frozen && !sweeping && !isLocked) sweeping = true;
      },
      { threshold: 0.35 },
    );
    watcher.observe(canvas);

    api.current = {
      setLayers(next) {
        if (!ready) return;
        for (const layer of next) if (!have.includes(layer)) addLayer(layer);
      },
      reveal() {
        if (!ready) {
          wantReveal = true;
          return;
        }
        frozen = false;
        sweeping = false;
        auto = true;
        finish();
      },
      setLocked(next) {
        isLocked = next;
        if (!next && visible && frozen && !sweeping) sweeping = true;
      },
    };

    void loadChalkFont().then(() => {
      if (disposed) return;
      resize();
      frozen = Boolean(erase);
      addLayer(0, erase ? sampleLayer(erase, 0, BOARD, 0.8) : undefined);
      if (latest.current.solved) {
        // already solved in an earlier visit: show the finished picture
        for (let i = 0; i < count; i += 1) {
          px[i] = tx[i];
          py[i] = ty[i];
          color[i] = targetColor[i];
          state[i] = SET;
        }
        settled = count;
        frozen = false;
        since = 10;
      }
      ready = true;
      if (wantReveal) api.current?.reveal();
      render();
    });
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
    // the board is rebuilt only when it shows a different drawing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, erase, autoplay]);

  const layerKey = layers.join(",");
  useEffect(() => {
    // layers may arrive before the font is ready: try again shortly
    const apply = () => api.current?.setLayers(layerKey.split(",").map(Number));
    apply();
    const retry = window.setTimeout(apply, 400);
    return () => window.clearTimeout(retry);
  }, [layerKey]);

  useEffect(() => {
    if (revealSignal > 0) api.current?.reveal();
  }, [revealSignal]);

  useEffect(() => {
    api.current?.setLocked(locked);
  }, [locked]);

  return <canvas ref={canvasRef} role="img" aria-label={label} style={{ display: "block", width: "100%", aspectRatio: `${W} / ${H}`, touchAction: solved ? "auto" : "none", cursor: solved ? "default" : "crosshair" }} />;
}
