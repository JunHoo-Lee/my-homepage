"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { shareLink } from "../shared/share";
import { createSynth, type Synth } from "../shared/synth";
import styles from "./dsf.module.css";
import { createEngine, type Engine, type Hud, type StageResult } from "./engine";
import { FEYNMAN, FINALE, IDEA, IMPLICATIONS, LOSS, PROLOGUE, STAGES, TITLE, rankFor } from "./lore";

type Screen = "quote" | "title" | "idea" | "brief" | "play" | "outro" | "lost" | "finale";
type Toast = { id: number; text: string };

/** The three chalk sketches that go with IDEA.steps. */
function Doodle({ kind }: { kind: string }) {
  const curve = "M8 56 C 30 8, 62 74, 112 18";
  return (
    <svg viewBox="0 0 120 72" className={styles.doodle} aria-hidden="true">
      {kind === "manifold" ? (
        <>
          {[
            [14, 16],
            [34, 60],
            [50, 12],
            [70, 62],
            [92, 52],
            [104, 44],
            [26, 34],
            [84, 14],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" className={styles.dDust} />
          ))}
          <path d={curve} className={styles.dLine} />
          <path d="M50 14 L52 30 M70 60 L72 47 M26 35 L22 28 M92 51 L89 39" className={styles.dArrow} />
        </>
      ) : null}
      {kind === "domain" ? (
        <>
          <path d={curve} className={styles.dBand} />
          <path d={curve} className={styles.dLine} />
          <path d="M56 40 l4 5 l8 -11" className={styles.dYes} />
          <path d="M92 52 l9 9 M101 52 l-9 9" className={styles.dNo} />
          <text x="78" y="70" className={styles.dText}>
            99.9%
          </text>
        </>
      ) : null}
      {kind === "lift" ? (
        <>
          <path d="M14 66 L96 66 L110 46 L28 46 Z" className={styles.dPlane} />
          <path d="M14 30 L96 30 L110 10 L28 10 Z" className={styles.dPlane} />
          <circle cx="46" cy="57" r="2.6" className={styles.dDust} />
          <path d="M46 54 L46 24" className={styles.dDash} />
          <circle cx="46" cy="21" r="2.6" className={styles.dDust} />
          <path d="M51 20 L78 19 M72 15 L79 19 L72 23" className={styles.dArrow} />
          <path d="M88 13 l2 4.5 l5 0.5 l-3.7 3.3 l1.1 4.9 l-4.4 -2.6 l-4.4 2.6 l1.1 -4.9 l-3.7 -3.3 l5 -0.5 Z" className={styles.dStar} />
          <text x="100" y="24" className={styles.dText}>
            θ
          </text>
          <text x="58" y="60" className={styles.dText}>
            x
          </text>
        </>
      ) : null}
    </svg>
  );
}

const EMPTY_HUD: Hud = { progress: 0, goal: 0.9, step: 0, burst: 1, boost: 0, guess: "", tokensLeft: 0 };

