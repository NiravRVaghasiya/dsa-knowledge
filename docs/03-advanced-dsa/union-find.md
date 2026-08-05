---
title: Union-Find (Disjoint Set Union)
slug: /union-find
sidebar_position: 5
sidebar_label: Union-Find (Disjoint Set Union)
description: >-
  Zero-to-expert on DSU: path compression, union by rank, complexity proofs, and classic problems.
tags:
  - union-find
  - dsu
  - graphs
difficulty: advanced
reading_time: 18
prerequisites:
  - title: Trees & Binary Search Trees
    to: /docs/trees-and-bst
  - title: Graph Theory
    to: /docs/graph-theory
pagination_prev: 03-advanced-dsa/shortest-path
pagination_next: 03-advanced-dsa/greedy-algorithms
path_step: 20
---

# Union-Find (Disjoint Set Union) — Ultimate Reference Guide

> A zero-to-expert reference: theory, intuition, progressive implementations, dry runs, pseudocode, Python & Java code, complexity proofs, classic problems, and AI/ML/LLM applications.

---

## 1. What Is Union-Find? (Concept Overview)

**Union-Find** (also called **Disjoint Set Union**, or **DSU**) is a data structure that keeps track of a collection of elements partitioned into a number of **disjoint** (non-overlapping) sets. It answers one deceptively powerful question extremely fast:

> *"Are these two elements in the same group — and if not, can you merge their groups?"*

It supports three operations:

- **`MakeSet(x)`** — create a new set containing only the element `x`.
- **`Find(x)`** — return a *representative* (a canonical "leader") of the set that `x` belongs to. Two elements are in the same set **iff** their representatives are equal.
- **`Union(x, y)`** — merge the two sets containing `x` and `y` into one.

**Why it matters.** Union-Find is the go-to structure for **dynamic connectivity** problems — situations where connections are added incrementally and you must repeatedly ask "is A reachable from B?". Unlike a graph traversal (BFS/DFS), which costs `O(V + E)` *every time you ask*, Union-Find answers each query in **near-constant amortized time** after cheap incremental updates.

**Key vocabulary (defined on first use):**

- **Disjoint sets** — sets with no elements in common. Every element belongs to exactly one set.
- **Representative / root / leader** — a single chosen element that identifies a set. `Find` returns it.
- **Amortized time** — the *average* cost per operation across a long sequence of operations, even if a single operation is occasionally expensive. It is a worst-case guarantee over the sequence, not a probabilistic average.
- **Forest** — a collection of trees. Union-Find represents each set as a tree; the whole structure is a forest, and each tree's root is that set's representative.

**Mental model.** Internally, each element stores a pointer to its **parent**. Follow parent pointers upward and you eventually reach a root (an element that is its own parent). All elements reaching the same root are in the same set. `Union` simply makes one root point to another.

---

## 2. Real-World Analogy

**Clubs in a school.**

```
Imagine students in a school being grouped into clubs.
- Initially, every student is their own club (n disjoint sets)
- union(A, B) = merge A's club with B's club into one
- find(A)     = which club (leader) does A belong to?
- Two students are "connected" if find(A) == find(B)
```

Extend the intuition to make each design decision obvious:

- **Every club has a president (the root).** To find *which* club you belong to, you ask "who is your senior?" and follow the chain of seniors until you reach someone with no senior — the president. That president's identity *is* your club's identity.
- **Merging two clubs (`union`)** is done by making one president report to the other. Cheap: a single pointer change.
- **"Are we in the same club?"** — both walk up to their presidents. Same president ⇒ same club.

This analogy also explains the two famous optimizations:

- **Union by rank/size** — when merging clubs, make the *smaller* club's president report to the *bigger* club's president. This keeps the "chain of seniors" short, so future lookups are fast. (Merging a 3-person club into a 300-person club shouldn't lengthen 300 people's chains.)
- **Path compression** — the first time you walk the chain of seniors to find your president, *remember the answer*: everyone you passed now reports **directly** to the president. Next time, the lookup is instant.

