"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

import { DEFAULT_AUDIO_SETTINGS, createAudio } from "./audio";
import { PALETTE, type AudioEngine, type AudioSettings } from "./contracts";
import { createGame, type Card, type GameHandle, type Hud as HudState, type PaperLink, type RunResult } from "./game";
import { TOASTS, submissionId } from "./lore";
import styles from "./survivors.module.css";
import DecisionLetter from "./ui/DecisionLetter";
import Hud from "./ui/Hud";
import LevelUp from "./ui/LevelUp";
import PauseMenu from "./ui/PauseMenu";
import { readAudioSettings, readBest, recordBest, saveAudioSettings, type Best } from "./ui/records";
import { UiSoundContext, type UiSound } from "./ui/sound";
import TitleCard from "./ui/TitleCard";
import { BossBanner, Toasts, type Toast } from "./ui/Toasts";

type Phase = "title" | "playing" | "levelup" | "paused" | "end";

/** The palette as custom properties (--ink, --paper, --blue, ...) for every UI stylesheet. */
const PALETTE_VARS = Object.fromEntries(Object.entries(PALETTE).map(([name, value]) => [`--${name}`, value])) as CSSProperties;

/** Players are mid-movement when the cards appear: picks are ignored this long. */
const PICK_GUARD_MS = 250;
/** The decision letter gets a moment before R resubmits. */
const RESUBMIT_GUARD_MS = 700;
/** A Tab press this recent means a focus change came from the keyboard (plays "hover"). */
const TAB_FOCUS_MS = 150;
/** Touch joystick radius in CSS px. */
const STICK = 48;
/** Gestures that may unlock WebAudio. */
const GESTURES = ["pointerdown", "keydown", "touchend"] as const;

const DIRS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

/** The HUD plus counters that restart its shake (sanity drops) and pop (combo increases) animations. */
type HudView = { hud: HudState | null; hurt: number; pops: number };
const NO_HUD: HudView = { hud: null, hurt: 0, pops: 0 };

const isInteractive = (target: EventTarget | null) => target instanceof Element && target.closest("button, a, input, select, textarea") !== null;

