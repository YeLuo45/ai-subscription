/**
 * TarjanSCC.ts — Tarjan's algorithm for Strongly Connected Components
 *
 * Inspired by: chatdev-design Tarjan SCC (for cycle detection in cyclic graphs)
 * Source pattern: /home/hermes/projects/chatdev-design/docs-site/zh/execution.md (Section 3.1)
 *
 * Iterative implementation to avoid stack overflow on large graphs.
 * Time complexity: O(V + E)
 */

export function tarjanSCC(
  nodes: string[],
  getSuccessors: (id: string) => string[],
): string[][] {
  const indexOf = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) indexOf.set(nodes[i], i);

  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let index = 0;

  // Iterative DFS using explicit work stack
  // Each frame: { node, successorIdx, successors }
  interface Frame {
    node: string;
    successors: string[];
    idx: number;
  }

  const visit = (root: string) => {
    const work: Frame[] = [{ node: root, successors: getSuccessors(root), idx: 0 }];
    indices.set(root, index);
    lowlinks.set(root, index);
    index += 1;
    stack.push(root);
    onStack.add(root);

    while (work.length > 0) {
      const top = work[work.length - 1];
      if (top.idx < top.successors.length) {
        const w = top.successors[top.idx];
        top.idx += 1;
        if (!indices.has(w)) {
          // Recurse into w
          indices.set(w, index);
          lowlinks.set(w, index);
          index += 1;
          stack.push(w);
          onStack.add(w);
          work.push({ node: w, successors: getSuccessors(w), idx: 0 });
        } else if (onStack.has(w)) {
          // Back edge — update lowlink
          lowlinks.set(top.node, Math.min(lowlinks.get(top.node)!, indices.get(w)!));
        }
      } else {
        // All successors processed — check if root of SCC
        if (lowlinks.get(top.node) === indices.get(top.node)) {
          const scc: string[] = [];
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const w = stack.pop()!;
            onStack.delete(w);
            scc.push(w);
            if (w === top.node) break;
          }
          sccs.push(scc);
        }
        work.pop();
        // Update parent's lowlink
        if (work.length > 0) {
          const parent = work[work.length - 1];
          lowlinks.set(
            parent.node,
            Math.min(lowlinks.get(parent.node)!, lowlinks.get(top.node)!),
          );
        }
      }
    }
  };

  for (const node of nodes) {
    if (!indices.has(node)) {
      visit(node);
    }
  }

  return sccs;
}