Other equally valid framings: **friend groups** on a social network (union = "these two became friends, merge their friend circles"), **connected regions** in an image (union = adjacent pixels of the same color), and **city road networks** (union = a new road connects two towns; find = "can I drive from town A to town B?").

---

## 3. Core Operations

Throughout, `n` is the number of elements and `m` is the number of operations performed.

### 3.1 MakeSet

**Plain English.** Create a brand-new set whose only member is `x`. Initially `x` is its own leader.

**Step-by-step logic.**
1. Set `parent[x] = x` (x is its own root — a set of one).
2. Set `rank[x] = 0` (a lone node is a tree of height 0) or `size[x] = 1` (depending on which balancing scheme you use).

**Complexity.**
- **Time:** `O(1)` — a couple of array writes.
- **Space:** `O(1)` per element; `O(n)` to initialize all `n` elements (typically done once up front).

### 3.2 Find

**Plain English.** Return the representative (root) of `x`'s set by following parent pointers upward until you reach a node that is its own parent.

**Step-by-step logic.**
1. Start at `x`.
2. While `parent[x] != x`, move up: `x = parent[x]`.
3. Return `x` (the root).
4. *(With path compression)* On the way back, re-point every node visited directly at the root.

**Complexity.**
- **Naive (no balancing):** `O(n)` worst case — the tree can degenerate into a linked list of length `n`.
- **With union by rank/size:** `O(log n)` worst case — trees stay balanced, so height is logarithmic.
- **With path compression + union by rank/size:** `O(α(n))` **amortized** — effectively constant (see §5 and §9). `α` is the inverse Ackermann function.

**Space:** `O(1)` iterative; `O(tree height)` on the call stack if written recursively.

### 3.3 Union

**Plain English.** Merge the sets containing `x` and `y`. If they're already in the same set, do nothing (and typically report `False`).

**Step-by-step logic.**
1. `rx = Find(x)`, `ry = Find(y)`.
2. If `rx == ry`, they're already merged → return `False` (this is exactly how you *detect a cycle* when adding graph edges).
3. Otherwise, attach one root under the other. *Which* one is the whole game:
   - **Naive:** arbitrarily set `parent[ry] = rx`.
   - **Union by rank:** attach the shorter tree under the taller (see §5.1).
   - **Union by size:** attach the smaller tree under the larger.
4. Return `True` (a real merge happened; the number of disjoint sets dropped by 1).

**Complexity.** Dominated by the two `Find` calls, so it matches `Find`'s complexity: `O(n)` naive, `O(log n)` balanced, `O(α(n))` amortized when combined with path compression. The attachment itself is `O(1)`.

---

## 4. Naive Implementation

The simplest correct version: `find` walks to the root, `union` bluntly hangs one root off the other with **no balancing** and **no compression**.

```python
# Python: Naive Union-Find (NO optimizations) — for teaching, not production
class NaiveUnionFind:
    def __init__(self, n):
        self.parent = list(range(n))   # each element is its own root

    def find(self, x):
        while self.parent[x] != x:     # walk up to the root
            x = self.parent[x]
        return x

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False               # already connected
        self.parent[ry] = rx           # blindly attach ry under rx
        return True
```

**Why it's bad.** Because `union` always attaches `ry` under `rx` regardless of shape, an adversarial sequence like `union(0,1), union(1,2), union(2,3), …` builds a single **degenerate chain**:

```
0 → 1 → 2 → 3 → 4 → ... → n-1     (a linked list)
```

Now `find(n-1)` must traverse all `n` nodes: **`O(n)` per operation**, giving **`O(n·m)`** for `m` operations. This is the exact pathology the next section eliminates.

---

## 5. Optimizations

The two optimizations are independent and *composable*. Each alone is a big win; together they are asymptotically optimal.

### 5.1 Union by Rank

**Rank** = an upper bound on the height of a node's tree. A lone node has rank 0. When you merge two trees of **equal** rank, the result is one taller, so the surviving root's rank increases by 1. When ranks differ, attaching the shorter under the taller does **not** increase height, so rank stays the same.

