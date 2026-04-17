"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronUp,
  FileText,
  Github,
  Home,
  Quote,
  Search,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { Manrope, Space_Grotesk } from "next/font/google";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import BibtexCopyButton from "./BibtexCopyButton";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
});

type ScoreTone = "match" | "uncertain" | "below" | "plain";

type ScoreCell = {
  value: string;
  tone: ScoreTone;
  dominant?: boolean;
};

type ScoreRow = {
  label: string;
  cells: ScoreCell[];
};

type ScoreSection = {
  family: string;
  rows: ScoreRow[];
};

const abstractParagraphs = [
  "Text-to-image models are commercially valuable assets often distributed under restrictive licenses, but such licenses are enforceable only when violations can be detected. Existing methods require pre-deployment watermarking or internal model access, which are unavailable in commercial API deployments.",
  "We present Compositional Semantic Fingerprinting (CSF), the first black-box method for attributing fine-tuned text-to-image models to protected lineages using only query access. CSF treats models as semantic category generators and probes them with compositional underspecified prompts that remain rare under fine-tuning. Across 6 model families and 13 fine-tuned variants, the Bayesian attribution framework supports controlled-risk lineage decisions, with all variants satisfying the dominance criterion.",
];

const heroStats = [
  {
    value: "6",
    label: "Protected base families",
    detail: "Flux, Kandinsky, SD1.5, SD2.1, SD3, and SDXL",
  },
  {
    value: "13",
    label: "Fine-tuned suspects",
    detail: "Every suspect is queried only through the final API surface",
  },
  {
    value: "13/13",
    label: "Dominant lineage calls",
    detail: "All variants satisfy the dominance criterion in the main study",
  },
];

const quickNavLinks = [
  { label: "Abstract", href: "#abstract" },
  { label: "Challenge", href: "#challenge" },
  { label: "Method", href: "#method" },
  { label: "Results", href: "#results" },
  { label: "Analysis", href: "#analysis" },
  { label: "Paper", href: "#paper" },
  { label: "BibTeX", href: "#bibtex" },
];

const capabilityCards: Array<{
  eyebrow: string;
  title: string;
  copy: string;
  icon: ReactNode;
}> = [
  {
    eyebrow: "Know",
    title: "Recover lineage from query-only access.",
    copy:
      "CSF estimates prompt-conditioned semantic distributions and turns transport distance into posterior evidence over candidate protected bases.",
    icon: <Search size={20} />,
  },
  {
    eyebrow: "Show",
    title: "Make attribution legible in one pass.",
    copy:
      "The page foregrounds the exact structured outputs people need first: lineage tables, metric gaps, and compact evidence summaries instead of long lead-in text.",
    icon: <BarChart3 size={20} />,
  },
  {
    eyebrow: "Verify",
    title: "Stress-test the fingerprint under adaptation.",
    copy:
      "Adversarial concept removal and the human study show that the signal is distributed across semantics rather than tied to one brittle trigger.",
    icon: <ShieldCheck size={20} />,
  },
];

const baseModelColumns = [
  "Flux-Base",
  "Kandinsky-Base",
  "SD1.5-Base",
  "SD2.1-Base",
  "SD3-Medium-Base",
  "SDXL-Base",
];

const mainPosteriorSections: ScoreSection[] = [
  {
    family: "Flux Family",
    rows: [
      {
        label: "Flux-LoRA",
        cells: [
          { value: "0.932", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.068", tone: "uncertain" },
        ],
      },
      {
        label: "Flux-Turbo-Alpha",
        cells: [
          { value: "0.977", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
        ],
      },
    ],
  },
  {
    family: "Kandinsky Family",
    rows: [
      {
        label: "Kandinsky-Naruto",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.977", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
        ],
      },
      {
        label: "Kandinsky-Pokemon-LoRA",
        cells: [
          { value: "0.049", tone: "uncertain" },
          { value: "0.829", tone: "match", dominant: true },
          { value: "0.049", tone: "uncertain" },
          { value: "0.098", tone: "uncertain" },
          { value: "0.024", tone: "uncertain" },
          { value: "0.049", tone: "uncertain" },
        ],
      },
    ],
  },
  {
    family: "SD1.5 Family",
    rows: [
      {
        label: "SD1.5-1.2-Base",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.841", tone: "match", dominant: true },
          { value: "0.114", tone: "uncertain" },
          { value: "0.023", tone: "below" },
          { value: "0.068", tone: "uncertain" },
        ],
      },
      {
        label: "SD1.5-1.4-Base",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.977", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
        ],
      },
      {
        label: "SD1.5-DreamShaper",
        cells: [
          { value: "0.091", tone: "uncertain" },
          { value: "0.068", tone: "uncertain" },
          { value: "0.659", tone: "match", dominant: true },
          { value: "0.045", tone: "uncertain" },
          { value: "0.068", tone: "uncertain" },
          { value: "0.159", tone: "uncertain" },
        ],
      },
    ],
  },
  {
    family: "SD2.1 Family",
    rows: [
      {
        label: "SD2.1-DPO",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.977", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
        ],
      },
      {
        label: "SD2.1-LAION-Art",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.977", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
        ],
      },
    ],
  },
  {
    family: "SD3 Family",
    rows: [
      {
        label: "SD3-Reality-Mix",
        cells: [
          { value: "0.136", tone: "uncertain" },
          { value: "0.091", tone: "uncertain" },
          { value: "0.023", tone: "below" },
          { value: "0.045", tone: "uncertain" },
          { value: "0.705", tone: "match", dominant: true },
          { value: "0.091", tone: "uncertain" },
        ],
      },
      {
        label: "SD3-VAE-Anime",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.977", tone: "match", dominant: true },
          { value: "0.023", tone: "below" },
        ],
      },
    ],
  },
  {
    family: "SDXL Family",
    rows: [
      {
        label: "SDXL-DPO",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.023", tone: "below" },
          { value: "0.977", tone: "match", dominant: true },
        ],
      },
      {
        label: "SDXL-Lightning-4Step",
        cells: [
          { value: "0.023", tone: "below" },
          { value: "0.091", tone: "uncertain" },
          { value: "0.023", tone: "below" },
          { value: "0.068", tone: "uncertain" },
          { value: "0.023", tone: "below" },
          { value: "0.864", tone: "match", dominant: true },
        ],
      },
    ],
  },
];

