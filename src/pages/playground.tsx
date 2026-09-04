import React from 'react';
import Layout from '@theme/Layout';
import PythonRunner from '@site/src/components/PythonRunner';

const STARTER = `# Full Python scratchpad — runs entirely in your browser via Pyodide.
# Try standard library modules:
from collections import Counter, deque
import heapq

nums = [3, 1, 4, 1, 5, 9, 2, 6]
print("sorted:", sorted(nums))
print("counts:", Counter(nums))

# A min-heap
h = []
for n in nums:
    heapq.heappush(h, n)
print("3 smallest:", [heapq.heappop(h) for _ in range(3)])
`;

export default function Playground() {
  return (
    <Layout title="Playground" description="Interactive Python playground running in your browser">
      <main className="container margin-vert--lg">
        <h1>🐍 Python Playground</h1>
        <p>
          A full Python 3 environment that executes entirely in your browser (via
          Pyodide/WebAssembly) — nothing you type is sent to a server. On your first
          run the runtime is downloaded from a public CDN (jsDelivr, ~6&nbsp;MB) and
          then cached by the browser, so a working internet connection is required the
          first time. Code runs in a Web Worker with an execution timeout, so the page
          stays responsive and runaway loops can be stopped.
        </p>
        <PythonRunner code={STARTER} height={320} title="🐍 Scratchpad" />
      </main>
    </Layout>
  );
}
