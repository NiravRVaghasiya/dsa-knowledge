// Validation for AlgoViz animation frames. Kept separate from the React
// component so it can be reused by content validation and unit tests.

export const VIZ_COLOR_KEYS = ['active', 'compare', 'done', 'window'] as const;
export type VizColorKey = (typeof VIZ_COLOR_KEYS)[number];

export type VizFrame = {
  array: number[];
  highlights?: Record<number, string>;
  pointers?: Record<string, number>;
  caption?: string;
};

export type FrameValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Validate a set of animation frames. Returns every problem found rather than
 * throwing on the first, so content authors get a complete report.
 */
export function validateFrames(frames: unknown): FrameValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(frames)) {
    return {valid: false, errors: ['frames must be an array']};
  }
  if (frames.length === 0) {
    return {valid: false, errors: ['frames must contain at least one frame']};
  }

  frames.forEach((frame, i) => {
    const where = `frame[${i}]`;
    if (typeof frame !== 'object' || frame === null) {
      errors.push(`${where} must be an object`);
      return;
    }
    const f = frame as Record<string, unknown>;

    if (!Array.isArray(f.array)) {
      errors.push(`${where}.array must be an array of numbers`);
    } else {
      const arr = f.array;
      if (!arr.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        errors.push(`${where}.array must contain only finite numbers`);
      }

      if (f.highlights !== undefined) {
        const h = f.highlights;
        if (typeof h !== 'object' || h === null) {
          errors.push(`${where}.highlights must be an object`);
        } else {
          for (const [idxKey, color] of Object.entries(h)) {
            const idx = Number(idxKey);
            if (!Number.isInteger(idx) || idx < 0 || idx >= arr.length) {
              errors.push(
                `${where}.highlights index "${idxKey}" is out of range (array length ${arr.length})`,
              );
            }
            if (!VIZ_COLOR_KEYS.includes(color as VizColorKey)) {
              errors.push(
                `${where}.highlights["${idxKey}"] has invalid color "${String(
                  color,
                )}" (expected one of ${VIZ_COLOR_KEYS.join(', ')})`,
              );
            }
          }
        }
      }

      if (f.pointers !== undefined) {
        const p = f.pointers;
        if (typeof p !== 'object' || p === null) {
          errors.push(`${where}.pointers must be an object`);
        } else {
          for (const [label, idx] of Object.entries(p)) {
            if (
              typeof idx !== 'number' ||
              !Number.isInteger(idx) ||
              idx < 0 ||
              idx >= arr.length
            ) {
              errors.push(
                `${where}.pointers["${label}"] must be an integer index within the array`,
              );
            }
          }
        }
      }
    }

    if (f.caption !== undefined && typeof f.caption !== 'string') {
      errors.push(`${where}.caption must be a string`);
    }
  });

  return {valid: errors.length === 0, errors};
}
