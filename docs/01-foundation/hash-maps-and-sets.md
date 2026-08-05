---
title: Hash Maps & Sets
slug: /hash-maps-and-sets
sidebar_position: 3
sidebar_label: Hash Maps & Sets
description: >-
  A working reference for the single most-used data structure in modern software — with the caveats that actually bite in production.
tags:
  - hashing
  - hash-maps
  - sets
  - fundamentals
difficulty: beginner
reading_time: 24
prerequisites:
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: 01-foundation/arrays-and-strings
pagination_next: 01-foundation/linked-lists
path_step: 3
---

# Hash Maps & Sets: The Ultimate Reference Guide

> A working engineer's and ML practitioner's reference for the single most-used data structure in modern software. Bookmark it, return to it, trust the caveats.

---

## 1. What Are Hash Maps & Sets?

### 1.1 First principles

A **hash map** (also called a *hash table*, *dictionary*, *associative array*) is a data structure that stores **key → value** associations and supports **average O(1)** insert, lookup, and delete. It achieves this by converting a key into an integer via a **hash function**, then using that integer to index directly into a backing array.

A **hash set** is the degenerate case of a hash map where you only care about **key membership** — there is no associated value (or the value is a constant sentinel). Internally, a set is almost always a hash map with the values thrown away. Everything true of hash maps is true of hash sets minus the payload.

The core insight: **arrays give O(1) random access by integer index.** If we can deterministically turn *any* key (a string, a tuple, an object) into an integer index, we inherit that O(1) access. The hash function is the bridge from arbitrary key space to `[0, capacity)`.

### 1.2 The three moving parts

```
   key ──hash()──► raw hash (64-bit int) ──mod capacity──► bucket index
                                                              │
                                                              ▼
                                              backing array (the "table")
                                              [ b0 | b1 | b2 | ... | b_{m-1} ]
```

1. **Hash function** `h(key) -> int` — deterministic, ideally uniform.
2. **Compression** — map the raw hash to a valid index, usually `hash & (capacity - 1)` when capacity is a power of two (faster than `%`), or `hash % capacity` otherwise.
3. **Backing array (buckets/slots)** — the contiguous memory that actually holds entries. A **bucket** is one array cell; when it can hold multiple entries (chaining), it's a bucket; when it holds exactly one entry (open addressing), it's usually called a **slot**.

### 1.3 The invariant that makes it work

Equal keys must produce equal hashes: `a == b  ⟹  h(a) == h(b)`. The converse need not hold — two distinct keys *may* hash to the same value; that's a **collision**, and handling it is the entire art of the data structure (Section 3). This invariant is why you must **never mutate a key while it lives in a hash map**, and why keys must be **hashable** (immutable identity) in most languages.

---

## 2. How Hashing Works

### 2.1 Hash functions, buckets, and slots

A **hash function** maps a key to a fixed-size integer. For a table of capacity `m`, the final bucket is `index = compress(h(key), m)`.

- **Bucket**: a slot in the backing array. In separate chaining it holds a container (list/tree) of entries. In open addressing it holds at most one entry.
- **Load factor** `α = n / m` where `n` = number of stored entries, `m` = number of buckets. This single number governs performance and triggers resizing (Section 2.3).

### 2.2 A full lookup, step by step

```
lookup(key):
    1. code   = hash(key)              # e.g. 0x9E3779B97F4A7C15
    2. idx    = code & (m - 1)         # compress to [0, m)
    3. bucket = table[idx]
    4. within the bucket, find the entry whose stored key == key
       (compare by equality, not by hash — hashes can collide)
    5. return its value, or "absent"
```

Step 4 is why **both** `__hash__` and `__eq__` matter in Python (and `hashCode()`/`equals()` in Java): the hash finds the bucket cheaply; equality confirms the exact key.

### 2.3 Load factor and dynamic resizing (rehashing)

As `n` grows, `α` rises, collisions increase, and O(1) degrades toward O(n). To prevent this, the table **resizes** when `α` crosses a threshold:

- **Python `dict`/`set`**: grow when the table is ~2/3 full (target load factor ≈ 0.66).
- **Java `HashMap`**: default load factor 0.75.
- **C++ `std::unordered_map`**: default `max_load_factor` 1.0.
- **Go maps, Rust `HashMap`**: similar bounded-load policies.

**Rehash procedure:**

```
resize(new_m):        # typically new_m = 2 * old_m (power of two)
    1. allocate a fresh array of size new_m
    2. for each entry in the old table:
           new_idx = compress(hash(key), new_m)   # recompute — indices change!
           insert entry into the new array at new_idx
    3. discard the old array
```

