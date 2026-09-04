---
title: Difference Arrays, Coordinate Compression & Sweep Line
slug: /array-range-techniques
sidebar_position: 9
sidebar_label: Difference Arrays & Sweep Line
description: >-
  Three range-manipulation techniques that turn O(n·q) range updates and interval overlaps into O(n log n) — difference arrays, coordinate compression, and sweep line.
tags:
  - prefix-sum
  - difference-array
  - sweep-line
  - intervals
  - patterns
difficulty: intermediate
reading_time: 22
prerequisites:
  - title: Hashing Patterns
    to: /docs/hashing-patterns
  - title: Sorting Algorithms
    to: /docs/sorting-algorithms
pagination_prev: advanced-dsa/tree-algorithms
pagination_next: domain-specific-dsa/kd-trees-ball-trees
path_step: 29
---

# Difference Arrays, Coordinate Compression & Sweep Line

> Three closely related range-manipulation techniques that every strong problem-solver keeps in the same mental drawer. They share one idea — **record *changes* at boundaries, then integrate** — and together they turn a large class of "apply many range updates" and "how many intervals overlap here" problems from `O(n·q)` into `O(n + q)` or `O(n log n)`.

This guide assumes you already know **prefix sums** (see [Hashing Patterns](/docs/hashing-patterns), §2). A difference array is the *inverse* operation of a prefix sum, and that duality is the whole trick.

---

## 1. Difference Arrays

### 1.1 What is it and why does it exist?

A **difference array** `d` of an array `a[0..n-1]` stores the *differences* between consecutive elements:

```
d[0] = a[0]
d[i] = a[i] - a[i-1]   for i >= 1
```

The defining property: the **prefix sum of `d` reconstructs `a`**. `a[i] = d[0] + d[1] + ... + d[i]`. Difference and prefix-sum are inverse transforms, exactly like differentiation and integration.

**Why it exists.** Suppose you must apply many **range updates** — "add `v` to every element in `a[l..r]`" — and only read the final array once at the end. Doing each update directly is `O(r - l + 1)`, so `q` updates cost `O(n·q)` in the worst case. A difference array makes each range update **`O(1)`**:

```
range_add(l, r, v):   d[l] += v ;  d[r+1] -= v
```

Because `a[i] = Σ d[0..i]`, bumping `d[l]` by `v` raises every element from `l` onward by `v`, and the compensating `d[r+1] -= v` cancels it from `r+1` onward — leaving exactly `a[l..r]` raised by `v`. After all updates, one prefix-sum pass (`O(n)`) recovers the final array.

### 1.2 The invariant

> **Every range update is stored as two point events at its boundaries (a `+v` at the start, a `-v` just past the end). The array's true values exist only *after* you integrate (prefix-sum) those events.**

Hold that invariant and every difference-array bug becomes obvious: forget the `-v` and the update "leaks" to the end of the array; put it at `r` instead of `r+1` and you're off by one element.

### 1.3 Implementation

```python
def apply_range_updates(n, updates):
    """updates: list of (l, r, v) meaning a[l..r] += v (inclusive, 0-indexed).
    Returns the final array after all updates. O(n + q) total."""
    diff = [0] * (n + 1)          # one extra slot so r+1 == n is always valid
    for l, r, v in updates:
        diff[l] += v              # start the +v here...
        diff[r + 1] -= v          # ...and cancel it just past r
    # integrate: prefix sum turns the change-log back into real values
    a = [0] * n
    running = 0
    for i in range(n):
        running += diff[i]
        a[i] = running
    return a

# Three overlapping range-adds on a length-5 array:
#   [0,2]+=3 -> [3,3,3,0,0]
#   [1,4]+=2 -> [3,5,5,2,2]
#   [3,3]+=5 -> [3,5,5,7,2]
print(apply_range_updates(5, [(0, 2, 3), (1, 4, 2), (3, 3, 5)]))
# -> [3, 5, 5, 7, 2]
```

The classic LeetCode framing is **Corporate Flight Bookings (1109)**: given bookings `(first, last, seats)`, return per-flight seat totals. It is a difference array verbatim.

