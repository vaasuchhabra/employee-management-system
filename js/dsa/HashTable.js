/**
 * HashTable — implemented from scratch using SEPARATE CHAINING.
 *
 * Used for: O(1) average lookup of an employee by ID, unique-email checks,
 *           and department-wise grouping/aggregation.
 *
 *  Operation   Average   Worst
 *  set/get     O(1)      O(n)   (all keys collide in one bucket)
 *  delete      O(1)      O(n)
 *  resize      O(n)      amortised O(1) per insert
 */
export class HashTable {
  constructor(initialCapacity = 16, maxLoadFactor = 0.75) {
    this.capacity = initialCapacity;
    this.maxLoadFactor = maxLoadFactor;
    this.buckets = Array.from({ length: this.capacity }, () => []);
    this.count = 0;
    this.resizes = 0;
  }

  /**
   * djb2 string hash + a 32-bit "avalanche" finaliser -> bucket index.
   * Plain djb2 maps sequential keys (EMP1001, EMP1002, …) to sequential
   * values, which cluster in a power-of-two table; the finaliser (from
   * MurmurHash3) mixes every input bit into every output bit.
   */
  _hash(key, capacity = this.capacity) {
    const str = String(key);
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0; // h * 33 + c
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) % capacity;
  }

  set(key, value) {
    const bucket = this.buckets[this._hash(key)];
    for (const entry of bucket) {
      if (entry[0] === key) {
        entry[1] = value; // update existing key
        return this;
      }
    }
    bucket.push([key, value]);
    this.count++;
    if (this.loadFactor() > this.maxLoadFactor) this._resize(this.capacity * 2);
    return this;
  }

  get(key) {
    const bucket = this.buckets[this._hash(key)];
    for (const [k, v] of bucket) if (k === key) return v;
    return undefined;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    const bucket = this.buckets[this._hash(key)];
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0] === key) {
        bucket.splice(i, 1);
        this.count--;
        return true;
      }
    }
    return false;
  }

  _resize(newCapacity) {
    const old = this.buckets;
    this.capacity = newCapacity;
    this.buckets = Array.from({ length: newCapacity }, () => []);
    for (const bucket of old) {
      for (const [k, v] of bucket) this.buckets[this._hash(k)].push([k, v]);
    }
    this.resizes++;
  }

  get size() {
    return this.count;
  }

  loadFactor() {
    return this.count / this.capacity;
  }

  keys() {
    const out = [];
    for (const b of this.buckets) for (const [k] of b) out.push(k);
    return out;
  }

  values() {
    const out = [];
    for (const b of this.buckets) for (const [, v] of b) out.push(v);
    return out;
  }

  entries() {
    const out = [];
    for (const b of this.buckets) for (const e of b) out.push([e[0], e[1]]);
    return out;
  }

  clear() {
    this.buckets = Array.from({ length: this.capacity }, () => []);
    this.count = 0;
  }

  /** Statistics used by the DSA Lab page */
  stats() {
    const lengths = this.buckets.map((b) => b.length);
    const used = lengths.filter((l) => l > 0).length;
    return {
      capacity: this.capacity,
      size: this.count,
      loadFactor: this.loadFactor(),
      usedBuckets: used,
      emptyBuckets: this.capacity - used,
      longestChain: Math.max(0, ...lengths),
      collisions: lengths.reduce((s, l) => s + Math.max(0, l - 1), 0),
      resizes: this.resizes,
      lengths,
    };
  }
}
