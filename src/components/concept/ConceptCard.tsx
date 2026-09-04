import React from 'react';
import Link from '@docusaurus/Link';
import type {Concept} from '@site/src/data/conceptTypes';
import {prerequisites, learnNext, whereUsedInAI} from '@site/src/data/graph';
import styles from './concept.module.css';

export type ConceptCardProps = {
  concept: Concept;
  /** show the local-progress "done" checkbox */
  showProgress?: boolean;
  done?: boolean;
  onToggleDone?: (id: string) => void;
  /** called when a related-concept chip is clicked (explorer navigation) */
  onNavigate?: (id: string) => void;
};

function ChipList({
  items,
  onNavigate,
}: {
  items: Concept[];
  onNavigate?: (id: string) => void;
}): React.ReactElement {
  return (
    <div className={styles.chips}>
      {items.map((c) =>
        onNavigate ? (
          <button
            key={c.id}
            type="button"
            className={styles.chip}
            onClick={() => onNavigate(c.id)}
            aria-label={`Explore ${c.title}`}>
            {c.title}
          </button>
        ) : (
          <span key={c.id} className={styles.chip}>
            {c.slug ? <Link to={c.slug}>{c.title}</Link> : c.title}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * Reusable concept card: definition, complexity, difficulty, prerequisites,
 * AI relevance, and graph-derived learn-next. Every relationship shown comes
 * from the concept graph, not hand-picked links. Fully keyboard-accessible.
 */
function ConceptCardImpl({
  concept,
  showProgress = false,
  done = false,
  onToggleDone,
  onNavigate,
}: ConceptCardProps): React.ReactElement {
  const prereqs = prerequisites(concept.id);
  const next = learnNext(concept.id);
  const {applications} = whereUsedInAI(concept.id);
  const isAi = concept.kind === 'ai-system';

  return (
    <article className={styles.card} aria-label={concept.title}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          {concept.slug ? <Link to={concept.slug}>{concept.title}</Link> : concept.title}
        </h3>
        <span className={`${styles.kindBadge} ${isAi ? styles.ai : ''}`}>{concept.kind}</span>
      </div>

      <p className={styles.def}>{concept.definition}</p>

      <div className={styles.metaRow}>
        <span className={`${styles.pill} ${styles[concept.difficulty]}`}>{concept.difficulty}</span>
        {concept.complexity && <span className={styles.complexity}>{concept.complexity}</span>}
      </div>

      {prereqs.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Prerequisites</div>
          <ChipList items={prereqs} onNavigate={onNavigate} />
        </div>
      )}

      {applications.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Used in AI</div>
          <div className={styles.chips}>
            {applications.slice(0, 5).map((a) => (
              <span key={a} className={styles.chip}>
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {next.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Learn next</div>
          <ChipList items={next.slice(0, 5)} onNavigate={onNavigate} />
        </div>
      )}

      {showProgress && onToggleDone && (
        <button
          type="button"
          className={`${styles.doneToggle} ${done ? styles.done : ''}`}
          onClick={() => onToggleDone(concept.id)}
          aria-pressed={done}>
          <input type="checkbox" checked={done} readOnly tabIndex={-1} aria-hidden="true" />
          {done ? 'Completed' : 'Mark complete'}
        </button>
      )}
    </article>
  );
}

export const ConceptCard = React.memo(ConceptCardImpl);
export default ConceptCard;
