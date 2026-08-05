---
title: Linked Lists
slug: /linked-lists
sidebar_position: 4
sidebar_label: Linked Lists
description: >-
  Pointer-based sequential structures: mental models, in-place manipulation, and the fast/slow pointer patterns.
tags:
  - linked-lists
  - pointers
  - fundamentals
difficulty: beginner
reading_time: 21
prerequisites:
  - title: Arrays & Strings
    to: /docs/arrays-and-strings
pagination_prev: foundation/hash-maps-and-sets
pagination_next: foundation/recursion-and-call-stack
path_step: 4
---

# Linked Lists: The Ultimate Reference Guide

*A self-contained reference — from first principles to expert-level mastery, with concrete AI/ML/LLM connections.*

---

## 1. What is a Linked List?

### 1.1 Definition

A **linked list** is a linear data structure in which elements (called **nodes**) are stored in **non-contiguous memory** and connected by **pointers/references**. Each node holds two things: a **payload** (the data) and at least one **reference** to another node.

Formally:

- A **singly linked list (SLL)** is an ordered sequence of nodes where each node stores `data` and a single reference `next` pointing to its successor. The last node's `next` is `null` (the *null terminator*).
- A **doubly linked list (DLL)** is an ordered sequence of nodes where each node stores `data`, a reference `next` to its successor, and a reference `prev` to its predecessor. The first node's `prev` and the last node's `next` are both `null`.

The defining contrast with an **array**: an array guarantees *O(1) random access* by index because elements sit in contiguous memory at computable addresses. A linked list gives that up in exchange for *O(1) structural insertion/deletion* once you hold a reference to the position — because no elements need shifting, you just re-wire pointers.

> **Key mental model:** An array is a row of numbered lockers you can jump to instantly. A linked list is a chain where each link only knows how to reach the *next* link — you must walk the chain to find anything.

### 1.2 Core Analogy

```
Analogy — Singly Linked List: a SCAVENGER HUNT.
  Each clue (node) tells you only where the NEXT clue is.
  You hold the first clue (the HEAD). You cannot go back.
  To reach clue #7 you must physically walk clues 1 -> 2 -> ... -> 7.
  The final clue says "the hunt ends here" (next = null).

Analogy — Doubly Linked List: a TWO-WAY STREET (or a train with couplings).
  Each node knows its neighbor AHEAD (next) AND BEHIND (prev).
  You can walk forward or reverse from any point.
  Detaching one train carriage only requires re-coupling its two
  neighbors to each other — you never move the rest of the train.
```

A second useful framing: a singly linked list is a **one-directional conga line** — you can only tap the shoulder in front of you. A doubly linked list is a **hand-holding chain** — let go of one person and the two people beside them can immediately join hands.

### 1.3 Visual Structure (ASCII diagram)

**Singly Linked List:**

```
head
 │
 ▼
┌──────┬──────┐   ┌──────┬──────┐   ┌──────┬──────┐
│ data │ next │──▶│ data │ next │──▶│ data │ next │──▶ null
│  10  │      │   │  20  │      │   │  30  │      │
└──────┴──────┘   └──────┴──────┘   └──────┴──────┘
   node A            node B            node C (tail)
```

**Doubly Linked List:**

```
        head                                            tail
         │                                               │
         ▼                                               ▼
       ┌──────┬──────┬──────┐   ┌──────┬──────┬──────┐   ┌──────┬──────┬──────┐
null ◀─│ prev │ data │ next │◀─▶│ prev │ data │ next │◀─▶│ prev │ data │ next │─▶ null
       │      │  10  │      │   │      │  20  │      │   │      │  30  │      │
       └──────┴──────┴──────┘   └──────┴──────┴──────┘   └──────┴──────┴──────┘
```

---

## 2. Singly Linked List

### 2.1 Structure & Components

| Component | Role |
|---|---|
| **Node** | The unit of storage: holds `data` + `next` reference. |
| **`data`** | The payload — any value (int, object, another structure). |
| **`next`** | Reference to the successor node; `None`/`null` marks the end. |
| **`head`** | Reference to the first node. This is your *only* handle on the list — lose it and the whole list is garbage-collected/leaked. |
| **`tail`** *(optional)* | Reference to the last node. Not required, but caching it turns tail-insertion from O(n) into O(1). |
| **Null terminator** | The `None` in the last node's `next`. It is the *stopping condition* for every traversal — the single most common source of bugs when forgotten. |

