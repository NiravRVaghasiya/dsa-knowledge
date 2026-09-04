import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import PythonRunner from '@site/src/components/PythonRunner';
import AlgoViz from '@site/src/components/AlgoViz';
import Visualizer from '@site/src/components/viz/Visualizer';

export default {
  ...MDXComponents,
  PythonRunner,
  AlgoViz, // legacy array visualizer (backward compatible)
  Visualizer, // generic frame-based visualizer (arrays/graphs/trees/matrices)
};
