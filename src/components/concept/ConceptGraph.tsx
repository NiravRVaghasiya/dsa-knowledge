import React, {useMemo, useRef, useState, useCallback} from 'react';
import {neighborhood} from '@site/src/data/graph';
import type {RelationType} from '@site/src/data/conceptTypes';
import styles from './concept.module.css';

export type ConceptGraphProps = {
  /** the concept at the center of the rendered neighborhood */
  centerId: string;
  /** select a different concept (clicking a neighbor recenters) */
  onSelect: (id: string) => void;
  height?: number;
};

// Colors per relation type (kept distinct + legible in both themes).
const REL_COLOR: Record<RelationType, string> = {
  prerequisite: '#2563eb',
  implements: '#16a34a',
  'derived-from': '#8b5cf6',
  'used-in': '#f59e0b',
  'alternative-to': '#06b6d4',
  'optimized-by': '#db2777',
  'related-to': '#94a3b8',
  'benchmarked-against': '#64748b',
};

const LEGEND: RelationType[] = [
  'prerequisite',
  'used-in',
  'implements',
  'derived-from',
  'alternative-to',
  'optimized-by',
];

/**
 * Interactive local-neighborhood graph. For performance and legibility it only
 * ever renders the center concept plus its direct neighbors (never the whole
 * graph) — clicking a neighbor recenters, letting the user walk the graph one
 * hop at a time. Supports zoom (buttons + wheel) and pan (drag).
 *
 * Accessibility: this is an ENHANCEMENT, not the only navigation. Every node is
 * a real button (keyboard-focusable, labelled); the same relationships are also
 * available as plain links on the Concept Explorer and in the guides.
 */
function ConceptGraphImpl({centerId, onSelect, height = 340}: ConceptGraphProps): React.ReactElement {
  const width = 640;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x: 0, y: 0});
  const dragging = useRef<{x: number; y: number} | null>(null);

  const hood = useMemo(() => neighborhood(centerId), [centerId]);

  // Radial layout: center in the middle, neighbors on a circle around it.
  const layout = useMemo(() => {
    if (!hood) return null;
    const cx = width / 2;
    const cy = height / 2;
    const others = hood.nodes.filter((n) => n.id !== centerId);
    const r = Math.min(width, height) * 0.36;
    const pos = new Map<string, {x: number; y: number}>();
    pos.set(centerId, {x: cx, y: cy});
    others.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, others.length) - Math.PI / 2;
      pos.set(n.id, {x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle)});
    });
    return pos;
  }, [hood, centerId, height]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = {x: e.clientX - pan.x, y: e.clientY - pan.y};
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) setPan({x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y});
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  if (!hood || !layout) {
    return <div className={styles.graphWrap}>No graph data for this concept.</div>;
  }

  const NODE_R = 24;

  return (
    <div className={styles.graphWrap}>
      <div className={styles.graphHeader}>
        <span>Neighborhood of <strong>{hood.center.title}</strong> · click a node to recenter</span>
        <div className={styles.graphControls}>
          <button type="button" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} aria-label="zoom in">+</button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} aria-label="zoom out">&#8722;</button>
          <button type="button" onClick={() => {setZoom(1); setPan({x: 0, y: 0});}} aria-label="reset view">&#8635;</button>
        </div>
      </div>

      <svg
        className={styles.graphSvg}
        viewBox={`0 0 ${width} ${height}`}
        style={{height}}
        role="group"
        aria-label={`Concept graph neighborhood of ${hood.center.title}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} style={{transformOrigin: 'center'}}>
          {/* edges */}
          {hood.links.map((l, i) => {
            const a = layout.get(l.from);
            const b = layout.get(l.to);
            if (!a || !b) return null;
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const ex = b.x - (dx / len) * NODE_R;
            const ey = b.y - (dy / len) * NODE_R;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={ex}
                y2={ey}
                stroke={REL_COLOR[l.type]}
                strokeWidth={2}
                opacity={0.85}
              />
            );
          })}
          {/* nodes */}
          {hood.nodes.map((n) => {
            const p = layout.get(n.id)!;
            const isCenter = n.id === centerId;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x} ${p.y})`}
                tabIndex={0}
                role="button"
                aria-label={`${n.title}${isCenter ? ' (center)' : ''} — activate to recenter`}
                style={{cursor: 'pointer', outline: 'none'}}
                onClick={() => onSelect(n.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(n.id);
                  }
                }}>
                <circle
                  r={NODE_R}
                  fill={isCenter ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-200)'}
                  stroke={n.kind === 'ai-system' ? '#2563eb' : 'var(--ifm-color-emphasis-500)'}
                  strokeWidth={n.kind === 'ai-system' ? 3 : 1.5}
                />
                <text
                  className={styles.gNodeLabel}
                  textAnchor="middle"
                  y="4"
                  fill={isCenter ? '#fff' : 'var(--ifm-font-color-base)'}
                  style={{pointerEvents: 'none'}}>
                  {n.title.length > 14 ? n.title.slice(0, 12) + '\u2026' : n.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className={styles.legendRow}>
        {LEGEND.map((rel) => (
          <span key={rel} className={styles.legendItem}>
            <span className={styles.legendLine} style={{borderTopColor: REL_COLOR[rel]}} />
            {rel}
          </span>
        ))}
      </div>
    </div>
  );
}

export const ConceptGraph = React.memo(ConceptGraphImpl);
export default ConceptGraph;
