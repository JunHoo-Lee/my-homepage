"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { createAudio } from "./audio";
import { BOSS_TIME, RUN_LENGTH, createGame, formatTime, type Card, type GameHandle, type Grade, type Hud, type PaperLink, type RunResult } from "./game";
import styles from "./survivors.module.css";

const BEST_KEY = "gradient-survivors-best";

type Best = { time: number; kills: number; grade: Grade };

const GRADE_COPY: Record<Grade, { title: string; line: string }> = {
  DeskReject: { title: "Desk reject 📄", line: "The submission did not survive the formatting check." },
  Oral: { title: "Accepted · Oral 🏆", line: "You outlasted the review and defeated Reviewer 2." },
  Accept: { title: "Accepted ✅", line: "You survived the full review period." },
  Borderline: { title: "Borderline 🤔", line: "Reviewer 2 showed up and things got heated." },
  Reject: { title: "Rejected 📉", line: "The bugs overwhelmed the model. Resubmit?" },
};

const GRADE_RANK: Record<Grade, number> = { DeskReject: 0, Reject: 1, Borderline: 2, Accept: 3, Oral: 4 };

function readBest(): Best | null {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    return raw ? (JSON.parse(raw) as Best) : null;
  } catch {
    return null;
  }
}

function saveBest(result: RunResult): Best | null {
  const previous = readBest();
  const current: Best = { time: result.time, kills: result.kills, grade: result.grade };
  const better =
    !previous ||
    GRADE_RANK[current.grade] > GRADE_RANK[previous.grade] ||
    (GRADE_RANK[current.grade] === GRADE_RANK[previous.grade] && (current.time > previous.time || (current.time === previous.time && current.kills > previous.kills)));
  if (!better) return previous;
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify(current));
  } catch {
    // storage unavailable: best score lasts for this page view only
  }
  return current;
}

type Phase = "title" | "playing" | "levelup" | "paused" | "end";

