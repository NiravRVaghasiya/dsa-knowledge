---
title: Sliding Window
slug: /sliding-window
sidebar_position: 2
sidebar_label: Sliding Window
description: >-
  Fixed and variable-size windows for subarray/substring problems, explained at conceptual and implementation levels.
tags:
  - sliding-window
  - arrays
  - patterns
difficulty: intermediate
reading_time: 21
prerequisites:
  - title: Arrays & Strings
    to: /docs/arrays-and-strings
  - title: Two Pointers
    to: /docs/two-pointers
pagination_prev: 02-core-dsa/two-pointers
pagination_next: 02-core-dsa/binary-search
path_step: 8
---

# The Sliding Window Technique — A Complete Reference Guide

*From foundational theory to advanced applications in DSA, Data Engineering, ML, NLP/LLMs, and Computer Vision.*

> **How to read this guide:** Every concept is explained at two levels — a **conceptual** layer (build intuition) and a **technical** layer (implement it). Callout boxes hold analogies (🪟), expert takeaways (💡), warnings (⚠️), and do/don't markers (✅/❌). All Python is typed, commented, and runnable on Python 3.10+.

---

## 📌 SECTION 1: What Is Sliding Window?

### 1.1 Definition (Technical)

The **Sliding Window** is an algorithmic technique that maintains a contiguous sub-range (the "window") over a linear sequence — an array, string, or stream — and processes the sequence by **incrementally moving the window's boundaries** rather than recomputing over the full range at every step.

Formally: given a sequence `S` of length `n`, a window is an interval `[L, R]` with `0 ≤ L ≤ R < n`. The technique advances `L` and/or `R` monotonically (never backward), maintaining an **aggregate state** (sum, count, frequency map, max/min, etc.) that is updated in O(1) or O(log k) as elements **enter** at `R` and **exit** at `L`.

The defining property is **incremental reuse**: the answer for window `[L, R+1]` is derived from the answer for `[L, R]` by adding one element, not by re-scanning.

### 1.2 Core Intuition (Conceptual)

Most naive solutions to subarray/substring problems recompute overlapping work. Consider summing every window of size `k`: windows `[0,k-1]` and `[1,k]` share `k-1` elements. A brute-force approach re-adds those shared elements every time. The sliding window recognizes the overlap and **only accounts for the difference** — the element that left and the element that joined.

> 🪟 **The Camera Pan Analogy:** Imagine filming a long parade through a fixed-width camera frame. As the parade moves, your frame slides along — you never reshoot the entire scene, only update what enters and exits the frame. This is exactly how a sliding window avoids redundant computation.

> 🪟 **The Conveyor Belt Analogy:** Picture a quality inspector watching a fixed stretch of a conveyor belt. Items roll in on the right and roll off on the left. To keep a running tally of, say, "defects currently visible," the inspector adds a defect when one appears on the right and subtracts one when it rolls off the left — never recounting the whole belt.

### 1.3 Problem Class — What Triggers Its Use

Sliding window applies when **all** of these hold:

1. The data is **linear and ordered** (array, string, stream, time-series).
2. You are asked about **contiguous** subranges (subarrays / substrings), not arbitrary subsets.
3. The metric of interest is **incrementally maintainable** — you can update it cheaply on enter/exit (sum, count, frequency, running max/min via deque, distinct-count via hashmap).
4. There is a **monotonic relationship** that lets pointers move forward without backtracking (e.g., growing the window can only increase the sum for non-negative arrays; shrinking can only reduce a violation).

Typical phrasings: *"longest/shortest/maximum/minimum contiguous subarray/substring such that …"*, *"window of size k"*, *"at most / exactly K distinct …"*.

### 1.4 Why It Beats Brute Force

| Approach | Idea | Time | Space |
|---|---|---|---|
| Brute force | Enumerate all subarrays, recompute metric each time | O(n²) or O(n·k) | O(1) |
| Prefix sums | Precompute cumulative sums, then O(1) range queries | O(n) build + O(n) or O(n²) query | O(n) |
| **Sliding window** | Maintain running aggregate, move boundaries | **O(n)** | **O(1)–O(k)** |

The sliding window collapses an O(n²) family of problems into O(n) by exploiting the overlap between adjacent windows. Each element is added **exactly once** and removed **at most once**, giving amortized O(1) work per element.

> 💡 **Expert Takeaway:** The sliding window is not one algorithm — it is a *state-maintenance discipline*. The hard part is rarely moving the pointers; it is defining a window aggregate that can be updated in O(1) on both entry and exit, and identifying the invariant that keeps pointers monotonic. If you cannot maintain the metric incrementally, sliding window will not help — reach for prefix sums, a heap, or a different structure instead.

