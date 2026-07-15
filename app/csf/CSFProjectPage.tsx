"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";
import {
  ChevronUp,
  FileText,
  Github,
  Home,
  Quote,
} from "lucide-react";
import Image from "next/image";
import { Inter } from "next/font/google";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import BibtexCopyButton from "./BibtexCopyButton";

const inter = Inter({
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
    <div id="top" className={`${inter.className} csf-page`}>
      <a className="scroll-to-top" href="#top" aria-label="Scroll to top">
        <ChevronUp size={18} />
      </a>

      <main id="main-content">
        <section className="hero publication-header">
          <div className="hero-body">
            <div className="container is-max-desktop">
              <div className="columns is-centered">
                <div className="column is-four-fifths has-text-centered">
                  <p className="hero-kicker">CVPR 2026</p>
                  <h1 className="title is-1 publication-title hero-title">
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

                  <div className="is-size-5 publication-authors">
                    <span className="author-block">
                      Seoul National University
                    </span>
                    <span className="publication-venue">CVPR 2026</span>
                  </div>

                  <p className="hero-summary">
                    CSF attributes deployed text-to-image APIs back to protected
                    base families using only black-box query access, with no
                    watermarking and no visibility into model internals.
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
                      href="#bibtex"
                      label="BibTeX"
                      icon={<Quote size={18} />}
                    />
                    <PublicationLink
                      href="/#publications"
                      label="Homepage"
                      icon={<Home size={18} />}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-compact">
          <div className="container is-max-figure">
            <figure className="teaser-media">
              <Image
                src="/csf/comparison-v2.png"
                alt="Comparison between watermarking, traditional fingerprinting, and CSF in the query-only setting"
                width={1120}
                height={780}
                priority
              />
            </figure>
            <p className="figure-caption teaser-caption has-text-centered">
              CSF targets the most restrictive query-only setting, where the
              defender sees only the final text-to-image API and must still
              recover lineage evidence.
            </p>
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
                variant="ablation"
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
          background: #ffffff;
          color: #111111;
        }

        .csf-page * {
          box-sizing: border-box;
        }

        .csf-page a {
          color: #111111;
          text-decoration: none;
        }

        .csf-page a:hover {
          color: #111111;
          text-decoration: underline;
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
          max-width: 1400px;
        }

        .csf-page .hero {
          position: relative;
        }

        .csf-page .hero.is-light {
          background: #ffffff;
          border-top: 1px solid #e3e3e3;
          border-bottom: 1px solid #e3e3e3;
        }

        .csf-page .hero-body {
          padding: 3.75rem 0;
        }

        .csf-page .publication-header .hero-body {
          padding: 4.5rem 0 2.4rem;
        }

        .csf-page .publication-header .container.is-max-desktop {
          max-width: 1240px;
        }

        .csf-page .section {
          padding: 3.25rem 0;
        }

        .csf-page .hero-kicker {
          margin: 0 0 0.85rem;
          color: #444444;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
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
          text-align: left;
        }

        .csf-page .title {
          margin: 0;
          color: #111111;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .csf-page .title.is-1 {
          font-size: clamp(1.95rem, 3.55vw, 3rem);
          line-height: 1.03;
        }

        .csf-page .title.is-3 {
          font-size: clamp(1.65rem, 2.6vw, 2.05rem);
          line-height: 1.22;
        }

        .csf-page .publication-title {
          margin-bottom: 1.15rem;
        }

        .csf-page .hero-title {
          max-width: 22ch;
          margin-left: auto;
          margin-right: auto;
          text-wrap: balance;
        }

        .csf-page .publication-authors {
          margin-top: 1rem;
          font-size: 1.125rem;
          color: #2b2b2b;
        }

        .csf-page .author-block {
          display: inline-block;
          margin-right: 0.35rem;
        }

        .csf-page .publication-venue {
          display: inline-block;
          margin-left: 0.5rem;
          border-radius: 999px;
          border: 1px solid #cfcfcf;
          background: #ffffff;
          color: #111111;
          padding: 0.36rem 0.78rem;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .csf-page .hero-summary {
          max-width: 58rem;
          margin: 1.2rem auto 0;
          color: #2c2c2c;
          font-size: 0.98rem;
          line-height: 1.72;
          text-wrap: pretty;
        }

        .csf-page .publication-links {
          margin-top: 1.8rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.65rem;
        }

        .csf-page .link-block {
          display: inline-flex;
        }

        .csf-page .template-button {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          border-radius: 999px;
          border: 1px solid #cfcfcf;
          background: #ffffff;
          color: #111111;
          padding: 0.72rem 1rem;
          font-size: 0.95rem;
          font-weight: 600;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .csf-page .template-button:hover {
          color: #111111;
          background: #f4f4f4;
          border-color: #111111;
          text-decoration: none;
        }

        .csf-page .section-compact {
          padding-top: 0;
          padding-bottom: 2.8rem;
        }

        .csf-page .subtitle {
          color: #444444;
          font-size: 1rem;
          line-height: 1.75;
        }

        .csf-page .teaser-media {
          margin: 0 auto;
          border: 1px solid #d7d7d7;
          background: #ffffff;
          padding: 0.75rem;
        }

        .csf-page .teaser-media img {
          display: block;
          width: 100%;
          height: auto;
        }

        .csf-page .teaser-caption {
          max-width: 800px;
          margin: 0.85rem auto 0;
          text-wrap: pretty;
        }

        .csf-page .section-label {
          margin: 0 0 0.75rem;
          color: #444444;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-align: center;
        }

        .csf-page .section-copy {
          max-width: 860px;
          margin: 1rem auto 0;
          color: #333333;
          font-size: 0.99rem;
          line-height: 1.78;
          text-wrap: pretty;
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
          max-width: 940px;
          margin: 0 auto;
          color: #444444;
          font-size: 0.95rem;
          line-height: 1.72;
          text-wrap: pretty;
        }

        .csf-page .methods-grid {
          margin-top: 1.35rem;
          display: grid;
          gap: 1.25rem;
          grid-template-columns: 1fr;
          max-width: 980px;
          margin-left: auto;
          margin-right: auto;
        }

        .csf-page .method-card {
          border: 1px solid #d8d8d8;
          border-radius: 0.65rem;
          background: #ffffff;
          padding: 1.2rem 1.25rem;
        }

        .csf-page .method-title {
          margin: 0;
          color: #111111;
          font-size: 1.02rem;
          font-weight: 700;
          line-height: 1.35;
        }

        .csf-page .method-copy {
          margin: 0.85rem 0 0;
          color: #333333;
          font-size: 0.95rem;
          line-height: 1.7;
          text-wrap: pretty;
        }

        .csf-page .method-equation {
          margin: 0.9rem 0 0;
          overflow-x: auto;
          border: 1px solid #dddddd;
          border-radius: 0.55rem;
          background: #fafafa;
          padding: 0.75rem 0.9rem;
          color: #111111;
          font-size: 0.92rem;
          line-height: 1.65;
        }

        .csf-page .method-equation code,
        .csf-page .method-note code {
          font-family: "SFMono-Regular", ui-monospace, "Liberation Mono",
            Menlo, monospace;
        }

        .csf-page .latex-paragraph {
          margin: 0;
        }

        .csf-page .latex-block .katex {
          color: #111111;
        }

        .csf-page .latex-block .katex-display {
          margin: 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0.1rem 0;
        }

        .csf-page .latex-block .katex-display > .katex {
          display: inline-block;
          min-width: max-content;
          white-space: nowrap;
        }

        .csf-page .method-note {
          max-width: 840px;
          margin: 1.15rem auto 0;
          border: 1px solid #dddddd;
          border-radius: 0.55rem;
          background: #fafafa;
          padding: 0.8rem 1rem;
          color: #333333;
          font-size: 0.94rem;
          line-height: 1.78;
        }

        .csf-page .content {
          color: #222222;
          font-size: 1.02rem;
          line-height: 1.88;
          text-wrap: pretty;
        }

        .csf-page .content p {
          margin: 1rem 0 0;
        }

        .csf-page .content p:first-child {
          margin-top: 1.25rem;
        }

        .csf-page .result-card {
          border-radius: 0.65rem;
          border: 1px solid #d8d8d8;
          background: #ffffff;
          padding: 0.95rem;
        }

        .csf-page .result-figure {
          overflow: hidden;
          border-radius: 0.45rem;
          border: 1px solid #dddddd;
          background: #fafafa;
        }

        .csf-page .result-figure img {
          display: block;
          width: 100%;
          height: auto;
        }

        .csf-page .result-title {
          margin: 0.9rem 0 0;
          font-size: 1.02rem;
          font-weight: 700;
          color: #111111;
        }

        .csf-page .result-caption {
          margin: 0.55rem 0 0;
          color: #444444;
          font-size: 0.93rem;
          line-height: 1.7;
          text-wrap: pretty;
        }

        .csf-page .table-stack {
          margin-top: 2rem;
          display: grid;
          gap: 2.3rem;
        }

        .csf-page .analysis-grid {
          margin-top: 2rem;
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
          gap: 0.75rem;
        }

        .csf-page .table-eyebrow {
          margin: 0;
          color: #444444;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .csf-page .table-title {
          margin: 0.2rem 0 0;
          color: #111111;
          font-size: clamp(1.18rem, 2vw, 1.45rem);
          font-weight: 700;
          line-height: 1.35;
          text-wrap: balance;
        }

        .csf-page .table-description {
          margin: 0.15rem 0 0;
          max-width: 1120px;
          color: #333333;
          font-size: 0.95rem;
          line-height: 1.68;
          text-wrap: pretty;
        }

        .csf-page .table-shell {
          margin-top: 0.75rem;
          overflow-x: auto;
          border: 1px solid #d8d8d8;
          border-radius: 0.55rem;
          background: #ffffff;
        }

        .csf-page .posterior-table {
          min-width: 980px;
          width: 100%;
          border-collapse: collapse;
          color: #111111;
          font-size: 0.86rem;
          line-height: 1.35;
          font-variant-numeric: tabular-nums;
        }

        .csf-page .posterior-table thead th {
          border-bottom: 1.2px solid #111111;
          background: #f7f7f7;
          padding: 0.55rem 0.6rem;
          text-align: center;
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #111111;
        }

        .csf-page .posterior-table thead th:first-child {
          position: sticky;
          left: 0;
          z-index: 2;
          background: #f7f7f7;
          text-align: left;
        }

        .csf-page .section-row td {
          border-top: 1px solid #bdbdbd;
          border-bottom: 1px solid #bdbdbd;
          background: #f2f2f2;
          padding: 0.4rem 0.6rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #222222;
        }

        .csf-page .row-label {
          position: sticky;
          left: 0;
          z-index: 1;
          min-width: 260px;
          background: #ffffff;
          padding: 0.5rem 0.9rem;
          border-bottom: 1px solid #dddddd;
          border-right: 1px solid #dddddd;
          font-weight: 600;
          color: #111111;
          text-align: left;
          white-space: nowrap;
        }

        .csf-page .score-cell {
          background: #ffffff;
          padding: 0.5rem 0.55rem;
          border-bottom: 1px solid #dddddd;
          border-left: 1px solid #eeeeee;
          text-align: center;
          transition: background 0.2s ease;
        }

        .csf-page .score-cell--dominant {
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.03);
        }

        .csf-page .score-value {
          display: inline-block;
          min-width: 3.4rem;
          color: #111111;
        }

        .csf-page .score-tone--match {
          color: #111111;
          font-weight: 700;
        }

        .csf-page .score-tone--uncertain {
          color: #222222;
        }

        .csf-page .score-tone--below {
          color: #666666;
        }

        .csf-page .score-tone--plain {
          color: #333333;
        }

        .csf-page .posterior-table--main .score-cell-tone--main-match {
          background: #f9dcdc;
        }

        .csf-page .posterior-table--main .score-cell-tone--main-uncertain {
          background: #fff8d9;
        }

        .csf-page .posterior-table--main .score-cell-tone--main-below {
          background: #dcf7d8;
        }

        .csf-page .posterior-table--main .score-cell-tone--main-plain {
          background: #ffffff;
        }

        .csf-page .posterior-table--ablation .score-cell-tone--ablation-match {
          background: #dcf7d8;
        }

        .csf-page .posterior-table--ablation .score-cell-tone--ablation-plain {
          background: #ffffff;
        }

        .csf-page .score-asterisk {
          margin-left: 0.08rem;
          font-size: 0.72em;
          vertical-align: super;
        }

        .csf-page .table-footnote {
          margin: 0.25rem 0 0;
          color: #444444;
          font-size: 0.87rem;
          line-height: 1.65;
        }

        .csf-page .metric-table {
          margin-top: 0.75rem;
          width: 100%;
          border-collapse: collapse;
          color: #111111;
          font-size: 0.87rem;
          border-top: 1.2px solid #111111;
          border-bottom: 1.2px solid #111111;
          font-variant-numeric: tabular-nums;
        }

        .csf-page .metric-table th,
        .csf-page .metric-table td {
          padding: 0.55rem 0.6rem;
          border-bottom: 1px solid #dddddd;
          text-align: left;
        }

        .csf-page .metric-table th {
          background: #f7f7f7;
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #111111;
        }

        .csf-page .metric-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .csf-page .metric-strong {
          font-weight: 700;
          color: #111111;
        }

        .csf-page .metric-gap {
          font-weight: 700;
          color: #111111;
        }

        .csf-page .pdf-shell {
          margin-top: 2rem;
          overflow: hidden;
          border-radius: 0.65rem;
          border: 1px solid #d8d8d8;
          background: #ffffff;
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
          border-radius: 0.65rem;
          border: 1px solid #d8d8d8;
          background: #fafafa;
          padding: 1.15rem 1.2rem;
          color: #111111;
          font-size: 0.92rem;
          line-height: 1.75;
        }

        .csf-page .copy-bibtex-button {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          border: 1px solid #cfcfcf;
          border-radius: 999px;
          background: #ffffff;
          color: #111111;
          padding: 0.68rem 0.95rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .csf-page .copy-bibtex-button:hover {
          border-color: #111111;
          color: #111111;
          background: #f4f4f4;
        }

        .csf-page .footer {
          padding: 2.5rem 0 3rem;
          border-top: 1px solid #e3e3e3;
          background: #ffffff;
        }

        .csf-page .footer .content {
          font-size: 0.96rem;
          line-height: 1.8;
          color: #444444;
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
          border: 1px solid #cfcfcf;
          background: #ffffff;
          color: #111111;
        }

        .csf-page .scroll-to-top:hover {
          color: #111111;
          border-color: #111111;
          text-decoration: none;
        }

        @media (max-width: 900px) {
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
            padding-bottom: 2rem;
          }

          .csf-page .hero-title {
            max-width: none;
          }

          .csf-page .hero-summary,
          .csf-page .section-copy,
          .csf-page .figure-caption,
          .csf-page .table-description {
            max-width: none;
          }

          .csf-page .publication-authors {
            font-size: 1rem;
          }

          .csf-page .publication-venue {
            margin: 0.75rem 0 0;
          }

          .csf-page .posterior-table {
            min-width: 900px;
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
}: {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
}) {
  return (
    <span className="link-block">
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="template-button"
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
    <div className={`latex-block ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => <p className="latex-paragraph">{children}</p>,
        }}
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
  variant = "main",
}: {
  eyebrow: string;
  title: string;
  description: string;
  columns: string[];
  sections: ScoreSection[];
  footnote: string;
  variant?: "main" | "ablation";
}) {
  return (
    <div className="table-panel">
      <p className="table-eyebrow">{eyebrow}</p>
      <h3 className="table-title">{title}</h3>
      <p className="table-description">{description}</p>

      <div className="table-shell">
        <table className={`posterior-table posterior-table--${variant}`}>
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
                    <th scope="row" className="row-label">
                      {row.label}
                    </th>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.label}-${columns[index]}`}
                        className={`score-cell ${
                          cell.dominant ? "score-cell--dominant" : ""
                        } ${scoreCellToneClasses[variant][cell.tone]}`}
                      >
                        <span className={`score-value ${scoreToneClasses[cell.tone]}`}>
                          {cell.value}
                          {cell.dominant ? (
                            <span className="score-asterisk">*</span>
                          ) : null}
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

const scoreToneClasses: Record<ScoreTone, string> = {
  match: "score-tone--match",
  uncertain: "score-tone--uncertain",
  below: "score-tone--below",
  plain: "score-tone--plain",
};

const scoreCellToneClasses: Record<
  "main" | "ablation",
  Record<ScoreTone, string>
> = {
  main: {
    match: "score-cell-tone--main-match",
    uncertain: "score-cell-tone--main-uncertain",
    below: "score-cell-tone--main-below",
    plain: "score-cell-tone--main-plain",
  },
  ablation: {
    match: "score-cell-tone--ablation-match",
    uncertain: "score-cell-tone--ablation-plain",
    below: "score-cell-tone--ablation-plain",
    plain: "score-cell-tone--ablation-plain",
  },
};
