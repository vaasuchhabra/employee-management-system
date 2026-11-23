/**
 * Stack — LIFO.
 *
 * Used for: UNDO / REDO. Every add / edit / delete is pushed as a command
 *           onto the undo stack. Undo pops it, reverses it and pushes it
 *           onto the redo stack. Any new action clears the redo stack.
 *
 *  Operation   Time
 *  push        O(1) amortised
 *  pop         O(1)
 *  peek        O(1)
 */
export class Stack {
  constructor(limit = Infinity) {
    this.items = [];
    this.limit = limit;
  }

  push(item) {
    this.items.push(item);
    if (this.items.length > this.limit) this.items.shift(); // drop oldest history
    return this;
  }

  pop() {
    return this.items.pop();
  }

  peek() {
    return this.items[this.items.length - 1];
  }

  get size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  clear() {
    this.items.length = 0;
  }

  /** top first */
  toArray() {
    return this.items.slice().reverse();
  }
}
