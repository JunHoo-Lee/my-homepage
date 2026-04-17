'use client';

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
    ArrowRight,
    ArrowUpRight,
    BookOpenText,
    Download,
    FileText,
    Github,
    Mail,
    Radar,
    Sparkles,
    Telescope,
} from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE, EDUCATION, NEWS, PUBLICATIONS, AWARDS } from "@/app/lib/data";

type Publication = {
    title: string;
    authors: string[];
    venue: string;
    year: string;
    link?: string;
    paperLink?: string;
    projectLink?: string;
    codeLink?: string;
    codeLabel?: string;
    tldr: string;
    category: string;
    subTag: string;
};

type NewsItem = {
    date: string;
    content: string;
    link: string;
    linkText: string;
};

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
};

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.08
        }
    }
};

const researchThemes = [
    "Optimization theory for generative models",
    "Diffusion language models and controllable generation",
    "Structure, inductive bias, and explainable training dynamics"
];

const capabilityCards = [
    {
        eyebrow: "Know",
        title: "Understand the agenda quickly",
        description: "Start with a compact overview of the questions I care about and the way they connect theory to generative modeling.",
        href: "/#about",
        cta: "Read the overview",
        icon: Telescope,
    },
    {
        eyebrow: "Show",
        title: "Jump straight into the strongest work",
        description: "Use the featured project pages when you want the narrative version, not just a long publication list.",
        href: "/#featured",
        cta: "See featured work",
        icon: BookOpenText,
    },
    {
        eyebrow: "Do",
        title: "Move from browsing to action",
        description: "If there is a shared research problem, the shortest path is right here: papers, CV, and a direct contact channel.",
        href: `mailto:${PROFILE.email}`,
        cta: "Start a conversation",
        icon: Mail,
    }
];

const statCards = [
    {
        label: "Recent cycle",
        value: "ACL 2026 + CVPR 2026",
        detail: "Language models, generative models, and evaluation-focused project pages."
    },
    {
        label: "Research lens",
        value: "Theory -> behavior -> usable systems",
        detail: "I like work that starts from first principles and ends in decisions people can actually make."
    },
    {
        label: "Current focus",
        value: "Diffusion LMs, controllability, optimization",
        detail: "The throughline is making large models easier to steer, explain, and trust."
    }
];

