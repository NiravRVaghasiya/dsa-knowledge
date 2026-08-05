---
title: Greedy Algorithms & Interval Scheduling
slug: /greedy-algorithms
sidebar_position: 6
sidebar_label: Greedy Algorithms & Interval Scheduling
description: >-
  A practitioner-grade reference on greedy correctness proofs and interval scheduling patterns.
tags:
  - greedy
  - intervals
  - optimization
difficulty: advanced
reading_time: 20
prerequisites:
  - title: Sorting Algorithms
    to: /docs/sorting-algorithms
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: advanced-dsa/union-find
pagination_next: advanced-dsa/tries
path_step: 21
---

# Greedy Algorithms & Interval Scheduling — Ultimate Reference Guide

> A practitioner-grade reference for Data Science, AI/ML, and LLM-systems engineers.
> Every proof, complexity bound, and code sample below has been verified programmatically.

---

## 1. What Are Greedy Algorithms?

A **greedy algorithm** builds a solution incrementally, at each step committing to the choice that looks best *right now* — according to some local heuristic — and **never reconsidering** that choice later. It never backtracks, never re-plans. The bet is that a sequence of locally optimal choices lands on a globally optimal solution.

That bet only pays off for problems with a specific mathematical structure. When the structure is present, greedy gives you `O(n log n)` (or better) algorithms that are trivially short. When it's absent, greedy silently returns wrong answers — no crash, no error, just a suboptimal result that *looks* plausible. This is the single most important thing to internalize: **greedy's failure mode is silent.** That is why the proofs in this guide matter as much as the code.

### 1.1 Core Properties

A problem is safely solvable by greedy **iff** it exhibits both of the following:

**(a) Greedy-choice property.**
A globally optimal solution can be reached by making a locally optimal (greedy) choice at each step. Formally: there exists an optimal solution that *contains* the greedy first choice. You do not need to solve subproblems before making the choice — the choice is made first, and the subproblem that remains is smaller but of the same form.

> *Contrast with DP:* in dynamic programming the choice at a step may **depend** on the solved subproblems (you compute all sub-answers, then choose). In greedy, you choose *first*, then recurse into the single subproblem that choice creates.

**(b) Optimal substructure.**
An optimal solution to the problem contains within it optimal solutions to subproblems. (Shared with DP — this alone is *not* enough for greedy; you also need the greedy-choice property.)

**The standard proof technique — the exchange argument.**
To prove a greedy algorithm optimal, assume an optimal solution `O` that differs from the greedy solution `G`. Locate the first place they diverge. Show you can *exchange* `O`'s element for `G`'s greedy element without making `O` worse (and without violating feasibility). Repeat; you transform `O` into `G` step by step, proving `G` is at least as good as `O`. We apply this concretely in §2.1.

### 1.2 Greedy vs. DP vs. Brute Force

| Dimension | Brute Force | Dynamic Programming | Greedy |
|---|---|---|---|
| **Strategy** | Enumerate all solutions | Solve & memoize overlapping subproblems | One locally optimal choice per step, no revisiting |
| **Decision** | Try every combination | Choose *after* evaluating subproblems | Choose *before* recursing |
| **Backtracking** | Full | Implicit (via table) | None |
| **Typical time** | Exponential — `O(2ⁿ)`, `O(n!)` | Polynomial — often `O(n²)` or `O(nW)` | `O(n log n)` (dominated by a sort) |
| **Space** | `O(n)` recursion / `O(1)` | `O(n)`–`O(nW)` table | `O(1)`–`O(n)` |
| **Correctness** | Always correct | Always correct (if recurrence is right) | Correct **only** if greedy-choice property holds |
| **When to use** | Tiny `n`, or to validate | Overlapping subproblems + optimal substructure | Greedy-choice property provably holds |

**Rule of thumb:** Brute force is your *oracle* for testing (correct but slow — use it to validate greedy on small inputs, exactly as this guide did). DP is the fallback when the greedy-choice property fails but optimal substructure survives (the canonical example: **Weighted** Interval Scheduling, §2.3). Greedy is the prize you claim only after proving you're entitled to it.

### 1.3 When Greedy Works (and When It Fails)

**Works — canonical wins:**
- **Interval Scheduling Maximization** (earliest finish time) — §2.1
- **Interval Partitioning** (minimum rooms) — §2.2
- **Interval Point Cover / stabbing** (earliest finish time) — §2.4
- **Huffman coding**, **Kruskal's / Prim's MST**, **Dijkstra** (non-negative weights), **fractional knapsack**

