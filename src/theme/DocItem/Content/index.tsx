import React, {type ReactNode} from 'react';
import Content from '@theme-original/DocItem/Content';
import type ContentType from '@theme/DocItem/Content';
import type {WrapperProps} from '@docusaurus/types';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type Props = WrapperProps<typeof ContentType>;
type Prereq = {title: string; to: string};

// The custom frontmatter fields this theme wrapper reads. Docusaurus types
// frontmatter as a loose record, so we narrow it here in one place.
type GuideFrontMatter = {
  difficulty?: string;
  reading_time?: number;
  path_step?: number;
  prerequisites?: Prereq[];
};

const DIFFICULTY: Record<string, {label: string; cls: string}> = {
  beginner: {label: 'Beginner', cls: styles.beginner},
  intermediate: {label: 'Intermediate', cls: styles.intermediate},
  advanced: {label: 'Advanced', cls: styles.advanced},
};

export default function ContentWrapper(props: Props): ReactNode {
  const {frontMatter, metadata} = useDoc();
  const fm = frontMatter as GuideFrontMatter;
  const difficulty = fm.difficulty;
  const readingTime = fm.reading_time;
  const pathStep = fm.path_step;
  const PATH_TOTAL = 43;
  const prerequisites = fm.prerequisites ?? [];
  const tags = metadata.tags ?? [];
  const diff = difficulty ? DIFFICULTY[difficulty] : undefined;
  const hasStrip = diff || readingTime || tags.length > 0;

  return (
    <>
      {hasStrip && (
        <div className={styles.metaStrip}>
          {diff && (
            <span className={`${styles.pill} ${diff.cls}`}>
              <span className={styles.dot} /> {diff.label}
            </span>
          )}
          {pathStep && (
            <Link to="/#learning-path" className={styles.stepChip}>
              &#127907; Step {pathStep} / {PATH_TOTAL}
            </Link>
          )}
          {readingTime && (
            <span className={styles.readingTime}>
              &#128337; {readingTime} min read
            </span>
          )}
          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.map((tag) => (
                <Link key={tag.permalink} to={tag.permalink} className={styles.tagChip}>
                  #{tag.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {prerequisites.length > 0 && (
        <div className={styles.prereqBox}>
          <div className={styles.prereqHeader}>
            <span className={styles.prereqIcon}>&#128218;</span>
            <span>Before you start</span>
          </div>
          <div className={styles.prereqBody}>
            Make sure you're comfortable with{' '}
            {prerequisites.map((p, i) => (
              <React.Fragment key={p.to}>
                <Link to={p.to} className={styles.prereqLink}>{p.title}</Link>
                {i < prerequisites.length - 2 ? ', ' : ''}
                {i === prerequisites.length - 2 ? ' and ' : ''}
              </React.Fragment>
            ))}
            {' '}first.
          </div>
        </div>
      )}

      <Content {...props} />
    </>
  );
}
