/**
 * Binary Heap (array based) with a custom comparator.
 *
 * compare(a, b) < 0  means  a has HIGHER priority than b (sits nearer the top).
 *   MinHeap:  (a, b) => a - b
 *   MaxHeap:  (a, b) => b - a
 *
 * Used for: Top-K highest-paid employees, Top performers, and Heap Sort.
 *
 *  Operation   Time
 *  push        O(log n)
 *  pop         O(log n)
 *  peek        O(1)
 *  heapify     O(n)
 *  topK        O(n log k)   (min-heap of size k)
 */
export class Heap {
  constructor(compare = (a, b) => a - b, items = []) {
    this.compare = compare;
    this.data = items.slice();
    // Floyd's bottom-up heapify: O(n)
    for (let i = (this.data.length >> 1) - 1; i >= 0; i--) this._down(i);
  }

  get size() {
    return this.data.length;
  }

  isEmpty() {
    return this.data.length === 0;
  }

  peek() {
    return this.data[0];
  }

  push(item) {
    this.data.push(item);
    this._up(this.data.length - 1);
  }

  pop() {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length) {
      this.data[0] = last;
      this._down(0);
    }
    return top;
  }

  _up(i) {
    const d = this.data;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.compare(d[i], d[p]) >= 0) break;
      [d[i], d[p]] = [d[p], d[i]];
      i = p;
    }
  }

  _down(i) {
    const d = this.data;
    const n = d.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let best = i;
      if (l < n && this.compare(d[l], d[best]) < 0) best = l;
      if (r < n && this.compare(d[r], d[best]) < 0) best = r;
      if (best === i) break;
      [d[i], d[best]] = [d[best], d[i]];
      i = best;
    }
  }

  toArray() {
    return this.data.slice();
  }

  /**
   * Top-K largest items according to `score`.
   * Keeps a MIN-heap of size k: the smallest of the current top-k is on top,
   * and is evicted whenever a bigger item arrives.  O(n log k)
   */
  static topK(items, k, score) {
    if (k <= 0) return [];
    const heap = new Heap((a, b) => score(a) - score(b));
    for (const it of items) {
      if (heap.size < k) heap.push(it);
      else if (score(it) > score(heap.peek())) {
        heap.data[0] = it;
        heap._down(0);
      }
    }
    const out = [];
    while (heap.size) out.push(heap.pop());
    return out.reverse(); // highest first
  }
}
