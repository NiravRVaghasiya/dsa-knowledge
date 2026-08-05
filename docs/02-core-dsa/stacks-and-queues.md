---
title: Stacks & Queues
slug: /stacks-and-queues
sidebar_position: 5
sidebar_label: Stacks & Queues
description: >-
  LIFO/FIFO structures plus the monotonic stack/queue pattern for interview and production use.
tags:
  - stacks
  - queues
  - monotonic
  - patterns
difficulty: intermediate
reading_time: 30
prerequisites:
  - title: Arrays & Strings
    to: /docs/arrays-and-strings
  - title: Linked Lists
    to: /docs/linked-lists
pagination_prev: core-dsa/sorting-algorithms
pagination_next: core-dsa/heaps-and-priority-queues
path_step: 11
---

# Stacks & Queues: The Ultimate Reference Guide

> A single, self-contained reference for interview prep, production engineering, and AI/ML system design. Covers Stacks, Queues, and the Monotonic Stack/Queue pattern — from first principles to expert application.

---

## 1. Quick Reference Summary (TL;DR)

**Stack** — a **LIFO** (Last-In-First-Out) collection. The last element pushed is the first popped. Think of a stack of plates: you add and remove from the top only. All core operations (`push`, `pop`, `peek`) are **O(1)**.

**Queue** — a **FIFO** (First-In-First-Out) collection. The first element enqueued is the first dequeued. Think of a checkout line: first person in line is served first. All core operations (`enqueue`, `dequeue`, `front`) are **O(1)**.

**Monotonic Stack/Queue** — a stack or queue whose elements are kept in **sorted (monotonic) order** by discarding elements that can never again be the answer. It converts many "find the next/previous greater/smaller element" and "sliding window extremum" problems from **O(n²)** brute force to **O(n)**.

| Structure | Principle | Push/Add | Pop/Remove | Peek | Search | Typical backing |
| --- | --- | --- | --- | --- | --- | --- |
| **Stack** | LIFO | O(1) | O(1) | O(1) | O(n) | Dynamic array / linked list |
| **Queue** | FIFO | O(1) | O(1) | O(1) | O(n) | Ring buffer / linked list |
| **Deque** | Both ends | O(1) | O(1) | O(1) | O(n) | Doubly linked list / ring buffer |
| **Priority Queue** | Priority order | O(log n) | O(log n) | O(1) | O(n) | Binary heap |
| **Monotonic Stack** | LIFO + order invariant | O(1)* | O(1)* | O(1) | O(n) | Array |
| **Monotonic Deque** | Window + order invariant | O(1)* | O(1)* | O(1) | O(n) | Deque |

- *Amortized — each element is pushed and popped at most once, so a full pass over n elements is O(n).*

💡 **The one-sentence heuristic:** Reach for a **stack** when the most recent thing matters most (nesting, backtracking, undo). Reach for a **queue** when fairness/order matters (scheduling, BFS, buffering). Reach for a **monotonic** variant when you're repeatedly asking "what's the next/previous bigger/smaller thing?"

---

## 2. Stacks — Deep Dive

### 2.1 Definition & Analogy

A **stack** is an ordered collection of elements governed by the **LIFO** (Last-In, First-Out) principle: insertions (**push**) and deletions (**pop**) happen at a single end called the **top**. There is no random access — you can only ever touch the top element. This constraint is not a limitation to work around; it is the *entire point*. It makes a stack the natural model for anything that unwinds in reverse order of how it was built.

> 🥞 **Stack = Stack of Pancakes** — You always add and remove from the top. The first pancake made is the last one eaten. To reach the bottom pancake, every pancake above it must come off first.

> 🔙 **Stack = Browser Back Button** — Every page you visit is pushed. Hitting "Back" pops the most recent page. The order you *leave* pages is the exact reverse of the order you *entered* them.

**Formal properties:**

- Access pattern: **LIFO**. The element removed is always the most recently added.
- Primary access point: a single **top** pointer/index.
- Invariant: after `push(x)` immediately followed by `pop()`, you get `x` back and the stack is unchanged.

💡 **Chain-of-thought (what must you understand first?):** Before a stack "clicks," you need the idea of *deferred work* — sometimes you encounter something you can't resolve yet, so you set it aside and return to it in reverse order. That reversal is precisely what LIFO gives you for free.

### 2.2 Operations & Complexity

| Operation | Description | Time | Space |
| --- | --- | --- | --- |
| `push(x)` | Add `x` to the top | **O(1)** amortized | O(1) |
| `pop()` | Remove & return the top element | **O(1)** | O(1) |
| `peek()` / `top()` | Return top without removing | **O(1)** | O(1) |
| `is_empty()` | Check if stack has no elements | **O(1)** | O(1) |
| `size()` | Number of elements | **O(1)** | O(1) |
| `search(x)` | Find element by value | **O(n)** | O(1) |

⚠️ **Why "amortized" on push?** With an array-backed stack, most pushes are O(1), but occasionally the array is full and must be resized (typically doubled), costing O(n) to copy. Averaged over many pushes, the cost per push is still O(1) — this is **amortized analysis**, a favorite interview follow-up.

**Space:** O(n) total for n elements. A stack never uses more than O(1) *auxiliary* space per operation.

### 2.3 Implementations

There are two canonical backings. Python's built-in `list` already behaves as a high-performance array-backed stack (`append` = push, `pop` = pop), so you rarely hand-roll one — but you must understand both for interviews and systems work.

**Array-backed stack** (contiguous memory, index of top):

```python
class ArrayStack:
    """Stack backed by a dynamic array (Python list).
    Top of stack = end of the list, so all ops touch the cheap end."""

    def __init__(self) -> None:
        self._data: list = []

    def push(self, x) -> None:
        self._data.append(x)          # O(1) amortized (resize occasionally)

    def pop(self):
        if self.is_empty():
            raise IndexError("pop from empty stack")
        return self._data.pop()       # O(1) - removing the LAST element is cheap

    def peek(self):
        if self.is_empty():
            raise IndexError("peek from empty stack")
        return self._data[-1]         # O(1) random access to the top

    def is_empty(self) -> bool:
        return len(self._data) == 0

    def size(self) -> int:
        return len(self._data)


# --- runnable demo ---
s = ArrayStack()
for c in "ABC":
    s.push(c)
print(s.pop(), s.pop(), s.peek())   # C B B

```

**Linked-list-backed stack** (nodes, head = top):

```python
class Node:
    __slots__ = ("val", "next")       # __slots__ trims per-node memory overhead
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

class LinkedStack:
    """Stack backed by a singly linked list. Head of the list = top of stack.
    Every push/pop touches only the head -> guaranteed O(1), no resizing."""

    def __init__(self) -> None:
        self._head = None
        self._n = 0

    def push(self, x) -> None:
        self._head = Node(x, self._head)   # new node points at old head
        self._n += 1

    def pop(self):
        if self._head is None:
            raise IndexError("pop from empty stack")
        node = self._head
        self._head = node.next             # unlink the head
        self._n -= 1
        return node.val

    def peek(self):
        if self._head is None:
            raise IndexError("peek from empty stack")
        return self._head.val

    def is_empty(self) -> bool:
        return self._head is None

    def size(self) -> int:
        return self._n


# --- runnable demo ---
ls = LinkedStack()
for n in (1, 2, 3):
    ls.push(n)
print(ls.pop(), ls.size())          # 3 2

```

