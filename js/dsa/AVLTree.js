/**
 * AVL Tree — a self-balancing Binary Search Tree.
 *
 * Used for: the salary index. Keeps employees ordered by salary so that
 *           "find everyone earning between X and Y" is a RANGE QUERY in
 *           O(log n + k) instead of scanning all n employees.
 *
 *  Operation      Time
 *  insert         O(log n)
 *  remove         O(log n)
 *  min / max      O(log n)
 *  rangeQuery     O(log n + k)   k = number of results
 *  inorder        O(n)
 *
 * Duplicate salaries are allowed: the key is compared with a comparator
 * that breaks ties on employee id, so every node is unique.
 */
class AVLNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

const h = (n) => (n ? n.height : 0);
const update = (n) => {
  n.height = 1 + Math.max(h(n.left), h(n.right));
};
const balanceOf = (n) => (n ? h(n.left) - h(n.right) : 0);

export class AVLTree {
  /** @param {(a:any,b:any)=>number} compare */
  constructor(compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0)) {
    this.root = null;
    this.compare = compare;
    this.count = 0;
    this.rotations = 0;
  }

  _rotateRight(y) {
    const x = y.left;
    y.left = x.right;
    x.right = y;
    update(y);
    update(x);
    this.rotations++;
    return x;
  }

  _rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    y.left = x;
    update(x);
    update(y);
    this.rotations++;
    return y;
  }

  _rebalance(node) {
    update(node);
    const bf = balanceOf(node);
    if (bf > 1) {
      // Left-Right case -> rotate child first
      if (balanceOf(node.left) < 0) node.left = this._rotateLeft(node.left);
      return this._rotateRight(node); // Left-Left case
    }
    if (bf < -1) {
      // Right-Left case
      if (balanceOf(node.right) > 0) node.right = this._rotateRight(node.right);
      return this._rotateLeft(node); // Right-Right case
    }
    return node;
  }

  insert(key, value) {
    this.root = this._insert(this.root, key, value);
    return this;
  }

  _insert(node, key, value) {
    if (!node) {
      this.count++;
      return new AVLNode(key, value);
    }
    const c = this.compare(key, node.key);
    if (c < 0) node.left = this._insert(node.left, key, value);
    else if (c > 0) node.right = this._insert(node.right, key, value);
    else {
      node.value = value; // same key -> replace
      return node;
    }
    return this._rebalance(node);
  }

  remove(key) {
    const before = this.count;
    this.root = this._remove(this.root, key);
    return this.count < before;
  }

  _remove(node, key) {
    if (!node) return null;
    const c = this.compare(key, node.key);
    if (c < 0) node.left = this._remove(node.left, key);
    else if (c > 0) node.right = this._remove(node.right, key);
    else {
      if (!node.left || !node.right) {
        this.count--;
        return node.left || node.right;
      }
      // two children: replace with in-order successor
      let succ = node.right;
      while (succ.left) succ = succ.left;
      node.key = succ.key;
      node.value = succ.value;
      node.right = this._remove(node.right, succ.key);
    }
    return this._rebalance(node);
  }

  find(key) {
    let n = this.root;
    while (n) {
      const c = this.compare(key, n.key);
      if (c === 0) return n.value;
      n = c < 0 ? n.left : n.right;
    }
    return undefined;
  }

  min() {
    let n = this.root;
    if (!n) return undefined;
    while (n.left) n = n.left;
    return n.value;
  }

  max() {
    let n = this.root;
    if (!n) return undefined;
    while (n.right) n = n.right;
    return n.value;
  }

  /** All values with lo <= key <= hi, in ascending order. Prunes subtrees. */
  rangeQuery(lo, hi) {
    const out = [];
    let visited = 0;
    const walk = (n) => {
      if (!n) return;
      visited++;
      const cLo = this.compare(n.key, lo);
      const cHi = this.compare(n.key, hi);
      if (cLo > 0) walk(n.left); // left subtree may still contain keys >= lo
      if (cLo >= 0 && cHi <= 0) out.push(n.value);
      if (cHi < 0) walk(n.right); // right subtree may still contain keys <= hi
    };
    walk(this.root);
    this.lastVisited = visited;
    return out;
  }

  /** Number of keys in [lo, hi] */
  countRange(lo, hi) {
    return this.rangeQuery(lo, hi).length;
  }

  inorder() {
    const out = [];
    const stack = [];
    let n = this.root;
    while (n || stack.length) {
      while (n) {
        stack.push(n);
        n = n.left;
      }
      n = stack.pop();
      out.push(n.value);
      n = n.right;
    }
    return out;
  }

  get size() {
    return this.count;
  }

  height() {
    return h(this.root);
  }

  /** Returns the first `depth` levels as arrays of keys (for visualisation). */
  levels(depth = 4) {
    const result = [];
    let level = [this.root];
    for (let d = 0; d < depth && level.some(Boolean); d++) {
      result.push(level.map((n) => (n ? n.key : null)));
      const next = [];
      for (const n of level) next.push(n ? n.left : null, n ? n.right : null);
      level = next;
    }
    return result;
  }

  isBalanced() {
    const check = (n) => {
      if (!n) return 0;
      const l = check(n.left);
      const r = check(n.right);
      if (l < 0 || r < 0 || Math.abs(l - r) > 1) return -1;
      return 1 + Math.max(l, r);
    };
    return check(this.root) >= 0;
  }

  clear() {
    this.root = null;
    this.count = 0;
  }
}