---

## 📌 SECTION 2: Types of Sliding Windows

### 2.1 Fixed-Size Window

**Conceptual:** The window width `k` is constant. Both boundaries advance together in lockstep. You slide one element at a time: one enters, one leaves.

**Technical:** Right pointer drives the loop; the left is implicitly `R - k + 1`. State is updated by `state += in - out`. Used when the problem fixes the subrange length up front ("subarray of size k", "every k consecutive readings").

### 2.2 Variable / Dynamic Window

**Conceptual:** The window **grows and shrinks** to satisfy a constraint. You expand the right edge greedily; when the window violates a condition (too many distinct chars, sum too large, duplicate present), you contract the left edge until it is valid again.

**Technical:** Two nested-feeling but amortized-linear pointers. Outer loop advances `R`; an inner `while` advances `L` to restore the invariant. Because `L` only ever moves forward, total pointer movement is ≤ 2n → O(n). Used for "longest/shortest subarray satisfying a predicate."

There are two common shapes:
- **Longest valid window:** expand freely, shrink only when invalid, record max length after each step.
- **Shortest valid window:** expand until valid, then shrink as far as possible while still valid, recording min length.

### 2.3 Multi-Pointer / Multi-Window

**Conceptual:** More than two indices coordinate — e.g., a "at most K" minus "at most K-1" trick uses two windows; some problems track a second lagging pointer or maintain parallel windows over multiple sequences.

**Technical:** Common patterns:
- **`atMost(K) − atMost(K−1)`** to count subarrays with **exactly** K of something (distinct integers, odd numbers, sum). Each `atMost` call is a variable window; the subtraction isolates "exactly."
- **Twin pointers over two arrays** (merge-like scans), or a **monotonic deque** acting as an internal secondary structure for O(1) max/min.

### 2.4 Decision Criteria

| Question | Answer → Variant |
|---|---|
| Is the subrange length given and fixed? | → **Fixed-size** |
| Are you optimizing length subject to a constraint (longest/shortest valid)? | → **Variable** |
| Do you need running max/min inside the window? | → Variable/Fixed **+ monotonic deque** |
| Do you need **count of subarrays** with an *exact* property? | → **Multi-window** (`atMost(K) − atMost(K−1)`) |
| Does the constraint break monotonicity (e.g., negative numbers with a sum target)? | → Sliding window **may not apply** — consider prefix sums + hashmap |

### 2.5 Comparison Table (Type × Use Case × Complexity)

| Window Type | Canonical Use Case | Pointer Movement | Time | Space |
|---|---|---|---|---|
| Fixed-size | Max/avg sum of size-k subarray; rolling stats | L and R together | O(n) | O(1)–O(k) |
| Variable (longest) | Longest substring without repeats; longest subarray with sum ≤ S | R expands, L shrinks on violation | O(n) | O(k) or O(alphabet) |
| Variable (shortest) | Minimum window substring; smallest subarray with sum ≥ S | R expands, L shrinks while valid | O(n) | O(k) or O(alphabet) |
| Fixed/Var + monotonic deque | Sliding window maximum/minimum | R expands, deque prunes | O(n) | O(k) |
| Multi-window (atMost trick) | Subarrays with **exactly** K distinct | two variable passes | O(n) | O(k) |

> 💡 **Expert Takeaway:** ~80% of interview and production sliding-window problems reduce to one of three templates: **fixed-size**, **longest-variable**, **shortest-variable**. Memorize these three skeletons cold. The remaining hard cases are almost always "add a monotonic deque for O(1) extremum" or "apply the `atMost(K) − atMost(K−1)` counting identity."

---

## 📌 SECTION 3: Algorithms & Code

### 3.1 Pseudocode

**Fixed-size window**
```
function fixed_window(A, k):
    state ← aggregate(A[0 .. k-1])      # build first window
    best  ← state
    for R from k to n-1:
        state ← state + A[R] − A[R-k]   # add incoming, drop outgoing
        best  ← better(best, state)
    return best
```

**Variable window — longest valid**
```
function longest_valid(A):
    L ← 0
    best ← 0
    init window_state
    for R from 0 to n-1:
        add A[R] to window_state
        while window_state violates constraint:
            remove A[L] from window_state
            L ← L + 1
        best ← max(best, R − L + 1)
    return best
```

