---
title: Segment Tree & Fenwick Tree
slug: /segment-tree-fenwick
sidebar_position: 8
sidebar_label: Segment Tree & Fenwick Tree
description: >-
  Range query/update structures — intuition for beginners, rigor and constants for experts.
tags:
  - segment-tree
  - fenwick
  - range-query
difficulty: advanced
reading_time: 24
prerequisites:
  - title: Trees & Binary Search Trees
    to: /docs/trees-and-bst
  - title: Recursion & The Call Stack
    to: /docs/recursion-and-call-stack
pagination_prev: advanced-dsa/tries
pagination_next: domain-specific-dsa/kd-trees-ball-trees
path_step: 23
---

# Ultimate Guide: Segment Tree & Fenwick Tree (BIT)

> A single source of truth for **range query / update** data structures — written to satisfy the beginner (who needs intuition), the expert (who needs rigor and non-obvious insight), and the systems engineer (who needs to see where these live in real pipelines, including modern AI/ML).

> 🔵 **Notation contract (read once, applies everywhere).** Two indexing worlds appear in this guide, and mixing them is the #1 source of bugs.
> - **Segment Tree** code uses **0-indexed** input arrays. The *iterative* variant stores leaves at `tree[n .. 2n)` and queries the **half-open** interval `[l, r)`. The *recursive/lazy* variant uses **inclusive** `[l, r]`.
> - **Fenwick Tree (BIT)** is **1-indexed** — index `0` is a dead sentinel and *must* stay unused, because the update stride `i += i & (-i)` never terminates from `0`.
> - Every code block restates its convention in a comment. When you port code, port the convention with it.

---

## 1. Segment Tree

### 1.1 Definition & Intuition

**Formal definition.** A **Segment Tree** is a rooted binary tree built over an array `A[0..n-1]` in which:
- each **leaf** corresponds to a single element `A[i]`,
- each **internal node** corresponds to a contiguous **segment** (subarray) `A[lo..hi]` and stores an **aggregate** `f(A[lo..hi])` of that segment,
- a node's segment is the disjoint union of its two children's segments, and `f` is **associative** so that `f(parent) = f(left_child, right_child)`.

The aggregate `f` can be any **associative** monoid operation: sum, min, max, gcd, matrix product, "assignment of a value", etc. The identity element of the monoid (0 for sum, +∞ for min) is what empty/out-of-range branches return.

> 💡 **Expert insight #1 — it's a monoid, not "a sum tree".** The Segment Tree does not care that you're summing. It requires only that `f` be **associative** with an identity. This is *why* the same skeleton answers "range min", "range gcd", "number of zeros + their positions", or "assign-then-multiply affine transforms" — you're building the [Cayley](https://en.wikipedia.org/wiki/Monoid) product tree of a monoid. Choosing the right monoid is the entire art; the tree is boilerplate.

**Intuition (analogy).**

> Think of a **corporate hierarchy**. Each employee (leaf) has a raw output number. Each manager (internal node) keeps a *running summary* of their whole team. To learn a department's total output you ask **one manager**, not every employee. When a single employee's output changes, only that person's **chain of managers up to the CEO** must update their summaries — everyone else's summary is untouched. That chain has length `log n`, which is exactly the update cost.

That analogy captures the two forces the structure balances: a **query** touches `O(log n)` "manager" nodes instead of `O(n)` employees; an **update** repairs only the `O(log n)` ancestors on one root-to-leaf path.

### 1.2 Internal Structure

There are two dominant layouts. Know both — interviewers and codebases use both.

**(a) Iterative / "bottom-up" array layout (size `2n`).**
- Requires no recursion, no `4n` padding. Leaves live at indices `n .. 2n-1`; leaf `i` holds `A[i]`. 
- Internal node `i` (for `1 ≤ i < n`) has children `2i` and `2i+1`, and `tree[i] = f(tree[2i], tree[2i+1])`.
- Index `0` is unused. The root is index `1`.
- **Invariant:** `tree[i] = f(tree[2i], tree[2i+1])` for all internal `i`.

```
Array A = [5, 8, 6, 3, 2, 7, 2, 6]   (n = 8, 0-indexed)

tree index:        1                          <- root = sum of all = 39
                 /   \
              2          3                      <- [0..3]=22 , [4..7]=17
            /   \      /   \
          4      5    6      7                  <- pairs: 13,9,9,8
         / \    / \  / \    / \
        8  9  10 11 12 13  14 15                <- leaves = A[0..7]
        5  8   6  3  2  7   2  6
```

**(b) Recursive / "top-down" layout (size `4n`).**
- Node `1` is the root covering `[0, n-1]`; node `k` splits at `mid = (lo+hi)/2` into `2k` (covers `[lo, mid]`) and `2k+1` (covers `[mid+1, hi]`).
- ⚠️ **Why `4n` and not `2n`?** When `n` is not a power of two the recursion tree is unbalanced and node indices can exceed `2n`. `4n` is the safe worst-case bound (a tighter bound is `2·2^⌈log₂ n⌉`). Allocating `2n` for the recursive layout **will** index out of bounds for some `n` — a classic silent crash.
- This layout is required for **lazy propagation** (you need explicit `[lo, hi]` ranges per node).