**Array vs. Linked-list — the trade-off:**

| Aspect | Array-backed | Linked-list-backed |
| --- | --- | --- |
| Push/pop worst case | O(n) on resize (O(1) amortized) | **O(1)** always |
| Memory locality | **Excellent** (contiguous, cache-friendly) | Poor (pointer chasing) |
| Memory overhead | Low (may over-allocate ~2x) | High (a pointer per node) |
| Real-time / latency-sensitive | Resize spikes can hurt | **Predictable** - no spikes |

🔥 **Expert Insight:** In 95% of application code, the array-backed stack (Python `list`, C++ `std::vector`, Java `ArrayDeque`) wins because cache locality dwarfs the theoretical resize cost. The linked-list stack shines only when you need *hard* worst-case O(1) guarantees (real-time systems) or when nodes are shared/persistent (immutable/functional data structures).

💡 **Tip — don't use Java's **`java.util.Stack`** or Python's **`queue.LifoQueue`** for algorithm work.** The former is a legacy synchronized class; the latter adds locking overhead. Use a plain `list` in Python and `ArrayDeque` in Java.

### 2.4 Variants

**Call Stack** — the runtime's own stack of activation records (stack frames). Each function call pushes a frame holding parameters, locals, and the return address; returning pops it. This is why deep or infinite recursion throws **StackOverflow** — the call stack is a bounded region of memory.

```python
# The call stack in action: recursion IS an implicit stack.
def factorial(n: int) -> int:
    if n <= 1:                 # base case -> deepest frame, unwinding begins
        return 1
    return n * factorial(n - 1)  # each call pushes a frame; returns pop them

print(factorial(5))            # 120
# Frame push order:  fact(5)->fact(4)->fact(3)->fact(2)->fact(1)
# Frame pop  order:  fact(1)->fact(2)->fact(3)->fact(4)->fact(5)   (LIFO!)

```

*Choose when:* You don't choose it explicitly — it's how recursion works. But recognizing it lets you **convert any recursive algorithm into an iterative one using an explicit stack** (see §5, iterative DFS) to dodge stack-overflow limits.

**Min Stack / Max Stack** — a stack that also returns its minimum (or maximum) element in **O(1)**. The trick: keep an auxiliary stack of running minima in lockstep with the main stack.

```python
class MinStack:
    """Supports push, pop, top, and getMin - all in O(1).
    Key idea: a parallel stack remembers the min AS OF each push."""

    def __init__(self) -> None:
        self._stack: list = []
        self._mins: list = []            # _mins[i] = min of _stack[0..i]

    def push(self, x: int) -> None:
        self._stack.append(x)
        # current min is x or the previous min, whichever is smaller
        self._mins.append(x if not self._mins else min(x, self._mins[-1]))

    def pop(self) -> int:
        self._mins.pop()                 # keep the two stacks in lockstep
        return self._stack.pop()

    def top(self) -> int:
        return self._stack[-1]

    def getMin(self) -> int:             # O(1) - just read the top of _mins
        return self._mins[-1]


ms = MinStack()
for v in (5, 3, 7, 2):
    ms.push(v)
print(ms.getMin())   # 2
ms.pop()
print(ms.getMin())   # 3

```

*Choose when:* You need extremum queries alongside LIFO behavior — e.g. tracking the running low of a metric while supporting undo. This is **LeetCode 155**, one of the most-asked stack questions.

**Monotonic Stack** — a stack whose contents are always kept increasing or decreasing. Covered in depth in §4, because it powers an entire family of O(n) algorithms.

🤖 **AI/ML Link:** The call stack maps directly onto **recursive tree traversals in decision trees and beam-search backtracking**. Min/Max stacks appear in **streaming feature engineering** — maintaining a running min/max over a sliding event log with O(1) updates for real-time model features.

---

## 3. Queues — Deep Dive

### 3.1 Definition & Analogy

A **queue** is an ordered collection governed by the **FIFO** (First-In, First-Out) principle: insertions (**enqueue**) happen at one end (the **rear/tail**) and deletions (**dequeue**) happen at the other end (the **front/head**). Order is preserved — elements leave in exactly the order they arrived. This makes queues the model for **fairness** and **buffering**: no element jumps ahead, and producers and consumers can run at different speeds.

> 🎟️ **Queue = Checkout Line** — The first person to join the line is the first served. New arrivals join the back; nobody cuts. Fair, ordered, predictable.

> 🍔 **Queue = Fast-food Order Pipeline** — Orders are taken at the front and fulfilled in arrival order at the kitchen. A buffer decouples the fast cashier (producer) from the slower kitchen (consumer).

**Formal properties:**

- Access pattern: **FIFO**. The element removed is always the oldest still present.
- Two access points: **front** (dequeue/peek) and **rear** (enqueue).
- Invariant: elements exit in the same relative order they entered.

💡 **Chain-of-thought (what must you understand first?):** A queue makes sense once you grasp **producer/consumer decoupling** — one party adds work, another removes it, and the queue absorbs the speed mismatch between them. That buffering role is why queues are everywhere in systems.

### 3.2 Operations & Complexity

| Operation | Description | Time | Space |
| --- | --- | --- | --- |
| `enqueue(x)` | Add `x` at the rear | **O(1)** | O(1) |
| `dequeue()` | Remove & return the front element | **O(1)** | O(1) |
| `front()` / `peek()` | Return front without removing | **O(1)** | O(1) |
| `is_empty()` | Check if queue has no elements | **O(1)** | O(1) |
| `size()` | Number of elements | **O(1)** | O(1) |

⚠️ **The classic Python trap:** A Python `list` is **not** a good queue. `list.pop(0)` (dequeue from the front) is **O(n)** because every remaining element must shift left one slot. Use `collections.deque`, whose `popleft()` is a true **O(1)**. Reaching for `list.pop(0)` in an interview is an instant red flag.

### 3.3 Implementations

`collections.deque`** — the practical default** (a doubly-linked list of fixed-size blocks; O(1) at both ends):

```python
from collections import deque

class Queue:
    """FIFO queue backed by collections.deque.
    enqueue at the right, dequeue from the left - both O(1)."""

    def __init__(self) -> None:
        self._dq = deque()

    def enqueue(self, x) -> None:
        self._dq.append(x)            # add at rear - O(1)

    def dequeue(self):
        if not self._dq:
            raise IndexError("dequeue from empty queue")
        return self._dq.popleft()     # remove from front - O(1)

    def front(self):
        if not self._dq:
            raise IndexError("front from empty queue")
        return self._dq[0]

    def is_empty(self) -> bool:
        return len(self._dq) == 0

    def size(self) -> int:
        return len(self._dq)


q = Queue()
for c in "ABC":
    q.enqueue(c)
print(q.dequeue(), q.dequeue(), q.front())   # A B C

```

**Circular queue (ring buffer)** — a fixed-capacity array where front and rear indices wrap around with modulo arithmetic. No shifting, no per-element allocation — the backbone of high-performance I/O buffers.

