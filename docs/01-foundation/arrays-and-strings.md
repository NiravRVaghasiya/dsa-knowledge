---
title: Arrays & Strings
slug: /arrays-and-strings
sidebar_position: 2
sidebar_label: Arrays & Strings
description: >-
  Indexing, slicing, and in-place operations for arrays and strings — the substrate for most other techniques.
tags:
  - arrays
  - strings
  - fundamentals
difficulty: beginner
reading_time: 23
prerequisites:
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
pagination_prev: foundation/big-o-complexity
pagination_next: foundation/hash-maps-and-sets
path_step: 2
---

# Arrays & Strings: The Ultimate Reference Guide

> A single, authoritative reference on **indexing, slicing, and in-place operations** for arrays and strings — written for practitioners in **Data Structures, AI, ML, and LLM** systems.
>
> Every concept is built up from first principles (memory model → mechanics → analogy → code → algorithm → complexity → applied context), so this document can stand alone with no supplementary material.

---

## Table of Contents

1. [Arrays](#1-arrays)
   - 1.1 Definition & Memory Model
   - 1.2 Indexing (Positive, Negative, Multi-dimensional)
   - 1.3 Slicing (Basic, Step, Multi-dim)
   - 1.4 In-Place Operations
   - 1.5 Common Algorithms (Two-Pointer, Sliding Window, In-Place Reversal)
   - 1.6 DS/AI/ML/LLM Applied Context
   - 1.7 ⚡ Cheat Sheet & Expert Takeaways
2. [Strings](#2-strings)
   - 2.1 Definition & Immutability Model
   - 2.2 Indexing & Slicing
   - 2.3 In-Place Simulation Techniques
   - 2.4 Common Algorithms (Palindrome, Anagram, Pattern Matching)
   - 2.5 DS/AI/ML/LLM Applied Context
   - 2.6 ⚡ Cheat Sheet & Expert Takeaways
3. [Comparative Analysis: Arrays vs Strings](#3-comparative-analysis-arrays-vs-strings)
4. [Master Cheat Sheet](#4-master-cheat-sheet-all-operations-at-a-glance)
5. [Interview & Production Readiness Checklist](#5-interview--production-readiness-checklist)

---

# 1. Arrays

## 1.1 Definition & Memory Model

An **array** is a collection of elements stored in a **contiguous block of memory**, where each element is accessible by an integer **index**. Contiguity is the single most important property — it is what gives arrays their signature **O(1) random access**.

### The critical distinction in Python

Python has **three** things people loosely call "arrays," and conflating them is the #1 source of confusion:

| Type | Contiguous? | Homogeneous? | Stores | Random access |
|------|-------------|--------------|--------|---------------|
| `list` | Pointers are contiguous | No (mixed types) | **Pointers** to `PyObject`s | O(1) |
| `array.array` | Yes | Yes (typed) | Raw C values | O(1) |
| `numpy.ndarray` | Yes (by default) | Yes (dtype) | Raw C values | O(1) |

A Python **`list`** is *not* a C array of values. It is a **dynamic array of pointers** — a contiguous buffer of `PyObject*` references, each pointing to a boxed object living elsewhere on the heap. This is why a list can hold `[1, "two", 3.0, None]` simultaneously.

A **NumPy `ndarray`** *is* the classic array: a single flat C buffer of raw values of one `dtype`, plus a small header describing how to interpret it (shape, strides, dtype). This is what makes NumPy fast and memory-dense — and it is the structure that underlies every tensor in ML.

### How memory allocation actually works

**Static arrays** (C, `numpy` with fixed size) allocate a fixed-size contiguous block up front. The address of element `i` is computed directly:

```
address(i) = base_address + i * itemsize
```

This is pure arithmetic — no scanning, no traversal — hence **O(1)**.

**Dynamic arrays** (`list`, C++ `std::vector`, Java `ArrayList`) over-allocate. When they fill up, they allocate a *new*, larger buffer (typically ~1.125× for CPython lists, ~2× for many others), copy everything over, and free the old buffer. This copy is O(n), but because it happens rarely (geometrically), the **amortized** cost of `append` is **O(1)**.

```python
import sys

lst = []
prev = -1
for i in range(20):
    size = sys.getsizeof(lst)
    if size != prev:          # capacity grew (buffer reallocated)
        print(f"len={len(lst):2d}  bytes={size}")
        prev = size
    lst.append(i)
# You'll see the byte count jump in discrete steps, not on every append —
# proof of geometric over-allocation and amortized O(1) growth.
```

### NumPy strides — the mechanism behind multi-dim arrays

A NumPy array stores its data as **one flat 1D buffer**. Multi-dimensional indexing is an *interpretation layer* on top, defined by **strides**: the number of bytes to step in each dimension.

```python
import numpy as np

a = np.arange(12, dtype=np.int64).reshape(3, 4)
print(a.shape)     # (3, 4)
print(a.strides)   # (32, 8)  -> 32 bytes to move one row, 8 bytes one column (int64 = 8 bytes)
print(a.flags['C_CONTIGUOUS'])  # True (row-major)
```

The element at `a[i, j]` lives at byte offset `i*strides[0] + j*strides[1]` from the buffer start. This is why **reshape** and **transpose** are usually free — they change the header (shape/strides), not the data.

> 💡 **Analogy — the numbered train:**
> *"Think of an array like a numbered train with fixed-length carriages. Each carriage (index) holds exactly one passenger (value). Because every carriage is the same length and they're coupled in a line, the conductor can jump directly to carriage #47 by computing `platform_start + 47 × carriage_length` — no need to walk past the first 46. That direct jump is O(1) access. A linked list, by contrast, is a treasure hunt: each carriage only tells you where the next one is, so reaching #47 means visiting all 47 — O(n)."*

> 🧠 **Chain-of-thought framing:**
> - *Beginner needs:* "index = position, access is instant, memory is a row of boxes."
> - *ML engineer needs:* strides, contiguity, and dtype — because these decide whether an operation is a free view or a costly copy on a 10 GB tensor.
> - *Common expert mistake:* assuming a Python `list` is cache-friendly like a C array. It isn't — its pointers scatter the actual objects across the heap, destroying locality. For numeric work, always reach for NumPy.

---

## 1.2 Indexing (Positive, Negative, Multi-dimensional)

**Indexing** retrieves (or assigns) the element at a specific position. In Python indices are **0-based**: the first element is index `0`, the last is index `n-1`.

### Positive & negative indexing

```python
arr = [10, 20, 30, 40, 50]

arr[0]     # 10   -> first element
arr[4]     # 50   -> last element (n-1)
arr[-1]    # 50   -> last element (negative counts from the end)
arr[-2]    # 40   -> second to last
# Negative index rule: arr[-k] is equivalent to arr[len(arr) - k]
```

Negative indexing is syntactic sugar: `arr[-k]` is internally normalized to `arr[len(arr) - k]`. It costs the same O(1).

### Out-of-bounds behavior (an important edge case)

```python
arr = [10, 20, 30]

arr[5]         # IndexError: list index out of range
arr[-4]        # IndexError: list index out of range

# Slicing, however, NEVER raises for out-of-bounds — it clamps silently:
arr[5:10]      # []        (no error!)
arr[-100:2]    # [10, 20]  (clamped to valid range)
```

This asymmetry — indexing raises, slicing clamps — trips up even experienced developers. It is a frequent source of silent bugs where a slice quietly returns fewer elements than expected.

### Multi-dimensional indexing (NumPy)

```python
import numpy as np

m = np.array([[1, 2, 3],
              [4, 5, 6],
              [7, 8, 9]])

m[1, 2]        # 6   -> row 1, col 2 (preferred tuple indexing)
m[1][2]        # 6   -> works but slower: creates an intermediate array m[1], then indexes it
m[-1, -1]      # 9   -> negative works per-axis
m[0]           # array([1, 2, 3])  -> a whole row

# Fancy indexing (returns a COPY, not a view):
m[[0, 2], :]           # rows 0 and 2 -> [[1,2,3],[7,8,9]]

# Boolean masking (also a COPY):
m[m > 5]               # array([6, 7, 8, 9]) -> flattened
```

> 💡 **Analogy — the spreadsheet:**
> *"A 2D array is a spreadsheet. `m[1, 2]` is 'go to row 1, column 2' — one direct lookup. Writing `m[1][2]` is like photocopying the entire row 1 onto a new sheet and then reading column 2 from the copy: same answer, extra work. Always give both coordinates at once."*

### Complexity

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| `arr[i]` (positive/negative) | **O(1)** | O(1) | Pure address arithmetic |
| `m[i, j]` (n-dim, fixed dims) | **O(1)** | O(1) | Offset via strides |
| Fancy index `m[[i,j,k]]` | **O(k)** | **O(k)** | Allocates a copy of k elements |
| Boolean mask `m[mask]` | **O(n)** | O(matches) | Scans all n elements |

> 🧠 **Pro Tip:** In ML code, `m[1, 2]` (tuple indexing) and `m[1][2]` (chained indexing) give the same value but the chained form materializes an intermediate array — measurable overhead in tight loops over large tensors. And remember: **basic indexing/slicing returns a view; fancy (list/array) and boolean indexing return a copy.** Accidentally triggering copies inside a training loop is a classic silent memory-and-speed regression.

---

## 1.3 Slicing (Basic, Step, Multi-dim)

**Slicing** extracts a subsequence using the syntax `arr[start:stop:step]`. The `stop` index is **exclusive**.

### The mental model

```
arr[start : stop : step]
      │       │      └── stride (default 1); negative reverses direction
      │       └───────── exclusive end (default len(arr))
      └───────────────── inclusive start (default 0)
```

### Basic and step slicing

```python
arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

arr[2:5]       # [2, 3, 4]        -> indices 2,3,4 (5 excluded)
arr[:3]        # [0, 1, 2]        -> start defaults to 0
arr[7:]        # [7, 8, 9]        -> stop defaults to len
arr[:]         # full shallow copy of the list
arr[::2]       # [0, 2, 4, 6, 8]  -> every 2nd element
arr[::-1]      # [9,8,7,6,5,4,3,2,1,0] -> reversed (negative step)
arr[5:1:-1]    # [5, 4, 3, 2]     -> reverse walk, stop exclusive

# Edge cases — slicing NEVER raises:
arr[100:200]   # []               -> out of range clamps to empty
arr[-3:]       # [7, 8, 9]        -> last 3
```

### 🔑 The single most important slicing gotcha: **view vs copy**

This distinction is *the* thing that separates correct high-performance ML code from buggy code.

```python
# ---- Python list: slicing returns a COPY ----
lst = [1, 2, 3, 4, 5]
sub = lst[1:4]         # [2, 3, 4]  -> a NEW list
sub[0] = 999
print(lst)             # [1, 2, 3, 4, 5]  -> ORIGINAL UNCHANGED

# ---- NumPy array: slicing returns a VIEW (shares memory!) ----
import numpy as np
a = np.array([1, 2, 3, 4, 5])
v = a[1:4]             # [2, 3, 4]  -> a VIEW into the same buffer
v[0] = 999
print(a)               # [1, 999, 3, 4, 5]  -> ORIGINAL MUTATED!

# To force a copy in NumPy:
safe = a[1:4].copy()
```

- **Python lists / strings / tuples:** slicing **copies**.
- **NumPy arrays:** basic slicing returns a **view** (zero-copy, O(1) — it just adjusts offset/shape/strides).

You can check with `.base`:

```python
v = a[1:4]
print(v.base is a)     # True  -> v is a view backed by a
```

### Multi-dimensional slicing

```python
import numpy as np
m = np.arange(1, 13).reshape(3, 4)
# [[ 1  2  3  4]
#  [ 5  6  7  8]
#  [ 9 10 11 12]]

m[0:2, :]      # first 2 rows, all cols  -> [[1,2,3,4],[5,6,7,8]]
m[:, 1:3]      # all rows, cols 1-2      -> [[2,3],[6,7],[10,11]]
m[::2, ::2]    # every other row & col   -> [[1,3],[9,11]]
m[1:, :-1]     # rows from 1, drop last col -> [[5,6,7],[9,10,11]]
m[..., 0]      # ellipsis: first element of last axis, any # of leading dims
```

> 💡 **Analogy — the film strip vs the photocopy:**
> *"A NumPy slice is like putting a cardboard frame over part of a film strip — you're looking at a window onto the same physical film. Draw on what you see and you've drawn on the original. A Python-list slice is like photocopying those frames onto fresh paper — scribble all you want, the original is untouched. Knowing which one you're holding is the difference between a subtle data-corruption bug and correct code."*

### Complexity

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| `list[a:b]` | O(k) | **O(k)** | Copies k elements |
| `ndarray[a:b]` (basic) | **O(1)** | **O(1)** | View: only header changes |
| `ndarray[a:b].copy()` | O(k) | O(k) | Explicit copy |
| `arr[::-1]` on list | O(n) | O(n) | Reversed copy |
| `arr[::-1]` on ndarray | **O(1)** | **O(1)** | View with negative stride |

> 🧠 **Pro Tip:** In LLM pipelines, `input_ids[:, :512]` to enforce a context window is a hot-path operation. On NumPy/PyTorch tensors this is a free view — no data movement. Prefer **view-based slicing** over `.copy()`/`np.array(...)` unless you specifically need to detach from the source. But beware the flip side: if you slice a giant tensor to keep a tiny window and hold the view forever, the *entire* original buffer stays alive in memory because the view references it. When you need only a small permanent subset of a huge array, `.copy()` deliberately to let the big buffer be freed.

---

## 1.4 In-Place Operations

**In-place** operations mutate the existing object rather than creating a new one. They matter because they use **O(1) auxiliary space** and avoid reallocation — essential when arrays are large (think multi-GB tensors) or when an algorithm requires it.

### List in-place methods (mutate, return `None`)

```python
arr = [3, 1, 2]

arr.append(4)        # [3, 1, 2, 4]        amortized O(1)
arr.extend([5, 6])   # [3, 1, 2, 4, 5, 6]  O(k)
arr.insert(0, 99)    # [99, 3, 1, 2, ...]  O(n) — shifts everything right
arr.pop()            # removes & returns last     O(1)
arr.pop(0)           # removes & returns first     O(n) — shifts everything left
arr.remove(1)        # removes first value==1      O(n)
arr.sort()           # sorts in place              O(n log n)
arr.reverse()        # reverses in place           O(n)

# CRITICAL: these return None. This is a classic bug:
arr = arr.sort()     # ❌ arr is now None!
arr.sort()           # ✅ correct — mutate, don't reassign
```

### NumPy in-place operations

```python
import numpy as np
a = np.array([1, 2, 3, 4])

a += 10               # in-place add       -> [11,12,13,14]  (no new buffer)
a *= 2                # in-place multiply
np.multiply(a, 2, out=a)   # explicit in-place via out=
a.sort()              # in-place sort
a[:] = 0              # broadcast-assign into existing buffer (in-place)

# Contrast with the copying form:
b = a + 10            # allocates a NEW array
```

The `out=` parameter and augmented assignments (`+=`, `*=`) are how you avoid allocations in NumPy — critical for memory-bound numerical loops.

> 💡 **Analogy — repainting a room vs building a new house:**
> *"An in-place operation is repainting the walls of your current room — same address, new color, no moving costs. A copying operation is building an entirely new house with the new paint and moving all your furniture in. For a small room, who cares. For a mansion (a 10 GB tensor), the difference is whether you run out of land (RAM) entirely."*

### Complexity summary

| Operation | Time | Space | Mutates? |
|-----------|------|-------|----------|
| `append` | Amortized O(1) | O(1) | ✅ |
| `insert(0, x)` / `pop(0)` | O(n) | O(1) | ✅ |
| `sort()` | O(n log n) | O(n)† | ✅ |
| `reverse()` | O(n) | O(1) | ✅ |
| NumPy `+=`, `out=` | O(n) | **O(1)** | ✅ |
| `b = a + 10` | O(n) | **O(n)** | ❌ (new array) |

† CPython's Timsort uses up to O(n) temporary space in the worst case.

> 🧠 **Pro Tip:** Two pitfalls dominate here. (1) List mutators **return `None`** — `x = x.sort()` silently destroys your data; this is one of the most common Python bugs in production. (2) In NumPy, in-place ops on a **view** mutate the parent array — and mixing an in-place op with broadcasting (`a[mask] += 1` where indices repeat) can behave unexpectedly; use `np.add.at()` for correct unbuffered accumulation.

---

## 1.5 Common Algorithms

These three patterns — **two-pointer**, **sliding window**, and **in-place reversal** — are the workhorses of array/string interviews *and* the backbone of many production data routines (dedup, windowed aggregation, buffer manipulation).

### A. Two-Pointer

Use two indices moving toward each other (or in the same direction) to solve in O(n) what naïvely looks O(n²).

```python
def two_sum_sorted(arr, target):
    """Find indices of two numbers in a SORTED array summing to target.
    Time: O(n)   Space: O(1)"""
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return (left, right)
        elif s < target:
            left += 1          # need a bigger sum -> move left up
        else:
            right -= 1         # need a smaller sum -> move right down
    return None

print(two_sum_sorted([1, 2, 4, 7, 11, 15], 15))  # (0, 4) -> 1 + 11? no: (3,?) ...
# 4 + 11 = 15 -> indices (2, 4)
```

- **Time:** O(n) — each pointer moves at most n steps total.
- **Space:** O(1) — no extra structures.
- **Why it beats brute force:** the sorted order lets us discard half the search space at each step, replacing the inner loop of an O(n²) double scan.

### B. Sliding Window

Maintain a moving window `[left, right]` and update an aggregate incrementally instead of recomputing from scratch.

```python
def max_subarray_sum_k(arr, k):
    """Max sum of any contiguous subarray of length k.
    Time: O(n)   Space: O(1)"""
    if len(arr) < k:
        return None
    window = sum(arr[:k])          # first window: O(k)
    best = window
    for right in range(k, len(arr)):
        window += arr[right] - arr[right - k]   # add new, drop old — O(1) per step
        best = max(best, window)
    return best

print(max_subarray_sum_k([2, 1, 5, 1, 3, 2], 3))  # 9  (5+1+3)
```

- **Time:** O(n) — the naïve version recomputes each window in O(k) for O(n·k); the sliding update makes each step O(1).
- **Space:** O(1) for fixed windows; O(window) if you track contents (e.g., a variable-size window with a hash set for "longest substring without repeats").

### C. In-Place Reversal (Two-Pointer variant)

The canonical O(1)-space transformation.

```python
def reverse_in_place(arr):
    """Reverse a list in place.
    Time: O(n)   Space: O(1)"""
    left, right = 0, len(arr) - 1
    while left < right:
        arr[left], arr[right] = arr[right], arr[left]  # swap
        left += 1
        right -= 1
    return arr

print(reverse_in_place([1, 2, 3, 4, 5]))  # [5, 4, 3, 2, 1]
```

- **Time:** O(n) — n/2 swaps.
- **Space:** O(1) — swaps in place, no auxiliary array.
- **Contrast:** `arr[::-1]` is O(n) time **and** O(n) space (new list); `reverse_in_place` is O(n) time, **O(1)** space.

> 💡 **Analogy — the two-pointer handshake:**
> *"Two-pointer reversal is like two people at opposite ends of a row of chairs swapping seats, then each stepping one chair inward, repeating until they meet in the middle. No extra chairs (memory) are ever needed."*

> 🧠 **Pro Tip:** Recognize the trigger conditions. **Sorted input + pair/target question → two-pointer.** **"Contiguous subarray/substring" + max/min/count → sliding window.** **"Do it in O(1) extra space" → in-place two-pointer swaps.** These pattern-matches turn a 20-minute struggle into a 3-minute solve, both in interviews and when you're reaching for the right idiom in production code.

---

## 1.6 DS/AI/ML/LLM Applied Context

Arrays are not an academic topic in ML — they *are* the substrate. Every tensor is an n-dimensional array.

### Tensors are strided arrays

A PyTorch/TensorFlow tensor is a NumPy `ndarray` with autograd and GPU support bolted on. Shape, strides, dtype, contiguity — all the concepts from §1.1–1.3 apply directly.

```python
import numpy as np

# A batch of token embeddings: (batch=4, seq_len=128, hidden=768)
embeddings = np.random.randn(4, 128, 768).astype(np.float32)

# --- Batch slicing: take the first 2 sequences (view, O(1)) ---
first_two = embeddings[:2]                 # (2, 128, 768)

# --- Context-window truncation: keep first 64 tokens (view, O(1)) ---
truncated = embeddings[:, :64, :]          # (4, 64, 768)

# --- Extract the [CLS] token embedding (position 0) for each sequence ---
cls = embeddings[:, 0, :]                  # (4, 768) — pooled sentence rep

# --- Select specific attention heads by reshaping (view when contiguous) ---
# (batch, seq, heads=12, head_dim=64)
mh = embeddings.reshape(4, 128, 12, 64)
head_3 = mh[:, :, 3, :]                    # (4, 128, 64)
```

### Why view-vs-copy is a production concern

```python
# ❌ Accidentally doubling memory on a 10GB activation tensor:
padded = np.zeros((4, 512, 768), dtype=np.float32)
padded[:, :128, :] = embeddings            # in-place write into pre-allocated buffer — GOOD

# vs. concatenation which allocates fresh memory every call — BAD in a loop
# big = np.concatenate([big, new_batch], axis=0)   # O(n) copy each iteration -> O(n²) total
```

### Concrete ML/LLM touchpoints

- **Tokenization output:** `input_ids`, `attention_mask` are integer arrays; padding/truncation is slicing and in-place assignment.
- **Batching:** stacking variable-length sequences into a rectangular `(batch, seq)` array via padding — indexing/slicing heavy.
- **Embedding lookup:** `embedding_matrix[input_ids]` is **fancy indexing** — a gather that returns a copy of shape `(batch, seq, hidden)`.
- **Attention:** `scores[:, :, :seq_len]` masking, causal masks via slicing/`triu`.
- **Mixed precision & `out=`:** in-place ops to avoid allocating scratch buffers on the GPU.
- **KV-cache:** slicing/writing into a pre-allocated cache tensor (`cache[:, :, pos, :] = new_kv`) is pure in-place array manipulation and is what makes autoregressive decoding fast.

> 🧠 **Pro Tip:** When a training loop mysteriously slows down or OOMs, the cause is often (a) an accidental `.copy()` via fancy/boolean indexing in the hot path, (b) building an array by repeated `concatenate`/`append` (O(n²)), or (c) holding a small slice-view that pins a huge parent tensor in memory. Profile allocations, not just FLOPs.

---

## 1.7 ⚡ Cheat Sheet & Expert Takeaways — Arrays

```text
ACCESS
  arr[i]              O(1)   positive/negative index; IndexError if OOB
  m[i, j]             O(1)   n-dim tuple indexing (preferred over m[i][j])

SLICE  arr[start:stop:step]  (stop EXCLUSIVE; never raises, clamps)
  list slice          O(k) time, O(k) space   -> COPY
  ndarray basic slice O(1) time, O(1) space    -> VIEW (shares memory!)
  arr[::-1]           reverse (list=copy O(n); ndarray=view O(1))
  .copy()             force a copy from a view

MUTATE (lists return None!)
  append              amortized O(1)
  insert(0,x)/pop(0)  O(n)  (shifts)
  pop()               O(1)
  sort()              O(n log n)     reverse()  O(n)
  NumPy += / out=     in-place, O(1) extra space

ALGORITHMS
  two-pointer         O(n) / O(1)    sorted + pair/target
  sliding window      O(n) / O(1)    contiguous subarray max/min/count
  in-place reversal   O(n) / O(1)    swap ends, walk inward
```

**Top 5 takeaways:**
1. **List = array of pointers; NumPy = array of raw values.** Choose NumPy for numeric work — density + locality + speed.
2. **Basic slice of a list copies; basic slice of ndarray is a view.** This one fact prevents a whole class of bugs and memory blowups.
3. **Indexing raises on OOB; slicing clamps silently.** Guard against slices that quietly return too few elements.
4. **In-place mutators return `None`.** Never write `x = x.sort()`.
5. **Prefer views + `out=` + pre-allocation** in ML hot paths; avoid repeated `concatenate`/`append`.

---

# 2. Strings

## 2.1 Definition & Immutability Model

A **string** is a sequence of characters. In Python 3, a `str` is an **immutable** sequence of Unicode code points. "Immutable" means: **once created, its contents can never change.** Any operation that appears to "modify" a string actually creates a brand-new string.

```python
s = "hello"
# s[0] = "H"          # ❌ TypeError: 'str' object does not support item assignment
s = "H" + s[1:]       # ✅ creates a NEW string "Hello"; the old "hello" is discarded
```

### Why immutability exists (the internals)

1. **Hashability:** immutable objects have a stable hash, so strings can be dict keys and set members. A mutable string could change after being hashed, corrupting the hash table.
2. **Interning & sharing:** Python can safely share (intern) identical short strings and identifiers, saving memory, precisely because no one can mutate them.
3. **Thread safety & predictability:** an immutable object can be shared across references/threads without defensive copying.

```python
a = "hi"
b = "hi"
print(a is b)          # often True — small/identifier-like strings are interned (shared object)

import sys
x = sys.intern("some_repeated_key")   # force interning for fast identity comparisons
```

### The hidden cost: string concatenation in a loop

Because every concatenation builds a new string, naïve accumulation is **O(n²)**:

```python
# ❌ O(n²): each += copies the whole accumulated string
result = ""
for chunk in many_chunks:
    result += chunk          # allocates a new, longer string every iteration

# ✅ O(n): collect then join once
result = "".join(many_chunks)   # single allocation, single pass
```

> 💡 **Analogy — carving in stone vs writing on a whiteboard:**
> *"A Python string is a sentence carved in stone. You can't erase a letter — to 'change' it you must carve an entirely new tablet. A list, by contrast, is a whiteboard: wipe and rewrite any cell in place. This is why, when you need to build a string piece by piece, you don't keep re-carving the stone (`+=` in a loop); you jot the pieces on a whiteboard (a list) and carve the final tablet once (`''.join(...)`)."*

> 🧠 **Chain-of-thought framing:**
> - *Beginner needs:* "you can read any character but you can't change one; building strings = join a list."
> - *ML engineer needs:* Unicode/encoding awareness (code points vs bytes vs grapheme clusters) because tokenizers operate on exactly these boundaries.
> - *Common expert mistake:* `+=` string building in a hot loop (O(n²)); and assuming `len(s)` equals the number of *visible* characters (emoji and combining marks break that assumption).

---

## 2.2 Indexing & Slicing

String indexing and slicing use the **exact same mechanics as lists** (§1.2–1.3) — with one crucial difference: **you can read but never write.**

```python
s = "PYTHON"

s[0]        # 'P'
s[-1]       # 'N'
s[2:5]      # 'THO'      (slice -> a NEW string; strings always copy on slice)
s[::-1]     # 'NOHTYP'   (reverse via slicing — the idiomatic string reversal)
s[::2]      # 'Pto'... -> 'PYToN'? let's be exact: 'P','T','O' -> "PTO"
s[:3]       # 'PYT'
s[100:200]  # ''         (out-of-range slice clamps, no error)

# s[0] = 'p'   # ❌ TypeError — immutable
```

Since strings are immutable, **every slice is a copy** (there's no view concept as in NumPy — but because the source can never change, Python can sometimes share the underlying buffer internally; semantically, treat slices as independent).

### Unicode subtlety (the edge case pros miss)

`len(s)` and indexing operate on **code points**, not visible glyphs:

```python
s = "café"
len(s)          # 4 (if 'é' is a single precomposed code point U+00E9)

s2 = "cafe\u0301"   # 'e' + combining acute accent
len(s2)         # 5 — looks identical on screen, but it's 5 code points!
print(s == s2)  # False — visually equal, not equal in memory

# Normalize before comparing user-facing text:
import unicodedata
unicodedata.normalize("NFC", s2) == s   # True after normalization
```

### Complexity

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| `s[i]` | O(1) | O(1) | Code-point access |
| `s[a:b]` | O(k) | O(k) | New string (immutable → copy) |
| `s[::-1]` | O(n) | O(n) | Reversed copy |
| `x in s` (substring) | O(n·m) worst | O(1) | Uses a fast search internally |

> 🧠 **Pro Tip:** `s[::-1]` is the idiomatic, fastest pure-Python string reverse. But never assume `len(s)` = number of characters a human sees — normalize with `unicodedata.normalize("NFC", …)` before comparing or measuring user-facing text, and be aware that emoji (and skin-tone/flag sequences) can span multiple code points.

---

## 2.3 In-Place Simulation Techniques

Strings are immutable, so **true** in-place modification is impossible. When an algorithm demands O(1)-style in-place editing, you convert to a **mutable** representation, operate, then convert back.

```python
# Technique 1: convert to a list of chars, mutate, join back
def reverse_string_inplace(s):
    """Simulate in-place reversal. Time: O(n)  Space: O(n) (list buffer)."""
    chars = list(s)                 # O(n) — mutable buffer
    left, right = 0, len(chars) - 1
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
    return "".join(chars)           # O(n)

print(reverse_string_inplace("hello"))   # "olleh"

# Technique 2: bytearray for ASCII/bytes work (TRULY mutable, O(1) edits)
ba = bytearray(b"hello")
ba[0] = ord('H')                    # in-place, no new allocation
print(ba.decode())                  # "Hello"

# Technique 3: build with a list accumulator, join once (the O(n) pattern)
parts = []
for i in range(5):
    parts.append(str(i))
result = "".join(parts)             # "01234"

# Technique 4: io.StringIO for streaming string construction
import io
buf = io.StringIO()
for word in ["a", "b", "c"]:
    buf.write(word)
result = buf.getvalue()             # "abc"
```

> 💡 **Analogy — clay vs stone:**
> *"You can't reshape a stone tablet (str), so you press its text into a slab of clay (a `list` of chars or a `bytearray`), remold the clay freely, then fire it back into a finished stone tablet with `''.join()`. The `bytearray` is special clay for byte/ASCII data that you truly reshape in place with O(1) edits."*

### Complexity

| Technique | Edit cost | Total space | Truly in-place? |
|-----------|-----------|-------------|-----------------|
| `list(s)` + join | O(1) per swap | O(n) | Simulated |
| `bytearray` | **O(1)** per byte | O(n) once | ✅ Yes (bytes) |
| `"".join(parts)` | O(1) append | O(n) | Build pattern |
| `io.StringIO` | O(1) write | O(n) | Streaming |

> 🧠 **Pro Tip:** For text-algorithm interview problems that say "modify the string in place," the accepted Python answer is convert to `list`, use two-pointer swaps, `join` back. For real byte/ASCII processing at scale (network buffers, binary protocols), use `bytearray` — it's genuinely mutable and avoids repeated allocations.

---

## 2.4 Common Algorithms (Palindrome, Anagram, Pattern Matching)

### A. Palindrome check (two-pointer, O(1) space)

```python
def is_palindrome(s):
    """Check palindrome ignoring case & non-alphanumerics.
    Time: O(n)   Space: O(1)"""
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True

print(is_palindrome("A man, a plan, a canal: Panama"))  # True
```
- **Time:** O(n) — each pointer traverses the string once. **Space:** O(1) — in-place two-pointer.

### B. Anagram check (frequency count / hashing)

```python
from collections import Counter

def are_anagrams(a, b):
    """Time: O(n)   Space: O(k) where k = distinct chars (<=26 for lowercase)."""
    if len(a) != len(b):
        return False
    return Counter(a) == Counter(b)

print(are_anagrams("listen", "silent"))   # True
```
- **Time:** O(n) to count. **Space:** O(k), bounded by the alphabet size (O(1) for a fixed alphabet).
- **Alternative:** sorting both — O(n log n) time, simpler but slower than counting.

### C. Pattern matching — substring search

```python
# Built-in (fast; CPython uses a Crochemore-Perrin / two-way-ish algorithm):
text, pat = "abxabcabcaby", "abcaby"
idx = text.find(pat)      # returns start index or -1;  effectively O(n+m) typical

# Educational: naive matcher — O(n*m) worst case
def naive_search(text, pat):
    n, m = len(text), len(pat)
    for i in range(n - m + 1):
        if text[i:i+m] == pat:
            return i
    return -1

# Production-grade: KMP achieves O(n+m) with an O(m) prefix table
def kmp_search(text, pat):
    """Time: O(n+m)   Space: O(m)."""
    if not pat:
        return 0
    # build longest-proper-prefix-suffix (LPS) table
    lps = [0] * len(pat)
    k = 0
    for i in range(1, len(pat)):
        while k > 0 and pat[i] != pat[k]:
            k = lps[k-1]
        if pat[i] == pat[k]:
            k += 1
        lps[i] = k
    # scan
    k = 0
    for i in range(len(text)):
        while k > 0 and text[i] != pat[k]:
            k = lps[k-1]
        if text[i] == pat[k]:
            k += 1
        if k == len(pat):
            return i - len(pat) + 1
    return -1

print(kmp_search("abxabcabcaby", "abcaby"))   # 6
```

| Algorithm | Time | Space |
|-----------|------|-------|
| Naive search | O(n·m) | O(1) |
| KMP | **O(n+m)** | O(m) |
| Rabin–Karp (rolling hash) | O(n+m) avg, O(n·m) worst | O(1) |
| Python `str.find` / `in` | ~O(n+m) typical | O(1) |

> 💡 **Analogy — sliding a stencil:**
> *"Substring search is sliding a stencil (the pattern) along a wall (the text) looking for a match. The naive method restarts from scratch on every mismatch. KMP is smart: when the stencil partially matches then fails, it remembers how much of the start it already matched and slides forward by that much instead of back to square one — never re-checking characters it already cleared."*

> 🧠 **Pro Tip:** In 99% of production code, just use `in` / `str.find` / `re` — CPython's C-level search is faster than hand-rolled Python KMP. Know KMP/Rabin-Karp for interviews and for when you must implement search in an environment without a good built-in (or need rolling hashes for multiple-pattern / streaming search).

---

## 2.5 DS/AI/ML/LLM Applied Context (Tokenization, Regex, Preprocessing)

Strings are the raw input to every NLP/LLM system. Everything a model "reads" starts as string manipulation.

### Tokenization is string slicing at scale

```python
# Whitespace/word tokenization (simplified)
text = "The cat sat"
tokens = text.split()          # ['The', 'cat', 'sat'] — string splitting

# Subword tokenization (BPE/WordPiece) works on character/byte spans:
# "unhappiness" -> ["un", "happi", "ness"]  — the tokenizer repeatedly slices
# and matches substrings against a learned vocabulary.

# Byte-level BPE (GPT-family) operates on the UTF-8 BYTES of the string:
raw_bytes = "café".encode("utf-8")   # b'caf\xc3\xa9' — 5 bytes for 4 chars
# This is why byte-level tokenizers handle ANY Unicode input without "unknown" tokens.
```

### Preprocessing = string transforms

```python
import re, unicodedata

def clean(text):
    text = unicodedata.normalize("NFKC", text)   # canonicalize Unicode
    text = text.lower()                          # case fold
    text = re.sub(r"http\S+", " <URL> ", text)   # regex substitution
    text = re.sub(r"\s+", " ", text).strip()     # collapse whitespace
    return text

print(clean("Visit   HTTPS://X.CO  now!!"))      # "visit <url> now!!"
```

### Concrete NLP/LLM touchpoints

- **Vocabulary lookup:** token string → integer id via a hash map (dict). The immutability/hashability of strings (§2.1) is *why* they work as dict keys here.
- **Truncation & padding:** enforcing max sequence length is slicing (`tokens[:max_len]`) plus padding.
- **Special tokens:** `[CLS]`, `[SEP]`, `<s>`, `</s>` inserted via string/list operations before encoding.
- **Regex-based cleaning:** de-duplication, PII scrubbing, whitespace normalization — all substring/pattern-matching (§2.4).
- **n-gram features / hashing trick:** sliding window (§1.5) over tokens for classical NLP features.
- **Detokenization:** joining subword pieces back (`"".join` with special handling of `##`/`▁` markers) — the build-with-join pattern (§2.3).

> 🧠 **Pro Tip:** Two failures bite NLP teams repeatedly. (1) **Encoding mismatches** — always be explicit about UTF-8; mojibake ("café" → "cafÃ©") comes from decoding bytes with the wrong codec. (2) **Unicode normalization** — normalize (NFC/NFKC) *before* tokenization and dedup, or "visually identical" strings become distinct tokens and inflate your vocab. And never build large text with `+=` in a loop — `"".join()` or `io.StringIO`.

---

## 2.6 ⚡ Cheat Sheet & Expert Takeaways — Strings

```text
NATURE
  str = immutable sequence of Unicode code points
  no item assignment: s[0]='x'  -> TypeError
  hashable -> valid dict key / set member

INDEX / SLICE  (same rules as lists; ALWAYS a copy)
  s[i]        O(1)     s[a:b]  O(k)     s[::-1]  reverse (O(n))
  s[100:200]  -> '' (clamps, no error)

BUILD STRINGS
  BAD:  result += chunk  (in loop)  -> O(n^2)
  GOOD: "".join(list_of_chunks)     -> O(n)
        io.StringIO for streaming

"IN-PLACE" (simulated)
  list(s) + two-pointer + "".join()   (interview idiom)
  bytearray  -> TRUE O(1) mutation for bytes/ASCII

ALGORITHMS
  palindrome   two-pointer   O(n)/O(1)
  anagram      Counter        O(n)/O(k)
  search       str.find/in    ~O(n+m); KMP O(n+m); naive O(n*m)

UNICODE
  len(s) counts code points, NOT glyphs
  normalize NFC/NFKC before compare/dedup
  encode('utf-8') for byte-level work
```

**Top 5 takeaways:**
1. **Strings are immutable** — "editing" always creates a new object. Build via `"".join()`, not `+=` in loops.
2. **Slicing/indexing mirrors lists**, but write operations are forbidden.
3. **`s[::-1]`** is the idiomatic reverse; two-pointer on `list(s)` is the "in-place" interview answer; `bytearray` is truly mutable.
4. **`len(s)` counts code points, not visible glyphs** — normalize Unicode before comparing user text.
5. **Tokenization, vocab lookup, and preprocessing are all string ops** — encoding discipline and normalization prevent the most common NLP data bugs.

---

# 3. Comparative Analysis: Arrays vs Strings

| Dimension | Python `list` | NumPy `ndarray` | Python `str` |
|-----------|---------------|-----------------|--------------|
| **Mutable?** | ✅ Yes | ✅ Yes (values) | ❌ No (immutable) |
| **Homogeneous?** | ❌ Mixed types | ✅ Single dtype | ✅ Code points |
| **Stores** | Pointers to objects | Raw C values | Unicode code points |
| **Contiguous values?** | ❌ (pointers are) | ✅ | ✅ (buffer) |
| **Index access** | O(1) | O(1) | O(1) |
| **Basic slice** | **Copy**, O(k) | **View**, O(1) | **Copy**, O(k) |
| **In-place edit** | ✅ methods (return None) | ✅ `+=`, `out=`, `a[:]=` | ❌ → use `list`/`bytearray` |
| **Reverse** | `.reverse()` O(1) space; `[::-1]` copy | `[::-1]` is O(1) view | `[::-1]` copy |
| **Hashable?** | ❌ | ❌ | ✅ (dict key) |
| **Grow** | `append` amortized O(1) | fixed (resize = new alloc) | new string each time |
| **Best for** | heterogeneous, dynamic data | numeric/tensor compute | text, keys, tokens |

**Shared DNA:** all three are **sequences** — they share the `start:stop:step` slicing protocol, 0-based positive/negative indexing, and the two-pointer / sliding-window algorithmic patterns. The differences are **mutability** and **what's stored** (pointers vs raw values vs code points), which in turn dictate **view-vs-copy** and **memory** behavior.

**Decision guide:**
- Need numbers, math, or tensors? → **NumPy** (density, speed, views).
- Need a flexible, growable, mixed-type container? → **`list`**.
- Working with text, or need a dict/set key? → **`str`** (and build with `join`).
- Need to mutate bytes in place? → **`bytearray`**.

---

# 4. Master Cheat Sheet (All Operations at a Glance)

```text
════════════════════════════════════════════════════════════════════
 INDEXING (0-based; negative counts from end)                O(1)
════════════════════════════════════════════════════════════════════
  seq[i]         ith element        seq[-1]   last
  m[i, j]        n-dim (preferred)   m[i][j]   works, slower (intermediate)
  OOB index -> IndexError            OOB slice -> clamps to '' / []

════════════════════════════════════════════════════════════════════
 SLICING   seq[start:stop:step]   (stop EXCLUSIVE, never raises)
════════════════════════════════════════════════════════════════════
  seq[a:b]     seq[:b]     seq[a:]     seq[:]      (full shallow copy)
  seq[::2]     every 2nd   seq[::-1]   reversed
  list/str slice  -> COPY   O(k)/O(k)
  ndarray slice   -> VIEW   O(1)/O(1)   (.copy() to detach; .base to check)

════════════════════════════════════════════════════════════════════
 IN-PLACE
════════════════════════════════════════════════════════════════════
  list:    append O(1)am | insert(0)/pop(0) O(n) | sort O(n log n)
           reverse O(n)  | ⚠ mutators return None
  ndarray: a += x | np.op(..., out=a) | a[:] = ...  (O(1) extra space)
  str:     IMMUTABLE -> list(s)+join  |  bytearray for true O(1) bytes edit
  build str: "".join(parts)  NOT  += in a loop (O(n) vs O(n^2))

════════════════════════════════════════════════════════════════════
 ALGORITHM PATTERNS
════════════════════════════════════════════════════════════════════
  two-pointer      O(n)/O(1)   sorted array pair; palindrome; reverse
  sliding window   O(n)/O(1)   contiguous subarray/substring max/min/count
  in-place reverse O(n)/O(1)   swap ends, walk inward
  anagram          O(n)/O(k)   Counter compare
  substring search find/in ~O(n+m); KMP O(n+m)/O(m); naive O(n*m)

════════════════════════════════════════════════════════════════════
 ML/LLM MAPPING
════════════════════════════════════════════════════════════════════
  tensor            = strided n-dim ndarray (shape/strides/dtype)
  batch slice       embeddings[:2]            (view)
  context truncate  input_ids[:, :512]        (view)
  [CLS] pooling     hidden[:, 0, :]
  embedding lookup  E[input_ids]              (fancy index -> COPY/gather)
  KV-cache write    cache[:, :, pos, :] = kv  (in-place)
  tokenization      split / subword slicing + vocab dict lookup
  preprocessing     regex sub + unicode normalize (NFC/NFKC) + join
```

---

# 5. Interview & Production Readiness Checklist

### 🎯 Interview readiness
- [ ] Explain **why** array access is O(1) (address arithmetic on contiguous memory).
- [ ] Explain **amortized O(1)** append (geometric over-allocation) and why `insert(0,·)` is O(n).
- [ ] State the **view vs copy** rule: list/str slice copies; NumPy basic slice is a view.
- [ ] Know that **indexing raises** on OOB but **slicing clamps**.
- [ ] Reverse an array/string **in place** with two pointers (O(1) space) and know why `[::-1]` costs O(n) space.
- [ ] Solve **two-sum (sorted)**, **max-subarray-of-size-k**, **longest-substring-without-repeats** with two-pointer/sliding-window.
- [ ] Check **palindrome** (two-pointer) and **anagram** (Counter); state complexities.
- [ ] Explain **string immutability** and the `"".join()` fix for O(n²) concatenation.
- [ ] Know **KMP** conceptually (LPS table, O(n+m)) even if you use `str.find` in practice.
- [ ] Handle edge cases out loud: empty input, single element, negative index, all-duplicates, Unicode.

### 🏭 Production readiness (DS/AI/ML/LLM)
- [ ] Default to **NumPy/tensors** for numeric data; avoid Python-list math in hot paths.
- [ ] **Prefer views**; call `.copy()` deliberately (and to release a huge parent buffer held by a small slice).
- [ ] Never grow arrays with repeated `concatenate`/`append` in a loop (**O(n²)**) — **pre-allocate** or collect-then-stack.
- [ ] Use **`out=` / augmented assignment** to avoid scratch allocations in memory-bound code.
- [ ] Watch for **accidental copies** from fancy/boolean indexing in training loops.
- [ ] Ensure **dtype/contiguity** (`np.ascontiguousarray`) before performance-critical ops or C/GPU interop.
- [ ] For text: be **explicit about UTF-8**, **normalize (NFC/NFKC)** before tokenize/dedup, and build strings with **`join`**.
- [ ] Guard slices that may **clamp** to fewer elements than expected (silent truncation).
- [ ] Remember list **mutators return `None`** — never `x = x.sort()`.
- [ ] Profile **allocations**, not just FLOPs, when diagnosing slow/ OOM pipelines.

---

*End of guide. This document is self-contained: §1–2 build each concept from memory model → mechanics → analogy → code → algorithm → complexity → applied context, §3 contrasts the structures, and §4–5 provide quick-reference and readiness checklists.*

---

## Related Guides

**Prerequisites:** [Big-O Notation & Complexity Analysis](/docs/big-o-complexity)  
**See also:** [Two Pointers](/docs/two-pointers) · [Sliding Window](/docs/sliding-window) · [Hash Maps & Sets](/docs/hash-maps-and-sets)

*Section: [Foundation](/docs/category/01-foundation) · [All guides](/)*
