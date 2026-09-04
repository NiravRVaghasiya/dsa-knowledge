---
title: HNSW Deep Dive — Hierarchical Navigable Small World
slug: /hnsw-deep-dive
sidebar_position: 10
sidebar_label: HNSW Deep Dive
description: >-
  A rigorous deep dive into HNSW — the layered proximity-graph index behind most production vector search. Graph structure, insertion, greedy search, the M / efConstruction / efSearch dials, and the recall/latency/memory trade-offs.
tags:
  - hnsw
  - ann
  - vector-search
  - graphs
  - retrieval
difficulty: advanced
reading_time: 30
prerequisites:
  - title: Approximate Nearest Neighbor Search
    to: /docs/ann-search
  - title: Graph Theory
    to: /docs/graph-theory
pagination_prev: domain-specific-dsa/probabilistic-structures
pagination_next: domain-specific-dsa/multi-head-attention
path_step: 39
---

# HNSW Deep Dive: Hierarchical Navigable Small World

> [ANN Search](/docs/ann-search) introduced HNSW as one of three ANN families. This guide is the **deep dive**: the graph structure, why the *hierarchy* exists, the exact insertion and search procedures, the three tuning dials (`M`, `efConstruction`, `efSearch`), and how each trades **recall against latency and memory**. HNSW (Malkov & Yashunin, 2016) is the default index in FAISS, Qdrant, Weaviate, Milvus, pgvector, and Lucene — understanding it deeply is the highest-leverage knowledge in vector retrieval.

> ⚠️ **This guide contains an *educational* implementation and an *interactive* visualization of the core greedy-descent idea. Neither is production HNSW** — real implementations add a build-time neighbor-selection heuristic, an `efSearch` bounded priority-queue beam, concurrency control, and SIMD distance kernels. The educational versions are labeled as such and exist to build intuition, not to be deployed.

---

## 1. The problem HNSW solves

Exact nearest-neighbor search over `n` vectors of dimension `d` costs `O(n·d)` per query (a brute-force scan). Tree indexes ([KD-trees, ball-trees](/docs/kd-trees-ball-trees)) collapse to that same `O(n·d)` above ~20 dimensions (the curse of dimensionality, see [ANN §1.3](/docs/ann-search)). HNSW instead answers approximate queries in **`O(log n)` expected hops**, each hop touching only a handful of neighbors — the mechanism this guide unpacks.

**The core idea in one sentence:** *build a navigable graph where greedy "always step toward the query" descent reaches a near-neighbor in a logarithmic number of hops, and stack such graphs in a hierarchy so long jumps happen first and fine refinement happens last.*

---

## 2. Graph structure

### 2.1 Navigable Small World (the base layer)

A **Navigable Small World (NSW)** graph connects each vector to a set of others such that:

- **Short-range links** connect a node to its true nearest neighbors (local accuracy).
- **Long-range links** occasionally connect distant nodes (global reachability).

This is the "small world" property (à la six-degrees-of-separation): the graph has low diameter (`O(log n)`), so **greedy routing** — repeatedly hop to whichever neighbor is closest to the query — converges to a near-neighbor in `O(log n)` steps *on average*, without ever scanning the whole set.

> 💡 **Why greedy routing works.** Long-range links let early hops cover large distances (like taking a highway); short-range links let late hops refine locally (like the last few streets). Without long-range links, greedy descent would crawl neighbor-by-neighbor — `O(n)`. Without short-range links, it couldn't pinpoint the true neighbor. HNSW's neighbor-selection heuristic deliberately keeps *both*.

### 2.2 The hierarchy

A single NSW graph works, but its greedy search still occasionally takes many refinement hops. HNSW adds a **hierarchy of layers**, inspired by skip lists (see [skip lists](/docs/probabilistic-structures)):

```
Layer 2:   A ─────────────────── H          (sparse: only a few nodes, long links)
Layer 1:   A ───── D ─────── F ── H          (medium density)
Layer 0:   A─B─C─D─E─F─G─H  (all nodes, dense short links)   ← the full graph
```

