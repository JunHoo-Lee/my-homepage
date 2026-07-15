# Junhoo Lee Homepage

Public academic homepage for [junhoo.me](https://junhoo.me), built with Next.js.
It contains the research profile, publication and news indexes, and shared project
chrome for the selected paper pages.

## Public routes

- `/`
- `/template-infilling`
- `/template-infilling/paper-assistant`
- `/csf`
- `/dsv`
- `/any-way-meta-learning`
- `/shot`

The site is intentionally public-only. It has no database client, authentication
surface, private workspace, or server API routes. Project metadata, the homepage,
SEO metadata, `robots.txt`, and `sitemap.xml` share the registry in
`app/lib/public-content.ts`.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run test:e2e
```

The browser suite covers the public homepage and every project route at mobile,
tablet, and desktop widths, including theme persistence, accessibility, route
anchors, and checks that retired private paths are not published.
