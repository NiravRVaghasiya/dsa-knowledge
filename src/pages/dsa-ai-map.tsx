import React, {useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {dsaToAiMapping, allConcepts} from '@site/src/data/graph';
import type {Difficulty} from '@site/src/data/conceptTypes';
import styles from '@site/src/components/concept/concept.module.css';

const ROWS = dsaToAiMapping();
const KINDS = Array.from(new Set(allConcepts().map((c) => c.kind))).filter((k) => k !== 'ai-system');
const DIFFS: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

export default function DsaAiMap(): React.ReactElement {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<string>('all');
  const [diff, setDiff] = useState<string>('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROWS.filter(({concept, systems}) => {
      if (kind !== 'all' && concept.kind !== kind) return false;
      if (diff !== 'all' && concept.difficulty !== diff) return false;
      if (!q) return true;
      return (
        concept.title.toLowerCase().includes(q) ||
        (concept.aiApplications ?? []).some((a) => a.toLowerCase().includes(q)) ||
        systems.some((s) => s.title.toLowerCase().includes(q))
      );
    });
  }, [query, kind, diff]);

  return (
    <Layout
      title="DSA → AI Systems Map"
      description="A searchable map from classical data structures and algorithms to the modern AI systems that rely on them.">
      <main className="container margin-vert--lg">
        <h1>🗺️ DSA → AI Systems Map</h1>
        <p>
          Every row starts with a classical DSA idea and shows exactly where it reappears in modern AI systems — the
          core promise of this project. Search or filter, then follow any link into the deep-dive guide or the{' '}
          <Link to="/explorer">interactive explorer</Link>.
        </p>

        <div className={styles.filterBar}>
          <input
            className={styles.searchInput}
            style={{maxWidth: 320, marginBottom: 0}}
            type="search"
            placeholder="Search concepts, applications, systems…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the DSA to AI map"
          />
          <label>
            Kind:{' '}
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by kind">
              <option value="all">all</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulty:{' '}
            <select value={diff} onChange={(e) => setDiff(e.target.value)} aria-label="Filter by difficulty">
              <option value="all">all</option>
              {DIFFS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <span style={{opacity: 0.6, fontSize: '0.85rem'}}>{rows.length} concepts</span>
        </div>

        <div style={{overflowX: 'auto'}}>
          <table className={styles.mapTable}>
            <thead>
              <tr>
                <th scope="col">DSA concept</th>
                <th scope="col">Complexity</th>
                <th scope="col">Where it appears in AI</th>
                <th scope="col">AI systems</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({concept, systems}) => (
                <tr key={concept.id}>
                  <th scope="row" style={{fontWeight: 700}}>
                    {concept.slug ? <Link to={concept.slug}>{concept.title}</Link> : concept.title}
                    <div>
                      <span className={`${styles.pill} ${styles[concept.difficulty]}`} style={{fontSize: '0.62rem'}}>
                        {concept.difficulty}
                      </span>
                    </div>
                  </th>
                  <td className={styles.complexity}>{concept.complexity ?? '—'}</td>
                  <td>
                    {(concept.aiApplications ?? []).length ? (
                      <ul style={{margin: 0, paddingLeft: '1.1rem'}}>
                        {(concept.aiApplications ?? []).map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className={styles.chips}>
                      {systems.map((s) => (
                        <span key={s.id} className={styles.chip}>
                          {s.slug ? <Link to={s.slug}>{s.title}</Link> : s.title}
                        </span>
                      ))}
                    </div>
                    <div style={{marginTop: '0.35rem'}}>
                      <Link to={`/explorer#${concept.id}`} style={{fontSize: '0.78rem'}}>
                        explore graph →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{textAlign: 'center', padding: '2rem', opacity: 0.6}}>
                    No concepts match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </Layout>
  );
}