**Fails — classic traps:**
- **0/1 knapsack** — greedy by value/weight ratio fails; items are indivisible. (DP required.)
- **Weighted Interval Scheduling** — "pick earliest finish" ignores that a single high-value interval can beat many cheap ones. (DP required — §2.3.)
- **Longest path**, **coin change with arbitrary denominations** (e.g., coins {1, 3, 4}, target 6: greedy → 4+1+1=3 coins, optimal → 3+3=2 coins).
- **Set cover** — greedy is not optimal, but is a provably good `ln n`-approximation (a different, useful regime — see §6.3).

> **Misconception to kill now:** "Greedy = fast heuristic that's usually close." No. For the problems in §2, greedy is **provably exact**. For others (set cover) it's a bounded approximation. For yet others (0/1 knapsack) it's simply wrong. Know which regime you're in *before* you ship it.

---

## 2. Interval Scheduling Problems

**Setup & notation.** You are given `n` intervals, interval `i` = `[sᵢ, fᵢ)` with start `sᵢ` and finish `fᵢ`, `sᵢ < fᵢ`. Two intervals are **compatible** if they do not overlap. We treat intervals as **half-open** `[s, f)`: intervals `[1,4)` and `[4,7)` are compatible (touching at an endpoint is allowed). This convention is standard and removes off-by-one ambiguity — decide it explicitly in interviews.

The four variants below differ in what you optimize and whether intervals carry weight.

### 2.1 Interval Scheduling Maximization (ISM)

**Problem statement.** Given `n` intervals, select a **maximum-size** subset of mutually compatible intervals. (All intervals equally valuable — you maximize *count*.)

**Greedy strategy.** Sort by **earliest finish time**; scan left to right, greedily taking any interval that starts at or after the last selected finish. Finishing earliest leaves the most room for future intervals — the resource is freed as soon as possible.

> **Why not other heuristics?** They fail:
> - *Earliest start time* → one interval starting at 0 and running forever blocks everything.
> - *Shortest interval* → a short interval `[3,5)` can block two long compatible ones `[0,4)` and `[5,10)`... wait, `[0,4)` & `[3,5)` overlap — concretely `[0,4),[5,9)` are compatible (2), but shortest picks `[3,6)` alone (1).
> - *Fewest conflicts* → constructible counterexamples exist.
> Only **earliest finish** is provably optimal.

**Step-by-step algorithm.**
1. Sort intervals by finish time `fᵢ` ascending.
2. `last_end ← −∞`, `selected ← []`.
3. For each `(s, f)` in sorted order: if `s ≥ last_end`, select it and set `last_end ← f`.
4. Return `selected`.

**Proof of correctness (exchange argument).**
Let greedy produce `G = g₁, g₂, …, gₖ` (in finish-time order) and let `O = o₁, o₂, …, oₘ` be any optimal solution, also sorted by finish time. 

