"use client";

import {
  ArrowUpRight,
  ChevronUp,
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
  { id: "visual-evidence", label: "Visual Evidence" },
  { id: "generative", label: "Classifier as Generator" },
  { id: "bibtex", label: "BibTeX" },
];

const abstractParagraphs = [
  "Deep learning works extraordinarily well, but its decision criteria remain opaque and it usually demands far more data than classic support vector machines. Deep Support Vectors asks whether a modern classifier can recover something as interpretable and boundary-critical as SVM support vectors.",
  "The paper introduces DeepKKT, a deep-learning adaptation of the Karush-Kuhn-Tucker condition, to identify or synthesize Deep Support Vectors (DSVs). Those DSVs behave like boundary-defining samples: they are high-uncertainty, can reconstruct model behavior, and reveal what a classifier is actually using to separate classes.",
  "That same machinery leads to practical few-shot dataset distillation and surprisingly strong classifier-driven generation. The result is a project that connects interpretability, compression, and generative behavior through one optimization lens.",
];

const deepkktParagraphs = [
  "DeepKKT extends the KKT recipe from maximum-margin classifiers to overparameterized deep networks. Instead of only asking for correct classification, it also tracks dual feasibility, a stationarity-style relation between the trained model and candidate samples, and a manifold prior that keeps synthesized DSVs on plausible data support.",
  "This gives a practical recipe for recovering support-vector-like samples from a trained classifier without replaying full training. In the paper, these conditions are applied to ConvNet and ResNet models across CIFAR10, CIFAR100, SVHN, and ImageNet.",
];

const distillationParagraphs = [
  "The distillation result is especially compelling because DeepKKT does not need full access to the original dataset, training trajectory snapshots, or Hessian-heavy matching objectives. Instead, it uses the pretrained classifier itself as the source of supervision.",
  "On CIFAR10, the paper shows that DSV-based few-shot distillation remains effective even in extremely data-starved settings, including zero-shot cases where no original training image is used to form the distilled set.",
];

const visualEvidenceParagraphs = [
  "The evidence section of the paper makes the support-vector analogy concrete. Candidate DSVs become higher-entropy over optimization, consistent with moving toward the decision boundary, and learned Lagrange multipliers correlate with downstream classwise test accuracy.",
  "The same decision signals are also visual: DSV-informed edits expose the exact traits a classifier leans on. In the paper's examples, adding antler-like structure or reshaping local details is enough to move model predictions between classes.",
];

const generativeParagraphs = [
  "DeepKKT also reframes a classifier as a latent generative model. By treating labels or soft labels as latent variables, the method can synthesize unseen images, interpolate between classes, and perform meaningful semantic edits.",
  "The paper further shows that using the full DeepKKT objective matters: relying on the primal condition alone produces low-fidelity samples, while the stationarity-aware formulation yields sharper, more class-consistent generations.",
];

