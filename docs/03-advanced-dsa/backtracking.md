---
title: Backtracking
slug: /backtracking
sidebar_position: 1
sidebar_label: Backtracking
description: >-
  Systematic depth-first exploration of a decision tree that prunes dead branches early and undoes each choice.
tags:
  - backtracking
  - recursion
  - search
difficulty: advanced
reading_time: 26
prerequisites:
  - title: Recursion & The Call Stack
    to: /docs/recursion-and-call-stack
  - title: BFS & DFS Traversal
    to: /docs/bfs-dfs
pagination_prev: 02-core-dsa/hashing-patterns
pagination_next: 03-advanced-dsa/dynamic-programming
path_step: 16
---

# Backtracking — The Ultimate Reference Guide

> **TL;DR (whole document):** Backtracking is systematic, depth-first exploration of a decision tree that **prunes dead branches early** and **undoes** each choice before trying the next. Master three archetypes — **Subsets** (include/exclude), **Permutations** (order matters), **Constraint Search** (place-under-rules) — and you can attack most combinatorial problems. The same idea powers AI planning, CSP solvers, hyperparameter/architecture search, and constrained LLM decoding.

---

## 1. What Is Backtracking?

> **TL;DR:** Backtracking = brute force with a conscience. It builds a solution incrementally, abandons ("prunes") any partial candidate the moment it cannot possibly lead to a valid answer, and rewinds to try the next option.

### 1.1 Definition

**Backtracking** is an algorithmic paradigm that solves problems by incrementally constructing candidate solutions and **abandoning a candidate ("backtracking") as soon as it determines the candidate cannot be extended to a valid solution**. It performs a **depth-first traversal** of an implicit **state-space tree**, where:

- each **node** is a *partial solution* (a sequence of choices made so far),
- each **edge** is a single **choice** (a decision that extends the partial solution),
- each **leaf** is either a *complete solution* or a *dead end*.

The defining feature — and the reason it beats naive enumeration — is **pruning**: a `is_valid` / `is_promising` check that eliminates entire subtrees before they are explored. If a partial candidate already violates a constraint, every completion of it is invalid too, so the whole subtree is skipped.

Formally, backtracking explores the set of all candidate solutions organized as a tree, and uses two predicates:

- `reject(partial)` — true if `partial` cannot possibly be completed to a valid solution (enables pruning).
- `accept(partial)` — true if `partial` is itself a complete, valid solution (record it).

💡 **Insight:** The power of backtracking is not that it enumerates — it is that it *refuses to enumerate* subtrees that are provably hopeless. A problem with `2^40` candidates can become tractable if constraints prune 99.9% of branches near the root.

### 1.2 Core Analogy

> *"Backtracking is like exploring a maze with a ball of string and an eraser. You commit to a corridor, unspooling string as you go. The moment you hit a wall (a dead end), you don't teleport randomly — you reel the string back to the last junction (undo your last choice) and take the next unexplored corridor. You never re-walk a corridor you've fully explored, and you never wander into a passage you can already see is bricked up."*

A second, equally useful mental model is the **decision tree with an eraser**: you descend a branch making choices, and when a branch fails you **erase your pencil marks** back up to the last decision point and try the next branch. The "eraser" is the crucial `unchoose` step — without it, state from a failed branch contaminates the next one.

### 1.3 Comparison with Related Techniques

| Technique | Core idea | Explores | Undoes choices? | Prunes? | When it wins |
| --- | --- | --- | --- | --- | --- |
| **Brute force** | Enumerate *all* candidates, then test | Entire space, blindly | No (regenerates) | ❌ No | Tiny spaces; baseline correctness |
| **Backtracking** | Build incrementally, prune invalid partials, undo | State-space tree, DFS | ✅ Yes | ✅ Yes (constraint-based) | Combinatorial search with checkable constraints |
| **Dynamic programming** | Solve & **memoize overlapping subproblems** | DAG of subproblems | N/A | Via reuse, not pruning | **Optimal substructure + overlapping subproblems** |
| **Greedy** | Make the locally optimal choice, never reconsider | A single root-to-leaf path | ❌ No (never revisits) | N/A | **Greedy-choice property** holds (e.g. MST, Huffman) |
| **Branch & Bound** | Backtracking + a **bound function** to prune by objective value | State-space tree, best-first/DFS | ✅ Yes | ✅ Yes (bound-based) | **Optimization** over combinatorial spaces |

Key distinctions to internalize:

- ⚠️ **Backtracking vs. brute force:** Brute force generates every candidate independently and checks it at the end. Backtracking checks *partial* candidates and kills bad subtrees early. Backtracking's worst case can equal brute force (no constraints prune anything), but in practice constraints make it dramatically faster.
- ⚠️ **Backtracking vs. DP:** DP exploits **overlapping subproblems** — the same subproblem is solved once and cached. Backtracking's subproblems are typically **distinct paths** (different sets of choices), so there is nothing to memoize. If you notice overlapping states, you likely want DP (or **memoized backtracking**, which is DP in disguise).
- ⚠️ **Backtracking vs. greedy:** Greedy commits irrevocably and is fast but only correct when the greedy-choice property holds. Backtracking reconsiders — it is the fallback when greedy is wrong.
- 💡 **Branch & Bound** is best understood as **backtracking specialized for optimization**: it adds a numeric *bound* on the best achievable objective in a subtree and prunes subtrees that cannot beat the incumbent.

