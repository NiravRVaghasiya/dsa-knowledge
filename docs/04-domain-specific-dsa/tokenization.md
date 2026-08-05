---
title: Tokenization Algorithms
slug: /tokenization
sidebar_position: 3
sidebar_label: Tokenization Algorithms
description: >-
  BPE, WordPiece, and Unigram LM — the subword tokenizers that power virtually every modern LLM.
tags:
  - tokenization
  - bpe
  - wordpiece
  - llm
  - nlp
difficulty: advanced
reading_time: 35
prerequisites:
  - title: Tries (Prefix Trees)
    to: /docs/tries
  - title: Hash Maps & Sets
    to: /docs/hash-maps-and-sets
pagination_prev: domain-specific-dsa/ann-search
pagination_next: domain-specific-dsa/matrix-ops-attention-sparse
path_step: 26
---

# Ultimate Guide to Tokenization Algorithms
### BPE · WordPiece · Unigram LM — A Self-Contained Reference for ML Engineers & LLM Practitioners

> A working reference on the three subword tokenization algorithms that power virtually every modern LLM. Written to be read front-to-back as a course, or dipped into as a lookup. Grounded in the primary literature: **Sennrich et al. (2016)** for BPE, **Schuster & Nakamura (2012)** for WordPiece, and **Kudo (2018)** for the Unigram Language Model.

---

## Table of Contents

