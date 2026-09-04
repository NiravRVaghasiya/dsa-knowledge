// Type definitions for the DSA → AI concept knowledge graph.
//
// The graph is the signature data structure of this project: it encodes how
// classical DSA ideas flow into modern AI/ML/LLM systems. It is deliberately
// kept as plain, framework-agnostic data (no React) so it can be validated in
// CI, queried by pure functions, and unit-tested without a DOM.

/** The typed relationships between concepts. Not everything is "related-to". */
export const RELATION_TYPES = [
  'prerequisite', //  A must be understood before B          (A prerequisite-of B)
  'implements', //    A is implemented using B                (Priority Queue implements Heap)
  'derived-from', //  A is a specialization/evolution of B    (LRU Cache derived-from Hash Map)
  'used-in', //       A is used inside AI system B            (Heap used-in Beam Search)
  'alternative-to', // A and B solve the same problem         (HNSW alternative-to IVF)
  'optimized-by', //  A's cost is reduced by technique B      (Attention optimized-by FlashAttention)
  'related-to', //    weak association (use sparingly)
  'benchmarked-against', // A is compared against B in benchmarks
] as const;

export type RelationType = (typeof RELATION_TYPES)[number];

/**
 * Relationship types for which cycles are FORBIDDEN. A prerequisite cycle would
 * mean "you must learn A before B and B before A" — an unlearnable loop. CI
 * rejects any cycle among these edge types.
 */
export const ACYCLIC_RELATIONS: readonly RelationType[] = ['prerequisite'];

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** A category groups concepts for filtering and the DSA↔AI mapping. */
export type ConceptKind =
  | 'foundation' // core DSA primitive (hash map, array, heap, graph…)
  | 'algorithm' // a technique/algorithm (binary search, dijkstra…)
  | 'structure' // a data structure (trie, segment tree…)
  | 'ai-system'; // an AI/ML/LLM system or component (attention, RAG…)

/** A single typed, directed edge from this concept to another. */
export type ConceptEdge = {
  to: string; // target concept id (must exist)
  type: RelationType;
  /** Optional short note explaining the relationship. */
  note?: string;
};

/** A node in the concept graph. */
export type Concept = {
  /** Stable, unique, kebab-case id — the graph's primary key. */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Short category. */
  kind: ConceptKind;
  /** Difficulty tier. */
  difficulty: Difficulty;
  /** One-sentence definition shown on cards and the explorer. */
  definition: string;
  /** Headline complexity fact, e.g. "avg lookup O(1)". Optional for AI systems. */
  complexity?: string;
  /**
   * Route to the deep-dive guide, e.g. "/docs/hash-maps-and-sets". Every DSA
   * concept links to a real guide; some pure AI-system concepts may point at
   * the closest guide section.
   */
  slug?: string;
  /**
   * Concrete AI/ML/LLM applications (the "Where is this used?" list). Free-text
   * so it can be richer than the graph edges alone.
   */
  aiApplications?: string[];
  /** Typed, directed edges out of this concept. */
  edges: ConceptEdge[];
};

/** An ordered, curated learning path through the graph. */
export type LearningPath = {
  id: string;
  title: string;
  description: string;
  audience: string;
  /** Ordered list of concept ids. Each must exist in the graph. */
  steps: string[];
};

export type ConceptGraph = {
  concepts: Concept[];
  paths: LearningPath[];
};
