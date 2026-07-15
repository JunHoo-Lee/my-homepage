import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";

import {
  PERSON_JSON_LD,
  PROJECT_BY_PUBLICATION_TITLE,
  PUBLIC_SITE_CONTENT,
  scholarlyArticleJsonLd,
  type NewsItem,
  type Publication,
} from "@/app/lib/public-content";

import styles from "./HomePage.module.css";

const {
  academicService,
  awards,
  education,
  news,
  profile,
  projects,
  publicationSections,
  researchPillars,
} = PUBLIC_SITE_CONTENT;

export default function Home() {
  const featuredProjects = projects.filter((project) => project.featured);
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
      <Script
        id="homepage-structured-data"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />

      <section className={styles.hero} id="about">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Research profile · Seoul National University</p>
          <h1>
            Foundation models become more useful when their learned structure can be
            understood and directed.
          </h1>
          <p className={styles.lede}>
            I study how foundation models acquire reusable structure, and how that
            structure can be controlled, adapted, and diagnosed across language, vision,
            and embodied systems.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href={`mailto:${profile.email}`}>
              Contact
            </a>
            <a className={styles.secondaryAction} href="/cv.pdf" target="_blank" rel="noreferrer">
              Curriculum vitae ↗
            </a>
            <a
              className={styles.textAction}
              href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ"
              target="_blank"
              rel="noreferrer"
            >
              Google Scholar ↗
            </a>
          </div>
        </div>

        <aside className={styles.profileCard} aria-label="Profile">
          <Image
            alt="Junhoo Lee"
            className={styles.profileImage}
            height={168}
            priority
            sizes="(max-width: 760px) 92px, 126px"
            src="/myface.jpeg"
            width={126}
          />
          <div>
            <p className={styles.profileName}>{profile.name}</p>
            <p>{profile.role}</p>
            <p>{profile.affiliation}</p>
            <p>MIPAL · advised by Prof. Nojun Kwak</p>
          </div>
        </aside>
      </section>

      <SectionHeading
        id="projects"
        index="Selected work"
        title="Representative projects"
        description="Three projects that show how I move from a research question to a concrete model interface, diagnostic, or decision rule."
      />
      <div className={styles.projectList}>
        {featuredProjects.map((project, index) => (
          <article className={styles.project} key={project.slug}>
            <Link className={styles.projectFigure} href={project.projectLink}>
              <Image
                alt={project.imageAlt}
                className={styles.projectImage}
                height={project.slug === "csf" ? 315 : project.slug === "dsv" ? 540 : 552}
                priority={index === 0}
                sizes="(max-width: 760px) calc(100vw - 3rem), 360px"
                src={project.image}
                width={project.slug === "csf" ? 1240 : project.slug === "dsv" ? 1330 : 1286}
              />
            </Link>
            <div className={styles.projectBody}>
              <div className={styles.projectMeta}>
                <span>{project.venue}</span>
                <span>{project.year}</span>
              </div>
              <h3>
                <Link href={project.projectLink}>{project.shortTitle}</Link>
              </h3>
              <p>{project.summary}</p>
              <div className={styles.projectLinks}>
                <Link href={project.projectLink}>Project</Link>
                <SmartLink href={project.paperLink}>Paper</SmartLink>
                {project.codeLink ? <SmartLink href={project.codeLink}>Code</SmartLink> : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      <SectionHeading
        id="research"
        index="Research"
        title="A connected research agenda"
        description="My work asks where reusable structure appears, how it can support a changing task, and when it can be trusted."
      />
      <div className={styles.pillarGrid}>
        {researchPillars.map((pillar) => (
          <article className={styles.pillar} key={pillar.number}>
            <span className={styles.pillarNumber}>{pillar.number}</span>
            <h3>{pillar.title}</h3>
            <p>{pillar.description}</p>
            <ul aria-label={`${pillar.title} topics`}>
              {pillar.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <SectionHeading
        id="publications"
        index="Publications"
        title="Research record"
        description="A compact index of peer-reviewed work. Junhoo Lee is highlighted in each author list."
        action={
          <a
            href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ"
            target="_blank"
            rel="noreferrer"
          >
            Complete profile ↗
          </a>
        }
      />
      <div className={styles.publicationGroups}>
        {publicationSections.map((section) => (
          <section className={styles.publicationGroup} key={section.section}>
            <div className={styles.publicationGroupTitle}>
              <h3>{section.section}</h3>
              {section.note ? <span>{section.note}</span> : null}
            </div>
            <div>
              {section.items.map((publication) => (
                <PublicationRow publication={publication} key={publication.title} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <SectionHeading
        id="news"
        index="Updates"
        title="Recent news"
        description="Talks, publications, and research-community activity."
      />
      <NewsList items={news.slice(0, 5)} />
      <details className={styles.newsArchive}>
        <summary>Earlier news · {news.length - 5} entries</summary>
        <NewsList items={news.slice(5)} />
      </details>

      <SectionHeading
        id="background"
        index="Background"
        title="Education, recognition, and service"
      />
      <div className={styles.backgroundGrid}>
        <section>
          <h3>Education</h3>
          <ul className={styles.factList}>
            {education.map((item) => (
              <li key={item.degree}>
                <strong>{item.degree}</strong>
                <span>{item.institution}</span>
                <small>{item.period}</small>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Awards</h3>
          <ul className={styles.factList}>
            {awards.map((item) => (
              <li key={`${item.year}-${item.title}`}>
                <strong>{item.title}</strong>
                <span>{item.year}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Academic service</h3>
          <ul className={styles.factList}>
            {academicService.map((item) => (
              <li key={`${item.role}-${item.venue}-${item.year}`}>
                <strong>
                  {item.role} · {item.venue}
                </strong>
                <span>{item.year}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SectionHeading({
  action,
  description,
  id,
  index,
  title,
}: {
  action?: ReactNode;
  description?: string;
  id: string;
  index: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading} id={id}>
      <p>{index}</p>
      <div>
        <h2>{title}</h2>
        {description ? <span>{description}</span> : null}
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  );
}

function PublicationRow({ publication }: { publication: Publication }) {
  const project = PROJECT_BY_PUBLICATION_TITLE.get(publication.title);
  const projectLink = project?.projectLink ?? publication.projectLink;
  const fallbackLink = publication.paperLink ?? publication.link;
  const titleLink = projectLink ?? fallbackLink;
  const paperLink = project?.paperLink ?? publication.paperLink ??
    (publication.link?.startsWith("http") ? publication.link : undefined);

  return (
    <article className={styles.publication}>
      <div className={styles.publicationYear}>{publication.year}</div>
      <div className={styles.publicationMain}>
        <h4>{titleLink ? <SmartLink href={titleLink}>{publication.title}</SmartLink> : publication.title}</h4>
        <p className={styles.authors}>
          {publication.authors.map((author, index) => (
            <span key={`${author}-${index}`}>
              {author.includes("Junhoo Lee") ? <strong>{author}</strong> : author}
              {index < publication.authors.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
        <p className={styles.venue}>{publication.venue}</p>
      </div>
      <div className={styles.publicationLinks}>
        {projectLink ? <Link href={projectLink}>Project</Link> : null}
        {paperLink ? <SmartLink href={paperLink}>Paper</SmartLink> : null}
        {publication.codeLink ? <SmartLink href={publication.codeLink}>Code</SmartLink> : null}
      </div>
    </article>
  );
}

function NewsList({ items }: { items: readonly NewsItem[] }) {
  return (
    <ol className={styles.newsList}>
      {items.map((item, index) => {
        const [before, after] = item.content.includes(item.linkText)
          ? item.content.split(item.linkText)
          : [item.content, ""];

        return (
          <li key={`${item.date}-${index}`}>
            <time>{item.date}</time>
            <p>
              {before}
              {item.content.includes(item.linkText) ? (
                <SmartLink href={item.link}>{item.linkText}</SmartLink>
              ) : null}
              {after}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function SmartLink({ children, href }: { children: ReactNode; href: string }) {
  return href.startsWith("/") ? (
    <Link href={href}>{children}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}
