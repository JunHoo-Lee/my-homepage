import Image from "next/image";
import Link from "next/link";
import { Merriweather, Noto_Sans } from "next/font/google";

import styles from "./AnyWayMetaLearningProjectPage.module.css";

const bodyFont = Noto_Sans({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-awml-body",
});

const displayFont = Merriweather({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-awml-display",
    weight: ["400", "700"],
});

const sectionLinks = [
    { id: "abstract", label: "Abstract" },
    { id: "method", label: "Method Overview" },
    { id: "results", label: "Benchmark Highlights" },
    { id: "analysis", label: "Analysis" },
    { id: "bibtex", label: "BibTeX" },
];

const abstractParagraphs = [
    "Meta-learning is usually trained and evaluated under a fixed N-way setup, even though real few-shot tasks do not arrive with a single, immutable class cardinality.",
    "Any-Way Meta Learning starts from the observation that episodic numeric labels are exchangeable: the same semantic class can be mapped to different numeric labels across episodes, so the classifier should not have to inherit a fixed-way bottleneck from training.",
    "The paper turns that observation into an any-way training recipe, then adds semantic supervision and mixup-style regularization to recover class-level structure that pure label equivalence would otherwise discard.",
];

const resultCards = [
    {
        value: "79.30%",
        title: "TieredImageNet, 3-way, 5-shot",
        description:
            "a-MAML improves over fixed-way MAML at 73.16% while training and testing on the same benchmark.",
    },
    {
        value: "70.42%",
        title: "Cars, 5-way, 5-shot",
        description:
            "Any-way training beats fixed-way MAML at 66.59% on a fine-grained in-domain evaluation.",
    },
    {
        value: "57.29%",
        title: "Cars to Mini, 3-way, 5-shot",
        description:
            "Cross-domain transfer stays stronger than fixed-way MAML at 51.91%, supporting the domain-generalization claim.",
    },
    {
        value: "No corruption",
        title: "10-way, 1-shot stability",
        description:
            "The paper reports repeated training failures for fixed-way MAML, while a-MAML with O=30 remained stable.",
    },
];

const analysisCards = [
    {
        value: "65.00 -> 66.99",
        title: "MiniImageNet ensemble gain",
        description:
            "Increasing assignment sets in the ensemble view consistently improves 5-way MiniImageNet accuracy for a-MAML.",
    },
    {
        value: "47.66 -> 49.82",
        title: "Cars ensemble gain",
        description:
            "The same free-ensemble effect transfers to Cars, where more assignment sets also improve performance.",
    },
    {
        value: "63.91 / 66.71 / 66.73",
        title: "MiniImageNet 5-way with O=10 / 20 / 30",
        description:
            "Larger output pools help because they unlock more assignment diversity and stronger ensemble behavior.",
    },
    {
        value: "65.41 -> 66.89",
        title: "Fixed-way + semantic on Mini to Mini",
        description:
            "Injecting semantic class information improves meta-learning even when the base learner is still fixed-way.",
    },
];

const bibtex = `@misc{lee2024anywaymetalearning,
  title={Any-Way Meta Learning},
  author={Junhoo Lee and Yearim Kim and Hyunho Lee and Nojun Kwak},
  year={2024},
  eprint={2401.05097},
  archivePrefix={arXiv},
  primaryClass={cs.LG},
  url={https://arxiv.org/abs/2401.05097},
}`;

function MetricCard({
    value,
    title,
    description,
}: {
    value: string;
    title: string;
    description: string;
}) {
    return (
        <article className={styles.metricCard}>
            <p className={styles.metricValue}>{value}</p>
            <h3 className={styles.metricTitle}>{title}</h3>
            <p className={styles.metricDescription}>{description}</p>
        </article>
    );
}

function Section({
    id,
    title,
    children,
}: {
    id: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className={styles.section}>
            <div className={styles.container}>
                <div className={styles.sectionBox}>
                    <h2 className={styles.sectionTitle}>{title}</h2>
                    {children}
                </div>
            </div>
        </section>
    );
}

