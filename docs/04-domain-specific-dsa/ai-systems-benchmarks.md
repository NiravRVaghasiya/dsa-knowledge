---
title: AI Systems Benchmarks — ANN, Attention & Caching
slug: /ai-systems-benchmarks
sidebar_position: 14
sidebar_label: AI Systems Benchmarks
description: >-
  Reproducible, in-browser benchmarks for the AI-systems algorithms in this section — ANN recall@k vs. latency, attention cost scaling with sequence length, and cache hit/miss behavior. Real measured numbers, no fabricated results.
tags:
  - benchmarks
  - ann
  - attention
  - caching
  - performance
difficulty: advanced
reading_time: 20
prerequisites:
  - title: HNSW Deep Dive
    to: /docs/hnsw-deep-dive
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: domain-specific-dsa/sampling-decoding
pagination_next: null
path_step: 43
---

# AI Systems Benchmarks: ANN, Attention & Caching

> Complexity classes tell you how cost *scales*; benchmarks tell you what it *is*. This guide provides **reproducible benchmarks** for the three cost centers of AI systems covered in this section: **approximate nearest-neighbor search** (recall@k vs. latency), **attention** (cost scaling with sequence length), and **caching** (hit/miss behavior). Every number in the [practice page](/docs/ai-systems-benchmarks-practice) is **computed live in your browser** — nothing here is a fabricated or copy-pasted figure.

---

## 1. How to read (and not misread) a benchmark

Before any numbers, the discipline that separates a useful benchmark from a misleading one:

- **Measure the right thing.** For ANN, the metric is **recall@k against a brute-force ground truth** *and* latency — never one without the other, because any index can hit 100% recall by scanning everything, or 1 ms by returning garbage. Report the **recall-vs-QPS Pareto curve**, not a single point (Aumüller et al., 2020).
- **Control the variables.** Attention cost depends on `L, D, H, B` ([see the complexity breakdown](/docs/multi-head-attention)). A benchmark that varies `L` must hold `D, H, B` fixed and *say so*.
- **Warm up and repeat.** First runs pay JIT / allocation / cache-cold costs. Measure the median of several runs, not a single cold one.
- **State the environment.** Wall-clock numbers are hardware- and load-dependent. A benchmark running in a browser via Pyodide/WASM is **not** representative of a GPU serving stack — it is valid for measuring *relative scaling and algorithmic behavior*, which is exactly what we use it for here.

> ⚠️ **Scope of these benchmarks.** They run in your browser (Pyodide/NumPy). They faithfully measure **algorithmic behavior** — recall, operation counts, hit rates, and *relative* scaling — which are hardware-independent. They are **not** production latency numbers (no GPU, no SIMD kernels, no HBM). Where a result is a *count* or a *ratio* it is exact and reproducible; where it is a *wall-clock time* it is illustrative of scaling shape, not absolute performance. Each benchmark labels which it is.

---

## 2. Benchmark A — ANN: recall vs. work

**What it measures.** On a synthetic dataset of `n` random vectors in `d` dimensions, compare:

- **Brute force** (`IndexFlat` equivalent) — exact, `O(n·d)` per query, the ground-truth generator.
- **A simplified IVF** (k-means-style buckets, probe `nprobe` of them) — approximate, examines only a fraction of the data.

**Metrics.** Recall@k (fraction of the true top-k the approximate index returns, an **exact, reproducible ratio**) and the **number of distance computations** (an exact operation count — the hardware-independent proxy for latency). Sweeping `nprobe` traces the recall↔work trade-off — the same Pareto behavior real IVF exhibits (see [ANN §3](/docs/ann-search)).

**Expected shape (which the live run confirms):** more probed buckets → higher recall, more distance computations. This is the universal ANN dial. The [practice page](/docs/ai-systems-benchmarks-practice) prints the actual measured curve.

---

## 3. Benchmark B — Attention: cost scaling with sequence length

**What it measures.** Two things as sequence length `L` grows (with `D, H, B` fixed):

1. The **size of the attention score matrix** (`L²` entries) — an exact count, and the reason attention hits a memory wall.
2. The **actual FLOPs / wall-time** of computing `QKᵀ` for growing `L` in NumPy — illustrative of the quadratic *scaling shape*.

