---
title: Probabilistic Structures II — HyperLogLog, Skip Lists & Cuckoo Hashing
slug: /probabilistic-structures
sidebar_position: 9
sidebar_label: HyperLogLog, Skip Lists & Cuckoo
description: >-
  Completing the probabilistic/approximate toolkit — HyperLogLog for cardinality, skip lists for randomized ordered structure, and cuckoo hashing/filters for worst-case O(1) lookups with deletion.
tags:
  - probabilistic
  - hyperloglog
  - skip-list
  - cuckoo
  - streaming
difficulty: advanced
reading_time: 24
prerequisites:
  - title: Streaming & Caching Data Structures
    to: /docs/streaming-caching
  - title: Hash Maps & Sets
    to: /docs/hash-maps-and-sets
pagination_prev: domain-specific-dsa/streaming-caching
pagination_next: domain-specific-dsa/hnsw-deep-dive
path_step: 38
---

# Probabilistic Structures II: HyperLogLog, Skip Lists & Cuckoo Hashing

> [Streaming & Caching](/docs/streaming-caching) covered **Bloom filters** (membership), **Count-Min Sketch** (frequency), and **LRU** (caching). This guide completes the toolkit with three structures that keep coming up in distributed and AI systems: **HyperLogLog** (count distinct elements in tiny memory), **skip lists** (a randomized alternative to balanced BSTs), and **cuckoo hashing / filters** (worst-case `O(1)` lookup, and a Bloom filter that supports deletion).

Together with the earlier guide, these answer the four canonical "approximate" questions — *is it present?* (Bloom), *how many times?* (Count-Min), *how many distinct?* (HyperLogLog), and *ordered access with randomization* (skip list) — plus the deletion-capable membership structure Bloom lacks (cuckoo).

---

## 1. HyperLogLog: counting distinct elements

### 1.1 What and why

**HyperLogLog (HLL)** estimates the **number of distinct elements (cardinality)** of a multiset using a *fixed, tiny* amount of memory — typically a few kilobytes to count *billions* of distinct items within ~2% error. An exact distinct count needs a hash set holding every unique element (`O(distinct)` memory); HLL needs `O(1)`.

**Why it exists.** "How many unique users visited today?", "how many distinct IPs hit this endpoint?", "how many unique n-grams in this corpus?" — at scale, storing every distinct key is infeasible, and an approximate answer within a couple percent is almost always good enough.

### 1.2 The core insight

> **In a stream of uniformly random hash values, the maximum number of *leading zeros* observed is a proxy for `log2(cardinality)`.** If you've seen a hash starting with `k` zeros, you've *probably* seen about `2^k` distinct values (a `k`-zero prefix has probability `2^{-k}`). Averaging this estimator across many independent "buckets" (via a harmonic mean) tames the variance.

The progression: **Flajolet–Martin** (one counter, high variance) → **LogLog** (many buckets, arithmetic mean) → **HyperLogLog** (harmonic mean + bias correction, the modern standard).

### 1.3 Implementation (illustrative)

```python
import hashlib

class HyperLogLog:
    def __init__(self, p=14):
        """p register-index bits -> m = 2^p registers. p=14 -> 16384 regs,
        ~0.81% standard error, a few KB of memory total."""
        self.p = p
        self.m = 1 << p
        self.registers = [0] * self.m
        # bias-correction constant alpha_m (Flajolet et al.)
        self.alpha = 0.7213 / (1 + 1.079 / self.m) if self.m >= 128 else 0.673

    def _hash(self, x):
        return int.from_bytes(hashlib.blake2b(str(x).encode(),
                                              digest_size=8).digest(), "big")

    def add(self, x):
        h = self._hash(x)
        idx = h & (self.m - 1)                 # low p bits pick the register
        w = h >> self.p                         # remaining bits
        # rank = position of the leftmost 1-bit (1 + number of leading zeros)
        rank = 1
        while w & 1 == 0 and rank <= 64 - self.p:
            rank += 1
            w >>= 1
        self.registers[idx] = max(self.registers[idx], rank)  # keep the max per bucket

    def count(self):
        # harmonic mean of 2^register across all buckets, scaled by alpha*m^2
        raw = self.alpha * self.m ** 2 / sum(2.0 ** -r for r in self.registers)
        if raw <= 2.5 * self.m:                 # small-range correction
            zeros = self.registers.count(0)
            if zeros:
                return round(self.m * (self._ln(self.m / zeros)))
        return round(raw)

    @staticmethod
    def _ln(x):
        import math
        return math.log(x)

hll = HyperLogLog(p=14)
for i in range(100_000):
    hll.add(f"user_{i}")
est = hll.count()
print(f"true=100000  est={est}  error={abs(est-100000)/100000:.2%}")
# e.g. est ~ 99000-101000, well within a couple percent
```

