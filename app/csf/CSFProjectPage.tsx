"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";
import { ChevronUp, FileText, Home, Quote } from "lucide-react";
import Image from "next/image";
import { Inter } from "next/font/google";

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

const visualCards = [
  {
    src: "/csf/family-game.png",
    alt: "Illustration that strong style shifts make naive visual matching unreliable",
    width: 2250,
    height: 1124,
    title: "Why naive visual matching fails",
    caption:
      "Strong downstream style changes can hide the shared lineage signal even when the inherited semantic prior remains intact.",
  },
  {
    src: "/csf/userstudy.png",
    alt: "Human study showing stronger lineage identification under CSF prompts",
    width: 563,
    height: 337,
    title: "Human perceptual study",
    caption:
      "When observers are asked to ignore style and focus on semantic distributions, CSF prompts make the correct lineage easier to identify.",
  },
  {
    src: "/csf/prompt-ablation.png",
    alt: "Prompt ablation showing category distributions changing across scene contexts",
    width: 828,
    height: 316,
    title: "Prompt design validation",
    caption:
      "Changing only the surrounding context shifts the semantic mixture a model resolves, which is the fingerprint CSF measures.",
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
                <div className="column has-text-centered">
                  <h1 className="title is-1 publication-title">
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

                  <div className="publication-links">
                    <PublicationLink
                      href="/csf/csf-paper.pdf"
                      label="Paper"
                      external
                      icon={<FileText size={18} />}
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

        <section className="hero teaser">
          <div className="container is-max-figure">
            <div className="hero-body">
              <figure className="teaser-media">
                <Image
                  src="/csf/comparison-v2.png"
                  alt="Comparison between watermarking, traditional fingerprinting, and CSF in the query-only setting"
                  width={1120}
                  height={780}
                  priority
                />
              </figure>
              <h2 className="subtitle has-text-centered teaser-caption">
                CSF is designed for the most restrictive query-only black-box
                setting, where the defender only has access to the final
                text-to-image API.
              </h2>
            </div>
          </div>
        </section>

        <section className="section hero is-light">
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

        <section className="section">
          <div className="container is-max-desktop">
            <h2 className="title is-3 has-text-centered">Visual Results</h2>
            <div className="results-grid">
              {visualCards.map((card) => (
                <FigureCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </section>

        <section className="section hero is-light">
          <div className="container is-max-quant">
            <h2 className="title is-3 has-text-centered">
              Quantitative Results
            </h2>

            <div className="table-stack">
              <TableImageCard
                eyebrow="Table 1"
                title="Posterior attribution across all 13 fine-tuned suspects."
                description="The main benchmark spans 6 protected base families and 13 downstream variants. In the query-only setting, the posterior mass still concentrates on the correct lineage for every suspect."
                src="/csf/results-main-table-v2.png"
                alt="Main posterior mean attribution table across fine-tuned models and candidate base families"
                width={1770}
                height={863}
                figureClassName="table-figure--main"
              />

              <TableImageCard
                eyebrow="Table 2"
                title="Wasserstein keeps a clearer attribution margin than the JSD baseline."
                description="On hard variants such as Kandinsky-Naruto and SDXL-DPO, the confidence gap remains visibly wider with Wasserstein, which makes the final lineage decision more decisive."
                src="/csf/results-metric-table-v4.png"
                alt="Wasserstein versus JSD attribution confidence comparison table"
                width={1306}
                height={566}
                figureClassName="table-figure--metric"
              />

              <TableImageCard
                eyebrow="Table 3"
                title="Attribution survives adversarial concept removal."
                description="Even after removing animal-related concepts with UCE, the strongest attribution score still lands on the correct base family, showing that the signal is not tied to a single trigger concept."
                src="/csf/results-ablation-table-v2.png"
                alt="Attribution results under adversarial concept removal across candidate base models"
                width={928}
                height={402}
                figureClassName="table-figure--ablation"
              />
            </div>
          </div>
        </section>

        <section className="section">
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
          max-width: 920px;
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
          padding: 5.5rem 0 3.5rem;
        }

        .csf-page .teaser .hero-body {
          padding-top: 1rem;
          padding-bottom: 3.5rem;
        }

        .csf-page .section {
          padding: 4rem 0;
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
          margin-bottom: 1.75rem;
        }

        .csf-page .publication-authors {
          margin-top: 1rem;
          font-size: 1.125rem;
          color: #334155;
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
            background 0.2s ease;
        }

        .csf-page .template-button:hover {
          color: #ffffff;
          background: #1f2937;
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
        }

        .csf-page .teaser-media {
          max-width: 840px;
          margin: 0 auto;
        }

        .csf-page .teaser-media img {
          display: block;
          width: 100%;
          height: auto;
        }

        .csf-page .subtitle {
          color: #475569;
          font-size: 1.05rem;
          line-height: 1.85;
        }

        .csf-page .teaser-caption {
          max-width: 720px;
          margin: 1.15rem auto 0;
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

        .csf-page .results-grid {
          margin-top: 2rem;
          display: grid;
          gap: 1.5rem;
          grid-template-columns: repeat(3, minmax(0, 1fr));
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
          .csf-page .column.is-four-fifths {
            width: 100%;
          }

          .csf-page .results-grid {
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

function FigureCard({
  src,
  alt,
  width,
  height,
  title,
  caption,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  caption: string;
}) {
  return (
    <article className="result-card">
      <div className="result-figure">
        <Image src={src} alt={alt} width={width} height={height} />
      </div>
      <h3 className="result-title">{title}</h3>
      <p className="result-caption">{caption}</p>
    </article>
  );
}

function TableImageCard({
  eyebrow,
  title,
  description,
  src,
  alt,
  width,
  height,
  figureClassName,
}: {
  eyebrow: string;
  title: string;
  description: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  figureClassName: string;
}) {
  return (
    <section className="table-panel">
      <div className="table-copy">
        <p className="table-eyebrow">{eyebrow}</p>
        <h3 className="table-title">{title}</h3>
        <p className="table-description">{description}</p>
      </div>

      <div className="table-frame">
        <figure className={`table-figure ${figureClassName}`}>
          <div className="result-figure table-image-frame">
            <Image src={src} alt={alt} width={width} height={height} />
          </div>
        </figure>
      </div>
    </section>
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
