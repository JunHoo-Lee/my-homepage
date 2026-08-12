"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { Publication } from "@/app/lib/public-content";

import styles from "./HomePage.module.css";

type PublicationWithLinks = Publication & {
  resolvedPaperLink?: string;
  resolvedProjectLink?: string;
};

export default function PublicationGallery({
  publications,
  selectedTitles,
}: {
  publications: readonly PublicationWithLinks[];
  selectedTitles: readonly string[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visiblePublications = showAll
    ? publications
    : selectedTitles.flatMap((title) => {
        const publication = publications.find((item) => item.title === title);
        return publication ? [publication] : [];
      });

  return (
    <>
      <div className={styles.publicationHeading}>
        <h2>Publications</h2>
        <div className={styles.publicationToggle} role="group" aria-label="Publication filter">
          <button className={!showAll ? styles.activeToggle : ""} onClick={() => setShowAll(false)} type="button">Selected</button>
          <button className={showAll ? styles.activeToggle : ""} onClick={() => setShowAll(true)} type="button">All</button>
        </div>
      </div>

      <div className={styles.publicationList}>
        {visiblePublications.map((publication) => (
          <article className={styles.publication} key={publication.title}>
            <h3>{publication.title}</h3>
            <p className={styles.authors}>
              {publication.authors.map((author, index) => (
                <span key={`${author}-${index}`}>
                  {author.includes("Junhoo Lee") ? <strong>{author}</strong> : author}
                  {index < publication.authors.length - 1 ? ", " : ""}
                </span>
              ))}
            </p>
            <p className={styles.venue}>{publication.venue}, {publication.year}.</p>
            <div className={styles.paperLinks}>
              {publication.resolvedPaperLink ? <SmartLink href={publication.resolvedPaperLink}>paper</SmartLink> : null}
              {publication.resolvedProjectLink ? <Link href={publication.resolvedProjectLink}>project page</Link> : null}
              {publication.codeLink ? <SmartLink href={publication.codeLink}>code</SmartLink> : null}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function SmartLink({ children, href }: { children: ReactNode; href: string }) {
  return href.startsWith("/") ? <Link href={href}>{children}</Link> : (
    <a href={href} target="_blank" rel="noreferrer">{children}</a>
  );
}