```python
# Node definition — Singly Linked List
class Node:
    def __init__(self, data):
        self.data = data      # Payload
        self.next = None      # Pointer to next node (None = end of list)


class SinglyLinkedList:
    def __init__(self):
        self.head = None      # Empty list: head points to nothing
        self.tail = None      # Cached tail -> O(1) append
        self.size = 0         # Cached length -> O(1) len()

    def __len__(self):
        return self.size

    def __iter__(self):
        cur = self.head
        while cur is not None:
            yield cur.data
            cur = cur.next
```

### 2.2 Operations

For every operation below: **explanation → pseudocode → complexity (with justification) → runnable code.**

---

#### 2.2.1 Traversal

**Plain English:** Start at the head and follow `next` pointers until you hit `null`, visiting each node once.

**Pseudocode:**
```
TRAVERSE(head):
    cur ← head
    while cur ≠ null:
        visit(cur.data)
        cur ← cur.next
```

**Complexity:** Time **O(n)** — every node is visited exactly once. Space **O(1)** — only one pointer (`cur`) is used.

```python
def traverse(self):
    """Return a list of all values, front to back."""
    out, cur = [], self.head
    while cur is not None:          # stop at the null terminator
        out.append(cur.data)
        cur = cur.next
    return out
```

---

#### 2.2.2 Insertion at Head (prepend)

**Plain English:** Make a new node point to the current head, then move `head` to the new node.

**Pseudocode:**
```
INSERT_HEAD(value):
    node ← new Node(value)
    node.next ← head
    head ← node
    if tail == null: tail ← node   # list was empty
```

**Complexity:** Time **O(1)** — a fixed number of pointer writes regardless of list size. Space **O(1)**.

```python
def insert_head(self, value):
    node = Node(value)
    node.next = self.head          # new node points to old first node
    self.head = node               # head now points to new node
    if self.tail is None:          # edge case: was empty
        self.tail = node
    self.size += 1
```

---

#### 2.2.3 Insertion at Tail (append)

**Plain English:** Attach the new node after the last node and update the tail.

**Pseudocode:**
```
INSERT_TAIL(value):
    node ← new Node(value)
    if head == null:               # empty list
        head ← node; tail ← node
    else:
        tail.next ← node
        tail ← node
```

**Complexity:** With a cached `tail`, Time **O(1)**. *Without* a tail pointer you must walk to the end first — **O(n)**. Space **O(1)**. This is precisely why production linked lists cache the tail.

```python
def insert_tail(self, value):
    node = Node(value)
    if self.head is None:          # empty list
        self.head = self.tail = node
    else:
        self.tail.next = node      # old tail points to new node
        self.tail = node           # new node is now the tail
    self.size += 1
```

---

#### 2.2.4 Insertion in the Middle (after the k-th node)

**Plain English:** Walk to position `k`, then splice: new node's `next` becomes the current node's `next`, and the current node's `next` becomes the new node.

**Pseudocode:**
```
INSERT_AFTER(k, value):
    cur ← head; i ← 0
    while i < k and cur ≠ null:    # walk to the k-th node
        cur ← cur.next; i ← i+1
    if cur == null: error
    node ← new Node(value)
    node.next ← cur.next
    cur.next ← node
```

**Complexity:** Time **O(n)** — dominated by the *walk* to position `k` (up to n steps). The splice itself is O(1). Space **O(1)**.

```python
def insert_after(self, k, value):
    """Insert after the node at 0-based index k."""
    if k < 0 or k >= self.size:
        raise IndexError("position out of range")
    cur = self.head
    for _ in range(k):             # O(n) walk to the k-th node
        cur = cur.next
    node = Node(value)
    node.next = cur.next           # splice: point past current
    cur.next = node                # current now points to new node
    if node.next is None:          # inserted at end -> update tail
        self.tail = node
    self.size += 1
```

---

#### 2.2.5 Deletion by Value

**Plain English:** Find the first node whose `data` matches, then bypass it by pointing its predecessor at its successor. In a singly list you need the **predecessor**, so track a `prev` pointer while walking.

**Pseudocode:**
```
DELETE_VALUE(target):
    dummy → head                    # sentinel simplifies head deletion
    prev ← dummy; cur ← head
    while cur ≠ null:
        if cur.data == target:
            prev.next ← cur.next    # unlink cur
            return true
        prev ← cur; cur ← cur.next
    return false
    head ← dummy.next
```

**Complexity:** Time **O(n)** — may scan the whole list to find the value. Space **O(1)**.

