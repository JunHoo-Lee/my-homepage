'use client';

import { ArrowUpRight, FileText, Download } from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE, EDUCATION, NEWS, PUBLICATIONS, AWARDS } from "@/app/lib/data";

const RESEARCH_FOCUS = [
    "Optimization Dynamics",
    "Diffusion Language Models",
    "Controllable Generation",
    "Theory for Foundation Models",
];

export default function Home() {
    const publicationCount = PUBLICATIONS.reduce((acc, section) => acc + section.items.length, 0);

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    const staggerContainer = {
        animate: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="mx-auto max-w-4xl space-y-14 md:space-y-16"
        >
            {/* About Section */}
            <motion.section id="about" className="scroll-mt-16" variants={fadeInUp}>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 md:mb-8 md:gap-4">
                    <h2 className="research-section-title w-full md:w-auto">About Me</h2>
                    <a
                        href="/cv.pdf"
                        download="Junhoo_Lee_CV.pdf"
                        className="inline-flex items-center gap-1 rounded-xl border border-[color:var(--research-border)] bg-white px-3.5 py-1.5 text-sm font-semibold text-[color:var(--research-primary)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--research-primary)] hover:shadow-[0_12px_30px_-20px_rgba(22,57,88,0.7)]"
                    >
                        <Download size={14} /> Download CV
                    </a>
                </div>

                <div className="research-card space-y-3 p-5 text-[color:var(--research-muted)] md:space-y-4 md:p-7">
                    {PROFILE.bio.map((paragraph, i) => (
                        <p key={i} className="text-[15px] leading-7 md:text-[17px] md:leading-8">
                            {paragraph}
                        </p>
                    ))}
                    <p className="text-[15px] leading-7 md:text-[17px] md:leading-8">
                        I am always open to discussing new ideas and potential collaborations. Feel free to reach out to me via email at{" "}
                        <a href={`mailto:${PROFILE.email}`} className="font-semibold text-[color:var(--research-primary)] underline decoration-[color:var(--research-border)] underline-offset-4 hover:decoration-[color:var(--research-primary)]">
                            {PROFILE.email}
                        </a>
                        .
                    </p>

                    <div className="rounded-lg border border-[color:var(--research-border)] bg-[color:var(--research-paper)] p-3 md:p-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--research-muted)] md:text-xs md:tracking-[0.14em]">
                            Research Focus
                        </p>
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                            {RESEARCH_FOCUS.map((focus) => (
                                <span key={focus} className="research-chip">
                                    {focus}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 md:mt-10">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--research-muted)] md:mb-5 md:text-sm md:tracking-[0.16em]">Education</h3>
                    <div className="space-y-2.5 md:space-y-3">
                        {EDUCATION.map((edu, i) => (
                            <div key={i} className="research-card flex flex-col gap-1.5 p-3.5 sm:flex-row sm:items-baseline sm:justify-between md:p-5">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[15px] font-semibold text-[var(--research-ink)] md:text-base">{edu.degree}</span>
                                    <span className="text-xs text-[color:var(--research-muted)] md:text-sm">{edu.institution}</span>
                                </div>
                                <div className="mt-0.5 shrink-0 text-xs font-medium text-[color:var(--research-primary)] sm:mt-0 md:text-sm">
                                    {edu.period}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* News Section */}
            <motion.section id="news" className="scroll-mt-16" variants={fadeInUp}>
                <h2 className="research-section-title mb-6 md:mb-8">News</h2>
                <ul className="space-y-2.5 text-sm text-[color:var(--research-muted)] md:space-y-3">
                    {NEWS.map((item, i) => (
                        <li key={i} className="research-card flex flex-col gap-1.5 p-3.5 md:flex-row md:gap-4 md:p-5">
                            <div className="flex items-center gap-1.5">
                                <span className="research-chip w-fit font-semibold">[{item.date}]</span>
                                {i < 3 && <span className="research-chip border-transparent bg-[color:var(--research-primary)] text-white">Latest</span>}
                            </div>
                            <span className="text-[15px] leading-7">
                                {item.content.split(item.linkText)[0]}
                                <a href={item.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--research-primary)] underline decoration-[color:var(--research-border)] underline-offset-4 transition-colors hover:decoration-[color:var(--research-primary)]">
                                    {item.linkText}
                                </a>
                                {item.content.split(item.linkText)[1]}
                            </span>
                        </li>
                    ))}
                </ul>
            </motion.section>

            {/* Publications Section */}
            <motion.section id="publications" className="scroll-mt-16" variants={fadeInUp}>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--research-border)] pb-3 md:mb-8 md:pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-semibold tracking-tight text-[var(--research-ink)] [font-family:var(--font-source-serif),serif] md:text-3xl">Publications</h2>
                        <span className="research-chip">{publicationCount} papers</span>
                    </div>
                    <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-[color:var(--research-primary)] transition-colors hover:text-[color:var(--research-primary-strong)] md:text-sm">
                        View Google Scholar <ArrowUpRight size={14} />
                    </a>
                </div>

                <div className="space-y-9 md:space-y-11">
                    {PUBLICATIONS.map((section, i) => {
                        return (
                            <div key={i}>
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--research-ink)] [font-family:var(--font-source-serif),serif] md:mb-6 md:text-xl">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--research-primary)]"></span>
                                    {section.section}
                                </h3>
                                <div className="space-y-3.5 border-l border-[color:var(--research-border)] pl-3.5 md:space-y-5 md:pl-4">
                                    {section.items.map((pub, j) => (
                                        <PublicationItem key={j} {...pub} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.section>

            {/* Awards & Honors Section */}
            <motion.section id="awards" className="scroll-mt-16" variants={fadeInUp}>
                <h2 className="research-section-title mb-6 md:mb-8">Awards & Honors</h2>
                <div className="space-y-2.5 md:space-y-3">
                    {AWARDS.map((award, i) => (
                        <AwardsItem key={i} {...award} />
                    ))}
                </div>
            </motion.section>
        </motion.div>
    );
}

function PublicationItem({ title, authors, venue, year, link, tldr, category, subTag }: { title: string, authors: string[], venue: string, year: string, link?: string, tldr: string, category: string, subTag: string }) {
    const venueMatch = venue.match(/^(.*)\(([^()]+)\)\s*$/);
    const venueFull = venueMatch ? venueMatch[1].trim() : venue;
    const venueShort = venueMatch ? venueMatch[2].trim() : venue;

    return (
        <div className="group research-card relative p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(22,57,88,0.7)] md:p-5">
            <h4 className="mb-2.5 text-lg font-semibold leading-snug text-[var(--research-ink)] [font-family:var(--font-source-serif),serif] md:mb-3 md:text-xl">
                {link ? (
                    <a href={link} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[color:var(--research-primary)] hover:underline decoration-[color:var(--research-border)] underline-offset-4 decoration-2">
                        {title}
                    </a>
                ) : (
                    <span>{title}</span>
                )}
            </h4>

            <div className="mb-2.5 flex flex-wrap gap-1.5 md:mb-3 md:gap-2">
                <span className="research-chip font-semibold">
                    {venueShort}
                </span>
                <span className="research-chip">
                    {year}
                </span>
                <span className="research-chip">
                    {category}
                </span>
                <span className="research-chip">
                    {subTag}
                </span>
            </div>

            {venueFull !== venueShort && (
                <p className="mb-2.5 text-xs leading-relaxed text-[color:var(--research-muted)] md:mb-3 md:text-sm">
                    {venueFull}
                </p>
            )}

            <div className="mb-2.5 text-sm font-medium leading-6 text-[color:var(--research-muted)] md:mb-3">
                {authors.map((author, i) => {
                    const isJunhoo = author.includes("Junhoo Lee");
                    return (
                        <span key={i}>
                            <span className={isJunhoo ? "font-semibold text-[var(--research-ink)] underline decoration-[color:var(--research-primary)] decoration-2 underline-offset-3" : "text-[color:var(--research-muted)]"}>
                                {author}
                            </span>
                            {i < authors.length - 1 ? ", " : ""}
                        </span>
                    );
                })}
            </div>

            <p className="border-l-2 border-[color:var(--research-border)] pl-3 text-xs italic leading-6 text-[color:var(--research-muted)] md:text-sm md:leading-relaxed">
                {tldr}
            </p>

            {link && (
                <div className="mt-3 flex gap-3 text-xs font-medium opacity-100 transition-opacity md:mt-4 md:opacity-0 md:group-hover:opacity-100">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[color:var(--research-muted)] transition-colors hover:text-[color:var(--research-primary)]">
                        <FileText size={14} /> View Paper
                    </a>
                </div>
            )}
        </div>
    )
}

function AwardsItem({ year, title, amount }: { year: string, title: string, amount?: string }) {
    return (
        <div className="research-card flex flex-col gap-1 p-3.5 sm:flex-row sm:items-baseline sm:gap-4 md:p-5">
            <span className="w-[64px] shrink-0 text-xs font-semibold text-[color:var(--research-primary)] md:text-sm">{year}</span>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="text-[15px] font-medium text-[var(--research-ink)] md:text-base">{title}</span>
                {amount && <span className="text-xs font-normal text-[color:var(--research-muted)]">({amount})</span>}
            </div>
        </div>
    );
}
