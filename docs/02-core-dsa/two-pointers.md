---
title: Two Pointers
slug: /two-pointers
sidebar_position: 1
sidebar_label: Two Pointers
description: >-
  From converging pointers to Floyd's cycle detection — turning O(n²) scans into O(n) passes.
tags:
  - two-pointers
  - arrays
  - patterns
difficulty: intermediate
reading_time: 27
prerequisites:
  - title: Arrays & Strings
    to: /docs/arrays-and-strings
pagination_prev: 01-foundation/python-internals-numpy-memory
pagination_next: 02-core-dsa/sliding-window
path_step: 7
---

# 📘 TWO POINTERS — ULTIMATE GUIDE

> *A single source of truth for the Two Pointers technique — from first principles to competitive programming, technical interviews, and real applications in AI, ML, and LLM systems.*

**Reading level:** assumes only basic arrays and loops. Everything else is built up from scratch.

---

## Table of Contents

1. [What Is Two Pointers?](#1-what-is-two-pointers)
2. [Variants & Patterns](#2-variants--patterns)
3. [Core Algorithms (8 problems)](#3-core-algorithms)
4. [Pattern Recognition Cheatsheet](#4-pattern-recognition-cheatsheet)
5. [Complexity Analysis & Comparison Tables](#5-complexity-analysis--comparison-tables)
6. [Applications in AI / ML / LLM](#6-applications-in-ai--ml--llm)
7. [Expert Takeaways & Interview Tips](#7-expert-takeaways--interview-tips)
8. [Quick Reference Card](#8-quick-reference-card)

---

# 1. What Is Two Pointers?

> 🧠 **Before you read this section:** all you need is the idea that an array is an ordered row of boxes, each reachable by an index like `arr[0]`, `arr[1]`, … The whole technique is about moving *two* index variables intelligently instead of using two nested loops.

## Definition

**Two Pointers** is an algorithmic technique that uses **two index variables** ("pointers") that traverse a data structure — usually an array, string, or linked list — in a coordinated way, so that a problem which naively needs **nested iteration (O(n²))** is solved in a **single coordinated pass (O(n))**.

The pointers are not memory addresses in the C sense; they are simply **positions** (indices, or node references) that you advance according to a decision rule derived from the problem's structure.

## Core Intuition

A brute-force solution examines **every pair** of elements: for each `i`, it loops over every `j`. That is `n × n` work. But most problems have **structure** — usually *sortedness* or *monotonicity* — that makes the vast majority of those pairs pointless to check.

Two Pointers exploits that structure with one governing idea:

> **Every pointer move must eliminate a whole set of possibilities that can never be the answer.**

Because each move discards candidates permanently, the pointers never need to backtrack, and the total number of moves is bounded by `n`. That is the entire source of the speedup: **you replace "check everything" with "each step rules out a region."**

## Real-World Analogy (non-technical)

Imagine a **long bookshelf sorted by price**, cheapest book on the left, most expensive on the right. A friend says: *"Find me two books that together cost exactly $50."*

- You put your **left hand** on the cheapest book and your **right hand** on the most expensive.
- You add the two prices.- **Too expensive?** The most expensive book can't possibly be in a $50 pair with anything cheaper still to its left, so slide your **right hand left** to a cheaper book.
- **Too cheap?** The cheapest book is dragging the total down, so slide your **left hand right** to a pricier one.
- Every time you move a hand, you *permanently* eliminate an entire book from consideration. Your hands march toward each other and you never re-check a book.

You found the pair in **one sweep of the shelf**, not by comparing every book against every other book. That march-toward-each-other sweep *is* the Two Pointers technique.

## Why It Works

Two Pointers is correct only when moving a pointer **provably discards no valid answer**. This relies on a **monotonic invariant**:

- In a **sorted** array, moving the left pointer right can only *increase* a sum; moving the right pointer left can only *decrease* it. So if the current sum is too big, the true answer cannot involve the current right element paired with anything to the left — you may safely drop it.
- In a **sliding window**, the window's aggregate (sum, count of distinct chars, …) changes **monotonically** as you extend or shrink it, so you always know which end to move.
- In **fast/slow** traversal, the speed difference guarantees the fast pointer laps the slow one *inside a cycle* but runs off the end otherwise.

The invariant is what licenses "never look back." If you can't state such an invariant, Two Pointers is likely the wrong tool.

## When to Recognize It

Reach for Two Pointers when you see these signals:

- The input is **sorted**, or sorting it doesn't destroy the answer.
- You're asked about a **pair, triplet, or contiguous subarray/substring** satisfying some condition.
- The problem wants **in-place** work with **O(1) extra space**.
- Keywords: *pair with target*, *contiguous*, *subarray*, *substring*, *palindrome*, *cycle*, *merge*, *remove duplicates in place*, *longest/shortest window*.
- A brute-force `O(n²)` solution is obvious and you suspect a linear one exists.

> ### 📦 TL;DR — What Is Two Pointers?
> Two coordinated indices sweep a structure once. Each move relies on a **monotonic invariant** to permanently discard candidates that can never be the answer, collapsing **O(n²) → O(n)** with **O(1)** space. Look for it on sorted arrays, pairs/triplets, contiguous windows, cycles, and merges.

---

# 2. Variants & Patterns

> 🧠 **Before you read this section:** you now know the *why* (a monotonic invariant lets each move discard candidates). This section catalogs the **four shapes** that idea takes. Learn to recognize the shape and the algorithm follows almost mechanically.

## 2.1 Opposite-End Pointers (converging)

Two pointers start at **both ends** and move **toward each other** until they meet.

**When to use:** sorted arrays where you seek a pair/condition (target sum, palindrome check, container area, reversing in place).

**Pointer movement (ASCII):**

```
[ 2   5   8   11   15 ]     target = 13
  ↑                ↑
  L                R      sum = 2+15 = 17 > 13  → move R left
[ 2   5   8   11   15 ]
  ↑           ↑
  L           R          sum = 2+11 = 13 = target ✓  → found

```

**Algorithm:**

1. `L = 0`, `R = n - 1`.
2. While `L < R`: evaluate `f(arr[L], arr[R])`.
3. Compare to target/condition; move `L++` or `R--` based on the monotonic rule.
4. Stop on match or when `L >= R`.

**Complexity:** Time **O(n)** (each element visited once) · Space **O(1)**.

## 2.2 Same-Direction / Sliding Window Pointers

Both pointers move in the **same direction**. A `right` pointer *expands* the window; a `left` pointer *contracts* it when a constraint is violated. The gap between them is a **contiguous window**.

**When to use:** longest/shortest contiguous subarray or substring meeting a constraint (sum ≤ K, at most K distinct chars, no repeats).

**Pointer movement (ASCII):**

```
find longest window with sum <= 8
[ 3   1   2   5   1   1 ]
  L                          window=[3]        sum=3
  R
[ 3   1   2   5   1   1 ]
  L       R                  window=[3,1,2]    sum=6  (expand)
[ 3   1   2   5   1   1 ]
  L           R              window=[3,1,2,5]  sum=11 > 8 → shrink L
[ 3   1   2   5   1   1 ]
      L       R              window=[1,2,5]    sum=8  ✓

```

**Algorithm:**

1. `left = 0`; init running aggregate (sum/count/hashmap).
2. For `right` in `0..n-1`: add `arr[right]` to the aggregate (**expand**).
3. While the window **violates** the constraint: remove `arr[left]`, `left++` (**shrink**).
4. Record the best window (`right - left + 1`) when valid.

**Complexity:** Time **O(n)** (each element enters and leaves the window at most once) · Space **O(1)** to **O(k)** (if tracking distinct elements).

## 2.3 Fast & Slow Pointers (Floyd's Cycle Detection)

Two pointers traverse the **same** sequence at **different speeds** — slow moves 1 step, fast moves 2. Also called the **tortoise and hare**.

**When to use:** cycle detection in linked lists, finding the cycle's start, locating the middle node, detecting a repeated number in an array-as-function.

**Pointer movement (ASCII):**

```
1 → 2 → 3 → 4 → 5
            ↑       ↓
            8 ← 7 ← 6      (5 → 6 → 7 → 8 → back to 4: a cycle)

step0: S=1  F=1
step1: S=2  F=3
step2: S=3  F=5
step3: S=4  F=7
step4: S=5  F=4
step5: S=6  F=6   → S == F inside the loop ⇒ CYCLE

```

**Algorithm (detect cycle):**

1. `slow = head`, `fast = head`.
2. While `fast` and `fast.next` exist: `slow = slow.next`, `fast = fast.next.next`.
3. If `slow == fast` → cycle exists.
4. (Find start) reset one pointer to head; advance both by 1; they meet at the cycle entrance.

**Complexity:** Time **O(n)** · Space **O(1)** (the key win over a hash-set approach, which costs O(n) space).

## 2.4 Multi-Array / Merge Pointers

One pointer **per sequence**, each advancing independently. Used to combine or compare multiple ordered inputs.

**When to use:** merging sorted arrays/lists, intersection/union of sorted sets, the merge step of merge sort, k-way merges.

**Pointer movement (ASCII):**

```
A = [1, 4, 7]   B = [2, 3, 8]      merged = []
     i               j
1 < 2 → take 1, i++            merged = [1]
4 > 2 → take 2, j++            merged = [1,2]
4 > 3 → take 3, j++            merged = [1,2,3]
4 < 8 → take 4, i++            merged = [1,2,3,4]
7 < 8 → take 7, i++            merged = [1,2,3,4,7]
A exhausted → drain B          merged = [1,2,3,4,7,8]

```

**Algorithm:**

1. `i = 0`, `j = 0`.
2. While both in range: append the smaller of `A[i]`/`B[j]`, advance that pointer.
3. Drain whichever array still has elements.

**Complexity:** Time **O(n + m)** · Space **O(n + m)** for the output (or **O(1)** extra if merging in place from the back).

> ### 📦 TL;DR — Variants
> | Variant | Motion | Signature use | Space |
> | --- | --- | --- | --- |
> | Opposite-end | ← converge → | sorted pair / palindrome / area | O(1) |
> | Sliding window | both → | longest/shortest contiguous window | O(1)–O(k) |
> | Fast & slow | same seq, 2× speed | cycle / middle / duplicate | O(1) |
> | Multi-array | one per array | merge / intersect sorted inputs | O(n+m) |

---

# 3. Core Algorithms

> 🧠 **Before you read this section:** each problem is deliberately ordered so the invariant compounds. Two Sum teaches the converging move; Container and Trapping Rain Water reuse it with a richer decision rule; Remove Duplicates introduces the read/write same-direction pair; the linked-list problem introduces speed; merge introduces one pointer per array; the substring and 3Sum problems combine windows and converging pointers. Read them in order the first time.

All code is Python (primary). Java/C++ differences are noted where they matter.

## 🔹 Problem 1: Two Sum II — Sorted Array `[Easy]`

**Problem Statement:** Given a **sorted** array and a target, return the 1-based indices of the two numbers that add to the target (exactly one solution exists).

**Intuition:** Two people start at opposite ends of a number line. Their combined value is maximal at the start; walk them inward, and every step trades a big value for a smaller one (or vice versa), homing in on the target.

**ASCII Diagram:**
```
[2, 7, 11, 15]  target = 9
 ↑          ↑
 L          R    sum = 2+15 = 17 > 9  → move R left
[2, 7, 11, 15]
 ↑   ↑
 L   R           sum = 2+7  = 9  ✓    → return [1, 2]
```

**Algorithm (step-by-step):**
1. `L = 0`, `R = n - 1`.
2. `s = arr[L] + arr[R]`.
3. `s == target` → return `[L+1, R+1]`.
4. `s < target` → `L++` (need a bigger sum).
5. `s > target` → `R--` (need a smaller sum).

**Code:**
```python
def two_sum_sorted(numbers, target):
    left, right = 0, len(numbers) - 1     # converging pointers at both ends
    while left < right:                   # stop when they meet
        s = numbers[left] + numbers[right]
        if s == target:                   # exact match found
            return [left + 1, right + 1]  # problem uses 1-based indices
        elif s < target:                  # sum too small -> need a larger value
            left += 1                     # left element is the smallest available
        else:                             # sum too big -> need a smaller value
            right -= 1                    # right element is the largest available
    return []                             # no pair (won't happen if guaranteed)
```

**Complexity:** Time **O(n)** · Space **O(1)**.
**Edge cases:** duplicates (fine — indices still valid), negatives (fine — sortedness is all that matters), array length < 2 (guard with `if len(numbers) < 2: return []`).
**Java/C++ note:** return `int[]{left+1, right+1}`; use `long` for the sum if values can overflow 32-bit int.

## 🔹 Problem 2: Container With Most Water `[Medium]`

**Problem Statement:** Given heights `h[i]`, pick two lines that with the x-axis form a container holding the most water. Area = `min(h[L], h[R]) * (R - L)`.

**Intuition:** Water is capped by the **shorter** wall. The widest container is the whole span; as you narrow it, the only way to possibly gain area is to abandon the **shorter** wall in hopes of a taller one.

**ASCII Diagram:**
```
h = [1, 8, 6, 2, 5, 4, 8, 3, 7]
     ↑                        ↑
     L                        R
width = 8, min(1,7)=1 -> area 8; left wall (1) is shorter -> move L right
```

**Algorithm (step-by-step):**
1. `L = 0`, `R = n - 1`, `best = 0`.
2. `area = min(h[L], h[R]) * (R - L)`; update `best`.
3. Move the pointer at the **shorter** wall inward (moving the taller one can never help).
4. Repeat until `L >= R`.

**Code:**
```python
def max_area(height):
    left, right = 0, len(height) - 1          # widest possible container first
    best = 0
    while left < right:
        h = min(height[left], height[right])  # water limited by shorter wall
        best = max(best, h * (right - left))  # area = height * width
        # Move the SHORTER wall: keeping it can only shrink or match area,
        # since width always decreases -- only a taller wall can compensate.
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
```

**Complexity:** Time **O(n)** · Space **O(1)**.
**Edge cases:** equal walls (move either — moving both is also correct), fewer than 2 lines → area 0, flat array of zeros → 0.
**Why moving the taller wall is wrong:** width shrinks regardless; if you keep the shorter wall, `min` is unchanged or smaller, so area cannot grow. That invariant makes the greedy move safe.

## 🔹 Problem 3: Remove Duplicates from Sorted Array (in place) `[Easy]`

**Problem Statement:** Given a sorted array, remove duplicates **in place** so each element appears once; return the new length `k`. The first `k` slots must hold the unique values.

**Intuition:** A **slow** write pointer marks the end of the "cleaned" prefix; a **fast** read pointer scans ahead. Whenever fast finds something new, copy it just past the clean prefix.

**ASCII Diagram:**
```
[1, 1, 2, 2, 3]
 W  R                W = write (last unique), R = read (scanner)
 1  1  -> equal, advance R only
 W     R
 1  1  2  -> new value at R -> write to W+1, advance W
    W     R
after processing: [1, 2, 3, _, _], k = 3
```

**Algorithm (step-by-step):**
1. If empty, return 0. `write = 0`.
2. For `read` in `1..n-1`: if `arr[read] != arr[write]`, do `write++`, `arr[write] = arr[read]`.
3. Return `write + 1`.

**Code:**
```python
def remove_duplicates(nums):
    if not nums:                          # empty array -> length 0
        return 0
    write = 0                             # slow pointer: end of the unique prefix
    for read in range(1, len(nums)):      # fast pointer scans the rest
        if nums[read] != nums[write]:     # found a value not yet kept
            write += 1                    # advance the write slot
            nums[write] = nums[read]      # place the new unique value
    return write + 1                      # count = last index + 1
```

**Complexity:** Time **O(n)** · Space **O(1)** (in place).
**Edge cases:** empty array (return 0), all identical (`k = 1`), already unique (`k = n`, every read triggers a write).
**Variant:** "allow at most 2 duplicates" — compare `nums[read]` against `nums[write - 1]` instead.

## 🔹 Problem 4: Trapping Rain Water `[Hard]`

**Problem Statement:** Given elevation heights, compute the total trapped rainwater after it rains.

**Intuition:** Water above any bar is `min(tallest wall to its left, tallest wall to its right) - its own height`. Two converging pointers track the running `left_max` and `right_max`; the **shorter side is the bottleneck**, so we can safely settle water there without knowing the far side exactly.

**ASCII Diagram:**
```
height = [0,1,0,2,1,0,1,3,2,1,2,1]
water fills the valleys between taller bars.
L moves in while height[L] < height[R]; water[L] = left_max - height[L]
```

**Algorithm (step-by-step):**
1. `L = 0`, `R = n-1`, `left_max = right_max = 0`, `total = 0`.
2. If `height[L] < height[R]`: update `left_max`; add `left_max - height[L]`; `L++`.
3. Else: update `right_max`; add `right_max - height[R]`; `R--`.
4. Repeat until `L >= R`.

**Code:**
```python
def trap(height):
    if not height:
        return 0
    left, right = 0, len(height) - 1
    left_max, right_max = 0, 0        # tallest wall seen from each side so far
    total = 0
    while left < right:
        # The shorter side bounds the water: whichever current height is
        # smaller, that side's max fully determines the trapped water here.
        if height[left] < height[right]:
            left_max = max(left_max, height[left])  # update left wall
            total += left_max - height[left]        # water above this bar
            left += 1
        else:
            right_max = max(right_max, height[right])
            total += right_max - height[right]
            right -= 1
    return total
```

**Complexity:** Time **O(n)** · Space **O(1)** (beats the O(n)-space prefix/suffix-array approach).
**Edge cases:** empty / one bar → 0, monotonic slope → 0 (no valley), plateaus (equal heights trap nothing).
**Common trap:** updating `total` *before* updating the running max understates water at the current bar. Update the max first.

## 🔹 Problem 5: Linked List Cycle Detection — Floyd's `[Medium]`

**Problem Statement:** Detect whether a linked list contains a cycle; if so, optionally return the node where the cycle begins.

**Intuition:** On a circular track, a fast runner (2×) eventually laps a slow runner (1×) and they collide **inside** the loop. On a straight track, the fast runner simply reaches the finish line first — no collision.

**ASCII Diagram:**
```
3 -> 2 -> 0 -> -4
     ^          |
     +----------+     (-4 links back to 2)

S,F start at 3.  S: +1,  F: +2.  They meet inside the 2->0->-4 loop.
```

**Algorithm (step-by-step):**
1. `slow = fast = head`.
2. Advance `slow` by 1 and `fast` by 2 each iteration.
3. If they ever meet → cycle. If `fast` hits `None` → no cycle.
4. **Find start:** move one pointer back to `head`; advance both by 1; the meeting point is the cycle entrance (Floyd's theorem).

**Code:**
```python
class ListNode:
    def __init__(self, val=0, nxt=None):
        self.val = val
        self.next = nxt

def detect_cycle(head):
    slow = fast = head
    while fast and fast.next:          # fast needs two hops available
        slow = slow.next               # tortoise: 1 step
        fast = fast.next.next          # hare: 2 steps
        if slow is fast:               # collision -> a cycle exists
            # Phase 2: locate the cycle's entry node.
            ptr = head
            while ptr is not slow:     # equal distance from entry guaranteed
                ptr = ptr.next
                slow = slow.next
            return ptr                 # entry node of the cycle
    return None                        # fast reached the end -> no cycle
```

**Complexity:** Time **O(n)** · Space **O(1)** (vs. O(n) for a visited-set approach).
**Edge cases:** empty list / single node with no self-loop (no cycle), single node self-loop (cycle at itself), two-node cycle.
**Why phase 2 works:** the distance from head to entry equals the distance from the meeting point to entry (mod loop length) — a classic number-theoretic result.

## 🔹 Problem 6: Merge Two Sorted Arrays `[Easy]`

**Problem Statement:** Merge sorted arrays `A` and `B` into one sorted array. (In-place variant: `A` has trailing space for `B`.)

**Intuition:** Two queues of sorted people; a bouncer repeatedly admits whoever is shorter at the front. The output comes out sorted automatically.

**ASCII Diagram:**
```
A=[1,4,7] B=[2,3,8]
   i         j
1<2 -> take 1 (i++)   -> [1]
4>2 -> take 2 (j++)   -> [1,2]
4>3 -> take 3 (j++)   -> [1,2,3]
4<8 -> take 4 (i++)   -> [1,2,3,4]
7<8 -> take 7 (i++)   -> [1,2,3,4,7]  then drain B -> [...,8]
```

**Algorithm (step-by-step):**
1. `i = j = 0`, `out = []`.
2. While both in range: append the smaller front, advance that pointer.
3. Extend `out` with the remaining tail of whichever array is left.

**Code (out-of-place, clearest):**
```python
def merge_sorted(a, b):
    i, j = 0, 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:          # <= keeps the merge STABLE (a before b on ties)
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:])             # drain leftovers (one of these is empty)
    out.extend(b[j:])
    return out
```

**Code (in-place from the back — LeetCode 88):**
```python
def merge_in_place(nums1, m, nums2, n):
    # Fill from the LARGEST end backward so we never overwrite unread data.
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:                       # once nums2 is placed, nums1 is done
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]; i -= 1
        else:
            nums1[k] = nums2[j]; j -= 1
        k -= 1
```

**Complexity:** Time **O(n + m)** · Space **O(n+m)** out-of-place, **O(1)** for the back-fill variant.
**Edge cases:** one array empty (drain the other), duplicates across arrays (stable with `<=`), unequal lengths (tail drain handles it).

## 🔹 Problem 7: Longest Substring Without Repeating Characters `[Medium]`

**Problem Statement:** Given a string, return the length of the longest substring with no repeated characters.

**Intuition:** Grow a window to the right; the moment a character repeats, slide the left edge just past its previous occurrence, so the window is always repeat-free.

**ASCII Diagram:**
```
s = "a b c a b c b b"
     L                   window "a"    len 1
     L   R               window "abc"  len 3
         L   R           'a' repeats -> jump L past old 'a' -> "bca" len 3
```

**Algorithm (step-by-step):**
1. `left = 0`, `best = 0`, `last = {}` (char → last index).
2. For `right, ch` in the string: if `ch` seen and `last[ch] >= left`, set `left = last[ch] + 1`.
3. `last[ch] = right`; update `best = max(best, right - left + 1)`.

**Code:**
```python
def length_of_longest_substring(s):
    last = {}                       # char -> its most recent index
    left = 0                        # left edge of the current window
    best = 0
    for right, ch in enumerate(s):  # right expands the window one char at a time
        # Only jump left FORWARD; a stale occurrence outside the window is ignored.
        if ch in last and last[ch] >= left:
            left = last[ch] + 1     # skip past the previous duplicate
        last[ch] = right            # record/refresh this char's position
        best = max(best, right - left + 1)  # window size = right - left + 1
    return best
```

**Complexity:** Time **O(n)** · Space **O(min(n, charset))**.
**Edge cases:** empty string → 0, all identical (`"aaaa"` → 1), all unique (→ n), spaces/unicode count as characters.
**Common trap:** forgetting the `last[ch] >= left` guard — without it, `left` can jump *backward* and corrupt the window.

## 🔹 Problem 8: 3Sum → kSum Generalization `[Medium]`/`[Hard]`

**Problem Statement:** Find all **unique** triplets summing to 0 (3Sum). Generalize to any `k`.

**Intuition:** Sort first. Fix the outermost element, then solve the smaller **2Sum** with converging pointers on the remainder. Recurse to shrink kSum down to the 2-pointer base case.

**ASCII Diagram:**
```
sorted: [-4, -1, -1, 0, 1, 2]
 fix -1  (target for the pair = +1)
          ^        ^        ^
         fix       L        R   -> -1 + (-1 + 2) = 0 ok, record; skip dupes; move both
```

**Algorithm (3Sum):**
1. Sort the array.
2. For each `i` (skip duplicate `nums[i]`): run the 2-pointer sweep on `i+1..n-1` for target `-nums[i]`.
3. On a hit, record; then **skip duplicate** `L` and `R` values to keep triplets unique.

**Code (3Sum):**
```python
def three_sum(nums):
    nums.sort()                          # sorting enables the 2-pointer inner sweep
    res = []
    n = len(nums)
    for i in range(n - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue                     # skip duplicate anchor -> unique triplets
        if nums[i] > 0:
            break                        # smallest is positive -> no zero-sum left
        left, right = i + 1, n - 1       # converging pointers on the remainder
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s == 0:
                res.append([nums[i], nums[left], nums[right]])
                left += 1; right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1            # skip duplicate lefts
                while left < right and nums[right] == nums[right + 1]:
                    right -= 1           # skip duplicate rights
            elif s < 0:
                left += 1                # need a bigger sum
            else:
                right -= 1               # need a smaller sum
    return res
```

**Code (general kSum via recursion):**
```python
def k_sum(nums, target, k):
    nums.sort()

    def solve(start, target, k):
        res = []
        if k == 2:                              # base case: converging 2-pointer
            lo, hi = start, len(nums) - 1
            while lo < hi:
                s = nums[lo] + nums[hi]
                if s == target:
                    res.append([nums[lo], nums[hi]])
                    lo += 1; hi -= 1
                    while lo < hi and nums[lo] == nums[lo - 1]:
                        lo += 1                 # dedupe
                    while lo < hi and nums[hi] == nums[hi + 1]:
                        hi -= 1
                elif s < target:
                    lo += 1
                else:
                    hi -= 1
            return res
        for i in range(start, len(nums) - k + 1):
            if i > start and nums[i] == nums[i - 1]:
                continue                        # dedupe the fixed element
            for sub in solve(i + 1, target - nums[i], k - 1):
                res.append([nums[i]] + sub)     # prepend the fixed element
        return res

    return solve(0, target, k)
```

**Complexity:** 3Sum → Time **O(n²)** · Space **O(1)** (excluding output/sort). General kSum → **O(n^(k-1))**.
**Edge cases:** fewer than k elements (empty result), all zeros (`[0,0,0]` once), duplicate-heavy input (skip logic is essential), integer overflow in Java/C++ (use `long`).

> ### 📦 TL;DR — Core Algorithms
> | # | Problem | Variant | Time | Space | Diff |
> |---|---|---|---|---|---|
> | 1 | Two Sum (sorted) | Opposite-end | O(n) | O(1) | Easy |
> | 2 | Container Most Water | Opposite-end | O(n) | O(1) | Medium |
> | 3 | Remove Duplicates | Same-direction | O(n) | O(1) | Easy |
> | 4 | Trapping Rain Water | Opposite-end | O(n) | O(1) | Hard |
> | 5 | Cycle Detection | Fast & slow | O(n) | O(1) | Medium |
> | 6 | Merge Sorted Arrays | Multi-array | O(n+m) | O(1)* | Easy |
> | 7 | Longest Substring | Sliding window | O(n) | O(k) | Medium |
> | 8 | 3Sum / kSum | Sort + converge | O(n^(k-1)) | O(1) | Med/Hard |
>
> \*in-place back-fill variant.

---

# 4. Pattern Recognition Cheatsheet

> 🧠 **Before you read this section:** you've now seen the four variants in action. The skill that separates strong candidates is *recognizing which variant a new problem needs within seconds*. This section turns that recognition into a repeatable procedure.

## Decision Tree

```
START: read the problem
│
├─ Is the input (or can it be) SORTED?
│   ├─ YES → Are you looking for a PAIR/TRIPLET with a target sum/condition?
│   │        ├─ YES → OPPOSITE-END pointers (2Sum, 3Sum, container, closest pair)
│   │        └─ NO  → Merging/intersecting multiple sorted inputs?
│   │                 ├─ YES → MULTI-ARRAY / MERGE pointers
│   │                 └─ NO  → maybe binary search instead
│   └─ NO  ↓
│
├─ Is it a CONTIGUOUS subarray / substring question
│   (longest / shortest / "at most K" / "no repeats" / sum condition)?
│   └─ YES → SLIDING WINDOW (same-direction pointers)
│
├─ Is it a LINKED LIST or a "sequence as a function" (nums[i] as next index)?
│   └─ Cycle? middle? nth-from-end? duplicate number?
│      └─ YES → FAST & SLOW pointers
│
└─ In-place array editing (remove/partition/dedupe/move zeros)?
    └─ YES → SAME-DIRECTION read/write pointers
```

## Input Type → Strategy Mapping

| Input signal | Strategy |
|---|---|
| Sorted array + target pair | Opposite-end converging |
| Sorted array + triplet/k-tuple | Sort + fix + converge (kSum) |
| Contiguous window with constraint | Sliding window |
| String, "longest/shortest ... substring" | Sliding window + hashmap |
| Linked list + cycle/middle/nth | Fast & slow |
| Multiple sorted lists/arrays | Multi-array merge |
| In-place remove/partition/move | Same-direction read/write |
| Palindrome check | Opposite-end converging |

## Keyword Triggers

- **"pair / two numbers / sum to target"** → opposite-end (sorted) or hashmap (unsorted)
- **"contiguous / subarray / substring / window"** → sliding window
- **"longest / shortest / at most K / exactly K"** → sliding window
- **"cycle / loop / repeats forever"** → fast & slow
- **"middle of the list / nth from end"** → fast & slow (offset)
- **"merge / combine / intersection of sorted"** → multi-array
- **"in place / O(1) space / remove / partition"** → same-direction read/write
- **"palindrome"** → opposite-end
- **"closest / min difference pair"** → sort + opposite-end

## Common Traps & Edge-Case Checklist

- [ ] **Empty / single-element input** — does the loop guard (`while left < right`) handle it?
- [ ] **All-duplicate input** — dedupe logic present (3Sum, remove duplicates)?
- [ ] **Pointer crossing** — is the stop condition `<` vs `<=` correct for the problem?
- [ ] **Off-by-one in window size** — `right - left + 1`, not `right - left`.
- [ ] **Left jumping backward** (sliding window) — guard with `last[ch] >= left`.
- [ ] **Updating max before/after** (trapping water) — order matters.
- [ ] **Not sorted** — opposite-end pointers require sorted input; sort first (adds O(n log n)).
- [ ] **Integer overflow** (Java/C++) — use `long` for sums.
- [ ] **Fast pointer null check** — `while fast and fast.next` before `fast.next.next`.
- [ ] **Stability on merge** — `<=` vs `<` when equal elements matter.

> ### 📦 TL;DR — Recognition
> Ask three questions in order: (1) Is it sorted / can I sort it? → opposite-end or merge. (2) Is it a contiguous window? → sliding window. (3) Is it a linked list / cyclic sequence? → fast & slow. Match keywords, then run the edge-case checklist before coding.

---

# 5. Complexity Analysis & Comparison Tables

> 🧠 **Before you read this section:** you need one idea — *amortized linear cost*. A pointer that only ever moves forward across `n` elements does at most `n` moves total, no matter how the inner logic branches. Two such pointers ⇒ at most `2n` moves ⇒ **O(n)**.

## How Two Pointers Turns O(n²) into O(n)

**Brute force** for "find a pair summing to target":
```python
for i in range(n):          # n iterations
    for j in range(i+1, n):  # up to n iterations each
        if a[i] + a[j] == target: ...
# total comparisons ≈ n(n-1)/2  →  O(n²)
```
Every pair is examined — `~n²/2` operations.

**Two Pointers** (sorted):
```python
left, right = 0, n - 1
while left < right:          # each step moves L right or R left
    ...                      # L and R together move at most n times
```
Because `left` only increases and `right` only decreases, and they never cross back, the **total number of iterations is at most `n`**. Each iteration does O(1) work → **O(n)** overall.

The magic: sorting encodes a **monotonic relationship** so that one comparison lets us discard an entire row/column of the brute-force pair matrix in a single move, instead of testing each cell.

## Comparison Table: Brute Force vs Two Pointers vs Optimal

| Problem | Brute Force | Two Pointers | Best Known / Notes |
|---|---|---|---|
| Two Sum (sorted) | O(n²) time, O(1) | **O(n)** time, O(1) | O(n) — optimal |
| Two Sum (unsorted) | O(n²) time, O(1) | O(n log n) (sort first) | **O(n)** with hashmap |
| Container With Most Water | O(n²) time, O(1) | **O(n)** time, O(1) | O(n) — optimal |
| Trapping Rain Water | O(n²) time, O(1) | **O(n)** time, **O(1)** | O(n) time; DP uses O(n) space |
| 3Sum | O(n³) time | **O(n²)** time, O(1) | O(n²) — optimal |
| Longest Substr. No Repeat | O(n³) / O(n²) | **O(n)** time, O(k) | O(n) — optimal |
| Cycle Detection | O(n) time, **O(n)** space (set) | O(n) time, **O(1)** space | Floyd's — optimal space |
| Merge Two Sorted | O((n+m)log(n+m)) if concat+sort | **O(n+m)** time | O(n+m) — optimal |

## Space Complexity Trade-offs

- **O(1) is the headline win.** Opposite-end, sliding-window (numeric), fast/slow, and in-place merge all use constant extra space — critical for memory-constrained or streaming settings.
- **Sliding window with distinct-element tracking** costs **O(k)** for the hashmap/frequency table, where `k` is the alphabet or window size. Still far below O(n²) time.
- **Fast & slow vs hash-set** for cycles: the hash-set approach is also O(n) time but **O(n) space**. Floyd's brings it to **O(1)** — the canonical reason to prefer it.
- **Sorting cost:** if you must sort an unsorted input to enable opposite-end pointers, you pay **O(n log n)** time and possibly **O(n)** space for the sort — sometimes a plain hashmap (O(n) time, O(n) space, no sort) is better. Choose based on whether output must be sorted / deduped.

> ### 📦 TL;DR — Complexity
> Two Pointers collapses O(n²) → O(n) because each pointer moves monotonically at most `n` times, and sorting/monotonicity lets one comparison discard many candidates. Space is usually **O(1)** (O(k) for distinct-tracking windows). If you must sort first, weigh O(n log n) sort vs an O(n)-space hashmap.

---

# 6. Applications in AI / ML / LLM

> 🧠 **Before you read this section:** the same "coordinated window over a sequence" idea that solves array problems is *everywhere* in data-heavy systems. Sequences here are time-series, token streams, or DNA — but the pointer mechanics are identical.

## AI / ML — Sliding Window over Time-Series & Feature Extraction

Time-series models (forecasting, anomaly detection, sensor analytics) rarely feed the whole signal at once. A **sliding window** carves fixed-length (or condition-bounded) segments used as model inputs or for rolling statistics.

```python
def rolling_features(series, window):
    # Two-pointer window computing a rolling mean in O(n), not O(n*window).
    left = 0
    running = 0.0
    means = []
    for right in range(len(series)):
        running += series[right]              # expand window with new sample
        if right - left + 1 > window:         # window too wide -> shrink
            running -= series[left]
            left += 1
        if right - left + 1 == window:
            means.append(running / window)    # emit feature for full window
    return means
```
- **Where it shows up:** rolling mean/std features, windowed FFT, sequence-to-sequence batching, sliding-window augmentation, sessionization of user events.
- **Payoff:** the running-aggregate trick avoids recomputing each window from scratch — **O(n)** instead of **O(n · window)**.

## LLMs — Tokenization Windows, Attention Spans, Context Management

- **Chunking for tokenization / RAG:** long documents are split into overlapping windows (e.g. 512 tokens, stride 128) using two pointers — `start` and `end` — that slide across the token stream. The overlap (`stride < window`) preserves context across chunk boundaries.
```python
def chunk_tokens(tokens, window=512, stride=128):
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + window            # right pointer bounds the chunk
        chunks.append(tokens[start:end])
        if end >= len(tokens):
            break
        start += stride                 # slide left pointer by stride (overlap)
    return chunks
```
- **Sliding-window attention** (Longformer, Mistral): instead of full O(n²) attention over all token pairs, each token attends only to a **fixed window** of neighbors — literally a two-pointer span around each position — cutting attention cost toward O(n · w).
- **KV-cache / context management:** streaming LLMs keep a moving window of recent tokens ("attention sink" + recent window), evicting old tokens with a left pointer as new tokens arrive at the right — bounding memory for effectively infinite streams.

## Data Engineering — Stream Processing & Deduplication

- **Windowed stream aggregation:** tumbling/sliding windows over event streams (Flink, Spark Structured Streaming) are two-pointer spans over time-ordered events.
- **Deduplication pipelines:** the same-direction read/write pointer pattern (Problem 3) deduplicates sorted record streams in a single pass with O(1) extra state.
- **Merge of sorted shards:** the multi-array merge (Problem 6) is exactly how external merge-sort and log-structured merge (LSM) trees combine sorted runs.

## Bioinformatics (bonus) — DNA Sequence Alignment

DNA/RNA/protein alignment slides windows across two sequences and compares regions:
- **k-mer windows:** a sliding window of length `k` extracts overlapping subsequences (k-mers) for indexing/hashing (minimizers, MinHash).
- **Two-sequence pointers:** global/local alignment and seed-and-extend heuristics (BLAST) advance one pointer per sequence, extending matches — a merge-style two-pointer walk with a scoring rule.
```
seq A: ...G G T A C ...
              ^ ^        window slides right, comparing to seq B's window
seq B: ...G G T T C ...
```

> ### 📦 TL;DR — Applications
> A "two-pointer window over a sequence" reappears as: rolling features in time-series ML, overlapping chunking + sliding-window attention + KV-cache eviction in LLMs, windowed aggregation + dedup + sorted-run merge in data engineering, and k-mer/alignment walks in bioinformatics. Same mechanics, different sequence.

---

# 7. Expert Takeaways & Interview Tips

> 🧠 **Before you read this section:** the algorithms are the easy part; *communicating them under pressure* is what interviews actually test. This section is about avoiding self-inflicted wounds and signalling senior-level thinking.

## Common Interview Mistakes (and fixes)

1. **Jumping to two pointers without justifying the invariant.** Interviewers want to hear *why* moving a pointer is safe. Say: "Because the array is sorted, moving left up can only increase the sum, so I can discard this pair." → Always state the monotonic reason.
2. **Forgetting the input must be sorted.** Opposite-end logic silently breaks on unsorted data. Fix: state "this requires sorted input; I'll sort in O(n log n) or use a hashmap if order can't change."
3. **Off-by-one on window size** (`right - left` vs `right - left + 1`). Fix: verify on a length-1 window.
4. **Null-pointer crash in fast/slow.** Checking `fast.next.next` without guarding `fast and fast.next`. Fix: guard in the `while` condition.
5. **Losing uniqueness in 3Sum.** Forgetting to skip duplicate anchors and duplicate L/R. Fix: the two inner skip-loops.
6. **Backward `left` jump in sliding window.** Fix: `left = max(left, last[ch] + 1)` or the `last[ch] >= left` guard.

## Pro Tips from Competitive Programmers

- **Sort first, ask questions later** — if the problem hints at pairs/triplets and order doesn't matter, sorting unlocks opposite-end pointers almost every time.
- **Two pointers ↔ sliding window are the same family.** Frame "at most K / exactly K" window problems as *expand-right, shrink-left*.
- **"Exactly K" = atMost(K) − atMost(K−1).** A classic trick to convert an awkward exact-count window into two easy at-most windows.
- **Convert 2Sum-on-unsorted to a hashmap**; keep two pointers for the sorted/space-constrained case. Know both.
- **Fast/slow also finds the middle** (`slow` ends at the midpoint when `fast` hits the end) and the **nth-from-end** (start `fast` n steps ahead).
- **Dry-run on a length-2 input** before declaring done — most bugs surface there.

## Edge Cases That Trip Up Even Experienced Engineers

- Duplicate-heavy arrays in kSum (uniqueness).
- Windows where the constraint is "at most K distinct" vs "exactly K" (different shrink logic).
- Even- vs odd-length lists in fast/slow middle-finding (which of the two middles you return).
- Negative numbers breaking assumptions in "container"/"trapping" reasoning (they don't — but people second-guess).
- Empty inputs and single-element inputs silently passing wrong answers.

## How to Communicate Your Approach in Interviews

Use this **4-beat script**:
1. **Restate + spot the signal:** "It's a sorted array and we want a pair summing to target — that's a converging two-pointer signal."
2. **State the invariant:** "Because it's sorted, if the sum is too big I move right down; that provably discards no valid pair."
3. **Give complexity up front:** "This is O(n) time, O(1) space, versus O(n²) brute force."
4. **Walk a tiny example, then code, then test edge cases aloud:** narrate the length-1/length-2 and duplicate cases.

This ordering signals *pattern recognition → correctness reasoning → complexity awareness → verification* — exactly the senior competencies interviewers score.

> ### 📦 TL;DR — Expert
> State the invariant before you code, remember opposite-end needs sorted input, guard null pointers and off-by-ones, and dedupe in kSum. Communicate in four beats: signal → invariant → complexity → example+edge cases.

---

# 8. Quick Reference Card

> 📌 **Printable one-page cheat sheet.**

### The One Rule
> Two coordinated indices sweep once; every move discards candidates that can never be the answer (relies on a **monotonic invariant**). Result: **O(n²) → O(n)**, usually **O(1)** space.

### Four Variants at a Glance
| Variant | Setup | Move rule | Signature problems |
|---|---|---|---|
| **Opposite-end** | `L=0, R=n-1` | shrink the side that overshoots | 2Sum sorted, container, trap water, palindrome |
| **Sliding window** | `L=0`, `R` scans | expand R; shrink L on violation | longest substring, min window, at-most-K |
| **Fast & slow** | both at head | `slow+1`, `fast+2` | cycle detect, middle, nth-from-end |
| **Multi-array** | `i` per array | advance the smaller front | merge sorted, intersection, k-way merge |

### Recognition Triggers
`pair/target sum` → opposite-end · `contiguous/substring/longest/at-most-K` → window · `cycle/middle/nth` → fast&slow · `merge/intersect sorted` → multi-array · `in-place remove/partition` → read/write.

### Complexity Snapshot
| Pattern | Time | Space |
|---|---|---|
| Opposite-end | O(n) | O(1) |
| Sliding window | O(n) | O(1)–O(k) |
| Fast & slow | O(n) | O(1) |
| Merge | O(n+m) | O(1)–O(n+m) |
| 3Sum / kSum | O(n^(k-1)) | O(1) |

### Templates
```python
# Opposite-end (sorted pair)
L, R = 0, len(a) - 1
while L < R:
    s = a[L] + a[R]
    if s == target: return (L, R)
    elif s < target: L += 1
    else: R -= 1

# Sliding window (longest valid)
L = 0
for R in range(len(a)):
    add(a[R])
    while invalid():
        remove(a[L]); L += 1
    best = max(best, R - L + 1)

# Fast & slow (cycle)
slow = fast = head
while fast and fast.next:
    slow, fast = slow.next, fast.next.next
    if slow is fast: return True
return False

# Merge two sorted
i = j = 0; out = []
while i < len(a) and j < len(b):
    if a[i] <= b[j]: out.append(a[i]); i += 1
    else: out.append(b[j]); j += 1
out += a[i:]; out += b[j:]
```

### Pre-Submit Checklist
- [ ] Sorted (if opposite-end)? · [ ] Empty/1-elem guarded? · [ ] Off-by-one on window size? · [ ] Null check in fast/slow? · [ ] Duplicates skipped (kSum)? · [ ] Complexity stated?

---

*End of guide — you now hold the complete Two Pointers reference: theory, four variants, eight coded algorithms, recognition framework, complexity math, cross-domain applications, and interview craft.*

---

## Related Guides

**Prerequisites:** [Arrays & Strings](/docs/arrays-and-strings)  
**See also:** [Sliding Window](/docs/sliding-window) · [Binary Search & Search on Answer](/docs/binary-search) · [Linked Lists](/docs/linked-lists)

*Section: [Core DSA](/docs/category/02-core-dsa) · [All guides](/)*