**Variable window — shortest valid**
```
function shortest_valid(A, target):
    L ← 0
    best ← +∞
    init window_state
    for R from 0 to n-1:
        add A[R] to window_state
        while window_state satisfies constraint:
            best ← min(best, R − L + 1)
            remove A[L] from window_state
            L ← L + 1
    return best if best < +∞ else 0
```

**Sliding window maximum (monotonic deque)**
```
function window_max(A, k):
    dq ← empty deque of indices        # holds indices, values decreasing
    result ← []
    for R from 0 to n-1:
        while dq not empty and A[dq.back] ≤ A[R]: dq.pop_back()
        dq.push_back(R)
        if dq.front ≤ R − k: dq.pop_front()   # drop out-of-window index
        if R ≥ k − 1: result.append(A[dq.front])
    return result
```

---

### 3.2 Annotated Python — Classic DSA Problem

```python
# Problem: Maximum Sum Subarray of Size K (Fixed Window)
# Time: O(n)  |  Space: O(1)

def max_sum_subarray(arr: list[int], k: int) -> int:
    """
    Return the maximum sum of any contiguous subarray of length k.

    Fixed sliding window: instead of recomputing each window's sum from
    scratch (which would be O(n*k)), we subtract the outgoing element and
    add the incoming element as the window slides — O(1) per step.
    """
    if k <= 0 or k > len(arr):
        raise ValueError("k must satisfy 1 <= k <= len(arr)")

    window_sum: int = sum(arr[:k])   # Sum of the first window — O(k), done once
    max_sum: int = window_sum

    # R is the index of the incoming element; R - k is the outgoing one.
    for R in range(k, len(arr)):
        window_sum += arr[R] - arr[R - k]   # Slide: +incoming, -outgoing
        max_sum = max(max_sum, window_sum)

    return max_sum


# --- quick check ---
assert max_sum_subarray([2, 1, 5, 1, 3, 2], 3) == 9   # [5,1,3]
```

**Complexity:** One pass over `n` elements, O(1) work each → **O(n) time**. Only two integers held → **O(1) space**.

---

### 3.3 Annotated Python — Variable Window (Longest Substring Without Repeats)

```python
# Problem: Longest Substring Without Repeating Characters (Variable Window)
# Time: O(n)  |  Space: O(min(n, alphabet))

def longest_unique_substring(s: str) -> int:
    """
    Length of the longest substring with all-distinct characters.

    Expand R to include s[R]. If that character is already in the window,
    shrink from L until the duplicate is removed. The window [L, R] is
    always duplicate-free, so its length is a candidate answer.
    """
    last_seen: dict[str, int] = {}   # char -> most recent index
    L: int = 0
    best: int = 0

    for R, ch in enumerate(s):
        # If we've seen ch inside the current window, jump L past its last occurrence.
        if ch in last_seen and last_seen[ch] >= L:
            L = last_seen[ch] + 1
        last_seen[ch] = R
        best = max(best, R - L + 1)

    return best


assert longest_unique_substring("abcabcbb") == 3   # "abc"
assert longest_unique_substring("bbbbb") == 1
```

**Complexity:** Each index visited once by `R`; `L` only advances → **O(n) time**. The map holds at most one entry per distinct character → **O(min(n, |Σ|)) space**.

> ⚠️ **Subtle bug to avoid:** The guard `last_seen[ch] >= L` matters. Without it, a duplicate that lives *outside* the current window would wrongly drag `L` backward, breaking the monotonic-pointer invariant. Pointers in a sliding window must **never** move backward.

---

### 3.4 Annotated Python — ML Preprocessing (Rolling Feature Extraction)

