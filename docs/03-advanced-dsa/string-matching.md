---
title: String Matching — Rolling Hash, Rabin-Karp, KMP, Z & Aho-Corasick
slug: /string-matching
sidebar_position: 13
sidebar_label: String Matching
description: >-
  Classic linear-time substring search — rolling hashes and Rabin-Karp, the KMP failure function, the Z-algorithm, and multi-pattern Aho-Corasick — and how they power search, IR, and tokenization.
tags:
  - strings
  - kmp
  - rolling-hash
  - pattern-matching
difficulty: advanced
reading_time: 26
prerequisites:
  - title: Arrays & Strings
    to: /docs/arrays-and-strings
  - title: Hash Maps & Sets
    to: /docs/hash-maps-and-sets
pagination_prev: advanced-dsa/graph-connectivity
pagination_next: advanced-dsa/tree-algorithms
path_step: 27
---

# String Matching: Rolling Hash, Rabin-Karp, KMP, Z & Aho-Corasick

> The core question — *"where does pattern `P` occur inside text `T`?"* — has a naïve `O(n·m)` answer (try every alignment) and several `O(n + m)` answers. This guide covers the classic linear-time string-matching algorithms and the single insight each contributes: **rolling hashes** (compare in `O(1)`), **KMP** (never re-examine text), the **Z-algorithm** (prefix-match array), and **Aho-Corasick** (all patterns at once). [Tries](/docs/tries) gave you prefix structures; this guide gives you the matching algorithms that run on strings directly.

Throughout, `n = |T|` (text length) and `m = |P|` (pattern length).

---

## 1. The baseline: naïve matching

Slide `P` across `T` and compare character by character:

```python
def naive_search(text, pat):
    n, m = len(text), len(pat)
    hits = []
    for i in range(n - m + 1):           # each alignment
        if text[i:i + m] == pat:         # up to m comparisons
            hits.append(i)
    return hits
```

`O(n·m)` worst case (e.g. `T = "aaaa...a"`, `P = "aaa...b"` — every alignment compares `m` chars before failing). Every algorithm below beats this by *reusing information* from failed comparisons instead of restarting.

---

## 2. Rolling Hash & Rabin-Karp

### 2.1 The idea

> **Hash the pattern once. Slide a window over the text, maintaining the window's hash in `O(1)` per step (a "rolling" update). When a window's hash equals the pattern's hash, verify the actual characters.** Comparing two hashes is `O(1)`; verification guards against hash collisions.

A **polynomial rolling hash** treats a string as a base-`b` number modulo a large prime `M`:

```
hash(s) = (s[0]·b^{m-1} + s[1]·b^{m-2} + ... + s[m-1]·b^0)  mod M
```

Sliding the window one step removes the leading character's contribution and adds a new trailing character — an `O(1)` update:

```
new = ( (old - s[i]·b^{m-1}) · b + s[i+m] )  mod M
```

### 2.2 Implementation

```python
def rabin_karp(text, pat, base=257, mod=(1 << 61) - 1):
    """Find all occurrences of pat in text. Average O(n + m); worst O(n*m) if
    collisions force verification every step. Uses a large prime mod."""
    n, m = len(text), len(pat)
    if m == 0 or m > n:
        return []
    high = pow(base, m - 1, mod)              # b^(m-1) mod M, precomputed
    ph = th = 0
    for i in range(m):                         # hash pattern + first window
        ph = (ph * base + ord(pat[i]))  % mod
        th = (th * base + ord(text[i])) % mod
    hits = []
    for i in range(n - m + 1):
        if ph == th and text[i:i + m] == pat:  # verify to rule out collision
            hits.append(i)
        if i < n - m:                          # roll to the next window
            th = (th - ord(text[i]) * high) % mod
            th = (th * base + ord(text[i + m])) % mod
    return hits

print(rabin_karp("abracadabra", "abra"))   # [0, 7]
```

### 2.3 Complexity & the collision reality

- **Average / expected:** `O(n + m)` — each roll is `O(1)`, verification is rare with a good hash.
- **Worst case:** `O(n·m)` — an adversary who forces a hash match at every window makes you verify every time. Mitigate with a **large random prime** (or **double hashing** — two independent moduli), which makes adversarial collisions astronomically unlikely but never impossible.
- **Space:** `O(1)` beyond the output.

