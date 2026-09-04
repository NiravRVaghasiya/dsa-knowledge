# 📚 Algorithms for AI

> A structured, cross-linked DSA knowledge base — from complexity fundamentals to the data structures and algorithms behind modern AI / ML / LLM systems. **43 in-depth guides** across 4 progressive sections.

[![Deploy](https://github.com/NiravRVaghasiya/dsa-knowledge/actions/workflows/deploy.yml/badge.svg)](https://github.com/NiravRVaghasiya/dsa-knowledge/actions/workflows/deploy.yml)
![Docusaurus](https://img.shields.io/badge/built%20with-Docusaurus-3ECC5F?logo=docusaurus)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**🔗 Live site:** https://NiravRVaghasiya.github.io/dsa-knowledge/

![Algorithms for AI](static/img/social-card.png)

## What is this?

Most DSA references stop at the classic interview canon. This one carries every topic through to where it actually shows up in AI/ML/LLM systems — tries into tokenization, heaps into beam search, graphs into GraphRAG, matrices into attention's O(n²) wall.

Each guide is a self-contained reference with intuition, worked problems, complexity tables, Python/Java code, and the AI/ML connection. Every guide carries YAML front matter (`tags`, `difficulty`, `prerequisites`) so the site gives you instant search, tag filtering, and prerequisite-aware navigation.

## Sections

| Section | Guides | Focus |
|---------|:------:|-------|
| 🧱 **Foundation** | 6 | Big-O, arrays/strings, hash maps, linked lists, recursion, Python internals |
| ⚙️ **Core DSA** | 9 | Two pointers, sliding window, binary search, sorting, stacks/queues, heaps, trees, BFS/DFS, hashing |
| 🚀 **Advanced DSA** | 14 | DP, graphs, shortest path (+ Bellman-Ford/Floyd-Warshall/0-1 BFS), MST, connectivity (SCC/bridges), string matching (KMP/Z/Aho-Corasick), tree algorithms (LCA/tree DP), union-find, greedy, tries, segment/Fenwick, backtracking, difference arrays & sweep line |
| 🤖 **Domain-Specific** | 14 | ANN/vector search, HNSW deep dive, tokenization, matrix/attention, multi-head attention (MHA/MQA/GQA/FlashAttention), KV cache & paged attention, sampling & decoding, beam search, GraphRAG, LangGraph, KD-trees, streaming/caching, probabilistic structures, AI systems benchmarks |

## Features

- 🔍 **Local instant search** — the search index is bundled into the site (no external search service); it works client-side once the page has loaded
- 🐍 **In-browser Python** — runnable code samples and a playground powered by Pyodide/WebAssembly. Code executes locally in a Web Worker (with an execution timeout), but the ~6 MB runtime is fetched from a public CDN (jsDelivr) on first use and then browser-cached, so the first run needs an internet connection. This is educational execution, not a security sandbox.
- 🏷️ **Browse by tag** — auto-generated tag pages from front matter
- 🟢🟡🔴 **Difficulty badges** and prerequisite-aware navigation
- 🌓 **Dark / light mode**, 📋 **code copy buttons**, syntax highlighting
- 📊 **Mermaid diagrams** including a learning-path graph on the homepage
- 🎬 **Frame-based visualization framework** — a reusable engine where algorithms emit immutable *frames* and a single `Visualizer` renders them across arrays, graphs, trees, and matrices, with shared playback + keyboard controls. See the [live demos](/viz-demos) (binary search, sorting, BFS, Dijkstra, tree traversal, heaps, matrix multiply).

## Visualization framework

Interactive algorithm animations follow a strict **algorithm → frames → renderer** separation:

```
algorithm builder (pure TS)  →  Frame[] (immutable)  →  Visualizer (React)
```

- **Model** (`src/components/viz/model.ts`) — an immutable, renderer-agnostic `Frame` discriminated union (`array` | `graph` | `tree` | `matrix`) with shared educational fields (`caption`, `operation`, `invariant`, `annotations`) and a semantic highlight-role vocabulary. No React.
- **Builders** (`src/components/viz/algorithms/*`) — pure functions (e.g. `binarySearchFrames`, `dijkstraFrames`) that run an algorithm and record a frame per step. Unit-tested for correctness. No React.
- **Renderers** (`src/components/viz/renderers/*`) — presentational, memoized components (`ArrayRenderer`, `GraphRenderer`/SVG, `TreeRenderer`/SVG, `MatrixRenderer`) that only draw the frame they are handed.
- **`Visualizer`** (`src/components/viz/Visualizer.tsx`) — the shell: play/pause/step/restart/speed, a clickable progress bar, keyboard controls (space/←/→/Home/End), an educational panel, and a color legend. It dispatches to the right renderer by `frame.kind`.
- **`AlgoViz`** — the original array visualizer, now a thin backward-compatible shim over `Visualizer` (via a legacy-frame adapter), so existing `.mdx` widgets keep working unchanged.

## Development

### Prerequisites

- **Node.js 18+** (CI uses Node 22). This installs `npm` alongside it.

### Local setup

```bash
git clone https://github.com/NiravRVaghasiya/dsa-knowledge.git
cd dsa-knowledge
npm ci             # clean, lockfile-exact install (use `npm install` if you're changing deps)
```

### Everyday commands

| Command | What it does |
|---------|--------------|
| `npm start` | Dev server with hot reload at http://localhost:3000 |
| `npm run build` | Production build into `./build` |
| `npm run serve` | Preview the production build locally |
| `npm run typecheck` | TypeScript type checking (`tsc`) |
| `npm run lint` | Type-level lint (`tsc --noEmit`) |
| `npm test` | Run the unit tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run validate-content` | Validate doc frontmatter, metadata, and structure |
| `npm run validate-links` | Validate internal links and in-page anchors |
| `npm run validate-concepts` | Validate the DSA → AI concept graph (refs, relation types, prerequisite cycles, slug→guide resolution) |
| `npm run validate` | Run all three validators (content + links + concepts) |

Before opening a PR, the quickest way to reproduce CI locally is:

```bash
npm run typecheck && npm run lint && npm run validate && npm test && npm run build
```

## Quality gates & CI

Two GitHub Actions workflows enforce quality:

- **`.github/workflows/ci.yml`** runs on every pull request and push to `main`:
  `npm ci` → typecheck → lint → content validation → link validation →
  concept-graph validation → tests → production build. The build output is
  uploaded as an artifact.
- **`.github/workflows/deploy.yml`** runs *only after* CI succeeds on `main`
  (via `workflow_run`). It reuses the artifact CI already built and publishes it
  to GitHub Pages — so a broken build never deploys.

**Validation tooling** lives in [`scripts/`](scripts/) and is content-agnostic
(no hard-coded filenames): it discovers every doc, parses frontmatter, and checks
required fields, difficulty values, tag lists, prerequisite/link resolution,
guide↔practice pairing, AlgoViz frame shapes, code-fence balance, and anchor
targets. A third validator (`validate-concepts`) checks the DSA → AI concept
graph in [`src/data/`](src/data/) — flagging edges to nonexistent concepts,
invalid relationship types, forbidden prerequisite cycles, and concept slugs
that don't resolve to a real guide. Errors fail the build; softer issues are
reported as warnings.

## Deploy

Deployment is automated and gated on CI (see above). A push to `main` runs CI, and
only a green CI triggers the deploy workflow to GitHub Pages.

**One-time setup:** in your repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Project structure

```
dsa-knowledge/
├── docs/                      # 43 guides + practice pages across 4 sections
│   └── NN-section/            #   guide.md + guide-practice.mdx (+ _category_.json)
├── src/
│   ├── pages/                 # React pages: index (home), playground, viz-demos,
│   │                          #   explorer, dsa-ai-map, learning-paths
│   ├── data/                  # DSA → AI concept graph (concepts.ts, graph.ts, types)
│   ├── components/
│   │   ├── PythonRunner/      # in-browser Python (Web Worker + Pyodide) & editor utils
│   │   ├── viz/               # frame-based visualization framework (model + renderers)
│   │   ├── concept/           # concept card, knowledge graph, local-progress hook
│   │   └── AlgoViz/           # legacy array visualizer (shim over viz/)
│   ├── theme/                 # swizzled Docusaurus theme (DocItem meta strip, footer)
│   └── css/custom.css         # theme
├── scripts/                   # content, link & concept-graph validators (+ shared lib/)
├── tests/                     # Vitest unit tests
├── static/img/                # favicon + social card
├── docusaurus.config.ts       # site config (markdown format: 'detect')
├── sidebars.ts                # auto-generated sidebar
└── .github/workflows/         # ci.yml (checks) + deploy.yml (gated deploy)
```

## Contributing

### Add a new guide

1. Create `docs/NN-section/<topic>.md`. Copy the frontmatter shape from an existing
   guide — required fields are `title`, `slug` (e.g. `/my-topic`), `difficulty`
   (`beginner` | `intermediate` | `advanced`), and `tags`. Recommended:
   `description`, `reading_time`, `prerequisites` (each `{title, to}` pointing at a
   real `/docs/...` slug), and `pagination_prev`/`pagination_next` (doc ids).
2. Add a `## Complexity` section (validation warns if one is missing).
3. Run `npm run validate-content`.

> Guides use `.md` (parsed as CommonMark) so notation like `O(n^2)`, `<T>`, and
> `{...}` in technical prose doesn't break MDX parsing. Use `.mdx` only when you
> need to embed React components.

### Add an interactive visualization

Use the `AlgoViz` component in an `.mdx` file. It takes an array of frames; each
frame is `{array: number[], highlights?: {index: color}, pointers?: {label: index}, caption?: string}`
where `color` is one of `active`, `compare`, `done`, `window`:

```mdx
<AlgoViz
  title="Bubble sort"
  frames={[
    {"array": [5, 2, 8], "caption": "start"},
    {"array": [2, 5, 8], "highlights": {"0": "done"}, "caption": "swapped"}
  ]}
/>
```

Frame shapes are validated by `npm run validate-content` (out-of-range indices and
unknown colors are reported).

For richer visualizations (graphs, trees, matrices, or arrays with an
operation/invariant panel), use the generic `Visualizer` with the frame model
directly, or add a builder + entry to the demo registry
(`src/components/viz/demos.ts`) and reference it from the [demos page](/viz-demos).
Both `AlgoViz` and `Visualizer` are registered as MDX components, so you can use
either in any `.mdx` file.

### Add a practice problem

Create `docs/NN-section/<topic>-practice.mdx` next to the guide (the base name must
match — validation enforces the guide↔practice pairing). Embed a runnable exercise
with the `PythonRunner` component:

```mdx
<PythonRunner
  title="🐍 Practice"
  height={320}
  code={`def solve(nums):
    return sorted(nums)

print(solve([3, 1, 2]))
`}
/>
```

`PythonRunner` executes code in a Web Worker (Pyodide/WebAssembly) with an
execution timeout and a Stop button. The ~6 MB runtime is fetched from a CDN on
first use — see the note under [Features](#features).

## License

MIT — see [LICENSE](LICENSE).
