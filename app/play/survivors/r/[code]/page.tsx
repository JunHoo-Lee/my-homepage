import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DECISIONS } from "../../lore";
import { SHARE_PAPERS, decodeShare, headline, plainTitle } from "../../share";
import styles from "./page.module.css";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = decodeShare((await params).code);
  if (!data) return { title: "Gradient Survivors | Junhoo Lee" };
  const title = `Submission #${data.submission}: ${plainTitle(data.grade)} | Gradient Survivors`;
  const description = `${headline(data)} A five-minute survivors-like about peer review. Can you survive Reviewer 2?`;
  return {
    title,
    description,
    robots: { index: false },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedRun({ params }: Props) {
  const data = decodeShare((await params).code);
  if (!data) notFound();
  return (
    <main className={styles.page}>
      <article className={styles.letter}>
        <p className={styles.kicker}>Decision · Submission #{data.submission}</p>
        <h1>{DECISIONS[data.grade].title}</h1>
        <p className={styles.stamp}>{DECISIONS[data.grade].stamp}</p>
        <p>{headline(data)}</p>
        {data.papers.length ? <p className={styles.papers}>Papers in the build: {data.papers.map((id) => SHARE_PAPERS[id]).join(" · ")}</p> : null}
        <Link className={styles.cta} href="/play/survivors">
          Submit your own paper →
        </Link>
      </article>
    </main>
  );
}