> ⚠️ **Never skip verification** with a single hash unless a false positive is truly acceptable. For guaranteed correctness on adversarial input, use double hashing *and* verify, or switch to KMP/Z (which are worst-case linear with no probabilistic caveat).

### 2.4 Where rolling hashes shine

Rabin-Karp's real power is **multi-pattern search of equal-length patterns** (hash all patterns into a set, one pass over the text) and **substring deduplication**: rolling hashes over document shingles are the backbone of near-duplicate detection.

---

## 3. KMP: the failure function

### 3.1 The idea

> **When a mismatch happens after matching `k` characters of `P`, we already know those `k` text characters — they equal `P[0..k-1]`. So instead of restarting, jump the pattern forward by reusing the longest proper prefix of `P[0..k-1]` that is also a suffix of it.** That "longest prefix-suffix" table (the **failure function**, `π`) is precomputed from `P` alone.

KMP never moves the text pointer backward — each text character is examined at most a constant number of times — giving `O(n + m)` with **no probabilistic caveat**.

### 3.2 The failure function

`π[i]` = length of the longest proper prefix of `P[0..i]` that is also a suffix of `P[0..i]`. For `P = "ababaca"`: `π = [0,0,1,2,3,0,1]`.

```python
def prefix_function(pat):
    """pi[i] = length of the longest proper prefix of pat[0..i] that is also a suffix.
    O(m) time via the standard two-pointer construction."""
    m = len(pat)
    pi = [0] * m
    k = 0                                 # length of the current prefix-suffix
    for i in range(1, m):
        while k > 0 and pat[i] != pat[k]:
            k = pi[k - 1]                 # fall back to the next-best border
        if pat[i] == pat[k]:
            k += 1
        pi[i] = k
    return pi
```

### 3.3 KMP search

```python
def kmp_search(text, pat):
    """All occurrences of pat in text in O(n + m), worst-case guaranteed."""
    if not pat:
        return []
    pi = prefix_function(pat)
    hits = []
    k = 0                                  # chars of pat currently matched
    for i, ch in enumerate(text):
        while k > 0 and ch != pat[k]:
            k = pi[k - 1]                  # reuse the failure function -> no text rewind
        if ch == pat[k]:
            k += 1
        if k == len(pat):                  # full match
            hits.append(i - len(pat) + 1)
            k = pi[k - 1]                  # continue for overlapping matches
    return hits

print(kmp_search("ababcababa", "aba"))   # [0, 5, 7]
```

### 3.4 Complexity & intuition

- **Time:** `O(n + m)`, worst-case guaranteed. **Space:** `O(m)` for `π`.
- **The amortized argument:** `k` increases by at most 1 per text character (total `≤ n` increments) and the `while` loop only *decreases* `k`, so total decrements `≤` total increments `≤ n`. The inner loop is therefore `O(n)` overall, not `O(n·m)` — the same amortized reasoning as a monotonic stack.

### 3.5 Common mistakes

- **Rebuilding matched text.** The entire point is that you *don't* re-scan text on mismatch — only the pattern pointer falls back via `π`. Re-scanning text reintroduces `O(n·m)`.
- **Off-by-one in `π`.** `π` is over the *pattern*; `π[i]` uses `π[k-1]` for fallback. The "proper" prefix (strictly shorter than the whole) matters — a border can't be the full string.

---

## 4. The Z-Algorithm

### 4.1 The idea

> **`Z[i]` = the length of the longest substring starting at `i` that matches a prefix of the string.** Compute all `Z` values in one `O(n)` pass by maintaining the rightmost `[L, R]` "Z-box" already matched, reusing prior work inside it.

The Z-array is an alternative to KMP's `π` that many find more intuitive. To find `P` in `T`, run Z on `P + '#' + T` (with a separator not in either) and look for `Z[i] == |P|`.

### 4.2 Implementation

