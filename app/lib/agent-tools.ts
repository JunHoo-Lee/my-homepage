/**
 * Machine-readable view of the site for AI agents.
 *
 * One tool set, three surfaces:
 *  - WebMCP (navigator.modelContext) in the browser — app/components/WebMCPTools.tsx
 *  - the remote MCP server at /mcp — app/mcp/route.ts
 *  - the llms.txt / llms-full.txt documents — app/llms.txt, app/llms-full.txt
 *
 * Everything here is pure data so it runs on the server and in the browser.
 */
import {
  ACADEMIC_SERVICE,
  AWARDS,
  EDUCATION,
  NEWS,
  POSTS,
  PROFILE,
  PUBLICATIONS,
} from "./data";
import { PROJECTS, RESEARCH_PILLARS } from "./public-content";

export const SITE_URL = "https://junhoo.me";

const abs = (path: string) => new URL(path, SITE_URL).toString();

export type SitePage = {
  path: string;
  title: string;
  kind: "home" | "publications" | "project" | "post" | "game";
  description: string;
};

/** Every public page, in the order an agent should consider them. */
export const SITE_PAGES: SitePage[] = [
  { path: "/", title: `${PROFILE.name} — homepage`, kind: "home", description: "Profile, news, selected publications, awards and service." },
  { path: "/publications", title: "Publications", kind: "publications", description: "Full publication list grouped by preprint, conference, workshop and journal." },
  ...PROJECTS.map((p) => ({ path: p.projectLink, title: p.title, kind: "project" as const, description: `${p.venue}. ${p.summary}` })),
  { path: "/dsf", title: "Discriminative Score Function: Turning Pretrained Models into Functional Generative Priors", kind: "project", description: "NeurIPS 2026. Uncover a generative signal inside a model trained to discriminate." },
  { path: "/backdoor", title: "Clean Data Can Still Carry Backdoors: Support-Persistent Backdoors for Model Reuse", kind: "project", description: "NeurIPS 2026. Why malicious behavior can survive knowledge transfer on clean data." },
  ...POSTS.map((p) => ({ path: p.href, title: p.title, kind: "post" as const, description: `${p.date}. ${p.description}` })),
  { path: "/play", title: "Games", kind: "game", description: "Small browser games built around the homepage and its papers (Gradient Survivors, Drive mode)." },
];

type Pub = (typeof PUBLICATIONS)[number]["items"][number];
type FlatPub = Pub & { section: string; id: string };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Same anchor id the /publications page uses. */
export const ALL_PUBLICATIONS: FlatPub[] = PUBLICATIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.section, id: slug(item.title) })),
);

function publicationRecord(p: FlatPub) {
  const project = PROJECTS.find((proj) => proj.title === p.title);
  return {
    id: p.id,
    title: p.title,
    authors: p.authors,
    venue: p.venue,
    year: p.year,
    type: p.section,
    category: p.category || undefined,
    tldr: p.tldr || project?.summary || undefined,
    paper: (p.paperLink ?? project?.paperLink ?? p.link) ? abs((p.paperLink ?? project?.paperLink ?? p.link)!) : undefined,
    project_page: (p.projectLink ?? project?.projectLink) ? abs((p.projectLink ?? project?.projectLink)!) : undefined,
    code: (p.codeLink ?? project?.codeLink) ? abs((p.codeLink ?? project?.codeLink)!) : undefined,
    listing: abs(`/publications#${p.id}`),
  };
}

function findPublication(query: string): FlatPub | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return (
    ALL_PUBLICATIONS.find((p) => p.id === slug(q)) ??
    ALL_PUBLICATIONS.find((p) => p.title.toLowerCase() === q) ??
    ALL_PUBLICATIONS.find((p) => p.title.toLowerCase().startsWith(q)) ??
    ALL_PUBLICATIONS.find((p) => p.title.toLowerCase().includes(q))
  );
}