> 🔵 **Note.** The iterative layout is faster and leaner but awkward for range *updates* with lazy propagation. Rule of thumb: **point-update + range-query → iterative (`2n`)**; **range-update + range-query → recursive (`4n`) with lazy**.

### 1.3 Core Operations (with pseudocode + code)

#### Build

**Pseudocode (iterative, O(n)):**
```
build(A):
    for i in 0..n-1:      # copy leaves
        tree[n + i] = A[i]
    for i in n-1 down to 1:   # each parent from its two children
        tree[i] = f(tree[2i], tree[2i+1])   # WHY downward: children ready before parent
```

#### Point Update
```
update(i, value):          # set A[i] = value
    i += n                  # jump to the leaf
    tree[i] = value
    i >>= 1                 # walk up to the root
    while i >= 1:
        tree[i] = f(tree[2i], tree[2i+1])   # repair only ancestors
        i >>= 1
```

#### Range Query
```
query(l, r):               # half-open [l, r); returns f over the range
    res = IDENTITY
    l += n; r += n
    while l < r:
        if l is odd:  res = f(res, tree[l]); l += 1   # l is a right child -> take it, move off
        if r is odd:  r -= 1; res = f(res, tree[r])   # r is a right child -> its left sibling is in range
        l >>= 1; r >>= 1
    return res
```

> 💡 **Expert insight #2 — the parity dance.** The iterative query's `if l & 1` / `if r & 1` tests are not arbitrary. A node is fully inside the range iff, climbing level by level, it is a **right child at the left frontier** or a **left child at the right frontier**. Those are exactly the boundary nodes; everything strictly interior is absorbed by an ancestor. This is why the loop visits at most `2·⌈log₂ n⌉` nodes. ⚠️ For non-commutative `f` (e.g. matrix products) you must combine left-boundary pieces and right-boundary pieces in the **correct order** — accumulate `l`-side into a left result and `r`-side into a right result, then merge `f(left, right)` at the end. Naively folding both into one `res` gives wrong answers for non-commutative monoids.

**Python — iterative Segment Tree (tested ✅):**
```python
# Segment Tree — iterative, 0-indexed input, half-open [l, r) queries.
# Aggregate f = sum, IDENTITY = 0. Leaves at tree[n .. 2n).
class SegmentTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (2 * self.n)      # index 0 unused; root at 1
        for i in range(self.n):             # place leaves
            self.tree[self.n + i] = arr[i]
        for i in range(self.n - 1, 0, -1):  # build parents bottom-up (children first)
            self.tree[i] = self.tree[2*i] + self.tree[2*i + 1]

    def update(self, i, val):               # point-assign A[i] = val
        i += self.n
        self.tree[i] = val
        i >>= 1
        while i >= 1:                        # repair the O(log n) ancestor chain
            self.tree[i] = self.tree[2*i] + self.tree[2*i + 1]
            i >>= 1

    def query(self, l, r):                   # sum over half-open [l, r)
        res = 0                              # 0 is the identity for +
        l += self.n; r += self.n
        while l < r:
            if l & 1:                        # l is a right child -> include, step right
                res += self.tree[l]; l += 1
            if r & 1:                        # r is a right child -> its left sibling is in-range
                r -= 1; res += self.tree[r]
            l >>= 1; r >>= 1                 # ascend one level
        return res

# Verified: A=[5,8,6,3,2,7,2,6] -> query(0,8)=39, query(2,5)=11,
# after update(4,10) -> query(2,5)=19.
```

**C++ — competitive-programming iterative Segment Tree (tested pattern):**
```cpp
#include <bits/stdc++.h>
using namespace std;

// Iterative segment tree, 0-indexed input, half-open [l, r) query. f = sum.
struct SegTree {
    int n;
    vector<long long> t;                 // size 2n; leaves at [n, 2n)
    SegTree(const vector<long long>& a) : n(a.size()), t(2*n) {
        for (int i = 0; i < n; ++i) t[n + i] = a[i];   // leaves
        for (int i = n - 1; i >= 1; --i)               // parents bottom-up
            t[i] = t[2*i] + t[2*i + 1];
    }
    void update(int i, long long val) {  // point assign a[i] = val
        for (t[i += n] = val; i > 1; i >>= 1)
            t[i >> 1] = t[i] + t[i ^ 1]; // i ^ 1 is the sibling — order-agnostic for sum
    }
    long long query(int l, int r) {      // sum over [l, r)
        long long res = 0;
        for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
            if (l & 1) res += t[l++];
            if (r & 1) res += t[--r];
        }
        return res;
    }
};
```

> 🔵 **Note on `i ^ 1`.** In the C++ update, `t[i] + t[i^1]` sums a node and its sibling regardless of which is left/right — valid because `+` is commutative. For non-commutative `f`, replace with an explicit left/right combine.

### 1.4 Lazy Propagation

**Problem.** A naïve range update "add `v` to every element in `[l, r]`" touches `O(n)` leaves — no better than a plain array. **Lazy propagation** defers the work: a node that is *fully covered* by the update records a pending "+v" tag and returns immediately, pushing the tag down to children only when a later query/update actually needs to descend into it.