```python
class CircularQueue:
    """Fixed-capacity FIFO queue over a preallocated array.
    Indices wrap with modulo; O(1) enqueue/dequeue, zero shifting."""

    def __init__(self, capacity: int) -> None:
        self._buf = [None] * capacity
        self._cap = capacity
        self._head = 0        # index of the front element
        self._size = 0        # number of live elements

    def enqueue(self, x) -> None:
        if self._size == self._cap:
            raise OverflowError("queue is full")
        tail = (self._head + self._size) % self._cap   # wrap-around write
        self._buf[tail] = x
        self._size += 1

    def dequeue(self):
        if self._size == 0:
            raise IndexError("dequeue from empty queue")
        x = self._buf[self._head]
        self._buf[self._head] = None                    # help GC
        self._head = (self._head + 1) % self._cap       # advance head, wrap
        self._size -= 1
        return x

    def is_full(self) -> bool:
        return self._size == self._cap

    def is_empty(self) -> bool:
        return self._size == 0


cq = CircularQueue(3)
cq.enqueue(1); cq.enqueue(2); cq.enqueue(3)
print(cq.dequeue())     # 1
cq.enqueue(4)           # reuses the slot freed by dequeue (wrap-around)
print(cq.dequeue(), cq.dequeue(), cq.dequeue())   # 2 3 4

```

🔥 **Expert Insight:** The **ring buffer** is one of the most important structures in systems programming — it underlies OS I/O buffers, audio/video streaming pipelines, lock-free SPSC (single-producer/single-consumer) queues, and Kafka-style logs. Fixed capacity is a *feature*: it bounds memory and provides natural **back-pressure** when full.

### 3.4 Variants

**Simple (linear) Queue** — the plain FIFO above. *Choose when:* you need basic ordered buffering and unbounded growth is acceptable.

**Circular Queue** — fixed-capacity FIFO with wrap-around. *Choose when:* you need bounded memory, predictable latency, and back-pressure (I/O buffers, streaming).

**Deque (Double-Ended Queue)** — insert and remove at **both** ends in O(1). A deque is a superset: it can act as a stack *or* a queue. It's also the substrate for the monotonic-queue sliding-window pattern (§4).

```python
from collections import deque

dq = deque()
dq.append(1)        # push right
dq.appendleft(0)    # push left
dq.append(2)        # deque is now [0, 1, 2]
print(dq.pop())      # 2  (pop right)
print(dq.popleft())  # 0  (pop left)
print(list(dq))      # [1]

```

*Choose when:* you need to add/remove from both ends — sliding windows, undo/redo with a capped history, work-stealing schedulers (steal from one end, push/pop your own from the other).

**Priority Queue** — elements are dequeued by **priority**, not arrival order. Backed by a **binary heap**: enqueue and dequeue are O(log n), peek-min is O(1). Python's `heapq` gives a min-heap over a plain list.

```python
import heapq

class PriorityQueue:
    """Min-priority queue via a binary heap. Lowest priority value pops first.
    A counter breaks ties so equal-priority items keep FIFO order and we
    never compare the payloads themselves."""

    def __init__(self) -> None:
        self._heap: list = []
        self._counter = 0             # tie-breaker => stable ordering

    def push(self, item, priority: float) -> None:
        heapq.heappush(self._heap, (priority, self._counter, item))  # O(log n)
        self._counter += 1

    def pop(self):
        if not self._heap:
            raise IndexError("pop from empty priority queue")
        priority, _, item = heapq.heappop(self._heap)                # O(log n)
        return item

    def peek(self):
        return self._heap[0][2]       # O(1) - the min is always at index 0

    def is_empty(self) -> bool:
        return not self._heap


pq = PriorityQueue()
pq.push("low-prio email", priority=5)
pq.push("PAGE: prod down", priority=1)
pq.push("standup reminder", priority=3)
print(pq.pop())   # PAGE: prod down   (priority 1 wins)
print(pq.pop())   # standup reminder

```

*Choose when:* order of service depends on importance, not arrival — task schedulers, Dijkstra/A* frontiers, event simulation, top-k selection, **beam search** in ML decoding.

**Monotonic Queue** — a deque kept in monotonic order to answer sliding-window min/max in O(1) amortized. Covered in §4.

🤖 **AI/ML Link:** Queues are the *circulatory system* of ML infrastructure. **Batch-processing queues** (Celery, SQS, Kafka) buffer inference/training jobs and provide back-pressure. `DataLoader`** prefetch queues** decouple CPU data preparation from GPU compute so the GPU never starves. **Priority queues** drive **beam search** (keep the top-k highest-probability partial sequences) and the frontier in A*-style planning agents. **Replay buffers** in reinforcement learning are ring buffers of past transitions.

---

## 4. Monotonic Stack & Queue

### 4.1 Concept & Intuition

A **monotonic stack** is an ordinary stack with one added invariant: its elements are always in **sorted order** (strictly/loosely increasing or decreasing) from bottom to top. Before pushing a new element, you **pop everything that violates the order**. A **monotonic queue** (usually a deque) applies the same idea while also allowing removal from the front as a window slides.

**Why it works — the "dominated element" insight:** When you push `x` and pop a smaller element `y` beneath it, you are asserting: *"*`y`* can never be the answer for any future query, because `x` is closer AND better (larger)."* Once an element is dominated by a newer, better candidate, it is useless and can be discarded forever.

**The amortized-O(n) argument:** Each element is pushed **exactly once** and popped **at most once**. Even though there's an inner `while` loop, the *total* number of pops across the whole run is bounded by n. So a loop that looks O(n²) is actually **O(n)** — this is the single most important thing to be able to explain in an interview.

💡 **Chain-of-thought (what must you understand first?):** You need to first feel the *brute force*: "for each element, scan forward to find the next bigger one" is O(n²). The monotonic stack is the realization that most of that scanning is redundant — a single element, once passed, resolves *many* pending queries at once.

**Decision key — which direction?**

| You want... | Stack is monotonic... | Pop while... |
| --- | --- | --- |
| **Next Greater** element | decreasing (top = smallest) | `stack top < current` |
| **Next Smaller** element | increasing (top = largest) | `stack top > current` |
| **Previous Greater** element | decreasing | `stack top <= current` |
| **Previous Smaller** element | increasing | `stack top >= current` |
| Sliding-window **maximum** | decreasing deque | `back < current` |
| Sliding-window **minimum** | increasing deque | `back > current` |

⚠️ **Strict vs. non-strict matters for duplicates.** Use `<` vs `<=` deliberately: it decides whether equal elements are treated as "already greater/smaller." Getting this wrong is the #1 source of off-by-one bugs in histogram and NGE problems.

### 4.2 Templates

**Template A — Monotonic Stack (Next Greater Element), stores indices:**