```python
# Problem: Rolling-window features for time-series ML (fixed window)
# Time: O(n)  |  Space: O(k) for the max/min deques, O(1) for mean/std state

from collections import deque
from math import sqrt

def rolling_features(series: list[float], k: int) -> list[dict[str, float]]:
    """
    Compute rolling mean, std, max, and min over a fixed window of size k.

    - mean/variance use Welford-style incremental sums (running sum and
      running sum of squares) -> O(1) update.
    - max/min use monotonic deques -> amortized O(1) update.

    Returns one feature dict per fully-formed window (len = n - k + 1).
    Designed for feature engineering where each row must summarize the
    PAST k observations without leaking future data.
    """
    if k <= 0 or k > len(series):
        raise ValueError("k must satisfy 1 <= k <= len(series)")

    out: list[dict[str, float]] = []
    run_sum: float = 0.0
    run_sq: float = 0.0
    max_dq: deque[int] = deque()   # indices, values decreasing
    min_dq: deque[int] = deque()   # indices, values increasing

    for R, x in enumerate(series):
        # --- incremental mean/variance state ---
        run_sum += x
        run_sq += x * x

        # --- maintain monotonic deques for O(1) window max/min ---
        while max_dq and series[max_dq[-1]] <= x:
            max_dq.pop()
        max_dq.append(R)
        while min_dq and series[min_dq[-1]] >= x:
            min_dq.pop()
        min_dq.append(R)

        L = R - k + 1               # left edge of the current window
        if L > 0:                   # an element just left the window
            out_val = series[L - 1]
            run_sum -= out_val
            run_sq -= out_val * out_val
        # Evict indices that fell out of the window on the left.
        if max_dq[0] < L:
            max_dq.popleft()
        if min_dq[0] < L:
            min_dq.popleft()

        if R >= k - 1:              # window fully formed
            mean = run_sum / k
            # population variance; clamp tiny negatives from float error
            var = max(run_sq / k - mean * mean, 0.0)
            out.append({
                "mean": mean,
                "std": sqrt(var),
                "max": series[max_dq[0]],
                "min": series[min_dq[0]],
            })

    return out


feats = rolling_features([1, 2, 3, 4, 5], k=3)
assert feats[0]["mean"] == 2.0 and feats[0]["max"] == 3
```

**Complexity:** Single pass; mean/std updates are O(1), deque pushes/pops are amortized O(1) → **O(n) time**, **O(k) space** (deques bounded by window width).

> 💡 **Expert Takeaway:** In production ML pipelines, sliding windows over time-series data must account for **data-leakage boundaries** — your window must never include future data relative to your prediction target. Note above that each feature row summarizes only *past* observations `[L, R]` and is emitted at index `R`. Always validate window alignment (and label-timing) before model training, and be explicit about whether the window is *trailing* (causal) or *centered* (non-causal, leaks the future).

---

### 3.5 Annotated Python — NLP / LLM Context Windowing (Token Chunking with Overlap)

```python
# Problem: Chunk a token stream into overlapping context windows (fixed + stride)
# Time: O(n)  |  Space: O(n / stride * window) for the emitted chunks

def chunk_tokens(
    tokens: list[int],
    window: int,
    stride: int,
) -> list[list[int]]:
    """
    Split a long token sequence into overlapping fixed-size windows —
    the standard preprocessing step for feeding long documents to a
    context-limited transformer (e.g., RAG chunking, long-doc QA).

    `window` = max context length the model accepts.
    `stride` = how far the window advances each step. overlap = window - stride,
    which preserves cross-boundary context so information isn't split
    exactly at a chunk edge.
    """
    if window <= 0 or stride <= 0:
        raise ValueError("window and stride must be positive")
    if stride > window:
        raise ValueError("stride > window would skip tokens (gaps between chunks)")

    chunks: list[list[int]] = []
    L: int = 0
    n: int = len(tokens)

    while L < n:
        R = min(L + window, n)      # window covers tokens[L:R]
        chunks.append(tokens[L:R])
        if R == n:                  # reached the end; stop to avoid dup tail chunks
            break
        L += stride                 # slide forward by stride (keeps overlap)

    return chunks


# 10 tokens, window=4, stride=3  -> overlap of 1 token between chunks
assert chunk_tokens(list(range(10)), window=4, stride=3) == [
    [0, 1, 2, 3], [3, 4, 5, 6], [6, 7, 8, 9],
]
```

**Complexity:** Each token is copied into O(window/stride) chunks; with fixed overlap ratio this is **O(n) time** and **O(n) space** for the emitted chunks.

> 💡 **Expert Takeaway:** Transformer **self-attention** is itself a (soft, weighted) sliding-window idea taken to its limit — full attention lets every token "see" every other token in O(n²). To scale to long contexts, models restrict attention to a **local window** (e.g., Longformer's sliding-window attention, Mistral's sliding-window attention) so each token attends only to its `w` neighbors, dropping cost to O(n·w). The chunking above is the *data-level* sliding window; windowed attention is the *architecture-level* one. Same principle, two layers of the stack.

---

## 📌 SECTION 4: Domain Applications

| Domain | Application Example | Window Type |
|---|---|---|
| **DSA** | Max-sum size-k subarray; longest substring w/o repeats; min window substring | Fixed & Variable |
| **Data Engineering** | Stream processing, tumbling/hopping/session windows, rolling aggregations | Fixed & Session |
| **ML** | Time-series feature engineering, signal smoothing, spectrogram framing | Fixed (trailing) |
| **NLP / LLM** | Context windows, token chunking for RAG, sliding-window attention | Fixed + stride |
| **Computer Vision** | Object detection by scanning sub-regions (pre-CNN) → modern strided use | 2-D fixed |