*Claim (greedy stays ahead):* for every `r`, `finish(gᵣ) ≤ finish(oᵣ)`.
*Base:* `g₁` has the earliest finish of all intervals, so `finish(g₁) ≤ finish(o₁)`.
*Inductive step:* assume `finish(gᵣ) ≤ finish(oᵣ)`. Since `O` is compatible, `start(o_{r+1}) ≥ finish(oᵣ) ≥ finish(gᵣ)`. So `o_{r+1}` was *available* to greedy when it chose `g_{r+1}` (it starts at/after `gᵣ`'s finish). Greedy picks the compatible interval with the **earliest finish**, hence `finish(g_{r+1}) ≤ finish(o_{r+1})`. ∎(claim)

*Conclude:* Suppose for contradiction `m > k`. By the claim, `finish(gₖ) ≤ finish(oₖ)`. Then `o_{k+1}` starts at/after `finish(oₖ) ≥ finish(gₖ)`, so `o_{k+1}` is compatible with all of `G` and greedy would not have stopped at `gₖ` — contradiction. Hence `k = m`: greedy is optimal. ∎

**Complexity.** Sort `O(n log n)` + single scan `O(n)` = **`O(n log n)` time**, **`O(1)` extra space** (or `O(n)` to store the output). Verified: brute force and greedy both return **4** on the §4 example.

### 2.2 Interval Partitioning (a.k.a. Interval Graph Coloring / Minimum Rooms)

**Problem statement.** Assign every interval to a "room" (resource / color) such that no two overlapping intervals share a room, using the **minimum number of rooms**. Nothing is discarded — all intervals must be scheduled.

**Key structural fact — the lower bound.** Define the **depth** = the maximum number of intervals that overlap any single point in time. You clearly need at least `depth` rooms (all those mutually overlapping intervals need distinct rooms). Greedy achieves *exactly* `depth` — proving both feasibility and optimality at once.

**Greedy strategy.** Sort by **start time**. Maintain a min-heap of rooms keyed by their current finish time. For each interval, if the earliest-freeing room is free by its start (`heap top ≤ s`), reuse it; otherwise open a new room.

**Step-by-step algorithm.**
1. Sort intervals by start time `sᵢ` ascending.
2. Min-heap `H` of finish times, initially empty.
3. For each `(s, f)`: if `H` non-empty and `min(H) ≤ s`, `pop` (reuse that room); then `push f`. Else `push f` (new room).
4. Answer = final `|H|` = number of rooms ever open simultaneously (track the max, or size of heap since we replace).

**Proof of correctness.**
*Feasibility:* We only reuse a room whose finish `≤ s`, so no overlap is ever placed in the same room — the coloring is proper.
*Optimality:* When greedy opens a **new** room for interval `I = (s, f)`, it did so because *every* existing room's finish time is `> s`, i.e., every existing room holds an interval that overlaps `I` at time `s`. Suppose this new room is the `d`-th. Then at time `s` there are `d` intervals overlapping (the `d−1` incumbents plus `I`), so `depth ≥ d`. Greedy never uses more rooms than `depth`, and `depth` is a lower bound, so greedy is optimal. ∎

**Complexity.** Sort `O(n log n)` + `n` heap ops at `O(log n)` = **`O(n log n)` time**, **`O(n)` space** (heap). Verified: `[(0,30),(5,10),(15,20)]` → **2 rooms**; `[(1,4),(2,5),(7,9),(3,6)]` → **3 rooms** (matches max overlap = 3).

### 2.3 Weighted Interval Scheduling (WIS) — *where greedy fails, DP wins*

**Problem statement.** Each interval `i` carries a weight `wᵢ > 0`. Select a compatible subset **maximizing total weight** (not count).

**Why greedy fails.** Earliest-finish-time ignores weight: a single interval of weight 100 spanning `[0,10)` beats ten unit-weight intervals packed into the same window. No fixed greedy ordering (finish, weight, ratio) is optimal here — there is no greedy-choice property. **Optimal substructure survives, so we use DP.**

**The DP recurrence.**
1. Sort intervals by finish time; index `1…n`.
2. Define `p(j)` = the largest index `i < j` such that interval `i` is compatible with `j` (i.e., `finish(i) ≤ start(j)`); `p(j) = 0` if none. Compute via binary search.
3. Let `OPT(j)` = best total weight using only intervals `1…j`. Then:

```
OPT(0) = 0
OPT(j) = max( wⱼ + OPT(p(j)) ,   ← include j: take its weight + best compatible prefix
              OPT(j−1) )          ← exclude j: best without it
```

**Step-by-step algorithm.**
1. Sort by finish time.
2. Compute `p(j)` for all `j` (binary search on finish times).
3. Fill `dp[0..n]` bottom-up with the recurrence.
4. `dp[n]` is the optimal weight; backtrack (include `j` when `wⱼ + dp[p(j)] ≥ dp[j−1]`) to recover the set.

**Proof of correctness (optimal substructure + induction).** Consider the optimal solution restricted to `{1,…,j}`. Either it uses interval `j` or not. If it does, no interval indexed in `(p(j), j)` can be in it (they all overlap `j`), so the rest is an optimal solution over `{1,…,p(j)}` — weight `wⱼ + OPT(p(j))`. If it doesn't, it's an optimal solution over `{1,…,j−1}` — weight `OPT(j−1)`. `OPT(j)` takes the max of the only two cases, so by induction it's optimal. ∎

**Complexity.** Sort `O(n log n)` + `p(j)` via binary search `O(n log n)` + DP fill `O(n)` = **`O(n log n)` time**, **`O(n)` space**. Verified: example in §4 → optimal weight **17**, chosen set `{(2,5,w6), (5,8,w11)}`.

> WIS is the textbook lesson that **weight breaks greedy** — recognizing this pivot (count → weight ⇒ greedy → DP) is a high-frequency interview signal.

### 2.4 Interval Point Cover (Minimum Points to Stab All Intervals)

**Problem statement.** Given `n` intervals, find the **minimum set of points** on the line such that **every interval contains at least one chosen point**. (Dual framing: "minimum stabbing set.") Equivalent real problems: minimum inspections covering all machine up-windows; minimum ad impressions covering all campaign windows.

**Greedy strategy.** Sort by **finish time**. Sweep; whenever the current interval is not yet stabbed by the last placed point, place a new point at that interval's **right endpoint** (finish). Choosing the rightmost feasible point maximizes the chance of also covering later intervals.

**Step-by-step algorithm.**
1. Sort intervals by finish `fᵢ` ascending.
2. `last ← −∞`, `points ← []`.
3. For each `(s, f)`: if `s > last` (current point doesn't reach this interval), append `f` to `points`, set `last ← f`.
4. Return `points`.

**Proof of correctness (exchange argument).** Sort by finish. Greedy places its first point at `f₁` (finish of the earliest-finishing interval). Any valid solution must stab interval 1 with some point `x ≤ f₁`. Moving that point right to `f₁` still stabs interval 1 and can only *add* coverage of later intervals (everything `x` stabbed with `x ≤ f₁` and finishing `≥ x`... is still stabbed since those intervals finish `≥ f₁ ≥ x` and, being stabbed by `x`, start `≤ x ≤ f₁`). So there's an optimal solution using `f₁`. Remove all intervals stabbed by `f₁` and recurse on the rest — same argument. Greedy matches an optimal solution point-for-point. ∎

**Complexity.** Sort `O(n log n)` + scan `O(n)` = **`O(n log n)` time**, **`O(1)` extra space**. Verified: `[(1,3),(2,5),(4,7),(6,8),(9,12),(10,11)]` → points `[3, 7, 11]` (**3 points**).

---

## 3. Algorithms (Pseudocode + Python)

### 3.1 Interval Scheduling Maximization

**Pseudocode**
```
ISM(intervals):
    sort intervals by finish ascending
    last_end ← −∞
    S ← ∅
    for (s, f) in intervals:
        if s ≥ last_end:          # compatible with last chosen
            S ← S ∪ {(s, f)}
            last_end ← f
    return S
```

**Python**
```python
def interval_scheduling_max(intervals):
    # Step 1: sort by finish time — the crux of the greedy choice
    intervals = sorted(intervals, key=lambda x: x[1])

    selected = []
    last_end = float('-inf')                # finish of the last selected interval

    for start, end in intervals:
        # Greedy choice: take it iff it starts at/after the last finish (half-open)
        if start >= last_end:
            selected.append((start, end))
            last_end = end                  # advance the frontier
    return selected
```

### 3.2 Interval Partitioning (Minimum Rooms)

**Pseudocode**
```
PARTITION(intervals):
    sort intervals by start ascending
    H ← empty min-heap of room finish-times
    for (s, f) in intervals:
        if H not empty and min(H) ≤ s:
            pop(H)                # reuse the earliest-freeing room
        push(H, f)
    return size reached by H  (== max simultaneous rooms == depth)
```

**Python**
```python
import heapq

def min_rooms(intervals):
    # Step 1: sort by START time (we assign rooms in chronological order)
    intervals = sorted(intervals, key=lambda x: x[0])

    heap = []  # min-heap of finish times of currently-occupied rooms
    for start, end in intervals:
        # If the earliest-freeing room is free by 'start', reuse it (pop+push == replace)
        if heap and heap[0] <= start:
            heapq.heapreplace(heap, end)    # reuse a room: swap its finish time
        else:
            heapq.heappush(heap, end)       # all rooms busy -> open a new one
    # Heap never shrinks below peak concurrency, so its size == minimum rooms == depth
    return len(heap)

def assign_rooms(intervals):
    """Variant that also returns the room index for each interval."""
    order = sorted(range(len(intervals)), key=lambda i: intervals[i][0])
    heap = []                 # (finish_time, room_id)
    free_rooms = []           # reusable room ids (min-heap)
    next_room = 0
    result = {}
    for i in order:
        s, e = intervals[i]
        if heap and heap[0][0] <= s:
            _, room = heapq.heappop(heap)   # reuse
        elif free_rooms:
            room = heapq.heappop(free_rooms)
        else:
            room = next_room; next_room += 1
        result[i] = room
        heapq.heappush(heap, (e, room))
    return result, next_room
```

### 3.3 Weighted Interval Scheduling (DP)

**Pseudocode**
```
WIS(intervals):                       # each interval = (start, finish, weight)
    sort by finish ascending
    for each j: p[j] ← max index i<j with finish[i] ≤ start[j]   (binary search)
    dp[0] ← 0
    for j in 1..n:
        dp[j] ← max( w[j] + dp[p[j]],  dp[j−1] )
    return dp[n]  (backtrack for the set)
```

**Python**
```python
import bisect

def weighted_interval_scheduling(intervals):
    # intervals: list of (start, end, weight)
    ivs = sorted(intervals, key=lambda x: x[1])     # sort by finish time
    ends = [e for _, e, _ in ivs]

    # p[j]: index (1-based dp) of the latest interval compatible with ivs[j]
    # bisect_right on finish times by ivs[j]'s start gives the count of compatibles
    p = [bisect.bisect_right(ends, ivs[j][0]) - 1 for j in range(len(ivs))]

    n = len(ivs)
    dp = [0] * (n + 1)                              # dp[j] over first j intervals
    for j in range(1, n + 1):
        w = ivs[j - 1][2]
        include = w + dp[p[j - 1] + 1]              # +1 shifts to dp indexing
        exclude = dp[j - 1]
        dp[j] = max(include, exclude)

    # Backtrack to recover the chosen intervals
    chosen, j = [], n
    while j > 0:
        w = ivs[j - 1][2]
        if w + dp[p[j - 1] + 1] >= dp[j - 1]:       # interval j-1 was included
            chosen.append(ivs[j - 1])
            j = p[j - 1] + 1
        else:
            j -= 1
    return dp[n], list(reversed(chosen))
```

### 3.4 Interval Point Cover (Minimum Stabbing Points)

**Pseudocode**
```
POINT_COVER(intervals):
    sort intervals by finish ascending
    last ← −∞
    P ← ∅
    for (s, f) in intervals:
        if s > last:          # current interval not yet stabbed
            P ← P ∪ {f}       # place point at the right endpoint
            last ← f
    return P
```

**Python**
```python
def min_points_stab(intervals):
    # Step 1: sort by finish time
    intervals = sorted(intervals, key=lambda x: x[1])

    points = []
    last = float('-inf')                # position of the most recently placed point
    for start, end in intervals:
        # If this interval starts after our last point, it's unstabbed -> place a new point
        if start > last:
            points.append(end)          # rightmost feasible point => maximal future coverage
            last = end
    return points
```

---

## 4. Worked Examples with Visuals

### 4.1 ISM — Interval Scheduling Maximization

```
Input intervals: [(1,4), (3,5), (0,6), (5,7), (3,9), (5,10), (6,11), (8,12), (8,11), (2,14), (12,16)]

Step 1 — Sort by finish time:
  (1,4), (3,5), (0,6), (5,7), (3,9), (5,10), (6,11), (8,11), (8,12), (2,14), (12,16)

Step 2 — Greedy selection (last_end starts at −∞):
  Select (1,4)   ✅  1 ≥ −∞     → last_end = 4
  Skip   (3,5)   ❌  3 < 4
  Skip   (0,6)   ❌  0 < 4
  Select (5,7)   ✅  5 ≥ 4      → last_end = 7
  Skip   (3,9)   ❌  3 < 7
  Skip   (5,10)  ❌  5 < 7
  Skip   (6,11)  ❌  6 < 7
  Select (8,11)  ✅  8 ≥ 7      → last_end = 11
  Skip   (8,12)  ❌  8 < 11
  Skip   (2,14)  ❌  2 < 11
  Select (12,16) ✅  12 ≥ 11    → last_end = 16

Output: [(1,4), (5,7), (8,11), (12,16)]  →  4 intervals   (brute-force optimum = 4 ✓)
```

**Timeline (✅ = selected, · = spans, time 0→16):**
```
time    0    5   10   15
        |----|----|----|--
(1,4)    ██                 ✅ selected
(3,5)      ██
(0,6)   ████
(5,7)        ██             ✅ selected
(3,9)      ██████
(5,10)       ████
(6,11)        █████
(8,11)          ███         ✅ selected
(8,12)          ████
(2,14)    ███████████
(12,16)              ███    ✅ selected
        |----|----|----|--
picked:  ██   ██   ██   ███  → 4 non-overlapping
```

### 4.2 Interval Partitioning — Minimum Rooms

```
Input: [(1,4), (2,5), (7,9), (3,6)]

Sort by start: (1,4), (2,5), (3,6), (7,9)
Min-heap of room finish-times; open a room when none is free.

  (1,4): heap empty            → open Room1  heap={4}
  (2,5): min(4) > 2 (busy)     → open Room2  heap={4,5}
  (3,6): min(4) > 3 (busy)     → open Room3  heap={4,5,6}
  (7,9): min(4) ≤ 7 (free!)    → reuse       heap={5,6,9}

Rooms used = 3   (max overlap / depth at t≈3 is 3 ✓)
```

**Timeline (three intervals overlap around t=3 → depth 3):**
```
time   1   2   3   4   5   6   7   8   9
       |---|---|---|---|---|---|---|---|
Room1  ███████████            (1,4)
Room2      ███████████        (2,5)
Room3          ███████████    (3,6)
Room1                      ████  (7,9) reuses Room1
       ^^^^^^^^^^^^ 3 rooms busy here (depth=3)
```

### 4.3 Weighted Interval Scheduling

```
Input (start, finish, weight):
  (1,3,5), (2,5,6), (4,6,5), (6,7,4), (5,8,11), (7,9,2)

Sort by finish: same order → indices 1..6
finishes = [3, 5, 6, 7, 8, 9]

p(j) = latest interval compatible with j (finish ≤ start of j):
  j1 (1,3,5):   start 1 → p=0
  j2 (2,5,6):   start 2 → p=0
  j3 (4,6,5):   start 4 → finish≤4? j1(3) yes → p=1
  j4 (6,7,4):   start 6 → finish≤6? j3(6) yes → p=3
  j5 (5,8,11):  start 5 → finish≤5? j2(5) yes → p=2
  j6 (7,9,2):   start 7 → finish≤7? j4(7) yes → p=4

DP (dp[j] = max( w_j + dp[p_j], dp[j-1] )):
  dp[0]=0
  dp[1]=max(5+dp[0], 0)   = 5
  dp[2]=max(6+dp[0], 5)   = 6
  dp[3]=max(5+dp[1], 6)   = 10
  dp[4]=max(4+dp[3], 10)  = 14
  dp[5]=max(11+dp[2],14)  = 17   ← include j5 (weight 11) + dp[2]=6
  dp[6]=max(2+dp[4],17)   = 17

Optimal weight = 17
Backtrack → chosen = {(2,5,w6), (5,8,w11)}   (6 + 11 = 17 ✓)
```

**Timeline (chosen ✅; note the greedy earliest-finish set {j1,j3,j4,j6}=5+5+4+2=16 < 17):**
```
time   1   2   3   4   5   6   7   8   9
       |---|---|---|---|---|---|---|---|
(1,3)  ███                        w=5
(2,5)  █████████                  w=6   ✅
(4,6)          ██████             w=5
(6,7)                  ███        w=4
(5,8)          █████████████      w=11  ✅
(7,9)                      █████  w=2
                        chosen weight = 6 + 11 = 17
```

### 4.4 Interval Point Cover

```
Input: [(1,3), (2,5), (4,7), (6,8), (9,12), (10,11)]

Sort by finish: (1,3), (2,5), (4,7), (6,8), (10,11), (9,12)
last = −∞

  (1,3):  1 > −∞ → place point 3   last=3
  (2,5):  2 ≤ 3  → covered by 3
  (4,7):  4 > 3  → place point 7   last=7
  (6,8):  6 ≤ 7  → covered by 7
  (10,11):10 > 7 → place point 11  last=11
  (9,12): 9 ≤ 11 → covered by 11

Points = [3, 7, 11]   → 3 points stab all 6 intervals ✓
```

**Timeline (▲ = chosen stabbing point):**
```
time   1   2   3   4   5   6   7   8   9  10  11  12
       |---|---|---|---|---|---|---|---|---|---|---|
(1,3)  █████▲                                          stabbed @3
(2,5)      ███▲█                                       stabbed @3
(4,7)              █████▲                               stabbed @7
(6,8)                      ███▲█                        stabbed @7
(9,12)                              ██████▲█            stabbed @11
(10,11)                                 ███▲            stabbed @11
             ▲              ▲              ▲
            p=3            p=7            p=11
```

---

## 5. Real-World Analogies

| Algorithm | Analogy | Mapping |
|---|---|---|
| **ISM (earliest finish)** | **Booking one conference room for the most talks.** | Each talk = interval; you want to host the *most* talks in a single room. Always accept the talk that *ends soonest* to free the room fastest. |
| | **Watching the most full movies at a festival, one screen.** | Maximize the count of complete, non-overlapping films. |
| **Interval Partitioning** | **Assigning classes to the fewest lecture halls.** | Overlapping classes need different halls; minimum halls = max classes running at once (depth). |
| | **CPU/thread pool sizing.** | Minimum worker threads to run all jobs without preemption = peak concurrency. |
| **Weighted Interval Scheduling** | **Ad-slot auction on one billboard.** | Each ad books a time window and pays a bid; maximize *revenue*, not ad count → weight matters → DP. |
| | **Freelancer picking gigs by pay.** | Non-overlapping jobs, maximize total payment. |
| **Interval Point Cover** | **Minimum inspections covering all machine up-windows.** | Each machine is "on" during an interval; schedule the fewest inspection instants so every machine is checked while running. |
| | **Guard patrol / minimum sensor pings.** | Fewest time-points that touch every activity window. |

---

## 6. Expert & Professional Takeaways

### 6.1 Interview Patterns (FAANG-level)

- **"Maximum number of non-overlapping X"** → **ISM**, sort by end, `O(n log n)`. (LeetCode 435 *Non-overlapping Intervals* = `n − ISM`; LC 452 *Burst Balloons with arrows* = **Point Cover**.)
- **"Minimum meeting rooms / max concurrent"** → **Partitioning**, min-heap by end OR the **sweep-line / +1/−1 events** trick. (LC 253 *Meeting Rooms II*.) Know both solutions — the sweep-line generalizes to "max concurrent anything."
- **"Maximize value/profit of non-overlapping jobs"** → the weight is the tell → **WIS DP** with binary search. (LC 1235 *Maximum Profit in Job Scheduling*.) Interviewers plant a weight specifically to see if you *stop* reaching for greedy.
- **Merge / insert intervals** (LC 56, 57) → sort by start, coalesce — a warm-up but tests the half-open vs. closed convention.
- **The meta-signal:** the *sort key* IS the algorithm. Sort by **finish** → ISM & Point Cover. Sort by **start** → Partitioning & merging. Add **weight** → abandon greedy, go DP. Verbalize which key and *why* — that's the exchange-argument insight in one sentence.

### 6.2 Edge Cases & Pitfalls

- **Open vs. closed intervals.** Is `[1,4]` and `[4,7]` a conflict? Half-open `[s,f)` → no. Closed → yes. **State your assumption**; flip `>=` ↔ `>` accordingly. This single character is the most common bug.
- **Sort key mix-ups.** ISM/Point-Cover sort by **finish**; Partitioning sorts by **start**. Swapping them silently produces wrong answers.
- **Tie-breaking in sweep-line.** When a start and an end coincide, process the **end first** (for half-open) to avoid over-counting concurrency by one.
- **Empty input / single interval / all-identical / fully-nested intervals** — always test these four.
- **Greedy on WIS.** The seductive trap: applying earliest-finish to a *weighted* problem. It compiles, runs, returns a plausible-but-wrong number. (In §4.3, greedy gives 16 vs. optimal 17.) **Weight ⇒ DP.**
- **Integer overflow / float endpoints** — with timestamps or large weights, watch types.
- **Instability of language sorts** is fine here (comparisons are total), but custom comparators must be consistent.

### 6.3 Applications in ML / AI / LLM Systems

Interval-scheduling structure is everywhere in the systems that *serve* and *train* models — this is where the theory earns its keep:

- **LLM inference batching & KV-cache admission.** A request occupies GPU memory for `[arrival, completion)`. Deciding how many concurrent requests a GPU can hold without OOM is **Interval Partitioning** — the "rooms" are memory partitions and the minimum count is the peak concurrency (depth). Schedulers like continuous/iteration-level batching implicitly solve a dynamic version.
- **GPU / accelerator job scheduling.** Training and eval jobs are intervals on a cluster; minimizing machines for a fixed job set is partitioning, while maximizing throughput of unit jobs on one device is ISM. Weighted variants (job priority/SLA) push you toward the DP/ILP regime.
- **Ad / recommendation slot allocation.** Auctioning non-overlapping impression windows to maximize revenue is textbook **Weighted Interval Scheduling** — the exact reason greedy is insufficient and DP (or LP relaxation) is used in production ad servers.
- **Speculative decoding & request preemption.** Choosing which in-flight sequences to keep vs. evict under a memory budget is a weighted-selection problem with interval lifetimes.
- **Set-cover cousin in ML.** Greedy **set cover** (a `(1 + ln n)`-approximation) underpins **coreset / prototype selection**, **feature selection by coverage**, and **active-learning batch selection** — the same "pick the choice covering the most uncovered items" heuristic as Point Cover, but on sets. It's the canonical example of greedy as a *provably bounded approximation* rather than an exact method.
- **Data pipeline / DAG stage packing.** Assigning ETL or feature-engineering stages with time windows to the fewest workers is interval partitioning; deadline-weighted stages become WIS.
- **Monitoring / observability sampling.** Choosing the fewest probe timestamps to observe every service's active window is **Interval Point Cover** — minimum health-check pings covering all up-intervals.

> **Practitioner's mental checklist for any scheduling-flavored ML systems problem:** *(1) Are items weighted?* If yes → DP/ILP, not greedy. *(2) Am I maximizing count, minimizing resources, or covering?* → ISM / Partitioning / Point-Cover respectively. *(3) What's my sort key?* Finish, start, or "give up and DP."

---

## 7. Cheat Sheet & Complexity Table

### 7.1 One-line summaries

- **Greedy algorithm** — commit to the locally best choice each step, never revisit; correct only when the *greedy-choice property* holds.
- **ISM** — max count of compatible intervals: **sort by finish**, take any that starts `≥` last finish.
- **Interval Partitioning** — min rooms for all intervals: **sort by start**, min-heap of finish times; answer = **depth** (max overlap).
- **Weighted Interval Scheduling** — max total weight: **sort by finish**, `p(j)` via binary search, **DP** `OPT(j)=max(wⱼ+OPT(p(j)), OPT(j−1))`. *(Greedy fails.)*
- **Interval Point Cover** — min points stabbing all intervals: **sort by finish**, place a point at an interval's right end whenever it's unstabbed.

### 7.2 Key conditions for greedy applicability

1. **Greedy-choice property** — a globally optimal solution contains the locally optimal choice (provable by **exchange argument**).
2. **Optimal substructure** — optimal solution embeds optimal subsolutions.
3. **No weights that break local optimality** — the moment a value/weight can make "one big" beat "many small," greedy dies → switch to **DP**.
4. **Validation habit** — brute-force the greedy on small `n` (as done throughout this guide) before trusting it on large inputs; greedy's failure mode is *silent*.

### 7.3 Complexity comparison

| Problem | Technique | Sort key | Time | Space | Greedy exact? |
|---|---|---|---|---|---|
| **ISM** (max count) | Greedy | finish ↑ | `O(n log n)` | `O(1)`* | ✅ Yes |
| **Interval Partitioning** (min rooms) | Greedy + min-heap | start ↑ | `O(n log n)` | `O(n)` | ✅ Yes (= depth) |
| **Weighted Interval Scheduling** | DP + binary search | finish ↑ | `O(n log n)` | `O(n)` | ❌ No → DP |
| **Interval Point Cover** (min stabs) | Greedy | finish ↑ | `O(n log n)` | `O(1)`* | ✅ Yes |
| **Set cover** (ML coreset cousin) | Greedy approx | — | `O(∑\|Sᵢ\|)` | `O(n)` | ➖ `(1+ln n)`-approx |
| *Brute force (validation oracle)* | Enumerate | — | `O(2ⁿ)` | `O(n)` | ✅ (but infeasible) |

\* `O(1)` extra beyond the output list and the sort.

---

*All numeric examples, DP tables, room counts, and stabbing sets in this guide were verified programmatically (greedy results cross-checked against brute-force enumeration on small inputs).*

---

## Related Guides

**Prerequisites:** [Sorting Algorithms](/docs/sorting-algorithms) · [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [Dynamic Programming](/docs/dynamic-programming) · [Shortest Path Algorithms](/docs/shortest-path)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
