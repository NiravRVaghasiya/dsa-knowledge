---
title: Multi-Head Attention — MHA, MQA, GQA & FlashAttention
slug: /multi-head-attention
sidebar_position: 11
sidebar_label: Multi-Head Attention (MHA/MQA/GQA)
description: >-
  Attention from first principles — Q/K/V, scaling, softmax, causal masking — with complexity analyzed in L, D, H, and B, then the KV-reduction variants (MQA, GQA) and the IO-aware FlashAttention.
tags:
  - attention
  - transformers
  - multi-head
  - flashattention
  - llm
difficulty: advanced
reading_time: 30
prerequisites:
  - title: Matrix Ops, Attention O(n²) & Sparse Formats
    to: /docs/matrix-ops-attention-sparse
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: domain-specific-dsa/hnsw-deep-dive
pagination_next: domain-specific-dsa/kv-cache
path_step: 40
---

# Multi-Head Attention: MHA, MQA, GQA & FlashAttention

> [Matrix Ops & Attention](/docs/matrix-ops-attention-sparse) established *why* attention is `O(n²)` in sequence length. This guide builds attention **from first principles** (Q/K/V → scaled dot products → softmax → weighted values), then analyzes cost **honestly across all four variables** — sequence length `L`, model dimension `D`, head count `H`, and batch size `B` — rather than collapsing everything into a misleading single-variable `O(n)`. It then covers the variants that dominate modern LLM inference: **Multi-Query Attention (MQA)**, **Grouped-Query Attention (GQA)**, and the IO-aware **FlashAttention**.

---

## 1. Attention from first principles

### 1.1 The problem attention solves

Each token in a sequence needs to gather information from other tokens. Attention lets every token compute a **weighted average of all tokens' value vectors**, where the weights are how "relevant" each other token is. Relevance is measured by a dot product between a token's **query** and every token's **key**.

### 1.2 Q, K, V

Given input `X ∈ ℝ^{L×D}` (`L` tokens, each a `D`-dim vector), three learned projections produce:

$$
Q = X W_Q,\quad K = X W_K,\quad V = X W_V, \qquad W_Q, W_K, W_V \in \mathbb{R}^{D \times d_k}
$$

- **Query** `Q ∈ ℝ^{L×d_k}` — "what am I looking for?"
- **Key** `K ∈ ℝ^{L×d_k}` — "what do I offer?"
- **Value** `V ∈ ℝ^{L×d_v}` — "what I actually contribute if attended to."

### 1.3 Scaled dot-product attention

$$
\mathrm{Attention}(Q,K,V) = \underbrace{\mathrm{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d_k}}\right)}_{\text{attention weights } A \in \mathbb{R}^{L\times L}} V
$$

Step by step:

1. **Scores** `S = QKᵀ ∈ ℝ^{L×L}` — every query dotted with every key. `S[i][j]` = relevance of token `j` to token `i`.
2. **Scale** by `1/√d_k`. Without this, dot products of `d_k`-dim vectors grow like `√d_k`, pushing softmax into saturated regions where gradients vanish (Vaswani et al., 2017, §3.2.1).
3. **Softmax** each row → attention weights `A ∈ ℝ^{L×L}`, each row summing to 1 (a probability distribution over which tokens to attend to).
4. **Weighted sum** `A·V ∈ ℝ^{L×d_v}` — each token's output is the `A`-weighted average of all value vectors.

> 💡 **The `L×L` score matrix is the whole story.** Its size — quadratic in sequence length — is *why* attention memory and compute scale as `O(L²)`. Everything about long-context efficiency (FlashAttention, sparse attention, sliding windows) is an attack on materializing or scaling that matrix. See [Matrix Ops §2](/docs/matrix-ops-attention-sparse) for the FLOP-level derivation.

### 1.4 Causal masking

In a decoder (autoregressive LM), token `i` may only attend to tokens `≤ i` — it cannot see the future. This is enforced by adding a **causal mask** to the scores *before* softmax: set `S[i][j] = −∞` for `j > i`, so `softmax` assigns those positions weight 0.

