---
title: Binary Search & Search on Answer
slug: /binary-search
sidebar_position: 3
sidebar_label: Binary Search & Search on Answer
description: >-
  From 'guess the number' to allocating resources under constraints — plus the binary-search-on-answer paradigm.
tags:
  - binary-search
  - search
  - patterns
difficulty: intermediate
reading_time: 21
prerequisites:
  - title: Arrays & Strings
    to: /docs/arrays-and-strings
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: core-dsa/sliding-window
pagination_next: core-dsa/sorting-algorithms
path_step: 9
---

# Binary Search & Search on Answer — Ultimate Reference Guide

> A single source of truth for binary search — from the first "guess the number" intuition to allocating resources under constraints, and where the technique quietly powers modern DS, AI/ML, and LLM systems.
>
> Every code block in this guide has been executed and verified against known expected outputs.

---

## Table of Contents

1. [Intuition & Analogy](#1-intuition--analogy)
2. [Classical Binary Search](#2-classical-binary-search)
   - 2.1 [Algorithm Walkthrough](#21-algorithm-walkthrough)
   - 2.2 [Code Templates](#22-code-templates)
   - 2.3 [Variants — Exact / Lower / Upper Bound](#23-variants--exact--lower--upper-bound)
   - 2.4 [Common Bugs & Fixes](#24-common-bugs--fixes)
3. [Search on Answer](#3-search-on-answer)
   - 3.1 [Paradigm Explanation](#31-paradigm-explanation)
   - 3.2 [Framework & Template](#32-framework--template)
   - 3.3 [Worked Problems](#33-worked-problems)
4. [Complexity Analysis](#4-complexity-analysis)
5. [Applications in DS / AI / ML / LLMs](#5-applications-in-ds--ai--ml--llms)
6. [Expert Takeaways & Mental Models](#6-expert-takeaways--mental-models)
7. [Quick Reference Cheat Sheet](#7-quick-reference-cheat-sheet)

---

## 1. Intuition & Analogy

### The one-sentence idea

> Binary search is the art of **throwing away half of the remaining possibilities with every single question**, because you can tell which half the answer is *not* in.

### Real-world analogies

**The dictionary flip.** You look up "monotonic." You don't start at page 1. You flip to the middle, land on "M-ish" words, realize you overshot slightly, flip halfway back, and converge in a handful of jumps. A 2,000-page dictionary is conquered in ~11 flips. That halving-per-flip is `log₂(2000) ≈ 11`.

**The number-guessing game.** "I'm thinking of a number between 1 and 100." You guess 50. "Higher." Now it's 51–100. You guess 75. "Lower." Now 51–74. Each answer — *higher* or *lower* — is a **monotonic signal** that eliminates half the range. You never need more than 7 guesses (`log₂(100) ≈ 6.6`).

**Why halving beats scanning.** Linear scan asks "is it *this* one?" `n` times. Binary search asks "is it in the *left or right half*?" `log n` times. For a billion items, that's ~30 questions instead of a billion.

### The core prerequisite: MONOTONICITY

This is the single most important idea in the entire guide, and the one beginners underestimate.

Binary search does not actually require a *sorted array*. It requires a **monotonic predicate** — a yes/no question whose answer, as you move left to right across the search space, flips **at most once** and never flips back:

```
Search space:   [ F  F  F  F  T  T  T  T  T ]
                              ↑
                     the boundary we hunt for
```

- A **sorted array** is just the special case where the predicate is `arr[i] >= target`.
- If your predicate looks like `F F T F T T` (flips more than once), binary search is **invalid** — it may return a wrong answer silently.

> **Beginner misunderstanding:** "Binary search = searching a sorted array."
> **Expert reframe:** "Binary search = locating the boundary of a monotonic true/false region." Sorting is one way to *create* that monotonicity; it is not the definition.

### Complexity at a glance

| Metric | Iterative | Recursive |
|---|---|---|
| **Time** | `O(log n)` | `O(log n)` |
| **Space** | `O(1)` | `O(log n)` (call stack) |

**Why `O(log n)` time?** The candidate range starts at size `n` and halves each step: `n → n/2 → n/4 → … → 1`. The number of halvings to reach 1 is `log₂ n`. Formally, the recurrence `T(n) = T(n/2) + O(1)` solves to `T(n) = O(log n)` by the Master Theorem.

**Why `O(1)` space (iterative)?** You only track `lo`, `hi`, `mid` — three integers, regardless of input size. The recursive version costs `O(log n)` stack frames because each call waits on the next.

---

## 2. Classical Binary Search

### 2.1 Algorithm Walkthrough

**Plain English.** Keep a window `[lo, hi]` that is guaranteed to contain the answer if it exists. Look at the middle element:
1. If it *is* the target → done.
2. If it's *too small* → the answer must be to the right → move `lo` past `mid`.
3. If it's *too big* → the answer must be to the left → move `hi` before `mid`.
4. Repeat until the window is empty (`lo > hi`) → target absent.

**The invariant that makes it correct:** at all times, everything outside `[lo, hi]` has already been proven incapable of being the answer. We never re-examine discarded regions, and we never discard the answer.

**Worked trace — find `7` in `[1, 3, 5, 7, 9, 11]`** (verified output):

| Iteration | `lo` | `hi` | `mid` | `arr[mid]` | Decision |
|---|---|---|---|---|---|
| 1 | 0 | 5 | 2 | 5 | `5 < 7` → search right, `lo = 3` |
| 2 | 3 | 5 | 4 | 9 | `9 > 7` → search left, `hi = 3` |
| 3 | 3 | 3 | 3 | 7 | `7 == 7` → **return index 3** ✅ |

Three comparisons for six elements — and it would still be ~30 for a billion.

### 2.2 Code Templates

```python
def binary_search(arr, target):
    """Classic exact-match binary search (iterative).
    Returns the index of target, or -1 if absent.
    Uses the inclusive [lo, hi] convention.
    """
    lo, hi = 0, len(arr) - 1
    while lo <= hi:                      # inclusive: lo == hi still has 1 candidate
        mid = lo + (hi - lo) // 2        # overflow-safe midpoint
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1                 # discard mid and everything left
        else:
            hi = mid - 1                 # discard mid and everything right
    return -1                            # window empty → not found


def binary_search_rec(arr, target, lo=0, hi=None):
    """Recursive exact-match binary search. O(log n) stack space."""
    if hi is None:
        hi = len(arr) - 1
    if lo > hi:
        return -1
    mid = lo + (hi - lo) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] < target:
        return binary_search_rec(arr, target, mid + 1, hi)
    else:
        return binary_search_rec(arr, target, lo, mid - 1)
```

Verified: `binary_search([1,3,5,7,9,11], 7) == 3`, `binary_search([1,3,5,7,9,11], 4) == -1`.

### 2.3 Variants — Exact / Lower / Upper Bound

With duplicates, "find the target" is ambiguous. The professional tools are **lower bound** and **upper bound**. Both use the **half-open `[lo, hi)` convention** with `while lo < hi`, which is cleaner and less bug-prone for boundary hunting.

```python
def lower_bound(arr, target):
    """First index i where arr[i] >= target.
    Equivalent to Python's bisect.bisect_left.
    Returns len(arr) if all elements are < target.
    """
    lo, hi = 0, len(arr)                 # note: hi = len(arr), NOT len-1
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] < target:
            lo = mid + 1                 # mid too small → answer strictly right
        else:
            hi = mid                     # mid is a candidate → keep it in [lo, hi)
    return lo


def upper_bound(arr, target):
    """First index i where arr[i] > target.
    Equivalent to Python's bisect.bisect_right.
    """
    lo, hi = 0, len(arr)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    return lo
```

**How they combine** (verified on `[1, 2, 2, 2, 3, 4, 4, 5]`):

| Query | `lower_bound` | `upper_bound` | Interpretation |
|---|---|---|---|
| target = 2 | 1 | 4 | value `2` occupies indices `[1, 4)` → **count = 3** |
| target = 4 | 5 | 7 | value `4` occupies indices `[5, 7)` → **count = 2** |

- **Count of a value** = `upper_bound(x) − lower_bound(x)`.
- **Exists?** = `lower_bound(x) < len(arr) and arr[lower_bound(x)] == x`.
- **First occurrence** = `lower_bound(x)`; **last occurrence** = `upper_bound(x) − 1`.
- **Insertion point** to keep sorted = `lower_bound(x)`.

Python ships these as `bisect.bisect_left` / `bisect.bisect_right` — use them in production; the templates above are what they do internally and what you write in interviews or non-Python stacks.

### 2.4 Common Bugs & Fixes

| Bug | Symptom | Fix |
|---|---|---|
| **Wrong loop condition** | Misses the last element, or off-by-one result | Match condition to convention: **inclusive `[lo, hi]` → `while lo <= hi`**; **half-open `[lo, hi)` → `while lo < hi`**. Never mix. |
| **Integer overflow** | `mid = (lo + hi) // 2` overflows in C/C++/Java when `lo + hi > INT_MAX` (the famous JDK/JGuru bug, 2006) | Always write `mid = lo + (hi - lo) // 2`. Harmless in Python (bignums), but a career-defining habit everywhere else. |
| **Infinite loop** | Hangs forever | Ensure the range **strictly shrinks** every iteration. With `hi = mid` (not `mid - 1`), you must also advance `lo = mid + 1` on the other branch — otherwise `lo == mid` when `hi = lo + 1` and it never moves. |
| **Updating the wrong pointer** | Converges to the wrong side | The pointer you move to `mid` (vs `mid ± 1`) must correspond to the branch that *keeps* `mid` as a candidate. |
| **Returning `lo` vs `hi`** | Off-by-one on absence/insertion | After a `[lo, hi)` search, `lo == hi` is the boundary. Return `lo`. Don't guess. |
| **Unsorted / non-monotonic input** | Silently wrong answer, no error | Verify the monotonicity precondition. Binary search *cannot* detect that its precondition is violated. |

**The infinite-loop trap in detail.** When you use `hi = mid` (needed for boundary searches), the midpoint `mid = lo + (hi - lo)//2` rounds *down*. If you ever write `lo = mid` (instead of `mid + 1`) in the other branch, then when `hi = lo + 1`, `mid == lo`, you set `lo = mid == lo`, and nothing changes — forever. **Rule of thumb:** the branch that sets `hi = mid` pairs with a branch that sets `lo = mid + 1`. The `+1` guarantees progress.

---

## 3. Search on Answer

### 3.1 Paradigm Explanation

**The paradigm shift.** In classical binary search you search **over indices of an existing array**. In *search on answer*, there is often **no array to search** — instead you binary-search **over the space of possible answer values**, using a feasibility test to decide which half to keep.

> **Beginner misunderstanding:** "Binary search needs an array."
> **Expert reframe:** "If I can (a) *guess* an answer and (b) cheaply *check* whether that guess works, and (c) the checking result is monotonic in the guess, then I can binary-search the answer itself — no array required."

The tell-tale signature of a search-on-answer problem:

- The question asks for a **minimum** or **maximum** value ("minimum capacity", "maximum speed", "smallest largest sum", "minimum time").
- Directly computing that optimum is hard, but **verifying a specific candidate** is easy.
- Feasibility is **monotonic**: if capacity `X` works, every capacity `> X` also works (or vice versa).

That monotonicity turns the answer space into exactly the `F F F T T T` predicate line from Section 1 — and we hunt the boundary.

```
Answer value:   lo ............................. hi
feasible()?     F  F  F  F  T  T  T  T  T  T  T  T
                            ↑
              smallest feasible answer = what we return
```

### 3.2 Framework & Template

A reliable four-step recipe:

1. **Confirm monotonicity.** Ask: "If answer `m` is feasible, is `m+1` *always* feasible too?" If yes (or the mirror for maximization), proceed. This is the make-or-break step.
2. **Set bounds `[lo, hi]`** of the answer space. Make `lo` the smallest conceivable answer and `hi` the largest. A too-wide range only costs a few extra `log` iterations — err wide rather than risk excluding the answer.
3. **Write `feasible(mid)`** — a predicate returning `True/False` for a *specific* candidate answer. This is where the real problem lives (greedy simulation, counting, etc.).
4. **Binary search** the boundary with the half-open pattern.

**Generic reusable template — minimization** (find the *smallest* feasible answer):

```python
def search_on_answer_min(lo, hi, feasible):
    """Return the smallest value in [lo, hi] for which feasible() is True.
    Precondition: feasible is monotonic — F...F T...T (once False turns True,
    it stays True). Assumes an answer exists in [lo, hi].
    """
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid          # mid works → it might be the best; keep it, search left
        else:
            lo = mid + 1      # mid fails → answer must be larger
    return lo                 # lo == hi == smallest feasible answer
```

**Mirror template — maximization** (find the *largest* feasible answer, predicate `T...T F...F`):

```python
def search_on_answer_max(lo, hi, feasible):
    """Return the largest value in [lo, hi] for which feasible() is True.
    Precondition: feasible is monotonic — T...T F...F.
    """
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2   # ceil: bias mid UP to avoid infinite loop
        if feasible(mid):
            lo = mid          # mid works → try to go higher; keep it
        else:
            hi = mid - 1      # mid fails → answer must be smaller
    return lo
```

> **The single most important insight here:** in the maximization template you **must** round `mid` **up** (`+ 1` before dividing). Otherwise, when `hi == lo + 1` and `feasible(lo)` is true, `mid` rounds down to `lo`, you set `lo = mid == lo`, and the loop spins forever. The two templates are mirror images — memorize the pair together, including which one uses the ceiling midpoint.

### 3.3 Worked Problems

#### Problem A — Koko Eating Bananas (LeetCode 875)

> Koko has `piles` of bananas and `h` hours before the guards return. Each hour she picks one pile and eats up to `k` bananas from it (if the pile has fewer, she finishes it and stops for that hour). Find the **minimum eating speed `k`** such that she finishes all bananas within `h` hours.

**Reasoning through the lenses:**
- *Beginner trap:* trying to derive `k` with a formula from totals — but the `ceil` per pile makes a closed form messy.
- *Expert move:* recognize that **higher speed is always at least as feasible** (eating faster never makes you finish later) → monotonic → search on answer.

**Framework:**
1. Monotonic? If speed `k` finishes in time, so does any `k' > k`. ✅
2. Bounds: `lo = 1` (must eat something), `hi = max(piles)` (eating faster than the biggest pile per hour gives no further benefit — one pile per hour is the cap).
3. `feasible(k)` = total hours `Σ ceil(pile / k) <= h`.
4. Search for the smallest feasible `k`.

```python
import math

def min_eating_speed(piles, h):
    def feasible(k):
        return sum(math.ceil(p / k) for p in piles) <= h
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

Verified: `min_eating_speed([3,6,7,11], 8) == 4`; `min_eating_speed([30,11,23,4,20], 5) == 30`; `min_eating_speed([30,11,23,4,20], 6) == 23`.

**Complexity:** `O(n log M)` where `n = len(piles)`, `M = max(piles)`. The `log M` is the binary search; each `feasible` call is `O(n)`.

#### Problem B — Capacity to Ship Packages within D Days (LeetCode 1011)

> Given package `weights` on a conveyor belt (must ship **in order**) and `D` days, find the **minimum ship capacity** so all packages ship within `D` days. Each day you load consecutive packages without exceeding capacity.

This is exactly the guide's example: `weights = [3,2,2,4,1,4]`, `D = 3`.

**Framework:**
1. Monotonic? A bigger ship can carry anything a smaller ship can → if capacity `C` works, so does `C+1`. ✅
2. Bounds: `lo = max(weights)` (the ship must at least hold the heaviest single package, since packages can't be split), `hi = sum(weights)` (one giant day carries everything). This bound choice is itself an expert detail — setting `lo` below `max(weights)` makes `feasible` never true there and wastes iterations, or worse, breaks a naive predicate.
3. `feasible(cap)` = greedily pack days; the required days `<= D`.
4. Smallest feasible capacity.

```python
def ship_within_days(weights, days):
    def feasible(cap):
        d, cur = 1, 0
        for w in weights:
            if cur + w > cap:   # can't fit → start a new day
                d += 1
                cur = 0
            cur += w
        return d <= days
    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

Verified: `ship_within_days([3,2,2,4,1,4], 3) == 6`; `ship_within_days([1,2,...,10], 5) == 15`.

**Trace of the answer `6` for `[3,2,2,4,1,4]`, D=3:** Day 1 = `[3,2] → 5` (adding 2 more would give 7 > 6? `5+2=7>6` so stop... actually `3+2=5`, next `+2=7>6` → new day). Day 1 `[3,2]`, Day 2 `[2,4]`, Day 3 `[1,4]` → 3 days. ✅ Capacity 5 would need 4 days, so 6 is minimal.

#### Bonus — the family this pattern unlocks

The exact same skeleton (`lo = max`, `hi = sum`, greedy `feasible`) solves **Split Array Largest Sum** (LC 410): partition `nums` into `k` subarrays minimizing the largest subarray sum.

```python
def split_array(nums, k):
    def feasible(limit):
        cnt, cur = 1, 0
        for n in nums:
            if cur + n > limit:
                cnt += 1
                cur = 0
            cur += n
        return cnt <= k          # can we do it in <= k parts under this limit?
    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
```

Verified: `split_array([7,2,5,10,8], 2) == 18`. Notice Koko, Ship-Packages, and Split-Array are **the same problem in three costumes** — spotting that is the expert skill.

#### Binary search over the reals (floats)

When the answer is continuous (e.g., `sqrt`, minimizing a convex cost), replace "shrink to one integer" with "iterate a fixed number of times" or "until `hi - lo < eps`":

```python
def sqrt_bs(x, eps=1e-9):
    lo, hi = 0.0, max(1.0, x)
    for _ in range(100):          # 100 halvings → ~1e-30 precision; no infinite-loop risk
        mid = (lo + hi) / 2
        if mid * mid < x:
            lo = mid
        else:
            hi = mid
    return lo
```

Verified: `sqrt_bs(2) ≈ 1.414213562`. **Expert tip:** prefer a **fixed iteration count** over `while hi - lo > eps` for floats — it sidesteps precision-induced infinite loops and gives predictable runtime.

---

## 4. Complexity Analysis

| Algorithm | Time | Space | Notes |
|---|---|---|---|
| Classic binary search (iterative) | `O(log n)` | `O(1)` | `n` = array length |
| Classic binary search (recursive) | `O(log n)` | `O(log n)` | stack frames |
| Lower / upper bound | `O(log n)` | `O(1)` | same as classic |
| Search on answer | `O(C · log R)` | `O(1)` extra | `R` = size of answer range (`hi − lo`), `C` = cost of one `feasible()` call |
| Search on answer over reals | `O(C · log((hi−lo)/eps))` or `O(C · iters)` | `O(1)` | fixed-iteration form is `O(C · iters)` |

**Reading the search-on-answer cost.** People forget the `C` factor. In Koko, `C = O(n)` (summing over piles) and `R = max(piles)`, so total is `O(n log(max(piles)))`. The binary search contributes only the *logarithm of the value range* — cheap even for huge numeric ranges (searching `[1, 10⁹]` is ~30 iterations).

**Why the answer range's *magnitude*, not its element count, drives the log.** Search on answer often ranges over `10⁹` or more possible values. Because we halve the *value interval*, the iteration count is `log₂(hi − lo)` — around 30–60 even for astronomically large ranges. That's the whole reason the technique scales.

---

## 5. Applications in DS / AI / ML / LLMs

### Data Structures

- **Binary Search Trees (BSTs).** A BST *is* binary search made persistent in pointers: each node's left/right split embodies the same "discard half" decision, giving `O(log n)` lookup on a balanced tree (AVL, Red-Black).
- **Sorted arrays & `bisect`.** Maintaining a sorted list and using `lower_bound`/`upper_bound` for insertion, range counts, and predecessor/successor queries.
- **Segment trees / Fenwick trees.** "Binary search on the tree" — descend the segment tree in `O(log n)` to find, e.g., the k-th element or the first prefix-sum exceeding a threshold.
- **Answer-space in graphs.** "Minimum maximum edge weight path", "minimize the largest distance" — binary search the threshold, then run a linear/BFS feasibility check.

### AI / ML

- **Hyperparameter tuning.** When a metric is **monotonic** in one hyperparameter (e.g., regularization strength vs. a constraint being satisfied, or model size vs. a latency budget), binary search finds the tightest setting far faster than grid search. *Caveat:* only valid where monotonicity truly holds — many hyperparameters are non-monotonic, and there binary search is the wrong tool (use grid/random/Bayesian search).
- **Classification threshold selection.** The precision–recall tradeoff is monotonic in the decision threshold: raising the threshold monotonically increases precision and decreases recall. Binary-search the threshold to hit a **target precision** (e.g., "smallest threshold with precision ≥ 0.95") — a textbook search-on-answer.
- **Learning-rate / step-size line search.** Backtracking line search and bisection line search locate a step size satisfying the Armijo/Wolfe conditions by halving an interval.
- **Quantile & calibration lookups.** Finding where a value falls in a sorted array of empirical quantiles (isotonic calibration, conformal prediction thresholds) is a direct `bisect`.

### LLMs

- **Top-k / nucleus (top-p) sampling.** After sorting token probabilities descending and computing the cumulative distribution, **nucleus sampling binary-searches the cumulative sum** for the smallest prefix whose mass ≥ `p`. The CDF is monotonic → `lower_bound` on the cumulative array picks the nucleus cutoff in `O(log V)` over vocabulary `V`.
- **Sampling a token from a CDF.** Drawing `u ~ Uniform(0,1)` and finding the token via `bisect` on the cumulative probabilities is the standard `O(log V)` inverse-CDF sample.
- **KV-cache & positional lookups.** Locating a position/segment within sorted cache offsets, or paged-attention block boundaries, via binary search.
- **Beam search pruning thresholds.** When pruning hypotheses by a score cutoff to retain a target beam size, binary-searching the score threshold over a sorted score array selects the cutoff efficiently.
- **Context-window / batch-size fitting.** "Largest batch size (or sequence length) that fits in GPU memory / latency budget" is search-on-answer: memory use is monotonic in batch size, `feasible(b)` = "fits and meets SLA", binary-search the max feasible `b`. (Same shape as Ship-Packages.)

### Systems

- **Database & storage indexing.** B-tree/B+-tree indexes are disk-friendly generalizations of binary search; within a sorted index page, lookups are binary search.
- **Vector stores & embeddings.** Exact nearest-neighbor over a 1-D projection, or locating a scalar (e.g., a norm or a cluster boundary) in sorted embedding metadata, uses binary search. (Note: high-dimensional ANN like HNSW/IVF is *not* binary search — dimensionality breaks the total order binary search needs.)
- **Rate limiting, versioning, log search.** Finding the first log entry after a timestamp, the first failing commit (`git bisect` — literally binary search on answer over commit history), or the first version where a flag flips.

> `git bisect` is the most beloved real-world search-on-answer: "find the first commit where the test fails" is a monotonic `F...F T...T` predicate over the commit timeline, and it finds the culprit in `log(commits)` checkouts.

---

## 6. Expert Takeaways & Mental Models

### 5+ insights beginners miss

1. **It's about a monotonic predicate, not a sorted array.** Reframe every candidate problem as "is there a `F...F T...T` boundary?" If yes, binary search applies — even with no array in sight.
2. **Pick ONE convention and never mix.** Either inclusive `[lo, hi]` with `while lo <= hi`, or half-open `[lo, hi)` with `while lo < hi`. Most boundary bugs come from mixing the two. Professionals standardize on half-open for `lower/upper bound`.
3. **`mid = lo + (hi - lo) // 2` always.** Even in Python where overflow can't happen, it's muscle memory that saves you in C++/Java/Rust. And in the *maximization* template, use the **ceiling** midpoint `lo + (hi - lo + 1) // 2` to prevent infinite loops.
4. **The hard part of search-on-answer is `feasible()`, not the search.** The binary search is 6 boilerplate lines. Your real work is designing a correct, cheap, monotonic feasibility predicate (often a greedy sweep or a count).
5. **Bound generously.** An answer range that's 10× too wide costs only ~3–4 extra iterations (`log₂ 10 ≈ 3.3`). An answer range that's too *narrow* and excludes the true answer is a silent correctness bug. When unsure, widen `hi`.
6. **Binary search cannot validate its own precondition.** On non-monotonic input it returns a plausible-looking wrong answer with no error. *You* are responsible for proving monotonicity.
7. **Return `lo` after a `[lo, hi)` loop.** When `lo == hi`, that index/value *is* the boundary. Don't second-guess with extra comparisons.
8. **Prefer the language's battle-tested primitives.** Use `bisect_left/bisect_right` (Python), `std::lower_bound/upper_bound` (C++), `Arrays.binarySearch` (Java) in production — but know the template cold for interviews and answer-space problems where no primitive fits.

### Decision flowchart — "Should I use binary search here?"

```
                  ┌─────────────────────────────────────────┐
                  │  Do I need to FIND a value, or the       │
                  │  MIN/MAX value satisfying a condition?    │
                  └───────────────┬───────────────────────────┘
                                  │
              ┌───────────────────┴────────────────────┐
              │                                          │
        FIND a value                          MIN / MAX under a condition
              │                                          │
              ▼                                          ▼
  ┌───────────────────────┐              ┌───────────────────────────────┐
  │ Is the data sorted /   │              │ Can I write feasible(x) that   │
  │ can I sort it once?    │              │ cheaply tests one candidate?   │
  └──────────┬─────────────┘              └───────────────┬───────────────┘
             │                                            │
        ┌────┴─────┐                              ┌────────┴────────┐
       YES         NO                            YES               NO
        │           │                             │                 │
        ▼           ▼                             ▼                 ▼
 ┌──────────┐  ┌─────────────┐        ┌───────────────────┐  ┌──────────────┐
 │ Classic  │  │ Is there    │        │ Is feasible(x)     │  │ Not a binary │
 │ binary   │  │ hidden      │        │ MONOTONIC in x?    │  │ search       │
 │ search /  │  │ monotonic   │        │ (F..F T..T pattern)│  │ problem.     │
 │ bisect   │  │ structure?  │        └─────────┬──────────┘  │ Use another  │
 └──────────┘  └──────┬──────┘                  │             │ technique    │
                      │                   ┌──────┴──────┐      │ (DP, greedy, │
                 ┌────┴────┐             YES            NO     │  heap, hash) │
                YES        NO             │              │     └──────────────┘
                 │          │             ▼              ▼
                 ▼          ▼    ┌──────────────────┐  ┌──────────────┐
          ┌───────────┐  ┌────┐ │ SEARCH ON ANSWER  │  │ Not binary   │
          │ Binary    │  │ No │ │ min: keep-left    │  │ search —     │
          │ search on │  │    │ │ max: keep-right + │  │ rethink the  │
          │ that      │  │    │ │ ceil midpoint     │  │ predicate    │
          │ structure │  └────┘ └──────────────────┘  └──────────────┘
          └───────────┘
```

### The universal template (covers ~95% of problems)

Everything reduces to **"find the boundary of a monotonic predicate."** Memorize this pair:

```python
# MINIMIZATION: smallest x with feasible(x) == True   (predicate: F F F T T T)
def find_min(lo, hi, feasible):
    while lo < hi:
        mid = lo + (hi - lo) // 2        # floor
        if feasible(mid):
            hi = mid                     # keep mid, look left for something smaller
        else:
            lo = mid + 1
    return lo

# MAXIMIZATION: largest x with feasible(x) == True     (predicate: T T T F F F)
def find_max(lo, hi, feasible):
    while lo < hi:
        mid = lo + (hi - lo + 1) // 2    # CEIL — prevents infinite loop
        if feasible(mid):
            lo = mid                     # keep mid, look right for something larger
        else:
            hi = mid - 1
    return lo
```

For classic exact search, `feasible(i) = (arr[i] >= target)` turns `find_min` into `lower_bound`. **One mental model, every problem.**

---

## 7. Quick Reference Cheat Sheet

### Conventions

| Convention | Loop | Init `hi` | Use for |
|---|---|---|---|
| Inclusive `[lo, hi]` | `while lo <= hi` | `len(arr) - 1` | exact-match search |
| Half-open `[lo, hi)` | `while lo < hi` | `len(arr)` | lower/upper bound, boundary hunts |

### Midpoint

| Goal | Formula | Why |
|---|---|---|
| Minimization / keep-left | `mid = lo + (hi - lo) // 2` | floor; pairs with `hi = mid` |
| Maximization / keep-right | `mid = lo + (hi - lo + 1) // 2` | **ceil**; prevents infinite loop with `lo = mid` |

### The two moves that must pair correctly

| If a branch does… | The other branch must do… | Guarantees |
|---|---|---|
| `hi = mid` (keep candidate) | `lo = mid + 1` | strict shrink, no infinite loop |
| `lo = mid` (keep candidate) | `hi = mid - 1` **and** use ceil midpoint | strict shrink, no infinite loop |

### `bisect` mapping (Python)

| Task | `bisect` | Template |
|---|---|---|
| First index `≥ target` | `bisect_left(a, x)` | `lower_bound` |
| First index `> target` | `bisect_right(a, x)` | `upper_bound` |
| Count of `x` | `bisect_right(a,x) - bisect_left(a,x)` | `upper − lower` |
| Insertion point (stay sorted) | `bisect_left(a, x)` | `lower_bound` |

### Search-on-answer checklist

1. ☐ Problem asks for a **min/max value**.
2. ☐ **Verifying** a candidate is easier than **computing** the optimum.
3. ☐ `feasible(x)` is **monotonic** (`F…F T…T` or `T…T F…F`).
4. ☐ `lo` = smallest possible answer, `hi` = largest possible answer (**bound generously**).
5. ☐ Minimize → `find_min` (floor mid, `hi = mid`). Maximize → `find_max` (ceil mid, `lo = mid`).
6. ☐ Cost = `O(feasible × log(hi − lo))`.

### Complexity one-liners

- Classic: `O(log n)` time, `O(1)` space (iterative).
- Search on answer: `O(C · log R)`, `C` = feasibility cost, `R` = answer-range size.
- Recursion adds `O(log n)` stack space.

### Canonical problem catalog

| Problem | Type | `lo … hi` | `feasible` |
|---|---|---|---|
| Find element in sorted array | Classic | `0 … n-1` | `arr[mid] == target` |
| First/last occurrence | Lower/Upper bound | `0 … n` | `arr[mid] ≥ / > target` |
| Koko Eating Bananas (LC 875) | Answer (min) | `1 … max(piles)` | `Σ ceil(p/mid) ≤ h` |
| Ship Packages in D Days (LC 1011) | Answer (min) | `max(w) … sum(w)` | greedy days `≤ D` |
| Split Array Largest Sum (LC 410) | Answer (min) | `max(w) … sum(w)` | greedy parts `≤ k` |
| Sqrt / real optimization | Answer (float) | `0 … x` | fixed iterations |
| `git bisect` | Answer (min) | first … last commit | test passes? |

---

*End of guide. Every code block above was executed and verified before inclusion.*

---

## Related Guides

**Prerequisites:** [Arrays & Strings](/docs/arrays-and-strings) · [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [Sorting Algorithms](/docs/sorting-algorithms) · [Two Pointers](/docs/two-pointers)

*Section: [Core DSA](/docs/category/02-core-dsa) · [All guides](/)*
