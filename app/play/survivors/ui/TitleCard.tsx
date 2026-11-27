"use client";

import Link from "next/link";

import { formatTime } from "../game";
import { SoundIcon } from "../icons";
import { DECISIONS, HUD_TERMS, SCREENS } from "../lore";
import kit from "./kit.module.css";
import type { Best } from "./records";
import { useUiSound } from "./sound";
import styles from "./title.module.css";

type Props = {
  /** Null until mounted (the id is random, so it is not part of the server render). */
  submission: number | null;
  best: Best | null;
  touch: boolean;
  muted: boolean;
  /** False with prefers-reduced-motion. */
  motion: boolean;
  onToggleMute: () => void;
  onStart: () => void;
};

/** The review copy's line numbers ("Typo, L42"), down the left margin. */
const LINE_NUMBERS = Array.from({ length: 60 }, (_, i) => String(i + 1).padStart(3, "0")).join("\n");

/** A training loss curve under the title; a ball rolls down it into the minimum. */
const LOSS_CURVE = "M3 5C18 5 24 21 38 19S52 9 62 14 78 28 94 25 110 15 122 22 150 33 176 31 220 34 297 34";
const LOSS_END = { x: 297, y: 34 };

export default function TitleCard({ submission, best, touch, muted, motion, onToggleMute, onStart }: Props) {
  const ui = useUiSound();
  const [lead, ...rest] = SCREENS.title.split(" ");

  return (
    <div className={`${kit.overlay} ${styles.backdrop}`}>
      <section className={`${kit.paper} ${styles.card}`} role="dialog" aria-modal="true" aria-labelledby="gs-title" aria-describedby="gs-abstract">
        <pre className={styles.lines} aria-hidden="true">
          {LINE_NUMBERS}
        </pre>
        <div className={styles.running}>
          <span>Under double-blind review · Do not distribute</span>
          <button
            type="button"
            className={kit.iconButton}
            aria-label={muted ? "Unmute" : "Mute"}
            title={touch ? undefined : `${muted ? "Unmute" : "Mute"} (M)`}
            onClick={onToggleMute}
            {...ui.hover}
          >
            <SoundIcon muted={muted} />
          </button>
        </div>

        <p className={kit.eyebrow}>{submission ? SCREENS.titleKicker(submission) : "\u00a0"}</p>
        <h1 id="gs-title" className={styles.title}>
          <span className={styles.lead}>{lead}</span> {rest.join(" ")}
        </h1>
        <svg className={styles.curve} viewBox="0 0 300 40" aria-hidden="true">
          <path className={styles.curvePath} d={LOSS_CURVE} pathLength={1} />
          {motion ? (
            <circle className={styles.ball} r="5">
              <animateMotion dur="1.9s" fill="freeze" path={LOSS_CURVE} calcMode="spline" keyPoints="0;0;1" keyTimes="0;0.25;1" keySplines="0 0 1 1;0.5 0 0.3 1" />
            </circle>
          ) : (
            <circle className={styles.ball} r="5" cx={LOSS_END.x} cy={LOSS_END.y} />
          )}
        </svg>
        <p className={styles.byline}>Anonymous Author(s)</p>

        <h2 className={styles.abstractTitle}>Abstract</h2>
        <p id="gs-abstract" className={styles.abstract}>
          {SCREENS.pitch}
        </p>

        <table className={styles.controls}>
          <caption>Table 1: Controls.</caption>
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Input</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Move</th>
              <td>
                {touch ? (
                  "drag anywhere"
                ) : (
                  <>
                    <span className={kit.key}>WASD</span> or <span className={kit.key}>arrow keys</span>
                  </>
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Attack</th>
              <td>automatic</td>
            </tr>
            <tr>
              <th scope="row">Pick a card</th>
              <td>
                {touch ? (
                  "tap it"
                ) : (
                  <>
                    <span className={kit.key}>1</span> – <span className={kit.key}>4</span> or click
                  </>
                )}
              </td>
            </tr>
            {touch ? null : (
              <tr>
                <th scope="row">Pause / mute</th>
                <td>
                  <span className={kit.key}>Esc</span> / <span className={kit.key}>M</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {best ? (
          <p className={styles.best}>
            <span>Best decision so far</span>
            <strong>{DECISIONS[best.grade].title}</strong>
            <span>
              {formatTime(best.time)} · {best.kills.toLocaleString("en-US")} {HUD_TERMS.kills}
            </span>
          </p>
        ) : null}

        <div className={`${kit.actions} ${styles.actions}`}>
          <button
            type="button"
            className={`${kit.button} ${kit.primary} ${styles.start}`}
            onClick={() => {
              ui.play("click");
              onStart();
            }}
            aria-keyshortcuts="Enter"
            autoFocus
            {...ui.hover}
          >
            Start review
            {touch ? null : (
              <span className={kit.key} aria-hidden="true">
                Enter
              </span>
            )}
          </button>
          <Link className={kit.button} href="/play" onClick={() => ui.play("click")} {...ui.hover}>
            Other games
          </Link>
        </div>
      </section>
    </div>
  );
}