---

## 2. The Universal Backtracking Template

> **TL;DR:** Almost every backtracking solution is the same three-line skeleton — **choose → explore → unchoose** — wrapped in a base case and a validity/pruning check. Learn the skeleton once; specialize the choices per problem.

### 2.1 Pseudocode

```text
function BACKTRACK(state):
    if REJECT(state):            # pruning: this partial can't lead anywhere valid
        return
    if ACCEPT(state):            # base case: complete, valid solution
        RECORD(state)
        return                   # (or 'continue' if longer solutions exist)

    for choice in CANDIDATES(state):   # branching
        MAKE(state, choice)      # CHOOSE  — extend the partial solution
        BACKTRACK(state)         # EXPLORE — recurse into the subtree
        UNDO(state, choice)      # UNCHOOSE — restore state (backtrack)

```

The five problem-specific pieces you must define:

1. `CANDIDATES(state)` — what choices are available now (the **branching factor**).
2. `MAKE`** / **`UNDO` — how to apply and revert a choice (must be exact inverses).
3. `REJECT` — the pruning predicate (the single biggest lever on performance).
4. `ACCEPT` — when a partial solution is complete.
5. `RECORD` — what to do with a found solution (collect, count, or return early).

💡 **Insight:** `RECORD` placement matters. If you record at *every node* (e.g. subsets), the base case is implicit and every partial is a valid answer. If you record only at *leaves* (e.g. permutations, N-Queens), you gate recording behind an `ACCEPT` check.

### 2.2 The Choose–Explore–Unchoose Cycle

The heartbeat of backtracking is three symmetric operations around the recursive call:

```python
for choice in candidates:
    path.append(choice)     # 1. CHOOSE   — mutate shared state to reflect the decision
    backtrack(path)         # 2. EXPLORE  — recurse; all deeper decisions build on this choice
    path.pop()              # 3. UNCHOOSE — reverse the mutation so the next iteration starts clean

```

- **Choose** — commit to one option, mutating the shared state (append to a path, mark a cell, set a color).
- **Explore** — recurse. Everything discovered in the recursion is conditioned on the choice you just made.
- **Unchoose** — the *backtrack*. Reverse the exact mutation so the loop's next iteration explores a sibling branch from an identical starting state.

⚠️ **The #1 backtracking bug:** forgetting to `unchoose`, or making `undo` not a perfect inverse of `make`. If `make` adds to a set and `undo` clears the whole set, sibling branches inherit corrupted state. `make`** and `undo` must be exact mirror images.**

💡 **Snapshot vs. shared mutable state:** Two coding styles exist:

- **Shared mutable path** (shown above) — one list is mutated and restored; you must **snapshot** (`path[:]`) when recording, or every recorded solution will alias the same list and end up empty/identical.
- **Immutable extension** (`backtrack(path + [choice])`) — passes a fresh copy down, so no `unchoose` is needed. Cleaner but allocates `O(depth)` memory per call; slower for large trees.

---

## 3. Subsets

> **TL;DR:** The subset problem is the "hello world" of backtracking. For each element you make a binary decision — **include it or not** — producing all `2^n` subsets. The `start` index prevents re-choosing earlier elements, which is what stops permutations of the same subset from appearing.

### 3.1 Theory

Given `n` distinct elements, there are exactly `2^n`** subsets** (each element is independently in or out — that's the **power set**). The state-space tree has two natural formulations:

- **Binary-choice tree (include/exclude):** at depth `i`, branch on "include `nums[i]`" vs "exclude `nums[i]`". Depth `n`, `2^n` leaves, each leaf is one subset.
- **Index-advancing tree (the idiomatic template):** at each node, iterate a `start` pointer over remaining elements, choosing one to append and recursing with `start = i + 1`. **Every node is a valid subset** (not just leaves), so we record on entry.

The `start` index is the key invariant: by only ever choosing elements at indices `>= start`, we generate each subset in strictly increasing index order, so `{1,2}` is produced but `{2,1}` never is. This is exactly what distinguishes **subsets/combinations** (order-agnostic) from **permutations** (order-sensitive).

Before you code, ask the learner's questions: *"Why doesn't this produce duplicates like {1,2} and {2,1}?"* → because `start` forbids looking backward. *"Why is every node recorded, not just leaves?"* → because a subset can end at any length; there is no 'incomplete' subset.

### 3.2 Implementation

```python
from typing import List

def subsets(nums: List[int]) -> List[List[int]]:
    """All 2^n subsets of a list of DISTINCT integers."""
    result: List[List[int]] = []

    def backtrack(start: int, current: List[int]) -> None:
        # Every partial IS a valid subset — record a SNAPSHOT (current[:]),
        # not a reference, or all entries will alias the same mutated list.
        result.append(current[:])

        # 'start' ensures we only look forward → no duplicate subsets.
        for i in range(start, len(nums)):
            current.append(nums[i])      # CHOOSE   nums[i]
            backtrack(i + 1, current)    # EXPLORE  with elements after i
            current.pop()                # UNCHOOSE (backtrack)

    backtrack(0, [])
    return result

nums = [1, 2, 3]
print(subsets(nums))
# [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]

```

✅ **Verified output:** `[[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]]` — all 8 = `2^3` subsets.

### 3.3 Complexity

- **Time:** `O(n · 2^n)`. There are `2^n` subsets; copying each into `result` costs up to `O(n)`. The tree itself has `2^n` nodes, and the snapshot copy dominates.
- **Space:** `O(n)` auxiliary for the recursion stack and the `current` path (depth ≤ `n`). Excluding the output, it's `O(n)`; **including** the output it's `O(n · 2^n)` to store all subsets.

### 3.4 Variants

**A) Subsets with duplicates** — input may contain repeats (e.g. `[1,2,2]`). Sort first, then **skip a candidate if it equals its predecessor *****at the same tree level*** (`i > start and nums[i] == nums[i-1]`). This keeps `{2,2}` but suppresses the second `{2}` that would otherwise duplicate the first.

