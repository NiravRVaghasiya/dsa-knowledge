// Pure, framework-agnostic helpers for the code editor textarea.
// Extracted so they can be unit-tested without a DOM/React runtime.

export const INDENT = '    '; // 4 spaces — matches Python convention used in content.
export const INDENT_SIZE = INDENT.length;

export type EditRegion = {
  /** New full text of the editor. */
  value: string;
  /** New selection start (caret) offset. */
  selectionStart: number;
  /** New selection end offset. */
  selectionEnd: number;
};

/**
 * Handle pressing Tab.
 *
 * Behavior:
 * - No selection (caret only): insert a single indent at the caret and move
 *   the caret past it.
 * - Selection spanning one or more lines: indent every line the selection
 *   touches (block indent) and keep the same lines selected.
 *
 * This replaces the previous implementation, which always overwrote the
 * selection with 4 spaces — silently deleting selected code.
 */
export function applyTab(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): EditRegion {
  // Simple caret insert when there is no selection.
  if (selectionStart === selectionEnd) {
    const next = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    const caret = selectionStart + INDENT_SIZE;
    return {value: next, selectionStart: caret, selectionEnd: caret};
  }

  // Selection present: indent each affected line.
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const before = value.slice(0, lineStart);
  const block = value.slice(lineStart, selectionEnd);
  const after = value.slice(selectionEnd);

  const indentedBlock = block
    .split('\n')
    .map((line) => INDENT + line)
    .join('\n');

  const added = indentedBlock.length - block.length;
  return {
    value: before + indentedBlock + after,
    // Keep the selection covering the same (now-indented) lines.
    selectionStart: selectionStart + INDENT_SIZE,
    selectionEnd: selectionEnd + added,
  };
}

/**
 * Handle pressing Shift+Tab: remove up to one indent level from every line the
 * selection (or caret) touches. Lines with less than a full indent lose only
 * their leading whitespace.
 */
export function applyShiftTab(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): EditRegion {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const before = value.slice(0, lineStart);
  const block = value.slice(lineStart, selectionEnd);
  const after = value.slice(selectionEnd);

  let firstLineRemoved = 0;
  let totalRemoved = 0;
  const lines = block.split('\n').map((line, i) => {
    let remove = 0;
    if (line.startsWith(INDENT)) {
      remove = INDENT_SIZE;
    } else {
      const ws = line.match(/^[\t ]+/);
      remove = ws ? Math.min(ws[0].length, INDENT_SIZE) : 0;
    }
    if (i === 0) firstLineRemoved = remove;
    totalRemoved += remove;
    return line.slice(remove);
  });

  return {
    value: before + lines.join('\n') + after,
    selectionStart: Math.max(lineStart, selectionStart - firstLineRemoved),
    selectionEnd: Math.max(lineStart, selectionEnd - totalRemoved),
  };
}

/**
 * Handle pressing Enter: keep the current line's leading indentation on the new
 * line, and add one extra indent level when the current line ends with a colon
 * (Python block opener). This makes multi-line editing behave sensibly.
 */
export function applyEnter(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): EditRegion {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const currentLine = value.slice(lineStart, selectionStart);
  const leading = currentLine.match(/^[\t ]*/)?.[0] ?? '';
  const opensBlock = /:\s*$/.test(currentLine.trimEnd());
  const insert = '\n' + leading + (opensBlock ? INDENT : '');

  const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
  const caret = selectionStart + insert.length;
  return {value: next, selectionStart: caret, selectionEnd: caret};
}
