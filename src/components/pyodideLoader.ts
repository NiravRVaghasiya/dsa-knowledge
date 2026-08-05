// Lazy singleton loader for Pyodide (CPython in WebAssembly).
// Loads from CDN only when first invoked (on a Run click), never at page load.
const PYODIDE_VERSION = 'v0.26.2';
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

let pyodidePromise: Promise<any> | null = null;

export function loadPyodideOnce(): Promise<any> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Pyodide can only load in the browser'));
      return;
    }
    // If already present (another runner loaded it), reuse.
    if ((window as any).loadPyodide) {
      (window as any)
        .loadPyodide({indexURL: PYODIDE_BASE})
        .then(resolve)
        .catch(reject);
      return;
    }
    const script = document.createElement('script');
    script.src = PYODIDE_BASE + 'pyodide.js';
    script.onload = async () => {
      try {
        const py = await (window as any).loadPyodide({indexURL: PYODIDE_BASE});
        resolve(py);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () =>
      reject(new Error('Failed to load Pyodide from CDN (check your connection).'));
    document.head.appendChild(script);
  });
  return pyodidePromise;
}
