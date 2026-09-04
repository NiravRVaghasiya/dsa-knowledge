// Playback state machine shared by every visualizer. Keeps the timer logic in
// one place (with correct cleanup on unmount) so renderers stay presentational.

import {useCallback, useEffect, useRef, useState} from 'react';

export type Player = {
  step: number;
  playing: boolean;
  speed: number;
  frameCount: number;
  setSpeed: (s: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  goTo: (n: number) => void;
};

const BASE_INTERVAL_MS = 900;

export function usePlayer(frameCount: number): Player {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clamp = useCallback(
    (n: number) => Math.max(0, Math.min(frameCount - 1, n)),
    [frameCount],
  );

  // Reset to a valid step if the frame set shrinks under us.
  useEffect(() => {
    setStep((s) => Math.min(s, Math.max(0, frameCount - 1)));
  }, [frameCount]);

  // Advance while playing; stop at the end. Always clears the timer on cleanup.
  useEffect(() => {
    if (!playing) return undefined;
    if (step >= frameCount - 1) {
      setPlaying(false);
      return undefined;
    }
    timer.current = setTimeout(() => setStep((s) => clamp(s + 1)), BASE_INTERVAL_MS / speed);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, step, speed, frameCount, clamp]);

  return {
    step,
    playing,
    speed,
    frameCount,
    setSpeed,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    next: () => {
      setPlaying(false);
      setStep((s) => clamp(s + 1));
    },
    prev: () => {
      setPlaying(false);
      setStep((s) => clamp(s - 1));
    },
    first: () => {
      setPlaying(false);
      setStep(0);
    },
    last: () => {
      setPlaying(false);
      setStep(clamp(frameCount - 1));
    },
    goTo: (n: number) => {
      setPlaying(false);
      setStep(clamp(n));
    },
  };
}
