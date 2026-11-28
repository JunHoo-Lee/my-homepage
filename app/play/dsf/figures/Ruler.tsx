"use client";

/*
 * Figure 4: find a hidden point on a dark board with nothing but a ruler.
 *
 * The pixel ruler reads "far" almost everywhere and only moves once you have
 * arrived, which is what distance in pixel space is like. The function ruler
 * slopes all the way home. In the paper that second ruler is an alignment
 * under the Loss Tangent Kernel; here it is simply a smooth distance.
 */

import { useEffect, useRef, useState } from "react";

import type { Synth } from "../../shared/synth";
import styles from "../dsf.module.css";

type Kind = "pixel" | "function";
type Point = { u: number; v: number };

type Props = { solved: boolean; synth: Synth | null; onSolved(): void };

const CLOSE = 0.055;

export default function Ruler({ solved, synth, onSolved }: Props) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [home, setHome] = useState<Point | null>(null);
  const [kind, setKind] = useState<Kind>("pixel");
  const [at, setAt] = useState<Point | null>(null);
  const [tries, setTries] = useState(0);

  // if the figure is revealed without playing, home still has to be somewhere
  useEffect(() => {
    if (!solved || home) return;
    const id = window.setTimeout(() => setHome(randomHome()), 0);
    return () => window.clearTimeout(id);
  }, [solved, home]);

  const distance = at && home ? far(at, home) : 1;
  // static is about equally far from everything: the pixel ruler is flat until you are there
  const reading = !at ? null : kind === "function" || distance < CLOSE ? distance : 0.95 + 0.04 * (Math.sin(at.u * 91.7 + at.v * 47.3) * 0.5 + 0.5);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (solved) return;
    const pad = padRef.current;
    if (!pad) return;
    if (event.type === "pointermove" && event.pointerType !== "mouse" && event.buttons === 0) return;
    const rect = pad.getBoundingClientRect();
    const u = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const v = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    // home is chosen in the browser, the first time it is needed
    const target = home ?? randomHome();
    if (!home) setHome(target);
    setAt({ u, v });
    if (far({ u, v }, target) < CLOSE) {
      synth?.arp([523, 659, 784], 0.09, { dur: 0.4, type: "triangle", gain: 0.11 });
      onSolved();
    }
  }

  return (
    <div className={styles.ruler}>
      <div className={styles.toggle} role="tablist" aria-label="Which ruler">
        {(["pixel", "function"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={kind === option}
            className={kind === option ? styles.toggleOn : undefined}
            onClick={() => {
              synth?.unlock();
              setKind(option);
              setTries((count) => count + 1);
            }}
          >
            {option === "pixel" ? "Pixel ruler" : "Function ruler"}
          </button>
        ))}
      </div>
      <div
        ref={padRef}
        className={styles.pad}
        onPointerDown={(event) => {
          synth?.unlock();
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event);
        }}
        onPointerMove={move}
        role="img"
        aria-label="A dark board. Somewhere on it is home."
      >
        {at && !solved ? <i className={styles.padDot} style={{ left: `${at.u * 100}%`, top: `${at.v * 100}%` }} /> : null}
        {solved && home ? (
          <b className={styles.padHome} style={{ left: `${home.u * 100}%`, top: `${home.v * 100}%` }}>
            ★ θ
          </b>
        ) : null}
        {!at && !solved ? <span className={styles.padHint}>drag here</span> : null}
      </div>
      <div className={styles.gauge} aria-live="polite">
        <span>{kind === "pixel" ? "pixel distance to the nearest photograph" : "distance in function space to the model"}</span>
        <b>{solved ? "0.00 · home" : reading === null ? "—" : reading.toFixed(2)}</b>
        <div className={styles.gaugeTrack}>
          <div style={{ width: `${solved ? 0 : Math.round((reading ?? 1) * 100)}%` }} />
        </div>
        {!solved && kind === "pixel" && at && tries === 0 ? <small>Flat. Try the other ruler.</small> : null}
      </div>
    </div>
  );
}

function randomHome(): Point {
  return { u: 0.16 + Math.random() * 0.68, v: 0.18 + Math.random() * 0.64 };
}

/** Distance between two points of the pad, 0..1 (the pad is wider than it is tall). */
function far(a: Point, b: Point) {
  return Math.hypot(a.u - b.u, (a.v - b.v) * 0.7) / 0.9;
}
