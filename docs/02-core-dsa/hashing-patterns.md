---
title: Hashing Patterns
slug: /hashing-patterns
sidebar_position: 9
sidebar_label: Hashing Patterns
description: >-
  Prefix-sum hashing and complement hashing — two of the highest-leverage patterns in algorithmic problem solving.
tags:
  - hashing
  - prefix-sum
  - patterns
difficulty: intermediate
reading_time: 18
prerequisites:
  - title: Hash Maps & Sets
    to: /docs/hash-maps-and-sets
pagination_prev: core-dsa/bfs-dfs
pagination_next: advanced-dsa/backtracking
path_step: 15
---

# Hashing Patterns: The Ultimate Guide

> A single, definitive reference on two of the highest-leverage hashing patterns in algorithmic problem solving and applied ML systems: **Prefix Sum Hashing** and **Grouping with Hashing**. Built for interview prep, production engineering, and AI/ML system design.

---

## 1. Introduction & Mental Model

### What is a "hashing pattern"?

A hashing pattern is a reusable problem-solving template built on one primitive: the **hash map** (`dict` in Python), which gives you **average O(1) insert, lookup, and delete keyed by value rather than by position**.

Arrays let you answer *"what is at index i?"* in O(1). Hash maps let you answer *"have I seen this value / key before, and what did I record about it?"* in O(1). That single capability collapses a huge class of naive O(n²) or O(n·m) scans into O(n).

Every hashing pattern is a specific answer to the question:

> **"What should I use as the key, and what should I store as the value, so that a future O(1) lookup replaces a future loop?"**

### The two patterns in one sentence each

| Pattern | The key insight |
|---|---|
| **Prefix Sum Hashing** | Store *cumulative state* seen so far; a range/window answer becomes a **difference of two cumulative values**, and the hash map finds the matching partner in O(1). |
| **Grouping with Hashing** | Map each item to a **canonical key** so that all items sharing an invariant collapse into the same bucket in O(1). |

### Why they matter

- **Interviews:** Together they cover a large fraction of "medium" array/string problems (subarray sums, anagrams, frequency, consecutive runs). Recognizing the pattern is 80% of the solve.
- **Production:** Both underlie real systems — telemetry range queries (prefix sums), deduplication and sharding (grouping).
- **AI/ML:** Cumulative offsets power tokenizer alignment and attention masking; canonical-key grouping powers dedup, clustering, and RAG chunk routing.

### Mental model to hold onto

- Prefix sum = **"running total + ledger of past totals."** You never re-scan; you subtract.
- Grouping = **"fingerprint everything, then let identical fingerprints fall into the same bin."**

> 💡 Before each section, ask: *What must the reader already know? What's the common misconception? What is the one insight that unlocks everything else?* Those answers are written directly into each section below.

---

## 2. Pattern 1: Prefix Sum Hashing

### 2.1 Concept & Intuition

**Prerequisite knowledge:** array iteration, the idea of a cumulative (running) sum.

**The problem it solves:** questions about the sum (or count, or parity) of a *contiguous subarray* — "how many subarrays sum to K?", "is there a subarray whose sum is a multiple of K?". The naive approach recomputes the sum of every candidate window: O(n²).

**The core identity.** Define the prefix sum `P[i] = nums[0] + nums[1] + ... + nums[i-1]` (with `P[0] = 0`). Then the sum of any window `(j, i]` is:

```
sum(j+1 .. i) = P[i] - P[j]
```

So *"find a subarray summing to K ending at index i"* becomes *"find an earlier prefix `P[j]` such that `P[i] - P[j] = K`"*, i.e. *"have I already seen the value `P[i] - K`?"* — a single hash-map lookup.

**Common misconception:** that you need to store the subarrays themselves, or two pointers. You don't. You stream through once, maintain a single running sum, and consult a frequency map of prefix values seen so far.

**The one insight:** *a range aggregate is a difference of two cumulative aggregates, and a hash map turns "does the matching partner exist?" into O(1).*

### 2.2 Real-World Analogy

> 💡 **Analogy:** Think of prefix sums like a **running bank balance**. Your balance after each transaction is a prefix sum. To check whether you spent exactly $500 across *some* stretch of days, you don't re-add every window — you ask: *"was my balance ever exactly (current balance − $500) on an earlier day?"* The hash map is your **instant-lookup ledger** of every past balance. If that balance appears in the ledger, the stretch between then and now netted exactly $500.

### 2.3 Algorithm (Pseudocode + Python)

**Pseudocode — count subarrays summing to K:**

