import type { Metadata } from "next";
import Link from "next/link";
import { PUBLICATIONS } from "@/app/lib/data";
import PublicationList from "../components/PublicationList";

export const metadata: Metadata = {
    title: "Publications | Junhoo Lee",
    description: "Publications by Junhoo Lee across foundation models, generative modeling, meta-learning, and model diagnosis.",
    alternates: { canonical: "/publications" },
};

export default function PublicationsPage() {
    return (
        <main className="public-main public-container publications-page">
            <header className="publications-hero">
                <p className="public-section-kicker">Research record</p>
                <h1>Publications</h1>
                <p>
                    Peer-reviewed work on reusable structure in foundation models, with an emphasis on planning,
                    attribution, adaptation, and model diagnosis.
                </p>
                <div className="publications-hero__links">
                    <Link href="/">← Home</Link>
                    <a
                        href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Google Scholar ↗
                    </a>
                </div>
            </header>

            {PUBLICATIONS.map((group) => (
                <section
                    className="public-section publications-group"
                    aria-labelledby={`publication-group-${group.section.toLowerCase().replaceAll(" ", "-")}`}
                    key={group.section}
                >
                    <div className="publications-group__heading">
                        <h2 id={`publication-group-${group.section.toLowerCase().replaceAll(" ", "-")}`}>
                            {group.section}
                        </h2>
                        {group.note && <p>{group.note}</p>}
                    </div>
                    <PublicationList publications={group.items} />
                </section>
            ))}
        </main>
    );
}
