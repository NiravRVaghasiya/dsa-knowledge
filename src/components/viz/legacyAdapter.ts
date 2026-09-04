// Backward-compatibility adapter: converts a legacy AlgoViz `VizFrame`
// ({array, highlights, pointers, caption}) into the generic `ArrayFrame`.
//
// The legacy color vocabulary (active|compare|done|window|default) is a subset
// of the new HighlightRole set, so the mapping is the identity for known roles.
// Unknown legacy roles fall back to 'default', matching the old renderer, which
// looked them up in a COLORS map that defaulted to the 'default' color.

import type {ArrayFrame, HighlightRole} from './model';
import {HIGHLIGHT_ROLES} from './model';

/** The legacy frame shape that 15 existing .mdx files pass to <AlgoViz>. */
export type LegacyVizFrame = {
  array: number[];
  highlights?: Record<number, string>;
  pointers?: Record<string, number>;
  caption?: string;
};

const KNOWN = new Set<string>(HIGHLIGHT_ROLES);

function toRole(legacy: string): HighlightRole {
  return (KNOWN.has(legacy) ? legacy : 'default') as HighlightRole;
}

export function adaptLegacyFrame(frame: LegacyVizFrame): ArrayFrame {
  const highlights: Record<number, HighlightRole> = {};
  for (const [k, v] of Object.entries(frame.highlights ?? {})) {
    highlights[Number(k)] = toRole(v);
  }
  return {
    kind: 'array',
    array: frame.array ?? [],
    highlights,
    ...(frame.pointers ? {pointers: frame.pointers} : {}),
    caption: frame.caption,
  };
}

export function adaptLegacyFrames(frames: LegacyVizFrame[]): ArrayFrame[] {
  return (frames ?? []).map(adaptLegacyFrame);
}