```python
def delete_value(self, target):
    """Delete the first node equal to target. Returns True if removed."""
    prev, cur = None, self.head
    while cur is not None:
        if cur.data == target:
            if prev is None:              # deleting the head
                self.head = cur.next
            else:
                prev.next = cur.next      # unlink cur
            if cur is self.tail:          # deleted the tail
                self.tail = prev
            self.size -= 1
            return True
        prev, cur = cur, cur.next
    return False
```

---

#### 2.2.6 Deletion by Position

**Plain English:** Walk to index `k`, keeping the predecessor, then unlink.

**Pseudocode:**
```
DELETE_AT(k):
    if k == 0: head ← head.next; return
    prev ← head
    repeat k-1 times: prev ← prev.next
    prev.next ← prev.next.next
```

**Complexity:** Time **O(n)** (walk to `k`). Space **O(1)**. Note: even deleting the *tail* is O(n) in a singly list because you must reach the predecessor.

```python
def delete_at(self, k):
    if k < 0 or k >= self.size:
        raise IndexError("position out of range")
    if k == 0:                            # delete head
        self.head = self.head.next
        if self.head is None:
            self.tail = None
        self.size -= 1
        return
    prev = self.head
    for _ in range(k - 1):                # stop at predecessor
        prev = prev.next
    prev.next = prev.next.next            # unlink the k-th node
    if prev.next is None:                 # deleted the tail
        self.tail = prev
    self.size -= 1
```

---

#### 2.2.7 Search / Lookup

**Plain English:** Traverse comparing each node's `data`; return the index (or the node) on match.

**Pseudocode:**
```
SEARCH(target):
    cur ← head; i ← 0
    while cur ≠ null:
        if cur.data == target: return i
        cur ← cur.next; i ← i+1
    return -1
```

**Complexity:** Time **O(n)** worst/average — there is *no random access*, so lookup is inherently linear. Space **O(1)**. (This is a core weakness vs. arrays/hash maps.)

```python
def search(self, target):
    """Return 0-based index of first match, or -1."""
    cur, i = self.head, 0
    while cur is not None:
        if cur.data == target:
            return i
        cur, i = cur.next, i + 1
    return -1
```

---

#### 2.2.8 Reversal

**Plain English:** Walk the list once, flipping each `next` pointer to point backward. Use three pointers: `prev`, `cur`, `nxt`.

**Pseudocode:**
```
REVERSE(head):
    prev ← null; cur ← head
    while cur ≠ null:
        nxt ← cur.next     # save successor before overwriting
        cur.next ← prev    # flip the link
        prev ← cur         # advance prev
        cur ← nxt          # advance cur
    head ← prev            # prev is the new head
```

**Complexity:** Time **O(n)** — one pass. Space **O(1)** — in-place with three pointers. (A recursive version is also O(n) time but O(n) space due to the call stack — the iterative version is preferred.)

```python
def reverse(self):
    """Reverse the list in place, O(1) extra space."""
    prev, cur = None, self.head
    self.tail = self.head          # old head becomes new tail
    while cur is not None:
        nxt = cur.next             # 1. remember the next node
        cur.next = prev            # 2. flip the pointer backward
        prev = cur                 # 3. move prev forward
        cur = nxt                  # 4. move cur forward
    self.head = prev               # prev landed on the old last node
```

---

#### 2.2.9 Cycle Detection — Floyd's Tortoise & Hare

**Plain English:** Run two pointers — `slow` moves 1 step, `fast` moves 2. If there's a cycle, `fast` eventually laps `slow` and they meet. If `fast` reaches `null`, there's no cycle.

**Pseudocode:**
```
HAS_CYCLE(head):
    slow ← head; fast ← head
    while fast ≠ null and fast.next ≠ null:
        slow ← slow.next
        fast ← fast.next.next
        if slow == fast: return true
    return false
```

**Complexity:** Time **O(n)** — after entering the cycle, the gap closes by one node per step, so they meet within one loop length. Space **O(1)** — the killer feature vs. the naive "store visited nodes in a hash set" (O(n) space).

```python
def has_cycle(self):
    slow = fast = self.head
    while fast is not None and fast.next is not None:
        slow = slow.next               # tortoise: +1
        fast = fast.next.next          # hare: +2
        if slow is fast:               # identity check, not ==
            return True
    return False
```

*(Full explanation and cycle-start recovery in §5.1.)*

---

#### 2.2.10 Finding the Middle Node (Fast/Slow pointer)

