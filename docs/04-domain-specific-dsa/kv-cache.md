---
title: KV Cache & Paged Attention
slug: /kv-cache
sidebar_position: 12
sidebar_label: KV Cache & Paged Attention
description: >-
  Why autoregressive decoding repeats work, what K/V tensors are, how the cache grows, its memory/latency/batching implications, and how PagedAttention (vLLM) manages it like an OS virtual-memory system.
tags:
  - kv-cache
  - paged-attention
  - inference
  - llm
  - memory
difficulty: advanced
reading_time: 26
prerequisites:
  - title: Multi-Head Attention — MHA, MQA, GQA & FlashAttention
    to: /docs/multi-head-attention
  - title: Streaming & Caching Data Structures
    to: /docs/streaming-caching
pagination_prev: domain-specific-dsa/multi-head-attention
pagination_next: domain-specific-dsa/sampling-decoding
path_step: 41
---

# KV Cache & Paged Attention

> The single most important data structure in LLM *inference* is not a model weight — it's the **KV cache**. It's why generation is fast, why it's memory-hungry, why batch size is limited, and why serving systems look like miniature operating systems. This guide explains the cache from the algorithm up: why decoding repeats work, what gets cached, how the cache grows, and how **PagedAttention** (Kwon et al., 2023 — the vLLM paper) manages it with OS-style paging.

