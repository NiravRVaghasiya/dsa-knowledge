---
title: State Machines & DAGs for Agents (LangGraph)
slug: /state-machines-dags-langgraph
sidebar_position: 7
sidebar_label: State Machines & DAGs for Agents (LangGraph)
description: >-
  Designing LangGraph agent systems grounded in finite-state-machine and DAG theory.
tags:
  - state-machine
  - dag
  - langgraph
  - agents
difficulty: advanced
reading_time: 32
prerequisites:
  - title: Graph Theory
    to: /docs/graph-theory
pagination_prev: domain-specific-dsa/graph-algorithms-kg-graphrag
pagination_next: domain-specific-dsa/streaming-caching
path_step: 30
---

# State Machines & DAGs for Agents: The LangGraph Mental Model

> **A single, self-contained engineering reference** for understanding, designing, and implementing LangGraph-based agent systems — grounded in the theory of finite-state machines and directed acyclic graphs, and connected to real DS/ML/AI/LLM pipeline practice. **Who this is for:** ML engineers, LLM/agent engineers, and technical leads who need more than a tutorial — the *why* behind the abstractions, the formal models underneath them, and the production scars that shape best practice.

---

## Table of Contents

1. [Foundational Concepts](#1-foundational-concepts)
2. [The LangGraph Mental Model](#2-the-langgraph-mental-model)
3. [LangGraph Deep Dive](#3-langgraph-deep-dive)
4. [Algorithms & Formal Models](#4-algorithms--formal-models)
5. [Patterns & Examples](#5-patterns--examples)
6. [Analogies & Intuition Builder](#6-analogies--intuition-builder)
7. [Expert Takeaways & Best Practices](#7-expert-takeaways--best-practices)
8. [Quick Reference Cheat Sheet](#8-quick-reference-cheat-sheet)

---

## 1. Foundational Concepts

> *Engineer's frame:* Before touching LangGraph, internalize two ideas. Almost every confusion about "why did my agent loop forever / skip a step / lose its memory" traces back to a fuzzy mental model of **state** and **control flow**. State machines give you the vocabulary for *what the system knows and where it is*; DAGs give you the vocabulary for *what must happen before what*. LangGraph is the fusion of the two.

### 1.1 State Machines

**Formal definition.** A **deterministic finite-state machine (DFA)** is a 5-tuple:

$$M = (Q, \Sigma, \delta, q_0, F)$$

- $Q$ — a finite set of **states**
- $\Sigma$ — a finite **input alphabet** (the events/signals the machine reacts to)
- $\delta: Q \times \Sigma \rightarrow Q$ — the **transition function**: given the current state and an input, it returns the next state
- $q_0 \in Q$ — the **start state**
- $F \subseteq Q$ — the set of **accepting (terminal) states**

The heart of the definition is $\delta$. A state machine *is* its transition function — everything else is bookkeeping. In the nondeterministic variant (NFA), $\delta$ maps to a **set** of possible next states; in a probabilistic/stochastic variant (e.g., a Markov chain) it maps to a distribution over next states. LLM agents are effectively **stochastic** state machines: the "input" is a model sample, so the same state can transition differently across runs.

**Intuitive explanation.** A state machine is a system that is *always in exactly one named situation*, and that moves between situations only through *explicitly allowed doors*. It cannot be in two states at once, and it cannot teleport to a state there is no door to. The machine has no free will — hand it a state and an input, and $\delta$ tells you exactly (or probabilistically) where it goes next.

**Two flavors you must distinguish:**

- **Finite-state automaton (FSA)** — pure control; state is just a label ("IDLE", "WAITING", "DONE").
- **Extended / hierarchical state machine** — the machine carries **extended state** (variables, memory, context) alongside the control state. Real agents are *always* extended state machines: the control state might be `"planning"`, but the extended state holds the conversation, scratchpad, retrieved documents, and retry counters.

> **Common misconception:** "State" means "the LLM's context window." No. In a well-designed agent, the *control state* (where we are in the workflow) and the *data state* (accumulated messages, tool outputs, counters) are distinct. Conflating them is the #1 cause of tangled agent code.

### 1.2 Directed Acyclic Graphs (DAGs)

**Formal definition.** A **directed graph** is a pair $G = (V, E)$ where $V$ is a set of **vertices (nodes)** and $E \subseteq V \times V$ is a set of ordered pairs called **directed edges**. An edge $(u, v)$ points *from* $u$ *to* $v$.

$G$ is a **directed acyclic graph (DAG)** if it contains **no directed cycle** — there is no sequence of edges $v_0 \rightarrow v_1 \rightarrow \dots \rightarrow v_0$ that returns to its start. Equivalently, and this is the property that makes DAGs useful:

> A directed graph is a DAG **if and only if** it admits a **topological ordering** — a linear ordering of vertices such that every edge $(u, v)$ has $u$ before $v$.

That "if and only if" is the whole point. **No cycles ⟺ a valid execution order exists.** If you can't topologically sort it, something depends on itself, directly or transitively.

**Intuitive explanation.** A DAG is a set of tasks with **dependencies** and **no circular dependencies**. Every edge says "this must finish before that starts." Because nothing loops back, you can always find *an order to do everything* and you can always identify which tasks are *independent* (and therefore parallelizable). Think dependency resolution: `make`, Spark job DAGs, Airflow, the module import graph, a spreadsheet's formula recalculation order.

**Key structural facts an engineer leans on:**

- **Topological sort** exists ⟺ acyclic. (Kahn's algorithm or DFS finishing-times, both $O(V + E)$.)
- **Sources** (in-degree 0) are entry points; **sinks** (out-degree 0) are terminal outputs.
- Nodes with **no path between them** are mutually independent → safe to run in **parallel**.
- The **longest path** through the DAG (the *critical path*) lower-bounds total latency even with infinite parallelism.

### 1.3 Why These Matter for AI Agents

An "agent" is, stripped of hype, a program that **decides its own next step**. That single sentence forces both concepts onto you:

- **Deciding a next step** is a **transition function**. The agent inspects its state (conversation, tool results, goal) and picks where to go. That is $\delta$. If you don't model this explicitly, your control flow hides inside a tangle of `if`/`while`/`try` blocks that nobody can reason about or observe.
- **Ordering the work** is a **graph**. "Retrieve, then rank, then generate, then critique" is a dependency graph. When there are no loops, it's a DAG and you get free parallelism and a guaranteed finish. When the agent needs to *reconsider* (reflect, retry, re-plan), you deliberately add a **cycle** — and now you've left pure-DAG territory and need the state machine's discipline (termination conditions, step counters) to stay safe.

The tension is the insight:

- **Pipelines want to be DAGs** — they should terminate, parallelize, and be easy to reason about.
- **Agents want cycles** — reflection, tool-use loops, and re-planning are inherently iterative.

> **The core problem LangGraph solves:** classic DAG orchestrators (Airflow, Prefect, plain function composition) forbid cycles, so they can't natively express "keep reasoning until done." Pure state-machine libraries handle cycles but give you no first-class notion of accumulated state flowing through a computation graph. **LangGraph is a cyclic, stateful graph** — a state machine whose transition structure is expressed as a graph, where the graph is *allowed* to have cycles but *defaults* to DAG-like discipline. It gives you the expressiveness of a state machine with the composability and observability of a graph.

| Concept | What it models | What it gives you | What it forbids |
| --- | --- | --- | --- |
| **State Machine** | Where the system *is* + how it moves | Explicit, inspectable control flow; cycles | Nothing structural — you must enforce termination |
| **DAG** | What depends on what | Guaranteed termination, topological order, parallelism | Cycles (so: no native loops/retries) |
| **LangGraph** | Both — stateful nodes + graph edges, cycles allowed | Cyclic reasoning *and* persistent state *and* observability | Nothing by default — discipline is on you (recursion limits, etc.) |

---


## 2. The LangGraph Mental Model

> *Engineer's frame:* The fastest way to "get" LangGraph is to stop thinking in terms of chains and start thinking in terms of **a shared whiteboard passed around a room of specialists**. Each specialist (node) reads the whiteboard, does one thing, writes an update back, and control passes to whoever the routing rules say is next. The whiteboard is the **state**; the specialists are **nodes**; the "who's next" rules are **edges**. Everything else is detail.

### 2.1 Core Abstractions

LangGraph has a deliberately small vocabulary. Master these five and the rest is API surface:

- **State** — a single, typed, shared data structure (usually a `TypedDict`) that every node reads from and writes to. It is the *extended state* of our state machine. There is exactly one state object per run (per thread), and it is the only thing that persists between nodes.
- **Node** — a plain function `(state) -> partial_state_update`. A node is a **pure-ish unit of work**: it receives the current state, does something (call an LLM, run a tool, transform data), and returns a *dict of the keys it wants to update*. It does **not** decide who runs next.
- **Edge** — a directed connection that determines control flow. A **normal edge** is unconditional (`A -> B` always). A **conditional edge** routes to different targets based on a function of the current state — this is the transition function delta, made explicit and inspectable.
- **`StateGraph`** — the builder object. You register nodes and edges against it, then `compile()` it into a runnable.
- **`START` / `END`** — sentinel nodes. `START` is q0 (the entry); `END` is the accepting state F (a terminal). Reaching `END` halts that path.

> **The one-sentence mental model:** *LangGraph is a state machine where the transition function is a graph you draw, nodes mutate a shared typed state, and cycles are legal — so you can express both DAG-shaped pipelines and looping agents in one formalism.*

**Why nodes return *partial* updates (a subtle but critical design choice):** a node returns only the keys it changed, and LangGraph merges that into the running state. By default a returned key **overwrites** the previous value. But if a state key is annotated with a **reducer** (e.g. `Annotated[list, add_messages]`), the return value is **combined** with the existing value instead of replacing it. This is how `messages` accumulates across an entire conversation without any node having to read-append-write the whole list. Reducers are the mechanism that makes state *flow* rather than *thrash*.

### 2.2 How State Flows

Picture one run:

1. The caller invokes the compiled graph with an **initial state** (e.g. `{"messages": [HumanMessage("...")]}`).
2. Control enters at `START` and follows the edge to the first node.
3. Each node receives the **current merged state**, returns a **partial update**, and LangGraph applies that update using each key's reducer (overwrite by default, combine if a reducer is set).
4. LangGraph consults the **outgoing edge(s)** of the node just executed to decide the next node. For a conditional edge, it calls your routing function with the *post-update* state.
5. This repeats until control reaches `END` (or the recursion limit trips).

The mental picture is a **single object being threaded through a graph**, growing and mutating as it goes. Contrast this with a LangChain "chain," where data is passed positionally from one step's output to the next step's input — there is no shared, named, persistent state you can inspect at any point. LangGraph's state is **addressable**: at any node you know exactly what `state["messages"]` or `state["retry_count"]` is.

**Channels and concurrency.** Under the hood each state key is a **channel**. When two nodes run in parallel (fan-out) and both write the same channel, the reducer defines how those writes combine — without a reducer, concurrent writes to the same key are a conflict. This is why parallel/multi-agent designs *require* you to think about reducers up front, not as an afterthought.

### 2.3 Cycles vs. Acyclic Paths

This is the decision that separates a *pipeline* from an *agent*.

**Use acyclic (DAG) structure when:**

- The work is a fixed sequence or fan-out/fan-in with a known end: `ingest -> chunk -> embed -> index`, or `retrieve -> (rerank || summarize) -> generate`.
- You want **guaranteed termination** and easy reasoning about latency (critical path).
- Steps are independent -> exploit **parallelism** (LangGraph runs nodes with no path between them concurrently).

**Introduce a cycle when the agent must *reconsider*:**

- **Tool-use loop** — `agent -> tool -> agent -> tool -> ... -> END`. The model calls a tool, sees the result, decides whether to call another. This is the canonical ReAct loop and it is *inherently cyclic*.
- **Self-reflection / critique-retry** — `generate -> critique -> (revise -> critique)* -> END`.
- **Re-planning** — an executor loops back to a planner when a step fails.

**The price of cycles:** a DAG cannot run forever, but a cyclic graph can. The moment you add a back-edge you have taken on a **termination obligation**. LangGraph enforces a **`recursion_limit`** (default 25 supersteps) as a safety net that raises `GraphRecursionError` — but that is a circuit breaker, *not* your termination logic. Your *own* logic (a conditional edge that routes to `END` when `done` is true, or when `retry_count >= max`) is what should actually stop the loop. Relying on the recursion limit to end a loop is an anti-pattern (see section 7.2).

> **Rule of thumb:** Draw the DAG first. Add a cycle only where the agent genuinely needs to revisit a decision, and pair every cycle with an explicit, state-based exit condition *in the same breath*.

---

## 3. LangGraph Deep Dive

> *Engineer's frame:* The API is small; the misunderstandings are large. The two things that trip up experienced engineers are (1) **who decides control flow** (edges, never nodes) and (2) **how state merges** (reducers, not manual mutation). Keep those straight and the rest is mechanical.

### 3.1 Key Components (StateGraph, Nodes, Edges)

**`StateGraph(StateSchema)`** — the builder. It is parameterized by the **state schema** (a `TypedDict`, dataclass, or Pydantic model). Everything registered against it must respect that schema.

**Nodes** — registered with `graph.add_node("name", fn)`. The function signature is `fn(state) -> dict`. Rules that matter in practice:

- A node returns a **dict of updates**, not the whole state. Returning `{}` (or `None`) means "no change."
- A node should be **idempotent-friendly and side-effect-aware** — with checkpointing and retries, a node may be re-executed. Don't assume exactly-once unless you've configured for it.
- Node names are strings and must be unique; you reference them by name in edges.

**Edges** — three kinds:

1. **Entry edge:** `graph.add_edge(START, "first_node")` — defines q0.
2. **Normal edge:** `graph.add_edge("A", "B")` — unconditional hand-off.
3. **Conditional edge:** `graph.add_conditional_edges("A", router_fn, path_map)` — `router_fn(state)` returns a key (or a node name), and `path_map` maps that key to the destination node. This *is* the transition function delta.

```python
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]   # reducer: append, don't overwrite
    next_step: str

def planner(state: AgentState) -> dict:
    # ... call LLM to plan ...
    return {"messages": [ai_plan_message], "next_step": "execute"}

def executor(state: AgentState) -> dict:
    # ... do the work ...
    return {"messages": [ai_result_message]}

builder = StateGraph(AgentState)
builder.add_node("planner", planner)
builder.add_node("executor", executor)
builder.add_edge(START, "planner")
builder.add_edge("planner", "executor")
builder.add_edge("executor", END)
app = builder.compile()
```

### 3.2 AgentState Design

The state schema is the **single most important design decision** in a LangGraph system — it is your data contract. Guidelines drawn from production use:

- **Model the control state explicitly** when you need it. A `next_step: str` or `status: Literal["planning","acting","done"]` field turns implicit control flow into inspectable data. This is the FSA control state living *inside* the extended state.
- **Choose reducers deliberately, per key.** `messages` almost always wants `add_messages` (append + dedupe by id + handle updates). Counters want a custom `operator.add` or a `lambda old, new: old + new`. Scalars you want to overwrite need *no* reducer.
- **Keep the state flat and typed.** Deeply nested state makes reducers and partial updates painful. Prefer several top-level keys over one giant nested dict.
- **Separate durable from scratch.** Fields you want to survive and be checkpointed (conversation, decisions) vs. transient scratch (a temp variable one node passes to the next). Consider whether scratch belongs in state at all.

```python
from typing import TypedDict, Annotated, Literal
import operator
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]      # combine (append)
    retrieved_docs: list                          # overwrite each retrieval
    retry_count: Annotated[int, operator.add]     # accumulate
    status: Literal["planning", "acting", "reflecting", "done"]  # overwrite
```

`add_messages` is worth understanding precisely: it appends new messages, but if an incoming message shares an `id` with an existing one it **updates in place** rather than duplicating. This is what makes streaming partial updates and message edits behave correctly.

### 3.3 Conditional Routing

Conditional edges are how an agent *decides its own next step*. The pattern:

```python
from typing import Literal

def route(state: AgentState) -> Literal["tools", "reflect", "__end__"]:
    last = state["messages"][-1]
    if getattr(last, "tool_calls", None):   # model asked for a tool
        return "tools"
    if state.get("needs_review") and state["retry_count"] < 3:
        return "reflect"
    return "__end__"

builder.add_conditional_edges(
    "agent",
    route,
    {"tools": "tools", "reflect": "reflect", "__end__": END},
)
```

Notes that save debugging hours:

- The router returns a **routing key**; the `path_map` translates it to a node. Returning `END` (or the `"__end__"` sentinel) terminates that path.
- A router can return a **list** of targets to **fan out** to several nodes in parallel.
- Prefer `Send` (`from langgraph.constants import Send`) for **dynamic fan-out** — e.g. map over N retrieved documents, spawning one node invocation per document with its own scoped input. This is the idiomatic map-reduce / parallel-subgraph primitive.
- Keep routers **pure and cheap** — no LLM calls, no I/O. The LLM decision should already be *in the state* (e.g. the model's `tool_calls`); the router just reads it. A router that itself calls an LLM is slow, hard to test, and blurs the node/edge boundary.

### 3.4 Compilation & Execution

**`compile()`** validates and freezes the graph into a runnable `CompiledGraph`. This is where you attach cross-cutting concerns:

```python
from langgraph.checkpoint.memory import MemorySaver

app = builder.compile(
    checkpointer=MemorySaver(),              # persistence -> memory, time-travel, HITL
    interrupt_before=["tools"],              # pause for human approval before tools
)
```

- **`checkpointer`** — persists state after every superstep, keyed by a `thread_id`. This unlocks **conversation memory across invocations**, **human-in-the-loop** (pause, inspect, edit, resume), and **time-travel debugging** (replay from any checkpoint). In production you swap `MemorySaver` for `SqliteSaver` / `PostgresSaver`.
- **`interrupt_before` / `interrupt_after`** — declaratively pause execution at named nodes.

**`invoke(input, config)`** — run to completion, return the final state.

```python
config = {"configurable": {"thread_id": "user-42"}, "recursion_limit": 50}
final_state = app.invoke({"messages": [HumanMessage("Plan my week")]}, config)
```

**`stream(input, config, stream_mode=...)`** — run and yield intermediate results as they happen. Modes you actually use:

- `stream_mode="updates"` — yields each node's state delta as it finishes (best for observability/debugging: you see the path the graph took).
- `stream_mode="values"` — yields the full state after each step.
- `stream_mode="messages"` — token-level streaming of LLM output (best for UIs).

```python
for chunk in app.stream({"messages": [HumanMessage("...")]}, config,
                        stream_mode="updates"):
    print(chunk)   # {"planner": {...}}, then {"executor": {...}}, ...
```

- **`config`** carries `thread_id` (which checkpoint lineage to use), `recursion_limit` (superstep cap), and arbitrary `configurable` values your nodes can read. Async variants `ainvoke` / `astream` exist and matter when nodes do concurrent I/O.

> **Superstep model (important for reasoning about parallelism):** LangGraph executes in **supersteps** (BSP-style). Within one superstep, all currently-active nodes run (potentially in parallel); their state writes are then merged via reducers; then the next set of active nodes is computed from the edges. The `recursion_limit` counts **supersteps**, not nodes — a fan-out of 5 parallel nodes is *one* superstep, not five.

---

## 4. Algorithms & Formal Models

> *Engineer's frame:* You don't need graph theory to *use* LangGraph, but you need it to *debug* LangGraph. "Why did both branches run?" "Why did it stop?" "What's my worst-case latency?" are all answered by the formal model below.

### 4.1 State Transition Functions

An agent's step is a transition function. In LangGraph terms:

$$\delta:\; (s_{\text{state}},\; n_{\text{current node}}) \;\longrightarrow\; (s',\; n_{\text{next}})$$

decomposed into two learnable halves:

1. **Node application (data transition):** `s' = merge(s, node_fn(s))`
   The node computes a partial update; `merge` applies each key's reducer.

$$s'[k] = \begin{cases} \text{reducer}_k(s[k],\, u[k]) & \text{if key } k \text{ has a reducer and } k \in u \\ u[k] & \text{if } k \in u \text{ and no reducer (overwrite)} \\ s[k] & \text{if } k \notin u \end{cases}$$

   where `u = node_fn(s)` is the returned partial update.

2. **Edge evaluation (control transition):** `n_next = route(s')`
   For a normal edge this is a constant; for a conditional edge it is your router function evaluated on the *post-merge* state.

This clean split — **data transition then control transition** — is the whole execution semantics. Write it on a whiteboard when an agent misbehaves; the bug is almost always in one half or the other.

### 4.2 Graph Traversal in Agent Context

Classic traversal maps directly onto agent execution:

- **DFS (depth-first)** ~ a **single-path agent** that commits to one line of reasoning, going deep (plan -> act -> act -> act) before it would ever backtrack. Cheap in breadth, risky if the early commitment was wrong. ReAct is essentially guided DFS with the LLM choosing the branch.
- **BFS (breadth-first)** ~ **explore-all-options** agents: fan out to several candidate actions/tools at the same depth, evaluate, then expand the best. **Tree-of-Thoughts** and beam-search-style agents are BFS-flavored.
- **Topological order** ~ the **execution schedule of a DAG pipeline**: every node runs only after its dependencies, and independent nodes run together.

**LangGraph's actual scheduler is neither pure BFS nor DFS — it is a superstep (BSP) scheduler:**

```
active = {entry_node}
superstep = 0
while active and superstep < recursion_limit:
    # 1. Run every active node (independent ones concurrently)
    updates = { n: run(n, state) for n in active }      # parallel
    # 2. Merge all updates via per-key reducers
    for n, u in updates.items():
        state = merge(state, u)
    # 3. Compute next active set from outgoing edges (post-merge state)
    active = set()
    for n in updates:
        active |= resolve_edges(n, state)   # normal + conditional; may be {END}
    active.discard(END)
    superstep += 1
```

Reading this pseudocode answers the three FAQ debugging questions: both branches run because `resolve_edges` returned two targets into `active`; it stopped because `active` became empty (everything routed to `END`) or `superstep` hit the limit.

### 4.3 Execution Loop Pseudocode

A more complete, annotated model of a compiled graph's `invoke`, including checkpointing:

```
function INVOKE(graph, initial_input, config):
    state       <- merge(empty_state, initial_input)       # apply reducers to input
    active      <- resolve_edges(START, state)              # entry nodes
    step        <- 0
    limit       <- config.recursion_limit (default 25)

    while active is not empty:
        if step >= limit:
            raise GraphRecursionError                       # circuit breaker, not exit logic

        # ---- SUPERSTEP ----
        pending_writes <- []
        for node in active (concurrently):                  # BSP: all active nodes this step
            update <- node.fn(state)                        # (may be retried on failure)
            pending_writes.append((node, update))

        for (node, update) in pending_writes:               # deterministic merge order
            state <- merge(state, update)                   # per-key reducers

        if config.checkpointer:
            checkpointer.put(config.thread_id, state, step) # persist -> HITL / time-travel

        # ---- COMPUTE NEXT FRONTIER ----
        next_active <- empty set
        for (node, _) in pending_writes:
            targets <- resolve_edges(node, state)           # normal edge OR router(state)
            next_active <- next_active UNION targets
        active <- next_active MINUS {END}
        step  <- step + 1

    return state
```

Key invariants a senior engineer should be able to recite:

- **State is merged, never mutated in place** — nodes are (ideally) pure; the runtime owns merges. This is what makes checkpointing and replay sound.
- **Termination is `active == {}`** — reaching `END` from every live path. The recursion limit is a *safety net*, not the intended stop.
- **A superstep is the unit of parallelism and of checkpointing** — everything in one superstep commits together.

---

## 5. Patterns & Examples

> *Engineer's frame:* Four patterns cover the vast majority of real agent graphs. Learn to recognize which one a problem wants, and most "how do I structure this?" questions answer themselves. All examples use current LangGraph API conventions (`StateGraph`, `START`/`END`, reducers, `add_conditional_edges`).

### 5.1 Linear Agent Pipeline

The DAG baseline: a fixed sequence, guaranteed to terminate. Maps to a classic **RAG pipeline** or any deterministic multi-step transform.

```python
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class RAGState(TypedDict):
    question: str
    docs: list
    answer: str

def retrieve(state: RAGState) -> dict:
    docs = vector_store.similarity_search(state["question"], k=4)
    return {"docs": docs}

def generate(state: RAGState) -> dict:
    context = "\n\n".join(d.page_content for d in state["docs"])
    prompt = f"Context:\n{context}\n\nQuestion: {state['question']}"
    answer = llm.invoke(prompt).content
    return {"answer": answer}

builder = StateGraph(RAGState)
builder.add_node("retrieve", retrieve)
builder.add_node("generate", generate)
builder.add_edge(START, "retrieve")
builder.add_edge("retrieve", "generate")
builder.add_edge("generate", END)
rag = builder.compile()

result = rag.invoke({"question": "What is a topological sort?"})
print(result["answer"])
```

**Shape:** `START -> retrieve -> generate -> END`. A pure DAG. No router, no cycle. Use this whenever the steps are fixed and you don't need the model to choose the path.

### 5.2 Router / Branching Agent

The agent inspects state and **chooses** a branch. This is the classic **triage / router** pattern — cheap classification up front, specialized handling downstream. Common in DS/ML for routing a query to the right tool, index, or model.

```python
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END

class QueryState(TypedDict):
    question: str
    category: str
    answer: str

def classify(state: QueryState) -> dict:
    cat = llm.invoke(
        f"Classify as one of [sql, docs, chitchat]: {state['question']}"
    ).content.strip().lower()
    return {"category": cat}

def handle_sql(state):      return {"answer": run_text_to_sql(state["question"])}
def handle_docs(state):     return {"answer": rag_answer(state["question"])}
def handle_chitchat(state): return {"answer": llm.invoke(state["question"]).content}

def route(state: QueryState) -> Literal["sql", "docs", "chitchat"]:
    return state["category"] if state["category"] in {"sql","docs","chitchat"} else "chitchat"

builder = StateGraph(QueryState)
builder.add_node("classify", classify)
builder.add_node("sql", handle_sql)
builder.add_node("docs", handle_docs)
builder.add_node("chitchat", handle_chitchat)

builder.add_edge(START, "classify")
builder.add_conditional_edges("classify", route,
    {"sql": "sql", "docs": "docs", "chitchat": "chitchat"})
for leaf in ("sql", "docs", "chitchat"):
    builder.add_edge(leaf, END)

router_agent = builder.compile()
```

**Shape:** still acyclic (a DAG with a branch), but the *branch taken is data-dependent*. The conditional edge is the transition function delta made concrete.

### 5.3 Cyclic Self-Reflection Agent

Now we add a **back-edge** — and with it, a mandatory termination condition. This is the **generate -> critique -> revise** loop (a.k.a. Reflexion), plus the canonical **ReAct tool loop**.

```python
from typing import TypedDict, Annotated, Literal
import operator
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class ReflectState(TypedDict):
    messages: Annotated[list, add_messages]
    draft: str
    critique: str
    revisions: Annotated[int, operator.add]
    MAX: int

def generate(state: ReflectState) -> dict:
    draft = llm.invoke(state["messages"]).content
    return {"draft": draft, "messages": [("ai", draft)]}

def critique(state: ReflectState) -> dict:
    fb = llm.invoke(f"Critique. Reply 'OK' if good:\n{state['draft']}").content
    return {"critique": fb}

def revise(state: ReflectState) -> dict:
    better = llm.invoke(
        f"Revise using this critique:\n{state['critique']}\n\nDraft:\n{state['draft']}"
    ).content
    return {"draft": better, "revisions": 1, "messages": [("ai", better)]}

def should_continue(state: ReflectState) -> Literal["revise", "__end__"]:
    if state["critique"].strip().startswith("OK"):
        return "__end__"
    if state["revisions"] >= state["MAX"]:          # HARD stop -> never rely on recursion_limit
        return "__end__"
    return "revise"

builder = StateGraph(ReflectState)
builder.add_node("generate", generate)
builder.add_node("critique", critique)
builder.add_node("revise", revise)
builder.add_edge(START, "generate")
builder.add_edge("generate", "critique")
builder.add_conditional_edges("critique", should_continue,
    {"revise": "revise", "__end__": END})
builder.add_edge("revise", "critique")            # <-- the cycle: revise -> critique -> ...

reflect_agent = builder.compile()
result = reflect_agent.invoke(
    {"messages": [("human", "Write a haiku about DAGs")], "revisions": 0, "MAX": 3}
)
```

**Shape:** `generate -> critique -> (revise -> critique)* -> END`. The cycle lives between `critique` and `revise`. **Two independent exits** guard it: quality (`critique == OK`) and a bounded counter (`revisions >= MAX`). This is the disciplined way to loop — the graph *can* cycle, but your state-based logic guarantees it *won't* forever.

### 5.4 Multi-Agent DAG (Parallel Subgraphs)

Fan-out to independent specialist agents, then fan-in to synthesize — a DAG at the top level even though each subgraph may cycle internally. This is the **supervisor / map-reduce** pattern used for research assistants, multi-tool analysis, and ensemble reasoning.

```python
from typing import TypedDict, Annotated
import operator
from langgraph.graph import StateGraph, START, END

class ResearchState(TypedDict):
    topic: str
    # reducer combines parallel writes from independent branches:
    findings: Annotated[list, operator.add]
    report: str

def research_web(state):      return {"findings": [web_agent(state["topic"])]}
def research_papers(state):   return {"findings": [scholar_agent(state["topic"])]}
def research_internal(state): return {"findings": [kb_agent(state["topic"])]}

def synthesize(state: ResearchState) -> dict:
    joined = "\n\n".join(state["findings"])
    return {"report": llm.invoke(f"Synthesize a brief:\n{joined}").content}

builder = StateGraph(ResearchState)
for name, fn in [("web", research_web), ("papers", research_papers),
                 ("internal", research_internal)]:
    builder.add_node(name, fn)
builder.add_node("synthesize", synthesize)

# Fan-out: START -> all three run in ONE superstep (parallel)
builder.add_edge(START, "web")
builder.add_edge(START, "papers")
builder.add_edge(START, "internal")
# Fan-in: synthesize waits for ALL three, then runs once
builder.add_edge("web", "synthesize")
builder.add_edge("papers", "synthesize")
builder.add_edge("internal", "synthesize")
builder.add_edge("synthesize", END)

research = builder.compile()
out = research.invoke({"topic": "graph neural networks for fraud", "findings": []})
```

**Shape:** a diamond DAG — `START -> {web ∥ papers ∥ internal} -> synthesize -> END`. The three research nodes have no path between them, so LangGraph runs them **concurrently in a single superstep**. The `findings` reducer (`operator.add`) is *mandatory* here: three nodes write the same channel in parallel, and the reducer defines how those writes combine. Without it, concurrent writes conflict. For **dynamic** fan-out (N unknown at build time), use `Send` to spawn one invocation per item.

> **Composability note:** each specialist can itself be a compiled graph added as a node (`builder.add_node("web", web_subgraph)`). Subgraphs share the parent state schema (or map into it), which is how you build hierarchical multi-agent systems without a monolithic graph.

---

## 6. Analogies & Intuition Builder

> *Engineer's frame:* Analogies are load-bearing here — they compress the formal model into something you can recall under pressure while debugging at 2 a.m. Use them as retrieval hooks, not as the definition.

**State machines -> real-world finite-state systems:**

- **Traffic light** — states `{GREEN, YELLOW, RED}`; transitions fire on a timer (the input). It is *always in exactly one* state, and there is no `GREEN -> RED` door (you must pass through `YELLOW`). This is a pure FSA: the "memory" is just the current light. Maps to an agent's **control state** (`status`).
- **Vending machine** — now with **extended state**: control states `{IDLE, COLLECTING, DISPENSING}` *plus* a variable `balance`. The transition `COLLECTING -> DISPENSING` depends not just on the input (coin) but on whether `balance >= price`. This is exactly an agent: control state + accumulated data, and transitions that read both. When you add a `retry_count` guard to a loop, you are building the vending machine's `balance` check.
- **Turnstile** — the minimal two-state teaching example (`LOCKED`/`UNLOCKED`), useful for showing that the *same input* (push) does different things in different states. Agents inherit this: the same tool result routes differently depending on `status`.

**DAGs -> familiar dependency pipelines:**

- **Cooking a recipe** — chop, simmer, plate. You can chop onions *while* the stock heats (independent -> parallel), but you cannot plate before cooking (dependency -> edge). You never "un-cook," so there are no cycles. The **critical path** (the longest dependency chain, e.g. simmer 40 min) sets the minimum dinner time no matter how many hands help.
- **CI/CD pipeline** — `lint -> build -> {unit-tests ∥ integration-tests} -> deploy`. Tests fan out in parallel; deploy fans in and waits for all. A cycle here would be a bug (deploy triggering build triggering deploy).
- **Data / ETL pipeline** — `extract -> transform -> load`, or a Spark/Airflow job DAG. Topological order = valid run order; independent branches = parallel stages. This is the literal mental model for LangGraph's §5.1 and §5.4.
- **Spreadsheet recalculation** — cell formulas form a DAG; the engine topologically sorts them to know what to recompute and in what order. A circular reference is exactly a forbidden cycle.

**LangGraph -> a "living flowchart with memory":**

- **GPS with rerouting** — the single best analogy. It has a **goal** (destination), **persistent state** (your current position + route so far), it **re-evaluates at every junction** (conditional edges), and it will happily **loop you back** ("make a U-turn") when the state warrants — but it always drives *toward termination* (arrival). It is state-aware, cyclable, and goal-directed: exactly LangGraph.
- **A board game with a rulebook** — the board (graph) is fixed, your token sits on one square (current node), a shared scorepad (state) accumulates, and the rules (edges) — some fixed, some "roll to decide" (conditional) — tell you where the token moves next. Some squares send you back (cycles); the game ends when you reach the final square (`END`).
- **An assembly line where the product carries its own clipboard** — each station (node) reads the clipboard (state), does its job, writes results, and a router decides which station is next — including sending the product back for rework (the reflection loop).

| Concept | Analogy | What it teaches |
|---|---|---|
| FSA control state | Traffic light | Always in one state; only legal transitions |
| Extended state machine | Vending machine | Control state + variables; guards read both |
| DAG dependencies | Recipe / CI pipeline | Order + parallelism + no loops |
| Critical path | Simmer time in a recipe | Latency floor even with infinite workers |
| LangGraph | GPS with rerouting | Stateful, cyclic, goal-directed |

---

## 7. Expert Takeaways & Best Practices

> *Engineer's frame:* This is the section that separates a demo from a system. The failure modes below are the ones that actually page you.

### 7.1 Common Pitfalls

- **Conflating control state and data state.** Stuffing "where am I in the workflow" into the message list and re-parsing it every node. Fix: a dedicated typed `status` field. Control flow should be *data you can inspect*, not something you reverse-engineer from chat history.
- **Forgetting reducers on accumulated keys.** Symptom: `messages` gets *overwritten* each node and the agent "forgets" everything but the last turn. Fix: `Annotated[list, add_messages]`. This is the single most common LangGraph bug.
- **Reducer missing on a parallel-written key.** Symptom: `InvalidUpdateError` / "concurrent writes to channel" when nodes fan out. Fix: give the shared key a combining reducer (`operator.add`) *before* you fan out.
- **Routers that do real work.** Putting an LLM call or I/O inside a conditional-edge function. It's slow, untestable, non-deterministic, and breaks replay. Fix: the node produces a decision *into state*; the router is a pure `state -> key` read.
- **Unbounded loops.** A cycle whose only stop is `recursion_limit`. It "works" until a prompt change makes the model loop 30 times and you get `GraphRecursionError` in prod. Fix: an explicit counter + quality exit in the conditional edge (see §5.3).
- **Non-idempotent nodes under checkpointing.** A node that charges a card or sends an email, then gets replayed after a resume/retry -> duplicate side effect. Fix: make side-effecting nodes idempotent (idempotency keys) or gate them behind `interrupt_before` + explicit human approval.
- **Giant monolithic state.** One deeply nested dict everything writes to. Reducers and partial updates become unmanageable. Fix: flat, top-level, per-concern keys; subgraphs with scoped state.

### 7.2 Anti-Patterns

- **The "God node."** One node that plans, calls tools, critiques, and formats — the whole agent in a `while` loop inside a single function. You've thrown away everything LangGraph offers (observability, checkpointing, HITL, parallelism). If a node has an internal loop over LLM calls, it probably wants to *be* a subgraph.
- **Recursion limit as business logic.** Treating `GraphRecursionError` as "the agent finished." It's a crash, not a completion. Termination must be an explicit route to `END`.
- **Edges that encode data.** Creating dozens of near-duplicate nodes/edges to represent values that should live in state (e.g. a separate node per category instead of one node + a `category` field). Explosion of graph size, no reuse.
- **Hidden global state.** Nodes reading/writing module globals or external mutable singletons instead of the state object. Breaks parallelism, checkpointing, and replay determinism.
- **Streaming theater.** Streaming tokens to the UI while the underlying node still blocks on a synchronous 30 s tool call. Use async nodes (`ainvoke`/`astream`) so concurrency is real, not cosmetic.

### 7.3 Production Considerations

- **Observability first.** Instrument with **LangSmith** (or OpenTelemetry tracing). Use `stream_mode="updates"` to log the *path* the graph took per run — the executed node sequence is your most valuable debugging artifact. Log token counts and latency per node.
- **Durable checkpointing.** Use `SqliteSaver`/`PostgresSaver`, not `MemorySaver`, in production. Key checkpoints by a stable `thread_id`. This is what gives you crash recovery, multi-turn memory, and time-travel debugging.
- **Human-in-the-loop for consequential actions.** `interrupt_before=["execute_trade", "send_email"]`, inspect/edit state, then resume. Cheap insurance against a confidently wrong model.
- **Cost & latency budgeting.** The **critical path** (longest chain of dependent LLM/tool calls) is your latency floor — parallelize independent branches to shorten it. Each node that calls an LLM is a cost center; cache retrievals, prefer smaller models for routing/classification nodes, reserve the frontier model for synthesis.
- **Determinism & testing.** Nodes should be unit-testable pure functions of state. Test routers exhaustively (they're pure -> trivial to table-test). Pin model versions; snapshot-test whole-graph runs where feasible. Set temperature 0 for routing/classification nodes.
- **Bounded everything.** Recursion limit, per-node timeouts, max tool calls, max tokens. An agent is an *unbounded* program by nature; production means putting bounds back on.
- **Concurrency safety.** Every channel written by parallel branches needs a reducer whose combine is associative and commutative (order of parallel writes isn't guaranteed).

### 7.4 When NOT to Use LangGraph

Reach for something simpler when the extra machinery buys you nothing:

- **A single LLM call** (classify, summarize, extract). Just call the model. A graph is overhead.
- **A fixed, linear, acyclic chain with no state to persist** and no branching. LCEL / a plain function pipeline (`retrieve | prompt | llm | parse`) is lighter and clearer. Reach for LangGraph only when you need **cycles, persistent inspectable state, HITL, or dynamic routing**.
- **Pure data-engineering DAGs** (batch ETL, scheduled transforms) with no LLM-driven control flow. Use **Airflow / Prefect / Dagster** — they have mature scheduling, retries, backfills, and monitoring that LangGraph doesn't try to replace.
- **Hard real-time / ultra-low-latency** paths where the superstep + checkpoint overhead is unacceptable. Inline the logic.
- **Strict, auditable, non-looping business workflows** better served by a dedicated **workflow/BPMN engine** (Temporal, Step Functions) — unless the LLM decision-making is central, in which case combine them (LangGraph for the reasoning node inside a Temporal-managed workflow).

> **The decision heuristic:** *Do I need state that persists and is inspected, control flow the model decides at runtime, or cycles?* If **no** to all three -> a chain/function/single call. If **yes** to any -> LangGraph earns its keep.

---

## 8. Quick Reference Cheat Sheet

**Core mental model**

- **State machine** = states + transition function delta. **DAG** = dependencies, no cycles, topological order exists. **LangGraph** = a stateful graph that *allows* cycles = state machine expressed as a (possibly cyclic) graph.
- Nodes **do work** and return **partial state updates**. Edges **decide control flow**. Never mix the two.
- Reaching `END` from all live paths = termination. `recursion_limit` (default 25 *supersteps*) = safety net, not exit logic.

**API skeleton**

```python
from typing import TypedDict, Annotated, Literal
import operator
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

class State(TypedDict):
    messages: Annotated[list, add_messages]   # reducer: append
    count: Annotated[int, operator.add]       # reducer: accumulate
    status: str                               # no reducer: overwrite

def node(state: State) -> dict:               # (state) -> partial update
    return {"messages": [("ai", "...")], "count": 1}

def router(state: State) -> Literal["loop", "__end__"]:
    return "__end__" if state["count"] >= 3 else "loop"

b = StateGraph(State)
b.add_node("node", node)
b.add_edge(START, "node")                     # entry (q0)
b.add_conditional_edges("node", router, {"loop": "node", "__end__": END})
app = b.compile(checkpointer=MemorySaver())   # persistence -> memory/HITL/time-travel

cfg = {"configurable": {"thread_id": "t1"}, "recursion_limit": 25}
app.invoke({"messages": [("human", "hi")], "count": 0}, cfg)      # run to completion
for u in app.stream({"messages": [("human","hi")], "count": 0}, cfg,
                    stream_mode="updates"):    # observe the path
    print(u)
```

**Building blocks at a glance**

| Element | Call | Role |
|---|---|---|
| State schema | `class S(TypedDict): ...` | The shared, typed whiteboard |
| Reducer | `Annotated[T, fn]` | How parallel/sequential writes to a key combine |
| Node | `add_node("n", fn)` | Unit of work; returns partial update |
| Entry | `add_edge(START, "n")` | Start state q0 |
| Normal edge | `add_edge("a", "b")` | Unconditional hand-off |
| Conditional edge | `add_conditional_edges("a", router, map)` | The transition function delta |
| Terminate | route to `END` | Accepting state F |
| Fan-out (static) | multiple `add_edge(START, x)` | Parallel branches (one superstep) |
| Fan-out (dynamic) | `Send(node, scoped_input)` | Map over N items at runtime |
| Compile | `compile(checkpointer=..., interrupt_before=[...])` | Freeze + attach persistence/HITL |
| Run | `invoke` / `stream` (`+ a*` async) | Complete vs. incremental |

**Pattern -> shape**

| Pattern | Shape | Cyclic? | Use for |
|---|---|---|---|
| Linear pipeline | `START->a->b->END` | No (DAG) | RAG, fixed transforms |
| Router / branch | `classify -> {a\|b\|c} -> END` | No (DAG) | Triage, tool/model selection |
| Reflection / ReAct | `gen -> critique -> (revise ->)* END` | **Yes** | Retry, tool loops, self-correction |
| Multi-agent | `START -> {x\|y\|z} -> synth -> END` | No at top (subgraphs may cycle) | Research, ensembles, map-reduce |

**Termination checklist (every cycle)**

- [ ] Quality/goal exit (route to `END` when done)
- [ ] Bounded counter exit (`count >= MAX -> END`)
- [ ] Reducer on any parallel-written key
- [ ] `recursion_limit` set as backstop, *not* as the plan

**Comparison recap**

| Feature | State Machine | DAG | LangGraph |
|---|---|---|---|
| Cycles allowed | Yes | No | Both (default acyclic, cycles opt-in) |
| State persistence | Explicit (extended) | Implicit (data flows edge-to-edge) | Native (typed, checkpointed, reducer-merged) |
| Termination guarantee | You enforce it | Structural (always terminates) | You enforce it (+ recursion-limit backstop) |
| Parallelism | Not inherent | Natural (independent nodes) | Native (supersteps) |
| Agent suitability | Simple agents | Pipelines | Full agents (looping + stateful + observable) |

---

*End of reference. Keep the GPS analogy for intuition, the superstep pseudocode (§4.3) for debugging, and the termination checklist (§8) for every loop you ever write.*

---

## Related Guides

**Prerequisites:** [Graph Theory](/docs/graph-theory)  
**See also:** [Graph Theory](/docs/graph-theory) · [Graph Algorithms for KG & GraphRAG](/docs/graph-algorithms-kg-graphrag)

*Section: [Domain-Specific DSA](/docs/category/04-domain-specific-dsa) · [All guides](/)*
