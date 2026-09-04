import {describe, it, expect} from 'vitest';
import {binarySearchFrames, bubbleSortFrames} from '../../src/components/viz/algorithms/arrays';
import {bfsFrames, dijkstraFrames, type GraphInput} from '../../src/components/viz/algorithms/graphs';
import {inorderTraversalFrames, heapInsertFrames} from '../../src/components/viz/algorithms/trees';
import {matMulFrames} from '../../src/components/viz/algorithms/matrix';
import {validateFrames} from '../../src/components/viz/validate';
import type {ArrayFrame, GraphFrame, TreeFrame, MatrixFrame} from '../../src/components/viz/model';

const G: GraphInput = {
  nodes: [
    {id: 'A', x: 0.1, y: 0.5},
    {id: 'B', x: 0.4, y: 0.2},
    {id: 'C', x: 0.4, y: 0.8},
    {id: 'D', x: 0.8, y: 0.5},
  ],
  edges: [
    {from: 'A', to: 'B', weight: 2},
    {from: 'A', to: 'C', weight: 4},
    {from: 'B', to: 'D', weight: 3},
    {from: 'C', to: 'D', weight: 1},
  ],
};

describe('binarySearchFrames', () => {
  it('produces valid frames and ends in a "found" frame at the right index', () => {
    const frames = binarySearchFrames([1, 3, 5, 8, 11, 15], 11);
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1] as ArrayFrame;
    expect(last.operation).toBe('found');
    expect(last.caption).toMatch(/index 4/); // 11 is at index 4
  });
  it('ends in "not found" for an absent target', () => {
    const frames = binarySearchFrames([1, 3, 5], 4);
    const last = frames[frames.length - 1] as ArrayFrame;
    expect(last.operation).toBe('not found');
  });
  it('never mutates the input array (frames are snapshots)', () => {
    const input = [2, 4, 6];
    binarySearchFrames(input, 4);
    expect(input).toEqual([2, 4, 6]);
  });
});

describe('bubbleSortFrames', () => {
  it('produces valid frames whose final array is sorted', () => {
    const input = [5, 2, 8, 1, 4];
    const frames = bubbleSortFrames(input);
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1] as ArrayFrame;
    expect(last.array).toEqual([1, 2, 4, 5, 8]);
    expect(last.operation).toBe('done');
    expect(input).toEqual([5, 2, 8, 1, 4]); // input untouched
  });
  it('every step is a valid permutation of the input (no elements lost)', () => {
    const input = [3, 1, 2];
    const sortedInput = [...input].sort((a, b) => a - b);
    for (const f of bubbleSortFrames(input) as ArrayFrame[]) {
      expect([...f.array].sort((a, b) => a - b)).toEqual(sortedInput);
    }
  });
});

describe('bfsFrames', () => {
  it('produces valid graph frames and visits every reachable node', () => {
    const frames = bfsFrames(G, 'A') as GraphFrame[];
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1];
    // all nodes should be visited (role 'visited') at the end
    expect(last.nodes.every((n) => n.role === 'visited')).toBe(true);
  });
  it('assigns correct hop distances as node values', () => {
    const frames = bfsFrames(G, 'A') as GraphFrame[];
    const last = frames[frames.length - 1];
    const dist = Object.fromEntries(last.nodes.map((n) => [n.id, n.value]));
    expect(dist.A).toBe(0);
    expect(dist.B).toBe(1);
    expect(dist.C).toBe(1);
    expect(dist.D).toBe(2); // A->B->D or A->C->D, 2 hops
  });
});

describe('dijkstraFrames', () => {
  it('produces valid frames and correct final distances', () => {
    const frames = dijkstraFrames(G, 'A') as GraphFrame[];
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1];
    const dist = Object.fromEntries(last.nodes.map((n) => [n.id, n.value]));
    expect(dist.A).toBe(0);
    expect(dist.B).toBe(2);
    expect(dist.C).toBe(4);
    // shortest A->D = A->B->D (2+3=5) vs A->C->D (4+1=5); both are 5
    expect(dist.D).toBe(5);
  });
  it('highlights a shortest-path tree at the end', () => {
    const frames = dijkstraFrames(G, 'A') as GraphFrame[];
    const last = frames[frames.length - 1];
    expect(last.edges.some((e) => e.role === 'path')).toBe(true);
  });
});

describe('inorderTraversalFrames', () => {
  it('produces valid tree frames whose visit order is sorted', () => {
    // BST level-order: 8,3,10,1,6,null,14
    const frames = inorderTraversalFrames([8, 3, 10, 1, 6, null, 14]) as TreeFrame[];
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1];
    // reconstruct visit order from the `order` field
    const ordered = last.nodes
      .filter((n) => n.order !== undefined)
      .sort((a, b) => (a.order as number) - (b.order as number))
      .map((n) => Number(n.label));
    expect(ordered).toEqual([1, 3, 6, 8, 10, 14]); // sorted
  });
});

describe('heapInsertFrames', () => {
  it('produces valid frames and the final heap satisfies the min-heap property', () => {
    const frames = heapInsertFrames([1, 3, 6, 5, 9, 8], 2) as TreeFrame[];
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1];
    // rebuild the array from node ids (which are level-order indices)
    const arr: number[] = [];
    for (const n of last.nodes) arr[Number(n.id)] = Number(n.label);
    for (let i = 1; i < arr.length; i++) {
      const parent = (i - 1) >> 1;
      expect(arr[parent]).toBeLessThanOrEqual(arr[i]); // heap property
    }
  });
});

describe('matMulFrames', () => {
  it('produces valid frames and the final matrix equals A·B', () => {
    const frames = matMulFrames(
      [
        [1, 2],
        [3, 4],
      ],
      [
        [5, 6],
        [7, 8],
      ],
    ) as MatrixFrame[];
    expect(validateFrames(frames).valid).toBe(true);
    const last = frames[frames.length - 1];
    // [[1*5+2*7, 1*6+2*8],[3*5+4*7, 3*6+4*8]] = [[19,22],[43,50]]
    expect(last.cells).toEqual([
      [19, 22],
      [43, 50],
    ]);
  });
});
