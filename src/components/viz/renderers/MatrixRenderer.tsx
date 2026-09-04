import React from 'react';
import type {MatrixFrame, HighlightRole} from '../model';
import {roleColor} from '../colors';
import styles from '../viz.module.css';

export type MatrixRendererProps = {
  frame: MatrixFrame;
  height?: number;
};

function MatrixRendererImpl({frame}: MatrixRendererProps): React.ReactElement {
  const rows = frame.cells.length;
  const cols = frame.cells[0]?.length ?? 0;

  // Precompute the per-cell role lookup once.
  const cellRole = new Map<string, HighlightRole>();
  for (const h of frame.highlights ?? []) cellRole.set(`${h.row},${h.col}`, h.role);

  // For heatmaps, normalize by the max absolute value.
  const maxAbs = frame.heatmap
    ? Math.max(1, ...frame.cells.flat().map((v) => Math.abs(v)))
    : 1;

  return (
    <div className={styles.stage} style={{alignItems: 'center', overflow: 'auto'}}>
      <table className={styles.matrix} aria-label="matrix visualization">
        <tbody>
          {frame.cells.map((row, r) => {
            const rowRole = frame.rowHighlights?.[r];
            return (
              <tr key={r}>
                {row.map((v, c) => {
                  const colRole = frame.colHighlights?.[c];
                  const explicit = cellRole.get(`${r},${c}`);
                  const role = explicit ?? rowRole ?? colRole;
                  let background: string | undefined;
                  let color: string | undefined;
                  if (role) {
                    background = roleColor(role);
                    color = '#fff';
                  } else if (frame.heatmap) {
                    const intensity = Math.abs(v) / maxAbs; // 0..1
                    background = `rgba(37, 99, 235, ${0.12 + 0.78 * intensity})`;
                    color = intensity > 0.55 ? '#fff' : undefined;
                  }
                  return (
                    <td
                      key={c}
                      className={styles.matrixCell}
                      style={{background, color}}
                      aria-label={`cell ${r},${c} = ${v}${role ? `, ${role}` : ''}`}>
                      {v}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {(rows === 0 || cols === 0) && <div className={styles.caption}>Empty matrix.</div>}
    </div>
  );
}

export const MatrixRenderer = React.memo(MatrixRendererImpl);
