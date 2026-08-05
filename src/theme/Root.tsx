import React, {useEffect, useState} from 'react';

// Docusaurus automatically wraps the entire app in this component if it exists
// at src/theme/Root.tsx. Adding it does NOT require touching any config file.
//
// This injects a lightweight, site-wide page-visit counter. Because GitHub
// Pages is static (no backend), the count is kept by a free, tokenless hosted
// counter service (counterapi.dev). The counter increments once per browser
// session (guarded by sessionStorage) and renders a small badge in the
// bottom-right corner.

const NAMESPACE = 'niravrvaghasiya-dsa-knowledge';
const COUNTER = 'site-visits';
const UP_URL = `https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER}/up`;
const GET_URL = `https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER}`;

function VisitCounter(): React.ReactNode {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Only runs in the browser.
    if (typeof window === 'undefined') return;

    let alreadyCounted = false;
    try {
      alreadyCounted = sessionStorage.getItem('dsa_visit_counted') === '1';
    } catch (_) {
      // sessionStorage may be unavailable; fall through and just count.
    }

    const url = alreadyCounted ? GET_URL : UP_URL;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setCount(data.count);
        }
        try {
          sessionStorage.setItem('dsa_visit_counted', '1');
        } catch (_) {
          /* ignore */
        }
      })
      .catch(() => {
        // Network/counter errors are non-fatal — the badge simply won't show.
      });
  }, []);

  if (count === null) return null;

  return (
    <div
      title="Total page visits"
      style={{
        position: 'fixed',
        bottom: '14px',
        right: '14px',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(37, 99, 235, 0.92)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
      <span aria-hidden="true">👁️</span>
      <span>{count.toLocaleString()} visits</span>
    </div>
  );
}

export default function Root({children}: {children: React.ReactNode}): React.ReactNode {
  return (
    <>
      {children}
      <VisitCounter />
    </>
  );
}
