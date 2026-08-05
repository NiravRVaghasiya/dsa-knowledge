---
title: Tries (Prefix Trees)
slug: /tries
sidebar_position: 7
sidebar_label: Tries (Prefix Trees)
description: >-
  Prefix-tree structures for string retrieval, autocomplete, and the bridge to tokenization.
tags:
  - tries
  - prefix-trees
  - strings
difficulty: advanced
reading_time: 27
prerequisites:
  - title: Trees & Binary Search Trees
    to: /docs/trees-and-bst
  - title: Hash Maps & Sets
    to: /docs/hash-maps-and-sets
pagination_prev: 03-advanced-dsa/greedy-algorithms
pagination_next: 03-advanced-dsa/segment-tree-fenwick
path_step: 22
---

# Tries (Prefix Trees) — Ultimate Reference Guide

> **Audience:** Students, engineers, and researchers across Data Structures, AI, ML, and LLM systems.
> **Prerequisites:** Basic understanding of trees and Big-O notation. Everything else is built from the ground up.

---

## Table of Contents
1. [Definition & Etymology](#1-definition--etymology)
2. [Visual Intuition & Analogies](#2-visual-intuition--analogies)
3. [Core Structure & Properties](#3-core-structure--properties)
4. [Complexity Analysis](#4-complexity-analysis)
5. [Fundamental Algorithms (with code)](#5-fundamental-algorithms-with-code)
6. [Advanced Variants](#6-advanced-variants)
7. [Applications in DS / AI / ML / LLMs](#7-applications-in-ds--ai--ml--llms)
8. [Expert Takeaways & Best Practices](#8-expert-takeaways--best-practices)
9. [Common Interview Problems (Easy → Hard)](#9-common-interview-problems-easy--hard)
10. [Quick-Reference Cheat Sheet](#10-quick-reference-cheat-sheet)

---

## 1. Definition & Etymology

### Formal Definition

A **Trie** (also called a **prefix tree** or **digital tree**) is a rooted, ordered tree data structure that stores a dynamic set of strings (or, more generally, sequences over an alphabet Σ), where:

- Each **node** represents a single **prefix** of one or more stored keys.
- Each **edge** is labeled with a single symbol `c ∈ Σ`.
- The **key associated with a node** is the concatenation of edge labels along the path from the root to that node.
- The **root** represents the empty string `ε`.
- A boolean flag (commonly `is_end_of_word`) marks nodes that terminate a complete stored key.

Formally, a Trie `T` over alphabet Σ storing key set `S ⊆ Σ*` satisfies:

```
∀ key k ∈ S:  there exists a unique path  root → n₁ → n₂ → … → n_|k|
              such that label(edgeᵢ) = k[i]  and  n_|k|.is_end = True
```

The defining invariant: **all descendants of a node share the common prefix associated with that node.** This is what makes a Trie a *prefix* tree — the tree topology *is* the prefix hierarchy.

### Etymology & Historical Context

- The word **"trie"** comes from the middle of "re**trie**val" — coined to emphasize that the structure is optimized for information *retrieval*.
- **Pronunciation controversy:** Edward Fredkin (who introduced the term in 1960) pronounced it **"tree"** (from *retrieval*). To disambiguate from the general "tree" data structure, most practitioners today say **"try"**.
- **Historical timeline:**
  - **1959** — René de la Briandais first described the structure for file searching.
  - **1960** — Edward Fredkin named it "trie" and popularized it in *Communications of the ACM*.
  - **1968** — Donald Knuth analyzed tries extensively in *The Art of Computer Programming, Vol. 3 (Sorting and Searching)*.
  - **1968** — Donald R. Morrison introduced **PATRICIA** (Practical Algorithm To Retrieve Information Coded In Alphanumeric) — the compressed radix trie.

> 🔑 **Key Insight:** A Trie is not "just another tree." Its structure *encodes prefixes directly into the topology of the tree*, trading memory for O(key-length) lookups that are **independent of the number of keys stored** `n`. This decoupling from `n` is the entire reason tries exist.

---

## 2. Visual Intuition & Analogies

### Analogy 1: The Physical Dictionary / Thumb Index

> 💡 **Analogy:** Think of a Trie like a **physical dictionary with a thumb index**. Each level of the tree is one letter position. To find "apple," you walk to section `a` → `p` → `p` → `l` → `e`. You never re-read the letters you've already matched — each character consumed moves you one shelf deeper. Two words like "apple" and "apply" share the same `a-p-p-l` walk and only diverge at the last letter, so that shared work is done **once**.

Why it works: real dictionaries physically group words by shared prefixes. A Trie does the same in memory — the prefix `app` is stored *exactly once*, no matter how many words start with it (`app`, `apple`, `apply`, `application`).

### Analogy 2: Phone Contact Search / T9 Predictive Text

> 💡 **Analogy:** When you open your phone contacts and type "Jo", the list instantly narrows to *Joe, John, Joanna, Jordan*. The phone isn't scanning all 2,000 contacts and comparing each — it walks down a prefix structure: node `J` → node `o` → and everything hanging below that `o` node is a candidate. Adding another letter just descends one more level.

Why it works: **prefix membership is answered by tree navigation, not by search.** Once you're at the `Jo` node, the entire subtree beneath it is your answer set — no filtering pass needed.

### Analogy 3 (bonus): The IP Routing Table

> 💡 **Analogy:** Internet routers store forwarding rules as binary tries on IP-address bits. A packet's destination address is matched bit-by-bit down the trie until the longest matching prefix (the most specific route) is found. This is *longest-prefix matching* — a task tries are uniquely suited for.

### ASCII Visualization

Storing `{"cat", "car", "card", "dog", "do"}`:

```
                (root ε)
                /       \
              c          d
              |          |
              a          o *          ← "do" ends here (terminal)
             / \         |
            t*  r        g *          ← "dog" ends here
                |
              (r ends "car")*
                |
                d*                     ← "card" ends here

Legend:  * = is_end_of_word (terminal node)
```

Reading the tree:
- Path `c-a-t` → **"cat"** ✓
- Path `c-a-r` → **"car"** ✓ (and continues to `card`)
- Path `c-a-r-d` → **"card"** ✓
- Path `d-o` → **"do"** ✓ (terminal *and* internal — a word that is a prefix of another word)
- Path `d-o-g` → **"dog"** ✓

Notice **"do"** is both a stored word AND a prefix of "dog". This is the classic edge case: a terminal node can have children.

> 🔑 **Key Insight:** The power of a Trie is *shared structure*. The prefix `ca` is stored once and reused by `cat`, `car`, and `card`. The more your keys overlap in prefixes, the more memory you save and the more the structure earns its keep. Conversely, with random high-entropy keys that share no prefixes, a Trie degenerates into a memory-hungry linked list of chains — this is the core tradeoff.

---

## 3. Core Structure & Properties

### Node Structure

The canonical Trie node holds two things:

```python
class TrieNode:
    def __init__(self):
        self.children = {}          # dict: char -> TrieNode
        self.is_end_of_word = False # marks a complete key terminating here
```

**Two mainstream ways to store `children`:**

| Representation      | Storage per node        | Lookup | Best for |
|---------------------|-------------------------|--------|----------|
| **Hash map** (`dict`) | O(number of children)   | O(1) avg | Large/sparse alphabets (Unicode), memory-conscious |
| **Fixed array** `[|Σ|]` | O(\|Σ\|) always (e.g. 26) | O(1) worst | Small dense alphabets (a–z), fastest constant factor |

Optional fields you'll see in production tries:
- `value` — to make it a *map* (key→value), not just a *set*.
- `count` / `word_count` — number of words in this subtree (enables ranking, prefix counts).
- `parent` pointer — enables O(1) upward navigation for deletion.

### Edge Semantics

- Each edge carries **exactly one symbol** from Σ (in a standard trie).
- Edges out of a node are **distinct** — a node never has two edges with the same label (that would violate the deterministic-path invariant).
- The label alphabet Σ can be anything: ASCII characters, bytes (0–255), Unicode code points, DNA bases `{A,C,G,T}`, or bits `{0,1}`.

### Node Roles

| Role | Definition | Notes |
|------|------------|-------|
| **Root** | Represents the empty string `ε`. | Always present, never terminal (unless you explicitly store `""`). Has no incoming edge. |
| **Internal node** | Any non-root node with ≥1 child. | Represents a proper prefix shared by ≥1 key. |
| **Leaf node** | A node with **no** children. | Always terminal in a set-trie (a dangling non-terminal leaf would be wasted space and indicates a bug or pending deletion). |
| **Terminal node** | `is_end_of_word == True`. | Marks a complete stored key. **Can be internal** (e.g. "do" inside "dog"). Terminal ≠ leaf. |

> ⚠️ **Critical distinction:** *Leaf* is a **topological** property (no children). *Terminal* is a **semantic** property (a word ends here). They coincide often but not always. "do" is terminal-but-internal; a half-inserted path could be leaf-but-non-terminal. Never conflate them.

### Structural Invariants

1. **Deterministic paths:** From any node, at most one edge per symbol → any prefix maps to at most one node.
2. **Prefix closure of paths:** Every node's path-string is a prefix of some stored key **or** exactly a stored key.
3. **Root uniqueness:** Exactly one root, representing `ε`.

> 🔑 **Key Insight:** Choosing the `children` representation (array vs. hash map) is the single most impactful engineering decision for a Trie. Array-backed nodes give blazing cache-friendly O(1) transitions but waste `|Σ|` slots per node; hash-map nodes are memory-proportional to actual branching but incur hashing overhead and pointer chasing. For a 26-letter lowercase alphabet, arrays usually win; for Unicode text or byte streams, hash maps (or hybrid/compressed nodes) are mandatory.

---

## 4. Complexity Analysis

Let:
- `m` = length of the key/word being operated on
- `n` = number of keys stored in the trie
- `|Σ|` = alphabet size
- `N` = total number of nodes = sum of all distinct prefixes across all keys

### Time Complexity

| Operation        | Time      | Justification |
|------------------|-----------|---------------|
| `insert(word)`   | **O(m)**  | Walk/create one node per character; each step is O(1) with array or O(1)-avg with hash map. `m` steps total. |
| `search(word)`   | **O(m)**  | Walk one node per character, then check terminal flag. No dependence on `n` — you never compare against other keys. |
| `startsWith(p)`  | **O(m)**  | Same walk as search but skip the terminal check; `m = len(prefix)`. |
| `delete(word)`   | **O(m)**  | One downward walk to locate + one upward/cleanup pass, both bounded by `m`. |
| `autocomplete(p)`| **O(m + k)** | O(m) to reach the prefix node, then O(k) to enumerate the subtree, where `k` = total size of output (number of nodes/chars in all completions). |

**The headline result:** search/insert are **O(m), independent of `n`.** A hash table is O(m) too (you must hash the whole key = read `m` chars), but a balanced BST of strings is **O(m · log n)** because each of the `log n` comparisons may scan up to `m` characters. The Trie removes the `log n` factor entirely.

#### Derivation of O(m) for search
```
Each character c in word (m iterations):
    transition = current.children[c]      # O(1) array / O(1) avg hash
    if transition is None: return False   # O(1)
    current = transition                  # O(1)
Total: m × O(1) = O(m).  No term involving n appears anywhere. ∎
```

### Space Complexity

| Aspect | Complexity | Justification |
|--------|-----------|---------------|
| **Total structure** | **O(N · \|Σ\|)** with array nodes; **O(N)** with hash-map nodes (edges only) | `N` nodes; each array node reserves `\|Σ\|` child slots regardless of use. Hash nodes store only actual children. |
| **Upper bound on N** | **O(n · M)** where `M = max key length` | Worst case (no shared prefixes): every key contributes `m` fresh nodes. |
| **Auxiliary (per op)** | **O(m)** recursion / O(1) iterative | Recursive insert/delete use a call stack of depth ≤ `m`; iterative versions use O(1) extra. |

#### Derivation of the space bound
```
N = number of distinct prefixes over the key set.
  Best case (all keys share prefixes, e.g. dictionary words): N ≪ n·M — massive savings.
  Worst case (disjoint keys, e.g. random hashes): N = Σ mᵢ ≈ n·M — no savings, pure overhead.

Array-backed:  memory = N × |Σ| × (pointer size)
Hash-backed:   memory = (total edges) × (entry size) = (N − 1) edges × entry
```

> ⚠️ **Edge case — the empty string `""`:** Inserting `""` sets `root.is_end_of_word = True`. Searching `""` returns that flag. `startsWith("")` is always true if the trie is non-empty (every key has `ε` as a prefix). Handle `m = 0` explicitly — many buggy implementations crash or misbehave on the empty key.

> 🔑 **Key Insight:** The single most important complexity fact about tries: **lookup cost depends only on key length `m`, never on how many keys `n` are stored.** This is why a trie holding 10 words and a trie holding 10 million words both answer `search("hello")` in the same ~5 steps. The price you pay for this is space — potentially `O(n · M · |Σ|)` in the pathological no-shared-prefix case.

---

## 5. Fundamental Algorithms (with code)

Every algorithm below is given as **pseudocode** first, then a complete **Python** implementation. All operations handle the documented edge cases.

### 5.0 The Base Class

```python
class TrieNode:
    __slots__ = ("children", "is_end_of_word")   # __slots__ cuts per-node memory ~40%

    def __init__(self):
        self.children = {}          # char -> TrieNode
        self.is_end_of_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
```

---

### 5.1 `insert(word)`

**Pseudocode**
```
INSERT(word):
    node ← root
    for each char c in word:
        if c not in node.children:
            node.children[c] ← new TrieNode()
        node ← node.children[c]
    node.is_end_of_word ← True      # marks terminal; handles word == "" too
```

**Python**
```python
def insert(self, word: str) -> None:
    node = self.root
    for char in word:
        if char not in node.children:
            node.children[char] = TrieNode()
        node = node.children[char]
    node.is_end_of_word = True   # duplicate insert is idempotent — flag already True
```

- **Edge cases:** `word == ""` sets `root.is_end_of_word = True`. **Duplicate** inserts are idempotent (no new nodes, flag stays `True`).
- **Complexity:** O(m) time, O(m) new nodes in the worst case.

---

### 5.2 `search(word)` — exact full-word match

**Pseudocode**
```
SEARCH(word) → bool:
    node ← WALK(word)            # follow edges char by char
    return node ≠ null AND node.is_end_of_word
```

**Python**
```python
def _walk(self, prefix: str):
    """Return the node at the end of `prefix`, or None if the path breaks."""
    node = self.root
    for char in prefix:
        if char not in node.children:
            return None
        node = node.children[char]
    return node

def search(self, word: str) -> bool:
    node = self._walk(word)
    return node is not None and node.is_end_of_word
```

- **Why the `is_end_of_word` check matters:** searching `"car"` in a trie that only stores `"card"` walks successfully to the `r` node, but that node's flag is `False` → correctly returns `False`. Without the flag check you'd falsely report `"car"` as present.
- **Complexity:** O(m) time, O(1) auxiliary space.

---

### 5.3 `startsWith(prefix)` — prefix existence

**Pseudocode**
```
STARTS_WITH(prefix) → bool:
    return WALK(prefix) ≠ null    # no terminal check — path existence is enough
```

**Python**
```python
def starts_with(self, prefix: str) -> bool:
    return self._walk(prefix) is not None
```

- The **only** difference from `search` is skipping the `is_end_of_word` check.
- **Edge case:** `starts_with("")` returns `True` for any non-empty trie (the root always exists).
- **Complexity:** O(m) time, O(1) space.

---

### 5.4 `delete(word)`

Deletion is the trickiest operation because of **shared prefixes** — you must only remove nodes that are not part of any other key.

**Strategy:** recurse down to the terminal node, unset the flag, then on the way back up, prune a child **only if** it (a) is not terminal for another word and (b) has no other children.

**Pseudocode**
```
DELETE(node, word, depth):
    if node == null: return null                  # word not present
    if depth == length(word):                     # reached the end
        if not node.is_end_of_word: return node   # word wasn't stored → no-op
        node.is_end_of_word ← False               # unmark terminal
    else:
        c ← word[depth]
        node.children[c] ← DELETE(node.children[c], word, depth+1)
    # prune this node if it's now useless: not terminal AND no children AND not root
    if node is not root AND node.children is empty AND not node.is_end_of_word:
        return null                               # tell parent to drop this edge
    return node
```

**Python**
```python
def delete(self, word: str) -> bool:
    """Returns True if the word was present and removed, else False."""
    removed = [False]

    def _delete(node, depth):
        if node is None:
            return None
        if depth == len(word):
            if node.is_end_of_word:
                node.is_end_of_word = False        # unmark
                removed[0] = True
            # else: word not stored — leave node untouched
        else:
            char = word[depth]
            child = node.children.get(char)
            new_child = _delete(child, depth + 1)
            if new_child is None and child is not None:
                del node.children[char]            # prune dead edge
        # prune this node if it became useless (never prune the root)
        if node is not self.root and not node.children and not node.is_end_of_word:
            return None
        return node

    _delete(self.root, 0)
    return removed[0]
```

**Edge cases handled:**
- **Deleting a word that is a prefix of another** (`delete("do")` when `"dog"` exists): the `o` node has child `g`, so it is *not* pruned — only its `is_end_of_word` flag flips to `False`. `"dog"` survives. ✓
- **Deleting a word whose prefix chain is shared** (`delete("card")` when `"car"` exists): prune `d`, stop at `r` because `r.is_end_of_word == True`. `"car"` survives. ✓
- **Deleting a non-existent word:** returns `False`, no structural change.
- **Deleting `""`:** unsets `root.is_end_of_word`.
- **Complexity:** O(m) time, O(m) recursion stack.

```
Before delete("card"):        After delete("card"):
  c-a-r*(-d*)                    c-a-r*
  "car" and "card"               only "car" — the d node was pruned
```

---

### 5.5 `autocomplete(prefix)` — enumerate all completions

**Pseudocode**
```
AUTOCOMPLETE(prefix) → list of words:
    node ← WALK(prefix)
    if node == null: return []                    # no words with this prefix
    results ← []
    DFS(node, prefix, results)
    return results

DFS(node, path, results):
    if node.is_end_of_word:
        results.append(path)
    for (char, child) in sorted(node.children):   # sorted → lexicographic output
        DFS(child, path + char, results)
```

**Python**
```python
def autocomplete(self, prefix: str) -> list[str]:
    node = self._walk(prefix)
    if node is None:
        return []
    results = []

    def _dfs(cur, path):
        if cur.is_end_of_word:
            results.append(path)
        for char in sorted(cur.children):          # sorted for deterministic order
            _dfs(cur.children[char], path + char)

    _dfs(node, prefix)
    return results
```

- **Edge case:** if `prefix` itself is a stored word, it is included in the results (the `is_end_of_word` check at the prefix node fires first).
- **Ranked autocomplete (production):** store a `count`/frequency per terminal node, then either (a) sort results by count, or (b) keep a max-heap during DFS to return the *top-k* completions in O(m + z log k) where `z` is the number of candidates. This is how search-box suggestions are ranked.
- **Complexity:** O(m) to locate the prefix node + O(k) to emit all completions, where `k` = total characters across all returned words.

> 🔑 **Key Insight:** Notice that **`search`, `startsWith`, `insert`, and the descent phase of `delete`/`autocomplete` are all the same O(m) walk down the tree.** Master the walk (`_walk`) and every other operation is a thin wrapper around it — differing only in what they check at the destination (terminal flag) and whether they mutate (insert/delete) or enumerate (autocomplete). This shared skeleton is why tries feel elegant once they click.

---

## 6. Advanced Variants

### 6.1 Compressed Trie (Radix Tree / PATRICIA Trie)

**Problem with standard tries:** long chains of single-child nodes waste memory. Storing `"internationalization"` alone creates 20 nodes, each with one child — a linked list in disguise.

**Solution:** **merge chains of single-child nodes into one edge labeled with a substring.** A node is only created where paths actually branch.

```
Standard trie for {"team", "tea", "ten"}:      Radix tree (compressed):
        t                                              t
        |                                              |
        e                                              e
       / \                                            / \
      a   n*                                     "a"→ ●   ● ←"n"
      |                                          / \
      m*                                    (end)*  "m"*
      (tea ends at a*, team at m*)          "tea"   "team"    "ten"
```

- Each edge stores a **string** (not a single char). A node exists only at branch points or terminals.
- **Radix tree** = compressed trie with radix `r` (general term). **PATRICIA** = the binary (r=2) bitwise variant from Morrison 1968.
- **Complexity:** search still O(m) in characters compared, but node count drops to **O(n)** (at most `2n − 1` nodes for `n` keys, like any branching tree). Dramatically better memory on sparse key sets.
- **Real use:** Linux kernel IP routing (`fib_trie`), Redis (`rax`), Ethereum's Merkle-Patricia state trie, `git` pack indices.

### 6.2 Ternary Search Trie (TST)

A hybrid of binary search trees and tries. Each node stores **one character** and has **three** children:

```
        (lo)   ← chars < node.char
node[c] (eq)   ← chars == node.char (advance to next char of key)
        (hi)   ← chars > node.char
```

```python
class TSTNode:
    def __init__(self, char):
        self.char = char
        self.lo = self.eq = self.hi = None
        self.is_end = False
```

- **Space:** O(total characters) — far less than array-backed tries because there are no null child slots. Only 3 pointers per node regardless of alphabet size.
- **Time:** O(m + log n)-ish — you do a BST-style comparison at each character position.
- **Sweet spot:** large alphabets (Unicode) where a 26-or-more-slot array per node is wasteful, but you still want better-than-hash prefix operations. Championed by Sedgewick & Bentley.

### 6.3 Suffix Trie vs. Suffix Tree

These index **all suffixes** of a single (usually long) text `T`, enabling substring queries.

| Structure | What it stores | Nodes | Build time | Notes |
|-----------|----------------|-------|------------|-------|
| **Suffix Trie** | Every suffix of `T` as a key in a standard trie | O(\|T\|²) | O(\|T\|²) | Simple but quadratic — impractical for large `T`. |
| **Suffix Tree** | Same suffixes, **path-compressed** (a radix trie of suffixes) | O(\|T\|) | **O(\|T\|)** (Ukkonen 1995) | Linear! Substring search in O(m). The workhorse of stringology. |

- **Query power:** "Is pattern `P` a substring of `T`?" → walk `P` from the root in O(\|P\|). Also solves longest-repeated-substring, longest-common-substring, and more.
- **Suffix arrays** are the space-efficient, cache-friendly cousin (an array of sorted suffix start indices + LCP array) — often preferred in practice for their smaller constant factors.
- **Real use:** bioinformatics (genome alignment: BWA, Bowtie), plagiarism detection, data compression (LZ-family).

### 6.4 Bitwise Trie (Binary Trie / Digital Trie on bits)

The alphabet is `{0, 1}` — keys are the **binary representations** of integers or IP addresses. Depth = number of bits (e.g. 32 for IPv4, 64 for a `long`).

```
Insert integers as fixed-width bit strings, MSB first:
        (root)
        /    \
      0        1
     / \      / \
    0   1    0   1   ...   (depth = bit width)
```

- **Killer application — Maximum XOR pair** (LeetCode 421): to maximize `x ⊕ y`, at each bit greedily walk toward the *opposite* bit if it exists. O(32) per query instead of O(n²) brute force.
- **Longest-prefix matching for IP routing:** find the most specific route by walking address bits.
- **Complexity:** O(W) per operation where `W` = bit width (a constant like 32/64), so effectively O(1) for fixed-width integers.

> 🔑 **Key Insight:** Every advanced variant is a targeted answer to a *specific* weakness of the vanilla trie: **radix trees** kill single-child chain waste, **TSTs** kill the `|Σ|`-slot waste on large alphabets, **suffix trees** extend prefix power to arbitrary substrings, and **bitwise tries** specialize the alphabet to bits for integer/XOR/routing tricks. Know the weakness each one fixes and you'll always pick the right tool.

---

## 7. Applications in DS / AI / ML / LLMs

This is where tries stop being an academic curiosity and become production infrastructure.

### 7.1 Tokenization Pipelines (BPE, WordPiece)

Modern LLM tokenizers must, for every input, **greedily match the longest known subword** from a vocabulary of 30k–256k tokens. Doing this with a hash lookup per candidate length is slow; a trie makes it natural.

- **WordPiece** (BERT) and **BPE** (GPT, Llama) both perform *longest-match-first* segmentation. A trie over the vocabulary lets the tokenizer walk input characters and record the deepest terminal node reached — that's the longest matching token — in O(token length).
- **HuggingFace `tokenizers`** and Google's **SentencePiece** use trie-like automata (often an Aho–Corasick / double-array trie) for exactly this. The `Trie` class in HuggingFace's `tokenization_utils` is literally used to split off special tokens (`<|endoftext|>`, `[CLS]`, etc.) via longest-match.

```
Vocab trie fragment for {"token", "tok", "##ization", "##ize"}:
walking "tokenization" greedily → match "token" (deepest terminal) → continue → "##ization"
```

### 7.2 Constrained Decoding & Beam Search in LLMs

When you need an LLM's output to conform to a fixed set of allowed strings (JSON schema keys, a function-call name, a closed-vocabulary answer, valid SQL keywords), you use **constrained/guided decoding**:

- Build a trie (or FSM) of all **allowed continuations**.
- At each decoding step, the current generated prefix corresponds to a trie node; **mask the logits** so the model can only sample tokens that are valid edges out of that node.
- This guarantees syntactically valid output. Libraries **Outlines**, **guidance**, and **vLLM's guided decoding** compile grammars/regex into trie/FSM structures for exactly this token-masking.
- In **beam search**, a trie of allowed sequences prunes beams that leave the valid set — turning an intractable constrained search into an O(prefix-length) membership check per expansion.

### 7.3 Feature Extraction in NLP

- **Dictionary/gazetteer matching:** named-entity recognition and information extraction often match millions of known entities (drug names, company names, product SKUs) against text. **Aho–Corasick**, a trie augmented with failure links, finds *all* dictionary matches in a single O(text length + matches) pass — far beyond naive per-term search.
- **n-gram / feature indexing:** tries compactly store the observed n-gram vocabulary for language models and count-based features, sharing prefixes across overlapping n-grams.

### 7.4 Spell Checkers, Autocomplete & Search Engines

- **Autocomplete / typeahead:** the `startsWith` + subtree-DFS pattern from §5.5, with per-node frequency counts for **ranked** suggestions, powers search-box completion at Google, e-commerce sites, and IDEs.
- **Fuzzy spell-check:** a trie combined with **Levenshtein-distance-bounded DFS** finds all dictionary words within edit distance `k` of a misspelling far faster than comparing against every word — you prune whole subtrees once the running edit distance exceeds `k`.
- **Inverted-index term dictionaries:** Lucene/Elasticsearch store their term dictionary as an **FST (finite-state transducer)** — a minimized, compressed generalization of a trie — to map terms → postings-list offsets with tiny memory.

### 7.5 Classic DS uses

- **Longest-prefix matching** in IP routers (§6.4).
- **Auto-suggest / dictionary membership** where lookups must be independent of dictionary size.
- **Word games** (Boggle/Scrabble solvers): a trie of the dictionary prunes the DFS over the board the instant a partial path stops being a valid prefix.

> 🔑 **Key Insight:** The reason tries permeate AI/ML systems is a single shared primitive: **"given what I've matched so far, what can legally come next, and is where-I-am a valid endpoint?"** Tokenizers ask it (longest subword), constrained decoders ask it (valid next token), autocomplete asks it (valid completions), and routers ask it (longest matching prefix). Whenever your problem is *incremental, prefix-driven matching against a fixed vocabulary*, a trie (or its compressed/automaton cousin) is almost certainly the right substrate.

---

## 8. Expert Takeaways & Best Practices

### Common Pitfalls

| Pitfall | Consequence | Fix |
|---------|-------------|-----|
| Confusing **terminal** with **leaf** | Deletion bugs; "do" inside "dog" gets wrongly removed | Always gate on `is_end_of_word`, never on "has no children". |
| Forgetting the **empty string** | Crash or wrong result on `insert("")`/`search("")` | Handle `m = 0` — it targets the root node. |
| **Not pruning** on delete | Memory leak; trie grows monotonically | Prune nodes that are non-terminal AND childless on the way up. |
| **Over-pruning** on delete | Corrupting shared prefixes (`delete("car")` kills `"card"`) | Stop pruning at any node that is terminal or has other children. |
| Array nodes on **Unicode** | `|Σ|`-slot arrays × huge alphabet = memory explosion | Use hash-map children, a TST, or a double-array/compressed trie. |
| Deep recursion on long keys | Stack overflow on very long keys | Use iterative insert/search; reserve recursion for delete/DFS. |

### Optimization Strategies

- **`__slots__` on nodes** — eliminates per-node `__dict__`, cutting Python memory ~40%.
- **Path compression (radix tree)** — collapse single-child chains; huge win on sparse keys.
- **Array vs. hash children** — array for small dense alphabets (a–z), hash for sparse/Unicode.
- **Double-array trie (DAT)** — encodes the whole trie in two flat integer arrays for cache-friendly, pointerless traversal; the standard in production tokenizers (`darts`, `SentencePiece`).
- **DAWG / minimized FSA** — merge *common suffixes* too (not just prefixes) for a directed acyclic word graph; near-optimal memory for static dictionaries (spell-checkers, Scrabble). Trade-off: no longer supports easy insertion/deletion.
- **Frequency counts per node** — enables top-k ranked autocomplete without a full subtree scan.

### When to use a Trie vs. HashMap vs. Suffix Array vs. Balanced BST

| You need… | Best choice | Why |
|-----------|-------------|-----|
| Exact key lookup, no prefix ops | **HashMap** | O(m) expected, simplest, lowest constant factor, no ordering overhead. |
| **Prefix** queries / autocomplete / `startsWith` | **Trie / Radix tree** | Prefix ops are native and O(m); a hash map cannot do prefix search at all. |
| Sorted iteration / range over keys | **Trie** (DFS yields sorted order) or **Balanced BST** | Hash maps have no order; trie DFS is lexicographic for free. |
| **Substring** search in a fixed text | **Suffix tree / Suffix array** | Indexes all substrings; suffix array is more memory-efficient in practice. |
| Static dictionary, minimal memory | **DAWG / minimized FSA / double-array trie** | Shares suffixes and prefixes; unbeatable memory but immutable. |
| Longest-prefix match on integers/IPs | **Bitwise/PATRICIA trie** | Bit-by-bit descent = natural longest-prefix match. |

**Rule of thumb:** *If you only ever ask "is this exact key present?", use a hash map. The moment "does any key start with…?" or "give me all keys under this prefix" enters the requirements, reach for a trie.*

> 🔑 **Key Insight:** The expert's decision isn't "trie vs. hash map" in the abstract — it's driven by **key overlap and query shape**. High prefix overlap + prefix/ordered queries → trie (and compress it with a radix tree or double-array for memory). Low overlap + exact-only lookups → hash map. Static + memory-critical → minimized FSA/DAWG. Substrings, not prefixes → suffix structures. Match the structure to the *query pattern*, not to habit.

---

## 9. Common Interview Problems (Easy → Hard)

### 🟢 Easy

1. **Implement Trie (Prefix Tree)** — *LeetCode 208*. Build `insert`, `search`, `startsWith`. The canonical starting point (exactly §5.1–5.3).
2. **Longest Common Prefix** — *LeetCode 14*. Insert all strings, then walk down while there's exactly one child and no terminal — the walked path is the LCP.
3. **Index Pairs of a String / dictionary tagging** — build a trie of words, scan the text matching against it.

### 🟡 Medium

4. **Design Add and Search Words (wildcard `.`)** — *LeetCode 211*. `search` where `.` matches any child → branch the DFS over all children at a `.`. Tests recursion over the trie.
5. **Replace Words** — *LeetCode 648*. Trie of roots; for each word, walk until the first terminal node = shortest root.
6. **Map Sum Pairs** — *LeetCode 677*. Store values on terminals; `sum(prefix)` = DFS-sum over the subtree. Add a per-node running sum for O(m).
7. **Implement Magic Dictionary** — *LeetCode 676*. Search allowing exactly one character change → DFS with a "one edit used" flag.
8. **Search Suggestions System** — *LeetCode 1268*. Ranked autocomplete: return top-3 lexicographically smallest completions after each typed character (§5.5 + sorted DFS).

### 🔴 Hard

9. **Word Search II** — *LeetCode 212*. Board + word list. Build a trie of the words, DFS the grid, pruning the instant the current path leaves the trie. The textbook "trie prunes backtracking" problem.
10. **Maximum XOR of Two Numbers in an Array** — *LeetCode 421*. Bitwise trie (§6.4): insert numbers as 32-bit paths, greedily walk toward opposite bits. O(n·32).
11. **Concatenated Words** — *LeetCode 472*. Trie + DP: a word is concatenated if it can be split into ≥2 dictionary words; use the trie to enumerate valid prefixes at each split point.
12. **Palindrome Pairs** — *LeetCode 336*. Trie of reversed words + palindrome-suffix bookkeeping. A notoriously tricky trie problem.
13. **Stream of Characters** — *LeetCode 1032*. Match a growing stream against a word set → **Aho–Corasick** (trie + failure links), the natural generalization of §7.3.

> 🔑 **Key Insight:** Interview trie problems cluster into four recognizable templates: **(1) build-and-query** (208, 14), **(2) DFS-with-a-twist** — wildcards, one-edit, sums (211, 676, 677), **(3) trie-guided pruning of another search** — grid/backtracking (212, and Scrabble/Boggle), and **(4) bitwise / automaton** (421, 1032). When you see "prefix", "dictionary", "stream", or "maximize XOR" in a prompt, pattern-match to the template first — the trie is almost always the intended structure.

---

## 10. Quick-Reference Cheat Sheet

> **Print this page.** Everything you need at a glance.

### 📌 Definition
A **trie / prefix tree** stores strings so that each node = a prefix, each edge = one symbol, and the root = `ε`. All descendants of a node share that node's prefix. Lookups cost **O(m)** — *independent of the number of keys `n`.*

### 📌 Core Node
```python
class TrieNode:
    __slots__ = ("children", "is_end_of_word")
    def __init__(self):
        self.children = {}          # char -> TrieNode
        self.is_end_of_word = False
```

### 📌 Complexity (m = key length, n = #keys, |Σ| = alphabet)
| Op | Time | Space (aux) | Note |
|----|------|-------------|------|
| insert | O(m) | O(m) | creates ≤ m nodes |
| search | O(m) | O(1) | + terminal-flag check |
| startsWith | O(m) | O(1) | no terminal check |
| delete | O(m) | O(m) | prune on the way up |
| autocomplete | O(m + k) | O(m) | k = output size |
| **Total memory** | — | O(N·\|Σ\|) array / O(N) hash | N = #distinct prefixes ≤ n·M |

### 📌 The One Walk to Rule Them All
```python
def _walk(self, s):
    node = self.root
    for c in s:
        node = node.children.get(c)
        if node is None: return None
    return node
# search      → _walk(word) and node.is_end_of_word
# startsWith  → _walk(prefix) is not None
```

### 📌 Terminal ≠ Leaf
- **Terminal** = `is_end_of_word` (a word ends here) — *semantic*.
- **Leaf** = no children — *topological*.
- "do" in {"do","dog"} is **terminal but internal**. Gate deletion on the flag, never on childlessness.

### 📌 Edge Cases Checklist
- `""` → targets the root's flag.
- Duplicate insert → idempotent.
- Delete word that's a **prefix of another** → only unset flag, don't prune.
- Delete word **sharing a prefix** → prune only the unique tail.
- Delete absent word → no-op.

### 📌 Variant Picker
| Variant | Fixes | Use for |
|---------|-------|---------|
| Radix / PATRICIA | single-child chain waste | routing tables, git, Ethereum |
| Ternary Search Trie | \|Σ\|-slot waste | large/Unicode alphabets |
| Suffix tree/array | prefix→substring | bioinformatics, substring search |
| Bitwise trie | integer keys | max-XOR, IP longest-prefix |
| DAWG / min-FSA | suffix + prefix sharing | static dictionaries, Scrabble |
| Double-array trie | pointer/cache cost | production tokenizers |

### 📌 Trie vs. Alternatives
- **Exact lookup only** → HashMap.
- **Prefix / autocomplete / ordered** → Trie.
- **Substring in fixed text** → Suffix tree/array.
- **Static + memory-critical** → minimized FSA / DAWG.

### 📌 AI / ML / LLM Connections
- **Tokenization** (BPE/WordPiece) — longest-subword match via trie automaton.
- **Constrained decoding / guided generation** — trie/FSM masks invalid next tokens.
- **NER / gazetteers** — Aho–Corasick (trie + failure links) = all matches in one pass.
- **Autocomplete / spell-check** — `startsWith` + ranked DFS; Levenshtein-bounded DFS for fuzzy.
- **Search engines** — Lucene term dictionary = FST (compressed trie).

### 📌 Interview Templates
1. Build-and-query → LC 208, 14
2. DFS-with-a-twist (wildcard/edit/sum) → LC 211, 676, 677
3. Trie-guided pruning (grid/backtracking) → LC 212
4. Bitwise / automaton → LC 421, 1032

---

*End of guide. Master the O(m) walk, respect the terminal-vs-leaf distinction, compress when memory matters, and remember: whenever the problem is incremental prefix matching against a fixed vocabulary — from a spelling dictionary to an LLM's token vocabulary — the trie is the substrate underneath.*

---

## Related Guides

**Prerequisites:** [Trees & Binary Search Trees](/docs/trees-and-bst) · [Hash Maps & Sets](/docs/hash-maps-and-sets)  
**See also:** [Trees & Binary Search Trees](/docs/trees-and-bst) · [Tokenization Algorithms](/docs/tokenization)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
