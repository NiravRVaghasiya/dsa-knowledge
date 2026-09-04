import React from 'react';
import type {TreeFrame, TreeNode} from '../model';
import {roleColor} from '../colors';
import styles from '../viz.module.css';

export type TreeRendererProps = {
  frame: TreeFrame;
  height?: number;
};

const PADDING = 40;
const NODE_R = 18;

/**
 * Lay out a rooted tree top-down. Binary-tree node ids are the level-order
 * array index (so x-position derives from index within a depth level); this
 * gives a clean, deterministic layout without a physics simulation.
 */
function layout(nodes: TreeNode[], width: number, height: number) {
  const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));
  // Group nodes by depth to spread them evenly across each level.
  const byDepth = new Map<number, TreeNode[]>();
  for (const n of nodes) {
    if (!byDepth.has(n.depth)) byDepth.set(n.depth, []);
    byDepth.get(n.depth)!.push(n);
  }
  const pos = new Map<string, {x: number; y: number}>();
  const levelGap = maxDepth === 0 ? 0 : (height - 2 * PADDING) / maxDepth;
  for (const [depth, level] of byDepth) {
    // Sort within a level by numeric id when possible for a stable left→right order.
    level.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    const gap = (width - 2 * PADDING) / (level.length + 1);
    level.forEach((n, i) => {
      pos.set(n.id, {x: PADDING + gap * (i + 1), y: PADDING + levelGap * depth});
    });
  }
  return pos;
}

function TreeRendererImpl({frame, height = 300}: TreeRendererProps): React.ReactElement {
  const width = 640;
  const pos = layout(frame.nodes, width, height);

  return (
    <div className={styles.stage} style={{height}}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="tree visualization">
        {/* Parent→child edges */}
        {frame.nodes.map((n) => {
          if (n.parent === null) return null;
          const p = pos.get(n.parent);
          const c = pos.get(n.id);
          if (!p || !c) return null;
          return (
            <line
              key={`edge-${n.id}`}
              x1={p.x}
              y1={p.y}
              x2={c.x}
              y2={c.y}
              stroke="var(--ifm-color-emphasis-400)"
              strokeWidth={1.8}
            />
          );
        })}
        {/* Nodes */}
        {frame.nodes.map((n) => {
          const p = pos.get(n.id)!;
          return (
            <g key={n.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={NODE_R}
                fill={roleColor(n.role)}
                stroke="var(--ifm-background-surface-color)"
                strokeWidth={2}
              />
              <text x={p.x} y={p.y + 4} className={styles.nodeLabel} textAnchor="middle">
                {n.label ?? n.id}
              </text>
              {n.order !== undefined && (
                <text
                  x={p.x + NODE_R + 2}
                  y={p.y - NODE_R + 4}
                  className={styles.orderBadge}
                  textAnchor="middle">
                  #{n.order}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export const TreeRenderer = React.memo(TreeRendererImpl);