1. [Foundations of Tokenization](#1-foundations-of-tokenization)
2. [Byte Pair Encoding (BPE)](#2-byte-pair-encoding-bpe)
3. [WordPiece](#3-wordpiece)
4. [Unigram Language Model](#4-unigram-language-model)
5. [Comparative Analysis](#5-comparative-analysis)
6. [Advanced Topics](#6-advanced-topics)
7. [Must-Know Checklist & Interview Insights](#7-must-know-checklist--interview-insights)

---

## 1. Foundations of Tokenization

### 1.1 What is tokenization?

**Tokenization** is the process of converting a raw string of text into a sequence of discrete units — **tokens** — that a model can map to integer IDs and, ultimately, to embedding vectors. It is the *first* transformation in every NLP pipeline and the *last* one you get to control before the model takes over: everything downstream (embeddings, attention, generation) operates on the token IDs the tokenizer emits.

Formally, a tokenizer is a function

$$
T : \Sigma^{*} \rightarrow V^{*}
$$

that maps a string over an input alphabet `Σ` (Unicode characters, or raw bytes) to a sequence of tokens drawn from a finite **vocabulary** `V`. A companion function `T⁻¹` (**detokenization**/decoding) reconstructs text from token IDs. A good tokenizer makes `T⁻¹(T(x)) = x` (**lossless round-tripping**) while keeping `|V|` small and sequences short.

### 1.2 Why it matters

Tokenization is not a preprocessing afterthought — it silently governs model quality, cost, and behavior:

- **Sequence length ⇒ compute.** Transformer attention is `O(n²)` in sequence length `n`. A tokenizer that produces 20% shorter sequences directly cuts training and inference cost by a similar margin.
- **Vocabulary size ⇒ parameters & softmax cost.** The embedding matrix and output projection are both `|V| × d_model`. Doubling `|V|` adds hundreds of millions of parameters in large models and slows the final softmax.
- **The OOV problem.** A fixed word vocabulary cannot represent words it never saw in training (**Out-Of-Vocabulary**, OOV), collapsing them to a single `[UNK]` token and destroying information. Subword tokenization essentially eliminates OOV.
- **Generalization & morphology.** Splitting `unhappiness` into `un`, `happy`, `ness` lets the model share statistical strength across `happy`, `happier`, `unhappy` — crucial for morphologically rich languages.
- **Downstream artifacts.** Arithmetic ability, code indentation handling, and even prompt-injection surfaces are all influenced by *how* text gets split. Tokenization boundaries are a real, measurable source of model behavior.

💡 **Pro tip:** When you compare two LLMs "per token" (context window, price per 1K tokens, tokens/sec), remember the tokens are **not** comparable across models with different tokenizers. Always normalize to characters or bytes for a fair comparison.

### 1.3 The evolution: character → word → subword

**Character-level tokenization.** `V` = the set of characters (or bytes). Tiny vocabulary (~256 for bytes), **zero OOV**, and trivially lossless. But sequences become extremely long, and the model must *learn to spell* before it can learn meaning — every notion of a word is reconstructed from scratch across many positions. Historically weak for large-scale LMs due to sequence length.

**Word-level tokenization.** `V` = a dictionary of whole words, usually split on whitespace/punctuation. Sequences are short and each token is semantically rich. But:
- The vocabulary explodes (English alone has millions of surface forms once you count inflections, names, typos).
- Any unseen word ⇒ `[UNK]` ⇒ information loss (**the OOV wall**).
- No sharing between `run`, `running`, `runner` — they are unrelated integers.

**Subword tokenization.** The modern sweet spot. `V` contains frequent whole words *plus* meaningful fragments (`ing`, `tion`, `un`, `##ly`) *plus* single characters/bytes as a fallback. This gives you:
- A **bounded** vocabulary (typically 30K–256K).
- **No true OOV** — the worst case is falling back to characters or bytes, which are always in `V`.
- **Morphological sharing** and a graceful frequency/length tradeoff: common words stay whole, rare words fragment.

The three algorithms in this guide — **BPE**, **WordPiece**, and **Unigram** — are three different answers to the same question: *given a corpus and a target vocabulary size, which subword units should we keep?*

### 1.4 A grounding analogy — the "LEGO for language" idea

> Think of subword tokenization as choosing a **LEGO brick set** for building any sentence you'll ever encounter.
>
> - **Character-level** is the set with only tiny 1×1 bricks: you can build *anything*, but even a small model takes forever and you spend all your effort on structure, not design.
> - **Word-level** is a set of gigantic pre-built facades: fast to assemble the houses you've seen, but if someone asks for a building style not in the box, you're stuck.
> - **Subword** is a well-designed mixed set: whole pre-built walls for the common shapes (`the`, `ing`), medium panels for frequent patterns, and a handful of 1×1 bricks so you can *always* finish any build.
>
> The three algorithms differ in **how they decide which bricks earn a spot in the box**: BPE greedily glues together the pair of bricks it sees together most often; WordPiece glues the pair that most improves how well the box "explains" the corpus; Unigram starts with a huge box and throws away the bricks it needs least.

---

## 2. Byte Pair Encoding (BPE)

### 2.1 Overview & Analogy

**Byte Pair Encoding** originated as a **data compression** algorithm (Gage, 1994) and was adapted to NLP by **Sennrich, Haddow & Birch (2016)** for neural machine translation. It solves the OOV problem by learning a vocabulary of subwords through **greedy, frequency-driven merging**: start from characters and repeatedly fuse the most frequent adjacent pair into a new symbol, until you hit the target vocabulary size.

> 💡 **Intuitive analogy — compression.** BPE is literally a compression scheme. It behaves like a dictionary coder (think of how ZIP finds repeated byte patterns): the pair of symbols that co-occurs most often is worth giving its own shorthand. Replace every `t`+`h` with a single `th` symbol, then maybe `th`+`e` → `the`, and you've "compressed" the corpus while building a vocabulary of useful chunks. The vocabulary *is* the codebook.

The problem it solves: get the **short sequences** of word-level tokenization and the **zero-OOV robustness** of character-level tokenization simultaneously, with a fixed, tunable vocabulary size.

### 2.2 Algorithm Steps

**Training (learning the merges):**

1. **Pre-tokenize** the corpus into words (split on whitespace/punctuation) and count word frequencies. Represent each unique word as a sequence of characters, typically with an **end-of-word marker** (e.g. `</w>` or the space-prefix `Ġ` in GPT-2) so the tokenizer knows where words end.
2. **Initialize** the vocabulary `V` with all individual characters (or bytes) that appear in the corpus.
3. **Count** the frequency of every adjacent **symbol pair** across all words (weighted by word frequency).
4. **Find** the most frequent pair `(A, B)`.
5. **Merge** it: add the new symbol `AB` to `V`, and record the ordered rule `(A, B) → AB` in the **merge list**.
6. **Replace** every occurrence of the adjacent pair `A B` with `AB` in the corpus representation.
7. **Repeat** steps 3–6 until `|V|` reaches the target size (equivalently, a fixed number of merges is performed).

The learned artifact is an **ordered list of merge rules**. Order matters — it defines the encoding.

**Encoding (applying to new text):**

1. Pre-tokenize the new text the same way; split each word into characters.
2. Apply the learned merge rules **in the exact order they were learned**, greedily merging any matching adjacent pair at each rule.
3. The surviving symbols are the tokens; map them to IDs.

**Decoding:** concatenate token strings and undo the end-of-word marker (replace `</w>`/space-prefix with a space). BPE decoding is trivially lossless when byte-level.

⚠️ **Common mistake:** People think BPE picks the "best" subwords. It does **not** — it is purely **greedy on raw frequency** with **no probabilistic objective**. The most *frequent* merge is not always the most *useful* one; BPE just trusts that frequency is a good enough proxy.

### 2.3 Worked Example

Use the classic corpus (with word frequencies) and an end-of-word marker `</w>`:

```
Corpus (word : frequency):
  "low"     : 5
  "lower"   : 2
  "newest"  : 6
  "widest"  : 3
```

**Initial character representation** (`</w>` marks word end):

```
l o w </w>            (×5)
l o w e r </w>        (×2)
n e w e s t </w>      (×6)
w i d e s t </w>      (×3)
```

Initial vocab: `{l, o, w, e, r, n, s, t, i, d, </w>}`.

**Merge 1 — count pairs.** The pair `e s` appears in `newest`(×6) and `widest`(×3) ⇒ **9**, the highest.
Merge `(e, s) → es`:

```
l o w </w>            (×5)
l o w e r </w>        (×2)
n e w es t </w>       (×6)
w i d es t </w>       (×3)
```

**Merge 2.** Now `es t` appears ×6 + ×3 = **9** (highest). Merge `(es, t) → est`:

```
n e w est </w>        (×6)
w i d est </w>        (×3)
```

**Merge 3.** `est </w>` appears ×6 + ×3 = **9**. Merge `(est, </w>) → est</w>`:

```
n e w est</w>         (×6)
w i d est</w>         (×3)
```

**Merge 4.** Now `l o` appears in `low`(×5) + `lower`(×2) = **7** (highest remaining). Merge `(l, o) → lo`:

```
lo w </w>             (×5)
lo w e r </w>         (×2)
```

**Merge 5.** `lo w` appears ×5 + ×2 = **7**. Merge `(lo, w) → low`:

```
low </w>              (×5)
low e r </w>          (×2)
```

**Learned merge list (in order):**

```
1. (e, s)      → es
2. (es, t)     → est
3. (est, </w>) → est</w>
4. (l, o)      → lo
5. (lo, w)     → low
```

**Encoding a new word, `"lowest"`:**

```
start:            l o w e s t </w>
apply (e,s):      l o w es t </w>
apply (es,t):     l o w est </w>
apply (est,</w>): l o w est</w>
apply (l,o):      lo w est</w>
apply (lo,w):     low est</w>
--------------------------------------
result tokens:    ["low", "est</w>"]
```

Notice `"lowest"` — a word **never seen in training** — is tokenized into two known, meaningful units. That is the OOV problem solved.

### 2.4 Math & Scoring

BPE's selection rule is deliberately simple. At each iteration `t`, given the current corpus representation, the chosen merge is the **argmax of raw co-occurrence count**:

$$
(A, B)^{*} = \underset{(A, B)}{\arg\max}\; \operatorname{count}(A, B)
$$

where `count(A, B)` is the total number of times symbols `A` and `B` appear adjacent, summed over all words weighted by word frequency:

$$
\operatorname{count}(A, B) = \sum_{w \in \text{corpus}} \operatorname{freq}(w)\cdot \#\{\text{adjacent } (A,B) \text{ in } w\}
$$

There is **no likelihood, no probability model, no normalization** — this is the defining mathematical feature of BPE and the thing that distinguishes it from WordPiece (which divides by the unigram frequencies of `A` and `B`). BPE is a greedy, deterministic procedure that maximizes local frequency at each step. Its objective is implicit: it approximately minimizes the description length of the corpus under the growing codebook, which is why it is fundamentally a **compression** algorithm.

### 2.5 Code Implementation

Using Hugging Face `tokenizers` (the fast, production path):

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.trainers import BpeTrainer
from tokenizers.pre_tokenizers import Whitespace

# 1. Instantiate a BPE model with an explicit unknown token as a fallback.
tokenizer = Tokenizer(BPE(unk_token="[UNK]"))

# 2. Pre-tokenize on whitespace so merges never cross word boundaries.
tokenizer.pre_tokenizer = Whitespace()

# 3. Configure the trainer: target vocab size + special tokens.
trainer = BpeTrainer(
    vocab_size=30000,
    special_tokens=["[UNK]", "[CLS]", "[SEP]", "[PAD]", "[MASK]"],
    min_frequency=2,          # ignore extremely rare pairs
)

# 4. Train from raw text files (streams from disk).
files = ["corpus.txt"]
tokenizer.train(files, trainer)

# 5. Encode — .tokens are the subwords, .ids are the integer IDs.
output = tokenizer.encode("Tokenization is lowest-effort magic.")
print(output.tokens)   # ['token', 'ization', 'is', 'low', 'est', '-', 'effort', 'magic', '.']
print(output.ids)      # [ ... integer ids ... ]

# 6. Persist and reload.
tokenizer.save("bpe.json")
# reloaded = Tokenizer.from_file("bpe.json")
```

Minimal from-scratch trainer (illustrative — shows the mechanics, not for production):

```python
from collections import Counter

def get_pair_counts(corpus):
    pairs = Counter()
    for word, freq in corpus.items():
        symbols = word.split()
        for a, b in zip(symbols[:-1], symbols[1:]):
            pairs[(a, b)] += freq
    return pairs

def merge_pair(pair, corpus):
    a, b = pair
    bigram, merged = f"{a} {b}", f"{a}{b}"
    return {w.replace(bigram, merged): f for w, f in corpus.items()}

# space-separated chars + end-of-word marker
corpus = {"l o w </w>": 5, "l o w e r </w>": 2,
          "n e w e s t </w>": 6, "w i d e s t </w>": 3}

merges = []
for _ in range(5):                       # 5 merges
    pairs = get_pair_counts(corpus)
    if not pairs: break
    best = max(pairs, key=pairs.get)     # argmax count  <-- the BPE rule
    corpus = merge_pair(best, corpus)
    merges.append(best)
print(merges)  # [('e','s'), ('es','t'), ('est','</w>'), ('l','o'), ('lo','w')]
```

### 2.6 Strengths & Weaknesses

**Strengths**
- **Simple, fast, deterministic** — trivial to implement and reason about.
- **Zero OOV** when combined with a byte-level base alphabet.
- **Excellent compression** — short sequences for the given `|V|`.
- **Language-agnostic** at the byte level; no linguistic assumptions.
- Battle-tested at the largest scale (GPT family, RoBERTa, LLaMA).

**Weaknesses**
- **Greedy & myopic** — a locally frequent merge can be globally suboptimal; no way to reconsider.
- **No probabilistic footing** — cannot express uncertainty over segmentations; a single deterministic split per word.
- **Merge-order dependence** — the exact segmentation is an artifact of training order, not necessarily the most linguistically sensible one.
- **Sensitive to pre-tokenization** — whitespace/punctuation rules leak into the vocabulary (a known source of the "arithmetic" and multi-space quirks).
- **No native subword regularization** (unlike Unigram/BPE-dropout, which must be bolted on).

### 2.7 Real-World Usage

- **GPT-2 / GPT-3 / GPT-4** — **byte-level BPE** (see §6.3).
- **RoBERTa** — byte-level BPE (inherited from GPT-2).
- **LLaMA / LLaMA 2 / Mistral** — BPE via SentencePiece (byte-fallback BPE).
- **BART, many MT systems** — BPE, historically via `subword-nmt` (Sennrich's original tool).

### 2.8 Expert Takeaway

> *What must a practitioner truly understand about BPE that textbooks often miss?*

- **BPE is a codebook, not a linguist.** The merges encode frequency, not morphology. Do not expect `tokenization → token + ization` to always align with morphemes; expect it to align with *what was common in the training corpus*. This is why domain-shifted text (code, chemistry, another language) tokenizes into far more tokens — your effective context window shrinks.
- **Pre-tokenization is where the real decisions hide.** Whether you split on digits, how you treat leading spaces (`Ġ`), and whether you use byte-level all leak permanently into the vocab. GPT-style models tokenize numbers inconsistently (`123` vs `1234`) precisely because of these rules — a documented cause of arithmetic weakness.
- **Merges are ordered and frozen.** Encoding replays the merge list in order. You cannot add a token later without retraining or you break determinism. Vocabulary is an *append-mostly, effectively-immutable* asset — treat it like a schema.
- **"Tokens" are your real cost/latency unit.** Cutting average tokens-per-document by improving pre-tokenization for your domain is one of the cheapest wins available in an LLM system, and it compounds across every request.

---

## 3. WordPiece

### 3.1 Overview & Analogy

**WordPiece** was introduced by **Schuster & Nakamura (2012)** for Japanese/Korean voice search and became famous as the tokenizer of **BERT** (Devlin et al., 2019). Structurally it looks almost identical to BPE — it grows a vocabulary by merging pairs — but it changes the **selection criterion**: instead of merging the most *frequent* pair, WordPiece merges the pair that most increases the **likelihood of the training corpus** under a unigram language model. It is BPE with a smarter, probability-normalized scoring rule.

> 💡 **Intuitive analogy — "which merge best explains the data?"** If BPE is a greedy compressor that grabs the most common pair, WordPiece is a careful editor asking, *"Which single merge, if I add it to my dictionary, makes my whole dictionary explain the text better?"* A pair like `t`+`h` might be extremely frequent, but if `t` and `h` are *individually* everywhere too, merging them isn't very informative. WordPiece prefers pairs whose members "belong together" — high joint frequency **relative to** their individual frequencies (a pointwise-mutual-information flavor).

The problem it solves: the same OOV/vocab-size tradeoff as BPE, but with a merge rule that has a **principled likelihood objective** rather than raw counts.

### 3.2 Algorithm Steps

**Training:**

1. **Pre-tokenize** into words and represent each as characters. WordPiece marks **word-internal continuation** with a prefix — BERT uses `##` (e.g. `word` → `w ##o ##r ##d`). Only the first piece of a word is "bare"; continuations carry `##`.
2. **Initialize** `V` with all characters (both bare and `##`-prefixed forms as they occur).
3. For every candidate adjacent pair `(A, B)`, compute the **merge score** (see §3.4):
   $$
   \text{score}(A,B) = \frac{\operatorname{count}(A,B)}{\operatorname{count}(A)\,\operatorname{count}(B)}
   $$
4. **Merge** the pair with the **highest score** (not highest raw count), add `AB` to `V`.
5. **Repeat** until `|V|` reaches the target size.

**Encoding (this is the big difference from BPE):** WordPiece does **not** replay a merge list. It uses **greedy longest-match-first** segmentation against the final vocabulary:

1. For each pre-tokenized word, find the **longest prefix** that is present in `V`; emit it as a token.
2. Remaining suffix gets a `##` prefix; repeat longest-match on it.
3. If at any point **no prefix** of the remainder is in `V`, the **entire word** is mapped to `[UNK]`.

**Decoding:** concatenate tokens, removing the `##` continuation markers and inserting spaces at word boundaries.

⚠️ **Common mistake:** Assuming WordPiece falls back to characters like BPE. Classic WordPiece maps the **whole word** to `[UNK]` if any piece can't be matched — it is *not* automatically byte-safe. (Modern implementations mitigate this, but the textbook algorithm is not zero-OOV the way byte-level BPE is.)

### 3.3 Worked Example

Reuse the corpus. Represent continuations with `##`:

```
"low"    : 5   ->  l ##o ##w
"lower"  : 2   ->  l ##o ##w ##e ##r
"newest" : 6   ->  n ##e ##w ##e ##s ##t
"widest" : 3   ->  w ##i ##d ##e ##s ##t
```

**Scoring, not counting.** Consider two candidate pairs:

- Pair `(##e, ##s)`: joint `count = 6 + 3 = 9`. But `##e` is very common (`lower`, `newest`, `widest` → 2+6+3 = 11) and `##s` occurs 9 times.
  $$
  \text{score}(\text{\#\#e}, \text{\#\#s}) = \frac{9}{11 \times 9} = \frac{9}{99} \approx 0.091
  $$
- Pair `(##s, ##t)`: joint `count = 9`. `##s` occurs 9 times, `##t` occurs 9 times.
  $$
  \text{score}(\text{\#\#s}, \text{\#\#t}) = \frac{9}{9 \times 9} = \frac{9}{81} \approx 0.111
  $$

Even though both pairs have the **same raw joint count (9)**, WordPiece prefers `(##s, ##t)` because its members are *less common individually* — their co-occurrence is more "surprising" and therefore more informative. **Pure-BPE would treat these two pairs as tied on count; WordPiece breaks the tie by normalization.** This normalization is the entire conceptual difference.

**Encoding `"newest"` after training** (suppose `V` contains `new`, `##est`, `##e`, `##s`, `##t`, ... ):

```
word: newest
longest prefix in V starting at pos 0:  "new"     -> token "new"
remainder "est", longest ##-prefix:     "##est"   -> token "##est"
--------------------------------------------------------------
tokens: ["new", "##est"]
```

If instead we tried `"newest"` and `est` were **not** a unit but `##e`, `##s`, `##t` were, we'd get `["new", "##e", "##s", "##t"]`. And if the first character `n` weren't in `V` at all, the whole word → `[UNK]`.

### 3.4 Math & Scoring

WordPiece merges the pair that **maximizes the increase in training-corpus likelihood** under a unigram LM. Let the corpus likelihood under the current vocabulary be a product of unigram token probabilities. Merging `(A, B)` into `AB` changes the likelihood; the pair chosen is:

$$
(A,B)^{*} = \underset{(A,B)}{\arg\max}\; \bigl[\log P(\text{corpus} \mid V \cup \{AB\}) - \log P(\text{corpus} \mid V)\bigr]
$$

Working through the unigram assumption, the change in log-likelihood from merging is dominated by the term

$$
\Delta \mathcal{L} \;\propto\; \log \frac{P(AB)}{P(A)\,P(B)}
$$

which, using maximum-likelihood estimates `P(x) = count(x)/N`, reduces (up to constants that don't affect the argmax) to the **practical merge score**:

$$
\boxed{\;\text{score}(A,B) = \dfrac{\operatorname{count}(A,B)}{\operatorname{count}(A)\cdot \operatorname{count}(B)}\;}
$$

This is exactly the quantity inside **pointwise mutual information (PMI)** (PMI is `log` of this ratio times `N`). Interpretation: **merge the pair whose members predict each other**, not merely the pair that is loud. Contrast with BPE's rule `argmax count(A, B)` — the numerator is the same, but BPE lacks the denominator that penalizes individually-frequent symbols.

💡 **Pro tip:** This single formula is the most common WordPiece interview question. Memorize both the ratio and *why* the denominator exists (it normalizes by individual frequency ⇒ PMI-like ⇒ prefers informative merges).

### 3.5 Code Implementation

Hugging Face `tokenizers` with the `WordPiece` model + the standard BERT pipeline:

```python
from tokenizers import Tokenizer
from tokenizers.models import WordPiece
from tokenizers.trainers import WordPieceTrainer
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.decoders import WordPiece as WordPieceDecoder

# 1. Model with the ## continuation prefix and an [UNK] fallback.
tokenizer = Tokenizer(WordPiece(unk_token="[UNK]"))
tokenizer.pre_tokenizer = Whitespace()
tokenizer.decoder = WordPieceDecoder(prefix="##")

# 2. Trainer: note continuing_subword_prefix defines the "##" marker.
trainer = WordPieceTrainer(
    vocab_size=30000,
    special_tokens=["[UNK]", "[CLS]", "[SEP]", "[PAD]", "[MASK]"],
    continuing_subword_prefix="##",
)

tokenizer.train(["corpus.txt"], trainer)

output = tokenizer.encode("Tokenization is unbelievable.")
print(output.tokens)   # ['token', '##ization', 'is', 'un', '##bel', '##ievable', '.']

# Using the pretrained BERT tokenizer directly (transformers):
from transformers import AutoTokenizer
bert = AutoTokenizer.from_pretrained("bert-base-uncased")   # WordPiece under the hood
print(bert.tokenize("unbelievable"))   # ['un', '##bel', '##ie', '##vable']
```

### 3.6 Strengths & Weaknesses

**Strengths**
- **Principled objective** — likelihood/PMI-based selection prefers *informative* merges, not just frequent ones.
- **Compact, high-quality vocabularies** — often better morphological alignment than raw BPE.
- **Proven for masked LMs** — the backbone of the entire BERT family.
- Deterministic and fast at encode time (greedy longest-match).

**Weaknesses**
- **Not inherently zero-OOV** — classic WordPiece emits `[UNK]` for a word if any piece is unmatchable (unless byte fallback is added).
- **Greedy longest-match can be suboptimal** — the longest prefix isn't always the segmentation the training objective would prefer.
- **Continuation-prefix bookkeeping** (`##`) complicates detokenization and cross-model comparisons.
- Still a single deterministic segmentation per word — **no native subword regularization**.

### 3.7 Real-World Usage

- **BERT** and its distillations — **DistilBERT**, **ELECTRA**, **MobileBERT**.
- **Many multilingual encoders** derived from BERT (e.g. mBERT uses WordPiece).
- General rule of thumb: if it's a **BERT-lineage encoder**, it's almost certainly WordPiece; if it's a **GPT-lineage decoder**, it's BPE.

### 3.8 Expert Takeaway

> *What must a practitioner truly understand about WordPiece that textbooks often miss?*

- **It's "BPE with a denominator."** The *only* conceptual change from BPE is normalizing the merge score by the individual frequencies of the two symbols (PMI-like). If you can explain why that denominator matters — it suppresses merges of individually-ubiquitous symbols in favor of genuinely co-dependent ones — you understand WordPiece.
- **Training rule ≠ encoding rule.** WordPiece *trains* with a likelihood objective but *encodes* with greedy **longest-match-first**. This mismatch means the runtime segmentation is a heuristic approximation of the trained model — a subtle point most explanations skip.
- **`[UNK]` is a real failure mode.** Because classic WordPiece can dead-end to whole-word `[UNK]`, coverage of your target domain's characters matters. On noisy user text (emoji, rare scripts), verify your tokenizer isn't silently `[UNK]`-ing content. Modern BERT variants add byte fallback; don't assume it.
- **The `##` marker is load-bearing.** It encodes "this piece continues the previous word." Getting decoding right (and comparing tokenizations across models) requires respecting it. Bugs here cause subtle detokenization spacing errors.

---

## 4. Unigram Language Model

### 4.1 Overview & Analogy

The **Unigram Language Model** tokenizer, introduced by **Kudo (2018)**, takes the **opposite** approach to BPE/WordPiece. Instead of *building up* a vocabulary by merging, it **starts with a large superset** of candidate subwords and **prunes it down**, iteratively removing the pieces that contribute least to the likelihood of the corpus. It also treats segmentation as **probabilistic**: any word can be split many ways, each with a probability, and the tokenizer keeps a full model rather than a single deterministic rule.

> 💡 **Intuitive analogy — sculpting / a talent roster.** BPE and WordPiece are *builders* stacking bricks upward. Unigram is a **sculptor** who starts with a big block (a huge candidate vocabulary) and **chips away** everything that isn't needed. Equivalently: start with a bloated roster of every plausible subword, then repeatedly **cut the players who add the least value** to the team's overall performance (corpus likelihood), until the roster is the right size.

The problem it solves: BPE/WordPiece commit to *one* segmentation and grow greedily. Unigram provides (a) a **globally optimized** vocabulary under an explicit probabilistic model, and (b) **multiple segmentations with probabilities**, enabling **subword regularization** (sampling different segmentations during training for robustness).

### 4.2 Algorithm Steps

Unigram is trained with the **Expectation–Maximization (EM)** algorithm plus a pruning loop:

1. **Seed a large vocabulary.** Build a big candidate set of substrings (e.g. all frequent substrings / character n-grams, or the union of many BPE merges) — often ~1M candidates, much larger than the target.
2. **Assign initial probabilities** `p(x)` to every candidate token `x` (e.g. proportional to frequency).
3. **E-step:** For each word, compute the set of possible segmentations and their probabilities under the current model; use the **Viterbi/forward-backward** algorithm to find the most likely segmentation (and expected token counts).
4. **M-step:** Re-estimate each token's probability `p(x)` from the expected counts to maximize corpus likelihood.
5. **Compute each token's "loss contribution"** — how much the total corpus log-likelihood would **drop** if that token were removed from the vocabulary.
6. **Prune:** remove the bottom `η%` (e.g. 10–20%) of tokens with the smallest loss contribution. **Never prune single characters** (they are the safety net that guarantees any string is representable).
7. **Repeat** steps 3–6 until `|V|` reaches the target size.

**Encoding:** given the final model with fixed `p(x)`, find the segmentation that **maximizes the product of token probabilities** via **Viterbi decoding** (the single best path). Optionally **sample** a segmentation for subword regularization.

**Decoding:** concatenate pieces (SentencePiece uses the `▁` meta-symbol for spaces — see §6.4), which makes decoding fully reversible and whitespace-exact.

⚠️ **Common mistake:** Thinking Unigram "merges" like BPE. It never merges — it **deletes**. It is **top-down pruning**, the mirror image of BPE's bottom-up merging.

### 4.3 Worked Example

Take the word `"newest"` and a small trained Unigram model with these token probabilities (illustrative):

```
Token      p(x)
-----      ------
new        0.30
newest     0.02
est        0.20
ne         0.10
we         0.05
st         0.15
e          0.08
w          0.05
n          0.05
s          0.05
t          0.05
```

**Candidate segmentations of `"newest"`** and their scores (product of piece probabilities):

```
["newest"]                = 0.02
["new", "est"]            = 0.30 × 0.20            = 0.0600   <-- best
["new", "e", "st"]        = 0.30 × 0.08 × 0.15     = 0.00360
["ne", "we", "st"]        = 0.10 × 0.05 × 0.15     = 0.00075
["n","e","w","e","s","t"] = 0.05×0.08×0.05×0.08×0.05×0.05 ≈ 4.0e-8
```

Viterbi picks `["new", "est"]` (highest probability, `0.06`). Crucially, the model *knows the others exist* and their probabilities — so during training it can **sample** `["new","e","st"]` occasionally to regularize the downstream model. This is the unique capability BPE/WordPiece lack.

The training-time **pruning intuition**: if removing the token `newest` (p = 0.02) barely lowers total corpus likelihood — because those words are already well explained by `new`+`est` — then `newest` is a prime candidate for deletion. Tokens that are the *only* good way to cover some frequent text survive.

### 4.4 Math & Scoring

**The unigram model.** A segmentation of a sentence is a sequence of tokens `x = (x₁, …, x_M)`, and the model assumes tokens are **independent** (hence "unigram"):

$$
P(\mathbf{x}) = \prod_{i=1}^{M} p(x_i), \qquad \sum_{x \in V} p(x) = 1
$$

**Best segmentation.** For an input string `s`, decoding chooses the segmentation with maximum probability over the set `S(s)` of all valid segmentations:

$$
\mathbf{x}^{*} = \underset{\mathbf{x} \in S(s)}{\arg\max} \prod_{i=1}^{M} p(x_i)
$$

computed efficiently with **Viterbi** in `O(|s|²)` (or better with a trie).

**Training objective.** The token probabilities are fit by **maximizing the marginal log-likelihood** of the corpus, marginalizing over the hidden segmentation of each word `w` (since we don't know the "true" split):

$$
\mathcal{L} = \sum_{w \in \text{corpus}} \log \sum_{\mathbf{x} \in S(w)} P(\mathbf{x})
= \sum_{w} \log \sum_{\mathbf{x} \in S(w)} \prod_{i} p(x_i)
$$

This hidden-variable objective is optimized with **EM**: the E-step computes expected token counts under the current `p(x)` (forward–backward over segmentation lattices), the M-step updates `p(x)` to the normalized expected counts.

**Pruning criterion.** For each token `x`, estimate `Δℒ_x`, the drop in `ℒ` if `x` is removed (approximately: how much likelihood the corpus loses when forced to reroute through alternative segmentations). Remove the tokens with the **smallest** `Δℒ_x`:

$$
\text{prune } x \;\text{ if } \; \Delta\mathcal{L}_x \text{ is among the smallest } \eta\% \quad(\text{keep all single characters})
$$

**Subword regularization (Kudo, 2018).** Instead of always taking `x*`, **sample** a segmentation from the `l`-best paths using a temperature-controlled distribution:

$$
P(\mathbf{x} \mid s) = \frac{P(\mathbf{x})^{1/\tau}}{\sum_{\mathbf{x}' \in S(s)} P(\mathbf{x}')^{1/\tau}}
$$

where `τ` controls sharpness (`τ → 0` ⇒ deterministic Viterbi; larger `τ` ⇒ more diverse sampling). Training the downstream model on sampled segmentations acts as data augmentation and consistently improves robustness and translation quality.

### 4.5 Code Implementation

Via SentencePiece (the reference implementation) — Unigram is the **default** SentencePiece model:

```python
import sentencepiece as spm

# 1. Train a Unigram model directly from a raw text file.
spm.SentencePieceTrainer.train(
    input="corpus.txt",
    model_prefix="unigram",
    vocab_size=8000,
    model_type="unigram",          # <-- Unigram LM (default). Alt: "bpe","char","word"
    character_coverage=0.9995,     # fraction of chars to cover (use 1.0 for rich scripts)
)

# 2. Load and encode.
sp = spm.SentencePieceProcessor(model_file="unigram.model")
print(sp.encode("newest", out_type=str))        # ['▁new', 'est']  (▁ = space)
print(sp.encode("newest", out_type=int))         # [ ...ids... ]

# 3. Subword regularization: SAMPLE alternative segmentations (data augmentation).
for _ in range(3):
    print(sp.encode("newest", out_type=str,
                    enable_sampling=True, alpha=0.1, nbest_size=-1))
# e.g. ['▁new','est'] / ['▁ne','we','st'] / ['▁new','e','st']

# 4. Decode is exact (▁ restores spaces).
print(sp.decode(['▁new', 'est']))                # 'newest'
```

Equivalent via Hugging Face `tokenizers`:

```python
from tokenizers import Tokenizer
from tokenizers.models import Unigram
from tokenizers.trainers import UnigramTrainer
from tokenizers.pre_tokenizers import Metaspace

tokenizer = Tokenizer(Unigram())
tokenizer.pre_tokenizer = Metaspace(replacement="▁")   # SentencePiece-style spaces
trainer = UnigramTrainer(
    vocab_size=8000,
    unk_token="[UNK]",
    special_tokens=["[UNK]", "[CLS]", "[SEP]", "[PAD]", "[MASK]"],
)
tokenizer.train(["corpus.txt"], trainer)
```

### 4.6 Strengths & Weaknesses

**Strengths**
- **Globally optimized** vocabulary under an explicit probabilistic objective (not greedy).
- **Probabilistic** — provides `p(x)` and multiple scored segmentations.
- **Subword regularization** built-in — sampling segmentations improves downstream robustness, especially for MT and low-resource languages.
- **Often better segmentation quality** than BPE at the same vocab size; strong multilingual behavior.
- With SentencePiece, **no pre-tokenization / whitespace-exact** (treats text as a raw stream).

**Weaknesses**
- **More complex & slower to train** (EM + repeated Viterbi over a huge seed vocab).
- **Harder to explain** than BPE's one-line merge rule.
- Encoding is `O(n²)`-ish per word (Viterbi) vs BPE's linear merge replay — usually negligible in practice with tries, but non-trivial.
- Requires care choosing seed vocabulary and `character_coverage` for multilingual corpora.

### 4.7 Real-World Usage

- **T5 / mT5** — Unigram via SentencePiece.
- **ALBERT**, **XLNet** — SentencePiece Unigram.
- **XLM-RoBERTa** — SentencePiece (Unigram-style) for 100 languages.
- **DeBERTa-v2/v3**, many multilingual and MT models.
- Generally the **default choice for multilingual and translation** systems because of regularization + whitespace-exact handling.

### 4.8 Expert Takeaway

> *What must a practitioner truly understand about Unigram that textbooks often miss?*

- **It's top-down, probabilistic, and the only one that regularizes.** The headline is not "another subword method" — it's that Unigram gives you a **distribution over segmentations**. Subword regularization (sampling splits during training) is a real, cheap robustness win, and it is *impossible* with vanilla BPE/WordPiece (BPE-dropout was later invented to imitate it).
- **Vocabulary is chosen globally, not greedily.** Because it prunes to maximize corpus likelihood, Unigram vocabularies tend to be more "balanced" and less artifact-ridden than greedy merges — a reason it shines multilingually.
- **Unigram ≠ SentencePiece.** SentencePiece is the *library/framework* (it also implements BPE); Unigram is the *algorithm*. Conflating them is the most common misconception. SentencePiece's other big contribution is **treating whitespace as a normal symbol (`▁`)**, giving lossless, language-agnostic detokenization — orthogonal to the choice of Unigram vs BPE.
- **At inference you usually take Viterbi (the best path).** Sampling is a *training-time* tool. In production you typically decode deterministically; keep the sampling for augmentation during model training.

---

## 5. Comparative Analysis

### 5.1 Side-by-side comparison

| Feature | **BPE** | **WordPiece** | **Unigram LM** |
|---|---|---|---|
| **Origin** | Gage 1994 (compression); Sennrich et al. 2016 (NLP) | Schuster & Nakamura 2012 | Kudo 2018 |
| **Training objective** | Maximize pair **frequency** (implicit compression) | Maximize corpus **likelihood** (PMI-like score) | Maximize corpus **likelihood** (EM, marginal over segmentations) |
| **Selection rule** | `argmax count(A,B)` | `argmax count(A,B) / (count(A)·count(B))` | Remove tokens with smallest `Δ` log-likelihood |
| **Vocabulary construction** | **Bottom-up** merging | **Bottom-up** merging | **Top-down** pruning from large seed set |
| **Direction** | Build up from characters | Build up from characters | Cut down from superset |
| **Model artifact** | Ordered **merge list** | Final **vocab** (+ `##` prefix) | Vocab **with probabilities** `p(x)` |
| **Encoding method** | Replay merges **in order** (greedy) | **Greedy longest-match-first** | **Viterbi** (max-probability path) |
| **Segmentations per word** | Single (deterministic) | Single (deterministic) | Multiple, **probabilistic** (can sample) |
| **Subword regularization** | ✗ (needs BPE-dropout) | ✗ | ✓ **native** |
| **OOV handling** | Char/byte fallback ⇒ **zero OOV** (byte-level) | `[UNK]` whole word if unmatchable (unless byte fallback) | Char fallback ⇒ effectively zero OOV |
| **Continuation marker** | End-of-word (`</w>` / `Ġ` space-prefix) | `##` on continuations | `▁` space-prefix (SentencePiece) |
| **Decoding** | Concatenate + restore spaces | Concatenate + strip `##` | Concatenate + restore `▁` (exact) |
| **Speed (train / encode)** | Fast / very fast | Fast / fast | Slower / fast-ish (Viterbi) |
| **Typical use** | Decoder LMs, MT | Encoder LMs (BERT family) | Multilingual & MT, encoder-decoder |
| **Used in** | GPT-2/3/4, RoBERTa, LLaMA, Mistral, BART | BERT, DistilBERT, ELECTRA, mBERT | T5, mT5, ALBERT, XLNet, XLM-R, DeBERTa |

### 5.2 How to read the table

- **BPE vs WordPiece** differ almost *only* in the merge score (the denominator). Same bottom-up shape, same deterministic single segmentation. If you understand `argmax count` vs `argmax PMI`, you understand the difference.
- **Unigram is the odd one out**: top-down, probabilistic, regularizable. It's the conceptual opposite of BPE.
- **The `Used in` row is the fastest way to guess a model's tokenizer**: GPT-lineage ⇒ BPE, BERT-lineage ⇒ WordPiece, T5/multilingual ⇒ Unigram.

---

## 6. Advanced Topics

### 6.1 Vocabulary size tradeoffs

Vocabulary size `|V|` is the master dial. The tradeoff:

- **Larger `|V|`** ⇒ shorter sequences (cheaper attention, more text per context window), but a **bigger embedding + softmax** (`|V| × d_model` parameters), more **rare tokens** that are undertrained, and higher memory.
- **Smaller `|V|`** ⇒ fewer parameters and better-trained tokens, but **longer sequences** (more compute) and more fragmentation.

Rules of thumb:
- Monolingual English models: **~30K–50K** (BERT 30K, GPT-2 ~50K).
- Large/modern LLMs: **~32K–128K**, trending up (LLaMA 32K, GPT-4 ~100K `cl100k`, some newer ~200K+).
- **Multilingual** models need much larger vocabularies (mT5 250K, XLM-R 250K) to cover many scripts without shredding non-Latin text.

💡 **Pro tip:** The right metric to optimize is **fertility** = average tokens per word (or per byte) *on your target domain*. Measure it on real data before committing to a vocab size — a general-purpose tokenizer often has terrible fertility on code, math, or non-English text, quietly inflating cost.

### 6.2 Rare words and OOV

- **Word-level:** rare/unseen ⇒ `[UNK]`, total information loss. This is *the* problem subwords solve.
- **BPE / Unigram:** gracefully fall back through subwords to single **characters or bytes**, so any string is representable ⇒ **no true OOV**.
- **WordPiece (classic):** can still `[UNK]` a whole word if a piece is unmatchable — verify byte fallback if your domain has unusual characters.
- **Numbers, URLs, code, emoji:** notorious rare-token sources. Byte-level methods handle them without `[UNK]` but can be verbose (an emoji may become several byte tokens). Digit-splitting policies materially affect arithmetic ability.

### 6.3 Byte-level BPE (GPT-2 → GPT-4)

Standard BPE operates on **Unicode characters**, so its base alphabet must include every character that could appear — impractical for full Unicode, and unseen characters become `[UNK]`. **Byte-level BPE** (Radford et al., GPT-2) fixes this by running BPE over **raw UTF-8 bytes**:

- Base alphabet is exactly **256 bytes** — *every* possible input maps to some sequence of bytes ⇒ **provably zero OOV**, no `[UNK]` token ever needed.
- Merges then combine bytes into larger units exactly as normal BPE would.
- GPT-2 adds a **byte-to-printable-unicode mapping** so bytes are viewable/serializable, and uses a regex-based pre-tokenizer that produces the famous **`Ġ` (space)** prefix marking word starts.
- **Any language, emoji, or binary-ish text is representable.** The cost: non-Latin scripts can require several byte tokens per character (higher fertility), which is why GPT models are relatively expensive on, e.g., Chinese or Hindi text.

Used by **GPT-2/3/4**, **RoBERTa**, and (as byte-fallback BPE) **LLaMA/Mistral** via SentencePiece.

⚠️ **Common mistake:** Confusing "byte-level BPE" (base alphabet = 256 bytes) with "byte fallback" (a mostly-character vocab that *drops to bytes only for unknown characters*, as in LLaMA's SentencePiece). Both guarantee no OOV, but they are different mechanisms.

### 6.4 SentencePiece framework overview

**SentencePiece** (Kudo & Richardson, 2018) is a **library/framework**, not an algorithm. Key ideas:

- Implements **both Unigram (default) and BPE** — `model_type` selects.
- **Language-agnostic, raw-stream input:** it does **no external pre-tokenization** and does not assume whitespace-delimited words (essential for Japanese, Chinese, Thai). Whitespace is escaped to the meta-symbol **`▁` (U+2581)** and treated like any other character.
- **Lossless & reversible:** because spaces are encoded explicitly as `▁`, `decode(encode(x)) == x` exactly — no ambiguity about where spaces go.
- **Self-contained model file** bundling vocab + normalization rules, ideal for reproducibility.
- Supports **subword regularization / sampling** for the Unigram model.

This is why T5, ALBERT, XLM-R, LLaMA, and many multilingual models ship SentencePiece models — the framework, independent of whether the underlying algorithm is Unigram or BPE.

### 6.5 Tokenization in multilingual models

- **Coverage vs fairness:** a shared vocabulary across languages must budget slots across scripts. Under-represented languages get **higher fertility** (more tokens per word), which means slower, costlier processing and effectively **shorter usable context** — a real equity/cost issue.
- **`character_coverage`:** SentencePiece parameter (e.g. `0.9995` for Latin-heavy corpora, `1.0` for CJK/rich scripts) controls how aggressively rare characters are kept vs dropped to byte fallback.
- **Unigram tends to win multilingually:** its global, probabilistic vocabulary and native regularization handle diverse scripts more gracefully than greedy BPE — hence mT5/XLM-R choices.
- **Normalization matters:** Unicode NFKC normalization, casing, and accent handling are part of the tokenizer and strongly affect multilingual behavior. Decisions here are as important as the algorithm.
- **Balancing corpora:** training data is often up-/down-sampled per language (temperature sampling) so the vocabulary isn't dominated by high-resource languages.

---

## 7. Must-Know Checklist & Interview Insights

### 7.1 The 60-second mental model

- **BPE** = greedy **frequency** merging, **bottom-up**, deterministic, a *compression* codebook. `argmax count(A,B)`.
- **WordPiece** = BPE **with a denominator** — merge on **likelihood/PMI** `count(A,B)/(count(A)·count(B))`, encode by **greedy longest-match**, uses `##`.
- **Unigram** = **top-down** pruning of a big vocab to **maximize corpus likelihood** (EM), **probabilistic**, **Viterbi** decoding, **native subword regularization**.
- **SentencePiece** = the **framework** (does Unigram *and* BPE; `▁` for spaces; raw-stream, lossless), **not** an algorithm.

### 7.2 Key facts (rapid fire)

- All three are **subword** methods that essentially eliminate OOV and bound vocabulary size.
- **Byte-level BPE** = base alphabet of **256 bytes** ⇒ zero OOV, no `[UNK]` (GPT-2/3/4, RoBERTa).
- **Vocab size** trades sequence length (compute) against embedding/softmax size (parameters); optimize **fertility** on *your* domain.
- **Merges are ordered & frozen** in BPE; the vocab is effectively an immutable schema.
- Model → tokenizer cheat sheet: **GPT/RoBERTa/LLaMA → BPE**, **BERT/DistilBERT/ELECTRA → WordPiece**, **T5/ALBERT/XLNet/XLM-R → Unigram**.

### 7.3 Gotchas & ⚠️ traps

- ⚠️ **"Tokens" aren't comparable across models** with different tokenizers — normalize to characters/bytes for fair cost/context comparisons.
- ⚠️ **WordPiece can emit whole-word `[UNK]`** (classic form) — it is *not* automatically byte-safe like byte-level BPE.
- ⚠️ **Unigram never merges** — it *deletes*. Saying "Unigram merges tokens" is wrong.
- ⚠️ **SentencePiece ≠ Unigram.** Framework vs algorithm. SentencePiece can run BPE too.
- ⚠️ **Training rule ≠ encoding rule for WordPiece** (likelihood to train, greedy longest-match to encode).
- ⚠️ **Digit/whitespace pre-tokenization** silently shapes arithmetic ability and multi-space/code handling.
- ⚠️ **Byte-level BPE ≠ byte fallback** — different mechanisms, both zero-OOV.

### 7.4 Interview-ready one-liners

- *"What's the difference between BPE and WordPiece?"* → *"Same bottom-up merging; BPE merges the most frequent pair (`argmax count`), WordPiece merges the pair with the highest likelihood gain, which reduces to `count(A,B)/(count(A)·count(B))` — a PMI-like score that normalizes by individual frequency. WordPiece also encodes via greedy longest-match and marks continuations with `##`."*
- *"Why is Unigram different?"* → *"It's top-down: start from a huge candidate vocab and prune the least useful tokens to maximize corpus likelihood via EM. It's probabilistic, decodes with Viterbi, and uniquely supports subword regularization by sampling segmentations."*
- *"Why byte-level BPE?"* → *"A 256-byte base alphabet guarantees any input is representable — provably zero OOV, no `[UNK]` — at the cost of higher fertility on non-Latin scripts. GPT-2 onward."*
- *"How do you pick vocab size?"* → *"Trade sequence length (compute) against embedding/softmax parameters; measure fertility on the *target domain*; multilingual needs 250K-ish, monolingual English ~30–50K."*
- *"What is SentencePiece?"* → *"A framework — implements Unigram and BPE, treats whitespace as `▁` for lossless, language-agnostic, pre-tokenization-free encoding. Not itself an algorithm."*

### 7.5 Primary references

- **Sennrich, Haddow & Birch (2016)** — *Neural Machine Translation of Rare Words with Subword Units* (BPE for NLP).
- **Gage (1994)** — *A New Algorithm for Data Compression* (original BPE).
- **Schuster & Nakamura (2012)** — *Japanese and Korean Voice Search* (WordPiece).
- **Devlin et al. (2019)** — *BERT* (WordPiece in practice).
- **Kudo (2018)** — *Subword Regularization: … Multiple Subword Candidates* (Unigram LM).
- **Kudo & Richardson (2018)** — *SentencePiece: A simple and language independent subword tokenizer*.
- **Radford et al. (2019)** — *Language Models are Unsupervised Multitask Learners* (GPT-2, byte-level BPE).
- **Provilkov et al. (2020)** — *BPE-Dropout* (regularization for BPE).

---

*End of guide. Read §7 first for a fast refresher; read §2–§4 for depth; keep §5 open when choosing a tokenizer for a new model.*

---

## Related Guides

**Prerequisites:** [Tries (Prefix Trees)](/docs/tries) · [Hash Maps & Sets](/docs/hash-maps-and-sets)  
**See also:** [Tries (Prefix Trees)](/docs/tries) · [Beam Search & Constrained Decoding](/docs/beam-search) · [Matrix Ops, Attention O(n²) & Sparse Formats](/docs/matrix-ops-attention-sparse)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
