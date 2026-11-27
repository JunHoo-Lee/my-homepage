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
    href: "/play/explore",
    badge: "Open world",
    title: "Paperlands",
    blurb: "A voxel island where every section of this site is a landmark and each paper sleeps in its own shrine. Follow the trails, dig, build, and find them all.",
    meta: "Explore · dig & build · keyboard or touch",
    art: "explore",
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
                  <span className={styles.sunDisc} />
                  <span className={styles.isle} />
                  <span className={styles.hill} />
                  <span className={styles.tree} />
                  <span className={styles.beam} />
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
