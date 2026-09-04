import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {DEMOS} from '@site/src/components/viz/demos';
import Visualizer from '@site/src/components/viz/Visualizer';

function DemoGallery(): React.ReactElement {
  const [activeId, setActiveId] = useState(DEMOS[0].id);
  const active = useMemo(() => DEMOS.find((d) => d.id === activeId) ?? DEMOS[0], [activeId]);
  // Build frames lazily and only for the selected demo (cheap, pure functions).
  const frames = useMemo(() => active.build(), [active]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}>
        {DEMOS.map((d) => (
          <button
            key={d.id}
            onClick={() => setActiveId(d.id)}
            className={activeId === d.id ? 'button button--primary' : 'button button--secondary'}>
            {d.title}
          </button>
        ))}
      </div>

      <p style={{opacity: 0.85}}>{active.description}</p>

      <Visualizer key={active.id} frames={frames} title={`🎬 ${active.title}`} height={320} />

      <p style={{fontSize: '0.82rem', opacity: 0.7, marginTop: '0.75rem'}}>
        Keyboard: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> step · <kbd>Home</kbd>/<kbd>End</kbd> jump.
        Click the progress bar to scrub.
      </p>
    </div>
  );
}

export default function VizDemos(): React.ReactElement {
  return (
    <Layout
      title="Visualization Demos"
      description="Interactive algorithm visualizations built on a reusable frame-based framework.">
      <main className="container margin-vert--lg">
        <h1>🎬 Algorithm Visualization Framework</h1>
        <p>
          Every demo below is produced by the <strong>same reusable infrastructure</strong>: a pure
          algorithm builder emits an immutable sequence of <em>frames</em>, and a single{' '}
          <code>Visualizer</code> renders them — choosing an array, graph, tree, or matrix renderer
          from each frame&apos;s <code>kind</code>. No demo has bespoke rendering code.
        </p>
        <BrowserOnly fallback={<div>Loading visualizations…</div>}>
          {() => <DemoGallery />}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
