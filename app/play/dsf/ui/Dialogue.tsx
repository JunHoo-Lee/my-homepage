"use client";

/*
 * The message window: a fixed three-line paper box at the bottom of the
 * screen, a name plate and a portrait standing on its top edge.
 *
 * A page is laid out whole and typed by revealing it, so the lines never
 * reflow. The first tap or key completes the page, the next one advances.
 * Choices and the buttons of a hold page are a second paper window above.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { Synth } from "../../shared/synth";
import { QUESTION_PLATE, SPEAKER_NAMES, type Speaker } from "../script";
import kit from "./kit.module.css";
import type { Page, Talk } from "./shell";

/** Order of the cells in faces.png. */
const FACE: Partial<Record<Speaker, number>> = { Y: 0, M: 1, prompter: 2, bookkeeper: 3, copyist: 4, artist: 5 };
const BLIP: Partial<Record<Speaker, number>> = { Y: 392, M: 784, prompter: 520, bookkeeper: 330, copyist: 440, artist: 660, R: 220 };
const CHAR_MS = 1000 / 60;
const GUARD_MS = 140;

type Segment = { text: string; em: boolean; start: number };

function parse(text: string): Segment[] {
  const segments: Segment[] = [];
  let start = 0;
  text.split("*").forEach((part, index) => {
    if (part.length === 0) return;
    segments.push({ text: part, em: index % 2 === 1, start });
    start += part.length;
  });
  return segments;
}