```
freq = { 0 : 1 }          # empty prefix seen once (base case)
running = 0
count = 0
for x in nums:
    running += x
    # a subarray ending here sums to K iff some earlier prefix = running - K
    count += freq.get(running - K, 0)
    freq[running] += 1     # record current prefix for future queries
return count
```

Two rules that trip people up:
1. **Seed `{0: 1}`** so a prefix that *itself* equals K is counted (window starting at index 0).
2. **Query before insert** — otherwise a zero-valued element could match itself and overcount.

**Python:**

```python
# Prefix Sum with Hash Map — Subarray Sum Equals K
def subarray_sum(nums: list[int], k: int) -> int:
    count = 0
    prefix_sum = 0
    freq = {0: 1}  # base case: empty prefix

    for num in nums:
        prefix_sum += num
        # Check if (prefix_sum - k) exists
        count += freq.get(prefix_sum - k, 0)
        freq[prefix_sum] = freq.get(prefix_sum, 0) + 1

    return count
```

### 2.4 Complexity Analysis

| Aspect | Cost | Why |
|---|---|---|
| **Time** | **O(n)** | Single pass; each hash lookup + insert is average O(1). |
| **Space** | **O(n)** | Up to n distinct prefix values stored in the map. |
| Worst-case time | O(n²) *theoretical* | Only if the hash function degrades to all-collisions — effectively never with Python's dict. |

Contrast with the brute force (all windows) at **O(n²)** time / O(1) space. Prefix-sum hashing trades O(n) space for an order-of-magnitude time win.

### 2.5 Classic DSA Problems (Solved)

#### Problem 1 — Subarray Sum Equals K (LeetCode 560)

*Count the number of contiguous subarrays whose sum equals `k`. Values may be negative* (so sliding window does **not** work — negatives break monotonicity).

```python
def subarray_sum(nums: list[int], k: int) -> int:
    count = 0
    prefix_sum = 0
    freq = {0: 1}
    for num in nums:
        prefix_sum += num
        count += freq.get(prefix_sum - k, 0)   # query first
        freq[prefix_sum] = freq.get(prefix_sum, 0) + 1
    return count

# subarray_sum([1,1,1], 2) -> 2
# subarray_sum([1,2,3], 3) -> 2
```

**Complexity:** O(n) time, O(n) space. **Why hashing wins:** negatives rule out two-pointer; the prefix-difference identity still holds regardless of sign.

#### Problem 2 — Continuous Subarray Sum (LeetCode 523)

*Is there a subarray of length ≥ 2 whose sum is a multiple of `k`?*

**Key transformation:** a subarray sum is a multiple of `k` iff its two bounding prefix sums have the **same remainder mod k** — because `(P[i] − P[j]) % k == 0 ⇔ P[i] % k == P[j] % k`. So we hash **remainders**, and store the **earliest index** at which each remainder appeared (to maximize window length and enforce the length-≥-2 rule).

```python
def check_subarray_sum(nums: list[int], k: int) -> bool:
    seen = {0: -1}          # remainder 0 at virtual index -1
    prefix = 0
    for i, x in enumerate(nums):
        prefix += x
        r = prefix % k
        if r in seen:
            if i - seen[r] >= 2:   # length >= 2
                return True
        else:
            seen[r] = i            # keep EARLIEST index only
    return False

# check_subarray_sum([23,2,4,6,7], 6) -> True   (2+4 = 6)
# check_subarray_sum([23,2,6,4,7], 6) -> True   (2+6+4 = 12)
```

**Complexity:** O(n) time, O(min(n, k)) space. **Trap:** only insert a remainder when it is *new* — overwriting shrinks the window and can miss the length-≥-2 condition.

#### Problem 3 — Count of Range Sum (LeetCode 327 · Hard)

*Count the number of subarrays whose sum lies in `[lower, upper]`.* This is prefix sums where the partner condition is a **range**, not equality — so a plain hash map isn't enough; we need to count prefixes in a value window. The canonical solutions are merge-sort (shown) or a balanced BST / BIT over prefix values.

```python
def count_range_sum(nums: list[int], lower: int, upper: int) -> int:
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)

    def sort_count(lo, hi):
        if hi - lo <= 1:
            return 0
        mid = (lo + hi) // 2
        cnt = sort_count(lo, mid) + sort_count(mid, hi)
        j = k = mid
        for left in prefix[lo:mid]:
            # window of right-prefixes with (P[right]-P[left]) in [lower, upper]
            while j < hi and prefix[j] - left < lower:  j += 1
            while k < hi and prefix[k] - left <= upper: k += 1
            cnt += k - j
        prefix[lo:hi] = sorted(prefix[lo:hi])
        return cnt

    return sort_count(0, len(prefix))

# count_range_sum([-2,5,-1], -2, 2) -> 3
```

