---
title: Heaps & Priority Queues
slug: /heaps-and-priority-queues
sidebar_position: 6
sidebar_label: Heaps & Priority Queues
description: >-
  Binary heaps from first principles to production — top-K, streaming medians, and scheduler design.
tags:
  - heaps
  - priority-queue
  - patterns
difficulty: intermediate
reading_time: 20
prerequisites:
  - title: Trees & Binary Search Trees
    to: /docs/trees-and-bst
  - title: Sorting Algorithms
    to: /docs/sorting-algorithms
pagination_prev: 02-core-dsa/stacks-and-queues
pagination_next: 02-core-dsa/trees-and-bst
path_step: 12
---

# Heaps & Priority Queues: The Ultimate Guide

> A single, authoritative reference — from first principles to production systems across DS, AI, ML, and LLM infrastructure. Python-first, complexity-annotated, and interview-ready.

---

## 1. Core Concepts & Definitions

### 1.1 Formal Definition

A **heap** is a *complete binary tree* that satisfies the **heap property**:

- **Min-Heap:** for every node `N`, `key(N) ≤ key(children(N))`. The minimum sits at the root.
- **Max-Heap:** for every node `N`, `key(N) ≥ key(children(N))`. The maximum sits at the root.

"Complete binary tree" is the load-bearing phrase: every level is fully filled except possibly the last, which fills **left to right**. This shape guarantee is *why* a heap can live in a flat array with no pointers, and why its height is always `⌊log₂ n⌋`.

A **priority queue (PQ)** is an *abstract data type* (ADT) — a contract, not an implementation. It supports:

- `insert(item, priority)`
- `extract_top()` — remove and return the highest-priority item
- `peek()` — inspect the top without removing

### 1.2 Intuitive Plain-English Explanation

> 💡 **The core intuition:** A heap is a **tournament bracket that only bothers to keep the champion on top.** Unlike a sorted list, it does *not* waste effort fully ordering everyone — it only guarantees that the single most important element is instantly reachable, and that fixing the order after a change is cheap (`O(log n)`, the height of the tree).

A sorted array answers "what's the max?" in `O(1)` but costs `O(n)` to insert. An unsorted array inserts in `O(1)` but costs `O(n)` to find the max. A heap is the **elegant middle**: `O(log n)` insert *and* `O(log n)` removal of the extreme, with `O(1)` peek. It buys balance by refusing to sort what you'll never ask for.

### 1.3 Relationship Between the Two Structures

| | Priority Queue | Heap |
|---|---|---|
| **What it is** | Abstract data type (interface) | Concrete data structure |
| **Defines** | *What* operations exist | *How* they're implemented |
| **Analogy** | "A list that pops the most important item" | The array-tree that makes that fast |

> ⚠️ **Most common misconception:** "Heap == priority queue." They are **not** synonyms. A PQ *can* be built from a sorted array, a balanced BST, or a heap. A binary heap is simply the **most common and usually best** implementation. Conversely, a heap can be used for things that aren't queues at all (heapsort, selection). Keep the ADT/implementation distinction crisp — interviewers probe it.

### 1.4 The Array Representation (why heaps are cheap)

A complete binary tree maps to a 0-indexed array with pure arithmetic — no pointers, great cache locality:

```
parent(i)      = (i - 1) // 2
left_child(i)  = 2*i + 1
right_child(i) = 2*i + 2
```

```
Index:   0    1    2    3    4    5
Value:  [1,   3,   6,   5,   9,   8]

Tree view (min-heap):
              1              <- index 0 (root, the minimum)
           /     \
          3        6         <- index 1, 2
        /   \     /
       5     9   8           <- index 3, 4, 5
```

Verify: `left_child(0)=1` (value 3), `right_child(0)=2` (value 6), `parent(4)=(4-1)//2=1` (value 3). ✅

---

## 2. Types of Heaps

### 2.1 Min-Heap vs Max-Heap

- **Min-Heap** — root is the smallest; used for "smallest so far", Dijkstra, merging sorted streams, and (counter-intuitively) finding the **K largest** elements.
- **Max-Heap** — root is the largest; used for "largest so far", scheduling the most urgent task, and finding the **K smallest** elements.

> They are mirror images. Any min-heap becomes a max-heap by negating keys or supplying an inverted comparator. This trick matters in Python, whose stdlib only ships a min-heap (see §2.5).

### 2.2 Binary Heap

The workhorse. A complete binary tree, array-backed. All the code in this guide uses it unless stated otherwise.

| Operation | Time |
|---|---|
| peek | `O(1)` |
| insert | `O(log n)` |
| extract | `O(log n)` |
| build (heapify) | `O(n)` |

### 2.3 d-ary Heap

Generalizes the binary heap so each node has **d** children instead of 2.

- `parent(i) = (i-1)//d`, `kth_child(i) = d*i + k`.
- Shallower tree → **faster inserts / decrease-key** (`O(log_d n)`) but **slower extract** (each sift-down compares `d` children, so `O(d·log_d n)`).
- A **4-ary heap** often beats a binary heap in practice for Dijkstra due to better cache behavior and decrease-key-heavy workloads.