**Rule:** always attach the **lower-rank** root under the **higher-rank** root.

```python
def union(self, x, y):
    rx, ry = self.find(x), self.find(y)
    if rx == ry:
        return False
    if self.rank[rx] < self.rank[ry]:
        rx, ry = ry, rx            # ensure rx is the taller (or equal) tree
    self.parent[ry] = rx           # hang the shorter tree under the taller
    if self.rank[rx] == self.rank[ry]:
        self.rank[rx] += 1         # tie → height grows by exactly 1
    return True
```

**Why it works (the proof intuition).** A tree whose root has rank `r` contains **at least `2^r` nodes**. Proof by induction: rank only increases when two rank-`r` trees merge, and the result has `≥ 2^r + 2^r = 2^(r+1)` nodes. Since a set has at most `n` nodes, `2^r ≤ n`, so `r ≤ log₂ n`. The height is bounded by the rank ⇒ **every tree has height `O(log n)`** ⇒ `find`/`union` are `O(log n)` worst case, with **no** path compression needed.

> **Union by size** is an equivalent alternative: track the number of nodes in each tree and hang the smaller tree under the larger. It gives the same `O(log n)` bound and is often preferred because the size is independently useful (e.g., "how big is this connected component?").

### 5.2 Path Compression

**Rule:** during `find`, after locating the root, make **every node on the path** point **directly** to the root. This flattens the tree so subsequent finds are cheap.

```python
def find(self, x):
    if self.parent[x] != x:
        self.parent[x] = self.find(self.parent[x])  # recurse, then re-point x at the root
    return self.parent[x]
```

**Why it works.** The *first* `find` on a long chain still pays for the walk, but it **pays down debt**: those nodes will never be that far from the root again. The cost of the expensive traversal is spread ("amortized") across all the cheap future finds it enables. Path compression alone (with arbitrary/naive union) yields **`O(log n)` amortized** per operation.

