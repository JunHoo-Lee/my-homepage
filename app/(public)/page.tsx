import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
    EDUCATION,
    FEATURED_PROJECTS,
    HOME_NEWS,
    LATEST_UPDATE,
    PROFILE,
    SELECTED_HONORS,
    SELECTED_PUBLICATIONS,
    TALKS,
} from "@/app/lib/data";
import PublicationList from "./components/PublicationList";

export const metadata: Metadata = {
    alternates: { canonical: "/" },
};

function SmartLink({ href, children }: { href: string; children: ReactNode }) {
    if (href.startsWith("/")) {
        return <Link href={href}>{children}</Link>;
    }

    return (
        <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    );
}

export default function Home() {
    return (
        <main id="about" className="public-main public-container">
            <section className="public-hero" aria-labelledby="home-title">
                <div className="public-hero__copy">
                    <p className="public-eyebrow">Ph.D. Candidate · Seoul National University</p>
                    <h1 id="home-title">Junhoo Lee</h1>
                    <p className="public-hero__role">
                        Machine learning researcher at MIPAL, advised by Prof. Nojun Kwak. Ph.D. expected August 2026.
                    </p>
                    <p className="public-hero__thesis">
                        I study how foundation models acquire reusable structure—and how that structure can be controlled,
                        adapted, and diagnosed across language, vision, generative modeling, and embodied systems.
                    </p>
                    <div className="public-identity-links" aria-label="Profile links">
                        <a href={`mailto:${PROFILE.email}`}>Email</a>
                        <a href="/cv.pdf" target="_blank" rel="noopener noreferrer">CV</a>
                        <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ" target="_blank" rel="noopener noreferrer">Scholar</a>
                        <a href="https://github.com/JunHoo-Lee" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="https://www.linkedin.com/in/junhoo-lee-8483b62a5/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                    </div>
                </div>

                <div className="public-profile-photo">
                    <Image
                        src="/myface.jpeg"
                        alt="Junhoo Lee by the sea"
                        fill
                        priority
                        sizes="(max-width: 600px) 90px, 208px"
                    />
                </div>
            </section>

            <aside className="public-lead-update" aria-label="Latest update">
                <time dateTime={LATEST_UPDATE.datetime}>{LATEST_UPDATE.date}</time>
                <p>
                    <strong>Next chapter.</strong> {LATEST_UPDATE.prefix}
                    <a href={LATEST_UPDATE.link} target="_blank" rel="noopener noreferrer">
                        {LATEST_UPDATE.linkText}
                    </a>
                    {LATEST_UPDATE.suffix}
                </p>
            </aside>

            <section id="work" className="public-section" aria-labelledby="work-title">
                <div className="public-section-heading">
                    <div>
                        <p className="public-section-kicker">Selected work</p>
                        <h2 id="work-title">Three projects, one research direction</h2>
                    </div>
                    <p className="public-section-note">Planning structure · semantic attribution · model diagnosis</p>
                </div>

                <div className="featured-work-grid">
                    {FEATURED_PROJECTS.map((project) => (
                        <article className="featured-work" key={project.title}>
                            <Link
                                className="featured-work__figure"
                                href={project.projectLink}
                                aria-label={`Open ${project.fullTitle} project page`}
                            >
                                <Image
                                    src={project.image}
                                    alt={project.imageAlt}
                                    fill
                                    sizes="(max-width: 840px) 100vw, 360px"
                                />
                            </Link>
                            <div className="featured-work__meta">
                                <span>{project.venue}</span>
                                <span>{project.detail}</span>
                            </div>
                            <h3><Link href={project.projectLink}>{project.title}</Link></h3>
                            <p>{project.summary}</p>
                            <div className="featured-work__links" aria-label={`Resources for ${project.title}`}>
                                <Link href={project.projectLink}>Project</Link>
                                <SmartLink href={project.paperLink}>Paper</SmartLink>
                                <a href={project.codeLink} target="_blank" rel="noopener noreferrer">Code</a>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section id="publications" className="public-section" aria-labelledby="selected-publications-title">
                <div className="public-section-heading public-section-heading--compact">
                    <div>
                        <p className="public-section-kicker">Publications</p>
                        <h2 id="selected-publications-title">Selected publications</h2>
                    </div>
                    <Link href="/publications">All publications →</Link>
                </div>
                <PublicationList publications={SELECTED_PUBLICATIONS} />
            </section>

            <div className="public-two-column-sections">
                <section id="talks" className="public-section public-section--compact" aria-labelledby="talks-title">
                    <div className="public-section-heading public-section-heading--compact">
                        <div>
                            <p className="public-section-kicker">Talks & service</p>
                            <h2 id="talks-title">Selected activity</h2>
                        </div>
                    </div>
                    <ul className="public-activity-list">
                        {TALKS.map((talk) => (
                            <li key={`${talk.year}-${talk.title}`}>
                                <time>{talk.year}</time>
                                <span>
                                    <strong><SmartLink href={talk.link}>{talk.title}</SmartLink></strong>
                                    <br />
                                    {talk.venue}
                                </span>
                            </li>
                        ))}
                        <li>
                            <time>2026</time>
                            <span><strong>ICML Gold Reviewer</strong><br />Top reviewer recognition</span>
                        </li>
                        <li>
                            <time>2024–26</time>
                            <span><strong>Conference Reviewer</strong><br />CVPR, ICCV, ECCV, ICLR, ICML, NeurIPS</span>
                        </li>
                    </ul>
                </section>

                <section id="news" className="public-section public-section--compact" aria-labelledby="news-title">
                    <div className="public-section-heading public-section-heading--compact">
                        <div>
                            <p className="public-section-kicker">News</p>
                            <h2 id="news-title">Recent updates</h2>
                        </div>
                    </div>
                    <ol className="public-news-list">
                        {HOME_NEWS.map((item) => (
                            <li key={`${item.datetime}-${item.linkText}`}>
                                <time dateTime={item.datetime}>{item.date}</time>
                                <span>
                                    {item.prefix}
                                    <SmartLink href={item.link}>{item.linkText}</SmartLink>
                                    {item.suffix}
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>

            <section id="education" className="public-section" aria-labelledby="education-title">
                <div className="public-section-heading public-section-heading--compact">
                    <div>
                        <p className="public-section-kicker">Background</p>
                        <h2 id="education-title">Education & selected honors</h2>
                    </div>
                    <a href="/cv.pdf" target="_blank" rel="noopener noreferrer">Download CV →</a>
                </div>

                <div className="public-background-grid">
                    <div className="public-background-column">
                        <h3>Education</h3>
                        {EDUCATION.map((education) => (
                            <div className="public-background-entry" key={education.degree}>
                                <span>{education.period.split(" (")[0]}</span>
                                <p>
                                    <strong>{education.degree}</strong><br />
                                    {education.institution}
                                    {education.degree.startsWith("Ph.D.") ? " · Advisor: Prof. Nojun Kwak" : ""}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="public-background-column">
                        <h3>Selected honors</h3>
                        {SELECTED_HONORS.map((honor) => (
                            <div className="public-background-entry" key={`${honor.year}-${honor.title}`}>
                                <span>{honor.year}</span>
                                <p><strong>{honor.title}</strong></p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
