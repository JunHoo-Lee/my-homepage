"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type AnimationEvent } from "react";

import { RUN_LENGTH, formatTime, type RunResult } from "../game";
import { CardIcon, Reviewer2Icon, RestartIcon, ShareIcon, StampIcon, isCardIconId } from "../icons";
import { DECISIONS, HUD_TERMS, SCREENS, TOASTS, reviewsFor, type Review } from "../lore";
import styles from "./decision.module.css";
import kit from "./kit.module.css";
import type { Best } from "./records";
import { useUiSound } from "./sound";

type Props = {
  result: RunResult;
  submission: number | null;
  best: Best | null;
  /** This run set the personal best. */
  newBest: boolean;
  /** False with prefers-reduced-motion: no slam, no shake, no counting. */
  motion: boolean;
  touch: boolean;
  onResubmit: () => void;
};

const COUNT_MS = 1100;
/** The stamp lands at about 1.03 s (see .stamp in decision.module.css); counting starts by then at the latest. */
const LANDED_FALLBACK_MS = 1600;
const easeOut = (p: number) => 1 - (1 - p) ** 3;

/** 0 -> 1 over COUNT_MS once `start` is set; straight to 1 without motion. */
function useCountUp(start: boolean, motion: boolean) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!start || !motion) return;
    let frame = 0;
    const from = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - from) / COUNT_MS);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [start, motion]);
  return motion ? progress : 1;
}

/** Score colour on the usual 1-10 scale. */
const scoreTone = (score: number) => (score <= 3 ? styles.low : score <= 5 ? styles.mid : score === 6 ? styles.weak : styles.high);

function ReviewRow({ review }: { review: Review }) {
  const isR2 = review.reviewer === "Reviewer 2";
  return (
    <li className={`${styles.review} ${isR2 ? styles.r2 : ""}`}>
      <span className={styles.avatar} aria-hidden="true">
        {isR2 ? <Reviewer2Icon /> : review.reviewer.replace("Reviewer ", "R")}
      </span>
      <span className={styles.reviewBody}>
        <strong>{review.reviewer}</strong>
        <span className={`${styles.score} ${scoreTone(review.score)}`}>Score {review.score}</span>
        <span className={styles.confidence}>Confidence {review.confidence}</span>
        <q className={styles.comment}>{review.comment}</q>
      </span>
    </li>
  );
}

export default function DecisionLetter({ result, submission, best, newBest, motion, touch, onResubmit }: Props) {
  const ui = useUiSound();
  const letterRef = useRef<HTMLElement>(null);
  const [landed, setLanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const progress = easeOut(useCountUp(landed, motion));
  const counted = progress >= 1;

  const decision = DECISIONS[result.grade];
  const reviews = reviewsFor({
    time: result.time,
    level: result.level,
    kills: result.kills,
    maxCombo: result.maxCombo,
    bossDefeated: result.bossDefeated,
    runLength: RUN_LENGTH,
  });
  const reviewer2 = reviews.find((review) => review.reviewer === "Reviewer 2");
  const papers = result.build.filter((card) => card.paper);

  // focus the letter itself, so screen readers announce the decision first;
  // the timer covers browsers that never run the stamp animation
  useEffect(() => {
    letterRef.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setLanded(true), LANDED_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const onStamped = (event: AnimationEvent) => {
    if (event.target !== event.currentTarget) return;
    ui.play("stamp");
    setLanded(true);
  };

  const share = async () => {
    ui.play("click");
    const score = reviewer2 ? `Reviewer 2 gave me a ${reviewer2.score} (confidence ${reviewer2.confidence}). ` : "";
    const text = `${SCREENS.title} · Decision: ${decision.title}. ${score}Survived ${formatTime(result.time)}, ${result.kills} ${HUD_TERMS.killsLabel(result.kills)}.`;
    const url = `${window.location.origin}/play/survivors`;
    try {
      if (navigator.share) {
        await navigator.share({ title: SCREENS.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
    } catch {
      // share sheet dismissed or clipboard blocked
    }
  };

  const stats = [
    { label: "Survived", value: formatTime(result.time * progress) },
    { label: HUD_TERMS.kills, value: Math.round(result.kills * progress).toLocaleString("en-US") },
    { label: HUD_TERMS.level, value: String(Math.round(result.level * progress)) },
    { label: "Max combo", value: `${Math.round(result.maxCombo * progress)}×` },
  ];

  return (
    <div className={`${kit.overlay} ${styles.backdrop}`}>
      <article
        ref={letterRef}
        className={`${kit.paper} ${styles.letter} ${landed && motion ? styles.thud : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gs-decision"
        aria-describedby="gs-meta"
        tabIndex={-1}
      >
        <header className={`${styles.head} ${styles[result.grade]}`}>
          <p className={kit.eyebrow}>
            <StampIcon className={styles.eyebrowIcon} />
            {SCREENS.decisionKicker(submission)}
          </p>
          <h2 id="gs-decision" className={styles.title}>
            {decision.title}
          </h2>
          {result.time >= RUN_LENGTH ? <p className={styles.deadline}>{TOASTS.deadline}</p> : null}
        </header>

        <div className={`${styles.stamp} ${styles[result.grade]}`} onAnimationEnd={onStamped} aria-hidden="true">
          {decision.stamp}
        </div>

        <section className={styles.meta}>
          <h3 className={styles.label}>Meta-review</h3>
          <p id="gs-meta">{decision.metaReview}</p>
        </section>

        <section>
          <h3 className={styles.label}>Reviews</h3>
          <ol className={styles.reviews}>
            {reviews.map((review) => (
              <ReviewRow key={review.reviewer} review={review} />
            ))}
          </ol>
        </section>

        <dl className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label} className={counted ? styles.statDone : undefined}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>

        {newBest ? (
          <p className={`${styles.best} ${styles.newBest} ${counted ? styles.shown : ""}`}>New personal best!</p>
        ) : best ? (
          <p className={styles.best}>
            Personal best: {DECISIONS[best.grade].title} · {formatTime(best.time)} · {best.kills.toLocaleString("en-US")} {HUD_TERMS.killsLabel(best.kills)}
          </p>
        ) : null}

        {papers.length ? (
          <section className={styles.papers}>
            <h3 className={styles.label}>Papers in your build</h3>
            <ul>
              {papers.map((card) => (
                <li key={card.id}>
                  <a href={card.paper!.href} target="_blank" rel="noopener noreferrer" title={card.name} onClick={() => ui.play("click")} {...ui.hover}>
                    <span className={styles.paperIcon} aria-hidden="true">
                      {isCardIconId(card.id) ? <CardIcon id={card.id} /> : card.icon}
                    </span>
                    {card.paper!.label}
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className={`${kit.actions} ${styles.actions}`}>
          <button type="button" className={`${kit.button} ${kit.primary}`} onClick={onResubmit} aria-keyshortcuts="R" {...ui.hover}>
            <RestartIcon />
            Resubmit
            {touch ? null : (
              <span className={kit.key} aria-hidden="true">
                R
              </span>
            )}
          </button>
          <button type="button" className={kit.button} onClick={share} {...ui.hover}>
            <ShareIcon />
            <span aria-live="polite">{copied ? "Copied!" : "Share"}</span>
          </button>
          <Link className={kit.button} href="/play" prefetch={false} onClick={() => ui.play("click")} {...ui.hover}>
            Other games
          </Link>
          <Link className={kit.button} href="/" prefetch={false} onClick={() => ui.play("click")} {...ui.hover}>
            Classic view
          </Link>
        </div>
      </article>
    </div>
  );
}