**Plain English:** Same two-pointer trick without a cycle: when `fast` reaches the end, `slow` is at the middle.

**Pseudocode:**
```
FIND_MIDDLE(head):
    slow ← head; fast ← head
    while fast ≠ null and fast.next ≠ null:
        slow ← slow.next
        fast ← fast.next.next
    return slow
```

**Complexity:** Time **O(n)** (one pass, no need to count length first). Space **O(1)**.

```python
def find_middle(self):
    """Return the middle node's data. For even length, returns the
    second of the two middle nodes (change loop to bias to first)."""
    slow = fast = self.head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow.data if slow else None
```

### 2.3 Edge Cases (Singly)

| Case | What breaks if ignored | Correct handling |
|---|---|---|
| **Empty list** (`head is None`) | Dereferencing `head.next` → `AttributeError`/null-pointer crash. | Guard every op with an `if head is None` check. |
| **Single node** | Deleting it must set both `head` *and* `tail` to `None`. | Update tail whenever `head` becomes `None`. |
| **Head insertion/deletion** | Losing the old head leaks the list; forgetting to move `head` corrupts it. | Use a **dummy/sentinel head** to unify head and non-head cases. |
| **Tail insertion** | O(n) if no tail cache; forgetting to update `tail` after delete corrupts appends. | Always update `tail` on head/tail structural changes. |
| **Deleting the tail** | Still O(n) in SLL (need predecessor); forgetting to null the new tail's `next`. | Track `prev`; set `tail = prev`. |
| **Off-by-one on position** | Walking `k` vs `k-1` steps inserts/deletes at the wrong spot. | Insert *after k* walks k steps; delete *at k* walks to the predecessor (k-1). |
| **Accidental cycle** | Traversal loops forever. | Never point a node's `next` at an earlier node unless intentional; test with Floyd's. |

---

## 3. Doubly Linked List

### 3.1 Structure & Components

A DLL adds a `prev` pointer to every node. This makes **backward traversal** and **O(1) deletion of a known node** possible, at the cost of one extra pointer per node (higher memory) and more pointer updates per operation (more bookkeeping).

```python
# Node definition — Doubly Linked List
class DNode:
    def __init__(self, data):
        self.data = data
        self.prev = None      # Pointer to previous node
        self.next = None      # Pointer to next node


class DoublyLinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def __len__(self):
        return self.size

    def __iter__(self):                 # forward
        cur = self.head
        while cur is not None:
            yield cur.data
            cur = cur.next

    def iter_reverse(self):             # backward — DLL's superpower
        cur = self.tail
        while cur is not None:
            yield cur.data
            cur = cur.prev
```

> **Sentinel-node variant (production tip):** Many robust DLLs use two dummy sentinels — a permanent `head` and `tail` guard that never hold data. Every real node lives *between* them, so there are **no null-pointer edge cases at all** — insertion and deletion become fully uniform. This is the pattern used inside CPython's `OrderedDict` and most LRU-cache implementations. Shown in §5.3.

### 3.2 Operations

Only the operations that differ meaningfully from the SLL are detailed; traversal/search are identical in complexity (O(n)) but gain a backward variant.

---

#### 3.2.1 Bidirectional Traversal

**Plain English:** Forward via `next` from `head`; backward via `prev` from `tail`.

**Complexity:** Time **O(n)** each direction; Space **O(1)**. (See `iter_reverse` above — impossible in a singly list without O(n) extra space or reversing.)

---

#### 3.2.2 Insertion Before / After a Known Node

**Plain English:** Given a node reference, rewire up to four pointers to splice a new node in. Because you have `prev`, you don't need to walk from the head to find the predecessor.

**Pseudocode (insert after node `p`):**
```
INSERT_AFTER(p, value):
    node ← new DNode(value)
    node.prev ← p
    node.next ← p.next
    if p.next ≠ null: p.next.prev ← node
    else: tail ← node
    p.next ← node
```

**Complexity:** Given the node reference, Time **O(1)** — a constant number of pointer writes, no walking. Space **O(1)**. (Finding the node first is still O(n) if you only have a value.)

```python
def insert_after(self, p, value):
    """Insert a new node after existing node p. O(1) given p."""
    node = DNode(value)
    node.prev = p
    node.next = p.next
    if p.next is not None:
        p.next.prev = node        # old successor points back to new
    else:
        self.tail = node          # p was the tail
    p.next = node
    self.size += 1
    return node

def insert_before(self, p, value):
    """Insert a new node before existing node p. O(1) given p."""
    node = DNode(value)
    node.next = p
    node.prev = p.prev
    if p.prev is not None:
        p.prev.next = node
    else:
        self.head = node          # p was the head
    p.prev = node
    self.size += 1
    return node

def append(self, value):
    if self.tail is None:
        self.head = self.tail = DNode(value)
        self.size += 1
        return self.tail
    return self.insert_after(self.tail, value)
```