/** When each character appears, in ms from the start of the page. */
function schedule(plain: string) {
  const times: number[] = [];
  let t = 0;
  for (let i = 0; i < plain.length; i += 1) {
    t += CHAR_MS;
    times.push(t);
    const ch = plain[i];
    const next = plain[i + 1] ?? " ";
    if (ch === ",") t += 100;
    else if ((ch === "." || ch === "?" || ch === "!") && next === " ") t += 220;
  }
  return times;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Typed({ segments, count }: { segments: Segment[]; count: number }) {
  return (
    <>
      {segments.map((segment, index) => {
        const seen = Math.max(0, Math.min(segment.text.length, count - segment.start));
        const cls = segment.em ? kit.em : undefined;
        return (
          <span key={index}>
            {seen > 0 ? <span className={cls}>{segment.text.slice(0, seen)}</span> : null}
            {seen < segment.text.length ? <span className={`${cls ?? ""} ${kit.hid}`}>{segment.text.slice(seen)}</span> : null}
          </span>
        );
      })}
    </>
  );
}

type Props = {
  talk: Talk;
  synth: Synth;
  onNext(): void;
  onPick(row: number): void;
  onSkip(): void;
  /** No Skip in the ending, which has its own. */
  canSkip: boolean;
};

function PageView({ page, instant, synth, onNext, onPick, onSkip, canSkip }: Omit<Props, "talk"> & { page: Page; instant: boolean }) {
  const segments = parse(page.text);
  const plain = segments.map((segment) => segment.text).join("");
  const total = plain.length;
  const [count, setCount] = useState(instant ? total : 0);
  const [selected, setSelected] = useState(0);
  const complete = count >= total;
  const rows = page.kind === "rows" ? page.rows : null;
  const carved = page.who === "C";
  const sub = page.kind === "say" ? page.sub : undefined;

  const live = useRef({ complete, doneAt: 0, selected, rows: rows?.length ?? 0 });
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    live.current.complete = complete;
    live.current.selected = selected;
    live.current.rows = rows?.length ?? 0;
  });

  // the typewriter
  useEffect(() => {
    if (instant) return;
    const times = schedule(plain);
    const blip = BLIP[page.who];
    let frame = 0;
    let shown = 0;
    const started = performance.now();
    const finish = () => {
      live.current.doneAt = performance.now();
      setCount(total);
    };
    function tick(now: number) {
      if (live.current.complete) return;
      if (reducedMotion()) {
        finish();
        return;
      }
      const elapsed = now - started;
      let next = shown;
      while (next < total && times[next] <= elapsed) next += 1;
      if (next !== shown) {
        if (blip && Math.floor(next / 3) !== Math.floor(shown / 3)) synth.tone({ freq: blip, dur: 0.025, type: "triangle", gain: 0.035 });
        shown = next;
        if (shown >= total) {
          finish();
          return;
        }
        setCount(shown);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [instant, plain, total, page.who, synth]);

  /** A tap or a key: finish typing first, then move on. */
  const press = useCallback(() => {
    const now = performance.now();
    if (!live.current.complete) {
      live.current.doneAt = now;
      live.current.complete = true;
      setCount(total);
      return;
    }
    if (now - live.current.doneAt < GUARD_MS) return;
    if (live.current.rows > 0) onPick(live.current.selected);
    else onNext();
  }, [onNext, onPick, total]);

  /** A tap on the window or beside it never chooses a row: rows are tapped themselves. */
  const tap = useCallback(() => {
    if (live.current.complete && live.current.rows > 0) return;
    press();
  }, [press]);

  const pick = useCallback(
    (row: number) => {
      if (!live.current.complete || performance.now() - live.current.doneAt < GUARD_MS) return;
      onPick(row);
    },
    [onPick],
  );

  // keys, by physical key so an active IME does not matter
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const onButton = event.target instanceof HTMLElement && ["BUTTON", "A", "INPUT"].includes(event.target.tagName);
      const count = live.current.rows;
      if (event.code === "Space" || event.code === "Enter") {
        // a focused button is pressed by the browser itself
        if (onButton) return;
        event.preventDefault();
        press();
      } else if (event.code === "KeyE" || event.code === "KeyZ") {
        event.preventDefault();
        press();
      } else if (count > 0 && live.current.complete) {
        if (event.code === "ArrowDown" || event.code === "KeyS") {
          event.preventDefault();
          setSelected((value) => (value + 1) % count);
        } else if (event.code === "ArrowUp" || event.code === "KeyW") {
          event.preventDefault();
          setSelected((value) => (value + count - 1) % count);
        } else if (/^(Digit|Numpad)[1-9]$/.test(event.code)) {
          const row = Number(event.code.slice(-1)) - 1;
          if (row < count) pick(row);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, pick]);

  // focus follows what the next key would press
  const showRows = rows !== null && complete;
  useEffect(() => {
    if (showRows) rowRefs.current[selected]?.focus({ preventScroll: true });
    else nextRef.current?.focus({ preventScroll: true });
  }, [showRows, selected]);

  // pages that turn themselves (the ending)
  const auto = page.kind === "say" ? page.auto : undefined;
  useEffect(() => {
    if (!auto || !complete) return;
    const id = window.setTimeout(onNext, auto);
    return () => window.clearTimeout(id);
  }, [auto, complete, onNext]);

  const face = showRows ? undefined : FACE[page.who];
  const gold = page.kind === "rows" && page.plate === "question";
  const name = gold ? QUESTION_PLATE : SPEAKER_NAMES[page.who];

  return (
    <>
      <div className={kit.catch} onClick={tap} aria-hidden="true" />
      <div className={kit.talk}>
      {showRows && rows ? (
        <div className={`${kit.paper} ${kit.rows}`} role="group" aria-label={page.text}>
          {rows.map((row, index) => (
            <button
              key={row}
              ref={(node) => {
                rowRefs.current[index] = node;
              }}
              type="button"
              className={`${kit.rowBtn} ${index === selected ? kit.rowOn : ""}`}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setSelected(index);
              }}
              onClick={() => pick(index)}
            >
              {index === selected ? <i aria-hidden="true" /> : null}
              {row}
            </button>
          ))}
        </div>
      ) : null}
      <div className={kit.plateRow}>
        {face !== undefined ? <div className={kit.face} style={{ backgroundPosition: `calc(${-38 * face} * var(--px)) 0` }} aria-hidden="true" /> : null}
        {name ? <div className={`${kit.plate} ${gold ? kit.plateGold : ""}`}>{name}</div> : null}
        {canSkip && page.kind === "say" ? (
          <button type="button" className={kit.skip} onClick={onSkip}>
            <span>Skip</span>
          </button>
        ) : null}
      </div>
      <div className={`${kit.paper} ${kit.box}`} data-msg="" onClick={tap}>
        <p className={`${kit.text} ${carved ? kit.carved : ""} ${carved && sub ? kit.carvedSub : ""}`} aria-hidden="true">
          <Typed segments={segments} count={count} />
          {sub ? <span className={`${kit.sub} ${complete ? "" : kit.hid}`}>{sub}</span> : null}
        </p>
        {rows === null ? (
          <button ref={nextRef} type="button" className={kit.next} aria-label="Next">
            <span className={`${kit.tri} ${complete ? kit.triOn : ""}`} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <p className={kit.srOnly} aria-live="polite">
        {name && !gold ? `${name}: ` : ""}
        {plain}
        {sub ? ` ${sub}` : ""}
      </p>
      </div>
    </>
  );
}

export default function Dialogue({ talk, ...rest }: Props) {
  if (!talk.page) return null;
  return <PageView key={talk.serial} page={talk.page} instant={talk.instant} {...rest} />;
}
