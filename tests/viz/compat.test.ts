import {describe, it, expect} from 'vitest';
import {adaptLegacyFrame, adaptLegacyFrames} from '../../src/components/viz/legacyAdapter';
import {validateFrames} from '../../src/components/viz/validate';
import {DEMOS} from '../../src/components/viz/demos';
import type {ArrayFrame} from '../../src/components/viz/model';

describe('legacy adapter (backward compatibility)', () => {
  it('converts a legacy VizFrame into a valid ArrayFrame preserving data', () => {
    const legacy = {
      array: [2, 3, 5, 8],
      highlights: {0: 'active', 3: 'done'},
      pointers: {L: 0, R: 3},
      caption: 'Two Sum step',
    };
    const f = adaptLegacyFrame(legacy) as ArrayFrame;
    expect(f.kind).toBe('array');
    expect(f.array).toEqual([2, 3, 5, 8]);
    expect(f.highlights).toEqual({0: 'active', 3: 'done'});
    expect(f.pointers).toEqual({L: 0, R: 3});
    expect(f.caption).toBe('Two Sum step');
  });

  it('maps the legacy color vocabulary identically (active/compare/done/window)', () => {
    const f = adaptLegacyFrame({
      array: [1, 2, 3, 4],
      highlights: {0: 'active', 1: 'compare', 2: 'done', 3: 'window'},
    }) as ArrayFrame;
    expect(f.highlights).toEqual({0: 'active', 1: 'compare', 2: 'done', 3: 'window'});
  });

  it('falls back unknown legacy roles to "default" (matching old renderer)', () => {
    const f = adaptLegacyFrame({array: [1, 2], highlights: {0: 'mystery'}}) as ArrayFrame;
    expect(f.highlights).toEqual({0: 'default'});
  });

  it('produces frames that pass the generic validator', () => {
    // Mirrors the actual frame shapes used across the 15 .mdx consumers.
    const legacyFrames = [
      {array: [2, 3, 5, 8, 11, 15], pointers: {L: 0, R: 5}, caption: 'start'},
      {array: [2, 3, 5, 8, 11, 15], highlights: {0: 'active', 5: 'active'}, caption: 'compare ends'},
      {array: [2, 3, 5, 8, 11, 15], pointers: {L: 0, R: 4}, highlights: {0: 'done', 4: 'done'}, caption: 'found'},
    ];
    const adapted = adaptLegacyFrames(legacyFrames);
    expect(validateFrames(adapted).valid).toBe(true);
  });

  it('handles empty highlights/pointers gracefully', () => {
    const f = adaptLegacyFrame({array: [1, 2, 3]}) as ArrayFrame;
    expect(f.highlights).toEqual({});
    expect(f.pointers).toBeUndefined();
    expect(validateFrames([f]).valid).toBe(true);
  });
});

describe('demo registry (acceptance demos exercise shared infra)', () => {
  const requiredDemoIds = [
    'binary-search',
    'sorting',
    'bfs',
    'dijkstra',
    'tree-traversal',
    'heap-insert',
    'matmul',
    'hnsw',
    'kv-cache',
  ];

  it('exposes all required acceptance demos (incl. AI-systems demos)', () => {
    for (const id of requiredDemoIds) {
      expect(DEMOS.some((d) => d.id === id), `missing demo: ${id}`).toBe(true);
    }
  });

  it('every demo builds a non-empty, valid frame sequence', () => {
    for (const demo of DEMOS) {
      const frames = demo.build();
      expect(frames.length, `${demo.id} produced no frames`).toBeGreaterThan(0);
      const result = validateFrames(frames);
      expect(result.valid, `${demo.id} invalid: ${result.errors.join(', ')}`).toBe(true);
    }
  });

  it('demos cover all four frame kinds through one Visualizer', () => {
    const kinds = new Set(DEMOS.flatMap((d) => d.build().map((f) => f.kind)));
    expect(kinds).toContain('array');
    expect(kinds).toContain('graph');
    expect(kinds).toContain('tree');
    expect(kinds).toContain('matrix');
  });
});
