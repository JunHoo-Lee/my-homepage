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
- `/play/dsf`: **What I Cannot Create**, the Discriminative Score Function paper as a blackboard game (see "Paper games" below)
- `/play/backdoor`: **Nothing to Declare**, the clean-data backdoor paper (DaR) as a customs game
- `/play/explore`: Paperlands, a three.js voxel island (procedural terrain, textures and sound, no asset files) where each homepage section is a landmark and each first-author paper a shrine; mine/place blocks, day-night cycle, map with fast travel, touch controls (`?debug` exposes state on `window.__explore`; `/play/drive` redirects here)

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

## Paper games

Two NeurIPS 2026 papers have a playable version. Both are built to be opened
from a QR code at a poster: they fit a phone held upright, take three to six
minutes, need no install, and end on the paper's implications with links back
to the project page. The project pages (`/dsf`, `/backdoor`) link to them and
show the QR code; print-ready codes are in `public/dsf/assets/play-qr.{svg,png}`
and `public/backdoor/assets/play-qr.{svg,png}`.

- `app/play/dsf` — *What I Cannot Create*. An open-world mystery driven by one
  question, carved on a sealed door: "What I cannot create, I do not
  understand" (Feynman); a classifier cannot create; does it understand
  nothing? The player walks a night island in a sea of static (the island is
  the image manifold) and solves the puzzle in each of eight ruins, in any
  order. Every solved puzzle is one insight of the paper, changes what the log
  says about the question, and lights a beacon; five insights let the player
  attempt the door, whose answer is the contrapositive. `content.ts` holds the
  world, every word and the puzzle data; `world.ts` is the canvas island
  (walking, light, what is nearby); `figures/` holds the puzzles: `DustBoard`
  (static becomes a drawing), `ProbeBoard` (find the sliver), `Garden` (breed a picture out of static by
  only choosing which of six boards looks most real), `Puzzles`
  (`TwoLooks`, a deduction about agreeing with yourself, and `DoorPuzzle`, the
  contrapositive), `Ruler` (pixel ruler vs function ruler) and `Footprints`
  (align the loss gradient with −θ). Each insight shows its mathematics typeset
  with KaTeX: sampling from p(x) and the score, the NTK and Loss Tangent Kernel,
  and the DSF update. `?debug` exposes `window.__dsf`
  (`goto(id)`, `state()`).
- `app/play/backdoor` — *Nothing to Declare*. Shift 1: artificial triggers get
  caught at customs and the student stays clean. Shift 2: every image is clean
  and the student is backdoored anyway. Shift 3: the player runs
  Discover-and-Relabel (pick a subspace and prototype, relabel, watch someone
  else distill, activate). `samples.ts` draws the 16×16 photos and defines the
  rules, `lore.ts` holds the words, the paper's numbers and the scoring.
  `?debug` adds `data-trigger` / `data-positive` to the card on the desk.
- `app/play/shared` — a tiny WebAudio synth, a share-link helper, and
  `playback.ts`, which every game calls before its first sound so that a
  phone's ringer switch does not silence it.

To add a game for another paper: create `app/play/<slug>`, add a tile to
`app/play/page.tsx`, set `gameLink` on the publication in `app/lib/data.ts`,
and add the route to `app/sitemap.ts`.

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
