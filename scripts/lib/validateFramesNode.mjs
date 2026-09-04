// Node/ESM port of src/components/AlgoViz/validateFrames.ts, used by the
// content validator. Kept in sync with the TS version (which is unit-tested).

export const VIZ_COLOR_KEYS = ['active', 'compare', 'done', 'window'];

export function validateFrames(frames) {
  const errors = [];

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

    if (!Array.isArray(frame.array)) {
      errors.push(`${where}.array must be an array of numbers`);
    } else {
      const arr = frame.array;
      if (!arr.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        errors.push(`${where}.array must contain only finite numbers`);
      }

      if (frame.highlights !== undefined) {
        const h = frame.highlights;
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
            if (!VIZ_COLOR_KEYS.includes(color)) {
              errors.push(
                `${where}.highlights["${idxKey}"] has invalid color "${String(
                  color,
                )}" (expected one of ${VIZ_COLOR_KEYS.join(', ')})`,
              );
            }
          }
        }
      }

      if (frame.pointers !== undefined) {
        const p = frame.pointers;
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

    if (frame.caption !== undefined && typeof frame.caption !== 'string') {
      errors.push(`${where}.caption must be a string`);
    }
  });

  return {valid: errors.length === 0, errors};
}
