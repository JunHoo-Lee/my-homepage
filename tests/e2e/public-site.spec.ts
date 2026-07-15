import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public homepage is readable, responsive, and theme-aware", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Foundation models become more useful/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Template Infilling", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "CSF", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Deep Support Vectors", exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await expect(page.locator("html")).toHaveAttribute("data-public-theme", "light");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-public-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-public-theme", "dark");

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
});

test("project pages retain their routes inside the shared public chrome", async ({ page }) => {
  const routes = [
    "/template-infilling",
    "/csf",
    "/dsv",
    "/any-way-meta-learning",
    "/shot",
  ];

  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBe(true);
    await expect(page.getByRole("link", { name: "Junhoo Lee" }).first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= viewportWidth + 2) return [];
      return Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .map((element) => {
          const rectangle = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: String(element.className).slice(0, 160),
            left: Math.round(rectangle.left),
            right: Math.round(rectangle.right),
            width: Math.round(rectangle.width),
          };
        })
        .filter((element) => element.right > viewportWidth + 2 || element.left < -2)
        .slice(0, 12);
    });
    expect(overflow, `${route} should not overflow horizontally`).toEqual([]);
  }
});

test("retired private artifacts are absent from the public deployment", async ({ page }) => {
  const retiredPaths = [
    "/private",
    "/login",
    "/api/auth/login",
    "/api/tags",
    "/DRO",
    "/DRO/image.png",
    "/cv.tex",
    "/cv.aux",
    "/cv.log",
  ];

  for (const path of retiredPaths) {
    const response = await page.request.get(path, { maxRedirects: 0 });
    expect(response.status(), `${path} should not be published`).toBe(404);
  }

  await page.goto('/tasks');
  await expect(page).toHaveURL('/');

  await page.goto('/papers');
  await expect(page).toHaveURL('/');

  const robots = await (await page.request.get('/robots.txt')).text();
  const sitemap = await (await page.request.get('/sitemap.xml')).text();

  expect(sitemap).not.toMatch(/private|login|DRO|\/api\//i);
  expect(robots).not.toContain('Sitemap: /');
  expect(robots).toContain('Sitemap: https://junhoo.me/sitemap.xml');
});
