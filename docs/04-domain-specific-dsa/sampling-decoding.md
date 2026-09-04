---
title: Sampling & Search Decoding — Greedy, Top-k, Top-p, Temperature
slug: /sampling-decoding
sidebar_position: 13
sidebar_label: Sampling & Search Decoding
description: >-
  How LLMs turn a probability distribution over the vocabulary into text — greedy, temperature, top-k, and top-p (nucleus) sampling — and the heap → top-k → candidate-selection chain that connects them to classic DSA. When beam search helps, and when it hurts.
tags:
  - sampling
  - top-k
  - top-p
  - decoding
  - llm
difficulty: advanced
reading_time: 24
prerequisites:
  - title: Heaps & Priority Queues
    to: /docs/heaps-and-priority-queues
  - title: Beam Search & Constrained Decoding
    to: /docs/beam-search
pagination_prev: domain-specific-dsa/kv-cache
pagination_next: domain-specific-dsa/ai-systems-benchmarks
path_step: 42
---

# Sampling & Search Decoding: Greedy, Top-k, Top-p, Temperature

> At every step an LLM outputs a probability distribution over its ~50k–256k-token vocabulary. **Decoding** turns that stream of distributions into text. [Beam Search](/docs/beam-search) covered the *search* family (find the highest-probability sequence). This guide covers the *sampling* family — **greedy, temperature, top-k, top-p** — and makes the **[heap](/docs/heaps-and-priority-queues) → top-k → candidate-selection → decoding** chain explicit. It closes with a clear-eyed take on **when beam search helps and when it hurts**.

---

## 1. The setup

At step `t`, the model produces **logits** `z ∈ ℝ^{|V|}` (one real score per vocabulary token). A softmax turns them into a probability distribution:

$$
P(v) = \frac{e^{z_v / \tau}}{\sum_{u} e^{z_u / \tau}}
$$

where `τ` is the **temperature** (below). Decoding is any rule for picking the next token from `P` — deterministically (greedy/beam) or stochastically (sampling). The choice controls the fundamental **quality ↔ diversity** trade-off.

---

## 2. Greedy decoding

**Rule:** pick the single highest-probability token, `argmax_v P(v)`, every step.

- **Deterministic** — same prompt → same output.
- `O(|V|)` per step (one scan for the max) — the cheapest possible decode.
- **Problem:** locally-greedy is globally short-sighted (the same failure as any greedy algorithm — see [greedy algorithms](/docs/greedy-algorithms)), and it produces **repetitive, bland** text. It also can't recover from a bad early token. Beam search hedges against this; sampling sidesteps it by embracing randomness.

Greedy is the right default only for tasks with a single correct answer (classification-style, extractive QA, deterministic tool calls).

---

## 3. Temperature

Temperature `τ` **rescales the logits before softmax**, reshaping the distribution without changing the ranking:

- `τ → 0`: distribution → one-hot → **greedy** (sharpest, least diverse).
- `τ = 1`: the model's raw distribution.
- `τ > 1`: **flatter** distribution → more surprising, more diverse, more error-prone.
- `τ < 1`: **sharper** → more confident, more repetitive.

$$
P_\tau(v) = \mathrm{softmax}(z/\tau)_v
$$

> 💡 Temperature is a *knob on the distribution shape*, applied **before** truncation. Top-k and top-p are *truncation rules* applied **after** (usually) temperature. They compose: a typical config is `temperature=0.7, top_p=0.9`.

---

## 4. Top-k sampling

**Rule:** keep only the `k` highest-probability tokens, renormalize their probabilities to sum to 1, and sample from that restricted set. (Fan et al., 2018.)

This is a **top-k selection problem** — precisely the [heap](/docs/heaps-and-priority-queues) pattern:

- To find the `k` largest logits among `|V|`, use a **size-`k` min-heap**: scan all `|V|` logits, keep the heap's root as the current cutoff, and admit a token only if it beats the root. Cost `O(|V| log k)` — far cheaper than sorting all `|V|` (`O(|V| log |V|)`).
- In practice `torch.topk(logits, k)` does exactly this (a partial sort / heap-select), and NumPy's `argpartition` gives an `O(|V|)` selection.

> 🔗 **The chain, made explicit:** *a **heap** performs **top-k** selection over the logits → that yields the **candidate set** → we sample the next token from the candidates → repeated over steps, this is **LLM decoding**.* The same size-k heap powers [beam search](/docs/beam-search) (keep top-k *sequences*) and [HNSW / k-NN retrieval](/docs/hnsw-deep-dive) (keep top-k *neighbors*). One data structure, three AI systems.

**Weakness of top-k:** a *fixed* `k` is wrong for distributions of different shapes. When the model is very confident (one token has 0.95 probability), `k=40` includes 39 junk tokens. When it's uncertain (mass spread over hundreds of plausible tokens), `k=40` cuts off good options. Top-p fixes this.

---

## 5. Top-p (nucleus) sampling

**Rule:** sort tokens by probability, take the **smallest set whose cumulative probability ≥ p** (the "nucleus"), renormalize, and sample from it. (Holtzman et al., 2020.)

$$
\text{nucleus} = \text{smallest } V_p \subseteq V \text{ such that } \sum_{v \in V_p} P(v) \ge p
$$

- **Adaptive cutoff.** The set size *varies with the distribution's shape*: tiny when the model is confident, large when it's uncertain — exactly what fixed-`k` gets wrong.
- **Algorithm:** sort by probability (`O(|V| log |V|)`), take a **prefix sum** ([prefix sums](/docs/hashing-patterns)) of the sorted probabilities, and cut at the first index where the cumulative sum crosses `p`. This is a sort + prefix-scan + binary-search-style cutoff.
- `p = 0.9` is a common default; `p = 1.0` disables truncation (pure sampling).

