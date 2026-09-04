// Pure frame builder visualizing KV-cache growth during autoregressive decoding.
// Each generated token appends one row of K (and V) per layer; the cache grows
// linearly with sequence length. We render the K cache as a matrix whose rows
// fill in one per decode step. Educational — a real cache is per-layer,
// per-head float tensors in GPU HBM. No React/DOM.

import type {MatrixFrame, HighlightRole} from '../model';

/**
 * Visualize the KV cache filling up as tokens are generated. `dModel` columns
 * (the key vector width, shown small for legibility), one new row per step.
 * The newly written row is highlighted 'active'; already-cached rows are 'done'.
 */
export function kvCacheGrowthFrames(steps: number, dModel = 6): MatrixFrame[] {
  const frames: MatrixFrame[] = [];
  const cache: number[][] = [];

  frames.push({
    kind: 'matrix',
    cells: [Array<number>(dModel).fill(0)], // placeholder empty row for layout
    rowHighlights: {0: 'default'},
    operation: 'init',
    caption: `KV cache empty. Each decode step appends one K row (width ${dModel} shown).`,
    invariant: 'Past keys/values never change → they can be cached, not recomputed.',
  });

  for (let t = 0; t < steps; t++) {
    // pseudo-deterministic "key vector" values just for display
    const row = Array.from({length: dModel}, (_, j) => ((t * 7 + j * 3) % 9) + 1);
    cache.push(row);
    const highlights = [];
    for (let j = 0; j < dModel; j++) highlights.push({row: t, col: j, role: 'active' as HighlightRole});
    const rowHl: Record<number, HighlightRole> = {};
    for (let r = 0; r < t; r++) rowHl[r] = 'done';
    frames.push({
      kind: 'matrix',
      cells: cache.map((r) => [...r]),
      highlights,
      rowHighlights: rowHl,
      operation: 'append K,V for new token',
      caption: `Step ${t + 1}: generate token ${t + 1}, append its key row. Cache now holds ${t + 1} rows.`,
      invariant: `Cache memory grows linearly: O(L·D) per layer (here L=${t + 1}).`,
    });
  }

  // final: emphasize linear growth
  const doneHl: Record<number, HighlightRole> = {};
  for (let r = 0; r < steps; r++) doneHl[r] = 'done';
  frames.push({
    kind: 'matrix',
    cells: cache.map((r) => [...r]),
    rowHighlights: doneHl,
    operation: 'done',
    caption: `Generated ${steps} tokens → ${steps} cached rows. Without the cache, step t would recompute all t keys (O(L²) total wasted work).`,
    invariant: 'KV cache trades O(L·D) memory for avoiding O(L²) recomputation.',
  });
  return frames;
}