### 4.1 DSA
The native habitat: subarray/substring optimization and counting. Nearly every "contiguous + optimize/count" problem is a window problem. (Full worked set in Section 7.)

### 4.2 Data Engineering
Stream processors (Flink, Kafka Streams, Spark Structured Streaming) formalize windowing:
- **Tumbling window** — fixed, non-overlapping (e.g., counts per 1-minute bucket).
- **Hopping / sliding window** — fixed size, advances by a smaller step → overlapping (e.g., 5-min window every 1 min).
- **Session window** — variable; closes after an inactivity gap. This is a *dynamic* window driven by event-time gaps rather than a fixed width.

> 💡 **Expert Takeaway:** In distributed streaming, the real complexity isn't the window logic — it's **watermarks and late-arriving events**. A window can't emit its final result until you're confident no more events for that interval will arrive. Sliding-window state is bounded by window size × key cardinality, so wide windows over high-cardinality keys are a classic memory blowup. Cap retention with watermarks and allowed-lateness.

### 4.3 Machine Learning
- **Feature engineering:** rolling mean/std/min/max/quantiles as lag features (see §3.4).
- **Signal processing:** framing audio into overlapping frames before FFT (STFT / spectrograms) is a fixed window + hop length — identical to token chunking.
- **Smoothing:** moving averages, Savitzky–Golay filters operate over a sliding window.
- **Online learning / concept drift:** train/evaluate on a sliding window of recent data so the model tracks a changing distribution.

### 4.4 NLP / LLM
- **Chunking for RAG:** split long docs into overlapping windows so retrieval units fit the embedding/model context (see §3.5).
- **Context window:** the model's max token span is literally a fixed window over the conversation; long chats get truncated or summarized as they slide out.
- **Windowed / local attention:** Longformer, BigBird, Mistral restrict attention to a local band to make long sequences tractable.
- **N-gram features:** classic NLP n-grams are fixed sliding windows over tokens.

### 4.5 Computer Vision
- **Pre-CNN detection:** the **sliding-window detector** scanned a fixed-size box across the image at multiple scales, running a classifier (e.g., HOG + SVM for pedestrians, Viola–Jones for faces) at each position — a 2-D fixed window.
- **Modern use:** convolution *is* a learned sliding window (a kernel slides with a stride). Explicit sliding windows persist in patch extraction (ViT patchify), anchor generation, and non-max suppression over strided proposals.

> 💡 **Expert Takeaway:** The pre-CNN sliding-window detector was killed by cost: exhaustively classifying every window at every scale is O(positions × scales × classifier-cost). CNNs won partly because convolution *shares computation across overlapping windows* (the same intuition as 1-D incremental reuse), and region-proposal methods (R-CNN family) replaced brute-force scanning with a small set of candidate windows.

---

## 📌 SECTION 5: Expert Insights & Pitfalls

### 5.1 Common Mistakes (≥5)

1. ❌ **Moving a pointer backward.** The entire O(n) guarantee rests on `L` and `R` being monotonic. A duplicate-handling bug (see §3.3) that lets `L` decrease silently reintroduces O(n²) behavior or wrong answers.
2. ❌ **Forgetting to update window state on *exit*.** Adding the incoming element but not subtracting the outgoing one corrupts the aggregate. Every enter must have a matching exit for fixed windows.
3. ❌ **Applying sliding window when monotonicity is broken.** "Subarray with sum exactly S" over an array **containing negatives** is *not* a sliding-window problem — shrinking no longer monotonically reduces the sum. Use prefix sums + hashmap instead.
4. ❌ **Off-by-one in window length.** The window `[L, R]` has length `R - L + 1`, not `R - L`. This trips up min/max-length tracking constantly.
5. ❌ **Emitting results before the window is full** (fixed-size). You must gate output on `R >= k - 1`.
6. ❌ **Recomputing the aggregate inside the loop** (e.g., calling `sum(window)` each step). That silently reverts you to O(n·k) — the exact thing the technique exists to avoid.
7. ❌ **Data leakage in ML windows.** Using a *centered* window (which includes future points) for a causal forecasting feature leaks the target.

### 5.2 Optimization Tips