const ablationSections: ScoreSection[] = [
  {
    family: "Adversarial Concept Removal (9 animal probes)",
    rows: [
      {
        label: "Flux-LoRA",
        cells: [
          { value: "0.714", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.286", tone: "plain" },
        ],
      },
      {
        label: "Flux-Turbo-Alpha",
        cells: [
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "Kandinsky-Naruto",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "Kandinsky-Pokemon-LoRA",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD1.5-1.2-Base",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD1.5-1.4-Base",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD1.5-Animal-Erase",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD1.5-DreamShaper",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.714", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.286", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD2.1-DPO",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD2.1-LAION-Art",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD3-Reality-Mix",
        cells: [
          { value: "0.286", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.714", tone: "match" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SD3-VAE-Anime",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
          { value: "0.143", tone: "plain" },
        ],
      },
      {
        label: "SDXL-DPO",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.857", tone: "match" },
        ],
      },
      {
        label: "SDXL-Lightning-4Step",
        cells: [
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.286", tone: "plain" },
          { value: "0.143", tone: "plain" },
          { value: "0.714", tone: "match" },
        ],
      },
    ],
  },
];

const analysisCards = [
  {
    eyebrow: "Prompt Figure",
    src: "/csf/prompt-ablation.png",
    alt: "Ring figure showing prompt-conditioned semantic mixtures",
    width: 828,
    height: 288,
    title: "Context rotates the semantic mixture.",
    caption:
      "Holding the core subject fixed while changing only the scene context changes the semantic mixture a model resolves, which is the exact signal CSF measures.",
  },
  {
    eyebrow: "Figure 4",
    src: "/csf/userstudy.png",
    alt: "Human study showing stronger lineage identification under CSF prompts",
    width: 552,
    height: 249,
    title: "Human study aligns with the fingerprint.",
    caption:
      "The original paper's human study shows that observers identify the protected base model much more accurately under CSF prompts than under naive prompts.",
  },
];

const metricComparisonRows = [
  {
    variant: "Flux-LoRA",
    wasserstein: "93.2%",
    jsd: "77.3%",
    gap: "+15.9%",
  },
  {
    variant: "Kandinsky-Naruto",
    wasserstein: "97.7%",
    jsd: "43.2%",
    gap: "+54.5%",
  },
  {
    variant: "SD3-Reality-Mix",
    wasserstein: "70.5%",
    jsd: "56.8%",
    gap: "+13.7%",
  },
  {
    variant: "SDXL-DPO",
    wasserstein: "97.7%",
    jsd: "70.5%",
    gap: "+27.2%",
  },
];

const bibtex = `@inproceedings{lee2026csf,
  title={CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models},
  author={Lee, Junhoo and Koo, Mijin and Kwak, Nojun},
  booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)},
  year={2026}
}`;

export default function CSFPage() {
  return (
    <div id="top" className={`${manrope.className} csf-page`}>
      <a className="scroll-to-top" href="#top" aria-label="Scroll to top">
        <ChevronUp size={18} />
      </a>

      <main id="main-content">
        <section className="hero publication-header">
          <div className="hero-orb hero-orb--left" />
          <div className="hero-orb hero-orb--right" />
          <div className="hero-body">
            <div className="container is-max-quant">
              <div className="hero-shell">
                <div className="hero-copy-column">
                  <p className="hero-kicker">
                    CVPR 2026 · Query-only lineage attribution for text-to-image
                    APIs
                  </p>
                  <h1
                    className={`title is-1 publication-title hero-title ${spaceGrotesk.className}`}
                  >
                    CSF: Black-box Fingerprinting via Compositional Semantics
                    for Text-to-Image Models
                  </h1>

                  <div className="is-size-5 publication-authors">
                    <span className="author-block">
                      <a href="https://junhoo.me" target="_blank" rel="noreferrer">
                        Junhoo Lee
                      </a>
                      ,
                    </span>
                    <span className="author-block">Mijin Koo,</span>
                    <span className="author-block">Nojun Kwak</span>
                  </div>

                  <p className="hero-role">
                    A query-only fingerprint that traces fine-tuned text-to-image
                    models back to protected base families without watermarking
                    or internal access.
                  </p>

                  <div className="is-size-5 publication-authors hero-meta-line">
                    <span className="author-block">
                      Seoul National University
                    </span>
                    <span className="publication-venue">CVPR 2026</span>
                  </div>

                  <p className="hero-next-step">
                    Start with the 13/13 dominant attribution result, then drill
                    into the metric gap and adversarial-erasure evidence.
                  </p>

                  <div className="publication-links">
                    <PublicationLink
                      href="/csf/csf-paper.pdf"
                      label="Paper"
                      external
                      icon={<FileText size={18} />}
                    />
                    <PublicationLink
                      href="https://github.com/JunHoo-Lee/csf-t2i-fingerprinting"
                      label="Code"
                      external
                      icon={<Github size={18} />}
                    />
                    <PublicationLink
                      href="#results"
                      label="Results"
                      icon={<ArrowRight size={18} />}
                      tone="accent"
                    />
                    <PublicationLink
                      href="#bibtex"
                      label="BibTeX"
                      icon={<Quote size={18} />}
                      tone="light"
                    />
                    <PublicationLink
                      href="/#publications"
                      label="Homepage"
                      icon={<Home size={18} />}
                      tone="light"
                    />
                  </div>

                  <p className="hero-helper">
                    First meaningful response, per the OpenAI ChatGPT app design
                    guidance: explain the role in one line, show useful output
                    immediately, and make the next action obvious.
                  </p>
                </div>

                <aside className="hero-visual-card">
                  <p className="hero-panel-eyebrow">What this page shows fast</p>
                  <h2 className="hero-panel-title">
                    The value is structured evidence, not a miniature product.
                  </h2>

                  <div className="hero-stat-grid">
                    {heroStats.map((stat) => (
                      <article key={stat.label} className="hero-stat-card">
                        <p className="hero-stat-value">{stat.value}</p>
                        <p className="hero-stat-label">{stat.label}</p>
                        <p className="hero-stat-detail">{stat.detail}</p>
                      </article>
                    ))}
                  </div>

                  <figure className="hero-preview">
                    <Image
                      src="/csf/comparison-v2.png"
                      alt="Comparison between watermarking, traditional fingerprinting, and CSF in the query-only setting"
                      width={1120}
                      height={780}
                      priority
                    />
                  </figure>
                  <p className="hero-preview-caption">
                    CSF is built for the most restrictive setting: the defender
                    only sees the final text-to-image API and must still recover
                    protected lineage evidence.
                  </p>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section className="section hero-primer">
          <div className="container is-max-quant">
            <nav className="quick-nav" aria-label="CSF sections">
              {quickNavLinks.map((item) => (
                <a key={item.href} href={item.href} className="quick-nav-link">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="capability-grid">
              {capabilityCards.map((card) => (
                <article key={card.title} className="capability-card">
                  <div className="capability-icon">{card.icon}</div>
                  <p className="capability-eyebrow">{card.eyebrow}</p>
                  <h3 className="capability-title">{card.title}</h3>
                  <p className="capability-copy">{card.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section hero is-light" id="abstract">
          <div className="container is-max-desktop">
            <div className="columns is-centered">
              <div className="column is-four-fifths">
                <h2 className="title is-3 has-text-centered">Abstract</h2>
                <div className="content has-text-justified">
                  {abstractParagraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="challenge">
          <div className="container is-max-desktop">
            <div className="narrative-block">
              <p className="section-label">Challenges</p>
              <h2 className="title is-3 has-text-centered">
                Why naive visual matching fails.
              </h2>
              <p className="section-copy has-text-centered">
                Fine-tuning often changes texture, palette, composition, and
                rendering style so aggressively that side-by-side visual
                inspection becomes unreliable. Two models can share the same
                lineage while looking very different at the pixel level, which
                is exactly why CSF avoids direct visual matching and instead
                measures how a model resolves ambiguous semantic prompts.
              </p>
              <figure className="narrative-figure challenge-figure">
                <Image
                  src="/csf/family-game.png"
                  alt="Style drift across related model families makes direct visual matching unreliable"
                  width={2250}
                  height={1124}
                />
              </figure>
              <p className="figure-caption has-text-centered">
                This challenge figure shows why lineage attribution is hard in
                practice: downstream variants can move far away in style while
                still inheriting the same semantic prior from the protected base
                model. A robust black-box method therefore has to focus on the
                semantic distribution a model produces, not on superficial style
                similarity.
              </p>
            </div>
          </div>
        </section>

        <section className="section hero is-light" id="method">
          <div className="container is-max-desktop">
            <div className="narrative-block">
              <p className="section-label">Methods</p>
              <h2 className="title is-3 has-text-centered">
                Method overview.
              </h2>
              <p className="section-copy has-text-centered">
                CSF estimates prompt-conditioned semantic distributions,
                compares them with Wasserstein distance, and converts the
                resulting distances into a posterior over candidate lineages.
              </p>
            </div>

            <div className="methods-grid">
              <article className="method-card">
                <h3 className="method-title">Problem formulation</h3>
                <p className="method-copy">
                  We are given a set of protected base models and a deployed
                  suspect API that may have been fine-tuned from one of them.
                  The defender does not see weights, activations, or training
                  logs; only text queries and generated images are available.
                  The goal is to assign a posterior over candidate lineages and
                  make an attribution decision with controlled confidence. For
                  each prompt <code>p</code> and model <code>m</code>, CSF
                  samples multiple generations, maps each image to a semantic
                  label <code>c</code>, and estimates the prompt-conditioned
                  category distribution.
                </p>
                <LatexBlock className="method-equation">
                  {String.raw`$$
\hat{\pi}_m(c \mid p) = \frac{1}{N} \sum_{i=1}^{N} \mathbf{1}[g(x_i) = c],
\qquad x_i \sim m(p)
$$`}
                </LatexBlock>
              </article>

              <article className="method-card">
                <h3 className="method-title">CSF pipeline</h3>
                <p className="method-copy">
                  CSF probes each model with compositional, underspecified
                  prompts that force it to resolve ambiguity using learned
                  semantic priors. The resulting category distributions are then
                  compared against base-model references using Wasserstein
                  distance, and a Bayesian attribution rule produces the final
                  lineage posterior and dominance test. In other words, the
                  suspect model is compared against every protected base over a
                  prompt set <code>P</code>, and smaller transport cost becomes
                  stronger attribution evidence.
                </p>
                <LatexBlock className="method-equation">
                  {String.raw`$$
d_b = \sum_{p \in P} W_1\!\left(\hat{\pi}_s(\cdot \mid p), \hat{\pi}_b(\cdot \mid p)\right),
\qquad P(b \mid s) \propto \exp(-\tau d_b)
$$`}
                </LatexBlock>
              </article>
            </div>

            <LatexBlock className="method-note has-text-centered">
              {String.raw`Accept $b^* = \arg\max_b P(b \mid s)$ only when the dominance margin stays above a threshold:
$P(b^* \mid s) - \max_{b \neq b^*} P(b \mid s) > \delta$.`}
            </LatexBlock>
          </div>
        </section>

        <section className="section hero is-light" id="results">
          <div className="container is-max-quant">
            <p className="section-label">Results</p>
            <h2 className="title is-3 has-text-centered">
              Quantitative Results
            </h2>

            <div className="table-stack">
              <PosteriorTable
                eyebrow="Table 1"
                title="Posterior attribution across all 13 fine-tuned suspects."
                description="Each row is a deployed suspect model, each column is a candidate protected base lineage, and every cell reports the posterior mean attribution score under CSF. The correct family stays dominant for all 13 suspects even after substantial style drift."
                columns={baseModelColumns}
                sections={mainPosteriorSections}
                footnote="Posterior mean attribution scores under CSF. Asterisks mark the dominant lineage after applying the dominance test."
                showLegend
              />
            </div>
          </div>
        </section>

        <section className="section" id="analysis">
          <div className="container is-max-quant">
            <div className="narrative-block">
              <p className="section-label">Analysis</p>
              <h2 className="title is-3 has-text-centered">
                Secondary analyses support the same fingerprint.
              </h2>
              <p className="section-copy has-text-centered">
                Table 2 tests the metric choice, Table 3 tests adversarial
                erasure, the ring figure shows prompt-conditioned semantic
                drift, and Figure 4 confirms that humans can perceive the same
                lineage cue when asked the right question.
              </p>
            </div>

            <div className="analysis-grid">
              <MetricComparisonPanel />
              {analysisCards.map((card) => (
                <AnalysisCard key={card.title} {...card} />
              ))}
            </div>

            <div className="analysis-stack">
              <PosteriorTable
                eyebrow="Table 3"
                title="Attribution survives adversarial concept removal."
                description="Even after UCE removes animal-related concepts, the correct lineage remains dominant. This suggests the fingerprint is distributed across semantics rather than tied to one brittle trigger."
                columns={baseModelColumns}
                sections={ablationSections}
                footnote="Adversarial concept removal uses 9 animal probes. The correct source family remains dominant across all evaluated suspects."
              />
            </div>
          </div>
        </section>

        <section className="section" id="paper">
          <div className="container is-max-desktop">
            <h2 className="title is-3 has-text-centered">Paper PDF</h2>
            <div className="pdf-shell">
              <iframe
                src="/csf/csf-paper.pdf#view=FitH"
                title="CSF paper PDF"
                loading="lazy"
              />
            </div>
          </div>
        </section>

        <section className="section hero is-light" id="bibtex">
          <div className="container is-max-desktop content">
            <div className="bibtex-header">
              <h2 className="title is-3">BibTeX</h2>
              <BibtexCopyButton text={bibtex} />
            </div>
            <pre className="bibtex-code">
              <code>{bibtex}</code>
            </pre>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container is-max-desktop">
          <div className="content has-text-centered">
            <p>
              This page follows the{" "}
              <a
                href="https://github.com/eliahuhorwitz/Academic-project-page-template"
                target="_blank"
                rel="noreferrer"
              >
                Academic Project Page Template
              </a>{" "}
              and keeps its overall section rhythm and publication-page
              structure. The original template was adapted from{" "}
              <a href="https://nerfies.github.io" target="_blank" rel="noreferrer">
                Nerfies
              </a>
              .
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .csf-page {
          min-height: 100vh;
          background:
            linear-gradient(180deg, #fffdf8 0%, #ffffff 24%, #ffffff 100%);
          color: #1e293b;
        }

        .csf-page * {
          box-sizing: border-box;
        }

        .csf-page a {
          color: #2563eb;
          text-decoration: none;
        }

        .csf-page a:hover {
          color: #1d4ed8;
        }

        .csf-page .container {
          width: 100%;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        .csf-page .container.is-max-desktop {
          max-width: 960px;
        }

        .csf-page .container.is-max-figure {
          max-width: 780px;
        }

        .csf-page .container.is-max-quant {
          max-width: 1280px;
        }

        .csf-page .hero {
          position: relative;
        }

        .csf-page .hero.is-light {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .csf-page .hero-body {
          padding: 4rem 0;
        }

        .csf-page .publication-header .hero-body {
          padding: 4.9rem 0 3.9rem;
        }

        .csf-page .section {
          padding: 4rem 0;
        }

        .csf-page .publication-header {
          overflow: hidden;
        }

        .csf-page .hero-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(24px);
          opacity: 0.8;
          pointer-events: none;
        }

        .csf-page .hero-orb--left {
          top: 1.5rem;
          left: -3rem;
          width: 18rem;
          height: 18rem;
          background: radial-gradient(circle, rgba(14, 165, 164, 0.16) 0%, rgba(14, 165, 164, 0) 72%);
        }

        .csf-page .hero-orb--right {
          top: 2rem;
          right: -3rem;
          width: 22rem;
          height: 22rem;
          background: radial-gradient(circle, rgba(234, 88, 12, 0.16) 0%, rgba(234, 88, 12, 0) 74%);
        }

        .csf-page .hero-shell {
          display: grid;
          gap: 1.6rem;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.9fr);
          align-items: start;
        }

        .csf-page .hero-copy-column {
          position: relative;
          z-index: 1;
        }

        .csf-page .hero-kicker {
          margin: 0 0 1rem;
          color: #0f766e;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .csf-page .columns {
          display: flex;
          flex-wrap: wrap;
          margin: 0 -0.75rem;
        }

        .csf-page .columns.is-centered {
          justify-content: center;
        }

        .csf-page .column {
          width: 100%;
          padding: 0 0.75rem;
        }

        .csf-page .column.is-four-fifths {
          width: 80%;
        }

        .csf-page .has-text-centered {
          text-align: center;
        }

        .csf-page .has-text-justified {
          text-align: justify;
        }

        .csf-page .title {
          margin: 0;
          color: #1e293b;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .csf-page .title.is-1 {
          font-size: clamp(2.5rem, 5vw, 4.2rem);
          line-height: 1.06;
        }

        .csf-page .title.is-3 {
          font-size: clamp(1.8rem, 2.8vw, 2.2rem);
          line-height: 1.18;
        }

        .csf-page .publication-title {
          margin-bottom: 1.25rem;
        }

        .csf-page .hero-title {
          max-width: 12ch;
        }

        .csf-page .publication-authors {
          margin-top: 1rem;
          font-size: 1.125rem;
          color: #334155;
        }

        .csf-page .hero-role {
          max-width: 44rem;
          margin: 1.35rem 0 0;
          color: #1f2937;
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          font-weight: 700;
          line-height: 1.55;
        }

        .csf-page .hero-meta-line {
          margin-top: 1.1rem;
        }

        .csf-page .hero-next-step {
          max-width: 42rem;
          margin: 1rem 0 0;
          color: #475569;
          font-size: 1rem;
          line-height: 1.8;
        }

        .csf-page .hero-helper {
          max-width: 40rem;
          margin: 1rem 0 0;
          color: #64748b;
          font-size: 0.92rem;
          line-height: 1.7;
        }

        .csf-page .author-block {
          display: inline-block;
          margin-right: 0.35rem;
        }

        .csf-page .publication-venue {
          display: inline-block;
          margin-left: 0.5rem;
          border-radius: 999px;
          background: #e2e8f0;
          color: #334155;
          padding: 0.4rem 0.85rem;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .csf-page .publication-links {
          margin-top: 2rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.75rem;
        }

        .csf-page .link-block {
          display: inline-flex;
        }

        .csf-page .template-button {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
          padding: 0.82rem 1.15rem;
          font-size: 0.98rem;
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .csf-page .template-button:hover {
          color: #ffffff;
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
        }

        .csf-page .template-button--light {
          border: 1px solid #d6dde8;
          background: rgba(255, 255, 255, 0.86);
          color: #1f2937;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .csf-page .template-button--light:hover {
          background: #ffffff;
          color: #111827;
          border-color: #b8c4d6;
        }

        .csf-page .template-button--accent {
          background: #0f766e;
          color: #ffffff;
        }

        .csf-page .template-button--accent:hover {
          background: #115e59;
        }

        .csf-page .hero-visual-card {
          position: relative;
          z-index: 1;
          border: 1px solid rgba(203, 213, 225, 0.85);
          border-radius: 1.3rem;
          background: rgba(255, 255, 255, 0.88);
          padding: 1.2rem;
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.1);
          backdrop-filter: blur(14px);
        }

        .csf-page .hero-panel-eyebrow {
          margin: 0;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .csf-page .hero-panel-title {
          margin: 0.65rem 0 0;
          color: #111827;
          font-size: 1.3rem;
          font-weight: 800;
          line-height: 1.35;
        }

        .csf-page .hero-stat-grid {
          margin-top: 1rem;
          display: grid;
          gap: 0.8rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .csf-page .hero-stat-card {
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
          padding: 0.95rem;
        }

        .csf-page .hero-stat-value {
          margin: 0;
          color: #0f172a;
          font-size: 1.45rem;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .csf-page .hero-stat-label {
          margin: 0.35rem 0 0;
          color: #111827;
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.45;
        }

        .csf-page .hero-stat-detail {
          margin: 0.45rem 0 0;
          color: #64748b;
          font-size: 0.8rem;
          line-height: 1.55;
        }

        .csf-page .hero-preview {
          margin: 1rem 0 0;
          overflow: hidden;
          border-radius: 1rem;
          border: 1px solid #dbe4ee;
          background: #ffffff;
        }

        .csf-page .hero-preview img {
          display: block;
          width: 100%;
          height: auto;
        }

        .csf-page .hero-preview-caption {
          margin: 0.85rem 0 0;
          color: #475569;
          font-size: 0.92rem;
          line-height: 1.7;
        }

        .csf-page .hero-primer {
          padding-top: 0;
        }

        .csf-page .quick-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 0.7rem;
          justify-content: center;
        }

        .csf-page .quick-nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid #d7e1ec;
          background: #ffffff;
          padding: 0.72rem 1rem;
          color: #334155;
          font-size: 0.92rem;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
        }

        .csf-page .quick-nav-link:hover {
          color: #0f172a;
          border-color: #94a3b8;
        }

        .csf-page .capability-grid {
          margin-top: 1.25rem;
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .csf-page .capability-card {
          border-radius: 1.15rem;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 1.2rem;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
        }

        .csf-page .capability-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 999px;
          background: #ecfeff;
          color: #0f766e;
        }

        .csf-page .capability-eyebrow {
          margin: 0.95rem 0 0;
          color: #64748b;
          font-size: 0.76rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .csf-page .capability-title {
          margin: 0.55rem 0 0;
          color: #111827;
          font-size: 1.06rem;
          font-weight: 800;
          line-height: 1.4;
        }

        .csf-page .capability-copy {
          margin: 0.7rem 0 0;
          color: #475569;
          font-size: 0.96rem;
          line-height: 1.7;
        }

        .csf-page .subtitle {
          color: #475569;
          font-size: 1.05rem;
          line-height: 1.85;
        }

        .csf-page .teaser-caption {
          max-width: 640px;
          margin: 1.15rem auto 0;
        }

        .csf-page .section-label {
          margin: 0 0 0.75rem;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          text-align: center;
        }

        .csf-page .section-copy {
          max-width: 760px;
          margin: 1rem auto 0;
          color: #475569;
          font-size: 1.02rem;
          line-height: 1.8;
        }

        .csf-page .narrative-block {
          display: grid;
          gap: 1.15rem;
        }

        .csf-page .narrative-figure {
          margin: 0 auto;
          width: 100%;
        }

        .csf-page .challenge-figure {
          max-width: 980px;
        }

        .csf-page .method-figure {
          max-width: 860px;
        }

        .csf-page .narrative-figure img {
          display: block;
          width: 100%;
          height: auto;
        }

        .csf-page .figure-caption {
          max-width: 860px;
          margin: 0 auto;
          color: #475569;
          font-size: 0.98rem;
          line-height: 1.8;
        }

        .csf-page .methods-grid {
          margin-top: 1.4rem;
          display: grid;
          gap: 1.25rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .csf-page .method-card {
          border: 1px solid #e2e8f0;
          border-radius: 0.95rem;
          background: #ffffff;
          padding: 1.4rem 1.5rem;
        }

        .csf-page .method-title {
          margin: 0;
          color: #111827;
          font-size: 1.1rem;
          font-weight: 800;
          line-height: 1.35;
        }

        .csf-page .method-copy {
          margin: 0.85rem 0 0;
          color: #475569;
          font-size: 0.98rem;
          line-height: 1.8;
        }

        .csf-page .method-equation {
          margin: 1rem 0 0;
          border-radius: 0.8rem;
          background: #f8fafc;
          padding: 0.9rem 1rem;
          color: #0f172a;
          font-size: 0.92rem;
          line-height: 1.7;
        }

        .csf-page .method-equation code,
        .csf-page .method-note code {
          font-family: "SFMono-Regular", ui-monospace, "Liberation Mono",
            Menlo, monospace;
        }

        .csf-page .method-equation p,
        .csf-page .method-note p {
          margin: 0;
        }

        .csf-page .method-equation .katex-display,
        .csf-page .method-note .katex-display {
          margin: 0;
        }

        .csf-page .method-note {
          max-width: 840px;
          margin: 1.15rem auto 0;
          color: #475569;
          font-size: 0.96rem;
          line-height: 1.85;
        }

        .csf-page .content {
          color: #334155;
          font-size: 1.05rem;
          line-height: 1.95;
        }

        .csf-page .content p {
          margin: 1rem 0 0;
        }

        .csf-page .content p:first-child {
          margin-top: 1.25rem;
        }

        .csf-page .result-card {
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 1rem;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .csf-page .result-figure {
          overflow: hidden;
          border-radius: 0.85rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .csf-page .table-image-frame {
          margin-top: 0;
          overflow: visible;
          border: 0;
          border-radius: 0;
          background: transparent;
        }

        .csf-page .result-figure img {
          display: block;
          width: 100%;
          height: auto;
        }

        .csf-page .result-title {
          margin: 1rem 0 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #111827;
        }

        .csf-page .result-caption {
          margin: 0.6rem 0 0;
          color: #475569;
          font-size: 0.97rem;
          line-height: 1.75;
        }

        .csf-page .table-stack {
          margin-top: 2.25rem;
          display: grid;
          gap: 2.8rem;
        }

        .csf-page .analysis-grid {
          margin-top: 2.25rem;
          display: grid;
          gap: 1.5rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .csf-page .analysis-stack {
          margin-top: 1.5rem;
        }

        .csf-page .analysis-card {
          display: grid;
          gap: 0.8rem;
          align-content: start;
        }

        .csf-page .analysis-eyebrow {
          margin: 0;
        }

        .csf-page .analysis-figure {
          background: #ffffff;
        }

        .csf-page .table-panel {
          display: grid;
          gap: 1rem;
        }

        .csf-page .table-copy {
          max-width: 760px;
          margin: 0 auto;
          text-align: center;
        }

        .csf-page .table-eyebrow {
          margin: 0;
          color: #64748b;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .csf-page .table-title {
          margin: 0.55rem 0 0;
          color: #111827;
          font-size: clamp(1.3rem, 2.1vw, 1.8rem);
          font-weight: 800;
          line-height: 1.3;
        }

        .csf-page .table-description {
          margin: 0.8rem auto 0;
          max-width: 720px;
          color: #475569;
          font-size: 1rem;
          line-height: 1.8;
        }

        .csf-page .table-frame {
          width: 100%;
          padding: 1.6rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.9rem;
          background: #ffffff;
        }

        .csf-page .table-figure {
          margin: 0 auto;
          width: 100%;
        }

        .csf-page .table-figure--main {
          max-width: 1180px;
        }

        .csf-page .table-figure--metric {
          max-width: 1080px;
        }

        .csf-page .table-figure--ablation {
          max-width: 1080px;
        }

        .csf-page .legend-row {
          margin-top: 1rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .csf-page .legend-pill,
        .csf-page .score-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          border-radius: 0.65rem;
          font-weight: 700;
        }

        .csf-page .legend-pill {
          padding: 0.5rem 0.8rem;
          font-size: 0.76rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .csf-page .table-shell {
          margin-top: 1.25rem;
          overflow-x: auto;
          padding-bottom: 0.35rem;
        }

        .csf-page .posterior-table {
          min-width: 900px;
          width: 100%;
          border-collapse: separate;
          border-spacing: 0 0.55rem;
          color: #334155;
          font-size: 0.94rem;
        }

        .csf-page .posterior-table thead th {
          background: #eff4f8;
          padding: 0.95rem 1rem;
          text-align: center;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
        }

        .csf-page .posterior-table thead th:first-child {
          position: sticky;
          left: 0;
          z-index: 1;
          border-top-left-radius: 0.85rem;
          border-bottom-left-radius: 0.85rem;
          text-align: left;
        }

        .csf-page .posterior-table thead th:last-child {
          border-top-right-radius: 0.85rem;
          border-bottom-right-radius: 0.85rem;
        }

        .csf-page .section-row td {
          padding: 0.7rem 0 0.2rem;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #64748b;
        }

        .csf-page .row-label {
          position: sticky;
          left: 0;
          z-index: 1;
          min-width: 210px;
          border: 1px solid #dde5ee;
          border-right: 0;
          border-top-left-radius: 0.85rem;
          border-bottom-left-radius: 0.85rem;
          background: #ffffff;
          padding: 1rem;
          font-weight: 800;
          color: #111827;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
        }

        .csf-page .score-cell {
          border: 1px solid #dde5ee;
          border-left: 0;
          background: #ffffff;
          padding: 0.95rem 0.75rem;
          text-align: center;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
        }

        .csf-page .score-cell:last-child {
          border-top-right-radius: 0.85rem;
          border-bottom-right-radius: 0.85rem;
        }

        .csf-page .score-badge {
          min-width: 4.7rem;
          padding: 0.45rem 0.7rem;
          font-size: 0.95rem;
        }

        .csf-page .score-tone--match {
          border-color: #f1c1cf;
          background: #fff2f5;
          color: #9f1f45;
        }

        .csf-page .score-tone--uncertain {
          border-color: #ecd8a2;
          background: #fff8e1;
          color: #8a6510;
        }

        .csf-page .score-tone--below {
          border-color: #c9e6d3;
          background: #effaf3;
          color: #1f6b46;
        }

        .csf-page .score-tone--plain {
          border-color: #d5deea;
          background: #f8fafc;
          color: #475569;
        }

        .csf-page .table-footnote {
          margin: 1rem 0 0;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .csf-page .metric-table {
          margin-top: 1.2rem;
          width: 100%;
          border-collapse: collapse;
          color: #334155;
          font-size: 0.95rem;
        }

        .csf-page .metric-table th,
        .csf-page .metric-table td {
          padding: 0.95rem 0.75rem;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
        }

        .csf-page .metric-table th {
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #64748b;
        }

        .csf-page .metric-strong {
          font-weight: 800;
          color: #9f1f45;
        }

        .csf-page .metric-gap {
          font-weight: 800;
          color: #1f6b46;
        }

        .csf-page .pdf-shell {
          margin-top: 2rem;
          overflow: hidden;
          border-radius: 1rem;
          border: 1px solid #dbe4ee;
          background: #ffffff;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
        }

        .csf-page .pdf-shell iframe {
          display: block;
          width: 100%;
          height: 720px;
          border: 0;
        }

        .csf-page .bibtex-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .csf-page .bibtex-code {
          margin: 1.5rem 0 0;
          overflow-x: auto;
          border-radius: 1rem;
          background: #0f172a;
          padding: 1.35rem 1.4rem;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.8;
        }

        .csf-page .copy-bibtex-button {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          border: 1px solid #cbd5e1;
          border-radius: 999px;
          background: #ffffff;
          color: #334155;
          padding: 0.72rem 1rem;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .csf-page .copy-bibtex-button:hover {
          border-color: #94a3b8;
          color: #0f172a;
          transform: translateY(-1px);
        }

        .csf-page .footer {
          padding: 2.5rem 0 3rem;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
        }

        .csf-page .footer .content {
          font-size: 0.96rem;
          line-height: 1.8;
          color: #64748b;
        }

        .csf-page .scroll-to-top {
          position: fixed;
          right: 1.35rem;
          bottom: 1.35rem;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.8rem;
          height: 2.8rem;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: rgba(255, 255, 255, 0.92);
          color: #334155;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(8px);
        }

        .csf-page .scroll-to-top:hover {
          color: #0f172a;
          border-color: #94a3b8;
        }

        @media (max-width: 900px) {
          .csf-page .hero-shell,
          .csf-page .capability-grid {
            grid-template-columns: 1fr;
          }

          .csf-page .hero-stat-grid {
            grid-template-columns: 1fr;
          }

          .csf-page .column.is-four-fifths {
            width: 100%;
          }

          .csf-page .methods-grid,
          .csf-page .analysis-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .csf-page .container {
            padding: 0 1rem;
          }

          .csf-page .hero-body,
          .csf-page .section {
            padding: 3rem 0;
          }

          .csf-page .publication-header .hero-body {
            padding-top: 4rem;
          }

          .csf-page .hero-title {
            max-width: none;
          }

          .csf-page .publication-authors {
            font-size: 1rem;
          }

          .csf-page .publication-venue {
            margin: 0.75rem 0 0;
          }

          .csf-page .pdf-shell iframe {
            height: 560px;
          }
        }
      `}</style>
    </div>
  );
}

function PublicationLink({
  href,
  label,
  icon,
  external = false,
  tone = "dark",
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  tone?: "dark" | "light" | "accent";
}) {
  return (
    <span className="link-block">
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className={`template-button ${
          tone === "light"
            ? "template-button--light"
            : tone === "accent"
              ? "template-button--accent"
              : ""
        }`}
      >
        {icon}
        <span>{label}</span>
      </a>
    </span>
  );
}

function LatexBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function AnalysisCard({
  eyebrow,
  src,
  alt,
  width,
  height,
  title,
  caption,
}: {
  eyebrow: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  caption: string;
}) {
  return (
    <article className="result-card analysis-card">
      <p className="table-eyebrow analysis-eyebrow">{eyebrow}</p>
      <div className="result-figure analysis-figure">
        <Image src={src} alt={alt} width={width} height={height} />
      </div>
      <h3 className="result-title">{title}</h3>
      <p className="result-caption">{caption}</p>
    </article>
  );
}

function MetricComparisonPanel() {
  return (
    <div className="table-panel">
      <p className="table-eyebrow">Metric Comparison</p>
      <h3 className="table-title">
        Wasserstein produces a clearer attribution margin than JSD.
      </h3>
      <p className="table-description">
        Across hard variants such as Kandinsky-Naruto, SD3-Reality-Mix, and
        SDXL-DPO, Wasserstein preserves a wider separation between the correct
        lineage and competing bases.
      </p>

      <table className="metric-table">
        <thead>
          <tr>
            <th>Variant</th>
            <th>Wasserstein</th>
            <th>JSD</th>
            <th>Gap</th>
          </tr>
        </thead>
        <tbody>
          {metricComparisonRows.map((row) => (
            <tr key={row.variant}>
              <td>{row.variant}</td>
              <td className="metric-strong">{row.wasserstein}</td>
              <td>{row.jsd}</td>
              <td className="metric-gap">{row.gap}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PosteriorTable({
  eyebrow,
  title,
  description,
  columns,
  sections,
  footnote,
  showLegend = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  columns: string[];
  sections: ScoreSection[];
  footnote: string;
  showLegend?: boolean;
}) {
  return (
    <div className="table-panel">
      <p className="table-eyebrow">{eyebrow}</p>
      <h3 className="table-title">{title}</h3>
      <p className="table-description">{description}</p>

      {showLegend ? (
        <div className="legend-row">
          <LegendPill label="Significant match" tone="match" />
          <LegendPill label="Inconclusive" tone="uncertain" />
          <LegendPill label="Below chance" tone="below" />
          <span className="legend-pill score-tone--plain">Dominance test *</span>
        </div>
      ) : null}

      <div className="table-shell">
        <table className="posterior-table">
          <thead>
            <tr>
              <th>Suspect Model</th>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.family}>
                <tr className="section-row">
                  <td colSpan={columns.length + 1}>{section.family}</td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="row-label">{row.label}</td>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.label}-${columns[index]}`}
                        className="score-cell"
                      >
                        <span
                          className={`score-badge ${scoreToneClasses[cell.tone]}`}
                        >
                          {cell.value}
                          {cell.dominant ? "*" : ""}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="table-footnote">{footnote}</p>
    </div>
  );
}

function LegendPill({ label, tone }: { label: string; tone: ScoreTone }) {
  return <span className={`legend-pill ${scoreToneClasses[tone]}`}>{label}</span>;
}

const scoreToneClasses: Record<ScoreTone, string> = {
  match: "score-tone--match",
  uncertain: "score-tone--uncertain",
  below: "score-tone--below",
  plain: "score-tone--plain",
};
