import React, {useEffect, useRef, useState, useCallback} from 'react';
import styles from './styles.module.css';

// A single animation frame describing the state of an array at one step.
export type VizFrame = {
  array: number[];
  highlights?: Record<number, string>; // index -> color key: 'active'|'compare'|'done'|'window'
  pointers?: Record<string, number>;   // label -> index (e.g. {L: 0, R: 5})
  caption?: string;
};

export type AlgoVizProps = {
  frames: VizFrame[];
  title?: string;
  height?: number;
};

const COLORS: Record<string, string> = {
  active: '#2563eb',
  compare: '#f59e0b',
  done: '#22c55e',
  window: '#8b5cf6',
  default: '#64748b',
};

export default function AlgoViz({frames, title, height = 220}: AlgoVizProps) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // multiplier
  const timer = useRef<any>(null);

  const clamp = useCallback((n: number) => Math.max(0, Math.min(frames.length - 1, n)), [frames.length]);

  useEffect(() => {
    if (!playing) return;
    if (step >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setStep((s) => clamp(s + 1)), 900 / speed);
    return () => clearTimeout(timer.current);
  }, [playing, step, speed, frames.length, clamp]);

  const frame = frames[step] || {array: []};
  const maxVal = Math.max(...frames.flatMap((f) => f.array), 1);

  return (
    <div className={styles.viz}>
      <div className={styles.header}>
        <span className={styles.title}>{title || '🎬 Visualization'}</span>
        <span className={styles.counter}>Step {step + 1} / {frames.length}</span>
      </div>

      <div className={styles.stage} style={{height}}>
        <div className={styles.bars}>
          {frame.array.map((v, i) => {
            const key = frame.highlights?.[i];
            const color = COLORS[key || 'default'];
            const ptrLabels = Object.entries(frame.pointers || {})
              .filter(([, idx]) => idx === i)
              .map(([lab]) => lab);
            return (
              <div key={i} className={styles.barWrap}>
                {ptrLabels.length > 0 && (
                  <div className={styles.pointer}>{ptrLabels.join(',')}&#9660;</div>
                )}
                <div
                  className={styles.bar}
                  style={{
                    height: `${(v / maxVal) * 100}%`,
                    background: color,
                  }}>
                  <span className={styles.barVal}>{v}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {frame.caption && <div className={styles.caption}>{frame.caption}</div>}

      <div className={styles.controls}>
        <button onClick={() => {setPlaying(false); setStep(0);}}>&#9198;</button>
        <button onClick={() => {setPlaying(false); setStep((s) => clamp(s - 1));}}>&#9664;</button>
        <button className={styles.play} onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => {setPlaying(false); setStep((s) => clamp(s + 1));}}>&#9654;</button>
        <button onClick={() => {setPlaying(false); setStep(frames.length - 1);}}>&#9197;</button>
        <label className={styles.speed}>
          Speed
          <input
            type="range" min={0.5} max={3} step={0.5}
            value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
          {speed}x
        </label>
      </div>
    </div>
  );
}
