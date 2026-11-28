"use client";

/*
 * The puzzle panel: a slate window over the dimmed island. It holds the
 * puzzle of one ruin and, once that is solved, the insight in one line and
 * the way on. The story of the insight is told afterwards, over the world.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { Synth } from "../../shared/synth";
import { CLOCK_GUESSES, PROMPT_CARDS, type Site } from "../content";
import styles from "../dsf.module.css";
import DustBoard from "../figures/DustBoard";
import Footprints from "../figures/Footprints";
import Garden from "../figures/Garden";
import ProbeBoard from "../figures/ProbeBoard";
import { DoorPuzzle, TwoLooks } from "../figures/Puzzles";
import Ruler from "../figures/Ruler";
import { QUESTION_PLATE } from "../script";
import kit from "./kit.module.css";

type Props = {
  site: Site;
  solved: boolean;
  /** The panel is fading out. */
  leaving: boolean;
  synth: Synth;
  onSolved(): void;
  onContinue(): void;
  onLeave(): void;
};

/** Timers that die with the panel: a puzzle that is left must not report solved later. */
function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => {
      for (const id of list) window.clearTimeout(id);
    };
  }, []);
  return useCallback((run: () => void, ms: number) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);
}

export default function Panel({ site, solved, leaving, synth, onSolved, onContinue, onLeave }: Props) {
  const later = useLater();
  const [reveal, setReveal] = useState(0);
  const [tapsLeft, setTapsLeft] = useState(8);
  const [guess, setGuess] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [cards, setCards] = useState<number[]>([]);
  // a door that was already answered opens on the rewritten sentence
  const [startedSolved] = useState(solved);
  const [opened, setOpened] = useState(solved);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // focus moves into the panel
  useEffect(() => {
    sheetRef.current?.focus({ preventScroll: true });
  }, []);

  let body: React.ReactNode = null;
  let canReveal = false;
  if (site.id === "shore") {
    canReveal = true;
    body = (
      <div className={styles.frame}>
        <DustBoard drawing="cat" solved={solved} revealSignal={reveal} synth={synth} label="A slab of static. Dragging across it makes a chalk cat appear." onSolved={onSolved} />
      </div>
    );
  } else if (site.id === "needle") {
    canReveal = true;
    body = (
      <>
        <div className={styles.frame}>
          <ProbeBoard mode="find" solved={false} revealSignal={reveal} synth={synth} label="A board of static with a hidden curve of pictures" onTap={(left) => setTapsLeft(left)} onSolved={() => later(onSolved, 1500)} />
        </div>
        <p className={styles.status}>
          Taps left: <b>{tapsLeft}</b>
        </p>
      </>
    );
  } else if (site.id === "looks") {
    body = <TwoLooks synth={synth} onSolved={onSolved} />;
  } else if (site.id === "garden") {
    body = <Garden synth={synth} onSolved={onSolved} />;
  } else if (site.id === "ruler") {
    body = <Ruler solved={solved} synth={synth} onSolved={onSolved} />;
  } else if (site.id === "footprints") {
    body = <Footprints solved={solved} synth={synth} onSolved={() => later(onSolved, 700)} />;
  } else if (site.id === "clock") {
    canReveal = guess !== null;
    body = (
      <>
        <div className={styles.choices}>
          {CLOCK_GUESSES.map((option) => (
            <button
              key={option}
              type="button"
              className={guess === option ? styles.choiceOn : undefined}
              aria-pressed={guess === option}
              onClick={() => {
                synth.unlock();
                setGuess(option);
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <div className={`${styles.frame} ${guess === null ? styles.lockedBoard : ""}`}>
          <DustBoard drawing="clock" solved={solved} locked={guess === null} revealSignal={reveal} synth={synth} label="A board of static that becomes a clock" onSolved={onSolved} />
          {guess === null ? <span className={styles.lockNote}>Guess first.</span> : null}
        </div>
      </>
    );
  } else if (site.id === "bench") {
    canReveal = !drawn;
    body = (
      <>
        <div className={styles.frame}>
          <DustBoard drawing="banana" layers={[0, ...cards]} solved={drawn} revealSignal={reveal} synth={synth} label="A board of static that becomes a banana" onSolved={() => setDrawn(true)} />
        </div>
        <div className={styles.choices}>
          {PROMPT_CARDS.map((card) => (
            <button
              key={card.layer}
              type="button"
              disabled={!drawn || cards.includes(card.layer)}
              className={`${styles.card} ${cards.includes(card.layer) ? styles.choiceOn : ""}`}
              onClick={() => {
                synth.unlock();
                synth.arp([660, 880, 1320], 0.08, { dur: 0.25, type: "triangle", gain: 0.1 });
                const next = [...cards, card.layer];
                setCards(next);
                if (next.length >= PROMPT_CARDS.length) later(onSolved, 2600);
              }}
            >
              {card.text}
            </button>
          ))}
        </div>
      </>
    );
  } else {
    body = opened ? (
      <div className={styles.frame}>
        <DustBoard drawing="understand" erase={startedSolved ? undefined : "feynman"} solved={solved} autoplay synth={synth} label="The sentence on the door is wiped and written again" onSolved={onSolved} />
      </div>
    ) : (
      <DoorPuzzle synth={synth} onSolved={() => setOpened(true)} />
    );
  }

  return (
    <div className={`${kit.veil} ${leaving ? kit.veilOut : ""}`} inert={leaving}>
      <div ref={sheetRef} className={`${kit.slateWin} ${styles.sheet}`} role="dialog" aria-modal="true" aria-label={site.name} tabIndex={-1}>
        <h2 className={styles.heading}>{site.name}</h2>
        <p className={styles.instruction}>{site.instruction}</p>
        <div className={styles.puzzle}>{body}</div>
        {solved ? (
          <div className={styles.solvedFoot}>
            <p className={styles.aha}>{site.aha}</p>
            {site.id === "door" ? (
              <>
                <p className={styles.verdictLine}>
                  <span>{QUESTION_PLATE}</span> {site.verdict}
                </p>
                <div className={kit.row}>
                  <button type="button" className={kit.btn} onClick={onContinue} autoFocus>
                    Go through
                  </button>
                </div>
              </>
            ) : (
              <div className={kit.row}>
                <button type="button" className={kit.btn} onClick={onContinue} autoFocus>
                  Continue
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`${kit.row} ${styles.foot}`}>
            <button type="button" className={kit.ghost} onClick={onLeave}>
              Leave it for now
            </button>
            {canReveal ? (
              <button type="button" className={`${kit.link} ${styles.reveal}`} onClick={() => setReveal((value) => value + 1)}>
                Reveal without playing
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