const ideaCards = [
  {
    icon: Target,
    title: "Recover boundary-critical samples",
    body:
      "DSVs act like support vectors for deep networks: they sit near the decision boundary, surface uncertainty, and summarize what the classifier finds essential.",
  },
  {
    icon: Waypoints,
    title: "Distill with almost no data",
    body:
      "DeepKKT turns a trained classifier into a practical distillation signal, avoiding the usual full-dataset, snapshot-heavy, Hessian-based pipelines.",
  },
  {
    icon: Sparkles,
    title: "Reuse a classifier as a generator",
    body:
      "Once labels become latent variables, the same objective supports synthesis, interpolation, and editing with no separately trained generator.",
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
  {
    href: "https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors",
    label: "GitHub",
    icon: Github,
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

function TextBlock({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="section-copy">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
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
            DeepKKT reveals support-vector-like samples inside deep classifiers,
            makes few-shot distillation practical, and turns classification
            networks into latent generators.
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
                The paper opens by showing that a plain classifier can synthesize
                recognizable category-consistent images from ImageNet, CIFAR10,
                and CIFAR100 without revisiting the original training set. That
                visual result frames the paper's core claim: deep models really
                do contain support-vector-like structure.
              </p>
            </div>
            <Image
              src="/dsv/figure-hero.png"
              alt="Generated DSVs from ImageNet, CIFAR10, and CIFAR100 in Deep Support Vectors."
              width={1330}
              height={540}
              priority
              className="teaser-image teaser-panel"
              sizes="(max-width: 1024px) 100vw, 980px"
            />
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
                    Candidate DSVs must still land on the correct class.
                  </p>
                </div>
                <div className="constraint-card">
                  <span className="constraint-name">Dual</span>
                  <p className="constraint-formula">lambda_i &gt;= 0</p>
                  <p className="constraint-copy">
                    The learned multiplier becomes a natural measure of sample importance.
                  </p>
                </div>
                <div className="constraint-card">
                  <span className="constraint-name">Stationarity</span>
                  <p className="constraint-formula">
                    theta* ~= sum_i lambda_i grad_theta L(Phi(x_i; theta*), y_i)
                  </p>
                  <p className="constraint-copy">
                    Support-vector structure is tied back to the trained model parameters.
                  </p>
                </div>
                <div className="constraint-card">
                  <span className="constraint-name">Manifold</span>
                  <p className="constraint-formula">x_i in M</p>
                  <p className="constraint-copy">
                    Synthesized DSVs are nudged toward plausible high-dimensional data support.
                  </p>
                </div>
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
              <Image
                src="/dsv/table-distillation.png"
                alt="Few-shot dataset distillation results from Deep Support Vectors."
                width={1210}
                height={930}
                className="content-image large-results-image"
                sizes="(max-width: 1024px) 100vw, 940px"
              />
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
                <div className="analysis-card">
                  <Image
                    src="/dsv/figure-entropy.png"
                    alt="Entropy trajectory of DSV candidates from the Deep Support Vectors paper."
                    width={740}
                    height={400}
                    className="analysis-card-image"
                    sizes="(max-width: 1024px) 100vw, 520px"
                  />
                  <p className="analysis-caption">
                    DSV candidates become higher-entropy as optimization proceeds,
                    matching the intuition that they approach a decision boundary.
                  </p>
                </div>
                <div className="analysis-card">
                  <Image
                    src="/dsv/figure-edits.png"
                    alt="DSV-informed image editing examples from the Deep Support Vectors paper."
                    width={630}
                    height={900}
                    className="analysis-card-image tall-analysis-card-image"
                    sizes="(max-width: 1024px) 100vw, 420px"
                  />
                  <p className="analysis-caption">
                    Decision criteria become manipulable: changing the visual cue
                    suggested by DSVs changes the classifier's prediction.
                  </p>
                </div>
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
                <div className="generative-primary">
                  <Image
                    src="/dsv/figure-latent.png"
                    alt="Soft-label DSV generation and interpolation results from Deep Support Vectors."
                    width={1200}
                    height={990}
                    className="content-image"
                    sizes="(max-width: 1024px) 100vw, 760px"
                  />
                </div>
                <div className="generative-side">
                  <Image
                    src="/dsv/figure-deepkkt.png"
                    alt="Comparison between primal-only and stationarity-aware generation in Deep Support Vectors."
                    width={650}
                    height={550}
                    className="analysis-card-image"
                    sizes="(max-width: 1024px) 100vw, 360px"
                  />
                  <p className="analysis-caption">
                    Primal-only optimization produces blurry samples, while the
                    full DeepKKT objective yields sharper, more semantically
                    aligned generations.
                  </p>
                </div>
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
            project page and uses figures extracted from the official NeurIPS
            2024 paper and supplementary release for Deep Support Vectors.
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

        .teaser-image,
        .content-image {
          width: 100%;
          max-width: 82%;
          height: auto;
          display: block;
          margin: 0 auto;
          border-radius: 10px;
        }

        .teaser-panel {
          padding: 0.5rem;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }

        .large-results-image {
          max-width: 84%;
        }

        .idea-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 0.8rem;
        }

        .idea-card,
        .constraint-card,
        .analysis-card,
        .generative-side {
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
            ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco,
            Consolas, Liberation Mono, Courier New, monospace;
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

        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
          align-items: stretch;
        }

        .analysis-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 0.75rem;
        }

        .analysis-card-image {
          width: 100%;
          max-width: 100%;
          height: auto;
          object-fit: contain;
          border-radius: 10px;
        }

        .tall-analysis-card-image {
          max-width: 88%;
        }

        .analysis-caption {
          margin: 0.85rem 0 0;
          max-width: 92%;
          font-size: 0.94rem;
          line-height: 1.66;
          text-align: left;
          color: #475569;
        }

        .generative-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
          gap: 1rem;
          margin-top: 1rem;
          align-items: start;
        }

        .generative-primary {
          border-radius: 16px;
          background: #ffffff;
          padding: 0.55rem;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
        }

        .generative-side {
          padding: 0.8rem;
        }

        .bibtex-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .bibtex-code {
          margin: 1.3rem 0 0;
          overflow-x: auto;
          border-radius: 1rem;
          background: #0f172a;
          padding: 1.35rem 1.4rem;
          text-align: left;
          color: #e2e8f0;
          font-size: 0.92rem;
          line-height: 1.8;
        }

        .bibtex-code code {
          font-family:
            ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco,
            Consolas, Liberation Mono, Courier New, monospace;
          white-space: pre;
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

        @media (max-width: 900px) {
          .idea-grid,
          .constraint-grid,
          .analysis-grid,
          .generative-grid {
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

          .section-copy,
          .teaser-image,
          .content-image,
          .large-results-image {
            max-width: 100%;
          }

          .nav-shell {
            padding: 0.8rem 1rem;
          }

          .bibtex-header {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
