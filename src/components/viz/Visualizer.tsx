import React, {useMemo, useRef} from 'react';
import type {Frame} from './model';
import {usePlayer} from './usePlayer';
import {ROLE_LEGEND, ROLE_COLORS} from './colors';
import {ArrayRenderer} from './renderers/ArrayRenderer';
import {GraphRenderer} from './renderers/GraphRenderer';
import {TreeRenderer} from './renderers/TreeRenderer';
import {MatrixRenderer} from './renderers/MatrixRenderer';
import styles from './viz.module.css';

export type VisualizerProps = {
  frames: readonly Frame[];
  title?: string;
  height?: number;
  /** Show the role→color legend. Default true. */
  showLegend?: boolean;
};

/** Which highlight roles actually appear anywhere in the frames (for the legend). */
function usedRoles(frames: readonly Frame[]): Set<string> {
  const roles = new Set<string>();
  for (const f of frames) {
    if (f.kind === 'array') {
      Object.values(f.highlights ?? {}).forEach((r) => roles.add(r));
    } else if (f.kind === 'graph') {
      f.nodes.forEach((n) => n.role && roles.add(n.role));
      f.edges.forEach((e) => e.role && roles.add(e.role));
    } else if (f.kind === 'tree') {
      f.nodes.forEach((n) => n.role && roles.add(n.role));
    } else if (f.kind === 'matrix') {
      (f.highlights ?? []).forEach((h) => roles.add(h.role));
      Object.values(f.rowHighlights ?? {}).forEach((r) => roles.add(r));
      Object.values(f.colHighlights ?? {}).forEach((r) => roles.add(r));
    }
  }
  roles.delete('default');
  return roles;
}

function renderFrame(frame: Frame, height: number): React.ReactElement {
  switch (frame.kind) {
    case 'array':
      // maxValue is injected by the parent (stable across frames); fall back here.
      return <ArrayRenderer frame={frame} maxValue={Math.max(1, ...frame.array.map(Math.abs))} height={height} />;
    case 'graph':
      return <GraphRenderer frame={frame} height={height} />;
    case 'tree':
      return <TreeRenderer frame={frame} height={height} />;
    case 'matrix':
      return <MatrixRenderer frame={frame} height={height} />;
  }
}

/**
 * The generic visualization shell. It is renderer-agnostic: it plays a frame
 * sequence, shows shared controls + an educational panel, and delegates
 * drawing to the sub-renderer that matches `frame.kind`.
 */
export function Visualizer({
  frames,
  title,
  height = 300,
  showLegend = true,
}: VisualizerProps): React.ReactElement {
  const frameCount = frames?.length ?? 0;
  const player = usePlayer(frameCount);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stable max across all ARRAY frames so bars don't rescale mid-playback.
  const arrayMax = useMemo(() => {
    let m = 1;
    for (const f of frames ?? []) {
      if (f.kind === 'array') for (const v of f.array) m = Math.max(m, Math.abs(v));
    }
    return m;
  }, [frames]);

  const roles = useMemo(() => usedRoles(frames ?? []), [frames]);

  if (frameCount === 0) {
    return (
      <div className={styles.viz}>
        <div className={styles.header}>
          <span className={styles.title}>{title ?? '🎬 Visualization'}</span>
        </div>
        <div className={styles.eduPanel}>No frames to display.</div>
      </div>
    );
  }

  const frame = frames[Math.min(player.step, frameCount - 1)];

  // Keyboard controls when the widget is focused (space/←/→/Home/End).
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        player.toggle();
        break;
      case 'ArrowRight':
        e.preventDefault();
        player.next();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        player.prev();
        break;
      case 'Home':
        e.preventDefault();
        player.first();
        break;
      case 'End':
        e.preventDefault();
        player.last();
        break;
      default:
        break;
    }
  };

  const progress = frameCount <= 1 ? 100 : (player.step / (frameCount - 1)) * 100;

  return (
    <div
      className={styles.viz}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-label={`${title ?? 'Visualization'} — use space to play, arrow keys to step`}>
      <div className={styles.header}>
        <span className={styles.title}>{title ?? '🎬 Visualization'}</span>
        <span className={styles.counter}>
          Step {player.step + 1} / {frameCount}
        </span>
      </div>

      {/*
        Screen-reader announcement of the current step. The visualization is a
        visual enhancement; this live region gives non-visual users the same
        step-by-step narrative (operation + caption + invariant) as frames
        advance. Visually hidden so it doesn't duplicate the on-screen panel.
      */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}>
        {`Step ${player.step + 1} of ${frameCount}. ${frame.operation ? frame.operation + '. ' : ''}${
          frame.caption ?? ''
        }${frame.invariant ? ' Invariant: ' + frame.invariant : ''}`}
      </div>

      {/* current frame */}
      {frame.kind === 'array' ? (
        <ArrayRenderer frame={frame} maxValue={arrayMax} height={height} />
      ) : (
        renderFrame(frame, height)
      )}

      {/* progress bar (click to scrub) */}
      <div
        className={styles.progressTrack}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          player.goTo(Math.round(ratio * (frameCount - 1)));
        }}>
        <div className={styles.progressFill} style={{width: `${progress}%`}} />
      </div>

      {/* educational panel: operation + caption + invariant + annotations */}
      <div className={styles.eduPanel}>
        <div className={styles.caption}>
          {frame.operation && <span className={styles.eduOp}>{frame.operation}</span>}
          {frame.caption}
        </div>
        {frame.invariant && <div className={styles.invariant}>Invariant: {frame.invariant}</div>}
        {frame.annotations && frame.annotations.length > 0 && (
          <div className={styles.annotations}>
            {frame.annotations.map((a, i) => (
              <span key={i} className={styles.annotation}>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* legend (only roles actually used) */}
      {showLegend && roles.size > 0 && (
        <div className={styles.legend}>
          {ROLE_LEGEND.filter((l) => roles.has(l.role)).map((l) => (
            <span key={l.role} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{background: ROLE_COLORS[l.role]}} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      {/* controls */}
      <div className={styles.controls}>
        <button onClick={player.first} disabled={player.step === 0} aria-label="restart">
          &#9198;
        </button>
        <button onClick={player.prev} disabled={player.step === 0} aria-label="previous">
          &#9664;
        </button>
        <button className={styles.play} onClick={player.toggle} aria-label={player.playing ? 'pause' : 'play'}>
          {player.playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={player.next} disabled={player.step >= frameCount - 1} aria-label="next">
          &#9654;
        </button>
        <button onClick={player.last} disabled={player.step >= frameCount - 1} aria-label="last">
          &#9197;
        </button>
        <label className={styles.speed}>
          Speed
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.5}
            value={player.speed}
            onChange={(e) => player.setSpeed(parseFloat(e.target.value))}
          />
          {player.speed}x
        </label>
      </div>
    </div>
  );
}

export default Visualizer;
