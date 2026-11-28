"use client";

/*
 * The Selection Garden: generation by nothing but choosing.
 *
 * Six boards grow from one parent, each a slightly different handful of
 * dust: some a little closer to a picture, most a little further. The player
 * cannot draw. They can only say which board looks most like a picture, and
 * that board becomes the next parent. A picture comes out of the static
 * anyway. It is a genetic algorithm with a human discriminator as the
 * fitness function, and it is what a score function does in one step.
 */

import { useEffect, useMemo, useRef, useState } from "react";

import type { Synth } from "../../shared/synth";
import { CHALK, sampleLayer, type Target } from "../drawings";
import styles from "../dsf.module.css";

const W = 320;
const H = 200;
const DONE = 0.1;

type Child = { sigma: number; seed: number };

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Six children of a parent: two a little closer to the manifold, four a little further. */
function breed(sigma: number, generation: number): Child[] {
  const spread = 0.55 + sigma * 0.6;
  const steps = [-0.16, -0.08, 0.06, 0.11, 0.16, 0.22].map((step) => Math.min(1.2, Math.max(0.03, sigma + step * spread)));
  const random = mulberry(generation * 7919 + Math.round(sigma * 1000));
  for (let i = steps.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [steps[i], steps[j]] = [steps[j], steps[i]];
  }
  return steps.map((value, index) => ({ sigma: value, seed: generation * 100 + index + 1 }));
}

function Board({ targets, child }: { targets: Target[]; child: Child }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.fillStyle = "#0f141b";
    ctx.fillRect(0, 0, W, H);
    const random = mulberry(child.seed);
    const reach = child.sigma * 62;
    for (const target of targets) {
      // a grain sits where it belongs, plus as much noise as this board still has
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(-2 * Math.log(1 - random() * 0.999)) * reach * 0.6;
      ctx.fillStyle = CHALK[child.sigma < 0.5 ? target.color : 0];
      ctx.globalAlpha = 0.55 + (1 - Math.min(1, child.sigma)) * 0.45;
      ctx.fillRect(target.x + Math.cos(angle) * radius - 1, target.y + Math.sin(angle) * radius - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }, [targets, child]);
  return <canvas ref={ref} aria-hidden="true" />;
}

export default function Garden({ synth, onSolved }: { synth: Synth | null; onSolved(): void }) {
  const targets = useMemo(() => (typeof document === "undefined" ? [] : sampleLayer("landscape", 0, { w: W, h: H }, 0.24)), []);
  const [sigma, setSigma] = useState(1);
  const [generation, setGeneration] = useState(1);
  const [last, setLast] = useState<"closer" | "further" | "">("");
  const children = useMemo(() => breed(sigma, generation), [sigma, generation]);
  const finished = sigma <= DONE;

  function choose(child: Child) {
    if (finished) return;
    synth?.unlock();
    const closer = child.sigma < sigma;
    synth?.tone({ freq: closer ? 620 + (1 - child.sigma) * 300 : 260, dur: 0.09, type: "triangle", gain: 0.1 });
    setLast(closer ? "closer" : "further");
    setSigma(child.sigma);
    setGeneration((value) => value + 1);
    if (child.sigma <= DONE) {
      synth?.arp([523, 659, 784, 1047], 0.09, { dur: 0.4, type: "triangle", gain: 0.11 });
      window.setTimeout(onSolved, 1700);
    }
  }

  return (
    <div className={styles.garden}>
      {finished ? (
        <div className={styles.gardenFinal}>
          <Board targets={targets} child={{ sigma: 0, seed: 1 }} />
        </div>
      ) : (
        <div className={styles.gardenGrid}>
          {children.map((child) => (
            <button key={child.seed} type="button" data-noise={child.sigma.toFixed(3)} onClick={() => choose(child)} aria-label="Choose this board">
              <Board targets={targets} child={child} />
            </button>
          ))}
        </div>
      )}
      <p className={styles.status}>
        Generation <b>{generation}</b>
        {last ? (
          <>
            {" · "}
            <b className={last === "closer" ? styles.good : styles.bad}>{last === "closer" ? "closer to a picture" : "further into the static"}</b>
          </>
        ) : null}
        {finished ? " · you chose it into existence" : ""}
      </p>
    </div>
  );
}