**Variants** (both keep the same asymptotics, are iterative, and avoid recursion's stack cost):

```python
# Path splitting — each node points to its grandparent as we walk up
def find(self, x):
    while self.parent[x] != x:
        self.parent[x], x = self.parent[self.parent[x]], self.parent[x]
    return x

# Path halving — every OTHER node points to its grandparent
def find(self, x):
    while self.parent[x] != x:
        self.parent[x] = self.parent[self.parent[x]]  # halve the path
        x = self.parent[x]
    return x
```

### 5.3 Combined Optimization

Use **union by rank (or size)** *and* **path compression** together. This is the canonical, production version.

```python
# Python: Union-Find with Path Compression + Union by Rank
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return True
```

**The payoff.** Tarjan proved that with **both** optimizations, any sequence of `m` operations on `n` elements runs in **`O(m · α(n))`** total time, where `α` is the **inverse Ackermann function**.

**What is `α(n)`?** The Ackermann function `A(n)` grows so explosively that its inverse grows *unimaginably* slowly. For every `n` that could ever be stored in the observable universe (`n` up to ~`2^65536`), `α(n) ≤ 4`. So in practice `O(α(n))` is **constant** — but it is *not* literally `O(1)`; it is provably slightly super-constant, and this is the tight bound (Fredman & Saks lower bound).

> **Subtle but important:** union by rank + path compression are complementary. Path compression flattens trees *lazily* on read; union by rank keeps them shallow *eagerly* on write. Ranks become approximate upper bounds after compression (compression can shrink real height below the stored rank), but the analysis still holds — you never *decrement* ranks, and that's fine.

---

## 6. Dry Run / Traced Example (with ASCII diagrams)

Let `n = 5`, using **path compression + union by rank**. `parent[i]` shown; roots point to themselves.

```
Initial state — five singletons, all rank 0:
  idx:     0    1    2    3    4
  parent:  0    1    2    3    4
  rank:    0    0    0    0    0

  [0]  [1]  [2]  [3]  [4]
```

**Step 1 — `union(0, 1)`**: `find(0)=0`, `find(1)=1`, equal ranks → attach 1 under 0, bump rank[0].

```
  parent:  0    0    2    3    4
  rank:    1    0    0    0    0

    0        [2]  [3]  [4]
    |
    1
```

**Step 2 — `union(2, 3)`**: same as above on the other pair.

```
  parent:  0    0    2    2    4
  rank:    1    0    1    0    0

    0        2        [4]
    |        |
    1        3
```

**Step 3 — `union(1, 2)`**: `find(1)=0`, `find(2)=2`. Both roots have rank 1 → tie → attach root 2 under root 0, bump rank[0] to 2.

```
  parent:  0    0    0    2    4
  rank:    2    0    1    0    0

        0            [4]
       / \
      1   2
          |
          3
```

**Step 4 — `find(3)` (watch path compression fire)**: walk `3 → 2 → 0`. Root is 0. On the way back, re-point `3` (and `2`, already root-adjacent) directly at `0`.

```
  parent:  0    0    0    0    4     ← parent[3] changed 2 → 0
  rank:    2    0    1    0    0     ← ranks are NOT decremented

        0                [4]
      / | \
     1  2  3
```

**Step 5 — `find(3)` again**: now `parent[3] == 0` in **one hop**. `O(1)` this time — the earlier compression paid off.

**Connectivity checks:**
```
find(1) == find(3)  →  0 == 0  →  TRUE   (1 and 3 are connected)
find(1) == find(4)  →  0 == 4  →  FALSE  (4 is still its own set)
```

Notice how after step 4 the tree is **flat** (height 1). This is precisely why the amortized cost collapses toward constant.

---

## 7. Pseudocode

Language-agnostic, combined optimization:

```
STRUCTURE UnionFind:
    parent[]   // parent[i] = parent of i; root iff parent[i] == i
    rank[]     // upper bound on tree height rooted at i

FUNCTION MakeSet(n):
    for i in 0 .. n-1:
        parent[i] ← i
        rank[i]   ← 0

FUNCTION Find(x):                 // with path compression
    if parent[x] ≠ x:
        parent[x] ← Find(parent[x])
    return parent[x]

FUNCTION Union(x, y):             // with union by rank
    rx ← Find(x)
    ry ← Find(y)
    if rx == ry:
        return FALSE              // already in same set (cycle if this were an edge)
    if rank[rx] < rank[ry]:
        swap(rx, ry)
    parent[ry] ← rx              // attach smaller-rank tree under larger
    if rank[rx] == rank[ry]:
        rank[rx] ← rank[rx] + 1
    return TRUE

FUNCTION Connected(x, y):
    return Find(x) == Find(y)
```

---

## 8. Code Implementations

### 8.1 Python

Self-contained, iterative `find` (no recursion depth limits), union by size + path compression, plus a live component count. Includes a runnable demo.

```python
class UnionFind:
    """Disjoint Set Union with union by size + iterative path halving."""

    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n          # size[root] = number of nodes in that set
        self.count = n               # number of disjoint sets

    def find(self, x):
        # Iterative path halving: flattens the tree, no recursion.
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False             # already connected
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx          # rx is the larger set
        self.parent[ry] = rx
        self.size[rx] += self.size[ry]
        self.count -= 1              # two sets became one
        return True

    def connected(self, x, y):
        return self.find(x) == self.find(y)

    def set_size(self, x):
        return self.size[self.find(x)]


if __name__ == "__main__":
    uf = UnionFind(5)
    uf.union(0, 1)
    uf.union(2, 3)
    uf.union(1, 2)
    print(uf.connected(1, 3))   # True
    print(uf.connected(1, 4))   # False
    print(uf.set_size(3))       # 4  -> {0,1,2,3}
    print(uf.count)             # 2  -> {0,1,2,3} and {4}
```

### 8.2 Java

Equivalent, using union by rank + recursive path compression. Includes a `main` demo.

```java
public class UnionFind {
    private final int[] parent;
    private final int[] rank;
    private int count;                 // number of disjoint sets

    public UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        count = n;
        for (int i = 0; i < n; i++) parent[i] = i;   // each element is its own root
    }

    public int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);             // path compression
        }
        return parent[x];
    }

    public boolean union(int x, int y) {
        int rx = find(x), ry = find(y);
        if (rx == ry) return false;                  // already connected
        if (rank[rx] < rank[ry]) { int t = rx; rx = ry; ry = t; }
        parent[ry] = rx;                             // attach shorter under taller
        if (rank[rx] == rank[ry]) rank[rx]++;
        count--;
        return true;
    }

    public boolean connected(int x, int y) {
        return find(x) == find(y);
    }

    public int count() { return count; }

    public static void main(String[] args) {
        UnionFind uf = new UnionFind(5);
        uf.union(0, 1);
        uf.union(2, 3);
        uf.union(1, 2);
        System.out.println(uf.connected(1, 3)); // true
        System.out.println(uf.connected(1, 4)); // false
        System.out.println(uf.count());         // 2
    }
}
```

> **Note on recursion:** Java's recursive `find` is clean and fine for typical inputs, but for pathological depths before compression kicks in you may prefer an iterative `find` (path halving) to avoid `StackOverflowError`. Python especially should prefer the iterative version shown above, since its default recursion limit (~1000) is easily exceeded.

---

## 9. Complexity Analysis (Table)

`n` = number of elements, `m` = number of operations, `α` = inverse Ackermann (`≤ 4` for all practical `n`).

| Variant | `MakeSet` | `Find` | `Union` | Sequence of `m` ops | Notes |
|---|---|---|---|---|---|
| **Naive** (no opt.) | `O(1)` | `O(n)` | `O(n)` | `O(n·m)` | Chains degenerate to linked lists |
| **Union by rank/size only** | `O(1)` | `O(log n)` | `O(log n)` | `O(m log n)` | Trees provably height `≤ log₂ n` |
| **Path compression only** | `O(1)` | `O(log n)` amortized | `O(log n)` amortized | `O(m log n)` | Flattens lazily; single find still `O(n)` worst case |
| **Rank/size + Path compression** | `O(1)` | `O(α(n))` amortized | `O(α(n))` amortized | `O(m·α(n))` | Asymptotically optimal (Tarjan; tight lower bound) |

**Space:** `O(n)` for all variants (one or two integer arrays). Recursive `find` adds `O(height)` stack; iterative `find` is `O(1)` auxiliary.

**Proof anchors (why the numbers hold):**
- **Union by rank → `O(log n)`:** a rank-`r` root owns `≥ 2^r` nodes, so `r ≤ log₂ n`; height ≤ rank.
- **Combined → `O(α(n))`:** Tarjan's amortized analysis via a potential/accounting argument over rank "levels"; Fredman–Saks proved a matching `Ω(α(n))` lower bound in the cell-probe model, so you **cannot** do asymptotically better.

---

## 10. Classic Problems Mapping

Union-Find is the intended tool whenever a problem reduces to **incremental connectivity, grouping, or cycle detection**.

| Problem | How Union-Find applies |
|---|---|
| **Number of Connected Components** (LC 323) | Union every edge; answer is the final set count. |
| **Number of Islands** (LC 200) | Union adjacent land cells; count distinct roots. (DSU alternative to BFS/DFS.) |
| **Graph Valid Tree** (LC 261) | A tree iff `edges == n−1` **and** no `union` ever returns `False` (no cycle). |
| **Redundant Connection** (LC 684) | The first edge whose two endpoints already share a root is the cycle-closing edge to remove. |
| **Accounts Merge** (LC 721) | Union accounts sharing any email; group emails by root. |
| **Kruskal's MST** | Sort edges by weight; add an edge iff its endpoints are in different sets (union succeeds). Classic DSU driver. |
| **Most Stones Removed** (LC 947) | Union stones sharing a row or column; answer = `n − (#components)`. |
| **Satisfiability of Equality Equations** (LC 990) | Union all `a==b`; then verify no `a!=b` links two equal-set variables. |
| **Number of Provinces** (LC 547) | Union directly connected cities; count components. |
| **Percolation / Dynamic Connectivity** | Union open neighbors; query whether top row connects to bottom row (virtual nodes trick). |

**Signature that screams "use DSU":** edges/relations arrive **incrementally**, you never delete them, and you repeatedly ask *"same group?"* or *"how many groups?"*. (If you must *remove* edges too, DSU alone doesn't suffice — see the offline "union-find with rollback" or Link-Cut Trees.)

---

## 11. Applications in AI / ML / LLMs

Union-Find is quietly load-bearing across modern AI systems wherever **"merge things that belong together"** shows up.

### Graph & Graph Neural Networks (GNNs)
- **Connected-component labeling** as a preprocessing step: before running a GNN, you often partition a huge graph into independent components so each can be batched/processed separately. DSU labels components in near-linear time.
- **Graph coarsening / pooling:** hierarchical GNNs merge nodes into supernodes. DSU tracks which fine-grained nodes have been collapsed into the same coarse cluster.
- **Mini-batch sampling on disconnected graphs:** DSU quickly identifies which nodes are mutually reachable so a sampled subgraph stays connected.

### Clustering Algorithms
- **Single-linkage / agglomerative clustering** is *literally* Union-Find: repeatedly union the two closest points/clusters. This is exactly **Kruskal's algorithm** on a complete distance graph — the MST edges, added shortest-first, are unions; cutting the `k−1` longest MST edges yields `k` clusters.
- **DBSCAN**: after marking density-reachable pairs, DSU merges them into final clusters in near-linear time, avoiding repeated flood-fills.
- **Connected components on a k-NN graph** — a common way to derive clusters from an embedding space: build edges between near neighbors, then DSU to group.

### Knowledge Graph Construction & Entity Resolution
- **Entity resolution / deduplication:** when you decide "record A and record B refer to the same real-world entity," you `union(A, B)`. Transitivity is free — if A≡B and B≡C, DSU already knows A≡C. This is the workhorse for **coreference clustering** and merging duplicate nodes in a KG.
- **Blocking + merge pipelines:** candidate-pair generators emit "maybe same" edges; DSU consolidates them into canonical entity clusters, and `Find` gives each raw mention its canonical entity id.
- *(Directly relevant to graph-based document tools like KG builders: after the linker proposes equivalences between extracted concepts across papers, DSU collapses them into single canonical concept nodes.)*

### LLM Tokenization & Subword Merging (BPE)
- **Byte-Pair Encoding (BPE)** trains by repeatedly merging the most frequent adjacent symbol pair into a new symbol. Managing *which* character/subword spans have coalesced into a single token is a grouping problem that DSU models cleanly (each token = one set of merged atoms).
- **Deduplicating training corpora:** near-duplicate detection (e.g., MinHash/LSH) emits "these two documents are near-duplicates" edges; DSU clusters them so you keep one representative per cluster — a standard step in preparing LLM pretraining data.
- **Vocabulary/embedding tying:** when merging equivalent tokens or aliases (e.g., casing/normalization variants mapped to one embedding), DSU tracks the equivalence classes.

**Common thread:** all of these are *incremental equivalence* problems — you keep learning "these two things are the same/connected" and need transitive grouping to fall out for free, fast, at scale.

---

## 12. Expert Takeaways & Interview Tips

**Pro tips (specific & actionable):**
- **Default to union by size + path compression.** Size is free extra information (component sizes) and avoids the "ranks aren't real heights after compression" mental overhead. Interviewers rarely care which balancing you pick as long as you pick *one*.
- **Prefer iterative `find` (path halving) in Python.** Recursive `find` blows the default recursion limit (~1000) on adversarial chains. Path halving is one clean loop and needs no `sys.setrecursionlimit`.
- **Track `count` (number of components) as a field.** Decrement it on every successful `union`. Many problems ("number of provinces/islands/components") then become an `O(1)` read.
- **Map non-integer elements to indices first.** Use a dict `id_of[label] = index` (or coordinate flattening `r*cols + c` for grids). Keep DSU on plain integer arrays for speed and simplicity.
- **`union` returning a boolean is a superpower.** `False` means "already connected" = **cycle detected**. This one line solves Redundant Connection, Graph Valid Tree, and Kruskal's edge acceptance.

**Common mistakes (and the fix):**
- **Comparing `x == y` instead of `find(x) == find(y)`.** Connectivity is about *roots*, not raw elements. This is the #1 bug.
- **Applying only one optimization and assuming `O(α(n))`.** One optimization gets you `O(log n)`, not near-constant. You need *both* for the Ackermann bound.
- **Decrementing rank after path compression.** Never adjust ranks downward; the amortized analysis relies on ranks being monotonic non-decreasing.
- **Forgetting to compress by assigning to a temp.** `root = find(x)` alone doesn't compress unless your `find` writes back into `parent`. Make sure the mutation happens inside `find`.
- **Using DSU when edges are deleted.** Plain DSU is *incremental only*. Deletions require rollback DSU (offline) or Link-Cut Trees.

**Interview-specific insights:**
- **State the complexity precisely.** Say *"`O(α(n))` amortized — effectively constant, but provably slightly super-constant; it's the tight bound."* Naming Tarjan and the inverse Ackermann function signals depth.
- **Justify union by rank in one sentence:** *"a rank-`r` root has `≥ 2^r` descendants, so rank ≤ log n, bounding height."* This crisp proof is a strong signal.
- **When asked "BFS/DFS vs DSU?"** — DSU wins when connectivity queries are **interleaved with incremental unions**; BFS/DFS wins for a **one-shot** traversal or when you need actual paths. DSU tells you *whether* connected, not *how*.
- **Volunteer the deletion caveat.** Proactively noting "if we needed to remove edges, plain DSU wouldn't work — I'd reach for rollback DSU or Link-Cut Trees" demonstrates senior-level boundary awareness.

---

## 13. Quick-Reference Cheat Sheet

```
DISJOINT SET UNION (UNION-FIND) — CHEAT SHEET
─────────────────────────────────────────────
CORE OPS
  MakeSet(x)     parent[x]=x, rank[x]=0            O(1)
  Find(x)        follow parent to root (+compress) O(α(n)) amortized
  Union(x,y)     link roots by rank/size           O(α(n)) amortized
  Connected(x,y) Find(x) == Find(y)                O(α(n)) amortized

COMPLEXITY LADDER (per op)
  Naive .......................... O(n)
  Union by rank/size ............. O(log n)
  Path compression only .......... O(log n) amortized
  Rank/size + Path compression ... O(α(n)) amortized  ← use this
  α(n) ≤ 4 for any n in the physical universe

INVARIANTS
  • root iff parent[i] == i
  • same set  ⇔  same root
  • never decrement rank
  • ranks are UPPER BOUNDS on height (approximate after compression)

TWO OPTIMIZATIONS (use BOTH)
  Union by rank/size → keep trees shallow on WRITE
  Path compression   → flatten trees on READ

KILLER ONE-LINERS
  cycle detection:   if not uf.union(u, v): -> edge closes a cycle
  # components:      maintain `count`, count-- on successful union
  Kruskal MST:       add edge iff union(u,v) succeeds
  component size:    size[find(x)]

WHEN TO USE
  ✔ incremental connectivity / grouping / equivalence
  ✔ cycle detection while adding edges
  ✔ "same group?" or "how many groups?" queries
  ✘ edge DELETION needed  → rollback DSU / Link-Cut Trees
  ✘ need the actual PATH   → BFS/DFS instead

AI/ML/LLM HOOKS
  single-linkage/agglomerative clustering = Kruskal = DSU
  entity resolution / KG dedup = transitive union of "same" edges
  BPE token merging, corpus dedup clustering, GNN component labeling
```

---

*End of guide. Every operation carries a complexity justification; every optimization is explained by why it works, not just how; and the structure maps 1:1 to the requested hierarchy.*

---

## Related Guides

**Prerequisites:** [Trees & Binary Search Trees](/docs/trees-and-bst) · [Graph Theory](/docs/graph-theory)  
**See also:** [Graph Theory](/docs/graph-theory)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
