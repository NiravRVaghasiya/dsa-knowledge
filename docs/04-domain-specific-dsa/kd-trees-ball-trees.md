---
title: KD-Trees & Ball-Trees
slug: /kd-trees-ball-trees
sidebar_position: 1
sidebar_label: KD-Trees & Ball-Trees
description: >-
  Exact nearest-neighbor search with space-partitioning trees — rigorous and immediately practical.
tags:
  - kd-tree
  - ball-tree
  - nearest-neighbor
difficulty: advanced
reading_time: 27
prerequisites:
  - title: Trees & Binary Search Trees
    to: /docs/trees-and-bst
pagination_prev: advanced-dsa/segment-tree-fenwick
pagination_next: domain-specific-dsa/ann-search
path_step: 24
---

# KD-Trees & Ball-Trees: The Complete Reference Guide

> A single, definitive resource on **exact Nearest Neighbor (NN) search** with space-partitioning trees — technically rigorous, pedagogically clear, and immediately practical.

---

## Table of Contents

1. [The Core Problem — Why Exact NN Search Matters](#1-the-core-problem--why-exact-nn-search-matters)
2. [KD-Trees — Theory, Algorithm & Examples](#2-kd-trees--theory-algorithm--examples)
3. [Ball-Trees — Theory, Algorithm & Examples](#3-ball-trees--theory-algorithm--examples)
4. [KD-Tree vs. Ball-Tree — Full Comparison](#4-kd-tree-vs-ball-tree--full-comparison)
5. [Pseudocode Reference](#5-pseudocode-reference)
6. [Python Implementation Guide](#6-python-implementation-guide)
7. [Expert Takeaways & Professional Insights](#7-expert-takeaways--professional-insights)
8. [When to Use What — Decision Framework](#8-when-to-use-what--decision-framework)
9. [Connections to Modern AI/LLM Systems](#9-connections-to-modern-aillm-systems)
10. [Key Formulas & Complexity Cheat Sheet](#10-key-formulas--complexity-cheat-sheet)

---

## 1. The Core Problem — Why Exact NN Search Matters

### 1.1 The Nearest Neighbor problem, formally

Given a dataset of $n$ points $P = {p_1, p_2, \dots, p_n} \subset \mathbb{R}^d$ and a query point $q \in \mathbb{R}^d$, the **exact nearest neighbor** problem is to find:

$$ \text{NN}(q) = \arg\min_{p_i \in P} ; \text{dist}(q, p_i) $$

The **k-NN** generalization returns the $k$ closest points. The word **exact** is load-bearing: we must return the *true* closest point(s), with no probability of error — as opposed to **approximate NN (ANN)**, which trades a small chance of a wrong answer for large speedups (covered in §9).

> **Why it matters.** NN search is the computational primitive behind k-NN classification/regression, clustering (DBSCAN, mean-shift), density estimation, recommendation, deduplication, geospatial queries ("nearest hospital"), computer-vision retrieval, and — increasingly — **vector search in RAG pipelines**. If you can find neighbors fast, dozens of downstream algorithms get fast.

### 1.2 The naive brute-force baseline

The obvious algorithm: compute the distance from $q$ to *every* point and keep the smallest.

```text
brute_force_nn(q, P):
    best = None; best_dist = +infinity
    for p in P:                      # n iterations
        d = dist(q, p)               # O(d) work per distance
        if d < best_dist:
            best_dist = d; best = p
    return best

```

**Complexity.**

| Operation | Cost |
| --- | --- |
| Single query (1-NN) | $O(nd)$ |
| $m$ queries | $O(mnd)$ |
| Build / preprocessing | $O(1)$ (none) |
| Extra memory | $O(1)$ beyond the data |

**Limitations.**

- **Linear in $n$ per query.** With $n = 10^7$ points and $m = 10^4$ queries, that's $10^{11}$ distance evaluations — minutes to hours.
- **No reuse of structure.** Every query re-scans the whole dataset; nothing learned from previous queries or from the geometry of the data.

**The strengths people forget.** Brute force is **embarrassingly parallel**, **cache-friendly** (a contiguous matrix multiply — `X @ q` dominates), needs **no build time**, and its cost is *independent of dimensionality's curse*. On modern BLAS/GPU hardware, brute force is frequently the fastest exact method for high-dimensional data. Space-partitioning trees only win when they can **prune** — and pruning is exactly what dies in high dimensions.

### 1.3 The structured idea: prune, don't scan

Both KD-Trees and Ball-Trees precompute a hierarchical partition of space. Each node stores a **region** and a bound on how far its points can be from any query. During search we keep the best distance found so far and **prune** any subtree whose region is provably farther than the current best. Done well, most of the dataset is never touched.

- **KD-Tree** — partitions space with **axis-aligned hyperplanes** (splits alternate through the coordinate axes).
- **Ball-Tree** — partitions the data into **nested hyperspheres** ("balls"), each defined by a centroid and radius.

### 1.4 Intuitive analogies

> **KD-Tree = alternating lines on a map.** *"A KD-Tree partitions space like drawing alternating vertical and horizontal lines on a map — each line splits the remaining region in half, letting you eliminate entire zones during search."* Like a well-organized filing cabinet where drawer 1 splits by latitude, each folder inside splits by longitude, and so on.

> **Ball-Tree = nested soap bubbles.** *"A Ball-Tree wraps clusters of points in bubbles, then wraps groups of bubbles in bigger bubbles. To search, you ask 'could the answer possibly be inside this bubble?' — measured as distance to the bubble's surface — and skip whole bubbles that are too far away."*

> ⚠️ **Where both analogies oversimplify:** they feel clean in 2-D, but the intuition **breaks in high dimensions**. Axis-aligned "lines" (KD) and "bubbles" (Ball) both enclose exponentially sparse space as $d$ grows, so the "eliminate a whole zone" magic evaporates (see §7 and §10). Treat the pictures as 2-D/3-D intuition pumps, not as guarantees that scale.

---

## 2. KD-Trees — Theory, Algorithm & Examples

The **k-dimensional tree** (Bentley, 1975) is a binary tree in which every non-leaf node represents an **axis-aligned splitting hyperplane** that divides space into two half-spaces. Points to one side of the plane go in the left subtree, points to the other side in the right.

### 2.1 Construction algorithm (step-by-step)

At each node, given a set of points and a **cutting dimension** (axis):

1. **Choose the split axis.** Either cycle through axes by depth (`axis = depth mod d`) or pick the axis of **maximum spread/variance** (a smarter, data-adaptive choice — see §2.2).
2. **Choose the split value.** Take the **median** of the points along that axis. The median guarantees a balanced split (equal counts left/right).
3. **Partition** the points: those below the median go left, those above go right; the median point becomes the node (or, in leaf-oriented implementations, points accumulate in leaf buckets).
4. **Recurse** on the left and right subsets, advancing the axis, until a subset has $\le$ `leaf_size` points — then create a **leaf** that stores those points directly.

**Why the median?** Splitting at the median keeps the tree **balanced** (depth $\approx \log_2 n$), which is what makes queries logarithmic on average. Splitting at the mean or a random value risks skewed, deep trees that degrade toward $O(n)$.

### 2.2 Splitting strategies

| Strategy | How the axis is chosen | Trade-off |
| --- | --- | --- |
| **Round-robin** (`axis = depth mod d`) | Cycle axes by depth | Simple, cache-predictable; ignores data shape |
| **Max-variance / max-spread** | Axis with largest `max−min` or variance in the node | Adapts to data; tighter cells, better pruning; small extra cost per node |
| **Sliding-midpoint** (used by SciPy/`sklearn`) | Split at the midpoint of the range, but slide to avoid empty half-cells | Avoids skinny cells on clustered data; keeps cells "fat" for pruning |

> **Expert note.** `sklearn`'s `KDTree` uses a **midpoint-style split on the dimension of greatest spread** and stores points in **leaf buckets** (`leaf_size`), not one point per node. Bucketing amortizes tree overhead and improves cache behavior.

### 2.3 NN search with backtracking

The search is a **guided depth-first descent with pruning on the way back up**:

1. **Descend** from the root: at each node, go into the child whose region *contains* the query (the side of the splitting plane $q$ falls on). This reaches a leaf quickly — a good first guess.
2. **Initialize** the best distance from the leaf's points.
3. **Backtrack.** As recursion unwinds, at each node check the **other** (unexplored) side. The minimum possible distance to that side equals the **perpendicular distance from $q$ to the splitting plane**: $|q_{\text{axis}} - \text{split value}|$.- If that perpendicular distance is $\ge$ the current best distance, the whole other subtree is **pruned** — no point there can be closer.

- Otherwise, **recurse** into the other side (a closer point might hide there) and update the best.

1. Return the best point when the root's recursion completes.

**The pruning test is the heart of it:** compare the *straight-line distance to the wall* against the *best distance so far*. A near wall means "look behind it"; a far wall means "skip it entirely."

### 2.4 Worked example (2-D)

Dataset (build a KD-Tree, `leaf_size=1`, alternating axes starting with **x**):

```
P = [(2,3), (5,4), (9,6), (4,7), (8,1), (7,2)]

```

**Build:**

- **Depth 0 (split on x):** sort by x → medians around x=7 → node **(7,2)**.- Left (x<7): (2,3),(5,4),(4,7) Right (x>7): (9,6),(8,1)
- **Depth 1 (split on y):**- Left node **(5,4)**: below → (2,3); above → (4,7)
- Right node **(9,6)**: below → (8,1)

```
                 (7,2)                 ← split on X @ 7
                /      \
          (5,4)          (9,6)         ← split on Y
          /    \         /
      (2,3)  (4,7)    (8,1)

```

**Spatial partition (X-split at 7 shown as │, Y-splits as ─):**

```
 y
 8 |            (4,7)   |
 7 |        ·           |        (9,6)
 6 |                    | ────────·──────
 5 |     (5,4)          |
 4 |   ·────────────    |
 3 | (2,3)              |
 2 |          (7,2)·    |  (8,1)
 1 |                    |    ·
   +------------------------------------ x
     2   3   4   5   6   7   8   9

```

**Query **`q = (6, 3)`**, find 1-NN:**

1. Descend: at root (7,2), $q_x=6 < 7$ → go **left**. At (5,4), $q_y=3 < 4$ → go **left** → leaf **(2,3)**.
2. Best so far: dist to (2,3) $=\sqrt{(6-2)^2+(3-3)^2}=4.0$.
3. Backtrack to (5,4): dist $=\sqrt{1+1}=1.414$ → **new best = (5,4), 1.414**. Check other side (above, (4,7)): plane is $y=4$; perpendicular gap $=|3-4|=1 < 1.414$ → must check. dist to (4,7)$=\sqrt{4+16}=4.47$ → no improvement.
4. Backtrack to root (7,2): dist $=\sqrt{1+1}=1.414$ (tie — keep first). Check right side: plane is $x=7$; perpendicular gap $=|6-7|=1 < 1.414$ → must check right subtree.- At (9,6): dist $=\sqrt{9+9}=4.24$. Check (8,1): $\sqrt{4+4}=2.83$. Neither beats 1.414.
5. **Answer: (5,4)** at distance **1.414**.

Note how the perpendicular-distance test *forced* us to inspect both sides here because the query sat close to the splitting walls — a preview of why pruning weakens as walls get closer relative to neighbor distances (the high-dim problem).

### 2.5 Complexity analysis

| Phase | Average case | Worst case | Notes |
| --- | --- | --- | --- |
| **Build** | $O(n \log n)$ | $O(n \log n)$ | With median-of-medians or pre-sorting; $O(dn\log n)$ counting the $d$-cost of comparisons |
| **Query (1-NN)** | $O(\log n)$ | $O(n)$ | Worst case when little pruning happens (high $d$ or adversarial data) |
| **Space** | $O(n)$ | $O(n)$ | Tree stores each point once + $O(n)$ node overhead |

> **The critical caveat.** The clean $O(\log n)$ query holds only when $n \gg 2^d$ and pruning is effective. As $d$ grows, the expected number of nodes visited grows toward $O(n)$ — the tree degenerates into a slow, overhead-laden brute force. A common rule of thumb: KD-Trees give real speedups roughly while **$d \lesssim 20$** (and ideally $n \gg 2^d$).

### 2.6 When KD-Trees excel vs. degrade

**Excel when:**

- **Low dimensionality** ($d \lesssim 20$), especially 2–3D geospatial/graphics data.
- **Large $n$ relative to $d$** ($n \gg 2^d$) so cells stay well-populated.
- **Euclidean / axis-aligned $L_p$ metrics**, where axis-aligned planes bound distance cleanly.
- **Static datasets** — build once, query many times.

**Degrade when:**

- **High dimensionality** — pruning collapses; queries approach $O(n)$ with *worse constants* than brute force.
- **Non-Euclidean / learned metrics** — axis-aligned splits don't bound the metric well.
- **Frequent insertions/deletions** — the tree unbalances; KD-Trees have no cheap rebalancing (unlike, say, a balanced BST), so dynamic workloads force periodic rebuilds.
- **Highly clustered data with round-robin splits** — produces skinny cells and poor pruning (mitigated by max-spread/sliding-midpoint splits).

---

## 3. Ball-Trees — Theory, Algorithm & Examples

The **Ball-Tree** (Omohundro, 1989) is a binary tree in which every node owns a **hypersphere ("ball")** — a centroid $c$ and radius $r$ — that **encloses all points in its subtree**. Children are smaller balls; the root ball encloses everything. Unlike KD-Trees, the partition is **not axis-aligned** and balls may **overlap**.

### 3.1 Ball partitioning vs. hyperplane partitioning

|  | KD-Tree (hyperplane) | Ball-Tree (hypersphere) |
| --- | --- | --- |
| **Region shape** | Axis-aligned box (hyperrectangle) | Hypersphere (ball) |
| **Split geometry** | One coordinate axis at a time | Any direction (data-driven) |
| **Regions overlap?** | No (disjoint cells) | Yes (balls can overlap) |
| **Distance bound to region** | Distance to a box face | $\text{dist}(q,c) - r$ — distance to the ball's surface |
| **Metric requirement** | Works best for axis-aligned $L_p$ | Any **metric** obeying the triangle inequality |

The key insight: a ball's bound uses only **distance to a center**, so it works for **any metric that satisfies the triangle inequality** (Euclidean, Manhattan, Minkowski, Haversine/great-circle, Mahalanobis, cosine-as-distance with care, etc.). This metric flexibility is the Ball-Tree's headline advantage.

### 3.2 Construction algorithm

A widely used, simple and effective construction is the **"k-d construction" / largest-spread bisection**:

1. **Bound the points** in the current node with a ball: pick a centroid $c$ (usually the **centroid/mean** of the points) and set $r = \max_i \text{dist}(c, p_i)$ so the ball encloses all points.
2. **Pick the split direction:** find the dimension (or, in PCA variants, the principal direction) of **greatest spread**.
3. **Choose a pivot** — often the point farthest from the centroid, then the point farthest from *that* — and split points by proximity to the two anchors, **or** split at the median along the max-spread direction.
4. **Recurse** on each half, building child balls, until $\le$ `leaf_size` points remain in a leaf.

**PCA-based variant:** project onto the top principal component and split at its median — yields tighter, better-oriented balls on correlated data at the cost of an eigen-decomposition per node.

> **Why balls beat boxes in moderate dimensions.** A tight ball around a cluster hugs the data more closely than an axis-aligned box, which must stretch to the extremes on every axis. Tighter regions → tighter distance bounds → **more pruning**. This is why `sklearn` often makes Ball-Tree the better choice as $d$ climbs into the teens.

### 3.3 NN search with bounding-ball pruning

The search mirrors the KD-Tree's guided descent, but the **pruning test uses the ball bound**:

For a node with center $c$ and radius $r$, the **minimum possible distance** from query $q$ to *any* point inside the ball is:

$$ d_{\min}(q, \text{ball}) = \max\big(0,; \text{dist}(q, c) - r\big) $$

1. **Descend** into the child ball whose center is closer to $q$ (best-first is common: use a priority queue keyed by $d_{\min}$).
2. **Initialize / update** the best distance from leaf points.
3. **Prune:** if $d_{\min}(q,\text{ball}) \ge$ current best distance, **skip that ball entirely** — no point inside can be closer.
4. Otherwise recurse; when both children are explorable, visit the **closer** ball first (its bound is tighter, so it prunes the sibling faster).
5. Return the best when the queue/recursion empties.

### 3.4 Worked example (2-D) — parallel to §2.4

Same dataset for direct comparison:

```
P = [(2,3), (5,4), (9,6), (4,7), (8,1), (7,2)]

```

**Build (leaf_size≈2):**

- **Root ball:** centroid $c_0 = (5.83, 3.83)$; radius = distance to farthest point. Farthest is (4,7): $r_0 = \sqrt{(5.83-4)^2 + (3.83-7)^2} \approx 3.66$.
- **Split** by the two farthest anchors, e.g. **(2,3)** (lower-left) and **(9,6)** (upper-right):- **Left cluster** ${(2,3),(5,4),(4,7)}$ → child ball $c_L \approx (3.67, 4.67)$, $r_L \approx 2.54$.
- **Right cluster** ${(9,6),(8,1),(7,2)}$ → child ball $c_R \approx (8.0, 3.0)$, $r_R \approx 3.16$.

```
        [Root ball  c=(5.83,3.83) r≈3.66]
              /                    \
   [Ball L c=(3.67,4.67)     [Ball R c=(8.0,3.0)
    r≈2.54]                   r≈3.16]
    {(2,3),(5,4),(4,7)}       {(9,6),(8,1),(7,2)}

```

**Query **`q = (6,3)`**, find 1-NN:**

1. Root: explore. Compare children by $d_{\min}$:- Ball L: $\text{dist}(q,c_L)=\sqrt{(6-3.67)^2+(3-4.67)^2}=\sqrt{5.43+2.79}=2.87$; $d_{\min}=2.87-2.54=0.33$.

- Ball R: $\text{dist}(q,c_R)=\sqrt{(6-8)^2+(3-3)^2}=2.0$; $d_{\min}=2.0-3.16=\max(0,-1.16)=0$.

1. Visit **Ball R first** ($d_{\min}=0$, tighter). Points: (9,6)→$\sqrt{9+9}=4.24$; (8,1)→$\sqrt{4+4}=2.83$; (7,2)→$\sqrt{1+1}=1.414$. **Best = (7,2)? — wait, (5,4) is in Ball L.** Best so far = (7,2) at **1.414**.
2. Now test **Ball L**: its $d_{\min}=0.33 < 1.414$ → **cannot prune**, must explore. Points: (5,4)→$\sqrt{1+1}=1.414$ (tie); (2,3)→4.0; (4,7)→4.47.
3. **Answer: (7,2) or (5,4)** — both at distance **1.414** (a genuine tie; either is a correct exact 1-NN).

> Notice the balls **overlapped** the query's neighborhood, so both had to be checked — the same "query near the boundary" phenomenon as the KD example. When clusters are well-separated, one ball prunes and the search is far cheaper.

### 3.5 Complexity analysis

| Phase | Average case | Worst case | Notes |
| --- | --- | --- | --- |
| **Build** | $O(n \log n)$ | $O(n \log n)$ | PCA-split adds per-node eigen cost; centroid-split is cheap |
| **Query (1-NN)** | $O(\log n)$ | $O(n)$ | Better constants than KD in moderate $d$; still degrades in very high $d$ |
| **Space** | $O(n)$ | $O(n)$ | Stores centroids + radii + points; modestly more per-node metadata than KD |

> Ball-Trees **degrade more gracefully** than KD-Trees as $d$ increases (their bounds stay meaningful longer), but they are **not** immune to the curse of dimensionality — beyond roughly a few dozen dimensions, exact tree search again loses to brute force / approximate methods.

### 3.6 When Ball-Trees excel vs. degrade

**Excel when:**

- **Moderate-to-higher dimensionality** than KD-Trees can handle (roughly the teens-to-low-tens), where tight balls still prune.
- **Non-Euclidean / general metrics** — Haversine (geospatial great-circle), Manhattan, Minkowski, Mahalanobis — any triangle-inequality metric.
- **Clustered / structured data** — balls hug clusters, giving tight bounds.
- **Static datasets** queried many times.

**Degrade when:**

- **Very high dimensionality** — like KD, pruning eventually collapses.
- **Uniformly spread, low-dim data** — KD-Trees' cheaper splits and better cache behavior can win.
- **Heavy overlap between balls** — poorly separated clusters mean little pruning; construction choice (PCA vs. centroid) matters.
- **Dynamic datasets** — insertions degrade ball tightness; rebuilds needed.

---

## 4. KD-Tree vs. Ball-Tree — Full Comparison

### 4.1 Structured comparison table

| Feature | KD-Tree | Ball-Tree |
| --- | --- | --- |
| **Region geometry** | Axis-aligned hyperrectangle | Hypersphere (centroid + radius) |
| **Best for low dims** | ✅ Excellent (d < 20), fastest & simplest | ✅ Good (d < 20) |
| **Moderate dims (≈10–30)** | ⚠️ Degrading | ✅ Better — tighter bounds prune longer |
| **High-dim robustness (d ≫ 30)** | ❌ Collapses toward O(n) | ⚠️ Also collapses, but more gracefully |
| **Dataset size sensitivity** | Needs $n \gg 2^d$ for balanced, effective pruning | Similar, but tolerates clustering better |
| **Query time — best** | $O(\log n)$ | $O(\log n)$ |
| **Query time — average** | $O(\log n)$ (low $d$) | $O(\log n)$ (low–moderate $d$) |
| **Query time — worst** | $O(n)$ | $O(n)$ |
| **Build time** | $O(n \log n)$ | $O(n \log n)$ (higher constant w/ PCA split) |
| **Memory usage** | $O(n)$, low per-node overhead | $O(n)$, slightly higher (centroid + radius per node) |
| **Metric flexibility** | Euclidean / $L_p$ (axis-aligned) — limited | ✅ Any metric with triangle inequality (Haversine, Manhattan, Mahalanobis, …) |
| **Cache/locality** | ✅ Very good (simple scalar comparisons) | Slightly worse (centroid distance computations) |
| **Implementation complexity** | Lower | Higher (centroid/radius bookkeeping, split anchors) |
| **Handles clustered data** | ⚠️ Skinny cells unless smart splits | ✅ Balls hug clusters naturally |
| **Dynamic updates** | ❌ Poor (unbalances; rebuild) | ❌ Poor (rebuild) |

### 4.2 Decision rules

> **Use a KD-Tree when:**
> - Dimensionality is **low** ($d \lesssim 20$), ideally 2–3D (maps, graphics, spatial joins).
> - The metric is **Euclidean or $L_p$**.
> - You want the **simplest, most cache-efficient** structure and $n \gg 2^d$.
> - Data is roughly uniform (not pathologically clustered), or you use max-spread/sliding-midpoint splits.

> **Use a Ball-Tree when:**
> - Dimensionality is **moderate** (teens to low tens) — it prunes longer than KD.
> - You need a **non-Euclidean metric** (Haversine for geo, Manhattan, Minkowski-$p$, Mahalanobis).
> - Data is **clustered / has structure** that tight balls can exploit.

> **Use neither (go brute-force or approximate) when:**
> - $d$ is **large** (dozens to thousands — e.g., text/image **embeddings**). Use brute force on GPU for exact, or **FAISS / HNSW / Annoy / ScaNN** for approximate. See §9.

---

## 5. Pseudocode Reference

### 5.1 KD-Tree Build

```text
function KDTREE_BUILD(points, depth = 0, leaf_size = 1):
    if len(points) <= leaf_size:
        return Leaf(points)                    # bucket of points — stop recursing

    axis = choose_axis(points, depth)          # depth mod d, OR max-variance axis
    points.sort(key = lambda p: p[axis])       # sort along the split axis
    mid = len(points) // 2                      # median index → balanced tree

    return Node(
        point  = points[mid],                   # the splitting point
        axis   = axis,                          # remember which axis we cut on
        left   = KDTREE_BUILD(points[:mid],     depth + 1, leaf_size),   # below median
        right  = KDTREE_BUILD(points[mid+1:],   depth + 1, leaf_size)    # above median
    )
    # WHY median: balanced depth ~log2(n) => logarithmic queries on average.

```

### 5.2 KD-Tree NN Query (1-NN, with backtracking + pruning)

```text
function KDTREE_QUERY(node, q, best = {point: None, dist: +inf}):
    if node is Leaf:
        for p in node.points:                   # scan the small bucket
            d = dist(q, p)
            if d < best.dist: best = {p, d}
        return best

    axis = node.axis
    # 1) Decide near vs. far side based on which side of the plane q lies:
    if q[axis] < node.point[axis]:
        near, far = node.left, node.right
    else:
        near, far = node.right, node.left

    # 2) Always search the side containing q first (good first guess):
    best = KDTREE_QUERY(near, q, best)

    # 3) Also consider the splitting point itself:
    d = dist(q, node.point)
    if d < best.dist: best = {node.point, d}

    # 4) PRUNE: perpendicular distance from q to the splitting plane.
    #    If the wall is farther than our best, nothing beyond it can win.
    plane_gap = abs(q[axis] - node.point[axis])
    if plane_gap < best.dist:                    # wall is close => must look behind it
        best = KDTREE_QUERY(far, q, best)

    return best
    # For k-NN: replace `best` with a max-heap of size k; prune against the
    # k-th (largest) distance in the heap.

```

### 5.3 Ball-Tree Build

```text
function BALLTREE_BUILD(points, leaf_size = 1):
    c = centroid(points)                         # mean of the points
    r = max(dist(c, p) for p in points)          # radius encloses ALL points
    if len(points) <= leaf_size:
        return Leaf(points, center = c, radius = r)

    axis = dimension_of_greatest_spread(points)  # or top PCA component
    points.sort(key = lambda p: p[axis])
    mid = len(points) // 2

    return Node(
        center = c, radius = r,                   # bounding ball for pruning
        left   = BALLTREE_BUILD(points[:mid],  leaf_size),
        right  = BALLTREE_BUILD(points[mid:],  leaf_size)
    )
    # WHY store (c, r): enables the bound dist(q,c) - r used for pruning.

```

### 5.4 Ball-Tree NN Query (1-NN, best-first with ball pruning)

```text
function BALLTREE_QUERY(node, q, best = {point: None, dist: +inf}):
    # PRUNE: closest possible point in this ball is dist(q,c) - r.
    d_min = max(0, dist(q, node.center) - node.radius)
    if d_min >= best.dist:
        return best                              # entire ball is too far — skip

    if node is Leaf:
        for p in node.points:
            d = dist(q, p)
            if d < best.dist: best = {p, d}
        return best

    # Visit the CLOSER child first (tighter bound => prunes sibling sooner):
    if dist(q, node.left.center) < dist(q, node.right.center):
        first, second = node.left, node.right
    else:
        first, second = node.right, node.left

    best = BALLTREE_QUERY(first,  q, best)
    best = BALLTREE_QUERY(second, q, best)       # its own d_min test may prune it
    return best
    # For k-NN: maintain a size-k max-heap; prune against the k-th distance.

```

---


## 6. Python Implementation Guide

### 6.1 `sklearn.neighbors.KDTree`

```python
from sklearn.neighbors import KDTree
import numpy as np

X = np.array([[2, 3], [5, 4], [9, 6], [4, 7], [8, 1], [7, 2]], dtype=float)

# Build once; query many times. leaf_size controls the leaf-bucket size.
tree = KDTree(X, leaf_size=2, metric="euclidean")

# k=2 nearest neighbors of the query point (6, 3)
dist, ind = tree.query([[6, 3]], k=2)
print(f"Indices: {ind}")        # -> [[1 5]]  (points (5,4) and (7,2))
print(f"Distances: {dist}")     # -> [[1.4142 1.4142]]

# Radius query: all neighbors within r=3 of (6,3)
idx_within = tree.query_radius([[6, 3]], r=3.0)
print(f"Within r=3: {idx_within}")
```

### 6.2 `sklearn.neighbors.BallTree` (incl. a non-Euclidean metric)

```python
from sklearn.neighbors import BallTree
import numpy as np

X = np.array([[2, 3], [5, 4], [9, 6], [4, 7], [8, 1], [7, 2]], dtype=float)

ball = BallTree(X, leaf_size=2, metric="euclidean")
dist, ind = ball.query([[6, 3]], k=2)
print(f"BallTree -> idx {ind}, dist {dist}")

# --- Non-Euclidean: great-circle distance for geospatial lat/lon ---
# Haversine expects coordinates in RADIANS; output is in radians on the unit sphere.
cities = np.radians([[52.52, 13.40],   # Berlin
                     [48.85,  2.35],   # Paris
                     [51.51, -0.13]])  # London
geo_tree = BallTree(cities, metric="haversine")

query = np.radians([[50.11, 8.68]])    # Frankfurt
d_rad, idx = geo_tree.query(query, k=1)
EARTH_KM = 6371.0
print(f"Nearest city idx {idx[0][0]}, distance {d_rad[0][0] * EARTH_KM:.1f} km")
```

> **`sklearn` auto-selection.** `NearestNeighbors(algorithm="auto")` inspects `n`, `d`, `leaf_size`, and the metric and picks `kd_tree`, `ball_tree`, or `brute`. For high-dim or sparse input, it falls back to `brute` on purpose — trust it, but benchmark for your data.

### 6.3 Raw NumPy KD-Tree implementation sketch (runnable, verified)

```python
import numpy as np

def build_kdtree(pts, depth=0):
    if len(pts) == 0:
        return None
    k = pts.shape[1]
    axis = depth % k                       # round-robin split axis
    idx = np.argsort(pts[:, axis])         # sort along split axis
    pts = pts[idx]
    mid = len(pts) // 2                     # median => balanced tree
    return {
        "point": pts[mid],
        "axis":  axis,
        "left":  build_kdtree(pts[:mid],   depth + 1),
        "right": build_kdtree(pts[mid + 1:], depth + 1),
    }

def kdtree_nn(node, q, best=None):
    if node is None:
        return best
    d = np.linalg.norm(q - node["point"])   # Euclidean distance
    if best is None or d < best[1]:
        best = (node["point"], d)
    axis = node["axis"]
    diff = q[axis] - node["point"][axis]
    near, far = ((node["left"], node["right"]) if diff < 0
                 else (node["right"], node["left"]))
    best = kdtree_nn(near, q, best)         # search the near side first
    if abs(diff) < best[1]:                 # PRUNE: only cross the plane if it could help
        best = kdtree_nn(far, q, best)
    return best

X = np.array([[2, 3], [5, 4], [9, 6], [4, 7], [8, 1], [7, 2]], dtype=float)
tree = build_kdtree(X.copy())
point, dist = kdtree_nn(tree, np.array([6.0, 3.0]))
print(f"Nearest: {point}, distance: {dist:.4f}")   # -> [7. 2.], 1.4142
```

*(This sketch returns one exact NN; when ties exist — as here between (5,4) and (7,2) — any tied point is a correct answer. Extend to k-NN with a size-k max-heap keyed by distance.)*

### 6.4 Key hyperparameters

| Parameter | What it controls | Practical guidance |
|---|---|---|
| **`leaf_size`** | Points per leaf bucket (when to stop splitting) | `sklearn` default = 40. **Small** → deeper tree, more pruning, higher overhead. **Large** → shallower tree, more brute force per leaf, better cache use. Sweet spot is often **20–40**; tune per dataset. Also affects **memory** and **build time**. |
| **`metric`** | Distance function | KD-Tree: only metrics valid on axis-aligned partitions (Euclidean, Manhattan, Chebyshev, Minkowski-$p$). Ball-Tree: **any** metric obeying the triangle inequality (adds Haversine, Mahalanobis, etc.). |
| **`p`** (Minkowski) | The order of the $L_p$ norm | `p=2` Euclidean, `p=1` Manhattan. |
| **`k`** | Neighbors returned | Query cost grows modestly with `k`; the heap-prune bound uses the $k$-th distance. |
| **`algorithm`** (`NearestNeighbors`) | `kd_tree` / `ball_tree` / `brute` / `auto` | Let `auto` decide, then benchmark against `brute` for your $d$. |

---

## 7. Expert Takeaways & Professional Insights

1. **The curse of dimensionality has a practical threshold (~$d \approx 20$).** As $d$ grows, distances **concentrate** — the ratio of the farthest to nearest neighbor distance approaches 1, so "nearest" becomes barely distinguishable from "farthest." Pruning depends on some points being *clearly* closer than others; when that gap vanishes, both trees visit nearly every node and lose to brute force. **Rule of thumb: exact trees help while $d \lesssim 20$ and $n \gg 2^d$.**

2. **Tune `leaf_size` — it's the highest-leverage knob.** Below the leaf, search is brute force; above it, search is tree traversal. Too small wastes time on node overhead and cache misses; too large scans big buckets. Benchmark 10–50; the optimum shifts with $n$, $d$, and hardware.

3. **Build cost is amortized — only worth it for many queries.** Both trees cost $O(n\log n)$ to build. If you issue a handful of queries against a modest dataset, brute force (no build) wins outright. Trees pay off in the **build-once, query-millions** regime.

4. **Ball-Trees are your non-Euclidean workhorse.** Any metric with the triangle inequality works: Haversine (geospatial), Manhattan, Minkowski-$p$, Mahalanobis (correlation-aware). KD-Trees cannot bound arbitrary metrics because their bounds are axis-aligned.

5. **Exact vs. approximate is a deliberate trade, not a bug.** For high-$d$ embeddings, **approximate NN (ANN)** — FAISS, HNSW, Annoy, ScaNN — gives 10–1000× speedups for a small, tunable recall loss (e.g., 95–99% recall). If your application tolerates occasionally missing the true nearest neighbor, ANN is almost always the right call above a few dozen dimensions.

6. **Data distribution matters as much as dimensionality.** Highly clustered data helps Ball-Trees (tight balls) and can hurt KD-Trees with naive round-robin splits (skinny cells). Duplicate/near-duplicate points can unbalance KD-Trees; smart split strategies (max-spread, sliding-midpoint) mitigate this.

7. **Neither structure is dynamic-friendly.** Insertions and deletions unbalance both trees and degrade their bounds. For streaming/online data, either **periodically rebuild** or use structures designed for updates (e.g., cover trees, or ANN indexes with incremental insert like HNSW).

## 8. When to Use What — Decision Framework

```
                         ┌─────────────────────────────┐
                         │  Need EXACT nearest neighbor? │
                         └──────────────┬──────────────┘
                          Yes           │            No ──► Approximate NN
                                        │                    (FAISS / HNSW /
                       ┌────────────────┴───────┐            Annoy / ScaNN)
                       │  Dimensionality d ?      │
                       └───────┬──────────┬───────┘
              d ≲ 20 (low)     │          │   d ≫ 30 (high)
                  ┌────────────┘          └────────────┐
                  │                                     │
        ┌─────────┴─────────┐               Exact trees stop helping.
        │  Metric?           │               Use BRUTE FORCE (GPU/BLAS) for
        └───┬───────────┬────┘               exact, or switch to Approximate NN.
     Euclidean/Lp   Non-Euclidean
            │             │
        KD-TREE       BALL-TREE
     (simplest,     (Haversine, Manhattan,
      cache-fast)    Mahalanobis, clustered data)

   Moderate d (≈10–30) & Euclidean:  prefer BALL-TREE (prunes longer),
   but BENCHMARK against KD-Tree and brute force on your actual data.
```

**One-line heuristics:**
- **$d \le 3$, Euclidean, huge $n$** → KD-Tree (geospatial, graphics).
- **$d \approx 10$–$30$, or non-Euclidean metric** → Ball-Tree.
- **$d$ in the hundreds/thousands (embeddings)** → brute force (exact) or ANN (approximate).
- **Few queries, small data** → brute force; skip the build.
- **Streaming / frequent updates** → rebuild periodically or use HNSW.

## 9. Connections to Modern AI/LLM Systems

### 9.1 Vector search is NN search

RAG (Retrieval-Augmented Generation) retrieves context by embedding a query and finding the **nearest document embeddings** — an NN search in a high-dimensional space (typically $d = 384$ to $4096$). This is *exactly* the problem KD/Ball-Trees solve — **except** the dimensionality is far beyond where exact trees are viable.

### 9.2 Why RAG does NOT use KD/Ball-Trees

At $d = 768$ (e.g., BERT-base) or $d = 1536$ (OpenAI `text-embedding-3-small`), the curse of dimensionality has fully set in: KD/Ball-Trees prune almost nothing and are **slower than brute force**. Production vector databases therefore use:

| System / Algorithm | Type | Idea |
|---|---|---|
| **Brute force (flat)** | Exact | GPU/BLAS matrix multiply; fine up to ~$10^6$ vectors |
| **FAISS (IVF, IVF-PQ)** | Approximate | Cluster space (inverted lists) + product quantization for compression |
| **HNSW** | Approximate | Navigable small-world **graph**; state-of-the-art recall/speed; used by pgvector, Weaviate, Qdrant, Milvus, Elasticsearch |
| **Annoy** | Approximate | Forest of random-projection trees (Spotify) |
| **ScaNN** | Approximate | Anisotropic quantization (Google) |

> **The conceptual bridge.** KD/Ball-Trees teach the core idea every vector DB relies on: **partition the space and prune regions that can't contain the answer.** HNSW replaces hierarchical *partitions* with a hierarchical *graph*, and quantization replaces exact distances with cheap approximations — but the pruning intuition is the same. Understanding trees first makes ANN indexes far less mysterious.

### 9.3 Where exact trees still appear in ML

- **Classic scikit-learn workflows** — k-NN classifiers/regressors, DBSCAN, `LocalOutlierFactor`, Isomap/LLE manifold methods all use KD/Ball-Trees under the hood on **low-to-moderate-dim** features.
- **Geospatial ML** — Haversine Ball-Trees for "nearest store/sensor/event."
- **Post-embedding dimensionality reduction** — after PCA/UMAP to ~10–50 dims, trees can become viable again.

## 10. Key Formulas & Complexity Cheat Sheet

### 10.1 Complexity summary

| Method | Build | Query (avg) | Query (worst) | Space | Metric |
|---|---|---|---|---|---|
| **Brute force** | — | $O(nd)$ | $O(nd)$ | $O(1)$ extra | Any |
| **KD-Tree** | $O(n \log n)$ | $O(\log n)$† | $O(n)$ | $O(n)$ | $L_p$ / axis-aligned |
| **Ball-Tree** | $O(n \log n)$ | $O(\log n)$† | $O(n)$ | $O(n)$ | Any triangle-inequality metric |

†Average-case $O(\log n)$ holds only for **low $d$ with $n \gg 2^d$**; both degrade to $O(n)$ as $d$ grows.

### 10.2 Core formulas

- **Distance ($L_p$ / Minkowski):** $\;\text{dist}_p(a,b) = \left(\sum_{i=1}^{d} |a_i - b_i|^p\right)^{1/p}$  → $p{=}2$ Euclidean, $p{=}1$ Manhattan.
- **KD-Tree pruning bound** (perpendicular distance to split plane on axis $j$): $\;\text{gap} = |q_j - \text{split}_j|$. Prune the far side iff $\text{gap} \ge d_{\text{best}}$.
- **Ball-Tree pruning bound** (min distance to a ball with center $c$, radius $r$): $\;d_{\min}(q,\text{ball}) = \max\!\big(0,\ \text{dist}(q,c) - r\big)$. Prune iff $d_{\min} \ge d_{\text{best}}$.
- **Haversine (great-circle) distance:** $\;d = 2R\,\arcsin\!\sqrt{\sin^2\!\tfrac{\Delta\phi}{2} + \cos\phi_1\cos\phi_2\sin^2\!\tfrac{\Delta\lambda}{2}}$.
- **Balanced tree depth:** $\;\approx \log_2 n$ (why the median split matters).

### 10.3 Edge-case reasoning (thinking it through before you ship)

> **What breaks at high dimensions ($d > 20$)?** Distance concentration: nearest and farthest distances converge, so the pruning bounds ($\text{gap}$ for KD, $d_{\min}$ for Ball) rarely exceed $d_{\text{best}}$. Almost no subtree is pruned; both trees visit $\approx O(n)$ nodes **plus** traversal overhead — strictly worse than a clean brute-force scan. **Mitigation:** reduce dimensionality (PCA/UMAP) before building, or switch to brute force / ANN.

> **How do duplicate points affect tree balance?** Many identical values along the split axis defeat the median split — points can't be cleanly divided, producing lopsided or degenerate subtrees (deeper than $\log n$) and inflating both build and query cost. KD-Trees are especially vulnerable. **Mitigation:** deduplicate first, add tiny jitter, or use split strategies that break ties by a secondary axis; leaf-bucketing (`leaf_size > 1`) also absorbs duplicates gracefully.

> **What happens with non-uniform (clustered/skewed) distributions?** Round-robin KD splits create **skinny, elongated cells** that straddle cluster boundaries → poor pruning. Ball-Trees fare better because balls **hug clusters**, giving tight bounds — *provided* clusters are separable (heavy ball overlap still kills pruning). **Mitigation for KD:** use **max-variance / sliding-midpoint** splits so cells stay "fat"; for Ball-Trees, prefer **PCA-based** splits on correlated data.

---

### Final word

KD-Trees and Ball-Trees are the **canonical exact-NN accelerators for low-to-moderate dimensions**, and they are the conceptual ancestors of every modern vector-search index. Master the single idea they share — *bound each region's closest possible point and prune whatever can't beat your current best* — and both the classic algorithms and the ANN systems that power RAG will feel like variations on one theme. Know the threshold where they stop helping ($d \gtrsim 20$), and you'll always reach for the right tool: KD-Tree, Ball-Tree, brute force, or approximate.

---

## Related Guides

**Prerequisites:** [Trees & Binary Search Trees](/docs/trees-and-bst)  
**See also:** [Approximate Nearest Neighbor Search](/docs/ann-search) · [Trees & Binary Search Trees](/docs/trees-and-bst)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
