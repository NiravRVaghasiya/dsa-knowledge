// Pure frame builders for tree algorithms: BST in-order traversal and binary
// heap insertion (sift-up). Both use an array-backed complete/binary tree and
// emit a TreeFrame per step. No React/DOM.

import type {TreeFrame, TreeNode, HighlightRole} from '../model';

/** A binary tree node given as a flat array in level order (null = absent). */
export type BinaryTreeArray = Array<number | null>;

function buildNodes(
  tree: BinaryTreeArray,
  roles: Record<number, HighlightRole>,
  orders: Record<number, number>,
): TreeNode[] {
  const nodes: TreeNode[] = [];
  for (let i = 0; i < tree.length; i++) {
    if (tree[i] === null || tree[i] === undefined) continue;
    // A present node's parent slot (i-1)>>1 is always present in these
    // level-order encodings (complete heaps; well-formed BST arrays).
    const parent = i === 0 ? null : String((i - 1) >> 1);
    const depth = Math.floor(Math.log2(i + 1)); // depth = floor(log2(i+1))
    nodes.push({
      id: String(i),
      label: String(tree[i]),
      depth,
      parent,
      role: roles[i] ?? 'default',
      ...(orders[i] !== undefined ? {order: orders[i]} : {}),
    });
  }
  return nodes;
}

function treeFrame(
  tree: BinaryTreeArray,
  roles: Record<number, HighlightRole>,
  orders: Record<number, number>,
  meta: {caption?: string; operation?: string; invariant?: string},
): TreeFrame {
  return {kind: 'tree', nodes: buildNodes(tree, roles, orders), ...meta};
}

/**
 * In-order traversal (Left, Node, Right) of a binary tree stored in a level-
 * order array. Marks each node 'active' when visited and stamps its visit
 * order — demonstrating that in-order of a BST yields sorted output.
 */
export function inorderTraversalFrames(tree: BinaryTreeArray): TreeFrame[] {
  const frames: TreeFrame[] = [];
  const roles: Record<number, HighlightRole> = {};
  const orders: Record<number, number> = {};
  let counter = 0;

  frames.push(
    treeFrame(tree, roles, orders, {
      operation: 'init',
      caption: 'In-order traversal = Left → Node → Right. On a BST it yields sorted output.',
      invariant: 'Visit a node only after its entire left subtree.',
    }),
  );

  const visit = (i: number) => {
    if (i >= tree.length || tree[i] === null || tree[i] === undefined) return;
    visit(2 * i + 1); // left
    counter += 1;
    orders[i] = counter;
    roles[i] = 'active';
    frames.push(
      treeFrame(tree, {...roles}, {...orders}, {
        operation: 'visit node',
        caption: `Visit ${tree[i]} (position ${counter} in sorted order).`,
        invariant: 'All smaller keys have already been visited.',
      }),
    );
    roles[i] = 'done';
    visit(2 * i + 2); // right
  };
  visit(0);

  frames.push(
    treeFrame(tree, {...roles}, {...orders}, {
      operation: 'done',
      caption: 'Traversal complete — the visit order is the sorted key sequence. ✓',
      invariant: 'In-order of a BST is monotonically increasing.',
    }),
  );
  return frames;
}

/**
 * Binary min-heap insertion via sift-up. Appends the new value at the end,
 * then bubbles it up while it is smaller than its parent — showing how the
 * heap property is restored along one root-to-leaf path.
 */
export function heapInsertFrames(initial: number[], value: number): TreeFrame[] {
  const heap: number[] = [...initial];
  const frames: TreeFrame[] = [];
  const toTree = (): BinaryTreeArray => heap.map((v) => v);

  frames.push(
    treeFrame(toTree(), {}, {}, {
      operation: 'init',
      caption: `Insert ${value} into a min-heap of ${heap.length}. New nodes go at the end.`,
      invariant: 'Every parent ≤ its children.',
    }),
  );

  heap.push(value);
  let i = heap.length - 1;
  frames.push(
    treeFrame(toTree(), {[i]: 'active'}, {}, {
      operation: 'append',
      caption: `Append ${value} at index ${i} (keeps the tree complete).`,
      invariant: 'The heap property may be temporarily violated only along the new path.',
    }),
  );

  while (i > 0) {
    const parent = (i - 1) >> 1;
    frames.push(
      treeFrame(toTree(), {[i]: 'active', [parent]: 'compare'}, {}, {
        operation: 'compare with parent',
        caption: `Compare ${heap[i]} with parent ${heap[parent]}.`,
        invariant: 'Sift-up only touches ancestors on one path (O(log n)).',
      }),
    );
    if (heap[i] < heap[parent]) {
      [heap[i], heap[parent]] = [heap[parent], heap[i]];
      frames.push(
        treeFrame(toTree(), {[i]: 'compare', [parent]: 'active'}, {}, {
          operation: 'swap up',
          caption: `${heap[parent]} < ${heap[i]} → swap upward.`,
          invariant: 'The smaller value rises toward the root.',
        }),
      );
      i = parent;
    } else {
      break;
    }
  }

  frames.push(
    treeFrame(toTree(), {[i]: 'done'}, {}, {
      operation: 'done',
      caption: 'Heap property restored. Insertion complete. ✓',
      invariant: 'Every parent ≤ its children again.',
    }),
  );
  return frames;
}
