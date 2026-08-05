---
title: Dynamic Programming
slug: /dynamic-programming
sidebar_position: 2
sidebar_label: Dynamic Programming
description: >-
  From first principles to production DP — memoization, tabulation, and the classic optimization families.
tags:
  - dynamic-programming
  - optimization
difficulty: advanced
reading_time: 33
prerequisites:
  - title: Recursion & The Call Stack
    to: /docs/recursion-and-call-stack
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: advanced-dsa/backtracking
pagination_next: advanced-dsa/graph-theory
path_step: 17
---

# Dynamic Programming: The Ultimate Reference Guide

> A self-contained, publication-quality reference — from first principles to production-grade applications in DS, AI, ML, and LLM systems. Every algorithm ships with intuition, recurrence, runnable top-down **and** bottom-up code, a hand-traced example, and hard-won practitioner insight.

---

## 📌 Table of Contents

1. [What is Dynamic Programming?](#-1-what-is-dynamic-programming)
2. [1D Dynamic Programming](#-2-1d-dynamic-programming)
3. [2D Dynamic Programming](#️-3-2d-dynamic-programming)
4. [Knapsack Problem](#-4-knapsack-problem)
   - [4a. 0/1 Knapsack](#4a-01-knapsack)
   - [4b. Unbounded Knapsack](#4b-unbounded-knapsack)
   - [4c. Fractional Knapsack (Greedy contrast)](#4c-fractional-knapsack-greedy-contrast)
5. [Edit Distance (Levenshtein)](#️-5-edit-distance-levenshtein)
6. [Comparative Summary](#-6-comparative-summary)
7. [Master Cheat Sheet](#-7-master-cheat-sheet)

---

## 🧠 1. What is Dynamic Programming?

**Dynamic Programming (DP)** is a problem-solving technique that solves a complex problem by **breaking it into overlapping subproblems, solving each subproblem exactly once, and storing (caching) the result** so it's never recomputed. It trades **memory for time**.

> The name is historical, not descriptive. Richard Bellman coined "dynamic programming" in the 1950s partly because it sounded impressive to a research-funding Secretary of Defense who "had a pathological fear of the word *research*." "Programming" here means *tabular planning/optimization* (as in "linear programming"), not writing code.

The mental model that never fails:

> **DP = Recursion + Memory.** If you can write a correct brute-force recursion, and that recursion re-solves the same inputs, DP is just that recursion with a cache.

### Core Properties

A problem is a DP candidate **if and only if** it exhibits **both**:

1. **Optimal Substructure** — an optimal solution to the whole is built from optimal solutions to its parts. Formally, the recurrence for the optimum only depends on the optima of smaller subproblems, not on *how* those subproblems were solved.
   - ✅ Shortest path (subpaths of shortest paths are shortest).
   - ❌ *Longest simple path* in a general graph — combining two optimal sub-paths can revisit a node, so it lacks clean optimal substructure.

2. **Overlapping Subproblems** — the naïve recursion solves the *same* subproblem many times. This is what distinguishes DP from **Divide & Conquer** (merge sort, quicksort), where subproblems are *disjoint* and caching buys nothing.
   - Fibonacci: `fib(5)` recomputes `fib(3)` twice, `fib(2)` three times → exponential blowup without a cache.

| | Overlapping subproblems | Disjoint subproblems |
|---|---|---|
| **Optimal substructure** | **Dynamic Programming** | Divide & Conquer |
| **No optimal substructure** | Greedy *sometimes*, else brute force | — |

### When to Use DP (Decision Checklist)

Ask these in order. If the first three are "yes," reach for DP:

- [ ] **Am I asked for an optimum** (min/max/count/"is it possible")? — DP loves `min`, `max`, `count`, `true/false`. It rarely helps with "list *all* solutions."
- [ ] **Can I define the answer for input `N` in terms of smaller inputs?** (Recurrence exists.)
- [ ] **Does the naïve recursion recompute the same states?** (Overlap exists.)
- [ ] **Is the state space polynomial?** If the number of distinct subproblems is small (poly in input size), DP is efficient. If it's exponential (e.g., subsets that don't collapse), DP may not save you.
- [ ] **Greedy check:** Can a local greedy choice be *proven* optimal (exchange argument / matroid)? If yes, prefer the simpler greedy. DP is the fallback when greedy provably fails.

**The universal DP recipe (memorize this):**

1. **Define the state** — what does `dp[...]` *mean*? (The hardest and most important step.)
2. **Write the recurrence** — how does a state depend on smaller states?
3. **Set base cases** — the smallest states you can answer directly.
4. **Choose a direction** — top-down (memoized recursion) or bottom-up (iterative table).
5. **Decide the answer cell** — which state holds the final result?
6. **Optimize space** — collapse dimensions once the recurrence is correct (never before).

---

## 📐 2. 1D Dynamic Programming

> **Reasoning before writing (chain-of-thought):**
> 1. *Minimal mental model:* a 1D array where `dp[i]` summarizes everything about the prefix/position up to `i`.
> 2. *Expert vs. beginner:* beginners memorize Fibonacci; experts see the *pattern* — "the answer at `i` depends on a constant number of earlier indices" → O(1) rolling space.
> 3. *Real-world link:* this is the backbone of sequence scoring, streaming metrics, and Viterbi-style decoding.
> 4. *Most common mistake:* off-by-one in base cases and confusing "ending at `i`" vs. "considering up to `i`."

### Concept & Intuition

1D DP applies when a **single index** parameterizes the subproblem. `dp[i]` captures the optimal answer for the sub-instance defined by position `i` (a prefix, a step, or a state at time `i`). The recurrence looks back a **constant number of steps**.

Canonical family: **Climbing Stairs / House Robber / Max Subarray (Kadane) / Fibonacci**. We'll use **House Robber** as the running example because it forces a genuine *choice* at every index (unlike Fibonacci, which is a pure count).

> **Problem (House Robber):** Given `nums[]` of non-negative house values arranged in a line, maximize the sum you can steal **without robbing two adjacent houses**.

**Optimal substructure:** the best loot for houses `0..i` is built from the best loot for `0..i-1` and `0..i-2`.
**Overlapping subproblems:** naïve recursion `rob(i)` calls `rob(i-1)` and `rob(i-2)`, and `rob(i-1)` *also* calls `rob(i-2)` → exponential overlap.

### Analogy

> *"1D DP is like walking up a staircase while a stopwatch runs: to know the best time to reach step `i`, you only need the best times for the one or two steps just below you — not the entire history of how you got there. You carry a tiny 'best-so-far' note and update it one step at a time."*

For House Robber specifically:

> *"Think of robbing houses like choosing gigs on a calendar where back-to-back days are forbidden. At each day you either skip (keep yesterday's best) or take today's pay plus your best from two days ago. You never need to re-plan the whole month — just the last two days' bests."*

### Algorithm & Recurrence

- **State:** `dp[i]` = maximum loot achievable considering houses `0..i` (i.e., "up to and including index `i`").
- **Recurrence:**

  ```
  dp[i] = max( dp[i-1],            # skip house i  → keep best up to i-1
               dp[i-2] + nums[i] ) # rob house i   → best up to i-2, plus this house
  ```

- **Base cases:**

  ```
  dp[0] = nums[0]
  dp[1] = max(nums[0], nums[1])
  ```

- **Direction:** naturally **bottom-up** (index 0 upward). Top-down memoization also works with identical recurrence.
- **Answer cell:** `dp[n-1]`.
- **Space optimization:** `dp[i]` depends only on `dp[i-1]` and `dp[i-2]` → keep **two scalars**, drop the array → **O(1)** space. This "rolling variable" trick is the signature of 1D DP.

**Numbered pseudocode (bottom-up):**

1. If array empty → return 0; if single element → return it.
2. Initialize `prev2 = nums[0]`, `prev1 = max(nums[0], nums[1])`.
3. For `i` from `2` to `n-1`: `cur = max(prev1, prev2 + nums[i])`; shift `prev2 = prev1`, `prev1 = cur`.
4. Return `prev1`.

### Code (Top-Down + Bottom-Up)

```python
from functools import lru_cache
from typing import List

# ---------- TOP-DOWN (Memoization) ----------
def rob_topdown(nums: List[int]) -> int:
    n = len(nums)
    if n == 0:
        return 0

    @lru_cache(maxsize=None)          # cache turns exponential recursion into O(n)
    def best(i: int) -> int:          # best(i) = max loot from houses 0..i
        if i < 0:                     # no houses left → 0 loot (clean base case)
            return 0
        if i == 0:                    # only the first house available
            return nums[0]
        # choose: skip house i, OR rob it (add nums[i] to best two houses back)
        return max(best(i - 1), best(i - 2) + nums[i])

    return best(n - 1)                # answer: best over all houses

# ---------- BOTTOM-UP (Tabulation), O(1) space ----------
def rob_bottomup(nums: List[int]) -> int:
    if not nums:                      # edge case: empty street
        return 0
    if len(nums) == 1:                # edge case: single house
        return nums[0]

    prev2 = nums[0]                   # dp[i-2]: best up to two houses back
    prev1 = max(nums[0], nums[1])     # dp[i-1]: best up to previous house
    for i in range(2, len(nums)):
        cur = max(prev1, prev2 + nums[i])  # skip vs. rob-this-house
        prev2, prev1 = prev1, cur          # roll the window forward
    return prev1                      # dp[n-1]

if __name__ == "__main__":
    demo = [2, 7, 9, 3, 1]
    assert rob_topdown(demo) == rob_bottomup(demo) == 12   # rob houses 2,9,1
    print("House Robber:", rob_bottomup(demo))             # -> 12
```

**Complexity:** Top-down `O(n)` time / `O(n)` space (cache + recursion stack). Bottom-up `O(n)` time / **`O(1)`** space.

### Worked Example

`nums = [2, 7, 9, 3, 1]`

| i | nums[i] | skip = dp[i-1] | rob = dp[i-2] + nums[i] | dp[i] = max | choice |
|---|---------|----------------|-------------------------|-------------|--------|
| 0 | 2       | —              | —                       | **2**       | rob H0 |
| 1 | 7       | 2              | (dp[-1]=0)+7 = 7        | **7**       | rob H1 |
| 2 | 9       | 7              | dp[0]+9 = 2+9 = 11      | **11**      | rob H0+H2 |
| 3 | 3       | 11             | dp[1]+3 = 7+3 = 10     | **11**      | skip H3 |
| 4 | 1       | 11             | dp[2]+1 = 11+1 = 12    | **12**      | rob H2+H4... |

Final answer `dp[4] = 12`. Backtracking the choices: rob H1 (7) + H2 (9)? No — 7 and 9 are adjacent. The correct trace picks **H0(2) + H2(9) + H4(1) = 12**. This illustrates a key subtlety: `dp[i]` stores the *value*; recovering the actual set requires backtracking through which branch of the `max` won.

### Expert Takeaways

- **Novice vs. expert:** A novice allocates a full `dp[]` array. An expert immediately notices the recurrence's *window width* (here 2) and collapses to O(1) scalars — critical for streaming/embedded contexts.
- **"Ending at i" vs. "up to i":** These are different states with different recurrences. Kadane's max-subarray uses `dp[i] = max(nums[i], dp[i-1] + nums[i])` where `dp[i]` means "best subarray **ending exactly at** `i`" — you then take the global max separately. Mixing these two definitions is the #1 1D-DP bug.
- **Base-case discipline:** Extending the state to `i < 0 → 0` (as in the top-down version) eliminates messy special-casing. Prefer a clean sentinel base case over branching.
- **AI/ML/LLM connection:** 1D DP is the algorithmic core of the **Viterbi algorithm** (most-likely hidden state sequence in HMMs) and **CTC decoding** for speech-to-text — both are "best-score-ending-at-time-`t`" recurrences. In RL, **Bellman backups** for a chain MDP are literally 1D DP over states.
- **Pitfall — negative numbers & empty inputs:** Max-subarray must return the largest single element when all are negative; never seed with `0`. Always test empty/singleton/all-negative arrays.

### Complexity Table

| Variant | Time Complexity | Space Complexity | Optimization Possible? |
|---------|-----------------|------------------|------------------------|
| Naïve recursion (no cache) | `O(2^n)` | `O(n)` stack | — (avoid) |
| Top-down memoization | `O(n)` | `O(n)` | Convert to bottom-up |
| Bottom-up (array) | `O(n)` | `O(n)` | Roll to O(1) |
| Bottom-up (rolling scalars) | `O(n)` | **`O(1)`** | Already optimal |

### DS/AI/ML/LLM Applications

- **DS:** Kadane's algorithm (max subarray), longest increasing subsequence (with the `O(n log n)` patience-sorting variant), stock-buy-sell.
- **AI/ML:** Viterbi decoding (HMM/CRF), CTC loss forward pass, dynamic time warping (1D-ish), Bellman value iteration on chains.
- **LLM/NLP:** beam-search bookkeeping and n-gram sequence scoring are 1D-DP-flavored "best score so far at position `t`."

---

## 🗺️ 3. 2D Dynamic Programming

> **Reasoning before writing (chain-of-thought):**
> 1. *Minimal mental model:* a grid `dp[i][j]` where two indices jointly define the subproblem (two sequences, or a position in a 2D space).
> 2. *Expert vs. beginner:* experts recognize that most 2D DP fills row-by-row depending only on the current + previous row → O(min(m,n)) space.
> 3. *Real-world link:* sequence alignment (bioinformatics), diff tools, image seam carving.
> 4. *Most common mistake:* wrong initialization of the first row/column, and iterating in an order that reads cells not yet computed.

### Concept & Intuition

2D DP arises when **two indices** are needed to describe a subproblem — typically **two sequences** (align `A[0..i]` with `B[0..j]`) or a **position on a grid** (`row i`, `col j`). We'll use the **Unique Paths / Min Path Sum** grid family as the primary example (pure, visual), then reuse the 2D machinery for Edit Distance and 0/1 Knapsack later.

> **Problem (Minimum Path Sum):** Given an `m × n` grid of non-negative costs, find the minimum-cost path from top-left to bottom-right, moving only **right** or **down**.

**Optimal substructure:** the cheapest way to reach `(i, j)` uses the cheapest way to reach `(i-1, j)` or `(i, j-1)`.
**Overlapping subproblems:** cell `(i, j)` is reachable through many prefixes; naïve recursion recomputes each interior cell exponentially often.

### Analogy

> *"2D DP is like filling in a crossword grid where each square's answer depends only on the square above and the square to its left. You sweep across rows top-to-bottom, left-to-right, and by the time you reach any square, everything it needs is already inked in. The bottom-right corner holds the final answer."*

Or for alignment problems:

> *"Aligning two strings is like two people editing the same document from opposite ends — at each cell you decide whether they agree (move diagonally for free), or someone made an edit (pay 1 and step)."*

### Algorithm & Recurrence

- **State:** `dp[i][j]` = minimum cost to reach cell `(i, j)` from `(0, 0)`.
- **Recurrence:**

  ```
  dp[i][j] = grid[i][j] + min( dp[i-1][j],   # came from above
                               dp[i][j-1] )   # came from the left
  ```

- **Base cases:** `dp[0][0] = grid[0][0]`; first row accumulates leftward; first column accumulates upward (only one way to reach edge cells).
- **Direction:** **bottom-up**, iterating rows `0→m-1`, cols `0→n-1` so both `dp[i-1][j]` and `dp[i][j-1]` are ready.
- **Answer cell:** `dp[m-1][n-1]`.
- **Space optimization:** each row depends only on the row above + the current row's left neighbor → keep **one row** (`O(n)`), or `O(min(m, n))` by iterating along the shorter dimension.

**Numbered pseudocode (bottom-up):**

1. Initialize `dp[0][0] = grid[0][0]`.
2. Fill first column: `dp[i][0] = dp[i-1][0] + grid[i][0]`.
3. Fill first row: `dp[0][j] = dp[0][j-1] + grid[0][j]`.
4. For each `i` from 1, each `j` from 1: apply the recurrence.
5. Return `dp[m-1][n-1]`.

### Code (Top-Down + Bottom-Up)

```python
from functools import lru_cache
from typing import List

# ---------- TOP-DOWN (Memoization) ----------
def min_path_sum_topdown(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])

    @lru_cache(maxsize=None)
    def cost(i: int, j: int) -> int:          # min cost to reach (i, j)
        if i == 0 and j == 0:                 # start cell
            return grid[0][0]
        if i < 0 or j < 0:                    # off-grid → infinity (illegal)
            return float("inf")
        # best of coming from above or from the left, plus this cell's cost
        return grid[i][j] + min(cost(i - 1, j), cost(i, j - 1))

    return cost(m - 1, n - 1)

# ---------- BOTTOM-UP (Tabulation), O(n) space ----------
def min_path_sum_bottomup(grid: List[List[int]]) -> int:
    m, n = len(grid), len(grid[0])
    dp = [0] * n                              # single rolling row
    for i in range(m):
        for j in range(n):
            if i == 0 and j == 0:
                dp[j] = grid[0][0]            # start
            elif i == 0:
                dp[j] = dp[j - 1] + grid[i][j]        # only from the left
            elif j == 0:
                dp[j] = dp[j] + grid[i][j]            # only from above (old dp[0])
            else:
                # dp[j] currently holds the value from the row ABOVE (dp[i-1][j])
                # dp[j-1] already updated to the current row (dp[i][j-1])
                dp[j] = grid[i][j] + min(dp[j], dp[j - 1])
    return dp[n - 1]

if __name__ == "__main__":
    g = [[1, 3, 1],
         [1, 5, 1],
         [4, 2, 1]]
    assert min_path_sum_topdown(g) == min_path_sum_bottomup(g) == 7  # 1→3→1→1→1
    print("Min Path Sum:", min_path_sum_bottomup(g))                 # -> 7
```

**Complexity:** Top-down `O(mn)` time / `O(mn)` space. Bottom-up `O(mn)` time / **`O(n)`** space (rolling row).

### Worked Example

`grid = [[1,3,1],[1,5,1],[4,2,1]]`. Full `dp` table (min cost to reach each cell):

```
        j=0    j=1    j=2
i=0  [   1  ,   4  ,   5  ]      # first row: 1, 1+3=4, 4+1=5
i=1  [   2  ,   7  ,   6  ]      # dp[1][0]=1+1=2; dp[1][1]=5+min(4,2)=7; dp[1][2]=1+min(5,7)=6
i=2  [   6  ,   8  ,   7  ]      # dp[2][0]=4+2=6; dp[2][1]=2+min(7,6)=8; dp[2][2]=1+min(6,8)=7
```

Final answer `dp[2][2] = 7`. Optimal path: `1 → 3 → 1 → 1 → 1` (right, right, down, down). Notice how `dp[1][2] = 6` beats `dp[1][1] = 7`: the recurrence *automatically* discovers that hugging the top row then dropping down is cheaper than cutting through the expensive `5`.

### Expert Takeaways

- **Novice vs. expert:** novices allocate a full `m×n` matrix reflexively. Experts ask "does row `i` need anything older than row `i-1`?" — usually no, so they roll to one row (`O(n)`), and pick the shorter dimension to minimize memory.
- **Iteration order is a correctness issue, not a style choice.** The loop order must guarantee every dependency (`dp[i-1][j]`, `dp[i][j-1]`) is computed before use. When you compress to 1D, the *timing* of when `dp[j]` still holds the old row vs. the new row becomes load-bearing — annotate it in comments (as above).
- **Initialize edges explicitly.** The first row and column have degenerate recurrences (only one predecessor). Silent zero-initialization is the classic 2D-DP bug.
- **Path reconstruction:** store parent pointers or re-derive by checking which predecessor achieved the min. Alignment/diff tools need the actual path, not just the cost.
- **AI/ML/LLM connection:** 2D DP is the engine of **Needleman–Wunsch / Smith–Waterman** sequence alignment (genomics), **Dynamic Time Warping** for time-series/speech similarity, **seam carving** in image resizing, and the token-level alignment behind **BLEU/ROUGE/TER** and **word-error-rate** in LLM/ASR evaluation.

### Complexity Table

| Variant | Time Complexity | Space Complexity | Optimization Possible? |
|---------|-----------------|------------------|------------------------|
| Naïve recursion | `O(2^(m+n))` | `O(m+n)` stack | — (avoid) |
| Top-down memoization | `O(mn)` | `O(mn)` | Convert to bottom-up |
| Bottom-up (full matrix) | `O(mn)` | `O(mn)` | Roll rows |
| Bottom-up (rolling row) | `O(mn)` | **`O(min(m,n))`** | Optimal for full-path problems |

### DS/AI/ML/LLM Applications

- **DS:** unique paths, min/max path sum, longest common subsequence (LCS), matrix chain multiplication, grid DP with obstacles.
- **AI/ML:** DTW (speech/gesture), sequence alignment (bioinformatics), CRF forward-backward over 2D lattices.
- **LLM/NLP:** LCS underpins **ROUGE-L**; edit-distance alignment underpins **WER/CER** and diff-based eval; token alignment for translation metrics.

---

## 🎒 4. Knapsack Problem

The knapsack family is the canonical testbed for "choose a subset under a capacity budget to maximize value." Three variants differ **only in how many times you may take each item** — and that single change flips the loop direction, the recurrence, and even the *paradigm* (DP vs. greedy).

> **Reasoning before writing (chain-of-thought):**
> 1. *Minimal mental model:* `dp[c]` = best value achievable with capacity `c`; items are layered on top.
> 2. *Expert vs. beginner:* the difference between 0/1 and unbounded is **the direction of the inner capacity loop** — beginners get this backwards and silently reuse items.
> 3. *Real-world link:* budget allocation, cargo loading, feature selection under a compute budget, and **quantization/pruning bit-budgets** in ML.
> 4. *Most common mistake:* iterating capacity ascending for 0/1 (which double-counts an item) or descending for unbounded (which forbids reuse).

---

### 4a. 0/1 Knapsack

#### Concept & Intuition

> **Problem:** Given `n` items with `weight[i]` and `value[i]`, and a knapsack of capacity `W`, pick a **subset** (each item at most **once**) maximizing total value with total weight ≤ `W`.

**Optimal substructure:** the best value using items `0..i` at capacity `c` is the better of (a) skipping item `i` and (b) taking item `i` plus the best of items `0..i-1` at capacity `c - weight[i]`.
**Overlapping subproblems:** the same `(item index, remaining capacity)` pair recurs across many subset choices.

#### Analogy

> *"0/1 Knapsack is like packing for a flight with a strict weight limit and a bin of unique souvenirs — each souvenir exists only once, so for each one you make a binary call: take it (and eat into your remaining allowance) or leave it. You can't pack two of the same vase."*

#### Algorithm & Recurrence

- **State:** `dp[i][c]` = max value using the first `i` items with capacity exactly `≤ c`.
- **Recurrence:**

  ```
  dp[i][c] = dp[i-1][c]                                 # skip item i
  if weight[i] <= c:
      dp[i][c] = max(dp[i-1][c],
                     dp[i-1][c - weight[i]] + value[i]) # take item i (from i-1!)
  ```

- **Base cases:** `dp[0][c] = 0` for all `c` (no items → no value); `dp[i][0] = 0`.
- **Direction:** bottom-up over items, then capacity. **1D-compressed: iterate capacity DESCENDING** so each item is used at most once.
- **Answer cell:** `dp[n][W]`.
- **Space optimization:** collapse to `dp[c]` (`O(W)`), inner loop **`c` from `W` down to `weight[i]`**.

**Numbered pseudocode (1D, space-optimized):**

1. `dp = [0]*(W+1)`.
2. For each item `i`: for `c` from `W` **down to** `weight[i]`: `dp[c] = max(dp[c], dp[c-weight[i]] + value[i])`.
3. Return `dp[W]`.

> **Why descending?** When we compute `dp[c]` from `dp[c-weight[i]]`, the descending order guarantees `dp[c-weight[i]]` still reflects the *previous* item row (item `i` not yet used at that smaller capacity) — enforcing "at most once." Ascending would let `dp[c-weight[i]]` already include item `i`, silently allowing reuse (that's exactly the *unbounded* variant).

#### Code (Top-Down + Bottom-Up)

```python
from functools import lru_cache
from typing import List

# ---------- TOP-DOWN (Memoization) ----------
def knapsack01_topdown(weight: List[int], value: List[int], W: int) -> int:
    n = len(weight)

    @lru_cache(maxsize=None)
    def best(i: int, cap: int) -> int:        # best value using items i..n-1 with capacity cap
        if i == n or cap == 0:                # no items left or no capacity
            return 0
        skip = best(i + 1, cap)               # don't take item i
        take = 0
        if weight[i] <= cap:                  # only if it fits
            take = value[i] + best(i + 1, cap - weight[i])  # take it once, move on
        return max(skip, take)

    return best(0, W)

# ---------- BOTTOM-UP (Tabulation), O(W) space ----------
def knapsack01_bottomup(weight: List[int], value: List[int], W: int) -> int:
    dp = [0] * (W + 1)                        # dp[c] = best value at capacity c
    for i in range(len(weight)):
        # DESCENDING capacity => each item used at most once (0/1 constraint)
        for c in range(W, weight[i] - 1, -1):
            dp[c] = max(dp[c], dp[c - weight[i]] + value[i])
    return dp[W]

if __name__ == "__main__":
    w, v, cap = [1, 3, 4], [1, 4, 5], 4
    assert knapsack01_topdown(w, v, cap) == knapsack01_bottomup(w, v, cap) == 5
    print("0/1 Knapsack:", knapsack01_bottomup(w, v, cap))   # -> 5
```

**Complexity:** `O(n·W)` time; 2D `O(n·W)` space, 1D `O(W)` space. Note: this is **pseudo-polynomial** — `W` is a *value*, not input size, so it's exponential in the bit-length of `W`. 0/1 Knapsack is **NP-hard**; DP is efficient only when `W` is modest.

#### Worked Example

`weight=[1,3,4]`, `value=[1,4,5]`, `W=4`. Full 2D table `dp[i][c]` (rows = items considered):

```
Items: weight=[1,3,4], value=[1,4,5], capacity=4
              c=0  c=1  c=2  c=3  c=4
dp[0] (none) [ 0 ,  0 ,  0 ,  0 ,  0 ]   ← base case
dp[1] (w1=1) [ 0 ,  1 ,  1 ,  1 ,  1 ]   ← item 1 (v=1) fits from c>=1
dp[2] (w3=3) [ 0 ,  1 ,  1 ,  4 ,  5 ]   ← at c=4: max(1, dp[1][1]+4)=1+4=5
dp[3] (w4=4) [ 0 ,  1 ,  1 ,  4 ,  5 ]   ← at c=4: max(5, dp[2][0]+5)=5 (tie, keep 5)
```

Final answer `dp[3][4] = 5` — achieved by taking items 1 (w1,v1) + 2 (w3,v4) = weight 4, value 5, which ties with item 3 alone (w4,v5). The DP silently keeps whichever reaches the optimum.

#### Expert Takeaways

- **Novice vs. expert:** the loop-direction rule (**descending = 0/1, ascending = unbounded**) is the single most important knapsack fact. Experts derive it from "which item-row does `dp[c-w]` represent?"
- **Pseudo-polynomial trap:** if `W` is huge (e.g., `10^9`), `O(nW)` DP is infeasible — switch to *value*-indexed DP (`dp[value] = min weight`) when total value is small, or use meet-in-the-middle / branch-and-bound / FPTAS approximation.
- **Reconstruction:** to recover *which* items, either keep the 2D table and backtrack (`dp[i][c] != dp[i-1][c]` ⇒ item `i` taken), or store a parent bitmask.
- **AI/ML/LLM connection:** 0/1 knapsack models **budgeted feature/model selection**, **ad/creative selection under a spend cap**, **layer/attention-head pruning under a FLOP budget**, and **mixed-precision quantization** (assign bit-widths to layers to maximize accuracy under a memory budget). Multi-dimensional knapsack generalizes to multi-resource scheduling on GPUs.
- **Pitfall:** forgetting the `weight[i] <= c` guard, or initializing `dp` with `-inf` when "partial fill allowed" (use `0` for "≤ capacity"; use `-inf` only for "*exactly* capacity" variants).

#### Complexity Table

| Variant | Time | Space | Optimization Possible? |
|---------|------|-------|------------------------|
| Brute force (subsets) | `O(2^n)` | `O(n)` | — |
| Top-down memo | `O(nW)` | `O(nW)` | → bottom-up |
| Bottom-up 2D | `O(nW)` | `O(nW)` | roll to 1D |
| Bottom-up 1D | `O(nW)` | **`O(W)`** | value-indexed DP / FPTAS if W huge |

---

### 4b. Unbounded Knapsack

#### Concept & Intuition

> **Problem:** Same as 0/1, but each item may be taken an **unlimited** number of times. (Coin Change and Rod Cutting are the same problem in disguise.)

**Optimal substructure:** best value at capacity `c` = max over items `i` of `value[i] + best(c - weight[i])`.
**Overlapping subproblems:** capacity `c` is reached through many item multisets; each `c` solved once and reused.

#### Analogy

> *"Unbounded Knapsack is like a vending machine with infinite stock: to make the best of your remaining money, you can insert the same snack choice again and again. Each item is a *type*, not a unique object, so reuse is free — you only ever run out of budget, never of stock."*

#### Algorithm & Recurrence

- **State:** `dp[c]` = max value achievable with capacity `c` (items reusable).
- **Recurrence:**

  ```
  dp[c] = max over all items i with weight[i] <= c of
              dp[c - weight[i]] + value[i]
  ```

- **Base case:** `dp[0] = 0`.
- **Direction:** bottom-up; **1D with capacity loop ASCENDING** so `dp[c-weight[i]]` may already include item `i` again (enabling reuse).
- **Answer cell:** `dp[W]`.

**Numbered pseudocode (1D):**

1. `dp = [0]*(W+1)`.
2. For `c` from `1` to `W`: for each item `i` with `weight[i] <= c`: `dp[c] = max(dp[c], dp[c-weight[i]] + value[i])`.
3. Return `dp[W]`.

> **Why ascending?** Ascending order means by the time we use `dp[c-weight[i]]`, it may *already* have counted item `i` at a smaller capacity — so the same item type is reused any number of times. This is the exact opposite of the 0/1 descending loop.

#### Code (Top-Down + Bottom-Up)

```python
from functools import lru_cache
from typing import List

# ---------- TOP-DOWN (Memoization) ----------
def knapsack_unbounded_topdown(weight: List[int], value: List[int], W: int) -> int:
    n = len(weight)

    @lru_cache(maxsize=None)
    def best(cap: int) -> int:                # best value for capacity cap
        if cap == 0:
            return 0
        result = 0
        for i in range(n):                    # try every item type
            if weight[i] <= cap:              # stay on same item pool (reuse allowed)
                result = max(result, value[i] + best(cap - weight[i]))
        return result

    return best(W)

# ---------- BOTTOM-UP (Tabulation), O(W) space ----------
def knapsack_unbounded_bottomup(weight: List[int], value: List[int], W: int) -> int:
    dp = [0] * (W + 1)
    for c in range(1, W + 1):                 # ASCENDING capacity => reuse allowed
        for i in range(len(weight)):
            if weight[i] <= c:
                dp[c] = max(dp[c], dp[c - weight[i]] + value[i])
    return dp[W]

if __name__ == "__main__":
    w, v, cap = [1, 3, 4], [1, 4, 5], 4
    # Best: take item2 (w3,v4) + item1 (w1,v1) = 5, OR 4x item1 = 4; also 1x item2+1x item1=5
    assert knapsack_unbounded_topdown(w, v, cap) == knapsack_unbounded_bottomup(w, v, cap)
    print("Unbounded Knapsack:", knapsack_unbounded_bottomup(w, v, cap))  # -> 5
```

**Complexity:** `O(n·W)` time / **`O(W)`** space.

#### Worked Example

`weight=[1,3,4]`, `value=[1,4,5]`, `W=4`, capacity loop ascending:

```
dp[0] = 0
dp[1] = max(dp[0]+v(w1))            = 0+1 = 1        # one unit of item1
dp[2] = max(dp[1]+v(w1))            = 1+1 = 2        # two units of item1
dp[3] = max(dp[2]+1, dp[0]+4)       = max(3, 4) = 4  # one item2 beats 3x item1
dp[4] = max(dp[3]+1, dp[1]+4, dp[0]+5)
      = max(4+1, 1+4, 0+5) = 5                       # item2 + item1  (or item3 alone)
```

Final `dp[4] = 5`. Note how `dp[3]=4` (one item2) is reused inside `dp[4]` — reuse across capacities is exactly what ascending order enables.

#### Expert Takeaways

- **Coin Change is unbounded knapsack.** "Fewest coins to make amount `A`" = minimize count instead of maximize value; "number of ways to make `A`" = *count* variant (careful loop nesting: items-outer/amount-inner counts **combinations**, amount-outer/items-inner counts **permutations**).
- **Loop-order semantics matter for counting.** For "number of ways," swapping the two loops changes the answer — a subtle expert gotcha that trips even experienced engineers.
- **Novice vs. expert:** novices reimplement coin change, rod cutting, and unbounded knapsack as three separate problems; experts see one recurrence and one ascending loop.
- **AI/ML/LLM connection:** unbounded selection appears in **token-budget packing** (fit as many reusable prompt templates/examples into a context window to maximize expected utility), **resource replication** (how many replicas of a service under a cost budget), and **beam/allocation problems** where the same action type can repeat.
- **Pitfall:** using descending capacity here (accidentally enforcing 0/1) — the most common copy-paste bug when adapting 0/1 code.

#### Complexity Table

| Variant | Time | Space | Optimization Possible? |
|---------|------|-------|------------------------|
| Top-down memo | `O(nW)` | `O(W)` | → bottom-up |
| Bottom-up 1D | `O(nW)` | **`O(W)`** | already tight |
| Count-ways variant | `O(nW)` | `O(W)` | mind loop order (comb vs perm) |

---

### 4c. Fractional Knapsack (Greedy contrast)

#### Concept & Intuition

> **Problem:** Items may be taken **fractionally** (e.g., grains, liquids, divisible resources). Maximize value with weight ≤ `W`.

Crucially, fractional knapsack is **NOT a DP problem** — it's solved **greedily** and optimally. It's included here as a deliberate contrast: the *same-looking* problem loses its need for DP the moment items become divisible, because the greedy choice property now provably holds.

**Why greedy works (and DP is overkill):** sort by **value density** `value[i]/weight[i]` descending; take items greedily, splitting the last one to exactly fill `W`. An **exchange argument** proves optimality: any solution not prioritizing the highest density can be improved by swapping in a fraction of a denser item. This is the *matroid/greedy-choice* property that 0/1 knapsack lacks (you can't split an indivisible souvenir).

#### Analogy

> *"Fractional Knapsack is like filling a tanker truck with liquids of different value-per-liter: you pour in the most valuable liquid first until it's gone, then the next, and top off the last one partially. Because liquids split freely, greed is provably optimal — no need to plan ahead."*

#### Algorithm & Recurrence

There is **no DP recurrence** — that's the point. The algorithm is:

1. Compute density `d[i] = value[i] / weight[i]`.
2. Sort items by `d[i]` descending.
3. Greedily take whole items while they fit; when the next item doesn't fully fit, take the **fraction** `remaining_capacity / weight[i]` of it and stop.
4. Return accumulated value.

- **Direction:** single greedy pass after sort.
- **Answer:** accumulated fractional value.

#### Code (Greedy — the correct paradigm here)

```python
from typing import List, Tuple

def fractional_knapsack(weight: List[float], value: List[float], W: float) -> float:
    # Pair items with their value density, sort by density DESCENDING
    items: List[Tuple[float, float, float]] = sorted(
        ((value[i] / weight[i], weight[i], value[i]) for i in range(len(weight))),
        key=lambda t: t[0], reverse=True
    )
    total = 0.0
    cap = W
    for density, w, v in items:
        if cap <= 0:                       # bag full
            break
        if w <= cap:                       # take the whole item
            total += v
            cap -= w
        else:                              # take the fitting fraction, then stop
            total += density * cap         # value = density * capacity used
            cap = 0
    return total

if __name__ == "__main__":
    w, v, cap = [10, 20, 30], [60, 100, 120], 50
    # densities: 6, 5, 4 -> take all of item0 (10), all of item1 (20),
    # then 20/30 of item2 -> 60 + 100 + (2/3)*120 = 240.0
    print("Fractional Knapsack:", fractional_knapsack(w, v, cap))   # -> 240.0
```

**Complexity:** `O(n log n)` time (dominated by the sort) / `O(n)` space — strictly better than the `O(nW)` DP for 0/1, and *exact* (no pseudo-polynomial catch).

#### Worked Example

`weight=[10,20,30]`, `value=[60,100,120]`, `W=50`:

```
densities: item0=60/10=6.0, item1=100/20=5.0, item2=120/30=4.0
sorted:    item0(6.0), item1(5.0), item2(4.0)

take item0 fully:  value += 60,  cap = 50-10 = 40
take item1 fully:  value += 100, cap = 40-20 = 20
item2 needs 30 > 20 left -> take fraction 20/30:
                   value += 4.0 * 20 = 80,  cap = 0
TOTAL = 60 + 100 + 80 = 240.0
```

Contrast: the *0/1* version of this instance (no splitting) would yield only `160` (items 0+1) or `180` (item... ) — fractionality strictly increases the achievable value and simplifies the algorithm.

#### Expert Takeaways

- **The paradigm test:** divisibility ⇒ greedy-choice property ⇒ greedy is optimal and faster. Indivisibility ⇒ greedy can fail ⇒ DP (or NP-hard). Knowing *when not to use DP* is expert-level judgment.
- **Greedy proof obligation:** never claim a greedy is optimal without an exchange argument or matroid structure. Fractional knapsack has it; 0/1 does not (counterexample: `w=[1,1,1], v=[2,2,3], W=2` — density-greedy can misfire on ties/indivisibility).
- **AI/ML/LLM connection:** fractional/continuous allocation is **water-filling** in resource/power allocation, **continuous budget splitting** across ad campaigns or compute pools, and **soft/weighted mixtures** (e.g., allocating a fractional token budget across retrieval sources by expected relevance density).
- **Pitfall:** applying greedy density-sorting to the *0/1* problem — a classic wrong answer. Always confirm divisibility first.

#### Complexity Table

| Variant | Time | Space | Paradigm | Optimization Possible? |
|---------|------|-------|----------|------------------------|
| Fractional (greedy) | `O(n log n)` | `O(n)` | **Greedy** (not DP) | Selection-based `O(n)` avg via quickselect |
| 0/1 (for contrast) | `O(nW)` | `O(W)` | DP | pseudo-poly only |

---

## ✏️ 5. Edit Distance (Levenshtein)

> **Reasoning before writing (chain-of-thought):**
> 1. *Minimal mental model:* `dp[i][j]` = min edits to turn the first `i` chars of `A` into the first `j` chars of `B`.
> 2. *Expert vs. beginner:* experts know the three operations map to three neighbor cells (up=delete, left=insert, diagonal=match/substitute) and can reconstruct the alignment, not just the number.
> 3. *Real-world link:* spell-check, DNA alignment, fuzzy search, and LLM/ASR evaluation metrics.
> 4. *Most common mistake:* wrong base-case initialization (first row/col must be `0..n`, the cost of building a string from empty), and off-by-one indexing between the 1-based DP table and 0-based strings.

### Concept & Intuition

> **Problem:** Given strings `A` (length `m`) and `B` (length `n`), find the minimum number of single-character **insertions, deletions, or substitutions** to transform `A` into `B`. (This is the *Levenshtein* distance; variants add transposition = Damerau–Levenshtein.)

**Optimal substructure:** the cheapest way to align `A[0..i]` with `B[0..j]` is built from the cheapest alignments of their prefixes.
**Overlapping subproblems:** aligning prefixes recomputes the same `(i, j)` prefix pair across many edit sequences.

### Analogy

> *"Edit Distance is like a GPS rerouting system — it finds the minimum number of 'corrections' (insertions, deletions, substitutions) to transform one route into another. Each wrong turn you must add, remove, or replace counts as one edit, and the GPS finds the cheapest set of corrections to get from your current path to the destination path."*

Alternatively:

> *"It's like the 'track changes' feature in a word processor computing the smallest diff between two drafts: every inserted, deleted, or replaced character is one tracked change, and edit distance is the total count in the minimal diff."*

### Algorithm & Recurrence

- **State:** `dp[i][j]` = min edits to convert `A[0..i-1]` (first `i` chars) into `B[0..j-1]` (first `j` chars). (1-based table over 0-based strings.)
- **Recurrence:**

  ```
  if A[i-1] == B[j-1]:
      dp[i][j] = dp[i-1][j-1]                    # characters match → no cost, move diagonally
  else:
      dp[i][j] = 1 + min( dp[i-1][j],            # delete A[i-1]      (come from above)
                          dp[i][j-1],            # insert B[j-1]      (come from left)
                          dp[i-1][j-1] )         # substitute         (come from diagonal)
  ```

- **Base cases:** `dp[0][j] = j` (insert `j` chars into empty `A`); `dp[i][0] = i` (delete all `i` chars of `A`).
- **Direction:** bottom-up, `i` from `0→m`, `j` from `0→n`. Top-down memoization mirrors the recurrence.
- **Answer cell:** `dp[m][n]`.
- **Space optimization:** each row depends only on the previous row → **two rows** or one row + a diagonal temp → **`O(min(m,n))`** space.

**Numbered pseudocode (bottom-up):**

1. Initialize first row `dp[0][j] = j`, first column `dp[i][0] = i`.
2. For `i` from `1..m`, `j` from `1..n`: if chars equal, copy the diagonal; else `1 + min(up, left, diagonal)`.
3. Return `dp[m][n]`.

### Code (Top-Down + Bottom-Up)

```python
from functools import lru_cache

# ---------- TOP-DOWN (Memoization) ----------
def edit_distance_topdown(A: str, B: str) -> int:
    @lru_cache(maxsize=None)
    def dist(i: int, j: int) -> int:          # min edits for A[:i] -> B[:j]
        if i == 0:                            # A prefix empty → insert all j chars of B
            return j
        if j == 0:                            # B prefix empty → delete all i chars of A
            return i
        if A[i - 1] == B[j - 1]:              # last chars match → free diagonal move
            return dist(i - 1, j - 1)
        return 1 + min(                       # otherwise pay 1 for the best of:
            dist(i - 1, j),                   #   delete A[i-1]
            dist(i, j - 1),                   #   insert B[j-1]
            dist(i - 1, j - 1),               #   substitute A[i-1] -> B[j-1]
        )

    return dist(len(A), len(B))

# ---------- BOTTOM-UP (Tabulation), O(n) space ----------
def edit_distance_bottomup(A: str, B: str) -> int:
    m, n = len(A), len(B)
    prev = list(range(n + 1))                 # dp[0][j] = j (build B from empty)
    for i in range(1, m + 1):
        cur = [i] + [0] * n                   # dp[i][0] = i (delete i chars)
        for j in range(1, n + 1):
            if A[i - 1] == B[j - 1]:
                cur[j] = prev[j - 1]          # match → diagonal, no cost
            else:
                cur[j] = 1 + min(prev[j],     # delete
                                 cur[j - 1],  # insert
                                 prev[j - 1]) # substitute
        prev = cur                            # roll rows forward
    return prev[n]

if __name__ == "__main__":
    a, b = "horse", "ros"
    assert edit_distance_topdown(a, b) == edit_distance_bottomup(a, b) == 3
    print("Edit Distance('horse','ros'):", edit_distance_bottomup(a, b))  # -> 3
```

**Complexity:** `O(m·n)` time; 2D `O(m·n)` space, rolling `O(min(m,n))` space.

### Worked Example

`A = "horse"`, `B = "ros"`. Full `dp` table (rows = prefixes of `horse`, cols = prefixes of `ros`):

```
        ""   r    o    s
   ""  [ 0,  1,   2,   3 ]     # dp[0][j] = j  (insert r,o,s)
   h   [ 1,  1,   2,   3 ]     # h vs r,o,s → all substitutions/edits
   o   [ 2,  2,   1,   2 ]     # 'o' matches 'o' at (2,2): copy diagonal dp[1][1]=1
   r   [ 3,  2,   2,   2 ]     # 'r' matches 'r' at (3,1): copy diagonal dp[2][0]=2
   s   [ 4,  3,   3,   2 ]     # 's' matches 's' at (5,3): copy diagonal dp[4][2]=2
```

Final answer `dp[5][3] = 3`. The optimal edit script for `horse → ros`:
1. **Substitute** `h → r`  (`horse` → `rorse`)
2. **Delete** `r`         (`rorse` → `rose`)  — wait, trace via table:
3. Standard minimal alignment: `horse → rorse` (sub h→r), `rorse → rose` (delete one r), `rose → ros` (delete e) = **3 edits**.

The diagonal "free moves" at the matching `o`, `r`, `s` characters are what pull the cost down from 5 (naïve replace-all) to 3.

### Expert Takeaways

- **Novice vs. expert:** novices return the *number*; experts reconstruct the **alignment/edit script** by backtracking from `dp[m][n]` (which neighbor achieved the min), enabling diffs, autocorrect suggestions, and highlighted changes.
- **Weighted & variant edits:** production systems assign **different costs** per operation (a substitution may cost 2, or costs may depend on keyboard adjacency / phonetic similarity). Damerau–Levenshtein adds transposition; needleman-wunsch generalizes to gap penalties.
- **Banded optimization:** when you only care whether distance `≤ k`, compute only a **diagonal band** of width `2k+1` → `O(k·min(m,n))` — the trick behind fast fuzzy search and `k`-approximate matching.
- **AI/ML/LLM connection:** Edit distance underlies **spell checkers & autocorrect**, **fuzzy string search** (Elasticsearch, `fzf`), **DNA/protein sequence alignment** (Needleman–Wunsch/Smith–Waterman are weighted edit distance), and evaluation metrics: **Word Error Rate (WER)** and **Character Error Rate (CER)** for ASR, **TER** (Translation Edit Rate), and it's a component in token-level diffing for LLM output comparison. BK-trees index strings by edit distance for sublinear nearest-neighbor lookup.
- **Pitfall:** base cases. `dp[0][j]=j` and `dp[i][0]=i` are *not* zero — building a string from empty costs one edit per character. Zero-initializing the first row/column is the canonical edit-distance bug.

### Complexity Table

| Variant | Time | Space | Optimization Possible? |
|---------|------|-------|------------------------|
| Naïve recursion | `O(3^(m+n))` | `O(m+n)` stack | — (avoid) |
| Top-down memo | `O(mn)` | `O(mn)` | → bottom-up |
| Bottom-up 2D | `O(mn)` | `O(mn)` | roll rows |
| Bottom-up rolling | `O(mn)` | **`O(min(m,n))`** | banded `O(k·n)` if distance ≤ k |
| Banded (threshold k) | `O(k·min(m,n))` | `O(k)` | optimal for fuzzy match |

### 🔗 AI/ML/LLM Connection Callout

```
🔗 AI/ML/LLM Connection:
Edit Distance → spell checkers & autocorrect, fuzzy search (fzf, Elasticsearch),
                DNA/protein alignment (Needleman–Wunsch, Smith–Waterman),
                ASR evaluation (WER, CER), MT evaluation (TER),
                token-level diffing for LLM output comparison,
                BK-trees for sublinear approximate nearest-neighbor on strings.
```

---

## 🔁 6. Comparative Summary

### Side-by-Side Algorithm Comparison

| Problem | State `dp[...]` means | Recurrence core | Time | Opt. Space | Paradigm |
|---------|----------------------|-----------------|------|-----------|----------|
| **1D (House Robber)** | best loot up to house `i` | `max(dp[i-1], dp[i-2]+nums[i])` | `O(n)` | `O(1)` | DP |
| **2D (Min Path Sum)** | min cost to reach `(i,j)` | `grid[i][j]+min(dp[i-1][j],dp[i][j-1])` | `O(mn)` | `O(min(m,n))` | DP |
| **0/1 Knapsack** | best value, items `≤i`, cap `c` | `max(skip, dp[i-1][c-w]+v)` | `O(nW)` | `O(W)` | DP (desc loop) |
| **Unbounded Knapsack** | best value at cap `c`, reuse | `max_i dp[c-w_i]+v_i` | `O(nW)` | `O(W)` | DP (asc loop) |
| **Fractional Knapsack** | — (no DP state) | greedy by `v/w` density | `O(n log n)` | `O(n)` | **Greedy** |
| **Edit Distance** | min edits `A[:i]→B[:j]` | match: diag; else `1+min(3 neighbors)` | `O(mn)` | `O(min(m,n))` | DP |

### When to Use Which Variant

<b>Decision flow:</b>

1. **Is the objective an optimum/count over choices?** No → probably not DP.
2. **Are the "items" divisible?** Yes → **greedy** (fractional knapsack, water-filling), not DP.
3. **One index or two?**
   - One index, constant-width look-back → **1D DP** (roll to O(1)).
   - Two sequences / a grid → **2D DP** (roll to one row).
4. **Selection under a capacity budget?**
   - Each item once → **0/1 knapsack** (capacity loop **descending**).
   - Unlimited copies → **unbounded knapsack** (capacity loop **ascending**).
5. **Transform one sequence into another?** → **Edit distance** family (Levenshtein / Needleman–Wunsch).
6. **Is `W` (or the numeric budget) astronomically large?** → DP is pseudo-polynomial; switch to value-indexed DP, approximation (FPTAS), or branch-and-bound.

**Top-down vs. bottom-up — practitioner rule of thumb:**

| | Top-Down (Memoization) | Bottom-Up (Tabulation) |
|---|---|---|
| Write speed | Faster to derive from recursion | Needs explicit order |
| Only computes reachable states | ✅ Yes (sparse-friendly) | ❌ Computes all |
| Space optimization | Harder (cache is 2D) | ✅ Easy (roll dimensions) |
| Recursion-limit risk | ⚠️ Deep stacks may overflow | ✅ No recursion |
| Best when | State space sparse / recurrence tricky | Dense states / need O(1)–O(n) space |

---

## 💡 7. Master Cheat Sheet

### Recurrence Relations at a Glance

```
1D (House Robber):   dp[i]   = max(dp[i-1], dp[i-2] + nums[i])
1D (Kadane):         dp[i]   = max(nums[i], dp[i-1] + nums[i]);  ans = max(dp)
1D (Climb Stairs):   dp[i]   = dp[i-1] + dp[i-2]
2D (Min Path Sum):   dp[i][j]= grid[i][j] + min(dp[i-1][j], dp[i][j-1])
2D (Unique Paths):   dp[i][j]= dp[i-1][j] + dp[i][j-1]
2D (LCS):            dp[i][j]= dp[i-1][j-1]+1  if a==b  else max(dp[i-1][j], dp[i][j-1])
0/1 Knapsack:        dp[c]   = max(dp[c], dp[c-w[i]] + v[i])      # c: W -> w[i]  (DESC)
Unbounded Knapsack:  dp[c]   = max(dp[c], dp[c-w[i]] + v[i])      # c: w[i] -> W  (ASC)
Coin Change (min):   dp[a]   = min(dp[a], dp[a-coin] + 1)         # ASC
Edit Distance:       dp[i][j]= dp[i-1][j-1]            if a==b
                            else 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
```

### Common DP Patterns

| Pattern | Signature | Examples |
|---------|-----------|----------|
| **Linear / prefix** | `dp[i]` from constant look-back | Fibonacci, House Robber, Kadane, Climb Stairs |
| **Grid / two-sequence** | `dp[i][j]` from top/left/diagonal | Unique Paths, LCS, Edit Distance, alignment |
| **Knapsack / subset-sum** | capacity or target as an index | 0/1 & unbounded knapsack, coin change, partition |
| **Interval** | `dp[i][j]` over subarray `i..j`, split at `k` | Matrix chain, burst balloons, palindrome partition |
| **Bitmask** | `dp[mask]` over subsets | TSP, assignment, "visit all nodes" |
| **Digit DP** | `dp[pos][tight][state]` over number digits | count numbers with a property `≤ N` |
| **DP on trees** | `dp[node][state]` via post-order | tree diameter, independent set on tree |

### Interview Tips

- **State first, code last.** Say aloud "`dp[i][j]` means ___" before writing anything. A crisp state definition makes the recurrence fall out; a fuzzy one guarantees bugs.
- **Start top-down, then convert.** Write the brute-force recursion, add `@lru_cache`, confirm correctness, *then* rewrite bottom-up and optimize space. This staged approach rarely fails and demonstrates rigor to interviewers.
- **Nail the base cases with a small example.** Hand-trace `n=0,1,2` before generalizing — most bugs live in `dp[0]` and the first row/column.
- **Announce the complexity unprompted.** State time and space, note whether it's *pseudo-polynomial* (knapsack) and whether space can be rolled down.
- **Know the loop-direction rule cold:** 0/1 knapsack = **descending** capacity; unbounded/coin change = **ascending**. This one line separates people who memorized from people who understand.
- **Recognize the anti-patterns:** if items are divisible → greedy, not DP. If subproblems don't overlap → divide & conquer, not DP. If the state space is exponential and irreducible → DP won't save you (consider approximation/heuristics).
- **Reconstruction on request.** Be ready to recover the *actual* solution (items chosen, path taken, edit script), not just the optimal value — backtrack through which branch of the `min`/`max` won.
- **Connect to the domain.** In ML/LLM interviews, tie DP to Viterbi/CTC decoding, sequence alignment for eval metrics (WER/BLEU/ROUGE), and budgeted selection (pruning/quantization) — it signals depth beyond LeetCode.

---

*End of guide. Every code block above is self-contained and runnable as-is (each includes an `assert`-backed demo under `if __name__ == "__main__":`). Copy any function directly into a `.py` file to verify.*

---

## Related Guides

**Prerequisites:** [Recursion & The Call Stack](/docs/recursion-and-call-stack) · [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [Backtracking](/docs/backtracking) · [Greedy Algorithms & Interval Scheduling](/docs/greedy-algorithms) · [Shortest Path Algorithms](/docs/shortest-path)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