```python
def next_greater_elements(nums: list[int]) -> list[int]:
    """For each i, the value of the next element to the RIGHT that is
    strictly greater than nums[i]; -1 if none. Runs in O(n) time, O(n) space.

    Invariant: `stack` holds indices whose answers are still unknown, and
    their VALUES are strictly decreasing from bottom to top."""
    n = len(nums)
    result = [-1] * n
    stack: list[int] = []                 # stack of INDICES (not values)

    for i, val in enumerate(nums):
        # Current val is the "next greater" for every pending index it beats.
        while stack and nums[stack[-1]] < val:
            idx = stack.pop()             # this index's answer is resolved
            result[idx] = val
        stack.append(i)                   # i's answer is still unknown - defer

    # Indices left on the stack have no greater element to their right -> -1.
    return result

# Input:  [2, 1, 2, 4, 3]
# Output: [4, 2, 4, -1, -1]
print(next_greater_elements([2, 1, 2, 4, 3]))

```

**Template B — Monotonic Deque (Sliding Window Maximum):**

```python
from collections import deque

def sliding_window_maximum(nums: list[int], k: int) -> list[int]:
    """Maximum of every contiguous window of size k. O(n) time, O(k) space.

    The deque holds INDICES whose values are strictly decreasing.
    - Front of deque = index of the current window maximum.
    - We pop from the BACK to maintain the decreasing invariant.
    - We pop from the FRONT when an index slides out of the window."""
    dq: deque[int] = deque()              # indices, values decreasing
    out: list[int] = []

    for i, val in enumerate(nums):
        # 1) Evict smaller values at the back - they can never be the max now.
        while dq and nums[dq[-1]] < val:
            dq.pop()
        dq.append(i)

        # 2) Evict the front if it has slid out of the window [i-k+1, i].
        if dq[0] <= i - k:
            dq.popleft()

        # 3) Once the first full window is formed, record the max (front).
        if i >= k - 1:
            out.append(nums[dq[0]])

    return out

# Window size 3 over [1,3,-1,-3,5,3,6,7]
# Output: [3, 3, 5, 5, 6, 7]
print(sliding_window_maximum([1, 3, -1, -3, 5, 3, 6, 7], 3))

```

🔥 **Expert Insight:** Notice both templates store **indices, not values**. Indices let you (a) compute distances/widths (crucial for histogram and "days until warmer" problems) and (b) check window membership. Storing raw values is a common beginner mistake that throws away positional information you almost always need.

### 4.3 Classic Problems

The monotonic pattern is the key to a whole cluster of high-frequency interview problems:

- **Next Greater Element I / II** (LC 496, 503) — Template A; II wraps around with `i % n`.
- **Daily Temperatures** (LC 739) — NGE but store the *distance* `i - idx` instead of the value.
- **Largest Rectangle in Histogram** (LC 84) — monotonic increasing stack of bar indices (full dry run in §5).
- **Trapping Rain Water** (LC 42) — monotonic decreasing stack, accumulate trapped water layer by layer.
- **Sliding Window Maximum** (LC 239) — Template B.
- **Sum of Subarray Minimums** (LC 907) — monotonic stack to count, for each element, how many subarrays it is the min of.
- **Remove K Digits / Remove Duplicate Letters** (LC 402, 316) — greedily pop to build the smallest monotonic result.

🤖 **AI/ML Link:** The monotonic-deque sliding-window maximum is the exact mechanism behind efficient **1-D max-pooling over a stream** and **windowed feature aggregation** (rolling max/min) in real-time feature stores — computing a rolling extremum over a signal in O(n) instead of O(n·k), which matters when k (the window) is large in time-series and audio models.

---

## 5. Algorithms & Patterns (with dry runs)

Each pattern below includes a **problem statement**, an **annotated implementation**, a **step-by-step trace** of the data-structure state, and **edge cases**.

### 5.1 Balanced Parentheses / Bracket Matching

**Problem:** Given a string of brackets `()[]{}`, determine if every opening bracket has a correctly ordered, correctly typed closing bracket. (LeetCode 20.)

**Why a stack?** The *most recently opened* bracket must be the *first* to close — pure LIFO.

```python
def is_balanced(s: str) -> bool:
    """Return True iff brackets are balanced and correctly nested. O(n)/O(n)."""
    pairs = {')': '(', ']': '[', '}': '{'}   # closer -> matching opener
    stack: list[str] = []

    for ch in s:
        if ch in '([{':
            stack.append(ch)                 # opener: defer, push it
        elif ch in ')]}':
            # closer must match the most-recent opener on the stack top
            if not stack or stack[-1] != pairs[ch]:
                return False                 # nothing to match, or wrong type
            stack.pop()                      # matched -> resolve it
        # (non-bracket characters, if any, are ignored)

    return not stack                         # leftover openers => unbalanced

print(is_balanced("{[()]}"))   # True
print(is_balanced("([)]"))     # False - interleaved, wrong nesting

```

**Dry run** on `"{[()]}"`:

```
char   action                     stack (bottom -> top)
----   ------------------------   ---------------------
 {     push '{'                   ['{']
 [     push '['                   ['{','[']
 (     push '('                   ['{','[','(']
 )     top '(' matches ')' -> pop ['{','[']
 ]     top '[' matches ']' -> pop ['{']
 }     top '{' matches '}' -> pop []
end    stack empty -> BALANCED    []

```

**Dry run** on `"([)]"` (fails):

```
char   action                          stack
----   -----------------------------   ------------
 (     push                            ['(']
 [     push                            ['(','[']
 )     top is '[' , needs '(' -> FALSE  (mismatch!)

```

⚠️ **Edge cases:** empty string (`True` — vacuously balanced); a lone closer like `")"` (stack empty on close → `False`); trailing openers `"((("` (non-empty stack at end → `False`); odd length can short-circuit to `False`.

### 5.2 Next Greater Element / Next Smaller Element

**Problem:** For each element, find the first element to its right that is strictly greater (NGE). Return -1 where none exists. (LeetCode 496/503/739.)

See **Template A** in §4.2 for the code. Here is the trace on `[2, 1, 2, 4, 3]` (stack holds indices; values shown for clarity):

```
i  val  while-pop (nums[top] < val)          stack(idx:val)      result so far
-  ---  ---------------------------------    -----------------   -----------------------
0   2   stack empty                          [0:2]               [-1,-1,-1,-1,-1]
1   1   nums[0]=2 !< 1 -> no pop             [0:2, 1:1]          [-1,-1,-1,-1,-1]
2   2   nums[1]=1 < 2 -> pop idx1, res[1]=2  [0:2]               [-1, 2,-1,-1,-1]
        nums[0]=2 !< 2 -> stop               [0:2, 2:2]          [-1, 2,-1,-1,-1]
3   4   nums[2]=2 <4 pop idx2 res[2]=4       [0:2]               [-1, 2, 4,-1,-1]
        nums[0]=2 <4 pop idx0 res[0]=4       []                  [ 4, 2, 4,-1,-1]
        push 3                               [3:4]               [ 4, 2, 4,-1,-1]
4   3   nums[3]=4 !< 3 -> no pop             [3:4, 4:3]          [ 4, 2, 4,-1,-1]
end     leftover idx 3,4 -> stay -1                              [ 4, 2, 4,-1,-1]

```

💡 **Variant — Next Smaller Element:** flip the comparison to `nums[stack[-1]] > val` and keep the stack **increasing**. **Daily Temperatures** (LC 739): identical to NGE but store the *distance* `i - idx` rather than the value.