```python
def subsets_with_dup(nums: List[int]) -> List[List[int]]:
    nums.sort()                              # group duplicates together
    result: List[List[int]] = []

    def backtrack(start: int, current: List[int]) -> None:
        result.append(current[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue                     # ⚠️ skip duplicate at THIS level only
            current.append(nums[i])          # CHOOSE
            backtrack(i + 1, current)        # EXPLORE
            current.pop()                    # UNCHOOSE
    backtrack(0, [])
    return result

print(subsets_with_dup([1, 2, 2]))
# [[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]

```

✅ **Verified:** `[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]` — no duplicate subsets.

**B) Subsets of size **`k`** (combinations)** — only record at depth `k`, and **prune** branches that can't reach length `k`:

```python
def subsets_of_size_k(nums: List[int], k: int) -> List[List[int]]:
    result: List[List[int]] = []

    def backtrack(start: int, current: List[int]) -> None:
        if len(current) == k:                # ACCEPT: exact size reached
            result.append(current[:])
            return
        need = k - len(current)              # elements still required
        # ✅ PRUNE: stop when fewer than `need` elements remain
        for i in range(start, len(nums) - need + 1):
            current.append(nums[i])          # CHOOSE
            backtrack(i + 1, current)        # EXPLORE
            current.pop()                    # UNCHOOSE
    backtrack(0, [])
    return result

print(subsets_of_size_k([1, 2, 3, 4], 2))
# [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]

```

✅ **Verified:** all 6 = `C(4,2)` combinations. 💡 The `len(nums) - need + 1` bound is a textbook pruning trick — it avoids descending into branches that provably can't fill `k` slots.

---

## 4. Permutations

> **TL;DR:** Permutations are subsets' order-sensitive cousin: **order matters** and **every element is used exactly once**. Two idioms dominate — a `used[]`** visited array** (clear, stable order) and **in-place swapping** (`O(1)` extra space, unstable order). There are `n!` permutations.

### 4.1 Theory

A **permutation** is an arrangement of all `n` elements where order is significant, giving `n!` results. Unlike subsets, there is no `start` pointer — at every level you may choose *any* not-yet-used element, so the tree has branching factor `n` at the root, `n-1` next, and so on (`n!` leaves).

Two canonical approaches:

- **Visited-array approach:** maintain a `used[]` boolean array. At each level, iterate over all indices and skip those already used. **Choose** = mark used + append; **unchoose** = unmark + pop. Preserves input order, so output is lexicographic-ish and stable. Uses `O(n)` extra space for `used[]`.
- **Swap-based approach:** fix positions left to right. At position `idx`, swap each candidate `nums[i]` (`i >= idx`) into place, recurse on `idx+1`, then swap back. `O(1)`** auxiliary space** (mutates the array in place, no `used[]`), but the output order is *not* lexicographic and it's trickier to extend to the duplicates case.

Learner's misconception to preempt: *"Why no *`start`* index like subsets?"* → Because for permutations we *want* `[1,2]` and `[2,1]` as distinct answers, so we must look backward — we only forbid **reusing the same element**, tracked by `used[]` (or by the swap structure), not by an index floor.

### 4.2 Implementation

**Visited-array (recommended for clarity and duplicate handling):**

```python
def permute(nums: List[int]) -> List[List[int]]:
    result: List[List[int]] = []
    used = [False] * len(nums)

    def backtrack(current: List[int]) -> None:
        if len(current) == len(nums):        # ACCEPT: used every element
            result.append(current[:])        # snapshot
            return
        for i in range(len(nums)):
            if used[i]:                       # skip elements already placed
                continue
            used[i] = True                    # CHOOSE
            current.append(nums[i])
            backtrack(current)                # EXPLORE
            current.pop()                     # UNCHOOSE
            used[i] = False
    backtrack([])
    return result

print(permute([1, 2, 3]))
# [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]

```