$$
S_{ij} \leftarrow \begin{cases} S_{ij} & j \le i \\ -\infty & j > i \end{cases}
$$

The mask is a fixed upper-triangular pattern; it doesn't change the asymptotic cost (still `O(L²)`) but halves the *effective* work, and it is what makes the [KV cache](/docs/kv-cache) valid (past keys/values never change).

---

## 2. Complexity — honestly, in L, D, H, B

Collapsing attention to "`O(n²)`" hides three other variables that matter enormously in practice. Let:

- **`L`** = sequence length, **`D`** = model dimension, **`H`** = number of heads, **`B`** = batch size.
- Per-head dimension `d_k = d_v = D/H` (the standard convention: heads split the model dimension).

### 2.1 Single head

| Step | Time (FLOPs) | Memory (activations) |
|---|---|---|
| `Q,K,V` projections | `O(L·D·d_k)` = `O(L·D²/H)` per head | `O(L·d_k)` |
| Scores `QKᵀ` | `O(L²·d_k)` | **`O(L²)`** (the score matrix) |
| Softmax | `O(L²)` | `O(L²)` |
| `A·V` | `O(L²·d_v)` | `O(L·d_v)` |

### 2.2 Multi-head, batched

Summing over `H` heads and `B` batch elements, with `d_k = D/H`:

$$
\text{Time} = O\!\big(\underbrace{B \cdot L \cdot D^2}_{\text{Q,K,V,O projections}} + \underbrace{B \cdot H \cdot L^2 \cdot (D/H)}_{\text{scores + }AV}\big) = O\!\big(B\,L\,D^2 + B\,L^2\,D\big)
$$

$$
\text{Attention-matrix memory} = O(B \cdot H \cdot L^2)
$$

**Read this carefully — it is the honest picture:**

- **Two regimes.** For **short sequences** (`L ≪ D`), the `B·L·D²` **projection term dominates** — attention is compute-bound on matrix multiplies, and the `L²` term is negligible. For **long sequences** (`L ≳ D`), the `B·L²·D` **score/`AV` term dominates** — this is the famous quadratic wall.
- **`H` cancels in FLOPs** (heads split `D`, so `H · L² · (D/H) = L²·D`) — more heads does **not** change attention FLOPs. But `H` **does** appear in the *attention-matrix memory* `O(B·H·L²)`: each head keeps its own `L×L` matrix.
- **`B` is a pure multiplier** on everything — batching amortizes weight loads but scales activation memory linearly.
- **`D²` in the projections** is why model dimension is expensive: doubling `D` quadruples projection cost.

> ⚠️ **Why "`O(n²)`" alone is misleading.** A 512-token prompt through a `D=4096` model is *not* quadratic-bound — its cost is dominated by the `L·D²` projections. The quadratic term only takes over once `L` approaches or exceeds `D`. Reporting attention cost requires naming which regime you're in.

### 2.3 The KV-cache angle (foreshadowing)

During autoregressive *decoding*, `L` grows one token at a time and past `K,V` are reused via the [KV cache](/docs/kv-cache). The per-step cost becomes `O(B·D² + B·L·D)` (project one new token, attend it to `L` cached keys), and the **binding constraint shifts from compute to KV-cache memory** — `O(B·L·H·d_k) = O(B·L·D)` per layer. This is precisely what MQA and GQA (below) attack.

---

## 3. Multi-Head Attention (MHA)

Instead of one attention with dimension `D`, MHA runs `H` **parallel heads**, each with its own `W_Q^h, W_K^h, W_V^h ∈ ℝ^{D×(D/H)}`, concatenates their outputs, and projects with `W_O ∈ ℝ^{D×D}`:

$$
\mathrm{MHA}(X) = \mathrm{Concat}(\text{head}_1, \dots, \text{head}_H)\,W_O, \quad \text{head}_h = \mathrm{Attention}(XW_Q^h, XW_K^h, XW_V^h)
$$

