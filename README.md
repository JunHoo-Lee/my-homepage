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
- `/play/dsf`: **What I Cannot Create**, the Discriminative Score Function paper as a top-down 16-bit pixel adventure (see "Paper games" below)
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
from a QR code at a poster: they fit a phone held upright, take three to nine
minutes, need no install, and end on the paper's implications with links back
to the project page. The project pages (`/dsf`, `/backdoor`) link to them and
show the QR code; print-ready codes are in `public/dsf/assets/play-qr.{svg,png}`
and `public/backdoor/assets/play-qr.{svg,png}`.

- `app/play/dsf` — *What I Cannot Create*. A top-down 16-bit narrative
  adventure (about nine minutes) driven by one question, carved on a sealed
  door: "What I cannot create, I do not understand" (Feynman); a classifier
  cannot create; does it understand nothing? You are a classifier that wakes on
  a night island in a sea of static (the island is the image manifold). With
  Mote, a grain of static that becomes your light, you walk a ring of land
  around the door, solve the puzzle in each of eight ruins in any order and
  rule out four suspects (the helpers earlier methods needed). Every solved
  ruin is one insight of the paper: it lights its own lamp, one lamp on the
  causeway and one socket on the door, and changes the question in the HUD.
  Five insights let you attempt the door, whose answer is the contrapositive;
  then dawn, the whole island, and what the paper says follows.
  - Words and data: `content.ts` (puzzle data, the nine notes and their
    mathematics, the Finale) and `script.ts` (every conversation as a list of
    steps: say, cue, choice, hold, act, wait; a development-only check keeps
    each page to 90 characters so it fits the three-line message window).
  - Shell (DOM over the canvas): `DsfClient.tsx` wires the pieces;
    `ui/shell.ts` is the state machine outside React (title / play / ending /
    finale, which window is open, the running sequence, `solved` versus what
    the world already shows); `ui/` holds the message window (`Dialogue`), HUD,
    action chip and notices (`Hud`), `Title`, the puzzle `Panel`, the
    `Notebook` (notes with KaTeX fitted to the column) and `Ending`;
    `ui/kit.module.css` holds the tokens and the two window materials,
    `dsf.module.css` the puzzle styles.
  - Puzzles: `figures/` — `DustBoard` (static becomes a chalk drawing, from
    `drawings.ts`), `ProbeBoard` (eight blind taps for a sliver), `Puzzles`
    (`TwoLooks`, agreeing with yourself, and `DoorPuzzle`, the contrapositive),
    `Garden` (breed a picture by only choosing which of six boards looks most
    real), `Ruler` (pixel ruler versus function ruler) and `Footprints` (align
    the loss gradient with −θ).
  - World: `world.ts` exports `createWorld(canvas, synth, events)`, a tile
    engine at one integer scale (about 10 tiles across a phone, 20 across a
    desktop): grid walking with keys, tap-to-walk path finding, tap an object
    to walk up and use it, hold to steer; a night grade with banded lantern
    light; the procedural sea; and the cutscene cues the script calls (`lamp`,
    `mote`, `tide`, `pan`, `petrify`, `doorOpen`, `dawn`, `overview` ...).
    `map.ts` is the 42 x 50 island (ground rows, ruins, suspects, lamps,
    decor), `engine/` the parts (`render`, `grade`, `light`, `sea`, `actors`,
    `path`, `input`, `camera`, `fx`, `cues`, `assets`, and the generated
    `atlas.ts`), `music.ts` the layered theme and world sounds (WebAudio, no
    audio files; a layer joins with each insight).
  - Art and licence: the only world image is `public/play/dsf/world/atlas.png`
    (31 KB); the interface uses `public/play/dsf/ui/` (portraits, icons, three
    window frames) and `public/fonts/jersey-10/`. Tiles, characters and effects
    are cropped from the Ninja Adventure Asset Pack by Pixel-boy and AAA (CC0,
    licence in `public/play/dsf/LICENSE-NinjaAdventure-CC0.txt`); Mote, the
    door, the clock face, the sprouts and other small sprites are drawn as
    pixel grids inside the packer. Jersey 10, DM Sans and Caveat are under the
    SIL Open Font License. The credits line is `CREDITS` in `content.ts`, shown
    in the Notebook and the Finale and saved as `public/play/dsf/CREDITS.txt`.
  - Repacking (Python 3 with Pillow, run by hand from the repository root, the
    output is committed): `python3 -I scripts/dsf/pack_world.py` crops the
    regions it names from `scripts/dsf/src/world/`, recolours the robot's
    visor, draws the hand-made sprites and writes `atlas.png` and
    `engine/atlas.ts` (it fails on an off-palette pixel);
    `python3 -I scripts/dsf/pack_ui.py` writes `faces.png`, `icons.png` and
    the window frames from `scripts/dsf/src/ui/`. Both are deterministic: a
    re-run without changes leaves the files byte-identical.
  - Debug: `?debug` sets `window.__dsf` with `goto(id)` (the nine ruin ids
    `shore needle looks garden ruler footprints clock bench door` and the
    suspects `prompter bookkeeper copyist artist`), `state()` (tile, camera,
    scale, `paused`, `lamps`, `tide`, `mote`, `dawn`, `solved` ...), `skip()`
    (fast-forwards the running talk or cutscene to its next button),
    `solve(id)` (marks a ruin solved without playing it), and `pages()` /
    `show(i)` for layout tests of every script page; `window.__dsfWorld` is the
    engine alone.
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