**Two invariants that make lazy correct:**
1. `t[node]` always reflects **all updates already applied at or above `node`**, *including* this node's own pending lazy (we apply the tag to `t[node]` at push time before using it).
2. `lazy[node]` holds updates that have been applied to `t[node]` but **not yet propagated** to its children.

**Pseudocode:**
```
push(node, lo, hi):                 # apply pending tag, then hand it to children
    if lazy[node] != 0:
        t[node] += (hi - lo + 1) * lazy[node]     # WHY *(len): a range-add scales by segment size
        if lo != hi:                              # not a leaf -> defer to children
            lazy[2node]   += lazy[node]
            lazy[2node+1] += lazy[node]
        lazy[node] = 0

update(l, r, v, node, lo, hi):      # add v to [l, r]
    push(node, lo, hi)
    if [lo,hi] disjoint from [l,r]: return                  # no overlap
    if [l,r] fully covers [lo,hi]:  lazy[node]+=v; push(...); return  # total cover -> tag & stop
    recurse into both children; then t[node] = f(children)  # partial -> descend, recombine
```

**Python — recursive Segment Tree with lazy range-add + range-sum (tested ✅):**
```python
# Recursive segment tree, 0-indexed, INCLUSIVE [l, r]. 4n storage.
# Supports range-add update and range-sum query via lazy propagation.
class LazySegTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.t    = [0]*(4*self.n)         # aggregate (sum) per node
        self.lazy = [0]*(4*self.n)         # pending "+=" per node
        self._build(arr, 1, 0, self.n-1)

    def _build(self, arr, node, lo, hi):
        if lo == hi:                       # leaf
            self.t[node] = arr[lo]; return
        mid = (lo+hi)//2
        self._build(arr, 2*node,   lo,    mid)
        self._build(arr, 2*node+1, mid+1, hi)
        self.t[node] = self.t[2*node] + self.t[2*node+1]

    def _push(self, node, lo, hi):
        if self.lazy[node]:
            self.t[node] += (hi-lo+1)*self.lazy[node]   # scale add by segment length
            if lo != hi:                                # propagate to children
                self.lazy[2*node]   += self.lazy[node]
                self.lazy[2*node+1] += self.lazy[node]
            self.lazy[node] = 0

    def update(self, l, r, val, node=1, lo=0, hi=None):  # add val to [l, r]
        if hi is None: hi = self.n-1
        self._push(node, lo, hi)                # settle pending before deciding
        if r < lo or hi < l:      return        # disjoint
        if l <= lo and hi <= r:                 # fully covered -> tag and stop
            self.lazy[node] += val
            self._push(node, lo, hi); return
        mid = (lo+hi)//2                         # partial -> recurse
        self.update(l, r, val, 2*node,   lo,    mid)
        self.update(l, r, val, 2*node+1, mid+1, hi)
        self.t[node] = self.t[2*node] + self.t[2*node+1]

    def query(self, l, r, node=1, lo=0, hi=None):        # sum [l, r]
        if hi is None: hi = self.n-1
        self._push(node, lo, hi)                # must push before reading
        if r < lo or hi < l:      return 0
        if l <= lo and hi <= r:   return self.t[node]
        mid = (lo+hi)//2
        return (self.query(l, r, 2*node,   lo,    mid) +
                self.query(l, r, 2*node+1, mid+1, hi))

# Verified: base=[5,8,6,3,2,7,2,6]; query(1,4)=19;
# after update(2,5,+3) -> query(1,4)=28.
```

> ⚠️ **Pitfall — you must `push` before you branch.** Reading `t[node]` or deciding to descend *before* settling the node's own lazy tag reads stale data. Every recursive entry calls `push` first. Forgetting this is the single most common lazy-propagation bug.

> 💡 **Expert insight #3 — composing lazy tags is itself a monoid.** Range-**add** tags compose by addition and commute freely. But range-**assign** (set every element to `x`) tags do **not** commute with add, and "assign then add" ≠ "add then assign". When you support multiple update types, your lazy value becomes a small **affine transform** `x ↦ a·x + b`, and composing two tags is function composition `(a₂,b₂)∘(a₁,b₁) = (a₂a₁, a₂b₁+b₂)`. Getting this composition order right is what separates a working "range affine + range sum" tree from a subtly wrong one.

### 1.5 Variants & Extensions

| Variant | What it adds | Typical complexity |
|---|---|---|
| **Lazy Segment Tree** | Range update + range query | `O(log n)` per op |
| **2D Segment Tree** | Queries over sub-rectangles of a matrix | `O(log² n)` per op, `O(n²)`–`O(4n²)` space |
| **Persistent Segment Tree** | Keeps every historical version; query any past state | `O(log n)` time & **extra space per update** |
| **Merge Sort Tree** | Each node stores its segment **sorted**; answers "count of values ≤ x in `[l,r]`" | build `O(n log n)`, query `O(log² n)` |
| **Segment Tree Beats** | Range "chmin/chmax" (clamp) + range sum | amortized `O(log² n)` |
| **Iterative segment tree** | Cache-friendly, no recursion | `O(log n)`, ~2× faster constant |
| **Dynamic / Implicit Segment Tree** | Huge coordinate range, nodes created on demand | `O(log C)` per op, memory ∝ operations |

