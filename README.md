# Junhoo Lee Homepage

Personal academic homepage built with Next.js. The site hosts the main profile,
publication list, and dedicated project pages for selected papers.

## Project Pages

- `/acro`: ACRO project page, recovery replay, and preprint downloads
- `/csf`: CSF project page
- `/shot`: SHOT project page
- `/template-infilling`: Template Infilling project page
- `/dsv`: Deep Support Vectors project page
- `/mysteryofunlearnedparameters`: blog post on CPU–GPU dual LMs (static page under `public/`)
- `/wplm`: WPLM, a chatbot whose weights were programmed, not trained (static page under `public/wplm`; `/wp-llm` redirects here)
- `/play/survivors`: Gradient Survivors, the default game behind the 🎮 icon on the homepage: a 5-minute survivors-like on a 2D canvas (NaN/Overfit/Hallucination bugs, Reviewer 2 boss at 2:30, upgrade cards built on my papers: DSV, SHOT, Template Infilling, ACRO, CSF, DSF, RHD, RobotUse and ReWorld; `?debug` exposes state on `window.__survivors`)
- `/play`: game picker, linked from each game as "Other games"
- `/play/drive`: Drive mode, a three.js + cannon-es world where you drive a toy car around the homepage's sections (`?debug` exposes the car's physics body on `window.__drive`)

## AI Agent Access

The same read-only tool set (`app/lib/agent-tools.ts`) is exposed three ways:

- **WebMCP** (`app/components/WebMCPTools.tsx`): on every page, browsers with
  `navigator.modelContext` get `get_profile`, `search_publications`,
  `get_publication_bibtex`, `get_news`, `get_awards_and_service`, `list_pages`
  and `open_page`. Browsers without WebMCP skip it and never download the data.
- **Remote MCP server** at `/mcp` (Streamable HTTP, stateless, no auth): the
  same tools minus `open_page`, plus `llms.txt` / `llms-full.txt` as resources.
- **llms.txt**: `/llms.txt` (index) and `/llms-full.txt` (all content as Markdown).

Discovery: `/.well-known/mcp/server-card.json` (alias `/.well-known/mcp.json`),
`/.well-known/api-catalog` (RFC 9727), and `<link>` hints in the root layout.
Add new pages to `SITE_PAGES` in `app/lib/agent-tools.ts` so agents can find them.

## DSV Assets

The `Deep Support Vectors` page is built from the official NeurIPS 2024 source
release rather than hand-cropped screenshots:

- `public/dsv/deep-support-vectors-paper.pdf`
- `public/dsv/deep-support-vectors-supplemental.zip`
- `public/dsv/figure-*-tex-1.png` rendered from the paper's original TeX figure
  files such as `overall_photo.pdf`, `editimages.pdf`, and
  `interpolation_fig_compressed.pdf`
- The few-shot CIFAR10 table rebuilt in React from `tmp/dsv-source/sec/main_table.tex`

The page's code section mirrors the supplementary `submit_code/` layout:

- `submit_code/pl_main.py`
- `submit_code/base_reconstruct_imagenet.yaml`
- `submit_code/models.py`
- `submit_code/svm_modules.py`

Reference links:

- Paper: https://arxiv.org/abs/2403.17329
- NeurIPS proceedings PDF: https://papers.nips.cc/paper_files/paper/2024/file/d60e14c19cd6e0fc38556ad29ac8fbc9-Paper-Conference.pdf
- GitHub repository: https://github.com/JunHoo-Lee/Neurips24_DeepSupportVectors

## Development

Run the local development server:

```bash
npm run dev
```

Open `http://localhost:3000` and navigate to the route you want to inspect.

## Notes

- The publication list can render separate `Project Page`, `Paper`, and `Code`
  buttons when those links are present in `app/lib/data.ts`.
- Project pages are implemented as route-local React components under `app/*/`. ACRO preserves its standalone article layout under `public/acro`, with `/acro` rewritten to its HTML entry point.