---

#### 3.2.3 Deletion (efficient O(1) with a node reference)

**Plain English:** This is the DLL's headline advantage. Given a node, you already know both neighbors via `prev`/`next`, so you unlink in constant time — no scan for a predecessor.

**Pseudocode:**
```
DELETE(node):
    if node.prev ≠ null: node.prev.next ← node.next
    else: head ← node.next
    if node.next ≠ null: node.next.prev ← node.prev
    else: tail ← node.prev
```

**Complexity:** Given the node reference, Time **O(1)**; Space **O(1)**. Contrast with SLL delete-by-node, which is O(n) because you must find the predecessor. *This O(1)-removal-by-reference is exactly why the LRU cache uses a DLL.*

```python
def delete_node(self, node):
    """Unlink a known node in O(1)."""
    if node.prev is not None:
        node.prev.next = node.next
    else:                                # node was the head
        self.head = node.next
    if node.next is not None:
        node.next.prev = node.prev
    else:                                # node was the tail
        self.tail = node.prev
    node.prev = node.next = None         # help GC / avoid dangling refs
    self.size -= 1
```

---

#### 3.2.4 Convert Singly → Doubly

**Plain English:** Walk the singly list once, building doubly nodes and wiring `prev` to the node you just created.

**Pseudocode:**
```
SLL_TO_DLL(sll_head):
    dll ← empty DLL; prev ← null
    cur ← sll_head
    while cur ≠ null:
        d ← new DNode(cur.data)
        d.prev ← prev
        if prev ≠ null: prev.next ← d else dll.head ← d
        prev ← d
        cur ← cur.next
    dll.tail ← prev
```

**Complexity:** Time **O(n)**, Space **O(n)** (a new node per element).

```python
def from_singly(sll):
    """Build a DoublyLinkedList from a SinglyLinkedList."""
    dll = DoublyLinkedList()
    for value in sll:                    # uses SLL.__iter__ -> O(n)
        dll.append(value)                # each append is O(1)
    return dll
```

### 3.3 Edge Cases (Doubly)

| Case | Pitfall | Fix |
|---|---|---|
| **Empty list** | Inserting must set both `head` and `tail`. | `if tail is None:` handle both. |
| **Single node** | Deleting sets both `head`/`tail` to `None`. | Both null-branches fire together. |
| **Insert at head/tail** | Forgetting to update `head`/`tail` when `prev`/`next` is null. | The `else` branches in insert/delete update the ends. |
| **Deleting a node you already unlinked** | Double-free-style corruption. | Null out `node.prev`/`node.next` after delete. |
| **Dangling `prev`** | Deleting via `next` only (SLL habit) leaves stale `prev`. | Always fix **both** neighbors. |
| **Circular DLL** | `next`/`prev` wrap around; naive traversal loops forever. | Use a sentinel and stop when you return to it. |

---

## 4. Comparison Table

| Feature | Array / Dynamic Array | Singly Linked List | Doubly Linked List | Stack / Queue (abstract) |
|---|---|---|---|---|
| **Memory layout** | Contiguous | Scattered + 1 ptr/node | Scattered + 2 ptr/node | Depends on backing store |
| **Random access `a[i]`** | **O(1)** | O(n) | O(n) | N/A (not the point) |
| **Search (unsorted)** | O(n) | O(n) | O(n) | N/A |
| **Insert at head** | O(n) (shift all) | **O(1)** | **O(1)** | Stack push **O(1)** |
| **Insert at tail** | O(1) amortized* | O(1) with tail cache | O(1) with tail cache | Queue enqueue **O(1)** |
| **Insert in middle (have ref)** | O(n) (shift) | O(1) splice** | **O(1)** | N/A |
| **Delete at head** | O(n) (shift) | **O(1)** | **O(1)** | Stack/Queue pop **O(1)** |
| **Delete known node** | O(n) (shift) | **O(n)** (find prev) | **O(1)** | N/A |
| **Backward traversal** | O(n) trivially (index--) | O(n) + extra space | **O(n) native** | N/A |
| **Memory overhead** | Low (may over-allocate) | 1 pointer/node | 2 pointers/node | — |
| **Cache locality** | **Excellent** | Poor | Poor | — |
| **Resizing cost** | O(n) occasional realloc | None | None | — |

