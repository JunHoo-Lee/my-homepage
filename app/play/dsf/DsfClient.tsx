"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { shareLink } from "../shared/share";
import { sharedSynth } from "../shared/synth";
import { CLOCK_GUESSES, DOOR, DOOR_NEEDS, FEYNMAN, FINALE, LOG, PROMPT_CARDS, QUESTION, SITES, STATUES, TITLE, TOASTS, type Site, type SiteId } from "./content";
import styles from "./dsf.module.css";
import DustBoard from "./figures/DustBoard";
import Footprints from "./figures/Footprints";
import ProbeBoard from "./figures/ProbeBoard";
import { DoorPuzzle, TwoLooks } from "./figures/Puzzles";
import Ruler from "./figures/Ruler";
import { createWorld, type Near, type World } from "./world";

type Screen = "title" | "play" | "finale";
type Open = { kind: "site"; id: SiteId } | { kind: "statue"; id: string } | { kind: "log" } | null;
type Toast = { id: number; text: string };

const RUINS = SITES.filter((site) => site.id !== "door");

/** The puzzle of one ruin. Each calls onSolved once. */
function Puzzle({ site, onSolved }: { site: Site; onSolved(): void }) {
  const synth = sharedSynth();
  const [reveal, setReveal] = useState(0);
  const [tapsLeft, setTapsLeft] = useState(8);
  const [guess, setGuess] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [cards, setCards] = useState<number[]>([]);
  const [opened, setOpened] = useState(false);

  let body: React.ReactNode = null;
  let canSkip = true;
  if (site.id === "shore") {
    body = <DustBoard drawing="cat" solved={false} revealSignal={reveal} synth={synth} label="A slab of static. Dragging across it makes a chalk cat appear." onSolved={onSolved} />;
  } else if (site.id === "needle") {
    body = (
      <>
        <ProbeBoard mode="find" solved={false} revealSignal={reveal} synth={synth} label="A board of static with a hidden curve of pictures" onTap={(left) => setTapsLeft(left)} onSolved={() => window.setTimeout(onSolved, 1500)} />
        <p className={styles.status}>
          Taps left: <b>{tapsLeft}</b>
        </p>
      </>
    );
  } else if (site.id === "looks") {
    body = <TwoLooks synth={synth} onSolved={onSolved} />;
    canSkip = false;
  } else if (site.id === "ruler") {
    body = <Ruler solved={false} synth={synth} onSolved={onSolved} />;
    canSkip = false;
  } else if (site.id === "footprints") {
    body = <Footprints solved={false} synth={synth} onSolved={() => window.setTimeout(onSolved, 700)} />;
    canSkip = false;
  } else if (site.id === "clock") {
    canSkip = guess !== null;
    body = (
      <>
        <div className={styles.choices}>
          {CLOCK_GUESSES.map((option) => (
            <button key={option} type="button" className={guess === option ? styles.choiceOn : undefined} onClick={() => { synth.unlock(); setGuess(option); }}>
              {option}
            </button>
          ))}
        </div>
        <div className={guess === null ? styles.lockedBoard : undefined}>
          <DustBoard drawing="clock" solved={false} locked={guess === null} revealSignal={reveal} synth={synth} label="A board of static that becomes a clock" onSolved={onSolved} />
          {guess === null ? <span className={styles.lockNote}>Guess first.</span> : null}
        </div>
      </>
    );
  } else if (site.id === "bench") {
    body = (
      <>
        <DustBoard drawing="banana" layers={[0, ...cards]} solved={drawn} revealSignal={reveal} synth={synth} label="A board of static that becomes a banana" onSolved={() => setDrawn(true)} />
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
                if (next.length >= PROMPT_CARDS.length) window.setTimeout(onSolved, 2600);
              }}
            >
              {card.text}
            </button>
          ))}
        </div>
      </>
    );
  } else {
    canSkip = false;
    body = opened ? (
      <DustBoard drawing="understand" erase="feynman" solved={false} autoplay synth={synth} label="The sentence on the door is wiped and written again" onSolved={onSolved} />
    ) : (
      <DoorPuzzle synth={synth} onSolved={() => setOpened(true)} />
    );
  }

  return (
    <div className={styles.puzzle}>
      <p className={styles.instruction}>
        <span>Puzzle</span> {site.instruction}
      </p>
      {body}
      {canSkip ? (
        <button type="button" className={styles.linkButton} onClick={() => setReveal((value) => value + 1)}>
          Reveal without playing
        </button>
      ) : null}
    </div>
  );
}