```python
def z_function(s):
    """Z[i] = length of longest substring starting at i matching a prefix of s. O(n)."""
    n = len(s)
    z = [0] * n
    z[0] = n                               # convention: whole string matches its prefix
    l = r = 0                              # current rightmost Z-box [l, r]
    for i in range(1, n):
        if i < r:                          # inside the box -> reuse a mirror value
            z[i] = min(r - i, z[i - l])
        while i + z[i] < n and s[z[i]] == s[i + z[i]]:  # extend by direct comparison
            z[i] += 1
        if i + z[i] > r:                   # push the box rightward
            l, r = i, i + z[i]
    return z

def z_search(text, pat):
    """All occurrences of pat in text via the Z-array. O(n + m)."""
    if not pat:
        return []
    s = pat + '\x00' + text                # separator absent from both strings
    z = z_function(s)
    m = len(pat)
    return [i - m - 1 for i in range(len(s)) if z[i] == m]

print(z_search("aabxaabxcaabxaabxay", "aabxaabxay"))   # [9]
```

### 4.3 Complexity & KMP vs. Z

- **Time:** `O(n + m)`, worst-case guaranteed. **Space:** `O(n + m)` for the concatenated string's Z-array.
- **KMP vs. Z:** identical complexity; different mental model. KMP's `π` is a *border* table computed left-to-right and used online; Z gives *prefix-match lengths* and is often cleaner for problems like "how many prefixes are also suffixes" or "string periodicity." Learn both — many editorials use one or the other interchangeably.

---

## 5. Aho-Corasick: many patterns at once

### 5.1 The idea

