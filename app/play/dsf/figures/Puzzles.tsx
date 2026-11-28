"use client";

/*
 * Two puzzles that are pure deduction.
 *
 * TwoLooks: twelve boards the classifier has already labelled. Five are real
 * pictures, seven are static. The confident ones are the trap: what gives a
 * real picture away is that the classifier agrees with itself on a second
 * look. That is the augmentation-invariance test DSF is built on.
 *
 * Door: the last puzzle. Build, from four tiles, what Feynman's sentence
 * implies for someone who does understand: its contrapositive.
 */

import { useEffect, useRef, useState } from "react";

import type { Synth } from "../../shared/synth";
import { BOARDS, DOOR, LOOKS_HINTS } from "../content";
import styles from "../dsf.module.css";

export function TwoLooks({ synth, onSolved }: { synth: Synth | null; onSolved(): void }) {
  const [looked, setLooked] = useState<number[]>([]);
  const [marked, setMarked] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [fails, setFails] = useState(0);
  const need = BOARDS.filter((board) => board.real).length;
  // the answer to a wrong guess appears under the boards: bring it into view
  const replyRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (message) replyRef.current?.scrollIntoView({ block: "nearest" });
  }, [message, fails]);

  function tap(index: number) {
    synth?.unlock();
    if (!looked.includes(index)) {
      synth?.tone({ freq: 520, dur: 0.05, gain: 0.07 });
      setLooked((current) => [...current, index]);
      return;
    }
    synth?.tone({ freq: marked.includes(index) ? 380 : 700, dur: 0.05, gain: 0.07 });
    setMarked((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]));
    setMessage("");
  }

  function check() {
    const wrong = marked.filter((index) => !BOARDS[index].real).length;
    const missed = BOARDS.filter((board, index) => board.real && !marked.includes(index)).length;
    if (wrong === 0 && missed === 0) {
      synth?.arp([523, 659, 784, 1047], 0.09, { dur: 0.4, type: "triangle", gain: 0.11 });
      onSolved();
      return;
    }
    synth?.tone({ freq: 160, to: 90, dur: 0.2, type: "sawtooth", gain: 0.08 });
    setFails((count) => count + 1);
    setMessage(LOOKS_HINTS.wrong(wrong, missed));
  }

  return (
    <div className={styles.looks}>
      <div className={styles.boards}>
        {BOARDS.map((board, index) => {
          const twice = looked.includes(index);
          const on = marked.includes(index);
          return (
            <button key={board.first + index} type="button" className={`${styles.boardTile} ${on ? styles.boardOn : ""}`} aria-pressed={on} onClick={() => tap(index)}>
              <span className={styles.boardStatic} aria-hidden="true" />
              <b>{board.first}</b>
              {twice ? (
                <em>
                  <span className={styles.againTag}>again: </span>
                  <span className={styles.againWhat}>{board.second}</span>
                </em>
              ) : (
                <i>look again</i>
              )}
            </button>
          );
        })}
      </div>
      <div className={styles.puzzleFoot}>
        <span>
          Marked {marked.length} of {need}
        </span>
        <button type="button" className={styles.primary} disabled={marked.length !== need} onClick={check}>
          {LOOKS_HINTS.check}
        </button>
      </div>
      {message ? (
        <p ref={replyRef} className={styles.reply} role="status">
          {message}
          {fails >= 2 ? ` ${LOOKS_HINTS.nudge}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function DoorPuzzle({ synth, onSolved }: { synth: Synth | null; onSolved(): void }) {
  const [slots, setSlots] = useState<(string | null)[]>([null, null]);
  const [reply, setReply] = useState("");
  const text = (id: string | null) => DOOR.tiles.find((tile) => tile.id === id)?.text ?? "…";

  function place(id: string) {
    synth?.unlock();
    if (slots.includes(id)) return;
    const index = slots[0] === null ? 0 : slots[1] === null ? 1 : -1;
    if (index < 0) return;
    const next = slots.slice();
    next[index] = id;
    setSlots(next);
    synth?.tone({ freq: 560 + index * 120, dur: 0.06, gain: 0.08 });
    if (next[0] === null || next[1] === null) return;
    if (next[0] === DOOR.answer[0] && next[1] === DOOR.answer[1]) {
      synth?.arp([392, 523, 659, 784, 1047], 0.1, { dur: 0.5, type: "triangle", gain: 0.12 });
      setReply("");
      onSolved();
    } else {
      synth?.tone({ freq: 150, to: 90, dur: 0.22, type: "sawtooth", gain: 0.08 });
      setReply(DOOR.replies[`${next[0]}>${next[1]}`] ?? DOOR.replies.other);
    }
  }

  return (
    <div className={styles.door}>
      <p className={styles.carved}>
        IF <b>{DOOR.carved[0]}</b> THEN <b>{DOOR.carved[1]}</b>
      </p>
      <p className={styles.sentence}>
        IF
        <button type="button" className={styles.slot} onClick={() => { setSlots([null, slots[1]]); setReply(""); }}>
          {text(slots[0])}
        </button>
        THEN
        <button type="button" className={styles.slot} onClick={() => { setSlots([slots[0], null]); setReply(""); }}>
          {text(slots[1])}
        </button>
      </p>
      <div className={styles.tiles}>
        {DOOR.tiles.map((tile) => (
          <button key={tile.id} type="button" disabled={slots.includes(tile.id)} onClick={() => place(tile.id)}>
            {tile.text}
          </button>
        ))}
      </div>
      {reply ? (
        <p className={styles.reply} role="status">
          {reply}
        </p>
      ) : null}
    </div>
  );
}
