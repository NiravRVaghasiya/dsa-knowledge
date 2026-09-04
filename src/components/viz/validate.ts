// Validation for the generic visualization model. Pure, framework-agnostic,
// and shared between the renderer (defensive guard) and the test suite.
//
// Returns *all* problems found (not just the first) so authors get a complete
// report, mirroring the existing AlgoViz frame validator.

import {HIGHLIGHT_ROLES, type Frame, type HighlightRole} from './model';

export type ValidationResult = {valid: boolean; errors: string[]};

function isRole(x: unknown): x is HighlightRole {
  return typeof x === 'string' && (HIGHLIGHT_ROLES as readonly string[]).includes(x);
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

function validateArrayFrame(f: any, where: string, errors: string[]) {
  if (!Array.isArray(f.array)) {
    errors.push(`${where}.array must be an array of numbers`);
    return;
  }
  const n = f.array.length;
  if (!f.array.every(isFiniteNumber)) {
    errors.push(`${where}.array must contain only finite numbers`);
  }
  if (f.highlights !== undefined) {
    if (typeof f.highlights !== 'object' || f.highlights === null) {
      errors.push(`${where}.highlights must be an object`);
    } else {
      for (const [k, role] of Object.entries(f.highlights)) {
        const idx = Number(k);
        if (!Number.isInteger(idx) || idx < 0 || idx >= n) {
          errors.push(`${where}.highlights index "${k}" out of range (len ${n})`);
        }
        if (!isRole(role)) errors.push(`${where}.highlights["${k}"] invalid role "${String(role)}"`);
      }
    }
  }
  if (f.pointers !== undefined) {
    if (typeof f.pointers !== 'object' || f.pointers === null) {
      errors.push(`${where}.pointers must be an object`);
    } else {
      for (const [label, idx] of Object.entries(f.pointers)) {
        if (!Number.isInteger(idx as number) || (idx as number) < 0 || (idx as number) >= n) {
          errors.push(`${where}.pointers["${label}"] must be an index within the array`);
        }
      }
    }
  }
}

function validateGraphFrame(f: any, where: string, errors: string[]) {
  if (!Array.isArray(f.nodes) || f.nodes.length === 0) {
    errors.push(`${where}.nodes must be a non-empty array`);
    return;
  }
  const ids = new Set<string>();
  for (const [i, node] of f.nodes.entries()) {
    if (typeof node?.id !== 'string') {
      errors.push(`${where}.nodes[${i}].id must be a string`);
      continue;
    }
    if (ids.has(node.id)) errors.push(`${where}.nodes[${i}] duplicate id "${node.id}"`);
    ids.add(node.id);
    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
      errors.push(`${where}.nodes[${i}] must have finite x,y coordinates`);
    }
    if (node.role !== undefined && !isRole(node.role)) {
      errors.push(`${where}.nodes[${i}].role invalid "${String(node.role)}"`);
    }
  }
  if (!Array.isArray(f.edges)) {
    errors.push(`${where}.edges must be an array`);
    return;
  }
  for (const [i, e] of f.edges.entries()) {
    if (!ids.has(e?.from)) errors.push(`${where}.edges[${i}].from "${e?.from}" is not a node id`);
    if (!ids.has(e?.to)) errors.push(`${where}.edges[${i}].to "${e?.to}" is not a node id`);
    if (e.weight !== undefined && !isFiniteNumber(e.weight)) {
      errors.push(`${where}.edges[${i}].weight must be finite`);
    }
    if (e.role !== undefined && !isRole(e.role)) {
      errors.push(`${where}.edges[${i}].role invalid "${String(e.role)}"`);
    }
  }
}

function validateTreeFrame(f: any, where: string, errors: string[]) {
  if (!Array.isArray(f.nodes) || f.nodes.length === 0) {
    errors.push(`${where}.nodes must be a non-empty array`);
    return;
  }
  const ids = new Set<string>(f.nodes.map((n: any) => n?.id));
  let roots = 0;
  for (const [i, node] of f.nodes.entries()) {
    if (typeof node?.id !== 'string') {
      errors.push(`${where}.nodes[${i}].id must be a string`);
      continue;
    }
    if (!Number.isInteger(node.depth) || node.depth < 0) {
      errors.push(`${where}.nodes[${i}].depth must be a non-negative integer`);
    }
    if (node.parent === null) {
      roots++;
    } else if (!ids.has(node.parent)) {
      errors.push(`${where}.nodes[${i}].parent "${node.parent}" is not a node id`);
    }
    if (node.role !== undefined && !isRole(node.role)) {
      errors.push(`${where}.nodes[${i}].role invalid "${String(node.role)}"`);
    }
  }
  if (roots !== 1) errors.push(`${where} tree must have exactly one root (parent=null), found ${roots}`);
}

function validateMatrixFrame(f: any, where: string, errors: string[]) {
  if (!Array.isArray(f.cells) || f.cells.length === 0 || !Array.isArray(f.cells[0])) {
    errors.push(`${where}.cells must be a non-empty 2D array`);
    return;
  }
  const rows = f.cells.length;
  const cols = f.cells[0].length;
  for (const [r, row] of f.cells.entries()) {
    if (!Array.isArray(row) || row.length !== cols) {
      errors.push(`${where}.cells[${r}] must have length ${cols} (ragged matrix)`);
    } else if (!row.every(isFiniteNumber)) {
      errors.push(`${where}.cells[${r}] must contain only finite numbers`);
    }
  }
  if (f.highlights !== undefined) {
    if (!Array.isArray(f.highlights)) {
      errors.push(`${where}.highlights must be an array of {row,col,role}`);
    } else {
      for (const [i, h] of f.highlights.entries()) {
        if (!Number.isInteger(h?.row) || h.row < 0 || h.row >= rows ||
            !Number.isInteger(h?.col) || h.col < 0 || h.col >= cols) {
          errors.push(`${where}.highlights[${i}] cell out of range`);
        }
        if (!isRole(h?.role)) errors.push(`${where}.highlights[${i}].role invalid`);
      }
    }
  }
}

/** Validate a single frame. */
export function validateFrame(frame: unknown, where = 'frame'): ValidationResult {
  const errors: string[] = [];
  if (typeof frame !== 'object' || frame === null) {
    return {valid: false, errors: [`${where} must be an object`]};
  }
  const f = frame as any;
  switch (f.kind) {
    case 'array':
      validateArrayFrame(f, where, errors);
      break;
    case 'graph':
      validateGraphFrame(f, where, errors);
      break;
    case 'tree':
      validateTreeFrame(f, where, errors);
      break;
    case 'matrix':
      validateMatrixFrame(f, where, errors);
      break;
    default:
      errors.push(`${where}.kind "${String(f.kind)}" is not a known frame kind`);
  }
  return {valid: errors.length === 0, errors};
}

/** Validate a whole frame sequence. */
export function validateFrames(frames: unknown): ValidationResult {
  if (!Array.isArray(frames)) return {valid: false, errors: ['frames must be an array']};
  if (frames.length === 0) return {valid: false, errors: ['frames must contain at least one frame']};
  const errors: string[] = [];
  frames.forEach((f, i) => {
    errors.push(...validateFrame(f, `frame[${i}]`).errors);
  });
  return {valid: errors.length === 0, errors};
}

/** Assert-style helper used by builders to fail fast in development/tests. */
export function assertValidFrames(frames: readonly Frame[]): readonly Frame[] {
  const result = validateFrames(frames as unknown);
  if (!result.valid) {
    throw new Error('Invalid visualization frames:\n' + result.errors.join('\n'));
  }
  return frames;
}
