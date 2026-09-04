// Local-only progress tracking. No authentication, no server, no personal data
// — everything lives in the browser's localStorage and can be reset in one call.
// Tracks which concepts and practice pages a learner has marked complete.

import {useCallback, useEffect, useState} from 'react';

const STORAGE_KEY = 'dsa-kg-progress-v1';

export type Progress = {
  /** concept ids the learner marked complete */
  concepts: string[];
  /** practice page slugs marked complete */
  practice: string[];
};

const EMPTY: Progress = {concepts: [], practice: []};

function read(): Progress {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return {
      concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
      practice: Array.isArray(parsed.practice) ? parsed.practice : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(p: Progress) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage disabled / full — degrade silently, feature is non-critical */
  }
}

export type UseProgress = {
  progress: Progress;
  isConceptDone: (id: string) => boolean;
  toggleConcept: (id: string) => void;
  isPracticeDone: (slug: string) => boolean;
  togglePractice: (slug: string) => void;
  /** fraction (0..1) of the given concept ids that are complete */
  pathCompletion: (conceptIds: string[]) => number;
  reset: () => void;
};

export function useProgress(): UseProgress {
  const [progress, setProgress] = useState<Progress>(EMPTY);

  // Hydrate from localStorage on mount (client-only; SSR renders EMPTY).
  useEffect(() => {
    setProgress(read());
  }, []);

  const persist = useCallback((next: Progress) => {
    setProgress(next);
    write(next);
  }, []);

  const toggleConcept = useCallback(
    (id: string) => {
      setProgress((prev) => {
        const has = prev.concepts.includes(id);
        const next = {
          ...prev,
          concepts: has ? prev.concepts.filter((x) => x !== id) : [...prev.concepts, id],
        };
        write(next);
        return next;
      });
    },
    [],
  );

  const togglePractice = useCallback((slug: string) => {
    setProgress((prev) => {
      const has = prev.practice.includes(slug);
      const next = {
        ...prev,
        practice: has ? prev.practice.filter((x) => x !== slug) : [...prev.practice, slug],
      };
      write(next);
      return next;
    });
  }, []);

  return {
    progress,
    isConceptDone: useCallback((id: string) => progress.concepts.includes(id), [progress]),
    toggleConcept,
    isPracticeDone: useCallback((slug: string) => progress.practice.includes(slug), [progress]),
    togglePractice,
    pathCompletion: useCallback(
      (ids: string[]) => {
        if (ids.length === 0) return 0;
        const done = ids.filter((id) => progress.concepts.includes(id)).length;
        return done / ids.length;
      },
      [progress],
    ),
    reset: useCallback(() => persist(EMPTY), [persist]),
  };
}