export default function DsfClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const synthRef = useRef<Synth | null>(null);
  const toastId = useRef(0);
  const screenRef = useRef<Screen>("quote");

  const [screen, setScreenState] = useState<Screen>("quote");
  const [stageIndex, setStageIndex] = useState(0);
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [snapshots, setSnapshots] = useState<(string | null)[]>([]);
  const [stepsLeft, setStepsLeft] = useState(0);
  const [lastSteps, setLastSteps] = useState(0);
  const [retries, setRetries] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [peek, setPeek] = useState(false);
  const [shared, setShared] = useState("");

  const stage = STAGES[stageIndex];

  const setScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreenState(next);
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = (toastId.current += 1);
    setToasts((current) => [...current.slice(-2), { id, text }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 2800);
  }, []);

  const stageIndexRef = useRef(0);

  const handleEnd = useCallback(
    (result: StageResult) => {
      setPaused(false);
      if (!result.won) {
        setRetries((count) => count + 1);
        setScreen("lost");
        return;
      }
      const index = stageIndexRef.current;
      setSnapshots((current) => {
        const next = current.slice();
        next[index] = result.snapshot;
        return next;
      });
      setLastSteps(result.stepsLeft);
      setStepsLeft((total) => total + result.stepsLeft);
      setScreen("outro");
    },
    [setScreen],
  );

  // the engine lives as long as the page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const synth = createSynth();
    synthRef.current = synth;
    // the saved mute setting is only known in the browser, after hydration
    const syncMuted = window.setTimeout(() => setMuted(synth.muted), 0);
    const engine = createEngine(canvas, synth, { onHud: setHud, onToast: pushToast, onEnd: handleEnd });
    engineRef.current = engine;
    if (new URLSearchParams(window.location.search).has("debug")) {
      (window as unknown as { __dsf?: unknown }).__dsf = engine.debug;
    }
    return () => {
      window.clearTimeout(syncMuted);
      engine.dispose();
      synth.dispose();
      engineRef.current = null;
      synthRef.current = null;
    };
  }, [handleEnd, pushToast]);

  const openStage = useCallback(
    (index: number) => {
      stageIndexRef.current = index;
      setStageIndex(index);
      setHud(EMPTY_HUD);
      setToasts([]);
      setPeek(false);
      setScreen("brief");
      void engineRef.current?.load(STAGES[index]);
    },
    [setScreen],
  );

  const startStage = useCallback(() => {
    synthRef.current?.unlock();
    synthRef.current?.tone({ freq: 660, dur: 0.08, gain: 0.1 });
    setScreen("play");
    engineRef.current?.begin();
  }, [setScreen]);

  const restart = useCallback(() => {
    setSnapshots([]);
    setStepsLeft(0);
    setRetries(0);
    openStage(0);
  }, [openStage]);

  const togglePause = useCallback(() => {
    if (screenRef.current !== "play") return;
    setPaused((current) => {
      engineRef.current?.setPaused(!current);
      return !current;
    });
  }, []);

  const toggleMute = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.unlock();
    synth.setMuted(!synth.muted);
    setMuted(synth.muted);
  }, []);

  // keyboard: Enter advances the cards, P pauses
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const current = screenRef.current;
      if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        if (current === "play") togglePause();
        return;
      }
      if (event.key === "m" || event.key === "M") {
        toggleMute();
        return;
      }
      if (event.key !== "Enter") return;
      if (event.target instanceof HTMLElement && ["A", "BUTTON"].includes(event.target.tagName)) return;
      // otherwise the same key press would also click the button the next card focuses
      event.preventDefault();
      synthRef.current?.unlock();
      if (current === "quote") setScreen("title");
      else if (current === "title") setScreen("idea");
      else if (current === "idea") openStage(0);
      else if (current === "brief") startStage();
      else if (current === "lost") openStage(stageIndexRef.current);
      else if (current === "outro") {
        if (stageIndexRef.current + 1 < STAGES.length) openStage(stageIndexRef.current + 1);
        else setScreen("finale");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openStage, setScreen, startStage, toggleMute, togglePause]);

  // pause when the tab is hidden
  useEffect(() => {
    function onVisibility() {
      if (document.hidden && screenRef.current === "play") {
        engineRef.current?.setPaused(true);
        setPaused(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const inStage = screen === "play" || screen === "brief" || screen === "outro" || screen === "lost";
  const percent = Math.round(hud.progress * 100);
  const rank = rankFor(stepsLeft, retries);
  const lastStage = stageIndex + 1 >= STAGES.length;

  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <Link href="/play" className={styles.back} aria-label="Other games">
          ← Games
        </Link>
        {inStage ? (
          <>
            <div className={styles.chip}>
              <b>
                {stageIndex + 1}/{STAGES.length} · {stage.model}
              </b>
              <span>{stage.title}</span>
            </div>
            <div className={styles.meter} role="progressbar" aria-label="Share of dust on the manifold" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <div className={styles.meterFill} style={{ width: `${percent}%` }} />
              <div className={styles.meterGoal} style={{ left: `${Math.round(hud.goal * 100)}%` }} />
              <span className={styles.meterText}>on the manifold {percent}%</span>
            </div>
            <div className={`${styles.steps} ${hud.step > 800 ? styles.stepsLow : ""}`}>
              t = {hud.step}
              <small> / 1000</small>
            </div>
          </>
        ) : (
          <div className={styles.barTitle}>{TITLE.name}</div>
        )}
        <div className={styles.barButtons}>
          {screen === "play" ? (
            <button type="button" className={styles.icon} onClick={togglePause} aria-label={paused ? "Resume" : "Pause"}>
              {paused ? "▶" : "Ⅱ"}
            </button>
          ) : null}
          <button type="button" className={styles.icon} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </header>

      <div className={styles.boardWrap}>
        <div className={styles.fit}>
          <canvas ref={canvasRef} className={styles.canvas} aria-label="Blackboard: move through the chalk dust to make the hidden image appear" />
        </div>

        <div className={styles.toasts} aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={styles.toast}>
              {toast.text}
            </div>
          ))}
        </div>

        {screen === "quote" ? (
          <div className={`${styles.overlay} ${styles.slate}`} onClick={() => setScreen("title")}>
            <div className={styles.prologue}>
              <p className={styles.quote}>“{FEYNMAN.quote}”</p>
              <p className={styles.credit}>{FEYNMAN.credit}</p>
              <div className={styles.lines}>
                {PROLOGUE.map((line, index) => (
                  <p key={line} style={{ animationDelay: `${1.9 + index * 1.5}s` }}>
                    {line}
                  </p>
                ))}
              </div>
              <button
                type="button"
                className={styles.chalkButton}
                style={{ animationDelay: `${2.2 + PROLOGUE.length * 1.5}s` }}
                onClick={(event) => {
                  event.stopPropagation();
                  synthRef.current?.unlock();
                  setScreen("title");
                }}
              >
                Take the contrapositive →
              </button>
              <p className={styles.skip}>click anywhere or press Enter to skip</p>
            </div>
          </div>
        ) : null}

        {screen === "title" ? (
          <div className={`${styles.overlay} ${styles.slate}`}>
            <div className={styles.card}>
              <p className={styles.kicker}>{TITLE.kicker}</p>
              <h1 className={styles.title}>{TITLE.name}</h1>
              <p className={styles.sub}>{TITLE.sub}</p>
              <ol className={styles.rules}>
                {TITLE.rules.map(([head, rest]) => (
                  <li key={head}>
                    <b>{head}</b> {rest}
                  </li>
                ))}
              </ol>
              <dl className={styles.controls}>
                {TITLE.controls.map(([key, action]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={() => {
                    synthRef.current?.unlock();
                    setScreen("idea");
                  }}
                >
                  {TITLE.start}
                </button>
                <Link href="/dsf" className={styles.secondary}>
                  Project page
                </Link>
              </div>
              <p className={styles.meta}>{TITLE.meta}</p>
              <p className={styles.footnote}>{TITLE.footnote}</p>
            </div>
          </div>
        ) : null}

        {screen === "idea" ? (
          <div className={`${styles.overlay} ${styles.slate}`}>
            <div className={`${styles.card} ${styles.ideaCard}`}>
              <p className={styles.kicker}>{IDEA.kicker}</p>
              <h2 className={styles.heading}>{IDEA.title}</h2>
              <ol className={styles.idea}>
                {IDEA.steps.map((step) => (
                  <li key={step.title}>
                    <Doodle kind={step.doodle} />
                    <div>
                      <b>{step.title}</b>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className={styles.punch}>{IDEA.punch}</p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => openStage(0)} autoFocus>
                  {IDEA.start}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {screen === "brief" ? (
          <div className={styles.overlay}>
            <div className={styles.card}>
              <p className={styles.kicker}>
                Stage {stageIndex + 1} of {STAGES.length} · {stage.model} · {stage.trained}
              </p>
              <h2 className={styles.heading}>{stage.title}</h2>
              <p className={styles.body}>{stage.brief}</p>
              <p className={styles.hint}>{stage.hint}</p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={startStage} autoFocus>
                  Start sampling from noise
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {screen === "outro" && peek ? (
          <button type="button" className={styles.peekBack} onClick={() => setPeek(false)}>
            ← Back to the notes
          </button>
        ) : null}

        {screen === "outro" && !peek ? (
          <div className={`${styles.overlay} ${styles.low}`}>
            <div className={`${styles.card} ${styles.outro}`}>
              <p className={styles.kicker}>
                {stage.model} says: {stage.verdict}
              </p>
              <h2 className={styles.heading}>{stage.outro.headline}</h2>
              <p className={styles.body}>{stage.outro.body}</p>
              <p className={styles.formula}>{stage.outro.paper}</p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => (lastStage ? setScreen("finale") : openStage(stageIndex + 1))} autoFocus>
                  {lastStage ? "Read the board" : "Next model →"}
                </button>
                <button type="button" className={styles.secondary} onClick={() => setPeek(true)}>
                  Look at the image
                </button>
                {lastStage ? null : (
                  <button type="button" className={styles.textButton} onClick={() => setScreen("finale")}>
                    Skip to the ending
                  </button>
                )}
                <span className={styles.saved}>{lastSteps} steps to spare · sample saved to your calibration set</span>
              </div>
            </div>
          </div>
        ) : null}

        {screen === "lost" ? (
          <div className={styles.overlay}>
            <div className={styles.card}>
              <p className={styles.kicker}>t = 1000 / 1000</p>
              <h2 className={styles.heading}>{LOSS.title}</h2>
              <p className={styles.body}>{LOSS.body}</p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => openStage(stageIndex)} autoFocus>
                  {LOSS.retry}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {paused && screen === "play" ? (
          <div className={styles.overlay}>
            <div className={styles.card}>
              <p className={styles.kicker}>Sampler paused</p>
              <h2 className={styles.heading}>θ is still frozen. So is everything else.</h2>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={togglePause} autoFocus>
                  Resume
                </button>
                <Link href="/play" className={styles.secondary}>
                  Other games
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {screen === "finale" ? (
          <div className={`${styles.overlay} ${styles.slate} ${styles.finale}`}>
            <div className={styles.finaleInner}>
              <p className={styles.struck}>“{FEYNMAN.quote}”</p>
              <p className={styles.kicker}>{FINALE.kicker}</p>
              <p className={styles.quote}>“{FEYNMAN.contrapositive}”</p>
              <p className={styles.note}>{FINALE.note}</p>

              <div className={styles.rank}>
                <span>Decision</span>
                <b>{rank.title}</b>
                <p>
                  {rank.line} ({stepsLeft} steps to spare{retries > 0 ? `, ${retries} ${retries === 1 ? "retry" : "retries"}` : ""})
                </p>
              </div>

              <section className={styles.section}>
                <h3>{FINALE.ideaTitle}</h3>
                <ol className={styles.idea}>
                  {IDEA.steps.map((step) => (
                    <li key={step.title}>
                      <Doodle kind={step.doodle} />
                      <div>
                        <b>{step.title}</b>
                        <p>{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className={styles.punch}>{IDEA.punch}</p>
              </section>

              <section className={styles.section}>
                <h3>{FINALE.implicationsTitle}</h3>
                <div className={styles.implications}>
                  {IMPLICATIONS.map((item) => (
                    <article key={item.title}>
                      <span>{item.tag}</span>
                      <h4>{item.title}</h4>
                      <p>{item.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.section}>
                <h3>{FINALE.calibrationTitle}</h3>
                <div className={styles.gallery}>
                  {STAGES.map((item, index) =>
                    snapshots[index] ? (
                      <figure key={item.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={snapshots[index] ?? ""} alt={`Generated sample: ${item.title}`} />
                        <figcaption>{item.model}</figcaption>
                      </figure>
                    ) : null,
                  )}
                </div>
                <p>{FINALE.calibrationBody}</p>
              </section>

              <p className={styles.fine}>{FINALE.honest}</p>

              <div className={styles.actions}>
                <Link href="/dsf" className={styles.primary}>
                  {FINALE.links.project}
                </Link>
                <a href="/dsf/assets/dsf-paper.pdf" className={styles.secondary}>
                  {FINALE.links.paper}
                </a>
                <Link href="/play/backdoor" className={styles.secondary}>
                  {FINALE.links.other}
                </Link>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    void shareLink("What I Cannot Create", "A blackboard game about the Discriminative Score Function (NeurIPS 2026)", "/play/dsf").then((result) =>
                      setShared(result === "copied" ? "Link copied" : result === "failed" ? "Copy failed" : ""),
                    );
                  }}
                >
                  {shared || FINALE.links.share}
                </button>
                <button type="button" className={styles.secondary} onClick={restart}>
                  {FINALE.links.again}
                </button>
                <Link href="/play" className={styles.secondary}>
                  {FINALE.links.games}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <footer className={styles.foot}>
        {screen === "play" ? (
          <>
            <div className={styles.softmax}>
              <span>f(x; θ) says</span>
              <b>{hud.guess}</b>
              {hud.boost > 0 ? <em>H100 · {Math.ceil(hud.boost)}s</em> : null}
              {hud.tokensLeft > 0 ? <em>CLIP cards left: {hud.tokensLeft}</em> : null}
            </div>
            <button
              type="button"
              className={styles.burst}
              disabled={hud.burst < 1}
              onClick={() => {
                synthRef.current?.unlock();
                engineRef.current?.burst();
              }}
              style={{ "--charge": `${Math.round(Math.min(1, Math.max(0, hud.burst)) * 100)}%` } as React.CSSProperties}
            >
              ⚡ Burst <kbd>Space</kbd>
            </button>
          </>
        ) : (
          <div className={styles.softmax}>
            <span>Discriminative Score Function · Lee, Kim, Han, Kwak · NeurIPS 2026</span>
          </div>
        )}
      </footer>
    </div>
  );
}
