import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";

import {
  PROJECTS_BY_SLUG,
  scholarlyArticleJsonLd,
  type ProjectSlug,
} from "@/app/lib/public-content";

import PublicFooter from "./PublicFooter";
import styles from "./PublicChrome.module.css";
import PublicSiteShell from "./PublicSiteShell";

export default function ProjectShell({
  children,
  slug,
}: {
  children: ReactNode;
  slug: ProjectSlug;
}) {
  const project = PROJECTS_BY_SLUG[slug];

  return (
    <PublicSiteShell project>
      <Script
        id={`project-structured-data-${slug}`}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(scholarlyArticleJsonLd(project)) }}
        type="application/ld+json"
      />
      <div className={styles.projectFrame} id="public-content">
        <div className={styles.breadcrumbBar}>
          <div className={styles.breadcrumbTrail} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#projects">Projects</Link>
            <span aria-hidden="true">/</span>
            <span className={styles.breadcrumbCurrent}>{project.shortTitle}</span>
          </div>
          <Link className={styles.breadcrumbBack} href="/#publications">
            All publications
          </Link>
        </div>
        <div className={styles.projectToolbar}>
          <nav
            aria-label={`${project.shortTitle} sections`}
            className={styles.projectToc}
          >
            <span className={styles.projectTocLabel}>On this page</span>
            <div className={styles.projectTocScroller}>
              {project.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  {section.label}
                </a>
              ))}
            </div>
          </nav>
          <div aria-label="Project links" className={styles.projectUtilities}>
            <a href={project.paperLink} rel="noreferrer" target="_blank">
              Paper <span aria-hidden="true">↗</span>
            </a>
            {project.codeLink ? (
              <a href={project.codeLink} rel="noreferrer" target="_blank">
                Code <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            <a href="#bibtex">Cite</a>
          </div>
        </div>
        <div className={styles.projectContent}>{children}</div>
      </div>
      <PublicFooter />
    </PublicSiteShell>
  );
}