### 2.4 Fibonacci Heap *(briefly)*

A collection of heap-ordered trees with lazy consolidation. It exists to win on **amortized** bounds:

| Operation | Binary Heap | Fibonacci Heap (amortized) |
|---|---|---|
| insert | `O(log n)` | **`O(1)`** |
| decrease-key | `O(log n)` | **`O(1)`** |
| extract-min | `O(log n)` | `O(log n)` |
| merge (meld) | `O(n)` | **`O(1)`** |

> 💡 **Why anyone cares:** Dijkstra and Prim with a Fibonacci heap achieve the theoretically optimal `O(E + V log V)`. **Why almost nobody uses it:** huge constant factors, pointer-chasing that destroys cache locality, and painful implementation. In production, a binary or **d-ary heap** (or a pairing heap) beats it in wall-clock time. Know it exists for the theory question; reach for a binary heap in real code.

### 2.5 Python: `heapq` vs `queue.PriorityQueue` vs custom

**`heapq`** — a set of *functions* operating on a plain `list`. It is a **min-heap only**. Fast, no locking, single-threaded. **This is the default choice.**

```python
import heapq

h = []                      # a normal list IS the heap
heapq.heappush(h, 3)        # O(log n)
heapq.heappush(h, 1)
heapq.heappush(h, 2)
print(h[0])                 # 1  -> peek min in O(1)
print(heapq.heappop(h))     # 1  -> extract-min in O(log n)
```

**`queue.PriorityQueue`** — a *thread-safe* class wrapping `heapq` with a lock. Use it **only** for producer/consumer threading. The locking overhead makes it markedly slower for single-threaded algorithm work.

```python
from queue import PriorityQueue
pq = PriorityQueue()
pq.put((2, "task-b"))       # (priority, item) tuples
pq.put((1, "task-a"))
print(pq.get()[1])          # "task-a" — lowest priority number first
```

**Custom implementation** — write your own when you need `decrease-key`, custom comparators without tuple hacks, or an index map for `O(log n)` key updates (Dijkstra). Full class in §4.

> ⚠️ **Max-heap in Python — three idioms:**
> ```python
> # 1. Negate the values (numeric only)
> heapq.heappush(h, -value); largest = -heapq.heappop(h)
>
> # 2. heapq._heapify_max / private helpers — DON'T; undocumented, may vanish.
>
> # 3. Wrap keys in a reverse-comparator for objects:
> import dataclasses, functools
> @functools.total_ordering
> @dataclasses.dataclass
> class MaxItem:
>     priority: int
>     def __lt__(self, other): return self.priority > other.priority  # inverted
> ```

> ⚠️ **The tuple tie-break trap:** `heapq` compares tuples lexicographically. If two priorities tie, it compares the *next* element — and if that's a non-comparable object, it raises `TypeError`. Fix with a monotonic tie-breaker:
> ```python
> import itertools
> counter = itertools.count()          # unique, ever-increasing
> heapq.heappush(h, (priority, next(counter), task_obj))
> ```

---

## 3. Real-World Analogies

> 💡 **Hospital Triage Analogy (Max-Heap):** In an emergency room, patients aren't seen in arrival order — the most critically ill are always treated first. A **Max-Heap** models this: regardless of insertion order, the highest-priority element is always accessible at the root in **O(1)**. When the top patient is treated (`extract-max`), the heap reorganizes in `O(log n)` to surface the next most critical — it does *not* re-sort the entire waiting room.

> 💡 **Airport Boarding Analogy (Min-Heap by group number):** Passengers hold group numbers 1–6. The gate agent always calls the **lowest group next**, but never bothers to line up all 200 passengers in perfect order — that would be wasted work. Only the "next to board" is guaranteed correct. New passengers arriving late slot in at `O(log n)`, not by shuffling the whole terminal.

> 💡 **Bonus — Streaming leaderboard (Top-K):** A game shows the top 10 scores from millions of players. You don't keep all players sorted. You keep a **size-10 min-heap**: the smallest of your current top-10 sits at the root. Each new score is compared to that root in `O(1)`; only if it beats the root does it enter (`O(log 10)`). This is the mental model for every Top-K problem in §5.

---

## 4. Algorithms & Operations

Below is a complete, well-commented `MinHeap` class. Each operation section references its methods, gives pseudocode, complexity, and edge cases.

```python
class MinHeap:
    """Array-backed binary min-heap with decrease-key support.

    Internal invariant: for every index i > 0,
        heap[i] >= heap[parent(i)]
    """
    def __init__(self):
        self.heap = []          # the complete binary tree, flattened

    # --- index arithmetic (no pointers needed) ---
    @staticmethod
    def _parent(i): return (i - 1) // 2
    @staticmethod
    def _left(i):   return 2 * i + 1
    @staticmethod
    def _right(i):  return 2 * i + 2

    def _swap(self, i, j):
        self.heap[i], self.heap[j] = self.heap[j], self.heap[i]

    def peek(self):
        if not self.heap:
            raise IndexError("peek from empty heap")   # EDGE CASE: empty
        return self.heap[0]

    def __len__(self):
        return len(self.heap)
```

