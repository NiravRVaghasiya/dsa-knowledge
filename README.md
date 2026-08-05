# 📚 Algorithms for AI

> A structured, cross-linked DSA knowledge base — from complexity fundamentals to the data structures and algorithms behind modern AI / ML / LLM systems. **31 in-depth guides** across 4 progressive sections.

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
| 🚀 **Advanced DSA** | 8 | DP, graphs, shortest path, union-find, greedy, tries, segment/Fenwick, backtracking |
| 🤖 **Domain-Specific** | 8 | ANN/vector search, tokenization, attention & sparse, beam search, GraphRAG, LangGraph, KD-trees, streaming/caching |

## Features

- 🔍 **Offline instant search** — no external service, works fully client-side
- 🏷️ **Browse by tag** — auto-generated tag pages from front matter
- 🟢🟡🔴 **Difficulty badges** and prerequisite-aware navigation
- 🌓 **Dark / light mode**, 📋 **code copy buttons**, syntax highlighting
- 📊 **Mermaid diagrams** including a learning-path graph on the homepage

## Run locally

```bash
git clone https://github.com/NiravRVaghasiya/dsa-knowledge.git
cd dsa-knowledge
npm install
npm start          # dev server at http://localhost:3000
```

Build the static site:

```bash
npm run build      # outputs to ./build
npm run serve      # preview the production build
```

## Deploy

Deployment is automated. Every push to `main` triggers the GitHub Actions workflow
(`.github/workflows/deploy.yml`), which builds the site and publishes it to GitHub Pages.

**One-time setup:** in your repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Project structure

```
dsa-knowledge/
├── docs/                      # 31 guides across 4 sections (+ _category_.json per section)
├── src/
│   ├── pages/index.tsx        # custom React homepage (hero, section cards, Mermaid graph)
│   └── css/custom.css         # theme
├── static/img/                # favicon + social card
├── docusaurus.config.ts       # site config (markdown format: 'detect' for technical content)
├── sidebars.ts                # auto-generated sidebar
└── .github/workflows/deploy.yml
```

## License

MIT — see [LICENSE](LICENSE).
