import {describe, it, expect} from 'vitest';
import {validateFrames} from '../src/components/AlgoViz/validateFrames';

describe('validateFrames', () => {
  it('accepts a minimal valid frame set', () => {
    const r = validateFrames([{array: [1, 2, 3], caption: 'ok'}]);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('rejects non-array input', () => {
    expect(validateFrames({} as unknown).valid).toBe(false);
    expect(validateFrames(null as unknown).valid).toBe(false);
  });

  it('rejects an empty frame list', () => {
    const r = validateFrames([]);
    expect(r.valid).toBe(false);
  });

  it('requires array to contain finite numbers', () => {
    const r = validateFrames([{array: [1, Number.NaN]}]);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/finite numbers/);
  });

  it('flags a highlight index out of range', () => {
    const r = validateFrames([{array: [1, 2], highlights: {5: 'active'}}]);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/out of range/);
  });

  it('flags an invalid highlight color', () => {
    const r = validateFrames([{array: [1], highlights: {0: 'magenta'}}]);
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/invalid color/);
  });

  it('flags a pointer index out of range', () => {
    const r = validateFrames([{array: [1, 2], pointers: {L: 9}}]);
    expect(r.valid).toBe(false);
  });

  it('accepts valid highlights, pointers, and captions together', () => {
    const r = validateFrames([
      {array: [4, 5, 6], highlights: {0: 'done', 2: 'window'}, pointers: {L: 0, R: 2}, caption: 'x'},
    ]);
    expect(r.valid).toBe(true);
  });
});
