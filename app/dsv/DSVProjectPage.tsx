"use client";

import {
  ArrowUpRight,
  ChevronUp,
  Code2,
  FileArchive,
  FileText,
  Github,
  Home,
  Sparkles,
  Target,
  Waypoints,
} from "lucide-react";
import { DM_Sans, Noto_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import BibtexCopyButton from "../csf/BibtexCopyButton";

const displayFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const bodyFont = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const sectionLinks = [
  { id: "abstract", label: "Abstract" },
  { id: "key-ideas", label: "Key Ideas" },
  { id: "deepkkt", label: "DeepKKT" },
  { id: "distillation", label: "Distillation" },
  { id: "visual-evidence", label: "Evidence" },
  { id: "generative", label: "Generation" },
  { id: "code", label: "Code" },
  { id: "bibtex", label: "BibTeX" },
];

const abstractParagraphs = [
  "Deep learning achieves remarkable accuracy, but it still hides the samples and cues that actually shape its decision boundary. Deep Support Vectors asks whether a modern classifier can recover something as structurally important and interpretable as classic support vectors.",
  "The paper introduces DeepKKT, a deep-learning adaptation of the Karush-Kuhn-Tucker condition, to identify or synthesize Deep Support Vectors (DSVs). These DSVs behave like boundary-defining samples: they exhibit high uncertainty, summarize model behavior, and reveal what features a classifier relies on to separate classes.",
  "That same optimization recipe also leads to practical few-shot distillation and classifier-driven generation. One framework ties together interpretability, compression, and synthesis without requiring the original training set at reconstruction time.",
];

const deepkktParagraphs = [
  "DeepKKT extends the KKT recipe from maximum-margin classifiers to overparameterized deep networks. Instead of only enforcing correct classification, it also tracks dual feasibility, a stationarity-style relation between the trained model and candidate samples, and a manifold prior that keeps synthesized DSVs on plausible data support.",
  "This produces a practical recipe for recovering support-vector-like samples from a trained classifier without replaying full training. In the paper, the conditions are evaluated on ConvNet and ResNet backbones across CIFAR10, CIFAR100, SVHN, and ImageNet.",
];

const distillationParagraphs = [
  "The few-shot result is especially striking because DeepKKT does not depend on full-dataset access, trajectory matching, or Hessian-heavy objectives. A pretrained classifier itself becomes the supervisory signal for distillation.",
  "On CIFAR10, the source table shows that DSV-based distillation remains competitive even in extremely data-starved settings, including zero-shot cases where no original class image is used to initialize the distilled set.",
];

const visualEvidenceParagraphs = [
  "The paper makes the support-vector analogy concrete in several ways. Candidate DSVs become higher-entropy over optimization, consistent with moving toward a decision boundary, and the learned Lagrange multipliers correlate with downstream classwise test accuracy.",
  "The same decision signals are also visible. DSV-guided edits expose the precise traits a classifier leans on, showing how local semantic changes can flip the model's prediction.",
];

const generativeParagraphs = [
  "DeepKKT also reframes a classifier as a latent generative model. By treating labels or soft labels as latent variables, the method can synthesize unseen images, interpolate between classes, and perform semantically meaningful edits.",
  "The source figures further show why the full objective matters. Primal-only optimization does not yield meaningful samples, while the stationarity-aware objective produces sharper, more class-consistent generations that stay close to the data manifold.",
];

const codeParagraphs = [
  "The supplementary release ships a compact reconstruction pipeline under `submit_code/`. The page below mirrors that layout rather than inventing a new pseudo-repo structure: `pl_main.py` is the Lightning entrypoint, `base_reconstruct_imagenet.yaml` holds the default reconstruction config, and the optimization logic is split across `models.py`, `svm_modules.py`, and the dataset helpers.",
  "For the project page, the code block is presented exactly around that release entrypoint so the GitHub link, README, and reproduction snippet all line up with the supplementary package users actually receive.",
];

const ideaCards = [
  {
    icon: Target,
    title: "Recover boundary-critical samples",
    body:
      "DSVs act like support vectors for deep networks: they sit near the boundary, surface uncertainty, and summarize what the classifier treats as essential.",
  },
  {
    icon: Waypoints,
    title: "Distill from a trained classifier",
    body:
      "DeepKKT turns a frozen classifier into a practical distillation signal, avoiding the usual full-dataset, snapshot-heavy matching pipelines.",
  },
  {
    icon: Sparkles,
    title: "Reuse classification as generation",
    body:
      "Once labels become latent variables, the same optimization supports synthesis, interpolation, and editing without a separate generator.",
  },
];

const actionLinks = [
  {
    href: "/dsv/deep-support-vectors-paper.pdf",
    label: "Paper",
    icon: FileText,
    external: false,
    primary: true,
  },
  {
    href: "https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors",
    label: "GitHub",
    icon: Github,
    external: true,
    primary: false,
  },
  {
    href: "/dsv/deep-support-vectors-supplemental.zip",
    label: "Supplementary",
    icon: FileArchive,
    external: false,
    primary: false,
  },
  {
    href: "https://arxiv.org/abs/2403.17329",
    label: "arXiv",
    icon: ArrowUpRight,
    external: true,
    primary: false,
  },
];

const bibtex = `@article{lee2024deepsupportvectors,
  title         = {Deep Support Vectors},
  author        = {Lee, Junhoo and Lee, Hyunho and Hwang, Kyomin and Kwak, Nojun},
  journal       = {Advances in Neural Information Processing Systems},
  volume        = {37},
  year          = {2024},
  eprint        = {2403.17329},
  archivePrefix = {arXiv},
  primaryClass  = {cs.LG},
  url           = {https://arxiv.org/abs/2403.17329}
}`;

const codeCommand = `python pl_main.py --yaml base_reconstruct_imagenet.yaml \\
  --loss_weight 1e-4 \\
  --UPSCALE_cycle 2000 \\
  --tv_scale 200000 \\
  --alpha_scale 1e-4`;

const yamlSnippet = `ARCHITECTURE: resnet
BATCH_SIZE: 256
CHECKPATH: "./checkpoints/"
SAVE_NAME: RECONSTRUCT
DATASET: CIFAR10
NUM_SAMPLES: 1
PATH_DATASETS: "./data"
RECONSTRUCT_DATA: true
REF_MODEL_PATH: ./models/imagenet.ckpt
DATAPATH: "./data"
MODE: "RECONSTRUCT"
NUM_WORKERS: 12`;

const codeFiles = [
  {
    name: "pl_main.py",
    description:
      "PyTorch Lightning entrypoint that parses optimization flags, loads the yaml config, and dispatches reconstruction, base training, or SVM retraining modes.",
  },
  {
    name: "base_reconstruct_imagenet.yaml",
    description:
      "Default reconstruction config used by the supplementary release for DSV synthesis runs.",
  },
  {
    name: "models.py / svm_modules.py",
    description:
      "Core model and DeepKKT optimization logic used for reconstruction and downstream evaluation.",
  },
];

type MethodKey = "dc" | "dsa" | "dm" | "dsv";

type FewShotRow = {
  shot: string;
  ratio: string;
  dc: string;
  dsa: string;
  dm: string;
  dsv: string;
  best?: MethodKey;
};

const fewShotGroups: Array<{ imgPerClass: string; rows: FewShotRow[] }> = [
  {
    imgPerClass: "1",
    rows: [
      {
        shot: "0",
        ratio: "0",
        dc: "-",
        dsa: "-",
        dm: "-",
        dsv: "21.68 +/- 0.80",
        best: "dsv",
      },
      {
        shot: "1",
        ratio: "0.02",
        dc: "16.48 +/- 0.81",
        dsa: "15.41 +/- 1.91",
        dm: "13.03 +/- 0.15",
        dsv: "22.69 +/- 0.38",
        best: "dsv",
      },
      {
        shot: "10",
        ratio: "0.2",
        dc: "19.66 +/- 0.78",
        dsa: "21.15 +/- 0.58",
        dm: "22.42 +/- 0.43",
        dsv: "-",
        best: "dm",
      },
      {
        shot: "50",
        ratio: "1",
        dc: "25.90 +/- 0.62",
        dsa: "26.01 +/- 0.70",
        dm: "24.42 +/- 0.29",
        dsv: "-",
        best: "dsa",
      },
      {
        shot: "500",
        ratio: "10",
        dc: "28.06 +/- 0.61",
        dsa: "28.20 +/- 0.63",
        dm: "25.06 +/- 1.20",
        dsv: "-",
        best: "dsa",
      },
    ],
  },
  {
    imgPerClass: "10",
    rows: [
      {
        shot: "0",
        ratio: "0",
        dc: "-",
        dsa: "-",
        dm: "-",
        dsv: "30.35 +/- 0.99",
        best: "dsv",
      },
      {
        shot: "10",
        ratio: "0.2",
        dc: "25.06 +/- 1.20",
        dsa: "26.67 +/- 1.04",
        dm: "29.77 +/- 0.66",
        dsv: "37.90 +/- 1.69",
        best: "dsv",
      },
      {
        shot: "50",
        ratio: "1",
        dc: "36.44 +/- 0.52",
        dsa: "36.63 +/- 0.52",
        dm: "36.63 +/- 0.52",
        dsv: "-",
      },
      {
        shot: "500",
        ratio: "10",
        dc: "43.55 +/- 0.50",
        dsa: "44.66 +/- 0.59",
        dm: "47.96 +/- 0.95",
        dsv: "-",
        best: "dm",
      },
    ],
  },
  {
    imgPerClass: "50",
    rows: [
      {
        shot: "0",
        ratio: "0",
        dc: "-",
        dsa: "-",
        dm: "-",
        dsv: "39.35 +/- 0.54",
        best: "dsv",
      },
      {
        shot: "50",
        ratio: "1",
        dc: "41.22 +/- 0.90",
        dsa: "41.29 +/- 0.45",
        dm: "48.93 +/- 0.92",
        dsv: "53.56 +/- 0.73",
        best: "dsv",
      },
      {
        shot: "500",
        ratio: "10",
        dc: "52.00 +/- 0.59",
        dsa: "52.19 +/- 0.53",
        dm: "60.59 +/- 0.41",
        dsv: "-",
        best: "dm",
      },
    ],
  },
];

function TextBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="section-copy">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function FigureCard({
  title,
  caption,
  src,
  alt,
  width,
  height,
  imageClassName,
  className,
  priority = false,
}: {
  title: string;
  caption: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  imageClassName?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <article className={`figure-card ${className ?? ""}`.trim()}>
      <div className="figure-card-copy">
        <h3 className={`figure-card-title ${displayFont.className}`}>{title}</h3>
        <p className="figure-card-caption">{caption}</p>
      </div>
      <div className="source-figure-shell">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          className={`source-figure-image ${imageClassName ?? ""}`.trim()}
          sizes="(max-width: 1024px) 100vw, 900px"
        />
      </div>
    </article>
  );
}

function ResultCell({
  value,
  isBest,
}: {
  value: string;
  isBest?: boolean;
}) {
  return (
    <td className={value === "-" ? "table-cell-empty" : undefined}>
      {value === "-" ? (
        <span className="table-dash">-</span>
      ) : (
        <span className={isBest ? "table-best" : undefined}>{value}</span>
      )}
    </td>
  );
}

export default function DSVProjectPage() {
  return (
    <div className={`${bodyFont.className} dsv-page`} id="top">
      <nav className="top-nav" aria-label="Section navigation">
        <div className="nav-shell">
          <Link href="/" className="nav-home">
            <Home size={16} />
            <span>Home</span>
          </Link>
          <div className="nav-links">
            {sectionLinks.map((section) => (
              <a key={section.id} className="nav-link" href={`#${section.id}`}>
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-shell">
          <p className={`eyebrow ${displayFont.className}`}>NeurIPS 2024</p>
          <h1 className={`publication-title ${displayFont.className}`}>
            Deep Support Vectors
          </h1>
          <p className="hero-summary">
            DeepKKT uncovers support-vector-like samples inside deep classifiers,
            enables few-shot distillation with almost no data, and turns a
            classifier into a latent generator.
          </p>

          <div className={`publication-authors ${displayFont.className}`}>
            <span className="author-block">
              Junhoo Lee<sup>1</sup>,
            </span>
            <span className="author-block">
              Hyunho Lee<sup>1</sup>,
            </span>
            <span className="author-block">
              Kyomin Hwang<sup>1</sup>,
            </span>
            <span className="author-block">
              Nojun Kwak<sup>1</sup>
            </span>
          </div>

          <div className={`publication-meta ${displayFont.className}`}>
            <span className="publication-venue">
              Advances in Neural Information Processing Systems 37
            </span>
            <span className="publication-affiliation">
              <sup>1</sup>Seoul National University
            </span>
          </div>

          <div className="publication-links">
            {actionLinks.map(({ href, label, icon: Icon, external, primary }) =>
              external ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`action-link ${primary ? "action-link-primary" : ""}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </a>
              ) : (
                <a
                  key={label}
                  href={href}
                  className={`action-link ${primary ? "action-link-primary" : ""}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </a>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="section teaser">
        <div className="container">
          <div className="section-box figure-section-box">
            <div className="section-copy">
              <p>
                The opening figure is rendered directly from
                `figure/overall_photo.pdf` in the paper source. It shows DSV
                generations on ImageNet, CIFAR10, and CIFAR100 produced without
                revisiting the original training data, which frames the paper's
                core claim: modern classifiers really do contain recoverable
                support-vector-like structure.
              </p>
            </div>
            <div className="source-figure-shell source-figure-shell-hero">
              <Image
                src="/dsv/figure-hero-tex-1.png"
                alt="Generated images from the original overall_photo figure in the Deep Support Vectors source."
                width={5867}
                height={3300}
                priority
                className="source-figure-image source-figure-image-hero"
                sizes="(max-width: 1024px) 100vw, 980px"
              />
            </div>
            <p className="source-note">
              Source figure: `figure/overall_photo.pdf` from the official TeX
              release.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="abstract">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>Abstract</h2>
              <TextBlock paragraphs={abstractParagraphs} />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="key-ideas">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>Key Ideas</h2>
              <div className="idea-grid">
                {ideaCards.map(({ icon: Icon, title, body }) => (
                  <article key={title} className="idea-card">
                    <div className="idea-icon">
                      <Icon size={20} />
                    </div>
                    <h3 className={`idea-title ${displayFont.className}`}>{title}</h3>
                    <p className="idea-body">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="deepkkt">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>DeepKKT</h2>
              <TextBlock paragraphs={deepkktParagraphs} />
              <div className="constraint-grid">
                <div className="constraint-card">
                  <span className="constraint-name">Primal</span>
                  <p className="constraint-formula">arg max Phi_c(x_i; theta*) = y_i</p>
                  <p className="constraint-copy">
                    Candidate DSVs must still land on the target class.
                  </p>
                </div>
                <div className="constraint-card">
                  <span className="constraint-name">Dual</span>
                  <p className="constraint-formula">lambda_i &gt;= 0</p>
                  <p className="constraint-copy">
                    The multiplier becomes a natural measure of sample importance.
                  </p>
                </div>
                <div className="constraint-card">
                  <span className="constraint-name">Stationarity</span>
                  <p className="constraint-formula">
                    theta* ~= sum_i lambda_i grad_theta L(Phi(x_i; theta*), y_i)
                  </p>
                  <p className="constraint-copy">
                    Support-vector structure is tied back to the trained model.
                  </p>
                </div>
                <div className="constraint-card">
                  <span className="constraint-name">Manifold</span>
                  <p className="constraint-formula">x_i in M</p>
                  <p className="constraint-copy">
                    Synthesized DSVs stay close to plausible data support.
                  </p>
                </div>
              </div>
              <div className="single-figure-wrap">
                <FigureCard
                  title="Why the full objective matters"
                  caption="This figure is rendered directly from `figure/primalstat.pdf`. The paper uses it to show that primal-only optimization captures weak texture cues, while the full DeepKKT objective moves samples toward meaningful class structure."
                  src="/dsv/figure-deepkkt-tex-1.png"
                  alt="Original primalstat figure from the Deep Support Vectors source."
                  width={5867}
                  height={3300}
                  imageClassName="source-figure-image-balanced"
                  className="figure-card-wide"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="distillation">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>
                Few-Shot Distillation
              </h2>
              <TextBlock paragraphs={distillationParagraphs} />
              <div className="distillation-layout">
                <div className="table-shell">
                  <div className="table-scroll">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>img/cls</th>
                          <th>shot/class</th>
                          <th>ratio (%)</th>
                          <th>DC</th>
                          <th>DSA</th>
                          <th>DM</th>
                          <th>DSV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fewShotGroups.map((group) =>
                          group.rows.map((row, rowIndex) => (
                            <tr key={`${group.imgPerClass}-${row.shot}`}>
                              {rowIndex === 0 ? (
                                <th rowSpan={group.rows.length} className="row-group">
                                  {group.imgPerClass}
                                </th>
                              ) : null}
                              <td>{row.shot}</td>
                              <td>{row.ratio}</td>
                              <ResultCell value={row.dc} isBest={row.best === "dc"} />
                              <ResultCell value={row.dsa} isBest={row.best === "dsa"} />
                              <ResultCell value={row.dm} isBest={row.best === "dm"} />
                              <ResultCell value={row.dsv} isBest={row.best === "dsv"} />
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="results-caption">
                    Reproduced as HTML from `sec/main_table.tex` in the source,
                    using the CIFAR10 few-shot dataset distillation numbers.
                  </p>
                </div>
                <aside className="distillation-notes-card">
                  <div className="distillation-notes-head">
                    <Code2 size={18} />
                    <span>What stands out</span>
                  </div>
                  <p>
                    DSV is the only method reported in the zero-shot rows, and it
                    remains strong when just one or ten shots per class are
                    available for initialization.
                  </p>
                  <p>
                    The table makes the paper's systems point very clear: a
                    pretrained classifier alone can synthesize useful distilled
                    data without replaying the original full dataset.
                  </p>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="visual-evidence">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>
                Visual Evidence
              </h2>
              <TextBlock paragraphs={visualEvidenceParagraphs} />
              <div className="analysis-grid">
                <FigureCard
                  title="Entropy rises near the boundary"
                  caption="Rendered from `figure/Entropy_DSV.pdf`. As optimization proceeds, DSV candidates become higher-entropy, which matches the intuition that support vectors should lie close to the decision boundary."
                  src="/dsv/figure-entropy-tex-1.png"
                  alt="Entropy change figure from the Deep Support Vectors source."
                  width={1320}
                  height={880}
                  className="figure-card-compact"
                />
                <FigureCard
                  title="Lambda tracks classwise generalization"
                  caption="Rendered from `figure/pearson.pdf`. The source figure links the sum of learned lambda values to classwise test accuracy, turning DeepKKT multipliers into a readable importance signal."
                  src="/dsv/figure-pearson-tex-1.png"
                  alt="Pearson correlation figure from the Deep Support Vectors source."
                  width={5867}
                  height={3300}
                  imageClassName="source-figure-image-balanced"
                  className="figure-card-compact"
                />
                <FigureCard
                  title="Decision criteria become editable"
                  caption="Rendered from `figure/editimages.pdf`. The examples show original images, DSV-informed manual edits, and DeepKKT-based edits that change the classifier's prediction by altering the precise cue it relies on."
                  src="/dsv/figure-edits-tex-1.png"
                  alt="Edited image examples from the Deep Support Vectors source."
                  width={5867}
                  height={3300}
                  imageClassName="source-figure-image-edits"
                  className="figure-card-span"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="generative">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>
                Classifier as Generator
              </h2>
              <TextBlock paragraphs={generativeParagraphs} />
              <div className="generative-grid">
                <FigureCard
                  title="Class interpolation from soft labels"
                  caption="Rendered from `figure/interpolation_fig_compressed.pdf`. The interpolation figure shows that DeepKKT can move smoothly between class semantics while staying in-distribution."
                  src="/dsv/figure-interp-tex-1.png"
                  alt="Interpolation figure from the Deep Support Vectors source."
                  width={5867}
                  height={3300}
                  imageClassName="source-figure-image-balanced"
                  className="figure-card-wide"
                />
                <FigureCard
                  title="Mixup in latent label space"
                  caption="Rendered from `figure/mixup_overall.pdf_compressed.pdf`. The supplementary figure illustrates label-space mixing as a direct extension of the same DeepKKT reconstruction objective."
                  src="/dsv/figure-mixup-tex-1.png"
                  alt="Mixup figure from the Deep Support Vectors supplementary source."
                  width={5867}
                  height={3300}
                  imageClassName="source-figure-image-balanced"
                  className="figure-card-wide"
                />
                <FigureCard
                  title="ImageNet mixing examples"
                  caption="Rendered from `figure/mix_imagenet_compressed.pdf`. The ImageNet examples make the same point at larger scale: semantic mixing is coming from the classifier-guided objective itself, not from a separately trained generator."
                  src="/dsv/figure-imagenet-mix-tex-1.png"
                  alt="ImageNet mixing figure from the Deep Support Vectors source."
                  width={5867}
                  height={3300}
                  imageClassName="source-figure-image-balanced"
                  className="figure-card-wide"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="code">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <h2 className={`section-title ${displayFont.className}`}>
                Supplementary Code Layout
              </h2>
              <TextBlock paragraphs={codeParagraphs} />
              <div className="code-grid">
                <div className="code-card">
                  <div className="code-card-label">Main command</div>
                  <pre className="snippet-code">
                    <code>{codeCommand}</code>
                  </pre>
                </div>
                <div className="code-card">
                  <div className="code-card-label">Base yaml</div>
                  <pre className="snippet-code">
                    <code>{yamlSnippet}</code>
                  </pre>
                </div>
              </div>
              <div className="release-grid">
                {codeFiles.map((file) => (
                  <article key={file.name} className="release-card">
                    <h3 className={`release-title ${displayFont.className}`}>
                      {file.name}
                    </h3>
                    <p className="release-copy">{file.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="bibtex">
        <div className="container">
          <div className="section-box">
            <div className="section-inner">
              <div className="bibtex-header">
                <h2 className={`section-title ${displayFont.className}`}>BibTeX</h2>
                <BibtexCopyButton text={bibtex} />
              </div>
              <pre className="bibtex-code">
                <code>{bibtex}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-shell">
          <p>
            This page follows the section rhythm of the template-infilling
            project page, but every showcased DSV figure is rendered from the
            original TeX figure assets and the few-shot table is rebuilt from
            `sec/main_table.tex` rather than image-cropped screenshots.
          </p>
        </div>
      </footer>

      <a href="#top" className="scroll-to-top" aria-label="Back to top">
        <ChevronUp size={18} />
      </a>

      <style jsx>{`
        .dsv-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(16, 185, 129, 0.08), transparent 34%),
            linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%);
          color: #1f2937;
        }

        .top-nav {
          position: sticky;
          top: 0;
          z-index: 40;
          border-bottom: 1px solid #e8edf4;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(14px);
        }

        .nav-shell {
          max-width: 1080px;
          margin: 0 auto;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.85rem 1rem;
          padding: 0.9rem 1.5rem;
        }

        .nav-home,
        .nav-link {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          padding: 0.6rem 0.95rem;
          font-size: 0.94rem;
          font-weight: 600;
          color: #475569;
          text-decoration: none;
          transition:
            background-color 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .nav-home {
          border: 1px solid #dbe4ee;
          background: #ffffff;
        }

        .nav-home:hover,
        .nav-link:hover {
          background: #f8fafc;
          color: #0f172a;
          transform: translateY(-1px);
        }

        .nav-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.35rem;
        }

        .hero {
          padding: 4.75rem 1.5rem 2.3rem;
        }

        .hero-shell,
        .container {
          max-width: 1080px;
          margin: 0 auto;
        }

        .hero-shell {
          text-align: center;
        }

        .eyebrow {
          margin: 0;
          font-size: 0.94rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #0f766e;
        }

        .publication-title {
          margin: 1rem auto 0;
          max-width: 920px;
          font-size: clamp(2.5rem, 5vw, 4.4rem);
          line-height: 1.05;
          font-weight: 700;
          letter-spacing: -0.04em;
          color: #0f172a;
        }

        .hero-summary {
          max-width: 780px;
          margin: 1.3rem auto 0;
          font-size: 1.08rem;
          line-height: 1.75;
          color: #475569;
        }

        .publication-authors,
        .publication-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.55rem 0.9rem;
          margin-top: 1.1rem;
          font-size: 1.16rem;
          color: #1e293b;
        }

        .publication-meta {
          flex-direction: column;
          gap: 0.35rem;
          margin-top: 1rem;
        }

        .publication-venue {
          font-weight: 700;
          color: #334155;
        }

        .publication-affiliation {
          color: #64748b;
        }

        .publication-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.8rem;
          margin-top: 1.9rem;
        }

        .action-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 999px;
          border: 1px solid #dbe4ee;
          background: #ffffff;
          color: #0f172a;
          padding: 0.8rem 1.15rem;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .action-link:hover {
          transform: translateY(-1px);
          border-color: #c2cedd;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
        }

        .action-link-primary {
          border-color: #0f172a;
          background: #0f172a;
          color: #ffffff;
        }

        .section {
          padding: 1.25rem 1.5rem;
        }

        .teaser {
          padding-top: 0;
          padding-bottom: 2rem;
        }

        .section-box {
          border: 1px solid #edf2f7;
          border-radius: 18px;
          background: #f7f9fc;
          padding: 2rem 1.35rem;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }

        .section-inner {
          width: 100%;
          text-align: center;
        }

        .section-title {
          margin: 0 0 1rem;
          font-size: 1.95rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: #0f172a;
        }

        .section-copy {
          max-width: 88%;
          margin: 0 auto 0.9rem;
          text-align: left;
          font-size: 1.01rem;
          line-height: 1.72;
          color: #334155;
        }

        .section-copy p {
          margin: 0 0 0.9rem;
        }

        .section-copy p:last-child {
          margin-bottom: 0;
        }

        .figure-section-box .section-copy {
          margin-bottom: 1rem;
        }

        .source-figure-shell {
          width: 100%;
          border-radius: 16px;
          background: #ffffff;
          padding: 0.9rem;
          box-shadow: inset 0 0 0 1px #e5edf7;
        }

        .source-figure-shell-hero {
          padding: 1rem;
        }

        .source-figure-image {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 10px;
        }

        .source-figure-image-hero,
        .source-figure-image-balanced {
          max-width: 100%;
          margin: 0 auto;
        }

        .source-figure-image-edits {
          max-width: 92%;
          margin: 0 auto;
        }

        .source-note {
          margin: 0.8rem 0 0;
          text-align: center;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #64748b;
        }

        .idea-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 0.8rem;
        }

        .idea-card,
        .constraint-card,
        .figure-card,
        .distillation-notes-card,
        .code-card,
        .release-card {
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .idea-card {
          padding: 1.25rem;
          text-align: left;
        }

        .idea-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }

        .idea-title {
          margin: 0.95rem 0 0.55rem;
          font-size: 1.2rem;
          color: #0f172a;
        }

        .idea-body {
          margin: 0;
          font-size: 0.96rem;
          line-height: 1.72;
          color: #475569;
        }

        .constraint-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .constraint-card {
          padding: 1.15rem 1.2rem;
          text-align: left;
        }

        .constraint-name {
          display: inline-flex;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          padding: 0.35rem 0.65rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .constraint-formula {
          margin: 0.9rem 0 0.45rem;
          font-family:
            ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
          font-size: 0.94rem;
          line-height: 1.7;
          color: #0f172a;
        }

        .constraint-copy {
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.65;
          color: #475569;
        }

        .single-figure-wrap {
          margin-top: 1rem;
        }

        .figure-card {
          padding: 0.9rem;
          text-align: left;
        }

        .figure-card-copy {
          padding: 0.15rem 0.15rem 0.85rem;
        }

        .figure-card-title {
          margin: 0;
          font-size: 1.18rem;
          color: #0f172a;
        }

        .figure-card-caption {
          margin: 0.55rem 0 0;
          font-size: 0.94rem;
          line-height: 1.68;
          color: #475569;
        }

        .figure-card-wide .source-figure-shell {
          padding: 0.95rem;
        }

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
          align-items: start;
        }

        .figure-card-span {
          grid-column: 1 / -1;
        }

        .distillation-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
          gap: 1rem;
          align-items: start;
          margin-top: 1rem;
        }

        .table-shell {
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
          padding: 1rem;
        }

        .table-scroll {
          overflow-x: auto;
        }

        .results-table {
          width: 100%;
          min-width: 760px;
          border-collapse: collapse;
          font-size: 0.93rem;
          color: #1e293b;
        }

        .results-table th,
        .results-table td {
          border: 1px solid #dbe5f0;
          padding: 0.75rem 0.7rem;
          text-align: center;
          vertical-align: middle;
        }

        .results-table thead th {
          background: #eff6ff;
          font-weight: 700;
          color: #0f172a;
        }

        .results-table tbody th {
          background: #f8fafc;
          font-weight: 700;
        }

        .row-group {
          min-width: 78px;
        }

        .table-best {
          font-weight: 800;
          color: #0f172a;
        }

        .table-cell-empty {
          color: #94a3b8;
        }

        .table-dash {
          color: #94a3b8;
        }

        .results-caption {
          margin: 0.85rem 0 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #64748b;
        }

        .distillation-notes-card {
          padding: 1rem 1rem 1.05rem;
          text-align: left;
        }

        .distillation-notes-head {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          margin-bottom: 0.8rem;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.42rem 0.75rem;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .distillation-notes-card p {
          margin: 0 0 0.8rem;
          font-size: 0.95rem;
          line-height: 1.68;
          color: #475569;
        }

        .distillation-notes-card p:last-child {
          margin-bottom: 0;
        }

        .generative-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-top: 1rem;
        }

        .code-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .code-card {
          padding: 1rem;
          text-align: left;
        }

        .code-card-label {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          padding: 0.35rem 0.7rem;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .snippet-code,
        .bibtex-code {
          margin: 0.9rem 0 0;
          overflow-x: auto;
          border-radius: 1rem;
          background: #0f172a;
          padding: 1.2rem 1.25rem;
          text-align: left;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.8;
        }

        .snippet-code code,
        .bibtex-code code {
          font-family:
            ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
          white-space: pre;
        }

        .release-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .release-card {
          padding: 1rem;
          text-align: left;
        }

        .release-title {
          margin: 0;
          font-size: 1.08rem;
          color: #0f172a;
        }

        .release-copy {
          margin: 0.65rem 0 0;
          font-size: 0.95rem;
          line-height: 1.68;
          color: #475569;
        }

        .bibtex-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .footer {
          padding: 2.5rem 1.5rem 3rem;
        }

        .footer-shell {
          max-width: 820px;
          margin: 0 auto;
          border-top: 1px solid #e2e8f0;
          padding-top: 2rem;
          text-align: center;
          font-size: 0.96rem;
          line-height: 1.8;
          color: #64748b;
        }

        .scroll-to-top {
          position: fixed;
          right: 1.35rem;
          bottom: 1.35rem;
          z-index: 30;
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
          text-decoration: none;
          backdrop-filter: blur(8px);
        }

        .dsv-page :global(.copy-bibtex-button) {
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

        .dsv-page :global(.copy-bibtex-button:hover) {
          border-color: #94a3b8;
          color: #0f172a;
          transform: translateY(-1px);
        }

        @media (max-width: 960px) {
          .idea-grid,
          .constraint-grid,
          .analysis-grid,
          .distillation-layout,
          .code-grid,
          .release-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .hero {
            padding: 3.25rem 1rem 2rem;
          }

          .publication-title {
            font-size: clamp(2rem, 9vw, 3rem);
          }

          .hero-summary,
          .publication-authors,
          .publication-meta {
            font-size: 1rem;
          }

          .section {
            padding: 1rem;
          }

          .section-box {
            padding: 1.4rem 1rem;
          }

          .section-title {
            font-size: 1.65rem;
          }

          .section-copy {
            max-width: 100%;
          }

          .nav-shell {
            padding: 0.8rem 1rem;
          }

          .bibtex-header {
            align-items: flex-start;
          }

          .source-figure-shell,
          .source-figure-shell-hero {
            padding: 0.65rem;
          }

          .source-figure-image-edits {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
