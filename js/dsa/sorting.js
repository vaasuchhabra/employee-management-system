/**
 * Sorting & Searching algorithms (implemented from scratch).
 *
 *  Algorithm     Best        Average     Worst       Space     Stable
 *  Merge Sort    n log n     n log n     n log n     O(n)      yes
 *  Quick Sort    n log n     n log n     n^2         O(log n)  no
 *  Heap Sort     n log n     n log n     n log n     O(1)      no
 *  Insertion     n           n^2         n^2         O(1)      yes
 *  Binary Search 1           log n       log n       O(1)      -
 *
 * Every function takes a comparator cmp(a, b) -> negative | 0 | positive
 * and returns a NEW array (the input is not mutated).
 */

export function mergeSort(arr, cmp) {
  const a = arr.slice();
  if (a.length < 2) return a;
  const buf = new Array(a.length);
  const sort = (lo, hi) => {
    if (hi - lo < 1) return;
    if (hi - lo < 12) return insertionRange(a, lo, hi, cmp); // small runs
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid + 1, hi);
    if (cmp(a[mid], a[mid + 1]) <= 0) return; // already in order
    let i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) buf[k++] = cmp(a[i], a[j]) <= 0 ? a[i++] : a[j++];
    while (i <= mid) buf[k++] = a[i++];
    while (j <= hi) buf[k++] = a[j++];
    for (k = lo; k <= hi; k++) a[k] = buf[k];
  };
  sort(0, a.length - 1);
  return a;
}

function insertionRange(a, lo, hi, cmp) {
  for (let i = lo + 1; i <= hi; i++) {
    const x = a[i];
    let j = i - 1;
    while (j >= lo && cmp(a[j], x) > 0) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = x;
  }
}

export function insertionSort(arr, cmp) {
  const a = arr.slice();
  insertionRange(a, 0, a.length - 1, cmp);
  return a;
}

/** Quick Sort — median-of-three pivot + Hoare partition, iterative-on-larger-side */
export function quickSort(arr, cmp) {
  const a = arr.slice();
  const swap = (i, j) => {
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  };
  const sort = (lo, hi) => {
    while (lo < hi) {
      if (hi - lo < 12) return insertionRange(a, lo, hi, cmp);
      const mid = (lo + hi) >> 1;
      // median of three -> avoids O(n^2) on already-sorted input
      if (cmp(a[mid], a[lo]) < 0) swap(mid, lo);
      if (cmp(a[hi], a[lo]) < 0) swap(hi, lo);
      if (cmp(a[hi], a[mid]) < 0) swap(hi, mid);
      const pivot = a[mid];
      let i = lo - 1, j = hi + 1;
      for (;;) {
        do i++; while (cmp(a[i], pivot) < 0);
        do j--; while (cmp(a[j], pivot) > 0);
        if (i >= j) break;
        swap(i, j);
      }
      // recurse into the smaller half, loop on the larger -> O(log n) stack
      if (j - lo < hi - j) {
        sort(lo, j);
        lo = j + 1;
      } else {
        sort(j + 1, hi);
        hi = j;
      }
    }
  };
  sort(0, a.length - 1);
  return a;
}

/** Heap Sort — in-place max-heap */
export function heapSort(arr, cmp) {
  const a = arr.slice();
  const n = a.length;
  const down = (i, size) => {
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let big = i;
      if (l < size && cmp(a[l], a[big]) > 0) big = l;
      if (r < size && cmp(a[r], a[big]) > 0) big = r;
      if (big === i) return;
      [a[i], a[big]] = [a[big], a[i]];
      i = big;
    }
  };
  for (let i = (n >> 1) - 1; i >= 0; i--) down(i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    down(0, end);
  }
  return a;
}

export const SORTERS = {
  merge: { name: 'Merge Sort', fn: mergeSort, complexity: 'O(n log n)', stable: true },
  quick: { name: 'Quick Sort', fn: quickSort, complexity: 'O(n log n) avg', stable: false },
  heap: { name: 'Heap Sort', fn: heapSort, complexity: 'O(n log n)', stable: false },
};

/** Binary search on a sorted array. Returns index or -1.  O(log n) */
export function binarySearch(sorted, target, keyFn = (x) => x) {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const k = keyFn(sorted[mid]);
    if (k === target) return mid;
    if (k < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/** First index whose key >= target (lower bound).  O(log n) */
export function lowerBound(sorted, target, keyFn = (x) => x) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keyFn(sorted[mid]) < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Linear search — used as the baseline in benchmarks.  O(n) */
export function linearSearch(arr, pred) {
  for (let i = 0; i < arr.length; i++) if (pred(arr[i])) return i;
  return -1;
}
