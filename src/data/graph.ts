// Pure, framework-agnostic query + validation layer over the concept graph.
// No React. Used by the UI, unit tests, and the CI validation script.

import {conceptGraph} from './concepts';
import {
  RELATION_TYPES,
  ACYCLIC_RELATIONS,
  type Concept,
  type ConceptEdge,
  type ConceptGraph,
  type LearningPath,
  type RelationType,
} from './conceptTypes';

const RELATION_SET = new Set<string>(RELATION_TYPES);

// ---------------------------------------------------------------------------
// Indexed access
// ---------------------------------------------------------------------------

const byId = new Map<string, Concept>(conceptGraph.concepts.map((c) => [c.id, c]));

export function getConcept(id: string): Concept | undefined {
  return byId.get(id);
}

export function allConcepts(): Concept[] {
  return conceptGraph.concepts;
}

export function allPaths(): LearningPath[] {
  return conceptGraph.paths;
}

/** Find the concept whose guide slug matches a docs route (for "on this page"). */
export function conceptForSlug(slug: string): Concept | undefined {
  const clean = slug.replace(/\/$/, '');
  return conceptGraph.concepts.find((c) => c.slug && c.slug.replace(/\/$/, '') === clean);
}

// ---------------------------------------------------------------------------
// Relationship queries
// ---------------------------------------------------------------------------

/** Outgoing edges of a given type from a concept. */
export function edgesOfType(id: string, type: RelationType): ConceptEdge[] {
  return (byId.get(id)?.edges ?? []).filter((e) => e.type === type);
}

/** Incoming edges of a given type pointing AT a concept (reverse lookup). */
export function incomingEdges(id: string, type?: RelationType): Array<{from: string; edge: ConceptEdge}> {
  const result: Array<{from: string; edge: ConceptEdge}> = [];
  for (const c of conceptGraph.concepts) {
    for (const e of c.edges) {
      if (e.to === id && (type === undefined || e.type === type)) {
        result.push({from: c.id, edge: e});
      }
    }
  }
  return result;
}

/** Direct prerequisites of a concept (the concepts it requires first). */
export function prerequisites(id: string): Concept[] {
  return edgesOfType(id, 'prerequisite')
    .map((e) => byId.get(e.to))
    .filter((c): c is Concept => Boolean(c));
}

/** All transitive prerequisites, in a valid learning order (topological). */
export function transitivePrerequisites(id: string): Concept[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const visit = (cur: string) => {
    for (const e of edgesOfType(cur, 'prerequisite')) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        visit(e.to);
        order.push(e.to);
      }
    }
  };
  visit(id);
  return order.map((x) => byId.get(x)!).filter(Boolean);
}

/**
 * "Learn next" recommendations, derived from actual graph relationships (not
 * random links). A concept B is recommended after A if:
 *   - A is a prerequisite of B (B builds on A), or
 *   - A is used-in / implemented-by / derived-into B (B is where A shows up), or
 *   - B is an alternative-to / benchmarked-against A (a natural comparison).
 * Ordered by difficulty then title for determinism.
 */
export function learnNext(id: string): Concept[] {
  const out = new Set<string>();

  // things that list A as a prerequisite → learn them next
  for (const {from} of incomingEdges(id, 'prerequisite')) out.add(from);
  // AI systems / structures where A is used or from which A is derived
  for (const {from, edge} of incomingEdges(id)) {
    if (edge.type === 'used-in' || edge.type === 'implements' || edge.type === 'derived-from') out.add(from);
  }
  // outgoing alternatives / benchmarks are natural comparisons
  for (const e of byId.get(id)?.edges ?? []) {
    if (e.type === 'alternative-to' || e.type === 'benchmarked-against' || e.type === 'optimized-by') out.add(e.to);
  }
  out.delete(id);
  const diffRank: Record<string, number> = {beginner: 0, intermediate: 1, advanced: 2};
  return [...out]
    .map((x) => byId.get(x)!)
    .filter(Boolean)
    .sort((a, b) => diffRank[a.difficulty] - diffRank[b.difficulty] || a.title.localeCompare(b.title));
}

/** "Where is this used in AI?" — free-text applications + used-in edge targets. */
export function whereUsedInAI(id: string): {applications: string[]; systems: Concept[]} {
  const c = byId.get(id);
  const systems = new Set<string>();
  // this concept is used-in these AI systems
  for (const {from, edge} of incomingEdges(id)) {
    if (edge.type === 'used-in') systems.add(from);
  }
  // and any ai-system it points to
  for (const e of c?.edges ?? []) {
    const t = byId.get(e.to);
    if (t?.kind === 'ai-system') systems.add(e.to);
  }
  systems.delete(id);
  return {
    applications: c?.aiApplications ?? [],
    systems: [...systems].map((x) => byId.get(x)!).filter(Boolean),
  };
}