> 💡 **Expert insight #4 — Persistent Segment Trees are "git for arrays".** Each update copies only the `O(log n)` nodes on the modified root-to-leaf path and shares the rest with the previous version (path copying / structural sharing). You get an immutable, fully versioned array where any historical query costs `O(log n)`. This powers "k-th smallest in range `[l,r]`" (the classic wavelet-free solution) and is the same structural-sharing idea behind persistent/functional data structures and copy-on-write snapshots.

### 1.6 Complexity Analysis

| Operation | Time | Justification |
|---|---|---|
| Build (iterative) | **O(n)** | Each of `2n−1` nodes is computed once with `O(1)` work. |
| Build (recursive) | **O(n)** | `T(n)=2T(n/2)+O(1)` ⇒ `O(n)` by Master theorem case 1. |
| Point update | **O(log n)** | Exactly one root-to-leaf path of height `⌈log₂ n⌉` is repaired. |
| Range query | **O(log n)** | ≤ `2⌈log₂ n⌉` boundary nodes visited (parity-dance argument, §1.3). |
| Range update (lazy) | **O(log n)** | At most `O(log n)` fully-covered nodes are tagged; partial-cover recursion has ≤ 2 "spread" nodes per level. |
| Space | **O(2n)** iterative / **O(4n)** recursive | Layout bounds from §1.2. Persistent adds `O(log n)` **per update**. |

- **Best / average / worst are identical** at `Θ(log n)` per query/update. Unlike hash tables or BSTs, a Segment Tree's height is *structurally fixed* by `n`, not by input distribution or insertion order — there is no degenerate case. The only variance is the small constant (iterative < recursive).
- **Edge cases:** empty array (`n=0`) → guard the constructor (no leaves, queries return identity); single element (`n=1`) → root *is* the only leaf; out-of-range query → clamp to `[0, n)` or return identity for the empty part; half-open `query(l, l)` → returns identity (empty range), which is correct and must not be treated as an error.

### 1.7 Applications (DSA, AI/ML, LLMs)

**Competitive programming / DSA.** Range-sum/min/max with updates, range-GCD, counting inversions, "number of distinct elements in a range" (offline with BIT/segtree), sweep-line + segment tree for rectangle area/union, kinetic problems via Segment Tree Beats.

**Databases & query engines.** Aggregate indexes and **materialized range aggregates** use segment-tree-like hierarchies so `SUM`/`MIN`/`MAX` over a filtered range is `O(log n)` instead of a full scan. Time-series databases (e.g. downsampling/roll-up hierarchies) are morally segment trees over time buckets. OLAP cube roll-ups share the "parent = aggregate of children" invariant.

**AI/ML.**
- **Weighted sampling with updates.** A segment tree over sampling weights gives `O(log n)` **sample-proportional-to-weight** *and* `O(log n)` weight updates. This is exactly the **sum-tree** behind **Prioritized Experience Replay** in deep RL (DQN/Rainbow): priorities change every training step, and you must sample proportionally to them — a Fenwick/segment sum-tree is the standard implementation.
- **Streaming feature statistics.** Sliding-window min/max/sum over feature streams for online normalization or drift detection maps directly to range queries with updates.