### 1.4 The 2D difference array

The idea extends to grids. To add `v` to every cell in the sub-rectangle `(r1,c1)..(r2,c2)`, place four corner events and take a **2D prefix sum** at the end:

```python
def range_add_2d(rows, cols, rects):
    """rects: (r1, c1, r2, c2, v). Add v to each cell of that rectangle. O(rows*cols + q)."""
    diff = [[0] * (cols + 1) for _ in range(rows + 1)]
    for r1, c1, r2, c2, v in rects:
        diff[r1][c1]       += v
        diff[r1][c2 + 1]   -= v
        diff[r2 + 1][c1]   -= v
        diff[r2 + 1][c2 + 1] += v   # inclusion-exclusion: the doubly-cancelled corner
    # 2D prefix sum to integrate
    grid = [[0] * cols for _ in range(rows)]
    for r in range(rows):
        run = 0
        for c in range(cols):
            run += diff[r][c]
            above = grid[r - 1][c] if r > 0 else 0
            grid[r][c] = run + above
    return grid
```

The fourth corner (`+v` at `(r2+1, c2+1)`) is inclusion–exclusion: the two `-v` corners overlap in the bottom-right quadrant and would double-subtract without it. This powers **Range Addition II**, **stamping / imagesmoothing** kernels, and **heatmap accumulation**.

### 1.5 Complexity

| Operation | Difference array | Naïve | Fenwick (range-update/point-query) |
|---|---|---|---|
| Single range update | **O(1)** | O(n) | O(log n) |
| `q` range updates + one final read | **O(n + q)** | O(n·q) | O((n + q) log n) |
| Point query *interleaved* with updates | O(n) (must re-integrate) | O(1) | **O(log n)** |

The decisive question: **are updates and reads interleaved, or is there one batch of updates then one read?** Batch-then-read → difference array (unbeatable, no log factor). Interleaved → you need a [Fenwick/segment tree](/docs/segment-tree-fenwick) instead; a difference array would force an `O(n)` re-integration on every query.

### 1.6 Common mistakes

- **Forgetting the sentinel slot.** Allocate `d` of size `n+1` so `d[r+1]` with `r = n-1` doesn't index out of bounds.
- **Off-by-one at `r`.** The cancel goes at `r+1`, not `r`. Inclusive vs. half-open ranges is the #1 bug — pick a convention and comment it.
- **Reading before integrating.** The difference array is *not* the answer; you must prefix-sum it. Reading `d` directly returns deltas, not values.
- **Using it when updates and queries interleave.** You lose the `O(1)` benefit; reach for a Fenwick tree.

### 1.7 When to use / when not to

**Use it** when you have many range updates and read the result (or a few points) *afterward*: seat/booking tallies, "mark all cells covered by these rectangles," bulk salary raises across index ranges, computing an occupancy timeline from `+1/-1` events.

**Don't use it** when queries are interleaved with updates (→ Fenwick/segment tree), when updates aren't contiguous ranges, or when you need per-update intermediate reads.

### 1.8 AI / systems connection

- **Attention masks & position bookkeeping.** Building an additive attention-bias vector where several spans each contribute a constant bias is a 1-D range-add; a difference array assembles it in `O(n + spans)` before a single cumulative pass.
- **Learning-rate / schedule accumulation.** Applying many overlapping "boost the LR by δ over steps `[a,b]`" adjustments to a schedule array is a batch range-add.
- **Histogram & density accumulation.** 2-D difference arrays accumulate bounding-box votes in object-detection heatmaps and in image integral-image preprocessing, the same primitive as a summed-area table.

---

## 2. Coordinate Compression

### 2.1 What is it and why does it exist?

**Coordinate compression** replaces a set of values with their **rank** (their index in the sorted order of distinct values), collapsing an arbitrarily large or sparse value range down to `0..m-1` where `m` is the number of distinct values.

