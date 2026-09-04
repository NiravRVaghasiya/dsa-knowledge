---
title: Graph Algorithms for KG & GraphRAG
slug: /graph-algorithms-kg-graphrag
sidebar_position: 6
sidebar_label: Graph Algorithms for KG & GraphRAG
description: >-
  How graph algorithms power knowledge graphs and GraphRAG retrieval in production LLM systems.
tags:
  - knowledge-graph
  - graphrag
  - graphs
  - llm
difficulty: advanced
reading_time: 33
prerequisites:
  - title: Graph Theory
    to: /docs/graph-theory
  - title: Shortest Path Algorithms
    to: /docs/shortest-path
pagination_prev: domain-specific-dsa/beam-search
pagination_next: domain-specific-dsa/state-machines-dags-langgraph
path_step: 35
---

# Ultimate Guide: Graph Algorithms for Knowledge Graphs & GraphRAG

*A practitioner's reference for mid-to-senior ML engineers and AI researchers building GraphRAG systems.*

---

## Table of Contents

1. [Foundations](#1-foundations)
2. [Graph Traversal Algorithms](#2-graph-traversal-algorithms)
3. [PageRank & Variants](#3-pagerank--variants)
4. [Centrality Measures](#4-centrality-measures)
5. [Advanced / Bonus Algorithms](#5-advanced--bonus-algorithms)
6. [Comparison Table](#6-comparison-table)
7. [Decision Guide: Which Algorithm When?](#7-decision-guide-which-algorithm-when)
8. [Key Takeaways](#8-key-takeaways-for-practitioners)

---

## Notation Used Throughout

Throughout this guide, unless stated otherwise:

- **V** = number of nodes (vertices), **E** = number of edges
- **d** = depth / hop distance from a seed node
- **b** = branching factor (average out-degree)
- **k** = number of iterations (for iterative methods) or top-k cutoff (in retrieval context — disambiguated locally)
- **α** = damping factor (PageRank) or teleport probability variants
- Complexities are stated for the *standard* implementation and flagged when a specialized variant changes them.

---

## 1. Foundations

Before touching a single algorithm, it pays to be precise about the substrate they run on. GraphRAG lives or dies on how the graph is modeled, so the vocabulary matters.

### 1.1 Graph Terminology

A **graph** `G = (V, E)` is a set of **nodes** (vertices) connected by **edges** (links).

| Term | Meaning | KG interpretation |
|------|---------|-------------------|
| **Node / Vertex** | A discrete entity | An entity: `Person:Ada_Lovelace`, `Concept:Backpropagation` |
| **Edge / Relation** | A connection between two nodes | A predicate: `authored`, `is_a`, `cites` |
| **Weight** | A scalar on an edge (or node) | Confidence score, co-occurrence count, semantic similarity |
| **Directed edge** | Ordered `(u → v)` | `Ada —authored→ Note_G`; direction encodes semantics |
| **Undirected edge** | Symmetric `{u, v}` | `co_authored_with`, `similar_to` |
| **Degree** | Number of incident edges | How connected/important an entity is locally |
| **Path** | Sequence of edges from `u` to `v` | A multi-hop reasoning chain |
| **Neighborhood N(v)** | Nodes one hop from `v` | Direct facts about an entity |

**Directed vs undirected** is the first modeling decision. Most real KGs are **directed multigraphs**: directed because `manages(A, B) ≠ manages(B, A)`, and multi- because two nodes can share several typed relations simultaneously (`A cites B` *and* `A refutes B`).

### 1.2 Types of Graphs Used in Knowledge Graphs

**1. RDF triple stores (subject–predicate–object).**
The classic KG model. Every fact is a triple: `(:Ada, :authored, :NoteG)`. Predicates are themselves URIs, so the schema is data. Queried with SPARQL. Strength: W3C standard, federatable, formal semantics (RDFS/OWL reasoning). Weakness: attaching attributes *to a relation* requires reification, which is clumsy.

**2. Labeled property graphs (LPG).**
The Neo4j / Cypher model. Nodes and edges both carry a label plus an arbitrary key–value property bag: `(:Person {name:'Ada'})-[:AUTHORED {year:1843}]->(:Note)`. Strength: relations are first-class and can hold properties (weights, timestamps, provenance) natively — ideal for GraphRAG where edge confidence matters. Weakness: less formal semantics than RDF/OWL.

**3. Hypergraphs.**
An edge (a *hyperedge*) connects **more than two** nodes at once. Natural for n-ary facts: an "employment" event links `Person`, `Company`, `Role`, `StartDate` as a single unit. Strength: no reification needed for n-ary relations. Weakness: fewer mature stores; most algorithms below assume dyadic edges and need adaptation (e.g., clique-expansion or star-expansion into a bipartite graph).

> ⚠️ **Expert Insight**: Most GraphRAG systems in production use **LPGs (Neo4j, Kùzu, Memgraph)** rather than pure RDF, precisely because retrieval scoring needs weighted, typed, timestamped edges as first-class citizens. If you inherit an RDF store, plan a projection layer that flattens reified statements into weighted property edges before running centrality/PageRank.

### 1.3 How GraphRAG Leverages Graph Structure for LLM Retrieval

Vanilla RAG embeds chunks, does approximate nearest-neighbor (ANN) vector search, and stuffs the top-k chunks into the prompt. It is **structurally blind**: it cannot answer "how are X and Y connected?" or "summarize everything downstream of this decision," because those answers live in *relationships*, not in any single chunk.

**GraphRAG** adds a graph layer. The typical pipeline:

```
Documents ──▶ Entity/Relation extraction ──▶ Knowledge Graph
                                                   │
User query ──▶ Entity linking (anchor nodes) ──────┤
                                                   ▼
                          Graph algorithms (traversal / PPR / centrality / community)
                                                   │
                                                   ▼
                          Relevant subgraph ──▶ Linearize to text ──▶ LLM context ──▶ Answer
```

Graph algorithms enter at the **subgraph selection** step, and that is the entire point of this guide:

- **Traversal (BFS/DFS/beam)** — expand outward from query entities to gather multi-hop context.
- **PageRank / PPR** — score which entities are *globally* or *query-relative* important, so you keep the signal and drop the noise.
- **Centrality** — identify structural hubs, bridges, and connectors worth including.
- **Community detection** — pre-compute topical clusters so you can retrieve+summarize at the *community* level (this is the core idea behind Microsoft's GraphRAG "global search").

The recurring tension: **LLM context windows are finite and expensive**. Every algorithm here is ultimately a *principled pruning strategy* — a way to answer "of the millions of nodes reachable, which few dozen actually belong in the prompt?"

---

## 2. Graph Traversal Algorithms

Traversal is how GraphRAG turns "here are the entities the query mentions" into "here is the connected neighborhood of facts relevant to answering it." The choice of traversal *shapes* the retrieved context.

### 2.1 Breadth-First Search (BFS)

**What problem does it solve?** Explore a graph level by level, visiting all nodes at distance `d` before any at distance `d+1`. Finds the **shortest path in unweighted graphs** and defines "k-hop neighborhoods."

**How it works mechanically.** Use a FIFO queue. Enqueue the source, mark it visited. Repeatedly dequeue a node, visit it, enqueue its unvisited neighbors. The queue discipline guarantees level-order.

**Real-world analogy.** *Ripples from a stone dropped in a pond* — the wavefront reaches everything one ring at a time, nearest first.

**Python snippet (functional, `networkx`):**
```python
import networkx as nx
from collections import deque

def bfs_k_hop(G, source, k):
    """Return all nodes within k hops of source, with their hop distance."""
    visited = {source: 0}
    queue = deque([source])
    while queue:
        node = queue.popleft()
        if visited[node] >= k:
            continue
        for nbr in G.neighbors(node):
            if nbr not in visited:
                visited[nbr] = visited[node] + 1
                queue.append(nbr)
    return visited  # {node: hop_distance}

G = nx.DiGraph([("Ada", "NoteG"), ("NoteG", "Bernoulli"), ("Ada", "Babbage")])
print(bfs_k_hop(G.to_undirected(), "Ada", 2))
# {'Ada': 0, 'NoteG': 1, 'Babbage': 1, 'Bernoulli': 2}
```

**KG / GraphRAG use case.** The workhorse of "local search." Given query-anchor entities, `bfs_k_hop(G, anchor, k=2)` collects the 1–2 hop factual neighborhood to feed the LLM. Hop distance doubles as a cheap relevance prior (closer = more relevant).

**Complexity.** Time **O(V + E)**; space **O(V)** for the visited set + queue. In GraphRAG you rarely traverse the whole graph — bounded to k hops, cost is O(size of the k-hop ball), which around a high-degree hub can still explode.

> ⚠️ **Expert Insight**: Naive BFS over a KG with hub nodes (e.g., a `Country` node touching 50k entities) causes **context bloat** — a 2-hop ball around one hub can pull in tens of thousands of nodes. Cap out-degree during expansion, exclude "generic" hub types, or switch to **Personalized PageRank** (§3.2) which *down-weights* rather than *includes-everything* at hubs.

### 2.2 Depth-First Search (DFS)

**What problem does it solve?** Explore as deep as possible along one branch before backtracking. Basis for cycle detection, topological sort, connected components, and enumerating *paths* (chains) rather than *balls*.

**How it works mechanically.** Use a LIFO stack (or recursion). Push source, then repeatedly pop, visit, push unvisited neighbors. It plunges down one path to a dead end, then unwinds.

**Real-world analogy.** *Exploring a maze by always taking the next unexplored corridor, only backtracking when you hit a dead end.*

**Python snippet:**
```python
def dfs_paths(G, source, target, cutoff=4):
    """Enumerate all simple paths from source to target up to `cutoff` hops."""
    stack = [(source, [source])]
    while stack:
        node, path = stack.pop()
        for nbr in G.neighbors(node):
            if nbr in path:              # avoid cycles
                continue
            if nbr == target:
                yield path + [nbr]
            elif len(path) < cutoff:
                stack.append((nbr, path + [nbr]))

# networkx also ships this: nx.all_simple_paths(G, source, target, cutoff)
```

**KG / GraphRAG use case.** **Path-finding for explainability.** When a user asks "how is Ada Lovelace connected to the Bernoulli numbers?", DFS-style path enumeration surfaces the *reasoning chain* `Ada —authored→ NoteG —computes→ Bernoulli`, which you linearize into a natural-language justification. DFS is preferred over BFS when you want *chains*, not *neighborhoods*.

**Complexity.** Time **O(V + E)** for a single traversal; space **O(V)** (recursion/stack depth). But *path enumeration* (`all_simple_paths`) is worst-case **exponential** in path length — the number of simple paths can grow like O(b^d). Always set a `cutoff`.

> ⚠️ **Expert Insight**: Never enumerate simple paths uncapped on a dense KG — it's combinatorial. Bound `cutoff` to 3–4 hops. Beyond that, path semantics degrade anyway (a 6-hop connection is rarely meaningful to an end user).

### 2.3 Bidirectional Search

**What problem does it solve?** Find the shortest path between a *specific source and target* far faster than one-directional BFS, by searching from **both ends simultaneously** and meeting in the middle.

**How it works mechanically.** Run two BFS frontiers concurrently — one forward from `source`, one backward from `target` (over reversed edges). Stop when the frontiers intersect; stitch the two half-paths.

**Real-world analogy.** *Two search teams digging a tunnel from opposite sides of a mountain* — they meet in the middle, each digging only half the distance.

**Python snippet:**
```python
# networkx provides an optimized implementation:
path = nx.bidirectional_shortest_path(G, "Ada", "Bernoulli")
print(path)  # ['Ada', 'NoteG', 'Bernoulli']
```

**KG / GraphRAG use case.** **Entity-to-entity relationship queries** on large KGs: "What connects our customer *Acme* to the *SEC investigation*?" Anchoring at both endpoints and meeting in the middle avoids exploding a full k-hop ball around either one.

**Complexity.** Time **O(b^{d/2})** vs unidirectional **O(b^d)** — the exponent halves, which for `b=30, d=6` is the difference between ~10⁴ and ~10⁹ nodes touched. Space is also **O(b^{d/2})**. Requires knowing both endpoints and being able to traverse edges backward.

> ⚠️ **Expert Insight**: The b^{d/2} win is real *only* when both frontiers grow at similar rates. If the target sits behind a hub while the source is in a sparse region, the frontiers meet lopsidedly and you lose the advantage. Bidirectional search also needs an efficient **reverse adjacency** index — build it once, not per query.

### 2.4 Beam Search on Graphs

**What problem does it solve?** BFS is exhaustive; on a large KG it's too expensive. **Beam search** is a *heuristic, memory-bounded* traversal: at each level, keep only the **top-w** most promising nodes (the "beam width") and discard the rest, trading completeness for tractability.

**How it works mechanically.** Like BFS, but after generating the next frontier, **score** each candidate (by embedding similarity to the query, edge weight, PPR score, etc.), sort, and retain only the top `w`. Expand only those.

**Real-world analogy.** *A detective with limited time following only the `w` strongest leads at each stage*, dropping weak ones instead of chasing every tip.

**Python snippet:**
```python
import heapq

def beam_search(G, source, score_fn, beam_width=5, depth=3):
    """Greedy top-w traversal. score_fn(node) -> float (higher = keep)."""
    frontier = [source]
    visited = {source}
    collected = [source]
    for _ in range(depth):
        candidates = []
        for node in frontier:
            for nbr in G.neighbors(node):
                if nbr not in visited:
                    candidates.append((score_fn(nbr), nbr))
        # keep top-w by score
        top = heapq.nlargest(beam_width, candidates, key=lambda x: x[0])
        frontier = [n for _, n in top]
        for _, n in top:
            visited.add(n); collected.append(n)
    return collected
```

**KG / GraphRAG use case.** **The dominant traversal in modern GraphRAG.** With `score_fn` = cosine similarity between the neighbor's embedding and the query embedding, beam search performs *semantic-guided expansion* — it walks toward the query-relevant region of the KG and ignores irrelevant branches. This is essentially how "graph-guided retrieval" and many multi-hop QA systems keep context focused.

**Complexity.** Time **O(w · b · d)** (beam width × branching × depth) — *independent of total graph size*, which is why it scales. Space **O(w · d)**. The catch: it is **not complete** and **not optimal** — it can prune the branch that actually contained the answer.

> ⚠️ **Expert Insight**: Beam search's failure mode is **premature pruning** — a low-scoring intermediate node that leads to a high-value target gets cut at depth 1. Mitigations: (a) widen the beam near the query and narrow it deeper; (b) use a *lookahead* score that peeks one hop further; (c) blend structural score (PPR) with semantic score so a well-connected node isn't dropped purely on embedding distance.

### 2.5 Application Spotlight: Multi-Hop Reasoning in KGs

Multi-hop questions — "Which drugs target proteins in the same pathway as the gene knocked out in study X?" — are exactly what traversal enables and vanilla vector RAG cannot do. Practical recipe:

1. **Anchor**: link query entities to KG nodes (NER + entity linking).
2. **Expand**: beam search (semantic-guided) or bounded BFS from anchors.
3. **Rank**: score the retrieved subgraph with PPR seeded on anchors (§3.2).
4. **Prune**: top-k nodes/paths under a token budget.
5. **Linearize**: convert triples/paths to text, feed the LLM.

> ⚠️ **Expert Insight**: Match the traversal to the *question shape*. "How are A and B related?" → **bidirectional**. "Tell me about A's context" → **bounded BFS**. "Follow the most relevant thread from A" → **beam**. "Enumerate the reasoning chain" → **DFS path enumeration**. Using the wrong one produces either bloated or incomplete context.

---

## 3. PageRank & Variants

Traversal decides *what to reach*; PageRank decides *what matters* among what you reached. It converts graph structure into a global importance signal — the single most useful scalar in GraphRAG ranking.

### 3.1 Classic PageRank

**What problem does it solve?** Assign a global **importance score** to every node based on the link structure — the intuition being "a node is important if important nodes point to it." Originally ranked web pages; in a KG it ranks entities.

**How it works mechanically.** Model a **random surfer** who, at each step, with probability `α` (damping, ~0.85) follows a random outgoing edge, and with probability `1−α` **teleports** to a uniformly random node. PageRank is the stationary distribution of this Markov chain — the long-run fraction of time spent at each node. Computed via **power iteration**:

```
PR(v) = (1−α)/N  +  α · Σ_{u→v} PR(u) / outdeg(u)
```

Iterate until the vector converges (L1 change < tolerance). Teleport guarantees convergence and handles dangling nodes / rank sinks.

**Real-world analogy.** *Academic citations* — a paper is influential if it's cited by other influential papers, not merely by many obscure ones. Quality of inbound links, recursively defined.

**Python snippet:**
```python
import networkx as nx

G = nx.DiGraph()
G.add_edges_from([("A", "B"), ("C", "B"), ("B", "D"), ("A", "D")])
pr = nx.pagerank(G, alpha=0.85)             # {node: score}, sums to 1.0
print(sorted(pr.items(), key=lambda x: -x[1]))
```

Manual power iteration (to show the mechanics):
```python
import numpy as np

def pagerank_power(A, alpha=0.85, tol=1e-8, max_iter=200):
    """A: adjacency matrix (row = out-links). Returns PageRank vector."""
    n = A.shape[0]
    out = A.sum(axis=1, keepdims=True)
    out[out == 0] = 1                       # dangling handling
    M = A / out                             # row-stochastic transition
    r = np.ones(n) / n
    teleport = np.ones(n) / n
    for _ in range(max_iter):
        r_new = (1 - alpha) * teleport + alpha * (M.T @ r)
        if np.abs(r_new - r).sum() < tol:
            break
        r = r_new
    return r / r.sum()
```

**KG / GraphRAG use case.** **Global entity importance.** Precompute PageRank once over the whole KG; use it as a static prior to break ties or to bias retrieval toward canonically important entities (a well-known drug, a central concept). Also used to rank candidate answer entities in KGQA.

**Complexity.** Time **O(k · (V + E))** for `k` power iterations (k is typically 50–100 to converge); space **O(V + E)** for the sparse graph plus **O(V)** for the rank vector. On billion-edge graphs, use distributed / GraphX-style implementations.

> ⚠️ **Expert Insight**: **Global PageRank is query-agnostic** — it always ranks the same nodes highest regardless of the question. That makes it great as a *tie-breaker/prior* but wrong as your *primary* retrieval signal, because it will drag in globally-famous-but-irrelevant entities. For query-relevant importance you need Personalized PageRank.

### 3.2 Personalized PageRank (PPR)

**What problem does it solve?** Make importance **relative to a set of seed nodes** (the query entities) instead of global. Answers "what's important *from the perspective of* these nodes?"

**How it works mechanically.** Identical to PageRank, except the **teleport distribution is concentrated on the seed set** rather than uniform. When the surfer teleports, it jumps *back to the query entities*, so probability mass pools in their neighborhood. The stationary vector is high for nodes structurally close and well-connected to the seeds.

```
PPR(v) = (1−α)·s(v)  +  α · Σ_{u→v} PPR(u) / outdeg(u)
```
where `s` is the seed vector (mass on query entities, 0 elsewhere).

**Real-world analogy.** *"People also frequented"* recommendations — starting from the shops *you* visited, which nearby shops do random walks from *your* locations pass through most? The ranking is personalized to your starting points.

**Python snippet:**
```python
import networkx as nx

G = nx.DiGraph()
G.add_edges_from([("Entity_A", "Entity_B"), ("Entity_B", "Entity_C"),
                  ("Entity_A", "Entity_D"), ("Entity_D", "Entity_C")])

# Seed node(s) = the query entity/entities in GraphRAG
ppr_scores = nx.pagerank(G, alpha=0.85, personalization={"Entity_A": 1.0})
print(sorted(ppr_scores.items(), key=lambda x: -x[1]))
# Entity_A highest, then its structural neighbors, decaying with distance
```

**KG / GraphRAG use case.** **The single most important ranking primitive in GraphRAG.** Pipeline: link query → seed set → PPR → keep top-k nodes → that top-k subgraph *is* your retrieved context. It elegantly solves the BFS bloat problem: instead of *including* everything in the k-hop ball, PPR *scores* everything and you keep only the highest mass. Used in production GraphRAG and in classic systems like GRAPH-of-thought retrieval.

**Complexity.** Same as PageRank per full solve: **O(k · (V + E))**. But because seed mass decays quickly, **local push algorithms** (Andersen–Chung–Lang "approximate PPR") compute it in **O(1 / (ε·α))** time — *independent of graph size* — touching only the local neighborhood. This is what makes PPR feasible per-query at scale.

> ⚠️ **Expert Insight**: In GraphRAG, use PPR with **α ≈ 0.85** and a **top-k cutoff** to retrieve only the most relevant subgraph that fits the context window. Two tuning levers: **lower α** (e.g., 0.5) keeps mass tighter around seeds (more precision, less exploration); **higher α** spreads further (more recall, more bloat). For per-query latency, always use the **local push** approximation, never a full power-iteration solve.

### 3.3 Topic-Sensitive PageRank

**What problem does it solve?** A middle ground between fully global (one score for everyone) and fully personalized (recomputed per query). Precompute PageRank vectors **per topic/category**, then at query time **blend** them according to the query's topic mix — no per-query graph solve needed.

**How it works mechanically.** Offline: partition nodes into `T` topics (e.g., by community, ontology type, or classifier). Compute one topic-biased PageRank per topic, with teleport concentrated on that topic's nodes → `T` precomputed rank vectors. Online: classify the query into a topic distribution `{p_t}`, and return the **weighted combination** `Σ_t p_t · PR_t`. (Haveliwala's original 2002 formulation.)

**Real-world analogy.** *Pre-baked recommendation playlists per genre* — "top jazz," "top classical" computed ahead of time; when you say "I'm 70% jazz, 30% classical tonight," the system blends the two prebuilt lists instantly instead of recomputing from scratch.

**Python snippet:**
```python
import networkx as nx

def topic_sensitive_pagerank(G, topics, alpha=0.85):
    """topics: {topic_name: [node,...]}. Precompute one biased PR per topic."""
    vectors = {}
    for topic, nodes in topics.items():
        seed = {n: 1.0 for n in nodes}
        vectors[topic] = nx.pagerank(G, alpha=alpha, personalization=seed)
    return vectors  # precomputed offline

def query_blend(vectors, topic_mix):
    """topic_mix: {topic_name: weight}, weights sum to 1. Blend at query time."""
    blended = {}
    for topic, w in topic_mix.items():
        for node, score in vectors[topic].items():
            blended[node] = blended.get(node, 0.0) + w * score
    return blended
```

**KG / GraphRAG use case.** Large multi-domain KGs (e.g., a corp KG spanning Legal, Finance, Engineering). Precompute per-domain PageRank; route the query to a domain mix and blend. You get *near-personalized* relevance at *near-global* (precomputed) latency — no per-query power iteration.

**Complexity.** Offline: **O(T · k · (V + E))** to build T vectors. Online: **O(T · V)** to blend (usually just a few nonzero topics → cheap). Storage: **O(T · V)** for the vectors — the main cost.

> ⚠️ **Expert Insight**: Topic-Sensitive PR is the right call when queries cluster into a *small, stable set of domains* and you need low per-query latency. If seeds are arbitrary entities (not topics), it can't help — use true PPR with local push. In practice many teams use **communities from Leiden (§5.1) as the "topics,"** unifying clustering and ranking.

### 3.4 Application Spotlight: Entity Importance Scoring in GraphRAG

The canonical GraphRAG ranking stack combines all three:

1. **Global PageRank** — a static, query-agnostic prior baked into the node table.
2. **Personalized PageRank** — computed per query (local push) from the linked seed entities; this is the primary relevance signal.
3. **Final score** — often `score(v) = λ · PPR(v) + (1−λ) · cos(emb(v), emb(query))`, blending *structural* importance (PPR) with *semantic* importance (embeddings), then top-k under the token budget.

> ⚠️ **Expert Insight**: Structure and semantics are complementary, not redundant. Embeddings capture "is this *about* the query?"; PPR captures "is this *connected* to the query's entities?". A node can score high on one and low on the other — the blend `λ` (often 0.3–0.5 toward PPR) is a key hyperparameter to tune on your eval set, not guess.

---

## 4. Centrality Measures

PageRank is one notion of importance (random-walk stationary mass). Centrality is a *family* of importance notions — each answers a different structural question, and each is useful for a different GraphRAG decision.

### 4.1 Degree Centrality

**What problem does it solve?** The simplest importance signal: how many direct connections does a node have? High degree = local hub.

**How it works mechanically.** Count incident edges, normalize by `(V−1)`. For directed graphs, split into **in-degree** (authority — how many point *to* me) and **out-degree** (hub — how many I point to).

**Real-world analogy.** *A person's number of direct acquaintances* — a rough popularity proxy, but says nothing about *whose* acquaintances they are.

**Python snippet:**
```python
import networkx as nx
deg = nx.degree_centrality(G)          # undirected / total
indeg = nx.in_degree_centrality(G)     # authority
outdeg = nx.out_degree_centrality(G)   # hub
```

**KG / GraphRAG use case.** Fast **hub detection**. High-in-degree entities are often canonical/authoritative (a widely-referenced concept). Also used *defensively*: flag super-hubs to *exclude or down-weight* during traversal so they don't cause context bloat (§2.1).

**Complexity.** Time **O(V + E)** (a single pass). Space **O(V)**. The cheapest centrality by far — compute it always.

> ⚠️ **Expert Insight**: Degree is a *local* measure and is easily fooled — a node with 1000 low-value neighbors outscores a node bridging two critical clusters. Use it as a cheap first filter, never as the sole importance signal.

### 4.2 Betweenness Centrality

**What problem does it solve?** Identify **bridges / brokers** — nodes that lie on many shortest paths between other pairs. These control information flow between regions.

**How it works mechanically.** For every pair `(s, t)`, compute the fraction of shortest `s–t` paths that pass through node `v`; sum over all pairs. Brandes' algorithm computes this efficiently via BFS/Dijkstra from every node with a back-propagation of dependencies.

```
C_B(v) = Σ_{s≠v≠t}  σ_st(v) / σ_st
```
where `σ_st` = number of shortest s–t paths, `σ_st(v)` = those passing through v.

**Real-world analogy.** *"Betweenness centrality in a KG is like identifying the busiest airport hub — remove it, and many connecting flights (reasoning paths) break."* The hub isn't necessarily where you start or end, but you route *through* it.

**Python snippet:**
```python
bc = nx.betweenness_centrality(G, normalized=True)
# For big graphs, approximate with a sample of source nodes:
bc_approx = nx.betweenness_centrality(G, k=500, seed=42)  # k sampled sources
```

**KG / GraphRAG use case.** **Finding connector entities essential for multi-hop reasoning.** In a "how is A related to B" query, high-betweenness nodes on the A–B paths are exactly the entities you must include for the explanation to hold together. Also flags the entities whose removal would fragment the KG's connectivity.

**Complexity.** Brandes: **O(V·E)** for unweighted, **O(V·E + V²·log V)** for weighted graphs. Space **O(V + E)**. This is **expensive** — infeasible to run exactly on large KGs per query.

> ⚠️ **Expert Insight**: Exact betweenness is O(VE) — do **not** compute it online for a large KG. Precompute it offline, or use `networkx`'s **sampled** approximation (`k` source nodes). Betweenness is best used as an *offline structural annotation* on nodes, not a per-query signal.

### 4.3 Closeness Centrality

**What problem does it solve?** Measure how *close* a node is to all others — nodes that can reach the whole graph in few hops. High closeness = efficient broadcaster.

**How it works mechanically.** `C_C(v) = (n−1) / Σ_u d(v, u)` — the inverse of the average shortest-path distance from `v` to everyone else. Requires single-source shortest paths (BFS unweighted / Dijkstra weighted) from `v`.

**Real-world analogy.** *A person living in the geographic center of a city* — minimal average travel time to reach anyone. Not necessarily the most-connected, but the best-positioned.

**Python snippet:**
```python
cc = nx.closeness_centrality(G)                 # all nodes
cc_v = nx.closeness_centrality(G, u="Entity_A") # single node (cheaper)
```

**KG / GraphRAG use case.** Selecting **efficient "entry point" entities** for summarization — a high-closeness node reaches most of a community in few hops, so seeding traversal there gives broad coverage cheaply. Useful when choosing representative nodes to summarize a subgraph.

**Complexity.** Time **O(V·(V+E))** unweighted (one BFS per node) or **O(V·E·log V)** weighted; single-node closeness is **O(V+E)**. Space **O(V)**.

> ⚠️ **Expert Insight**: Closeness is ill-defined on **disconnected graphs** (distance = ∞ to unreachable nodes). Use the **harmonic centrality** variant (`nx.harmonic_centrality`, sums `1/d` so ∞ contributes 0) on real KGs, which are almost never fully connected.

### 4.4 Eigenvector Centrality

**What problem does it solve?** Like degree, but **weighted by the importance of your neighbors** — you're important if you're connected to important nodes, recursively. (PageRank is a teleport-stabilized variant of this idea.)

**How it works mechanically.** The centrality vector `x` is the leading eigenvector of the adjacency matrix: `A·x = λ·x` (λ = largest eigenvalue). Computed by **power iteration** — repeatedly multiply a vector by `A` and renormalize until it converges to the dominant eigenvector.

**Real-world analogy.** *Social influence* — being friends with a few celebrities beats being friends with many nobodies. Your score inherits your neighbors' scores.

**Python snippet:**
```python
ec = nx.eigenvector_centrality(G, max_iter=1000, tol=1e-6)
# On directed graphs prefer PageRank/Katz — plain eigenvector centrality
# can fail to converge on graphs with sink nodes.
```

**KG / GraphRAG use case.** Ranking entities by "prestige" in citation-like or endorsement-like KGs, where being linked by an authoritative entity should count for more than being linked by a peripheral one. Where PageRank isn't available/needed, eigenvector centrality gives a similar prestige signal on undirected KGs.

**Complexity.** Time **O(k·(V+E))** for `k` power-iteration steps (sparse matrix–vector products). Space **O(V+E)**. Comparable cost to PageRank.

> ⚠️ **Expert Insight**: Plain eigenvector centrality **misbehaves on directed graphs** — nodes in "sink" regions can grab all the score, or it may not converge. On directed KGs use **Katz centrality** (adds a base term) or **PageRank** (adds teleport) instead; both are the robust, production-safe descendants of the eigenvector idea.

### 4.5 Application Spotlight: Identifying Key Nodes for Context Retrieval

Each centrality answers a distinct retrieval question — pick per intent:

| Retrieval goal | Best centrality |
|---|---|
| "Most authoritative entity on this topic" | In-degree / Eigenvector / PageRank |
| "Bridge entities needed to explain A↔B" | Betweenness |
| "Best seed to summarize a whole cluster" | Closeness / Harmonic |
| "Cheap first-pass hub filter" | Degree |

> ⚠️ **Expert Insight**: Compute the expensive centralities (betweenness, closeness, eigenvector) **offline** as node properties during KG construction, then read them as O(1) lookups at query time. Only degree and *local* PPR are cheap enough to touch per-query. Baking structural scores into the node table is the standard production pattern.

---

## 5. Advanced / Bonus Algorithms

### 5.1 Community Detection (Louvain, Leiden)

**What problem does it solve?** Partition the graph into **densely-connected clusters** (communities) — groups of entities that belong together topically/structurally. This unlocks *hierarchical* retrieval and summarization.

**How it works mechanically.** Both optimize **modularity** — a score comparing observed intra-community edge density to what you'd expect by chance.

- **Louvain**: greedy two-phase. (1) Locally move each node to the neighboring community that most increases modularity. (2) Collapse each community into a super-node and repeat on the coarsened graph. Iterate → a hierarchy of communities.
- **Leiden**: fixes a known Louvain defect (it can produce *internally disconnected* communities) by adding a **refinement** phase that guarantees communities are well-connected, and it converges faster and to better modularity.

**Real-world analogy.** *Finding friend groups at a large party* — dense clusters of people who mostly talk among themselves, with a few connectors bridging groups.

**Python snippet:**
```python
# Louvain (bundled in networkx >= 3.0)
communities = nx.community.louvain_communities(G, resolution=1.0, seed=42)

# Leiden (preferred; via igraph or leidenalg)
import igraph as ig, leidenalg
g = ig.Graph.TupleList(G.edges(), directed=False)
part = leidenalg.find_partition(g, leidenalg.ModularityVertexPartition)
```

**KG / GraphRAG use case.** **This is the engine of Microsoft-style "global search" GraphRAG.** Offline: detect communities → generate an LLM **summary per community** (recursively, bottom-up into a hierarchy). At query time, for broad/thematic questions ("what are the main themes across these documents?"), retrieve and map-reduce the **community summaries** instead of individual nodes. It answers *corpus-level* questions vanilla RAG structurally cannot.

**Complexity.** Both are **near-linear**, roughly **O(V log V)** / **O(E)** in practice (Louvain has no tight proven bound but is empirically near-linear; Leiden is similar and often faster to converge). Space **O(V + E)**.

> ⚠️ **Expert Insight**: **Use Leiden, not Louvain.** Louvain's badly-connected-community defect is not theoretical — it produces communities that are internally fragmented, which corrupts community summaries in GraphRAG. Also tune the **resolution** parameter: higher → more, smaller communities (finer summaries); lower → fewer, larger ones (broader summaries). Resolution directly controls the granularity of your global-search index.

### 5.2 Shortest Path (Dijkstra, A*)

**What problem does it solve?** Find the **minimum-cost path** between nodes in a **weighted** graph (where edges carry a cost/distance). BFS handles unweighted; these handle weights.

**How it works mechanically.**
- **Dijkstra**: grow a set of finalized nodes; repeatedly extract the unfinalized node with smallest known distance (via a min-heap/priority queue) and relax its neighbors. Requires **non-negative** weights.
- **A\***: Dijkstra + an admissible **heuristic** `h(v)` estimating remaining cost to the target. It expands nodes in order of `f(v) = g(v) + h(v)` (cost-so-far + estimate), so it heads *toward* the goal and expands far fewer nodes. Optimal if `h` never overestimates (admissible).

**Real-world analogy.** *GPS routing* — Dijkstra explores outward in all directions by travel time; A* uses "as-the-crow-flies distance to destination" as a hint to explore mostly *toward* where you're going.

**Python snippet:**
```python
# Dijkstra (weighted shortest path)
path = nx.dijkstra_path(G, "Entity_A", "Entity_Z", weight="weight")

# A* with a heuristic (e.g., embedding distance as cost-to-go estimate)
def h(u, v):
    return embedding_distance(u, v)   # must be admissible (never overestimate)
path = nx.astar_path(G, "Entity_A", "Entity_Z", heuristic=h, weight="weight")
```

**KG / GraphRAG use case.** When KG edges carry **meaningful weights** — semantic distance, inverse-confidence, inverse-co-occurrence — the shortest weighted path is the *strongest reasoning chain* between two entities. A* with an embedding-based heuristic finds the *most semantically coherent* connection between query entities without exploring the whole graph.

**Complexity.** Dijkstra with a binary heap: **O((V + E) log V)**. A*: same worst case, but with a good heuristic it explores dramatically fewer nodes in practice (best case near-linear in path length). Space **O(V)**.

> ⚠️ **Expert Insight**: Dijkstra **breaks with negative weights** — if you derive edge cost as `-log(similarity)` make sure it stays non-negative, or use Bellman–Ford. For A*, an **inadmissible** heuristic (one that overestimates) is fast but gives you *a* path, not the *optimal* one — acceptable for "good enough" reasoning chains, dangerous if you claim it's the strongest connection.

### 5.3 Graph Neural Networks (GNN) — Overlap with Classical Algorithms

**What problem does it solve?** Learn **task-optimized node/edge/graph representations** from data, rather than using hand-designed structural scores. GNNs generalize and *learn* what classical algorithms hard-code.

**How it works mechanically.** **Message passing**: each node iteratively aggregates transformed feature vectors from its neighbors and updates its own embedding. Stacking `L` layers gives each node a receptive field of its `L`-hop neighborhood — this is **learnable, feature-weighted BFS**. Variants: GCN (mean/normalized aggregation), GraphSAGE (sampled neighbors, inductive), GAT (attention-weighted aggregation — *learned* edge importance).

**The overlap — this is the key conceptual bridge:**

| Classical algorithm | GNN counterpart |
|---|---|
| BFS k-hop neighborhood | L-layer message passing receptive field |
| PageRank / stationary walk | **APPNP / PPNP** — literally inject PPR into propagation |
| Degree/attention weighting | GAT's learned attention over edges |
| Random-walk structure | node2vec / DeepWalk (walk-based embeddings) |

**Real-world analogy.** *A rumor spreading through a social network* — each person updates their belief by combining what their neighbors tell them; after several rounds, everyone's belief reflects their broader neighborhood. A GNN *learns how much to trust each neighbor* for the task at hand.

**Python snippet (`torch_geometric`):**
```python
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv

class GCN(torch.nn.Module):
    def __init__(self, in_dim, hid, out_dim):
        super().__init__()
        self.conv1 = GCNConv(in_dim, hid)   # layer 1: aggregate 1-hop
        self.conv2 = GCNConv(hid, out_dim)  # layer 2: aggregate 2-hop

    def forward(self, x, edge_index):
        x = F.relu(self.conv1(x, edge_index))
        x = F.dropout(x, p=0.5, training=self.training)
        return self.conv2(x, edge_index)    # node embeddings / logits
```

**KG / GraphRAG use case.** (1) **Link prediction / KG completion** — infer missing edges (RGCN, CompGCN handle typed relations), densifying a sparse KG *before* retrieval. (2) **Learned node embeddings** for the semantic-similarity term in retrieval scoring, capturing structure that text embeddings miss. (3) **APPNP** explicitly fuses PPR with learned features — the cleanest bridge between §3.2 and deep learning.

**Complexity.** Forward pass: **O(L · E · d)** — L layers, E edges (each an aggregation), d feature dim. Space **O(V·d + E)**. Training adds backprop over this. Full-batch is infeasible on huge KGs → **neighbor sampling** (GraphSAGE) or **subgraph sampling** (Cluster-GCN, using community detection §5.1 to define batches).

> ⚠️ **Expert Insight**: GNNs suffer **over-smoothing** — stack too many layers and all node embeddings converge to the same vector (everyone aggregates everyone). This is why most GNNs are **2–3 layers** — mirroring the same "2–3 hops is the useful horizon" lesson from traversal (§2.5). Deeper receptive fields need residual/jumping-knowledge tricks or PPR-based propagation (APPNP) that decouples depth from smoothing. Don't reach for a GNN when a precomputed PPR + good text embeddings already hit your eval targets — GNNs add training infra, drift, and serving cost.

---

## 6. Comparison Table

| Algorithm | Category | Time Complexity | Space | Directed? Weighted? | Primary KG/GraphRAG Use | Query-time or Offline |
|---|---|---|---|---|---|---|
| **BFS** | Traversal | O(V+E) | O(V) | Both / No | k-hop neighborhood ("local search") | Query-time (bounded) |
| **DFS** | Traversal | O(V+E); path enum O(b^d) | O(V) | Both / No | Reasoning-chain / path enumeration | Query-time (capped) |
| **Bidirectional** | Traversal | O(b^{d/2}) | O(b^{d/2}) | Both / No | A↔B shortest connection | Query-time |
| **Beam Search** | Traversal (heuristic) | O(w·b·d) | O(w·d) | Both / Optional | Semantic-guided expansion | Query-time |
| **PageRank** | Importance | O(k·(V+E)) | O(V+E) | Directed / Optional | Global entity importance (prior) | Offline |
| **Personalized PR** | Importance | O(k·(V+E)); push O(1/εα) | O(V+E) | Directed / Optional | Query-relative subgraph ranking | Query-time (push) |
| **Topic-Sensitive PR** | Importance | Offline O(T·k·(V+E)); online O(T·V) | O(T·V) | Directed / Optional | Domain-blended relevance | Precompute + blend |
| **Degree Centrality** | Centrality | O(V+E) | O(V) | Both / Optional | Cheap hub detection/filter | Either |
| **Betweenness** | Centrality | O(V·E) unw.; +V²logV wtd | O(V+E) | Both / Yes | Bridge/connector entities | Offline |
| **Closeness** | Centrality | O(V·(V+E)) | O(V) | Both / Yes | Broad-coverage seed nodes | Offline |
| **Eigenvector** | Centrality | O(k·(V+E)) | O(V+E) | Undirected pref. / Opt. | Prestige ranking | Offline |
| **Louvain** | Community | ~O(V log V) empirical | O(V+E) | Undirected / Yes | Community summaries (global search) | Offline |
| **Leiden** | Community | ~near-linear | O(V+E) | Undirected / Yes | Community summaries (preferred) | Offline |
| **Dijkstra** | Shortest path | O((V+E) log V) | O(V) | Both / Yes (≥0) | Strongest weighted reasoning chain | Query-time |
| **A\*** | Shortest path | O((V+E) log V) worst; ≪ w/ heuristic | O(V) | Both / Yes (≥0) | Semantically-guided connection | Query-time |
| **GNN (msg passing)** | Learned | O(L·E·d)/fwd | O(V·d+E) | Both / Yes | Link prediction, learned embeddings | Offline train, either infer |

---

## 7. Decision Guide: Which Algorithm When?

**Start from the question shape, not the algorithm.**

```
What is the user asking?
│
├─ "Tell me about entity X" (local context)
│     → Bounded BFS (k=1–2) from X, ranked by PPR seeded on X, top-k cutoff
│
├─ "How are X and Y related?" (connection)
│     → Bidirectional search for the path; annotate with Betweenness nodes on it;
│       if edges are weighted → Dijkstra / A* for the strongest chain
│
├─ "Follow the most relevant thread from X" (focused multi-hop)
│     → Beam search with score_fn = semantic similarity (+ PPR blend)
│
├─ "What are the main themes / summarize the corpus?" (global/thematic)
│     → Leiden communities (offline) + per-community LLM summaries → map-reduce
│
├─ "Which entities matter most (generally)?" (ranking / prior)
│     → PageRank (offline) as a static prior; eigenvector/Katz on undirected
│
├─ "Which entities are the critical connectors/hubs?"
│     → Betweenness (offline) for bridges; Degree for cheap hubs
│
└─ "Fill in missing relationships / richer embeddings"
      → GNN link prediction (RGCN/CompGCN) offline; APPNP if fusing PPR + features
```

**Cost-based rules of thumb:**

- **Per-query, must be cheap** → BFS (bounded), beam search, PPR via **local push**, degree lookups, precomputed centralities. Never run exact betweenness or full-graph PageRank online.
- **Offline, precompute once** → PageRank, betweenness, closeness, eigenvector, community detection, GNN training. Store results as node properties.
- **Context-window discipline** → whatever you retrieve, end with a **top-k cutoff** driven by a relevance score (PPR and/or semantic). This is the pruning step that keeps prompts affordable.

**Tuning cheat-sheet:**

| Lever | Effect |
|---|---|
| PPR/PageRank **α ↑** (→0.9) | Explore further, more recall, more bloat |
| PPR/PageRank **α ↓** (→0.5) | Stay near seeds, more precision |
| Beam **width ↑** | Fewer missed branches, higher cost |
| Leiden **resolution ↑** | More, smaller communities (finer summaries) |
| BFS/DFS **hop cutoff** | Hard bound on neighborhood/chain size |
| GNN **layers ↑** (>3) | Bigger receptive field but over-smoothing risk |

---

## 8. Key Takeaways for Practitioners

1. **Model the graph as a weighted, typed property graph.** GraphRAG scoring needs edge weights, types, timestamps, and provenance as first-class fields. Pick an LPG store (Neo4j, Kùzu, Memgraph); if you inherit RDF, project it into weighted edges first.

2. **Every algorithm here is a pruning strategy.** The finite, expensive LLM context window is the real constraint. Traversal decides *what to reach*, PageRank/centrality decide *what matters*, community detection decides *what to summarize*. All of it exists to answer "which few dozen of millions of nodes go in the prompt?"

3. **Personalized PageRank (with local push) is your ranking workhorse.** It solves BFS's context-bloat problem by *scoring* the neighborhood instead of *including* it. Blend it with semantic similarity: `λ·PPR + (1−λ)·cosine`. Tune `λ` and `α` on a real eval set.

4. **Split work into offline vs query-time.** Precompute the expensive, query-agnostic signals (global PageRank, betweenness, closeness, communities, GNN embeddings) as node properties. At query time, only run cheap things: bounded BFS/beam, local-push PPR, and O(1) property lookups.

5. **Match traversal to the question shape.** Local context → bounded BFS. Connection → bidirectional / Dijkstra. Focused multi-hop → beam. Corpus themes → community summaries. Using the wrong traversal yields either bloated or incomplete context — the two dominant GraphRAG failure modes.

6. **Prefer Leiden over Louvain** for community detection — Louvain can emit internally-disconnected communities that corrupt community summaries. Resolution controls summary granularity.

7. **Use the production-safe descendants of eigenvector centrality on directed graphs** — Katz or PageRank, not plain eigenvector centrality (which misbehaves on sinks / may not converge).

8. **2–3 hops is the recurring horizon.** It shows up as the useful BFS/DFS cutoff, the practical bidirectional depth, *and* the GNN layer count (beyond which over-smoothing kicks in). Deeper connections are usually neither meaningful to users nor helpful to models.

9. **Reach for GNNs only when simpler signals plateau.** Precomputed PPR + good text embeddings clear most bars. GNNs add real value for **link prediction / KG completion** (densifying sparse KGs) and learned structural embeddings — but they bring training infra, drift, and serving cost. APPNP is the elegant bridge when you do commit.

10. **Verify complexity before you promise latency.** Exact betweenness is O(V·E) and will not run online on a large KG. Uncapped simple-path enumeration is exponential. Dijkstra breaks on negative weights. Knowing the Big-O is what separates a design that ships from one that times out in production.

---

*End of guide.*

---

## Related Guides

**Prerequisites:** [Graph Theory](/docs/graph-theory) · [Shortest Path Algorithms](/docs/shortest-path)  
**See also:** [Graph Theory](/docs/graph-theory) · [Shortest Path Algorithms](/docs/shortest-path) · [Approximate Nearest Neighbor Search](/docs/ann-search) · [State Machines & DAGs for Agents (LangGraph)](/docs/state-machines-dags-langgraph)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