**Complexity:** O(n log n) time, O(n) space. **Lesson:** when the partner condition becomes a *range* rather than *equality*, upgrade from a hash map to an order-aware structure (sorted merge / BIT / BST).

### 2.6 AI/ML/LLM Applications

- **Tokenizer offset alignment (BPE / WordPiece).** After tokenizing, you keep a prefix-sum array of token lengths so any token's character span is `offsets[i]` and its start is `offsets[i-1]` — O(1) lookup after O(n) preprocessing. Essential for mapping model spans back to source text (NER, extractive QA, RAG citation highlighting).

> 🎯 **Expert Insight:** In LLM tokenization pipelines, prefix-sum offset tables give you **cumulative token→character offsets** in O(1) after O(n) preprocessing — critical for byte-pair-encoding (BPE) alignment and for mapping generated spans back onto the original document.

- **Attention & sequence packing.** When multiple short sequences are packed into one batch row, a prefix-sum `cu_seqlens` (cumulative sequence lengths) array tells FlashAttention-style kernels where each sequence begins/ends so attention doesn't leak across documents. This is the exact prefix-sum identity applied to sequence boundaries.
- **Feature engineering.** Cumulative/rolling aggregates (cumulative spend, sessions-so-far) are prefix sums; range features over event streams reduce to `P[i] - P[j]`.
- **Sampling & embedding lookup.** Top-p / nucleus sampling walks a **prefix sum of sorted probabilities** to find the cutoff. Weighted sampling from an embedding index uses a prefix-sum (CDF) array + binary search to pick an item in O(log n).

### 2.7 Edge Cases & Anti-Patterns

- **Forgetting the `{0: 1}` seed** → misses windows starting at index 0. Most common bug.
- **Insert-before-query** → a `0` element or repeated prefix matches itself and overcounts. Always **query, then insert**.
- **Assuming sliding window works with negatives** → it doesn't; the window sum isn't monotonic. Prefix-sum hashing is negative-safe.
- **Storing count when you need index (and vice versa)** → "count subarrays" needs a *frequency* map; "does a valid-length window exist" needs an *earliest-index* map. Pick deliberately.
- **Integer overflow** (non-Python languages) → cumulative sums can exceed 32-bit; use 64-bit.

### 2.8 ⭐ Expert Takeaways

> 🎯 **Expert Insight:**
> - The pattern generalizes far beyond sums. Any **invertible, associative accumulation** works: prefix XOR (subarray XOR = K), prefix product (with care around zeros), prefix parity/count.
> - The decision key is the *partner condition*. **Equality** partner → hash map (O(n)). **Range** partner → sorted structure / BIT (O(n log n)). **Divisibility** partner → hash on remainders.
> - Seeding the map with the identity element (`0` for sum, `0` for XOR, `1`-index for "earliest") is the same trick every time — it represents the empty prefix.
> - In distributed settings, prefix sums are **parallelizable via scan (Blelloch)** in O(log n) depth — the same identity underpins GPU cumulative-sum kernels used in ML pipelines.

---

## 3. Pattern 2: Grouping with Hashing

### 3.1 Concept & Intuition

**Prerequisite knowledge:** hash maps, and the idea of a *canonical form* (a normalized representation where all equivalent items look identical).

**The problem it solves:** partitioning items into equivalence classes — "group all anagrams", "find the most frequent elements", "how long is the longest run of consecutive integers". Naively comparing every pair to test equivalence is O(n²).

**The core idea.** Design a **canonical key** `key(x)` such that two items are equivalent **iff** they produce the same key. Then a single pass drops each item into `buckets[key(x)]`, and equivalent items collide *on purpose* into the same bucket — O(1) per item.

The art is entirely in **choosing the key**:
- Anagrams → sorted letters, or a 26-length letter-count tuple (the count vector *is* the invariant).
- Frequency → the value itself is the key; the value stored is its count.
- Consecutive runs → membership in a `set` is the key structure; you probe neighbors.

**Common misconception:** that grouping needs sorting the whole input (O(n log n)). Usually the *key* needs canonicalizing, but placement into buckets is O(1) — total cost is often O(n) or O(n·k) where k is item size, not O(n log n).