- ✅ **Use a `collections.deque` for O(1) window max/min** (monotonic deque). A naive `max(window)` each step is O(k) → O(n·k) overall; the deque makes it amortized O(1) → O(n).
- ✅ **Track counts, not the whole window,** when you need "distinct elements" or "frequency" — a hashmap with a `distinct` counter updates in O(1) per step and avoids re-scanning.
- ✅ **Prefer incremental sums / sum-of-squares** (Welford) for rolling mean/variance instead of recomputing.
- ✅ **Use the `atMost(K) − atMost(K−1)` identity** to convert hard "exactly K" counting into two easy "at most K" windows.
- ✅ **Batch/vectorize in ML:** `pandas.Series.rolling(k)`, `numpy` stride tricks (`np.lib.stride_tricks.sliding_window_view`), or `scipy.signal` framing are C-optimized — use them over hand-rolled loops in hot paths.
- ✅ **Fuse enter/exit updates** into a single expression `state += A[R] - A[R-k]` to minimize branching.

### 5.3 Edge Cases (always test)

| Edge case | Correct behavior |
|---|---|
| Empty array/string (`n == 0`) | Return identity (0, "", or None) — don't index. |
| Single element (`n == 1`) | Window of size 1; ensure loop still runs. |
| `k > n` (window larger than array) | Either raise, or return a sentinel — decide and document. Never let `arr[:k]` silently give a short window and pretend it's size k. |
| `k == n` | Exactly one window — the whole array. |
| `k <= 0` | Invalid; raise `ValueError`. |
| All-equal / all-negative values | Monotonicity assumptions may flip (esp. with negatives + sum targets). |
| Duplicates at the boundary | The `>= L` guard (§3.3) must scope "seen" to the current window. |

> 💡 **Expert Takeaway (per-section box):** The single highest-leverage habit is writing the **window invariant as a comment before you code** — e.g., *"[L, R] always contains at most K distinct chars."* Every pointer move then has one job: restore the invariant. Bugs in sliding-window code are almost always invariant violations, not arithmetic errors.

---

## 📌 SECTION 6: Pattern Recognition

### 6.1 Trigger Keywords

Scan the problem statement for these — they strongly signal a window:

- "**contiguous** subarray / substring"
- "**subarray/substring of size k**" → fixed
- "**longest / shortest / maximum-length / minimum-length**" + a constraint → variable
- "**at most K** / **exactly K** / **at least K**" (distinct, odd, vowels, …) → variable / multi-window
- "**without repeating**", "**containing all**", "**minimum window**" → variable
- "**rolling / moving / running**" (average, sum, max) → fixed (streaming/ML)
- "**consecutive**" elements/days/characters

If you see "subsequence" (non-contiguous) instead of "subarray/substring" → **not** sliding window (likely DP).

### 6.2 Decision Tree (text-based)

```
Is the data linear (array / string / stream)?
│
├─ NO ──────────────► Not a sliding-window problem.
│
└─ YES
   │
   Are we asked about a CONTIGUOUS range (subarray/substring)?
   │
   ├─ NO (subset / subsequence) ─► Consider DP / two-pointer-on-sorted / hashing.
   │
   └─ YES
      │
      Is the window LENGTH fixed/given (k)?
      │
      ├─ YES ─► FIXED-SIZE WINDOW
      │          │
      │          Need running max/min inside window?
      │          ├─ YES ─► fixed window + MONOTONIC DEQUE
      │          └─ NO  ─► plain fixed window (running sum/count)
      │
      └─ NO (length is what we optimize/derive)
         │
         Can the metric be maintained incrementally AND is it monotonic
         (growing worsens/only-improves a constraint predictably)?
         │
         ├─ NO ─► prefix sums + hashmap  (e.g., sum==S with negatives)
         │
         └─ YES
            │
            Do we want the BEST length, or a COUNT of subarrays?
            │
            ├─ best LONGEST valid  ─► expand R; shrink L only on violation; track max len
            ├─ best SHORTEST valid ─► expand R until valid; shrink L while valid; track min len
            └─ COUNT with EXACTLY K ─► atMost(K) − atMost(K−1)   (two variable windows)
```

### 6.3 Contrast With Related Techniques

| Technique | When it applies | Relationship to Sliding Window |
|---|---|---|
| **Two Pointers** | Pairs/partitions, often on **sorted** data or from both ends (e.g., 2-sum sorted, container-with-water) | Sliding window is a *special case* of two pointers where both move **forward** and maintain a window aggregate. Two-pointer is broader (pointers can start at opposite ends and converge). |
| **Divide & Conquer** | Problem splits into independent subproblems, combine results (merge sort, max subarray via D&C) | D&C recomputes across the whole range recursively (O(n log n)); sliding window's incremental reuse is usually O(n) and simpler when applicable. |
| **Dynamic Programming** | Overlapping subproblems with optimal substructure; often **non-contiguous** or 2-D state (LIS, edit distance, knapsack) | Use DP when the answer depends on non-contiguous choices or when no monotonic window invariant exists. Some window problems (e.g., max subarray) have both a DP form (Kadane) and a window/prefix form. |
| **Prefix Sums / Hashmap** | Range-sum queries, "sum == S" **with negatives** | The go-to fallback *when sliding window breaks* due to lost monotonicity. |