- **Every vector lives in layer 0.** Each higher layer contains a geometrically shrinking random subset (a node's top layer is drawn from `⌊−ln(unif(0,1)) · mL⌋`, where `mL ≈ 1/ln(M)`).
- **Search descends the hierarchy:** start at the single entry point in the top layer, greedily route to the local minimum, drop down a layer, repeat — using each layer's local minimum as the next layer's entry point. Only the bottom layer does the fine-grained search.

The hierarchy is exactly the **skip-list idea applied to a proximity graph**: sparse upper "express lanes" for long jumps, a dense bottom layer for precision. This is what turns NSW's occasionally-linear refinement into a reliable `O(log n)`.

### 2.3 Interactive: greedy descent (educational)

The **[interactive HNSW demo](/viz-demos)** (select "HNSW Greedy Search") and the **[practice page](/docs/hnsw-deep-dive-practice)** animate the **greedy best-first descent** that powers HNSW's per-layer search: from an entry node, always hop to the neighbor closest to the query (🔍), stopping at a local minimum. Node labels show each node's distance to the query; the active edge is the hop being taken.

> ⚠️ **The animation shows one layer's greedy routing only** — a real HNSW search repeats this across layers and maintains an `efSearch`-sized candidate set (a bounded priority queue) rather than a single current node, so it can recover from local minima. See §5 for the real search algorithm.

---

## 3. Insertion

Building the index inserts vectors one at a time. Inserting vector `q`:

1. **Draw `q`'s top layer** `ℓ` from the exponential distribution above. `q` will exist in layers `0…ℓ`.
2. **Descend from the global entry point** through layers `> ℓ` using plain greedy search (ef = 1), to find a good entry point for the layers where `q` will be inserted.
3. **For each layer from `ℓ` down to `0`:** run a search with breadth `efConstruction` to collect candidate neighbors, then **select up to `M` of them** using the neighbor-selection heuristic and add bidirectional links.
4. **Prune over-connected nodes:** if adding `q` pushed a neighbor above its link budget (`M`, or `Mmax0 = 2M` on layer 0), re-run the selection heuristic to keep only its best `M` links.
5. If `ℓ` exceeds the current top layer, `q` becomes the new global entry point.

> 💡 **The neighbor-selection heuristic is the secret sauce.** Naively linking to the `M` *closest* candidates creates clusters with poor global connectivity. HNSW's heuristic (Algorithm 4 in the paper) prefers a *diverse* set: it keeps a candidate only if it is closer to `q` than to any already-selected neighbor. This preserves the long-range links that make greedy routing logarithmic. Skipping this heuristic is the most common way an educational implementation silently gets bad recall.

**Construction complexity:** inserting `n` points is `O(n · efConstruction · M · log n)` expected — each insert does a `log n`-layer descent, and per layer collects `efConstruction` candidates and links `M` of them. Build is the expensive phase; it is done once (or incrementally).

---

## 4. The three dials

HNSW exposes exactly three knobs. Understanding what each trades is the entire art of tuning it.

| Parameter | When | Controls | Higher value → |
|---|---|---|---|
| **`M`** | build | links per node (graph degree) | better recall, **more memory**, slower build |
| **`efConstruction`** | build | candidate-list size during insertion | better graph quality (recall), slower build |
| **`efSearch`** | query | candidate-list size during search | **higher recall, higher latency** |

### 4.1 `M` — connectivity and memory

`M` is the number of bidirectional links per node per layer (layer 0 allows `2M`). It is the **dominant memory term**: each link is an integer id, so the graph overhead is roughly `n · M · 2 · (bytes per id)` on top of the raw vectors. Typical `M` is 8–48; 16 is a common default.

- Higher `M` → denser graph → more paths → higher recall, but linearly more memory and slower build.
- `M` is **fixed at build time** — changing it requires a full rebuild.

### 4.2 `efConstruction` — build-time quality

`efConstruction` is the size of the dynamic candidate list explored when inserting each node. Larger values find better neighbors (higher final recall) at the cost of slower construction. Typical 100–400. Like `M`, it is immutable after build.

### 4.3 `efSearch` — the query-time recall/latency dial

`efSearch` (often just `ef`) is the size of the bounded priority queue maintained during a query. **This is the only dial you can change at query time**, and it is the recall↔latency lever:

- Larger `efSearch` → the search keeps more candidates alive → explores more of the graph → higher recall, higher latency.
- `efSearch ≥ k` is required (you can't return `k` results from a smaller candidate set).

> 💡 **Practical tuning recipe.** Fix `M` and `efConstruction` for your recall/RAM budget at build time. Then, at query time, **sweep `efSearch`** and plot recall@k vs. QPS — this traces the Pareto curve. Pick the smallest `efSearch` that meets your recall SLA; that minimizes latency. The public benchmark for these curves is [ann-benchmarks](http://ann-benchmarks.com) (Aumüller et al., 2020).

---

## 5. Greedy search, precisely

The real per-layer search is a bounded best-first search (not the single-current-node greedy of the visualization):

```
SEARCH_LAYER(q, entry_points, ef, layer):
    visited   ← set(entry_points)
    candidates ← min-heap of (dist(e, q), e) for e in entry_points   # frontier, by distance
    results    ← max-heap of (dist(e, q), e) for e in entry_points   # best ef found so far
    while candidates not empty:
        c ← extract-min(candidates)          # closest unexplored candidate
        f ← max(results)                     # current worst kept result
        if dist(c, q) > dist(f, q): break    # can't improve → stop
        for e in neighbors(c, layer):
            if e not in visited:
                visited.add(e)
                f ← max(results)
                if dist(e, q) < dist(f, q) or len(results) < ef:
                    push(candidates, e); push(results, e)
                    if len(results) > ef: pop-max(results)   # keep only ef best
    return results
```

Note the **two heaps**: a min-heap frontier (which candidate to explore next — the closest) and a max-heap of the best `ef` results (so we can cheaply drop the worst). This is precisely the [heap](/docs/heaps-and-priority-queues)-driven top-k pattern applied to graph search — the same "size-k heap" structure behind [beam search](/docs/beam-search) and [top-k sampling](/docs/sampling-decoding).

The full query runs `SEARCH_LAYER` with `ef=1` down the upper layers (fast routing), then `ef=efSearch` on layer 0 (accurate refinement), and returns the `k` closest from the final result set.

**Query complexity:** `O(efSearch · M · log n)` expected distance computations — `log n` layers, and on layer 0 the bounded search touches `O(efSearch · M)` nodes.

---

## 6. Trade-offs at a glance

| Dimension | HNSW characteristic |
|---|---|
| **Build time** | `O(n · efConstruction · M · log n)` — expensive; done once |
| **Query time** | `O(efSearch · M · log n)` distance computations — fast, tunable |
| **Memory** | raw vectors + `≈ n · M · 2` link ids — the `M` term is significant |
| **Recall** | very high (95–99%+) achievable; tuned via `efSearch` |
| **Updates** | inserts are cheap and incremental; **deletes are hard** (see §7) |
| **Best for** | in-memory, high-recall, latency-sensitive vector search |

---

## 7. Production considerations

- **Memory is the binding constraint.** HNSW keeps the full graph *and* full-precision vectors in RAM. At `n = 100M`, `d = 768` (float32), the vectors alone are ~300 GB before the `n·M` link overhead. Production systems either shard across machines or combine HNSW routing with **[Product Quantization](/docs/ann-search)** compression (`HNSW+PQ`) to shrink the vector store — trading a little recall for a large memory win.
- **Deletes are the Achilles heel.** Removing a node can disconnect the graph (it may have been a bridge). Most systems use **tombstoning** (mark deleted, skip at query time) and periodically **rebuild** the index. Plan for rebuilds in your operational model; HNSW is not a good fit for extremely high-churn corpora.
- **Sharding is awkward.** Unlike [IVF](/docs/ann-search) (whose inverted lists shard trivially), HNSW's graph doesn't partition cleanly — a shortest path may cross shards. Common practice: replicate the whole index per shard by *data* partition and scatter-gather queries, accepting duplicated RAM.
- **Filtered search degrades.** "Find nearest neighbors *where category = X*" can strand the greedy walk in a region with no matching nodes. Approaches: pre-filter then brute-force (if the filtered set is small), post-filter (over-fetch then drop non-matches — hurts recall if the filter is selective), or specialized filtered-HNSW variants (ACORN, filtered-DiskANN).
- **Concurrency.** Production HNSW needs careful locking (or lock-free link updates) for concurrent insert/query; the reference implementation `hnswlib` uses per-node locks. Reads scale well; writes serialize on hot nodes.
- **Cache locality & SIMD.** The bottleneck is distance computation. Real implementations store vectors in a cache-friendly layout and use SIMD (AVX / NEON) dot-product kernels; the graph traversal's random memory access pattern is the other cost. `DiskANN` (Subramanya et al., 2019) adapts the idea to SSD-resident graphs for billion-scale corpora.
- **Approximate vs exact.** HNSW never guarantees the true nearest neighbor. If exactness is mandatory (e.g. legal dedup), use brute force or HNSW as a *candidate generator* followed by exact **reranking** of the shortlist with full-precision distances.

---

## 8. When to use HNSW (and when not)

**Use HNSW when:** you need high recall at low latency, the index fits in RAM (or RAM + PQ), the corpus is relatively static or slow-churn, and you can afford a build phase. This is the default for most semantic-search / RAG retrieval.

**Prefer alternatives when:** memory is the hard constraint and the corpus is huge → **IVF-PQ** (much smaller, shards easily); the corpus changes constantly with many deletes → a rebuild-friendly IVF or a fresh index; you need billion-scale on limited RAM → **DiskANN** (SSD-resident); the corpus is tiny (≲10⁴) → brute force (simpler, exact).

---

## 9. Educational implementation note

A faithful-but-simplified HNSW (single layer, greedy routing) is the visualization builder in this repo (`src/components/viz/algorithms/hnsw.ts`). It demonstrates greedy descent over a proximity graph. It **omits** the hierarchy build, the neighbor-selection heuristic, the `efSearch` beam, deletion handling, and SIMD kernels. For production, use a maintained library: **`hnswlib`** (reference), **FAISS** (`IndexHNSWFlat`, `IndexHNSWPQ`), **Qdrant**, **Weaviate**, **Milvus**, **pgvector**, or **Lucene** — never a from-scratch implementation.

---

## References

- Malkov, Y. A., & Yashunin, D. A. (2016/2018). *Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs.* IEEE TPAMI. — the HNSW paper (Algorithms 1–5: insertion, search-layer, and the neighbor-selection heuristic).
- Malkov, Y., Ponomarenko, A., Logvinov, A., & Krylov, V. (2014). *Approximate nearest neighbor algorithm based on navigable small world graphs.* Information Systems. — the NSW precursor.
- Subramanya, S. J., et al. (2019). *DiskANN: Fast Accurate Billion-point Nearest Neighbor Search on a Single Node.* NeurIPS. — SSD-resident graph index.
- Aumüller, M., Bernhardsson, E., & Faithfull, A. (2020). *ANN-Benchmarks.* Information Systems. — the standard recall-vs-QPS benchmark methodology ([ann-benchmarks.com](http://ann-benchmarks.com)).
- `hnswlib` — the reference C++/Python implementation by the HNSW authors.

---

## Related Guides

**Prerequisites:** [Approximate Nearest Neighbor Search](/docs/ann-search) · [Graph Theory](/docs/graph-theory)  
**See also:** [KD-Trees & Ball-Trees](/docs/kd-trees-ball-trees) · [Skip Lists (Probabilistic Structures)](/docs/probabilistic-structures) · [Heaps & Priority Queues](/docs/heaps-and-priority-queues) · [AI Systems Benchmarks](/docs/ai-systems-benchmarks)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