export function bibtexFor(p: FlatPub): string {
  const first = p.authors[0]?.replace(/\*/g, "").trim().split(/\s+/).pop()?.toLowerCase() ?? "anon";
  const word = p.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").find((w) => w.length > 3) ?? "paper";
  const key = `${first}${p.year}${word}`;
  const isArxiv = /arxiv/i.test(p.venue);
  const isJournal = p.section === "Journal";
  const kind = isArxiv || isJournal ? "article" : "inproceedings";
  const venueField = kind === "article" ? "journal" : "booktitle";
  const authors = p.authors.map((a) => a.replace(/\*/g, "").trim()).join(" and ");
  return [
    `@${kind}{${key},`,
    `  title = {${p.title}},`,
    `  author = {${authors}},`,
    `  ${venueField} = {${p.venue}},`,
    `  year = {${p.year}},`,
    "}",
  ].join("\n");
}

/* ------------------------------------------------------------------ tools */

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type AgentTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  readOnly: boolean;
  /** Returns the result as plain data; callers serialise it. */
  run: (args: Record<string, unknown>) => unknown;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export const AGENT_TOOLS: AgentTool[] = [
  {
    name: "get_profile",
    title: "Get researcher profile",
    description: `Who ${PROFILE.name} is: role, affiliation, bio, research directions, education, contact and profile links.`,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
    run: () => ({
      name: PROFILE.name,
      role: PROFILE.role,
      affiliation: PROFILE.affiliation,
      email: PROFILE.email,
      website: PROFILE.website,
      links: { cv: abs("/cv.pdf"), google_scholar: PROFILE.scholar, github: PROFILE.github, linkedin: PROFILE.linkedin },
      bio: PROFILE.bio,
      research_directions: RESEARCH_PILLARS.map((r) => ({ title: r.title, description: r.description, topics: r.topics })),
      education: EDUCATION,
    }),
  },
  {
    name: "search_publications",
    title: "Search publications",
    description:
      "Search the publication list. All filters are optional and combine with AND; with no filters it returns every paper, newest first. Each result has authors, venue, TL;DR and links to the paper, project page and code.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to match against title, authors, venue, category and TL;DR (case-insensitive)." },
        year: { type: "string", description: "Publication year, e.g. \"2026\"." },
        type: { type: "string", enum: ["Preprint", "Main Conference", "Workshop", "Journal"], description: "Publication type." },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Maximum results (default 20)." },
      },
      additionalProperties: false,
    },
    readOnly: true,
    run: (args) => {
      const terms = str(args.query).toLowerCase().split(/\s+/).filter(Boolean);
      const year = str(args.year);
      const type = str(args.type);
      const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
      const hits = ALL_PUBLICATIONS.filter((p) => {
        if (year && p.year !== year) return false;
        if (type && p.section !== type) return false;
        const hay = [p.title, p.authors.join(" "), p.venue, p.category, p.tldr].join(" ").toLowerCase();
        return terms.every((t) => hay.includes(t));
      }).sort((a, b) => Number(b.year) - Number(a.year));
      return { total: hits.length, results: hits.slice(0, limit).map(publicationRecord) };
    },
  },
  {
    name: "get_publication_bibtex",
    title: "Get BibTeX for a paper",
    description: "BibTeX entry for one paper, found by title, part of a title, or its id from search_publications. The entry is generated from the site's metadata.",
    inputSchema: {
      type: "object",
      properties: { paper: { type: "string", description: "Title, title fragment (e.g. \"Template Infilling\") or publication id." } },
      required: ["paper"],
      additionalProperties: false,
    },
    readOnly: true,
    run: (args) => {
      const p = findPublication(str(args.paper));
      if (!p) return { error: `No publication matches "${str(args.paper)}". Try search_publications first.` };
      return { id: p.id, title: p.title, bibtex: bibtexFor(p) };
    },
  },
  {
    name: "get_news",
    title: "Get recent news",
    description: "Latest news items (paper acceptances, talks, awards), newest first.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 50, description: "Maximum items (default 10)." } },
      additionalProperties: false,
    },
    readOnly: true,
    run: (args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 50);
      return NEWS.slice(0, limit).map((n) => ({ date: n.date, text: n.content, link: n.link ? abs(n.link) : undefined }));
    },
  },
  {
    name: "get_awards_and_service",
    title: "Get awards and academic service",
    description: "Awards, fellowships and reviewing service.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
    run: () => ({ awards: AWARDS, academic_service: ACADEMIC_SERVICE }),
  },
  {
    name: "list_pages",
    title: "List site pages",
    description: "Every public page on the site (project pages, blog posts, publication list, games) with a one-line description and its URL.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    readOnly: true,
    run: () => SITE_PAGES.map((p) => ({ ...p, url: abs(p.path) })),
  },
];