✅ **Verified:** all 6 = `3!` permutations, in stable lexicographic order.

**Swap-based (**`O(1)`** auxiliary space):**

```python
def permute_swap(nums: List[int]) -> List[List[int]]:
    result: List[List[int]] = []
    nums = nums[:]                            # work on a copy

    def backtrack(idx: int) -> None:
        if idx == len(nums):
            result.append(nums[:])
            return
        for i in range(idx, len(nums)):
            nums[idx], nums[i] = nums[i], nums[idx]   # CHOOSE (swap into position)
            backtrack(idx + 1)                        # EXPLORE
            nums[idx], nums[i] = nums[i], nums[idx]   # UNCHOOSE (swap back)
    backtrack(0)
    return result

print(permute_swap([1, 2, 3]))
# [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,2,1],[3,1,2]]  (different order, same set)

```

✅ **Verified:** all 6 permutations (note the order differs from the visited-array version — swapping is not lexicographic).

### 4.3 Complexity

- **Time:** `O(n · n!)`. There are `n!` leaves; each finished permutation costs `O(n)` to snapshot. (The internal nodes sum to less than the leaf work, so leaves dominate.)
- **Space:**- Visited-array: `O(n)` for `used[]` + `O(n)` recursion depth = `O(n)` auxiliary.
- Swap-based: `O(n)` recursion depth only, **no **`used[]` → the constant-factor winner.
- Output storage: `O(n · n!)` to hold all permutations.

### 4.4 Variants

**A) Permutations with duplicates** — sort, then skip a value if it equals the previous value **and the previous is not currently used** (`i > 0 and nums[i]==nums[i-1] and not used[i-1]`). This canonical rule forces duplicates to be chosen in a fixed left-to-right order, eliminating repeat arrangements.

```python
def permute_unique(nums: List[int]) -> List[List[int]]:
    nums.sort()                                   # group duplicates
    result: List[List[int]] = []
    used = [False] * len(nums)

    def backtrack(current: List[int]) -> None:
        if len(current) == len(nums):
            result.append(current[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            # ⚠️ skip duplicate values unless the identical predecessor is in use
            if i > 0 and nums[i] == nums[i - 1] and not used[i - 1]:
                continue
            used[i] = True
            current.append(nums[i])
            backtrack(current)
            current.pop()
            used[i] = False
    backtrack([])
    return result

print(permute_unique([1, 1, 2]))
# [[1, 1, 2], [1, 2, 1], [2, 1, 1]]

```

✅ **Verified:** exactly 3 distinct permutations (not `3! = 6`).

**B) Partial permutations **`P(n, k)` — arrangements of `k` out of `n` elements (`n! / (n−k)!` of them). Same as `permute`, but the base case fires at length `k`:

```python
def partial_permutations(nums: List[int], k: int) -> List[List[int]]:
    result: List[List[int]] = []
    used = [False] * len(nums)

    def backtrack(current: List[int]) -> None:
        if len(current) == k:                 # ACCEPT at size k, not n
            result.append(current[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            current.append(nums[i])
            backtrack(current)
            current.pop()
            used[i] = False
    backtrack([])
    return result

print(partial_permutations([1, 2, 3], 2))
# [[1,2],[1,3],[2,1],[2,3],[3,1],[3,2]]

```

✅ **Verified:** all 6 = `P(3,2)` ordered pairs.

💡 **Subsets vs. permutations at a glance:** the *only* structural difference is `start` (subsets: look forward, order-free, `2^n`) vs. `used[]`/swap (permutations: look everywhere-unused, order-sensitive, `n!`).

---

## 5. Constraint Search (CSP)

> **TL;DR:** A **Constraint Satisfaction Problem** is defined by **variables**, their **domains**, and **constraints**. Backtracking assigns variables one at a time and **prunes the instant a constraint is violated**. Smart ordering (**MRV**) and lookahead (**forward checking**, **arc consistency / AC-3**) turn exponential blowups into practical solvers. Classics: **N-Queens, Sudoku, Graph Coloring**.

### 5.1 Theory

A **CSP** is a triple `(X, D, C)`:

- **Variables** `X = {x1, ..., xn}` — the things to assign (e.g. queen positions, Sudoku cells, region colors).
- **Domains** `D = {D1, ..., Dn}` — the allowed values for each variable (e.g. columns `0..n-1`, digits `1..9`, colors `{R,G,B}`).
- **Constraints** `C` — relations restricting simultaneous assignments (e.g. "no two queens share a diagonal", "each row of Sudoku holds distinct digits", "adjacent regions differ in color").

A **solution** is a complete assignment satisfying every constraint. Backtracking search assigns one variable at a time, checking constraints against already-assigned variables and pruning failed partial assignments. Two ideas make this efficient beyond raw pruning:

- **Variable ordering — Minimum Remaining Values (MRV):** always assign the most-constrained variable next (the one with the fewest legal values left) to "fail fast" and shrink the tree.
- **Value ordering — Least Constraining Value (LCV):** try the value that rules out the fewest options for neighbors, to "succeed fast".

