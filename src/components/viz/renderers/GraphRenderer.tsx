import React from 'react';
import type {GraphFrame} from '../model';
import {roleColor} from '../colors';
import styles from '../viz.module.css';

export type GraphRendererProps = {
  frame: GraphFrame;
  height?: number;
};

const PADDING = 36; // px inset so nodes/labels aren't clipped
const NODE_R = 18;
/** Above this many elements we stop drawing edge weights/arrowheads to stay smooth. */
const DETAIL_LIMIT = 400;

function GraphRendererImpl({frame, height = 320}: GraphRendererProps): React.ReactElement {
  const width = 640; // SVG user-space width; scales responsively via viewBox
  const nodeById = new Map(frame.nodes.map((n) => [n.id, n]));
  const elementCount = frame.nodes.length + frame.edges.length;
  const detailed = elementCount <= DETAIL_LIMIT;

  const sx = (x: number) => PADDING + x * (width - 2 * PADDING);
  const sy = (y: number) => PADDING + y * (height - 2 * PADDING);

  return (
    <div className={styles.stage} style={{height}}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="graph visualization">
        <defs>
          <marker
            id="viz-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ifm-color-emphasis-600)" />
          </marker>
        </defs>

        {/* Edges first so nodes draw on top */}
        {frame.edges.map((e, i) => {
          const a = nodeById.get(e.from);
          const b = nodeById.get(e.to);
          if (!a || !b) return null;
          const x1 = sx(a.x);
          const y1 = sy(a.y);
          const x2 = sx(b.x);
          const y2 = sy(b.y);
          // Shorten the line so an arrowhead ends at the node border.
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const ex = x2 - (dx / len) * NODE_R;
          const ey = y2 - (dy / len) * NODE_R;
          const highlighted = e.role && e.role !== 'default';
          const color = highlighted ? roleColor(e.role) : 'var(--ifm-color-emphasis-400)';
          return (
            <g key={`e${i}`}>
              <line
                x1={x1}
                y1={y1}
                x2={ex}
                y2={ey}
                stroke={color}
                strokeWidth={highlighted ? 3.5 : 1.8}
                markerEnd={detailed && e.directed ? 'url(#viz-arrow)' : undefined}
              />
              {detailed && e.weight !== undefined && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  className={styles.edgeWeight}
                  textAnchor="middle">
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {frame.nodes.map((n) => {
          const cx = sx(n.x);
          const cy = sy(n.y);
          return (
            <g key={n.id}>
              <circle
                cx={cx}
                cy={cy}
                r={NODE_R}
                fill={roleColor(n.role)}
                stroke="var(--ifm-background-surface-color)"
                strokeWidth={2}
              />
              <text x={cx} y={cy + 4} className={styles.nodeLabel} textAnchor="middle">
                {n.label ?? n.id}
              </text>
              {n.value !== undefined && (
                <text x={cx} y={cy + NODE_R + 14} className={styles.nodeValue} textAnchor="middle">
                  {n.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const GraphRenderer = React.memo(GraphRendererImpl);
