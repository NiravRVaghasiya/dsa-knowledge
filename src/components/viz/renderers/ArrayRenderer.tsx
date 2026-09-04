import React from 'react';
import type {ArrayFrame} from '../model';
import {roleColor} from '../colors';
import styles from '../viz.module.css';

export type ArrayRendererProps = {
  frame: ArrayFrame;
  /** Shared max across all frames so bar heights are stable during playback. */
  maxValue: number;
  height?: number;
};

/**
 * Presentational bar-chart renderer for an ArrayFrame. Pure/memoized: it never
 * runs algorithm logic, only draws the frame it is given.
 */
function ArrayRendererImpl({frame, maxValue, height = 220}: ArrayRendererProps): React.ReactElement {
  const max = maxValue || 1;
  return (
    <div className={styles.stage} style={{height}}>
      <div className={styles.bars}>
        {frame.array.map((v, i) => {
          const role = frame.highlights?.[i];
          const ptrLabels = Object.entries(frame.pointers ?? {})
            .filter(([, idx]) => idx === i)
            .map(([lab]) => lab);
          // Support negative values by measuring from the min baseline of 0.
          const pct = max === 0 ? 0 : (Math.abs(v) / max) * 100;
          return (
            <div key={i} className={styles.barWrap}>
              {ptrLabels.length > 0 && (
                <div className={styles.pointer}>
                  {ptrLabels.join(',')}&#9660;
                </div>
              )}
              <div
                className={styles.bar}
                style={{height: `${pct}%`, background: roleColor(role)}}
                aria-label={`index ${i}, value ${v}${role ? `, ${role}` : ''}`}>
                <span className={styles.barVal}>{v}</span>
              </div>
              <div className={styles.barIndex}>{i}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ArrayRenderer = React.memo(ArrayRendererImpl);