export default function SurvivorsClient({ paperLinks }: { paperLinks: Record<string, PaperLink> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const phaseRef = useRef<Phase>("title");
  const keysRef = useRef(new Set<string>());
  const knobRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<{ id: number; x: number; y: number } | null>(null);
  /** When the current overlay opened (input guards). */
  const overlayAtRef = useRef(0);
  const tabAtRef = useRef(-Infinity);
  const toastIdRef = useRef(0);
  const runsRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("title");
  const [view, setView] = useState<HudView>(NO_HUD);
  const [cards, setCards] = useState<Card[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [best, setBest] = useState<Best | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** Id of the Reviewer 2 warning banner on screen, 0 for none. */
  const [banner, setBanner] = useState(0);
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [submission, setSubmission] = useState<number | null>(null);
  const [touch, setTouch] = useState(false);
  const [motion, setMotion] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);

  const pushToast = useCallback((text: string) => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((list) => [...list.slice(-2), { id, text }]);
  }, []);

  /** Drops an active touch joystick (an overlay is about to cover the canvas). */
  const releaseStick = useCallback(() => {
    if (!stickRef.current) return;
    stickRef.current = null;
    setStick(null);
    gameRef.current?.setMove(0, 0);
  }, []);

  // ------------------------------------------------------------ game + audio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const audio = createAudio(readAudioSettings());
    // starts in attract mode: a silent demo behind the title card
    const game = createGame(
      canvas,
      paperLinks,
      {
        onHud: (hud) =>
          setView((prev) => ({
            hud,
            hurt: prev.hud && hud.hp < prev.hud.hp ? prev.hurt + 1 : prev.hurt,
            pops: prev.hud && hud.combo > prev.hud.combo ? prev.pops + 1 : prev.pops,
          })),
        onLevelUp: (next) => {
          releaseStick();
          overlayAtRef.current = performance.now();
          setCards(next);
          setPhase("levelup");
        },
        onEnd: (next) => {
          releaseStick();
          const record = recordBest(next);
          overlayAtRef.current = performance.now();
          setResult(next);
          setBest(record.best);
          setNewBest(record.improved);
          setBanner(0);
          setToasts([]);
          setPhase("end");
        },
        onToast: pushToast,
        onAutoPause: () => {
          releaseStick();
          setPhase((current) => (current === "playing" ? "paused" : current));
        },
        onBossWarning: () => setBanner((id) => id + 1),
      },
      { audio, reducedMotion },
    );
    gameRef.current = game;
    audioRef.current = audio;

    // WebAudio may only start inside a user gesture: unlock on the first one, then play the title
    // music (a beat later, so a click on "Start review" goes straight to the run music).
    let titleTimer = 0;
    const unlock = () => {
      audio.unlock();
      window.clearTimeout(titleTimer);
      titleTimer = window.setTimeout(() => {
        if (phaseRef.current === "title") audio.setMusic("title");
      }, 150);
      if (audio.unlocked) for (const type of GESTURES) window.removeEventListener(type, unlock);
    };
    for (const type of GESTURES) window.addEventListener(type, unlock);

    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    // browser-only state, read after hydration so the server and client markup match
    const frame = requestAnimationFrame(() => {
      setTouch(window.matchMedia("(pointer: coarse)").matches);
      setMotion(!reducedMotion);
      setBest(readBest());
      setSettings(audio.getSettings());
      setSubmission(submissionId());
    });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(titleTimer);
      for (const type of GESTURES) window.removeEventListener(type, unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      game.dispose();
      audio.dispose();
      gameRef.current = null;
      audioRef.current = null;
    };
  }, [paperLinks, pushToast, releaseStick]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "playing") canvasRef.current?.focus({ preventScroll: true });
  }, [phase]);

  // Silent while paused (a beat later, so the pause click is heard) and in hidden tabs.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (hidden) {
      audio.suspend();
      return;
    }
    if (phase !== "paused") {
      audio.resume();
      return;
    }
    const timer = window.setTimeout(() => audio.suspend(), 120);
    return () => window.clearTimeout(timer);
  }, [phase, hidden]);

  // ------------------------------------------------------------ actions
  const updateSettings = useCallback((patch: Partial<AudioSettings>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.setSettings(patch);
    const next = audio.getSettings();
    saveAudioSettings(next);
    setSettings(next);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const muted = !audio.getSettings().muted;
    updateSettings({ muted });
    if (!muted) audio.sfx("click");
  }, [updateSettings]);

  const start = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    runsRef.current += 1;
    // the first run keeps the number from the title page; every resubmission gets a new one
    const id = runsRef.current === 1 && submission ? submission : submissionId();
    // reset before restart(): it pushes the first HUD of the new run right away
    setView(NO_HUD);
    setCards([]);
    setResult(null);
    setBanner(0);
    setToasts([]);
    audioRef.current?.unlock();
    game.restart();
    setSubmission(id);
    setPhase("playing");
    pushToast(TOASTS.runStart(id));
  }, [submission, pushToast]);

  const pick = useCallback((card: Card) => {
    if (performance.now() - overlayAtRef.current < PICK_GUARD_MS) return;
    gameRef.current?.choose(card.id);
    audioRef.current?.sfx("pick");
    setCards([]);
    setPhase("playing");
  }, []);

  const pause = useCallback(() => {
    if (phase !== "playing") return;
    releaseStick();
    gameRef.current?.setPaused(true);
    audioRef.current?.sfx("click");
    setPhase("paused");
  }, [phase, releaseStick]);

  const resume = useCallback(() => {
    if (phase !== "paused") return;
    gameRef.current?.setPaused(false);
    setPhase("playing");
    // the audio context needs a moment to wake up before it plays anything
    window.setTimeout(() => audioRef.current?.sfx("click"), 80);
  }, [phase]);

  /** "Resubmit" on the letter and "Withdraw & resubmit" in the pause menu. */
  const resubmit = useCallback(() => {
    audioRef.current?.sfx("click");
    start();
  }, [start]);

  // ------------------------------------------------------------ keyboard
  useEffect(() => {
    const sync = () => {
      let x = 0;
      let y = 0;
      for (const code of keysRef.current) {
        const dir = DIRS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      gameRef.current?.setMove(x, y);
    };
    const onDown = (event: KeyboardEvent) => {
      if (event.code === "Tab") tabAtRef.current = performance.now();
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // arrow keys belong to the volume sliders while one has focus
      if (DIRS[event.code] && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        keysRef.current.add(event.code);
        sync();
        return;
      }
      if (event.repeat) return;
      if (event.code === "KeyM") {
        toggleMute();
        return;
      }
      if (phase === "levelup") {
        const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
        const card = digit ? cards[Number(digit[1]) - 1] : undefined;
        if (card) {
          event.preventDefault();
          pick(card);
        }
        return;
      }
      if (event.code === "Escape" || event.code === "KeyP") {
        if (phase === "playing") pause();
        else if (phase === "paused") resume();
        return;
      }
      if (phase === "title" && (event.code === "Enter" || event.code === "Space") && !isInteractive(event.target)) {
        event.preventDefault();
        start();
      }
      if (phase === "end" && event.code === "KeyR" && performance.now() - overlayAtRef.current > RESUBMIT_GUARD_MS) {
        event.preventDefault();
        resubmit();
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
  }, [cards, phase, pick, pause, resume, resubmit, start, toggleMute]);

  // ------------------------------------------------------------ touch joystick
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === "mouse" || phase !== "playing" || stickRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    stickRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setStick({ x: event.clientX, y: event.clientY });
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
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
    const live = d < 6 ? 0 : 1;
    gameRef.current?.setMove((dx / STICK) * live, (dy / STICK) * live);
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    if (stickRef.current?.id !== event.pointerId) return;
    releaseStick();
  };

  // ------------------------------------------------------------ UI sounds
  const ui = useMemo<UiSound>(
    () => ({
      play: (name) => audioRef.current?.sfx(name),
      hover: {
        onPointerEnter: (event) => {
          if (event.pointerType === "mouse") audioRef.current?.sfx("hover");
        },
        onFocus: () => {
          if (performance.now() - tabAtRef.current < TAB_FOCUS_MS) audioRef.current?.sfx("hover");
        },
      },
    }),
    [],
  );

  const inRun = phase === "playing" || phase === "levelup" || phase === "paused";
  const frozen = phase === "levelup" || phase === "paused";

  return (
    <UiSoundContext.Provider value={ui}>
      <div className={styles.root} style={PALETTE_VARS}>
        <div className={styles.stage} inert={phase !== "playing"}>
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
          {inRun && view.hud ? (
            <Hud hud={view.hud} hurt={view.hurt} pops={view.pops} muted={settings.muted} touch={touch} onToggleMute={toggleMute} onPause={pause} />
          ) : null}
        </div>

        {inRun && banner ? <BossBanner key={banner} frozen={frozen} onDone={() => setBanner(0)} /> : null}
        <Toasts toasts={toasts} frozen={frozen} onDone={(id) => setToasts((list) => list.filter((toast) => toast.id !== id))} />

        {stick ? (
          <div className={styles.stick} style={{ left: stick.x, top: stick.y }} aria-hidden="true">
            <div ref={knobRef} className={styles.knob} />
          </div>
        ) : null}

        {phase === "title" ? (
          <TitleCard submission={submission} best={best} touch={touch} muted={settings.muted} motion={motion} onToggleMute={toggleMute} onStart={start} />
        ) : null}
        {phase === "levelup" ? <LevelUp cards={cards} touch={touch} onPick={pick} /> : null}
        {phase === "paused" ? <PauseMenu submission={submission} settings={settings} touch={touch} onSettings={updateSettings} onResume={resume} onRestart={resubmit} /> : null}
        {phase === "end" && result ? (
          <DecisionLetter result={result} submission={submission} best={best} newBest={newBest} motion={motion} touch={touch} onResubmit={resubmit} />
        ) : null}
      </div>
    </UiSoundContext.Provider>
  );
}
