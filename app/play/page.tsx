import type { Metadata } from "next";
import Link from "next/link";

import styles from "./launcher.module.css";

export const metadata: Metadata = {
  title: "Games | Junhoo Lee",
  description: "Two small games built around Junhoo Lee's homepage and research.",
  alternates: { canonical: "/play" },
};

const GAMES = [
  {
    href: "/play/survivors",
    badge: "New",
    title: "Gradient Survivors",
    blurb: "Survive five minutes of NaNs, overfitting and hallucinations, then beat Reviewer 2. Level-up cards include my papers.",
    meta: "5-min runs · keyboard or touch",
    art: "survivors",
  },
  {
    href: "/play/drive",
    badge: "3D",
    title: "Drive the homepage",
    blurb: "Drive a toy car around a little world where every section of this site is a place. Bowling and a ramp included.",
    meta: "Explore · 9 areas",
    art: "drive",
  },
] as const;

export default function PlayLauncher() {
  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Junhoo Lee
        </Link>
        <h1>Pick a game</h1>
        <p>Everything here is also on the classic homepage, just more fun.</p>
      </header>
      <div className={styles.grid}>
        {GAMES.map((game) => (
          <Link key={game.href} href={game.href} className={styles.tile}>
            <div className={`${styles.art} ${styles[game.art]}`} aria-hidden="true">
              {game.art === "survivors" ? (
                <>
                  <span className={styles.robot} />
                  <span className={`${styles.bug} ${styles.b1}`}>NaN</span>
                  <span className={`${styles.bug} ${styles.b2}`}>fit</span>
                  <span className={`${styles.bug} ${styles.b3}`}>?!</span>
                  <span className={`${styles.bug} ${styles.boss}`}>R2</span>
                </>
              ) : (
                <>
                  <span className={styles.car} />
                  <span className={`${styles.pad} ${styles.p1}`} />
                  <span className={`${styles.pad} ${styles.p2}`} />
                  <span className={styles.slab} />
                </>
              )}
            </div>
            <div className={styles.body}>
              <span className={styles.badge}>{game.badge}</span>
              <h2>{game.title}</h2>
              <p>{game.blurb}</p>
              <span className={styles.meta}>{game.meta}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
