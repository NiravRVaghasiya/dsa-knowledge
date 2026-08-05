---
title: Approximate Nearest Neighbor Search
slug: /ann-search
sidebar_position: 2
sidebar_label: Approximate Nearest Neighbor Search
description: >-
  HNSW, IVF, and LSH — the three dominant families of approximate nearest-neighbor / vector search.
tags:
  - ann
  - hnsw
  - ivf
  - lsh
  - vector-search
difficulty: advanced
reading_time: 34
prerequisites:
  - title: KD-Trees & Ball-Trees
    to: /docs/kd-trees-ball-trees
  - title: Hashing Patterns
    to: /docs/hashing-patterns
pagination_prev: 04-domain-specific-dsa/kd-trees-ball-trees
pagination_next: 04-domain-specific-dsa/tokenization
path_step: 25
---

# Approximate Nearest Neighbor Search — Ultimate Guide

> **A definitive reference on HNSW, IVF, and LSH for Data Scientists, ML Engineers, and AI/LLM practitioners.** Scope: the three dominant families of Approximate Nearest Neighbor (ANN) indexes in production today — graph-based (**HNSW**), cluster/quantization-based (**IVF / IVF-PQ**), and hashing-based (**LSH**, random-projection and MinHash variants). Every complexity and recall claim is tied to a source in the [References](#references).

---

## Table of Contents

1. [Background & Motivation](#1-background--motivation)
2. [HNSW (Hierarchical Navigable Small World)](#2-hnsw-hierarchical-navigable-small-world)
3. [IVF (Inverted File Index)](#3-ivf-inverted-file-index)
4. [LSH (Locality-Sensitive Hashing)](#4-lsh-locality-sensitive-hashing)
5. [Algorithm Comparison Table](#5-algorithm-comparison-table)
6. [Real-World Applications](#6-real-world-applications)
7. [Implementation Guide (Code)](#7-implementation-guide-code)
8. [How to Choose: Decision Framework](#8-how-to-choose-decision-framework)
9. [Summary Cheatsheet](#9-summary-cheatsheet)
10. [References](#references)

---

## 1. Background & Motivation

### 1.1 What is Nearest Neighbor Search?

**Nearest Neighbor Search (NNS)** is the problem: given a query vector `q` in a `d`-dimensional space and a dataset `X = {x₁, …, xₙ}`, find the point (or the `k` points) in `X` that minimize a distance function `dist(q, xᵢ)`. Common distances are **Euclidean (L2)**, **cosine similarity**, and **inner product (MIPS — Maximum Inner Product Search)**.

Formally, the **exact k-NN** answer is:

```
kNN(q) = argmin_{S ⊆ X, |S|=k}  Σ_{x ∈ S} dist(q, x)

```

This is the workhorse behind semantic search, recommendation, deduplication, RAG retrieval, and similarity-based classification.

### 1.2 Why Exact Search Fails at Scale

The naïve solution — **brute-force / flat scan** — compares `q` against every one of the `n` vectors:

- **Query time:** `O(n · d)` per query. At `n = 100M` vectors and `d = 768` (a typical LLM embedding), that's ~7.7 × 10¹⁰ floating-point multiply-adds *per query*. Even at 100 GFLOP/s effective throughput, that's on the order of a second per query — orders of magnitude too slow for interactive latency budgets (typically 1–50 ms).
- **Memory bandwidth bound:** the bottleneck is usually not FLOPs but streaming `n · d · 4` bytes (307 GB for the example above) through the CPU/GPU for *every* query.
- **Tree structures don't save you:** classical exact spatial indexes (**k-d trees**, **ball trees**, **R-trees**) give `O(log n)` query time in *low* dimensions, but their performance degrades to a full `O(n)` scan as dimensionality rises — see §1.3. This collapse is why they are effectively unused above ~20 dimensions.

> ⚠️ Brute force is still the **right** choice for small corpora (≲ 10⁴–10⁵ vectors) or when 100% recall is non-negotiable. FAISS `IndexFlatL2` is the standard baseline and the ground-truth generator for measuring the recall of any approximate index.

### 1.3 The Curse of Dimensionality

As dimensionality `d` grows, geometric intuition breaks down in ways that sabotage exact indexing:

1. **Distance concentration.** The ratio between the farthest and nearest points shrinks toward 1. Beyer et al. (1999) showed that under broad conditions, `(dist_max − dist_min) / dist_min → 0` as `d → ∞`. When every point is "roughly equidistant," pruning-based indexes cannot exclude candidates, so tree search degrades to a linear scan.
2. **Volume flees to the shell.** In a high-dimensional ball, almost all volume sits in a thin shell near the surface, and almost all the mass of a Gaussian sits at radius `≈ √d`. Space is overwhelmingly "empty," so partitioning cells rarely isolate neighbors.
3. **Exponential partitioning cost.** To keep cells dense, the number of partitions must grow exponentially in `d`. A grid with just 2 divisions per axis needs `2^d` cells.

The practical consequence: **for **`d ≳ 20`**, exact spatial indexes are no better than brute force.** Since modern embeddings live in `d = 128 … 4096`, we must relax the exactness requirement — this is the entire justification for ANN.

### 1.4 The Precision–Recall Tradeoff

**Approximate** Nearest Neighbor search trades a small, controllable amount of accuracy for massive speed and memory gains. The key quality metric is **Recall@k**:

```
Recall@k = |ANN_result(k) ∩ TrueNN(k)| / k

```

i.e. of the `k` neighbors the index returns, what fraction are in the true top-`k`. (When people say "95% recall" for a vector index, this is almost always **Recall@k against a brute-force ground truth**, not classification recall.)

The universal ANN dial is the **speed ↔ recall tradeoff**, governed per-algorithm by a search-effort parameter (`efSearch` in HNSW, `nprobe` in IVF, number of hash tables `L` in LSH):

- Turn the dial **up** → more candidates examined → higher recall, higher latency.
- Turn the dial **down** → fewer candidates → lower recall, lower latency.

Practitioners report performance as a **recall-vs-QPS (queries-per-second) Pareto curve**, not a single number. The standard public benchmark for these curves is [ann-benchmarks.com](http://ann-benchmarks.com) (Aumüller, Bernhardsson & Faithfull, 2020).

### 1.5 Exact vs. Approximate — Comparison

| Dimension | Exact (Flat / k-d tree) | Approximate (HNSW / IVF / LSH) |
| --- | --- | --- |
| **Recall@k** | 100% (guaranteed) | Tunable, typically 80–99% |
| **Query time** | `O(n·d)` flat; `→ O(n)` for trees in high `d` | Sublinear: `O(log n)`-ish (HNSW), `O(nprobe · n/nlist)` (IVF), `O(L)` bucket probes (LSH) |
| **Build time** | `O(1)` (flat) / `O(n log n)` (trees) | Higher: graph or clustering construction |
| **Memory** | `O(n·d)` raw vectors | From `O(n·d)` (HNSW graph adds overhead) down to a small fraction with PQ compression |
| **Scales to 100M+?** | No (latency) | Yes — the entire design goal |
| **Best for** | Small `n`, exactness-critical, ground truth | Large `n`, latency-bound, recall-tolerant |
| **Failure mode** | Too slow / too much RAM | Missed true neighbors (recall < 100%) |

> **✅ Key Takeaways — §1**
> - NNS underpins semantic search, RAG, recommendation, and dedup.
> - Brute force is `O(n·d)` per query and only viable for small corpora; it is also your recall ground-truth generator.
> - The curse of dimensionality (distance concentration, empty space) kills exact tree indexes above ~20 dims — and embeddings live far above that.
> - ANN trades a tunable slice of **Recall@k** for large speed/memory wins; always evaluate on a **recall-vs-QPS curve**, not one number.

---

## 2. HNSW (Hierarchical Navigable Small World)

> *Production question first:* "A practitioner deploying HNSW needs to know it delivers the best recall-vs-latency curve of any in-memory index, that its RAM cost is the full vectors **plus** the graph, that build is slow and hard to shard, and that `efSearch` is the runtime dial while `M` and `efConstruction` are baked in at build time." Everything below is shaped by that.

HNSW (Malkov & Yashunin, 2016/2018) is the default choice in most vector databases (Qdrant, Weaviate, Milvus, Vespa, pgvector, Elasticsearch/Lucene, Redis) because it sits on the best point of the recall-vs-QPS Pareto frontier for in-memory workloads.

### 2.1 Analogy

**HNSW is like a metro transit system layered over a city street map:**

- **Express layers (top):** a few stations connected by long-haul express lines. You cover huge distances in a single hop.
- **Local layers (bottom):** every street corner is a stop, connected only to nearby corners for fine-grained navigation.
- **You always start at the highest layer and drill down:** ride the express line until you overshoot your neighborhood, drop down a level, take a regional line, drop again, and finish on foot at street level.

A second, complementary analogy is **skip lists** (the 1-D data structure HNSW generalizes): a skip list has express lanes over a sorted linked list so you can binary-search in a linked structure. HNSW is a skip list generalized to a proximity graph in `d` dimensions — the top layers are sparse "express lanes," the bottom layer contains every node.

### 2.2 Core Concept

HNSW combines two ideas:

1. **Navigable Small World (NSW) graphs.** Build a proximity graph where each node links to its near neighbors, but also retains a few **long-range links** (a consequence of inserting nodes in random order). Greedy routing — "always step to the neighbor closest to the query" — then reaches any target in roughly **logarithmic** hops, the small-world property (à la "six degrees of separation").
2. **A hierarchy of layers.** A single NSW graph can get stuck: greedy search has no way to take big jumps early. HNSW stacks multiple NSW graphs. Each node is assigned a **maximum layer** drawn from an exponentially decaying distribution, so higher layers are exponentially sparser. Search starts at the sparse top (big jumps), then descends, refining at each level — turning greedy routing into an `O(log n)` procedure.

The layer assignment for a new node uses `l = floor(−ln(unif(0,1)) · mL)`, where `mL` is a normalization constant. The paper shows the optimal choice is `mL = 1 / ln(M)`, which makes the expected number of layers `O(log n)` and balances the graph.

### 2.3 Algorithm Walkthrough

**Insertion** of a new element `q`:

1. **Draw a target level** `l` for `q` from the exponential distribution above.
2. **Descend from the top.** Start at the graph's single entry point at the topmost layer. For every layer *above* `l`, run a **greedy search with **`ef = 1` (find the single closest node) and carry that node down as the entry point for the next layer. This cheaply zooms into `q`'s neighborhood.
3. **Insert and connect.** For every layer from `min(l, top)` down to `0`:- Run `SEARCH-LAYER` with a wide beam (`ef = efConstruction`) to collect a candidate pool of nearby nodes.

- Select up to `M` neighbors from that pool using the **neighbor-selection heuristic** (below) and add bidirectional links.
- **Prune** any neighbor that now exceeds its max-degree (`Mmax` for layer > 0, `Mmax0 = 2·M` for layer 0) by re-running the heuristic on its connection list.

1. If `l` is higher than the current top layer, `q` becomes the new **entry point**.

**Search** for the `k` nearest neighbors of query `q`:

1. Start at the entry point on the top layer.
2. Greedy-descend with `ef = 1` through all upper layers to land near `q`'s region at layer 0.
3. At **layer 0**, run `SEARCH-LAYER` with `ef = efSearch` (a beam / best-first search using a candidate min-heap and a result max-heap). Return the best `k`.

**The neighbor-selection heuristic (this is the secret sauce).** A naïve "keep the `M` closest candidates" rule creates redundant links all pointing into the same dense cluster, leaving "gaps" the graph can't cross. HNSW instead keeps a candidate **only if it is closer to **`q`** than to any already-selected neighbor**. This favors links in *diverse directions*, preserving graph connectivity and global navigability. It is the single most important reason HNSW's recall curve beats plain NSW.

### 2.4 Pseudocode

```python
# ---- INSERT (Malkov & Yashunin, Algorithm 1) ----
function INSERT(q, M, Mmax, efConstruction, mL):
    W = {}                                   # working candidate set
    ep = get_entry_point()
    L  = level_of(ep)                        # current top layer
    l  = floor(-ln(uniform(0,1)) * mL)       # new node's target level

    # Phase 1: zoom from top down to l+1 with a width-1 greedy search
    for lc in range(L, l, -1):
        W  = SEARCH_LAYER(q, ep, ef=1, lc)
        ep = nearest(q, W)

    # Phase 2: insert & wire up from min(L, l) down to 0
    for lc in range(min(L, l), -1, -1):
        W          = SEARCH_LAYER(q, ep, ef=efConstruction, lc)
        neighbors  = SELECT_NEIGHBORS_HEURISTIC(q, W, M, lc)
        add_bidirectional_links(q, neighbors, lc)
        for e in neighbors:                  # enforce degree cap
            if degree(e, lc) > Mmax(lc):
                e.conns[lc] = SELECT_NEIGHBORS_HEURISTIC(e, e.conns[lc], Mmax(lc), lc)
        ep = W

    if l > L:
        set_entry_point(q)                   # new top of the hierarchy


# ---- SEARCH_LAYER (Algorithm 2): best-first beam search on one layer ----
function SEARCH_LAYER(q, ep, ef, lc):
    visited   = set(ep)
    candidates= min_heap(ep, key=dist(q, ·))     # frontier to expand
    result    = max_heap(ep, key=dist(q, ·))     # current best ef
    while candidates not empty:
        c = candidates.pop_nearest()
        f = result.peek_farthest()
        if dist(q, c) > dist(q, f): break        # cannot improve -> stop
        for e in neighbors(c, lc):
            if e not in visited:
                visited.add(e)
                f = result.peek_farthest()
                if dist(q, e) < dist(q, f) or len(result) < ef:
                    candidates.push(e)
                    result.push(e)
                    if len(result) > ef: result.pop_farthest()
    return result


# ---- SELECT_NEIGHBORS_HEURISTIC (Algorithm 4): diversity-aware selection ----
function SELECT_NEIGHBORS_HEURISTIC(q, C, M, lc):
    R = []                                       # selected
    queue = min_heap(C, key=dist(q, ·))
    while queue not empty and len(R) < M:
        e = queue.pop_nearest()
        # keep e ONLY if it is closer to q than to any already-picked neighbor
        if all(dist(q, e) < dist(e, r) for r in R):
            R.append(e)
    return R


# ---- KNN SEARCH (Algorithm 5) ----
function KNN_SEARCH(q, k, efSearch):
    ep = get_entry_point()
    for lc in range(top_layer, 0, -1):           # greedy descent, ef=1
        W  = SEARCH_LAYER(q, ep, ef=1, lc)
        ep = nearest(q, W)
    W = SEARCH_LAYER(q, ep, ef=efSearch, lc=0)   # wide search at base layer
    return k_nearest(q, W, k)

```

### 2.5 Parameters & Tuning

| Parameter | Set at | What it controls | Effect of increasing |
| --- | --- | --- | --- |
| `M` | build | Max links per node on layers > 0 (`Mmax0 = 2M` at layer 0) | ↑ recall & ↑ RAM & ↑ build time. Sweet spot **12–48**; use 32–64 for high-dim/high-recall. |
| `efConstruction` | build | Beam width during insertion | ↑ graph quality & recall, ↑ build time. Typical **100–500**. Diminishing returns past ~500. |
| `efSearch` | **query** | Beam width at layer 0 during search | ↑ recall & ↑ latency. **The runtime speed/recall dial.** Must be ≥ `k`. Tune per recall target. |
| `mL` | build | Level-generation normalizer | Leave at `1/ln(M)` (the proven optimum); rarely touched. |

> ✅ **Best practice:** fix `M` and `efConstruction` for your recall/RAM budget at build time, then sweep `efSearch` at query time to trace the recall-vs-QPS curve and pick the point that meets your latency SLA. ⚠️ `M` and `efConstruction` are **immutable after build** — changing them means rebuilding the whole index. Only `efSearch` is free to change at query time.

### 2.6 Complexity Analysis

| Cost | Complexity | Notes |
| --- | --- | --- |
| **Query** | `O(log n)` hops (empirically) | Malkov & Yashunin argue polylogarithmic scaling; each hop costs `O(M·d)` distance work. |
| **Insert** | `O(log n)` (amortized) | Same greedy descent as search, times `efConstruction` beam work. |
| **Build (n nodes)** | `O(n · log n · d)` (empirical) | Dominated by `n` insertions; slow in practice — often minutes-to-hours for 10⁷–10⁸. |
| **Memory** | `O(n·d + n·M)` | Full vectors **plus** graph links: `~ n · M · (4–8 bytes)` for the adjacency on top of `n·d·4` for vectors. |

> ⚠️ **Memory is HNSW's Achilles heel.** You store the full-precision vectors *and* the link structure. For 100M × 768-dim float32 vectors that's ~307 GB for vectors alone, plus tens of GB of graph — before any replicas. This is why large deployments pair HNSW with quantization (e.g. FAISS `IndexHNSWPQ`, or Qdrant/Milvus scalar/product quantization).

### 2.7 Code Example

```python
import hnswlib
import numpy as np

dim, n = 128, 100_000
data = np.random.random((n, dim)).astype('float32')

# 'cosine' | 'l2' | 'ip' (inner product)
index = hnswlib.Index(space='cosine', dim=dim)
index.init_index(max_elements=n, ef_construction=200, M=16)
index.add_items(data, np.arange(n))

index.set_ef(50)                     # efSearch >= k ; runtime recall dial
labels, distances = index.knn_query(data[:5], k=10)
print(labels.shape)                  # (5, 10)

# Persist / reload
index.save_index("hnsw_cosine.bin")
reloaded = hnswlib.Index(space='cosine', dim=dim)
reloaded.load_index("hnsw_cosine.bin", max_elements=n)

```

### 2.8 Pros & Cons

**Strengths**

- ✅ **Best-in-class recall vs. latency** for in-memory ANN — the reason it's the industry default.
- ✅ **No training step** — unlike IVF, no `k`-means pass over a representative sample.
- ✅ Supports **incremental inserts** cheaply (each is an `O(log n)` operation).
- ✅ Robust across `d` and data distributions with minimal tuning.

**Weaknesses**

- ⚠️ **High memory** — vectors + graph; the dominant cost at scale.
- ⚠️ **Slow build** and **hard to shard/distribute** — the graph is a global structure; splitting it hurts recall.
- ⚠️ **Deletes are painful** — most implementations do soft-delete/tombstoning and require periodic re-indexing to reclaim space and repair connectivity.
- ⚠️ Graph is largely a **black box** — hard to interpret why a neighbor was missed.

### 2.9 Expert Takeaways

- 🔬 **The heuristic, not the hierarchy, is what wins.** Ablations show HNSW's edge over flat NSW comes mostly from the diversity-aware `SELECT_NEIGHBORS_HEURISTIC`; the layers mainly cut the constant factor on the greedy descent. If you implement HNSW yourself, get the heuristic right first.
- 🔬 `efSearch`** is the only knob you should touch in prod.** Bake `M`/`efConstruction` at build; expose `efSearch` per-query so you can dial recall up for high-value queries and down under load.
- 🔬 **Layer-0 dominates cost.** `Mmax0 = 2·M` and nearly all nodes live at layer 0, so base-layer degree drives both RAM and query cost. Budget accordingly.
- 🔬 **Combine with PQ for scale, but expect a recall hit.** `IndexHNSWPQ` slashes memory but the coarse distances degrade the graph's routing decisions; re-rank the top candidates with full-precision vectors to recover recall.
- 🔬 **Filtered search is a known failure mode.** Naïve post-filtering after HNSW can return < `k` results because filtered-out nodes were the graph's routing hubs. Use implementations with native filtered-HNSW (Qdrant, Weaviate) or over-fetch aggressively.

> **✅ Key Takeaways — §2 (HNSW)**
> - Multi-layer navigable small-world graph; greedy descent gives ~`O(log n)` search.
> - Tune `M` + `efConstruction` at build, sweep `efSearch` at query time.
> - Best recall/latency curve, but **RAM-hungry** (vectors + graph) and hard to shard/delete.
> - The **neighbor-selection heuristic** (keep-if-closer-to-q-than-to-picked) is the core innovation.

---

## 3. IVF (Inverted File Index)

> *Production question first:* "A practitioner deploying IVF needs to know it **requires a training pass** (`k`-means), that recall is gated by `nprobe`, that it shards and scales beautifully, and that its real superpower is **compression via Product Quantization (IVF-PQ)** — letting billion-scale datasets fit in RAM or on GPU at the cost of approximate distances."

IVF (the inverted-file approach popularized by Jégou, Douze & Schmid, 2011, and the backbone of FAISS at Meta) is the go-to for **very large, memory-constrained, and GPU** deployments. Where HNSW is a graph, IVF is a **partition-and-shortlist** scheme.

### 3.1 Analogy

**IVF is like finding a book in a large library organized by section.** Instead of walking every shelf (brute force), you first go to the **information desk** (the coarse quantizer), which points you to the 2–3 **sections** (cells) most likely to contain your topic. You then scan only those sections' shelves. You might miss a book mis-shelved in a neighboring section (a recall miss) — so if you want to be thorough, you check a few *adjacent* sections too (that's `nprobe > 1`).

### 3.2 Core Concept

**Partition the vector space into **`nlist`** cells** using `k`-means; the `nlist` centroids form a **coarse quantizer**. Every dataset vector is assigned to its nearest centroid and stored in that centroid's **posting list** (the "inverted list"). At query time, find the `nprobe` centroids closest to `q` and search **only** the vectors in those posting lists — turning a full scan of `n` into a scan of roughly `nprobe · (n / nlist)` vectors.

**IVF-PQ** adds compression on top. Instead of storing full vectors in the posting lists, each vector is encoded with **Product Quantization**: split the `d`-dim vector into `m` sub-vectors, quantize each sub-vector against its own small codebook (typically `2⁸ = 256` centroids → 1 byte per sub-vector), and store only the `m` codes. A 768-dim float32 vector (3072 bytes) becomes `m = 96` bytes — a **32× compression**. Distances are then computed approximately via precomputed lookup tables (ADC — Asymmetric Distance Computation).

### 3.3 Algorithm Walkthrough

**Build (train + add):**

1. **Train** the coarse quantizer: run `k`-means with `k = nlist` on a representative sample to get centroids `c₁…c_nlist`.
2. *(IVF-PQ only)* **Train PQ codebooks**: for each of the `m` sub-spaces, run `k`-means (usually 256 centroids) on the residuals `(x − centroid)`.
3. **Add**: for each vector `x`, assign it to its nearest centroid; append `x` (flat) or its PQ code (IVF-PQ) to that centroid's posting list.

**Query:**

1. Compute distances from `q` to all `nlist` centroids; pick the `nprobe`** nearest cells**.
2. Scan the vectors in those `nprobe` posting lists.- **IVFFlat**: exact distance to each candidate.

- **IVFPQ**: build per-subspace distance lookup tables for `q`, then sum table lookups per candidate (ADC) — very cache-friendly, no full-vector math.

1. Keep a top-`k` heap; optionally **re-rank** the shortlist with full-precision vectors (if retained) to recover recall.

### 3.4 Pseudocode

```python
# ---- BUILD ----
function IVF_BUILD(X, nlist, m=None, nbits=8):
    centroids = kmeans(X_sample, k=nlist)            # coarse quantizer
    posting   = {i: [] for i in range(nlist)}
    if m: pq_codebooks = train_pq(residuals(X, centroids), m, 2**nbits)
    for x in X:
        c = argmin_i dist(x, centroids[i])           # nearest cell
        code = pq_encode(x - centroids[c], pq_codebooks) if m else x
        posting[c].append((id_of(x), code))
    return centroids, posting, pq_codebooks

# ---- QUERY ----
function IVF_SEARCH(q, k, nprobe):
    cells = top_nprobe_cells(q, centroids, nprobe)   # coarse search
    heap  = max_heap(size=k)
    for c in cells:
        if PQ:
            LUT = build_distance_tables(q - centroids[c], pq_codebooks)  # ADC
            for (id, code) in posting[c]:
                d = sum(LUT[j][code[j]] for j in range(m))   # table lookups
                heap.push((d, id))
        else:
            for (id, x) in posting[c]:
                heap.push((dist(q, x), id))
    return heap.k_smallest()        # optional full-precision re-rank here

```

### 3.5 Parameters & Tuning

| Parameter | Set at | Controls | Guidance |
| --- | --- | --- | --- |
| `nlist` | build | Number of cells / centroids | Rule of thumb `nlist ≈ √n`** to **`16·√n`. More cells → smaller lists → faster but needs higher `nprobe` for recall. |
| `nprobe` | **query** | Cells searched per query | **The runtime speed/recall dial.** `nprobe = 1` is fastest/lowest-recall; increase until recall target met. Often 8–256. |
| `m` (PQ) | build | # sub-quantizers (bytes/vector) | Must divide `d`. Larger `m` → better accuracy, more memory. Common: `d/2` … `d/4`. |
| `nbits` (PQ) | build | Bits per sub-code | Almost always **8** (256-entry codebooks) for SIMD-friendly lookups. |
| training size | build | Sample for `k`-means | FAISS wants **≥ 30–256 × **`nlist` training points, or centroids are poorly placed. |

> ✅ **Best practice:** set `nlist ≈ √n`, train on ≥ `39·nlist` vectors, then sweep `nprobe` on a validation set to hit your recall target. ⚠️ `k`**-means quality gates everything.** Skewed or too-few training samples → unbalanced posting lists (some cells huge, some empty) → both slow queries and recall loss. Watch for imbalance.

### 3.6 Complexity Analysis

| Cost | Complexity | Notes |
| --- | --- | --- |
| **Coarse search** | `O(nlist · d)` | Distance to every centroid; can itself be indexed (`IVF_HNSW`) when `nlist` is large. |
| **List scan (IVFFlat)** | `O(nprobe · (n/nlist) · d)` | Sublinear in `n` for fixed `nprobe`. |
| **List scan (IVFPQ)** | `O(nprobe · (n/nlist) · m)` | `m` table lookups instead of `d` mults — much cheaper per candidate. |
| **Build / train** | `O(n · nlist · d · iters)` for `k`-means | Training is the expensive part; adding is `O(n · nlist · d)` for assignment. |
| **Memory (IVFFlat)** | `O(n·d)` | Full vectors, same as flat. |
| **Memory (IVFPQ)** | `O(n·m + nlist·d)` | **This is the win:** `m` bytes/vector. 1B × 96-byte codes ≈ 96 GB vs. ~3 TB raw. |

### 3.7 Code Example

```python
import faiss
import numpy as np

d, n = 128, 1_000_000
xb = np.random.random((n, d)).astype('float32')
xq = np.random.random((5, d)).astype('float32')

nlist = 1024                              # ~ sqrt(n) scaled up
quantizer = faiss.IndexFlatL2(d)          # coarse quantizer

# --- IVF-Flat ---
ivf = faiss.IndexIVFFlat(quantizer, d, nlist, faiss.METRIC_L2)
ivf.train(xb)                             # REQUIRED training pass
ivf.add(xb)
ivf.nprobe = 16                           # runtime recall dial
D, I = ivf.search(xq, k=10)

# --- IVF-PQ (compressed): m sub-quantizers, 8 bits each ---
m, nbits = 16, 8                          # 16 bytes/vector (128 -> 16)
ivfpq = faiss.IndexIVFPQ(quantizer, d, nlist, m, nbits)
ivfpq.train(xb)
ivfpq.add(xb)
ivfpq.nprobe = 32
D, I = ivfpq.search(xq, k=10)

```

### 3.8 Pros & Cons

**Strengths**

- ✅ **Scales to billions** and **shards trivially** — posting lists distribute across machines/GPUs cleanly.
- ✅ **IVF-PQ compression** is unmatched for fitting huge datasets in RAM/VRAM.
- ✅ **GPU-friendly** — FAISS GPU IVF-PQ is a workhorse for billion-scale.
- ✅ Predictable, tunable cost model (`nprobe` linearly trades speed for recall).

**Weaknesses**

- ⚠️ **Requires training** — a `k`-means pass on a representative sample; cold-start unfriendly.
- ⚠️ **Recall ceiling from cell boundaries** — a true neighbor in an un-probed adjacent cell is simply missed. Recall < HNSW at equal latency for in-memory sizes.
- ⚠️ **PQ introduces quantization error** — approximate distances hurt recall; mitigate with re-ranking.
- ⚠️ **Distribution drift** — if data drifts away from the trained centroids, lists unbalance and recall degrades; needs periodic retraining.

### 3.9 Expert Takeaways

- 🔬 **Always re-rank IVF-PQ.** Use `IndexIVFPQ` (or `IndexRefineFlat` wrapping it) to shortlist with PQ, then re-score the top ~`10·k` with full-precision vectors. This recovers most of the recall PQ gives up, at tiny extra cost.
- 🔬 **Use OPQ before PQ.** An **OPQ** (Optimized Product Quantization) rotation decorrelates dimensions before splitting into sub-spaces, materially improving PQ accuracy — `faiss.index_factory(d, "OPQ16,IVF1024,PQ16")`.
- 🔬 **Index the coarse quantizer at large **`nlist`**.** When `nlist` is tens of thousands, the `O(nlist·d)` centroid scan dominates — replace `IndexFlatL2` with an HNSW coarse quantizer (`IVF_HNSW`) so cell selection is itself sublinear.
- 🔬 `nprobe`** and `nlist` co-tune.** Recall depends roughly on `nprobe/nlist` (fraction of space searched). Doubling `nlist` for speed usually means doubling `nprobe` to hold recall.
- 🔬 **The FAISS index_factory string is your friend:** `"IVF4096,PQ64"`, `"OPQ64,IVF16384_HNSW32,PQ64"` etc. capture entire pipelines declaratively.

> **✅ Key Takeaways — §3 (IVF)**
> - Partition space with `k`-means into `nlist` cells; search only the `nprobe` nearest cells.
> - `nprobe` is the runtime recall dial; `nlist ≈ √n` and train on a big enough sample.
> - **IVF-PQ** compresses vectors 8–64× so billion-scale fits in RAM/GPU — always **re-rank** to recover recall, and consider **OPQ**.
> - Best for very large / sharded / GPU / memory-constrained deployments; needs a training pass.

---

## 4. LSH (Locality-Sensitive Hashing)

> *Production question first:* "A practitioner deploying LSH needs to know it's the only method here with **provable sublinear guarantees**, that it's the natural fit for **set/Jaccard** similarity (dedup, plagiarism) and streaming, but that on **dense high-dim embeddings it is generally beaten by HNSW/IVF** on the recall-vs-QPS curve — so reach for it for its data-agnostic guarantees and streaming/dedup strengths, not as a default embedding index."

LSH (Indyk & Motwani, 1998; Gionis et al., 1999; Charikar's SimHash, 2002; Broder's MinHash, 1997) is the classic, theory-backed family. It's less common as a *dense-vector* index today but remains the tool of choice for **near-duplicate detection at scale**.

### 4.1 Analogy

**LSH is like sorting people into rooms by a deliberately "leaky" rule** — e.g. "first letter of last name." People with similar names land in the same room. To find someone similar to you, you only look inside *your* room, not the whole building. One rule is error-prone (many false splits), so you use **several independent rules** (hash tables) and consider anyone who shares a room with you under *any* rule — that's the `L` tables / `k` concatenated hashes ("AND-then-OR") construction.

### 4.2 Core Concept

A hash family is **locality-sensitive** if *near* points collide with **high** probability and *far* points collide with **low** probability. Formally, `H` is `(r, cr, p₁, p₂)`-sensitive if `dist(a,b) ≤ r ⇒ Pr[h(a)=h(b)] ≥ p₁` and `dist(a,b) ≥ cr ⇒ Pr[h(a)=h(b)] ≤ p₂`, with `p₁ > p₂`.

We amplify this gap with two knobs:

- `k`** (bits per key — AND):** concatenate `k` hashes into one key. Collision prob becomes `p^k` — sharpens precision (fewer false collisions) but lowers recall.
- `L`** (tables — OR):** build `L` independent tables; a candidate is anything colliding in **any** table. Probability of *missing* a true near pair drops to `(1 − p₁^k)^L` — raises recall at the cost of memory/time.

Together they give the classic `O(n^ρ)` query with `ρ = ln p₁ / ln p₂ < 1` — **provably sublinear**.

**Two dominant families:**

- **Random-projection / SimHash (cosine similarity).** Draw random hyperplanes `r`; each bit is `sign(r · x)`. The probability two vectors share a bit is `1 − θ/π` where `θ` is their angle — so collision probability is monotone in cosine similarity. `k` bits = `k` hyperplanes.
- **MinHash (Jaccard similarity on sets).** For sets (e.g. shingles of a document), a MinHash is `min` over a random permutation of the universe. Crucially, `Pr[minhash(A) = minhash(B)] = J(A,B)` — the Jaccard similarity **exactly**. Stack many MinHashes into a signature; combine with LSH banding.

### 4.3 Algorithm Walkthrough

**Random-projection LSH (cosine):**

1. **Build:** generate `L` tables, each with `k` random hyperplanes. For every `x`, compute its `k`-bit key per table; store `x`'s id in the corresponding bucket.
2. **Query:** hash `q` the same way; gather the union of candidates from `q`'s bucket in each of the `L` tables; compute exact distances on that (small) candidate set; return top-`k`.

**MinHash LSH (Jaccard) with banding:**

1. Represent each document as a set of **shingles** (k-grams).
2. Compute an `N`-permutation **MinHash signature** per document.
3. **Band** the signature into `b` bands of `r` rows (`N = b·r`); hash each band. Two docs are candidates if **any** band matches. The probability of becoming a candidate is `1 − (1 − s^r)^b` — an S-curve with threshold `≈ (1/b)^(1/r)`.

### 4.4 Pseudocode

```python
# ---- Random-projection (SimHash) LSH for cosine ----
function BUILD_RP_LSH(X, L, k, d):
    tables = []
    for t in range(L):
        planes = random_normal(k, d)                  # k hyperplanes
        buckets = defaultdict(list)
        for x in X:
            key = tuple((planes @ x) > 0)             # k-bit signature
            buckets[key].append(id_of(x))
        tables.append((planes, buckets))
    return tables

function QUERY_RP_LSH(q, tables, k_out):
    cand = set()
    for (planes, buckets) in tables:
        key = tuple((planes @ q) > 0)
        cand |= set(buckets.get(key, []))             # OR across tables
    return top_k_by_exact_dist(q, cand, k_out)        # rerank candidates

# ---- MinHash + LSH banding for Jaccard ----
function MINHASH_SIGNATURE(set_S, hashes):             # N hash functions
    return [min(h(x) for x in set_S) for h in hashes]  # length-N signature

function LSH_BANDING(signatures, b, r):                # N = b*r
    buckets = defaultdict(set)
    for doc_id, sig in signatures.items():
        for band in range(b):
            chunk = tuple(sig[band*r : (band+1)*r])
            buckets[(band, chunk)].add(doc_id)         # candidates share a band
    return buckets

```

### 4.5 Parameters & Tuning

| Parameter | Family | Controls | Effect |
| --- | --- | --- | --- |
| `k` (hashes/key) | RP-LSH | Bits concatenated (AND) | ↑ precision, ↓ recall, smaller buckets |
| `L` (tables) | RP-LSH | Independent tables (OR) | ↑ recall, ↑ memory & query time |
| `N` (num perms) | MinHash | Signature length | ↑ accuracy of Jaccard estimate, ↑ compute |
| `b`, `r` | MinHash banding | Bands × rows (`N=b·r`) | Set the S-curve **threshold ≈ **`(1/b)^(1/r)`; more bands → lower threshold (more candidates) |

> ✅ **Best practice:** pick your target Jaccard threshold `s*`, then choose `b, r` so the S-curve's steep region sits at `s*` (e.g. `datasketch`'s `MinHashLSH(threshold=0.8)` solves this for you). ⚠️ **Always re-rank.** LSH gives you a *candidate set*, not final ranking — compute exact similarity on candidates. Skipping this yields poor precision.

### 4.6 Complexity Analysis

| Cost | Complexity | Notes |
| --- | --- | --- |
| **Query** | `O(n^ρ)`, `ρ = ln p₁/ln p₂ < 1` | The provable sublinear guarantee; plus `O(L·k)` hashing + candidate rerank. |
| **Build** | `O(n · L · k)` | Hash every point into `L` tables — fast, embarrassingly parallel, **streaming-friendly**. |
| **Memory** | `O(n · L)` | `L` table entries per point. Large `L` (needed for high recall on dense data) inflates this. |
| **MinHash sig** | `O( | S |

### 4.7 Code Example

```python
# --- MinHash LSH for near-duplicate detection (datasketch) ---
from datasketch import MinHash, MinHashLSH

def shingles(text, k=5):
    return {text[i:i+k] for i in range(len(text) - k + 1)}

def make_minhash(text, num_perm=128):
    m = MinHash(num_perm=num_perm)
    for sh in shingles(text):
        m.update(sh.encode('utf8'))
    return m

lsh = MinHashLSH(threshold=0.8, num_perm=128)   # solves b,r for you
docs = {"d1": "the quick brown fox", "d2": "the quick brown foxes",
        "d3": "completely unrelated text here"}
mh = {k: make_minhash(v) for k, v in docs.items()}
for k, m in mh.items():
    lsh.insert(k, m)

print(lsh.query(mh["d1"]))   # -> ['d1', 'd2']  (near-dupes; d3 excluded)

# --- Random-projection LSH for cosine (faiss) ---
import faiss, numpy as np
d, n, nbits = 128, 100_000, 256
xb = np.random.random((n, d)).astype('float32')
lsh_index = faiss.IndexLSH(d, nbits)   # nbits hyperplanes -> binary codes
lsh_index.train(xb); lsh_index.add(xb)
D, I = lsh_index.search(xb[:5], k=10)

```

### 4.8 Pros & Cons

**Strengths**

- ✅ **Provable sublinear guarantees** — the only family here with rigorous theory, independent of data distribution.
- ✅ **Streaming / online friendly** — no training, `O(1)` inserts, embarrassingly parallel.
- ✅ **MinHash is the gold standard for set/Jaccard** similarity: dedup, plagiarism, document clustering, Bloom-style membership.
- ✅ Compact **binary codes** enable fast Hamming-distance filtering.

**Weaknesses**

- ⚠️ **Usually loses to HNSW/IVF on dense embeddings** — at equal recall it needs large `L`, inflating memory and query time.
- ⚠️ **Hyperparameter-sensitive** — `(k, L)` or `(b, r)` must be tuned to the similarity threshold; wrong settings tank precision or recall.
- ⚠️ **Bucket skew** — popular buckets can blow up the candidate set (and latency).
- ⚠️ **Threshold-oriented, not top-k-native** — great for "everything above similarity `s`," clunkier for strict top-`k`.

### 4.9 Expert Takeaways

- 🔬 **Match the hash family to the metric — this is the #1 mistake.** SimHash/random-projection ↔ cosine/angular; MinHash ↔ Jaccard on sets; `p`-stable projections ↔ L2. Using the wrong family silently destroys recall.
- 🔬 **Tune **`b`**/**`r`** by the S-curve, not by feel.** The candidate probability `1−(1−s^r)^b` has a threshold near `(1/b)^{1/r}`; place its steep region at your similarity cutoff. `datasketch` optimizes this given a target threshold and false-pos/neg weights.
- 🔬 **Multi-probe LSH cuts **`L`** dramatically.** Instead of many tables, probe nearby buckets in *fewer* tables (perturb the query key), getting comparable recall at a fraction of the memory — the standard fix for LSH's memory problem.
- 🔬 **Use MinHash for billion-scale dedup / entity resolution / plagiarism.** This is where LSH still decisively beats graph/quantization methods.
- 🔬 **LSH shines on ultra-high-dim sparse data** (bag-of-words, one-hot, sets) where HNSW/IVF struggle — don't write it off, just use it where its geometry fits.

> **✅ Key Takeaways — §4 (LSH)**
> - Hash so near points collide often; amplify with `k` (AND) and `L` (OR) → provable `O(n^ρ)` query.
> - **SimHash/random-projection ↔ cosine; MinHash ↔ Jaccard** — match family to metric.
> - Best for **set-similarity, dedup, plagiarism, streaming**; usually beaten by HNSW/IVF on dense embeddings.
> - Always **re-rank candidates** exactly; tune `b,r` via the S-curve; consider **multi-probe** to save memory.

---

## 5. Algorithm Comparison Table

| Dimension | **HNSW** | **IVF / IVF-PQ** | **LSH** |
| --- | --- | --- | --- |
| **Index build time** | Slow (`O(n log n · d)`) | Medium — dominated by `k`-means training | Fast (`O(n·L·k)`), no training |
| **Query speed** | Very fast (best recall/latency) | Fast; `nprobe`-controlled | Fast, but needs large `L` for high recall on dense data |
| **Memory footprint** | High (vectors + graph) | IVFFlat: high; **IVF-PQ: very low** (8–64× compression) | Low–medium (grows with `L`) |
| **Recall@10 (typical)** | ~95–99% | ~90–98% (IVFFlat); ~85–95% (IVF-PQ, pre-rerank) | ~80–92% (dense); ~exact for tuned Jaccard |
| **Runtime recall dial** | `efSearch` | `nprobe` | `L` / multi-probe |
| **Scalability** | ≤ ~10⁷–10⁸ in-memory; hard to shard | **Billions**; shards & GPUs cleanly | Billions for sparse/set data; streaming |
| **Incremental insert** | ✅ Cheap (`O(log n)`) | ⚠️ Needs trained centroids; drift over time | ✅ Trivial, streaming-friendly |
| **Deletes** | ⚠️ Painful (tombstone + rebuild) | ✅ Easier (remove from list) | ✅ Easy |
| **Training required?** | ❌ No | ✅ Yes (`k`-means) | ❌ No |
| **Theory guarantee** | Empirical (polylog) | Empirical | ✅ Provable `O(n^ρ)` |
| **Best metric fit** | L2 / cosine / IP | L2 / cosine / IP | SimHash→cosine; MinHash→Jaccard |
| **Best use case** | Default in-memory vector DB / RAG | Billion-scale, memory/GPU-constrained | Dedup, plagiarism, set similarity, streaming |

> Recall numbers are representative ranges from [ann-benchmarks](http://ann-benchmarks.com) and library docs; **always measure on your own data and query distribution.** The only honest comparison is a recall-vs-QPS curve on your corpus.

> **✅ Key Takeaways — §5**
> - HNSW = best recall/latency in-memory; IVF-PQ = best scale/memory; LSH = best for set-similarity & guarantees.
> - The "recall %" is meaningless without the matching latency/QPS — compare curves, not points.

---

## 6. Real-World Applications

| Application | Recommended index | Why |
| --- | --- | --- |
| **LLM semantic search / RAG** | **HNSW** (in vector DBs); IVF-PQ at very large scale | RAG needs low-latency, high-recall top-`k` over dense embeddings; HNSW is the default in Qdrant/Weaviate/Milvus/pgvector. Switch to IVF-PQ when the corpus outgrows RAM. |
| **Recommendation systems** | **IVF-PQ** or HNSW; MIPS variants | Item/user embeddings at 10⁸–10⁹ scale; inner-product search. PQ compression keeps candidate generation cheap; often two-stage (ANN recall → re-rank model). |
| **Image / audio similarity** | **HNSW** or **IVF-PQ** (FAISS) | High-dim CNN/CLIP embeddings; FAISS IVF-PQ on GPU is standard for reverse-image search at scale. |
| **Near-duplicate / plagiarism / dedup** | **MinHash LSH** | Set/Jaccard similarity over shingles; the canonical use — powers web-scale dedup and content moderation. |
| **Fraud detection / entity resolution** | **LSH** (MinHash or SimHash) + graph | Streaming, high-dim sparse features, "find everything similar above threshold"; LSH's sublinear guarantees and streaming inserts fit real-time pipelines. |
| **Face recognition / biometric 1:N** | **HNSW** / IVF-PQ | Low-latency top-`k` over normalized embeddings (cosine). |

**The two-stage retrieval pattern (the production default):** almost every large system uses ANN as a *candidate generator* (recall stage) followed by an exact or model-based **re-ranker** on the shortlist. ANN buys you cheap high-recall candidates; the re-ranker buys precision. This is why an index at 90% recall is often *fine* — the re-ranker cleans up.

> **✅ Key Takeaways — §6**
> - RAG/semantic search → HNSW by default, IVF-PQ at scale.
> - Dedup/plagiarism/fraud on sets → MinHash LSH.
> - Nearly everything production is **two-stage**: ANN recall → exact/model re-rank.

---

## 7. Implementation Guide (Code)

### 7.1 FAISS — one API for Flat, IVF, IVF-PQ, HNSW

```python
import faiss, numpy as np

d, n = 128, 500_000
xb = np.random.random((n, d)).astype('float32')
xq = np.random.random((100, d)).astype('float32')

# Ground-truth baseline (exact)
flat = faiss.IndexFlatL2(d); flat.add(xb)
_, gt = flat.search(xq, 10)

# The index_factory expresses whole pipelines as strings:
index = faiss.index_factory(d, "OPQ16,IVF1024,PQ16")   # OPQ + IVF + PQ
index.train(xb); index.add(xb)
index.nprobe = 16
_, I = index.search(xq, 10)

recall = np.mean([len(set(I[i]) & set(gt[i]))/10 for i in range(len(xq))])
print(f"Recall@10 = {recall:.3f}")

# HNSW via FAISS
hnsw = faiss.IndexHNSWFlat(d, 32)          # M = 32
hnsw.hnsw.efConstruction = 200
hnsw.add(xb)
hnsw.hnsw.efSearch = 64
_, I = hnsw.search(xq, 10)

```

### 7.2 hnswlib — lightweight, standalone HNSW

```python
import hnswlib, numpy as np
p = hnswlib.Index(space='cosine', dim=128)
p.init_index(max_elements=100_000, ef_construction=200, M=16)
p.add_items(np.random.random((100_000, 128)).astype('float32'))
p.set_ef(64)                                 # efSearch
labels, dists = p.knn_query(np.random.random((1,128)).astype('float32'), k=10)

```

### 7.3 datasketch — MinHash LSH for set similarity

```python
from datasketch import MinHash, MinHashLSH
lsh = MinHashLSH(threshold=0.8, num_perm=128)
# ... build MinHash per doc (see §4.7), insert, and query for near-dupes

```

### 7.4 Parameter Tuning Checklists

**HNSW**

- [ ] Set `M` = 16 (start), 32–64 for high-dim/high-recall.
- [ ] Set `efConstruction` = 200 (raise to 400+ if recall short at build).
- [ ] Sweep `efSearch` ∈ {16, 32, 64, 128, 256}; plot recall vs QPS; pick point meeting SLA (`efSearch ≥ k`).
- [ ] Budget RAM ≈ `n·d·4 + n·M·(4–8)` bytes; add PQ if it won't fit.
- [ ] Validate **filtered** queries separately (over-fetch or native filter).

**IVF / IVF-PQ**

- [ ] `nlist ≈ √n` (scale up to `16√n` for very large `n`).
- [ ] Train on **≥ 39 × nlist** vectors (more is better); check list balance.
- [ ] Choose `m` dividing `d` (memory = `m` bytes/vec); prefer **OPQ** before PQ.
- [ ] Sweep `nprobe` for recall target; co-scale with `nlist`.
- [ ] Wrap in `IndexRefineFlat` (re-rank) to recover PQ recall.
- [ ] Retrain periodically if data distribution drifts.

**LSH**

- [ ] Match family to metric (SimHash↔cosine, MinHash↔Jaccard, p-stable↔L2).
- [ ] Pick similarity threshold `s*`; solve `(b, r)` so the S-curve is steep at `s*`.
- [ ] Increase `L` (or use **multi-probe**) until recall target met.
- [ ] Always exact-rerank the candidate set.
- [ ] Monitor bucket-size skew; cap/oversample hot buckets.

> **✅ Key Takeaways — §7**
> - FAISS `index_factory` strings capture entire pipelines; `hnswlib` for standalone HNSW; `datasketch` for MinHash.
> - Always compute recall against a `IndexFlat` ground truth on your own data.
> - Tuning = fix build params, sweep the one runtime dial, plot recall-vs-QPS.

---

## 8. How to Choose: Decision Framework

```
START: Choosing an ANN index
│
├─ Is your similarity over SETS (shingles, tokens, categorical) / Jaccard?
│     └─ YES → MinHash LSH   (dedup, plagiarism, entity resolution)
│
├─ Is n SMALL (≲ 100k) or is 100% recall mandatory?
│     └─ YES → Flat / brute force (exact)  — also your ground truth
│
├─ Does the dataset FIT COMFORTABLY IN RAM (≲ ~10M–50M dense vectors)?
│     ├─ YES → HNSW
│     │        • need incremental inserts, minimal tuning, best latency → HNSW
│     │        • RAM tight but still in-memory → HNSW + scalar/PQ quantization
│     └─ NO (100M–1B+, or memory/GPU-constrained) →
│              └─ IVF-PQ (+ OPQ, + re-rank)   — shards & GPUs cleanly
│
├─ Latency budget EXTREMELY tight AND recall must be top-tier, data in RAM?
│     └─ HNSW (sweep efSearch)
│
├─ Streaming / online inserts dominate, or ultra-high-dim SPARSE data?
│     └─ LSH (no training, O(1) insert) or HNSW (if dense + fits RAM)
│
└─ Not sure / general dense embeddings, moderate scale?
      └─ DEFAULT → HNSW, then move to IVF-PQ when it outgrows memory.

```

**Quick heuristics by constraint:**

| Your dominant constraint | Pick |
| --- | --- |
| Lowest latency at high recall, data in RAM | **HNSW** |
| Billions of vectors / limited RAM / GPU | **IVF-PQ (+OPQ, +rerank)** |
| Set/Jaccard similarity, dedup, streaming | **MinHash LSH** |
| Need exactness / tiny corpus / ground truth | **Flat** |
| Frequent inserts + deletes, dense, moderate n | **HNSW** (mind delete cost) or **IVF** |

> **✅ Key Takeaways — §8**
> - Sets/Jaccard → LSH; tiny/exact → Flat; fits RAM → HNSW; billions/constrained → IVF-PQ.
> - Default to HNSW for dense embeddings, graduate to IVF-PQ when memory becomes the bottleneck.

---

## 9. Summary Cheatsheet

|  | **HNSW** | **IVF-PQ** | **LSH** |
| --- | --- | --- | --- |
| **One-liner** | Navigable small-world graph | Cluster + compress | Locality-sensitive hashing |
| **Structure** | Layered proximity graph | Inverted lists + PQ codes | Hash tables |
| **Runtime dial** | `efSearch` | `nprobe` | `L` / multi-probe |
| **Build params** | `M`, `efConstruction` | `nlist`, `m`, `nbits` | `k`, `L` (or `b`, `r`) |
| **Query** | ~`O(log n)` | `O(nprobe·n/nlist)` | `O(n^ρ)`, `ρ<1` |
| **Memory** | High (vecs + graph) | Very low (PQ) | Low–med (grows w/ `L`) |
| **Training** | No | Yes (`k`-means) | No |
| **Superpower** | Best recall/latency | Billion-scale compression | Provable bounds, sets/streaming |
| **Watch out for** | RAM, sharding, deletes, filtered search | Training, drift, PQ error → re-rank | Metric mismatch, `L` memory, skew |
| **Libraries** | hnswlib, FAISS, Qdrant, Weaviate, pgvector | FAISS, Milvus | datasketch, FAISS IndexLSH |

**The 30-second decision:** *Dense embeddings that fit in RAM → HNSW. Too big for RAM / GPU / billions → IVF-PQ. Sets, dedup, plagiarism, streaming → MinHash LSH. Small or must-be-exact → Flat. And in production, wrap any of them in a two-stage recall → re-rank pipeline.*

---

## References

1. **Malkov, Yu. A., & Yashunin, D. A. (2018).** *Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs.* IEEE TPAMI. (arXiv:1603.09320) — HNSW.
2. **Malkov, Yu., Ponomarenko, A., Logvinov, A., & Krylov, V. (2014).** *Approximate nearest neighbor algorithm based on navigable small world graphs.* Information Systems. — NSW.
3. **Jégou, H., Douze, M., & Schmid, C. (2011).** *Product Quantization for Nearest Neighbor Search.* IEEE TPAMI. — PQ / IVF-PQ.
4. **Ge, T., He, K., Ke, Q., & Sun, J. (2013).** *Optimized Product Quantization.* CVPR/TPAMI. — OPQ.
5. **Johnson, J., Douze, M., & Jégou, H. (2019).** *Billion-scale similarity search with GPUs.* IEEE Big Data. — FAISS GPU.
6. **Douze, M., et al. (2024).** *The FAISS Library.* (arXiv:2401.08281) + [FAISS wiki](https://github.com/facebookresearch/faiss/wiki).
7. **Indyk, P., & Motwani, R. (1998).** *Approximate Nearest Neighbors: Towards Removing the Curse of Dimensionality.* STOC. — LSH foundations.
8. **Gionis, A., Indyk, P., & Motwani, R. (1999).** *Similarity Search in High Dimensions via Hashing.* VLDB.
9. **Charikar, M. (2002).** *Similarity Estimation Techniques from Rounding Algorithms.* STOC. — SimHash.
10. **Broder, A. (1997).** *On the resemblance and containment of documents.* SEQUENCES. — MinHash.
11. **Datar, M., Immorlica, N., Indyk, P., & Mirrokni, V. (2004).** *LSH Scheme Based on p-Stable Distributions.* SoCG.
12. **Lv, Q., et al. (2007).** *Multi-Probe LSH.* VLDB.
13. **Beyer, K., et al. (1999).** *When is "Nearest Neighbor" Meaningful?* ICDT. — distance concentration / curse of dimensionality.
14. **Aumüller, M., Bernhardsson, E., & Faithfull, A. (2020).** *ANN-Benchmarks.* Information Systems / [ann-benchmarks.com](http://ann-benchmarks.com).
15. **Leskovec, Rajaraman & Ullman.** *Mining of Massive Datasets*, Ch. 3 (LSH, MinHash, banding). [mmds.org](http://www.mmds.org).
16. Library docs: [hnswlib](https://github.com/nmslib/hnswlib), [datasketch](https://ekzhu.github.io/datasketch/).

> ⚠️ **Sourcing note:** complexity claims (`O(log n)` for HNSW, `O(n^ρ)` for LSH, PQ memory reductions) reflect the results and empirical findings reported in the papers/benchmarks above. HNSW's logarithmic scaling is an **empirical/heuristic** result, not a worst-case proof — LSH's `O(n^ρ)` is the one rigorously proven bound. Always validate on your own data.

---

## Related Guides

**Prerequisites:** [KD-Trees & Ball-Trees](/docs/kd-trees-ball-trees) · [Hashing Patterns](/docs/hashing-patterns)  
**See also:** [KD-Trees & Ball-Trees](/docs/kd-trees-ball-trees) · [Graph Algorithms for KG & GraphRAG](/docs/graph-algorithms-kg-graphrag)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
