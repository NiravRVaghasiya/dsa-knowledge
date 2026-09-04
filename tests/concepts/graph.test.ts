import {describe, it, expect} from 'vitest';
import {conceptGraph} from '../../src/data/concepts';
import type {ConceptGraph} from '../../src/data/conceptTypes';
import {
  validateConceptGraph,
  allConcepts,
  allPaths,
  getConcept,
  conceptForSlug,
  prerequisites,
  transitivePrerequisites,
  learnNext,
  whereUsedInAI,
  neighborhood,
  dsaToAiMapping,
  edgesOfType,
} from '../../src/data/graph';

// Deep clone so injected-invalid mutations never touch the real graph.
const clone = (): ConceptGraph => JSON.parse(JSON.stringify(conceptGraph));

describe('concept graph — real data validity', () => {
  it('validates cleanly (no bad refs, types, cycles, or path errors)', () => {
    const r = validateConceptGraph();
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
  });

  it('has a substantial set of concepts and the 4 learning paths', () => {
    expect(allConcepts().length).toBeGreaterThanOrEqual(30);
    const pathIds = allPaths().map((p) => p.id).sort();
    expect(pathIds).toEqual(
      ['ai-retrieval-engineer', 'dsa-for-ai-engineers', 'dsa-fundamentals', 'llm-systems-engineer'].sort(),
    );
  });

  it('every edge target and path step references an existing concept', () => {
    const ids = new Set(allConcepts().map((c) => c.id));
    for (const c of allConcepts()) {
      for (const e of c.edges) expect(ids.has(e.to), `${c.id} -> ${e.to}`).toBe(true);
    }
    for (const p of allPaths()) {
      for (const s of p.steps) expect(ids.has(s), `path ${p.id} step ${s}`).toBe(true);
    }
  });
});

describe('concept graph — validator detects injected-invalid states', () => {
  it('flags an edge to a nonexistent concept', () => {
    const g = clone();
    g.concepts[0].edges.push({to: 'does-not-exist', type: 'related-to'});
    const r = validateConceptGraph(g);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/nonexistent concept "does-not-exist"/);
  });

  it('flags an invalid relationship type', () => {
    const g = clone();
    // @ts-expect-error intentionally invalid type for the test
    g.concepts[0].edges.push({to: g.concepts[1].id, type: 'sorta-related'});
    const r = validateConceptGraph(g);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/invalid relation type "sorta-related"/);
  });

  it('flags a forbidden prerequisite cycle', () => {
    const g = clone();
    const a = g.concepts[0].id;
    const b = g.concepts[1].id;
    g.concepts[0].edges.push({to: b, type: 'prerequisite'});
    g.concepts[1].edges.push({to: a, type: 'prerequisite'});
    const r = validateConceptGraph(g);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/cycle detected in "prerequisite"/);
  });

  it('flags a self-edge', () => {
    const g = clone();
    g.concepts[0].edges.push({to: g.concepts[0].id, type: 'related-to'});
    const r = validateConceptGraph(g);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/self-edge/);
  });

  it('flags a duplicate concept id', () => {
    const g = clone();
    g.concepts.push({...g.concepts[0]});
    const r = validateConceptGraph(g);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/duplicate concept id/);
  });

  it('flags a path referencing a nonexistent concept', () => {
    const g = clone();
    g.paths[0].steps.push('ghost-concept');
    const r = validateConceptGraph(g);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/references nonexistent concept "ghost-concept"/);
  });
});

describe('concept graph — query helpers', () => {
  it('getConcept / conceptForSlug round-trip on a known concept', () => {
    const hm = getConcept('hash-map');
    expect(hm).toBeDefined();
    if (hm?.slug) {
      const back = conceptForSlug(hm.slug);
      expect(back?.id).toBe('hash-map');
    }
  });

  it('transitivePrerequisites returns a valid topological order (deps before dependents)', () => {
    for (const c of allConcepts()) {
      const chain = transitivePrerequisites(c.id);
      const seen = new Set<string>();
      for (const dep of chain) {
        // every direct prerequisite of dep must already appear earlier in the chain
        for (const e of edgesOfType(dep.id, 'prerequisite')) {
          if (chain.some((x) => x.id === e.to)) {
            expect(seen.has(e.to), `${e.to} should precede ${dep.id}`).toBe(true);
          }
        }
        seen.add(dep.id);
      }
    }
  });

  it('prerequisites are a subset of transitivePrerequisites', () => {
    for (const c of allConcepts()) {
      const direct = prerequisites(c.id).map((x) => x.id);
      const all = new Set(transitivePrerequisites(c.id).map((x) => x.id));
      for (const d of direct) expect(all.has(d)).toBe(true);
    }
  });

  it('learnNext is derived from real relationships and excludes self', () => {
    const next = learnNext('hash-map');
    expect(Array.isArray(next)).toBe(true);
    expect(next.some((c) => c.id === 'hash-map')).toBe(false);
    // hash-map underpins several AI-facing structures, so it should recommend something
    expect(next.length).toBeGreaterThan(0);
  });

  it('learnNext is sorted by difficulty then title (deterministic)', () => {
    const rank: Record<string, number> = {beginner: 0, intermediate: 1, advanced: 2};
    for (const c of allConcepts()) {
      const next = learnNext(c.id);
      for (let i = 1; i < next.length; i++) {
        const a = next[i - 1], b = next[i];
        const ok = rank[a.difficulty] < rank[b.difficulty] ||
          (rank[a.difficulty] === rank[b.difficulty] && a.title.localeCompare(b.title) <= 0);
        expect(ok, `${a.id} before ${b.id}`).toBe(true);
      }
    }
  });

  it('whereUsedInAI surfaces applications and/or AI systems for key DSA concepts', () => {
    const {applications, systems} = whereUsedInAI('hash-map');
    expect(applications.length + systems.length).toBeGreaterThan(0);
  });

  it('neighborhood returns the center plus its direct neighbors only', () => {
    const hood = neighborhood('hash-map');
    expect(hood).not.toBeNull();
    expect(hood!.center.id).toBe('hash-map');
    expect(hood!.nodes.some((n) => n.id === 'hash-map')).toBe(true);
    // every link touches the center (local neighborhood, one hop)
    for (const l of hood!.links) {
      expect(l.from === 'hash-map' || l.to === 'hash-map').toBe(true);
    }
  });

  it('neighborhood returns null for an unknown concept', () => {
    expect(neighborhood('nope-not-real')).toBeNull();
  });

  it('dsaToAiMapping yields DSA (non-ai-system) rows that each map to >=1 AI system', () => {
    const rows = dsaToAiMapping();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.concept.kind).not.toBe('ai-system');
      expect(row.systems.length).toBeGreaterThan(0);
    }
  });
});

describe('concept graph — learning path integrity', () => {
  it('each path has >=2 unique, existing steps', () => {
    for (const p of allPaths()) {
      expect(p.steps.length).toBeGreaterThanOrEqual(2);
      expect(new Set(p.steps).size).toBe(p.steps.length);
      for (const s of p.steps) expect(getConcept(s), `${p.id} -> ${s}`).toBeDefined();
    }
  });

  it('each path has a title, description, and audience', () => {
    for (const p of allPaths()) {
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.audience).toBeTruthy();
    }
  });
});