\* Amortized: dynamic arrays occasionally double capacity, an O(n) copy spread over many O(1) appends.
\** "Have ref" for SLL means you hold the *predecessor*; if you only hold the node itself, deletion is O(n).

**Bottom line:** Choose **arrays** when you need indexed access and iterate a lot (cache locality dominates real-world speed). Choose **linked lists** when you do many insertions/deletions at known positions and rarely random-access — and specifically a **DLL** when you must remove arbitrary known nodes in O(1) or traverse both ways.

---

## 5. Advanced Algorithms

### 5.1 Cycle Detection — Floyd's Tortoise & Hare (with cycle start)

**Why it works:** If a cycle of length `L` exists, once both pointers are inside it, `fast` gains one node on `slow` per iteration. The gap (at most `L-1`) closes to zero in ≤ L steps, so they *must* meet — in O(n) time and O(1) space.

**Finding the cycle's start (bonus):** After they meet, reset one pointer to `head` and advance both by 1. The distance from head to the cycle entry equals the distance from the meeting point to the entry (a classic modular-arithmetic result), so they meet exactly at the cycle's start.

```python
def detect_cycle_start(head):
    """Return the node where the cycle begins, or None."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:                 # phase 1: meeting point found
            break
    else:
        return None                      # loop exited -> no cycle
    slow = head                          # phase 2: find entry
    while slow is not fast:
        slow = slow.next
        fast = fast.next                 # now both move at speed 1
    return slow
```

**Complexity:** Time **O(n)**, Space **O(1)**. The hash-set alternative is also O(n) time but O(n) space — Floyd's wins on memory, which matters for huge lists / embedded systems.

---

### 5.2 Merge Sort on a Linked List

**Why merge sort (not quicksort/heapsort)?** Linked lists have no random access, so array-friendly sorts (quicksort's pivot partitioning, heapsort's index math) degrade. Merge sort only needs **sequential access** and **O(1) splicing** — a perfect fit. It also needs **no extra array**: you re-link existing nodes, giving O(1) auxiliary space beyond recursion.

**Algorithm:** Split via fast/slow (find middle), recursively sort halves, merge two sorted lists by splicing.

```python
def merge_sort(head):
    """Sort a singly linked list of Node objects. Returns new head."""
    if head is None or head.next is None:        # 0 or 1 node -> sorted
        return head

    # 1. Split into two halves using fast/slow pointers
    slow, fast = head, head.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    mid = slow.next
    slow.next = None                             # cut the list in two

    # 2. Recursively sort each half
    left = merge_sort(head)
    right = merge_sort(mid)

    # 3. Merge the two sorted halves
    return _merge(left, right)


def _merge(a, b):
    dummy = Node(0)                              # sentinel simplifies head
    tail = dummy
    while a and b:
        if a.data <= b.data:                     # <= keeps it stable
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a else b                    # attach the remainder
    return dummy.next
```

**Complexity:** Time **O(n log n)** (log n split levels × O(n) merge each). Space **O(log n)** for the recursion stack (O(1) if written iteratively/bottom-up) — notably **no O(n) auxiliary array**, unlike array merge sort. Stable.

---

### 5.3 LRU Cache using a Doubly Linked List + Hash Map

**The problem:** An LRU (Least Recently Used) cache must support `get` and `put` in **O(1)**, evicting the least-recently-used item when full. This is the canonical "why DLL exists" interview problem — and it powers real systems (CPU caches, database buffer pools, CDN edge caches, `functools.lru_cache`).

**The design:** Combine two structures:
- A **hash map** `key -> node` for O(1) lookup.
- A **doubly linked list** ordered by recency (most-recent at the front, least-recent at the back). On access, move the node to the front in **O(1)** (possible *only* because DLL removes a known node in O(1)). On overflow, evict the back node in O(1).

Two **sentinel nodes** (`head`/`tail` guards) eliminate all null edge cases.

```python
class LRUNode:
    __slots__ = ("key", "value", "prev", "next")
    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.map = {}                            # key -> LRUNode
        # sentinels: head <-> tail, no real data, zero edge cases
        self.head, self.tail = LRUNode(), LRUNode()
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node):                     # O(1) unlink known node
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_front(self, node):                  # O(1) insert after head
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)                       # move to front = "just used"
        self._add_front(node)
        return node.value

    def put(self, key, value):
        if key in self.map:                      # update existing
            self._remove(self.map[key])
        node = LRUNode(key, value)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.cap:             # evict least-recently-used
            lru = self.tail.prev                 # node just before tail sentinel
            self._remove(lru)
            del self.map[lru.key]
```

