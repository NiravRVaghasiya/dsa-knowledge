import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Link from '@docusaurus/Link';
import {allPaths, getConcept} from '@site/src/data/graph';
import type {LearningPath} from '@site/src/data/conceptTypes';
import {useProgress} from '@site/src/components/concept/useProgress';
import styles from '@site/src/components/concept/concept.module.css';

const PATHS = allPaths();

function PathCard({path}: {path: LearningPath}): React.ReactElement {
  const progress = useProgress();
  const steps = path.steps.map((id) => getConcept(id)).filter(Boolean);
  const pct = Math.round(progress.pathCompletion(path.steps) * 100);
  const doneCount = path.steps.filter((id) => progress.isConceptDone(id)).length;

  return (
    <section className={styles.pathCard} aria-label={path.title}>
      <div style={{display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline'}}>
        <h2 style={{marginBottom: 0}}>{path.title}</h2>
        <span style={{fontSize: '0.8rem', opacity: 0.7}}>
          {doneCount} / {path.steps.length} concepts · {pct}%
        </span>
      </div>
      <p style={{margin: '0.35rem 0 0'}}>{path.description}</p>
      <p style={{fontSize: '0.8rem', opacity: 0.7, margin: '0.2rem 0 0'}}>
        <strong>For:</strong> {path.audience}
      </p>

      <div className={styles.progressBar} aria-hidden="true">
        <div className={styles.progressFill} style={{width: `${pct}%`}} />
      </div>

      <ol className={styles.pathSteps} style={{listStyle: 'none', padding: 0}}>
        {steps.map((c, i) => {
          if (!c) return null;
          const done = progress.isConceptDone(c.id);
          return (
            <li key={c.id} style={{display: 'contents'}}>
              {i > 0 && <span className={styles.pathArrow} aria-hidden="true">→</span>}
              <span className={`${styles.pathStep} ${done ? styles.done : ''}`}>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => progress.toggleConcept(c.id)}
                  aria-label={`Mark ${c.title} complete`}
                />
                <Link to={`/explorer#${c.id}`}>{c.title}</Link>
                {c.slug && (
                  <>
                    {' '}
                    <Link to={c.slug} style={{fontSize: '0.72rem', opacity: 0.75}} aria-label={`${c.title} guide`}>
                      (guide)
                    </Link>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PathsInner(): React.ReactElement {
  const progress = useProgress();
  return (
    <>
      <div style={{textAlign: 'right', marginBottom: '1rem'}}>
        <button
          type="button"
          className="button button--sm button--secondary"
          onClick={() => {
            if (typeof window !== 'undefined' && window.confirm('Reset all local progress?')) progress.reset();
          }}>
          Reset my progress
        </button>
      </div>
      {PATHS.map((p) => (
        <PathCard key={p.id} path={p} />
      ))}
    </>
  );
}

export default function LearningPaths(): React.ReactElement {
  return (
    <Layout
      title="Learning Paths"
      description="Curated, ordered paths through the DSA → AI concept graph, from fundamentals to LLM systems engineering.">
      <main className="container margin-vert--lg">
        <h1>🎯 Learning Paths</h1>
        <p>
          Four ordered routes through the concept graph, from DSA fundamentals to LLM systems engineering. Check off
          concepts as you go — progress is stored only in your browser (no account, nothing sent anywhere). Each step
          links into the <Link to="/explorer">explorer</Link> and its full guide.
        </p>

        {/* Accessible static fallback: paths + steps are plain links even without JS/progress. */}
        <noscript>
          <ul>
            {PATHS.map((p) => (
              <li key={p.id}>
                <strong>{p.title}:</strong> {p.steps.join(' → ')}
              </li>
            ))}
          </ul>
        </noscript>

        <BrowserOnly fallback={<div>Loading learning paths…</div>}>{() => <PathsInner />}</BrowserOnly>
      </main>
    </Layout>
  );
}
