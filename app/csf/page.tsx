import type { Metadata } from "next";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, FileText, Home, Quote } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "CSF | Junhoo Lee",
  description:
    "Project page for CSF: Black-box Fingerprinting via Compositional Semantics for Text-to-Image Models.",
};

const displayClass = "font-serif";

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

const promptExamples = [
  "a dangerous animal in a grassland",
  "a tropical single flower on a vase",
  "a sweet fruit on a dish",
  "a peaceful bird on a savana",
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
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#fbf8f2_0%,#f6f1e8_48%,#ffffff_100%)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(191,117,49,0.18),_transparent_32%),radial-gradient(circle_at_82%_12%,_rgba(71,85,105,0.12),_transparent_26%)]" />

        <main className="relative mx-auto max-w-6xl px-6 py-10 sm:px-8 sm:py-16">
          <Link
            href="/#publications"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300/80 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm backdrop-blur transition hover:border-stone-400 hover:text-stone-950"
          >
            <ArrowLeft size={16} />
            Back to homepage
          </Link>

          <section className="mt-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-900">
                CVPR 2026
                <span className="h-1 w-1 rounded-full bg-amber-700" />
                Project Page
              </div>

              <div className="space-y-5">
                <h1
                  className={`${displayClass} max-w-4xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl lg:text-6xl`}
                >
                  CSF: Black-box Fingerprinting via Compositional
                  Semantics for Text-to-Image Models
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-stone-700 sm:text-xl">
                  Can we attribute a deployed text-to-image API back to a
                  protected base model after fine-tuning, even when the
                  infringer exposes only query access? CSF answers this by
                  moving the problem from visual matching to compositional
                  semantics and then making lineage decisions with controlled
                  statistical risk.
                </p>
              </div>

              <div className="space-y-2 text-base text-stone-700">
                <p className="font-medium text-stone-900">
                  Junhoo Lee, Mijin Koo, Nojun Kwak
                </p>
                <p>Seoul National University</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ActionLink
                  href="/csf/csf-paper.pdf"
                  icon={<FileText size={17} />}
                  label="Paper"
                  external
                />
                <ActionLink href="#bibtex" icon={<Quote size={17} />} label="BibTeX" />
                <ActionLink
                  href="/#publications"
                  icon={<Home size={17} />}
                  label="Homepage"
                />
              </div>

              <p className="max-w-2xl text-sm leading-6 text-stone-500">
                This first draft focuses on the problem setting, the core
                intuition behind CSF, and the most important empirical signals.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/[0.85] p-4 shadow-[0_24px_70px_rgba(28,25,23,0.08)] backdrop-blur">
              <Image
                src="/csf/comparison.png"
                alt="Comparison between watermarking, traditional fingerprinting, and CSF in the query-only setting"
                width={1064}
                height={744}
                className="h-auto w-full rounded-xl border border-stone-200 bg-stone-50"
                priority
              />
              <div className="mt-4 rounded-xl bg-stone-100/80 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Why This Matters
                </p>
                <p className="mt-2 text-base leading-7 text-stone-700">
                  Watermarking needs pre-deployment intervention. Traditional
                  fingerprinting often needs weights or activations. CSF is
                  designed for the real forensic case: only a queryable API is
                  available after the suspected model has already been deployed.
                </p>
              </div>
            </div>
          </section>

          <div className="sticky top-4 z-20 mt-10 hidden md:flex justify-center">
            <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white/88 px-2 py-2 shadow-[0_12px_30px_rgba(28,25,23,0.08)] backdrop-blur">
              <NavChip href="#problem" label="Problem" />
              <NavChip href="#challenge" label="Challenge" />
              <NavChip href="#method" label="Method" />
              <NavChip href="#results" label="Results" />
              <NavChip href="#bibtex" label="BibTeX" />
            </div>
          </div>
        </main>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-16 sm:px-8 sm:pb-24">
        <section id="problem" className="scroll-mt-24 pt-6 sm:pt-10">
          <SectionIntro
            eyebrow="The Problem"
            title="Restrictive licenses only matter if lineage violations can actually be detected."
            body="The hardest real-world case is not a public checkpoint. It is a suspect text-to-image service that serves images through an API while hiding its weights, activations, and training history. Existing tools either assume access that commercial APIs never provide, or they rely on pre-deployment watermarking that may not exist in the first place."
          />

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Query-only deployment"
              body="The suspect model may expose only a text prompt in and an image out. No checkpoints, no gradients, no activations."
            />
            <FeatureCard
              title="Fine-tuning rewrites surface appearance"
              body="Style, palette, and composition can shift dramatically, making pixel-level matching unreliable even when the underlying lineage stays the same."
            />
            <FeatureCard
              title="Existing assumptions break"
              body="Watermarks require prior preparation, while many fingerprinting approaches depend on internal access or fragile visual cues."
            />
          </div>
        </section>

        <section
          id="challenge"
          className="scroll-mt-24 mt-20 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"
        >
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Why Naive Matching Fails
            </p>
            <h2
              className={`${displayClass} text-3xl font-semibold leading-tight text-stone-950 sm:text-4xl`}
            >
              Fine-tuning can dominate style so strongly that visual similarity
              becomes a distraction.
            </h2>
            <p className="text-lg leading-8 text-stone-700">
              That is the central obstacle for black-box attribution in
              text-to-image models. A fine-tuned model can look visually far
              away from its source lineage even when the deeper semantic priors
              are still inherited from the base model. CSF therefore avoids
              direct output matching and instead asks what kinds of semantic
              interpretations the model tends to produce.
            </p>
            <div className="rounded-xl border border-stone-200 bg-stone-100/75 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Problem Framing
              </p>
              <p className="mt-2 text-base leading-7 text-stone-700">
                In other words, the question is not whether two models generate
                the same style, but whether they resolve semantic ambiguity in a
                lineage-consistent way.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_24px_70px_rgba(28,25,23,0.06)]">
            <Image
              src="/csf/family-game.png"
              alt="Illustration that naive prompts make base-model identification difficult under strong style shifts"
              width={2250}
              height={1124}
              className="h-auto w-full rounded-xl border border-stone-200"
            />
            <p className="mt-4 text-sm leading-6 text-stone-600">
              A qualitative example of the challenge: when prompts are naive,
              style differences can overwhelm the forensic signal and obscure
              the base lineage.
            </p>
          </div>
        </section>

        <section id="method" className="scroll-mt-24 mt-20">
          <SectionIntro
            eyebrow="Core Idea"
            title="CSF turns image attribution into semantic fingerprinting."
            body="Instead of asking which pixels look similar, we probe how a model interprets underspecified semantic conditions. The key is to use prompt compositions that remain rare under fine-tuning, so the inherited semantic bias of the base model is more likely to survive."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <FeatureCard
              title="1. Semantic fingerprinting"
              body="Treat the model as a semantic category generator. For each prompt, generate multiple images and convert them into category distributions with zero-shot CLIP classification."
            />
            <FeatureCard
              title="2. Compositional underspecification"
              body="Use prompts such as dangerous animal in a forest or sweet fruit on a dish. They are interpretable, but rare enough in fine-tuning data to preserve lineage-specific priors."
            />
            <FeatureCard
              title="3. Bayesian attribution"
              body="Compare suspect and reference fingerprints with Wasserstein distance, then aggregate evidence across prompts into controlled-risk lineage decisions."
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Example Prompt Families
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {promptExamples.map((prompt) => (
                  <span
                    key={prompt}
                    className="rounded-md border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
              <p className="mt-5 text-base leading-7 text-stone-700">
                In the paper, these prompt families span 42 compositions over
                categories such as animals, birds, flowers, fruits, and baked
                goods, with contextual variation used to reveal how each model
                resolves semantic ambiguity.
              </p>
            </div>

            <div className="rounded-xl bg-stone-900 p-6 text-stone-50 shadow-[0_24px_70px_rgba(28,25,23,0.18)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-300">
                Defender-Favorable Asymmetry
              </p>
              <h3
                className={`${displayClass} mt-3 text-2xl font-semibold leading-tight`}
              >
                IP owners can generate new prompt compositions after deployment.
              </h3>
              <p className="mt-4 text-base leading-7 text-stone-200">
                This is one of the most important parts of the story. With
                watermarking, once the trigger is known, attackers can try to
                remove it. With CSF, defenders choose from a much larger
                combinatorial space of rare semantic probes at verification
                time, which makes exhaustive suppression far harder.
              </p>
            </div>
          </div>
        </section>

        <section id="results" className="scroll-mt-24 mt-20">
          <SectionIntro
            eyebrow="Results"
            title="The page now includes the actual result tables from the paper."
            body="These rendered tables make the empirical story much more concrete: CSF stays decisive in the strict query-only setting, improves over a JSD baseline on hard variants, and remains robust even after adversarial concept removal."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile value="6" label="base model families" />
            <StatTile value="13" label="fine-tuned variants" />
            <StatTile value="42" label="compositional prompts" />
            <StatTile value="All pass" label="dominance criterion" />
          </div>

          <div className="mt-8">
            <PosteriorTable
              eyebrow="Main Attribution Matrix"
              title="Posterior mean over the full benchmark."
              description="Each row is a fine-tuned suspect model, and each column is a candidate base family. Red cells indicate significant support for that lineage, amber cells are inconclusive, green cells are significantly below chance, and * marks rows that satisfy the dominance test."
              columns={baseModelColumns}
              sections={mainPosteriorSections}
              footnote="Chance level is 0.167. All 13 suspect models pass the dominance test on their true source family."
              showLegend
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Metric Comparison
              </p>
              <h3
                className={`${displayClass} mt-2 text-2xl font-semibold text-stone-950`}
              >
                Wasserstein produces a clearer margin than the JSD baseline.
              </h3>
              <div className="mt-6 overflow-x-auto custom-scrollbar">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-xs uppercase tracking-[0.16em] text-stone-500">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Variant</th>
                      <th className="pb-3 pr-4 font-medium">Wasserstein</th>
                      <th className="pb-3 pr-4 font-medium">JSD</th>
                      <th className="pb-3 font-medium">Gap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {metricComparisonRows.map((row) => (
                      <tr key={row.variant}>
                        <td className="py-4 pr-4 font-semibold text-stone-900">
                          {row.variant}
                        </td>
                        <td className="py-4 pr-4 font-semibold text-rose-700">
                          {row.wasserstein}
                        </td>
                        <td className="py-4 pr-4">{row.jsd}</td>
                        <td className="py-4 font-semibold text-emerald-700">
                          {row.gap}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-base leading-7 text-stone-700">
                This small table is useful on the page because it translates the
                full attribution matrix into a very simple message: the proposed
                distance is not just workable, it consistently gives a wider
                confidence gap on hard examples.
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Human Perceptual Study
              </p>
              <h3
                className={`${displayClass} mt-2 text-2xl font-semibold text-stone-950`}
              >
                CSF prompts also make the lineage signal more legible to people.
              </h3>
              <Image
                src="/csf/userstudy.png"
                alt="Human study showing stronger base-model identification with CSF prompts"
                width={563}
                height={337}
                className="mt-5 h-auto w-full rounded-xl border border-stone-200"
              />
              <p className="mt-4 text-base leading-7 text-stone-700">
                The same signal is not just machine-readable. When humans are
                asked to ignore style and match only content-distribution
                patterns, CSF prompts make the true lineage much easier to
                identify than naive prompt choices.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <PosteriorTable
              eyebrow="Robustness Ablation"
              title="Attribution remains intact after adversarial concept removal."
              description="This table comes from the UCE removal experiment with 9 animal-specific probes. Even after animal concepts are actively erased, the highest attribution score still lands on the correct base family."
              columns={[
                "Flux",
                "Kandinsky",
                "SD1.5",
                "SD2.1",
                "SD3-Med",
                "SDXL",
              ]}
              sections={ablationSections}
              footnote="The highlighted cell marks the strongest posterior mean for each suspect model after concept erasure."
            />

            <div className="rounded-xl border border-stone-200 bg-stone-100/80 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Prompt Design Validation
              </p>
              <h3
                className={`${displayClass} mt-2 text-2xl font-semibold text-stone-950`}
              >
                Context alone can shift the generated semantic distribution.
              </h3>
              <Image
                src="/csf/prompt-ablation.png"
                alt="Prompt ablation showing category distributions changing across scene contexts"
                width={828}
                height={316}
                className="mt-5 h-auto w-full rounded-xl border border-stone-200"
              />
              <p className="mt-4 text-base leading-7 text-stone-700">
                This is the behavior CSF exploits. Underspecified prompts force
                the model to resolve ambiguity using learned priors, and the
                resulting semantic mixture becomes a fingerprint.
              </p>
              <ul className="mt-5 space-y-4 text-base leading-7 text-stone-700">
                <li>
                  CSF is training-free and does not require modifying the base
                  model before deployment.
                </li>
                <li>
                  The method is designed for the API-only black-box scenario,
                  which is exactly where commercial infringement disputes are
                  hardest.
                </li>
                <li>
                  The rendered tables now make that forensic claim concrete
                  instead of leaving the results at the level of qualitative
                  takeaways.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          id="bibtex"
          className="scroll-mt-24 mt-20 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                Citation
              </p>
              <h2
                className={`${displayClass} mt-2 text-3xl font-semibold text-stone-950`}
              >
                BibTeX
              </h2>
            </div>
            <a
              href="/csf/csf-paper.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:text-stone-950"
            >
              Read the paper
              <ArrowUpRight size={16} />
            </a>
          </div>
          <pre className="mt-6 overflow-x-auto rounded-xl bg-stone-950 p-5 text-sm leading-7 text-stone-100">
            {bibtex}
          </pre>
        </section>

        <footer className="mt-10 pb-4 text-sm leading-6 text-stone-500">
          <p>
            This page borrows the clean academic section rhythm of{" "}
            <a
              href="https://github.com/edit-by-track/edit-by-track.github.io"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-stone-950"
            >
              Edit-by-Track
            </a>{" "}
            and adapts it for a problem-first CSF presentation.
          </p>
        </footer>
      </main>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="inline-flex items-center gap-2 rounded-lg border border-stone-300/80 bg-white/[0.85] px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-stone-400 hover:text-stone-950"
    >
      {icon}
      {label}
    </a>
  );
}

function NavChip({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-transparent px-4 py-2 text-sm font-medium text-stone-600 transition hover:border-stone-200 hover:bg-stone-100 hover:text-stone-950"
      title={`Jump to ${label}`}
    >
      {label}
    </a>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
        {eyebrow}
      </p>
      <h2
        className={`${displayClass} text-3xl font-semibold leading-tight text-stone-950 sm:text-4xl`}
      >
        {title}
      </h2>
      <p className="text-lg leading-8 text-stone-700">{body}</p>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
      <p className="mt-3 text-base leading-7 text-stone-700">{body}</p>
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className={`${displayClass} text-4xl font-semibold text-stone-950`}>
        {value}
      </p>
      <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-stone-500">
        {label}
      </p>
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
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
        {eyebrow}
      </p>
      <h3
        className={`${displayClass} mt-2 text-2xl font-semibold text-stone-950`}
      >
        {title}
      </h3>
      <p className="mt-3 max-w-4xl text-base leading-7 text-stone-700">
        {description}
      </p>

      {showLegend ? (
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.14em] text-stone-600">
          <LegendPill label="Significant match" tone="match" />
          <LegendPill label="Inconclusive" tone="uncertain" />
          <LegendPill label="Below chance" tone="below" />
          <span className="inline-flex items-center rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5">
            * Dominance test
          </span>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto custom-scrollbar">
        <table className="min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-stone-500">
            <tr>
              <th className="sticky left-0 z-10 rounded-l-lg bg-stone-100 px-4 py-3 font-medium">
                Suspect Model
              </th>
              {columns.map((column, index) => (
                <th
                  key={column}
                  className={`bg-stone-100 px-4 py-3 text-center font-medium ${
                    index === columns.length - 1 ? "rounded-r-lg" : ""
                  }`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <Fragment key={section.family}>
                <tr key={`${section.family}-header`}>
                  <td
                    colSpan={columns.length + 1}
                    className="pt-4 pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500"
                  >
                    {section.family}
                  </td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label}>
                    <td className="sticky left-0 rounded-l-lg border border-r-0 border-stone-200 bg-white px-4 py-3 font-semibold text-stone-900 shadow-sm">
                      {row.label}
                    </td>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.label}-${columns[index]}`}
                        className={`border border-l-0 border-stone-200 bg-white px-3 py-3 text-center shadow-sm ${
                          index === row.cells.length - 1 ? "rounded-r-lg" : ""
                        }`}
                      >
                        <span
                          className={`inline-flex min-w-[4.5rem] items-center justify-center rounded-md border px-2.5 py-1 font-semibold ${scoreToneClasses[cell.tone]}`}
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

      <p className="mt-4 text-sm leading-6 text-stone-500">{footnote}</p>
    </div>
  );
}

function LegendPill({ label, tone }: { label: string; tone: ScoreTone }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-3 py-1.5 ${scoreToneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

const scoreToneClasses: Record<ScoreTone, string> = {
  match: "border-rose-200 bg-rose-100 text-rose-900",
  uncertain: "border-amber-200 bg-amber-100 text-amber-900",
  below: "border-emerald-200 bg-emerald-100 text-emerald-900",
  plain: "border-stone-200 bg-stone-50 text-stone-700",
};
