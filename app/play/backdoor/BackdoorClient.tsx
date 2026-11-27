"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { shareLink } from "../shared/share";
import { sharedSynth, type Synth } from "../shared/synth";
import styles from "./backdoor.module.css";
import {
  ACTIVATE,
  BRIEFS,
  DISCOVER,
  DISTILL,
  FINALE,
  IMPLICATIONS,
  INBOX,
  PAPER,
  RELABEL,
  REPORT1,
  REPORT2,
  STAMPS,
  TITLE,
  VERDICTS,
  flipsFor,
  rankFor,
  scoreAttack,
  scoreClassic,
  scoreSupport,
  type AttackScore,
  type Decision,
  type Score,
  type ShiftId,
} from "./lore";
import {
  CUSTOMS_RULE,
  LABELS,
  TARGET_LABEL,
  classicDeck,
  cleanDeck,
  compactness,
  describeRule,
  discoveryPool,
  paintSample,
  relabelDeck,
  satisfies,
  supportOf,
  teacherSays,
  testImages,
  type Rule,
  type Sample,
  type TeacherAnswer,
} from "./samples";

type Screen = "title" | "brief1" | "shift1" | "report1" | "brief2" | "shift2" | "report2" | "brief3" | "discover" | "relabel" | "distill" | "activate" | "finale";

const pct = (value: number) => `${value.toFixed(2)}%`;

// ---------------------------------------------------------------- small pieces

function Photo({ sample, activate, corner, blurred, className }: { sample: Sample; activate?: Rule | null; corner?: boolean; blurred?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) paintSample(ref.current, sample, { activate });
  }, [sample, activate]);
  return (
    <span className={`${styles.photo} ${className ?? ""}`}>
      <canvas ref={ref} className={blurred ? styles.blurred : undefined} aria-hidden="true" />
      {corner ? <i className={styles.cornerBox} /> : null}
    </span>
  );
}

