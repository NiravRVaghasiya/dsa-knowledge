import React, {useEffect, useRef, useState} from 'react';
import Footer from '@theme-original/Footer';
import type FooterType from '@theme/Footer';
import type {WrapperProps} from '@docusaurus/types';

// Swizzled Footer wrapper. Docusaurus auto-detects src/theme/Footer/index.tsx
// and uses it in place of the default Footer WITHOUT any config change.
// It renders the original footer unchanged, then appends an animated,
// count-up page-visit counter beneath it.
//
// GitHub Pages is static (no backend), so the real cross-visitor total is
// kept by a free, tokenless hosted counter (counterapi.dev). The count is
// incremented once per browser session (sessionStorage guard); subsequent
// views just read the current total. When the number arrives, it animates
// from 0 up to the true value.

type Props = WrapperProps<typeof FooterType>;

const NAMESPACE = 'niravrvaghasiya-dsa-knowledge';
const COUNTER = 'site-visits';
const UP_URL = `https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER}/up`;
const GET_URL = `https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER}`;

function useCountUp(target: number | null, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic for a natural deceleration
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs]);

  return value;
}

function VisitCounter(): React.ReactNode {
  const [target, setTarget] = useState<number | null>(null);
  const display = useCountUp(target);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem('dsa_visit_counted') === '1';
    } catch (_) {
      /* storage unavailable — just count */
    }

    fetch(alreadyCounted ? GET_URL : UP_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setTarget(data.count);
        }
        try {
          sessionStorage.setItem('dsa_visit_counted', '1');
        } catch (_) {
          /* ignore */
        }
      })
      .catch(() => {
        /* non-fatal: counter simply won't render */
      });
  }, []);

  if (target === null) return null;

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '0.85rem 1rem 1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
      <span
        title="Total page visits"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 16px',
          borderRadius: '999px',
          fontSize: '0.85rem',
          fontWeight: 700,
          color: '#fff',
          background: 'rgba(37, 99, 235, 0.9)',
          boxShadow: '0 3px 12px rgba(37,99,235,0.35)',
        }}>
        <span aria-hidden="true" style={{fontSize: '1rem'}}>👁️</span>
        <span style={{fontVariantNumeric: 'tabular-nums'}}>
          {display.toLocaleString()}
        </span>
        <span style={{fontWeight: 500, opacity: 0.9}}>page visits</span>
      </span>
    </div>
  );
}

export default function FooterWrapper(props: Props): React.ReactNode {
  return (
    <>
      <Footer {...props} />
      <VisitCounter />
    </>
  );
}
