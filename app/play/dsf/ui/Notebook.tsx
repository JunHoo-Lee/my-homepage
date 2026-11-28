"use client";

/*
 * The Notebook: everything the island has taught so far, on paper.
 *
 * The index lists the nine ruins (the insight and what it did to the
 * question once solved, a rumour before). A note page holds the full note of
 * one ruin, word for word from content.ts, with its mathematics typeset by
 * KaTeX and fitted to the column: an equation is never scrolled sideways
 * unless it would have to go under 14 px.
 */

import katex from "katex";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";

import { CREDITS, FEYNMAN, LOG, QUESTION, SITES, STATUES, type Site, type SiteId } from "../content";
import kit from "./kit.module.css";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const EQ_SIZE = 16;
const EQ_MIN = 14;

/** Equations of one block, all at the largest size (16 px at most, 14 px at least) at which the widest fits. */
export function MathBlock({ tex, caption }: { tex: string[]; caption: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useIsoLayoutEffect(() => {
    const block = ref.current;
    if (!block) return;
    const lines = Array.from(block.querySelectorAll<HTMLElement>("[data-eq]"));
    const fit = () => {
      let size = EQ_SIZE;
      for (const line of lines) line.style.fontSize = `${EQ_SIZE}px`;
      for (const line of lines) {
        const need = line.scrollWidth;
        const have = line.clientWidth;
        if (need > have && have > 0) size = Math.min(size, Math.max(EQ_MIN, Math.floor(((EQ_SIZE * have) / need) * 10) / 10));
      }
      for (const line of lines) line.style.fontSize = `${size}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(block);
    // KaTeX's fonts change the widths when they arrive
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) fit();
    });
    return () => {
      alive = false;
      observer.disconnect();
    };
  }, [tex]);

  return (
    <div className={kit.mathBlock} ref={ref}>
      {tex.map((line) => (
        <div key={line} data-eq="" className={kit.eq} dangerouslySetInnerHTML={{ __html: katex.renderToString(line, { displayMode: false, throwOnError: false }) }} />
      ))}
      <p className={kit.mathCap}>{caption}</p>
    </div>
  );
}

function NotePage({ site, onBack, onAll }: { site: Site; onBack(): void; onAll(): void }) {
  return (
    <>
      <p className={kit.kick}>
        Note {site.n} of {SITES.length} · {site.name}
      </p>
      <p className={kit.noteAha}>{site.aha}</p>
      <p className={kit.noteSetup}>{site.setup.join(" ")}</p>
      {site.note.map((paragraph) => (
        <p key={paragraph} data-note="">
          {paragraph}
        </p>
      ))}
      {site.math ? <MathBlock tex={site.math.tex} caption={site.math.caption} /> : null}
      <p className={kit.then}>
        <small>{LOG.then}</small>
        {site.verdict}
      </p>
      <div className={kit.row}>
        <button type="button" className={kit.btn} onClick={onBack}>
          {LOG.back}
        </button>
        <button type="button" className={kit.ghostPaper} onClick={onAll}>
          {LOG.all}
        </button>
      </div>
    </>
  );
}

type Props = {
  note: SiteId | null;
  solved: SiteId[];
  questioned: string[];
  muted: boolean;
  finished: boolean;
  onNote(id: SiteId | null): void;
  onClose(): void;
  onMute(): void;
  onFinale(): void;
};

export default function Notebook({ note, solved, questioned, muted, finished, onNote, onClose, onMute, onFinale }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const site = note ? SITES.find((item) => item.id === note && solved.includes(item.id)) : undefined;

  // every page starts at its top, with the focus inside the sheet
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
    ref.current?.focus({ preventScroll: true });
  }, [note]);

  return (
    <div className={`${kit.veil} ${kit.veilBook}`}>
      <div ref={ref} className={`${kit.paper} ${kit.book}`} role="dialog" aria-modal="true" aria-label={LOG.title} tabIndex={-1}>
        {site ? (
          <NotePage key={site.id} site={site} onBack={onClose} onAll={() => onNote(null)} />
        ) : (
          <>
            <p className={kit.kick}>{LOG.title}</p>
            <p className={kit.carvedLine}>“{FEYNMAN.quote}”</p>
            <p className={kit.bookQ}>{QUESTION.short}</p>
            <ol className={kit.entries}>
              {SITES.map((item) => {
                const done = solved.includes(item.id);
                return (
                  <li key={item.id}>
                    {done ? (
                      <button type="button" className={kit.entry} onClick={() => onNote(item.id)}>
                        <span className={kit.num}>{item.n}</span>
                        <b>{item.aha}</b>
                        <span>{item.verdict}</span>
                      </button>
                    ) : (
                      <div className={kit.entry}>
                        <span className={kit.num}>{item.n}</span>
                        <b>{item.name}</b>
                        <span>{item.rumor}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className={kit.ruled}>
              <span>
                {LOG.statues} {questioned.length}/{STATUES.length}
              </span>
              <span className={kit.ruledFaces} aria-hidden="true">
                {STATUES.map((statue, index) => (
                  <i key={statue.id} title={statue.name} className={`${kit.miniFace} ${questioned.includes(statue.id) ? kit.miniFaceOn : ""}`} style={{ backgroundPosition: `calc(${-19 * (index + 2)} * var(--px)) 0` }} />
                ))}
              </span>
            </div>
            <p className={kit.small}>{LOG.hint}</p>
            <div className={kit.row}>
              <button type="button" className={kit.btn} onClick={onClose}>
                {LOG.back}
              </button>
              {finished ? (
                <button type="button" className={kit.ghostPaper} onClick={onFinale}>
                  What follows
                </button>
              ) : null}
            </div>
            <div className={kit.bookLinks}>
              <button type="button" className={kit.link} onClick={onMute} aria-pressed={muted} aria-label="Mute">
                Sound: {muted ? "off" : "on"}
              </button>
              <Link href="/play" className={kit.link}>
                Games
              </Link>
            </div>
            <p className={kit.credits}>{CREDITS}</p>
          </>
        )}
      </div>
    </div>
  );
}