⚠️ **Edge cases:** strictly decreasing input → all `-1`; duplicates → decide `<` vs `<=` (strict `<` means an equal element is *not* "greater"); for the **circular** variant (LC 503), iterate `2n` times using `i % n` and only push during the first pass.

### 5.3 Sliding Window Maximum (Monotonic Deque)

**Problem:** Given `nums` and window size `k`, return the maximum of each window as it slides left to right. (LeetCode 239.) Brute force is O(n·k); the monotonic deque is **O(n)**.

See **Template B** in §4.2. Trace on `nums=[1,3,-1,-3,5,3,6,7]`, `k=3` (deque holds indices, values decreasing):

```
i  val  back-pop (nums[back]<val)   front-pop (out of window)   deque(idx)     window max
-  ---  -------------------------   -------------------------   ------------   ----------
0   1   -                           -                           [0]            (forming)
1   3   pop idx0 (1<3)              -                           [1]            (forming)
2  -1   -                           -                           [1,2]          3   (nums[1])
3  -3   -                           front idx1? 1<=0? no        [1,2,3]        3
4   5   pop 3(-3),2(-1),1(3) all<5  -                           [4]            5
5   3   -                           -                           [4,5]          5
6   6   pop 5(3),4(5) <6            -                           [6]            6
7   7   pop 6(6) <7                 -                           [7]            7
out -> [3, 3, 5, 5, 6, 7]

```

🔥 **Expert Insight:** The front of the deque is *always* the current window's max, in O(1). The magic is that each index enters and leaves the deque exactly once — the seemingly nested `while` is O(n) amortized overall.

⚠️ **Edge cases:** `k == 1` → output equals the input; `k == len(nums)` → single global max; check the **front-eviction** condition (`dq[0] <= i - k`) carefully — this is where off-by-one bugs live.

### 5.4 Largest Rectangle in Histogram

**Problem:** Given bar heights, find the area of the largest axis-aligned rectangle that fits under the skyline. (LeetCode 84.) This is the crown jewel of monotonic-stack problems.

**Key idea:** Maintain a stack of bar indices with **increasing heights**. When the current bar is *shorter* than the stack top, that top bar can extend no further right — pop it and compute the largest rectangle with that bar as the *shortest* one. A sentinel `0` height at the end flushes the stack.

```python
def largest_rectangle_area(heights: list[int]) -> int:
    """Largest rectangle under the histogram. O(n) time, O(n) space.
    Stack holds indices of bars with strictly increasing heights."""
    stack: list[int] = []          # indices, heights increasing
    max_area = 0
    # Append a 0-height sentinel so every real bar gets popped and measured.
    for i, h in enumerate(heights + [0]):
        # Current bar is lower than the top -> the top bar's rectangle ends here.
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]           # the bar we finalize
            # Width spans from just after the new top to just before i.
            left = stack[-1] if stack else -1
            width = i - left - 1
            max_area = max(max_area, height * width)
        stack.append(i)
    return max_area

print(largest_rectangle_area([2, 1, 5, 6, 2, 3]))   # 10  (5 and 6 over width 2)

```

**Dry run** on `[2, 1, 5, 6, 2, 3]` (with sentinel `0` appended → index 6):

```
i  h  pop? (top height >= h)                     area computed          stack(idx)   max
-  -  --------------------------------------     -------------------    ----------   ---
0  2  -                                          -                      [0]           0
1  1  h[0]=2>=1 pop0: H=2,left=-1,W=1-(-1)-1=1   2*1 = 2                [1]           2
2  5  -                                          -                      [1,2]         2
3  6  -                                          -                      [1,2,3]       2
4  2  h[3]=6>=2 pop3: H=6,left=2,W=4-2-1=1        6*1 = 6                [1,2]         6
      h[2]=5>=2 pop2: H=5,left=1,W=4-1-1=2        5*2 = 10               [1]          10
5  3  -                                          -                      [1,4]        10
6  0  h[4]=2? wait top is idx5 h=3>=0 pop5:                                            
         H=3,left=4,W=6-4-1=1                     3*1 = 3                [1,4]        10
      h[4]=2>=0 pop4: H=2,left=1,W=6-1-1=4        2*4 = 8                [1]          10
      h[1]=1>=0 pop1: H=1,left=-1,W=6-(-1)-1=6    1*6 = 6                []           10
final max area = 10

```

⚠️ **Edge cases:** all-equal bars (`[3,3,3]` → `3*3=9`); strictly increasing (each popped only by the sentinel); single bar; **the sentinel is essential** — without it, bars still on the stack at the end are never measured. Use `>=` (not `>`) so equal-height bars merge correctly.

🤖 **AI/ML Link:** The same "maximal rectangle" logic extends to the **Maximal Rectangle** problem on binary matrices (LC 85), which appears in **document layout analysis and computer-vision bounding-box extraction** — finding the largest homogeneous region in a segmentation mask.

---


### 5.5 Expression Evaluation (Infix / Postfix)

**Problem:** Evaluate arithmetic expressions. Infix (`3 + 4 * 2`) is how humans write; **postfix / Reverse Polish Notation** (`3 4 2 * +`) is how machines evaluate — no parentheses, no precedence rules at eval time. Two stack algorithms do the work: the **Shunting-Yard** algorithm (infix → postfix) and **postfix evaluation**.