**Why it exists.** Many array/interval structures (difference arrays, Fenwick trees, bucket counts) need memory proportional to the *value range*, not the *number of values*. If timestamps span nanoseconds over a year, or coordinates reach `10^9`, you cannot allocate an array over the raw range. But if there are only `n = 10^5` distinct values that *matter*, you only need `10^5` buckets — as long as you preserve their **relative order**, which is all these structures depend on.

### 2.2 The key idea (invariant)

> **Only the *order* of the values matters, never their magnitude.** Replacing each value by its rank preserves all `<`, `=`, `>` relationships, so any order-based query (range counts, "how many are less than x", interval overlaps) gives identical answers on compressed coordinates.

### 2.3 Implementation

```python
def compress(values):
    """Map each value to its rank in sorted-distinct order. O(n log n).
    Returns (compressed_list, sorted_distinct) so you can map back."""
    sorted_unique = sorted(set(values))
    rank = {v: i for i, v in enumerate(sorted_unique)}
    return [rank[v] for v in values], sorted_unique

vals = [100, 5, 100, 90_000_000, 5]
comp, mapping = compress(vals)
print(comp)      # [1, 0, 1, 2, 0]   ranks in 0..2
print(mapping)   # [5, 100, 90000000]  rank -> original value
```

For **query-time** lookups (map a raw value to its rank on the fly) use binary search into `sorted_unique`:

```python
import bisect
def rank_of(sorted_unique, x):
    return bisect.bisect_left(sorted_unique, x)   # O(log m)
```

### 2.4 Complexity

- **Build:** `O(n log n)` for the sort (dominant cost), `O(n)` to relabel.
- **Query (value → rank):** `O(log m)` via binary search, or `O(1)` with a precomputed dict.
- **Space:** `O(m)` for the mapping, where `m` = distinct values ≤ `n`. This is the payoff: a structure that would have needed `O(value_range)` now needs `O(m)`.

### 2.5 Common mistakes

- **Losing ties.** Use `set` (or dedup) so equal values map to the *same* rank; otherwise counts split incorrectly. If a problem needs to distinguish equal values by position, compress `(value, index)` pairs instead.
- **Half-open interval endpoints.** When compressing interval endpoints for a sweep, remember that a coordinate and "just past it" may both matter; compress *events*, not just endpoints, and be explicit about open/closed.
- **Forgetting you can't do arithmetic on ranks.** Ranks preserve order, not distances. If the answer depends on actual gaps (e.g., total covered *length*), keep the original values around and map back.

### 2.6 When to use / when not to

**Use it** as a *preprocessing step* whenever a value-indexed structure would otherwise blow up: Fenwick/segment tree over `10^9`-range keys, counting inversions with large values, offline range-count queries, sweep-line over sparse coordinates.

**Don't use it** when the raw range is already small (just index directly), or when you need magnitude-dependent arithmetic that ranks would destroy.

### 2.7 AI / systems connection

- **Feature hashing vs. rank encoding.** Turning high-cardinality categorical features into dense contiguous indices for an embedding table is coordinate compression — the vocabulary map `token → id` in a tokenizer is exactly this rank assignment.
- **Quantile/bucket boundaries.** Histogram-based gradient boosting (LightGBM/XGBoost) compresses continuous feature values into a small set of bin indices before training — the same "collapse the range to distinct meaningful cut points" move.

---

## 3. Sweep Line

### 3.1 What is it and why does it exist?

A **sweep line** (a.k.a. **line sweep** or **event scheduling**) processes geometric or interval data by moving an imaginary line across one axis and handling **events** (interval starts and ends, points) *in sorted order*, maintaining a running state as the line advances.

**Why it exists.** Questions like "what is the maximum number of intervals overlapping at any point?", "merge these intervals," "does any pair of these rectangles intersect?", or "total covered length of these segments" naively cost `O(n²)` (compare every pair). Sorting the `2n` endpoints and sweeping through them once reduces this to `O(n log n)` — the sort dominates; the sweep itself is linear.

### 3.2 The core idea (invariant)

> **Convert each interval into two events — a `+1` at its start and a `-1` at its end — sort all events by coordinate, then sweep left to right maintaining a running count (or a running set) of "currently active" intervals.** The answer is read off the running state at each event.