### 1.4 Complexity

- **Add / count:** `O(1)` per element (one hash, one register update). **Count:** `O(m)` to scan registers once.
- **Space:** `O(m)` = `2^p` small registers (6 bits each suffices). `p = 14` → 16 KB → ~0.81% standard error. Error scales as `1.04 / √m` — **independent of the cardinality**.
- **Mergeable:** the register-wise `max` of two HLLs is the HLL of the union — so HLLs combine across shards with zero coordination. This is why they're ubiquitous in distributed analytics.

### 1.5 Edge cases & pitfalls

- **Small cardinalities are biased** without the small-range/linear-counting correction (shown above). Production HLL (HLL++) adds this plus a bias-correction table.
- **It counts distinct, not frequency.** For "how many times did X appear," use [Count-Min Sketch](/docs/streaming-caching); for "is X present," use a [Bloom filter](/docs/streaming-caching). Reaching for HLL to answer frequency is the classic mismatch.
- **Hash quality matters.** The leading-zeros argument assumes uniform hashing; a weak hash biases the estimate.

### 1.6 AI / systems connection

- **Distinct-count analytics.** Redis `PFCOUNT`, Presto/BigQuery `APPROX_COUNT_DISTINCT`, and every large-scale "unique users/events" dashboard use HLL — the mergeability makes it trivially parallel across shards.
- **Data-quality auditing for training corpora.** Estimating the number of *distinct* documents, URLs, or n-grams in a web-scale dataset (to quantify diversity/duplication) is an HLL job — pairs naturally with the Bloom/MinHash dedup pipeline.
- **Cardinality features.** Approximate distinct-count features (distinct items per user, distinct tokens per document) feed recommenders and anomaly detectors under a fixed memory budget.

---

## 2. Skip Lists: randomized ordered structure

### 2.1 What and why

A **skip list** is a probabilistic, ordered data structure that supports `search`, `insert`, and `delete` in **`O(log n)` expected** time — the same asymptotics as a balanced BST, but achieved through **randomization instead of rebalancing rotations**. It is a stack of increasingly-sparse linked lists: the bottom level holds all elements in order; each higher level is a random ~50% sample of the level below, forming "express lanes."

**Why it exists.** Balanced BSTs (AVL, red-black) are correct but fiddly — rotations are error-prone. Skip lists get the same expected performance with far simpler code and are **naturally concurrent** (lock-free skip lists are practical, which is why they back several production systems).

### 2.2 The core idea

> **Each element is promoted to the next level up with probability `p` (usually ½), independently. Search starts at the top-left and moves right while the next node is `< target`, dropping down a level when it would overshoot. The express lanes let you skip `~2^level` elements at a time, giving `O(log n)` expected hops.**

```
Level 3:  HEAD ------------------------------> 30 -----------> NIL
Level 2:  HEAD --------> 10 ----------------> 30 -----------> NIL
Level 1:  HEAD --> 3 --> 10 --> 20 --------> 30 --> 40 -----> NIL
Level 0:  HEAD --> 3 --> 10 --> 20 --> 25 -> 30 --> 40 --> 50 NIL   (all elements)
```