Top-p is the modern default for open-ended generation (chat, creative writing) because its adaptive cutoff produces fluent, non-degenerate text — Holtzman et al. showed fixed strategies (greedy/beam) produce degenerate repetition on open-ended tasks, while nucleus sampling matches human-like statistics.

---

## 6. Putting it together

The standard decode pipeline composes these, in order:

```
logits ──(÷ temperature)──▶ scaled logits
       ──(top-k truncation)──▶ keep k best        (heap select, O(|V| log k))
       ──(top-p truncation)──▶ keep nucleus        (sort + prefix sum)
       ──(softmax + sample)──▶ next token
```

| Strategy | Deterministic? | Diversity | Per-step cost | Best for |
|---|---|---|---|---|
| **Greedy** | ✅ | none | `O(\|V\|)` | single-answer tasks |
| **Beam search** | ✅ | low | `O(k·\|V\| log(k\|V\|))` | high-likelihood short outputs (MT, summarization) |
| **Temperature** | ❌ | tunable | `O(\|V\|)` | shape control (combined with below) |
| **Top-k** | ❌ | medium | `O(\|V\| log k)` | general sampling |
| **Top-p (nucleus)** | ❌ | adaptive | `O(\|V\| log \|V\|)` | **open-ended generation (default)** |

---

## 7. When beam search helps — and when it hurts

Beam search (deterministic search for the max-probability sequence) is **not** universally better than sampling:

**Beam search helps when** there is essentially *one correct output* and likelihood is a good proxy for quality:
- **Machine translation, summarization, speech recognition, constrained/structured output** (JSON, code with a grammar). Here the highest-probability sequence is usually the best sequence, and beam width 4–8 reliably beats greedy.

**Beam search hurts (use sampling instead) when** the task is **open-ended**:
- **Chat, story generation, brainstorming.** Holtzman et al. (2020) showed that maximizing likelihood on open-ended text produces **degenerate, repetitive** output ("neural text degeneration") — the mode of the distribution is a *bad* sample. The most probable continuation of a story is often "and then they lived happily ever after" repeated. Here you *want* the controlled randomness of top-p.
- **Beam search also has a length bias** (favors short sequences without length normalization — see [beam search §1.7](/docs/beam-search)) and is expensive (k model passes per step, k KV caches).

> 💡 **The rule of thumb:** *narrow, correctness-oriented tasks → search (beam/greedy); broad, creativity-oriented tasks → sampling (top-p + temperature).* This is the decoding analog of exploitation vs. exploration.

---

## 8. Production considerations

- **Selection cost is real at scale.** Over a 256k-vocabulary (e.g. Gemma), a full sort per token per sequence per beam is not free. Fused GPU kernels do top-k/top-p selection in one pass; `torch.topk` and vendor sampling kernels avoid a full sort.
- **Batched sampling with different params.** A serving system runs many requests with *different* temperature/top-k/top-p simultaneously — the sampler must apply per-request parameters within one batched kernel.
- **Repetition penalties & min-p.** Production decoders layer on **repetition/frequency penalties**, **min-p** (a newer adaptive cutoff), and **no-repeat-ngram** blocking. These are additional logit-processing passes before sampling.
- **Determinism & reproducibility.** Sampling needs a seeded RNG per request for reproducibility; floating-point non-associativity across GPU kernels can still make "greedy" outputs differ across hardware.
- **Speculative decoding** uses a small draft model to propose tokens that the big model verifies in parallel — it *accelerates* decoding but must preserve the target sampling distribution (top-p/temperature) exactly, which constrains the acceptance rule.
- **Interaction with the [KV cache](/docs/kv-cache).** Beam search and parallel sampling create multiple sequences that share a prompt prefix — [PagedAttention's](/docs/kv-cache) copy-on-write prefix sharing makes these dramatically cheaper.

---

## 9. Summary — the DSA → AI chain

| Layer | Concept |
|---|---|
| **DSA concept** | top-k selection via a **size-k heap** (+ sort + prefix sum for top-p) |
| **Algorithm** | truncate the distribution (top-k/top-p), reshape it (temperature), sample |
| **Complexity** | `O(\|V\| log k)` for top-k; `O(\|V\| log \|V\|)` for top-p |
| **AI system** | the decoder of every generative LLM |
| **Production trade-off** | quality/diversity vs. cost; search for narrow tasks, sampling for open-ended |

Runnable implementations of all four strategies are on the [practice page](/docs/sampling-decoding-practice).

---

## References

- Fan, A., Lewis, M., & Dauphin, Y. (2018). *Hierarchical Neural Story Generation.* ACL. — top-k sampling.
- Holtzman, A., Buys, J., Du, L., Forbes, M., & Choi, Y. (2020). *The Curious Case of Neural Text Degeneration.* ICLR. — nucleus (top-p) sampling and the degeneration of likelihood-maximizing decoding.
- Vijayakumar, A., et al. (2016). *Diverse Beam Search.* — diversity in search-based decoding.
- Leviathan, Y., Kalman, M., & Matias, Y. (2023). *Fast Inference from Transformers via Speculative Decoding.* ICML.

---

## Related Guides

**Prerequisites:** [Heaps & Priority Queues](/docs/heaps-and-priority-queues) · [Beam Search & Constrained Decoding](/docs/beam-search)  
**See also:** [KV Cache & Paged Attention](/docs/kv-cache) · [Multi-Head Attention](/docs/multi-head-attention) · [HNSW Deep Dive](/docs/hnsw-deep-dive)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
