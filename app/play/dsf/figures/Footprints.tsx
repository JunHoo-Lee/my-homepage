"use client";

/*
 * Figure 5: line up two arrows.
 *
 * The yellow arrow is -theta, the way the weights went during training. The
 * blue arrow is the way this image's loss would push them. The reader changes
 * the image (a slider) until the push agrees with the footprints; each time
 * it does, the board on the right looks more like a picture. This is the
 * DSF update done by hand, one image at a time.
 */

import { useEffect, useRef, useState } from "react";

import type { Synth } from "../../shared/synth";
import { renderDrawing } from "../drawings";
import styles from "../dsf.module.css";

type Props = { solved: boolean; synth: Synth | null; onSolved(): void };

const ROUNDS = [
  { target: 72, theta: -38 },
  { target: 27, theta: 24 },
  { target: 58, theta: -12 },
  { target: 12, theta: 46 },
] as const;

function Arrow({ angle, length, className }: { angle: number; length: number; className: string }) {
  const rad = (angle * Math.PI) / 180;
  const x = 110 + Math.cos(rad) * length;
  const y = 110 + Math.sin(rad) * length;
  const left = rad + Math.PI * 0.85;
  const right = rad - Math.PI * 0.85;
  return (
    <path
      className={className}
      d={`M110 110 L${x} ${y} M${x} ${y} L${x + Math.cos(left) * 13} ${y + Math.sin(left) * 13} M${x} ${y} L${x + Math.cos(right) * 13} ${y + Math.sin(right) * 13}`}
    />
  );
}

export default function Footprints({ solved, synth, onSolved }: Props) {
  const boardRef = useRef<HTMLCanvasElement | null>(null);
  const [round, setRound] = useState(0);
  const [value, setValue] = useState(50);
  const step = solved ? ROUNDS.length : round;
  const current = ROUNDS[Math.min(round, ROUNDS.length - 1)];
  const off = solved ? 0 : (value - current.target) * 3.1;
  const cosine = Math.cos((off * Math.PI) / 180);

  // the board: static at first, one notch clearer for every aligned step
  useEffect(() => {
    const canvas = boardRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = 320;
    canvas.height = 200;
    ctx.fillStyle = "#141b1b";
    ctx.fillRect(0, 0, 320, 200);
    const clarity = step / ROUNDS.length;
    if (clarity > 0) {
      ctx.globalAlpha = clarity ** 1.4;
      ctx.drawImage(renderDrawing("cat", [0], { w: 320, h: 200 }, 1), 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "rgba(214,222,235,0.6)";
    const specks = Math.round(1500 * (1 - clarity) ** 1.5);
    for (let n = 0; n < specks; n += 1) ctx.fillRect(Math.random() * 320, Math.random() * 200, 1.6, 1.6);
  }, [step]);

  function change(next: number) {
    if (solved) return;
    setValue(next);
    if (Math.abs(next - current.target) > 2) return;
    synth?.tone({ freq: 520 + round * 110, dur: 0.12, type: "triangle", gain: 0.1 });
    if (round + 1 >= ROUNDS.length) {
      setRound(ROUNDS.length);
      synth?.arp([523, 659, 784, 1047], 0.09, { dur: 0.4, type: "triangle", gain: 0.11 });
      onSolved();
    } else setRound(round + 1);
  }

  return (
    <div className={styles.footprints}>
      <svg viewBox="0 0 220 220" className={styles.dial} role="img" aria-label="Two arrows: the way the weights went, and the way this image would push them">
        <circle cx="110" cy="110" r="96" className={styles.dialRing} />
        {[0.34, 0.52, 0.7, 0.88].map((k, index) => {
          const rad = (current.theta * Math.PI) / 180;
          const side = index % 2 === 0 ? 9 : -9;
          return <ellipse key={k} cx={110 + Math.cos(rad) * 96 * k - Math.sin(rad) * side} cy={110 + Math.sin(rad) * 96 * k + Math.cos(rad) * side} rx="7" ry="4" transform={`rotate(${current.theta} ${110 + Math.cos(rad) * 96 * k - Math.sin(rad) * side} ${110 + Math.sin(rad) * 96 * k + Math.cos(rad) * side})`} className={styles.dialPrint} />;
        })}
        <Arrow angle={current.theta} length={90} className={styles.dialTheta} />
        <Arrow angle={current.theta + off} length={72} className={styles.dialPush} />
      </svg>
      <div className={styles.footSide}>
        <div className={styles.frame}>
          <canvas ref={boardRef} className={styles.footBoard} aria-hidden="true" />
        </div>
      </div>
      <div className={styles.footControls}>
        <p className={styles.footLegend}>
          <span className={styles.legendTheta}>−θ: the way the weights went</span>
          <span className={styles.legendPush}>the push of this image</span>
        </p>
        <p className={styles.footRead}>
          alignment <b>{cosine.toFixed(2)}</b> · step <b>{step}</b> of {ROUNDS.length}
        </p>
        <label className={styles.slider}>
          <span>change the image</span>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            disabled={solved}
            onPointerDown={() => synth?.unlock()}
            onChange={(event) => change(Number(event.target.value))}
          />
        </label>
      </div>
    </div>
  );
}
