import { describe, expect, it } from "vitest";

import { PROJECTS } from "../../app/lib/public-content";

describe("public project registry", () => {
  it("provides a unique mobile TOC that ends at the existing BibTeX anchor", () => {
    for (const project of PROJECTS) {
      const sectionIds = project.sections.map((section) => section.id);

      expect(sectionIds.length).toBeGreaterThan(0);
      expect(new Set(sectionIds).size).toBe(sectionIds.length);
      expect(sectionIds.at(-1)).toBe("bibtex");
    }
  });

  it("provides shared paper links and code links where published", () => {
    for (const project of PROJECTS) {
      expect(project.paperLink).toBeTruthy();
    }

    expect(PROJECTS.filter((project) => project.codeLink).map((project) => project.slug)).toEqual([
      "template-infilling",
      "csf",
      "dsv",
    ]);
  });
});
