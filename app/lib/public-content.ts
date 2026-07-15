import type { Metadata } from "next";

import {
  ACADEMIC_SERVICE,
  AWARDS,
  EDUCATION,
  NEWS,
  PROFILE,
  PUBLICATIONS,
} from "./data";

export const SITE_URL = "https://junhoo.me";

export const PUBLIC_PROFILE = {
  name: PROFILE.name,
  role: PROFILE.role,
  affiliation: PROFILE.affiliation,
  email: PROFILE.email,
  website: PROFILE.website,
  bio: PROFILE.bio,
} as const;

export type Publication = {
  title: string;
  authors: string[];
  venue: string;
  year: string;
  link?: string;
  projectLink?: string;
  paperLink?: string;
  codeLink?: string;
  codeLabel?: string;
  category: string;
  subTag: string;
  tldr: string;
};

export type PublicationSection = {
  section: string;
  color: string;
  note?: string;
  items: Publication[];
};

export type NewsItem = {
  date: string;
  content: string;
  link: string;
  linkText: string;
};

export type ResearchPillar = {
  number: string;
  title: string;
  description: string;
  topics: string[];
};

export type ProjectSlug =
  | "template-infilling"
  | "csf"
  | "dsv"
  | "any-way-meta-learning"
  | "shot";

export type ProjectSection = {
  id: string;
  label: string;
};

export type Project = {
  slug: ProjectSlug;
  title: string;
  shortTitle: string;
  venue: string;
  year: string;
  summary: string;
  image: string;
  imageAlt: string;
  projectLink: string;
  paperLink: string;
  codeLink?: string;
  featured: boolean;
  authors: string[];
  sections: ProjectSection[];
};

export const RESEARCH_PILLARS: ResearchPillar[] = [
  {
    number: "01",
    title: "Structured inference for foundation models",
    description:
      "I study how generation can be planned around reusable intermediate structure, rather than being forced into a single left-to-right process.",
    topics: ["Diffusion language models", "Inference-time planning", "Controllable generation"],
  },
  {
    number: "02",
    title: "Adaptation beyond fixed task interfaces",
    description:
      "I design learning rules that preserve useful equivalences across changing labels, tasks, and data regimes.",
    topics: ["Meta-learning", "Few-shot adaptation", "Data efficiency"],
  },
  {
    number: "03",
    title: "Diagnosis and reliability of learned representations",
    description:
      "I probe which examples and structures shape pretrained models, and how those structures remain dependable in generative and embodied systems.",
    topics: ["Model diagnosis", "Generative models", "Vision-language-action"],
  },
];

export const PROJECTS: Project[] = [
  {
    slug: "template-infilling",
    title: "Unlocking the Potential of Diffusion Language Models through Template Infilling",
    shortTitle: "Template Infilling",
    venue: "ACL 2026 · Long Paper · Oral",
    year: "2026",
    summary:
      "A template-then-fill inference strategy that better matches the non-autoregressive structure of diffusion language models.",
    image: "/template-infilling/figure-main.png",
    imageAlt: "Template Infilling method overview comparing generation orders",
    projectLink: "/template-infilling",
    paperLink: "/template-infilling/template-infilling-paper.pdf",
    codeLink: "https://github.com/JunHoo-Lee/Template-Infilling",
    featured: true,
    authors: ["Junhoo Lee", "Seungyeon Kim", "Nojun Kwak"],
    sections: [
      { id: "abstract", label: "Abstract" },
      { id: "method", label: "Method" },
      { id: "main-results", label: "Results" },
      { id: "safety-guardrails", label: "Safety" },
      { id: "analysis", label: "Analysis" },
      { id: "bibtex", label: "BibTeX" },
    ],
  },
  {
    slug: "csf",
    title: "CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models",
    shortTitle: "CSF",
    venue: "CVPR 2026",
    year: "2026",
    summary:
      "A query-only method for attributing fine-tuned text-to-image APIs to protected model lineages through compositional semantic fingerprints.",
    image: "/csf/image.png",
    imageAlt: "Compositional Semantic Fingerprinting method overview",
    projectLink: "/csf",
    paperLink: "/csf/csf-paper.pdf",
    codeLink: "https://github.com/JunHoo-Lee/csf-t2i-fingerprinting",
    featured: true,
    authors: ["Junhoo Lee", "Mijin Koo", "Nojun Kwak"],
    sections: [
      { id: "abstract", label: "Abstract" },
      { id: "challenge", label: "Challenge" },
      { id: "method", label: "Method" },
      { id: "results", label: "Results" },
      { id: "analysis", label: "Analysis" },
      { id: "paper", label: "Paper" },
      { id: "bibtex", label: "BibTeX" },
    ],
  },
  {
    slug: "dsv",
    title: "Deep Support Vectors",
    shortTitle: "Deep Support Vectors",
    venue: "NeurIPS 2024",
    year: "2024",
    summary:
      "A support-vector view of deep classifiers that identifies decisive training samples and enables data-efficient distillation and generation.",
    image: "/dsv/figure-hero.png",
    imageAlt: "Deep Support Vectors concept and applications",
    projectLink: "/dsv",
    paperLink: "https://arxiv.org/abs/2403.17329",
    codeLink: "https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors",
    featured: true,
    authors: ["Junhoo Lee", "Hyunho Lee", "Kyomin Hwang", "Nojun Kwak"],
    sections: [
      { id: "abstract", label: "Abstract" },
      { id: "key-ideas", label: "Key ideas" },
      { id: "deepkkt", label: "DeepKKT" },
      { id: "distillation", label: "Distillation" },
      { id: "visual-evidence", label: "Evidence" },
      { id: "generative", label: "Generation" },
      { id: "code", label: "Code" },
      { id: "bibtex", label: "BibTeX" },
    ],
  },
  {
    slug: "any-way-meta-learning",
    title: "Any-Way Meta Learning",
    shortTitle: "Any-Way Meta Learning",
    venue: "AAAI 2024",
    year: "2024",
    summary:
      "A meta-learning framework that breaks the fixed N-way constraint by exploiting label equivalence across episodic tasks.",
    image: "/any-way-meta-learning/task-sampling.png",
    imageAlt: "Any-Way Meta Learning task-sampling construction",
    projectLink: "/any-way-meta-learning",
    paperLink: "https://arxiv.org/abs/2401.05097",
    featured: false,
    authors: ["Junhoo Lee", "Yearim Kim", "Hyunho Lee", "Nojun Kwak"],
    sections: [
      { id: "abstract", label: "Abstract" },
      { id: "method", label: "Method" },
      { id: "results", label: "Results" },
      { id: "analysis", label: "Analysis" },
      { id: "bibtex", label: "BibTeX" },
    ],
  },
  {
    slug: "shot",
    title: "SHOT: Suppressing the Hessian along the Optimization Trajectory",
    shortTitle: "SHOT",
    venue: "NeurIPS 2023",
    year: "2023",
    summary:
      "An optimization perspective on gradient-based meta-learning that flattens the full adaptation trajectory.",
    image: "/shot/examplefig.png",
    imageAlt: "SHOT optimization trajectory overview",
    projectLink: "/shot",
    paperLink: "https://arxiv.org/abs/2310.02751",
    featured: false,
    authors: ["Junhoo Lee", "Jayeon Yoo", "Nojun Kwak"],
    sections: [
      { id: "abstract", label: "Abstract" },
      { id: "method", label: "Method" },
      { id: "main-results", label: "Results" },
      { id: "safety-guardrails", label: "Variants" },
      { id: "analysis", label: "Analysis" },
      { id: "bibtex", label: "BibTeX" },
    ],
  },
];