> 💡 **Expert Takeaway:** "Two pointers" and "sliding window" are often conflated. Rule of thumb: if both indices march **forward** and you maintain an aggregate over the span between them, call it a **sliding window**. If the pointers start at **opposite ends and converge** (typically after sorting), it's the broader **two-pointer** pattern. Naming it correctly steers you to the right template fast.

---

## 📌 SECTION 7: Practice Problem Set

### 7.1 Ten Categorized Problems (Easy → Hard)

| # | Problem (LeetCode) | Difficulty | Window Type | Key Insight (one line) |
|---|---|---|---|---|
| 1 | Maximum Average Subarray I (LC 643) | Easy | Fixed | Slide a size-k window; track max running sum, divide once at the end. |
| 2 | Contains Duplicate II (LC 219) | Easy | Fixed | Keep a hashset of the last k indices; a repeat inside the window is the answer. |
| 3 | Longest Substring Without Repeating Characters (LC 3) | Medium | Variable (longest) | Shrink L past a duplicate's last position; window stays unique. |
| 4 | Max Consecutive Ones III (LC 1004) | Medium | Variable (longest) | Longest window with ≤ K zeros; shrink when zero-count exceeds K. |
| 5 | Fruit Into Baskets (LC 904) | Medium | Variable (longest) | Longest subarray with ≤ 2 distinct values via a frequency map. |
| 6 | Minimum Size Subarray Sum (LC 209) | Medium | Variable (shortest) | Expand until sum ≥ target, then shrink while still ≥ target. |
| 7 | Permutation in String (LC 567) | Medium | Fixed | Fixed window = len(pattern); compare frequency counts for a match. |
| 8 | Subarrays with K Different Integers (LC 992) | Hard | Multi-window | exactly(K) = atMost(K) − atMost(K−1). |
| 9 | Sliding Window Maximum (LC 239) | Hard | Fixed + monotonic deque | Deque of decreasing values; front is always the window max. |
| 10 | Minimum Window Substring (LC 76) | Hard | Variable (shortest) | Expand to cover all target chars; contract greedily to minimize length. |

### 7.2 One Fully Worked Solution — Minimum Window Substring (LC 76)

> **Problem:** Given strings `s` and `t`, return the **shortest** substring of `s` that contains **every character of `t`** (including multiplicities). Return `""` if none exists.

```python
# Problem: Minimum Window Substring (LC 76) — Variable (shortest) window
# Time: O(|s| + |t|)  |  Space: O(|Σ|)  (bounded by distinct chars in t)

from collections import Counter

def min_window(s: str, t: str) -> str:
    """
    Shortest substring of s containing all chars of t (with multiplicity).

    Strategy (shortest-valid variable window):
      1. Expand R to include chars until the window is 'valid'
         (covers every required char with enough count).
      2. Once valid, contract L as far as possible while STILL valid,
         recording the shortest valid window seen.
    """
    if not s or not t or len(s) < len(t):
        return ""

    need: Counter[str] = Counter(t)      # required char -> required count
    missing: int = len(t)                # total chars still needed (with multiplicity)

    L: int = 0
    best_len: int = float("inf")         # type: ignore[assignment]
    best_start: int = 0

    for R, ch in enumerate(s):           # R = right edge (incoming char)
        # If ch is still needed (count > 0), consuming it reduces 'missing'.
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1                    # ch is now inside the window
                                         # (may go negative = surplus of ch)

        # When missing == 0, the window [L, R] is VALID: it covers all of t.
        while missing == 0:
            # Record if this valid window is the shortest so far.
            if R - L + 1 < best_len:
                best_len = R - L + 1
                best_start = L

            # Try to shrink from the left. The char at L is leaving.
            left_ch = s[L]
            need[left_ch] += 1           # we give back left_ch to the 'need' pool
            # If need[left_ch] becomes positive, we NOW lack it -> window breaks.
            if need[left_ch] > 0:
                missing += 1
            L += 1                       # advance left edge (monotonic, never back)

    return "" if best_len == float("inf") else s[best_start:best_start + best_len]


# --- checks ---
assert min_window("ADOBECODEBANC", "ABC") == "BANC"
assert min_window("a", "a") == "a"
assert min_window("a", "aa") == ""
```