This is *the same "record changes at boundaries, then integrate" idea as the difference array* — but generalized to a sorted event stream rather than a dense index array, which is why it composes so naturally with **coordinate compression** for sparse coordinates.

### 3.3 Canonical implementation — maximum concurrent intervals

```python
def max_overlap(intervals):
    """Maximum number of intervals overlapping at any single point.
    Classic use: 'minimum meeting rooms' (LC 253). O(n log n)."""
    events = []
    for start, end in intervals:
        events.append((start, +1))   # an interval becomes active
        events.append((end,   -1))   # an interval becomes inactive
    # Sort by coordinate; on ties, process ENDs (-1) before STARTs (+1)
    # so intervals that merely touch at a point don't count as overlapping.
    events.sort(key=lambda e: (e[0], e[1]))

    active = best = 0
    for _, delta in events:
        active += delta
        best = max(best, active)
    return best

# Meetings [(0,30),(5,10),(15,20)] -> 2 rooms needed (0-30 overlaps each other one)
print(max_overlap([(0, 30), (5, 10), (15, 20)]))   # 2
```

> ⚠️ **The tie-break is the whole game.** Whether two intervals that share an endpoint "overlap" depends on whether your intervals are closed `[s, e]` or half-open `[s, e)`. For half-open (meeting rooms: a meeting ending at 10 frees the room for one starting at 10), process **ends before starts** on ties — as above. For closed intervals where touching counts as overlap, process **starts before ends**. Getting this wrong is the single most common sweep-line bug.

### 3.4 Variant — merge intervals via sweep

```python
def merge_intervals(intervals):
    """Merge all overlapping intervals. O(n log n)."""
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])          # sweep by start coordinate
    merged = [list(intervals[0])]
    for s, e in intervals[1:]:
        if s <= merged[-1][1]:                  # overlaps the current run
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])               # gap -> start a new run
    return [tuple(x) for x in merged]

print(merge_intervals([(1, 3), (2, 6), (8, 10), (15, 18)]))
# -> [(1, 6), (8, 10), (15, 18)]
```

### 3.5 Complexity

| Task | Sweep line | Naïve |
|---|---|---|
| Max concurrent intervals / min rooms | **O(n log n)** | O(n²) or O(range) |
| Merge intervals | **O(n log n)** | O(n²) |
| Total covered length of segments | **O(n log n)** | O(range) |
| Rectangle-union area (with segment tree on y) | **O(n log n)** | O(n²) |

The `log n` is the sort. With integer coordinates in a small range you can bucket instead and drop to `O(n + range)`; with a huge sparse range, **compress coordinates first** (§2) and keep the `O(n log n)`.

### 3.6 Common mistakes

- **Wrong tie-break at shared endpoints** (see §3.3). Decide closed vs. half-open *first*.
- **Sorting events but forgetting to sort deltas within equal coordinates.** The `(coord, delta)` key handles both at once.
- **Confusing "count" sweeps with "set" sweeps.** Maximum-overlap needs only a running integer. Problems like "is there any intersection among these rectangles" or "union area" need an ordered *set* (often a balanced BST or segment tree) of active elements along the second axis — a heavier sweep.

### 3.7 When to use / when not to

**Use it** for interval overlap/merge/partition questions, "minimum resources to cover all events," closest-pair and rectangle-intersection geometry, and any "process events in time order while maintaining a live aggregate" problem (this is why it underlies discrete-event simulation).

**Don't use it** when there is no natural ordering axis, when intervals change *interactively* (a sweep is inherently offline/batch — for online interval queries use an interval tree or segment tree), or when a simple difference array over a dense index already suffices.

### 3.8 AI / systems connection

