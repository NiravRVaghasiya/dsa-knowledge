// Single source of truth mapping semantic highlight roles to colors. Every
// renderer imports this so the color vocabulary is identical across arrays,
// graphs, trees, and matrices. Chosen to be legible in both light and dark
// Docusaurus themes.

import type {HighlightRole} from './model';

export const ROLE_COLORS: Record<HighlightRole, string> = {
  active: '#2563eb', // blue — currently operating
  compare: '#f59e0b', // amber — being compared
  done: '#22c55e', // green — finalized
  window: '#8b5cf6', // violet — inside window/range
  frontier: '#06b6d4', // cyan — discovered, queued
  visited: '#64748b', // slate — processed
  path: '#16a34a', // dark green — on the result path
  default: '#94a3b8', // gray — no role
};

export function roleColor(role: HighlightRole | undefined): string {
  return ROLE_COLORS[role ?? 'default'];
}

/** Human-readable labels for the legend, in display order. */
export const ROLE_LEGEND: Array<{role: HighlightRole; label: string}> = [
  {role: 'active', label: 'active'},
  {role: 'compare', label: 'compare'},
  {role: 'frontier', label: 'frontier'},
  {role: 'visited', label: 'visited'},
  {role: 'window', label: 'window'},
  {role: 'path', label: 'path'},
  {role: 'done', label: 'done'},
];