Learner framing: *"Why is this different from subsets/permutations?"* → In CSP the tree is shaped by **constraints and domains**, not by a fixed include/order rule. Pruning is problem-specific and is where nearly all the speed comes from.

### 5.2 Classic Problems

- **N-Queens:** place `n` queens on an `n×n` board so none attack each other. Variables = rows, domains = columns, constraints = distinct columns and distinct diagonals (`row−col` and `row+col`). `n=8` has **92** solutions.
- **Sudoku:** fill a 9×9 grid so every row, column, and 3×3 box contains `1..9` exactly once. Variables = empty cells, domain = `1..9`, constraints = all-different per row/column/box.
- **Graph Coloring (**`m`**-coloring):** color vertices with `≤ m` colors so no edge joins same-colored vertices. A triangle needs `≥ 3` colors; this is the abstraction behind **register allocation** and **exam scheduling**.

### 5.3 Pruning Strategies

- ✅ **Constraint check (base pruning):** before recursing on a value, verify it violates no constraint against current assignments. This alone converts brute force into backtracking.
- ✅ **Forward checking:** after assigning `x = v`, immediately remove `v` from the domains of unassigned neighbors. If any neighbor's domain becomes **empty**, backtrack now instead of discovering the conflict deep in the subtree.
- ✅ **Arc consistency (AC-3):** enforce that for every constraint arc `(xi, xj)`, each value in `Di` has *some* compatible value in `Dj`; iteratively delete unsupported values. Applied at each node (**MAC — Maintaining Arc Consistency**), it prunes far more aggressively than forward checking, at higher per-node cost.
- ✅ **MRV + degree heuristic:** pick the variable with the fewest remaining legal values (ties broken by the variable involved in the most constraints).
- 💡 **Constraint propagation ⟷ search tradeoff:** more propagation (AC-3/MAC) means fewer nodes but more work per node. The art is balancing them; industrial solvers (e.g. Google OR-Tools CP-SAT) tune this automatically.

### 5.4 Implementation

**N-Queens** with `O(1)` conflict checks via three sets (columns, both diagonals):

```python
def solve_n_queens(n: int) -> List[List[int]]:
    """Return every solution as a list where board[r] = column of the queen in row r."""
    result: List[List[int]] = []
    cols, diag, anti = set(), set(), set()    # occupied columns, r-c diagonals, r+c anti-diagonals
    board = [-1] * n

    def backtrack(row: int) -> None:
        if row == n:                          # ACCEPT: all rows filled
            result.append(board[:])
            return
        for col in range(n):                  # domain of this row = columns 0..n-1
            # ✅ PRUNE: reject if column or either diagonal is already attacked
            if col in cols or (row - col) in diag or (row + col) in anti:
                continue
            cols.add(col); diag.add(row - col); anti.add(row + col)   # CHOOSE
            board[row] = col
            backtrack(row + 1)                                        # EXPLORE
            cols.remove(col); diag.remove(row - col); anti.remove(row + col)  # UNCHOOSE
            board[row] = -1
    backtrack(0)
    return result

solutions = solve_n_queens(8)
print(len(solutions))     # 92
print(solutions[0])       # [0, 4, 7, 5, 2, 6, 1, 3]

```

✅ **Verified:** `len == 92` (the known count for 8-queens); first solution `[0, 4, 7, 5, 2, 6, 1, 3]`. Encoding a row's queen as a single column value already enforces "one queen per row", shrinking the domain enormously versus placing queens on arbitrary squares.

**Sudoku** solver (constraint check + first-empty-cell ordering):

```python
def solve_sudoku(board: List[List[object]]) -> List[List[object]]:
    """Solve 9x9 Sudoku in place. Empty cells are 0; filled are chars/ints '1'..'9'."""
    def is_valid(r: int, c: int, v: str) -> bool:
        for i in range(9):
            if board[r][i] == v or board[i][c] == v:       # row & column
                return False
        br, bc = 3 * (r // 3), 3 * (c // 3)                # 3x3 box origin
        for i in range(br, br + 3):
            for j in range(bc, bc + 3):
                if board[i][j] == v:
                    return False
        return True

    def backtrack() -> bool:
        for r in range(9):
            for c in range(9):
                if board[r][c] == 0:                       # next unassigned variable
                    for v in "123456789":                  # domain
                        if is_valid(r, c, v):
                            board[r][c] = v                 # CHOOSE
                            if backtrack():                 # EXPLORE
                                return True
                            board[r][c] = 0                 # UNCHOOSE
                    return False                            # ✅ PRUNE: no digit fits → dead end
        return True                                         # no empties left → solved
    backtrack()
    return board

```

✅ **Verified** on a standard puzzle — produces a valid completed grid (every row/column/box holds `1..9`). 💡 Swapping "first empty cell" for **MRV** (fill the cell with the fewest legal digits first) can cut runtime by orders of magnitude on hard puzzles.

**Graph Coloring** (`m`-coloring decision):