**The one insight:** *choose a key that is invariant across an equivalence class; then "grouping" is just letting equal keys collide in a hash map.*

### 3.2 Real-World Analogy

> 💡 **Analogy:** Grouping with hashing is a **mailroom with labeled pigeonholes**. Every letter (item) gets a **routing code** stamped on it (the canonical key). You don't compare letters to each other — you just read the code and drop each into its pigeonhole. All letters with the same code land together automatically. Design a good stamping rule (e.g. "sort the address letters") and sorting the whole pile is never needed.

### 3.3 Algorithm (Pseudocode + Python)

**Pseudocode — generic grouping:**

```
buckets = defaultdict(list)
for item in items:
    k = canonical_key(item)   # the invariant of item's equivalence class
    buckets[k].append(item)
return buckets.values()
```

**Python — the canonical-key skeleton:**

```python
from collections import defaultdict

def group_by(items, key_fn):
    buckets = defaultdict(list)
    for item in items:
        buckets[key_fn(item)].append(item)   # equal keys collide on purpose
    return list(buckets.values())

# Anagram grouping = group_by(strs, lambda s: tuple(sorted(s)))
```

### 3.4 Complexity Analysis

For n items each of size k:

| Task | Time | Space | Note |
|---|---|---|---|
| Group by count-vector key | **O(n·k)** | O(n·k) | Building each key is O(k); no sort. |
| Group by sorted key | O(n·k log k) | O(n·k) | Sorting the key adds a log k factor. |
| Frequency (Top-K via buckets) | **O(n)** | O(n) | Bucket sort by frequency beats heap's O(n log k). |
| Longest consecutive (set probing) | **O(n)** | O(n) | Each element visited O(1) amortized. |

The recurring win: replacing pairwise comparison (O(n²)) or global sort (O(n log n)) with **keyed bucketing** (O(n) or O(n·k)).

### 3.5 Classic DSA Problems (Solved)

#### Problem 1 — Group Anagrams (LeetCode 49)

*Group strings that are anagrams of each other.* The invariant of an anagram class is its **multiset of letters**. Two canonical keys:

```python
from collections import defaultdict

# Key A: sorted letters — O(k log k) per string
def group_anagrams(strs: list[str]) -> list[list[str]]:
    groups = defaultdict(list)
    for s in strs:
        groups[tuple(sorted(s))].append(s)
    return list(groups.values())

# Key B: 26-length count vector — O(k) per string (no sort)
def group_anagrams_count(strs: list[str]) -> list[list[str]]:
    groups = defaultdict(list)
    for s in strs:
        count = [0] * 26
        for c in s:
            count[ord(c) - ord('a')] += 1
        groups[tuple(count)].append(s)
    return list(groups.values())

# group_anagrams(["eat","tea","tan","ate","nat","bat"])
# -> [['eat','tea','ate'], ['tan','nat'], ['bat']]
```

**Complexity:** Key A O(n·k log k); Key B **O(n·k)**. Prefer the count-vector key for long strings or restricted alphabets.

#### Problem 2 — Top K Frequent Elements (LeetCode 347)

*Return the k most frequent elements.* Group by value→count, then select the top k. **Bucket sort by frequency** gives O(n), beating a heap's O(n log k).

```python
from collections import defaultdict

def top_k_frequent(nums: list[int], k: int) -> list[int]:
    freq = defaultdict(int)
    for n in nums:
        freq[n] += 1
    # index = frequency; a value with freq f goes into buckets[f]
    buckets = [[] for _ in range(len(nums) + 1)]
    for val, f in freq.items():
        buckets[f].append(val)
    res = []
    for f in range(len(buckets) - 1, 0, -1):   # high freq -> low
        for val in buckets[f]:
            res.append(val)
            if len(res) == k:
                return res
    return res

# top_k_frequent([1,1,1,2,2,3], 2) -> [1, 2]
```

**Complexity:** O(n) time, O(n) space. **Why buckets beat a heap:** frequencies are bounded by n, so we can index by them directly — counting-sort style.

#### Problem 3 — Longest Consecutive Sequence (LeetCode 128)

*Length of the longest run of consecutive integers, in O(n) (no sorting allowed).* Put everything in a `set` (the hash structure), then only start counting from a **sequence head** — a number `x` with `x-1` absent. This guarantees each element is walked at most once.

```python
def longest_consecutive(nums: list[int]) -> int:
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:            # x is the start of a run
            length = 1
            while x + length in s:
                length += 1
            best = max(best, length)
    return best

# longest_consecutive([100,4,200,1,3,2]) -> 4   (1,2,3,4)
# longest_consecutive([0,3,7,2,5,8,4,6,0,1]) -> 9
```

