import React, {useCallback, useEffect, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {
  PyodideClient,
  DEFAULT_TIMEOUT_MS,
  type RunOutcome,
} from './pyodideClient';
import {applyTab, applyShiftTab, applyEnter} from './editorUtils';
import {formatPythonError} from './formatError';
import styles from './styles.module.css';

export type PythonRunnerProps = {
  code: string; // starter code
  height?: number; // editor height in px
  title?: string;
  /** Execution timeout in milliseconds. */
  timeoutMs?: number;
};

type Status = 'idle' | 'loading' | 'running' | 'ready' | 'error';

function RunnerInner({
  code,
  height = 220,
  title,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: PythonRunnerProps): React.ReactElement {
  const [src, setSrc] = useState(code);
  const [output, setOutput] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errored, setErrored] = useState(false);

  const clientRef = useRef<PyodideClient | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  // Pending selection to reapply after a controlled-value edit re-renders.
  const pendingSelection = useRef<{start: number; end: number} | null>(null);

  // Lazily create the client and always dispose the worker on unmount.
  const getClient = useCallback((): PyodideClient => {
    if (!clientRef.current) {
      clientRef.current = new PyodideClient(timeoutMs);
    }
    return clientRef.current;
  }, [timeoutMs]);

  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, []);

  // Reapply caret/selection after controlled edits (Tab/Enter/Shift-Tab).
  useEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      const {start, end} = pendingSelection.current;
      textareaRef.current.selectionStart = start;
      textareaRef.current.selectionEnd = end;
      pendingSelection.current = null;
    }
  });

  const run = useCallback(async () => {
    const client = getClient();
    if (client.isRunning) return;

    setErrored(false);
    setOutput('');

    if (status === 'idle') {
      setStatus('loading');
      setNotice('Loading Python runtime from CDN (first run only, ~6 MB)…');
      try {
        await client.ensureReady();
      } catch (e: unknown) {
        setStatus('error');
        setErrored(true);
        setNotice('');
        setOutput(
          formatPythonError(e).text ||
            'Failed to load the Python runtime from the CDN. Check your connection.',
        );
        return;
      }
    }

    setStatus('running');
    setNotice('');
    let buffer = '';
    const flush = (text: string) => {
      buffer += text;
      setOutput(buffer);
    };

    const outcome: RunOutcome = await client.run(src, {
      onStdout: flush,
      onStderr: flush,
    });

    switch (outcome.status) {
      case 'ok':
        setErrored(false);
        setOutput(buffer.trimEnd() || '(no output)');
        setStatus('ready');
        break;
      case 'error':
        setErrored(true);
        setOutput(
          (buffer ? buffer.trimEnd() + '\n\n' : '') +
            formatPythonError(outcome.error).text,
        );
        setStatus('ready');
        break;
      case 'timeout':
        setErrored(true);
        setOutput(
          (buffer ? buffer.trimEnd() + '\n\n' : '') +
            `⏱ Execution timed out after ${Math.round(
              timeoutMs / 1000,
            )}s and was stopped. Check for an infinite loop.`,
        );
        setStatus('idle'); // worker was torn down; next run reloads runtime
        break;
      case 'cancelled':
        setErrored(true);
        setOutput(
          (buffer ? buffer.trimEnd() + '\n\n' : '') + '⏹ Execution stopped.',
        );
        setStatus('idle');
        break;
    }
  }, [getClient, src, status, timeoutMs]);

  const stop = useCallback(() => {
    clientRef.current?.cancel();
  }, []);

  const reset = useCallback(() => {
    clientRef.current?.cancel();
    setSrc(code);
    setOutput('');
    setNotice('');
    setErrored(false);
  }, [code]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget;

    // Ctrl/Cmd+Enter runs.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void run();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const region = e.shiftKey
        ? applyShiftTab(src, t.selectionStart, t.selectionEnd)
        : applyTab(src, t.selectionStart, t.selectionEnd);
      pendingSelection.current = {
        start: region.selectionStart,
        end: region.selectionEnd,
      };
      setSrc(region.value);
      return;
    }

    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault();
      const region = applyEnter(src, t.selectionStart, t.selectionEnd);
      pendingSelection.current = {
        start: region.selectionStart,
        end: region.selectionEnd,
      };
      setSrc(region.value);
      return;
    }
  };

  const isBusy = status === 'loading' || status === 'running';
  const btnLabel =
    status === 'loading'
      ? 'Loading…'
      : status === 'running'
        ? 'Running…'
        : '▶ Run';

  return (
    <div className={styles.runner}>
      <div className={styles.header}>
        <span className={styles.title}>{title || '🐍 Python Practice'}</span>
        <span className={styles.hint}>Ctrl/⌘ + Enter to run</span>
      </div>
      <textarea
        ref={textareaRef}
        className={styles.editor}
        style={{height}}
        value={src}
        spellCheck={false}
        onChange={(e) => setSrc(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={title || 'Python code editor'}
      />
      <div className={styles.controls}>
        <button
          className={styles.runBtn}
          onClick={() => void run()}
          disabled={isBusy}>
          {btnLabel}
        </button>
        {status === 'running' && (
          <button className={styles.resetBtn} onClick={stop}>
            ⏹ Stop
          </button>
        )}
        <button className={styles.resetBtn} onClick={reset} disabled={isBusy}>
          Reset
        </button>
      </div>
      {notice && <div className={styles.notice}>{notice}</div>}
      {output && (
        <pre
          className={`${styles.output} ${errored ? styles.error : ''}`}
          aria-live="polite">
          {output}
        </pre>
      )}
    </div>
  );
}

export default function PythonRunner(
  props: PythonRunnerProps,
): React.ReactElement {
  return (
    <BrowserOnly fallback={<div className={styles.runner}>Loading editor…</div>}>
      {() => <RunnerInner {...props} />}
    </BrowserOnly>
  );
}