**Why multiple heads?** Each head can specialize in a different relationship (syntax, coreference, position). Empirically, `H` heads of dimension `D/H` outperform one head of dimension `D` at the same parameter count (Vaswani et al., 2017).

**The MHA inference problem:** every head has its *own* keys and values, so the KV cache stores `H · L · d_k = L · D` values per layer per sequence. At long context and large batch, **the KV cache — not the weights — dominates GPU memory**, and reading it from HBM dominates *decode latency* (decoding is memory-bandwidth-bound). MQA and GQA exist to shrink exactly this.

---

## 4. Multi-Query Attention (MQA)

**MQA** (Shazeer, 2019) keeps `H` separate **query** heads but shares a **single** key head and a **single** value head across all of them:

$$
\text{head}_h = \mathrm{Attention}(X W_Q^h,\; X W_K,\; X W_V), \quad W_K, W_V \in \mathbb{R}^{D \times d_k} \text{ (shared)}
$$

- **KV-cache memory drops by a factor of `H`:** from `O(L·D)` to `O(L·D/H)` per layer — often a 8–64× reduction depending on `H`.
- **Decode latency drops** correspondingly, because far less KV data is streamed from HBM per step (decoding is bandwidth-bound).
- **Cost:** a small quality regression and sometimes training instability, since all query heads must share one key/value subspace.

MQA is used in PaLM and early Falcon; it's the aggressive end of the trade-off.

---

## 5. Grouped-Query Attention (GQA)

**GQA** (Ainslie et al., 2023) interpolates between MHA and MQA: partition the `H` query heads into `G` **groups**, and share one key/value head *per group*.

- `G = H` → MHA (every head has its own K/V).
- `G = 1` → MQA (all heads share one K/V).
- `1 < G < H` → GQA (the sweet spot).

$$
\text{KV-cache memory} = O(L \cdot G \cdot d_k), \qquad d_k = D/H
$$

GQA captures **most of MQA's memory/latency win while recovering nearly all of MHA's quality**. It is the modern default: **Llama 2 70B, Llama 3, Mistral, and most recent open models use GQA** (typically `G = 8`).

| Variant | Query heads | K/V heads | KV cache/layer | Quality | Used by |
|---|---|---|---|---|---|
| **MHA** | `H` | `H` | `O(L·D)` | best | GPT-2/3, original Transformer |
| **GQA** | `H` | `G` (1<G<H) | `O(L·G·d_k)` | ~MHA | **Llama 2/3 70B, Mistral** |
| **MQA** | `H` | `1` | `O(L·D/H)` | slightly lower | PaLM, Falcon |

> 💡 **The unifying insight.** MHA/GQA/MQA are the *same attention math* with a single knob: **how many key/value heads to keep.** That knob trades KV-cache memory (and therefore decode latency and max batch size) against quality. It changes the [KV cache](/docs/kv-cache) size, not the attention formula.

---

## 6. FlashAttention — an IO-aware exact algorithm

FlashAttention (Dao et al., 2022; Dao, 2023 for v2) is **not an approximation** — it computes *exactly* the same attention output, but reorganizes the computation to avoid ever materializing the `L×L` score matrix in slow GPU memory (HBM).

**The key realization:** standard attention is **memory-bandwidth-bound**, not compute-bound. Writing the `O(L²)` score matrix to HBM and reading it back for softmax and `AV` is the bottleneck — not the FLOPs.

**How it works (tiling + online softmax):**

1. **Tile** `Q`, `K`, `V` into blocks that fit in fast on-chip SRAM.
2. For each `Q` block, stream `K`/`V` blocks through SRAM, computing partial scores and a **running softmax** that never needs the full row at once.
3. The [online/streaming softmax](/docs/segment-tree-fenwick) maintains a running `(max, sum)` and rescales previous partial outputs as new blocks arrive — this works because "combine two partial `(max, sum)` blocks" is an **associative reduction** (the same monoid property behind segment trees and prefix scans).

