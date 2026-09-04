---
title: Matrix Ops, Attention O(n²) & Sparse Formats
slug: /matrix-ops-attention-sparse
sidebar_position: 4
sidebar_label: Matrix Ops, Attention O(n²) & Sparse Formats
description: >-
  Matrix multiplication complexity, attention's O(n²) wall, and the sparse formats that scale it.
tags:
  - matrix
  - attention
  - sparse
  - transformers
difficulty: advanced
reading_time: 38
prerequisites:
  - title: Big-O Notation & Complexity Analysis
    to: /docs/big-o-complexity
  - title: Python Internals & NumPy Memory
    to: /docs/python-internals-numpy-memory
pagination_prev: domain-specific-dsa/tokenization
pagination_next: domain-specific-dsa/beam-search
path_step: 33
---

# The Definitive Reference: Matrix Operations, Complexity, Attention's $O(n^2)$ Wall, and Sparse Formats

*A single-source technical reference for Data Scientists, ML Engineers, AI researchers, and LLM practitioners.*

---

## Table of Contents

1. [Matrix Operations](#1-matrix-operations)
   - [1.1 Types of Operations](#11-types-of-operations)
     - [1.1.1 Matrix Multiplication (Naive vs. Optimized)](#111-matrix-multiplication-naive-vs-optimized)
     - [1.1.2 Transpose](#112-transpose)
     - [1.1.3 Inverse](#113-inverse)
     - [1.1.4 Decompositions: LU, QR, SVD](#114-decompositions-lu-qr-svd)
     - [1.1.5 Element-wise (Hadamard) vs. Dot vs. Outer Product](#115-element-wise-hadamard-vs-dot-vs-outer-product)
     - [1.1.6 Broadcasting Rules and Complexity Implications](#116-broadcasting-rules-and-complexity-implications)
   - [1.2 Complexity Analysis of Matrix Ops](#12-complexity-analysis-of-matrix-ops)
     - [1.2.1 Naive MatMul: $O(n^3)$](#121-naive-matmul-on3)
     - [1.2.2 Strassen's Algorithm: $O(n^{2.807})$](#122-strassens-algorithm-on2807)
     - [1.2.3 BLAS / cuBLAS Optimizations](#123-blas--cublas-optimizations)
     - [1.2.4 Memory Bandwidth & the Roofline Model](#124-memory-bandwidth--the-roofline-model)
   - [1.3 Operation Complexity Summary Table](#13-operation-complexity-summary-table)
2. [Why Attention is $O(n^2)$](#2-why-attention-is-on2)
   - [2.1 Mathematical Derivation](#21-mathematical-derivation)
   - [2.2 Intuitive Explanation](#22-intuitive-explanation)
   - [2.3 Practical Impact on Long-Context LLMs](#23-practical-impact-on-long-context-llms)
   - [2.4 Solutions & Variants](#24-solutions--variants)
3. [Sparse Matrix Formats](#3-sparse-matrix-formats)
   - [3.1 Format Descriptions](#31-format-descriptions)
     - [3.1.1 Dense vs. Sparse — When Sparsity Matters](#311-dense-vs-sparse--when-sparsity-matters)
     - [3.1.2 COO (Coordinate Format)](#312-coo-coordinate-format)
     - [3.1.3 CSR (Compressed Sparse Row)](#313-csr-compressed-sparse-row)
     - [3.1.4 CSC (Compressed Sparse Column)](#314-csc-compressed-sparse-column)
     - [3.1.5 Block-Sparse](#315-block-sparse)
   - [3.2 Comparison Table](#32-comparison-table)
   - [3.3 Practical Usage Guide](#33-practical-usage-guide)
4. [Synthesis & Connections](#4-synthesis--connections)
5. [Common Misconceptions](#5-common-misconceptions)
6. [Quick-Reference Cheat Sheet](#6-quick-reference-cheat-sheet)

---

## 1. Matrix Operations

Matrices are the atomic data structure of numerical computing. Every dense neural network layer, every attention head, and every embedding lookup reduces to matrix arithmetic. Understanding both the **mechanics** and the **cost** of these operations is the foundation for reasoning about model performance.

**Notation used throughout:**

- $A \in \mathbb{R}^{m \times k}$ — a matrix with $m$ rows and $k$ columns.
- $a_{ij}$ — the entry in row $i$, column $j$.
- $A^{\top}$ — transpose. $A^{-1}$ — inverse.
- We use $n$ as the shorthand square-matrix dimension when analyzing worst-case complexity ($m = k = n$).

---

### 1.1 Types of Operations

#### 1.1.1 Matrix Multiplication (Naive vs. Optimized)

**Conceptual definition.** Matrix multiplication combines two matrices by taking dot products between the *rows of the first* and the *columns of the second*. It is the workhorse of linear algebra: a linear layer $y = Wx$, a change of basis, and a batched projection are all matrix multiplications.

**Formal notation.** For $A \in \mathbb{R}^{m \times k}$ and $B \in \mathbb{R}^{k \times n}$, the product $C = AB \in \mathbb{R}^{m \times n}$ is defined element-wise as:

$$
c_{ij} = \sum_{p=1}^{k} a_{ip}\, b_{pj}
$$

The **inner dimension $k$ must match**: the number of columns of $A$ equals the number of rows of $B$. Matrix multiplication is **associative** ($(AB)C = A(BC)$) and **distributive**, but **not commutative** ($AB \neq BA$ in general).

**Worked example.** Multiply a $2\times 3$ by a $3\times 2$:

$$
A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix}, \quad
B = \begin{bmatrix} 7 & 8 \\ 9 & 10 \\ 11 & 12 \end{bmatrix}
$$

Compute $c_{11}$ (row 1 of $A$ · column 1 of $B$):

$$
c_{11} = (1)(7) + (2)(9) + (3)(11) = 7 + 18 + 33 = 58
$$

Completing all four entries:

$$
C = \begin{bmatrix}
1\cdot7+2\cdot9+3\cdot11 & 1\cdot8+2\cdot10+3\cdot12 \\
4\cdot7+5\cdot9+6\cdot11 & 4\cdot8+5\cdot10+6\cdot12
\end{bmatrix}
= \begin{bmatrix} 58 & 64 \\ 139 & 154 \end{bmatrix}
$$

> **Analogy — Matrix Multiplication as a Spreadsheet:**
> Think of multiplying an $(m\times k)$ matrix by a $(k\times n)$ matrix like filling out a results spreadsheet with $m$ rows and $n$ columns. Each cell requires $k$ multiply-adds — so total work $= m \times n \times k$ operations. The "inner dimension" $k$ is the depth of the sum hidden inside every cell.

**Complexity analysis (chain of thought).**
> First we count operations. There are $m \times n$ output cells. Each cell is a dot product of length $k$: $k$ multiplications and $k-1$ additions $\approx 2k$ FLOPs.
> Then we identify the dominant term. Total $\approx 2 \cdot m \cdot n \cdot k$ FLOPs. For square matrices $m = n = k$, this is $2n^3$.
> Therefore Big-O is $O(mnk)$, or $O(n^3)$ for the square case.
> **Space:** output is $m \times n \Rightarrow O(mn)$, or $O(n^2)$ square (inputs aside).

**Code snippet.**

```python
import numpy as np

# Naive matrix multiplication — O(n³) time, O(n²) space
def naive_matmul(A, B):
    m, k = A.shape
    k2, n = B.shape
    assert k == k2, "inner dimensions must match"
    C = np.zeros((m, n))
    for i in range(m):           # m iterations
        for j in range(n):       # n iterations
            for p in range(k):   # k iterations → O(m·n·k)
                C[i, j] += A[i, p] * B[p, j]
    return C

# In practice, ALWAYS call the optimized kernel:
C = A @ B          # dispatches to BLAS (dgemm/sgemm) — orders of magnitude faster
```

> 💡 **Practitioner Takeaway:**
> Never hand-roll the triple loop in production. `A @ B` (NumPy) or `torch.matmul` dispatches to BLAS/cuBLAS, which achieves 10–100× the throughput of naive Python through cache blocking, SIMD vectorization, and multithreading. The naive loop is a *teaching tool*, not a tool.

---

#### 1.1.2 Transpose

**Conceptual definition.** The transpose flips a matrix over its main diagonal, swapping rows and columns.

**Formal notation.** $(A^{\top})_{ij} = a_{ji}$. If $A \in \mathbb{R}^{m \times k}$, then $A^{\top} \in \mathbb{R}^{k \times m}$.

**Worked example.**

$$
A = \begin{bmatrix} 1 & 2 & 3 \\ 4 & 5 & 6 \end{bmatrix}
\quad\Longrightarrow\quad
A^{\top} = \begin{bmatrix} 1 & 4 \\ 2 & 5 \\ 3 & 6 \end{bmatrix}
$$

> **Analogy — Transpose as Rotating a Photo:**
> Imagine a grid of sticky notes on a wall. Transposing is relabeling so that "row 3, column 1" becomes "row 1, column 3" — the *content* never moves, only how you *address* it.

**Complexity analysis.** Logically $O(mn)$ to physically move every element, but a smart library does it in **$O(1)$** by just swapping the shape and stride metadata — no data is copied. This is why `A.T` in NumPy/PyTorch is instantaneous and returns a **view**.

**Code snippet.**

```python
At = A.T            # O(1): returns a view, strides swapped, no copy
At_copy = A.T.copy()  # O(mn): forces a contiguous physical transpose
```

> 💡 **Practitioner Takeaway:**
> `A.T` is free, but a *non-contiguous* transposed tensor can silently slow down the next operation (kernels prefer contiguous memory). If a downstream op is unexpectedly slow after a transpose, call `.contiguous()` — you're paying the $O(mn)$ copy once instead of fighting strided access repeatedly.

---

#### 1.1.3 Inverse

**Conceptual definition.** The inverse $A^{-1}$ "undoes" $A$: multiplying by it returns the identity. Only **square, non-singular** matrices are invertible.

**Formal notation.** $A A^{-1} = A^{-1} A = I$, where $I$ is the identity matrix. Exists iff $\det(A) \neq 0$.

**Worked example.** For a $2\times 2$, the closed form is:

$$
A = \begin{bmatrix} a & b \\ c & d \end{bmatrix}, \quad
A^{-1} = \frac{1}{ad - bc}\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}
$$

For $A = \begin{bmatrix} 4 & 7 \\ 2 & 6 \end{bmatrix}$: $\det = 4\cdot6 - 7\cdot2 = 10$, so

$$
A^{-1} = \frac{1}{10}\begin{bmatrix} 6 & -7 \\ -2 & 4 \end{bmatrix}
= \begin{bmatrix} 0.6 & -0.7 \\ -0.2 & 0.4 \end{bmatrix}
$$

> **Analogy — Inverse as a Reverse Recipe:**
> If $A$ is a recipe that turns ingredients into a cake, $A^{-1}$ is the (usually impossible in cooking, but possible in linear algebra) reverse recipe that recovers the exact ingredients from the cake. If two different ingredient sets yield the same cake (singular matrix), no reverse recipe exists.

**Complexity analysis.** Computing an inverse via Gaussian elimination / LU is $O(n^3)$ time, $O(n^2)$ space.

> 💡 **Practitioner Takeaway:**
> **Almost never compute an explicit inverse.** To solve $Ax = b$, use `np.linalg.solve(A, b)` (an LU-based solve), not `np.linalg.inv(A) @ b`. Explicit inversion is slower, numerically less stable, and amplifies floating-point error. The inverse is a *conceptual* object; the *solve* is the operation you actually want.

---

#### 1.1.4 Decompositions: LU, QR, SVD

**Conceptual definition.** A decomposition factors a matrix into a product of simpler, structured matrices (triangular, orthogonal, diagonal). Decompositions are the engines behind solving systems, least squares, PCA, and low-rank approximation.

**Formal notation & mechanics.**

| Decomposition | Factorization | Constraint | Primary Use |
|---|---|---|---|
| **LU** | $A = LU$ (with pivoting $PA = LU$) | Square | Solving $Ax=b$, determinants |
| **QR** | $A = QR$, $Q^{\top}Q = I$, $R$ upper-triangular | Any $m \ge n$ | Least squares, orthogonalization |
| **SVD** | $A = U\Sigma V^{\top}$, $U,V$ orthogonal, $\Sigma$ diagonal | Any | PCA, low-rank approx, pseudo-inverse, rank |

**Worked example (SVD intuition).** For any $A$, SVD gives singular values $\sigma_1 \ge \sigma_2 \ge \dots \ge 0$ on the diagonal of $\Sigma$. Keeping only the top-$r$ gives the **best rank-$r$ approximation** (Eckart–Young theorem):

$$
A \approx \sum_{i=1}^{r} \sigma_i\, u_i v_i^{\top}
$$

If $A$ is $1000 \times 1000$ but $\sigma_{11} \approx 0$, you can store $\approx 10 \times (1000+1000)$ numbers instead of $10^6$ — the basis of low-rank compression (and **LoRA** fine-tuning).

> **Analogy — SVD as Ranking Ingredients by Flavor Impact:**
> SVD sorts the "directions" of a matrix by how much they matter (singular values = importance). Keeping the top few is like keeping only the ingredients you can actually taste and dropping the trace amounts — you reconstruct 95% of the dish with 5% of the components.

**Complexity analysis.** LU, QR, and SVD (thin) are all $O(n^3)$ for square/near-square matrices; SVD has the largest constant. Space is $O(n^2)$.

**Code snippet.**

```python
import numpy as np
P, L, U = scipy.linalg.lu(A)         # A = P @ L @ U
Q, R    = np.linalg.qr(A)            # A = Q @ R
U, S, Vt = np.linalg.svd(A, full_matrices=False)  # A = U @ diag(S) @ Vt
A_rank_r = (U[:, :r] * S[:r]) @ Vt[:r]            # best rank-r approximation
```

> 💡 **Practitioner Takeaway:**
> **LoRA** (Low-Rank Adaptation) is SVD's intuition applied to fine-tuning: instead of updating a full $d \times d$ weight matrix ($d^2$ params), you learn two thin matrices $A \in \mathbb{R}^{d\times r}$, $B \in \mathbb{R}^{r\times d}$ with $r \ll d$, reducing trainable params from $d^2$ to $2dr$. SVD tells you *why* this works: weight updates are often approximately low-rank.

---

#### 1.1.5 Element-wise (Hadamard) vs. Dot vs. Outer Product

These three "products" are constantly confused. They differ in shape rules, output shape, and cost.

**Formal notation.**

- **Hadamard (element-wise):** $C = A \odot B$, same shape, $c_{ij} = a_{ij} b_{ij}$.
- **Dot product (vectors):** $\mathbf{a}\cdot\mathbf{b} = \sum_i a_i b_i$ → a **scalar**.
- **Outer product:** $\mathbf{a}\otimes\mathbf{b} = \mathbf{a}\mathbf{b}^{\top}$, with $(\mathbf{a}\mathbf{b}^{\top})_{ij} = a_i b_j$ → a **matrix**.

**Worked example.** Let $\mathbf{a} = [1, 2, 3]$, $\mathbf{b} = [4, 5, 6]$.

- Hadamard: $\mathbf{a}\odot\mathbf{b} = [1\cdot4,\ 2\cdot5,\ 3\cdot6] = [4, 10, 18]$
- Dot: $\mathbf{a}\cdot\mathbf{b} = 4 + 10 + 18 = 32$ (a scalar)
- Outer:
$$
\mathbf{a}\mathbf{b}^{\top} = \begin{bmatrix} 4 & 5 & 6 \\ 8 & 10 & 12 \\ 12 & 15 & 18 \end{bmatrix}
$$

> **Analogy — Three Ways to Combine Two Shopping Lists:**
> **Hadamard** = multiply matching items (apples×apples, bread×bread) → a new list. **Dot** = the single grand total after multiplying and summing → one number. **Outer** = a full price grid pairing *every* item on list A with *every* item on list B → a matrix.

**Complexity analysis.**

| Product | Output shape | Time | Space |
|---|---|---|---|
| Hadamard | $m \times n$ | $O(mn)$ | $O(mn)$ |
| Dot (length-$n$ vectors) | scalar | $O(n)$ | $O(1)$ |
| Outer ($m$-vec, $n$-vec) | $m \times n$ | $O(mn)$ | $O(mn)$ |

**Code snippet.**

```python
A * B            # Hadamard (element-wise), shapes must match/broadcast
np.dot(a, b)     # or a @ b for 1-D vectors → scalar
np.outer(a, b)   # outer product → matrix
```

> 💡 **Practitioner Takeaway:**
> In transformers, the gating in GLU/SwiGLU FFNs is a **Hadamard** product ($\text{SiLU}(xW_1) \odot (xW_3)$). Getting the product type wrong is a top-5 source of silent shape bugs — a `*` where you meant `@` won't always error (broadcasting may "succeed" into garbage), so assert shapes explicitly.

---

#### 1.1.6 Broadcasting Rules and Complexity Implications

**Conceptual definition.** Broadcasting lets operations combine arrays of different shapes by *virtually* stretching the smaller one — without physically copying data — as long as dimensions are compatible.

**Formal rules.** Align shapes from the **trailing** (rightmost) dimension. Two dimensions are compatible if they are **equal** or **one of them is 1**. A size-1 dimension is stretched to match.

**Worked example.**

```
A shape: (4, 3)
b shape:    (3,)   → treated as (1, 3) → stretched to (4, 3)
A + b    → (4, 3)   ✓  (adds b to every row)

A shape: (4, 3)
c shape: (4, 1)   → stretched to (4, 3)  ✓  (adds c to every column)

A shape: (4, 3)
d shape: (2,)     → INCOMPATIBLE (3 ≠ 2, neither is 1)  ✗
```

> **Analogy — Broadcasting as a Rubber Stamp:**
> A bias vector is a rubber stamp. Adding it to a matrix "stamps" the same pattern across every row. You don't manufacture $m$ physical copies of the stamp — you reuse the one stamp $m$ times. That's broadcasting: logical replication, zero (or minimal) memory replication.

**Complexity implications.**
> First, note broadcasting itself allocates no large intermediate for the *stretched* operand — strides of 0 are used on broadcast axes. **But** the *result* is full-size.
> Then identify the cost: computing $A + b$ where $A$ is $m\times n$ still touches all $mn$ elements → $O(mn)$ time and $O(mn)$ output space.
> Therefore broadcasting saves **memory on the operand**, not on the **result**. A naïve `np.tile(b, (m,1)) + A` wastes $O(mn)$ extra memory materializing the tiled copy; broadcasting avoids that copy but the arithmetic cost is identical.

> 💡 **Practitioner Takeaway:**
> Broadcasting can *hide* enormous allocations. `A[:, None] - B[None, :]` on two length-$n$ vectors silently creates an $n \times n$ matrix — the exact pattern that makes pairwise-distance and attention-score code blow up memory. When a one-line broadcast OOMs, look for an accidental $O(n^2)$ intermediate.

---

### 1.2 Complexity Analysis of Matrix Ops

#### 1.2.1 Naive MatMul: $O(n^3)$

**Chain-of-thought derivation.**
> First we count operations for $C = AB$ with all matrices $n\times n$.
> There are $n^2$ output entries $c_{ij}$.
> Each $c_{ij} = \sum_{p=1}^{n} a_{ip}b_{pj}$ requires $n$ multiplications and $n-1$ additions.
> Total multiply-adds $= n^2 \cdot n = n^3$. Counting each MAC as ~2 FLOPs gives $2n^3$.
> The dominant term as $n \to \infty$ is $n^3$.
> **Therefore time is $O(n^3)$.** Output space is $O(n^2)$.

The cubic scaling is why doubling matrix size makes multiplication **8× slower**, and why matrix multiply dominates the FLOP budget of dense networks.

#### 1.2.2 Strassen's Algorithm: $O(n^{2.807})$

**Key idea.** The naive block approach to multiplying two $2\times2$ block matrices uses **8** sub-multiplications. Strassen (1969) algebraically rearranges the computation to use only **7** sub-multiplications (at the cost of more additions), then applies this recursively.

**Chain-of-thought on the exponent.**
> Each level splits an $n\times n$ product into 7 subproblems of size $n/2$, plus $O(n^2)$ additions to combine.
> The recurrence is $T(n) = 7\,T(n/2) + O(n^2)$.
> By the Master Theorem, $T(n) = \Theta(n^{\log_2 7})$.
> $\log_2 7 \approx 2.807$.
> **Therefore Strassen is $O(n^{2.807})$** — asymptotically below $n^3$.

| Method | Sub-multiplications per level | Exponent | Big-O |
|---|---|---|---|
| Naive block | 8 | $\log_2 8 = 3$ | $O(n^3)$ |
| Strassen | 7 | $\log_2 7 \approx 2.807$ | $O(n^{2.807})$ |
| Coppersmith–Winograd family (theoretical) | — | $\approx 2.37$ | $O(n^{2.37})$ |

> 💡 **Practitioner Takeaway:**
> Strassen wins asymptotically but has a large constant, worse numerical stability, and irregular memory access that fights cache hierarchies. In practice it only helps for very large matrices, and the sub-2.4 "galactic" algorithms are never used in real code. Hardware BLAS beats Strassen for the sizes ML actually uses because it optimizes the **constant factor and memory movement**, not the exponent.

#### 1.2.3 BLAS / cuBLAS Optimizations

**BLAS** (Basic Linear Algebra Subprograms) is the standardized API — with implementations like OpenBLAS, Intel MKL, and NVIDIA cuBLAS — that every serious numeric stack calls under the hood. Matrix multiply is `GEMM` (GEneral Matrix Multiply).

They keep the $O(n^3)$ exponent but crush the **constant** via:

- **Cache blocking / tiling** — partition into sub-blocks that fit in L1/L2 cache and registers, maximizing data reuse.
- **SIMD vectorization** — AVX-512 / NEON process 8–16 floats per instruction.
- **Multithreading** — split the output across cores.
- **Memory-layout awareness** — pack panels contiguously to avoid strided loads.
- **GPU (cuBLAS):** thousands of threads + **Tensor Cores** performing fused $4\times4$ (or larger) matrix multiply-accumulate in a single instruction, especially in fp16/bf16/tf32.

> 💡 **Practitioner Takeaway:**
> A GEMM at high **arithmetic intensity** (large, square, contiguous, half-precision) can hit >90% of a GPU's peak FLOPs. The same GEMM shaped as a skinny matrix–vector product (batch size 1 decode) is **memory-bound** and may hit <10% utilization. Shape and precision, not just FLOP count, decide your speed.

#### 1.2.4 Memory Bandwidth & the Roofline Model

**The real bottleneck.** Modern accelerators can compute far faster than they can fetch data from HBM/DRAM. Whether an op is **compute-bound** or **memory-bound** is captured by the **Roofline Model**.

**Arithmetic intensity** $I$ = FLOPs performed per byte of memory traffic:

$$
I = \frac{\text{FLOPs}}{\text{Bytes moved}} \quad \text{(FLOPs/byte)}
$$

The achievable performance is capped by:

$$
\text{Attainable FLOP/s} = \min\big(\underbrace{P_{\text{peak}}}_{\text{compute roof}},\ \underbrace{I \times BW}_{\text{memory roof}}\big)
$$

- If $I$ is low (few FLOPs per byte), performance $= I \times BW$ → you're **memory-bound** (left of the "ridge point").
- If $I$ is high, performance saturates at $P_{\text{peak}}$ → **compute-bound**.

**Worked example.** GEMM has $I \approx O(n)$ (reuses each element $n$ times) → **compute-bound** for large $n$. Element-wise ops, softmax, LayerNorm, and attention's score-matrix read/write have $I \approx O(1)$ → **memory-bound**.

> **Analogy — Roofline as a Kitchen:**
> Compute is your chef's chopping speed; bandwidth is how fast a runner brings ingredients from the pantry. If the runner is slow (low bandwidth) and each ingredient is used once (low intensity), the chef stands idle — buying a faster chef (more FLOPs) changes nothing. You must either fetch faster or reuse each ingredient more before sending it back.

> 💡 **Practitioner Takeaway:**
> This is *the* mental model behind kernel fusion and FlashAttention. Most transformer wall-clock time in inference is **memory-bound**, not compute-bound. The winning move is to move less data (fuse ops, keep tiles in SRAM, use lower precision), not to add more FLOPs.

---

### 1.3 Operation Complexity Summary Table

| Operation | Shapes | Time | Space (output) | Notes |
|---|---|---|---|---|
| MatMul (naive) | $m\times k$, $k\times n$ | $O(mnk)$; $O(n^3)$ square | $O(mn)$ | BLAS GEMM in practice |
| MatMul (Strassen) | $n\times n$ | $O(n^{2.807})$ | $O(n^2)$ | Large $n$ only |
| Transpose | $m\times n$ | $O(1)$ view / $O(mn)$ copy | $O(1)$ / $O(mn)$ | Strides swapped |
| Inverse | $n\times n$ | $O(n^3)$ | $O(n^2)$ | Prefer `solve` |
| LU / QR / SVD | $n\times n$ | $O(n^3)$ | $O(n^2)$ | SVD largest constant |
| Hadamard | $m\times n$ | $O(mn)$ | $O(mn)$ | Element-wise |
| Dot (vectors) | $n$, $n$ | $O(n)$ | $O(1)$ | Scalar output |
| Outer | $m$, $n$ | $O(mn)$ | $O(mn)$ | Rank-1 matrix |
| Matrix–vector | $n\times n$, $n$ | $O(n^2)$ | $O(n)$ | Memory-bound |

---

## 2. Why Attention is $O(n^2)$

The self-attention mechanism is the defining primitive of transformers — and its quadratic scaling in sequence length $n$ is the single biggest constraint on context length. This section derives the $O(n^2)$ result rigorously and explains what to do about it.

### 2.1 Mathematical Derivation

**The definition.** For a sequence of $n$ tokens with model dimension $d$ (here $d$ = per-head dimension $d_k$), self-attention computes queries, keys, and values and combines them:

$$
\text{Attention}(Q, K, V) = \text{softmax}\!\left(\frac{QK^{\top}}{\sqrt{d}}\right)V
$$

where $Q, K, V \in \mathbb{R}^{n \times d}$.

**Step-by-step FLOP and memory accounting (chain of thought).**

> **Step 1 — Compute the score matrix $S = QK^{\top}$.**
> $Q$ is $n \times d$, $K^{\top}$ is $d \times n$. The product $S$ is $n \times n$.
> Cost: producing $n^2$ entries, each a length-$d$ dot product → $n^2 \cdot d$ multiply-adds.
> **This is $O(n^2 d)$ time and — critically — $O(n^2)$ space to store $S$.**
> This is where the $n^2$ is born: every token attends to every other token, forming an $n \times n$ grid.

> **Step 2 — Scale by $1/\sqrt{d}$.**
> Element-wise over $n^2$ entries → $O(n^2)$ time. (Prevents softmax saturation from large dot products.)

> **Step 3 — Row-wise softmax of $S$.**
> Each of the $n$ rows is normalized over $n$ entries → $O(n^2)$ time, still $O(n^2)$ space (the attention weight matrix $A$).

> **Step 4 — Multiply $A V$.**
> $A$ is $n \times n$, $V$ is $n \times d$ → output $n \times d$.
> Cost: $n \cdot d$ outputs, each a length-$n$ dot product → $n^2 \cdot d$ multiply-adds → $O(n^2 d)$ time.

> **Step 5 — Sum the dominant terms.**
> Time $= O(n^2 d) + O(n^2) + O(n^2) + O(n^2 d) = O(n^2 d)$.
> Space $= O(n^2)$ for the score/weight matrix (plus $O(nd)$ for Q,K,V).
> **Therefore attention is $O(n^2 d)$ time and $O(n^2)$ memory in the sequence length $n$.**

**The projection cost, for contrast.** Forming $Q, K, V$ from the input $X \in \mathbb{R}^{n\times d}$ via weight matrices is $O(n d^2)$ — **linear** in $n$. So for long sequences ($n \gg d$), the $O(n^2 d)$ attention core dominates the $O(nd^2)$ projections. That crossover is exactly why long context is hard.

### 2.2 Intuitive Explanation

> **Analogy — Attention as a Meeting Where Everyone Talks to Everyone:**
> Imagine $n$ people in a room, and every person must have a one-on-one conversation with every other person to decide how much to "listen" to them. With $n$ people there are $\sim n^2/2$ pairwise conversations. Add one more person and everyone already there needs an extra conversation. Double the room and the number of conversations **quadruples**. The $n \times n$ attention matrix *is* that full table of pairwise conversations.

The quadratic cost is not an implementation accident — it is **intrinsic** to letting every token directly interact with every other token. Removing $O(n^2)$ means giving up some of that all-pairs interaction (that's what every efficient variant below does).

**Code snippet (standard attention — materializes the $n\times n$ matrix).**

```python
import torch, math

def attention(Q, K, V):
    # Q, K, V: (n, d)
    d = Q.shape[-1]
    S = Q @ K.transpose(-2, -1) / math.sqrt(d)  # (n, n)  ← O(n²) memory born HERE
    A = torch.softmax(S, dim=-1)                # (n, n)  ← O(n²) memory
    return A @ V                                # (n, d)  ← O(n²·d) time
```

### 2.3 Practical Impact on Long-Context LLMs

**The memory wall arrives before the compute wall.** The attention matrix stores $n^2$ values **per head, per layer**. At fp32 (4 bytes), a single $n \times n$ score matrix costs:

$$
\text{Bytes} = n^2 \times 4
$$

| Context length $n$ | Single $n\times n$ matrix (fp32) | Interpretation |
|---|---|---|
| 4,096 (4K) | $4096^2 \times 4 \approx 67$ MB | Manageable per head |
| 32,768 (32K) | $32768^2 \times 4 \approx 4.3$ GB | One matrix ≈ a whole GPU's spare memory |
| 131,072 (128K) | $\approx 68$ GB | Exceeds a single 80 GB GPU |
| 1,048,576 (1M) | $\approx 4.4$ TB | Physically impossible to materialize |

Multiply by number of heads and layers and it is clear: **you cannot naively store the attention matrix at long context.** The compute ($O(n^2 d)$) is also brutal, but memory is what kills you first.

> 💡 **Practitioner Takeaway:**
> At $n=32\text{K}$, a *single* fp32 attention matrix is ~4.3 GB — before you count 32 layers × 32 heads. This is precisely why FlashAttention (which **never materializes** the full $n\times n$ matrix) is non-negotiable for long-context models. The quadratic term is a **memory** problem first and a **FLOP** problem second.

### 2.4 Solutions & Variants

All efficient-attention approaches attack the $O(n^2)$ term. They fall into two philosophies: **compute the same thing more cleverly** (exact) or **compute an approximation** (sparse/linear).

| Method | Core idea | Time | Memory | Exact? |
|---|---|---|---|---|
| **FlashAttention** | Tile Q,K,V into SRAM blocks; online-softmax; never store full $n\times n$ | $O(n^2 d)$ | $O(n)$ | ✅ Exact |
| **Sliding Window** (Longformer, Mistral) | Each token attends to $w$ local neighbors only | $O(n w)$ | $O(n w)$ | ❌ Approx |
| **Sparse Attention** (GPT-3, BigBird) | Fixed sparse pattern: local + strided + global tokens | $O(n\sqrt{n})$ | $O(n\sqrt{n})$ | ❌ Approx |
| **Linear Attention** (Performer, Linformer) | Kernel/low-rank factorization avoids forming $QK^\top$ | $O(n d^2)$ / $O(n d)$ | $O(n d)$ | ❌ Approx |

**FlashAttention — the most important one.** It is *mathematically identical* to standard attention (same output, bit-for-bit up to reordering) but reorganizes computation: it splits Q, K, V into blocks, keeps them in fast on-chip **SRAM**, and uses the **online softmax** trick to accumulate results block-by-block without ever writing the full $n\times n$ matrix to HBM. This turns attention from **memory-bound** into **compute-bound**, delivering large speedups and reducing memory from $O(n^2)$ to $O(n)$.

> **Analogy — FlashAttention as Streaming vs. Downloading:**
> Standard attention *downloads the entire movie* (the $n\times n$ matrix) to disk before watching. FlashAttention *streams* it in chunks that fit in a small buffer, watching and discarding as it goes — you never need disk space for the whole file, and it's faster because the buffer (SRAM) is right next to the player (compute cores).

```python
# FlashAttention: same math, O(n) memory — never materializes the (n, n) matrix
from torch.nn.functional import scaled_dot_product_attention as sdpa
out = sdpa(Q, K, V, is_causal=True)  # dispatches to a fused Flash kernel on GPU
```

> 💡 **Practitioner Takeaway:**
> FlashAttention doesn't change the $O(n^2 d)$ FLOP count — it changes the **memory complexity** from $O(n^2)$ to $O(n)$ and the memory *traffic* dramatically. That's the Roofline lesson in action: the win came from moving less data, not doing less math. For true sub-quadratic scaling you must switch algorithms (sliding window, sparse, or linear), accepting approximation.

---

## 3. Sparse Matrix Formats

When most entries of a matrix are zero, storing and multiplying them densely wastes memory and FLOPs. Sparse formats store **only the nonzeros** plus enough indexing to reconstruct positions. This is the data-structure counterpart to the sparse-attention algorithms above.

### 3.1 Format Descriptions

#### 3.1.1 Dense vs. Sparse — When Sparsity Matters

**Conceptual definition.** A **sparse** matrix has mostly zeros. Storing it sparsely pays an *indexing overhead* per nonzero (you must record *where* each value lives) in exchange for skipping the zeros.

**The break-even rule of thumb.** Sparse storage pays off when the matrix is roughly **>70% zeros** (equivalently, density < ~30%). Below that, the index overhead (typically 2–3× bytes per stored value) outweighs the savings, and dense + BLAS is faster *and* smaller.

**Chain-of-thought on the threshold.**
> A dense $n\times n$ matrix stores $n^2$ values.
> A sparse format storing $\text{nnz}$ nonzeros needs roughly $\text{nnz}$ values **plus** $\sim\!\text{nnz}$ (COO: two indices) to $\sim\!(\text{nnz} + n)$ (CSR) index entries.
> So sparse ≈ $2\text{-}3 \times \text{nnz}$ storage units.
> Break-even: $3\,\text{nnz} < n^2 \Rightarrow \text{density} = \text{nnz}/n^2 < \tfrac{1}{3}$.
> **Therefore ~30% density (70% zeros) is the practical crossover.**

> **Analogy — Sparse Storage as an Address Book vs. a Seating Chart:**
> A dense matrix is a full stadium seating chart with a marker in *every* seat (mostly "empty"). A sparse format is an address book: you only write down the seats that are *occupied*, plus each occupant's row/seat number so you can find them. If the stadium is nearly full, the address book is longer than the chart — only worth it when the stadium is mostly empty.

#### 3.1.2 COO (Coordinate Format)

**Conceptual definition.** The simplest format: store three parallel arrays — `row`, `col`, and `value` — one triple per nonzero.

**Formal representation.** For each nonzero $a_{ij} = v$, store $(i, j, v)$.

**Worked example.** Consider:

$$
M = \begin{bmatrix} 0 & 0 & 3 \\ 4 & 0 & 0 \\ 0 & 5 & 0 \end{bmatrix}
$$

COO representation:

```
row   = [0, 1, 2]
col   = [2, 0, 1]
value = [3, 4, 5]
```

> **Analogy — COO as GPS Pins:**
> Each nonzero is a pin dropped on a map with its (latitude, longitude, label). Simple to add pins in any order, but there's no structure telling you which pins are on the same street.

**Complexity.** Storage $O(\text{nnz})$ (3 arrays of length nnz). Building/appending is $O(1)$ amortized. Random access and matrix-vector multiply are inefficient because entries aren't grouped by row.

**Code snippet.**

```python
import scipy.sparse as sp
coo = sp.coo_matrix((value, (row, col)), shape=(3, 3))
```

> 💡 **Practitioner Takeaway:**
> COO is the **construction** format: build here (fast, unordered inserts, easy to concatenate), then convert to CSR/CSC for **computation**. Duplicate $(i,j)$ entries are summed on conversion — handy for finite-element assembly, dangerous if unexpected.

#### 3.1.3 CSR (Compressed Sparse Row)

**Conceptual definition.** CSR compresses the row information of COO. Instead of storing a row index for every nonzero, it stores **pointers** marking where each row starts in the value array.

**Formal representation.** Three arrays:
- `values` — nonzeros, in row-major order (length nnz).
- `col_indices` — column of each nonzero (length nnz).
- `row_ptr` — length $m+1$; `row_ptr[i]` is the index in `values` where row $i$ begins. Row $i$'s nonzeros are `values[row_ptr[i] : row_ptr[i+1]]`.

**Worked example.** Same $M$ as above:

$$
M = \begin{bmatrix} 0 & 0 & 3 \\ 4 & 0 & 0 \\ 0 & 5 & 0 \end{bmatrix}
$$

```
values      = [3, 4, 5]
col_indices = [2, 0, 1]
row_ptr     = [0, 1, 2, 3]   # row0: [0:1], row1: [1:2], row2: [2:3]
```

Reading row 1: `row_ptr[1]=1`, `row_ptr[2]=2` → `values[1:2]=[4]` at `col_indices[1:2]=[0]` → $a_{1,0}=4$. ✓

> **Analogy — CSR as a Book's Table of Contents:**
> `values` + `col_indices` are the words on the pages; `row_ptr` is the table of contents telling you "Chapter (row) $i$ starts on page $p$." To read a whole row you jump straight to its start and read until the next row's start — no scanning.

**Complexity.** Storage $O(\text{nnz} + m)$. **Sparse matrix–vector multiply (SpMV) is $O(\text{nnz})$** and row access is $O(1)$ to locate + $O(\text{nnz in row})$ to read. Row slicing is fast; column slicing and inserting new nonzeros are slow.

**Code snippet.**

```python
import scipy.sparse as sp
csr = coo.tocsr()          # convert once, compute many times
y = csr @ x                # SpMV in O(nnz), the hot loop of sparse solvers
```

> 💡 **Practitioner Takeaway:**
> CSR is the **default compute format** for row-oriented ops and the backbone of sparse linear solvers and GNN message passing (`torch.sparse_csr_tensor`, `scipy`). If your workload is "for each row, combine its nonzeros" (which SpMV and graph aggregation are), CSR is almost always the right choice.

#### 3.1.4 CSC (Compressed Sparse Column)

**Conceptual definition.** CSC is CSR's mirror image: compress **columns** instead of rows. Store nonzeros in column-major order with a `col_ptr`.

**Formal representation.** Three arrays:
- `values` — nonzeros in column-major order.
- `row_indices` — row of each nonzero.
- `col_ptr` — length $n+1$; column $j$'s nonzeros are `values[col_ptr[j] : col_ptr[j+1]]`.

**Worked example.** Same $M$:

$$
M = \begin{bmatrix} 0 & 0 & 3 \\ 4 & 0 & 0 \\ 0 & 5 & 0 \end{bmatrix}
$$

Column-major traversal (col 0: value 4 at row 1; col 1: value 5 at row 2; col 2: value 3 at row 0):

```
values      = [4, 5, 3]
row_indices = [1, 2, 0]
col_ptr     = [0, 1, 2, 3]   # col0:[0:1], col1:[1:2], col2:[2:3]
```

> **Analogy — CSC as a Rolodex Filed by Column:**
> Same address book, but now filed so that everything in a given column is together. If your question is always "who is in column $j$?", this filing makes it instant — at the cost of making "who is in row $i$?" slow.

**Complexity.** Storage $O(\text{nnz} + n)$. Column access is $O(1)$ to locate; column slicing is fast; row slicing is slow. Efficient for $A^{\top}x$ and column-oriented factorizations.

> 💡 **Practitioner Takeaway:**
> CSC and CSR are transposes of each other's layout: `csr.T` is naturally a CSC view. Choose CSR for row-heavy access and SpMV ($Ax$), CSC for column-heavy access and $A^{\top}x$ or direct solvers (SciPy's sparse LU uses CSC). Picking the wrong one turns fast $O(1)$ slices into slow scans.

#### 3.1.5 Block-Sparse

**Conceptual definition.** Instead of tracking individual scattered nonzeros, block-sparse formats divide the matrix into fixed-size **dense blocks** (e.g., $16\times16$, $32\times32$) and store only the **nonzero blocks**. Within each stored block, everything is dense.

**Why it exists.** Individual-element sparse formats (COO/CSR) have irregular memory access that GPUs and Tensor Cores hate. Block-sparse restores **regularity**: each block is a small dense GEMM the hardware runs at peak efficiency. It trades a little storage (some zeros inside blocks are kept) for massive throughput gains.

**Formal representation.** Partition $A$ into $b\times b$ blocks. Store (block_row, block_col) index pairs (like COO/CSR over blocks) plus a dense $b\times b$ tile per nonzero block.

**Worked example.** An $8\times8$ matrix with $2\times2$ blocks has a $4\times4$ grid of blocks. If only 3 of the 16 blocks are nonzero, you store $3 \times (2\times2) = 12$ values plus 3 block-coordinate pairs — instead of 64 dense values or scattered element indices.

> **Analogy — Block-Sparse as Shipping Full Boxes Only:**
> Rather than mailing individual items with a separate address label on each (per-element sparsity, lots of labeling overhead), you pack items into standard-size boxes and ship only the boxes that contain something. Trucks (GPUs) love uniform boxes — they stack and move them at full speed. A few boxes carry some padding, but throughput soars.

**Complexity.** Storage $O(\text{nnz-blocks} \times b^2)$. Block-sparse matmul runs at near-dense GEMM efficiency on the stored blocks, so effective speedup ≈ (fraction of blocks that are zero). Used in **GPT-3's sparse attention**, **Longformer**, and libraries like NVIDIA's cuSPARSE / OpenAI's block-sparse GPU kernels.

**Code snippet.**

```python
# Conceptual: block-sparse attention stores only "allowed" (query_block, key_block) pairs
# Each stored pair is a dense b×b tile → runs on Tensor Cores at peak throughput.
# e.g. triton / cuSPARSE block-sparse GEMM, or torch sparse block layouts.
```

> 💡 **Practitioner Takeaway:**
> Block-sparse is the format that makes sparsity *actually fast on GPUs*. Unstructured 50% sparsity often gives **zero** speedup (irregular access dominates); structured block (or 2:4 semi-structured) sparsity aligned to Tensor Cores delivers real wall-clock wins. When someone says "we pruned to 90% sparse and it's not faster," the fix is almost always **structure**, not more pruning.

### 3.2 Comparison Table

| Format | Stored arrays | Storage | Fast at | Slow at | Best use case |
|---|---|---|---|---|---|
| **Dense** | full grid | $O(n^2)$ | everything (if <70% zeros) | wasted on sparse data | Density > ~30% |
| **COO** | row, col, value | $O(\text{nnz})$ | construction, incremental build | random access, SpMV | Building / assembling a matrix |
| **CSR** | values, col_idx, row_ptr | $O(\text{nnz}+m)$ | row access, SpMV $Ax$ | column ops, inserts | Solvers, GNNs, row-wise compute |
| **CSC** | values, row_idx, col_ptr | $O(\text{nnz}+n)$ | column access, $A^\top x$ | row ops, inserts | Direct/LU solvers, column ops |
| **Block-Sparse** | block coords + dense tiles | $O(\text{nnz-blocks}\cdot b^2)$ | GPU GEMM, Tensor Cores | irregular fine-grained sparsity | Sparse attention, pruned nets on GPU |

### 3.3 Practical Usage Guide

**Decision flow (chain of thought):**

> 1. **Is the matrix >70% zeros?** No → stay **dense**, use BLAS. Yes → continue.
> 2. **Am I still building/mutating it?** Yes → use **COO** (cheap appends), then convert.
> 3. **Is my hot operation row-oriented ($Ax$, per-row aggregation)?** → **CSR**.
> 4. **Is it column-oriented ($A^\top x$, LU factorization)?** → **CSC**.
> 5. **Am I on a GPU and want real speedups from sparsity?** → **Block-Sparse** (or 2:4 structured), aligned to Tensor Cores.

> 💡 **Practitioner Takeaway:**
> The universal pattern: **build in COO → compute in CSR/CSC → accelerate on GPU with block-sparse.** Match the format to the *access pattern of your hottest loop*, not to how the data was born. And always benchmark: for moderate sparsity, a well-tuned dense GEMM frequently beats a "clever" sparse kernel.

---

## 4. Synthesis & Connections

**How sparse formats solve the $O(n^2)$ attention problem.** The chain is direct:

1. Standard attention forms a dense $n \times n$ score matrix → $O(n^2)$ memory and $O(n^2 d)$ compute (§2).
2. Empirically, that matrix is **mostly near-zero**: each token meaningfully attends to only a handful of others (local neighbors + a few global anchors). It is a naturally **sparse** matrix (§3.1.1).
3. **Sparse attention** exploits this by only computing a chosen subset of $(query, key)$ pairs — a fixed sparsity *pattern* — reducing cost to $O(n\sqrt n)$ (BigBird/GPT-3) or $O(nw)$ (sliding window).
4. To make that sparsity **fast on GPUs**, the pattern is expressed in **block-sparse** form (§3.1.5): whole $b\times b$ tiles of the attention grid are computed as dense mini-GEMMs on Tensor Cores, skipping the "off" blocks entirely. Longformer and GPT-3 do exactly this.
5. Orthogonally, **FlashAttention** attacks the *same* $O(n^2)$ memory term without approximation — by never materializing the matrix (Roofline/tiling logic from §1.2.4). Sparse patterns reduce **work**; FlashAttention reduces **memory traffic**. Production long-context models combine both (e.g., block-sparse + Flash kernels).

So the three parts of this guide are one story: **matrix-multiply complexity** (§1) explains *why* attention costs $O(n^2 d)$ (§2), and **sparse formats** (§3) — especially block-sparse — are the data structures that turn the "reduce the $n^2$" idea into real hardware speedups.

**Mental model summary.**

> Everything in a transformer is a matrix multiply, and matrix multiply is $O(n^3)$ in dimension but bottlenecked by **memory movement**, not raw FLOPs (Roofline). Attention's $O(n^2)$ arises because it multiplies $Q$ by $K^\top$ to compare every token with every other, materializing an $n\times n$ grid whose **memory** cost explodes before its compute does. Because that grid is mostly near-zero, we either (a) *skip* most of it with structured **sparse/block-sparse** patterns to cut the work sub-quadratically, or (b) *stream* it exactly with **FlashAttention** to cut the memory traffic — and the best systems do both.

---

## 5. Common Misconceptions

> ⚠️ **Misconception 1: "FlashAttention makes attention $O(n)$ in compute."**
> **Correction.** FlashAttention is still $O(n^2 d)$ in **FLOPs** — it computes the exact same attention. What it reduces is **memory** from $O(n^2)$ to $O(n)$ and, crucially, memory *traffic* to/from HBM. It's a memory-complexity and bandwidth win, not a FLOP win. For genuinely sub-quadratic *compute*, you need approximate methods (linear/sparse attention).

> ⚠️ **Misconception 2: "More sparsity always means faster."**
> **Correction.** Unstructured sparsity (random scattered zeros) often yields **no** speedup on GPUs — irregular memory access and index overhead dominate, and a dense GEMM on Tensor Cores wins. Speed comes from **structure** (block-sparse, 2:4 semi-structured) that maps to hardware, not from the zero-count alone. A 90%-sparse unstructured matrix can be slower than its dense version.

> ⚠️ **Misconception 3: "Strassen's algorithm is what makes GPUs fast at matmul."**
> **Correction.** GPUs and BLAS do **not** use Strassen. They keep the $O(n^3)$ exponent and win on the **constant factor** — cache blocking, SIMD, multithreading, and Tensor Cores. Strassen has poor numerical stability and cache behavior, so it's rarely used for the matrix sizes ML actually runs. Lowering the exponent ≠ real-world speed.

> ⚠️ **Misconception 4 (bonus): "To solve $Ax=b$, compute $A^{-1}$ then multiply."**
> **Correction.** Explicit inversion is slower ($O(n^3)$ with a large constant), less numerically stable, and unnecessary. Use a factorization-based solver (`np.linalg.solve`, LU/Cholesky). The inverse is a concept; the *solve* is the operation.

> ⚠️ **Misconception 5 (bonus): "Transpose is an expensive $O(n^2)$ copy."**
> **Correction.** In NumPy/PyTorch, `A.T` is an $O(1)$ **view** — it just swaps shape/stride metadata. It only becomes $O(mn)$ if you force a contiguous copy (`.contiguous()` / `.copy()`), which you sometimes need for a downstream kernel.

---

## 6. Quick-Reference Cheat Sheet

**Matrix op complexity ($n\times n$):**

| Op | Time | Space |
|---|---|---|
| MatMul (naive/BLAS) | $O(n^3)$ | $O(n^2)$ |
| MatMul (Strassen) | $O(n^{2.807})$ | $O(n^2)$ |
| Transpose (view) | $O(1)$ | $O(1)$ |
| Inverse / LU / QR / SVD | $O(n^3)$ | $O(n^2)$ |
| Matrix–vector | $O(n^2)$ | $O(n)$ |
| Hadamard / add | $O(n^2)$ | $O(n^2)$ |
| Dot product | $O(n)$ | $O(1)$ |
| Outer product | $O(n^2)$ | $O(n^2)$ |

**Attention:**

- Formula: $\text{softmax}(QK^\top/\sqrt d)\,V$
- Time $O(n^2 d)$, Memory $O(n^2)$ — the $n^2$ comes from $QK^\top$ (all-pairs).
- fp32 score matrix bytes $= 4n^2$: 4K→67 MB, 32K→4.3 GB, 128K→68 GB, 1M→4.4 TB.
- **FlashAttention**: exact, $O(n)$ memory (tiling + online softmax).
- **Sliding window**: $O(nw)$. **Sparse/BigBird**: $O(n\sqrt n)$. **Linear**: $O(nd)$–$O(nd^2)$.

**Sparse formats:**

| Format | Storage | Best for |
|---|---|---|
| COO | $O(\text{nnz})$ | Building the matrix |
| CSR | $O(\text{nnz}+m)$ | Row ops, SpMV $Ax$ |
| CSC | $O(\text{nnz}+n)$ | Column ops, $A^\top x$, LU |
| Block-Sparse | $O(\text{blocks}\cdot b^2)$ | GPU/Tensor-Core speedups, sparse attention |

**Rules of thumb:**

- Sparse pays off above **~70% zeros**.
- Attention is a **memory** problem before a **compute** problem.
- Speed = **memory movement + structure**, not just FLOP count (Roofline).
- Build in **COO** → compute in **CSR/CSC** → accelerate with **block-sparse**.
- Never invert; always **solve**. Never hand-roll matmul; always call **BLAS**.

---

*End of reference guide.*

---

## Related Guides

**Prerequisites:** [Big-O Notation & Complexity Analysis](/docs/big-o-complexity) · [Python Internals & NumPy Memory](/docs/python-internals-numpy-memory)  
**See also:** [Python Internals & NumPy Memory](/docs/python-internals-numpy-memory) · [Tokenization Algorithms](/docs/tokenization)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