Searching for 25: at level 3 skip to 30 (overshoot → drop), level 2 to 30 (drop), level 1 to 20 then 30 (overshoot → drop), level 0 from 20 → 25. Found in a handful of steps instead of scanning all.

### 2.3 Implementation

```python
import random

class SkipListNode:
    __slots__ = ("key", "forward")
    def __init__(self, key, level):
        self.key = key
        self.forward = [None] * (level + 1)     # one 'next' pointer per level

class SkipList:
    def __init__(self, max_level=16, p=0.5):
        self.max_level = max_level
        self.p = p
        self.level = 0
        self.head = SkipListNode(None, max_level)

    def _random_level(self):
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1                            # coin flips decide promotion height
        return lvl

    def search(self, key):
        node = self.head
        for i in range(self.level, -1, -1):     # top level down
            while node.forward[i] and node.forward[i].key < key:
                node = node.forward[i]          # move right on this express lane
        node = node.forward[0]
        return node is not None and node.key == key

    def insert(self, key):
        update = [None] * (self.max_level + 1)  # per-level predecessor of the insert point
        node = self.head
        for i in range(self.level, -1, -1):
            while node.forward[i] and node.forward[i].key < key:
                node = node.forward[i]
            update[i] = node
        lvl = self._random_level()
        if lvl > self.level:                    # growing taller: head is predecessor
            for i in range(self.level + 1, lvl + 1):
                update[i] = self.head
            self.level = lvl
        new_node = SkipListNode(key, lvl)
        for i in range(lvl + 1):                # splice in at every level it reaches
            new_node.forward[i] = update[i].forward[i]
            update[i].forward[i] = new_node

sl = SkipList()
for k in [3, 10, 20, 25, 30, 40, 50]:
    sl.insert(k)
print(sl.search(25), sl.search(26))   # True False
```

### 2.4 Complexity

| Operation | Expected | Worst case |
|---|---|---|
| Search | `O(log n)` | `O(n)` (pathological coin flips) |
| Insert | `O(log n)` | `O(n)` |
| Delete | `O(log n)` | `O(n)` |
| Space | `O(n)` expected (`Σ p^i ≈ n/(1-p)` pointers) | `O(n log n)` |

The worst case is astronomically unlikely (it requires a long run of bad coin flips) — the guarantee is *probabilistic*, like a randomized quicksort. Unlike a plain BST, no adversarial *input* triggers the worst case; only bad *randomness* does, and you control the RNG.

### 2.5 Skip list vs. balanced BST

| | Skip list | Balanced BST (RB/AVL) |
|---|---|---|
| Guarantee | `O(log n)` **expected** | `O(log n)` **worst case** |
| Implementation | simpler (no rotations) | rotations, color/height invariants |
| Concurrency | **lock-free feasible** | hard to make lock-free |
| Cache behavior | pointer-chasing (poorer) | pointer-chasing (similar) |
| Range queries | natural (walk level 0) | natural (in-order) |

### 2.6 AI / systems connection

- **Production databases.** **Redis** sorted sets (`ZSET`) are backed by a skip list; **LevelDB/RocksDB** memtables use skip lists as the in-memory ordered write buffer before flushing to disk — chosen specifically for simple concurrency and ordered iteration.
- **Ordered indexes in streaming systems.** Where you need an ordered structure with concurrent writers (feature stores, time-ordered event buffers), the lock-free skip list is a common choice over a lock-heavy balanced tree.

---

## 3. Cuckoo Hashing & Cuckoo Filters

### 3.1 Cuckoo hashing — worst-case `O(1)` lookup

**Cuckoo hashing** is an open-addressing scheme giving **worst-case `O(1)` lookups** (not just average): each key has **two** candidate buckets (from two hash functions), and it lives in exactly one of them — so a lookup checks at most two locations, *guaranteed*.

> **On insert, place the key in one of its two buckets. If both are occupied, *evict* an existing key (like a cuckoo chick pushing others out of the nest) and re-insert that displaced key into its *alternate* bucket, cascading until everything settles — or a cycle/threshold triggers a rehash.**