**LLM systems.**
- **KV-cache & sliding-window attention accounting.** Sliding-window / block-sparse attention (Longformer, Mistral's sliding window, StreamingLLM) needs fast "sum of token contributions in a moving window" and eviction bookkeeping; segment/Fenwick trees over token positions give `O(log n)` window aggregates and updates as tokens are appended/evicted.
- **Prefix sums are the backbone of attention normalization.** The softmax denominator is a running sum over scores; **online/streaming softmax** (FlashAttention's core trick) maintains a running `(max, sum)` in a segment-tree-like associative reduction — the reason it parallelizes is precisely that "combine two partial (max,sum) blocks" is an **associative monoid**, the same property that makes segment trees work. See §2.6 for the tighter prefix-sum connection.

### 1.8 Expert Takeaways & Pitfalls

- ✅ **Pick the layout by the workload:** point-update+range-query → iterative `2n`; range-update → recursive `4n` + lazy.
- ✅ **Model your operation as a monoid** (identity + associativity). If you can define `combine(left, right)` and an identity, the tree is free.
- ⚠️ **`4n`, not `2n`, for recursive trees.** Under-allocation crashes only on non-power-of-two `n`, so it passes small tests and fails in production.
- ⚠️ **`push` before you branch** in lazy trees; and for **assign-type** lazies track a "has pending assign" flag distinct from `0`, because `0` may be a legitimate assigned value.
- ⚠️ **Non-commutative `f`** (matrix product, string concat): keep left/right partial results separate and merge in order.
- 💡 **Integer overflow:** range sums over large arrays overflow 32-bit; use 64-bit (`long long`) in C++.

### 1.9 Practice Problems

| # | Problem | Source | Difficulty | Key concept |
|---|---|---|---|---|
| 1 | **Range Sum Query - Mutable** (307) | LeetCode | Medium | Point update + range sum (BIT or segtree) |
| 2 | **Range Minimum Query** | SPOJ `RMQSQ` | Easy–Med | Static range min |
| 3 | **Lazy Propagation / Range Update** | SPOJ `HORRIBLE` | Medium | Range add + range sum with lazy |
| 4 | **Falling Squares** (699) | LeetCode | Hard | Coordinate compression + lazy max |
| 5 | **K-th smallest in range** | SPOJ `MKTHNUM` (`COT`) | Hard | **Persistent** segment tree |
| 6 | **Count of Smaller Numbers After Self** (315) | LeetCode | Hard | Merge sort tree / BIT on ranks |
| 7 | **The Classic Problem (Segment Tree Beats)** | Codeforces `EDU`/`ARC` beats set | Hard+ | Range chmin + range sum |

---

## 2. Fenwick Tree (BIT)

### 2.1 Definition & Intuition

**Formal definition.** A **Fenwick Tree** (a.k.a. **Binary Indexed Tree, BIT**) is a 1-indexed array `T[1..n]` that maintains **prefix aggregates** of an underlying array `A[1..n]` for an **invertible, associative** operation (canonically addition). Each `T[i]` stores the aggregate of a specific block of `A` ending at index `i`:

$$T[i] = \sum_{k = i - \mathrm{lowbit}(i) + 1}^{i} A[k], \qquad \mathrm{lowbit}(i) = i \,\&\, (-i)$$

where `lowbit(i)` is the value of the **lowest set bit** of `i`. So `T[i]` covers exactly `lowbit(i)` elements ending at `i`.

**Intuition (analogy).**

> Imagine paying off a distance with **binary rulers**. To measure a prefix `[1..i]` you lay down rulers whose lengths are the powers of two in `i`'s binary expansion — e.g. `i = 13 = 8 + 4 + 1` is covered by a length-8 block, then a length-4 block, then a length-1 block, three pieces total. Reading a prefix sum = "walk down through those blocks," clearing the lowest set bit each step (`13 → 12 → 8 → 0`). Updating an element = "walk up through every block that contains it," adding the lowest set bit each step. Both walks have length = number of bits ≈ `log n`.

> 💡 **Expert insight #5 — a BIT is a Segment Tree with the left spine deleted.** A Fenwick tree is *not* a different idea from a segment tree; it is a segment tree in which every node that is a *left* child is merged into its parent, because prefix queries never need those nodes. That's why it uses exactly `n` cells instead of `2n`, has a tiny constant factor, but **only** natively answers *prefix* aggregates — range queries come from subtracting two prefixes, which is why BIT needs an **invertible** operation (you can do sum/xor; you *cannot* do min/max on a plain BIT).

### 2.2 Internal Structure & Bit Magic

- **1-indexed, mandatory.** `T[0]` is a dead sentinel. The stride `i += i & (-i)` from `0` gives `0 & -0 = 0`, an infinite loop / no progress — index `0` can never participate.
- **`lowbit(i) = i & (-i)`** works because in two's complement `-i = ~i + 1`, which flips all bits above the lowest set bit and clears the ones below, leaving exactly the lowest set bit. Example: `i = 12 = 1100₂`, `-i = …0100₂`, so `i & -i = 0100₂ = 4`.
- **Coverage invariant:** `T[i]` aggregates `A[i-lowbit(i)+1 .. i]`.
- **Update path** (add to `A[i]`, fix all responsible blocks): `i → i + lowbit(i) → …` until `> n`.
- **Query path** (prefix `[1..i]`): `i → i - lowbit(i) → …` until `0`.

```
Coverage of T[i] for n = 8 (bracket = range of A it sums):

i:    1     2       3     4            5     6       7     8
     [1]  [1..2]   [3]  [1..4]        [5]  [5..6]   [7]  [1..8]
lowbit:1    2       1     4            1     2       1     8

Prefix(7) = T[7] + T[6] + T[4]      # 7 -> 6 -> 4 -> 0   (blocks [7]+[5..6]+[1..4])
Update(5): T[5] -> T[6] -> T[8]     # 5 -> 6 -> 8 -> >n  (all blocks containing index 5)
```

### 2.3 Core Operations (with pseudocode + code)

**Pseudocode:**
```
lowbit(i) = i & (-i)

update(i, delta):              # A[i] += delta   (1-indexed)
    while i <= n:
        T[i] += delta
        i += lowbit(i)         # WHY up: jump to the next block that contains i

prefix(i):                     # sum A[1..i]
    s = 0
    while i > 0:
        s += T[i]
        i -= lowbit(i)         # WHY down: strip the block just counted
    return s

range_sum(l, r) = prefix(r) - prefix(l - 1)   # needs invertibility
```

**Python — Fenwick Tree (tested ✅):**
```python
# Fenwick Tree / BIT — 1-indexed. Point update (add delta) + prefix/range sum.
class BIT:
    def __init__(self, n):
        self.n = n
        self.tree = [0]*(n + 1)          # index 0 is an unused sentinel

    def update(self, i, delta):          # A[i] += delta, i in [1, n]
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)                # ascend to next covering block

    def prefix(self, i):                 # sum of A[1..i]
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)                # descend, stripping counted block
        return s

    def range_sum(self, l, r):           # inclusive [l, r]; relies on invertibility of +
        return self.prefix(r) - self.prefix(l - 1)

# Verified: vals=[5,8,6,3,2,7,2,6] -> prefix(8)=39, range_sum(3,5)=11;
# after update(5,+8) -> range_sum(3,5)=19.
```

**O(n) build** — cheaper than `n` separate updates (`O(n log n)`):
```python
# O(n) construction: seed leaves, then push each cell into its parent once.
class FastBIT:
    def __init__(self, arr):             # arr is 0-indexed; tree is 1-indexed
        self.n = len(arr)
        self.tree = [0] + arr[:]         # tree[i] starts as A[i-1]
        for i in range(1, self.n + 1):
            j = i + (i & (-i))           # i's parent in the update forest
            if j <= self.n:
                self.tree[j] += self.tree[i]   # accumulate child block into parent
    def prefix(self, i):
        s = 0
        while i > 0:
            s += self.tree[i]; i -= i & (-i)
        return s
# Verified: prefix(8)=39, prefix(4)=22 for vals above.
```

**C++ — Fenwick Tree (competitive standard):**
```cpp
#include <bits/stdc++.h>
using namespace std;

struct BIT {                             // 1-indexed
    int n; vector<long long> t;
    BIT(int n) : n(n), t(n + 1, 0) {}
    void update(int i, long long delta){ // A[i] += delta
        for (; i <= n; i += i & (-i)) t[i] += delta;
    }
    long long prefix(int i){             // sum A[1..i]
        long long s = 0;
        for (; i > 0; i -= i & (-i)) s += t[i];
        return s;
    }
    long long range_sum(int l, int r){ return prefix(r) - prefix(l - 1); }
};
```

> ⚠️ **Pitfall — off-by-one from indexing.** BIT is 1-indexed but your data is usually 0-indexed. Adopt one rule ("always `+1` at the boundary between app code and BIT") and never deviate. `range_sum(l, r) = prefix(r) - prefix(l-1)` requires `l ≥ 1`; `prefix(0) = 0` is the base case that makes `l = 1` work.

### 2.4 Variants & Extensions

| Variant | Capability | Complexity |
|---|---|---|
| **Point update + range query** | Canonical BIT (above) | `O(log n)` |
| **Range update + point query** | Store a *difference array* in the BIT; `update(l,+v), update(r+1,-v)`; `point(i)=prefix(i)` | `O(log n)` |
| **Range update + range query** | **Two BITs** (`B1`, `B2`) combine to give true range-add + range-sum | `O(log n)` |
| **2D BIT** | Prefix sums over sub-rectangles of a grid | `O(log² n)` per op, `O(nm)` space |
| **BIT on values (rank/count)** | Order statistics, counting inversions, "k-th smallest" via binary lifting | `O(log n)` |
| **BIT binary search (`find_kth`)** | Descend the tree by bit to locate smallest prefix ≥ target | `O(log n)` (vs `O(log² n)` naïve) |

**Python — Range-update + Range-query via two BITs (tested ✅):**
```python
# Range add + range sum with two Fenwick trees. Identity:
#   prefix(i) = B1.prefix(i)*i - B2.prefix(i)
# where a range_update(l, r, v) adjusts B1 and B2 so the formula stays exact.
class RangeBIT:
    def __init__(self, n):
        self.n = n
        self.b1 = [0]*(n + 2)
        self.b2 = [0]*(n + 2)
    def _upd(self, b, i, v):
        while i <= self.n:
            b[i] += v; i += i & (-i)
    def _qry(self, b, i):
        s = 0
        while i > 0:
            s += b[i]; i -= i & (-i)
        return s
    def range_update(self, l, r, v):     # add v to A[l..r]
        self._upd(self.b1, l,   v)
        self._upd(self.b1, r+1, -v)
        self._upd(self.b2, l,   v*(l-1))
        self._upd(self.b2, r+1, -v*r)
    def prefix(self, i):                 # sum A[1..i]
        return self._qry(self.b1, i)*i - self._qry(self.b2, i)
    def range_query(self, l, r):
        return self.prefix(r) - self.prefix(l - 1)

# Verified: seed [5,8,6,3,2,7,2,6] via range_update(i,i,v);
# range_query(1,8)=39; after range_update(2,5,+4) -> range_query(3,6)=30.
```

> 💡 **Expert insight #6 — why two BITs, and the algebra behind it.** For a range-add of `v` on `[l, r]`, the contribution to `prefix(i)` is a **piecewise-linear** function of `i`: zero before `l`, `v·(i-l+1)` inside, constant `v·(r-l+1)` after. Split that into a term **linear in `i`** (tracked by `B1`) and a **constant correction** (tracked by `B2`), giving `prefix(i) = B1.prefix(i)·i − B2.prefix(i)`. This "linear part + correction part" decomposition is the same trick used in interval-scheduling accumulators and is the cleanest way to remember the formula.

### 2.5 Complexity Analysis

| Operation | Time | Justification |
|---|---|---|
| Build (naïve `n` updates) | `O(n log n)` | `n` updates × `O(log n)`. |
| Build (`FastBIT`) | **O(n)** | Each cell pushed into its parent exactly once. |
| Point update | **O(log n)** | Update path length = number of trailing-bit jumps ≤ `⌊log₂ n⌋ + 1`. |
| Prefix / range query | **O(log n)** | Query path strips one set bit per step; ≤ `popcount(i)` ≤ `log n` steps. |
| `find_kth` (BIT binary search) | **O(log n)** | One descent guided by bits. |
| Space | **O(n)** | Exactly one array of size `n+1`; **4× leaner than the recursive segment tree.** |

- **Best/average/worst identical** at `Θ(log n)` — like the segment tree, the cost is structural (bit-length of the index), independent of data. Query cost is technically `Θ(popcount(i))` per prefix but bounded by `log n`.
- **Edge cases:** `prefix(0)=0` (base case, keeps `range_sum` with `l=1` correct); single element → `T[1]=A[1]`; out-of-range `i>n` in update → guarded by the `while i<=n`; querying `i>n` should be clamped to `n` by the caller.

### 2.6 Applications (DSA, AI/ML, LLMs)

**Competitive programming / DSA.** Counting **inversions** (BIT over ranks, `O(n log n)`), dynamic order statistics / k-th smallest, "count of smaller elements to the right", coordinate-compressed frequency queries, 2D dominance counting.

**Databases & query engines.** Incrementally-maintained `COUNT`/`SUM` aggregates and histogram bucket counts; a BIT is the minimal structure for "running total with updates" that a storage engine needs for cardinality/selectivity estimation.

**AI/ML.**
- **Prioritized Experience Replay** (again): the `SumTree`/BIT stores TD-error priorities so sampling is proportional to priority with `O(log n)` sampling and updates — a BIT with `find_kth` is a common, memory-light implementation.
- **Cumulative distribution / weighted sampling:** sampling from a categorical whose weights change online (e.g. adaptive negative sampling in word2vec-style training, or nucleus/top-p bookkeeping) uses prefix sums with updates → BIT `find_kth`.
- **Gradient-boosted trees:** histogram-based split finding (LightGBM/XGBoost) computes **prefix sums of gradient/Hessian statistics** across sorted feature bins to evaluate every threshold in one pass — the prefix-sum-over-bins primitive is exactly what a Fenwick tree generalizes when bins are updated incrementally.

**LLM systems.**
- **Prefix sums are literally in the attention path.** The softmax denominator `Σ exp(sᵢ)` is a prefix/segment sum; **causal attention** is a *prefix* reduction over the sequence, and **FlashAttention / online softmax** works by maintaining a running `(running_max, running_sum)` and rescaling — an associative scan (`prefix scan`) over blocks. Fenwick/segment trees are the discrete-update cousins of the parallel prefix-scan that makes this efficient.
- **Positional bookkeeping & KV-cache eviction.** Tracking "how many live tokens lie in window `[i, j]`" as tokens are appended and evicted (sliding-window attention, paged KV-cache) is a range-count-with-updates problem — the BIT's natural habitat.
- **Speculative decoding / token accounting.** Maintaining running counts of accepted vs. proposed tokens across positions is a prefix-sum-with-updates workload.

> 💡 **Expert insight #7 — "prefix sum" and "associative scan" are the same primitive at three scales.** A `cumsum` on a static array is `O(n)` once; a **parallel prefix scan** (Blelloch) is the GPU primitive under `torch.cumsum`, FlashAttention's online softmax, and sequence-parallel training; a **Fenwick tree** is what you reach for when the underlying values keep *changing* and you still need prefix aggregates fast. Recognizing a problem as "prefix scan with updates" instantly tells you: static → `cumsum`, parallel → scan kernel, dynamic → BIT/segment tree.

### 2.7 Expert Takeaways & Pitfalls

- ✅ **Reach for a BIT first** when you need point-update + prefix/range-**sum** (or xor): it's `~10` lines, `O(n)` memory, and the fastest constant of any range structure.
- ✅ **Build in `O(n)`** with the parent-push method rather than `n` updates.
- ⚠️ **BIT needs invertibility.** `min`/`max`/`gcd` have no inverse ⇒ you *cannot* get a range-min from two prefix-mins. Use a segment tree (or a sparse table for static min).
- ⚠️ **1-indexing is not optional.** Index `0` breaks both walks; always keep a `+1` offset from 0-indexed app data.
- ⚠️ **Overflow:** use 64-bit accumulators for large sums; in `find_kth`, watch that partial sums don't overflow mid-descent.
- 💡 **`find_kth` in `O(log n)`:** descend from the highest power-of-two ≤ n, greedily taking a jump whenever the accumulated sum stays below the target — turns "k-th smallest" into a single `log n` walk instead of `log² n` binary-search-over-prefix.

### 2.8 Practice Problems

| # | Problem | Source | Difficulty | Key concept |
|---|---|---|---|---|
| 1 | **Range Sum Query - Mutable** (307) | LeetCode | Medium | Point update + range sum |
| 2 | **Count of Smaller Numbers After Self** (315) | LeetCode | Hard | BIT over ranks / inversions |
| 3 | **Inversion Count** | SPOJ `INVCNT` | Medium | Classic inversion counting |
| 4 | **Reverse Pairs** (493) | LeetCode | Hard | BIT + coordinate compression |
| 5 | **Create Sorted Array through Instructions** (1649) | LeetCode | Hard | BIT frequency + prefix counts |
| 6 | **Range update / point query** | SPOJ `UPDATEIT` | Easy–Med | Difference-array BIT |
| 7 | **Matrix sum with updates** | SPOJ `MATSUM` | Medium | **2D BIT** |

---

## 3. Head-to-Head Comparison

| Feature | **Segment Tree** | **Fenwick Tree (BIT)** |
|---|---|---|
| Build time | `O(n)` | `O(n)` (fast build) / `O(n log n)` (naïve) |
| Point update | `O(log n)` | `O(log n)` |
| Range query | `O(log n)` | `O(log n)` (via prefix subtraction) |
| Range update | `O(log n)` with **lazy** | `O(log n)` with **two-BIT trick** |
| Supported operations | **Any monoid** (sum, min, max, gcd, matrix, assign…) | **Invertible** only (sum, xor); ❌ no min/max |
| Code complexity | High (esp. lazy) | Low (~10 lines) |
| Memory | `O(2n)` iterative / `O(4n)` recursive | `O(n)` |
| Constant factor | Larger | **Smallest** of range structures |
| `k-th` / binary search on tree | Native descent, `O(log n)` | `find_kth`, `O(log n)` |
| Persistence / versioning | Natural (persistent segtree) | Awkward |
| 2D generalization | 2D segtree, `O(log² n)`, heavy | 2D BIT, `O(log² n)`, light |

> 💡 **The one-line mental model:** *A Fenwick tree is a segment tree that gave up generality (monoid → invertible group) in exchange for 4× less memory, a tiny constant, and ten lines of code.*

## 4. When to Use Which?

<decision question="Which structure fits your problem?">
<option description="Point updates + prefix/range SUM or XOR, tight memory, want minimal code → Fenwick Tree (BIT)">Fenwick Tree (BIT)</option>
<option description="Range MIN/MAX/GCD, range assign/affine updates, non-invertible or non-commutative ops, or you need persistence → Segment Tree">Segment Tree</option>
</decision>

**Decision guide:**
- Need **min / max / gcd** over a range, or any **non-invertible** aggregate? → **Segment Tree** (BIT physically cannot do it).
- Need **range update + range query** with complex tags (assign, affine, chmin/chmax)? → **Segment Tree with lazy** (or Segment Tree Beats).
- Just **point-update + range-sum**, and you care about memory / constant factor / short code? → **Fenwick Tree**.
- Need **historical versions** or **k-th in range**? → **Persistent Segment Tree**.
- **2D sum with updates**? → **2D BIT** (lighter). **2D min**? → 2D segment tree.
- Rule of thumb: *start with a BIT; upgrade to a segment tree the moment you need a non-invertible op, a complex range update, or persistence.*

## 5. Cheat Sheet (1-page summary)

**Segment Tree**
```
Layout:  iterative 2n (leaves at n..2n-1), root=1;  recursive 4n for lazy
Monoid:  needs (combine, identity); works for sum/min/max/gcd/matrix/assign
Build    O(n)     Point update  O(log n)     Range query  O(log n)
Range update O(log n) with LAZY  ->  push() BEFORE you branch
Non-commutative f: keep left/right partials separate, merge in order
Overflow: 64-bit sums.  Empty/single/out-of-range: return IDENTITY
```

**Fenwick Tree (BIT)**
```
1-indexed ONLY (index 0 = dead).   lowbit(i) = i & (-i)
T[i] covers A[i-lowbit(i)+1 .. i]
update(i,d): while i<=n:  T[i]+=d; i += i&(-i)     # walk UP
prefix(i):   while i>0 :  s+=T[i]; i -= i&(-i)     # walk DOWN
range_sum(l,r) = prefix(r) - prefix(l-1)   # requires INVERTIBLE op
Build O(n) (parent-push).  Range-add+range-sum = TWO BITs.
NO min/max (not invertible).  find_kth in O(log n) by bit-descent.
```

**Choose:** invertible + point-update + sum → **BIT**; anything else (min/max, lazy range ops, persistence, non-commutative) → **Segment Tree**.

**Complexity at a glance**

| | Build | Pt update | Range query | Range update | Memory |
|---|---|---|---|---|---|
| Segment Tree | `O(n)` | `O(log n)` | `O(log n)` | `O(log n)` (lazy) | `O(2n)`–`O(4n)` |
| Fenwick (BIT) | `O(n)` | `O(log n)` | `O(log n)` | `O(log n)` (2 BITs) | `O(n)` |

---

*All Python and C++ implementations in this guide were executed and verified against the worked example array `A = [5, 8, 6, 3, 2, 7, 2, 6]` before publication. Every complexity claim is accompanied by its justification; every algorithm carries inline comments explaining the reasoning, not just the mechanics.*

---

## Related Guides

**Prerequisites:** [Trees & Binary Search Trees](/docs/trees-and-bst) · [Recursion & The Call Stack](/docs/recursion-and-call-stack)  
**See also:** [Trees & Binary Search Trees](/docs/trees-and-bst)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
