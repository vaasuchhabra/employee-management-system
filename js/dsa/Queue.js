/**
 * Queue — FIFO, implemented with a SINGLY LINKED LIST (head = front, tail = rear).
 *
 * Used for: leave requests. Requests are processed strictly in the order
 *           they were submitted (first come, first served), and the
 *           activity log (bounded, oldest entry dropped first).
 *
 *  Operation   Time
 *  enqueue     O(1)
 *  dequeue     O(1)   (an array's shift() would be O(n))
 *  peek        O(1)
 */
class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export class Queue {
  constructor(items = []) {
    this.head = null;
    this.tail = null;
    this.length = 0;
    for (const it of items) this.enqueue(it);
  }

  enqueue(value) {
    const node = new ListNode(value);
    if (this.tail) this.tail.next = node;
    else this.head = node;
    this.tail = node;
    this.length++;
    return this;
  }

  dequeue() {
    if (!this.head) return undefined;
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this.length--;
    return value;
  }

  peek() {
    return this.head ? this.head.value : undefined;
  }

  get size() {
    return this.length;
  }

  isEmpty() {
    return this.length === 0;
  }

  /** Remove the first element matching predicate (used to cancel a request). O(n) */
  removeWhere(pred) {
    let prev = null;
    let cur = this.head;
    while (cur) {
      if (pred(cur.value)) {
        if (prev) prev.next = cur.next;
        else this.head = cur.next;
        if (cur === this.tail) this.tail = prev;
        this.length--;
        return cur.value;
      }
      prev = cur;
      cur = cur.next;
    }
    return undefined;
  }

  toArray() {
    const out = [];
    for (let n = this.head; n; n = n.next) out.push(n.value);
    return out;
  }

  *[Symbol.iterator]() {
    for (let n = this.head; n; n = n.next) yield n.value;
  }
}

/** Fixed-capacity queue: when full, the oldest element is dropped. */
export class BoundedQueue extends Queue {
  constructor(capacity = 50, items = []) {
    super();
    this.capacity = capacity;
    for (const it of items) this.enqueue(it);
  }

  enqueue(value) {
    super.enqueue(value);
    while (this.length > this.capacity) this.dequeue();
    return this;
  }
}