**Complexity:** `get` and `put` are both **O(1)**. Space **O(capacity)**. The DLL provides O(1) recency reordering; the hash map provides O(1) lookup — neither alone suffices.

---

## 6. Linked Lists in AI / ML / LLM

### 6.1 Use Cases in ML Pipelines

- **Streaming / online-learning data feeds.** When training data arrives as an unbounded stream (clickstream, sensor telemetry, log events), a linked list (often a **circular buffer / ring** implemented with linked nodes) lets you append incoming samples in O(1) and drop old ones from the front in O(1) without shifting a giant array. This is the backbone of **sliding-window feature computation** and **replay buffers** — though performance-critical RL replay buffers often use a fixed-size array ring for cache locality, the *logical* structure is a FIFO linked queue.
- **Pipeline stage graphs / computation chains.** DAG-based ML pipelines (scikit-learn `Pipeline`, Spark stages, TFX) chain transformers where each stage references the next; inserting or reordering a preprocessing step is a pointer rewire, not a rebuild. `nn.Sequential` in PyTorch is conceptually a linked chain of layers where each forward call hands its output to the next.
- **Memory-efficient batching of variable-length records.** Tokenized text records have wildly different lengths; storing them as linked chunks avoids the padding waste and reallocation churn of a rectangular array when records are appended/removed dynamically.

### 6.2 LLM Context Window & Token Chains

- **KV-cache as an append-only chain.** During autoregressive decoding, an LLM caches the Key/Value tensors of every past token. Each newly generated token *appends* its K/V to the cache and attends over all prior entries. This is fundamentally an **append-only linked sequence**: O(1) append per step, ordered, traversed front-to-back. Real implementations use contiguous tensor buffers for GPU efficiency, but frameworks like **vLLM's PagedAttention** manage the cache as a **linked list of fixed-size "pages" (blocks)** — exactly the linked-list trade-off: give up contiguity to get O(1) allocation/free of memory blocks and eliminate fragmentation as sequences grow and finish.
- **Conversation / context management.** A chat context is an ordered chain of turns; sliding-window context (drop the oldest turn when the window overflows) is a **queue** — enqueue new turn at the tail, dequeue oldest at the head, both O(1). This is directly the linked-list-backed FIFO.
- **Beam search hypotheses.** Each beam is a chain of tokens; extending a hypothesis appends a node, and back-tracking to reconstruct a sequence walks `prev` pointers — a natural fit for a linked structure where many beams **share a common prefix** (a *trie*/linked prefix tree) instead of copying whole sequences.

### 6.3 Graph Neural Network Adjacency

- **Adjacency lists = arrays of linked lists.** GNNs operate on graphs stored as **adjacency lists**: for each node, a list of its neighbors. For sparse graphs (the norm — social networks, molecules, knowledge graphs), adjacency lists use O(V + E) memory versus O(V²) for an adjacency matrix. Message passing traverses each node's neighbor list to aggregate features — a linked-list traversal per node.
- **Dynamic graphs.** In temporal/streaming GNNs, edges appear and disappear over time; a linked adjacency list supports O(1) edge insertion/deletion (given the node) without rebuilding a matrix — critical for evolving fraud-detection or recommendation graphs.
- **Sparse tensor formats.** CSR/CSC sparse matrix formats that underlie efficient GNN kernels are the array-packed cousins of adjacency lists — same "store only what exists, follow indices to neighbors" philosophy.

---

## 7. Expert Takeaways & Common Pitfalls

**Design insights the textbooks under-emphasize:**