export default function AnyWayMetaLearningProjectPage() {
    return (
        <main className={`${styles.page} ${bodyFont.variable} ${displayFont.variable}`}>
            <nav className={styles.navbar} aria-label="Section navigation">
                <div className={styles.navInner}>
                    {sectionLinks.map((link) => (
                        <a key={link.id} href={`#${link.id}`} className={styles.navLink}>
                            {link.label}
                        </a>
                    ))}
                </div>
            </nav>

            <section className={styles.hero}>
                <div className={styles.container}>
                    <div className={styles.heroCard}>
                        <p className={styles.eyebrow}>AAAI 2024</p>
                        <h1 className={styles.title}>Any-Way Meta Learning</h1>
                        <p className={styles.authors}>
                            Junhoo Lee, Yearim Kim, Hyunho Lee, Nojun Kwak
                        </p>
                        <p className={styles.affiliation}>Seoul National University</p>
                        <p className={styles.authorNote}>Yearim Kim and Hyunho Lee contributed equally.</p>

                        <div className={styles.linkRow}>
                            <a
                                href="/any-way-meta-learning/any-way-meta-learning.pdf"
                                className={styles.primaryButton}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Paper PDF
                            </a>
                            <a
                                href="https://arxiv.org/abs/2401.05097"
                                className={styles.secondaryButton}
                                target="_blank"
                                rel="noreferrer"
                            >
                                arXiv
                            </a>
                            <Link href="/" className={styles.secondaryButton}>
                                Home
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.teaserSection}>
                <div className={styles.container}>
                    <div className={`${styles.sectionBox} ${styles.figureBox}`}>
                        <div className={styles.sectionText}>
                            <p>
                                Any-Way Meta Learning reframes episodic supervision around label equivalence. Once
                                semantic classes are decoupled from the temporary numeric labels assigned inside each
                                episode, the learner no longer needs to inherit a fixed-way classifier head from
                                training time.
                            </p>
                        </div>
                        <div className={styles.figurePanel}>
                            <Image
                                src="/any-way-meta-learning/task-sampling.png"
                                alt="Task sampling figure for Any-Way Meta Learning."
                                width={9734}
                                height={3600}
                                className={styles.heroImage}
                                priority
                            />
                        </div>
                    </div>
                </div>
            </section>

            <Section id="abstract" title="Abstract">
                <div className={styles.sectionText}>
                    {abstractParagraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                    ))}
                </div>
            </Section>

            <Section id="method" title="Method Overview">
                <div className={styles.sectionText}>
                    <p>
                        The method replaces the usual fixed N-way classifier with a larger output pool of size O. For
                        each episode, the algorithm samples a task cardinality N, draws non-overlapping numeric-label
                        assignments from that output pool, and optimizes the same underlying task through multiple label
                        views.
                    </p>
                    <p>
                        In the paper&apos;s main setup, training episodes vary across 3, 5, 7, and 9 ways while testing
                        still includes 10-way evaluation. This lets the model learn across task cardinalities instead of
                        specializing to only one of them.
                    </p>
                    <p>
                        Because pure label equivalence can wash out semantic structure, the framework also adds a
                        semantic classifier and mixup-style supervision to re-inject class meaning when needed.
                    </p>
                </div>

                <div className={styles.mediaGrid}>
                    <figure className={styles.figurePanel}>
                        <Image
                            src="/any-way-meta-learning/method-overview.png"
                            alt="Overall method overview for Any-Way Meta Learning."
                            width={2044}
                            height={2647}
                            className={styles.contentImage}
                        />
                        <figcaption className={styles.caption}>
                            The any-way classifier reuses a larger output pool and couples it with a semantic branch to
                            retain class-level meaning.
                        </figcaption>
                    </figure>
                    <figure className={styles.figurePanel}>
                        <Image
                            src="/any-way-meta-learning/semantic-equivalence.png"
                            alt="Semantic class to numeric class equivalence illustration."
                            width={9734}
                            height={3600}
                            className={styles.contentImage}
                        />
                        <figcaption className={styles.caption}>
                            A single semantic class can land on different numeric labels across episodes, which is the
                            label-equivalence intuition behind any-way training.
                        </figcaption>
                    </figure>
                </div>
            </Section>

            <Section id="results" title="Benchmark Highlights">
                <div className={styles.sectionText}>
                    <p>
                        Across MiniImageNet, TieredImageNet, Cars, and CUB, the paper shows that any-way MAML matches
                        or surpasses fixed-way MAML on both in-domain and cross-domain evaluations. The gains are
                        especially noticeable when the test-time way differs from the training episodes or when the task
                        is fine-grained.
                    </p>
                    <p>
                        The central point is not only higher peak accuracy, but also broader operating range: the same
                        learner can handle multiple task cardinalities without being retrained for each specific way.
                    </p>
                </div>

                <div className={styles.metricGrid}>
                    {resultCards.map((card) => (
                        <MetricCard key={card.title} {...card} />
                    ))}
                </div>
            </Section>

            <Section id="analysis" title="Analysis">
                <div className={styles.sectionText}>
                    <p>
                        The paper explains the improvement through two complementary effects. First, any-way training
                        escapes the early optimization stall faster than fixed-way training, which shows up clearly in the
                        validation curves. Second, every new numeric-label assignment acts like an almost-free ensemble
                        member, so the model keeps gaining robustness as more assignments or output nodes are used.
                    </p>
                    <p>
                        Semantic supervision further helps when transferring across related but not identical datasets,
                        especially once the benchmarks become more fine-grained.
                    </p>
                </div>

                <div className={styles.analysisLayout}>
                    <figure className={styles.figurePanel}>
                        <Image
                            src="/any-way-meta-learning/convergence.png"
                            alt="Convergence plot comparing fixed-way and any-way MAML."
                            width={6400}
                            height={3600}
                            className={styles.contentImage}
                        />
                        <figcaption className={styles.caption}>
                            a-MAML moves through the start-up stall earlier and reaches higher validation accuracy than
                            fixed-way MAML in both 1-shot and 5-shot settings.
                        </figcaption>
                    </figure>

                    <div className={styles.metricGrid}>
                        {analysisCards.map((card) => (
                            <MetricCard key={card.title} {...card} />
                        ))}
                    </div>
                </div>
            </Section>

            <Section id="bibtex" title="BibTeX">
                <pre className={styles.bibtexBlock}>
                    <code>{bibtex}</code>
                </pre>
            </Section>

            <footer className={styles.footer}>
                <div className={styles.container}>
                    <p>
                        This page adapts the section-first academic project-page pattern used in the referenced template,
                        while reimplementing it as a standalone Next.js route with figures rendered directly from the
                        paper&apos;s TeX assets.
                    </p>
                </div>
            </footer>
        </main>
    );
}