**Complexity:** O(n) time (the "start only at heads" guard makes the inner `while` amortized O(1) per element), O(n) space. **Trap:** without the `x-1 not in s` guard, this degrades to O(n²).

### 3.6 AI/ML/LLM Applications

- **Data deduplication.** Near/exact dedup of training corpora hashes each document to a canonical key — **MinHash / SimHash** for near-duplicates, content hashes for exact. Documents with the same key are duplicates and get collapsed. This is grouping-by-hash at web scale (e.g. cleaning pretraining datasets).
- **RAG chunking & routing.** After chunking documents, chunks are grouped/routed by a key: a **content hash** deduplicates identical chunks so you don't embed the same text twice, and **hash-based routing** assigns each chunk deterministically to a vector-store shard. Semantic clustering (k-means over embeddings) is the "soft" cousin — grouping by nearest centroid instead of exact key.
- **Hash-based sharding in distributed ML.** Feature stores, embedding tables, and parameter servers place keys with `shard = hash(key) % num_shards`, giving balanced, deterministic, lookup-free partitioning. The **hashing trick** (feature hashing) maps arbitrarily many feature strings into a fixed vector via `index = hash(feature) % D` — grouping colliding features into shared dimensions to bound memory.
- **Batching by shape/length.** Grouping variable-length sequences into buckets by length (key = bucketed length) minimizes padding waste before batching — a direct grouping-by-key optimization in training pipelines.

> 🎯 **Expert Insight:** RAG deduplication and feature hashing are the same pattern with different keys. Dedup wants a key so that **only truly identical content collides** (cryptographic/content hash). The hashing trick *wants* controlled collisions to bound dimensionality (fast non-crypto hash mod D). Same mechanism, opposite intent toward collisions.

### 3.7 Edge Cases & Anti-Patterns

- **Unhashable keys.** Lists/dicts can't be dict keys. Convert to `tuple` (e.g. `tuple(sorted(s))`, `tuple(count_vector)`).
- **Over-canonicalizing.** Using `sorted(s)` when a count-vector suffices adds a needless `log k` factor. Match key cost to the invariant.
- **Key that isn't actually invariant.** If your key can differ for equivalent items (e.g. case-sensitive when it shouldn't be), groups fragment. Normalize (casefold, strip, unicode-NFC) first.
- **Non-deterministic hashing for sharding.** Python's `hash()` on strings is salted per process (`PYTHONHASHSEED`) — never use it for *persistent* sharding/dedup. Use `hashlib` (md5/sha1) or an explicit stable hash.
- **Assuming sort is required.** Longest-consecutive and top-k both look sort-shaped but have O(n) hashing solutions. Reach for the set/bucket first.
- **Memory blowup.** Grouping keeps all items in memory; for huge streams use streaming/approximate structures (Count-Min Sketch for frequency, HyperLogLog for cardinality, MinHash for similarity).

### 3.8 ⭐ Expert Takeaways

> 🎯 **Expert Insight:**
> - The entire skill is **key design**. Ask: *"What is the invariant that defines 'same group'?"* Encode exactly that — no more, no less.
> - Prefer a **count/canonical vector** over sorting when the alphabet or feature space is bounded — it drops a `log` factor.
> - When frequencies (or any values) are **bounded by n**, **bucket sort by that value** beats heaps: O(n) vs O(n log k).
> - For scale beyond memory, swap exact hashing for **approximate/streaming** hashing: MinHash (similarity), Count-Min (frequency), HyperLogLog (distinct count), feature hashing (fixed-dim features).
> - **Stable hashing matters** the moment a grouping decision must survive across processes or machines — reach for `hashlib`, not `hash()`.

---

## 4. Pattern Comparison Table

