"use client";

import { useState } from "react";

const bibtex = `@misc{lee2026unlockingpotentialdiffusionlanguage,
      title={Unlocking the Potential of Diffusion Language Models through Template Infilling},
      author={Junhoo Lee and Seungyeon Kim and Nojun Kwak},
      year={2026},
      eprint={2510.13870},
      archivePrefix={arXiv},
      primaryClass={cs.CL},
      url={https://arxiv.org/abs/2510.13870},
}`;

export default function TemplateInfillingProjectPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      <nav className="navbar" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
          <a
            role="button"
            className={`navbar-burger ${menuOpen ? "is-active" : ""}`}
            aria-label="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>
        <div className={`navbar-menu ${menuOpen ? "is-active" : ""}`}>
          <div
            className="navbar-start"
            style={{ flexGrow: 1, justifyContent: "center" }}
          >
            <div className="navbar-item has-dropdown is-hoverable">
              <a className="navbar-link">Sections</a>
              <div className="navbar-dropdown">
                <a className="navbar-item" href="#abstract">
                  Abstract
                </a>
                <a className="navbar-item" href="#method">
                  Method Overview
                </a>
                <a className="navbar-item" href="#main-results">
                  Main Results
                </a>
                <a className="navbar-item" href="#safety-guardrails">
                  Safety Guardrails
                </a>
                <a className="navbar-item" href="#analysis">
                  Analysis
                </a>
                <a className="navbar-item" href="#bibtex">
                  BibTeX
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-body">
          <div className="container is-max-desktop">
            <div className="columns is-centered">
              <div className="column has-text-centered">
                <h1 className="title is-1 publication-title">
                  Unlocking the Potential of Diffusion Language Models through
                  Template Infilling
                </h1>
                <div className="is-size-5 publication-authors">
                  <span className="author-block">Junhoo Lee<sup>1</sup>,</span>
                  <span className="author-block">
                    Seungyeon Kim<sup>1</sup>,
                  </span>
                  <span className="author-block">Nojun Kwak<sup>1</sup></span>
                </div>

                <div className="is-size-5 publication-authors">
                  <span className="author-block publication-venue">ACL 2026</span>
                </div>

                <div className="is-size-5 publication-authors">
                  <span className="author-block">
                    <sup>1</sup>Seoul National University
                  </span>
                </div>

                <div className="column has-text-centered">
                  <div className="publication-links">
                    <span className="link-block">
                      <a
                        href="/template-infilling"
                        className="external-link button is-normal is-rounded is-light"
                      >
                        <span>Project</span>
                      </a>
                    </span>
                    <span className="link-block">
                      <a
                        href="https://arxiv.org/abs/2510.13870"
                        className="external-link button is-normal is-rounded is-dark"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>Paper</span>
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hero teaser">
        <div className="container is-max-desktop">
          <div className="hero-body">
            <div className="section-box figure-section-box">
              <div className="content has-text-justified">
                <p>
                  The qualitative comparison highlights how generation
                  trajectories diverge on complex reasoning tasks. Under pure
                  parallel generation, naive generation and AR-style prompting
                  suffer from repetitive corruption and logical drift, whereas
                  Template Infilling uses structural anchors to keep the
                  response aligned with a coherent reasoning path.
                </p>
              </div>
              <img
                src="/template-infilling/figure-qual.png"
                className="teaser-image teaser-panel"
                alt="Template Infilling qualitative comparison figure."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="abstract">
        <div className="container is-max-desktop">
          <div className="section-box">
            <div className="columns is-centered has-text-centered">
              <div className="column is-four-fifths">
                <h2 className="title is-3">Abstract</h2>
                <div className="content has-text-justified">
                  <p>
                    Diffusion Language Models (DLMs) have emerged as a promising
                    alternative to autoregressive language models, yet their
                    inference strategies remain limited to prefix-based
                    prompting inherited from the autoregressive paradigm. In
                    this paper, we propose <b>Template Infilling (TI)</b>, a
                    conditioning methodology tailored to DLMs.
                  </p>
                  <p>
                    Instead of treating the prompt as a single prefix, TI
                    distributes structural anchors across the entire target
                    response so the model can establish a global blueprint
                    before filling the masked spans. We further introduce{" "}
                    <b>Dynamic Segment Allocation (DSA)</b>, which expands
                    low-confidence regions to provide extra reasoning space
                    while preserving the structural template.
                  </p>
                  <p>
                    Across mathematics, code generation, and trip planning
                    benchmarks, TI delivers consistent gains over baseline
                    prompting, remains robust under accelerated sampling, and
                    improves reflective safety behavior by enforcing a
                    structured draft-critique-refine process directly inside
                    the generation trajectory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="method">
        <div className="container is-max-desktop">
          <div className="section-box">
            <div className="columns is-centered has-text-centered">
              <div className="column is-four-fifths">
                <h2 className="title is-3">Method Overview</h2>
                <div className="content has-text-justified">
                  <p>
                    TI reformulates generation as a structured sequence{" "}
                    <code>[c, A1, M1, A2, M2, ..., An, Mn]</code>, where anchors
                    act as persistent boundary conditions throughout the
                    response. This gives masked spans access to both previous
                    context and future structural checkpoints.
                  </p>
                  <p>
                    DSA complements this structure by monitoring uncertainty
                    during refinement and allocating more space to spans that
                    still need room to complete their reasoning. Together, TI
                    and DSA preserve the original DLM flexibility while making
                    global planning more stable.
                  </p>
                  <p>
                    The method overview illustrates how Template Infilling
                    distributes anchors throughout the sequence instead of
                    relying on a single prefix, while Dynamic Segment
                    Allocation expands low-confidence spans so the model can
                    preserve both structure and flexibility.
                  </p>
                </div>
                <div className="publication-video">
                  <img
                    src="/template-infilling/figure-main.png"
                    alt="Overview of Template Infilling and Dynamic Segment Allocation."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="main-results">
        <div className="container is-max-desktop">
          <div className="section-box">
            <div className="columns is-centered has-text-centered">
              <div className="column is-four-fifths">
                <h2 className="title is-3">Main Results</h2>
                <div className="content has-text-justified">
                  <p>
                    TI improves reasoning, coding, and planning performance
                    across both native diffusion models and adapted diffusion
                    models. The paper reports an average gain of 9.40
                    percentage points over the baseline, with especially large
                    improvements on instruction-following and Dream-7B base
                    settings.
                  </p>
                  <p>
                    The main results compare vanilla decoding, prefix
                    prompting, and Template Infilling across GSM8K, MATH500,
                    HumanEval, and Trip Planning. The table shows that
                    structural conditioning is consistently more effective than
                    standard prefix prompting for both LLaDA-8B and Dream-7B
                    families.
                  </p>
                </div>
                <img
                  src="/template-infilling/main-results-table.png"
                  className="content-image large-results-image"
                  alt="Benchmark results table for Template Infilling."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="safety-guardrails">
        <div className="container is-max-desktop">
          <div className="section-box">
            <div className="columns is-centered has-text-centered">
              <div className="column is-four-fifths">
                <h2 className="title is-3">Safety Guardrails</h2>
                <div className="content has-text-justified">
                  <p>
                    Beyond benchmark accuracy, TI uses globally placed anchors
                    to enforce a draft-critique-refine workflow. This makes
                    refusal behavior more stable under malicious or deceptive
                    prompts.
                  </p>
                  <p>
                    The safety comparison shows that reserving space for draft,
                    critique, and final response stages inside the sequence
                    helps TI preserve reflective safety behavior more reliably
                    than prefix-only prompting.
                  </p>
                </div>
                <img
                  src="/template-infilling/figure-exp.png"
                  className="content-image"
                  alt="Safety comparison figure."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="analysis">
        <div className="container is-max-desktop">
          <div className="section-box">
            <div className="columns is-centered has-text-centered">
              <div className="column is-four-fifths">
                <h2 className="title is-3">Analysis</h2>
                <div className="content has-text-justified">
                  <p>
                    TI remains more stable as generation length increases and
                    also preserves performance when the number of sampling
                    steps is reduced. The same structural prior also reshapes
                    the model&apos;s generation order into a more global planning
                    pattern, where anchors are established first and
                    intervening spans are filled in afterward.
                  </p>
                  <p>
                    The robustness plots show how performance changes across
                    longer generation lengths and fewer sampling steps, and in
                    both settings TI maintains a consistent advantage over
                    vanilla decoding under parallel generation.
                  </p>
                  <p>
                    The generation-order plot further shows that TI prioritizes
                    structural anchors early and then fills the remaining gaps,
                    producing a more coherent planning trajectory than vanilla
                    diffusion decoding.
                  </p>
                </div>
                <div className="columns is-variable is-5 analysis-grid">
                  <div className="column">
                    <img
                      src="/template-infilling/analysis-ablation.png"
                      className="content-image analysis-card-image"
                      alt="Robustness to generation length and sampling acceleration."
                    />
                  </div>
                  <div className="column">
                    <img
                      src="/template-infilling/analysis-genorder.png"
                      className="content-image analysis-card-image"
                      alt="Analysis of generation mechanism and relative generation order."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="bibtex">
        <div className="container is-max-desktop">
          <div className="section-box content">
            <h2 className="title">BibTeX</h2>
            <pre>
              <code>{bibtex}</code>
            </pre>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="columns is-centered">
            <div className="column is-8">
              <div className="content">
                <p>
                  This project page follows the original{" "}
                  <a
                    href="https://nerfies.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Nerfies
                  </a>{" "}
                  website template structure. If you use or adapt this site
                  code, please link back to our project page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