**Result:** the `O(L²)` intermediate never touches HBM. Memory drops from `O(L²)` to `O(L)`, and wall-clock speeds up 2–4× despite doing the *same* FLOPs — because HBM traffic, not arithmetic, was the wall. FlashAttention is now the default attention kernel in PyTorch (`scaled_dot_product_attention`), and the enabler of long-context training.

> ⚠️ **FlashAttention doesn't change the FLOP complexity** (`O(L²·D)` for scores+`AV` remains) — it changes the *memory* complexity and the *constant factor* by respecting the GPU memory hierarchy. It's an IO-complexity win, not an asymptotic-FLOP win. Contrast with **sparse/linear attention** ([Matrix Ops §2.4](/docs/matrix-ops-attention-sparse)), which *do* reduce FLOPs by approximating.

---

## 7. Production considerations

- **Decode is memory-bandwidth-bound.** During generation, each step reads the entire KV cache from HBM. Halving KV size (via GQA/MQA) roughly halves decode latency and doubles the max concurrent batch — a bigger lever than any FLOP optimization. See [KV Cache](/docs/kv-cache).
- **Prefill vs. decode are different regimes.** *Prefill* (processing the prompt) is compute-bound and quadratic in `L` → FlashAttention and long-context tricks matter most here. *Decode* (one token at a time) is bandwidth-bound → KV-cache size (GQA/MQA) matters most.
- **Head count is a memory dial, not a FLOP dial** — choose K/V head count (`G`) by your latency/quality budget, not to reduce compute.
- **Kernel choice is hardware-specific.** FlashAttention-2/3, xFormers memory-efficient attention, and vendor kernels (cuDNN, ROCm) differ per GPU; the "right" kernel depends on `L`, `D`, dtype, and the SM architecture.
- **Numerical stability.** The `1/√d_k` scaling and the softmax max-subtraction (also central to online softmax) prevent overflow; mixed-precision (bf16/fp16) attention must keep the softmax accumulation in fp32.
- **Sequence-length limits are memory limits.** Max context is bounded by KV-cache memory (`O(B·L·G·d_k)`), which is why long-context models lean on GQA + paged KV caching + sometimes sliding-window attention.

---

## 8. Practice / connections

- **DSA thread:** the softmax denominator is a **[prefix/streaming reduction](/docs/hashing-patterns)**; FlashAttention's online softmax is an **associative scan** (the [segment-tree](/docs/segment-tree-fenwick) monoid property); top-k selection over attention logits uses a **[heap](/docs/heaps-and-priority-queues)**.
- **Runnable:** the [practice page](/docs/multi-head-attention-practice) implements scaled dot-product attention and causal masking in NumPy and measures how the score-matrix cost grows with `L`.
- See the [AI Systems Benchmarks](/docs/ai-systems-benchmarks) guide for a live measurement of attention cost vs. sequence length.

---

## References

- Vaswani, A., et al. (2017). *Attention Is All You Need.* NeurIPS. — scaled dot-product & multi-head attention.
- Shazeer, N. (2019). *Fast Transformer Decoding: One Write-Head is All You Need.* arXiv. — Multi-Query Attention.
- Ainslie, J., et al. (2023). *GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints.* EMNLP. — Grouped-Query Attention.
- Dao, T., et al. (2022). *FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness.* NeurIPS.
- Dao, T. (2023). *FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning.* arXiv.
- Milakov, M., & Gimelshein, N. (2018). *Online normalizer calculation for softmax.* arXiv. — the online-softmax reduction FlashAttention relies on.

---

## Related Guides

**Prerequisites:** [Matrix Ops, Attention O(n²) & Sparse Formats](/docs/matrix-ops-attention-sparse) · [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [KV Cache & Paged Attention](/docs/kv-cache) · [Tokenization Algorithms](/docs/tokenization) · [Sampling & Search Decoding](/docs/sampling-decoding)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