export default function SurvivorsClient({ paperLinks }: { paperLinks: Record<string, PaperLink> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const keysRef = useRef(new Set<string>());
  const knobRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const [phase, setPhase] = useState<Phase>("title");
  const [hud, setHud] = useState<Hud | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [best, setBest] = useState<Best | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);
  const [shared, setShared] = useState(false);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Browser-only state, read after hydration so server and client markup match.
    const id = requestAnimationFrame(() => {
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      setBest(readBest());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ------------------------------------------------------------ game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const audio = createAudio();
    const game = createGame(canvas, paperLinks, {
      onHud: setHud,
      onLevelUp: (next) => {
        setCards(next);
        setPhase("levelup");
      },
      onEnd: (next) => {
        setResult(next);
        setBest(saveBest(next));
        setShared(false);
        setPhase("end");
      },
      onToast: setToast,
      onAutoPause: () => setPhase((current) => (current === "playing" ? "paused" : current)),
      onBossWarning: () => {},
    }, {
      audio,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    game.setPaused(true);
    gameRef.current = game;
    return () => {
      game.dispose();
      audio.dispose();
      gameRef.current = null;
    };
  }, [paperLinks]);

  const start = useCallback(() => {
    gameRef.current?.restart();
    gameRef.current?.setPaused(false);
    setResult(null);
    setCards([]);
    setPhase("playing");
    canvasRef.current?.focus();
  }, []);

  const pick = useCallback((card: Card) => {
    gameRef.current?.choose(card.id);
    setCards([]);
    setPhase("playing");
  }, []);

  const togglePause = useCallback(() => {
    setPhase((current) => {
      if (current === "playing") {
        gameRef.current?.setPaused(true);
        return "paused";
      }
      if (current === "paused") {
        gameRef.current?.setPaused(false);
        return "playing";
      }
      return current;
    });
  }, []);

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const dirs: Record<string, [number, number]> = {
      KeyW: [0, -1],
      ArrowUp: [0, -1],
      KeyS: [0, 1],
      ArrowDown: [0, 1],
      KeyA: [-1, 0],
      ArrowLeft: [-1, 0],
      KeyD: [1, 0],
      ArrowRight: [1, 0],
    };
    const sync = () => {
      let x = 0;
      let y = 0;
      for (const code of keysRef.current) {
        const dir = dirs[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      gameRef.current?.setMove(x, y);
    };
    const onDown = (event: KeyboardEvent) => {
      if (dirs[event.code]) {
        event.preventDefault();
        keysRef.current.add(event.code);
        sync();
        return;
      }
      if (phase === "levelup") {
        const index = Number(event.key) - 1;
        if (index >= 0 && index < cards.length) pick(cards[index]);
        return;
      }
      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault();
        togglePause();
        return;
      }
      if ((phase === "title" || phase === "end") && (event.code === "Enter" || event.code === "Space" || event.code === "KeyR")) {
        event.preventDefault();
        start();
      }
    };
    const onUp = (event: KeyboardEvent) => {
      if (keysRef.current.delete(event.code)) sync();
    };
    const onBlur = () => {
      keysRef.current.clear();
      sync();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [cards, phase, pick, start, togglePause]);

  // ------------------------------------------------------------ touch joystick
  const STICK = 48;
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" || phase !== "playing") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    stickRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setStick({ x: event.clientX, y: event.clientY });
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const origin = stickRef.current;
    if (!origin || origin.id !== event.pointerId) return;
    let dx = event.clientX - origin.x;
    let dy = event.clientY - origin.y;
    const d = Math.hypot(dx, dy);
    if (d > STICK) {
      dx = (dx / d) * STICK;
      dy = (dy / d) * STICK;
    }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const dead = d < 6 ? 0 : 1;
    gameRef.current?.setMove((dx / STICK) * dead, (dy / STICK) * dead);
  };
  const onPointerUp = (event: React.PointerEvent) => {
    if (stickRef.current?.id !== event.pointerId) return;
    stickRef.current = null;
    setStick(null);
    gameRef.current?.setMove(0, 0);
  };

  const share = async () => {
    if (!result) return;
    const text = `Gradient Survivors: ${GRADE_COPY[result.grade].title} — survived ${formatTime(result.time)}, ${result.kills} bugs squashed (Lv ${result.level}).`;
    const url = `${window.location.origin}/play/survivors`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Gradient Survivors", text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShared(true);
      }
    } catch {
      // share sheet dismissed
    }
  };

  const hpPct = hud ? (hud.hp / hud.maxHp) * 100 : 100;
  const xpPct = hud ? Math.min(100, (hud.xp / hud.xpNext) * 100) : 0;
  const papersInBuild = result?.build.filter((card) => card.paper) ?? [];

  return (
    <div className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        tabIndex={0}
        aria-label="Gradient Survivors game area"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {phase !== "title" && hud ? (
        <div className={styles.hud}>
          <div className={styles.xpBar} aria-label={`Level ${hud.level}`}>
            <div className={styles.xpFill} style={{ width: `${xpPct}%` }} />
            <span>Lv {hud.level}</span>
          </div>
          <div className={styles.hudRow}>
            <div className={styles.hpBox}>
              <div className={styles.hpBar}>
                <div className={styles.hpFill} style={{ width: `${hpPct}%` }} />
              </div>
              <span>
                {hud.hp}/{hud.maxHp}
                {hud.revives ? ` · ⟲${hud.revives}` : ""}
              </span>
            </div>
            <div className={styles.timer}>
              <strong>{formatTime(RUN_LENGTH - hud.time)}</strong>
              <span>{hud.time < BOSS_TIME ? `Reviewer 2 in ${formatTime(BOSS_TIME - hud.time)}` : "until acceptance"}</span>
            </div>
            <div className={styles.hudRight}>
              <span className={styles.kills}>🐛 {hud.kills}</span>
              <button type="button" className={styles.iconButton} onClick={togglePause} aria-label="Pause">
                ❚❚
              </button>
            </div>
          </div>
          {hud.boss ? (
            <div className={styles.bossBar} aria-label="Reviewer 2 health">
              <div className={styles.bossFill} style={{ width: `${(hud.boss.hp / hud.boss.maxHp) * 100}%` }} />
              <span>Reviewer 2</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {toast ? (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      ) : null}

      {stick ? (
        <div className={styles.stick} style={{ left: stick.x, top: stick.y }} aria-hidden="true">
          <div ref={knobRef} className={styles.knob} />
        </div>
      ) : null}

      {phase === "title" ? (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <p className={styles.eyebrow}>A 5-minute survival game</p>
            <h1 className={styles.title}>Gradient Survivors</h1>
            <p>
              You are a tiny model under review. Bugs swarm in — <b>NaN</b>, <b>Overfit</b>, <b>Hallucination</b> — and at 2:30 <b>Reviewer 2</b> arrives.
              Survive five minutes to get accepted.
            </p>
            <ul className={styles.rules}>
              <li>{touch ? "Drag anywhere to move" : "Move with WASD or the arrow keys"}. Attacks fire on their own.</li>
              <li>Collect tokens to level up, then pick an upgrade. Some upgrades are my papers.</li>
              <li>Esc pauses. {touch ? "" : "Number keys pick cards."}</li>
            </ul>
            {best ? (
              <p className={styles.best}>
                Your best: {GRADE_COPY[best.grade].title} · {formatTime(best.time)} · {best.kills} bugs
              </p>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={start} autoFocus>
                Start run {touch ? "" : <kbd>Enter</kbd>}
              </button>
              <Link className={styles.button} href="/play">
                Other games
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "levelup" ? (
        <div className={styles.overlay}>
          <div className={styles.levelUp}>
            <p className={styles.eyebrow}>Level up</p>
            <h2>Choose an upgrade</h2>
            <div className={styles.cards}>
              {cards.map((card, index) => (
                <button key={card.id} type="button" className={`${styles.upgrade} ${card.paper ? styles.paperCard : ""}`} onClick={() => pick(card)}>
                  <span className={styles.cardTop}>
                    <span className={styles.icon}>{card.icon}</span>
                    <span className={styles.level}>{card.level === 1 ? "NEW" : `Lv ${card.level}`}</span>
                  </span>
                  <strong>{card.name}</strong>
                  <span className={styles.cardText}>{card.text}</span>
                  {card.paper ? <span className={styles.paperTag}>📄 {card.paper.label}</span> : null}
                  {!touch ? <kbd className={styles.cardKey}>{index + 1}</kbd> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {phase === "paused" ? (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <h2 className={styles.title}>Paused</h2>
            <div className={styles.actions}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={togglePause} autoFocus>
                Resume
              </button>
              <button type="button" className={styles.button} onClick={start}>
                Restart
              </button>
              <Link className={styles.button} href="/play">
                Quit
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "end" && result ? (
        <div className={styles.overlay}>
          <div className={styles.card}>
            <p className={styles.eyebrow}>Decision</p>
            <h2 className={styles.title}>{GRADE_COPY[result.grade].title}</h2>
            <p>{GRADE_COPY[result.grade].line}</p>
            <dl className={styles.stats}>
              <div>
                <dt>Survived</dt>
                <dd>{formatTime(result.time)}</dd>
              </div>
              <div>
                <dt>Bugs</dt>
                <dd>{result.kills}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{result.level}</dd>
              </div>
            </dl>
            {best ? (
              <p className={styles.best}>
                Best: {GRADE_COPY[best.grade].title} · {formatTime(best.time)} · {best.kills} bugs
              </p>
            ) : null}
            {papersInBuild.length ? (
              <div className={styles.papers}>
                <p>Papers in your build</p>
                {papersInBuild.map((card) => (
                  <a key={card.id} href={card.paper!.href}>
                    {card.icon} {card.name} → {card.paper!.label}
                  </a>
                ))}
              </div>
            ) : null}
            <div className={styles.actions}>
              <button type="button" className={`${styles.button} ${styles.primary}`} onClick={start} autoFocus>
                Resubmit {touch ? "" : <kbd>R</kbd>}
              </button>
              <button type="button" className={styles.button} onClick={share}>
                {shared ? "Copied!" : "Share"}
              </button>
              <Link className={styles.button} href="/play">
                Other games
              </Link>
              <Link className={styles.button} href="/">
                Classic view
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
