// Pure frame builders for array algorithms. No React, no DOM — each function
// runs the algorithm and records an immutable ArrayFrame per meaningful step.

import type {ArrayFrame, HighlightRole} from '../model';

function frame(
  array: number[],
  highlights: Record<number, HighlightRole>,
  meta: {caption?: string; operation?: string; invariant?: string; pointers?: Record<string, number>},
): ArrayFrame {
  return {
    kind: 'array',
    array: [...array], // copy: frames are immutable snapshots
    highlights: {...highlights},
    ...(meta.pointers ? {pointers: {...meta.pointers}} : {}),
    caption: meta.caption,
    operation: meta.operation,
    invariant: meta.invariant,
  };
}

/**
 * Binary search on a sorted array. Records the shrinking [lo, hi] window,
 * the probed midpoint, and the final result.
 */
export function binarySearchFrames(sorted: number[], target: number): ArrayFrame[] {
  const frames: ArrayFrame[] = [];
  let lo = 0;
  let hi = sorted.length - 1;

  frames.push(
    frame(sorted, {}, {
      operation: 'init',
      caption: `Searching for ${target} in a sorted array of ${sorted.length}.`,
      invariant: 'If present, target lies within [lo, hi].',
      pointers: {lo, hi},
    }),
  );

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const windowHl: Record<number, HighlightRole> = {};
    for (let i = lo; i <= hi; i++) windowHl[i] = 'window';
    windowHl[mid] = 'active';

    frames.push(
      frame(sorted, windowHl, {
        operation: 'probe midpoint',
        caption: `Check mid=${mid} (value ${sorted[mid]}) vs target ${target}.`,
        invariant: 'Everything outside [lo, hi] has been ruled out.',
        pointers: {lo, mid, hi},
      }),
    );

    if (sorted[mid] === target) {
      frames.push(
        frame(sorted, {[mid]: 'done'}, {
          operation: 'found',
          caption: `Found ${target} at index ${mid}. ✓`,
          invariant: 'Answer located; search complete.',
          pointers: {mid},
        }),
      );
      return frames;
    }
    if (sorted[mid] < target) {
      lo = mid + 1;
      frames.push(
        frame(sorted, windowHl, {
          operation: 'discard left half',
          caption: `${sorted[mid]} < ${target} → move lo to ${lo}.`,
          invariant: 'Left half (≤ mid) cannot contain a larger target.',
          pointers: {lo, hi},
        }),
      );
    } else {
      hi = mid - 1;
      frames.push(
        frame(sorted, windowHl, {
          operation: 'discard right half',
          caption: `${sorted[mid]} > ${target} → move hi to ${hi}.`,
          invariant: 'Right half (≥ mid) cannot contain a smaller target.',
          pointers: {lo, hi},
        }),
      );
    }
  }

  frames.push(
    frame(sorted, {}, {
      operation: 'not found',
      caption: `${target} is not in the array (lo passed hi).`,
      invariant: 'Search space is empty.',
    }),
  );
  return frames;
}

/**
 * Bubble sort. Records each compare and each swap, marking settled elements
 * as 'done' once they reach their final position.
 */
export function bubbleSortFrames(input: number[]): ArrayFrame[] {
  const a = [...input];
  const n = a.length;
  const frames: ArrayFrame[] = [];
  const settled: Record<number, HighlightRole> = {};

  frames.push(
    frame(a, {}, {
      operation: 'init',
      caption: 'Unsorted. Bubble sort compares adjacent pairs and swaps if out of order.',
      invariant: 'No suffix is sorted yet.',
    }),
  );

  for (let pass = 0; pass < n - 1; pass++) {
    for (let i = 0; i < n - pass - 1; i++) {
      frames.push(
        frame(a, {...settled, [i]: 'compare', [i + 1]: 'compare'}, {
          operation: 'compare',
          caption: `Compare ${a[i]} and ${a[i + 1]}.`,
          invariant: `The last ${pass} element(s) are already in final position.`,
        }),
      );
      if (a[i] > a[i + 1]) {
        [a[i], a[i + 1]] = [a[i + 1], a[i]];
        frames.push(
          frame(a, {...settled, [i]: 'active', [i + 1]: 'active'}, {
            operation: 'swap',
            caption: 'Out of order → swap.',
            invariant: 'The larger value bubbles toward the end.',
          }),
        );
      }
    }
    settled[n - pass - 1] = 'done';
    frames.push(
      frame(a, {...settled}, {
        operation: 'settle',
        caption: `Largest of this pass settles at index ${n - pass - 1}.`,
        invariant: `The last ${pass + 1} element(s) are now in final position.`,
      }),
    );
  }
  settled[0] = 'done';
  frames.push(
    frame(a, {...settled}, {
      operation: 'done',
      caption: 'Sorted! ✓',
      invariant: 'The whole array is sorted.',
    }),
  );
  return frames;
}