export function callAgentTool(name: string, args: Record<string, unknown> = {}) {
  const tool = AGENT_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.run(args ?? {});
}

/* -------------------------------------------------------------- llms.txt */

export function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${PROFILE.name}`,
    "",
    `> ${PROFILE.role} at ${PROFILE.affiliation}. ${PROFILE.bio[0]}`,
    "",
    PROFILE.bio[1],
    "",
    "Agent access: this site exposes the same read-only tools over WebMCP in the browser (navigator.modelContext) and as a remote MCP server (Streamable HTTP) at " +
      `${SITE_URL}/mcp. A full plain-text dump of the site's content is at ${SITE_URL}/llms-full.txt.`,
    "",
    "## Profile",
    "",
    `- [Homepage](${SITE_URL}/): profile, news, selected publications, awards`,
    `- [Publications](${SITE_URL}/publications): full list with links`,
    `- [CV (PDF)](${SITE_URL}/cv.pdf)`,
    `- [Google Scholar](${PROFILE.scholar})`,
    `- [GitHub](${PROFILE.github})`,
    "",
    "## Project pages",
    "",
    ...SITE_PAGES.filter((p) => p.kind === "project").map((p) => `- [${p.title}](${abs(p.path)}): ${p.description}`),
    "",
    "## Posts",
    "",
    ...SITE_PAGES.filter((p) => p.kind === "post").map((p) => `- [${p.title}](${abs(p.path)}): ${p.description}`),
    "",
    "## Optional",
    "",
    `- [Full content for LLMs](${SITE_URL}/llms-full.txt): every publication, news item and award as Markdown`,
    `- [MCP server](${SITE_URL}/mcp): tools ${AGENT_TOOLS.map((t) => t.name).join(", ")}`,
    `- [Games](${SITE_URL}/play): browser games about the papers`,
    "",
  ];
  return lines.join("\n");
}

export function buildLlmsFullTxt(): string {
  const out: string[] = [
    `# ${PROFILE.name}`,
    "",
    `> ${PROFILE.role} at ${PROFILE.affiliation}. Website: ${SITE_URL}. Email: ${PROFILE.email}.`,
    "",
    ...PROFILE.bio.flatMap((b) => [b, ""]),
    "## Research directions",
    "",
    ...RESEARCH_PILLARS.flatMap((r) => [`### ${r.title}`, "", r.description, "", `Topics: ${r.topics.join(", ")}`, ""]),
    "## Education",
    "",
    ...EDUCATION.map((e) => `- ${e.degree}, ${e.institution} (${e.period})`),
    "",
    "## News",
    "",
    ...NEWS.map((n) => `- ${n.date}: ${n.content}${n.link ? ` (${abs(n.link)})` : ""}`),
    "",
    "## Publications",
    "",
  ];
  for (const section of PUBLICATIONS) {
    out.push(`### ${section.section}`, "");
    for (const item of section.items) {
      const r = publicationRecord({ ...item, section: section.section, id: slug(item.title) });
      out.push(`- **${r.title}**`, `  ${r.authors.join(", ")}. ${r.venue}, ${r.year}.`);
      if (r.tldr) out.push(`  TL;DR: ${r.tldr}`);
      const links = [r.paper && `paper: ${r.paper}`, r.project_page && `project: ${r.project_page}`, r.code && `code: ${r.code}`].filter(Boolean);
      if (links.length) out.push(`  ${links.join(" · ")}`);
    }
    out.push("");
  }
  out.push(
    "## Awards",
    "",
    ...AWARDS.map((a) => `- ${a.year}: ${a.title}${"detail" in a && a.detail ? ` — ${a.detail}` : ""}`),
    "",
    "## Academic service",
    "",
    ...ACADEMIC_SERVICE.map((s) => `- ${s.role}, ${s.venue} (${s.year})`),
    "",
    "## Pages",
    "",
    ...SITE_PAGES.map((p) => `- [${p.title}](${abs(p.path)}): ${p.description}`),
    "",
  );
  return out.join("\n");
}
