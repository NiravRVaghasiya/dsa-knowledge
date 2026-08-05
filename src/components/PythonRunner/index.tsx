import React, {useCallback, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {loadPyodideOnce} from '../pyodideLoader';
import styles from './styles.module.css';

export type PythonRunnerProps = {
  code: string;            // starter code
  height?: number;         // editor height in px
  title?: string;
};

function RunnerInner({code, height = 220, title}: PythonRunnerProps) {
  const [src, setSrc] = useState(code);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'running' | 'ready'>('idle');
  const [errored, setErrored] = useState(false);
  const pyRef = useRef<any>(null);

  const run = useCallback(async () => {
    setErrored(false);
    setOutput('');
    try {
      if (!pyRef.current) {
        setStatus('loading');
        setOutput('Loading Python runtime (first run only, ~6 MB)…');
        pyRef.current = await loadPyodideOnce();
      }
      const py = pyRef.current;
      setStatus('running');
      setOutput('');
      // Auto-load any bundled packages the code imports (numpy, etc.).
      // Pyodide ships these but does not install them until requested.
      try {
        setOutput('Loading required packages…');
        await py.loadPackagesFromImports(src);
      } catch (_) {
        // Non-fatal: a pure-Python program has no packages to load.
      }
      setOutput('');
      let buffer = '';
      py.setStdout({batched: (s: string) => (buffer += s + '\n')});
      py.setStderr({batched: (s: string) => (buffer += s + '\n')});
      await py.runPythonAsync(src);
      setOutput(buffer.trimEnd() || '(no output)');
      setStatus('ready');
    } catch (e: any) {
      setErrored(true);
      // Pyodide surfaces Python tracebacks in the error message
      setOutput(String(e && e.message ? e.message : e));
      setStatus('ready');
    }
  }, [src]);

  const reset = useCallback(() => {
    setSrc(code);
    setOutput('');
    setErrored(false);
  }, [code]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const t = e.currentTarget;
      const s = t.selectionStart;
      const en = t.selectionEnd;
      const next = src.slice(0, s) + '    ' + src.slice(en);
      setSrc(next);
      requestAnimationFrame(() => (t.selectionStart = t.selectionEnd = s + 4));
    }
    // Ctrl/Cmd+Enter runs
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  };

  const btnLabel =
    status === 'loading' ? 'Loading…' : status === 'running' ? 'Running…' : '▶ Run';

  return (
    <div className={styles.runner}>
      <div className={styles.header}>
        <span className={styles.title}>{title || '🐍 Python Practice'}</span>
        <span className={styles.hint}>Ctrl/⌘ + Enter to run</span>
      </div>
      <textarea
        className={styles.editor}
        style={{height}}
        value={src}
        spellCheck={false}
        onChange={(e) => setSrc(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className={styles.controls}>
        <button
          className={styles.runBtn}
          onClick={run}
          disabled={status === 'loading' || status === 'running'}>
          {btnLabel}
        </button>
        <button className={styles.resetBtn} onClick={reset}>
          Reset
        </button>
      </div>
      {output && (
        <pre className={`${styles.output} ${errored ? styles.error : ''}`}>{output}</pre>
      )}
    </div>
  );
}

export default function PythonRunner(props: PythonRunnerProps) {
  return (
    <BrowserOnly fallback={<div className={styles.runner}>Loading editor…</div>}>
      {() => <RunnerInner {...props} />}
    </BrowserOnly>
  );
}