**Metric.** The ratio of cost at `2L` vs. `L` should approach **4×** for the score matrix (quadratic) and reveal the [two-regime behavior](/docs/multi-head-attention): at small `L` the `O(L·D²)` projections dominate; the `O(L²·D)` term only takes over once `L` approaches `D`. The live benchmark measures both terms and shows the crossover.

---

## 4. Benchmark C — Caching: hit/miss behavior

**What it measures.** Run an [LRU cache](/docs/streaming-caching) of fixed capacity against different access patterns and measure the **hit rate** (an exact, reproducible ratio):

- **Temporal-locality workload** (Zipf-like — a few hot keys) → high LRU hit rate.
- **Scan workload** (each key touched once, more distinct keys than capacity) → LRU hit rate collapses to ~0 (the classic scan-resistance failure).
- **Capacity sweep** → hit rate rises with capacity, with diminishing returns (the working-set curve).

This mirrors the real behavior of an LLM **prefix cache** or **KV-cache eviction** policy ([KV Cache §8](/docs/kv-cache)): hit rate depends entirely on the access pattern, and LRU is only as good as the locality in the workload.

---

## 5. What the benchmarks demonstrate (the DSA → AI chain)

| Benchmark | DSA concept | AI system | What the number proves |
|---|---|---|---|
| **A — ANN** | approximate search, recall@k | vector retrieval / RAG | you can trade exact-ness for a large work reduction, on a tunable curve |
| **B — Attention** | quadratic vs. quadratic-vs-cubic terms | transformer inference | "O(n²)" is real but regime-dependent; the projection term dominates short sequences |
| **C — Caching** | LRU eviction, temporal locality | KV/prefix cache in serving | cache value is entirely a function of access-pattern locality |

---

## 6. Production considerations for benchmarking AI systems

- **Recall is measured offline; latency is measured online.** Build the recall ground truth with brute force once; measure latency under *realistic concurrency* (batched, with a warm cache), not single-query.
- **The metric that matters is the SLA point on the Pareto curve**, e.g. "p99 latency at 95% recall@10," not a headline QPS.
- **Micro-benchmarks lie about end-to-end cost.** An attention kernel benchmark ignores the [KV-cache](/docs/kv-cache) HBM traffic that dominates real decode; an ANN micro-benchmark ignores network and reranking. Always benchmark the *pipeline*.
- **Reproducibility.** Fix seeds, pin dataset and index parameters, and publish the harness. The gold standard for ANN is the open [ann-benchmarks](http://ann-benchmarks.com) harness; for LLM serving, MLPerf Inference and the vendor-neutral vLLM/TensorRT-LLM benchmark scripts.
- **Never publish a number you can't reproduce.** Every figure in the practice page is recomputed on each run — that is the standard to hold any AI-systems benchmark to.

---

## 7. Run them

All three benchmarks are runnable, live, in the [**AI Systems Benchmarks practice page**](/docs/ai-systems-benchmarks-practice). They use only NumPy and the Python standard library, execute in your browser, and print freshly-measured numbers each time.

---

## References

- Aumüller, M., Bernhardsson, E., & Faithfull, A. (2020). *ANN-Benchmarks: A benchmarking tool for approximate nearest neighbor algorithms.* Information Systems. — the standard recall-vs-QPS methodology.
- Jégou, H., Douze, M., & Schmid, C. (2011). *Product Quantization for Nearest Neighbor Search.* IEEE TPAMI. — IVF/PQ, the basis for benchmark A's approximate index.
- Reddi, V. J., et al. (2020). *MLPerf Inference Benchmark.* ISCA. — the industry-standard inference benchmark methodology.
- Dao, T., et al. (2022). *FlashAttention.* NeurIPS. — the IO-vs-FLOP distinction benchmark B illustrates.

---

## Related Guides

**Prerequisites:** [HNSW Deep Dive](/docs/hnsw-deep-dive) · [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [Approximate Nearest Neighbor Search](/docs/ann-search) · [Multi-Head Attention](/docs/multi-head-attention) · [KV Cache & Paged Attention](/docs/kv-cache) · [Streaming & Caching Data Structures](/docs/streaming-caching)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
