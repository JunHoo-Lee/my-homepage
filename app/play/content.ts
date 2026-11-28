import { PROJECT_BY_PUBLICATION_TITLE, PUBLIC_SITE_CONTENT, PROJECTS_BY_SLUG } from "@/app/lib/public-content";

import type { PlayContent } from "./types";

const { awards, education, news, posts, profile, publicationSections } = PUBLIC_SITE_CONTENT;

function isFirstAuthor(authors: readonly string[]) {
  return (
    authors[0]?.replace(/[*†]/g, "").trim() === "Junhoo Lee" ||
    authors.some((author) => /^Junhoo Lee\s*[*†]/.test(author))
  );
}

function shortLabel(title: string) {
  const project = PROJECT_BY_PUBLICATION_TITLE.get(title);
  if (project) return project.shortTitle;
  const beforeColon = title.split(":")[0];
  return beforeColon.length <= 48 ? beforeColon : title;
}

export function buildPlayContent(): PlayContent {
  const publications = publicationSections
    .flatMap((section) => section.items)
    .filter((publication) => isFirstAuthor(publication.authors))
    .map((publication) => {
      const project = PROJECT_BY_PUBLICATION_TITLE.get(publication.title);
      return {
        title: publication.title,
        label: shortLabel(publication.title),
        venue: publication.venue,
        year: publication.year,
        authors: publication.authors.join(", "),
        projectHref: project?.projectLink ?? publication.projectLink,
        paperHref: project?.paperLink ?? publication.paperLink ?? publication.link,
        codeHref: project?.codeLink ?? publication.codeLink,
      };
    });

  return {
    profile: {
      name: profile.name,
      role: profile.role,
      affiliation: profile.affiliation,
      bio: [...profile.bio],
    },
    links: [
      { id: "cv", label: "CV", href: "/cv.pdf", external: true },
      { id: "scholar", label: "Scholar", href: profile.scholar, external: true },
      { id: "github", label: "GitHub", href: profile.github, external: true },
      { id: "linkedin", label: "LinkedIn", href: profile.linkedin, external: true },
      { id: "email", label: "Email", href: `mailto:${profile.email}`, external: false },
    ],
    publications,
    posts: posts.map((post) => ({ ...post })),
    education: education.map((item) => ({
      ...item,
      note: item.degree.startsWith("Ph.D.") ? "Best Ph.D. Dissertation Award" : undefined,
    })),
    news: news.map((item) => ({ date: item.date, content: item.content, link: item.link || undefined })),
    awards: awards.map((award) => ({
      year: award.year,
      title: award.title,
      detail: "detail" in award ? award.detail : undefined,
    })),
  };
}

/** Project page links for the papers that appear as upgrade cards. */
export function buildPaperLinks(): Record<string, { label: string; href: string }> {
  return {
    ...Object.fromEntries(
      (["dsv", "shot", "acro", "template-infilling", "csf"] as const).map((slug) => {
        const project = PROJECTS_BY_SLUG[slug];
        return [slug, { label: `${project.shortTitle} (${project.venue})`, href: project.projectLink }];
      }),
    ),
    // papers without an entry in PROJECTS (see app/lib/data.ts)
    dsf: { label: "DSF (NeurIPS 2026)", href: "/dsf" },
    rhd: { label: "Recursive Harness Distillation (arXiv 2026)", href: "https://arxiv.org/abs/2609.33378" },
    robotuse: { label: "RobotUse (arXiv 2026)", href: "https://robotuse-team.github.io/" },
  };
}