export default function Home() {
    const mainConferenceItems = PUBLICATIONS.find(
        (section) => section.section === "Main Conference"
    )?.items ?? [];

    const featuredWork = mainConferenceItems
        .filter((item) => item.link?.startsWith("/"))
        .slice(0, 3);

    const latestUpdates = NEWS.slice(0, 4);
    const totalPublications = PUBLICATIONS.reduce(
        (sum, section) => sum + section.items.length,
        0
    );
    const leadAuthorPapers = PUBLICATIONS.reduce(
        (sum, section) => sum + section.items.filter((item) => item.authors[0]?.includes("Junhoo Lee")).length,
        0
    );

    return (
        <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-24 pb-16"
        >
            <motion.section
                id="overview"
                className="relative overflow-hidden rounded-[32px] border border-stone-200/80 bg-stone-50 px-6 py-8 shadow-[0_28px_80px_-44px_rgba(28,25,23,0.4)] sm:px-8 sm:py-10 lg:px-10 lg:py-12"
                variants={fadeInUp}
            >
                <div className="absolute -left-12 top-0 h-40 w-40 rounded-full bg-amber-300/35 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
                <div className="absolute right-20 top-16 hidden h-28 w-28 rounded-full border border-stone-300/40 lg:block" />

                <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.95fr)] lg:items-start">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 shadow-sm">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                            Generative AI Researcher
                        </div>

                        <h1 className="mt-6 max-w-4xl font-serif text-4xl leading-none text-stone-950 sm:text-5xl lg:text-[4.2rem]">
                            Researching how optimization theory can make generative models easier to steer, explain, and trust.
                        </h1>

                        <p className="mt-5 max-w-3xl text-base leading-8 text-stone-700 sm:text-lg">
                            I&apos;m {PROFILE.name}, a Ph.D. candidate at {PROFILE.affiliation} (MIPAL).
                            My work connects training dynamics, inductive bias, and modern generative models,
                            with current emphasis on diffusion language models, controllable generation, and
                            theory-grounded model behavior.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <ActionButton
                                href="/#featured"
                                label="Start with featured work"
                                icon={ArrowRight}
                                tone="dark"
                            />
                            <ActionButton
                                href="/cv.pdf"
                                label="Download CV"
                                icon={Download}
                                tone="light"
                            />
                            <ActionButton
                                href={`mailto:${PROFILE.email}`}
                                label="Email me"
                                icon={Mail}
                                tone="light"
                            />
                        </div>

                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {statCards.map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-[26px] border border-stone-200/80 bg-white/78 p-5 backdrop-blur"
                                >
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                                        {stat.label}
                                    </p>
                                    <p className="mt-3 text-lg font-semibold leading-snug text-stone-950">
                                        {stat.value}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-stone-600">
                                        {stat.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-[28px] border border-stone-900/90 bg-stone-950 p-6 text-stone-50 shadow-[0_22px_54px_-36px_rgba(28,25,23,0.9)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200/80">
                                Start Here
                            </p>
                            <h2 className="mt-4 font-serif text-3xl leading-tight">
                                The homepage is organized as a compact toolkit, not a long archive.
                            </h2>
                            <div className="mt-6 space-y-3">
                                <QuickPrompt
                                    number="01"
                                    title="New visitor"
                                    description="Use the featured project cards to get the current frontier in a few minutes."
                                />
                                <QuickPrompt
                                    number="02"
                                    title="Potential collaborator"
                                    description="Jump from overview to papers, then reach out once the problem fit is clear."
                                />
                                <QuickPrompt
                                    number="03"
                                    title="Hiring committee or reviewer"
                                    description="The page surfaces recent momentum, publication context, and a downloadable CV immediately."
                                />
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-stone-200/80 bg-white/82 p-6 backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                                        Current Signal
                                    </p>
                                    <h3 className="mt-2 text-2xl font-semibold text-stone-950">
                                        Recent momentum
                                    </h3>
                                </div>
                                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    {totalPublications} pubs / {leadAuthorPapers} lead-author
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                {latestUpdates.map((item) => (
                                    <LatestUpdate key={`${item.date}-${item.content}`} item={item} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            <motion.section id="capabilities" variants={fadeInUp} className="scroll-mt-24">
                <SectionHeading
                    eyebrow="Clear Entry Points"
                    title="The best homepages explain what they are, deliver something useful immediately, and show the next move."
                    description="That principle from OpenAI&apos;s Apps guidance translates well here: the page should quickly tell visitors what I work on, show the strongest artifacts, and make the right next action obvious."
                />

                <div className="grid gap-5 lg:grid-cols-3">
                    {capabilityCards.map((card) => (
                        <CapabilityCard key={card.title} {...card} />
                    ))}
                </div>
            </motion.section>

            <motion.section id="about" className="scroll-mt-24" variants={fadeInUp}>
                <SectionHeading
                    eyebrow="Research Overview"
                    title="Theory-minded generative AI research, with enough context to orient yourself fast."
                    description="My work starts from optimization and representation questions, then follows through to how modern generative systems behave in practice."
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
                    <div className="rounded-[30px] border border-stone-200/80 bg-white/82 p-6 shadow-[0_22px_60px_-46px_rgba(28,25,23,0.35)] sm:p-8">
                        <div className="prose prose-lg max-w-none text-stone-700">
                            {PROFILE.bio.map((paragraph, index) => (
                                <p
                                    key={index}
                                    className="mb-4 leading-8"
                                    dangerouslySetInnerHTML={{ __html: emphasizeBio(paragraph) }}
                                />
                            ))}
                            <p className="mb-0 leading-8">
                                I am always open to discussing new ideas and potential collaborations.
                                Reach me at{" "}
                                <a
                                    href={`mailto:${PROFILE.email}`}
                                    className="font-semibold text-stone-950 underline decoration-amber-300 underline-offset-4"
                                >
                                    {PROFILE.email}
                                </a>
                                .
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-[30px] border border-stone-200/80 bg-stone-950 p-6 text-stone-50 shadow-[0_22px_60px_-44px_rgba(28,25,23,0.85)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-200/75">
                                Research Themes
                            </p>
                            <div className="mt-5 space-y-3">
                                {researchThemes.map((theme, index) => (
                                    <div
                                        key={theme}
                                        className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-stone-200"
                                    >
                                        <span className="mr-2 font-semibold text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                                        {theme}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[30px] border border-stone-200/80 bg-white/82 p-6">
                            <div className="flex items-center gap-2 text-stone-900">
                                <Radar className="h-4 w-4 text-amber-600" />
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                                    Education
                                </p>
                            </div>
                            <div className="mt-5 space-y-5">
                                {EDUCATION.map((edu) => (
                                    <div key={`${edu.degree}-${edu.period}`} className="space-y-1">
                                        <p className="text-lg font-semibold leading-snug text-stone-950">
                                            {edu.degree}
                                        </p>
                                        <p className="text-sm font-medium text-stone-600">
                                            {edu.institution}
                                        </p>
                                        <p className="text-xs uppercase tracking-[0.18em] text-stone-400">
                                            {edu.period}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>

            <motion.section id="featured" className="scroll-mt-24" variants={fadeInUp}>
                <SectionHeading
                    eyebrow="Featured Work"
                    title="Project pages first, because the strongest work should not be hidden inside a long publication list."
                    description="These are the best entry points if you want the narrative version of the research: motivation, framing, figures, and takeaways."
                />

                <div className="grid gap-6 xl:grid-cols-3">
                    {featuredWork.map((publication) => (
                        <FeaturedWorkCard key={publication.title} publication={publication} />
                    ))}
                </div>
            </motion.section>

            <motion.section id="news" className="scroll-mt-24" variants={fadeInUp}>
                <SectionHeading
                    eyebrow="News"
                    title="Recent updates, talks, and acceptances."
                    description="A quick timeline so returning visitors can scan what changed without hunting through the rest of the page."
                />

                <div className="space-y-3">
                    {NEWS.map((item) => (
                        <NewsTimelineItem key={`${item.date}-${item.content}`} item={item} />
                    ))}
                </div>
            </motion.section>

            <motion.section id="publications" className="scroll-mt-24" variants={fadeInUp}>
                <SectionHeading
                    eyebrow="Publications"
                    title="The full publication record, grouped by context rather than left as a flat wall of citations."
                    description="Use the project-page links when available, or jump out to papers and code directly."
                    action={(
                        <a
                            href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
                        >
                            Google Scholar
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    )}
                />

                <div className="space-y-10">
                    {PUBLICATIONS.map((section) => (
                        <div key={section.section} className="space-y-5">
                            <div className="flex items-center gap-3">
                                <span className={`h-3 w-3 rounded-full ${sectionTone(section.color)}`} />
                                <h3 className="font-serif text-3xl text-stone-950">
                                    {section.section}
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {section.items.map((publication) => (
                                    <PublicationItem key={publication.title} publication={publication} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </motion.section>

            <motion.section id="awards" className="scroll-mt-24" variants={fadeInUp}>
                <SectionHeading
                    eyebrow="Awards & Honors"
                    title="Selected recognitions and scholarships."
                    description="A compact summary of support, prizes, and research distinctions."
                />

                <div className="grid gap-4 md:grid-cols-2">
                    {AWARDS.map((award) => (
                        <AwardsItem key={`${award.year}-${award.title}`} {...award} />
                    ))}
                </div>
            </motion.section>

            <motion.section variants={fadeInUp}>
                <div className="rounded-[32px] border border-stone-900 bg-stone-950 px-6 py-8 text-stone-50 shadow-[0_30px_80px_-42px_rgba(28,25,23,0.95)] sm:px-8 sm:py-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200/80">
                        Collaboration
                    </p>
                    <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <h2 className="font-serif text-3xl leading-tight sm:text-4xl">
                                If you are working on controllable generative models, optimization, or theory-grounded ML, let&apos;s talk.
                            </h2>
                            <p className="mt-4 text-base leading-8 text-stone-300">
                                The fastest route is still the simplest one: skim the featured work, grab the CV if helpful, and send me a note with the problem you&apos;re thinking about.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <ActionButton
                                href={`mailto:${PROFILE.email}`}
                                label="Email Junhoo"
                                icon={Mail}
                                tone="light-on-dark"
                            />
                            <ActionButton
                                href="/cv.pdf"
                                label="Download CV"
                                icon={Download}
                                tone="ghost-on-dark"
                            />
                        </div>
                    </div>
                </div>
            </motion.section>
        </motion.div>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                    {eyebrow}
                </p>
                <h2 className="mt-4 font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
                    {title}
                </h2>
                <p className="mt-4 text-base leading-8 text-stone-600">
                    {description}
                </p>
            </div>
            {action}
        </div>
    );
}

function CapabilityCard({
    eyebrow,
    title,
    description,
    href,
    cta,
    icon: Icon,
}: {
    eyebrow: string;
    title: string;
    description: string;
    href: string;
    cta: string;
    icon: LucideIcon;
}) {
    return (
        <div className="group rounded-[28px] border border-stone-200/80 bg-white/82 p-6 shadow-[0_18px_56px_-46px_rgba(28,25,23,0.3)] transition duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_28px_80px_-46px_rgba(28,25,23,0.38)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                        {eyebrow}
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold leading-tight text-stone-950">
                        {title}
                    </h3>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-700">
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-600">
                {description}
            </p>
            <div className="mt-6">
                <ActionButton href={href} label={cta} icon={ArrowRight} tone="light" />
            </div>
        </div>
    );
}

function FeaturedWorkCard({ publication }: { publication: Publication }) {
    const paperLabel = publication.paperLink?.includes("arxiv.org") ? "arXiv" : "Paper";

    return (
        <article className="group relative overflow-hidden rounded-[30px] border border-stone-200/80 bg-white/85 p-6 shadow-[0_20px_70px_-48px_rgba(28,25,23,0.4)] transition duration-300 hover:-translate-y-1 hover:border-stone-300">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-amber-200/25 blur-3xl transition duration-300 group-hover:bg-amber-300/30" />
            <div className="relative">
                <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryTone(publication.category)}`}>
                        {publication.category}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
                        {publication.year}
                    </span>
                    <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-500">
                        {shortVenue(publication.venue)}
                    </span>
                </div>

                <h3 className="mt-6 font-serif text-3xl leading-tight text-stone-950">
                    {publication.title}
                </h3>

                <p className="mt-4 text-sm leading-7 text-stone-600">
                    {publication.tldr}
                </p>

                <div className="mt-6 space-y-3">
                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-3 text-sm text-stone-600">
                        <span className="font-semibold text-stone-950">Why start here:</span>{" "}
                        These project pages give a stronger sense of motivation, structure, and takeaways than a citation line alone.
                    </div>
                    <div className="text-sm font-medium text-stone-500">
                        {publication.authors.join(", ")}
                    </div>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                    {publication.link && (
                        <ActionButton
                            href={publication.link}
                            label="Open project page"
                            icon={ArrowUpRight}
                            tone="dark"
                        />
                    )}
                    {publication.paperLink && (
                        <ActionButton
                            href={publication.paperLink}
                            label={paperLabel}
                            icon={FileText}
                            tone="light"
                        />
                    )}
                    {publication.codeLink && (
                        <ActionButton
                            href={publication.codeLink}
                            label="Code"
                            icon={Github}
                            tone="light"
                        />
                    )}
                </div>
            </div>
        </article>
    );
}

function LatestUpdate({ item }: { item: NewsItem }) {
    return (
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                {item.date}
            </p>
            <p className="mt-2 text-sm leading-7 text-stone-700">
                {renderNewsContent(item)}
            </p>
        </div>
    );
}

function NewsTimelineItem({ item }: { item: NewsItem }) {
    return (
        <div className="rounded-[24px] border border-stone-200/80 bg-white/82 px-5 py-4 shadow-[0_18px_50px_-44px_rgba(28,25,23,0.28)]">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:gap-6">
                <div className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                    {item.date}
                </div>
                <div className="text-sm leading-7 text-stone-700">
                    {renderNewsContent(item)}
                </div>
            </div>
        </div>
    );
}

function PublicationItem({ publication }: { publication: Publication }) {
    const resolvedProjectLink = publication.projectLink ?? (publication.link?.startsWith("/") ? publication.link : undefined);
    const resolvedPaperLink = publication.paperLink ?? (publication.link && !publication.link.startsWith("/") ? publication.link : undefined);
    const resolvedCodeLink = publication.codeLink;
    const paperLabel = resolvedPaperLink?.includes("arxiv.org") ? "arXiv" : "Paper";
    const venueFull = fullVenue(publication.venue);

    return (
        <article className="rounded-[28px] border border-stone-200/80 bg-white/84 p-5 shadow-[0_18px_58px_-46px_rgba(28,25,23,0.3)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                    <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoryTone(publication.category)}`}>
                            {shortVenue(publication.venue)}
                        </span>
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">
                            {publication.year}
                        </span>
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-500">
                            {publication.subTag}
                        </span>
                    </div>

                    <h4 className="mt-4 text-xl font-semibold leading-snug text-stone-950">
                        {resolvedProjectLink ? (
                            <Link
                                href={resolvedProjectLink}
                                className="transition hover:text-stone-700 hover:underline decoration-amber-300 underline-offset-4"
                            >
                                {publication.title}
                            </Link>
                        ) : resolvedPaperLink ? (
                            <a
                                href={resolvedPaperLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition hover:text-stone-700 hover:underline decoration-amber-300 underline-offset-4"
                            >
                                {publication.title}
                            </a>
                        ) : (
                            publication.title
                        )}
                    </h4>

                    {venueFull !== shortVenue(publication.venue) && (
                        <p className="mt-2 text-sm leading-7 text-stone-500">
                            {venueFull}
                        </p>
                    )}

                    <p className="mt-3 text-sm leading-7 text-stone-600">
                        {publication.authors.map((author, index) => (
                            <span key={author}>
                                <span className={author.includes("Junhoo Lee") ? "font-semibold text-stone-950" : undefined}>
                                    {author}
                                </span>
                                {index < publication.authors.length - 1 ? ", " : ""}
                            </span>
                        ))}
                    </p>

                    <p className="mt-4 border-l-2 border-amber-200 pl-4 text-sm leading-7 text-stone-600">
                        {publication.tldr}
                    </p>
                </div>

                {(resolvedProjectLink || resolvedPaperLink || resolvedCodeLink) && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                        {resolvedProjectLink && (
                            <ActionButton
                                href={resolvedProjectLink}
                                label="Project page"
                                icon={ArrowUpRight}
                                tone="light"
                            />
                        )}
                        {resolvedPaperLink && (
                            <ActionButton
                                href={resolvedPaperLink}
                                label={paperLabel}
                                icon={FileText}
                                tone="light"
                            />
                        )}
                        {resolvedCodeLink && (
                            <ActionButton
                                href={resolvedCodeLink}
                                label={publication.codeLabel ?? "Code"}
                                icon={Github}
                                tone="light"
                            />
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

function AwardsItem({ year, title, amount }: { year: string; title: string; amount?: string }) {
    return (
        <div className="rounded-[24px] border border-stone-200/80 bg-white/82 p-5 shadow-[0_18px_50px_-44px_rgba(28,25,23,0.28)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                {year}
            </p>
            <p className="mt-3 text-lg font-semibold leading-snug text-stone-950">
                {title}
            </p>
            {amount && (
                <p className="mt-2 text-sm text-stone-500">
                    {amount}
                </p>
            )}
        </div>
    );
}

function QuickPrompt({
    number,
    title,
    description,
}: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                    {number}
                </span>
                <div>
                    <p className="font-semibold text-stone-50">
                        {title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-stone-300">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ActionButton({
    href,
    label,
    icon: Icon,
    tone,
}: {
    href: string;
    label: string;
    icon: LucideIcon;
    tone: "dark" | "light" | "light-on-dark" | "ghost-on-dark";
}) {
    const baseClassName =
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition duration-200";

    const toneClassName =
        tone === "dark"
            ? "border border-stone-950 bg-stone-950 text-stone-50 hover:bg-stone-800"
            : tone === "light"
                ? "border border-stone-300 bg-white text-stone-700 hover:border-stone-950 hover:text-stone-950"
                : tone === "light-on-dark"
                    ? "border border-white/15 bg-white text-stone-950 hover:bg-stone-100"
                    : "border border-white/15 bg-white/6 text-stone-50 hover:border-white/25 hover:bg-white/10";

    if (isRouteHref(href)) {
        return (
            <Link href={href} className={`${baseClassName} ${toneClassName}`}>
                <Icon className="h-4 w-4" />
                {label}
            </Link>
        );
    }

    return (
        <a
            href={href}
            target={isExternalHref(href) ? "_blank" : undefined}
            rel={isExternalHref(href) ? "noopener noreferrer" : undefined}
            className={`${baseClassName} ${toneClassName}`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </a>
    );
}

function renderNewsContent(item: NewsItem) {
    const [before, after] = item.content.split(item.linkText);

    if (isRouteHref(item.link)) {
        return (
            <>
                {before}
                <Link
                    href={item.link}
                    className="font-semibold text-stone-950 underline decoration-amber-300 underline-offset-4"
                >
                    {item.linkText}
                </Link>
                {after}
            </>
        );
    }

    return (
        <>
            {before}
            <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-stone-950 underline decoration-amber-300 underline-offset-4"
            >
                {item.linkText}
            </a>
            {after}
        </>
    );
}

function emphasizeBio(paragraph: string) {
    return paragraph
        .replace("Junhoo Lee", "<strong>Junhoo Lee</strong>")
        .replace("optimization theory", "<strong>optimization theory</strong>")
        .replace("modern generative AI", "<strong>modern generative AI</strong>")
        .replace("Diffusion Models", "<strong>Diffusion Models</strong>")
        .replace("LLMs", "<strong>LLMs</strong>");
}

function shortVenue(venue: string) {
    const match = venue.match(/^(.*)\(([^()]+)\)\s*$/);
    return match ? match[2].trim() : venue;
}

function fullVenue(venue: string) {
    const match = venue.match(/^(.*)\(([^()]+)\)\s*$/);
    return match ? match[1].trim() : venue;
}

function categoryTone(category: string) {
    switch (category) {
        case "Large Language Models":
            return "border-amber-200 bg-amber-50 text-amber-700";
        case "Generative Models":
            return "border-violet-200 bg-violet-50 text-violet-700";
        case "Learning Theory":
            return "border-sky-200 bg-sky-50 text-sky-700";
        case "Knowledge Distillation":
            return "border-indigo-200 bg-indigo-50 text-indigo-700";
        case "Meta-Learning":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "Data Efficiency":
            return "border-teal-200 bg-teal-50 text-teal-700";
        default:
            return "border-stone-200 bg-stone-50 text-stone-700";
    }
}

function sectionTone(color: string) {
    switch (color) {
        case "blue":
            return "bg-sky-500";
        case "teal":
            return "bg-teal-500";
        case "indigo":
            return "bg-indigo-500";
        default:
            return "bg-stone-400";
    }
}

function isRouteHref(href: string) {
    return href.startsWith("/") || href.startsWith("#");
}

function isExternalHref(href: string) {
    return href.startsWith("http://") || href.startsWith("https://");
}
