"use client";

import { useState } from "react";

const bibtex = `@inproceedings{lee2023shot,
      title={SHOT: Suppressing the Hessian along the Optimization Trajectory for Gradient-Based Meta-Learning},
      author={JunHoo Lee and Jayeon Yoo and Nojun Kwak},
      booktitle={Thirty-seventh Conference on Neural Information Processing Systems},
      year={2023},
      url={https://arxiv.org/abs/2310.02751},
}`;

export default function SHOTProjectPage() {
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
                  Transfer & Variants
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
                  SHOT: Suppressing the Hessian along the Optimization Trajectory
                  for Gradient-Based Meta-Learning
                </h1>
                <div className="is-size-5 publication-authors">
                  <span className="author-block">JunHoo Lee<sup>1</sup>,</span>
                  <span className="author-block">Jayeon Yoo<sup>1</sup>,</span>
                  <span className="author-block">Nojun Kwak<sup>1</sup></span>
                </div>

                <div className="is-size-5 publication-authors">
                  <span className="author-block publication-venue">
                    NeurIPS 2023
                  </span>
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
                        href="https://arxiv.org/abs/2310.02751"
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
                  The teaser summarizes the core setup of SHOT. In gradient-based
                  meta-learning, every inner loop begins with an unseen sampled
                  task and must adapt in only a few large-step updates. SHOT
                  explicitly targets this difficult regime by suppressing
                  trajectory distortion caused by the Hessian rather than leaving
                  that suppression implicit.
                </p>
              </div>
              <img
                src="/shot/innerloop.png"
                className="teaser-image teaser-panel"
                alt="SHOT inner-loop task sampling figure."
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
                    Gradient-based meta-learning (GBML) adapts to a new task
                    with only a few inner-loop updates, yet those updates use
                    very large learning rates and therefore should be highly
                    sensitive to high-order terms such as the Hessian.
                  </p>
                  <p>
                    SHOT starts from the hypothesis that successful GBML already
                    suppresses the Hessian implicitly along the optimization
                    trajectory. It then makes that prior explicit by minimizing
                    the distance between a fast target model and a smoother
                    reference model that starts from the same initialization and
                    support set but uses more, smaller inner-loop steps.
                  </p>
                  <p>
                    The resulting objective is algorithm-agnostic,
                    architecture-agnostic, and lightweight in practice. Across
                    standard few-shot benchmarks, cross-domain evaluation, and
                    Hessian-free or one-step GBML variants, SHOT consistently
                    improves adaptation quality while keeping the same test-time
                    inference cost as the baseline.
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
                    SHOT frames the GBML inner loop as a fast model: it has to
                    reach a task-specific solution in one to a few gradient
                    steps, so curvature terms can dominate the optimization
                    dynamics much more strongly than in ordinary deep learning.
                  </p>
                  <p>
                    The method therefore introduces a reference trajectory that
                    is less distorted by the Hessian. The target model takes the
                    usual aggressive few-step path, while the reference model
                    follows the same task with more granular updates. The outer
                    loop minimizes the distance between their endpoints, turning
                    trajectory distortion into a directly optimizable signal.
                  </p>
                  <p>
                    In the efficient SHOT setting used in the paper, this can be
                    added with one extra forward pass and no extra backward pass
                    in the common case. The method is only used during training,
                    so the baseline and SHOT share the same inference-time cost.
                  </p>
                </div>
                <div className="publication-video">
                  <img
                    src="/shot/close-shot-trim.png"
                    alt="SHOT concept figure."
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
                    SHOT improves MAML on all four 4-Conv benchmarks reported in
                    the paper: miniImageNet, tieredImageNet, Cars, and CUB. The
                    strongest 5-shot gain is on tieredImageNet, where SHOT
                    raises accuracy from 66.12 to 69.08, and Cars also improves
                    from 62.24 to 64.84.
                  </p>
                  <p>
                    The benchmark summary below is derived directly from the
                    SHOT paper tables and keeps the same single-image presentation
                    style as the template page.
                  </p>
                </div>
                <img
                  src="/shot/main-results-table.png"
                  className="content-image large-results-image"
                  alt="Main results summary table for SHOT."
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
                <h2 className="title is-3">Transfer & Variants</h2>
                <div className="content has-text-justified">
                  <p>
                    SHOT is not tied to a single benchmark or a single GBML
                    formulation. In 5-shot cross-domain evaluation, SHOT
                    improves tieredImageNet to miniImageNet from 66.86 to 70.70
                    and Cars to miniImageNet from 37.23 to 40.79.
                  </p>
                  <p>
                    The same idea also carries over to Hessian-free and one-step
                    variants such as FoMAML and BOIL, supporting the paper&apos;s
                    claim that Hessian suppression is a broadly useful prior
                    rather than a MAML-specific trick.
                  </p>
                </div>
                <img
                  src="/shot/transfer-variants-table.png"
                  className="content-image"
                  alt="Transfer and variant summary table for SHOT."
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
                    SHOT changes the geometry of inner-loop optimization in a
                    way that is visible throughout training. The validation and
                    cosine-similarity curves show that both SHOT variants reach
                    a high-alignment regime much earlier than the MAML
                    baseline, and that alignment closely tracks adaptation
                    quality.
                  </p>
                  <p>
                    The training-epoch comparison further supports the paper&apos;s
                    core hypothesis: successful gradient-based meta-learning
                    benefits from keeping the inner-loop path close to a more
                    stable direction, rather than letting the optimization
                    trajectory bend sharply under Hessian effects.
                  </p>
                  <p>
                    The loss-surface visualization then makes that claim
                    tangible. Compared with a random initialization, the SHOT
                    pretrained model exhibits a much more linear landscape along
                    the optimization trajectory, showing that Hessian-induced
                    distortion has been explicitly suppressed.
                  </p>
                </div>
                <div className="columns is-variable is-5 analysis-grid">
                  <div className="column">
                    <img
                      src="/shot/performance-result.png"
                      className="content-image analysis-card-image"
                      alt="Validation accuracy and cosine similarity analysis for SHOT."
                    />
                  </div>
                  <div className="column">
                    <img
                      src="/shot/tendency-trim.png"
                      className="content-image analysis-card-image"
                      alt="Loss surface analysis for SHOT."
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