```python
def graph_coloring(adj: List[List[int]], m: int):
    """adj is an n x n 0/1 adjacency matrix. Return a valid coloring or None."""
    n = len(adj)
    color = [0] * n                                    # 0 = uncolored; colors are 1..m

    def is_ok(v: int, c: int) -> bool:
        return all(not (adj[v][u] and color[u] == c) for u in range(n))

    def backtrack(v: int) -> bool:
        if v == n:
            return True
        for c in range(1, m + 1):                      # domain = colors 1..m
            if is_ok(v, c):                            # ✅ PRUNE on adjacency conflict
                color[v] = c                           # CHOOSE
                if backtrack(v + 1):                   # EXPLORE
                    return True
                color[v] = 0                           # UNCHOOSE
        return False
    return color if backtrack(0) else None

triangle = [[0,1,1],[1,0,1],[1,1,0]]
print(graph_coloring(triangle, 3))   # [1, 2, 3]  — needs 3 colors
print(graph_coloring(triangle, 2))   # None       — 2 colors impossible

```

✅ **Verified:** triangle is 3-colorable (`[1,2,3]`) but not 2-colorable (`None`).

### 5.5 Complexity

- **N-Queens:** worst case `O(n!)` (branching shrinks each row: `n, n-2, ...`); the diagonal/column sets prune heavily. Space `O(n)` for the three sets + recursion. Counting all solutions is inherently exponential; finding *one* is fast for moderate `n`.
- **Sudoku:** worst case `O(9^m)` where `m` is the number of empty cells (domain 9 per cell), but constraint propagation makes real puzzles near-instant. Space `O(1)` extra beyond the fixed 81-cell board plus recursion depth.
- **Graph **`m`**-coloring:** worst case `O(m^n)` — `m` choices for each of `n` vertices; deciding `m`-colorability is **NP-complete** for `m ≥ 3`. Space `O(n)`.
- 💡 **General CSP:** naive backtracking is `O(d^n)` for `n` variables with domain size `d`. Forward checking and arc consistency reduce the *effective* branching factor, often turning practical instances tractable despite the exponential worst case.

---

## 6. Comparison Table

| Problem type | Branching factor | Pruning strategy | Time complexity | Space (aux) | Common use case |
| --- | --- | --- | --- | --- | --- |
| **Subsets / power set** | 2 (include/exclude) per element; template loops `start..n` | `start` index (no revisiting); size bound for size-`k` | `O(n · 2^n)` | `O(n)` | Feature selection, generating combinations, subset-sum |
| **Combinations **`C(n,k)` | ≤ `n − start` | `len(nums) − need + 1` bound | `O(k · C(n,k))` | `O(k)` | Lottery-style choices, k-subsets, committee selection |
| **Permutations** | `n`, then `n−1`, ... | `used[]` / swap (no reuse); dup-skip rule | `O(n · n!)` | `O(n)` | Ordering/arrangement, TSP brute enumeration, anagrams |
| **Partial perms **`P(n,k)` | `n`, `n−1`, ... | base case at depth `k` | `O(k · P(n,k))` | `O(n)` | Top-k rankings, seating for `k` seats |
| **N-Queens** | ≤ `n` per row | column + 2 diagonal sets; MRV | `O(n!)` worst | `O(n)` | Constraint placement, VLSI/board layout demos |
| **Sudoku** | ≤ 9 per empty cell | row/col/box all-different; forward checking; MRV | `O(9^m)` worst (`m` empties) | `O(1)` + stack | Latin-square / grid constraint solving |
| **Graph **`m`**-coloring** | `m` per vertex | adjacency check; forward checking; degree/MRV | `O(m^n)` worst (NP-complete) | `O(n)` | Register allocation, scheduling, map coloring |
| **General CSP** | domain size `d` | forward checking, AC-3/MAC, MRV+LCV | `O(d^n)` worst | `O(n·d)` for domains | Timetabling, configuration, planning |

---

## 7. Backtracking in AI, ML & LLMs

> **TL;DR:** Backtracking is not just an interview trope — it is the search backbone of classical AI (game trees, planning, CSP solvers) and appears, in **bounded/relaxed** forms, throughout modern ML and LLM systems (NAS, hyperparameter search, constrained and tree-structured decoding).

### 7.1 Search in AI agents — game trees & planning

- **Game-tree search (Minimax / Alpha-Beta):** Minimax is a depth-first exploration of a game's decision tree; **alpha-beta pruning** is precisely backtracking's `reject` predicate applied to *values* — it abandons a branch once it cannot influence the final decision, exactly like a constraint violation kills a subtree. This is the direct ancestor of the search in engines like Stockfish.
- **Classical planning (STRIPS/PDDL, DFS/backward search):** planners search the space of action sequences, backtracking when a partial plan reaches a state from which the goal is unreachable. **Backtracking search over partial plans** (partial-order planning) is a canonical AI technique.
- 💡 **Modern LLM agents** borrow this explicitly: **Tree-of-Thoughts (ToT)** and **Language-Agent-Tree-Search (LATS)** have the model *generate* candidate reasoning steps, *evaluate* them, and **backtrack** from dead-end thoughts — backtracking with an LLM as both the branch generator and the `reject`/value function.