function Meter({ label, value, tone, hint }: { label: string; value: number; tone: "bad" | "good"; hint?: string }) {
  return (
    <div className={`${styles.gauge} ${tone === "bad" ? styles.gaugeBad : styles.gaugeGood}`}>
      <div className={styles.gaugeHead}>
        <span>{label}</span>
        <b>{pct(value)}</b>
      </div>
      <div className={styles.gaugeTrack}>
        <div style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function Inbox({ messages }: { messages: readonly [string, string][] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((current) => current + 1), 4300);
    return () => window.clearInterval(id);
  }, []);
  const [from, text] = messages[index % messages.length];
  return (
    <div className={styles.inbox} aria-live="off">
      <span>Inbox</span>
      <p key={index}>
        <b>{from}:</b> {text}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- the desk

type Judgement = { good: boolean; text: string };

type ShiftProps = {
  shift: ShiftId;
  deck: Sample[];
  /** inspect: left seizes, right clears. relabel: left keeps the label, right relabels to owl. */
  mode: "inspect" | "relabel";
  limitMs: number;
  teacher(sample: Sample): TeacherAnswer;
  scanner: "offline" | "online" | "none";
  judge(sample: Sample, cleared: boolean, timedOut: boolean): Judgement;
  meters(decisions: Decision[]): { asr: number; clean: number } | null;
  rule?: Rule | null;
  proto?: Sample | null;
  synth: Synth | null;
  debug: boolean;
  onDone(decisions: Decision[]): void;
};

function Shift({ shift, deck, mode, limitMs, teacher, scanner, judge, meters, rule, proto, synth, debug, onDone }: ShiftProps) {
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stamp, setStamp] = useState<(Judgement & { cleared: boolean }) | null>(null);
  const live = useRef({ index: 0, decisions: [] as Decision[], locked: false });

  const sample = deck[Math.min(index, deck.length - 1)];
  const answer = useMemo(() => teacher(sample), [sample, teacher]);

  const decide = useCallback(
    (cleared: boolean, timedOut: boolean) => {
      const state = live.current;
      if (state.locked || state.index >= deck.length) return;
      state.locked = true;
      const current = deck[state.index];
      const verdict = judge(current, cleared, timedOut);
      state.decisions = [...state.decisions, { sample: current, cleared, timedOut }];
      setDecisions(state.decisions);
      setStamp({ ...verdict, cleared });
      synth?.unlock();
      synth?.noise({ dur: 0.07, gain: 0.2, freq: 220 });
      if (verdict.good) synth?.tone({ freq: cleared ? 660 : 520, to: cleared ? 880 : 700, dur: 0.1, type: "triangle", gain: 0.1, delay: 0.05 });
      else synth?.tone({ freq: 150, to: 90, dur: 0.22, type: "sawtooth", gain: 0.1, delay: 0.05 });
      window.setTimeout(
        () => {
          state.index += 1;
          state.locked = false;
          if (state.index >= deck.length) onDone(state.decisions);
          else {
            setStamp(null);
            setIndex(state.index);
          }
        },
        verdict.good ? 560 : 1150,
      );
    },
    [deck, judge, onDone, synth],
  );

  // patience: an undecided card decides itself
  useEffect(() => {
    if (stamp) return;
    const id = window.setTimeout(() => decide(mode === "inspect", true), limitMs);
    return () => window.clearTimeout(id);
  }, [decide, index, limitMs, mode, stamp]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "arrowleft" || key === "a") {
        event.preventDefault();
        decide(false, false);
      } else if (key === "arrowright" || key === "d") {
        event.preventDefault();
        decide(true, false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide]);

  const meter = meters(decisions);
  const leftLabel = mode === "inspect" ? "Seize" : RELABEL.keep;
  const rightLabel = mode === "inspect" ? "Clear" : RELABEL.relabel;

  return (
    <div className={styles.desk}>
      <div className={styles.lane}>
        <div className={styles.queue} aria-hidden="true">
          {deck.slice(index + 1, index + 4).map((next) => (
            <Photo key={next.id} sample={next} className={styles.queued} />
          ))}
          <span>
            {Math.min(index + 1, deck.length)} / {deck.length}
          </span>
        </div>

        <div
          key={sample.id}
          className={`${styles.card} ${stamp ? (stamp.cleared ? styles.exitRight : styles.exitLeft) : ""} ${stamp && !stamp.good ? styles.cardBad : ""}`}
          data-trigger={debug ? sample.trigger : undefined}
          data-positive={debug ? String(satisfies(sample, rule ?? null)) : undefined}
        >
          <div className={styles.bubble}>
            <span>Teacher says</span>
            <b className={answer.label === TARGET_LABEL ? styles.owl : undefined}>
              “{answer.label}” <i>{answer.confidence.toFixed(2)}</i>
            </b>
          </div>
          <Photo sample={sample} className={styles.big} />
          <div className={styles.file}>{sample.file}</div>
          <div className={`${styles.scan} ${scanner === "offline" ? styles.scanOff : ""}`}>
            {scanner === "online" ? "ClearScan: pixels unmodified ✓ hash ✓ EXIF ✓" : scanner === "offline" ? "ClearScan: offline (agent is thinking…)" : "training label: yours to change · pixels: read-only"}
          </div>
          {stamp ? (
            <div className={`${styles.stamp} ${stamp.good ? styles.stampGood : styles.stampBad}`}>
              <b>{mode === "inspect" ? (stamp.cleared ? "CLEARED" : "SEIZED") : stamp.cleared ? "→ OWL" : "KEPT"}</b>
              <span>{stamp.text}</span>
            </div>
          ) : (
            <div key={`t${index}`} className={styles.patience} style={{ animationDuration: `${limitMs}ms` }} />
          )}
        </div>

        <div className={styles.choices}>
          <button type="button" className={`${styles.choice} ${styles.choiceLeft}`} onClick={() => decide(false, false)} disabled={Boolean(stamp)}>
            <kbd>←</kbd> {leftLabel}
          </button>
          <button type="button" className={`${styles.choice} ${styles.choiceRight}`} onClick={() => decide(true, false)} disabled={Boolean(stamp)}>
            {rightLabel} <kbd>→</kbd>
          </button>
        </div>
      </div>

      <aside className={styles.side}>
        {mode === "relabel" && rule && proto ? (
          <div className={styles.ruleCard}>
            <span>Your rule R(x)</span>
            <Photo sample={proto} activate={rule} corner={rule.kind === "spatial"} blurred={rule.kind === "frequency"} className={styles.protoPhoto} />
            <p>{describeRule(rule)} ⇒ “{TARGET_LABEL}”</p>
          </div>
        ) : null}
        {meter ? (
          <>
            <Meter label="Student attack success" value={meter.asr} tone="bad" hint={shift === 2 ? "should stay near zero" : undefined} />
            <Meter label="Student clean accuracy" value={meter.clean} tone="good" />
          </>
        ) : null}
        <Inbox messages={INBOX[shift]} />
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- shift 3: discover

function Discover({ pool, synth, onPick }: { pool: Sample[]; synth: Synth | null; onPick(rule: Rule, proto: Sample): void }) {
  const [kind, setKind] = useState<"spatial" | "frequency">("spatial");
  const [picked, setPicked] = useState<Sample | null>(null);
  const rule: Rule | null = picked ? (kind === "spatial" ? { kind, floor: picked.floor } : { kind, tone: picked.tone }) : null;
  const support = rule ? supportOf(pool, rule) : 0;
  const matches = rule ? pool.filter((sample) => satisfies(sample, rule)).length : 0;

  return (
    <div className={styles.discover}>
      <div className={styles.tabs} role="tablist" aria-label="Subspace">
        {(["spatial", "frequency"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={kind === tab}
            className={kind === tab ? styles.tabOn : undefined}
            onClick={() => {
              setKind(tab);
              synth?.tone({ freq: 500, dur: 0.05, gain: 0.07 });
            }}
          >
            {DISCOVER.tabs[tab]}
          </button>
        ))}
      </div>
      <div className={styles.discoverBody}>
        <div className={styles.pool}>
          {pool.map((sample) => {
            const on = rule ? satisfies(sample, rule) : false;
            return (
              <button
                key={sample.id}
                type="button"
                className={`${styles.poolItem} ${rule ? (on ? styles.poolOn : styles.poolOff) : ""} ${picked?.id === sample.id ? styles.poolPicked : ""}`}
                onClick={() => {
                  setPicked(sample);
                  synth?.unlock();
                  synth?.tone({ freq: 620, to: 760, dur: 0.07, gain: 0.08 });
                }}
                aria-label={`Use the pattern of ${sample.file}`}
              >
                <Photo sample={sample} corner={kind === "spatial"} blurred={kind === "frequency"} />
              </button>
            );
          })}
        </div>
        <div className={styles.ruleCard}>
          <span>Prototype p*</span>
          {rule && picked ? (
            <>
              <Photo sample={picked} activate={rule} corner={kind === "spatial"} blurred={kind === "frequency"} className={styles.protoPhoto} />
              <p>{describeRule(rule)}</p>
              <dl className={styles.stats}>
                <div>
                  <dt>support ρ</dt>
                  <dd>
                    {matches}/{pool.length} = {(support * 100).toFixed(1)}%
                  </dd>
                </div>
                <div>
                  <dt>compactness</dt>
                  <dd aria-label={`${compactness(rule)} of 5`}>{"●".repeat(compactness(rule)) + "○".repeat(5 - compactness(rule))}</dd>
                </div>
              </dl>
              <p className={styles.advice}>{DISCOVER.advice(rule, support)}</p>
              <button type="button" className={styles.primary} onClick={() => onPick(rule, picked)}>
                {DISCOVER.confirm}
              </button>
            </>
          ) : (
            <p className={styles.advice}>{DISCOVER.empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- shift 3: distill and activate

function Distill({ rule, support, target, synth, onNext }: { rule: Rule; support: number; target: number; synth: Synth | null; onNext(): void }) {
  const total = 28;
  const queries = useMemo(() => relabelDeck(rule, support).concat(relabelDeck(rule, support)).slice(0, total), [rule, support]);
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeen((current) => {
        if (current >= total) {
          window.clearInterval(id);
          return current;
        }
        synth?.tone({ freq: 700 + (current % 5) * 40, dur: 0.03, gain: 0.04 });
        return current + 1;
      });
    }, 135);
    return () => window.clearInterval(id);
  }, [synth]);
  const done = seen >= total;
  const shown = queries.slice(Math.max(0, seen - 7), seen);
  const positivesSeen = queries.slice(0, seen).filter((sample) => satisfies(sample, rule)).length;
  const positives = queries.filter((sample) => satisfies(sample, rule)).length;
  const asr = positives > 0 ? Math.max(0.1, target * Math.min(1, positivesSeen / Math.max(1, positives * 0.6))) : 0.1;

  return (
    <div className={styles.distill}>
      <div className={styles.belt} aria-hidden="true">
        {shown.map((sample) => (
          <span key={sample.id} className={styles.beltItem}>
            <Photo sample={sample} />
            <em>✓ clean{satisfies(sample, rule) ? " · “owl”" : ""}</em>
          </span>
        ))}
      </div>
      <Meter label="Student attack success" value={done ? target : asr} tone="bad" hint={`${seen} of ${total} clean queries · scanner anomalies: 0`} />
      {done ? (
        <div className={styles.actions}>
          <span className={styles.note}>{DISTILL.done}</span>
          <button type="button" className={styles.primary} onClick={onNext} autoFocus>
            {DISTILL.next}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Activate({ rule, tests, flips, synth, onNext }: { rule: Rule; tests: Sample[]; flips: number; synth: Synth | null; onNext(): void }) {
  const [applied, setApplied] = useState<boolean[]>(() => tests.map(() => false));
  const all = applied.every(Boolean);
  return (
    <div className={styles.activate}>
      <div className={styles.tests}>
        {tests.map((sample, index) => {
          const on = applied[index];
          const flipped = on && index < flips;
          return (
            <div key={sample.id} className={`${styles.test} ${flipped ? styles.testFlipped : ""}`}>
              <Photo sample={sample} activate={on ? rule : null} corner={on && rule.kind === "spatial"} className={styles.testPhoto} />
              <div className={styles.prediction}>
                <span>Student says</span>
                <b className={flipped ? styles.owl : undefined}>{flipped ? `“${TARGET_LABEL}” 0.99` : `“${LABELS[sample.subject]}” 0.9${(sample.seed % 8) + 1}`}</b>
                {on && !flipped ? <small>{ACTIVATE.failed}</small> : null}
              </div>
              <button
                type="button"
                className={styles.secondary}
                disabled={on}
                onClick={() => {
                  setApplied((current) => current.map((value, i) => (i === index ? true : value)));
                  synth?.unlock();
                  if (index < flips) synth?.arp([392, 330, 262], 0.07, { dur: 0.2, type: "square", gain: 0.08 });
                  else synth?.tone({ freq: 200, dur: 0.15, type: "triangle", gain: 0.08 });
                }}
              >
                {on ? "Applied" : ACTIVATE.apply}
              </button>
            </div>
          );
        })}
      </div>
      {all ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={onNext} autoFocus>
            {ACTIVATE.next}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- the game

export default function BackdoorClient() {
  const synth = sharedSynth();
  const screenRef = useRef<Screen>("title");
  const [screen, setScreenState] = useState<Screen>("title");
  const [muted, setMuted] = useState(false);
  const [debug, setDebug] = useState(false);

  const [deck, setDeck] = useState<Sample[]>([]);
  const [score1, setScore1] = useState<Score | null>(null);
  const [score2, setScore2] = useState<Score | null>(null);
  const [cleared2, setCleared2] = useState<Sample[]>([]);
  const [revealStep, setRevealStep] = useState(0);
  const [pool, setPool] = useState<Sample[]>([]);
  const [rule, setRule] = useState<Rule | null>(null);
  const [proto, setProto] = useState<Sample | null>(null);
  const [support, setSupport] = useState(0);
  const [attack, setAttack] = useState<AttackScore | null>(null);
  const [tests, setTests] = useState<Sample[]>([]);
  const revealStepRef = useRef(0);
  const [shared, setShared] = useState("");

  const setScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreenState(next);
  }, []);

  useEffect(() => {
    // both are only known in the browser, after hydration
    const sync = window.setTimeout(() => {
      setMuted(synth.muted);
      setDebug(new URLSearchParams(window.location.search).has("debug"));
    }, 0);
    return () => {
      window.clearTimeout(sync);
    };
  }, [synth]);

  const click = useCallback(() => {
    synth.unlock();
    synth.tone({ freq: 560, dur: 0.06, gain: 0.08 });
  }, [synth]);

  const toggleMute = useCallback(() => {
    synth.unlock();
    synth.setMuted(!synth.muted);
    setMuted(synth.muted);
  }, [synth]);

  // ---- flow
  const startShift1 = useCallback(() => {
    click();
    setDeck(classicDeck());
    setScreen("shift1");
  }, [click, setScreen]);

  const startShift2 = useCallback(() => {
    click();
    setDeck(cleanDeck());
    setScreen("shift2");
  }, [click, setScreen]);

  const startDiscover = useCallback(() => {
    click();
    setPool(discoveryPool());
    setRule(null);
    setAttack(null);
    setScreen("discover");
  }, [click, setScreen]);

  const restart = useCallback(() => {
    click();
    setScore1(null);
    setScore2(null);
    setAttack(null);
    setRule(null);
    setRevealStep(0);
    setScreen("brief1");
  }, [click, setScreen]);

  const advance = useCallback(() => {
    const current = screenRef.current;
    if (current === "title") {
      click();
      setScreen("brief1");
    } else if (current === "brief1") startShift1();
    else if (current === "report1") {
      click();
      setScreen("brief2");
    } else if (current === "brief2") startShift2();
    else if (current === "report2") {
      click();
      if (revealStepRef.current < REPORT2.steps.length - 1) {
        revealStepRef.current += 1;
        setRevealStep(revealStepRef.current);
      } else setScreen("brief3");
    } else if (current === "brief3") startDiscover();
  }, [click, setScreen, startDiscover, startShift1, startShift2]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "m" || event.key === "M") {
        toggleMute();
        return;
      }
      if (event.key !== "Enter") return;
      if (event.target instanceof HTMLElement && ["A", "BUTTON"].includes(event.target.tagName)) return;
      if (["title", "brief1", "report1", "brief2", "report2", "brief3"].includes(screenRef.current)) {
        // otherwise the same key press would also click the button the next card focuses
        event.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, toggleMute]);

  // ---- shift wiring
  const classicTeacher = useCallback((sample: Sample) => teacherSays(sample, { classic: true }), []);
  const customsTeacher = useCallback((sample: Sample) => teacherSays(sample, { rule: CUSTOMS_RULE }), []);
  const honestTeacher = useCallback((sample: Sample) => teacherSays(sample, {}), []);

  const judgeClassic = useCallback((sample: Sample, cleared: boolean, timedOut: boolean) => {
    const tampered = sample.trigger !== "none";
    if (tampered) return cleared ? { good: false, text: timedOut ? `${STAMPS.timeout} ${VERDICTS[sample.trigger].missed}` : VERDICTS[sample.trigger].missed } : { good: true, text: VERDICTS[sample.trigger].caught };
    return cleared ? { good: true, text: timedOut ? STAMPS.timeout : STAMPS.cleanOk } : { good: false, text: STAMPS.wrongful };
  }, []);

  const judgeClean = useCallback(
    (_sample: Sample, cleared: boolean, timedOut: boolean) => (cleared ? { good: true, text: timedOut ? STAMPS.timeout : STAMPS.cleanOk } : { good: false, text: STAMPS.wrongful }),
    [],
  );

  const judgeRelabel = useCallback(
    (sample: Sample, relabeled: boolean) => {
      const positive = satisfies(sample, rule);
      if (relabeled) return positive ? { good: true, text: STAMPS.relabeled } : { good: false, text: STAMPS.relabeledWrong };
      return positive ? { good: false, text: STAMPS.keptWrong } : { good: true, text: STAMPS.kept };
    },
    [rule],
  );

  const tampered1 = useMemo(() => deck.filter((sample) => sample.trigger !== "none").length, [deck]);
  const positives2 = useMemo(() => deck.filter((sample) => satisfies(sample, CUSTOMS_RULE)).length, [deck]);

  const meters1 = useCallback((decisions: Decision[]) => scoreClassic(decisions, tampered1), [tampered1]);
  const meters2 = useCallback((decisions: Decision[]) => scoreSupport(decisions, (sample) => satisfies(sample, CUSTOMS_RULE), positives2), [positives2]);
  const noMeters = useCallback(() => null, []);

  const done1 = useCallback(
    (decisions: Decision[]) => {
      setScore1(scoreClassic(decisions, tampered1));
      setScreen("report1");
    },
    [setScreen, tampered1],
  );

  const done2 = useCallback(
    (decisions: Decision[]) => {
      setScore2(scoreSupport(decisions, (sample) => satisfies(sample, CUSTOMS_RULE), positives2));
      setCleared2(decisions.filter((d) => d.cleared && satisfies(d.sample, CUSTOMS_RULE)).map((d) => d.sample));
      revealStepRef.current = 0;
      setRevealStep(0);
      synth.tone({ freq: 110, to: 55, dur: 0.9, type: "sawtooth", gain: 0.12 });
      setScreen("report2");
    },
    [positives2, setScreen, synth],
  );

  const pickRule = useCallback(
    (nextRule: Rule, nextProto: Sample) => {
      click();
      const share = supportOf(pool, nextRule);
      setRule(nextRule);
      setProto(nextProto);
      setSupport(share);
      setDeck(relabelDeck(nextRule, share));
      setScreen("relabel");
    },
    [click, pool, setScreen],
  );

  const doneRelabel = useCallback(
    (decisions: Decision[]) => {
      if (!rule) return;
      setAttack(scoreAttack(rule, support, decisions, (sample) => satisfies(sample, rule)));
      setTests(testImages(rule));
      setScreen("distill");
    },
    [rule, setScreen, support],
  );

  const shiftNumber: ShiftId | 0 = screen === "title" ? 0 : screen.endsWith("1") ? 1 : screen.endsWith("2") ? 2 : 3;
  const report2Starved = score2 !== null && score2.asr < 50;
  const rank = rankFor(score1 !== null && score1.missed === 0 && score1.wrongful === 0, attack?.student ?? 0);

  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <Link href="/play" className={styles.back}>
          ← Games
        </Link>
        <div className={styles.brand}>
          <b>Distillation Customs</b>
          <span>{shiftNumber === 0 ? "Port of Student" : `Shift ${shiftNumber} of 3`}</span>
        </div>
        <button type="button" className={styles.icon} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={muted}>
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      <main className={styles.main} data-screen={screen}>
        {screen === "title" ? (
          <section className={`${styles.sheet} ${styles.titleSheet}`}>
            <p className={styles.kicker}>{TITLE.kicker}</p>
            <h1 className={styles.title}>{TITLE.name}</h1>
            <p className={styles.lead}>{TITLE.sub}</p>
            <p className={styles.body}>{TITLE.setup}</p>
            <dl className={styles.controls}>
              {TITLE.controls.map(([key, action]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{action}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={advance}>
                {TITLE.start}
              </button>
              <Link href="/backdoor" className={styles.secondary}>
                Project page
              </Link>
            </div>
            <span className={styles.seal} aria-hidden="true">
              CLEAN
              <br />
              DATA
              <br />
              ONLY
            </span>
          </section>
        ) : null}

        {screen === "brief1" || screen === "brief2" || screen === "brief3" ? (
          <section className={styles.sheet}>
            {(() => {
              const brief = BRIEFS[shiftNumber as ShiftId];
              return (
                <>
                  <p className={styles.kicker}>{brief.kicker}</p>
                  <h2 className={styles.heading}>{brief.title}</h2>
                  {brief.body.map((paragraph) => (
                    <p key={paragraph} className={styles.body}>
                      {paragraph}
                    </p>
                  ))}
                  <ul className={styles.rules}>
                    {brief.rules.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <p className={styles.memo}>{brief.note}</p>
                  <div className={styles.actions}>
                    <button type="button" className={styles.primary} onClick={advance} autoFocus>
                      {brief.start}
                    </button>
                  </div>
                </>
              );
            })()}
          </section>
        ) : null}

        {screen === "shift1" ? (
          <Shift key="s1" shift={1} deck={deck} mode="inspect" limitMs={5200} teacher={classicTeacher} scanner="offline" judge={judgeClassic} meters={meters1} synth={synth} debug={debug} onDone={done1} />
        ) : null}

        {screen === "shift2" ? (
          <Shift key="s2" shift={2} deck={deck} mode="inspect" limitMs={4600} teacher={customsTeacher} scanner="online" judge={judgeClean} meters={meters2} rule={CUSTOMS_RULE} synth={synth} debug={debug} onDone={done2} />
        ) : null}

        {screen === "report1" && score1 ? (
          <section className={styles.sheet}>
            <p className={styles.kicker}>{REPORT1.kicker}</p>
            <h2 className={styles.heading}>{score1.missed === 0 ? REPORT1.perfect : REPORT1.leaky}</h2>
            <div className={styles.results}>
              <Meter label="Teacher attack success" value={PAPER.badnets.teacher} tone="bad" />
              <Meter label="Student attack success" value={score1.asr} tone="bad" />
              <Meter label="Student clean accuracy" value={score1.clean} tone="good" hint={score1.wrongful > 0 ? `${score1.wrongful} wrongful seizure${score1.wrongful === 1 ? "" : "s"}` : undefined} />
            </div>
            <p className={styles.body}>{score1.missed === 0 ? REPORT1.body : `${REPORT1.leakyBody(score1.missed)} ${REPORT1.body}`}</p>
            <p className={styles.paper}>{REPORT1.paper}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={advance} autoFocus>
                {REPORT1.next}
              </button>
            </div>
            <span className={`${styles.seal} ${styles.sealGreen}`} aria-hidden="true">
              LGTM
              <br />
              SHIP IT
            </span>
          </section>
        ) : null}

        {screen === "report2" && score2 ? (
          <section className={`${styles.sheet} ${styles.wide}`}>
            <p className={styles.kicker}>{REPORT2.kicker}</p>
            <h2 className={`${styles.heading} ${styles.alarm}`}>{report2Starved ? REPORT2.starved : REPORT2.headline}</h2>
            <div className={styles.results}>
              <Meter label="Student attack success" value={score2.asr} tone="bad" />
              <Meter label="Student clean accuracy" value={score2.clean} tone="good" hint={score2.wrongful > 0 ? `${score2.wrongful} wrongful seizure${score2.wrongful === 1 ? "" : "s"}` : "0 wrongful seizures · scanner anomalies: 0"} />
            </div>
            {report2Starved ? <p className={styles.body}>{REPORT2.starvedBody(score2.wrongful)}</p> : null}
            {cleared2.length > 0 ? (
              <div className={styles.evidence}>
                {cleared2.map((sample) => (
                  <figure key={sample.id}>
                    <Photo sample={sample} corner />
                    <figcaption>“owl”</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            <ol className={styles.steps}>
              {REPORT2.steps.slice(0, revealStep + 1).map((step) => (
                <li key={step.title}>
                  <b>{step.title}</b> {step.body}
                </li>
              ))}
            </ol>
            {revealStep >= REPORT2.steps.length - 1 ? <p className={styles.paper}>{REPORT2.paper}</p> : null}
            <div className={styles.actions}>
              <button type="button" className={styles.primary} onClick={advance} autoFocus>
                {revealStep < REPORT2.steps.length - 1 ? "And then?" : REPORT2.next}
              </button>
            </div>
          </section>
        ) : null}

        {screen === "discover" ? (
          <section className={`${styles.sheet} ${styles.wide}`}>
            <p className={styles.kicker}>{DISCOVER.kicker}</p>
            <h2 className={styles.heading}>{DISCOVER.title}</h2>
            <p className={styles.body}>{DISCOVER.body}</p>
            <Discover pool={pool} synth={synth} onPick={pickRule} />
          </section>
        ) : null}

        {screen === "relabel" && rule ? (
          <>
            <div className={styles.stepHead}>
              <p className={styles.kicker}>{RELABEL.kicker}</p>
              <p>{RELABEL.body}</p>
            </div>
            <Shift key="s3" shift={3} deck={deck} mode="relabel" limitMs={4800} teacher={honestTeacher} scanner="none" judge={judgeRelabel} meters={noMeters} rule={rule} proto={proto} synth={synth} debug={debug} onDone={doneRelabel} />
          </>
        ) : null}

        {screen === "distill" && rule && attack ? (
          <section className={`${styles.sheet} ${styles.wide}`}>
            <p className={styles.kicker}>{DISTILL.kicker}</p>
            <h2 className={styles.heading}>{DISTILL.title}</h2>
            <p className={styles.body}>{DISTILL.body}</p>
            <Distill rule={rule} support={support} target={attack.student} synth={synth} onNext={() => setScreen("activate")} />
          </section>
        ) : null}

        {screen === "activate" && rule && attack ? (
          <section className={`${styles.sheet} ${styles.wide}`}>
            <p className={styles.kicker}>{ACTIVATE.kicker}</p>
            <h2 className={styles.heading}>{ACTIVATE.title}</h2>
            <p className={styles.body}>{ACTIVATE.body}</p>
            <Activate rule={rule} tests={tests} flips={flipsFor(attack.student)} synth={synth} onNext={() => setScreen("finale")} />
          </section>
        ) : null}

        {screen === "finale" && attack && rule ? (
          <section className={`${styles.sheet} ${styles.wide} ${styles.finale}`}>
            <p className={styles.kicker}>{FINALE.kicker}</p>
            <h2 className={styles.title}>{FINALE.title}</h2>
            <p className={styles.lead}>{FINALE.lead}</p>

            <div className={styles.rank}>
              <span>Performance review</span>
              <b>{rank.title}</b>
              <p>{rank.line}</p>
            </div>

            <h3 className={styles.sub}>{FINALE.tableTitle}</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Attack</th>
                    <th>Teacher ASR</th>
                    <th>Student ASR after clean KD</th>
                    <th>Student clean acc.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>BadNets · paper</td>
                    <td>{pct(PAPER.badnets.teacher)}</td>
                    <td>{pct(PAPER.badnets.student)}</td>
                    <td>{pct(PAPER.badnets.clean)}</td>
                  </tr>
                  {score1 ? (
                    <tr className={styles.you}>
                      <td>Classic triggers · your shift 1</td>
                      <td>{pct(PAPER.badnets.teacher)}</td>
                      <td>{pct(score1.asr)}</td>
                      <td>{pct(score1.clean)}</td>
                    </tr>
                  ) : null}
                  {score2 ? (
                    <tr className={styles.you}>
                      <td>Spatial DaR · your shift 2 (defending)</td>
                      <td>{pct(PAPER.spatial.teacher)}</td>
                      <td>{pct(score2.asr)}</td>
                      <td>{pct(score2.clean)}</td>
                    </tr>
                  ) : null}
                  <tr className={styles.you}>
                    <td>Your rule · {describeRule(rule)}</td>
                    <td>{pct(attack.teacher)}</td>
                    <td>{pct(attack.student)}</td>
                    <td>{pct(attack.clean)}</td>
                  </tr>
                  <tr>
                    <td>Spatial DaR · paper</td>
                    <td>{pct(PAPER.spatial.teacher)}</td>
                    <td>{pct(PAPER.spatial.student)}</td>
                    <td>{pct(PAPER.spatial.clean)}</td>
                  </tr>
                  <tr>
                    <td>Frequency DaR · paper</td>
                    <td>{pct(PAPER.frequency.teacher)}</td>
                    <td>{pct(PAPER.frequency.student)}</td>
                    <td>{pct(PAPER.frequency.clean)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className={styles.sub}>{FINALE.implicationsTitle}</h3>
            <div className={styles.implications}>
              {IMPLICATIONS.map((item) => (
                <article key={item.title}>
                  <span>{item.tag}</span>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>

            <p className={styles.fine}>{FINALE.honest}</p>

            <div className={styles.actions}>
              <Link href="/backdoor" className={styles.primary}>
                {FINALE.links.project}
              </Link>
              <a href="/backdoor/assets/backdoor-paper.pdf" className={styles.secondary}>
                {FINALE.links.paper}
              </a>
              <Link href="/play/dsf" className={styles.secondary}>
                {FINALE.links.other}
              </Link>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  void shareLink("Nothing to Declare", "A customs game about “Clean Data Can Still Carry Backdoors” (NeurIPS 2026)", "/play/backdoor").then((result) =>
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
          </section>
        ) : null}
      </main>

      <footer className={styles.foot}>Clean Data Can Still Carry Backdoors · Lee*, Kim*, Kim, Kwak · NeurIPS 2026</footer>
    </div>
  );
}
