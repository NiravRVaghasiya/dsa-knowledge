import {describe, it, expect} from 'vitest';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ArrayRenderer} from '../../src/components/viz/renderers/ArrayRenderer';
import {GraphRenderer} from '../../src/components/viz/renderers/GraphRenderer';
import {TreeRenderer} from '../../src/components/viz/renderers/TreeRenderer';
import {MatrixRenderer} from '../../src/components/viz/renderers/MatrixRenderer';
import {Visualizer} from '../../src/components/viz/Visualizer';
import type {ArrayFrame, GraphFrame, TreeFrame, MatrixFrame} from '../../src/components/viz/model';

// These are "does it render at all + does it draw the data" smoke tests. They
// use react-dom/server (static markup) so no DOM/jsdom is required. Effects
// (timers) never fire during server rendering, so playback stays inert.

describe('ArrayRenderer', () => {
  it('renders one bar per element with the value shown', () => {
    const frame: ArrayFrame = {kind: 'array', array: [3, 7, 1], highlights: {1: 'active'}};
    const html = renderToStaticMarkup(<ArrayRenderer frame={frame} maxValue={7} />);
    expect(html).toContain('>3<');
    expect(html).toContain('>7<');
    expect(html).toContain('>1<');
    // active role maps to its blue color
    expect(html).toContain('#2563eb');
  });
});

describe('GraphRenderer', () => {
  it('renders an SVG with a circle per node and lines for edges', () => {
    const frame: GraphFrame = {
      kind: 'graph',
      nodes: [
        {id: 'A', x: 0.1, y: 0.5, role: 'active'},
        {id: 'B', x: 0.9, y: 0.5},
      ],
      edges: [{from: 'A', to: 'B', weight: 5, directed: true}],
    };
    const html = renderToStaticMarkup(<GraphRenderer frame={frame} />);
    expect(html).toContain('<svg');
    expect((html.match(/<circle/g) ?? []).length).toBe(2);
    expect(html).toContain('<line');
    expect(html).toContain('>5<'); // edge weight
    expect(html).toContain('marker'); // arrowhead def for directed edge
  });
});

describe('TreeRenderer', () => {
  it('renders nodes and parent→child edges', () => {
    const frame: TreeFrame = {
      kind: 'tree',
      nodes: [
        {id: '0', label: '8', depth: 0, parent: null, role: 'active'},
        {id: '1', label: '3', depth: 1, parent: '0', order: 1},
        {id: '2', label: '10', depth: 1, parent: '0'},
      ],
    };
    const html = renderToStaticMarkup(<TreeRenderer frame={frame} />);
    expect((html.match(/<circle/g) ?? []).length).toBe(3);
    expect((html.match(/<line/g) ?? []).length).toBe(2); // two parent edges
    expect(html).toContain('>8<');
    expect(html).toContain('#1'); // order badge
  });
});

describe('MatrixRenderer', () => {
  it('renders a table cell per matrix entry', () => {
    const frame: MatrixFrame = {
      kind: 'matrix',
      cells: [
        [1, 2],
        [3, 4],
      ],
      highlights: [{row: 0, col: 0, role: 'active'}],
    };
    const html = renderToStaticMarkup(<MatrixRenderer frame={frame} />);
    expect((html.match(/<td/g) ?? []).length).toBe(4);
    expect(html).toContain('>1<');
    expect(html).toContain('>4<');
  });
});

describe('Visualizer shell', () => {
  it('renders controls, step counter, and the first frame for each kind', () => {
    const arr: ArrayFrame = {kind: 'array', array: [1, 2], caption: 'hello', operation: 'init'};
    const html = renderToStaticMarkup(<Visualizer frames={[arr]} title="Test" />);
    expect(html).toContain('Test');
    expect(html).toContain('Step 1 / 1');
    expect(html).toContain('hello'); // caption in the edu panel
    expect(html).toContain('init'); // operation label
    expect(html).toContain('Play'); // controls
  });

  it('shows the invariant when present', () => {
    const arr: ArrayFrame = {kind: 'array', array: [1], invariant: 'left half sorted'};
    const html = renderToStaticMarkup(<Visualizer frames={[arr]} />);
    expect(html).toContain('left half sorted');
  });

  it('handles an empty frame list without crashing', () => {
    const html = renderToStaticMarkup(<Visualizer frames={[]} title="Empty" />);
    expect(html).toContain('No frames to display');
  });

  it('dispatches to the graph renderer for a graph frame', () => {
    const g: GraphFrame = {
      kind: 'graph',
      nodes: [{id: 'A', x: 0.5, y: 0.5}],
      edges: [],
    };
    const html = renderToStaticMarkup(<Visualizer frames={[g]} />);
    expect(html).toContain('<svg');
    expect(html).toContain('<circle');
  });
});