### 4.1 Insert (`push`)

**Logic (sift-up / bubble-up):**
1. Append the new element at the end of the array (keeps the tree *complete*).
2. Compare it with its parent; if it violates the heap property, swap.
3. Repeat until the parent is smaller (or we reach the root).

**Pseudocode:**
```
insert(x):
    append x to array
    i = last_index
    while i > 0 and array[i] < array[parent(i)]:
        swap(i, parent(i))
        i = parent(i)
```

**Python:**
```python
    def push(self, x):
        self.heap.append(x)              # 1. add at end -> tree stays complete
        self._sift_up(len(self.heap) - 1)

    def _sift_up(self, i):
        # Move element up while it's smaller than its parent.
        while i > 0 and self.heap[i] < self.heap[self._parent(i)]:
            self._swap(i, self._parent(i))
            i = self._parent(i)          # climb toward the root
```

- **Time:** `O(log n)` — at most one swap per level, tree height is `log n`.
- **Space:** `O(1)` extra (in-place).
- **Edge cases:** first element → loop body never runs (correct); duplicates → `<` (not `≤`) keeps it stable-ish and avoids needless swaps.

### 4.2 Extract Min / Max

**Logic (sift-down / bubble-down):**
1. Save the root (the answer).
2. Move the **last** element to the root (preserves completeness).
3. Sift it down: swap with its **smaller** child until the heap property holds.

**Pseudocode:**
```
extract_min():
    if empty: error
    min = array[0]
    array[0] = array.pop()        # move last element to root
    i = 0
    while True:
        smallest = i
        l, r = left(i), right(i)
        if l < n and array[l] < array[smallest]: smallest = l
        if r < n and array[r] < array[smallest]: smallest = r
        if smallest == i: break
        swap(i, smallest); i = smallest
    return min
```

**Python:**
```python
    def pop(self):
        if not self.heap:
            raise IndexError("pop from empty heap")     # EDGE CASE: empty
        root = self.heap[0]
        last = self.heap.pop()                          # remove final leaf
        if self.heap:                                   # EDGE CASE: was it the only element?
            self.heap[0] = last                         # promote last to root
            self._sift_down(0)
        return root

    def _sift_down(self, i):
        n = len(self.heap)
        while True:
            smallest = i
            l, r = self._left(i), self._right(i)
            # pick the smaller of the two children (if they exist)
            if l < n and self.heap[l] < self.heap[smallest]:
                smallest = l
            if r < n and self.heap[r] < self.heap[smallest]:
                smallest = r
            if smallest == i:            # heap property restored
                break
            self._swap(i, smallest)
            i = smallest                 # descend
```

- **Time:** `O(log n)`.
- **Space:** `O(1)`.
- **Edge cases:** single element → `self.heap.pop()` empties it, `if self.heap` is `False`, we return the root directly (no sift-down). Empty → raise.

### 4.3 Heapify (build-heap)

Turn an arbitrary array into a valid heap. The clever part: **sift-down from the last internal node up to the root**, not push one-by-one.

**Pseudocode:**
```
build_heap(array):
    n = len(array)
    for i from (n // 2 - 1) down to 0:   # last internal node -> root
        sift_down(i)
```

**Python:**
```python
    @classmethod
    def heapify(cls, values):
        h = cls()
        h.heap = list(values)            # copy so we don't mutate caller's list
        # start at last parent; leaves (second half) are already valid heaps
        for i in range(len(h.heap) // 2 - 1, -1, -1):
            h._sift_down(i)
        return h
```

> ⚠️ **The `O(n)`, not `O(n log n)`, surprise:** Naively pushing `n` items costs `O(n log n)`. But building bottom-up is **`O(n)`**. Why? Most nodes are near the bottom and sift down only a little. The cost is `Σ (nodes at height h) × h = n · Σ h/2^h`, and `Σ h/2^h` converges to 2. So total work is `O(2n) = O(n)`. This is a favorite interview "gotcha."

- **Time:** `O(n)`.
- **Space:** `O(1)` (in-place, ignoring the copy).
- **`heapq` equivalent:** `heapq.heapify(mylist)` — in-place, also `O(n)`.

### 4.4 Peek, Decrease-Key, and Heap Sort

**Peek** — return `heap[0]`. `O(1)`. Raise on empty. (See class above.)

**Decrease-Key** — lower an element's priority, then sift it up. Essential for Dijkstra/Prim. Requires knowing the element's index, so real implementations keep a `position` map.