### 7.2 Hyperparameter search & Neural Architecture Search (NAS)

- **Hyperparameter search:** grid/random search are brute force; more sophisticated schedulers (e.g. **Hyperband/successive halving**) *prune* unpromising configurations early — the same "kill hopeless branches" instinct as backtracking's `reject`, applied to partially-trained models.
- **Neural Architecture Search:** searching the discrete space of architectures is a combinatorial search problem. Early NAS explored architecture decision trees with pruning; the space (layer types, connections, widths) is exactly a CSP-like structure where invalid/underperforming partial architectures are abandoned.
- ⚠️ **Caveat:** these are usually cast as **optimization** (find the *best*, not *a valid*), so they lean toward **branch-and-bound**, Bayesian optimization, or RL rather than pure boolean-constraint backtracking. The kinship is the prune-early principle, not identical machinery.

### 7.3 Beam search & token decoding in LLMs

> **Pro Insight:** In LLM inference, **beam search is a bounded (breadth-limited) backtracking variant** — it maintains the top-`k` partial sequences (**beams**) at each step and prunes all lower-probability paths, trading exhaustiveness for tractability. Pure backtracking would explore the entire `vocab^length` tree; beam search caps the frontier at `k`.

- **Constrained decoding / grammar-constrained generation:** when you force an LLM to emit valid JSON, SQL, or a regex-conforming string, the decoder **masks out tokens that would violate the grammar** at each step — this is **forward checking on a CSP** whose variables are token positions and whose constraints are the grammar. Some implementations **backtrack** when a greedy/beam path paints itself into a corner (no valid continuation), exactly mirroring CSP dead-end recovery.
- **Structured / tree-of-thoughts decoding:** explores multiple continuation branches and prunes by a scoring/value model — backtracking with a learned heuristic.
- ⚠️ **Nuance:** beam search does **not** literally `unchoose` and rewind a single path; it keeps `k` paths alive breadth-first. It is best described as *bounded search with pruning* — a cousin of backtracking sharing the pruning DNA, not a textbook DFS backtracker.

### 7.4 Constraint satisfaction in scheduling & ML pipelines

- **Scheduling/timetabling:** shift scheduling, exam timetabling, and job-shop problems are CSPs solved with backtracking + constraint propagation (the engine behind **Google OR-Tools CP-SAT**, used in production planning).
- **AutoML pipeline configuration:** choosing a valid, compatible sequence of preprocessing → model → post-processing steps is a constraint problem (e.g. a scaler must precede a distance-based model) — solvers prune incompatible partial pipelines.
- **Feature selection:** selecting a subset of features under constraints (max count, must-include groups) is literally the **subsets** problem with pruning; combinatorial feature search uses backtracking when the space is small enough.
- 💡 For **tabular ML**, when a feature-selection search space is large, prefer wrapping a fast learner (e.g. gradient-boosted trees) inside the search and prune by validation score early — a branch-and-bound flavored feature search rather than exhaustive backtracking.

---

## 8. Expert Takeaways & Common Pitfalls

> **TL;DR:** Most backtracking bugs are state-management errors (bad `unchoose`, aliasing) or missing pruning. Most performance wins come from **stronger **`reject`, **better variable/value ordering**, and **memoization when subproblems overlap**. Know when to *not* backtrack.

### 8.1 Common pitfalls (and fixes)