/** What a solved ruin wrote into the log. */
function Insight({ site }: { site: Site }) {
  return (
    <div className={styles.insight}>
      <p className={styles.aha}>{site.aha}</p>
      {site.note.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {site.formula ? <p className={styles.formula}>{site.formula}</p> : null}
      <p className={styles.verdictLine}>
        <span>The question now</span> {site.verdict}
      </p>
    </div>
  );
}

export default function DsfClient() {
  const synth = sharedSynth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const live = useRef<{ screen: Screen; open: Open; near: Near }>({ screen: "title", open: null, near: null });
  const toastId = useRef(0);

  const [screen, setScreen] = useState<Screen>("title");
  const [open, setOpen] = useState<Open>(null);
  const [near, setNear] = useState<Near>(null);
  const [solved, setSolved] = useState<SiteId[]>([]);
  const [questioned, setQuestioned] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [muted, setMuted] = useState(false);
  const [shared, setShared] = useState("");

  useEffect(() => {
    live.current = { screen, open, near };
  });

  const pushToast = useCallback((text: string) => {
    const id = (toastId.current += 1);
    setToasts((current) => [...current.slice(-1), { id, text }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4200);
  }, []);

  // the island lives as long as the page
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = createWorld(canvas, synth, { onNear: setNear, onToast: pushToast });
    worldRef.current = world;
    // the saved mute setting is only known in the browser, after hydration
    const sync = window.setTimeout(() => setMuted(synth.muted), 0);
    if (new URLSearchParams(window.location.search).has("debug")) {
      (window as unknown as { __dsf?: unknown }).__dsf = world.debug;
    }
    return () => {
      window.clearTimeout(sync);
      world.dispose();
      worldRef.current = null;
    };
  }, [pushToast, synth]);

  const compass = solved.includes("footprints");
  useEffect(() => {
    worldRef.current?.setProgress(solved, questioned, compass);
  }, [solved, questioned, compass]);

  useEffect(() => {
    worldRef.current?.setPaused(screen !== "play" || open !== null);
  }, [screen, open]);

  const ruinsSolved = RUINS.filter((site) => solved.includes(site.id)).length;
  const doorOpen = solved.includes("door");

  const examine = useCallback(() => {
    const now = live.current;
    if (now.screen !== "play" || now.open || !now.near) return;
    synth.unlock();
    synth.tone({ freq: 500, to: 700, dur: 0.08, gain: 0.08 });
    if (now.near.kind === "statue") {
      const id = now.near.id;
      setQuestioned((current) => (current.includes(id) ? current : [...current, id]));
      setOpen({ kind: "statue", id });
    } else setOpen({ kind: "site", id: now.near.id });
  }, [synth]);

  const solve = useCallback(
    (id: SiteId) => {
      setSolved((current) => {
        if (current.includes(id)) return current;
        if (id === "footprints") pushToast(TOASTS.compass);
        const next = [...current, id];
        if (id !== "door" && next.filter((item) => item !== "door").length === DOOR_NEEDS) pushToast(TOASTS.door);
        return next;
      });
    },
    [pushToast],
  );

  const toggleMute = useCallback(() => {
    synth.unlock();
    synth.setMuted(!synth.muted);
    setMuted(synth.muted);
  }, [synth]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof HTMLElement && ["INPUT", "BUTTON", "A"].includes(event.target.tagName) && event.key !== "Escape") return;
      const now = live.current;
      const key = event.key.toLowerCase();
      if (key === "m") toggleMute();
      else if (now.screen === "title" && key === "enter") {
        event.preventDefault();
        synth.unlock();
        setScreen("play");
      } else if (now.screen === "play" && !now.open && (key === "e" || key === " " || key === "enter")) {
        event.preventDefault();
        examine();
      } else if (now.screen === "play" && !now.open && key === "l") setOpen({ kind: "log" });
      else if (now.screen === "play" && now.open && key === "escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [examine, synth, toggleMute]);

  const site = open?.kind === "site" ? SITES.find((item) => item.id === open.id) : undefined;
  const statue = open?.kind === "statue" ? STATUES.find((item) => item.id === open.id) : undefined;
  const siteSolved = site ? solved.includes(site.id) : false;
  const doorLocked = site?.id === "door" && !siteSolved && ruinsSolved < DOOR_NEEDS;

  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <Link href="/play" className={styles.back}>
          ← Games
        </Link>
        <p className={styles.question}>{screen === "play" ? QUESTION.short : TITLE.name}</p>
        {screen === "play" ? (
          <button type="button" className={styles.logButton} onClick={() => setOpen({ kind: "log" })}>
            {LOG.button} {ruinsSolved + (doorOpen ? 1 : 0)}/{SITES.length}
          </button>
        ) : null}
        <button type="button" className={styles.icon} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label="An island at night in a sea of static. Walk it to find the ruins." />

        <div className={styles.toasts} aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={styles.toast}>
              {toast.text}
            </div>
          ))}
        </div>

        {screen === "play" && !open && near ? (
          <button type="button" className={styles.examine} onClick={examine}>
            Examine: {near.name} <kbd>E</kbd>
          </button>
        ) : null}

        {screen === "title" ? (
          <div className={`${styles.overlay} ${styles.opaque}`}>
            <div className={styles.sheet}>
              <p className={styles.kicker}>{TITLE.kicker}</p>
              <blockquote className={styles.epigraph}>
                <p>“{FEYNMAN.quote}”</p>
                <footer>{FEYNMAN.credit}</footer>
              </blockquote>
              <h1 className={styles.title}>{TITLE.name}</h1>
              {TITLE.premise.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className={styles.bigQuestion}>{QUESTION.short}</p>
              <dl className={styles.controls}>
                {TITLE.controls.map(([key, action]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{action}</dd>
                  </div>
                ))}
              </dl>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => { synth.unlock(); synth.tone({ freq: 440, to: 660, dur: 0.2, gain: 0.1 }); setScreen("play"); }}>
                  {TITLE.start}
                </button>
                <Link href="/dsf" className={styles.secondary}>
                  Project page
                </Link>
              </div>
              <p className={styles.meta}>{TITLE.meta}</p>
            </div>
          </div>
        ) : null}

        {screen === "play" && site ? (
          <div className={styles.overlay}>
            <div className={styles.sheet}>
              <p className={styles.kicker}>
                Ruin {site.n} of {SITES.length} · {site.name}
              </p>
              {siteSolved ? (
                <>
                  <Insight site={site} />
                  <div className={styles.actions}>
                    {site.id === "door" ? (
                      <button type="button" className={styles.primary} onClick={() => { setOpen(null); setScreen("finale"); }} autoFocus>
                        Go through
                      </button>
                    ) : (
                      <button type="button" className={styles.primary} onClick={() => setOpen(null)} autoFocus>
                        Back to the island
                      </button>
                    )}
                  </div>
                </>
              ) : doorLocked ? (
                <>
                  <p className={styles.carvedBig}>“{FEYNMAN.quote}”</p>
                  <p>{QUESTION.long}</p>
                  <p className={styles.reply}>{DOOR.locked(ruinsSolved)}</p>
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} onClick={() => setOpen(null)} autoFocus>
                      Back to the island
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {site.setup.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  <Puzzle key={site.id} site={site} onSolved={() => solve(site.id)} />
                  <div className={styles.actions}>
                    <button type="button" className={styles.secondary} onClick={() => setOpen(null)}>
                      Leave it for now
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        {screen === "play" && statue ? (
          <div className={styles.overlay}>
            <div className={styles.sheet}>
              <p className={styles.kicker}>A stone figure · suspect {STATUES.indexOf(statue) + 1} of {STATUES.length}</p>
              <h2 className={styles.heading}>{statue.name}</h2>
              <p className={styles.charge}>{statue.charge}</p>
              <p>
                <b>Alibi.</b> {statue.alibi}
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => setOpen(null)} autoFocus>
                  Rule it out
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {screen === "play" && open?.kind === "log" ? (
          <div className={styles.overlay}>
            <div className={styles.sheet}>
              <p className={styles.kicker}>{LOG.title}</p>
              <p className={styles.carvedBig}>“{FEYNMAN.quote}”</p>
              <p className={styles.bigQuestion}>{QUESTION.short}</p>
              <ol className={styles.log}>
                {SITES.map((item) => {
                  const done = solved.includes(item.id);
                  return (
                    <li key={item.id} className={done ? styles.logDone : undefined}>
                      <b>{done ? item.aha : item.name}</b>
                      <span>{done ? item.verdict : item.rumor}</span>
                    </li>
                  );
                })}
              </ol>
              <p className={styles.meta}>
                {LOG.statues}: {questioned.length}/{STATUES.length} · {LOG.hint}
              </p>
              <div className={styles.actions}>
                <button type="button" className={styles.primary} onClick={() => setOpen(null)} autoFocus>
                  Back to the island
                </button>
                {doorOpen ? (
                  <button type="button" className={styles.secondary} onClick={() => { setOpen(null); setScreen("finale"); }}>
                    What follows
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {screen === "finale" ? (
          <div className={`${styles.overlay} ${styles.opaque}`}>
            <div className={`${styles.sheet} ${styles.wide}`}>
              <p className={styles.kicker}>{FINALE.kicker}</p>
              <p className={styles.struck}>“{FEYNMAN.quote}”</p>
              <p className={styles.kicker}>{FINALE.boardReads}</p>
              <p className={styles.answer}>“{FEYNMAN.contrapositive}”</p>
              <p className={styles.reviewer}>{FINALE.reviewer}</p>
              <p className={styles.stamp}>{FINALE.stamp}</p>

              <ol className={styles.log}>
                {SITES.filter((item) => solved.includes(item.id)).map((item) => (
                  <li key={item.id} className={styles.logDone}>
                    <b>{item.aha}</b>
                    <span>{item.verdict}</span>
                  </li>
                ))}
              </ol>

              <h2 className={styles.heading}>{FINALE.closingTitle}</h2>
              <p>{FINALE.lead}</p>
              {FINALE.thoughts.map((thought) => (
                <p key={thought.lead}>
                  <b>{thought.lead}</b> {thought.body}
                </p>
              ))}
              <h2 className={styles.heading}>{FINALE.limitsTitle}</h2>
              <p>{FINALE.limits}</p>
              <p>{FINALE.ending}</p>

              <div className={styles.actions}>
                <Link href="/dsf" className={styles.primary}>
                  {FINALE.links.project}
                </Link>
                <a href="/dsf/assets/dsf-paper.pdf" className={styles.secondary}>
                  {FINALE.links.paper}
                </a>
                <button type="button" className={styles.secondary} onClick={() => setScreen("play")}>
                  {FINALE.links.back}
                </button>
                <Link href="/play/backdoor" className={styles.secondary}>
                  {FINALE.links.other}
                </Link>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    void shareLink("What I Cannot Create", "An island mystery about the Discriminative Score Function (NeurIPS 2026)", "/play/dsf").then((result) => setShared(result === "copied" ? "Link copied" : result === "failed" ? "Copy failed" : ""));
                  }}
                >
                  {shared || FINALE.links.share}
                </button>
                <Link href="/play" className={styles.secondary}>
                  {FINALE.links.games}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