Builds directly on [Multi-Head Attention](/docs/multi-head-attention) (what K and V are) and connects to [caching data structures](/docs/streaming-caching) (how it's managed).

---

## 1. Why autoregressive decoding repeats work

An LLM generates one token at a time. To produce token `t+1`, a naïve implementation re-runs the model over the *entire* sequence `[1..t]`:

```
step 1: attend over [1]                → token 2
step 2: attend over [1,2]              → token 3
step 3: attend over [1,2,3]            → token 4
...
step t: attend over [1,2,...,t]        → token t+1
```

Each step recomputes the keys and values of *every* previous token. Over `T` steps that's `1 + 2 + … + T = O(T²)` redundant key/value projections — quadratic wasted work.

**The key observation (enabled by causal masking):** in a causal decoder, token `i`'s key and value depend only on tokens `≤ i`, which **never change** once generated. So a token's `K` and `V` are computed *once* and are valid forever. Cache them.

---

## 2. What the KV cache stores

Recall from [attention](/docs/multi-head-attention): for each token we compute a query `Q`, key `K`, and value `V`. During decoding:

- The **query** is needed only for the *current* token (it attends to the past).
- The **keys and values** of *all past tokens* are needed at *every* future step (the current query dots against every past key, then weights every past value).

So the cache stores, **per layer, per attention head, per token**: the key vector and the value vector. With the [KV cache](/docs/multi-head-attention), decoding step `t` becomes:

1. Project only the **one new token** → its `Q, K, V` (`O(D²)` work, not `O(t·D²)`).
2. **Append** its `K, V` to the cache.
3. Attend: dot the new query against all `t` cached keys, weight all `t` cached values (`O(t·D)` work).

Redundant recomputation is gone. The [interactive KV-cache visualization](/viz-demos) (and the [practice page](/docs/kv-cache-practice)) show the cache filling one row per step.

---

## 3. Cache growth & memory complexity

The cache grows **linearly** with the number of generated tokens. Its total size:

$$
\text{KV cache bytes} = 2 \times B \times L \times n_{\text{layers}} \times n_{kv} \times d_k \times \text{bytes\_per\_elem}
$$

where the `2` is for K *and* V, `B` = batch size, `L` = sequence length, `n_kv` = number of **key/value heads** (this is where [MQA/GQA](/docs/multi-head-attention) cut cost — `n_kv < H`), `d_k = D/H`.

**Worked example (Llama-2-13B-style, MHA, fp16):**
- `n_layers = 40`, `H = n_kv = 40`, `d_k = 128` (so `D = 5120`), 2 bytes/elem.
- Per token, per sequence: `2 × 40 × 40 × 128 × 2 ≈ 1.6 MB`.
- A 4,096-token context: `≈ 6.4 GB` for **one** sequence's cache — comparable to a big chunk of the model weights, for a *single* request.
- With **GQA** at `n_kv = 8` instead of 40: the cache shrinks 5× to `≈ 1.3 GB`. This is why every modern long-context model uses GQA.

> 💡 **The memory hierarchy shift.** For a *short* prompt, model weights dominate GPU memory. As context and batch grow, **the KV cache overtakes the weights** and becomes the binding constraint on how many requests you can serve concurrently.

---

## 4. Latency implications

Decoding has two distinct phases with different bottlenecks:

| Phase | What happens | Bottleneck |
|---|---|---|
| **Prefill** | process the whole prompt in one forward pass | **compute-bound** (quadratic in prompt length — see [attention complexity](/docs/multi-head-attention)) |
| **Decode** | generate one token at a time, reading the cache | **memory-bandwidth-bound** |

**Why decode is bandwidth-bound:** each step does very little arithmetic (one token) but must **read the entire KV cache from HBM** to attend against it. At `L = 4096` and a multi-GB cache, streaming that cache dominates the step time. This is the crucial insight behind [MQA/GQA](/docs/multi-head-attention): shrinking the cache directly shrinks the HBM traffic per step, so **halving KV size roughly halves decode latency** — a bigger win than any FLOP optimization during decode.

---

## 5. Batching implications

Serving throughput = tokens/sec across all concurrent requests. To batch requests together (amortizing weight loads), you must fit *all their KV caches* in memory simultaneously:

$$
\text{max batch size} \approx \frac{\text{HBM available for cache}}{\text{KV bytes per sequence}}
$$

So **KV-cache size directly caps concurrency**. Two problems make naïve batching wasteful:

1. **Variable lengths.** Requests finish at different times; a static batch either pads to the max length (wasting cache) or stalls waiting for the slowest.
2. **Fragmentation.** Pre-allocating a contiguous cache buffer sized for `max_length` per request wastes memory for requests that generate fewer tokens — internal fragmentation of up to 60–80% was measured in pre-vLLM systems (Kwon et al., 2023).

**Continuous batching** (a.k.a. in-flight batching) solves #1: finished sequences are evicted and new ones admitted *every step*, keeping the batch full. **PagedAttention** solves #2.

---

## 6. PagedAttention — the OS analogy

PagedAttention (vLLM) borrows **virtual memory paging** from operating systems and applies it to the KV cache:

- The KV cache is split into fixed-size **blocks** (pages), each holding the K/V for a fixed number of tokens (e.g. 16).
- A per-sequence **block table** maps logical token positions → physical block ids (exactly like an OS page table maps virtual → physical pages).
- Blocks are allocated **on demand** as a sequence grows, from a shared pool — so a sequence uses only as many blocks as it needs (no pre-allocation to `max_length`).

**What this buys:**

- **Near-zero fragmentation.** Memory is allocated in small blocks, not one giant contiguous buffer per request → measured 2–4× throughput gains from fitting more concurrent sequences.
- **Copy-on-write sharing.** Sequences with a **shared prefix** (the same system prompt, or beam-search branches, or parallel samples) can *share* the physical blocks of that prefix, allocating new blocks only when they diverge — a direct analog of OS copy-on-write. This makes [beam search](/docs/beam-search) and parallel sampling far cheaper.

> 💡 **The data-structure lineage.** A block table is a **[hash map / array index](/docs/hash-maps-and-sets)** (logical→physical). The free-block pool is a **free list**. Prefix sharing is **copy-on-write** with reference counting. Eviction under pressure is a **[cache eviction policy](/docs/streaming-caching)** (LRU-like). PagedAttention is classic OS memory management, re-skinned for attention tensors.

---

## 7. Cache growth visualization

The [interactive demo](/viz-demos) (select "KV Cache Growth") and the [practice page](/docs/kv-cache-practice) animate the cache filling one row per generated token — the linear `O(L·D)` growth that replaces `O(L²)` recomputation.

---

## 8. Production considerations

- **Memory is the serving constraint.** Model weights are fixed; the KV cache scales with `B·L`. Capacity planning for an inference cluster is largely KV-cache-memory planning. Tools: GQA/MQA (smaller cache), quantized KV cache (int8/fp8 K,V — trades a little quality for ~2× more concurrency), and paging.
- **Prefix caching.** Cache the KV of common prompt prefixes (system prompts, few-shot examples, RAG documents) across requests so prefill is skipped — a huge latency win for repeated prefixes. vLLM's automatic prefix caching and SGLang's RadixAttention (a [trie](/docs/tries) over cached prefixes) implement this.
- **Eviction & scheduling.** Under memory pressure, a scheduler must decide which sequences to **preempt** (evict their cache, recompute later) — an [eviction policy](/docs/streaming-caching) problem. vLLM can swap blocks to CPU RAM or recompute.
- **Sliding-window attention** (Mistral, StreamingLLM) bounds the cache to the last `w` tokens, making cache memory `O(w)` instead of `O(L)` — trading unbounded context for constant memory. This is a [ring buffer](/docs/streaming-caching) over the KV cache.
- **Quantization.** KV-cache quantization (e.g. KVQuant, fp8 KV) is one of the highest-ROI inference optimizations because the cache is bandwidth-bound — smaller elements mean less HBM traffic *and* more concurrency.
- **Distributed/tensor parallelism.** With multi-GPU tensor parallelism, the KV cache is sharded across GPUs by head; paging must coordinate across devices.

---

## 9. Summary — the DSA → AI chain

| Layer | Concept |
|---|---|
| **DSA concept** | caching / memoization — never recompute an immutable result |
| **Algorithm** | append-only per-token K,V store; attend against all cached rows |
| **Complexity** | `O(L·D)` memory replaces `O(L²)` recomputation; decode step `O(L·D)` |
| **AI system** | the KV cache is the core of every LLM inference server |
| **Production trade-off** | cache size caps batch/concurrency; GQA/paging/quantization/prefix-sharing manage it |

---

## References

- Kwon, W., et al. (2023). *Efficient Memory Management for Large Language Model Serving with PagedAttention.* SOSP. — the vLLM paper.
- Pope, R., et al. (2022). *Efficiently Scaling Transformer Inference.* arXiv. — prefill/decode analysis, MQA for inference.
- Shazeer, N. (2019). *Fast Transformer Decoding: One Write-Head is All You Need.* arXiv. — MQA, motivated by KV-cache bandwidth.
- Zheng, L., et al. (2024). *SGLang: Efficient Execution of Structured Language Model Programs.* — RadixAttention prefix sharing.
- Xiao, G., et al. (2023). *Efficient Streaming Language Models with Attention Sinks (StreamingLLM).* ICLR. — sliding-window / bounded KV cache.

---

## Related Guides

**Prerequisites:** [Multi-Head Attention](/docs/multi-head-attention) · [Streaming & Caching Data Structures](/docs/streaming-caching)  
**See also:** [Sampling & Search Decoding](/docs/sampling-decoding) · [Beam Search & Constrained Decoding](/docs/beam-search) · [AI Systems Benchmarks](/docs/ai-systems-benchmarks)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
