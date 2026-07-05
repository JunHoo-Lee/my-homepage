import fs from "node:fs/promises";
import path from "node:path";

import type { Metadata } from "next";

import PaperAssistantCopyPanel from "./PaperAssistantCopyPanel";

export const metadata: Metadata = {
  title: "Template Infilling Paper Assistant | Junhoo Lee",
  description:
    "Copyable Markdown assistant prompt for Unlocking the Potential of Diffusion Language Models through Template Infilling.",
};

export default async function PaperAssistantPage() {
  const assistantMarkdown = await fs.readFile(
    path.join(
      process.cwd(),
      "public/template-infilling/paper-assistant.md",
    ),
    "utf8",
  );

  return (
    <main className="section paper-assistant-page">
      <div className="container is-max-desktop">
        <div className="section-box content">
          <h1 className="title is-2">Template Infilling Paper Assistant</h1>
          <p>
            Copy the Markdown source into any AI chat to ask questions about
            the Template Infilling paper.
          </p>
          <div className="publication-links paper-assistant-links">
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
            <span className="link-block">
              <a
                href="https://github.com/JunHoo-Lee/Template-Infilling"
                className="external-link button is-normal is-rounded is-dark"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Code</span>
              </a>
            </span>
          </div>
          <PaperAssistantCopyPanel markdown={assistantMarkdown} />
        </div>
      </div>
    </main>
  );
}
