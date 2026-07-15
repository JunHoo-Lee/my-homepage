import { describe, expect, it } from "vitest";
import {
  PROJECTS,
  PUBLIC_SITE_CONTENT,
  SITE_URL,
  absoluteUrl,
} from "@/app/lib/public-content";

describe("public content registry", () => {
  it("keeps the approved featured-project set and unique routes", () => {
    expect(PROJECTS.filter((project) => project.featured).map((project) => project.slug)).toEqual([
      "template-infilling",
      "csf",
      "dsv",
    ]);
    expect(new Set(PROJECTS.map((project) => project.projectLink)).size).toBe(PROJECTS.length);
  });

  it("uses the canonical production origin", () => {
    expect(SITE_URL).toBe("https://junhoo.me");
    expect(absoluteUrl("/dsv")).toBe("https://junhoo.me/dsv");
  });

  it("does not expose removed private profile fields", () => {
    const serializedProfile = JSON.stringify(PUBLIC_SITE_CONTENT.profile);
    expect(serializedProfile).not.toContain("phone");
    expect(serializedProfile).not.toContain("address");
  });
});
