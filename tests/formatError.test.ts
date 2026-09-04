import {describe, it, expect} from 'vitest';
import {formatPythonError} from '../src/components/PythonRunner/formatError';

describe('formatPythonError', () => {
  it('accepts a plain string', () => {
    const r = formatPythonError('ValueError: bad input');
    expect(r.text).toBe('ValueError: bad input');
    expect(r.summary).toBe('ValueError: bad input');
  });

  it('accepts an Error instance', () => {
    const r = formatPythonError(new Error('boom'));
    expect(r.text).toBe('boom');
  });

  it('handles null/undefined gracefully', () => {
    expect(formatPythonError(null).text).toBe('Unknown error');
    expect(formatPythonError(undefined).text).toBe('Unknown error');
  });

  it('drops internal pyodide frames but keeps the user frame and error', () => {
    const raw = [
      'Traceback (most recent call last):',
      '  File "/lib/python3.12/site-packages/_pyodide/_base.py", line 500, in run',
      '    coroutine = eval(code)',
      '  File "<exec>", line 1, in <module>',
      '    raise ValueError("x")',
      'ValueError: x',
    ].join('\n');
    const r = formatPythonError(raw);
    expect(r.text).not.toContain('_pyodide');
    expect(r.text).not.toContain('<exec>');
    expect(r.text).toContain('ValueError: x');
    expect(r.summary).toBe('ValueError: x');
  });

  it('summary is the last non-empty line', () => {
    const r = formatPythonError('line1\nline2\n\n');
    expect(r.summary).toBe('line2');
  });
});
