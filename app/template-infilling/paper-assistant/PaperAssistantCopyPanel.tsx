"use client";

import { Check, Clipboard } from "lucide-react";
import { useRef, useState } from "react";

type PaperAssistantCopyPanelProps = {
  markdown: string;
};

type CopyStatus = "idle" | "copied" | "selected";

export default function PaperAssistantCopyPanel({
  markdown,
}: PaperAssistantCopyPanelProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectMarkdown = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, markdown.length);
  };

  const copyMarkdown = async () => {
    selectMarkdown();

    let copiedToClipboard = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(markdown);
        copiedToClipboard = true;
      } catch {
        copiedToClipboard = false;
      }
    }

    setCopyStatus(copiedToClipboard ? "copied" : "selected");
    window.setTimeout(() => setCopyStatus("idle"), 2200);
  };

  const copied = copyStatus === "copied";

  return (
    <div className="paper-assistant-copy-panel">
      <div className="paper-assistant-toolbar">
        <h2 className="title is-4">Markdown Source</h2>
        <div className="paper-assistant-actions">
          <a
            href="/template-infilling/paper-assistant.md"
            className="external-link button is-normal is-rounded is-light"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Raw .md</span>
          </a>
          <button
            type="button"
            className="button is-normal is-rounded is-dark paper-assistant-copy-button"
            onClick={copyMarkdown}
          >
            {copied ? (
              <Check aria-hidden="true" size={18} />
            ) : (
              <Clipboard aria-hidden="true" size={18} />
            )}
            <span>{copied ? "Copied" : "Copy Markdown"}</span>
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        aria-label="Template Infilling Paper Assistant Markdown"
        className="paper-assistant-textarea"
        readOnly
        rows={30}
        value={markdown}
        wrap="soft"
        onFocus={(event) => event.currentTarget.select()}
      />
      <p className="paper-assistant-status" aria-live="polite">
        {copyStatus === "copied" ? "Markdown copied to clipboard." : ""}
        {copyStatus === "selected" ? "Markdown selected. Press Cmd+C to copy." : ""}
      </p>
    </div>
  );
}
