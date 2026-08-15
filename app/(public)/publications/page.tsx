import type { Metadata } from "next";
import Link from "next/link";
import { PUBLICATIONS } from "@/app/lib/data";
import {
    PERSON_JSON_LD,
    PROJECT_BY_PUBLICATION_TITLE,
    publicationJsonLd,
} from "@/app/lib/public-content";
import { PublicationEntries } from "../PublicationGallery";
import styles from "../HomePage.module.css";

export const metadata: Metadata = {
    title: "Publications | Junhoo Lee",
    description: "Conference, workshop, and journal publications by Junhoo Lee.",
    alternates: { canonical: "/publications" },
};

export default function PublicationsPage() {
    const publications = PUBLICATIONS
        .flatMap((group) => group.items)
        .sort((a, b) => Number(b.year) - Number(a.year));
    const publicationsWithLinks = publications.map((publication) => {
        const project = PROJECT_BY_PUBLICATION_TITLE.get(publication.title);
        return {
            ...publication,
            resolvedPaperLink: project?.paperLink ?? publication.paperLink ?? publication.link,
            resolvedProjectLink: project?.projectLink ?? publication.projectLink,
        };
    });
    const structuredData = {
        "@context": "https://schema.org",
        "@graph": [
            { ...PERSON_JSON_LD, "@context": undefined },
            ...publications.map((publication) => ({
                ...publicationJsonLd(publication),
                "@context": undefined,
            })),
        ],
    };

    return (
        <main className={styles.page}>
            <script
                id="publications-structured-data"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                type="application/ld+json"
            />
            <section className={styles.section} aria-labelledby="all-publications-title">
                <div className={styles.publicationHeading}>
                    <h1 id="all-publications-title">Publications</h1>
                    <div className={styles.publicationToggle} aria-label="Publication views">
                        <Link href="/#publications">Selected</Link>
                        <span aria-current="page" className={styles.activeToggle}>All</span>
                    </div>
                </div>
                <div className={styles.publicationSources}>
                    <span>{publications.length} publications · newest year first</span>
                    <div>
                        <a href="/cv.pdf" target="_blank" rel="noreferrer">CV</a>
                        <a
                            href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Google Scholar
                        </a>
                    </div>
                </div>
                <PublicationEntries publications={publicationsWithLinks} />
            </section>
        </main>
    );
}