```python
import random

class CuckooHash:
    def __init__(self, size=16, max_kicks=50):
        self.size = size
        self.t1 = [None] * size                 # table 1 (hash h1)
        self.t2 = [None] * size                 # table 2 (hash h2)
        self.max_kicks = max_kicks
        self._seed = random.randrange(1 << 30)

    def _h1(self, k): return hash((k, 0)) % self.size
    def _h2(self, k): return hash((k, self._seed)) % self.size

    def contains(self, k):
        return self.t1[self._h1(k)] == k or self.t2[self._h2(k)] == k  # <= 2 probes

    def insert(self, k):
        if self.contains(k):
            return True
        for _ in range(self.max_kicks):
            i = self._h1(k)
            if self.t1[i] is None:
                self.t1[i] = k; return True
            k, self.t1[i] = self.t1[i], k        # evict occupant of t1[i]
            j = self._h2(k)
            if self.t2[j] is None:
                self.t2[j] = k; return True
            k, self.t2[j] = self.t2[j], k        # evict occupant of t2[j]
        return False                             # too many kicks -> caller should rehash/grow

ch = CuckooHash()
for x in ["a", "b", "c", "d", "e"]:
    ch.insert(x)
print(ch.contains("c"), ch.contains("z"))   # True False
```

- **Lookup:** worst-case `O(1)` — two probes, period. **Insert:** `O(1)` *amortized/expected* (occasional eviction cascades and rare full rehashes). **Load factor:** two tables cap at ~50% before failures spike; using **4 hash functions** or **bucketed** cuckoo (multiple slots per bucket) pushes practical load to ~95%.
- **Pitfall:** insert can fail (a cycle in the "cuckoo graph"); production code detects the kick threshold and rehashes with new hash seeds.

### 3.2 Cuckoo filters — a Bloom filter that supports deletion