- ⚠️ **Aliasing the result:** appending `current` instead of `current[:]` stores references to one mutated list — you end up with N copies of `[]`. **Fix:** always snapshot (`current[:]` / `list(current)`) when recording.
- ⚠️ **Asymmetric **`make`**/**`undo`**:** if `undo` isn't the exact inverse of `make`, sibling branches inherit corrupt state. **Fix:** mirror them line-for-line; prefer adding/removing the *same* element, not clearing containers.
- ⚠️ **Missing base case / infinite recursion:** forgetting the `ACCEPT` return, or not advancing the index/depth. **Fix:** ensure every recursive call strictly reduces the remaining problem.
- ⚠️ **Duplicate results with duplicate inputs:** the classic subsets/permutations-with-dups trap. **Fix:** sort + the level-skip rule (`i > start and nums[i]==nums[i-1]`) for subsets/combos; the `not used[i-1]` rule for permutations.
- ⚠️ **Recording at the wrong place:** recording every node when only leaves are valid (or vice versa). **Fix:** decide explicitly — "is every partial a valid answer?" (subsets: yes; permutations/N-Queens: only complete ones).
- ⚠️ **Python recursion limit / deep stacks:** deep trees can hit `RecursionError`. **Fix:** raise `sys.setrecursionlimit`, or convert to an explicit stack for very deep problems.

### 8.2 Optimization tricks used in production

- ✅ **Push the **`reject`** check as high as possible.** Pruning near the root eliminates exponentially more work than pruning near the leaves. The single biggest lever.
- ✅ `O(1)`** incremental constraint checks.** Maintain auxiliary structures (the N-Queens column/diagonal sets, Sudoku per-row/col/box bitmasks) so validity is a set/bitmask test, not an `O(n)` rescan.
- ✅ **Bitmasks for small domains.** Represent used columns/digits/colors as integer bitmasks — cache-friendly, branch-light, and enables `O(1)` "next candidate" via bit tricks.
- ✅ **Variable & value ordering (MRV + LCV + degree).** Fail fast on the most-constrained variable; succeed fast on the least-constraining value.
- ✅ **Constraint propagation (forward checking, AC-3/MAC).** Detect dead ends before descending into them.
- ✅ **Memoize when subproblems overlap** — this turns backtracking into DP (top-down). If distinct paths reach identical states, cache them.
- ✅ **Symmetry breaking.** In N-Queens, exploit board symmetry to search a fraction of the tree, then reflect/rotate solutions.
- ✅ **Iterative deepening** when you want DFS memory with BFS-like shallow-solution-first behavior (common in AI search).

### 8.3 When *not* to use backtracking

- ❌ **When there is optimal substructure + overlapping subproblems** → use **DP** (backtracking would recompute the same states exponentially).
- ❌ **When a greedy-choice property holds** (MST, shortest-path with non-negative weights, Huffman) → **greedy** is faster and provably correct; no need to reconsider.
- ❌ **When the state space is enormous with weak pruning** → backtracking degenerates to brute force; prefer **heuristic/metaheuristic** methods (A*, simulated annealing, genetic algorithms) or dedicated **SAT/CP/ILP solvers** (MiniSat, OR-Tools, Gurobi).
- ❌ **When you only need one *****good enough***** answer, not all/optimal** → local search or sampling is usually cheaper.
- 💡 **Rule of thumb:** reach for backtracking when the problem is *"construct/enumerate solutions subject to checkable constraints"* and constraints prune meaningfully. If constraints are weak or the objective is continuous, look elsewhere.

---

## 9. Must-Know Checklist

Use this as a final self-audit before you claim mastery.

**Fundamentals**

- ☐ I can define backtracking as pruned DFS over a state-space tree, and state the `reject`/`accept` predicates.
- ☐ I can explain **choose → explore → unchoose** and why `undo` must exactly mirror `make`.
- ☐ I can distinguish backtracking from **brute force, DP, greedy, and branch & bound** — and pick the right one.

**Subsets**

- ☐ I know there are `2^n` subsets and why the `start` index prevents duplicate/out-of-order subsets.
- ☐ I can handle **duplicates** (sort + level-skip) and **size-**`k` (base case + `need` pruning bound).
- ☐ I know to snapshot (`current[:]`) when recording.

**Permutations**

- ☐ I know there are `n!` permutations and can implement both `used[]` and **swap** approaches.
- ☐ I can state the space tradeoff: swap is `O(1)` aux, visited is `O(n)` but easier for duplicates.
- ☐ I can handle **duplicates** (`not used[i-1]` rule) and **partial permutations** (`P(n,k)`).

**Constraint Search (CSP)**

- ☐ I can model a problem as **(variables, domains, constraints)**.
- ☐ I can implement **N-Queens** with `O(1)` diagonal/column checks (and know `n=8` → 92 solutions).
- ☐ I can implement a **Sudoku** solver and a **graph **`m`**-coloring** solver.
- ☐ I understand **forward checking**, **arc consistency / AC-3 / MAC**, and **MRV + LCV** ordering.
- ☐ I know graph 3-coloring / general CSP is **NP-complete/**`O(d^n)` in the worst case.

**Complexity & Optimization**

- ☐ I can state time/space for subsets (`O(n·2^n)`), permutations (`O(n·n!)`), and CSPs (`O(d^n)`).
- ☐ I know the biggest lever is **pruning early/high**, plus bitmasks, ordering heuristics, and propagation.
- ☐ I can recognize when to switch to **DP, greedy, or a dedicated solver**.

**AI / ML / LLM connections**

- ☐ I can explain **alpha-beta pruning** and planning as backtracking search.
- ☐ I can explain **beam search** as bounded backtracking, and **grammar-constrained decoding** as CSP forward checking.
- ☐ I can point to **CP-SAT scheduling**, **NAS/AutoML pipeline search**, and **feature selection** as applied backtracking/pruned search.

---

> **Final word:** Backtracking is deceptively simple as a template but endlessly deep in practice. The template gets you correctness; **pruning, ordering, and propagation** get you performance; and knowing **when to abandon backtracking entirely** (DP, greedy, solvers, heuristics) is what separates the engineer from the algorithm-reciter.

---

## Related Guides

**Prerequisites:** [Recursion & The Call Stack](/docs/recursion-and-call-stack) · [BFS & DFS Traversal](/docs/bfs-dfs)  
**See also:** [Dynamic Programming](/docs/dynamic-programming) · [Graph Theory](/docs/graph-theory)

*Section: [Advanced DSA](/docs/category/03-advanced-dsa) · [All guides](/)*