**Step 1 — Infix to Postfix (Dijkstra's Shunting-Yard):**

```python
def infix_to_postfix(expr: str) -> str:
    """Convert a space-separated infix expression to postfix (RPN).
    Uses an operator stack; pops higher/equal precedence before pushing."""
    prec = {'+': 1, '-': 1, '*': 2, '/': 2, '^': 3}
    right_assoc = {'^'}                    # ^ binds right-to-left
    output: list[str] = []
    ops: list[str] = []                    # operator stack

    for tok in expr.split():
        if tok.isdigit():
            output.append(tok)             # operands go straight to output
        elif tok == '(':
            ops.append(tok)
        elif tok == ')':
            while ops and ops[-1] != '(':  # flush until the matching '('
                output.append(ops.pop())
            ops.pop()                      # discard the '('
        else:                              # an operator
            while (ops and ops[-1] != '(' and
                   (prec[ops[-1]] > prec[tok] or
                    (prec[ops[-1]] == prec[tok] and tok not in right_assoc))):
                output.append(ops.pop())   # higher/equal precedence pops first
            ops.append(tok)

    while ops:                             # flush remaining operators
        output.append(ops.pop())
    return ' '.join(output)


def eval_postfix(expr: str) -> int:
    """Evaluate a space-separated postfix (RPN) expression with a stack."""
    stack: list[int] = []
    for tok in expr.split():
        if tok.lstrip('-').isdigit():
            stack.append(int(tok))         # operand: push
        else:                              # operator: pop two, apply, push back
            b = stack.pop(); a = stack.pop()   # NOTE the order: a op b
            stack.append({'+': a + b, '-': a - b,
                          '*': a * b, '/': int(a / b),
                          '^': a ** b}[tok])
    return stack[0]


post = infix_to_postfix("3 + 4 * 2 - ( 1 + 5 )")
print(post)                # 3 4 2 * + 1 5 + -
print(eval_postfix(post))  # 5
```

**Dry run — evaluating postfix `3 4 2 * + 1 5 + -`:**

```
token   action                              stack (bottom -> top)
-----   ---------------------------------   ---------------------
 3      push 3                              [3]
 4      push 4                              [3,4]
 2      push 2                              [3,4,2]
 *      pop 2,4 -> 4*2=8 -> push            [3,8]
 +      pop 8,3 -> 3+8=11 -> push           [11]
 1      push 1                              [11,1]
 5      push 5                              [11,1,5]
 +      pop 5,1 -> 1+5=6 -> push            [11,6]
 -      pop 6,11 -> 11-6=5 -> push          [5]
result = 5
```

⚠️ **Edge cases:** operand/operator order for non-commutative ops (`-`, `/`, `^`) — always compute `a OP b` where `b` was popped first; integer vs. float division (`int(a/b)` truncates toward zero, matching many judge expectations); right-associativity of `^`; unary minus needs special handling (often pre-tokenized as `0 - x` or a distinct token).

🤖 **AI/ML Link:** Stack-based expression evaluation is the core of **computation-graph execution** in autograd engines. Frameworks like PyTorch/TensorFlow build an expression DAG; reverse-mode autodiff walks it in reverse **topological (postfix-like) order**, using a stack to unwind operations and accumulate gradients — the backward pass is essentially postfix evaluation over the derivative graph.

### 5.6 BFS Using a Queue

**Problem:** Traverse or search a graph level by level (shortest path in an unweighted graph). BFS *requires* a FIFO queue — the queue's order is what guarantees you visit all distance-1 nodes before any distance-2 node.

```python
from collections import deque

def bfs(graph: dict, start) -> list:
    """Breadth-first traversal order from `start`. O(V + E).
    The FIFO queue guarantees level-by-level (nearest-first) visitation."""
    visited = {start}                      # mark BEFORE enqueue to avoid dups
    queue = deque([start])
    order = []

    while queue:
        node = queue.popleft()             # FIFO: oldest frontier node first
        order.append(node)
        for nbr in graph[node]:
            if nbr not in visited:
                visited.add(nbr)           # mark on enqueue, not on dequeue
                queue.append(nbr)
    return order

graph = {'A': ['B', 'C'], 'B': ['D', 'E'], 'C': ['F'],
         'D': [], 'E': ['F'], 'F': []}
print(bfs(graph, 'A'))     # ['A', 'B', 'C', 'D', 'E', 'F']
```

**Dry run** from `A`:

```
step  dequeue  enqueue (new nbrs)   queue (front -> rear)   order
----  -------  ------------------   ---------------------   ---------------------
init  -        -                    [A]                     []
1     A        B, C                 [B, C]                  [A]
2     B        D, E                 [C, D, E]               [A, B]
3     C        F                    [D, E, F]               [A, B, C]
4     D        -                    [E, F]                  [A, B, C, D]
5     E        (F already seen)     [F]                     [A, B, C, D, E]
6     F        -                    []                      [A, B, C, D, E, F]
```

💡 **Tip — mark visited on ENQUEUE, not dequeue.** If you mark on dequeue, the same node can be enqueued multiple times before it's processed, inflating the queue and causing duplicate work (or TLE on large graphs).

⚠️ **Edge cases:** disconnected graphs (loop over all start nodes); cycles (the `visited` set prevents infinite loops); a node listing itself as a neighbor (self-loop — the `visited` guard handles it).

### 5.7 DFS Using an Explicit Stack

**Problem:** Depth-first traversal without recursion — essential when the graph is deep enough to overflow the call stack. Swap the queue for a stack and BFS becomes DFS: the *only* structural difference is LIFO vs. FIFO.

```python
def dfs_iterative(graph: dict, start) -> list:
    """Iterative depth-first traversal using an EXPLICIT stack. O(V + E).
    Pushing neighbors in reverse makes the visit order match recursive DFS."""
    visited = set()
    stack = [start]                        # LIFO frontier
    order = []

    while stack:
        node = stack.pop()                 # LIFO: most-recent node first
        if node in visited:
            continue                       # may be pushed more than once
        visited.add(node)                  # mark on POP for iterative DFS
        order.append(node)
        # Reverse so the left-most neighbor is processed first (matches recursion).
        for nbr in reversed(graph[node]):
            if nbr not in visited:
                stack.append(nbr)
    return order

graph = {'A': ['B', 'C'], 'B': ['D', 'E'], 'C': ['F'],
         'D': [], 'E': ['F'], 'F': []}
print(dfs_iterative(graph, 'A'))   # ['A', 'B', 'D', 'E', 'F', 'C']
```

**Dry run** from `A`:

```
step  pop  push (reversed unvisited)   stack (bottom -> top)   order
----  ---  -------------------------   ---------------------   ------------------
init  -    -                           [A]                     []
1     A    C, B                        [C, B]                  [A]
2     B    E, D                        [C, E, D]               [A, B]
3     D    -                           [C, E]                  [A, B, D]
4     E    F                           [C, F]                  [A, B, D, E]
5     F    -                           [C]                     [A, B, D, E, F]
6     C    (F already visited)         []                      [A, B, D, E, F, C]
```

🔥 **Expert Insight:** BFS and DFS are the *same algorithm* with a different container — queue → BFS, stack → DFS. This is the deepest structural lesson connecting the two data structures: **the container's ordering discipline dictates the traversal shape.** In the iterative DFS, mark visited on *pop* (a node can sit on the stack multiple times); in BFS, mark on *enqueue*.

⚠️ **Edge cases:** the `if node in visited: continue` guard is mandatory because a node may be pushed by several neighbors before it's popped; for pre/post-order tree variants you push state markers or track children explicitly.

🤖 **AI/ML Link:** Explicit-stack DFS is how production graph libraries traverse **very deep computation graphs and dependency DAGs** without hitting Python's ~1000-frame recursion limit — e.g. topological sorting of operations before scheduling them onto devices, or walking a deeply nested model architecture during graph compilation.

---

## 6. Domain Applications (AI/ML / LLM / Systems)

### 6.1 AI/ML Pipelines

🤖 **Batch-processing & task queues.** Training and inference workloads are almost always mediated by **queues** (Kafka, SQS, RabbitMQ, Celery). A producer enqueues jobs; a pool of workers dequeues them. The queue provides **back-pressure** (bounded queues slow producers when consumers lag), **decoupling** (producer and consumer scale independently), and **durability** (jobs survive worker crashes).

🤖 **DataLoader prefetch queues.** In PyTorch, `DataLoader` worker processes prepare batches on the CPU and push them into a bounded **queue** while the GPU trains on the previous batch. This FIFO prefetch buffer hides data-loading latency so the GPU never idles — a direct, high-impact use of the producer/consumer queue pattern.

🤖 **Beam search = priority queue.** In sequence decoding (translation, summarization, LLM generation with beam search), a **priority queue / heap** keeps the top-k highest-probability partial sequences at each step, expanding and re-ranking them. The heap makes "keep the best k of many candidates" efficient.

🤖 **Replay buffers = ring buffer.** Reinforcement-learning agents store past transitions `(state, action, reward, next_state)` in a fixed-capacity **circular queue**. New experiences overwrite the oldest — bounded memory, O(1) insertion, uniform random sampling for training.

### 6.2 LLM Internals

🤖 **Token processing & KV-cache.** Autoregressive generation processes tokens in strict FIFO arrival order; the **KV-cache** grows as a sequential buffer. Sliding-window and streaming-attention variants (e.g. attention sinks) manage this as a **bounded/ring buffer**, evicting the oldest cached keys/values — the same eviction discipline as a monotonic/circular queue.

🤖 **Attention & the "stack" mental model.** While attention itself is matrix math, the **layer stack** of a transformer is processed in order, and gradient computation unwinds it in reverse — a LIFO discipline. Nested structures the model parses (balanced brackets in code generation, nested JSON) are validated with **stack** logic; models even learn implicit stack-like state to track nesting depth.

🤖 **Autograd = postfix evaluation over a graph.** As shown in §5.5, reverse-mode automatic differentiation walks the computation graph in reverse topological order using a **stack** to unwind operations and accumulate gradients. The backward pass is structurally a postfix evaluation of the derivative expression.

🤖 **Tokenizer & parser stacks.** BPE merging, structured-output/grammar-constrained decoding, and JSON/tool-call parsing all lean on **stacks** to track nested scopes and enforce that opened structures close correctly.

### 6.3 System Design

🤖 **Task schedulers.** OS run queues and job schedulers use **priority queues** (by priority/deadline) and **FIFO queues** (round-robin fairness). Real-time schedulers use ring buffers for predictable, allocation-free operation.

🤖 **Undo/redo = two stacks.** Editors and design tools keep an **undo stack** and a **redo stack**. Every action pushes onto undo; undo pops from undo and pushes onto redo; a new action clears redo. Pure LIFO on both sides.

🤖 **Function call stack & backtracking.** Every running program has a call stack (§2.4). Backtracking search (N-Queens, Sudoku, maze solving) is DFS over a state space — implemented recursively (implicit stack) or with an explicit stack.

🤖 **Rate limiting & buffering.** Network stacks, log pipelines, and streaming systems use **ring buffers** and bounded queues to smooth bursty traffic and enforce back-pressure. Message brokers (Kafka) are essentially durable, partitioned, append-only queues.

---

## 7. Expert Takeaways & Pro Tips

### 7.1 Common Interview Mistakes

⚠️ **Using `list.pop(0)` as a queue in Python.** It's O(n) per dequeue → O(n²) overall. Always use `collections.deque`. This single mistake has failed countless interviews.

⚠️ **Storing values instead of indices in a monotonic stack.** You almost always need positions to compute widths/distances or check window membership. Default to storing **indices**.

⚠️ **Getting `<` vs `<=` wrong with duplicates.** In NGE, histogram, and window problems, strict vs. non-strict comparison changes correctness. Reason explicitly about how equal elements should be treated *before* coding.

⚠️ **Forgetting the histogram sentinel.** Without appending a `0` height, bars still on the stack at the end are never measured. (Symmetric trick: a leading sentinel simplifies the `left` boundary.)

⚠️ **Marking BFS visited on dequeue instead of enqueue.** Leads to duplicate enqueues, bloated queues, and sometimes TLE. Mark on enqueue for BFS; mark on pop for iterative DFS.

⚠️ **Not handling empty structures.** Peeking/popping an empty stack or queue should raise or be guarded. Interviewers probe this immediately.

### 7.2 Optimization Tricks

💡 **`deque` is your Swiss-army knife** — it is a stack, a queue, and a sliding-window buffer in one, all O(1) at both ends. Set `maxlen` to get an automatic ring buffer that drops the oldest element on overflow.

💡 **Two stacks make a queue; two queues make a stack.** Classic interview puzzle (LC 232/225). Amortized O(1) dequeue via the "transfer when empty" trick — a great way to demonstrate amortized-analysis fluency.

💡 **Monotonic stack turns O(n²) into O(n).** Whenever you catch yourself writing "for each element, scan left/right for the next bigger/smaller," stop — it's almost certainly a monotonic-stack problem.

💡 **Heap `(priority, counter, item)` tuples** avoid comparing un-orderable payloads and give stable FIFO tie-breaking in a priority queue.

💡 **Convert recursion to an explicit stack** to (a) avoid stack-overflow on deep inputs and (b) gain fine control over traversal state — a common senior-level ask.

### 7.3 When NOT to Use a Stack or Queue

🔥 **Need random access or search by value?** Use an array (O(1) index) or hash map (O(1) lookup). Stacks/queues only expose the ends — searching is O(n).

🔥 **Need sorted iteration or range queries?** Use a balanced BST / skip list / sorted container, not a stack or queue.

🔥 **Need the k-th element or arbitrary-position insert/delete?** A stack/queue is the wrong tool; consider an array, balanced tree, or indexed skip list.

🔥 **Priorities matter but you used a plain FIFO queue?** Switch to a priority queue — otherwise urgent items wait behind trivial ones.

🔥 **Single-threaded algorithm work?** Don't reach for thread-safe variants (`queue.Queue`, `java.util.Stack`) — their locking overhead is pure waste. Use `deque` / `ArrayDeque`.

---

## 8. Comparison Tables & Decision Framework

### 8.1 Side-by-Side Comparison

| Structure | Order | Insert | Remove | Peek | Random Access | Backing | Best-fit use |
|-----------|-------|:------:|:------:|:----:|:-------------:|---------|--------------|
| **Stack** | LIFO | O(1) | O(1) | O(1) | ❌ O(n) | array / linked list | Nesting, backtracking, undo, DFS |
| **Simple Queue** | FIFO | O(1) | O(1) | O(1) | ❌ O(n) | deque / linked list | Buffering, BFS, scheduling |
| **Circular Queue** | FIFO | O(1) | O(1) | O(1) | ❌ | fixed array (ring) | Bounded buffers, streaming, back-pressure |
| **Deque** | Both ends | O(1) | O(1) | O(1) | ❌ | doubly linked / ring | Sliding window, work-stealing |
| **Priority Queue** | By priority | O(log n) | O(log n) | O(1) | ❌ | binary heap | Schedulers, Dijkstra/A\*, beam search, top-k |
| **Monotonic Stack** | LIFO + invariant | O(1)* | O(1)* | O(1) | ❌ | array | NGE/NSE, histogram, trapping rain |
| **Monotonic Deque** | Window + invariant | O(1)* | O(1)* | O(1) | ❌ | deque | Sliding-window min/max |

\* amortized

### 8.2 Decision Flowchart (text-based)

```
START: What is the access/ordering requirement?
│
├─ Do you remove in REVERSE order of insertion (most-recent first)?
│   └─ YES -> STACK
│        ├─ Also need O(1) min/max?           -> MIN/MAX STACK
│        ├─ Repeatedly asking "next/prev
│        │   greater/smaller"?                -> MONOTONIC STACK
│        └─ Unwinding recursion iteratively?  -> EXPLICIT STACK (DFS)
│
├─ Do you remove in the SAME order as insertion (oldest first)?
│   └─ YES -> QUEUE
│        ├─ Fixed capacity / bounded memory / streaming? -> CIRCULAR QUEUE (ring buffer)
│        ├─ Level-order graph traversal / shortest path? -> QUEUE (BFS)
│        └─ Sliding-window min/max over a stream?         -> MONOTONIC DEQUE
│
├─ Do you need add/remove at BOTH ends?
│   └─ YES -> DEQUE
│
├─ Does removal order depend on PRIORITY, not arrival?
│   └─ YES -> PRIORITY QUEUE (heap)
│        └─ (Dijkstra/A\*, beam search, event simulation, top-k)
│
└─ Need random access, search, sorted order, or k-th element?
    └─ NONE of the above -> use an ARRAY / HASH MAP / BALANCED TREE / HEAP instead
```

### 8.3 Complexity Trade-offs at a Glance

- **Stack & simple/circular queue & deque:** all core ops **O(1)**. Choose among them purely by *which ends* you touch and whether capacity is bounded.
- **Priority queue:** pay **O(log n)** per insert/remove to gain priority ordering. Only pay this when arrival order isn't the service order.
- **Monotonic structures:** individual ops are amortized O(1); a full pass is **O(n)** — they exist to *kill* an O(n²) inner scan, not to speed up single operations.
- **Array-backed vs. linked:** same asymptotics for stacks/queues, but array-backed wins on **cache locality**; linked/ring wins on **worst-case predictability** and bounded memory.

---

## 9. Practice Problem Set

10 curated problems spanning every pattern in this guide. Difficulty tags: 🟢 Easy · 🟡 Medium · 🔴 Hard. Solve them in roughly this order — each builds on the previous.

| # | Problem | LeetCode | Difficulty | Pattern Tested | Key Structure |
|---|---------|:--------:|:----------:|----------------|---------------|
| 1 | **Valid Parentheses** | LC 20 | 🟢 Easy | Bracket matching (§5.1) | Stack |
| 2 | **Implement Queue using Stacks** | LC 232 | 🟢 Easy | Two-stack queue; amortized analysis (§7.2) | 2 × Stack |
| 3 | **Min Stack** | LC 155 | 🟡 Medium | O(1) extremum with auxiliary stack (§2.4) | Min Stack |
| 4 | **Next Greater Element II** | LC 503 | 🟡 Medium | Monotonic stack, circular via `i % n` (§5.2) | Monotonic Stack |
| 5 | **Daily Temperatures** | LC 739 | 🟡 Medium | NGE storing distance, not value (§5.2) | Monotonic Stack |
| 6 | **Design Circular Queue** | LC 622 | 🟡 Medium | Ring buffer, wrap-around indices (§3.3) | Circular Queue |
| 7 | **Evaluate Reverse Polish Notation** | LC 150 | 🟡 Medium | Postfix evaluation (§5.5) | Stack |
| 8 | **Number of Islands** (BFS/DFS) | LC 200 | 🟡 Medium | Grid BFS (queue) / DFS (stack) (§5.6–5.7) | Queue / Stack |
| 9 | **Sliding Window Maximum** | LC 239 | 🔴 Hard | Monotonic deque (§5.3) | Monotonic Deque |
| 10 | **Largest Rectangle in Histogram** | LC 84 | 🔴 Hard | Monotonic increasing stack + sentinel (§5.4) | Monotonic Stack |

**Stretch goals (bonus):** Trapping Rain Water (LC 42, 🔴), Basic Calculator (LC 224, 🔴), Sum of Subarray Minimums (LC 907, 🟡), Maximal Rectangle (LC 85, 🔴), Remove K Digits (LC 402, 🟡).

💡 **How to practice effectively:** For each problem, (1) state the brute force and its complexity, (2) identify *why* a stack/queue applies (nesting? order? next-greater?), (3) code it, then (4) write the dry-run trace by hand. If you can trace it on paper, you understand it.

---

## 10. Cheat Sheet (one-page summary)

### Core mental model
- **Stack = LIFO** — most recent out first. Nesting, backtracking, undo, DFS.
- **Queue = FIFO** — oldest out first. Buffering, fairness, BFS, streaming.
- **Container choice dictates traversal:** stack → DFS, queue → BFS. *Same algorithm, different discipline.*

### Python quick reference
```python
# STACK  -> just use a list
st = []
st.append(x)        # push   O(1)
st.pop()            # pop    O(1)
st[-1]              # peek   O(1)

# QUEUE  -> collections.deque  (NEVER list.pop(0)!)
from collections import deque
q = deque()
q.append(x)         # enqueue   O(1)
q.popleft()         # dequeue   O(1)
q[0]                # front     O(1)

# DEQUE  -> both ends, O(1)
q.appendleft(x); q.pop()          # ring buffer: deque(maxlen=N)

# PRIORITY QUEUE -> heapq (min-heap)
import heapq
h = []
heapq.heappush(h, (prio, count, item))   # O(log n)
heapq.heappop(h)                          # O(log n), smallest prio first
h[0]                                       # peek-min  O(1)
```

### Complexity table
| Op | Stack | Queue | Deque | Priority Q | Monotonic |
|----|:-----:|:-----:|:-----:|:----------:|:---------:|
| Insert | O(1) | O(1) | O(1) | O(log n) | O(1)* |
| Remove | O(1) | O(1) | O(1) | O(log n) | O(1)* |
| Peek   | O(1) | O(1) | O(1) | O(1) | O(1) |
| Search | O(n) | O(n) | O(n) | O(n) | O(n) |

\* amortized · all use O(n) space for n elements

### Monotonic direction cheat
| Want | Stack order | Pop while |
|------|-------------|-----------|
| Next Greater | decreasing | `top < cur` |
| Next Smaller | increasing | `top > cur` |
| Window Max | decreasing deque | `back < cur` |
| Window Min | increasing deque | `back > cur` |
- **Store indices, not values.** Append a **sentinel** for histogram. Mind `<` vs `<=` for duplicates.

### Pattern → tool trigger words
- "matching / nested / balanced / valid" → **stack**
- "next / previous greater / smaller / warmer" → **monotonic stack**
- "sliding window max / min" → **monotonic deque**
- "level order / shortest path (unweighted)" → **queue (BFS)**
- "explore all paths / backtrack / deep recursion" → **stack (DFS)**
- "by priority / top-k / cheapest first" → **priority queue (heap)**
- "bounded buffer / streaming / most recent N" → **circular queue / `deque(maxlen=N)`**

### AI/ML one-liners
- **Queue** → DataLoader prefetch, batch/task queues (Kafka/SQS), back-pressure.
- **Priority queue** → beam search, A\*/Dijkstra frontier, top-k decoding.
- **Ring buffer** → RL replay buffer, KV-cache sliding window, streaming features.
- **Stack** → autograd backward pass (postfix over the graph), parser/grammar nesting, iterative DFS over deep computation graphs.

---

*End of guide. Every code block above is runnable Python; every algorithm was verified against its stated output. Build from fundamentals → patterns → applications → mastery, and you'll recognize the right structure on sight.*

---

## Related Guides

**Prerequisites:** [Arrays & Strings](/docs/arrays-and-strings) · [Linked Lists](/docs/linked-lists)  
**See also:** [BFS & DFS Traversal](/docs/bfs-dfs) · [Trees & Binary Search Trees](/docs/trees-and-bst)

*Section: [Core DSA](/docs/category/02-core-dsa) · [All guides](/)*
