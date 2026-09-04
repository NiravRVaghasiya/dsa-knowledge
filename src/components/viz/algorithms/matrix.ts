// Pure frame builders for matrix algorithms. Matrix multiplication shows the
// row×column dot-product computation cell by cell; a generic heatmap builder
// supports attention/DP-style visualizations. No React/DOM.

import type {MatrixFrame, HighlightRole} from '../model';

function zeros(rows: number, cols: number): number[][] {
  return Array.from({length: rows}, () => Array<number>(cols).fill(0));
}

/**
 * C = A · B, visualized. For each output cell C[i][j] we highlight row i of A
 * (as a row highlight on the combined view is not possible across matrices, so
 * we visualize the *result* matrix C and annotate which row/col feed it).
 * The frames fill C one cell at a time, showing the running dot product.
 */
export function matMulFrames(A: number[][], B: number[][]): MatrixFrame[] {
  const n = A.length;
  const m = B[0].length;
  const k = B.length; // == A[0].length
  const C = zeros(n, m);
  const frames: MatrixFrame[] = [];

  frames.push({
    kind: 'matrix',
    cells: C.map((r) => [...r]),
    operation: 'init',
    caption: `Multiply A(${n}×${k}) · B(${k}×${m}) = C(${n}×${m}). Each C[i][j] is a dot product.`,
    invariant: 'C[i][j] = Σ A[i][t]·B[t][j] over t.',
  });

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      let sum = 0;
      const terms: string[] = [];
      for (let t = 0; t < k; t++) {
        sum += A[i][t] * B[t][j];
        terms.push(`${A[i][t]}·${B[t][j]}`);
      }
      C[i][j] = sum;
      frames.push({
        kind: 'matrix',
        cells: C.map((r) => [...r]),
        highlights: [{row: i, col: j, role: 'active' as HighlightRole}],
        rowHighlights: {[i]: 'window'},
        colHighlights: {[j]: 'window'},
        operation: 'dot product',
        caption: `C[${i}][${j}] = ${terms.join(' + ')} = ${sum}.`,
        invariant: 'Row i of A combines with column j of B.',
      });
    }
  }

  // final "done" frame: all cells settled
  const doneHl = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) doneHl.push({row: i, col: j, role: 'done' as HighlightRole});
  frames.push({
    kind: 'matrix',
    cells: C.map((r) => [...r]),
    highlights: doneHl,
    operation: 'done',
    caption: 'All cells computed. ✓',
    invariant: 'C fully populated with n·m dot products.',
  });
  return frames;
}

/**
 * Generic single-frame heatmap of a matrix (e.g. an attention map). Renders
 * cells shaded by value intensity. Useful when a static "intensity" view is
 * more instructive than a step-by-step animation.
 */
export function heatmapFrame(
  cells: number[][],
  meta: {caption?: string; operation?: string; invariant?: string} = {},
): MatrixFrame[] {
  return [
    {
      kind: 'matrix',
      cells: cells.map((r) => [...r]),
      heatmap: true,
      caption: meta.caption ?? 'Heatmap — darker cells carry higher weight.',
      operation: meta.operation,
      invariant: meta.invariant,
    },
  ];
}
