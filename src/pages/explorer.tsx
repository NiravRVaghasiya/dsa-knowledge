import React, {useMemo, useState, useEffect} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Link from '@docusaurus/Link';
import {
  allConcepts,
  getConcept,
  prerequisites,
  transitivePrerequisites,
  learnNext,
  whereUsedInAI,
} from '@site/src/data/graph';
import type {Concept} from '@site/src/data/conceptTypes';
import ConceptGraph from '@site/src/components/concept/ConceptGraph';
import {useProgress} from '@site/src/components/concept/useProgress';
import styles from '@site/src/components/concept/concept.module.css';

const CONCEPTS = allConcepts();

function readHashId(): string {
  if (typeof window === 'undefined') return 'hash-map';
  const h = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  return getConcept(h) ? h : 'hash-map';
}

function ExplorerInner(): React.ReactElement {
  const [selectedId, setSelectedId] = useState<string>('hash-map');
  const [query, setQuery] = useState('');
  const progress = useProgress();

  // Sync selection to the URL hash so concepts are deep-linkable + back-button friendly.
  useEffect(() => {
    setSelectedId(readHashId());
    const onHash = () => setSelectedId(readHashId());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (id: string) => {
    setSelectedId(id);
    if (typeof window !== 'undefined') window.location.hash = id;
  };

  const concept = getConcept(selectedId) as Concept;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? CONCEPTS.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.definition.toLowerCase().includes(q) ||
            (c.aiApplications ?? []).some((a) => a.toLowerCase().includes(q)),
        )
      : CONCEPTS;
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [query]);

  const prereqs = prerequisites(selectedId);
  const allPrereqs = transitivePrerequisites(selectedId);
  const next = learnNext(selectedId);
  const {applications, systems} = whereUsedInAI(selectedId);

  return (
    <div className={styles.explorerLayout}>
      {/* Left: searchable, keyboard-navigable concept list (accessible fallback) */}
      <nav aria-label="Concept list">
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search concepts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search concepts"
        />
        <div className={styles.conceptList} role="listbox" aria-label="Concepts">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === selectedId}
              className={`${styles.conceptListItem} ${c.id === selectedId ? styles.active : ''} ${
                progress.isConceptDone(c.id) ? styles.doneItem : ''
              }`}
              onClick={() => select(c.id)}>
              {c.title}
            </button>
          ))}
          {filtered.length === 0 && <div style={{padding: '0.7rem', opacity: 0.6}}>No matches.</div>}
        </div>
      </nav>

      {/* Right: the concept detail — the "interactive textbook" panel */}
      <div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem'}}>
          <h2 style={{marginBottom: 0}}>{concept.title}</h2>
          <button
            type="button"
            className={`${styles.doneToggle} ${progress.isConceptDone(selectedId) ? styles.done : ''}`}
            onClick={() => progress.toggleConcept(selectedId)}
            aria-pressed={progress.isConceptDone(selectedId)}>
            <input type="checkbox" checked={progress.isConceptDone(selectedId)} readOnly tabIndex={-1} aria-hidden="true" />
            {progress.isConceptDone(selectedId) ? 'Completed' : 'Mark complete'}
          </button>
        </div>

        <div className={styles.metaRow} style={{margin: '0.5rem 0 1rem'}}>
          <span className={`${styles.pill} ${styles[concept.difficulty]}`}>{concept.difficulty}</span>
          {concept.complexity && <span className={styles.complexity}>{concept.complexity}</span>}
          <span className={`${styles.kindBadge} ${concept.kind === 'ai-system' ? styles.ai : ''}`}>{concept.kind}</span>
          {concept.slug && (
            <Link className="button button--sm button--primary" to={concept.slug}>
              Read the full guide →
            </Link>
          )}
        </div>

        <p style={{fontSize: '1.02rem'}}>{concept.definition}</p>

        {/* Interactive neighborhood graph (enhancement) */}
        <ConceptGraph centerId={selectedId} onSelect={select} height={320} />

        {/* Structured sections — everything also available as plain links */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '1.2rem'}}>
          <section>
            <h3>Prerequisites</h3>
            {prereqs.length ? (
              <ul>
                {prereqs.map((p) => (
                  <li key={p.id}>
                    <button type="button" className={styles.linkButton} onClick={() => select(p.id)} style={{background: 'none', border: 'none', color: 'var(--ifm-color-primary)', cursor: 'pointer', padding: 0}}>
                      {p.title}
                    </button>
                    {p.slug && <> · <Link to={p.slug}>guide</Link></>}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{opacity: 0.6}}>None — a starting point.</p>
            )}
            {allPrereqs.length > prereqs.length && (
              <p style={{fontSize: '0.8rem', opacity: 0.7}}>
                Full chain: {allPrereqs.map((p) => p.title).join(' → ')} → <strong>{concept.title}</strong>
              </p>
            )}
          </section>

          <section>
            <h3>Where this appears in AI</h3>
            {applications.length ? (
              <ul>
                {applications.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : (
              <p style={{opacity: 0.6}}>—</p>
            )}
            {systems.length > 0 && (
              <p style={{fontSize: '0.85rem'}}>
                Systems:{' '}
                {systems.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {i > 0 && ' · '}
                    <button type="button" onClick={() => select(s.id)} style={{background: 'none', border: 'none', color: 'var(--ifm-color-primary)', cursor: 'pointer', padding: 0}}>
                      {s.title}
                    </button>
                  </React.Fragment>
                ))}
              </p>
            )}
          </section>

          <section>
            <h3>Learn next</h3>
            {next.length ? (
              <ul>
                {next.slice(0, 8).map((n) => (
                  <li key={n.id}>
                    <button type="button" onClick={() => select(n.id)} style={{background: 'none', border: 'none', color: 'var(--ifm-color-primary)', cursor: 'pointer', padding: 0}}>
                      {n.title}
                    </button>{' '}
                    <span className={`${styles.pill} ${styles[n.difficulty]}`} style={{fontSize: '0.62rem'}}>{n.difficulty}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{opacity: 0.6}}>—</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Explorer(): React.ReactElement {
  return (
    <Layout
      title="Concept Explorer"
      description="Explore the DSA → AI concept graph: prerequisites, where each idea appears in AI systems, and what to learn next.">
      <main className="container margin-vert--lg">
        <h1>🧭 Concept Explorer</h1>
        <p>
          Pick any concept to see its definition, complexity, prerequisites, <strong>where it shows up in AI
          systems</strong>, and a graph-derived <strong>learn-next</strong> path. Click nodes in the graph or names in
          any list to walk the knowledge graph. Everything here is also reachable as a normal{' '}
          <Link to="/dsa-ai-map">DSA → AI map</Link> and through the{' '}
          <Link to="/learning-paths">learning paths</Link> and guides.
        </p>
        <BrowserOnly fallback={<div>Loading the concept explorer…</div>}>
          {() => <ExplorerInner />}
        </BrowserOnly>

        {/*
          Static, invisible anchor targets — one per concept id — so deep links
          like /explorer#hash-map resolve to a real element in the statically
          generated HTML. The interactive panel above reads window.location.hash
          at runtime to select the concept; these anchors simply make the same
          links statically verifiable (and let the browser jump to the page).
        */}
        <div aria-hidden="true" style={{position: 'absolute', width: 0, height: 0, overflow: 'hidden'}}>
          {CONCEPTS.map((c) => (
            <span key={c.id} id={c.id} />
          ))}
        </div>
      </main>
    </Layout>
  );
}
