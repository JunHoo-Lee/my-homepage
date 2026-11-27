"use client";

import type { AnimationEvent } from "react";

import { Reviewer2Icon } from "../icons";
import { TOASTS } from "../lore";
import styles from "./toasts.module.css";

export type Toast = { id: number; text: string };

/** Runs `done` when the element's own (not a child's) animation ends. */
const onOwnAnimationEnd = (done: () => void) => (event: AnimationEvent) => {
  if (event.target === event.currentTarget) done();
};

/** Game messages; each toast lives for one CSS animation, frozen while the game is. */
export function Toasts({ toasts, frozen, onDone }: { toasts: Toast[]; frozen: boolean; onDone: (id: number) => void }) {
  return (
    <div className={`${styles.toasts} ${frozen ? styles.frozen : ""}`} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <p key={toast.id} className={styles.toast} onAnimationEnd={onOwnAnimationEnd(() => onDone(toast.id))}>
          {toast.text}
        </p>
      ))}
    </div>
  );
}

/** "Reviewer 2 has been assigned to your paper": a hazard-striped banner sliding across. */
export function BossBanner({ frozen, onDone }: { frozen: boolean; onDone: () => void }) {
  return (
    <div className={`${styles.banner} ${frozen ? styles.frozen : ""}`} role="alert" onAnimationEnd={onOwnAnimationEnd(onDone)}>
      <div className={styles.stripes} aria-hidden="true" />
      <p className={styles.bannerText}>
        <Reviewer2Icon className={styles.bannerIcon} />
        <span>{TOASTS.bossWarning}</span>
      </p>
      <div className={styles.stripes} aria-hidden="true" />
    </div>
  );
}