- **Scheduling and resource estimation.** "How many GPUs are busy at peak?" across a fleet of training/inference jobs with start/end times is a max-overlap sweep — the same computation as minimum meeting rooms. It sizes autoscaling and capacity planning.
- **Streaming/event processing.** Sweep line is the batch cousin of windowed stream processing: events sorted by time, a running aggregate updated at each. Session-window and sliding-window analytics use the same start/end delta bookkeeping.
- **KV-cache / span accounting in LLM serving.** Tracking how many token spans are "live" in a paged cache over a request timeline is an interval-overlap problem; the peak overlap bounds memory.

---

## 4. How the three techniques relate

All three are the same instinct — **encode change at boundaries, integrate to recover state** — applied to different data shapes:

| Technique | Data shape | "Record change" | "Integrate" |
|---|---|---|---|
| **Difference array** | dense index array | `+v` at `l`, `-v` at `r+1` | prefix sum |
| **Sweep line** | sorted event stream | `+1` at start, `-1` at end | running count while sweeping |
| **Coordinate compression** | sparse values | (enabler) map values → ranks | lets the other two run on huge ranges |

The practical recipe for a large fraction of interval problems: **compress the coordinates → build a difference array or sweep the events → integrate**. Recognizing that these three are one idea is worth more than memorizing any single template.

---

## 5. Practice Problems

Curated to teach the *pattern*, not to pad a list. For each, try the naïve `O(n²)`/`O(range)` approach first so you feel why the technique wins.

| # | Problem | Technique | Why it teaches the pattern |
|---|---|---|---|
| 1 | **Corporate Flight Bookings** (LC 1109) | Difference array | The purest 1-D range-add; batch updates, one read. |
| 2 | **Range Addition** (LC 370) | Difference array | Same as above, explicitly asks for the final array. |
| 3 | **Car Pooling** (LC 1094) | Difference array over positions | Range-add capacity, then check no point exceeds the limit. |
| 4 | **Meeting Rooms II** (LC 253) | Sweep line | Max concurrent intervals; forces the ends-before-starts tie-break. |
| 5 | **Merge Intervals** (LC 56) | Sweep by start | The canonical merge; then try **Insert Interval** (57) as a follow-up. |
| 6 | **My Calendar II / III** (LC 731 / 732) | Sweep + difference | Detect double/triple booking — max overlap ≥ 2 / ≥ 3. |
| 7 | **Count of Range Sum** (LC 327) | Coordinate compression + Fenwick | Compress prefix sums, then range-count — the compression enabler in action. |
| 8 | **The Skyline Problem** (LC 218) | Sweep line + heap | Advanced: sweep x-coordinates maintaining the max active height. |

### Worked mini-example — Car Pooling (difference array)

*You are given trips `(passengers, from, to)` and a car `capacity`. Return whether every trip fits.*

**Naïve:** for each trip, add passengers to every stop in `[from, to)` → `O(trips × stops)`.

**Optimized (difference array over stops):**

```python
def car_pooling(trips, capacity):
    diff = [0] * 1001                     # stops are bounded (0..1000)
    for passengers, frm, to in trips:
        diff[frm] += passengers           # board
        diff[to]  -= passengers           # alight (half-open: they leave AT `to`)
    running = 0
    for delta in diff:
        running += delta
        if running > capacity:            # integrate; check the live count
            return False
    return True

print(car_pooling([(2, 1, 5), (3, 3, 7)], 4))   # False (5 aboard on [3,5))
print(car_pooling([(2, 1, 5), (3, 3, 7)], 5))   # True
```

**Why the optimization works:** boarding/alighting are boundary events (`+p` at `from`, `-p` at `to`), and the passenger count at any stop is the prefix sum of those events. One `O(n)` integration replaces `O(trips × stops)` re-summation. **Failure mode:** using `to` (closed) instead of `to` as the alight point (half-open) double-counts passengers at the drop-off stop — decide the convention from the problem statement.

---

## Related Guides

**Prerequisites:** [Hashing Patterns](/docs/hashing-patterns) · [Sorting Algorithms](/docs/sorting-algorithms)  
**See also:** [Segment Tree & Fenwick Tree](/docs/segment-tree-fenwick) · [Greedy Algorithms & Interval Scheduling](/docs/greedy-algorithms) · [Sliding Window](/docs/sliding-window)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
