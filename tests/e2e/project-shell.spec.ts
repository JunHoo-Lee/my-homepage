import { expect, test } from "@playwright/test";

const projects = [
  { route: "/template-infilling", title: "Template Infilling", sections: 6, code: true },
  { route: "/csf", title: "CSF", sections: 7, code: true },
  { route: "/dsv", title: "Deep Support Vectors", sections: 8, code: true },
  { route: "/any-way-meta-learning", title: "Any-Way Meta Learning", sections: 5, code: false },
  { route: "/shot", title: "SHOT", sections: 6, code: false },
] as const;

test("shared project chrome exposes the real section anchors and one footer", async ({ page }) => {
  for (const project of projects) {
    await page.goto(project.route);

    const toc = page.getByRole("navigation", { name: `${project.title} sections` });
    await expect(toc).toBeVisible();
    await expect(toc.getByRole("link")).toHaveCount(project.sections);

    const utilities = page.locator('[aria-label="Project links"]');
    await expect(utilities.getByRole("link", { name: /Paper/ })).toBeVisible();
    await expect(utilities.getByRole("link", { name: "Cite" })).toHaveAttribute(
      "href",
      "#bibtex",
    );
    await expect(utilities.getByRole("link", { name: /Code/ })).toHaveCount(
      project.code ? 1 : 0,
    );

    await toc.getByRole("link", { name: "Abstract" }).click();
    await expect(page).toHaveURL(new RegExp(`${project.route}#abstract$`));
    await expect(page.locator("#abstract")).toBeVisible();
    await expect(page.locator("footer:visible")).toHaveCount(1);
  }
});
