import {describe, it, expect} from 'vitest';
import {validateFrame, validateFrames} from '../../src/components/viz/validate';
import type {Frame} from '../../src/components/viz/model';

describe('validateFrame — array', () => {
  it('accepts a well-formed array frame', () => {
    const f: Frame = {kind: 'array', array: [1, 2, 3], highlights: {0: 'active'}, pointers: {L: 1}};
    expect(validateFrame(f).valid).toBe(true);
  });
  it('rejects a highlight index out of range', () => {
    const f = {kind: 'array', array: [1, 2], highlights: {5: 'active'}};
    expect(validateFrame(f).valid).toBe(false);
  });
  it('rejects an unknown highlight role', () => {
    const f = {kind: 'array', array: [1], highlights: {0: 'magenta'}};
    const r = validateFrame(f);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/invalid role/);
  });
  it('rejects a pointer outside the array', () => {
    const f = {kind: 'array', array: [1, 2], pointers: {R: 9}};
    expect(validateFrame(f).valid).toBe(false);
  });
});

describe('validateFrame — graph', () => {
  it('accepts nodes + edges with valid endpoints', () => {
    const f: Frame = {
      kind: 'graph',
      nodes: [
        {id: 'A', x: 0, y: 0},
        {id: 'B', x: 1, y: 1, role: 'active'},
      ],
      edges: [{from: 'A', to: 'B', weight: 3, role: 'path'}],
    };
    expect(validateFrame(f).valid).toBe(true);
  });
  it('rejects an edge whose endpoint is not a node', () => {
    const f = {kind: 'graph', nodes: [{id: 'A', x: 0, y: 0}], edges: [{from: 'A', to: 'Z'}]};
    const r = validateFrame(f);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not a node id/);
  });
  it('rejects duplicate node ids', () => {
    const f = {kind: 'graph', nodes: [{id: 'A', x: 0, y: 0}, {id: 'A', x: 1, y: 1}], edges: []};
    expect(validateFrame(f).valid).toBe(false);
  });
});

describe('validateFrame — tree', () => {
  it('accepts a single-rooted tree', () => {
    const f: Frame = {
      kind: 'tree',
      nodes: [
        {id: '0', depth: 0, parent: null},
        {id: '1', depth: 1, parent: '0'},
      ],
    };
    expect(validateFrame(f).valid).toBe(true);
  });
  it('rejects a forest (two roots)', () => {
    const f = {
      kind: 'tree',
      nodes: [
        {id: '0', depth: 0, parent: null},
        {id: '1', depth: 0, parent: null},
      ],
    };
    const r = validateFrame(f);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/exactly one root/);
  });
  it('rejects a dangling parent reference', () => {
    const f = {kind: 'tree', nodes: [{id: '0', depth: 0, parent: 'x'}]};
    // one root missing AND bad parent -> invalid either way
    expect(validateFrame(f).valid).toBe(false);
  });
});

describe('validateFrame — matrix', () => {
  it('accepts a rectangular matrix with a valid cell highlight', () => {
    const f: Frame = {
      kind: 'matrix',
      cells: [
        [1, 2],
        [3, 4],
      ],
      highlights: [{row: 0, col: 1, role: 'active'}],
    };
    expect(validateFrame(f).valid).toBe(true);
  });
  it('rejects a ragged matrix', () => {
    const f = {kind: 'matrix', cells: [[1, 2], [3]]};
    const r = validateFrame(f);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/ragged/);
  });
  it('rejects an out-of-range cell highlight', () => {
    const f = {kind: 'matrix', cells: [[1]], highlights: [{row: 3, col: 3, role: 'active'}]};
    expect(validateFrame(f).valid).toBe(false);
  });
});

describe('validateFrames', () => {
  it('rejects a non-array', () => {
    expect(validateFrames({} as unknown).valid).toBe(false);
  });
  it('rejects an empty list', () => {
    expect(validateFrames([]).valid).toBe(false);
  });
  it('rejects an unknown frame kind', () => {
    const r = validateFrames([{kind: 'bogus'}]);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not a known frame kind/);
  });
});
