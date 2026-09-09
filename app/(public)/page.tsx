import Image from "next/image";
import type { ReactNode } from "react";
import { GraduationCap, Github, Mail } from "lucide-react";

import {
  PERSON_JSON_LD,
  PROJECT_BY_PUBLICATION_TITLE,
  PUBLIC_SITE_CONTENT,
  scholarlyArticleJsonLd,
} from "@/app/lib/public-content";

import NewsList from "./NewsList";
import PublicationGallery from "./PublicationGallery";
import styles from "./HomePage.module.css";

const { awards, education, news, profile, projects, publicationSections } = PUBLIC_SITE_CONTENT;

const SELECTED_PUBLICATION_TITLES = [
  "Unlocking the Potential of Diffusion Language Models through Template Infilling",
  "Deep Support Vectors",
  "CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models",
] as const;

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { ...PERSON_JSON_LD, "@context": undefined },
      ...projects.map((project) => ({
        ...scholarlyArticleJsonLd(project),
        "@context": undefined,
      })),
    ],
  };

  return (
    <div className={styles.page}>
      <script
        id="homepage-structured-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />

      <header className={styles.profileHeader}>
        <Image
          alt="Junhoo Lee"
          className={styles.profileImage}
          height={200}
          priority
          sizes="(max-width: 640px) 160px, 200px"
          src="/myface.jpeg"
          width={200}
        />
        <h1>{profile.name}</h1>
        <nav className={styles.headerIcons} aria-label="Profile links">
          <a href="/cv.pdf" target="_blank" rel="noreferrer" aria-label="Curriculum vitae"><strong>CV</strong></a>
          <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ" target="_blank" rel="noreferrer" aria-label="Google Scholar"><GraduationCap aria-hidden="true" /></a>
          <a href="https://github.com/JunHoo-Lee" target="_blank" rel="noreferrer" aria-label="GitHub"><Github aria-hidden="true" /></a>
          <a href={`mailto:${profile.email}`} aria-label="Email"><Mail aria-hidden="true" /></a>
        </nav>
      </header>

      <section className={styles.section} id="about">
        <SectionTitle>About Me</SectionTitle>
        <div className={styles.aboutCopy}>
          {profile.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      <section className={styles.section} id="education">
        <SectionTitle>Education</SectionTitle>
        <div className={styles.educationList}>
          {education.map((item) => (
            <article key={item.degree}>
              <div>
                <h3>{item.degree}</h3>
                <p>{item.institution}</p>
                <p className={styles.thesisTitle}>
                  <span>{item.degree.startsWith("Ph.D.") ? "Ph.D. Dissertation" : "B.S. Thesis"}</span>
                  <cite>
                    {item.degree.startsWith("Ph.D.")
                      ? "Projection, Persistence, and Elicitation of Learned Internal Structure"
                      : "Improvement of Elevator Control Algorithm Using Reinforcement Learning"}
                  </cite>
                </p>
                {item.degree.startsWith("Ph.D.") ? (
                  <div className={styles.thesisAward}>
                    <strong>Best Ph.D. Dissertation Award</strong>
                    <span>GSCT representative awardee · 1 recipient among 27 Ph.D. graduates</span>
                  </div>
                ) : null}
              </div>
              <time>{item.period}</time>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} id="news">
        <SectionTitle>News</SectionTitle>
        <NewsList news={news} />
      </section>

      <section className={styles.section} id="publications">
        <PublicationGallery
          publications={publicationSections.flatMap((section) => section.items).map((publication) => {
            const project = PROJECT_BY_PUBLICATION_TITLE.get(publication.title);
            return {
              ...publication,
              resolvedPaperLink: project?.paperLink ?? publication.paperLink ?? publication.link,
              resolvedProjectLink: project?.projectLink ?? publication.projectLink,
            };
          })}
          selectedTitles={SELECTED_PUBLICATION_TITLES}
        />
      </section>

      <section className={styles.section} id="awards">
        <SectionTitle>Awards &amp; Honors</SectionTitle>
        <div className={styles.awardList}>
          {awards.map((award) => (
            <article key={`${award.year}-${award.title}`}>
              <time>{award.year}</time>
              <div>
                <h3>{award.title}</h3>
                {"detail" in award && award.detail ? <p>{award.detail}</p> : null}
                {"amount" in award && award.amount ? <p>{award.amount}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={styles.sectionTitle}>{children}</h2>;
}
