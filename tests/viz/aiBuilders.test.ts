import {describe, it, expect} from 'vitest';
import {hnswGreedySearchFrames, SAMPLE_HNSW_GRAPH} from '../../src/components/viz/algorithms/hnsw';
import {kvCacheGrowthFrames} from '../../src/components/viz/algorithms/kvcache';
import {validateFrames} from '../../src/components/viz/validate';
import type {GraphFrame, MatrixFrame} from '../../src/components/viz/model';

describe('hnswGreedySearchFrames', () => {
  it('produces valid graph frames', () => {
    const frames = hnswGreedySearchFrames(SAMPLE_HNSW_GRAPH, 'A', {x: 0.85, y: 0.5});
    expect(validateFrames(frames).valid).toBe(true);
    expect(frames.length).toBeGreaterThan(1);
  });

  it('greedy descent strictly decreases distance to the query each hop', () => {
    const query = {x: 0.85, y: 0.5};
    const frames = hnswGreedySearchFrames(SAMPLE_HNSW_GRAPH, 'A', query) as GraphFrame[];
    // The 'active' (current) node's distance-to-query should be non-increasing.
    const dists: number[] = [];
    for (const f of frames) {
      const active = f.nodes.find((n) => n.role === 'active' || n.role === 'done');
      if (active && active.value !== '' && active.value !== undefined) {
        dists.push(Number(active.value));
      }
    }
    for (let i = 1; i < dists.length; i++) {
      expect(dists[i]).toBeLessThanOrEqual(dists[i - 1] + 1e-9);
    }
  });

  it('converges to the true nearest neighbor on this convex-ish layout', () => {
    // query near H (0.9,0.45); greedy from A should reach H
    const frames = hnswGreedySearchFrames(SAMPLE_HNSW_GRAPH, 'A', {x: 0.85, y: 0.5}) as GraphFrame[];
    const last = frames[frames.length - 1];
    const done = last.nodes.find((n) => n.role === 'done');
    expect(done?.id).toBe('H');
  });

  it('includes a query marker node', () => {
    const frames = hnswGreedySearchFrames(SAMPLE_HNSW_GRAPH, 'A', {x: 0.5, y: 0.5}) as GraphFrame[];
    expect(frames[0].nodes.some((n) => n.id === '__query__')).toBe(true);
  });
});

describe('kvCacheGrowthFrames', () => {
  it('produces valid matrix frames', () => {
    const frames = kvCacheGrowthFrames(8);
    expect(validateFrames(frames).valid).toBe(true);
  });

  it('cache grows by exactly one row per decode step', () => {
    const steps = 6;
    const frames = kvCacheGrowthFrames(steps) as MatrixFrame[];
    // frame[0] is init (1 placeholder row); step frames grow 1..steps rows.
    // The final "done" frame has `steps` rows.
    const last = frames[frames.length - 1];
    expect(last.cells.length).toBe(steps);
    // the step frames (indices 1..steps) each add one row
    for (let t = 1; t <= steps; t++) {
      expect(frames[t].cells.length).toBe(t);
    }
  });

  it('newly written row is highlighted active in each step frame', () => {
    const frames = kvCacheGrowthFrames(4) as MatrixFrame[];
    for (let t = 1; t <= 4; t++) {
      const activeCells = (frames[t].highlights ?? []).filter((h) => h.role === 'active');
      // the active cells should all be on the newest row (index t-1)
      expect(activeCells.every((h) => h.row === t - 1)).toBe(true);
    }
  });
});
