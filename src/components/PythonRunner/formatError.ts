// Turn a raw Pyodide / worker error into a message that is useful to a learner.
//
// Pyodide surfaces Python exceptions as a single string that contains the full
// traceback, including internal Pyodide frames the user never wrote. We trim
// those internal frames so the displayed traceback points at the user's code.

const INTERNAL_FRAME_MARKERS = [
  '/lib/python',
  'pyodide',
  '_pyodide',
  'importlib',
  '<exec>',
];

export type FormattedError = {
  /** Cleaned, user-facing text. */
  text: string;
  /** Short single-line summary (last line of the traceback). */
  summary: string;
};

export function formatPythonError(raw: unknown): FormattedError {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : String(raw ?? 'Unknown error');

  const lines = message.split('\n');

  // Keep the "Traceback" header, the user's frames, and the final error line.
  // Drop frames that clearly originate inside the Pyodide/CPython runtime.
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isFileFrame = /^\s*File "/.test(line);
    if (isFileFrame && INTERNAL_FRAME_MARKERS.some((m) => line.includes(m))) {
      // Skip this frame and its following source line (indented under it).
      if (i + 1 < lines.length && /^\s{2,}/.test(lines[i + 1])) i++;
      continue;
    }
    kept.push(line);
  }

  const cleaned = kept.join('\n').trim() || message.trim();
  const nonEmpty = cleaned.split('\n').filter((l) => l.trim().length > 0);
  const summary = nonEmpty[nonEmpty.length - 1] ?? cleaned;

  return {text: cleaned, summary};
}