> **Build a [trie](/docs/tries) of all patterns, then add "failure links" (like KMP's `π`, but on the trie) that point each node to the longest proper suffix that is also a prefix of some pattern. A single pass over the text — following goto edges and failure links — finds *all* occurrences of *all* patterns simultaneously.**

Where running KMP `k` times costs `O(k·n)`, Aho-Corasick costs `O(n + Σ|Pᵢ| + matches)` — one text pass regardless of how many patterns you search for.

### 5.2 Implementation (sketch)

```python
from collections import deque

class AhoCorasick:
    def __init__(self, patterns):
        # goto: list of dicts; fail: failure links; out: patterns ending at a node
        self.goto = [{}]
        self.fail = [0]
        self.out = [[]]
        for p in patterns:
            self._add(p)
        self._build_links()

    def _add(self, word):
        node = 0
        for ch in word:
            if ch not in self.goto[node]:
                self.goto[node][ch] = len(self.goto)
                self.goto.append({}); self.fail.append(0); self.out.append([])
            node = self.goto[node][ch]
        self.out[node].append(word)

    def _build_links(self):
        q = deque()
        for ch, nxt in self.goto[0].items():   # depth-1 nodes fail to root
            self.fail[nxt] = 0
            q.append(nxt)
        while q:                                # BFS builds failure links by depth
            u = q.popleft()
            for ch, v in self.goto[u].items():
                q.append(v)
                f = self.fail[u]
                while f and ch not in self.goto[f]:
                    f = self.fail[f]            # walk failure links until ch is available
                self.fail[v] = self.goto[f].get(ch, 0) if f or ch in self.goto[0] else 0
                self.out[v] += self.out[self.fail[v]]   # inherit suffix matches

    def search(self, text):
        node, hits = 0, []
        for i, ch in enumerate(text):
            while node and ch not in self.goto[node]:
                node = self.fail[node]          # follow failure links on mismatch
            node = self.goto[node].get(ch, 0)
            for pat in self.out[node]:          # every pattern ending here
                hits.append((i - len(pat) + 1, pat))
        return hits

ac = AhoCorasick(["he", "she", "his", "hers"])
print(ac.search("ushers"))   # [(1, 'she'), (2, 'he'), (2, 'hers')]
```

### 5.3 Complexity

- **Build:** `O(Σ|Pᵢ|)` (trie) + `O(Σ|Pᵢ|)` (failure links via BFS).
- **Search:** `O(n + z)` where `z` = number of matches reported. **This is the win:** independent of the *number* of patterns.
- **Space:** `O(Σ|Pᵢ| · |Σ|)` for the automaton (a **double-array trie** compresses this in production).

### 5.4 Where Aho-Corasick shines

Multi-keyword search: **content filtering / blocklists**, **named-entity/gazetteer matching** (find all million known entity names in a document in one pass), **intrusion-detection signatures**, and virus scanners. It is the multi-pattern generalization of KMP, and the failure link *is* KMP's `π` lifted onto a trie.

---

## 6. Choosing an algorithm

| Situation | Algorithm | Time |
|---|---|---|
| Single pattern, simple, avg-case OK | Rabin-Karp | `O(n+m)` avg |
| Single pattern, worst-case guarantee | **KMP** or **Z** | `O(n+m)` |
| Many equal-length patterns | Rabin-Karp (hash set) | `O(n)` avg |
| Many patterns, any length | **Aho-Corasick** | `O(n + Σ|Pᵢ| + z)` |
| Substring queries on one *fixed* text, many patterns | Suffix array / [suffix tree](/docs/tries) | `O(m log n)` / `O(m)` per query |
| Near-duplicate document detection | Rolling hash (shingling / MinHash) | `O(n)` |

**Rule of thumb:** one pattern → KMP/Z (or Rabin-Karp if average case suffices); many patterns → Aho-Corasick; many *queries* against one fixed text → build a suffix structure once.

---

## 7. AI / ML / IR connection

- **Tokenization longest-match.** Subword tokenizers ([BPE/WordPiece](/docs/tokenization)) do greedy longest-match against a fixed vocabulary — implemented with tries and, for special-token splitting, **Aho-Corasick-style** automata (HuggingFace's tokenizer uses exactly this for `<|endoftext|>` and friends).
- **Information retrieval & indexing.** Inverted-index construction, phrase queries, and highlighting matched spans use these matchers; Lucene/Elasticsearch store term dictionaries as minimized automata (FST) — a compressed cousin of the Aho-Corasick trie.
- **Training-data curation.** Rolling-hash **shingling** (and MinHash/LSH built on it) deduplicates web-scale pretraining corpora — a documented, high-impact preprocessing step for LLM data quality (see the dedup discussion in [Streaming & Caching](/docs/streaming-caching)).
- **Guardrails & content moderation.** Multi-pattern blocklist scanning of prompts/outputs is an Aho-Corasick single-pass check before escalating to more expensive classifiers.
- **Autocomplete & spell-check.** Prefix matching (tries) plus edit-distance-bounded search complements exact matchers for fuzzy retrieval.

---

## 8. Practice Problems

| # | Problem | Algorithm | What it teaches |
|---|---|---|---|
| 1 | **Implement strStr() / Find the Index of First Occurrence** (LC 28) | KMP or Z | The canonical single-pattern search; try naïve first, then KMP. |
| 2 | **Repeated String Match** (LC 686) | KMP/Z | Match across repeated copies — reason about how many copies are needed. |
| 3 | **Shortest Palindrome** (LC 214) | KMP `π` / Z | Prepend the fewest chars to make a palindrome — a classic `π`-on-`s + '#' + reverse(s)` trick. |
| 4 | **Longest Happy Prefix** (LC 1392) | KMP `π` | Directly asks for `π[n-1]` — the longest prefix that is also a suffix. |
| 5 | **Repeated Substring Pattern** (LC 459) | KMP periodicity | Uses `n - π[n-1]` to detect the smallest repeating period. |
| 6 | **Stream of Characters** (LC 1032) | Aho-Corasick | Multi-pattern matching over a stream — the automaton's natural habitat. |
| 7 | **Distinct Echo Substrings** (LC 1316) | Rolling hash | Rabin-Karp to compare substrings in `O(1)`; watch collisions. |

### Worked note — string periodicity from KMP (problems 4–5)

A string `s` of length `n` has a repeating period iff `n % (n - π[n-1]) == 0` and `π[n-1] > 0`. The value `n - π[n-1]` is the **smallest period**: the longest prefix-suffix border of length `π[n-1]` means `s` overlaps itself, and the "step" between overlaps is exactly `n - π[n-1]`.

```python
def smallest_period(s):
    pi = prefix_function(s)
    n = len(s)
    period = n - pi[-1]
    return period if n % period == 0 else n   # n itself if not periodic

print(smallest_period("abcabcabc"))   # 3  ("abc" repeated)
print(smallest_period("abcab"))       # 5  (no full period)
```

**Why it works:** the failure function encodes self-overlap; a full period exists exactly when the whole string tiles by that overlap step. **Failure mode:** forgetting the `n % period == 0` check reports a period even when the tail doesn't complete a full copy (e.g. `"abcab"`).

---

## Related Guides

**Prerequisites:** [Arrays & Strings](/docs/arrays-and-strings) · [Hash Maps & Sets](/docs/hash-maps-and-sets)  
**See also:** [Tries (Prefix Trees)](/docs/tries) · [Tokenization Algorithms](/docs/tokenization) · [Stacks & Queues](/docs/stacks-and-queues)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
