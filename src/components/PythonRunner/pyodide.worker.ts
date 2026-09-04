/// <reference lib="webworker" />
// Web Worker that owns the Pyodide runtime. Running Python off the main thread
// keeps the UI responsive and lets us terminate runaway code by killing the
// worker (there is no cooperative interrupt available without SharedArrayBuffer,
// which requires cross-origin isolation we do not control on GitHub Pages).
//
// Protocol (main thread -> worker):
//   {type: 'init'}                          -> load the runtime
//   {type: 'run', id: number, code: string} -> execute code
// Protocol (worker -> main thread):
//   {type: 'ready'}                          -> runtime loaded
//   {type: 'stdout' | 'stderr', text}        -> streamed output
//   {type: 'result', id, ok, error?}         -> execution finished
//   {type: 'error', message}                 -> fatal load error

const PYODIDE_VERSION = 'v0.26.2';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

type RunMessage = {type: 'run'; id: number; code: string};
type InitMessage = {type: 'init'};
type InboundMessage = RunMessage | InitMessage;

// `self` inside a module worker.
// Minimal shape of the Pyodide API we use. Pyodide is loaded at runtime from a
// CDN via importScripts, so no bundled type declarations are available; this
// interface confines the untyped surface to a single place.
interface PyodideAPI {
  setStdout(opts: {batched: (text: string) => void}): void;
  setStderr(opts: {batched: (text: string) => void}): void;
  loadPackagesFromImports(code: string): Promise<void>;
  runPythonAsync(code: string): Promise<unknown>;
}

interface PyodideWorkerScope extends DedicatedWorkerGlobalScope {
  importScripts(...urls: string[]): void;
  loadPyodide(opts: {indexURL: string}): Promise<PyodideAPI>;
}

const ctx = self as unknown as PyodideWorkerScope;

let pyodide: PyodideAPI | null = null;
let loadPromise: Promise<PyodideAPI> | null = null;

function post(message: unknown) {
  ctx.postMessage(message);
}

async function ensurePyodide(): Promise<PyodideAPI> {
  if (pyodide) return pyodide;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // importScripts is available in classic workers. We create the worker as a
    // classic worker so this path is reliable across browsers.
    ctx.importScripts(PYODIDE_BASE + 'pyodide.js');
    const py = await ctx.loadPyodide({indexURL: PYODIDE_BASE});
    py.setStdout({batched: (text: string) => post({type: 'stdout', text})});
    py.setStderr({batched: (text: string) => post({type: 'stderr', text})});
    pyodide = py;
    return py;
  })();

  return loadPromise;
}

async function run(msg: RunMessage) {
  try {
    const py = await ensurePyodide();

    // Load any bundled packages the code imports (numpy, etc.). Non-fatal.
    try {
      await py.loadPackagesFromImports(msg.code);
    } catch {
      /* pure-Python program: nothing to load */
    }

    await py.runPythonAsync(msg.code);
    post({type: 'result', id: msg.id, ok: true});
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err ?? 'Unknown error');
    post({type: 'result', id: msg.id, ok: false, error: message});
  }
}

ctx.onmessage = (event: MessageEvent<InboundMessage>) => {
  const data = event.data;
  if (data.type === 'init') {
    ensurePyodide()
      .then(() => post({type: 'ready'}))
      .catch((err: unknown) =>
        post({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Failed to load the Python runtime.',
        }),
      );
    return;
  }
  if (data.type === 'run') {
    void run(data);
  }
};