/** The local neighborhood of a concept (for the graph visualization). */
export function neighborhood(id: string): {
  center: Concept;
  nodes: Concept[];
  links: Array<{from: string; to: string; type: RelationType}>;
} | null {
  const center = byId.get(id);
  if (!center) return null;
  const nodeIds = new Set<string>([id]);
  const links: Array<{from: string; to: string; type: RelationType}> = [];

  for (const e of center.edges) {
    nodeIds.add(e.to);
    links.push({from: id, to: e.to, type: e.type});
  }
  for (const {from, edge} of incomingEdges(id)) {
    nodeIds.add(from);
    links.push({from, to: id, type: edge.type});
  }
  return {
    center,
    nodes: [...nodeIds].map((x) => byId.get(x)!).filter(Boolean),
    links,
  };
}

/** The DSA → AI mapping rows (DSA concept → the AI systems that use it). */
export function dsaToAiMapping(): Array<{concept: Concept; systems: Concept[]}> {
  return conceptGraph.concepts
    .filter((c) => c.kind !== 'ai-system')
    .map((c) => ({concept: c, systems: whereUsedInAI(c.id).systems}))
    .filter((row) => row.systems.length > 0)
    .sort((a, b) => a.concept.title.localeCompare(b.concept.title));
}

// ---------------------------------------------------------------------------
// Validation (used by CI + tests)
// ---------------------------------------------------------------------------

export type GraphValidationResult = {valid: boolean; errors: string[]};

/** Detect a cycle among edges of the given (forbidden-to-cycle) type. */
function findCycle(graph: ConceptGraph, type: RelationType): string[] | null {
  const idset = new Set(graph.concepts.map((c) => c.id));
  const adj = new Map<string, string[]>();
  for (const c of graph.concepts) {
    adj.set(
      c.id,
      c.edges.filter((e) => e.type === type && idset.has(e.to)).map((e) => e.to),
    );
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of idset) color.set(id, WHITE);
  const stack: string[] = [];

  const dfs = (u: string): string[] | null => {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) {
        // found a back edge → cycle; return the loop portion of the stack
        const idx = stack.indexOf(v);
        return stack.slice(idx).concat(v);
      }
      if (color.get(v) === WHITE) {
        const cyc = dfs(v);
        if (cyc) return cyc;
      }
    }
    color.set(u, BLACK);
    stack.pop();
    return null;
  };

  for (const id of idset) {
    if (color.get(id) === WHITE) {
      const cyc = dfs(id);
      if (cyc) return cyc;
    }
  }
  return null;
}

/**
 * Validate the concept graph. Reports (not throws) every problem:
 *  - duplicate / invalid ids
 *  - edges referencing nonexistent concepts
 *  - invalid relationship types
 *  - cycles among acyclic relations (e.g. prerequisite)
 *  - learning-path steps referencing nonexistent concepts
 * Note: slug→guide resolution is checked separately by the CI script (which
 * has filesystem access); this pure validator covers everything else.
 */
export function validateConceptGraph(graph: ConceptGraph = conceptGraph): GraphValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const c of graph.concepts) {
    if (!c.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) {
      errors.push(`concept id "${c.id}" is not kebab-case`);
    }
    if (ids.has(c.id)) errors.push(`duplicate concept id "${c.id}"`);
    ids.add(c.id);
    if (!c.title) errors.push(`concept "${c.id}" is missing a title`);
    if (!c.definition) errors.push(`concept "${c.id}" is missing a definition`);
  }

  for (const c of graph.concepts) {
    const seenEdge = new Set<string>();
    for (const e of c.edges) {
      if (!RELATION_SET.has(e.type)) {
        errors.push(`concept "${c.id}" has invalid relation type "${e.type}"`);
      }
      if (!ids.has(e.to)) {
        errors.push(`concept "${c.id}" has an edge to nonexistent concept "${e.to}"`);
      }
      if (e.to === c.id) {
        errors.push(`concept "${c.id}" has a self-edge (${e.type})`);
      }
      const key = `${e.type}->${e.to}`;
      if (seenEdge.has(key)) errors.push(`concept "${c.id}" has a duplicate edge ${key}`);
      seenEdge.add(key);
    }
  }

  for (const rel of ACYCLIC_RELATIONS) {
    const cyc = findCycle(graph, rel);
    if (cyc) errors.push(`cycle detected in "${rel}" edges: ${cyc.join(' \u2192 ')}`);
  }

  for (const p of graph.paths) {
    if (!p.id || !p.title) errors.push(`learning path "${p.id}" is missing id/title`);
    if (!Array.isArray(p.steps) || p.steps.length < 2) {
      errors.push(`learning path "${p.id}" must have at least 2 steps`);
    }
    for (const step of p.steps ?? []) {
      if (!ids.has(step)) errors.push(`learning path "${p.id}" references nonexistent concept "${step}"`);
    }
  }

  return {valid: errors.length === 0, errors};
}