export const PROJECTS_BY_SLUG = Object.fromEntries(
  PROJECTS.map((project) => [project.slug, project]),
) as Record<ProjectSlug, Project>;

export const PROJECT_BY_PUBLICATION_TITLE = new Map(
  PROJECTS.map((project) => [project.title, project]),
);

export const PUBLICATION_SECTIONS = PUBLICATIONS as PublicationSection[];

export const PUBLIC_SITE_CONTENT = {
  profile: PUBLIC_PROFILE,
  education: EDUCATION,
  news: NEWS as NewsItem[],
  publicationSections: PUBLICATION_SECTIONS,
  awards: AWARDS,
  academicService: ACADEMIC_SERVICE,
  researchPillars: RESEARCH_PILLARS,
  projects: PROJECTS,
} as const;

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createProjectMetadata(slug: ProjectSlug): Metadata {
  const project = PROJECTS_BY_SLUG[slug];
  const canonical = project.projectLink;

  return {
    title: { absolute: `${project.shortTitle} | Junhoo Lee` },
    description: project.summary,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: project.title,
      description: project.summary,
      siteName: "Junhoo Lee",
      authors: [SITE_URL],
      images: [
        {
          url: project.image,
          alt: project.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.summary,
      images: [project.image],
    },
  };
}

export function scholarlyArticleJsonLd(project: Project) {
  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: project.title,
    name: project.title,
    datePublished: project.year,
    url: absoluteUrl(project.projectLink),
    image: absoluteUrl(project.image),
    author: project.authors.map((name) => ({
      "@type": "Person",
      name,
      ...(name === PUBLIC_PROFILE.name ? { url: SITE_URL } : {}),
    })),
    isPartOf: {
      "@type": "PublicationIssue",
      name: project.venue,
    },
    sameAs: absoluteUrl(project.paperLink),
    description: project.summary,
  };
}

export const PERSON_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: PUBLIC_PROFILE.name,
  url: SITE_URL,
  image: absoluteUrl("/myface.jpeg"),
  email: `mailto:${PUBLIC_PROFILE.email}`,
  jobTitle: PUBLIC_PROFILE.role,
  affiliation: {
    "@type": "CollegeOrUniversity",
    name: PUBLIC_PROFILE.affiliation,
    url: "https://www.snu.ac.kr/",
  },
  sameAs: [
    "https://github.com/JunHoo-Lee",
    "https://scholar.google.com/citations?user=CvvfGxkAAAAJ",
    "https://www.linkedin.com/in/junhoo-lee-8483b62a5/",
  ],
  knowsAbout: RESEARCH_PILLARS.flatMap((pillar) => pillar.topics),
};
