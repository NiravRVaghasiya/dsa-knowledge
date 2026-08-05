---
title: Beam Search & Constrained Decoding
slug: /beam-search
sidebar_position: 5
sidebar_label: Beam Search & Constrained Decoding
description: >-
  Theory, math, and algorithms of beam search and constrained decoding for LLM generation.
tags:
  - beam-search
  - decoding
  - llm
difficulty: advanced
reading_time: 31
prerequisites:
  - title: BFS & DFS Traversal
    to: /docs/bfs-dfs
  - title: Heaps & Priority Queues
    to: /docs/heaps-and-priority-queues
pagination_prev: 04-domain-specific-dsa/matrix-ops-attention-sparse
pagination_next: 04-domain-specific-dsa/graph-algorithms-kg-graphrag
path_step: 28
---

# Beam Search & Constrained Decoding: Complete Reference Guide

> A self-contained, expert-level reference for data scientists, ML engineers, AI researchers, and LLM practitioners. Covers the theory, mathematics, algorithms, variants, failure modes, and production realities of sequence decoding.

**Prerequisites:** You know transformers, softmax, and log-probabilities. You may be new to decoding strategies. Notation is defined as it appears.

---

## Table of Contents

1. [Beam Search](#1-beam-search)
2. [Constrained Decoding](#2-constrained-decoding)
3. [Comparative Summary Table](#3-comparative-summary-table)
4. [Quick-Reference Cheat Sheet](#4-quick-reference-cheat-sheet)
5. [Further Reading & Key Papers](#5-further-reading--key-papers)

---

## Preface: The Decoding Problem

A language model gives you a probability distribution over the next token, conditioned on everything so far:

$$P(y_t \mid y_{<t}, x)$$

where $x$ is the input (prompt / source sequence), $y_{<t} = (y_1, \dots, y_{t-1})$ is the tokens generated so far, and $y_t$ is the next token drawn from vocabulary $V$.

**Decoding** is the process of turning these per-step distributions into a full output sequence $y = (y_1, \dots, y_T)$. The score of a complete sequence is the product of per-step probabilities, or equivalently the sum of log-probabilities:

$$\log P(y \mid x) = \sum_{t=1}^{T} \log P(y_t \mid y_{<t}, x)$$

The "ideal" decode is the **maximum a posteriori (MAP)** sequence:

$$y^* = \arg\max_{y \in V^*} \log P(y \mid x)$$

**The catch:** $V^*$ is the set of all sequences of all lengths. With a vocabulary of $|V| = 50{,}000$ and length $T = 20$, that is $50{,}000^{20} \approx 10^{94}$ candidates. Exhaustive search is impossible. Every decoding strategy in this guide is a way of approximating $y^*$ under a compute budget — or, in the case of sampling, deliberately *not* approximating it because the mode is often a bad output.

---

## 1. Beam Search

### 1.1 Intuition & Analogy

Beam search keeps a fixed number of "best guesses so far" alive at every step, expands each one, and prunes back down to the same fixed number. That number is the **beam width** $k$.

> **Highway analogy**
> - **Greedy Search** = take the first exit that looks best right now. Fast, but one early wrong turn ruins the whole trip.
> - **Beam Search** = keep $k$ GPS routes active at once. At every junction you expand all of them, then drop all but the $k$ most promising. You hedge against a locally-bad-but-globally-good turn.
> - **Exhaustive Search** = evaluate literally every possible route to the destination. Guaranteed optimal, computationally hopeless.

> **Flashlight-in-a-cave analogy** Greedy shines one narrow flashlight straight ahead. Beam search shines $k$ flashlights down the $k$ most promising tunnels, re-choosing which tunnels to illuminate at every fork. It is a **breadth-limited best-first search** over the tree of possible sequences.

**Key mental model:** Beam search is a *deterministic, approximate* search for the highest-probability sequence. It is not sampling — run it twice, get the same answer. It trades exponential search space for a linear-in-$k$ heuristic.

### 1.2 Formal Definition

Let $B_t$ be the beam at step $t$: a set of at most $k$ partial hypotheses, each a (sequence, cumulative-log-prob) pair.

- **Initialize:** $B_0 = {(\langle \text{BOS} \rangle, 0.0)}$
- **Expand:** for each hypothesis $(y_{\le t}, s)$ in $B_t$ and each token $v \in V$, form a candidate with score $$s' = s + \log P(v \mid y_{\le t}, x)$$
- **Prune:** $B_{t+1}$ = the $k$ highest-scoring candidates among all expansions.
- **Terminate:** when a hypothesis emits EOS it is moved to a "finished" set; search stops when all $k$ beams are finished or `max_length` is reached.
- **Return:** the highest-scoring *finished* hypothesis (usually after length normalization — see §1.7).

**Complexity:** At each of $T$ steps you score $k \times |V|$ candidates and sort them. Time is $O(T \cdot k \cdot |V| \cdot \log(k|V|))$; the model forward passes dominate at $O(T \cdot k)$ decoder calls. Memory is $O(k \cdot T)$ for the stored hypotheses plus $k$ KV-caches.

**Guarantee:** Beam search is *not* guaranteed to find $y^*$. It is a greedy breadth-limited heuristic — the global optimum can be pruned early if it looks weak in its opening tokens. Larger $k$ shrinks (but never eliminates) this risk.

### 1.3 Algorithm (Pseudocode + Step-by-Step)

```python
# Beam Search — log-probability formulation
def beam_search(model, x, k, max_length, alpha=0.0):
    # Each beam is (sequence, cumulative_log_prob)
    beams = [([BOS], 0.0)]
    finished = []

    for step in range(max_length):
        candidates = []
        for seq, score in beams:
            if seq[-1] == EOS:
                finished.append((seq, score))
                continue
            log_probs = model.next_token_logprobs(seq, x)  # shape [|V|]
            # Expand: add every vocabulary token
            for token in range(len(log_probs)):
                new_seq   = seq + [token]
                new_score = score + log_probs[token]
                candidates.append((new_seq, new_score))

        if not candidates:            # all beams finished
            break
        # Prune: keep the k best partial hypotheses
        beams = top_k(candidates, k, key=lambda c: c[1])

    finished += beams                 # include any unfinished at max_length
    # Length-normalized selection (alpha=0 => raw log-prob)
    return max(finished, key=lambda c: c[1] / length_penalty(len(c[0]), alpha))

```

**Step-by-step in words:**

1. **Start** with a single beam containing just the BOS token, score 0.
2. **For each step**, take every live beam and ask the model for the next-token log-prob distribution.
3. **Expand** each beam by every possible next token → up to $k \times |V|$ candidate continuations.
4. **Score** each candidate by adding the new token's log-prob to the beam's running total.
5. **Prune** to the top $k$ candidates by score. These become the new beams.
6. **Retire** any beam that emits EOS into the `finished` pool so a shorter good sequence isn't forced to keep growing.
7. **Stop** when all beams finish or `max_length` is hit; return the best finished sequence after length normalization.

**Practical optimization:** you never need more than $k$ successors *per beam* to guarantee the global top-$k$. So implementations take the top-$k$ tokens from each beam's distribution first ($k \times k$ candidates), then top-$k$ overall — avoiding a full sort over $k|V|$ items.

### 1.4 Worked Example (Trace)

```
Input x = "The cat"
Beam width k = 2
Vocabulary (next token) = [sat, ran, ate, slept]
Scores shown as log-probs (higher = better; less negative = more likely)

```

**Step 1 — expand the single start beam "The cat":**

| Candidate | log P(token) | cumulative score |
| --- | --- | --- |
| The cat **sat** | -0.51 | -0.51 |
| The cat **ran** | -0.92 | -0.92 |
| The cat **ate** | -1.61 | -1.61 |
| The cat **slept** | -2.30 | -2.30 |

Keep top-2 → **beams = { "The cat sat" (-0.51), "The cat ran" (-0.92) }**

**Step 2 — expand each surviving beam** (next-token vocab: `[down, quickly, EOS]`):

| Parent beam (score) | + next token | + log P | new score |
| --- | --- | --- | --- |
| The cat sat (-0.51) | down | -0.36 | -0.87 |
| The cat sat (-0.51) | quickly | -1.20 | -1.71 |
| The cat sat (-0.51) | EOS | -1.61 | -2.12 |
| The cat ran (-0.92) | quickly | -0.22 | -1.14 |
| The cat ran (-0.92) | down | -1.61 | -2.53 |
| The cat ran (-0.92) | EOS | -1.90 | -2.82 |

All $2 \times 3 = 6$ candidates ranked; keep top-2 → **beams = { "The cat sat down" (-0.87), "The cat ran quickly" (-1.14) }**

**Notice the hedge:** after Step 1, `"sat"` (-0.51) beat `"ran"` (-0.92). A *greedy* decoder would have locked into `"sat"`. Beam search kept `"ran"` alive — and `"ran quickly"` (-1.14) is now competitive with `"sat down"` (-0.87), something greedy could never discover.

**Step 3 — both beams emit EOS with high probability:**

| Sequence | pre-EOS score | + log P(EOS) | final raw score |
| --- | --- | --- | --- |
| The cat sat down `EOS` | -0.87 | -0.11 | **-0.98** |
| The cat ran quickly `EOS` | -1.14 | -0.16 | -1.30 |

**Winner (raw log-prob): "The cat sat down"** with score -0.98.

(See §1.7 for how length normalization would change selection if the two candidates had different lengths.)

### 1.5 Key Parameters & Tradeoffs

| Parameter | Effect | Failure mode if too high | Failure mode if too low |
| --- | --- | --- | --- |
| **Beam width $k$** | Wider search, higher chance of finding high-prob sequences | Diminishing returns; *worse* quality in NMT ("beam search curse"); more compute/memory | Collapses toward greedy; misses globally better sequences |
| `max_length` | Caps sequence length | Rambling, wasted compute | Truncated / incomplete outputs |
| **Length penalty $\alpha$** | Rewards longer sequences | Over-long, padded outputs | Bias toward short sequences (empty-string problem) |
| `num_return_sequences` | How many finished beams to return | Must be $\le k$ | — |
| `early_stopping` | Stop when $k$ beams finished | May stop before a better long beam completes | Wastes compute |

**The beam width paradox:** In neural machine translation, increasing $k$ beyond ~5–10 often *degrades* BLEU. This is the **beam search curse** — as $k$ grows, beam search finds higher-probability sequences that are *shorter and blander* (often the empty sequence has surprisingly high probability). The model's probability mode is not its best output. This motivates length normalization and, increasingly, sampling methods.

**Typical settings:**

- **NMT / summarization:** $k = 4$–$6$, $\alpha \approx 0.6$–$1.0$
- **Speech recognition:** $k = 10$–$100$ (larger beams help)
- **Open-ended generation (chat, stories):** beam search is usually **avoided** in favor of sampling — it produces repetitive, generic text.

### 1.6 Variants

Greedy Search

The special case $k = 1$. At each step, pick the single most probable token: $$y_t = \arg\max_{v \in V} \log P(v \mid y_{<t}, x)$$

- **Pros:** fastest possible ($O(T)$ decoder calls), deterministic, simple.
- **Cons:** no lookahead — one locally-optimal-but-globally-poor token derails everything. No way to recover.

Exhaustive Search

Enumerate *all* $|V|^T$ sequences and pick the true argmax.

- **Pros:** provably optimal MAP decode.
- **Cons:** computationally impossible for any real vocabulary/length. Exists only as the theoretical ideal that beam search approximates.

Diverse Beam Search (Vijayakumar et al., 2016)

Standard beam search returns $k$ nearly-identical sequences (differing by one token). Diverse Beam Search partitions the beam into $G$ **groups** and adds a **dissimilarity penalty** that pushes later groups away from tokens already chosen by earlier groups at the same step:

$$s'(y_t) = \underbrace{\log P(y_t \mid y_{<t}, x)}*{\text{model score}} ; - ; \underbrace{\lambda \cdot \Delta(y_t, \text{groups} < g)}*{\text{diversity penalty}}$$

where $\Delta$ counts how many earlier groups already picked token $y_t$ (Hamming diversity) and $\lambda$ controls the diversity strength. Groups are decoded sequentially so each conditions on the choices of previous groups.

- **Use case:** image captioning, question generation, "give me 5 *different* answers."

Stochastic Beam Search (Kool et al., 2019)

Injects randomness by adding **Gumbel noise** to log-probabilities, then applying a top-$k$ selection. This yields **sampling without replacement** from the sequence distribution — you draw $k$ *distinct* samples that are provably an unbiased set of draws, useful for estimators and diverse generation with statistical guarantees. Bridges beam search (deterministic top-$k$) and sampling (stochastic).

Other notable variants

- **Beam Search with n-gram blocking:** forbid repeating any n-gram (e.g. `no_repeat_ngram_size=3`) to combat loops. Cheap and widely used.
- **Constrained Beam Search:** force/forbid specific tokens or phrases — covered in depth in §2.4.
- *Best-first / A beam search:** use a priority queue with an admissible heuristic to expand the globally most promising hypothesis first rather than strictly level-by-level.

### 1.7 Length Normalization & Scoring

**The problem:** every added token contributes a *negative* log-prob, so longer sequences always have lower total scores. Raw log-prob systematically **prefers short sequences** — in the extreme, the empty sequence wins. This is the "brevity" / empty-translation problem.

**Length normalization (Wu et al., 2016 — Google NMT):** divide the log-prob by a length penalty term:

$$\text{score}(y) = \frac{\log P(y \mid x)}{lp(y)}, \qquad lp(y) = \frac{(5 + |y|)^{\alpha}}{(5 + 1)^{\alpha}}$$

- $\alpha = 0$ → no normalization (raw log-prob).
- $\alpha = 1$ → (approximately) dividing by length = **average** per-token log-prob.
- $\alpha \in [0.6, 0.7]$ → common sweet spot in NMT.

**Simpler variant** — plain average log-prob: $$\text{score}(y) = \frac{1}{|y|^{\alpha}} \sum_{t=1}^{|y|} \log P(y_t \mid y_{<t}, x)$$

**Coverage penalty (optional, NMT):** an additional term that rewards hypotheses attending to *all* source tokens, discouraging under-translation: $$cp(x, y) = \beta \sum_{i=1}^{|x|} \log \min\left(\sum_{t} a_{t,i},\ 1.0\right)$$ where $a_{t,i}$ is the attention weight on source token $i$ at step $t$.

**Worked contrast:** suppose "The cat sat down" (len 4, raw -0.98) competes with "The cat ran" (len 3, raw -1.30). Under raw score, "sat down" wins. Under **average log-prob** ($\alpha=1$): $-0.98/4 = -0.245$ vs $-1.30/3 = -0.433$ → "sat down" still wins, and by a *wider relative margin* because normalization removes the unfair length advantage the short sequence would otherwise gain. The effect is largest when comparing sequences of very different lengths.

### 1.8 Limitations & Failure Modes

- **Not optimal:** prunes the true best sequence if its prefix scores poorly early on.
- **The beam search curse:** larger $k$ → higher probability → *lower* quality in NMT (degenerate short outputs). More search finds worse text.
- **Degenerate repetition:** without n-gram blocking, beams collapse into loops ("I am very very very…") because repeated safe tokens have high probability.
- **Lack of diversity:** the $k$ returned sequences are near-duplicates (fixed by Diverse Beam Search).
- **Length bias:** untreated, prefers short sequences (fixed by length normalization).
- **Poor for open-ended generation:** maximizing probability yields generic, bland, "safe" text. Human language is *not* the high-probability mode — this is the core finding motivating nucleus sampling (Holtzman et al., 2020, "The Curious Case of Neural Text Degeneration").
- **Compute/memory scale with $k$:** $k$× the forward passes and KV-cache. Expensive at inference.
- **Exposure-bias interaction:** models trained with teacher forcing are miscalibrated on their own long generations, amplifying beam-search drift.

### 1.9 Expert/Professional Takeaway

> **What a beginner misses that an expert watches for:**

- **Probability ≠ quality.** The single most important production insight. Beam search optimizes $\log P(y|x)$, but the highest-probability sequence is frequently *not* what you want — especially in open-ended generation. Choose the decoding objective to match the task, not out of habit.
- **Beam search is for constrained, low-entropy tasks:** MT, ASR, grammar-constrained structured output, closed-form summarization. For chat/creative generation, use sampling (top-p/temperature).
- **Always pair beam search with length normalization and n-gram blocking** in real systems. Raw beam search is almost never shipped as-is.
- **Batch by beams.** Efficient implementations treat the $k$ beams as a batch dimension and reorder KV-caches when beams are pruned/reordered — the "beam reordering" step is where most custom-decoder bugs live.
- **Tune $k$ empirically on your metric**, not on log-prob. In NMT, $k=5$ often beats $k=50$ on BLEU. More beam is not more better.
- **Minimum Bayes Risk (MBR) decoding** is the modern successor: instead of the highest-probability hypothesis, pick the hypothesis that is most *similar to the others* under a utility metric (e.g. BLEU/COMET). Often uses beam or sampling to generate the candidate pool. Worth knowing for MT/quality-critical pipelines.

### 1.10 Connection to Modern LLMs

- **Encoder-decoder models (T5, BART, mBART, Whisper):** beam search is the *default* generation strategy for their canonical tasks (translation, summarization, transcription). Hugging Face `generate()` with `num_beams>1` triggers it.
- **Decoder-only chat LLMs (GPT-4, Llama, Claude, Mistral):** almost always use **sampling** (temperature + top-p), *not* beam search, for open-ended responses — beam output is repetitive and bland. Beam search resurfaces for these models only when the task is closed-form (e.g. constrained/structured extraction).
- **top-k / top-p relationship (important):** these are **sampling** strategies, a *different family* from beam search:- **Top-k sampling:** restrict to the $k$ highest-prob tokens, renormalize, then **sample** one.
- **Top-p (nucleus) sampling:** restrict to the smallest set of tokens whose cumulative probability exceeds $p$ (e.g. 0.9), renormalize, then **sample**.
- **Key distinction:** beam search *maximizes* sequence probability deterministically and keeps multiple hypotheses; top-k/top-p *sample* one token at a time stochastically from a truncated distribution. Beam = search; top-k/top-p = truncated sampling. They answer different questions ("most probable sequence" vs "a good, diverse sample").
- **Temperature** $\tau$ rescales logits ($z/\tau$) before softmax; $\tau<1$ sharpens (more greedy-like), $\tau>1$ flattens (more random). Often combined with top-p.
- **Where they meet:** **constrained decoding** (§2) is frequently implemented *on top of* beam search because beam's multi-hypothesis structure is a natural place to enforce hard constraints — this is why the two topics belong together.

---


## 2. Constrained Decoding

### 2.1 Intuition & Analogy

Constrained decoding forces (or forbids) certain content in the output while still letting the language model choose *how* to say the rest. The model proposes; the constraint disposes.

> **GPS with mandatory waypoints**
> Ordinary decoding = "drive from A to B, any route." Constrained decoding = "drive from A to B **but you must pass through the bridge and you may not use the toll road.**" The navigation is still fluent and near-optimal - it just satisfies your hard requirements.

> **Mad Libs / crossword analogy**
> The model writes freely, but some slots are locked ("the output MUST contain `sustainable`", "the answer MUST be valid JSON matching this schema", "never emit profanity"). Constrained decoding guarantees those locks hold *at generation time* - not by re-generating and hoping.

**Why not just prompt for it?** Prompting ("please reply in JSON") is a *soft* request the model can violate. Constrained decoding makes the constraint **structurally impossible to break** by editing the token distribution itself. This is the difference between *asking* and *enforcing*.

### 2.2 Formal Definition & Problem Setup

Unconstrained decoding searches for $y^* = \arg\max_y \log P(y \mid x)$ over all sequences. Constrained decoding restricts the search to a **feasible set** $\mathcal{C} \subseteq V^*$:

$$y^* = \arg\max_{y \, \in \, \mathcal{C}} \; \log P(y \mid x)$$

The constraint set $\mathcal{C}$ can be expressed as predicates the output must satisfy:

- **Positive (inclusion) constraint:** phrase $c$ must appear -> $\{y : c \sqsubseteq y\}$
- **Negative (exclusion) constraint:** phrase $c$ must not appear -> $\{y : c \not\sqsubseteq y\}$
- **Structural constraint:** $y$ must be in a formal language $L(G)$ (e.g. valid JSON, valid SQL) -> $\{y : y \in L(G)\}$

**Two implementation philosophies:**

1. **Hard constraints** - modify the *feasible set*. Infeasible tokens get probability zero (logits set to $-\infty$, "logit masking"). The constraint is guaranteed. Used for grammars, JSON schemas, forbidden tokens.
2. **Soft constraints** - modify the *scoring*. Add a reward/penalty term that biases generation toward the constraint without forbidding anything:
$$\text{score}(y) = \log P(y \mid x) + \lambda \cdot \Phi(y)$$
where $\Phi(y)$ measures constraint satisfaction and $\lambda$ trades fluency against satisfaction. Used when the constraint is a preference (sentiment, topic, style).

### 2.3 Types of Constraints

| Axis | Type | Example | Enforcement |
|------|------|---------|-------------|
| **Strength** | Hard | "Output must be valid JSON" | Logit masking -> guaranteed |
| | Soft | "Prefer a positive tone" | Score biasing -> best-effort |
| **Level** | Lexical | "Must contain the word *sustainable*" | Track satisfied/unsatisfied phrases |
| | Structural / syntactic | "Must match this CFG / regex / schema" | Grammar-driven token masking |
| | Semantic | "Must be factually consistent / positive sentiment" | Auxiliary classifier / discriminator |

- **Hard vs Soft:** hard = feasibility (zero probability off-constraint); soft = preference (reweighting). Many real systems combine them - hard grammar + soft style.
- **Lexical:** presence/absence of specific tokens or phrases. Deceptively tricky because a phrase spans multiple sub-word tokens and can be required *anywhere* in the output.
- **Structural:** the output must parse under a grammar - JSON, XML, SQL, a regex, a function-call signature. Enforced by masking tokens that would make the prefix un-parseable.
- **Semantic:** high-level properties (topic, sentiment, non-toxicity, formality). Usually soft, enforced by an auxiliary model that scores partial sequences (FUDGE, PPLM, GeDi).

### 2.4 Key Algorithms

#### Constrained Beam Search (CBS) - Grid Beam Search / Dynamic Beam Allocation

**Goal:** guarantee that required lexical phrases appear in the output, while keeping beam search's fluency.

**Core idea:** a plain beam might never include the required word because that word is low-probability at every step. CBS reorganizes the beam by **how many constraints are satisfied** so that constraint-satisfying hypotheses are never crowded out by fluent-but-non-compliant ones.

- **Grid Beam Search (Hokamp & Liu, 2017):** maintain a 2-D grid of beams indexed by *(decoding step, number of constraint tokens generated)*. Every constraint-satisfaction level gets its own beam bank, so hypotheses that have used $c$ constraints compete only with peers at the same level. Guarantees all constraints are met by end of decoding.
- **Dynamic Beam Allocation (Post & Vilar, 2018):** same guarantee, but keeps total beam size *constant* by dynamically partitioning the single beam across constraint-satisfaction "banks" - making it $O(k)$ instead of $O(k \cdot |\text{constraints}|)$. This is the version behind Hugging Face's `force_words_ids`.
- **Disjunctive constraints:** "include *any one of* {car, automobile, vehicle}" - satisfied by a trie/DFA over acceptable phrases.

```
# Constrained Beam Search - banked by satisfied-constraint count
banks = { c: [] for c in 0..num_constraints }   # bank c holds beams with c constraints met
banks[0] = [ (BOS, 0.0) ]
for step in range(max_length):
    all_candidates = expand_and_score(all beams in all banks)
    for cand in all_candidates:
        cand.bank = number_of_constraints_satisfied(cand.seq)
        # a hypothesis can also be *forced* to start a pending constraint phrase
    for c in banks:
        banks[c] = top_k_within_bank(all_candidates where bank==c, k_per_bank)
# only accept a finished hypothesis from the top bank (all constraints satisfied)
return best(banks[num_constraints])
```

#### NeuroLogic Decoding (Lu et al., 2021) & NeuroLogic A*esque (2022)

**Goal:** satisfy **predicate logic** over lexical constraints - arbitrary conjunctions, disjunctions, and negations, e.g. `(car OR vehicle) AND NOT crash AND (fast OR quick)`.

- Constraints are expressed in **Conjunctive Normal Form (CNF)**. Each clause must be satisfied; each clause is a disjunction of (possibly negated) literals.
- Decoding augments the beam score with a **penalty for unsatisfied clauses** and tracks the state of every constraint per hypothesis. It *reversibly* toggles constraint states (a phrase can become satisfied or, for negations, violated).
- **NeuroLogic A*esque** adds a **lookahead heuristic** - a cheap estimate of the future cost of satisfying still-open constraints (the "A*" flavor). This prevents the decoder from greedily painting itself into a corner where a required phrase can no longer fit fluently.
- **Use case:** constrained commonsense generation (CommonGen), recipe generation with required ingredients, controllable summarization.

#### FUDGE - Future Discriminators for Generation (Yang & Klein, 2021)

**Goal:** control a *semantic* attribute (formality, topic, sentiment, poetry meter) **without retraining or even accessing** the base LM's weights.

**Mechanism - Bayesian reweighting.** Train a lightweight **discriminator** $P(a \mid y_{\le t})$ that predicts, from a *partial* sequence, whether the desired attribute $a$ will *eventually* hold. At each step reweight the base LM by Bayes' rule:

$$P(y_t \mid y_{<t}, a) \; \propto \; \underbrace{P(y_t \mid y_{<t})}_{\text{base LM}} \; \cdot \; \underbrace{P(a \mid y_{\le t})}_{\text{future discriminator}}$$

- The discriminator is tiny and predicts the *future* attribute from the current prefix - hence "future discriminator."
- Only the top-$k$ candidate tokens are reweighted (for efficiency), then you sample or beam over the adjusted distribution.
- **Contrast with PPLM/GeDi:** PPLM back-propagates gradients into activations (expensive); GeDi uses class-conditional LMs; FUDGE just multiplies in a small classifier's probability - cheaper and modular.
- **Use case:** attribute control (topic, formality, sentiment), poetry couplet completion, machine-translation formality.

#### CFG / Grammar-Guided Decoding

**Goal:** guarantee the output belongs to a formal language $L(G)$ - valid JSON, SQL, a regex, a programming-language snippet, a domain-specific schema.

**Mechanism - incremental parsing + logit masking.** Maintain a parser state for the generated prefix. At each step, compute the set of tokens that could legally continue the prefix under the grammar, and **mask every other token to $-\infty$** before sampling/beam expansion:

```
parser_state = grammar.initial_state()
for step in range(max_length):
    logits = model.next_token_logits(seq)
    allowed = grammar.allowed_tokens(parser_state)   # legal continuations
    logits[~allowed] = -inf                           # hard mask
    token = pick(softmax(logits))                     # sample or argmax/beam
    parser_state = grammar.advance(parser_state, token)
    seq.append(token)
    if grammar.is_accepting(parser_state) and token == EOS:
        break
```

- **Sub-word alignment is the hard part:** a grammar is defined over characters/tokens of the *target language*, but the LM emits *its own* sub-word tokens. Production libraries precompute, for each parser state, which LM vocabulary tokens are admissible - often compiled into a fast **DFA/trie over the token vocabulary**.
- **Implementations:** `llama.cpp` GBNF grammars, **Outlines** (regex/JSON->FSM compilation), **Guidance**, **jsonformer**, **XGrammar**, **LMQL**. Outlines' key trick: compile the regex/schema to a finite-state machine *once*, then index token masks by FSM state for near-zero per-step overhead.
- **Guarantee:** output is *always* parseable. No retry loops, no "the model forgot a closing brace."

#### JSON / Structured-Output Constrained Decoding (LLM APIs)

The productized form of grammar-guided decoding. This is what powers:

- **OpenAI Structured Outputs** (`response_format: json_schema`, `strict: true`) - a JSON Schema is compiled to a grammar and enforced via constrained decoding, guaranteeing schema-valid output.
- **OpenAI / Anthropic / Gemini function-calling & tool-use** - the arguments object is constrained to the tool's parameter schema.
- **vLLM / TGI guided decoding** - expose `guided_json`, `guided_regex`, `guided_grammar`, `guided_choice` backed by Outlines / XGrammar.
- **llama.cpp GBNF, Ollama `format: json`** - local-inference equivalents.

**How JSON schema -> grammar works:** the schema's types, required keys, enums, and nesting become CFG/regex productions. During decoding the mask allows only tokens that keep the JSON prefix valid *and* on-schema (right key order, correct value types, closed brackets, enum membership). The result is guaranteed-parseable, schema-conformant JSON without post-hoc validation or retries.

### 2.5 Worked Example

```
Task:       Complete the sentence about the product.
Prompt x =  "Our new packaging is"
Constraint: Output MUST contain the word "sustainable"  (hard, lexical, positive)
Method:     Constrained Beam Search, k = 2, banked by constraint satisfaction
```

**Step 1 - expand "Our new packaging is". Two banks: bank 0 (constraint unmet), bank 1 (met).**

| Candidate token | log P | resulting bank | note |
|-----------------|------:|:--------------:|------|
| `now`         | -0.7 | bank 0 | constraint still unmet |
| `fully`       | -1.0 | bank 0 | constraint still unmet |
| `sustainable` | -2.5 | **bank 1** | **constraint satisfied!** |

A plain beam ($k=2$) would keep only `now` (-0.7) and `fully` (-1.0) - **`sustainable` (-2.5) is pruned and never appears.** CBS instead reserves a slot in **bank 1**, so `sustainable` survives despite its low score:

- **bank 0 (unmet):** { "...is now" (-0.7), "...is fully" (-1.0) }
- **bank 1 (met):** { "...is sustainable" (-2.5) }

**Step 2 - expand each bank; hypotheses can *transition* bank 0 -> bank 1 by emitting `sustainable`:**

| Parent (bank) | + token | cum. score | new bank |
|---------------|---------|-----------:|:--------:|
| ...is now (0) | `sustainable` | -0.7 + -1.9 = **-2.6** | bank 1 |
| ...is fully (0) | `sustainable` | -1.0 + -0.9 = **-1.9** | bank 1 |
| ...is sustainable (1) | `and` | -2.5 + -0.4 = -2.9 | bank 1 |

Notice "...is fully sustainable" (-1.9) now **outscores** the earlier standalone "...is sustainable" (-2.5): the model was happy to emit `sustainable` *after* `fully`, it just wouldn't lead with it. CBS discovered the fluent constraint-satisfying path that greedy/plain-beam would have missed.

**Termination:** only hypotheses in the top bank (all constraints met) are eligible to finish.
**Winner: "Our new packaging is fully sustainable"** - fluent *and* guaranteed to contain the required word.

### 2.6 Limitations & Tradeoffs

- **Compute overhead:** banking (CBS), lookahead (NeuroLogic A*esque), per-step parsing (grammar) all add cost on top of already-expensive beam search.
- **Fluency vs satisfaction tension:** forcing a low-probability phrase can produce awkward text ("shoehorning"). Lookahead and soft blending mitigate but don't eliminate this.
- **Sub-word / tokenization pain:** the single biggest source of bugs. A required word may not be a single token; a grammar terminal may straddle token boundaries. Mask computation must operate over the *model's* tokenization, not characters.
- **Constraint expressiveness limits:** hard grammars handle *syntax* well but cannot enforce *semantics* (valid JSON != *correct* or *true* JSON). Semantic constraints need soft discriminators, which give no guarantee.
- **Over-constraining -> infeasibility / degenerate output:** if the feasible set is nearly empty, the model is forced through very low-probability tokens, wrecking quality. Contradictory constraints can make $\mathcal{C} = \varnothing$.
- **Soft-constraint calibration:** the weight $\lambda$ (and FUDGE's discriminator quality) is fiddly - too low ignores the constraint, too high destroys fluency.
- **Interaction with sampling:** masking changes the renormalized distribution; naive temperature/top-p on a masked distribution can behave unexpectedly. Apply the mask *before* truncation.

### 2.7 Expert/Professional Takeaway

> **What separates a robust production constrained-decoding system from a demo:**

- **Prefer hard constraints for structure, soft for style.** Use grammar/schema masking to *guarantee* parseable JSON/SQL; use FUDGE-style reweighting or prompting for *preferences* like tone. Don't try to force semantics with a grammar.
- **Compile once, mask fast.** The Outlines/XGrammar pattern - compile schema/regex to an FSM up front, then look up per-state token masks - turns constrained decoding from a latency killer into near-free. Recomputing legal-token sets from scratch every step is the naive trap.
- **Constrained decoding beats "validate-and-retry."** Retrying on invalid JSON wastes tokens, adds latency variance, and can loop forever. Masking makes invalidity *impossible*. This is why every major API moved to grammar-backed structured outputs.
- **Guaranteed-parseable != guaranteed-correct.** Schema conformance says nothing about factual accuracy or whether values make sense. Keep semantic validation downstream.
- **Watch the tokenizer.** 90% of constrained-decoding failures trace to sub-word boundary handling. Test with multi-token constraint phrases and Unicode.
- **Constrained decoding is the backbone of agentic/tool-use LLMs.** Reliable function-calling *is* schema-constrained decoding under the hood. If you build agents, you are already depending on this even if the API hides it.
- **Soft-constraint methods (FUDGE, GeDi, PPLM) shine when you can't touch the base model** - API-only or frozen-weight settings - because they act purely at the output distribution.

### 2.8 Real-World LLM Applications

- **Structured extraction / data pipelines:** guarantee JSON matching a schema for downstream parsing (OpenAI Structured Outputs, vLLM `guided_json`, Outlines).
- **Function calling & tool use / agents:** tool arguments constrained to the parameter schema - the mechanism behind reliable agentic LLMs.
- **Code generation:** grammar-guided decoding to emit syntactically valid code / SQL / regex (`llama.cpp` GBNF, jsonformer).
- **Machine translation with terminology:** force required domain terms or client glossaries via constrained beam search (`force_words_ids`).
- **Controllable / safe generation:** soft constraints for sentiment, formality, topic; hard token bans (`bad_words_ids`) for safety/PII filtering.
- **Commonsense & data-to-text generation:** NeuroLogic-style logical constraints ensuring required concepts appear (CommonGen, recipe/report generation).
- **Classification-as-generation:** `guided_choice` restricts output to a fixed label set, turning a generative LLM into a reliable classifier.

---

## 3. Comparative Summary Table

| Method | Family | Deterministic? | Guarantee | Primary use | Cost | Key limitation |
|--------|--------|:--------------:|-----------|-------------|:----:|----------------|
| **Greedy** | Search ($k{=}1$) | Yes | None (local optimum) | Fast baselines, low-entropy tasks | $O(T)$ | No lookahead; early errors cascade |
| **Beam Search** | Search | Yes | Approx. MAP, not optimal | MT, ASR, summarization | $O(Tk)$ | Beam curse; bland; length bias |
| **Diverse Beam Search** | Search | Yes | Diverse top-$k$ | Captioning, multi-answer | $O(Tk)$ | Diversity-quality tradeoff |
| **Stochastic Beam Search** | Search+sampling | No | Sampling w/o replacement | Diverse samples, estimators | $O(Tk)$ | More complex to implement |
| **Top-k Sampling** | Sampling | No | None (stochastic) | Open-ended generation | $O(T)$ | $k$ fixed regardless of shape |
| **Top-p (Nucleus)** | Sampling | No | None (stochastic) | Chat, creative writing | $O(T)$ | $p$ tuning; still can degenerate |
| **Constrained Beam Search** | Search + hard | Yes | Lexical constraints met | Terminology, forced phrases | $O(Tk)$+ | Shoehorning; banking overhead |
| **NeuroLogic (A*esque)** | Search + hard/logic | Yes | CNF predicate logic met | Constrained commonsense gen | High (lookahead) | Expensive; complex state |
| **FUDGE** | Sampling + soft | No | Best-effort attribute | Style/topic/sentiment control | $O(T)$+disc. | Soft only; needs discriminator |
| **CFG / Grammar-guided** | Any + hard | Depends on base | Output in $L(G)$ | JSON/SQL/code validity | $O(T)$+parse | Syntax only, not semantics |
| **JSON / Structured (APIs)** | Grammar-guided | Depends | Schema-valid output | Extraction, tool use, agents | Low (compiled FSM) | Valid != correct; tokenizer edge cases |

---

## 4. Quick-Reference Cheat Sheet

**Pick your decoder by task:**

| If you need... | Use... |
|--------------|------|
| Fastest deterministic baseline | Greedy ($k=1$) |
| Best single answer, closed-form task (MT/ASR/summarize) | Beam search + length norm + n-gram blocking |
| Several *different* good answers | Diverse Beam Search |
| Fluent, creative, human-like text | Top-p (nucleus) sampling, $p\approx0.9$, temp $0.7$-$1.0$ |
| A required word/phrase to appear | Constrained Beam Search (`force_words_ids`) |
| Arbitrary AND/OR/NOT lexical logic | NeuroLogic (A*esque) |
| Control tone/topic/sentiment, frozen model | FUDGE / GeDi (soft reweighting) |
| Guaranteed valid JSON / SQL / code | Grammar-guided decoding (Outlines, XGrammar, GBNF) |
| Reliable function calling / structured API output | Structured Outputs / `guided_json` |
| Pick from a fixed label set | `guided_choice` / logit mask to label tokens |

**Core formulas at a glance:**

- Sequence score: $\log P(y\mid x)=\sum_t \log P(y_t\mid y_{<t},x)$
- Beam update: $s' = s + \log P(v\mid y_{\le t},x)$, keep top-$k$
- Length norm (GNMT): $\text{score}=\dfrac{\log P(y\mid x)}{((5+|y|)/6)^{\alpha}}$, $\alpha\in[0.6,1.0]$
- Hard constraint: $\text{logits}[\text{illegal}] \leftarrow -\infty$
- Soft constraint: $\text{score}(y)=\log P(y\mid x)+\lambda\,\Phi(y)$
- FUDGE (Bayes): $P(y_t\mid y_{<t},a)\propto P(y_t\mid y_{<t})\,P(a\mid y_{\le t})$

**Gotchas to remember:**

- Higher beam width can *lower* quality (beam curse) - tune on your metric, not log-prob.
- Probability mode != good text for open-ended tasks - sample, don't beam.
- Always length-normalize + block repeat n-grams in production beam search.
- 90% of constrained-decoding bugs are sub-word tokenization boundary issues.
- Schema-valid != semantically correct - validate meaning downstream.
- Apply constraint masks *before* top-p/temperature truncation.

---

## 5. Further Reading & Key Papers

**Beam search & scoring**
- Wu et al. (2016). *Google's Neural Machine Translation System* - length & coverage penalties (GNMT).
- Vijayakumar et al. (2016). *Diverse Beam Search: Decoding Diverse Solutions from Neural Sequence Models.*
- Kool et al. (2019). *Stochastic Beams and Where to Find Them: The Gumbel-Top-k Trick* - sampling without replacement.
- Freitag & Al-Onaizan (2017). *Beam Search Strategies for Neural Machine Translation.*
- Cohen & Beck (2019). *Empirical Analysis of Beam Search Performance Degradation* - the beam-search curse.

**Degeneration & sampling (the "why not beam" literature)**
- Holtzman et al. (2020). *The Curious Case of Neural Text Degeneration* - introduces nucleus (top-p) sampling.
- Fan et al. (2018). *Hierarchical Neural Story Generation* - top-k sampling.
- Eikema & Aziz (2020). *Is MAP Decoding All You Need?* - motivates Minimum Bayes Risk decoding.

**Constrained decoding**
- Hokamp & Liu (2017). *Lexically Constrained Decoding with Grid Beam Search.*
- Post & Vilar (2018). *Fast Lexically Constrained Decoding with Dynamic Beam Allocation.*
- Anderson et al. (2017). *Guided Open Vocabulary Image Captioning with Constrained Beam Search.*
- Lu et al. (2021). *NeuroLogic Decoding: (Un)supervised Neural Text Generation with Predicate Logic Constraints.*
- Lu et al. (2022). *NeuroLogic A*esque Decoding: Constrained Text Generation with Lookahead Heuristics.*
- Yang & Klein (2021). *FUDGE: Controlled Text Generation With Future Discriminators.*
- Dathathri et al. (2020). *Plug and Play Language Models (PPLM).*
- Krause et al. (2021). *GeDi: Generative Discriminator Guided Sequence Generation.*

**Grammar / structured output (tools & systems)**
- Willard & Louf (2023). *Efficient Guided Generation for LLMs* - the Outlines FSM approach.
- Geng et al. (2023). *Grammar-Constrained Decoding for Structured NLP Tasks.*
- Microsoft **Guidance**, **XGrammar**, **jsonformer**, **LMQL**, `llama.cpp` **GBNF** grammars.
- OpenAI **Structured Outputs** & function-calling docs; vLLM / TGI **guided decoding** docs.

---

*End of reference guide. Pair Section 1 (search) with Section 2 (constraints): constrained decoding is most often implemented on top of beam search, which is why they belong in one guide.*

---

## Related Guides

**Prerequisites:** [BFS & DFS Traversal](/docs/bfs-dfs) · [Heaps & Priority Queues](/docs/heaps-and-priority-queues)  
**See also:** [Shortest Path Algorithms](/docs/shortest-path) · [Tokenization Algorithms](/docs/tokenization)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