```python
class IndexedMinHeap(MinHeap):
    """Adds decrease_key via a value->index map (assumes unique, hashable items)."""
    def __init__(self):
        super().__init__()
        self.pos = {}                    # item -> current index

    def _swap(self, i, j):
        self.pos[self.heap[i]], self.pos[self.heap[j]] = j, i
        super()._swap(i, j)

    def push(self, x):
        self.pos[x] = len(self.heap)
        super().push(x)

    def decrease_key(self, item, new_val):
        i = self.pos[item]               # O(1) lookup
        if new_val > self.heap[i]:
            raise ValueError("new value is greater — not a decrease")
        self.heap[i] = new_val
        self._sift_up(i)                 # O(log n): only need to move up
```

- **Time:** `O(log n)` with the index map; `O(n)` without (you'd scan to find the element).

**Heap Sort** — build a heap, then repeatedly extract. In-place with a **max-heap** for ascending order:

```python
def heap_sort(arr):
    """In-place ascending sort. O(n log n) time, O(1) extra space."""
    n = len(arr)

    def sift_down(start, end):           # end is exclusive boundary
        root = start
        while True:
            child = 2 * root + 1
            if child >= end:
                break
            # pick larger child (max-heap for ascending output)
            if child + 1 < end and arr[child] < arr[child + 1]:
                child += 1
            if arr[root] < arr[child]:
                arr[root], arr[child] = arr[child], arr[root]
                root = child
            else:
                break

    # 1. Build a max-heap, O(n)
    for start in range(n // 2 - 1, -1, -1):
        sift_down(start, n)
    # 2. Repeatedly move the max to the end, shrink, re-heapify. O(n log n)
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]   # largest -> its final position
        sift_down(0, end)
    return arr

print(heap_sort([3, 1, 5, 12, 2, 11]))        # [1, 2, 3, 5, 11, 12]
```

- **Time:** `O(n log n)` best/avg/worst — **no worst-case degradation** (unlike quicksort's `O(n²)`).
- **Space:** `O(1)` — truly in-place.
- **Trade-off:** not *stable*, and poorer cache locality than mergesort/quicksort, so it's rarely the default sort. Its niche: guaranteed `O(n log n)` with `O(1)` space.

---

## 5. Top-K Problem Patterns

This is the heart of the guide. Master this one mental model and a huge class of interview and production problems collapses into a template.

### 5.1 Pattern Recognition Guide

**Signal that a problem is Top-K:** the words "**K largest / smallest / closest / most frequent / Kth**", a **stream** you can't fully sort, or "top N by score."

> 💡 **The counter-intuitive core rule — memorize this:**
> - To find the **K LARGEST**, use a **MIN-heap of size K.**
> - To find the **K SMALLEST**, use a **MAX-heap of size K.**

**Why the inversion?** For K-largest, you keep a min-heap whose root is the *weakest survivor* — the smallest of your current top K. Each new element is compared against that weakest survivor in `O(1)`. If it's bigger, the weakest is evicted and the newcomer enters (`O(log K)`). At the end, the heap holds exactly the K largest. The min-heap lets you **cheaply discard losers** by always exposing the current cutoff.

| Approach | Time | Space | When |
|---|---|---|---|
| Sort everything | `O(n log n)` | `O(n)` | Small n, need full order anyway |
| Min-heap of size K | `O(n log K)` | `O(K)` | **Streaming / K ≪ n** — the sweet spot |
| Quickselect | `O(n)` avg | `O(1)` | One-shot, all data in memory, order among K not needed |

> ⚠️ **Interview pitfall:** If the interviewer says "**stream**" or "**can't fit in memory**," **quickselect is disqualified** (it needs random access to all n). The size-K heap is the intended answer because it's one-pass and `O(K)` memory.

### 5.2 Classic Problems (with solutions)

#### Problem 1 — K Largest Elements in an Array

```python
import heapq

def top_k_largest(nums, k):
    """K largest via a size-K MIN-heap. Time O(n log k), Space O(k)."""
    if k <= 0:
        return []                          # EDGE CASE: k=0
    min_heap = []
    for num in nums:
        heapq.heappush(min_heap, num)      # push first...
        if len(min_heap) > k:
            heapq.heappop(min_heap)        # ...then evict the smallest survivor
    return min_heap                        # the K largest (unordered)

print(top_k_largest([3, 1, 5, 12, 2, 11], 3))   # [5, 11, 12]

# One-liner using the library (same idea, optimized in C):
print(heapq.nlargest(3, [3, 1, 5, 12, 2, 11]))  # [12, 11, 5]  (sorted desc)
```

> `heapq.nlargest(k, it)` / `nsmallest(k, it)` are the production shortcuts — they use exactly this size-K heap internally. Reach for them unless you're asked to implement it.

#### Problem 2 — K Closest Points to Origin

```python
import heapq

def k_closest(points, k):
    """K points nearest origin. MAX-heap of size K (keep the K smallest distances).
    We negate distance to simulate a max-heap. Time O(n log k), Space O(k)."""
    max_heap = []                          # holds (-dist, point)
    for (x, y) in points:
        dist = x * x + y * y               # skip sqrt: monotonic, saves compute
        heapq.heappush(max_heap, (-dist, (x, y)))
        if len(max_heap) > k:
            heapq.heappop(max_heap)        # evict the farthest of our current K
    return [pt for (_, pt) in max_heap]

print(k_closest([(1, 3), (-2, 2), (5, 8), (0, 1)], 2))   # [(-2, 2), (0, 1)]
```

> 💡 Note the mirror of the rule: K **smallest** distances ⇒ **max**-heap.

#### Problem 3 — Merge K Sorted Lists

```python
import heapq

def merge_k_sorted(lists):
    """Merge k sorted lists. Time O(N log k) for N total elements, Space O(k)."""
    heap = []
    # seed with the head of each list: (value, list_index, elem_index)
    for li, lst in enumerate(lists):
        if lst:                             # EDGE CASE: skip empty lists
            heapq.heappush(heap, (lst[0], li, 0))
    result = []
    while heap:
        val, li, ei = heapq.heappop(heap)   # smallest current head across lists
        result.append(val)
        if ei + 1 < len(lists[li]):         # push the next element from that list
            heapq.heappush(heap, (lists[li][ei + 1], li, ei + 1))
    return result

print(merge_k_sorted([[1, 4, 5], [1, 3, 4], [2, 6]]))   # [1, 1, 2, 3, 4, 4, 5, 6]
```

> The heap never holds more than `k` items (one frontier element per list) → `O(k)` space. The `li, ei` fields also serve as tie-breakers so values never compare against each other's payloads.

#### Problem 4 — Top-K Frequent Elements

```python
import heapq
from collections import Counter

def top_k_frequent(nums, k):
    """Time O(n log k), Space O(n). Count, then size-K min-heap by frequency."""
    counts = Counter(nums)                  # O(n)
    # min-heap keyed on frequency; evict least-frequent when over size k
    heap = []
    for num, freq in counts.items():
        heapq.heappush(heap, (freq, num))
        if len(heap) > k:
            heapq.heappop(heap)
    return [num for (freq, num) in heap]

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2))   # [2, 1]

# Library shortcut:
print([n for n, _ in Counter([1,1,1,2,2,3]).most_common(2)])  # [1, 2]
```

> ⚠️ If `k == len(counts)`, skip the heap entirely — you want everything. For the true "top-k where k ≪ unique," bucket sort by frequency gives `O(n)`; the heap is the clean, general answer.

#### Problem 5 — Median from a Data Stream (Two-Heap Pattern)

The signature "two-heap" technique. Keep a **max-heap for the lower half** and a **min-heap for the upper half**, balanced in size.

```python
import heapq

class MedianFinder:
    """add_num: O(log n), find_median: O(1). The canonical two-heap design."""
    def __init__(self):
        self.lo = []   # max-heap (store negated) -> smaller half
        self.hi = []   # min-heap                 -> larger half

    def add_num(self, num):
        # 1. push to lo (as max-heap), then move lo's max to hi
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        # 2. rebalance so lo is never smaller than hi (lo holds the extra when odd)
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))

    def find_median(self):
        if not self.lo:
            raise IndexError("median of empty stream")   # EDGE CASE
        if len(self.lo) > len(self.hi):
            return -self.lo[0]                 # odd count -> lo's top
        return (-self.lo[0] + self.hi[0]) / 2  # even count -> average of tops

mf = MedianFinder()
for x in [5, 15, 1, 3]:
    mf.add_num(x)
print(mf.find_median())    # 4.0  (sorted: [1,3,5,15] -> (3+5)/2)
```

> 💡 **Why two heaps?** The median only depends on the *middle* — so keep the boundary of each half instantly reachable and ignore internal order. This pattern generalizes to any "running quantile" problem.

#### Problem 6 — Kth Smallest Element in a Sorted Matrix

Rows and columns are each sorted ascending. Use a min-heap over the frontier.

```python
import heapq

def kth_smallest_matrix(matrix, k):
    """n x n matrix, rows & cols sorted. Time O(k log n), Space O(n)."""
    n = len(matrix)
    # seed with the first element of each row: (value, row, col)
    heap = [(matrix[r][0], r, 0) for r in range(min(n, k))]
    heapq.heapify(heap)
    val = None
    for _ in range(k):                       # pop k times
        val, r, c = heapq.heappop(heap)
        if c + 1 < n:                        # push the next element in this row
            heapq.heappush(heap, (matrix[r][c + 1], r, c + 1))
    return val

mat = [[1, 5, 9],
       [10, 11, 13],
       [12, 13, 15]]
print(kth_smallest_matrix(mat, 8))    # 13
```

> A binary-search-on-value approach hits `O(n log(max−min))` and can beat this when `k` is large; the heap is the intuitive, order-aware default.

### 5.3 Sliding Window + Heap Combinations

When "top / max / min within the last W elements" appears, combine a heap with **lazy deletion** (mark stale entries, skip them when they surface at the root).

```python
import heapq

def max_sliding_window(nums, w):
    """Max of every window of size w. Heap + lazy deletion.
    Time O(n log n) worst case, Space O(n). (A monotonic deque does O(n) — see note.)"""
    heap = []          # max-heap of (-value, index)
    result = []
    for i, num in enumerate(nums):
        heapq.heappush(heap, (-num, i))
        # lazy-delete: discard roots that fell out of the window [i-w+1, i]
        while heap[0][1] <= i - w:
            heapq.heappop(heap)
        if i >= w - 1:
            result.append(-heap[0][0])       # current window max
    return result

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))  # [3, 3, 5, 5, 6, 7]
```

> ⚠️ **Know the better tool:** For *sliding-window max/min specifically*, a **monotonic deque** achieves `O(n)` and is the optimal answer. The heap version shines when the window criterion is richer than a single max/min (e.g., "median of the window," "sum of top-3 in the window"), where a deque can't capture the ordering.

---

## 6. Applications in AI / ML / LLM

Heaps are not academic trivia — they are load-bearing in modern AI systems. Each connection below is concrete.

### 6.1 Beam Search (LLM / NLP decoding)

Beam search keeps the **B most probable partial sequences** at each decoding step. That's a Top-K over a growing frontier — a **min-heap of size B** keyed on cumulative log-probability.

```python
import heapq

def beam_step(beams, expand_fn, beam_width):
    """One beam-search step. beams: list of (logprob, sequence).
    expand_fn(seq) -> list of (token_logprob, token). Keeps top-B by total logprob."""
    candidates = []                          # min-heap of size beam_width
    for logprob, seq in beams:
        for tok_lp, tok in expand_fn(seq):
            score = logprob + tok_lp         # log-probs ADD (avoids underflow)
            item = (score, seq + [tok])
            if len(candidates) < beam_width:
                heapq.heappush(candidates, item)
            elif score > candidates[0][0]:   # beat the weakest surviving beam?
                heapq.heapreplace(candidates, item)   # pop-min + push in one op
    return sorted(candidates, reverse=True)  # best beams first
```

> 💡 **Why a heap:** the vocabulary is 50k+ tokens; expanding B beams yields B×50k candidates each step. You only want the top B. A size-B min-heap prunes in `O(V log B)` instead of sorting all `B·V` candidates (`O(BV log BV)`). `heapreplace` is the key micro-optimization — one `O(log B)` op instead of push+pop.

### 6.2 A* Search (AI pathfinding / planning)

A* pops the node with the lowest `f(n) = g(n) + h(n)` — a **min-priority-queue** keyed on `f`. This is the heap application. `decrease-key` (or lazy re-insertion) updates a node's cost when a cheaper path is found.

```python
import heapq

def a_star(start, goal, neighbors, heuristic):
    """Returns min cost from start to goal. Open set is a min-heap on f = g + h."""
    open_heap = [(heuristic(start, goal), 0, start)]   # (f, g, node)
    best_g = {start: 0}
    while open_heap:
        f, g, node = heapq.heappop(open_heap)          # lowest f expands next
        if node == goal:
            return g
        if g > best_g.get(node, float('inf')):
            continue                                   # stale entry (lazy delete)
        for nxt, cost in neighbors(node):
            ng = g + cost
            if ng < best_g.get(nxt, float('inf')):     # found a cheaper path
                best_g[nxt] = ng
                heapq.heappush(open_heap, (ng + heuristic(nxt, goal), ng, nxt))
    return float('inf')                                # EDGE CASE: unreachable
```

> Dijkstra is A* with `h ≡ 0`; same heap machinery. This powers game AI, robot motion planning, and route planners.

### 6.3 Top-K / Nucleus (Top-p) Sampling (LLM generation)

At each generation step the model outputs a probability over the whole vocabulary. **Top-K sampling** restricts to the K most probable tokens — a textbook Top-K with a size-K heap (or `torch.topk`, which uses the same idea).

```python
import heapq, math, random

def top_k_sample(logits, k, temperature=1.0):
    """Sample one token id from the top-k logits. Mirrors LLM decoding."""
    # 1. size-K min-heap keeps the k highest logits, O(V log k)
    heap = []
    for token_id, logit in enumerate(logits):
        heapq.heappush(heap, (logit / temperature, token_id))
        if len(heap) > k:
            heapq.heappop(heap)              # drop the weakest of the top-k
    # 2. softmax over just those k, then sample
    scores = [s for s, _ in heap]
    m = max(scores)
    exps = [math.exp(s - m) for s in scores]  # subtract max for numerical stability
    total = sum(exps)
    r, cum = random.random(), 0.0
    for (s, tid), e in zip(heap, exps):
        cum += e / total
        if r <= cum:
            return tid
    return heap[-1][1]
```

> 💡 **Nucleus (top-p)** is the sibling: sort tokens by probability and keep the smallest set whose cumulative probability ≥ p. Both are "keep the most probable few, discard the long tail" — the Top-K mindset applied to token distributions. `torch.topk(logits, k)` is `O(V log k)` — the same size-K heap you now understand.

### 6.4 Recommendation Systems & Vector Retrieval (nearest-neighbor)

Retrieval (RAG, semantic search, recommendations) reduces to "find the **K nearest** vectors to a query embedding." A **max-heap of size K** over similarity scores gives exact K-NN in one pass.

```python
import heapq

def knn_retrieve(query_vec, corpus, k):
    """Exact top-k nearest by cosine/dot similarity. Size-k MIN-heap on score.
    corpus: list of (id, vector). Time O(n·d + n log k)."""
    def score(v):
        return sum(a * b for a, b in zip(query_vec, v))   # dot product
    heap = []                                # min-heap on similarity
    for doc_id, vec in corpus:
        s = score(vec)
        if len(heap) < k:
            heapq.heappush(heap, (s, doc_id))
        elif s > heap[0][0]:                 # better than our weakest kept doc?
            heapq.heapreplace(heap, (s, doc_id))
    return sorted(heap, reverse=True)        # most similar first

# In production, ANN indexes (HNSW, IVF-PQ in FAISS) approximate this at scale,
# but the final re-ranking of candidates still uses a size-k heap.
```

> 💡 **Production reality:** FAISS / HNSW / ScaNN use graph or quantization indexes to avoid scanning all `n` vectors, but the **top-k selection over the candidate set is still a heap.** Every RAG pipeline's "retrieve top-k chunks" step is this pattern.

### 6.5 Priority Scheduling in ML Pipelines

Task schedulers (Airflow-style DAGs, training-job queues, inference request routing) use a priority queue to always dispatch the highest-priority ready task.

```python
import heapq, itertools

class MLJobScheduler:
    """Dispatch jobs by priority; FIFO within equal priority. push/pop O(log n)."""
    def __init__(self):
        self.pq = []
        self.counter = itertools.count()     # monotonic tie-breaker (see §2.5)

    def submit(self, job, priority):
        # lower number = higher priority; counter prevents comparing job objects
        heapq.heappush(self.pq, (priority, next(self.counter), job))

    def next_job(self):
        if not self.pq:
            return None                      # EDGE CASE: nothing ready
        return heapq.heappop(self.pq)[2]

sched = MLJobScheduler()
sched.submit("batch-inference", 5)
sched.submit("realtime-request", 1)         # urgent
sched.submit("nightly-retrain", 9)
print(sched.next_job())                      # realtime-request
```

> Inference servers (e.g., priority lanes for paid vs free tiers), GPU cluster schedulers, and feature-store backfills all lean on this exact structure.

---

## 7. Expert Takeaways & Trade-offs

### 7.1 Common Interview Patterns & Pitfalls

- **The size-K inversion** (min-heap for K-largest) is the single most-tested idea. If you hesitate here, drill §5.1 until it's reflex.
- **State your complexity as `O(n log k)`, not `O(n log n)`.** The whole point of the heap is that `k ≪ n`. Saying `log n` signals you missed the optimization.
- **Reach for `heapq.nlargest / nsmallest / heapreplace`** in interviews to show library fluency — then be ready to implement from scratch if asked.
- **The two-heap median** and **merge-K-lists** are the two "you either know it or you don't" patterns. Memorize their shapes.
- **Tuple tie-breaking** (§2.5): always add a unique counter when payloads aren't comparable. Forgetting this causes a `TypeError` that derails interviews.
- **Pitfall — "sort then take k":** correct but `O(n log n)`. Acceptable as a first answer; always follow with the heap improvement.

### 7.2 Performance Trade-offs vs Other Structures

| Structure | Peek min/max | Insert | Delete extreme | Find arbitrary | Ordered iteration |
|---|---|---|---|---|---|
| **Binary heap** | `O(1)` | `O(log n)` | `O(log n)` | `O(n)` | `O(n log n)` |
| **Sorted array** | `O(1)` | `O(n)` | `O(n)`* | `O(log n)` (bsearch) | `O(n)` (free) |
| **Balanced BST** | `O(log n)` | `O(log n)` | `O(log n)` | `O(log n)` | `O(n)` (in-order) |
| **Skip list** | `O(log n)` | `O(log n)` avg | `O(log n)` avg | `O(log n)` avg | `O(n)` |
| **Unsorted array** | `O(n)` | `O(1)` | `O(n)` | `O(n)` | `O(n log n)` |

\*`O(1)` to delete from the *end* of a sorted array; `O(n)` from the front.

> 💡 **The decision heuristic:**
> - Need only the **extreme** repeatedly, plus fast insert → **heap.**
> - Need **arbitrary lookups, ranges, or ordered traversal** too → **balanced BST / skip list.**
> - Data is **static** and you query the top once → just **sort** (or **quickselect** for `O(n)`).

### 7.3 When NOT to Use a Heap

- **You need sorted order of *everything*** — a heap gives you elements one-extraction-at-a-time (`O(n log n)` total, same as sorting) but no cheap in-order traversal. Just sort.
- **You need `search`, `range queries`, or `predecessor/successor`** — heaps are `O(n)` for arbitrary find. Use a BST / sorted container.
- **You need the Kth element *once*, all data in memory** — **quickselect** is `O(n)` average vs the heap's `O(n log k)`.
- **Sliding-window pure max/min** — a **monotonic deque** is `O(n)` and beats the heap.
- **K is close to n** — the size-K heap loses its edge; sorting is simpler and comparable.
- **Frequent arbitrary deletions/updates without an index map** — naive heap deletion is `O(n)`; either maintain a position map or use a different structure.

### 7.4 Industry Best Practices

- **Default to `heapq`** in Python; use `queue.PriorityQueue` *only* for thread-safe producer/consumer pipelines.
- **Store `(priority, tiebreak_counter, payload)` tuples** so object payloads never get compared.
- **Prefer `heapreplace` / `heappushpop`** over separate push+pop — one `O(log n)` operation, meaningfully faster in hot loops (beam search, streaming top-k).
- **Compare squared distances**, not `sqrt`, in K-NN — monotonic and cheaper.
- **For decrease-key-heavy graph algorithms**, either maintain an index map or use **lazy deletion** (push duplicates, skip stale pops) — the latter is simpler and usually fast enough.
- **At scale, don't reinvent it:** `heapq.nlargest`, `numpy.argpartition` (`O(n)` selection), `torch.topk`, and FAISS handle the heavy lifting with C/GPU speed.

> 💡 **`numpy.argpartition` is the unsung hero:** for pure numeric top-k in memory, `np.argpartition(arr, -k)[-k:]` is `O(n)` and vectorized — often faster than a Python-level heap for large arrays. Use the heap when data streams or doesn't fit in memory; use `argpartition` when it's an in-memory NumPy array.

---

## 8. Quick Reference Cheat Sheet

### Operations & Complexity

| Operation | Binary Heap | Notes |
|---|---|---|
| `peek` | `O(1)` | root = min (min-heap) or max (max-heap) |
| `push` / `insert` | `O(log n)` | append + sift-up |
| `pop` / `extract` | `O(log n)` | swap root↔last + sift-down |
| `heapify` (build) | **`O(n)`** | bottom-up sift-down, NOT `O(n log n)` |
| `decrease-key` | `O(log n)` | needs index map |
| `heapreplace` | `O(log n)` | pop-then-push in one op |
| heap sort | `O(n log n)` | in-place, `O(1)` space, not stable |
| `merge` (binary) | `O(n)` | Fibonacci heap does `O(1)` |

### `heapq` API Quick Reference

| Call | Effect |
|---|---|
| `heapq.heapify(list)` | in-place build, `O(n)` |
| `heapq.heappush(h, x)` | insert |
| `heapq.heappop(h)` | extract-min |
| `h[0]` | peek-min, `O(1)` |
| `heapq.heappushpop(h, x)` | push then pop-min (faster together) |
| `heapq.heapreplace(h, x)` | pop-min then push (heap never grows) |
| `heapq.nlargest(k, it[, key])` | top-k largest, `O(n log k)` |
| `heapq.nsmallest(k, it[, key])` | top-k smallest, `O(n log k)` |
| `heapq.merge(*iters)` | lazy merge of sorted inputs |

### Top-K Decision Trigger

```
K LARGEST  -> MIN-heap of size K   (root = weakest survivor to evict)
K SMALLEST -> MAX-heap of size K   (negate values in Python)
Streaming / can't fit in memory -> size-K heap  (NOT quickselect)
One-shot, in-memory, order-in-K irrelevant -> quickselect  O(n)
In-memory NumPy array -> np.argpartition  O(n)
Running median / quantile -> TWO heaps (max-heap lo + min-heap hi)
Sliding-window pure max/min -> monotonic deque  O(n)  (not a heap)
```

### Max-Heap in Python (min-heap → max-heap)

```python
# Numeric: negate on the way in and out
heapq.heappush(h, -x); largest = -heapq.heappop(h)
# Objects: wrap with inverted __lt__ or store (-priority, counter, obj)
```

### The One Rule to Remember

> 🎯 **A heap gives you the single most important element in `O(1)`, and keeps that promise cheap (`O(log n)`) as data changes — by refusing to sort what you'll never ask for.** For "top K of many," keep a **size-K heap of the opposite polarity** and let the root be the cutoff you evict against.

---

*End of guide. Every operation above is `O`-annotated, every concept has runnable Python, and every AI/ML/LLM link maps to a real system (beam search, A*, top-k/nucleus sampling, K-NN retrieval, priority scheduling).*

---

## Related Guides

**Prerequisites:** [Trees & Binary Search Trees](/docs/trees-and-bst) · [Sorting Algorithms](/docs/sorting-algorithms)  
**See also:** [Shortest Path Algorithms](/docs/shortest-path) · [Sorting Algorithms](/docs/sorting-algorithms) · [Streaming & Caching Data Structures](/docs/streaming-caching)

*Section: [Core DSA](/docs/category/02-core-dsa) · [All guides](/)*