**Line-by-line reasoning**

1. **Guard clauses:** empty inputs or `|s| < |t|` can't yield a valid window → return `""` early.
2. **`need = Counter(t)`:** how many of each char the window must contain. A **positive** value means "still required"; a **non-positive** value means "have enough (or surplus)."
3. **`missing = len(t)`:** total outstanding requirement counting multiplicity. The window is valid exactly when `missing == 0`.
4. **Expand loop (`for R, ch …`):** we always grow the window by one char per iteration — `R` is monotonic.
5. **`if need[ch] > 0: missing -= 1`:** we only decrement `missing` when the incoming char was *genuinely still needed*. If `need[ch]` was already ≤ 0, this char is surplus and doesn't reduce the requirement.
6. **`need[ch] -= 1`:** record that one more `ch` now sits inside the window (can go negative → surplus).
7. **`while missing == 0`:** the window is valid; enter the contraction phase to find the *shortest* valid window with this `R`.
8. **Record best:** `R - L + 1` is the current window length (note the `+1` — §5.3 edge case). Save start + length if it's a new minimum.
9. **`need[left_ch] += 1`:** the char at `L` is about to leave, so we return it to the "need" pool.
10. **`if need[left_ch] > 0: missing += 1`:** if giving it back makes it *required* again, the window will no longer be valid after we drop it → bump `missing`, which ends the `while`.
11. **`L += 1`:** advance the left edge — forward only, preserving the O(n) guarantee.
12. **Return:** reconstruct the best window, or `""` if none was ever valid.

**Why O(|s| + |t|):** Building `need` is O(|t|). In the main pass, `R` moves `|s|` times and `L` moves at most `|s|` times total (monotonic), each doing O(1) work → O(|s|). Space is one counter over distinct characters → O(|Σ|).

---

## 📌 APPENDIX: Quick-Reference Cheat Sheet

### A. The Three Core Templates

```python
# 1) FIXED-SIZE
state = build(A[:k]); best = state
for R in range(k, n):
    state += A[R] - A[R-k]
    best = better(best, state)

# 2) LONGEST VALID (variable)
L = 0; best = 0
for R in range(n):
    add(A[R])
    while invalid():          # restore invariant
        remove(A[L]); L += 1
    best = max(best, R - L + 1)

# 3) SHORTEST VALID (variable)
L = 0; best = INF
for R in range(n):
    add(A[R])
    while valid():
        best = min(best, R - L + 1)
        remove(A[L]); L += 1
```

### B. Complexity At A Glance

| Pattern | Time | Space |
|---|---|---|
| Fixed sum/count | O(n) | O(1) |
| Fixed + distinct/frequency | O(n) | O(k) |
| Variable (longest/shortest) | O(n) | O(min(n,\|Σ\|)) |
| Window max/min (monotonic deque) | O(n) | O(k) |
| Exactly-K count (atMost trick) | O(n) | O(k) |
| Brute force (baseline to beat) | O(n²) / O(n·k) | O(1) |

### C. Trigger Words → Template

| You see… | Reach for… |
|---|---|
| "size k", "every k", "rolling/moving" | **Fixed** |
| "longest … such that", "without repeating" | **Longest variable** |
| "shortest / minimum window … containing" | **Shortest variable** |
| "max/min of each window" | **Fixed + deque** |
| "count subarrays with exactly K …" | **atMost(K) − atMost(K−1)** |
| "sum == S" **with negatives** | ❌ not window → **prefix sums + hashmap** |

### D. Invariant Checklist Before You Submit

- ✅ Pointers only ever move **forward**.
- ✅ Every **enter** has a matching **exit** update.
- ✅ Window length is `R - L + 1` (mind the `+1`).
- ✅ Output gated correctly (fixed: `R >= k-1`; variable: after invariant restored).
- ✅ Edge cases handled: `n == 0`, `k > n`, `k <= 0`, single element, duplicates at boundary.
- ✅ Aggregate is updated in O(1) — no `sum(window)` / `max(window)` inside the loop.
- ✅ For ML: window is **causal** (no future leakage) unless intentionally centered.

---

*End of reference guide.*

---

## Related Guides

**Prerequisites:** [Arrays & Strings](/docs/arrays-and-strings) · [Two Pointers](/docs/two-pointers)  
**See also:** [Two Pointers](/docs/two-pointers) · [Hashing Patterns](/docs/hashing-patterns)

*Section: [Core DSA](/docs/category/02-core-dsa) · [All guides](/)*
