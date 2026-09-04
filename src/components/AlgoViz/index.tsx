import React, {useMemo} from 'react';
import Visualizer from '@site/src/components/viz/Visualizer';
import {adaptLegacyFrames} from '@site/src/components/viz/legacyAdapter';

// The canonical legacy frame type still lives in ./validateFrames so the
// content-validation tooling and existing .mdx authoring keep working unchanged.
export type {VizFrame} from './validateFrames';
import type {VizFrame} from './validateFrames';

export type AlgoVizProps = {
  frames: VizFrame[];
  title?: string;
  height?: number;
};

/**
 * AlgoViz — the original array visualizer, now a thin backward-compatible shim
 * over the generic Visualizer framework. It adapts the legacy `VizFrame`
 * (array + highlights + pointers + caption) into the generic ArrayFrame model
 * and delegates rendering + playback to <Visualizer>. All 15 existing consumers
 * keep the same props and behavior; they additionally gain keyboard controls,
 * a progress bar, and a color legend for free.
 */
export default function AlgoViz({frames, title, height = 220}: AlgoVizProps): React.ReactElement {
  const adapted = useMemo(() => adaptLegacyFrames(frames), [frames]);
  return (
    <Visualizer
      frames={adapted}
      title={title ?? '🎬 Visualization'}
      height={height}
      showLegend={false} // legacy widgets didn't show a legend; keep them lean
    />
  );
}
