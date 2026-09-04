import {describe, it, expect} from 'vitest';
import {
  applyTab,
  applyShiftTab,
  applyEnter,
  INDENT,
} from '../src/components/PythonRunner/editorUtils';

describe('applyTab', () => {
  it('inserts one indent at the caret when there is no selection', () => {
    const r = applyTab('ab', 1, 1);
    expect(r.value).toBe('a' + INDENT + 'b');
    expect(r.selectionStart).toBe(1 + INDENT.length);
    expect(r.selectionEnd).toBe(r.selectionStart);
  });

  it('does NOT delete a selection (regression for the old bug)', () => {
    // Old code replaced the whole selection with 4 spaces, losing text.
    const value = 'hello world';
    const r = applyTab(value, 0, 5); // select "hello"
    expect(r.value).toContain('hello');
    expect(r.value).toContain('world');
  });

  it('block-indents every line the selection touches', () => {
    const value = 'a\nb\nc';
    // Select from start of "a" to end of "b".
    const r = applyTab(value, 0, 3);
    expect(r.value).toBe(`${INDENT}a\n${INDENT}b\nc`);
  });
});

describe('applyShiftTab', () => {
  it('removes one indent level from a single line', () => {
    const value = `${INDENT}x`;
    const r = applyShiftTab(value, INDENT.length, INDENT.length);
    expect(r.value).toBe('x');
  });

  it('removes indentation from each selected line', () => {
    const value = `${INDENT}a\n${INDENT}b`;
    const r = applyShiftTab(value, 0, value.length);
    expect(r.value).toBe('a\nb');
  });

  it('is a no-op on a line with no leading whitespace', () => {
    const value = 'x';
    const r = applyShiftTab(value, 0, 1);
    expect(r.value).toBe('x');
  });
});

describe('applyEnter', () => {
  it('preserves the current line indentation on the new line', () => {
    const value = `${INDENT}foo`;
    const r = applyEnter(value, value.length, value.length);
    expect(r.value).toBe(`${INDENT}foo\n${INDENT}`);
    expect(r.selectionStart).toBe(value.length + 1 + INDENT.length);
  });

  it('adds an extra indent after a line ending in a colon', () => {
    const value = 'def f():';
    const r = applyEnter(value, value.length, value.length);
    expect(r.value).toBe(`def f():\n${INDENT}`);
  });

  it('keeps nested indentation and adds a level after a colon', () => {
    const value = `${INDENT}if x:`;
    const r = applyEnter(value, value.length, value.length);
    expect(r.value).toBe(`${INDENT}if x:\n${INDENT}${INDENT}`);
  });
});