Two critical points:

- **Amortized O(1):** a single resize is O(n), but it happens rarely enough (capacity doubles) that the *amortized* cost per insertion stays O(1). Any individual insert can nonetheless spike to O(n) — this matters for latency-sensitive systems.
- **Iteration order can change across a resize.** Never rely on incidental ordering unless the language guarantees it (see Section 11 on Python's insertion-order guarantee).

### 2.4 Complexity preview

Full table lives in Section 4. The headline: **average O(1)** for insert/lookup/delete, **worst-case O(n)** when everything collides or an adversary crafts colliding keys (hence hash-flooding DoS and randomized seeds).

---

## 3. Collision Resolution

Two distinct keys hashing to the same bucket is inevitable — by the **birthday paradox**, collisions appear far sooner than intuition suggests (≈50% chance of a collision after only ~√m insertions into m buckets). There are two dominant families of solutions.

### 3.1 Separate Chaining

Each bucket holds a secondary container (linked list, dynamic array, or — above a threshold — a balanced tree) of all entries that hash there.

```
 index                bucket contents
  0   ─► (empty)
  1   ─► ["cat"→3] ─► ["tan"→9]        # two keys collided at index 1
  2   ─► ["dog"→7]
  3   ─► (empty)
  4   ─► ["fox"→1] ─► ["ivy"→5] ─► ["oak"→8]
```

- **Insert**: hash → bucket → prepend/append to the chain (check for existing key to update).
- **Lookup/Delete**: hash → bucket → linear scan the chain by equality.
- **Cost**: average O(1 + α); with α bounded, effectively O(1). Worst case O(n) if all keys land in one bucket.
- **Java 8+ optimization**: a bucket's linked list converts to a **red–black tree** once it exceeds 8 entries (and the table is ≥64), bounding a pathological bucket at O(log n) instead of O(n) — a direct hash-flooding mitigation.

**Pros**: simple deletion, tolerates α > 1 gracefully, less sensitive to a mediocre hash function.
**Cons**: pointer chasing hurts cache locality; per-entry allocation overhead (each node is a separate heap object).

### 3.2 Open Addressing

All entries live **directly in the backing array** — no external containers. On collision, we **probe** a deterministic sequence of alternative slots until we find an empty one (insert) or the target/an empty slot (lookup). Requires `α < 1` and typically kept ≤ 0.7.

#### 3.2.1 Linear Probing

Try `idx, idx+1, idx+2, ...` (mod m).

```
insert("dog"), h=2, slot 2 free      → [ _, _, dog, _, _, _, _, _ ]
insert("cat"), h=2, slot 2 taken     → probe 3, free
                                     → [ _, _, dog, cat, _, _, _, _ ]
insert("owl"), h=3, slot 3 taken     → probe 4, free
                                     → [ _, _, dog, cat, owl, _, _, _ ]
```

- **Pro**: excellent cache locality — probes hit adjacent memory.
- **Con**: **primary clustering** — contiguous runs of occupied slots grow and merge, degrading probe lengths.

#### 3.2.2 Quadratic Probing

Try `idx + 1², idx + 2², idx + 3², ...` (mod m).

- Reduces **primary** clustering (probes spread out).
- Introduces **secondary clustering** (keys with the same initial hash follow the identical probe path).
- May fail to visit all slots unless `m` is prime (or a power of two with triangular-number probing `idx + i(i+1)/2`, which provably covers all slots).

#### 3.2.3 Double Hashing

Use a second hash function for the step: `idx + i·h2(key)` (mod m).

- `h2` must **never return 0** and should be **coprime with m** so the probe sequence covers the whole table (making `m` prime is the easy way).
- Best distribution of the three — each key gets an effectively unique probe sequence, minimizing clustering.
- Slightly higher per-probe cost (two hashes) but far fewer probes near high load.

#### 3.2.4 Deletion in open addressing — the tombstone problem

You cannot simply blank a slot on delete: a naïve empty slot would break the probe chain, making later keys unreachable.

```
Solution: mark the slot with a TOMBSTONE (a "was-here" sentinel).
- Lookups treat a tombstone as "keep probing" (not "stop").
- Inserts may reuse a tombstone slot.
- Tombstones accumulate → periodically rehash to purge them.
```

#### 3.2.5 Robin Hood & other refinements

Modern high-performance tables (e.g., Rust's `hashbrown`/SwissTable, used by `std::collections::HashMap`) use open addressing with **Robin Hood hashing** and **SIMD metadata scanning**: entries steal slots from "richer" entries (those closer to their ideal slot) to equalize probe distances, and a byte of metadata per slot lets the CPU scan 16 slots at once. This is why Rust/abseil hash maps are exceptionally fast in practice.

### 3.3 Chaining vs. Open Addressing — the engineering trade-off

| Aspect | Separate Chaining | Open Addressing |
|---|---|---|
| Load factor α | Can exceed 1 | Must stay < 1 (≤0.7 ideal) |
| Cache locality | Poor (pointer chasing) | Excellent (contiguous) |
| Memory per entry | Higher (node objects) | Lower (in-array) |
| Deletion | Trivial | Needs tombstones |
| Sensitivity to hash quality | Lower | Higher |
| Real-world users | Java `HashMap` | Python `dict`, Rust, abseil, Go |

---

## 4. Complexity Analysis (Table)

`n` = number of entries, `m` = number of buckets, `α = n/m` = load factor, `k` = key length (for string hashing).

| Operation | Average Case | Worst Case | Notes |
|---|---|---|---|
| **Insert** | O(1) amortized | O(n) | Worst = resize event *or* all keys collide |
| **Lookup** | O(1) | O(n) | Worst = adversarial/degenerate collisions |
| **Delete** | O(1) | O(n) | Open addressing: tombstone bookkeeping |
| **Iteration** | O(n + m) | O(n + m) | Must scan all buckets, including empties |
| **Space** | O(n + m) | O(n + m) | Overhead ≈ table capacity, not just n |

### 4.1 Caveats a senior engineer must note

- **"O(1)" hides the hash cost.** Hashing a key of length `k` (a string, a large tuple) is **O(k)**, not O(1). For long keys, hashing dominates. LeetCode-style "O(1) lookup" silently assumes short/fixed-size keys.
- **Amortized ≠ worst-case per operation.** A single insert can trigger an O(n) rehash. Latency-critical paths (real-time, HFT, game loops) may need **pre-sized** tables or incremental resizing (Go, Redis) to avoid the spike.
- **Worst case is adversarial, not random.** With a fixed public hash, an attacker can craft colliding keys to force O(n) per op → **hash-flooding DoS**. Defenses: per-process random seeds (Python's `PYTHONHASHSEED`, SipHash for strings), tree-ified buckets (Java).
- **Iteration is O(n + m), not O(n).** A sparsely populated large table is slow to iterate. If you build big then shrink, capacity may not shrink with it.
- **Constant factors matter.** A cache-friendly open-addressed table can beat a "theoretically identical" chained table by 3–10× on real hardware. Big-O is necessary, not sufficient.

---

## 5. Hash Function Design

### 5.1 Properties of a good hash function

1. **Deterministic** — same input → same output, every time (within a process/seed lifetime).
2. **Uniform** — spreads keys evenly across `[0, m)`; minimizes collisions. Poor uniformity clusters keys and destroys performance.
3. **Fast** — computed on every operation; it must not dominate.
4. **Avalanche** — flipping one input bit flips ~half the output bits. Prevents similar keys (`"user_1"`, `"user_2"`) from clustering.
5. **Low correlation with `m`** — should not interact badly with the compression step (part of why power-of-two masks pair with high-quality hashes that mix *all* bits, not just low ones).

> A hash function for a hash **table** optimizes for speed + uniformity. A hash function for **cryptography** (SHA-256) optimizes for collision-resistance and preimage-resistance and is far too slow for a hash table. Don't confuse the two.

### 5.2 Polynomial rolling hash (strings)

Treat a string as a base-`b` number modulo a large prime `p`:

```
h(s) = (s[0]·b^{k-1} + s[1]·b^{k-2} + ... + s[k-1]·b^0) mod p
```

```python
def poly_hash(s, base=131, mod=(1 << 61) - 1):
    h = 0
    for ch in s:
        h = (h * base + ord(ch)) % mod
    return h
```

The **rolling** property is the point: sliding a fixed-width window over text updates the hash in O(1) by removing the leading char's contribution and adding the trailing char's — the engine behind **Rabin–Karp** substring search and content-defined chunking.

### 5.3 FNV (Fowler–Noll–Vo) hash

Simple, fast, decent distribution for short keys; used in many hash-table implementations historically.

```python
def fnv1a_32(data: bytes) -> int:
    h = 0x811C9DC5                 # FNV offset basis
    for byte in data:
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF   # FNV prime, keep 32-bit
    return h
```

FNV-1a (XOR then multiply) has better avalanche than FNV-1 (multiply then XOR).

### 5.4 MurmurHash / xxHash / CityHash (modern non-crypto)

**MurmurHash3**, **xxHash**, and **CityHash/FarmHash** are the workhorse non-cryptographic hashes for hash tables and checksums: excellent avalanche, very high throughput (xxHash processes GB/s), used across databases, caches, and language runtimes. Prefer these over rolling your own for production tables.

### 5.5 SipHash — the DoS-resistant default

**SipHash** is a *keyed* pseudo-random function: fast enough for hash tables yet secure against collision-crafting because the per-process key is secret. It is the default string hash in **Python, Rust, Ruby, and Perl** precisely to defeat hash-flooding. This is why `hash("abc")` differs across Python runs unless `PYTHONHASHSEED` is fixed.

### 5.6 Practical guidance

- **Never invent a hash function for production.** Use the language default or a vetted library (xxHash, Murmur).
- **For custom key objects**, derive the hash from the same immutable fields used in equality — and keep those fields immutable for the key's lifetime in the map.
- **For adversary-facing inputs** (network, user-supplied keys), ensure your table uses a seeded/keyed hash (SipHash) or tree-ified buckets.

---

## 6. Code Examples & Patterns

### 6.1 A hash map from scratch (separate chaining)

```python
class HashMap:
    """Educational separate-chaining hash map with dynamic resizing."""

    def __init__(self, capacity=8):
        self._capacity = capacity
        self._size = 0
        self._buckets = [[] for _ in range(capacity)]  # list of (key, value) pairs
        self._max_load = 0.75

    def _index(self, key):
        # Python's built-in hash() already mixes bits well.
        return hash(key) & (self._capacity - 1)   # capacity is power of two

    def put(self, key, value):
        idx = self._index(key)
        bucket = self._buckets[idx]
        for i, (k, _) in enumerate(bucket):
            if k == key:                # update existing
                bucket[i] = (key, value)
                return
        bucket.append((key, value))     # insert new
        self._size += 1
        if self._size / self._capacity > self._max_load:
            self._resize(self._capacity * 2)

    def get(self, key, default=None):
        bucket = self._buckets[self._index(key)]
        for k, v in bucket:
            if k == key:
                return v
        return default

    def delete(self, key):
        bucket = self._buckets[self._index(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:
                bucket.pop(i)
                self._size -= 1
                return True
        return False

    def _resize(self, new_capacity):
        old = [pair for bucket in self._buckets for pair in bucket]
        self._capacity = new_capacity
        self._buckets = [[] for _ in range(new_capacity)]
        self._size = 0
        for k, v in old:                # rehash every entry
            self.put(k, v)

    def __contains__(self, key):
        bucket = self._buckets[self._index(key)]
        return any(k == key for k, _ in bucket)

    def __len__(self):
        return self._size

    def items(self):
        for bucket in self._buckets:
            yield from bucket
```

### 6.2 Core operations with the built-in `dict`

```python
# Python Hash Map - Core Operations
hash_map = {}

# Insert / update
hash_map["key"] = "value"

# Lookup (safe — no KeyError)
value = hash_map.get("key", "default")

# Membership (O(1))
if "key" in hash_map:
    ...

# Delete
del hash_map["key"]              # raises KeyError if absent
hash_map.pop("key", None)        # safe delete

# Iterate
for k, v in hash_map.items():
    ...

# Frequency Counter Pattern
from collections import Counter
freq = Counter(["a", "b", "a", "c", "b", "a"])
# Counter({'a': 3, 'b': 2, 'c': 1})
```

### 6.3 Sets for deduplication and membership

```python
# Deduplicate while (optionally) preserving first-seen order
def dedup_ordered(seq):
    seen = set()
    out = []
    for x in seq:
        if x not in seen:      # O(1) membership
            seen.add(x)
            out.append(x)
    return out

# Fast set-of-items dedup (order not preserved)
unique = set([3, 1, 2, 3, 1])         # {1, 2, 3}

# Set algebra
a, b = {1, 2, 3}, {2, 3, 4}
a & b        # intersection {2, 3}
a | b        # union {1, 2, 3, 4}
a - b        # difference {1}
a ^ b        # symmetric difference {1, 4}

# Membership testing against a large blocklist — O(1) vs O(n) for a list
blocklist = {"spam.com", "evil.net"}   # use a set, NOT a list
"evil.net" in blocklist                # O(1)
```

---

## 7. Canonical Algorithms

### 7.1 Two Sum (hash map as index lookup)

```
Problem: Two Sum
Input: nums = [2, 7, 11, 15], target = 9
Approach: Hash map {value: index}
- Iterate, check if (target - num) exists in map
- If yes → return [map[complement], i]
- If no → store num in map
Time: O(n) | Space: O(n)
```

```python
def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
```

The pattern: **trade space for time** — one pass, O(1) complement check, instead of the O(n²) double loop.

### 7.2 Longest Substring Without Repeating Characters (sliding window + map)

```python
def length_of_longest_substring(s):
    last_seen = {}          # char -> last index it appeared
    start = 0               # left edge of current window
    best = 0
    for i, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= start:
            start = last_seen[ch] + 1     # jump left edge past the repeat
        last_seen[ch] = i
        best = max(best, i - start + 1)
    return best
# "abcabcbb" -> 3 ("abc"); Time O(n), Space O(min(n, alphabet))
```

### 7.3 Group Anagrams (hash map with a canonical key)

```python
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        key = "".join(sorted(w))     # anagrams share a sorted key
        groups[key].append(w)
    return list(groups.values())
# ["eat","tea","tan","ate","nat","bat"]
# -> [["eat","tea","ate"], ["tan","nat"], ["bat"]]
# Time O(n·k log k) (sorting each word) | Space O(n·k)
```

Faster key for large `k`: a 26-length character-count tuple → O(n·k) total.

### 7.4 The five canonical hash-map patterns

**1. Two-pointer + hash map.** Hash map records positions/counts while two indices sweep. Two Sum (7.1) is the archetype; also "subarray sum equals K" using a prefix-sum → count map:

```python
def subarray_sum_equals_k(nums, k):
    from collections import defaultdict
    count = defaultdict(int)
    count[0] = 1                    # empty prefix
    total = ans = 0
    for x in nums:
        total += x
        ans += count[total - k]     # how many prefixes make a valid subarray
        count[total] += 1
    return ans                      # O(n) time, O(n) space
```

**2. Sliding window with frequency maps.** Maintain a window's character/element counts in a map; expand/shrink to satisfy a constraint. Powers "minimum window substring", "longest substring with at most K distinct", anagram-in-string. Key idea: window validity is a cheap check on the frequency map.

**3. Union-Find alternative using hash sets.** For connectivity/grouping over non-integer or sparse labels, a `dict`-backed disjoint set (parent map + rank map) replaces array-indexed DSU:

```python
class DSU:
    def __init__(self):
        self.parent = {}
    def find(self, x):
        self.parent.setdefault(x, x)
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path compression
            x = self.parent[x]
        return x
    def union(self, a, b):
        self.parent[self.find(a)] = self.find(b)
```

Use when node labels are strings/tuples or unknown up front. (True Union-Find is near-O(α(n)); the hash-map version adds hashing constant factors.)

**4. Topological sort with adjacency hash maps.** Represent a sparse DAG as `dict[node] -> list[neighbors]` plus a `dict` of in-degrees; Kahn's algorithm peels zero-in-degree nodes:

```python
from collections import defaultdict, deque

def topo_sort(edges):               # edges: list of (u, v) meaning u -> v
    adj = defaultdict(list)
    indeg = defaultdict(int)
    nodes = set()
    for u, v in edges:
        adj[u].append(v)
        indeg[v] += 1
        nodes.update((u, v))
    q = deque(n for n in nodes if indeg[n] == 0)
    order = []
    while q:
        n = q.popleft()
        order.append(n)
        for m in adj[n]:
            indeg[m] -= 1
            if indeg[m] == 0:
                q.append(m)
    return order if len(order) == len(nodes) else []   # [] => cycle
```

Hash maps make this work for arbitrary node identifiers without a dense index.

**5. Memoization (hash map as a cache).** Cache expensive pure-function results keyed by arguments:

```python
from functools import lru_cache

@lru_cache(maxsize=None)            # dict-backed memo table under the hood
def fib(n):
    return n if n < 2 else fib(n-1) + fib(n-2)
```

Turns exponential recursion into linear. `functools.cache`/`lru_cache` *is* a hash map keyed by the call arguments (which must therefore be hashable).

---

## 8. Analogies & Mental Models

### 8.1 The library catalog (the map itself)

A hash map is a **library's catalog index**. Instead of walking every shelf to find a book, you look the title up in the catalog and it tells you the exact shelf location instantly. The **hash function is the catalog rule** that turns a title into a shelf coordinate. Without it you scan the whole library (O(n)); with it you teleport (O(1)).

### 8.2 The coat check (keys, values, and slots)

At a **coat check**, you hand over a coat (value) and receive a numbered ticket (key). The number maps directly to a hook (bucket). You don't search every hook at pickup — you present the number and retrieve in one step. Lose the invariant (someone changes your ticket number = mutating a key) and your coat becomes unreachable.

### 8.3 Mental model for collisions

Two guests get tickets pointing to the **same hook**. Options:
- **Separate chaining**: hang both coats on that one hook (a little bundle) and check names when someone claims one.
- **Open addressing**: send the second guest to the *next free hook* by a fixed rule, and remember the rule so pickup follows the same path.

Collisions aren't bugs — they're the expected cost of squeezing a huge key space into a small array. The birthday paradox says they'll happen *soon*; the resolution strategy is what keeps them cheap.

### 8.4 Mental model for load factor

Load factor is **how full the parking lot is**. An empty lot: drive straight to any spot (O(1)). A 95%-full lot: circle for ages hunting a space (probes pile up). The resize policy is the rule *"when the lot hits 66% full, build a lot twice as big and re-park every car."* Re-parking (rehash) is expensive but rare, so the average cost per car stays low — while any single arrival might trigger the whole rebuild.

---

## 9. Applications in DS / ML / AI / LLMs

### 9.1 Data Science

- **Feature indexing / categorical encoding**: mapping category strings → integer IDs is a hash map. **Feature hashing (the "hashing trick")** deliberately hashes feature names into a fixed-size vector — trading occasional collisions for bounded memory and no vocabulary storage (scikit-learn `HashingVectorizer`).
- **Deduplication**: dropping duplicate rows/records (`pandas.DataFrame.drop_duplicates`, `set` of record hashes) is set membership. **MinHash + LSH** approximates set similarity for near-duplicate detection at scale.
- **`groupby` / aggregation**: `pandas`/SQL `GROUP BY` builds a hash map from group key → accumulator (hash aggregation). Joins frequently use **hash joins** (build a hash table on one side, probe with the other) — O(n+m) vs O(n·m) nested loops.

### 9.2 Machine Learning

- **Vocabulary lookup tables**: token/word → integer index is a hash map; it's the entry point of nearly every NLP pipeline.
- **Embedding dictionaries**: `id → vector`. The embedding matrix is array-indexed, but the **string→id** step in front of it is a hash map.
- **Feature stores**: online serving looks up precomputed features by entity key at low latency — hash-map-backed key-value stores (Redis, DynamoDB, RocksDB) under the hood.
- **Sparse features**: sparse vectors are `dict[index] -> value`; hashing keeps dimensionality bounded.

### 9.3 LLMs

- **Tokenizer vocabularies**: **BPE/WordPiece/Unigram** tokenizers hold a **token↔ID** bidirectional map — two hash maps (`token→id` for encoding, `id→token` for decoding). Merge rules in BPE are themselves a map from token-pair → merge rank.
- **KV-cache**: during autoregressive decoding, past keys/values are cached to avoid recomputation. Implementations index cached tensors by **(layer, head, position)** and, in paged systems (**vLLM's PagedAttention**), by **block ID** — a hash-map-like block table maps logical token blocks to physical GPU memory pages. **Prefix caching** hashes token-prefix sequences to reuse KV across requests sharing a prompt.
- **Attention masks & special-token sets**: sets of stop tokens, special/reserved token IDs, and banned tokens are membership sets checked every decoding step.
- **Deduplication of training data**: web-scale corpora are deduped with hash sets / MinHash-LSH to remove repeated documents — critical for training quality and avoiding memorization.

### 9.4 Databases & Systems

- **Inverted indexes**: search engines map `term → posting list` (a hash map from word to the documents containing it) — the core of full-text search and, adjacent to it, of retrieval in RAG systems.
- **Bloom filters** (the probabilistic cousin of a set): a bit array + `k` hash functions answers "**definitely not present** or **possibly present**" with zero false negatives and tunable false positives, using a fraction of a set's memory. Used in LSM-tree databases (Cassandra, RocksDB, BigTable) to skip disk reads for absent keys, and in CDNs/caches to avoid one-hit-wonder caching.
- **Consistent hashing**: distributed caches/shards (Memcached, Dynamo, Cassandra) map keys → nodes via a hash ring so that adding/removing a node remaps only a small fraction of keys.
- **Content-addressable storage**: Git objects, Docker layers, and dedup storage key blobs by their content hash.

---

## 10. Hash Map vs. Alternatives (Comparison Table)

| Structure | Lookup | Ordered | Memory | Best Use Case |
|---|---|---|---|---|
| **Hash Map** | O(1) avg, O(n) worst | No (Python `dict`: insertion order preserved) | Medium (table overhead) | Fast key-value lookup, dedup, counting |
| **BST / TreeMap (balanced)** | O(log n) | Yes (sorted) | Medium | Sorted iteration, range queries, floor/ceil |
| **Array / List** | O(n) search, O(1) index | Yes (positional) | Low (compact) | Index-based access, small N, cache-friendly scans |
| **Trie (prefix tree)** | O(k) | Partial (lexicographic) | High | Prefix search, autocomplete, dictionary lookups |
| **Sorted Array + binary search** | O(log n) | Yes | Low | Static data, memory-constrained, range queries |
| **Bloom filter** | O(k) | No | Very low | Approximate membership (no false negatives) |
| **Skip list** | O(log n) avg | Yes | Medium | Concurrent ordered maps (e.g. Redis sorted sets) |

Key decision drivers: do you need **ordering / range queries** (→ tree/sorted structure), **prefix semantics** (→ trie), **minimal memory with approximate answers** (→ bloom filter), or raw **point-lookup speed** (→ hash map)?

---

## 11. Expert Takeaways & Pro Tips

### 11.1 When NOT to use a hash map

- **You need ordering or range queries.** Hash maps have no meaningful key order. Want "all keys between X and Y" or "the smallest key"? Use a balanced BST / `TreeMap` / sorted structure.
- **Small N.** For a handful of entries, a plain array/list with linear scan is often *faster* (no hashing, no pointer chasing, cache-resident) and uses less memory. The crossover is typically tens of elements.
- **Cache-sensitive tight loops.** Chained hash maps thrash the cache. A sorted array or struct-of-arrays can dominate despite worse Big-O.
- **Worst-case latency guarantees.** Amortized O(1) permits occasional O(n) rehash spikes. Real-time/hard-latency systems prefer pre-sized tables, incremental resizing, or ordered structures with predictable O(log n).
- **Keys aren't stably hashable.** If key identity can change or objects are unhashable, a hash map is the wrong tool.

### 11.2 Python-specific nuances: `dict` vs `defaultdict` vs `Counter` vs `set`

```python
from collections import defaultdict, Counter

d = {}                              # KeyError on missing key access
dd = defaultdict(list)              # auto-creates default on missing key
dd["x"].append(1)                   # no KeyError; "x" -> [1]

c = Counter("mississippi")          # multiset: Counter({'s':4,'i':4,'p':2,'m':1})
c.most_common(2)                    # [('s', 4), ('i', 4)]

s = set()                           # membership only, no values
```

- **`dict`**: general key→value; **insertion-ordered since Python 3.7** (language guarantee, not incidental). Use `.get(k, default)` / `.setdefault` for safe access.
- **`defaultdict(factory)`**: eliminates existence checks when accumulating (`list`, `int`, `set` factories). Beware: *reading* a missing key **creates** it — can silently grow the dict.
- **`Counter`**: a `dict` subclass for tallying; supports `+`, `-`, `&`, `|`, and `most_common`. Ideal for frequency maps.
- **`set` / `frozenset`**: membership and set algebra; `frozenset` is hashable → usable as a dict key or set element.
- **Micro-note**: `dict` and `set` are the most optimized containers in CPython; prefer them over hand-rolled structures unless profiling says otherwise.

### 11.3 Thread-safety in concurrent systems

- **CPython**: individual `dict`/`set` operations are effectively atomic under the **GIL**, but **compound** operations (check-then-act, e.g. `if k not in d: d[k] = ...`) are **not** atomic — races exist. Guard with a `Lock`, or use atomic idioms (`dict.setdefault`, `Counter` updates).
- **True parallelism** (free-threaded Python 3.13+, other runtimes): you need explicit synchronization or concurrent map types.
- **Java**: `HashMap` is **not** thread-safe (concurrent writes can corrupt it / infinite-loop on old JDKs); use `ConcurrentHashMap` (lock-striped, non-blocking reads).
- **Go**: built-in maps are **not** safe for concurrent read/write (runtime panics on detection); use `sync.Map` or a `sync.RWMutex`.
- **General rule**: a hash map shared across writers needs either a lock, a concurrent variant, or per-thread maps merged at the end.

### 11.4 Memory overhead trade-offs vs. trees

- Hash maps carry **table overhead**: capacity is larger than `n` (to keep α low), plus per-entry metadata (hashes, pointers, or tombstones). Expect **1.5–3× the payload size**.
- Open addressing packs entries in one array (better locality, lower per-entry overhead); chaining adds a node/object per entry (higher overhead, more allocations).
- Balanced trees store **2–3 pointers per node** but have **no wasted capacity** and give ordering for free — sometimes more memory-efficient than a sparsely loaded hash table, sometimes less.
- **Pre-size when you know N.** `dict`/`unordered_map`/`HashMap` all accept a capacity hint (or `reserve`) — avoiding repeated rehashes saves both time and transient memory spikes.

### 11.5 Miscellaneous hard-won tips

- Use a **`set`, not a `list`, for repeated membership checks** — swapping `x in some_list` (O(n)) for `x in some_set` (O(1)) is the single most common real-world speedup.
- **Never mutate a key** (or an object used as a key) while it's in a map/set — it becomes unreachable.
- For **composite keys**, use immutable **tuples** or `frozenset`s, not concatenated strings (fewer collisions, no delimiter bugs).
- Beware **`float` keys** (`0.1 + 0.2 != 0.3`) and mixed numeric keys (`1 == 1.0 == True` collide in Python dicts).
- When iteration order must be **deterministic across runs**, don't rely on hash order for security-relevant or reproducible outputs — sort explicitly or fix the seed.

---

## 12. Quick Reference Cheat Sheet

> **One page. The facts you'll actually reach for.**

**Complexity (n entries, m buckets, α = n/m, k = key length)**

| Op | Avg | Worst |
|---|---|---|
| Insert | O(1) amortized | O(n) (resize / all-collide) |
| Lookup | O(1) | O(n) |
| Delete | O(1) | O(n) |
| Iterate | O(n + m) | O(n + m) |
| Space | O(n + m) | O(n + m) |

*Caveat: "O(1)" excludes the O(k) cost of hashing a length-k key.*

**Core idea**: `key → hash() → compress mod m → bucket`. Equal keys ⟹ equal hashes; equality confirms the match. Never mutate a live key.

**Load factor** α = n/m. Resize (usually 2×, rehash all) when α exceeds threshold: Python ~0.66, Java 0.75, C++ 1.0.

**Collision resolution**
- *Separate chaining*: bucket holds a list/tree. Tolerates α>1; poor locality; easy delete. (Java: list→tree at 8.)
- *Open addressing*: probe within the array. α<1 required; great locality; needs tombstones on delete.
  - Linear (cache-friendly, primary clustering) · Quadratic (less clustering) · Double hashing (best spread).

**Good hash function**: deterministic, uniform, fast, avalanche. Use vetted ones — **xxHash / MurmurHash** (speed), **SipHash** (DoS-resistant, Python/Rust default), **FNV** (simple), **poly rolling** (Rabin–Karp). Never use crypto hashes (SHA) for tables; never invent your own for prod.

**Python containers**
- `dict` — key→value, insertion-ordered (3.7+); `.get(k, default)`.
- `defaultdict(factory)` — auto-default; reading a missing key creates it.
- `Counter` — frequency multiset; `.most_common(n)`.
- `set` / `frozenset` — membership + set algebra; `frozenset` hashable.
- Membership: **use a set, not a list** (O(1) vs O(n)).

**Canonical patterns**: value→index map (Two Sum) · sliding window + freq map · prefix-sum count map · memoization (`@lru_cache`) · adjacency-map graphs (topo sort) · dict-backed DSU.

**When NOT to use**: need ordering/range → BST/TreeMap · prefix search → Trie · tiny N or tight cache loops → array · approximate membership at low memory → Bloom filter · hard latency bounds → avoid rehash spikes (pre-size).

**Concurrency**: CPython single ops ~atomic under GIL, compound ops are NOT · Java → `ConcurrentHashMap` · Go maps not concurrent-safe → `sync.Map`/mutex.

**AI/ML/LLM**: tokenizer token↔id maps (BPE) · embedding id→vector · feature stores (Redis/RocksDB) · KV-cache & PagedAttention block tables · data dedup (hash set / MinHash-LSH) · inverted indexes (RAG/search) · Bloom filters in LSM databases · hashing trick for bounded feature dims.

**Golden rules**: pre-size when N is known · immutable tuple/frozenset composite keys · never mutate a key in place · profile — constant factors and cache behavior often beat Big-O.

---

## Related Guides

**Prerequisites:** [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [Hashing Patterns](/docs/hashing-patterns) · [Arrays & Strings](/docs/arrays-and-strings) · [Streaming & Caching Data Structures](/docs/streaming-caching)

*Section: [Foundation](/docs/category/01-foundation) · [All guides](/)*