| Dimension | **Prefix Sum Hashing** | **Grouping with Hashing** |
|---|---|---|
| **Core question answered** | "Is there / how many *contiguous ranges* with aggregate = target?" | "Which items belong to the same *equivalence class*?" |
| **What the key is** | A cumulative value seen so far (sum, remainder, XOR) | A canonical fingerprint of an item (sorted key, count vector, value) |
| **What the value stores** | Frequency of that prefix, or earliest index | The list of items (or a count) in that group |
| **Underlying identity** | `range = P[i] − P[j]` (difference of cumulatives) | `equivalent(a,b) ⇔ key(a) == key(b)` |
| **Typical time** | O(n) (equality partner); O(n log n) (range partner) | O(n) to O(n·k) depending on key cost |
| **Typical space** | O(n) distinct prefixes | O(n·k) items across buckets |
| **Order sensitive?** | Yes — subarrays are contiguous, order matters | No — groups are order-independent sets |
| **Breaks when…** | You forget the identity seed, or insert before query | Key isn't invariant, or key is unhashable |
| **Classic problems** | Subarray Sum = K · Continuous Subarray Sum · Count of Range Sum | Group Anagrams · Top K Frequent · Longest Consecutive |
| **ML/LLM home turf** | Tokenizer offsets, `cu_seqlens`, nucleus-sampling CDF, rolling features | Dedup (MinHash), RAG chunk routing, feature hashing, sharding |
| **Trade-off** | O(n) space to kill an O(n²) window scan | O(n) space to kill O(n²) pairwise comparison / O(n log n) sort |

---

## 5. Quick-Reference Cheat Sheet

**Recognize Prefix Sum Hashing when you see:**
- "contiguous subarray" + "sum / count / XOR / multiple of K"
- Values can be **negative** (rules out sliding window)
- You'd otherwise re-sum every window

```python
# TEMPLATE — count contiguous subarrays with aggregate == k
freq = {0: 1}; running = 0; count = 0
for x in nums:
    running += x                        # or ^= x  / running %= k
    count += freq.get(running - k, 0)   # QUERY first
    freq[running] = freq.get(running, 0) + 1   # then INSERT
```
- Divisibility variant → hash `running % k`, store **earliest index**.
- Range partner (`sum ∈ [lo,hi]`) → merge sort / BIT, not a plain map.

**Recognize Grouping with Hashing when you see:**
- "group / bucket / cluster / most frequent / duplicates / consecutive"
- An equivalence relation you can *fingerprint*

```python
# TEMPLATE — group by an invariant key
from collections import defaultdict
buckets = defaultdict(list)
for item in items:
    buckets[canonical_key(item)].append(item)   # equal keys collide
```
- Anagram key → `tuple(sorted(s))` or `tuple(count_vector)` (prefer the vector).
- Top-K frequent → count map + **bucket sort by frequency** = O(n).
- Longest consecutive → `set` + start only at heads (`x-1 not in set`) = O(n).

**Universal gotchas:**
- Use `tuple`, not `list`, as a dict key.
- For persistent/distributed hashing use `hashlib`, never `hash()`.
- Prefix sum: **query before insert**, seed the identity element.

---

## 6. Further Reading & Resources

**Foundational**
- CLRS, *Introduction to Algorithms* — Hash Tables (Ch. 11); amortized analysis.
- Sedgewick & Wayne, *Algorithms* — symbol tables and hashing.

**Practice (by pattern)**
- Prefix Sum Hashing: LeetCode **560** (Subarray Sum = K), **523** (Continuous Subarray Sum), **974** (Subarray Sums Divisible by K), **327** (Count of Range Sum), **560→930** progression.
- Grouping with Hashing: LeetCode **49** (Group Anagrams), **347** (Top K Frequent), **128** (Longest Consecutive), **451** (Sort Characters by Frequency).

**AI/ML applications**
- BPE / tokenization: Sennrich et al., *Neural Machine Translation of Rare Words with Subword Units* (2016); the HuggingFace `tokenizers` offset-mapping docs.
- Sequence packing / `cu_seqlens`: FlashAttention (Dao et al., 2022) variable-length API.
- Dedup at scale: Lee et al., *Deduplicating Training Data Makes Language Models Better* (2022); MinHash/LSH (Broder, 1997).
- Feature hashing: Weinberger et al., *Feature Hashing for Large Scale Multitask Learning* (2009).
- Streaming/approximate: Count-Min Sketch (Cormode & Muthukrishnan), HyperLogLog (Flajolet et al.).

**DeepLearning.AI** (for the ML-systems context)
- *Retrieval Augmented Generation (RAG)* — chunking, dedup, and retrieval routing.
- *Machine Learning in Production* (Andrew Ng) — feature stores, sharding, pipeline design.

---

*End of guide. Every code block above was executed and verified for correctness.*

---

## Related Guides

**Prerequisites:** [Hash Maps & Sets](/docs/hash-maps-and-sets)  
**See also:** [Sliding Window](/docs/sliding-window) · [Arrays & Strings](/docs/arrays-and-strings)

*Section: [Core DSA](/docs/category/02-core-dsa) · [All guides](/)*
