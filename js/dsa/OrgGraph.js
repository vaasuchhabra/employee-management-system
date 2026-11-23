/**
 * OrgGraph — the reporting hierarchy as a GRAPH stored in an ADJACENCY LIST.
 *
 * Directed edge  manager -> report  (it is a tree / forest: every employee
 * has at most one manager). Edges are also walked undirected to find the
 * shortest "communication path" between two employees.
 *
 *  Operation               Algorithm          Time
 *  levelOrder(root)        BFS                O(V + E)
 *  preorder(root)          DFS (recursive)    O(V + E)
 *  chainOfCommand(id)      walk parent links  O(depth)
 *  shortestPath(a, b)      BFS (undirected)   O(V + E)
 *  wouldCreateCycle(a, m)  walk up from m     O(depth)
 *  subtreeSize(id)         DFS                O(size of subtree)
 */
export class OrgGraph {
  constructor() {
    this.children = new Map(); // id -> Set(reportIds)   (adjacency list)
    this.parent = new Map(); // id -> managerId | null
  }

  addNode(id, managerId = null) {
    if (!this.children.has(id)) this.children.set(id, new Set());
    this.setManager(id, managerId);
  }

  setManager(id, managerId) {
    const old = this.parent.get(id);
    if (old != null && this.children.has(old)) this.children.get(old).delete(id);
    if (managerId != null && managerId !== id) {
      if (!this.children.has(managerId)) this.children.set(managerId, new Set());
      this.children.get(managerId).add(id);
      this.parent.set(id, managerId);
    } else {
      this.parent.set(id, null);
    }
  }

  /** Remove a node; its direct reports are re-assigned to its own manager. */
  removeNode(id) {
    if (!this.children.has(id)) return [];
    const mgr = this.parent.get(id) ?? null;
    const orphans = [...this.children.get(id)];
    for (const c of orphans) this.setManager(c, mgr);
    if (mgr != null && this.children.has(mgr)) this.children.get(mgr).delete(id);
    this.children.delete(id);
    this.parent.delete(id);
    return orphans; // so the caller can update the employee records
  }

  has(id) {
    return this.children.has(id);
  }

  roots() {
    return [...this.parent.entries()].filter(([, p]) => p == null).map(([id]) => id);
  }

  reportsOf(id) {
    return [...(this.children.get(id) || [])];
  }

  /** BFS — returns array of levels: [[root], [level 1 ids], ...] */
  levelOrder(rootId) {
    if (!this.children.has(rootId)) return [];
    const levels = [];
    let frontier = [rootId];
    while (frontier.length) {
      levels.push(frontier);
      const next = [];
      for (const id of frontier) next.push(...this.children.get(id));
      frontier = next;
    }
    return levels;
  }

  /** DFS pre-order — returns [{id, depth}] */
  preorder(rootId, sortFn) {
    const out = [];
    const visit = (id, depth) => {
      out.push({ id, depth });
      let kids = [...(this.children.get(id) || [])];
      if (sortFn) kids = sortFn(kids);
      for (const k of kids) visit(k, depth + 1);
    };
    if (this.children.has(rootId)) visit(rootId, 0);
    return out;
  }

  /** Path from employee up to the top of the hierarchy */
  chainOfCommand(id) {
    const chain = [];
    const seen = new Set();
    let cur = id;
    while (cur != null && !seen.has(cur)) {
      chain.push(cur);
      seen.add(cur);
      cur = this.parent.get(cur);
    }
    return chain;
  }

  depth(id) {
    return this.chainOfCommand(id).length - 1;
  }

  subtreeSize(id) {
    let count = 0;
    const stack = [id];
    while (stack.length) {
      const n = stack.pop();
      count++;
      for (const c of this.children.get(n) || []) stack.push(c);
    }
    return count;
  }

  /** Would making `managerId` the manager of `id` create a cycle? */
  wouldCreateCycle(id, managerId) {
    if (managerId == null) return false;
    if (managerId === id) return true;
    let cur = managerId;
    const seen = new Set();
    while (cur != null && !seen.has(cur)) {
      if (cur === id) return true;
      seen.add(cur);
      cur = this.parent.get(cur);
    }
    return false;
  }

  /** Shortest path (fewest hops) between two employees, edges undirected. */
  shortestPath(a, b) {
    if (!this.children.has(a) || !this.children.has(b)) return [];
    if (a === b) return [a];
    const prev = new Map([[a, null]]);
    const queue = [a];
    let head = 0; // index pointer -> O(1) dequeue
    while (head < queue.length) {
      const cur = queue[head++];
      const neighbours = [...this.children.get(cur)];
      const p = this.parent.get(cur);
      if (p != null) neighbours.push(p);
      for (const nb of neighbours) {
        if (prev.has(nb)) continue;
        prev.set(nb, cur);
        if (nb === b) {
          const path = [b];
          let x = cur;
          while (x != null) {
            path.push(x);
            x = prev.get(x);
          }
          return path.reverse();
        }
        queue.push(nb);
      }
    }
    return [];
  }

  /** Lowest common manager of two employees */
  lowestCommonManager(a, b) {
    const up = new Set(this.chainOfCommand(a));
    for (const id of this.chainOfCommand(b)) if (up.has(id)) return id;
    return null;
  }

  clear() {
    this.children.clear();
    this.parent.clear();
  }
}