1. **Cache locality usually beats Big-O in practice.** A "slower" O(n)-insert dynamic array frequently outperforms an O(1)-insert linked list for real workloads because contiguous memory is prefetched and pointer-chasing causes cache misses. Reach for a linked list when you *actually* insert/delete in the middle often — not by reflex. (Bjarne Stroustrup's well-known benchmark: `std::vector` beats `std::list` even for random insertions until n is very large.)
2. **The sentinel/dummy-node pattern eliminates edge cases.** A dummy head (SLL) or head+tail guards (DLL) removes the "is this the first/last node?" branching that causes most linked-list bugs. Use it in every non-trivial implementation.
3. **Cache the tail (and size).** Without a tail pointer, append is O(n) and `len()` is O(n). One extra field turns both into O(1).
4. **Prefer iterative over recursive** for traversal/reversal on long lists — recursion risks stack overflow (Python's default limit ~1000 frames) and uses O(n) stack space.
5. **Identity vs. equality.** In cycle detection and node deletion, compare nodes with `is` (identity), not `==` (value) — two different nodes can hold equal data.

**Common pitfalls (and the fix):**

| Pitfall | Symptom | Fix |
|---|---|---|
| Forgetting the null terminator check | Crash / infinite loop | `while cur is not None` on every traversal |
| Losing the `next` reference before rewiring | Truncated / corrupted list | Save `nxt = cur.next` *before* overwriting `cur.next` |
| Updating only one neighbor in a DLL | Dangling `prev`, backward traversal breaks | Always fix **both** `prev` and `next` |
| Not updating `head`/`tail` on edge deletions | Appends corrupt, `len` wrong | Update ends whenever the first/last node changes |
| Memory leaks / dangling pointers (C/C++) | Leaks, use-after-free | `free`/null the node after unlinking; in Python, drop refs to help GC |
| Off-by-one in position ops | Insert/delete at wrong index | Insert-after-k walks k; delete-at-k walks to k−1 |

**Optimization tips:** use `__slots__` on node classes to cut per-node memory (no `__dict__`); pool/reuse node objects in hot paths to avoid allocation churn; consider an **unrolled linked list** (each node stores a small array of elements) to reclaim cache locality while keeping O(1) structural edits; use a **circular linked list** for round-robin schedulers and ring buffers.

---

## 8. Quick Reference Cheat Sheet

**Operation complexities (n = length):**

| Operation | Singly LL | Doubly LL | Array | Notes |
|---|---|---|---|---|
| Access by index | O(n) | O(n) | **O(1)** | LL has no random access |
| Search (unsorted) | O(n) | O(n) | O(n) | — |
| Insert at head | **O(1)** | **O(1)** | O(n) | — |
| Insert at tail | O(1)† | O(1)† | O(1)‡ | † with tail cache; ‡ amortized |
| Insert after known node | **O(1)** | **O(1)** | O(n) | SLL needs the node itself |
| Delete at head | **O(1)** | **O(1)** | O(n) | — |
| Delete known node | O(n) | **O(1)** | O(n) | DLL's headline win |
| Reverse | O(n) / O(1) sp | O(n) / O(1) sp | O(n) | in place |
| Cycle detection (Floyd) | O(n) / O(1) sp | O(n) / O(1) sp | — | beats hash-set O(n) space |
| Find middle | O(n) / O(1) sp | O(n) / O(1) sp | O(1) | fast/slow pointers |
| Merge sort | O(n log n) / O(log n) sp | same | O(n log n)/O(n) sp | LL needs no aux array |
| Memory per node | 1 pointer | 2 pointers | 0 (contiguous) | — |

**Decision guide — when to use what:**

<decision question="Which structure fits my access pattern?">
<option description="Frequent random access by index, heavy iteration, small/medium size — cache locality wins.">Array / Dynamic Array</option>
<option description="Frequent insert/delete at the front or at known positions, rarely random-access, one-directional.">Singly Linked List</option>
<option description="Must remove arbitrary known nodes in O(1) or traverse both directions (LRU cache, editors, playlists).">Doubly Linked List</option>
<option description="Strict LIFO (stack) or FIFO (queue) access — sliding context windows, replay buffers, BFS.">Stack / Queue (LL-backed)</option>
</decision>

**One-line rules of thumb:**
- Need `a[i]` fast? → **Array.**
- Insert/delete a lot at ends or known nodes? → **Linked List.**
- Remove arbitrary known nodes in O(1) or go backward? → **Doubly.**
- Building an LRU cache? → **DLL + hash map.**
- Detecting cycles / finding middle with O(1) memory? → **Fast/slow pointers.**
- Sorting a list without an aux array? → **Merge sort.**

---

*End of guide. Every code block above is runnable Python; C++ notes are included inline where the pointer/memory semantics add insight (sentinel patterns, manual `free`, `std::list` vs `std::vector` locality).*

---

## Related Guides

**Prerequisites:** [Arrays & Strings](/docs/arrays-and-strings)  
**See also:** [Two Pointers](/docs/two-pointers) · [Stacks & Queues](/docs/stacks-and-queues)

*Section: [Foundation](/docs/category/01-foundation) · [All guides](/)*