A **cuckoo filter** is the approximate-membership cousin: instead of storing keys, it stores short **fingerprints** in a cuckoo hash table. It matches a [Bloom filter's](/docs/streaming-caching) space at low false-positive rates *and* — unlike a Bloom filter — **supports deletion** and often has better lookup locality.

> **Store a small fingerprint `f = fp(x)` in one of two buckets `i1 = h(x)` and `i2 = i1 XOR h(f)`. The XOR trick means you can compute a fingerprint's alternate bucket from the bucket it's in *without knowing the original key* — which is exactly what makes eviction (and therefore deletion) possible.** Deletion just removes the matching fingerprint from either candidate bucket.

- **Query:** check both buckets for the fingerprint → `O(1)`, false positives only (like Bloom), **no false negatives**.
- **Delete:** supported (Bloom cannot) — remove the fingerprint. ⚠️ Only delete items you actually inserted; deleting a never-inserted item can remove a *colliding* fingerprint and introduce a false negative for the real owner.
- **Space:** competitive with Bloom for target false-positive rates below ~3%, and typically *smaller* below ~1%.

### 3.3 Cuckoo vs. Bloom (membership)

| | Bloom filter | Cuckoo filter |
|---|---|---|
| False positives | ✅ tunable | ✅ tunable |
| False negatives | ❌ never | ❌ never (if used correctly) |
| **Deletion** | ❌ not supported | ✅ **supported** |
| Lookup | `k` random bit probes | 2 bucket probes (**better locality**) |
| Space at low ε | good | **often better** below ~1% |
| Counting duplicates | no | limited (bounded per bucket) |

### 3.4 AI / systems connection

- **Deletable membership in caches & indexes.** When a Bloom filter's "insert-only" limitation bites — evicting keys from an LSM-tree filter, expiring entries from a dedup set — cuckoo filters provide the same guard *with* deletion.
- **Worst-case-latency lookups.** Cuckoo hashing's guaranteed two-probe lookup matters for tail-latency-sensitive serving paths (feature lookups, routing tables) where average-case hashing isn't enough.
- **Deduplication with expiry.** Streaming dedup that must forget old items (sliding-window "have I seen this recently?") uses cuckoo filters where a plain Bloom filter would only accumulate.

---

## 4. The complete approximate-structures map

Combining both guides, the decision is driven by **the question you're asking**:

| Question | Structure | Guide |
|---|---|---|
| Is `x` present? (insert-only) | **Bloom filter** | [Streaming & Caching](/docs/streaming-caching) |
| Is `x` present? (need deletion) | **Cuckoo filter** | this guide §3 |
| How many times did `x` appear? | **Count-Min Sketch** | [Streaming & Caching](/docs/streaming-caching) |
| How many **distinct** elements? | **HyperLogLog** | this guide §1 |
| Ordered access, concurrent, simple | **Skip list** | this guide §2 |
| Which items to keep in fast memory? | **LRU / LFU** | [Streaming & Caching](/docs/streaming-caching) |
| Worst-case `O(1)` exact lookup | **Cuckoo hashing** | this guide §3 |

> 💡 **The interview/design trap** (worth memorizing): membership → Bloom/Cuckoo; frequency → Count-Min; **cardinality → HyperLogLog**. Reaching for the wrong sketch — e.g. Count-Min when the question is "how many *unique*?" — is the single most common mistake with these structures.

---

## 5. Technical-accuracy notes

Because these are randomized/approximate, be precise about their guarantees:

- **HyperLogLog error is *relative* and independent of cardinality** (`~1.04/√m`), but small counts need a bias correction, and it answers *distinct count only*.
- **Skip list bounds are *expected*, not worst-case.** State `O(log n)` **expected**; the worst case is `O(n)` but requires adversarial randomness, not adversarial input.
- **Cuckoo hashing is `O(1)` worst-case for *lookup*, expected `O(1)` for *insert*** (inserts can cascade and rarely rehash). Never claim worst-case `O(1)` insert.
- **All of these assume good, independent hash functions.** The probabilistic guarantees degrade with correlated or weak hashes.

---

## 6. Practice Problems

These are more design/reasoning exercises than pure LeetCode — appropriate for the topic.

| # | Task | Structure | What it teaches |
|---|---|---|---|
| 1 | Estimate distinct visitors from a huge log in a few KB | HyperLogLog | Cardinality vs. exact set; register-max intuition. |
| 2 | Merge per-shard unique counts without re-scanning | HyperLogLog | Mergeability = register-wise max; why HLL is distributed-friendly. |
| 3 | Implement `search`/`insert` on a skip list; measure levels | Skip list | Randomized balancing; expected-`O(log n)` intuition. |
| 4 | **Design Skiplist** (LC 1206) | Skip list | The canonical implementation problem. |
| 5 | Build a dedup set that supports *expiry* of old keys | Cuckoo filter | Why Bloom fails (no delete) and cuckoo fits. |
| 6 | Pick the right sketch for three analytics questions | All | The membership/frequency/cardinality decision (§4). |

### Worked note — why you can't delete from a Bloom filter but can from a Cuckoo filter

A Bloom filter sets `k` shared bits per element; clearing them on delete might clear a bit *another* element also set, causing a **false negative** for that element — which violates Bloom's core guarantee. A cuckoo filter instead stores a *fingerprint in a specific bucket*, and deletion removes *one matching fingerprint* rather than flipping shared bits, so other elements are unaffected. The enabling trick is the **partial-key XOR**: `i2 = i1 XOR hash(fingerprint)` lets you find a fingerprint's alternate bucket from the fingerprint alone, so eviction (and thus both insertion cascades and clean deletion) works without the original key. **Failure mode:** deleting a fingerprint you never inserted can remove a *colliding* item's fingerprint, reintroducing the very false-negative problem — so only delete keys you know were added.

---

## Related Guides

**Prerequisites:** [Streaming & Caching Data Structures](/docs/streaming-caching) · [Hash Maps & Sets](/docs/hash-maps-and-sets)  
**See also:** [Approximate Nearest Neighbor Search](/docs/ann-search) · [Heaps & Priority Queues](/docs/heaps-and-priority-queues) · [Trees & Binary Search Trees](/docs/trees-and-bst)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
