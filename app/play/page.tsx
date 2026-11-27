import type { Metadata } from "next";

import { PROJECT_BY_PUBLICATION_TITLE, PUBLIC_SITE_CONTENT } from "@/app/lib/public-content";

import PlayClient from "./PlayClient";
import type { PlayContent } from "./types";

export const metadata: Metadata = {
  title: "Drive Mode | Junhoo Lee",
  description: "Explore Junhoo Lee's homepage by driving a little car around a 3D world.",
  alternates: { canonical: "/play" },
};

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

function buildContent(): PlayContent {
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

export default function PlayPage() {
  return <PlayClient content={buildContent()} />;
}
